---
title: "React Hooks 为什么不能乱用？从规则、顺序和副作用时机讲清"
tags: ["react.hooks.rules", "react.hooks.internal"]
type: "八股"
difficulty: 4
---

## 这题在问什么

这题经常不是孤立题，而是 React 追问链的入口：
- 为什么 Hooks 不能写在 `if` 里
- `useEffect` 依赖为什么会重跑
- `useEffect` 和 `useLayoutEffect` 时机差在哪

## 60 秒直答

Hooks 规则的本质不是代码风格，而是 React 要靠调用顺序定位每个 Hook 的状态。函数组件每次渲染时，React 会按固定顺序读取 Hook 链表；如果你把 Hook 放进条件或循环里，顺序一变，状态就会错位。所以 Hooks 必须只在组件顶层或自定义 Hook 顶层调用。面试里我不会停在这一步，还会补一句：一旦继续深挖，核心会走到依赖比较、effect 重跑和布局时机，这几块最好分开讲。

## 核心机制

- React 不是靠 Hook 名字找状态，而是靠顺序
- `useState`、`useEffect`、`useMemo` 都共享这个前提
- 规则是为了保证每次渲染顺序稳定

## 最小例子

```js
function Demo({ flag }) {
  if (flag) {
    useState(0) // ❌ 顺序不稳定
  }
  useEffect(() => {}, [])
}
```

## 业务 / 验证

真实项目里最常见的问题不是“故意把 Hook 写进 if”，而是：
- 条件分支过多导致副作用顺序混乱
- 依赖数组不稳定导致 effect 重跑
- 闭包问题让 effect 拿到旧值

所以这题答完后，最好主动引到更深的追问卡。

## 常见追问

- 为什么 Hooks 不能在普通函数里用？
- `useEffect` 依赖是怎么比较的？
- `useLayoutEffect` 比 `useEffect` 早在哪里？
- stale closure 和 Hooks 是什么关系？

## 易错点

- 把 Rules of Hooks 只当 eslint 规则
- 只会背“不能写在 if 里”，讲不出为什么
- 不知道这题背后其实连着 effect 时机和依赖比较

## 关联深挖

- [useEffect 依赖比较与重跑排查](../02-专题深挖/05-useEffect-依赖比较与重跑排查.md)
- [useEffect vs useLayoutEffect 执行时机](../02-专题深挖/06-useEffect-vs-useLayoutEffect-执行时机.md)
