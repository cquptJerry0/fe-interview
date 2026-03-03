# Go HTTP Server（最小 demo）

目标：用最小可验证样例理解 Go 的 HTTP 服务基本链路（路由 → handler → 响应）。

## 运行

```bash
go run .
```

## 验证

```bash
curl "http://localhost:8080/health"
```

期望输出：

```json
{"ok":true}
```

## 面试可讲点

- handler 的输入输出是什么
- 如何做中间件（下一步 demo）
