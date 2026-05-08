# MCP 协议：Agent 怎么标准化连接工具

## Part 1｜技术讲解

### 1. 一句话结论

MCP（Model Context Protocol）是 Anthropic 提出的标准化协议，解决的核心问题是：**AI 模型如何与外部工具/数据源通信**——不靠硬编码、不靠猜输出格式，而是通过统一的 JSON-RPC 协议 + JSON Schema 描述。

### 2. MCP 解决了什么问题

没有 MCP 时，Agent 连接工具的方式：

```
方式一：直接调 CLI
  → 输出非结构化，每个命令要单独写解析器

方式二：直接调 HTTP API
  → 认证、错误处理、版本兼容全要自己管
  → 10 个 Agent 调同一个 API，认证逻辑写 10 遍

方式三：硬编码工具描述
  → 换一个 Agent 就得重新写一遍工具适配
  → 工具更新了，所有 Agent 都得改
```

有了 MCP：

```
工具提供方：按 MCP 协议写一次 Server
Agent 消费方：按 MCP 协议直接调用
→ 一次注册，所有 Agent 可用
→ 认证 Server 统一管
→ 输出结构化，Schema 自带
```

### 3. MCP 的三大能力暴露方式

MCP 定义了三种能力类型，不只有 Tool：

| 类型 | 用途 | 例子 |
|------|------|------|
| **Tools** | Agent 可调用的函数 | `calendar_search`、`file_read`、`db_query` |
| **Resources** | Agent 可读取的数据源 | 文件内容、数据库记录、API 响应 |
| **Prompts** | 预定义的 Prompt 模板 | 常用查询模板、报告生成模板 |

最常用的是 Tools，Resources 和 Prompts 用得少但有其价值：
- Resources 适合"只读数据"，Agent 不需要调函数，直接读就行
- Prompts 适合"固定套路"，把最佳实践模板化

### 4. MCP 协议的核心结构

#### 通信协议：JSON-RPC 2.0

```json
// Agent → MCP Server（请求）
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calendar_search",
    "arguments": {
      "userId": "ou_xxx",
      "dateRange": { "start": "2024-01-01", "end": "2024-01-31" }
    }
  }
}

// MCP Server → Agent（响应）
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"events\": [{\"title\": \"周会\", \"start\": \"09:00\"}]}"
      }
    ]
  }
}
```

#### Tool 描述：JSON Schema

```json
{
  "name": "calendar_search",
  "description": "搜索指定用户的日历空闲时间段",
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string", "description": "用户 open_id" },
      "dateRange": {
        "type": "object",
        "properties": {
          "start": { "type": "string", "description": "开始日期 YYYY-MM-DD" },
          "end": { "type": "string", "description": "结束日期 YYYY-MM-DD" }
        },
        "required": ["start", "end"]
      }
    },
    "required": ["userId", "dateRange"]
  }
}
```

LLM 看到这个 Schema 就知道：要传 userId 和日期范围，返回的是事件列表。**不需要猜，不需要试错。**

### 5. Transport 层：两种通信方式

| 方式 | 原理 | 适用场景 |
|------|------|---------|
| **Stdio** | Agent 作为父进程 spawn Server，通过 stdin/stdout 通信 | 本地工具、CLI 集成、95% 的场景 |
| **SSE (HTTP)** | Server 起 HTTP 服务，Agent 通过 SSE 长连接 + POST 通信 | 远程服务、Web 端、多 Agent 共享 |

```typescript
// Stdio 方式：Agent 直接拉起进程
const transport = new StdioServerTransport();
await server.connect(transport);

// SSE 方式：Server 独立部署
const transport = new SSEServerTransport("/message", app);
await server.connect(transport);
```

本地开发几乎都用 Stdio，因为：
- 不需要端口，不怕冲突
- 不需要网络，延迟最低
- Agent 直接管理 Server 生命周期

### 6. MCP 的发现机制

Agent 怎么知道有哪些 MCP Server 可用？通过配置文件：

```json
// Claude Desktop: claude_desktop_config.json
// Codin: .codin/mcp.json
{
  "mcpServers": {
    "feishu-calendar": {
      "command": "node",
      "args": ["./servers/feishu-calendar/index.js"],
      "env": { "FEISHU_APP_ID": "xxx", "FEISHU_APP_SECRET": "xxx" }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "xxx" }
    }
  }
}
```

