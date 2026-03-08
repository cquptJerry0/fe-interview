---
title: "什么是跨域？CORS 是怎么工作的？"
tags: ["security.sop", "security.cors", "network.http.cors"]
type: "八股"
difficulty: 4
---

## 这题在问什么

这题真正想确认的是：
- 你知不知道浏览器为什么要限制跨域
- 你是否能把同源策略、CORS、预检请求讲成一条清晰链路
- 出线上问题时你会不会排查请求头和响应头

## 60 秒直答

跨域本质上是浏览器的同源策略限制，不是服务器“不能请求”。同源要求协议、域名、端口都一致。CORS 是浏览器和服务器约定的一套跨域放行机制：浏览器带上 `Origin`，服务器返回 `Access-Control-Allow-Origin` 等响应头，浏览器再决定是否把结果交给 JS。简单请求直接发，复杂请求会先发一次 `OPTIONS` 预检，确认方法、头和凭证是否被允许。

## 核心机制

- 同源策略限制的是浏览器环境里的读权限
- CORS 不是绕过同源策略，而是受控放行
- 带 Cookie 时，前端要 `credentials: 'include'`，后端不能把 `Allow-Origin` 写成 `*`

## 最小例子

```js
fetch('https://api.example.com/user', {
  method: 'GET',
  credentials: 'include',
})
```

服务端至少要配：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

## 业务 / 验证

排查 CORS 我一般按这个顺序：
- 先看浏览器报错文案和 Network 面板
- 再看请求头里的 `Origin`
- 最后看响应头里有没有正确的 `Access-Control-Allow-*`

如果是预检失败，就重点看 `OPTIONS` 返回码和允许的方法、头是否齐全。

## 常见追问

- 为什么 Postman 能通，浏览器不行？
- 简单请求和预检请求怎么区分？
- 为什么带 Cookie 时不能 `Allow-Origin: *`？
- 代理转发和 CORS 的区别是什么？

## 易错点

- 把“跨域”理解成网络层请求发不出去
- 只会背头名，不会解释它们的作用
- 带 Cookie 跨域时漏掉前后端任意一端配置

## 关联深挖

- 如果继续被追问 cookie / token / CSRF，可以再建安全专题卡
