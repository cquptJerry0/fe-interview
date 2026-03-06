---
title: "为什么要有同源策略？跨域怎么解决？CORS 预检和带 Cookie 怎么配？"
tags: ["security.sop", "security.cors", "network.http.cors"]
type: "八股"
difficulty: 4
---

## 一句话结论

同源策略是浏览器安全模型，限制跨源读取敏感响应；跨域最标准的工程解法是 CORS（服务端用响应头显式授权），带 Cookie 时必须 `credentials: include` 且 `Access-Control-Allow-Origin` 不能是 `*`，复杂请求会触发 OPTIONS 预检。

## 解释（从零到一）

同源是什么（最底层判定）：
- `协议 + 域名 + 端口` 三者都相同才同源，任意不同就是跨域

为什么要有同源策略（从攻击模型解释）：
- 用户在 `bank.com` 已登录（Cookie 存在浏览器）
- 恶意站 `evil.com` 如果能直接读取 `bank.com/api/balance` 的响应，就能借用户登录态偷数据
- SOP 的核心限制是“跨源页面默认不能读取对方敏感响应/DOM/存储”，从而保护用户

CORS 是什么：
- 一组 HTTP 响应头，用来告诉浏览器“这个跨源响应允许被哪个源的 JS 读取”

最小例子（带 cookie 的跨域请求）：

```js
fetch("https://api.company.com/user", { credentials: "include" });
```

服务端响应头（示例）：

```text
Access-Control-Allow-Origin: https://fe.company.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST
Access-Control-Allow-Headers: Content-Type, Authorization
```

预检（preflight）什么时候出现：
- 使用非简单方法（PUT/DELETE 等）、自定义请求头、或非简单 Content-Type 时，浏览器会先发 OPTIONS 询问是否允许

## 图解

```text
fe.company.com  --(fetch)-->  api.company.com
        |                         |
        |<-- CORS 响应头授权 ------|

没有授权：浏览器不把响应内容交给 JS（Network 里能看到，但 JS 读不到）
```

## 对比与取舍

- 代理转发（BFF/本地 dev 代理）vs CORS
  - 代理：前端同源，改动前端/网关即可；缺点是多一跳、链路更复杂
  - CORS：标准、直连；缺点是要服务端支持与正确配置，且要处理预检

## 实践与验证

- DevTools 验证：
  - Network：查看响应头是否包含 `Access-Control-Allow-*`
  - Console：若 CORS 配置错，通常会提示 blocked by CORS policy
- 排障顺序：
  1) 是否同源（协议/域名/端口）
  2) 是否带凭证（credentials / allow-credentials / allow-origin 具体值）
  3) 是否触发预检（OPTIONS 是否返回正确的 allow-methods/headers）
  4) 服务端是否回显了正确的 origin 白名单

## 常见追问

- 为什么带 Cookie 不能 `Access-Control-Allow-Origin: *`？
- 预检为什么出现？怎么减少？
- 除了 CORS/代理还有什么方式（JSONP/postMessage/WebSocket）分别适用什么场景？

## 易错点

- 只配了 `Allow-Origin` 忘了配 `Allow-Credentials`，导致带 Cookie 失败
- 预检 OPTIONS 返回 401/403 或缺失 allow-headers，导致主请求根本不会发出
- 把 CORS 当成“后端限制”，忽略它本质是浏览器读响应的安全机制
