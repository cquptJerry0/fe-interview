# Vue2 vs Vue3 响应式

副标题：`Object.defineProperty`、`Proxy`、`Observer / Dep / Watcher`、`track / trigger / effect`、`ref`、运行时响应式

口径说明：这篇以 Vue 官方文档、Vue 2.7 官方迁移文档和 `vuejs/core` / `vuejs/vue` 官方源码为准。Vue 2 已在 2023 年 12 月 31 日进入 EOL，这一点我会明确写进专题里；涉及 Vue 3 当前实现时，以官方文档公开口径为主，源码细节作为工程化解释补充。

## 原始题干

字节跳动一面原题：

1. Vue2 和 Vue3 响应式区别

## 原始题干补充 1｜Vue 2 风格数据

```js
const vm = new Vue({
  data() {
    return {
      user: {
        name: "alice"
      },
      list: [1, 2, 3]
    };
  }
});

vm.user.age = 18;
vm.list[1] = 200;
```

## 原始题干补充 2｜Vue 3 风格数据

```js
import { reactive, ref, computed, watchEffect } from "vue";

const state = reactive({
  user: {
    name: "alice"
  },
  list: [1, 2, 3]
});

const count = ref(0);
const plusOne = computed(() => count.value + 1);

watchEffect(() => {
  console.log(state.user.name, plusOne.value);
});

state.user.age = 18;
state.list[1] = 200;
count.value++;
```

## Part 1｜技术讲解

### 1. 一句话结论

高分答案不能只答“Vue2 用 `Object.defineProperty`，Vue3 用 `Proxy`”。

更完整的说法应该是：

Vue2 的响应式更像“围绕组件实例和已有属性做 getter/setter 劫持”，核心链路是 `Observer -> defineReactive -> Dep -> Watcher`，并靠数组方法改写、`Vue.set` / `Vue.delete` 去补洞；Vue3 则把响应式抽成了独立的 `@vue/reactivity` 体系，核心链路变成 `reactive/ref -> track -> trigger -> ReactiveEffect`，对象由 `Proxy` 代理，`ref` 仍用 getter/setter，能力边界更完整，也更适合组合式 API、计算属性、侦听器和现代编译优化。

一句更像面试口语的话：

Vue3 不只是把 `defineProperty` 换成了 `Proxy`，而是把整个响应式架构从“组件内的观察者模型”升级成了一套可独立组合的运行时依赖追踪系统。

### 2. 主链路图

```txt
Vue 2
data 初始化
  ->
Observer 遍历对象
  ->
defineReactive 为每个已有属性定义 getter / setter
  ->
getter 收集依赖到 Dep
setter 通知 Dep
  ->
Watcher 重新求值 / 组件重新渲染
  ->
数组靠改写变异方法补洞
新增属性 / 删除属性靠 Vue.set / Vue.delete
```

```txt
Vue 3
reactive(obj)
  ->
Proxy 拦截 get / set / has / deleteProperty / ownKeys
  ->
get 时 track(target, key)
set / add / delete 时 trigger(target, key)
  ->
ReactiveEffect / computed / watchEffect 等订阅关系被重跑
  ->
组件 render effect 重新渲染
```

```txt
Vue 3 中 ref
ref(value)
  ->
RefImpl
  ->
读取 .value 时 track
写入 .value 时 trigger
```

### 3. 先讲当前官方口径

#### 3.1 Vue 2 已经是历史版本，Vue 3 才是当前默认口径

这一点面试里很容易漏，但其实很重要。

Vue 2 官方仓库 README 已经明确写了：

1. Vue 2 在 2023 年 12 月 31 日进入 EOL。
2. 新项目官方明确建议从 Vue 3 开始。

这意味着今天如果题目问 “Vue2 和 Vue3 响应式区别”，高分答法不该只停在历史对比，还应该带一句现代结论：

Vue2 要会，因为很多存量项目还在跑；但今天真正的默认心智模型，应该切到 Vue3 的响应式系统。

#### 3.2 Vue 3 官方文档现在怎么定义自己的响应式

