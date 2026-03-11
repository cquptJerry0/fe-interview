# React Hooks 底层与规则

副标题：渲染快照、组件树位置、dispatcher、Hook 链表、调用顺序、Effect 边界

口径说明：这篇以 React 官方文档和官方源码为准。当前 react.dev 页面显示的公开版本是 `react@19.2`。内部实现细节以官方仓库当前源码为参考，属于“基于官方源码的工程化解释”，不是稳定 API 承诺。

## 原始题干

字节跳动一面原题：

1. 知道 Hooks 吗？
2. Hooks 在 React 什么地方都能使用吗？

## 原始题干补充 1｜条件调用 Hook

```jsx
function UserPanel({ isLogin }) {
  if (isLogin) {
    const [name, setName] = useState("");
    return <div>{name}</div>;
  }

  return <div>guest</div>;
}
```

## 原始题干补充 2｜直接调用组件函数

```jsx
function Article() {
  const [count] = useState(0);
  return <div>{count}</div>;
}

function Page() {
  return <main>{Article()}</main>;
}
```

## 原始题干补充 3｜自定义 Hook

```jsx
function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
```

## Part 1｜技术讲解

### 1. 一句话结论

Hooks 不是“函数组件里的一组工具函数”这么简单。更准确的理解是：

React 在渲染函数组件时，会把当前渲染 Fiber 设为上下文，再通过 dispatcher 把每一次 Hook 调用映射到这棵 Fiber 上的一串 Hook 节点；React 之所以强制 Hook 只能在组件或自定义 Hook 顶层调用，本质上是因为它要依赖稳定的调用顺序，把“这一次 `useState` / `useEffect`”和“上一次渲染时的同一个 Hook 槽位”对应起来。

一句更适合面试的说法是：

Hooks 的规则不是语法洁癖，而是 React 为了在函数式渲染模型里稳定保存状态、关联副作用和实现调度而做出的约束。

### 2. 主链路图

```txt
React 开始渲染某个函数组件
  ->
为当前 render 设置 dispatcher
  ->
组件函数被调用
  ->
每次 useXxx 都会走 resolveDispatcher()
  ->
dispatcher 根据 mount / update 走不同实现
  ->
Hook 节点挂到当前 Fiber.memoizedState 链表
  ->
下次 render 继续按调用顺序复用同一串 Hook 节点
  ->
顺序一旦变化
  ->
状态槽位错位 / DEV 警告 / 运行时错误
```

```txt
为什么只能在 React 函数里调用
  ->
因为只有 React 正在渲染时，dispatcher 才存在
  ->
普通函数、事件回调、类方法、模块顶层
  ->
都不在 render phase
  ->
resolveDispatcher() 拿不到合法 dispatcher
```

### 3. 先把 Hooks 放回 React 的整体模型里

#### 3.1 Hooks 解决的不是“复用代码”，而是“复用带状态的逻辑”

早期 React 主要靠 class 组件承载本地状态和生命周期。Hooks 把这些能力搬到了函数组件里，但代价是 React 必须重新解决一个根本问题：

函数每次渲染都会重新执行，局部变量不会天然保留，那状态到底放哪？

React 官方文档现在的公开口径很明确：

1. 状态不是保存在 JSX 标签里。
2. 状态也不是简单保存在组件函数的局部变量里。
3. React 把状态和组件在渲染树里的位置关联起来。

这正是 Hooks 必须由 React 自己调度的根本原因。

#### 3.2 状态为什么说“在 React 里，不在组件里”

React 官方在 “State as a Snapshot” 和 “Preserving and Resetting State” 里都在强化一个心智模型：

1. 渲染时，React 调用你的组件函数。
2. 你的组件拿到的是这一次 render 的 state 快照。
3. 真正的状态存储由 React 持有，并且和树上的位置绑定。

这能解释很多面试高频坑：

1. 为什么同一个组件在不同位置渲染，会有不同状态。
2. 为什么加不同 `key` 会重置状态。
3. 为什么 stale closure 会读到旧值。

### 4. React 调用 Hooks 时，底层先发生了什么

#### 4.1 公共 Hook API 并不自己存状态

从 React 官方源码 `packages/react/src/ReactHooks.js` 看，像 `useState`、`useEffect`、`useMemo` 这类 Hook，公共入口都会先做一件事：

