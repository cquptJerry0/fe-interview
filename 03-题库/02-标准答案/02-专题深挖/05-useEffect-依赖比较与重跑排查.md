---
title: "useEffect 依赖比较与重跑排查"
tags: ["react.hooks.internal", "react.effect.dependencies"]
type: "专题深挖"
difficulty: 4
---

## 为什么要深挖这题

因为很多 React 面经会从 Hooks 规则继续追问到：
- 依赖是浅比较还是深比较
- 为什么对象 / 函数会让 effect 重跑
- 线上怎么定位 effect 异常重跑

## 上游原理

- Hooks 状态靠顺序定位
- `useEffect` 依赖数组是副作用同步边界
- React 对依赖逐项做引用级比较，而不是深比较对象内容

## 核心机制拆解

- 基本类型比较值
- 引用类型比较引用
- 新对象、新数组、新函数每次 render 都可能是新引用

## Demo / 最小复现

```tsx
useEffect(() => {
  console.log('effect rerun')
}, [{ a: 1 }]) // 每次 render 都会重新执行
```

稳定写法：

```tsx
const stableObject = useMemo(() => ({ a: 1 }), [])
useEffect(() => {
  console.log('stable effect')
}, [stableObject])
```

## 排障脚本

- 先查依赖里有没有对象、数组、匿名函数
- 再给每项依赖打日志，看哪项引用总在变
- 再决定是拆原子值、`useMemo` 还是 `useCallback`
- 最后用 React DevTools 看 render 原因

## 什么时候该用 / 不该用

- 优先拆原子依赖，不要一上来全靠 `useMemo`
- 不是所有重复执行都要“优化掉”，要先确认 effect 是否真的有副作用成本

## 面试追问链

- 为什么 React 不做深比较？
- `Object.is` 和 `===` 有什么差异？
- 依赖里放函数时怎么稳定引用？