Vue 官方 `Reactivity in Depth` 现在写得很清楚：

1. Vue 的响应式系统本质上是运行时响应式。
2. Vue 2 出于旧浏览器兼容，使用 getter/setter。
3. Vue 3 对响应式对象用 `Proxy`，但 `ref` 仍然用 getter/setter。

这三句其实已经够你把很多八股校正过来了：

1. Vue3 不是“所有东西都改成 Proxy”。
2. Vue3 的响应式不是编译时魔法主导，核心仍然是运行时追踪。
3. `ref` 的存在，不是 API 偶然设计，而是和运行时响应式、JavaScript 语法边界有关。

### 4. Vue2 的响应式到底怎么工作

#### 4.1 Vue2 的核心不是“劫持对象”，而是“先把已有属性都改造成响应式属性”

从 Vue2 官方源码 `src/core/observer/index.ts` 看，入口是 `Observer` 和 `defineReactive`。

`Observer` 做的事情可以概括成两类：

1. 如果值是对象，就遍历已有 key，把每个 key 变成 getter/setter。
2. 如果值是数组，就改写数组变异方法，并继续观察数组项。

源码里 `Observer` 构造函数会给值打上 `__ob__`，对象路径继续走“遍历 key”，数组路径则走数组增强逻辑。

#### 4.2 `defineReactive` 才是 Vue2 响应式的真正核心

源码里的 `defineReactive` 很值得记，因为它直接说明了 Vue2 的响应式边界。

它的主线是：

1. 为当前属性创建一个 `Dep`。
2. 通过 `Object.defineProperty` 定义 getter / setter。
3. getter 里做依赖收集。
4. setter 里做依赖通知。

所以 Vue2 本质上是“属性级”的响应式，而不是“对象行为级”的响应式。

这句话很关键，因为它直接解释了为什么 Vue2 会有新增属性、删除属性、数组索引这些老问题。

#### 4.3 Vue2 为什么天然对新增属性不友好

因为 `defineReactive` 只能处理“初始化时就已经存在的 key”。

例如：

```js
vm.user.age = 18;
```

如果 `age` 在初始化时不存在，那它就没被 `defineReactive` 包装过，自然也就没有 getter/setter，后面直接赋值不会自动触发那条依赖链。

这也是为什么 Vue2 需要：

1. `Vue.set`
2. `this.$set`
3. `Vue.delete`

来补这种运行后新增和删除的场景。

源码里 `set()` 和 `del()` 的存在，本身就是 Vue2 响应式边界的铁证。

#### 4.4 Vue2 为什么数组也麻烦

Vue2 对数组的难点不只是“索引更新不方便”，更深一层是：

JavaScript 本身没法像对象属性 getter 那样，优雅地逐项拦截数组索引访问和长度变化。

所以 Vue2 的做法是：

1. 改写数组变异方法，比如 `push`、`pop`、`splice`。
2. 在必要时通过 `dependArray()` 去补依赖收集。

这也是为什么：

```js
vm.list[1] = 200;
```

在 Vue2 里不会像你想象的那样自然稳定，很多场景需要借助：

```js
Vue.set(vm.list, 1, 200)
```

或者用 `splice`。

#### 4.5 Vue2 的依赖图景：Dep 和 Watcher

高频口语里经常说“Vue2 用发布订阅”，这句话不算错，但太粗。

更准确地讲：

1. `Dep` 可以理解成某个响应式属性对应的依赖桶。
2. `Watcher` 是订阅者，比如渲染 watcher、计算属性 watcher、用户 watch。
3. getter 触发依赖收集时，当前 watcher 会订阅当前 dep。
4. setter 更新时，dep 再通知相关 watcher 重新求值。

所以 Vue2 的心智模型更像：

组件实例数据里的每个已有属性，各自持有一个依赖桶，变化时去唤醒依赖它的 watcher。

### 5. Vue3 的响应式为什么不是“简单替换 API”

#### 5.1 Vue3 把响应式抽成了独立能力层