1. 调 `resolveDispatcher()`
2. 拿到当前 dispatcher
3. 再委托给 `dispatcher.useState`、`dispatcher.useEffect` 等具体实现

这意味着公共 Hook API 本身只是门面。真正的行为不在 `useState` 这个导出函数里，而在当前 render phase 注入进去的 dispatcher 上。

#### 4.2 为什么不在 render phase 里调用就会报错

同一个文件里，`resolveDispatcher()` 会去读 `ReactSharedInternals.H`。官方源码里如果这个 dispatcher 为空，会给出著名的 “Invalid hook call” 报错，并明确列出三类常见原因：

1. React 和 renderer 版本不匹配
2. 违反了 Rules of Hooks
3. 应用里有多个 React 副本

这就是“为什么 Hook 不能在普通函数里调用”的源码级答案。

更口语化一点就是：

只有 React 正在渲染组件时，它才知道当前这次 Hook 应该挂到哪个 Fiber 上；离开这个时机，Hook 就失去了运行上下文。

### 5. mount 和 update 为什么是两套 dispatcher

#### 5.1 React 必须区分“第一次挂载”和“后续更新”

官方源码 `ReactFiberHooks.js` 里，在渲染某个 Fiber 时会根据：

1. `current` 是否存在
2. `current.memoizedState` 是否为空

来决定当前使用 `HooksDispatcherOnMount` 还是 `HooksDispatcherOnUpdate`。

这背后的原因很直接：

1. mount 时要创建 Hook 节点、初始化状态和依赖。
2. update 时要沿着旧链表复用节点、比对依赖、计算新状态。

所以不要把 Hooks 理解成“每次 render 都重新创建一切”。更准确的说法是：

组件函数会重新执行，但 Hook 对应的状态槽位会在 React 管理的数据结构里被复用。

#### 5.2 为什么这件事和规则直接相关

一旦调用顺序改变，update 阶段就没法把“这次第 3 个 Hook”对齐到“上次第 3 个 Hook”。也就是说，mount / update 这套机制天然要求调用顺序稳定。

这也是 Hooks 规则不是约定俗成，而是底层实现的硬前提。

### 6. Hook 节点到底存在哪

#### 6.1 官方源码里是挂在 Fiber 上的一串链表

从 `ReactFiberHooks.js` 可以直接看到，mount 阶段会把第一个 Hook 挂到：

`currentlyRenderingFiber.memoizedState`

后续 Hook 再通过：

`workInProgressHook = workInProgressHook.next = hook`

依次串起来。

也就是说，对某个函数组件来说，当前 render 对应的各个 Hook 不是存在数组字面量里，而是存在当前 Fiber 上的一串 Hook 链表里。

#### 6.2 为什么很多文章爱说“按索引取 Hook”

这是教学上的简化，不是完全错，但不够精确。

它想表达的是：

React 依赖调用顺序来定位 Hook 槽位。

但更贴近官方源码的说法是：

React 在 render 过程中按顺序遍历和构建 Hook 链表，mount 时创建节点，update 时按顺序复用节点。

所以“按索引”只是便于理解，真正实现更接近“按顺序走链表”。

### 7. 为什么 Hook 只能在顶层调用

#### 7.1 顶层调用的真正目的，是保证顺序稳定

React 官方 `rules-of-hooks` 现在写得非常直白：

React relies on the order in which hooks are called to correctly preserve state between renders.

这句话的含义就是：

每次 render，React 预期你调用 Hook 的顺序和上次完全一致。

所以以下情况都会破坏这个前提：

1. 条件分支里调用 Hook
2. 循环里调用 Hook
3. 提前 return 之后再调用 Hook
4. 回调函数、事件处理函数、异步函数里调用 Hook

#### 7.2 条件调用为什么会让状态串位

例如：

```jsx
function Demo({ flag }) {
  const [a] = useState(1);

  if (flag) {
    useEffect(() => {}, []);
  }

  const [b] = useState(2);
  return <div>{a + b}</div>;
}
```

第一次 `flag = true` 时，顺序是：

1. `useState(a)`
2. `useEffect`
3. `useState(b)`

下一次 `flag = false` 时，顺序变成：

1. `useState(a)`
2. `useState(b)`

这样原本属于第 3 个位置的 Hook，会被 React 当成第 2 个位置来对齐，状态和副作用都会错位。

#### 7.3 React 在开发环境里怎么帮你发现问题

