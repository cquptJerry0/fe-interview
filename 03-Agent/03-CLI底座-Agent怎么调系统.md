# CLI 底座：Agent 怎么调系统

## Part 1｜技术讲解

### 1. 一句话结论

CLI 是 Agent 和操作系统交互的最基础方式——没有 CLI，Agent 就是个只会说话的模型；有了 CLI，Agent 才能真正"动手干活"。

但 CLI 的本质问题是**输出非结构化**，这直接催生了 MCP 的诞生。

### 2. stdio：CLI 通信的底层机制

每个进程启动时，操作系统给它三个默认通道：

```
stdin  (fd=0)  → 进程读入
stdout (fd=1)  → 进程写出
stderr (fd=2)  → 进程写出错误
```

Agent 调 CLI 的完整流程：

```
Agent（父进程）
   │
   │  spawn("git", ["status"])
   │
   ▼
git 进程（子进程）
   │
   │  Agent → 写入 git 的 stdin   → git 收到输入
   │  git  → 写入自己的 stdout    → Agent 收到输出
   │  git  → 写入自己的 stderr    → Agent 收到错误信息
   │
   ▼
Agent 拿到文本结果，自己解析
```

MCP 选 stdio 作为默认传输方式，原因同理：**最简单、最通用**。

- 不需要端口 → 不怕端口冲突
- 不需要 CORS → 不怕浏览器限制
- 不需要部署服务 → Agent 直接 spawn 进程
- 不需要网络 → 本地通信，延迟极低

### 3. Agent 调 CLI 的三种方式

#### 方式一：直接执行（最原始）

```python
# Agent 内部
result = os.popen("git status").read()
# 拿到一坨文本，自己解析
```

问题：
- 输出格式随时可能变（git 升级改了输出格式）
- 没有类型信息，Agent 得猜字段含义
- 错误处理靠解析 stderr 文本

#### 方式二：结构化 CLI（改进）

```python
# 加 --json 或 --porcelain 参数
result = os.popen("git status --porcelain").read()
# 输出格式稳定，但还是文本
```

好了一点，但：
- 不是所有 CLI 都支持 `--json`
- 每个命令的 JSON 结构不一样，Agent 还是要逐个适配

#### 方式三：通过 MCP 调用（最佳）

```python
# Agent 不直接调 CLI，走 MCP 协议
result = mcp.call("git_status", { repoPath: "/xxx" })
# 拿到结构化 JSON，Schema 已定义，直接用
```

### 4. CLI 的核心局限：为什么需要 MCP

| 问题 | CLI | MCP |
|------|-----|-----|
| 输出格式 | 非结构化文本 | JSON + Schema |
| 类型信息 | 没有 | JSON Schema 定义 |
| 可发现性 | 靠 --help 文本 | Tool 列表自动枚举 |
| 跨 Agent 复用 | 每个 Agent 自己适配 | 一次注册，所有 Agent 可用 |
| 认证管理 | 每个 Agent 自己管 | MCP Server 统一管 |
| 错误处理 | 解析 stderr 文本 | 结构化错误响应 |

用一个具体例子说明：

```bash
# CLI 输出：一坨文本
$ lark-cli calendar search --date 2024-01-01
🔍 找到 3 个日程：
1. 周会 09:00-10:00 📍 3F-会议室A
2. 1on1 14:00-14:30 👤 张三
3. 评审 16:00-17:00 📍 线上
```

Agent 拿到这个文本，要自己解析出时间、地点、参会人——而且格式变了就崩。

```json
// MCP 输出：结构化 JSON
{
  "events": [
    { "title": "周会", "start": "09:00", "end": "10:00", "location": "3F-会议室A" },
    { "title": "1on1", "start": "14:00", "end": "14:30", "attendees": ["张三"] },
    { "title": "评审", "start": "16:00", "end": "17:00", "location": "线上" }
  ]
}
```

Agent 直接用，不需要解析，不怕格式变。

### 5. CLI 不会被替代

MCP 解决了 CLI 的结构化问题，但 CLI 不会消失：

- **MCP Server 本身就可能是 CLI 的封装**：lark-cli mcp serve 底层还是调 lark-cli 的命令
- **无 MCP 的工具只能走 CLI**：不是所有工具都有 MCP Server
- **底层调试离不开 CLI**：MCP 挂了、网络断了，还是得 CLI 兜底
- **脚本/自动化场景 CLI 更合适**：CI/CD pipeline 里不需要 MCP 的开销

### 6. 一句话总结

> CLI 是 Agent 的双手——通用但粗糙。它的核心问题是输出非结构化，导致 Agent 需要为每个命令适配解析逻辑，这直接催生了 MCP。但 CLI 不会消失，它是 Agent 和系统交互的底座，MCP 是在它之上加了一层标准化协议。

---

## Part 2｜面试答题稿

### 题型判断

问"CLI 是什么 / Agent 怎么调系统"→ 事实型，但需要推导到"为什么 CLI 不够用"。

### 思维链

```
是什么 → 怎么运作 → 有什么局限 → 局限催生了什么（MCP）→ CLI 还在不在
```

### 口语化输出

> "CLI 是 Agent 和操作系统交互的最基础方式。底层是 stdio——Agent spawn 一个子进程，通过 stdin 写入命令，从 stdout 读输出。
>
> 但 CLI 的核心问题是输出非结构化。比如 `git status` 返回一坨文本，Agent 得自己解析哪个是文件名、哪个是状态。每个命令输出格式不一样，Agent 要逐个适配，格式变了就崩。
>
> 这就是 MCP 存在的原因之一——MCP 在 CLI 之上加了一层标准化协议，Tool 的入参出参都有 JSON Schema 描述，Agent 拿到结构化数据直接用。
>
> 但 CLI 不会消失。MCP Server 底层可能还是调 CLI；没有 MCP Server 的工具只能走 CLI；调试和兜底也离不开 CLI。所以 CLI 是底座，MCP 是标准化层，它们是协作关系不是替代关系。"

### 追问预判

| 追问 | 应对 |
|------|------|
| "stdio 和 HTTP 传输有什么区别？" | stdio 本地零网络开销，HTTP 跨机器但需要部署。MCP 默认 stdio，远程场景用 SSE |
| "为什么不直接让所有 CLI 输出 JSON？" | 不是所有工具都能改，历史命令格式兼容性不能破，MCP 是在不改 CLI 的基础上加协议层 |
| "Agent 直接调 API 不行吗，为什么要 CLI？" | 可以，但不是所有能力都有 API；CLI 是最通用的接口，API 是 CLI 的超集但覆盖面不如 CLI |
