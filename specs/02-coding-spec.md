# 手写线 Spec

## 定位

手写线负责现场编码能力。

目标不是收藏题解，而是形成能现场写、能口述、能处理边界的题型库。

## 范围

手写线只分三部分：

- JS
- React
- LeetCode

## 推荐目录

```text
coding/
  js/
  react/
  leetcode/
```

## 管理单位

以题型为单位，不以单份面经或单道零散题为单位。

示例：

```text
coding/js/
  debounce-throttle.md
  promise.md
  concurrency-control.md
  deep-clone.md
  lru.md
  event-emitter.md

coding/react/
  use-debounce.md
  use-request.md
  mini-usestate.md
  component-patterns.md

coding/leetcode/
  two-pointers.md
  binary-search.md
  tree.md
  dp-basic.md
```

## 题型页模板

```text
# 题型标题

## 题型定位

这类题考什么。

## 核心思路

现场怎么推。

## 标准实现

代码。

## 口述模板

边写边怎么说。

## 边界情况

哪些 case 容易漏。

## 变体

面试可能怎么改题。

## 错点

我自己容易错在哪里。

## 来源

raw 或面经来源。
```

## 可上场标准

一个手写题型进入可上场，需要满足：

- 能不看答案写出核心实现。
- 能解释关键步骤。
- 能处理主要边界。
- 能说出至少一个变体。

## 当前优先级

优先启动：

- JS 高频手写
- React 高频手写
- LeetCode 高频题型

这条线确定性最高，可以最先进入执行。

