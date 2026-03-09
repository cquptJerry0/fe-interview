---
title: "React Hooks 为什么不能乱用？从规则、顺序和副作用时机讲清"
tags: ["react.hooks.rules", "react.hooks.internal"]
type: "八股"
difficulty: 4
---

## 模块 1｜主回答

### 1）一句话结论

- Hooks 不能乱用的根因，不是 React 在“卡你语法”，而是 React 依赖每次渲染时 Hook 调用顺序稳定，才能把状态和副作用正确对应到同一个组件实例位置上。
- 所以 Hooks 必须只在函数组件顶层或自定义 Hook 顶层调用，不能写在 `if`、循环、普通函数里。
- 另外，副作用也分时机：`useLayoutEffect` 更靠近 DOM 提交后、浏览器绘制前，`useEffect` 更偏绘制后的普通副作用阶段。
- 这题真正高分点在于：不仅知道规则，还能讲清规则背后的“顺序槽位”和“副作用时机”。

### 2）原理图（ASCII）

```txt
一次 render 时，React 按调用顺序记录 Hook

render 1
  slot 1 -> useState(name)
  slot 2 -> useEffect(fetchList)
  slot 3 -> useMemo(filters)

render 2
  slot 1 -> 还得是 useState(name)
  slot 2 -> 还得是 useEffect(fetchList)
  slot 3 -> 还得是 useMemo(filters)

如果中间多了 / 少了一个 Hook
  -> 后面所有 slot 对不上
  -> 状态和副作用都会错位
```

### 3）最小例子

```js
function Demo({ flag }) {
  const [count] = useState(0)

  if (flag) {
    useEffect(() => {
      console.log('wrong')
    }, [])
  }

  const [name] = useState('alice')
  return <div>{count}-{name}</div>
}
```

```txt
问题不在 if 本身，而在 flag 变化后，Hook 调用顺序发生了变化。
```

### 4）面试口语稿

- React Hooks 不能乱用，本质原因是 React 在一次次渲染中不是靠变量名找状态，而是靠调用顺序给每个 Hook 分配位置。如果你把 Hook 写进 `if`、循环或者普通函数里，下一次渲染调用顺序一变，后面的状态槽位就全乱了，所以规则才会要求 Hooks 只能写在函数组件顶层或自定义 Hook 顶层。副作用时机也要分清：`useLayoutEffect` 更靠近 DOM 提交后、浏览器绘制前，适合读写布局；`useEffect` 更适合普通副作用。面试里如果能把“规则、顺序、时机”串起来讲，就不只是背 eslint 规则了。

## 模块 2｜深入展开

### 1）原理链路

```txt
为什么 Hooks 不能乱写？
  -> React 需要稳定的 Hook 顺序
  -> 顺序稳定才能复用同一组状态槽位
  -> 条件分支 / 循环会破坏顺序
  -> 副作用还要区分发生在什么阶段
```

- `useState`、`useEffect`、`useMemo`、`useRef` 这些 Hook，本质上都共享“按顺序取槽位”这个前提。
- React 并不是靠你写的变量名识别状态，而是靠当前渲染过程中第几个 Hook 调用。
- 所以 Rules of Hooks 不是“风格建议”，而是底层实现要求的外化。

### 2）业务化解释

- 真实项目里最常见的问题，不一定是明显把 Hook 写进 `if`，而是条件逻辑太多后，副作用和依赖变得不稳定。
- 比如一个列表页里，筛选对象、请求函数、回调函数每次 render 都变，`useEffect` 就可能不断重跑。
- 再比如有人为了少执行一次 effect，故意漏依赖，最后又引出 stale closure 旧值问题。
- 所以这题一旦讲到项目里，通常会自然连到依赖比较、effect 时机和闭包问题。

### 3）取舍 / 易错点

