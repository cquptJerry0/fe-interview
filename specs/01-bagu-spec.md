# 八股线 Spec

## 定位

八股线负责概念、原理、高频问题和 408 基础。

目标是把知识点加工成可上场回答，而不是整理成教材。

## 范围

当前确定范围：

- 前端基础
- JavaScript
- 浏览器
- React / Vue
- 计算机网络
- 操作系统
- 计算机组成
- 数据库基础

其中前端相关八股可以先启动。

408 相关内容需要先调研前端校招的真实深度，再细化范围。

## 推荐目录

```text
bagu/
  javascript/
  browser/
  framework/
  frontend-basic/
  network/
  os/
  computer-organization/
  database/
```

## 内容写法

大类采用总览页加问题页。

总览页负责建立整体心智。

问题页负责面试输出。

示例：

```text
bagu/framework/react/
  index.md
  rendering.md
  fiber.md
  hooks.md
  state-update.md
  reconciliation-key.md
  performance.md
```

## 问题页模板

```text
# 问题标题

## 一句话

这个问题最短怎么答。

## 回答框架

1. 先说什么
2. 再说什么
3. 最后补什么

## 原理解释

为什么是这样。

## 常见追问

可能怎么继续问。

## 易错点

哪些说法容易错。

## 来源

raw 或面经来源。
```

## 可上场标准

一个八股问题进入可上场，需要满足：

- 能一句话说清楚。
- 能结构化展开。
- 能解释为什么。
- 能接至少一个常见追问。

## 当前不确定项

需要调研：

- 408 在前端校招中的实际深度。
- 数据库基础是否只按八股线处理，还是部分进入项目线。
- Vue 是否需要作为独立模块，还是只做 React 对比补充。