官方源码里有一套 DEV 校验逻辑，例如 `hookTypesDev` 会记录当前 Hook 名字序列，并在更新阶段对比，如果顺序或类型对不上，就触发 mismatch 警告。

这说明：

1. 规则不是只靠 ESLint 静态检查。
2. React runtime 在开发环境也会尽量帮你兜底发现顺序错乱。

但根本解法永远不是“绕过规则”，而是保证调用结构本身稳定。

### 8. 为什么 Hook 只能从 React 函数里调用

#### 8.1 React 官方规则是两层

React 官方对 Hooks 的约束其实是两条：

1. Only call Hooks at the top level
2. Only call Hooks from React functions

第二条经常被候选人说得太浅，像“普通函数里不能用”。这句话对，但不够有说服力。

更底层的解释是：

1. 只有函数组件 render 时，React 才知道当前 Fiber 是谁。
2. 只有自定义 Hook 在组件 render 链路中被调用时，React 才还能沿这条链继续定位当前 Hook。
3. 普通函数、模块顶层、类方法都不受 React 调度。

所以它们没有资格直接调用 Hook。

#### 8.2 为什么自定义 Hook 可以继续调用 Hook

因为自定义 Hook 本质上不是脱离 React 的特殊实体，它只是一个“在 render 阶段被调用的逻辑函数”。

只要满足两件事：

1. 它最终仍然是在函数组件 render 过程中被调用。
2. 它自己的内部 Hook 调用顺序稳定。

那 React 就能把它内部的 Hook 继续接到当前 Fiber 的 Hook 链上。

#### 8.3 为什么组件函数不能直接当普通函数调用

React 官方 “React calls Components and Hooks” 文档现在把这件事写得很明确：

组件应该只通过 JSX 让 React 来调用，而不是自己手动 `Article()`。

原因不只是风格问题，而是：

1. React 需要自己 orchestrate rendering。
2. React 需要把本地状态和树中的身份绑定。
3. 组件类型要参与 reconciliation。
4. 只有让 React 调组件，它才能安全地调度、跳过、恢复、优先级切换。

所以：

```jsx
return <Article />;
```

和：

```jsx
return Article();
```

在 React 语义里不是一回事。后者很容易把 Hooks 规则也一起绕坏。

### 9. `use` 是一个现代例外，但不是“规则废了”

React 19 官方 `rules-of-hooks` lint 文档里专门强调：

`use` hook is different from other React hooks.

当前官方口径下，`use` 可以：

1. 条件调用
2. 在循环里调用

但它仍然有边界：

1. 不能包在 `try/catch` 里
2. 仍然必须在组件或 Hook 里调用

这说明两个点：

1. “Hooks 规则”不是一块一成不变的大石头，React 新能力会有特例。
2. 面试里答这题时，如果你能主动补一句“但 `use` 是官方文档明确标出来的例外”，会显得你口径是新的。

### 10. Hooks 为什么和渲染快照、闭包、旧值问题强相关

#### 10.1 每次 render 都是一张新的快照

React 官方 “State as a Snapshot” 文档现在用的心智模型非常重要：

1. 渲染就是 React 调用你的组件函数。
2. 这次 render 拿到的是这次的 state 快照。
3. 这次 render 里创建出来的事件处理函数，也会闭包住这次 render 的变量。

这就解释了为什么：

1. 事件处理函数里可能读到旧 state。
2. 定时器、异步回调、订阅回调里容易出现 stale closure。
3. `setState(number + 1)` 连调多次和你直觉不一样。

#### 10.2 stale closure 不是 Hooks 发明的，是 JS 闭包遇上 React 渲染模型

本质上：

1. JavaScript 本来就有词法作用域和闭包。
2. React 函数组件每次 render 都重新执行。
3. 每次 render 都会产生属于那一轮的变量和函数。

所以一个旧事件处理函数继续执行时，看见的是旧 render 那张快照，这很正常。

面试里如果能把 stale closure 解释成：

“JS 闭包 + React render snapshot 的叠加结果”

会比单纯说“Hooks 有闭包陷阱”强得多。

### 11. Effect 在现代 React 里的正确定位

#### 11.1 Effect 不是数据流引擎，是 escape hatch

React 官方现在的口径已经很明确：

1. `useEffect` 是让组件和外部系统同步。
2. 如果没有外部系统，很多场景根本不需要 Effect。
3. 不要用 Effect 编排本来属于 render 或事件处理的逻辑。

