# MCP 实战：写一个 D2C 的 MCP Server

## Part 1｜技术讲解

### 1. 一句话结论

写 MCP Server 的难点不在技术栈（SDK + Schema + 业务逻辑），而在于 **Tool 的颗粒度怎么拆**——太粗 LLM 控制不了中间过程，太细编排成本爆炸。

### 2. 技术栈

```
MCP Server
├── @modelcontextprotocol/sdk   # 协议层（官方 SDK）
├── zod                         # Schema 定义（TS 专属，Python 用类型注解）
├── 传输层: StdioServerTransport # 通信（95% 场景用 stdio）
├── 业务逻辑:
│   ├── 第三方 API SDK（如 @larksuiteoapi/node-sdk）
│   ├── 数据库驱动（如 mongodb、postgres）
│   └── CLI 工具封装（如 child_process 调 lark-cli）
└── 打包: tsup / esbuild        # 编译成单文件，方便分发
```

Python 版差异不大，用 `FastMcpServer` + 装饰器，不需要 zod。

### 3. D2C 的 MCP 架构：为什么不能合成一个大 Tool

很多人的直觉：

```typescript
// ❌ 一个大 Tool
server.tool("figma_to_code", "把 Figma 设计稿转成代码", { figmaUrl: z.string() }, async () => {
  // 解析 + 生成 + 校验 + 修复 全塞进去
});
```

问题：
1. **LLM 看不到中间过程**，出了错不知道修哪里
2. **生成 95% 正确但有 5% 偏差**，只能全量重跑
3. **图标下载失败了，整个流程就断了**
4. **不同项目框架不同，一个大 Tool 无法适配**

MCP 的设计哲学是：**LLM 编排能力的前提是每步可观测、可干预、可回退。**

### 4. D2C 的 Tool 拆法：7 个 Tool

#### 架构分层

```
┌─────────────────────────────────────────────────┐
│                   SKILL 层                       │
│  "把 Figma 设计稿转成 React 组件"               │
│  编排：解析 → 生成 → 校验 → 修复                  │
└──────────────────────┬──────────────────────────┘
                       │ 调用
┌──────────────────────▼──────────────────────────┐
│                   MCP Tool 层                    │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 解析层   │ │ 生成层    │ │ 校验层   │        │
│  │          │ │          │ │          │        │
│  │fetch_ui  │ │gen_code  │ │verify    │        │
│  │detail    │ │          │ │code      │        │
│  ├──────────┤ ├──────────┤ ├──────────┤        │
│  │download  │ │gen_style │ │diff_check│        │
│  │icons     │ │          │ │          │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└──────────────────────┬──────────────────────────┘
                       │ 依赖
┌──────────────────────▼──────────────────────────┐
│                  基础设施层                       │
│  Figma API / 文件系统 / 图片处理 / AST 解析       │
└─────────────────────────────────────────────────┘
```

#### Tool 1: fetch_ui_detail（解析层）

```typescript
server.tool(
  "fetch_ui_detail",
  "从 Figma 设计稿 URL 提取结构化 UI 数据和截图",
  {
    figmaUrl: z.string().describe("Figma 设计稿链接"),
    nodeId: z.string().optional().describe("指定节点 ID，不传则取整个页面"),
  },
  async ({ figmaUrl, nodeId }) => {
    const { uiTree, screenshot } = await parseFigma(figmaUrl, nodeId);
    return {
      content: [
        { type: "image", data: screenshot },         // 截图给 LLM 看视觉
        { type: "text", text: JSON.stringify(uiTree) } // 结构化数据给 LLM 推理
      ]
    };
  }
);
```

为什么截图和结构化数据都返回？因为 LLM 需要两种信息：
- 截图 → 理解视觉布局、间距、颜色
- 结构化数据 → 理解组件层级、属性、嵌套关系

#### Tool 2: download_icons（解析层）

