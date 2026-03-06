---
title: "React Hooks 为什么不能在 if/loop 里用？从底层链表与游标原理讲清"
tags: ["react.hooks.rules", "react.hooks.internal"]
type: "八股"
difficulty: 4
---

## 一句话结论

Hooks 的状态不是靠变量名识别，而是靠“调用顺序”定位。React 在 Fiber 上维护 hooks 状态链表，渲染时按顺序读取；一旦你把 hook 放进 `if/loop` 导致顺序变化，就会状态错位。规则本质是“保证调用序稳定”。

## 技术解释

### 1) Fiber 上的 hooks 存储模型

- 每个函数组件对应一个 Fiber。
- Fiber 上记录 hooks 链表（或等价结构）。
- 渲染开始时内部游标从头遍历，每调用一个 hook 游标前进一次。

```text
Fiber.memoizedState
  -> Hook(useState)
  -> Hook(useEffect)
  -> Hook(useMemo)
```

### 2) 为什么 `if` 会出错

```js
function Demo({ flag }) {
  if (flag) {
    useState(0);
  }
  useEffect(() => {}, []);
}
```

- `flag=true` 时，第一个 hook 是 `useState`。
- `flag=false` 时，第一个 hook 变成 `useEffect`。
- React 仍按“第 N 个 hook”取状态，最终读写错位。

### 3) 正确写法

- hooks 必须在组件顶层调用。
- 条件分支放进 hook 内部。
- 复杂分支可拆子组件或自定义 hook。

```js
const value = useMemo(() => {
  if (!flag) return null;
  return compute(flag);
}, [flag]);
```

### 4) Rules of Hooks 的两条核心规则

- 只在 React 函数组件或自定义 hook 中调用。
- 只在顶层调用，不在循环、条件、嵌套函数里调用。

### 5) 相关追问点

- `useEffect` 依赖数组不是“优化项”，而是副作用同步边界。
- `useRef` 不触发渲染，适合持有可变引用。
- 闭包陷阱与 hooks 结合时要关注 stale closure。

## 对比与取舍

- 条件 hook：写起来看似直观，但稳定性极差。
- 顶层 hook + 内部分支：语义稍绕，但可预测性高。
- 拆子组件：结构更清晰，代价是组件边界增加。

## 实践与验证

- 开启 `eslint-plugin-react-hooks`，把规则违规设为 error。
- 对复杂组件写渲染路径测试，覆盖关键条件组合。
- 对异步副作用使用取消机制，避免卸载后更新状态。

## 业务举例

### 背景与约束

- 复杂表单组件中根据权限条件动态调用 hooks，线上出现状态串台。
- 问题隐蔽，只在某些角色切换路径触发。
- 需要快速修复且不影响已有交互。

### 方案与取舍

- 把所有 hooks 提升到顶层，条件逻辑下沉到 hook 内部。
- 将权限分支拆分为子组件，减少单组件状态复杂度。
- 保留 lint 规则强约束，防止回归。

### 实施与验证

- 补齐角色切换路径单测，覆盖状态读写一致性。
- 使用 React DevTools 检查 hooks 顺序稳定。
- 灰度观察错误日志与状态异常反馈。

### 结果与复盘

- 状态错位问题消失，组件行为恢复稳定。
- 复盘确认根因是“顺序依赖被条件分支破坏”。
- 后续把“复杂分支优先拆组件”纳入规范。

## 面试口述版（60-90秒）

Hooks 不能放在 `if/loop` 里的根因是 React 通过调用顺序定位 hook 状态，而不是通过名字。每次渲染 React 都会按顺序遍历 Fiber 上的 hook 链表，顺序一变就会读错状态，所以规则要求 hooks 必须在顶层调用。我的实践是把条件放进 hook 内部，或者直接拆子组件，再配合 eslint 规则做强约束。线上我处理过一次条件 hook 导致状态串台的问题，重构后通过路径测试和灰度验证稳定上线。

## 追问

- 为什么 hooks 不能在普通函数里调用？
- stale closure 在 hooks 里怎么产生，如何规避？
- `useEffect` 依赖漏写会导致什么问题？
- 复杂组件什么时候该拆 hook，什么时候该拆子组件？

## 易错点

- 把 Rules of Hooks 当成语法限制，而非状态定位机制。
- 为了“少写几行”把 hooks 放进条件分支。
- 忽视副作用清理导致卸载后更新警告。
