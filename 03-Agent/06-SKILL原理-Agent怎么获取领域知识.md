# SKILL 原理：Agent 怎么获取领域知识

## Part 1｜技术讲解

### 1. 一句话结论

SKILL 解决的核心问题是 Agent 执行任务时的**不确定性**——把领域经验沉淀成可按需加载的能力插件，让 Agent 从"临场猜"变成"按协议执行"。

### 2. 没有 SKILL 会怎样

一个 Agent 本身有通用推理能力，但面对具体工具、业务系统、公司内部流程时，会遇到几个问题：

```
❌ 不知道该不该用这个工具
❌ 不知道命令怎么组合
❌ 不知道哪些参数有坑
❌ 不知道高风险操作什么时候要停下来确认
❌ 不知道做完后怎么验证
```

这些问题的本质是：**Agent 缺乏领域知识**。

通用 LLM 知道"什么是日历 API"，但不知道：
- 飞书日历的 `update-custom-info` 是整体覆盖 `biz_extra`，必须先 get 再局部修改再回写
- 创建日程前要先确认参会人时区
- 实验的草稿状态和正式状态流转规则不同
- 同步操作影响范围大，必须预览确认

**这些是踩过坑才知道的，不是推理能推出来的。** SKILL 的价值就是把这类经验沉淀下来。

### 3. SKILL 的三层结构

```
┌─────────────────────────────────────────┐
│  第一层：metadata（门面）                 │
│  name + description                     │
│  决定什么时候触发这个 SKILL              │
├─────────────────────────────────────────┤
│  第二层：SKILL.md 主体（核心）            │
│  核心流程 + 决策规则 + 注意事项          │
│  Agent 一加载就知道下一步怎么做           │
├─────────────────────────────────────────┤
│  第三层：扩展资源（按需加载）             │
│  references / scripts / assets          │
│  复杂内容按需读取，不塞进初始上下文       │
└─────────────────────────────────────────┘
```

#### 第一层：metadata

```yaml
name: vimocli-material
description: |
  vimo 素材管理能力。支持素材的查询、创建、更新、上传、分级、自定义字段管理。
  当用户提到"素材"、"物料"、"素材管理"、"自定义字段"时触发。
```

- `name` 要短、稳定、语义明确
- `description` 更关键——它决定什么时候触发，要写清楚**能力范围和触发场景**，也要隐含边界，避免误触发

#### 第二层：SKILL.md 主体

```markdown
# vimo 素材管理

## 核心流程

1. 查询素材：`vimocli material list --biz xxx --site xxx`
2. 创建素材：`vimocli material create --name xxx --type xxx`
3. 更新自定义字段：**必须先 get 再局部修改再回写**

## 关键规则

- `update-custom-info` 是整体覆盖 `biz_extra`，不是增量更新
- 正确流程：先 get 当前素材 → 拿到完整 biz_extra → 局部修改 → 完整回写
- 素材上传有大小限制：图片 20MB、视频 500MB

## 风险控制

- 批量操作前必须先列出范围让用户确认
- 分级操作不可逆，操作前要预览
```

Agent 加载这个 SKILL.md 后，就知道：
- 用户说"改素材自定义字段"对应 `update-custom-info`
- 这个命令是整体覆盖，必须先 get 再改
- 批量操作前要确认

#### 第三层：扩展资源

```
vimocli-material/
├── SKILL.md                    # 核心流程和规则
├── references/
│   ├── material-api-spec.md    # 完整 API 文档（按需读取）
│   └── biz-extra-schema.json  # biz_extra 字段定义
├── scripts/
│   └── batch-update.sh        # 批量更新脚本
└── assets/
    └── material-template.json # 素材创建模板
```

- `references/`：复杂 API 文档、长规则、枚举表——只在需要时读取
- `scripts/`：稳定重复、容易写错的逻辑——直接执行脚本，不让 LLM 手写
- `assets/`：模板、素材类东西——填充模板比让 LLM 生成更可靠

### 4. SKILL 的运行原理：按需加载

```
用户："帮我改一下素材的自定义字段"

Step 1: 匹配
  Agent 看到所有 SKILL 的 name + description
  → 命中 vimocli-material

Step 2: 加载主体
  Agent 读取 SKILL.md
  → 知道要调 update-custom-info
  → 知道必须先 get 再改

Step 3: 执行
  Agent 先调 get 拿到完整 biz_extra
  → 局部修改
  → 完整回写

Step 4: 按需加载扩展
  如果用户问"biz_extra 有哪些字段"
  → Agent 读取 references/biz-extra-schema.json
```