```typescript
server.tool(
  "download_icons",
  "从 Figma 设计稿中批量下载图标资源，支持多平台格式转换",
  {
    icons: z.array(z.object({
      name: z.string(),
      downloadUrl: z.string(),
      imageFormat: z.enum(["svg", "png"]),
    })),
    targetDir: z.string().describe("本地保存目录的绝对路径"),
    platform: z.enum(["web", "ios", "android", "lynx"]).describe("目标平台"),
  },
  async ({ icons, targetDir, platform }) => {
    // SVG → Android VectorDrawable XML
    // PNG → iOS .imageset bundle
    // SVG → Web 直接保存
    const savedPaths = await downloadAndConvert(icons, targetDir, platform);
    return {
      content: [{ type: "text", text: JSON.stringify(savedPaths) }]
    };
  }
);
```

为什么不和 fetch_ui_detail 合并？因为：
- 不是每次都需要下载图标（有些设计稿没有图标）
- 下载可能失败，单独处理不影响主流程
- 不同平台格式转换逻辑不同，拆开更清晰

#### Tool 3: generate_component（生成层）

```typescript
server.tool(
  "generate_component",
  "根据 UI 结构化数据生成组件代码",
  {
    uiTree: z.string().describe("UI 结构化 JSON"),
    framework: z.enum(["react", "vue", "lynx"]),
    styleScheme: z.enum(["css-modules", "tailwind", "inline"]).optional(),
    componentPath: z.string().describe("组件文件保存路径"),
  },
  async ({ uiTree, framework, styleScheme, componentPath }) => {
    // 关键设计：这个 Tool 不自己做代码生成
    // 而是把结构化数据 + prompt 模板组装好
    // 让 LLM 自己生成代码（LLM 生成比模板灵活得多）
    const prompt = buildCodeGenPrompt(uiTree, framework, styleScheme);
    return {
      content: [{ type: "text", text: prompt }]
      // LLM 拿到 prompt 后自己生成代码，再写入 componentPath
    };
  }
);
```

这里有个关键决策：**代码生成让 LLM 做，不让 Tool 做**。因为：
- Tool 用模板生成的代码死板，遇到复杂布局就崩
- LLM 看截图 + 结构化数据，能理解设计意图，生成更灵活
- Tool 的职责是"准备上下文"，不是"替代 LLM"

#### Tool 4: generate_styles（生成层）

```typescript
server.tool(
  "generate_styles",
  "根据 UI 数据生成样式代码和设计 Token",
  {
    uiTree: z.string().describe("UI 结构化 JSON"),
    format: z.enum(["css", "scss", "less", "design-token"]),
  },
  async ({ uiTree, format }) => {
    // 提取颜色 → 生成 design token
    // 提取字号/间距 → 生成 spacing/typography token
    // 提取布局 → 生成样式代码
    const tokens = extractDesignTokens(uiTree);
    const styleCode = renderStyle(tokens, format);
    return { content: [{ type: "text", text: styleCode }] };
  }
);
```

#### Tool 5: verify_code（校验层）

```typescript
server.tool(
  "verify_code",
  "对比生成的代码与原始设计稿的视觉一致性",
  {
    codePath: z.string().describe("生成的组件文件路径"),
    figmaScreenshot: z.string().describe("原始设计稿截图 base64"),
    renderedScreenshot: z.string().describe("代码渲染后的截图 base64"),
  },
  async ({ codePath, figmaScreenshot, renderedScreenshot }) => {
    // 像素级 diff + 结构 diff
    const diffReport = await visualDiff(figmaScreenshot, renderedScreenshot);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(diffReport)
        // { matchScore: 92, issues: [{ element: "button", offset: "3px right" }] }
      }]
    };
  }
);
```

#### Tool 6: check_accessibility（校验层）

```typescript
server.tool(
  "check_accessibility",
  "检查生成代码的可访问性",
  { codePath: z.string() },
  async ({ codePath }) => {
    const report = await runA11yCheck(codePath);
    return { content: [{ type: "text", text: JSON.stringify(report) }] };
  }
);
```

#### Tool 7: fix_issue（修复层）

