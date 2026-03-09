---
title: "什么是跨域？CORS 是怎么工作的？"
tags: ["security.sop", "security.cors", "network.http.cors"]
type: "八股"
difficulty: 4
---

## 模块 1｜主回答

### 1）一句话结论

- 跨域本身不是“请求发不出去”，而是浏览器出于同源策略，不允许前端页面随意读取不同源响应。
- CORS 是服务器通过响应头告诉浏览器：哪些源、哪些方法、哪些请求头、是否允许携带凭证，可以合法访问这个资源。
- 简单请求可以直接发，浏览器事后检查响应头；非简单请求通常会先发一个 `OPTIONS` 预检请求，确认服务器允许后，才会发正式请求。
- 面试里最容易加分的一句是：`CORS` 是浏览器侧的安全约束，不是后端框架的某个“开关功能”。

### 2）原理图（ASCII）

```txt
页面源：https://app.example.com
请求源：https://api.example.com
        |
        v
浏览器判断：跨源
        |
        +-- 简单请求
        |      -> 直接发正式请求
        |      -> 看响应头是否允许读取
        |
        +-- 非简单请求
               -> 先发 OPTIONS 预检
               -> 服务器声明允许的源 / 方法 / 头
               -> 通过后再发正式请求
```

### 3）最小例子

```js
fetch('https://api.example.com/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer xxx',
  },
  credentials: 'include',
  body: JSON.stringify({ name: 'alice' }),
})
```

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### 4）面试口语稿

- 我会先把跨域和 CORS 拆开讲。跨域说的是页面源和请求源不一致，而浏览器有同源策略，默认不会让前端页面随便读取别的源返回的数据。CORS 是服务器通过响应头把访问权限声明清楚，让浏览器知道这个跨源请求能不能放行。简单请求通常直接发，浏览器回来再检查响应头；如果是带自定义请求头、特定 `Content-Type` 或其他非简单请求，就会先发一个 `OPTIONS` 预检，请服务器先表态允许哪些源、方法和头，再决定要不要发正式请求。这里最重要的是知道：请求不一定发不出去，但浏览器可能不让你读取响应。

## 模块 2｜深入展开

### 1）原理链路

```txt
跨域问题
  -> 为什么浏览器要限制跨源读取
  -> 简单请求和非简单请求有什么区别
  -> 预检请求在检查什么
  -> 服务器用哪些响应头声明权限
  -> 浏览器最终决定是否把响应交给前端脚本
```

- 同源策略的核心目标是防止一个站点的脚本任意读取另一个站点的数据。
- CORS 不是取消同源策略，而是在服务器明确授权的前提下，对部分跨源访问做受控放行。
- 所以这题如果只会背 `Access-Control-Allow-Origin`，但讲不出“浏览器为什么要先预检”，深度就不够。

### 2）业务化解释

- 最常见场景是前端应用和 API 服务不在同一个域名或端口上，比如本地开发时前端跑在 `localhost:3000`，接口跑在 `localhost:8080`。
- 另一个高频场景是线上前后端分域部署，比如 `app.xxx.com` 调 `api.xxx.com`。
- 如果请求里带了 `Authorization`、`application/json`、Cookie 等信息，通常更容易触发预检或凭证相关限制。
- 实战里排查跨域，不是看浏览器报“CORS”就结束，而是要把源、请求方法、请求头、Cookie、服务器响应头一起看。

### 3）取舍 / 易错点

- 不要把跨域理解成“后端没开接口”，很多时候接口其实返回了，只是浏览器不让前端读。
- `Access-Control-Allow-Origin: *` 和 `Access-Control-Allow-Credentials: true` 不能一起随便用，带凭证时必须精确声明源。
- 预检失败时，正式请求通常根本不会继续发，所以不要只盯着业务接口日志，还要看 `OPTIONS`。
- `Postman`、后端服务之间调用不受浏览器同源策略约束，所以“Postman 能通”不能证明浏览器场景没问题。

### 4）深挖判断

- 这题可以进入模板化回答。
- 如果后续继续追问 Cookie、`SameSite`、代理转发、网关层 CORS、预检缓存等问题，建议补内部专题深挖卡。

### 难题加厚｜额外图

```txt
非简单请求

浏览器
  -> OPTIONS /user
     Origin: https://app.example.com
     Access-Control-Request-Method: POST
     Access-Control-Request-Headers: Content-Type, Authorization

服务器
  -> 返回允许规则

浏览器校验通过
  -> 再发 POST /user
  -> 前端脚本才能拿到响应
```

```txt
带凭证请求

前端 fetch(..., { credentials: 'include' })
  -> 服务器必须返回精确 Origin
  -> 还要返回 Access-Control-Allow-Credentials: true
  -> 浏览器才会把响应暴露给前端
```

### 难题加厚｜额外例子

```http
OPTIONS /user HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### 难题加厚｜精炼伪代码

```txt
if request is cross-origin:
  if request is simple:
    send actual request
    if response headers allow origin:
      expose response to JS
    else:
      block JS from reading response
  else:
    send preflight OPTIONS
    if preflight allowed:
      send actual request
    else:
      stop here
```

## 模块 3｜追问与详细回答

### 追问 1｜为什么 `Postman` 没问题，浏览器却报 CORS？

- 因为 CORS 是浏览器环境下的安全约束，不是 HTTP 协议本身禁止你发请求。
- `Postman`、服务端脚本、本地网关调用通常不受浏览器同源策略约束。
- 所以它们能通，只能说明接口本身活着，不代表浏览器场景配置正确。
- 面试里如果能主动说出这一点，通常会比较加分。

### 追问 2｜为什么 `Access-Control-Allow-Origin: *` 不能和凭证随便一起用？

- 因为带凭证的跨源访问风险更高，浏览器要求服务器明确知道到底放行给哪个源。
- 如果你同时说“谁都行”和“还允许带 Cookie/认证信息”，浏览器不会接受这种过宽授权。
- 所以带凭证时，服务端必须返回精确源，而不是通配星号。
- 这也是 CORS 常见配置错误之一。

### 追问 3｜什么情况下会触发预检请求？

- 通常是请求不属于“简单请求”时，比如用了 `PUT`、`DELETE`，或者带了自定义请求头，或者 `Content-Type` 不是简单类型。
- 浏览器会先发 `OPTIONS` 去问服务器：这种方法、这些头、这个源，你到底让不让发。
- 服务器允许后，浏览器才会继续正式请求。
- 所以排查时不能漏掉预检链路。

### 追问 4｜Cookie 跨站访问除了 CORS 还要看什么？

- 还要看 Cookie 自身属性，比如 `SameSite`、`Secure`。
- 就算服务器 CORS 头都配对了，如果 Cookie 策略不允许，浏览器也可能不会带上或不会接受。
- 所以跨域登录、单点登录这类问题，不能只盯着 `Access-Control-Allow-Origin`。
- CORS 负责的是“能不能读”，Cookie 策略还影响“带不带”和“存不存”。

### 追问 5｜线上遇到 CORS 报错，你先怎么排查？

- 先确认前端页面源和接口源到底哪里不同，是协议、域名还是端口不一致。
- 再看是简单请求还是预检请求失败，Network 面板里把 `OPTIONS` 和正式请求都翻出来。
- 再核对响应头：`Access-Control-Allow-Origin`、`Allow-Methods`、`Allow-Headers`、`Allow-Credentials` 是否和请求实际情况匹配。
- 如果带 Cookie，再补看 `SameSite` 和 `credentials` 配置。
- 最后再确认是不是网关、代理、CDN 把响应头改没了。