所以现代 React 面试里，答 `useEffect` 时最好不要停留在“相当于 componentDidMount / componentDidUpdate”。这已经不够新了。

更稳的说法是：

Effect 是 escape hatch，用来同步外部系统，不是默认的数据处理容器。

#### 11.2 为什么依赖数组不能靠“我觉得不用加”

React 官方 “Removing Effect Dependencies” 文档强调的是：

依赖应该和代码一致，而不是由开发者随意挑选。

只要 Effect 里读了某个 reactive value，比如：

1. props
2. state
3. 组件函数内声明的变量或函数

它通常就是依赖。

所以依赖数组的本质不是“优化选项”，而是“同步边界声明”。

#### 11.3 eslint-plugin-react-hooks 现在也不只检查两条规则

现在 React 官方的 `eslint-plugin-react-hooks` 推荐规则，已经不只是大家熟悉的：

1. `rules-of-hooks`
2. `exhaustive-deps`

还包含不少和 React Compiler、静态组件、purity、refs、render 中 setState 等有关的校验。

这件事的工程意义是：

Hooks 今天已经不是一个孤立 API 集，而是一整套和 render purity、依赖同步、编译优化互相勾连的约束系统。

### 12. Hooks 和 Fiber、树位置、key 的关系

#### 12.1 状态为什么和树中的位置绑定

React 官方 “Preserving and Resetting State” 文档明确说：

State is tied to a position in the render tree.

这句话很关键，因为它把 Hooks 的“状态保留”从组件函数层面，提升到了 Fiber 树位置层面。

你可以这样理解：

1. React 不是给“某个函数源码”永久绑状态。
2. React 是给“当前树上这个位置的这个组件实例”绑定状态。

所以：

1. 同一个组件类型出现在不同位置，状态不同。
2. 同一个位置上的同类型组件，状态会被保留。
3. 换了 `key`，就相当于告诉 React 这是新的身份，状态会重置。

#### 12.2 为什么不要在组件内部嵌套定义子组件

官方文档也专门提醒：

不要嵌套定义组件，否则会意外重置状态。

因为每次 render 都重新创建一个新的组件定义，本质上相当于组件身份不稳定，React 就更难按预期复用之前那棵子树上的状态。

这类问题面试里不一定直接问 Hooks，但本质仍然回到“状态和组件树身份绑定”。

### 13. 关键误判点

1. 不要把 Hooks 理解成“函数组件版生命周期”。
2. 不要把“只能在顶层调用”理解成单纯语法规定，它是顺序稳定的实现前提。
3. 不要把“状态在组件里”当成准确说法，React 官方已经明确更接近“状态由 React 持有，并和树位置绑定”。
4. 不要把“按索引取 Hook”当成源码级准确描述，更贴近实现的是“按顺序遍历 Hook 链表”。
5. 不要把 stale closure 甩锅给 Hooks，本质是闭包和 render snapshot 的叠加。
6. 不要把 `useEffect` 当成默认数据流容器，现代 React 更强调它是 escape hatch。
7. 不要把 Hooks 规则理解成永远没有例外，`use` 是官方明确给出的特殊情况。
8. 不要把 “Invalid hook call” 简化成“你写错地方了”，它还可能是双 React 副本或 React / renderer 版本不匹配。

### 14. 工程/业务例子

这套知识在真实业务里很常见：

1. 广告配置面板里把 `useState` 放进条件分支，切换 tab 后表单状态串位。
2. 搜索页里旧事件处理函数读到旧筛选条件，本质上是 render snapshot + 闭包。
3. 某个团队把 `useEffect` 当数据编排中心，结果依赖数组越来越难维护，频繁出现重复请求和死循环。
4. 业务组件被人直接当普通函数调用，状态、DevTools 和性能优化一起失效。
5. 列表切换 `key` 后状态被重置，不是 React 抽风，而是组件树身份真的变了。

如果你能把这些问题统一解释到“dispatcher + Hook 链表 + 树位置 + render snapshot”这条主线上，Hooks 这题就算答透了。

## Part 2｜面试作答

### 1. 思维导图关键点

```txt
React Hooks
├─ 状态由 React 持有，和树位置绑定
├─ render 时通过 dispatcher 进入具体 Hook 实现
├─ Hook 节点挂在当前 Fiber.memoizedState 链表上
├─ update 依赖稳定调用顺序复用 Hook 节点
├─ 所以 Hook 只能在组件 / 自定义 Hook 顶层调用
├─ stale closure = JS 闭包 + render snapshot
├─ useEffect 是 escape hatch，不是默认数据流
└─ use 是 React 19 官方文档里的特殊例外
```