### 5. 两个核心设计理念

#### 渐进式披露（Progressive Disclosure）

Agent 不需要一开始把所有知识塞进上下文。先加载 metadata 做匹配，再加载主体做执行，需要细节时才读 references。

这和人类工作方式一样：先知道"找谁"，再知道"怎么做"，最后才查"具体参数"。

好处：
- **上下文不膨胀**：只加载当前任务需要的知识
- **成本可控**：长文档按需读取，不浪费 token
- **响应更快**：初始加载快，细节按需补

#### 热插拔（Hot-pluggable）

工具变了、业务规则变了、新增能力了，都可以通过更新或新增 SKILL 来扩展 Agent，而不用改模型本身。

```
新增业务线 → 新增一个 SKILL
API 参数变了 → 更新 SKILL.md
发现新坑 → 补充到 SKILL.md 的注意事项
```

这比重新微调模型、重新写 prompt 成本低得多。

### 6. SKILL vs MCP vs Fine-tuning：什么时候用什么

| 方式 | 解决什么 | 成本 | 适用场景 |
|------|---------|------|---------|
| **SKILL** | 领域知识 + 流程编排 | 低（写 Markdown） | 业务规则、操作流程、踩坑经验 |
| **MCP** | 工具调用标准化 | 中（写 Server） | 外部工具接入、API 封装 |
| **Fine-tuning** | 模型行为调整 | 高（训练模型） | 特定风格、特定领域语言模式 |

**大部分场景 SKILL + MCP 就够了，Fine-tuning 是最后手段。**

### 7. SKILL 的局限

1. **没有统一协议**：各家格式不同（YAML/JSON/Markdown），不能跨 Agent 移植
2. **质量参差不齐**：SKILL 写得好不好直接影响 Agent 表现，但没有质量标准
3. **维护成本**：业务规则变了就要同步更新 SKILL，否则 Agent 会用过时知识
4. **上下文窗口限制**：复杂业务的 SKILL.md 可能很长，还是可能塞不进上下文

### 8. 一句话总结

> SKILL 的本质是"按需加载的能力插件"，三层结构（metadata → 主体 → 扩展资源）实现渐进式披露，热插拔设计让 Agent 能力可扩展。它填补了 MCP 覆盖不了的知识层——MCP 定义"能做什么"，SKILL 定义"怎么做更好"。

---

## Part 2｜面试答题稿

### 题型判断

问"什么是 SKILL / SKILL 解决什么问题"→ 解决型八股

### 思维链

```
没有 SKILL 会怎样 → SKILL 怎么解决 → 核心设计理念 → 局限性
```

### 口语化输出

> "SKILL 解决的是 Agent 执行任务时的不确定性。
>
> 一个 Agent 有通用推理能力，但面对具体业务系统时会遇到一堆问题：不知道命令怎么组合、不知道哪些参数有坑、不知道高风险操作什么时候要确认。这些不是推理能推出来的，是踩过坑才知道的。SKILL 的价值就是把这类领域经验沉淀下来。
>
> 结构上我一般分三层。第一层是 metadata，name 和 description，决定什么时候触发。第二层是 SKILL.md 主体，放核心流程、决策规则、注意事项。第三层是扩展资源，复杂 API 文档放 references，稳定流程放 scripts，模板放 assets——按需加载，不塞进初始上下文。
>
> 这里面有两个核心设计。一是渐进式披露——Agent 不需要一开始把所有知识塞进上下文，先匹配、再加载主体、需要细节时才读扩展。二是热插拔——业务规则变了就更新 SKILL，新增能力就加 SKILL，不用改模型。
>
> 局限在于没有统一协议，各家格式不一样，不能跨 Agent 移植。而且 SKILL 写得好不好直接影响 Agent 表现，这块目前没有质量标准。"

### 追问预判

| 追问 | 应对 |
|------|------|
| "SKILL 和 System Prompt 有什么区别？" | System Prompt 是全局的、静态的；SKILL 是按需加载的、动态的。SKILL 可以有多份，只加载相关的 |
| "SKILL 和 RAG 有什么区别？" | RAG 检索的是非结构化文档，Agent 还得自己理解；SKILL 是结构化的流程+规则，Agent 直接按协议执行 |
| "你写过 SKILL 吗？" | 拿 vimo-cli 的四级拆解回答，见 07 篇 |
