---
title: "Vue2 和 Vue3 响应式有什么区别？为什么 Vue3 要改成 Proxy？"
tags: ["vue.reactivity.defineproperty", "vue.reactivity.proxy"]
type: "对比题"
difficulty: 4
---

## 模块 1｜主回答

### 1）选择结论

- 这题不能只答成“`defineProperty` 和 `Proxy` 不一样”，而要答成“Vue2 有哪些天然盲区，Vue3 为什么要换方案”。
- Vue2 的核心是基于 `Object.defineProperty` 劫持已有属性，它能工作，但对新增属性、删除属性、数组下标和 `length` 变化支持不够自然，所以才需要 `Vue.set` 等补丁式写法。
- Vue3 改成 `Proxy` 后，可以代理整个对象，拦截能力更完整，对数组、`Map`、`Set` 这类结构支持也更自然，响应式模型更统一。
- 所以 Vue3 换 `Proxy` 不是为了“API 更潮”，而是为了解决 Vue2 的覆盖盲区和维护复杂度问题。

### 2）选择图 / 决策树（ASCII）

```txt
要解释 Vue2 和 Vue3 响应式差异
  |
  +-- 先看 Vue2 的限制
  |      -> 只能劫持已有属性
  |      -> 新增 / 删除属性不自然
  |      -> 数组下标 / length 处理麻烦
  |
  +-- 再看 Vue3 为什么换 Proxy
         -> 直接代理整个对象
         -> 支持新增 / 删除 / 数组 / 集合
         -> track / trigger 模型更统一
```

### 3）最小对比表 / 最小例子

```txt
Vue2
  关键词：defineProperty、已有属性劫持、数组补丁、Vue.set

Vue3
  关键词：Proxy、整体代理、track / trigger、集合支持更自然
```

```js
// Vue2 的典型问题
vm.user.age = 18 // 默认不天然响应
Vue.set(vm.user, 'age', 18)

// Vue3
const state = reactive({ user: {} })
state.user.age = 18 // 直接可响应
```

### 4）面试口语稿

- Vue2 和 Vue3 响应式最大的差别，不只是底层 API 名字换了，而是覆盖能力和模型统一性变了。Vue2 基于 `Object.defineProperty` 劫持已有属性，所以对象新增属性、删除属性、数组下标和 `length` 变化这类场景支持不够自然，才会有 `Vue.set` 之类补丁写法。Vue3 改成 `Proxy` 后，可以直接代理整个对象，对新增删除、数组、`Map`、`Set` 的拦截都更完整，再配合 `track` / `trigger`，整体模型更统一。面试里我会强调：Vue3 不是单纯“性能更好”，而是把 Vue2 很多历史盲区一起收掉了。

## 模块 2｜深入展开

### 1）对比维度

- 拦截粒度：是劫持已有属性，还是代理整个对象。
- 新增删除属性是否自然支持。
- 数组和集合类型处理是否统一。
- 依赖收集和触发更新模型是否一致。
- 维护成本和边界补丁是否复杂。

### 2）选项本体拆解

- Vue2 会在初始化时遍历对象已有属性，用 `Object.defineProperty` 给每个属性挂上 getter / setter。这决定了它对“后来新增的属性”天然不敏感。
- Vue2 对数组的很多响应式能力，需要通过重写变更方法去补，比如 `push`、`splice` 这些；但直接改下标或改 `length`，就没那么自然。
- Vue3 的 `Proxy` 是对整个对象做代理，读取时做依赖收集，写入时触发更新，模型更统一。
- Vue3 不只是对象更自然，对 `Map`、`Set` 这类集合结构也更容易纳入同一套响应式体系。

### 3）取舍 / 易错点

- 不要把答案只讲成“Vue3 更快”，更重要的是解释“为什么 Vue2 会有盲区”。
- `Proxy` 不能被完整 polyfill，所以这也是 Vue3 和更老环境兼容策略的现实边界之一。
- Vue3 也不是所有场景都“绝对更快”，性能要看具体数据结构、访问路径和渲染开销。
- 真正高分答案要把“能力覆盖、模型统一、维护复杂度”一起讲出来。

### 4）专题判断

- 这题可以进入模板化回答。
- 如果继续追问 `track` / `trigger` 细节、`ref` 与 `reactive`、调度器和副作用收集，建议补内部专题深挖卡。

### 难题加厚｜额外图

```txt
Vue3 响应式核心链路

读取 state.user.name
  -> Proxy get
  -> track(effect, key)

修改 state.user.name = 'bob'
  -> Proxy set
  -> trigger(key)
  -> 通知依赖这个 key 的 effect 更新
```

### 难题加厚｜额外例子

```js
const state = reactive({ list: [1, 2], map: new Map() })

state.list[0] = 100
state.list.length = 1
state.map.set('theme', 'dark')
```

- 这类数组和集合场景，正是 Vue3 统一代理能力更容易讲清的地方。

### 难题加厚｜精炼伪代码

```txt
proxy.get(key):
  track(activeEffect, key)
  return target[key]

proxy.set(key, value):
  target[key] = value
  trigger(key)
```

## 模块 3｜追问与详细回答

### 追问 1｜为什么 `Proxy` 不能被完整 polyfill？

- 因为它拦截的是语言层面对对象操作的底层行为，不是普通函数层面的简单补丁。
- 这类能力如果宿主环境本身没有，靠 JavaScript 代码没法完全模拟出同等语义。
- 所以 Vue3 采用 `Proxy` 后，也意味着对运行环境能力有更明确的要求。
- 这不是 Vue 的选择问题，而是语言能力边界。

### 追问 2｜Vue2 为什么数组处理会比较别扭？

- 因为 `defineProperty` 更适合拦截已有属性的读写，不擅长覆盖数组这类索引和长度频繁变化的结构。
- 所以 Vue2 要靠重写数组变更方法去补这部分能力。
- 这也是为什么直接改下标、直接改 `length` 在 Vue2 里容易显得不自然。
- 面试里如果你能说出这一层，通常已经不是只会背 API 了。

### 追问 3｜`track` 和 `trigger` 可以怎么理解？

- `track` 可以理解成“谁在读我，我先记下来”。
- `trigger` 可以理解成“我变了，通知之前依赖我的那些副作用重新执行”。
- 一个负责收集依赖，一个负责触发依赖。
- Vue3 的响应式统一性，很大程度上就体现在这套模型更清晰。

### 追问 4｜Vue3 响应式是不是绝对比 Vue2 快？

- 不能这么绝对讲。
- Vue3 的优势不只在速度，更在能力覆盖和模型统一。
- 性能要看实际场景，比如对象规模、访问方式、渲染成本和调度策略。
- 所以更稳的说法是：Vue3 的响应式能力更完整，很多场景下也更容易做出更好的性能表现，但不要把它背成绝对结论。

### 追问 5｜如果面试官继续追 `ref` 和 `reactive`，你怎么接？

- 我会先说：它们都属于 Vue3 响应式体系，只是包裹形态和使用场景不同。
- `reactive` 更适合对象整体代理，`ref` 更适合单值或需要明确 `.value` 边界的场景。
- 但这是下一层专题，不会混在这道主回答里讲太散。
- 这样既能接住追问，又不会把当前问题答乱。