```typescript
server.tool(
  "fix_issue",
  "根据校验报告修复代码中的问题",
  {
    codePath: z.string(),
    issues: z.array(z.object({
      type: z.enum(["visual-diff", "a11y", "type-error", "lint"]),
      description: z.string(),
      suggestion: z.string().optional(),
    })),
  },
  async ({ codePath, issues }) => {
    // 不自己修，把问题 + 上下文喂给 LLM
    // LLM 生成修复代码，Tool 负责应用 patch
    const patch = await generateFixPatch(codePath, issues);
    await applyPatch(codePath, patch);
    return { content: [{ type: "text", text: patch }] };
  }
);
```

### 5. Skill 层怎么编排这 7 个 Tool

```
用户："把这个 Figma 设计稿转成 React 组件"

Skill 自动编排：
  1. fetch_ui_detail(figmaUrl)        → 拿到 UI 树 + 截图
  2. download_icons(icons, targetDir)  → 下载图标
  3. LLM 生成代码（看截图 + UI 树）    → 这步是 LLM 自己干的，不是 Tool
  4. generate_styles(uiTree)           → 生成样式
  5. verify_code(code, screenshot)     → 校验
  6. if issues:
       fix_issue(code, issues)          → 修复
       verify_code(again)               → 再验
```

注意第 3 步：LLM 自己生成代码，不经过 Tool。这体现了 MCP 的设计哲学——**Tool 做执行，LLM 做决策和生成**。

### 6. Tool 颗粒度的取舍原则

| 决策 | 选粗 | 选细 |
|------|------|------|
| LLM 需要控制中间过程吗？ | 不需要 | 需要 → 拆细 |
| 这步可能失败吗？ | 不会 | 会 → 拆细（失败不影响整体） |
| 不同场景跳过这步吗？ | 不会 | 会 → 拆细（按需调用） |
| 这步的输出是结构化的吗？ | 是 | 不是 → 拆细（让 LLM 理解输出） |

**核心原则：LLM 能控制的粒度 = 合适的粒度。**

### 7. 一句话总结

> 写 D2C 的 MCP Server，核心思路是按 pipeline 阶段拆 Tool：解析、生成、校验、修复。每个 Tool 做一件事、返回结构化数据，让 LLM 在每一步都能观测和决策。最难的不是实现，而是 Tool 的颗粒度——太粗 LLM 没法控制，太细编排成本爆炸。

---

## Part 2｜面试答题稿

### 题型判断

问"怎么写 MCP Server / D2C 怎么用 MCP"→ 场景题-方案设计型

### 思维链

```
确认边界 → 拆解子问题 → 逐个解决 → 说明取舍
```

### 口语化输出

> "如果让我写一个 D2C 的 MCP Server，核心决策是 Tool 怎么拆。
>
> 不能合成一个 `figma_to_code` 的大 Tool，因为 LLM 看不到中间过程，出了错不知道修哪里，而且一步失败整个流程就断了。
>
> 我会按 pipeline 阶段拆成 7 个 Tool：解析层 2 个（fetch_ui_detail、download_icons），生成层 2 个（generate_component、generate_styles），校验层 2 个（verify_code、check_accessibility），修复层 1 个（fix_issue）。
>
> 这里面有几个关键设计：
>
> 第一，fetch_ui_detail 同时返回截图和结构化数据，因为 LLM 需要两种信息——截图看视觉，结构化数据看组件层级。
>
> 第二，generate_component 不自己做代码生成，而是把上下文准备好让 LLM 生成。因为模板生成的代码死板，LLM 看截图理解设计意图后生成的代码更灵活。
>
> 第三，校验和修复形成闭环——verify 发现问题，fix 修复，再 verify 验证，直到通过。
>
> 取舍点是 Tool 的颗粒度。我的原则是：LLM 能控制的粒度就是合适的粒度。太粗了 LLM 没法干预中间过程，太细了上下文爆炸、编排成本高。"

### 追问预判

| 追问 | 应对 |
|------|------|
| "verify_code 怎么做像素级 diff？" | 渲染截图 → 图片 diff 算法（SSIM/像素对比）→ 返回差異报告 |
| "如果 Figma API 限流怎么办？" | 缓存 + 降级：缓存解析结果，限流时用缓存；或走本地 Figma 文件导入 |
| "多平台怎么适配？" | generate_component 按 framework 参数走不同的 prompt 模板；download_icons 按 platform 参数做格式转换 |