Agent 启动时：
1. 读取配置文件
2. spawn 每个 Server 进程
3. 通过 stdio 建立连接
4. 调用 `tools/list` 发现所有可用 Tool
5. 把 Tool 列表注入 LLM 上下文

**整个过程对用户透明**——用户只需配一次，Agent 自动发现和调用。

### 7. MCP vs 直接调 API：什么时候用哪个

| 场景 | MCP | 直接调 API |
|------|-----|-----------|
| 多 Agent 共享同一工具 | ✅ 写一次 Server，所有 Agent 用 | ❌ 每个 Agent 自己适配 |
| 工具需要认证 | ✅ Server 统一管 | ❌ 每个 Agent 自己管 |
| 工具输出需要标准化 | ✅ Schema 定义 | ❌ 自己解析 |
| 一次性脚本 | ❌ 杀鸡用牛刀 | ✅ 直接调更快 |
| 内部微服务调用 | ❌ 不适合 | ✅ 服务间直调更高效 |

MCP 的价值在**多消费者 + 标准化**场景。如果你只有一个 Agent 调一个 API，直接调更简单。

### 8. MCP 的局限

1. **协议还年轻**：Anthropic 主导，其他厂商跟进程度不一
2. **性能开销**：多了一层协议封装，延迟比直接调 API 高
3. **SSE 不够稳定**：远程场景下 SSE 连接管理、断线重连还不成熟
4. **没有统一的 Server 市场**：找 MCP Server 全靠 GitHub 搜索，没有包管理器
5. **Tool 颗粒度没有最佳实践**：拆粗了 LLM 控制不了，拆细了上下文爆炸

### 9. 一句话总结

> MCP 的核心价值是标准化——统一了 Agent 调工具的协议、格式、发现机制。它不是替代 CLI 或 API，而是在它们之上加了一层协议，让 Agent 不需要为每个工具硬编码适配逻辑。但 MCP 还年轻，局限在于生态不成熟和性能开销。

---

## Part 2｜面试答题稿

### 题型判断

问"什么是 MCP / MCP 解决什么问题"→ 解决型八股

### 思维链

```
没有 MCP 会怎样 → MCP 怎么解决 → 有什么局限 → 实践经验
```

### 口语化输出

> "MCP 解决的是 Agent 怎么标准化连接外部工具的问题。
>
> 没有 MCP 的时候，Agent 调工具要么拼 CLI 命令、要么裸调 HTTP API——输出格式不统一，每个工具得单独写解析逻辑，认证也是每个 Agent 自己管。
>
> MCP 用 JSON-RPC 协议 + JSON Schema 统一了这些：Tool 的入参出参有类型描述，Agent 不用猜；认证 MCP Server 统一管，不用每个 Agent 自己写；工具注册一次，所有支持 MCP 的 Agent 都能用。
>
> 通信方式有两种：Stdio 是本地场景，Agent 直接 spawn 进程通过标准输入输出通信，不需要网络；SSE 是远程场景，Server 起一个 HTTP 服务。95% 的场景用 Stdio 就够了。
>
> 局限在于协议还年轻，生态不成熟——没有统一的 Server 市场和包管理器，Tool 颗粒度也没有最佳实践。而且它本质上是 Anthropic 主导的标准，其他厂商跟进程度不一。但它解决的问题是确定的，即使未来被更好的协议替代，'Agent 需要标准化的工具调用协议'这件事不会变。"

### 追问预判

| 追问 | 应对 |
|------|------|
| "MCP 和 Function Calling 有什么区别？" | Function Calling 是模型能力（LLM 输出函数调用的 JSON），MCP 是通信协议（Agent 和工具之间怎么传数据）。Function Calling 决定"调什么"，MCP 决定"怎么传" |
| "MCP 和 A2A 的区别？" | MCP 是 Agent 调 Tool（1:1），A2A 是 Agent 调 Agent（N:N），层级不同 |
| "你写过 MCP Server 吗？" | 见 04 篇 D2C 实战 |
| "MCP 的 SSE 方式有什么问题？" | 长连接管理复杂、断线重连不成熟、不适合高频调用 |
