---
title: "React Hooks 为什么不能在 if/loop 里用？从底层链表与游标原理讲清"
tags: ["react.hooks.rules", "react.hooks.internal"]
type: "八股"
difficulty: 4
---

## 一句话结论

函数组件每次渲染都会重新执行，Hooks 之所以能“记住状态”，是因为 React 在 fiber 上维护一条 hook 状态链表并用游标按调用顺序取用；因此 hooks 只能在组件/自定义 hook 顶层调用，不能放在 if/loop/嵌套函数里，否则调用顺序变化会导致状态错位。

## 解释（从零到一）

底层模型（代码层原理）：
- 每个组件对应一个 fiber
- fiber 上有一条 hooks 链表（或等价结构），每个节点保存一次 hook 的状态（state/effect deps 等）
- 渲染开始时游标指向头节点；每执行一个 hook，取当前节点并游标后移

```text
Fiber
  └─ memoizedState -> Hook1 -> Hook2 -> Hook3 -> null
                         ↑       ↑
                     useState  useEffect
```

为什么 if 会错位（最小反例）：

```js
function C({ flag }) {
  if (flag) useState("A"); // 有时调用
  useState("B");           // 永远调用
}
```

- flag=true：hook 序列是 [A, B]
- flag=false：hook 序列是 [B]
React 仍按“第 1 个 hook / 第 2 个 hook”去取状态，导致 B 读到原来 A 的位置，出现状态串台。

正确写法：
- hook 顶层调用，把条件放到 hook 内部逻辑
- 或拆组件保证每个组件的 hook 序列固定

## 图解

```text
调用顺序 = hooks 身份
顺序不稳定 -> 游标错位 -> state/effect 绑定错
```

## 对比与取舍

- 条件调用 hook vs 拆组件
  - 条件调用：不可用（顺序不稳定）
  - 拆组件：每个组件 hooks 固定，语义清晰；缺点是组件数增加，但更可维护

## 实践与验证

- DevTools/排障：
  - 遇到“状态莫名串台/某个 effect 对不上依赖”，先检查 hooks 是否在条件/循环/嵌套函数里
  - 开启 eslint rules-of-hooks 可以静态阻止高危写法

## 常见追问

- Hooks 能在普通函数/事件回调里调用吗？为什么？
- 自定义 hook 为什么也必须顶层？
- `use` 前缀除了约定还有什么作用（lint 静态分析）？

## 易错点

- 在事件回调里调用 hook（它不是 render 过程）
- 用随机 key 或频繁卸载组件导致“看似 hooks 失效”（其实是组件重挂载）