### 2. 60-90 秒口语稿

Hooks 当然知道，但我不会只把它答成“函数组件里可以用状态”。更底层的理解是，React 在渲染函数组件时，会给当前 render 设置 dispatcher，像 `useState`、`useEffect` 这些公共 Hook API 其实都会先走 `resolveDispatcher()`，再进入当前的 mount 或 update 实现。Hook 节点会按调用顺序挂到当前 Fiber 的 `memoizedState` 链表上，下一次 render 再按同样顺序复用，所以 React 才强制 Hook 只能在函数组件或自定义 Hook 的顶层调用，不能放到条件、循环、回调里，否则状态槽位就会错位。再结合 React 官方现在的口径，状态其实是 React 持有并和组件在树中的位置绑定的，每次 render 组件函数拿到的是这一次的 state 快照，所以 stale closure、本地状态重置、`key` 改变后状态丢失，这些现象都能解释通。工程上我会特别注意两点：第一，不把 `useEffect` 当默认数据流容器；第二，尽量让 Hooks 调用结构稳定、可静态分析，这样 linter、调试和后续维护都会更稳。像配置表单、搜索筛选、广告投放面板这种页面，一旦 Hooks 顺序和依赖边界写乱，线上问题会非常隐蔽。

### 3. 高频追问

#### 追问 1｜为什么 Hook 只能在顶层调用

因为 React 依赖每次 render 时一致的调用顺序，把当前 Hook 对应到上一次 render 的同一个 Hook 节点。顺序一变，状态和副作用都会错位。

#### 追问 2｜为什么 Hook 只能在 React 函数里调用

因为只有 React 正在渲染时，当前 dispatcher 和当前 Fiber 上下文才存在。普通函数、类方法、模块顶层都不在这条 render 链路里。

#### 追问 3｜自定义 Hook 为什么可以继续调用 Hook

因为自定义 Hook 本质上还是 render 过程中的逻辑函数，只要它最终是在组件 render 中被稳定调用，内部 Hook 也能继续挂到当前 Fiber 的 Hook 链上。

#### 追问 4｜为什么直接调用组件函数不行

因为组件应该由 React 通过 JSX 来调用，这样它才能把状态、树身份、reconciliation 和调度绑在一起。直接 `Component()` 容易绕坏 Hooks 规则和调度模型。

#### 追问 5｜stale closure 和 Hooks 的关系是什么

本质是 JavaScript 闭包和 React render snapshot 叠加的结果。旧回调继续执行时，看到的是旧 render 那轮的 state 快照。

#### 追问 6｜`useEffect` 现在最稳的理解是什么

它是 escape hatch，用来同步外部系统，不是默认的数据流容器。很多场景其实不需要 Effect，依赖数组也应该和代码真实读取的 reactive value 对齐。

#### 追问 7｜所有 Hook 都绝对不能放在条件里吗

大多数 Hook 都不行，但 React 19 官方文档明确把 `use` 作为例外列出来了。它可以条件调用和循环调用，但仍然必须在组件或 Hook 里用，而且不能包在 `try/catch` 里。

### 4. 复习标记

复习标记：一追就进总专题

## 官方资料

1. React 官方：Rules of Hooks  
https://react.dev/reference/rules/rules-of-hooks

2. React 官方：rules-of-hooks lint  
https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks

3. React 官方：React calls Components and Hooks  
https://react.dev/reference/rules/react-calls-components-and-hooks

4. React 官方：Components and Hooks must be pure  
https://react.dev/reference/rules/components-and-hooks-must-be-pure

5. React 官方：State as a Snapshot  
https://react.dev/learn/state-as-a-snapshot

6. React 官方：Preserving and Resetting State  
https://react.dev/learn/preserving-and-resetting-state

7. React 官方：Removing Effect Dependencies  
https://react.dev/learn/removing-effect-dependencies

8. React 官方：You Might Not Need an Effect  
https://react.dev/learn/you-might-not-need-an-effect

9. React 官方源码：`ReactHooks.js`  
https://github.com/facebook/react/blob/main/packages/react/src/ReactHooks.js

10. React 官方源码：`ReactFiberHooks.js`  
https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js