Vue3 的关键升级，不只是 `Proxy`，而是响应式从组件实例内部能力，变成了可以独立使用、自由组合的一层系统。

你今天可以在组件外写：

1. `reactive`
2. `ref`
3. `computed`
4. `watchEffect`

然后它们仍然能组成一条完整的依赖追踪链。

Vue 官方文档甚至明确说：

在 Vue3 里，Options API 本身也是建立在 Composition API 之上的。

这句话的含义非常大：

Vue3 的响应式不再只是“组件 data 的内部实现”，而是整个现代 Vue 编程模型的基础设施。

#### 5.2 官方文档里的概念模型：track / trigger / active effect

Vue 官方 `Reactivity in Depth` 给了一套很清楚的伪代码：

1. `reactive(obj)` 返回 `Proxy`
2. `get` 时 `track(target, key)`
3. `set` 时 `trigger(target, key)`
4. 当前正在运行的 effect 会在读取时被收集

文档里还明确用了：

`WeakMap<target, Map<key, Set<effect>>>`

来帮助理解“依赖存在哪”。

这里要注意一个面试细节：

1. 这是官方文档的概念模型，特别适合解释原理。
2. 当前 `vuejs/core` 源码为了性能做了更细的实现优化，不必机械认为源码里就一定还是最朴素的 `WeakMap -> Map -> Set`。

换句话说：

口语里你可以先用官方这套概念模型解释依赖追踪，再补一句“实际源码做了进一步优化”。

#### 5.3 Vue3 源码里真正的关键字

如果面试官继续往底层追，Vue3 源码里最值得你记住的是这些名字：

1. `ReactiveEffect`
2. `track`
3. `trigger`
4. `baseHandlers`
5. `RefImpl`

这些名字能帮你证明你不是只会背文档概念。

### 6. Vue3 对象响应式：为什么 Proxy 是架构升级

#### 6.1 Proxy 拦截的是“对象行为”，不是单个已存在属性

Vue2 用 `defineProperty`，本质是“给已有 key 装 getter/setter”。

Vue3 用 `Proxy`，本质是“代理整个对象的行为”。

这带来几个直接好处：

1. 可以拦截 `get`
2. 可以拦截 `set`
3. 可以拦截 `has`
4. 可以拦截 `deleteProperty`
5. 可以拦截 `ownKeys`

这就是为什么 Vue3 对：

1. 新增属性
2. 删除属性
3. `in` 判断
4. `for...in`
5. `Object.keys`

这类场景的追踪能力都更完整。

#### 6.2 Vue3 源码里的 `baseHandlers` 在做什么

`packages/reactivity/src/baseHandlers.ts` 里能直接看到：

1. `get` 里会 `track`
2. `set` 时会区分 `ADD` 和 `SET`
3. 删除属性时会触发 `DELETE`
4. `has` 和 `ownKeys` 也能参与追踪

这说明 Vue3 的响应式已经不再是“属性值改没改”的单薄模型，而是可以把对象层面的多种操作都纳入依赖系统。

#### 6.3 为什么 Vue3 对数组天然更顺手

因为数组本质也是对象，`Proxy` 可以统一代理它的访问和变更行为。

这并不是说数组从此“完全没有任何坑”，而是说：

Vue3 不再像 Vue2 那样，需要主要依赖数组方法改写和 `Vue.set` 这些补洞 API 去兜。

这就是两代响应式在工程体验上的巨大差异。

### 7. Vue3 的 `ref` 为什么仍然不是 Proxy

#### 7.1 官方文档已经明确写了：对象用 Proxy，ref 用 getter/setter

这是特别适合面试里主动补的一句。

很多人会把 Vue3 讲成“全面 Proxy 化”，这并不准确。

官方文档明确说：

1. `reactive` 用 Proxy
2. `ref` 用 getter/setter

#### 7.2 `RefImpl` 到底在做什么

从 `packages/reactivity/src/ref.ts` 可以看到，`RefImpl` 的 `.value`：

1. getter 时会追踪依赖
2. setter 时会触发依赖

这就解释了为什么 `ref` 必须有 `.value` 这一层访问容器。

