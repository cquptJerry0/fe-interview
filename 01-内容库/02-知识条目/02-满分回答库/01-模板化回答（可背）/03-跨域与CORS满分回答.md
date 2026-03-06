---
title: "为什么要有同源策略？跨域怎么解决？CORS 预检和带 Cookie 怎么配？"
tags: ["security.sop", "security.cors", "network.http.cors"]
type: "八股"
difficulty: 4
---

## 一句话结论

同源策略是浏览器为防止跨站读取敏感数据的安全边界；跨域读响应的标准方案是 CORS。带 Cookie 时前后端要成对配置：前端 `credentials: include`，后端 `Access-Control-Allow-Credentials: true` 且 `Access-Control-Allow-Origin` 不能是 `*`；复杂请求会先走 OPTIONS 预检。

## 技术解释

### 1) 同源策略到底限制了什么

- 同源由 `协议 + 域名 + 端口` 共同决定。
- 跨源请求“能发出去”不等于“前端 JS 能读到响应”。
- SOP 重点限制的是跨源读取能力，而不是网络发起本身。

### 2) CORS 的机制

- 浏览器发起跨源请求时，检查响应头是否授权当前 Origin。
- 服务端通过 `Access-Control-*` 响应头声明可读权限。
- 浏览器据此决定把响应暴露给 JS，还是拦截为 CORS 错误。

### 3) 简单请求与预检请求

- 简单请求（方法和头满足条件）可直接发主请求。
- 非简单请求会先发 OPTIONS 预检，确认方法和请求头是否被允许。
- 预检成功后才会发主请求。

### 4) 带 Cookie 的关键约束

前端：

```js
fetch("https://api.example.com/user", {
  method: "GET",
  credentials: "include",
});
```

后端（示例）：

```text
Access-Control-Allow-Origin: https://fe.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Vary: Origin
```

- `Allow-Origin` 不能写 `*`。
- 生产环境应按白名单动态回写 Origin，并加 `Vary: Origin`。

### 5) 常见误区

- 把 CORS 当成后端“放开开关”，忽略浏览器侧校验语义。
- 只配主请求，不配预检响应，导致 OPTIONS 失败。
- 认为本地代理能解决所有跨域，本质只是在开发环境绕过浏览器限制。

## 对比与取舍

- CORS：标准、可控、适合生产。
- 反向代理：适合同域部署和网关统一治理。
- JSONP：只支持 GET，现代业务基本不用。

## 实践与验证

- 在 Network 分别看 OPTIONS 和主请求响应头。
- 重点核对 `Origin`、`Allow-Origin`、`Allow-Credentials` 是否成对匹配。
- 观察预检缓存策略（`Access-Control-Max-Age`）是否合理。

## 业务举例

### 背景与约束

- 前端域名与 API 域名分离，线上登录态接口偶发失败。
- 失败只在生产出现，本地和测试环境难复现。
- 业务高峰期不能大规模改动网关。

### 方案与取舍

- 先按链路拆：DNS/网关/应用层分别验证 CORS 头。
- 网关层统一处理 OPTIONS 和白名单 Origin 回写。
- 保留应用层兜底头部，避免网关变更遗漏影响核心接口。

### 实施与验证

- 增加请求日志字段：`origin`、`method`、`isPreflight`、`allowOrigin`。
- 灰度观察跨域失败率和登录接口成功率。
- 对带 Cookie 接口逐个核对 credentials 配置。

### 结果与复盘

- OPTIONS 失败问题消失，登录态接口恢复稳定。
- 复盘发现问题根因是网关对部分 path 漏配预检响应头。
- 后续把 CORS 校验加入网关配置 CI 检查。

## 面试口述版（60-90秒）

我会先澄清一个点：跨域不是“请求发不出去”，而是浏览器默认不允许 JS 读取跨源敏感响应。同源由协议、域名、端口共同决定。工程上标准方案是 CORS，由服务端通过 `Access-Control-*` 响应头授权。复杂请求会先走 OPTIONS 预检。带 Cookie 时要成对配置：前端 `credentials: include`，后端必须 `Allow-Credentials: true` 且 `Allow-Origin` 不能是 `*`。排障我会按预检和主请求分开看，重点检查响应头是否完整、Origin 是否命中白名单。

## 追问

- 为什么 CORS 报错时后端日志可能显示 200？
- 预检请求失败最常见的三类原因是什么？
- 带 Cookie 的 CORS 为什么不能配 `*`？
- 如何降低预检带来的额外时延？

## 易错点

- 忽略 OPTIONS 预检，只看主请求。
- 白名单逻辑写死单域名，导致多环境异常。
- 没有 `Vary: Origin`，缓存层出现错误复用。