- 自定义 Hook 不是例外，它之所以能用 Hook，是因为它自己也必须遵守稳定调用顺序。
- `useEffect` 和 `useLayoutEffect` 不能只记“一个早一个晚”，更重要的是知道为什么要分开用。
- 不要把 Rules of Hooks 只理解成 eslint 限制，它背后是 React 状态映射机制。
- 依赖数组不是“想写什么就写什么”，更不是“能少写就少写”。
- 常见误区是：规则背下来了，但讲不出为什么；或者只会说“不能写在 if”，讲不出顺序槽位和副作用阶段。

### 4）深挖判断

- 这题可以进入模板化回答。
- 如果继续追问 `useEffect` 依赖比较、`useLayoutEffect` 的布局时机、stale closure、StrictMode 双执行，建议补内部专题深挖卡。

### 难题加厚｜额外图

```txt
一次更新里的大致时机

render phase
  -> 计算 JSX
  -> 读取 Hook 槽位
  -> 生成待提交结果

commit phase
  -> 更新 DOM
  -> 运行 useLayoutEffect
  -> 浏览器绘制
  -> 运行 useEffect
```

### 难题加厚｜额外例子

```js
function Demo({ id }) {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    setWidth(document.getElementById('box').offsetWidth)
  }, [id])

  useEffect(() => {
    console.log('report width', width)
  }, [width])

  return <div id="box">content</div>
}
```

- 这里 `useLayoutEffect` 更适合读布局，`useEffect` 更适合后续日志、请求、订阅这类普通副作用。

### 难题加厚｜精炼伪代码

```txt
hookIndex = 0

useState(initial):
  slot = hooks[hookIndex]
  if slot not exists:
    slot = initial
  hookIndex += 1
  return slot

renderComponent():
  hookIndex = 0
  run component function in stable order
```

## 模块 3｜追问与详细回答

### 追问 1｜为什么自定义 Hook 里可以继续调用 Hook？

- 因为自定义 Hook 本质上还是一个“受规则约束的函数封装”，它不是绕开规则，而是把符合规则的 Hook 组合逻辑抽出去。
- 只要自定义 Hook 自己也保持在顶层稳定调用，它内部调用 Hook 就没有问题。
- 所以它是复用逻辑的机制，不是规则豁免。
- 面试里这样讲，比单纯说“官方允许”更完整。

### 追问 2｜`useEffect` 和 `useLayoutEffect` 到底差在哪？

- 两者都属于副作用，但时机不同。
- `useLayoutEffect` 更靠近 DOM 提交后、浏览器绘制前，所以适合读写布局、同步测量，避免闪动。
- `useEffect` 更适合普通副作用，比如请求、订阅、日志、事件绑定等。
- 如果把布局测量放到 `useEffect`，页面有时会先闪一下再修正。

### 追问 3｜`useEffect` 依赖为什么会重跑？

- 因为 React 会在前后两次渲染之间比较依赖数组中每一项是否变化。
- 基本类型主要看值，引用类型主要看是不是同一个引用。
- 如果你在 render 里临时创建对象、数组、函数，很容易导致依赖“看起来没变，实际上引用变了”，effect 就会重跑。
- 所以这题常和 Hooks 原理一起追问。

### 追问 4｜为什么开发环境里 effect 有时会执行两次？

- 先不要马上怀疑依赖数组。
- 在 React 18 开发环境下，如果开启了 `StrictMode`，某些副作用会被额外执行一次，用来帮助发现不安全副作用。
- 这属于开发期检查行为，不一定代表线上逻辑真的执行两次。
- 所以排查时要先分清，是依赖变化，还是开发模式特性。

### 追问 5｜stale closure 和 Hooks 规则是什么关系？

- stale closure 不是 Hooks 规则本身，但它经常出现在 Hook 使用不当的场景里。
- 回调和 effect 拿到的是创建它们那一刻的变量快照，如果依赖没写对，就可能一直拿旧值。
- 所以“顶层稳定调用”解决的是顺序问题，“依赖正确声明”解决的是值更新问题。
- 这也是为什么 Hooks 面试题常常一问就连成一串。