更本质的原因，是 Vue 的响应式系统主要是运行时的，而 JavaScript 本身无法对局部变量赋值做统一拦截，所以需要一个显式容器来承载“可追踪的值访问”。

这点和官方文档 “Runtime vs. Compile-time Reactivity” 是对得上的。

### 8. Vue3 的 effect、computed、watch 到底怎么串起来

#### 8.1 响应式的核心订阅者不再叫 Watcher，而是 effect

Vue2 的核心订阅者心智是 `Watcher`。

Vue3 更适合记成：

1. `ReactiveEffect`
2. `computed`
3. `watchEffect`
4. `watch`

它们底层都站在依赖追踪系统之上。

官方文档已经明确说：

`computed` 内部会用响应式 effect 管理失效和重新计算。

这句话很值钱，因为它把“计算属性”从 API 现象直接拉到底层机制。

#### 8.2 Vue3 源码里的 `ReactiveEffect`

`packages/reactivity/src/effect.ts` 当前源码里 `ReactiveEffect` 明确存在，而且包含：

1. 依赖链记录
2. `scheduler`
3. `run`
4. `stop`

这说明 Vue3 的 effect 已经不是“简单回调重跑”，而是一套带调度、带清理、带依赖关系维护的响应式执行单元。

这也是为什么今天讲 Vue3 响应式时，答法应该升级到：

`Proxy / ref` 负责把读写接进系统，`track / trigger` 负责连依赖，`ReactiveEffect` 负责订阅和重跑。

### 9. Vue2 和 Vue3 的核心差异，不只是“能力更强”

#### 9.1 响应式粒度和边界不同

Vue2：

1. 主要围绕已有属性
2. 对新增 / 删除 / 数组索引存在天然缺口
3. 需要额外 API 补洞

Vue3：

1. 以对象行为代理为核心
2. 对 `get/set/has/delete/iterate` 覆盖更完整
3. 更适合现代 JavaScript 数据结构和组合式开发

#### 9.2 心智模型不同

Vue2 更像：

“组件实例 data 被观察，属性变化唤醒 watcher”

Vue3 更像：

“任意响应式源被读取时收集 effect，被写入时触发 effect”

这两个心智模型的差异，会直接影响你排查问题的方法。

#### 9.3 API 设计也不同

Vue2 常见的是：

1. `data`
2. `computed`
3. `watch`
4. `this.$set`

Vue3 常见的是：

1. `reactive`
2. `ref`
3. `computed`
4. `watchEffect`
5. `watch`
6. `shallowRef`

换句话说：

Vue3 的响应式已经从“框架内部默认能力”，升级成“开发者可以直接组合的底层积木”。

### 10. Vue 2.7 是一个很值得主动补的现代细节

#### 10.1 为什么这点重要

很多面试官会默认你知道 Vue2 和 Vue3 的老区别，但如果你能主动补 Vue2.7 的官方迁移文档，会明显显得口径更新。

Vue 2.7 官方迁移文档明确说：

1. 它回移了 Composition API。
2. 但底层仍然基于 Vue2 的 getter/setter 响应式系统。
3. 所有 Vue2 的 change detection caveats 仍然存在。

这意味着：

Vue2.7 不是“半个 Vue3”，而是“把一部分现代 API 放回了旧响应式引擎上”。

#### 10.2 Vue2.7 和 Vue3 的一个非常实用的身份差异

官方迁移文档里还给了一个特别值得背的例子：

在 Vue2.7 里：

```js
reactive(foo) === foo
```

是 `true`。

在 Vue3 里则是 `false`，因为 Vue3 返回的是代理对象。

这句特别适合用来证明：

Vue2.7 的 Composition API 只是能力回移，不代表底层实现已经变成 Vue3 的 Proxy 模型。

### 11. 运行时响应式和编译时响应式

#### 11.1 为什么这个点今天值得讲

Vue 官方文档现在专门有一节 “Runtime vs. Compile-time Reactivity”。

这意味着今天讲 Vue3 响应式，如果还只停在 `Proxy`，其实已经不够“现代”了。

#### 11.2 Vue 官方给出的口径

官方说得很直接：

1. Vue 的响应式系统基本是运行时的。
2. 追踪和触发发生在代码运行时。
3. 运行时方案的优点是不用强依赖构建步骤、边界情况少。
4. 缺点是受 JavaScript 语法限制，所以需要 `ref` 这样的值容器。

这和一些编译时响应式框架是不同路线。

所以面试里如果你能补一句：

Vue3 的响应式升级，不是把自己改造成编译时框架，而是在运行时体系下把依赖追踪做得更完整、更可组合。

这会明显比普通回答更强。

### 12. 和 today 的工程实践怎么连

#### 12.1 为什么 Vue3 更适合组合式 API

因为底层响应式已经独立化了。你可以在组件外组合：

1. 状态源
2. 计算派生
3. 副作用监听
4. 外部系统同步

这让逻辑复用比 Vue2 时代的 mixin 更清晰，也更少命名冲突和来源不透明问题。

#### 12.2 为什么浅层 API 变多了

Vue 官方现在还专门讲：

1. `shallowRef`
2. 与外部状态系统集成
3. 与 signals 的联系

这说明现代 Vue 的响应式设计已经不只是“更新模板”，而是在跟更广义的前端状态模型对接。

#### 12.3 真正的工程分水岭

今天如果你在排查问题：

Vue2 常见思路是：

1. 这个 key 是不是初始化时就存在
2. 数组是不是用了索引赋值
3. 是不是忘了 `Vue.set`

Vue3 常见思路是：

1. 我到底用的是 `reactive` 还是 `ref`
2. 这里是不是解构后丢失了响应连接
3. 是不是用浅层容器或外部状态导致追踪边界变化
4. effect / watch / computed 的依赖关系是不是理解错了

这两套排障模型完全不是一个时代。

### 13. 关键误判点

1. 不要只背“Vue2 是 `defineProperty`，Vue3 是 `Proxy`”，这只是入口，不是全貌。
2. 不要把 Vue3 讲成“所有响应式都靠 Proxy”，`ref` 仍然基于 getter/setter。
3. 不要把 Vue2 的问题只说成“性能差”，它更核心的问题是能力边界和模型局限。
4. 不要把 Vue2.7 当成 Vue3 的底层回移版，它的 Composition API 仍然跑在旧响应式系统上。
5. 不要把官方文档里的 `WeakMap -> Map -> Set` 概念模型，机械等同于当前源码所有内部数据结构。
6. 不要忽略运行时响应式这层现代口径，`ref` 的存在和这件事直接相关。
7. 不要把 Vue3 的优势只答成“更快”，更本质的是响应式被抽成了一套更完整、更可组合的系统。

### 14. 工程/业务例子

这题在真实业务里很落地：

1. 老后台系统里表单对象后加字段不更新，根因常常是 Vue2 初始化时没把这个 key 变成响应式。
2. 列表编辑页直接 `arr[index] = x` 不生效，往往还是 Vue2 的数组变更边界。
3. 迁移到 Vue3 后，很多逻辑可以抽成组合式函数，不再依赖 mixin 到处“混进去”。
4. 对接外部状态库时，Vue3 会更多考虑 `shallowRef`、响应边界和代理身份，而不是单纯“它是不是 data 里的字段”。
5. Vue2.7 项目里用了 Composition API 但仍踩 Vue2 caveats，这正是因为 API 回移了，底层引擎没换。

## Part 2｜面试作答

### 1. 思维导图关键点

```txt
Vue2 vs Vue3 响应式
├─ Vue2：Observer -> defineReactive -> Dep -> Watcher
├─ Vue2 围绕已有属性做 getter / setter
├─ 数组靠方法改写，新增/删除靠 Vue.set / Vue.delete
├─ Vue3：reactive / ref -> track / trigger -> ReactiveEffect
├─ 对象用 Proxy，ref 仍用 getter/setter
├─ Vue3 是运行时响应式，不是纯编译时魔法
├─ Vue2.7 回移了 Composition API，但 caveats 还在
└─ 本质是整套响应式架构升级，不只是换 API
```

### 2. 60-90 秒口语稿

如果面试官问 Vue2 和 Vue3 响应式区别，我不会只答 `defineProperty` 和 `Proxy`。更完整的说法是，Vue2 的响应式核心链路是 `Observer -> defineReactive -> Dep -> Watcher`，它本质上是在初始化时把已有属性改造成 getter/setter，所以对新增属性、删除属性、数组索引这类场景天然有边界，需要 `Vue.set`、`Vue.delete` 和数组方法补洞。Vue3 则把响应式抽成了独立体系，核心链路变成 `reactive/ref -> track -> trigger -> ReactiveEffect`。对象响应式主要靠 `Proxy` 拦截 `get/set/has/delete/iterate`，而 `ref` 仍然通过 getter/setter 包装 `.value`。所以 Vue3 不只是“换了个 API”，而是从围绕组件实例的观察者模型，升级成了一套可独立组合的运行时依赖追踪系统。这也是为什么 Vue3 更适合组合式 API、计算属性、侦听器和外部状态集成。再补一个现代细节，Vue2.7 虽然回移了 Composition API，但官方文档明确说它底层仍是 Vue2 的 getter/setter 响应式，所以所有 Vue2 的 change detection caveats 依然存在。真实业务里像表单后加字段不更新、数组索引赋值不生效、迁移后逻辑复用方式变化，这些问题本质上都落在这条链上。

### 3. 高频追问

#### 追问 1｜Vue3 为什么不把 `ref` 也做成 Proxy

因为 Vue 官方当前口径本来就是：对象用 `Proxy`，`ref` 用 getter/setter。再往底层讲，Vue 的响应式主要是运行时的，JavaScript 不能直接拦截普通局部变量赋值，所以才需要 `.value` 这样的值容器。

#### 追问 2｜Vue2 为什么一定要 `Vue.set`

因为 Vue2 只能把初始化时已有的 key 变成响应式。运行后新增属性没有被 `defineReactive` 包装过，所以要靠 `Vue.set` 临时把它接进那条依赖链。

#### 追问 3｜Vue3 一定比 Vue2 快吗

不能这么绝对。更稳的说法是 Vue3 的响应式模型更完整、边界更自然、组合能力更强，很多场景下工程体验和能力边界明显更优，但真实性能还要看具体组件结构、渲染量和使用方式。

#### 追问 4｜Vue2.7 和 Vue3 最大的误区是什么

最大的误区是把 Vue2.7 当成“底层已经接近 Vue3”。官方迁移文档明确说，Vue2.7 的 Composition API 仍然跑在 Vue2 的 getter/setter 响应式上，所以 caveats 还在。

#### 追问 5｜Vue3 的依赖收集到底怎么理解最稳

先用官方文档的概念模型理解：读取时 `track`，写入时 `trigger`，当前 active effect 会被记录为依赖。再补一句当前源码做了更细的实现优化，这样口径既现代又稳。

### 4. 复习标记

复习标记：一追就进总专题

## 官方资料

1. Vue 官方：Reactivity in Depth  
https://vuejs.org/guide/extras/reactivity-in-depth.html

2. Vue 官方中文：深入响应式系统  
https://cn.vuejs.org/guide/extras/reactivity-in-depth

3. Vue 2.7 官方迁移文档  
https://v2.vuejs.org/v2/guide/migration-vue-2-7

4. Vue 2 官方仓库 README  
https://github.com/vuejs/vue

5. Vue 3 官方仓库  
https://github.com/vuejs/core

6. Vue2 源码：`Observer` / `defineReactive` / `set` / `del`  
https://github.com/vuejs/vue/blob/main/src/core/observer/index.ts

7. Vue3 源码：`effect.ts`  
https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts

8. Vue3 源码：`baseHandlers.ts`  
https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts

9. Vue3 源码：`ref.ts`  
https://github.com/vuejs/core/blob/main/packages/reactivity/src/ref.ts
