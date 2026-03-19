# 前端手写题 3 题：事件通信、商品列表 diff、请求去重缓存与超时保护

副标题：`on`、`once`、`emit`、按 `id` 对比列表、并发去重、缓存、超时保护

口径说明：这篇按“笔试最小可用版 + 面试追问位”整理。默认先给可手写、可口述、代码量可控的第一版，再补关键边界和进阶追问。

## Part 1｜这组三题在考什么

### 一句话结论

这 3 道题表面上分别在考事件通信、列表对比和异步请求控制，底层其实都在考一件事：

先抽一个稳定 key，再围绕这个 key 管理状态变化。

### 总套路图

```txt
拿到题目
  ->
先找稳定 key
  ->
事件题：eventName
列表题：商品 id
请求题：请求 key
  ->
再设计状态表
  ->
事件题：events[name]
列表题：旧商品、新商品
请求题：cache[key] / pending[key]
  ->
最后写主流程
  ->
注册 / 执行一次 / 触发
新增 / 删除 / 修改
命中缓存 / 复用请求 / 超时失败
```

## Part 2｜题 1：事件通信

### 原始题干

实现一个工厂函数，满足 `on`、`once`、`emit` 三个核心方法。

### 思维导图关键点

```txt
事件通信
├─ 先准备一张 events 表
├─ key 是事件名
├─ value 是回调函数数组
├─ on 就是注册
├─ once 是包一层再注册
├─ emit 就是按顺序执行
└─ 执行一次的回调执行后要删掉
```

### 60-90 秒口语稿

这题我会先用一个 `events` 对象来存所有事件，key 是事件名，value 是回调数组。`on` 很简单，就是把回调函数塞进去；`emit` 就是找到这个事件对应的数组，然后把回调依次执行。`once` 的核心是包一层 `wrapper`，真正注册进去的是 `wrapper`，等它执行时先把自己从数组里删掉，再调用原回调，这样就只能执行一次。这里我会顺手用一份浅拷贝来遍历，避免回调执行过程中改原数组，影响本轮触发顺序。真实业务里像组件通信、埋点通知、发布订阅，核心都是这套思路。

### 最小可用版代码

```js
function createEventBus() {
  const events = {}

  const api = {
    on(name, fn) {
      if (!events[name]) events[name] = []
      events[name].push(fn)
      return api
    },

    once(name, fn) {
      function wrapper(...args) {
        events[name] = (events[name] || []).filter(cb => cb !== wrapper)
        fn(...args)
      }

      api.on(name, wrapper)
      return api
    },

    emit(name, ...args) {
      const list = (events[name] || []).slice()

      for (const fn of list) {
        fn(...args)
      }

      return api
    }
  }

  return api
}
```

### 关键边界 / 高频追问

1. 为什么 `emit` 里要先 `.slice()`
因为 `once` 执行时会删监听器，如果直接遍历原数组，边遍历边修改容易跳项。

2. 如果不要求链式调用，`return api` 可以去掉吗
可以，去掉后逻辑不受影响，只是不能继续 `bus.on(...).emit(...)` 这种连写。

3. 如果要支持取消订阅怎么办
再补一个 `off(name, fn)`，把对应回调从数组里移除即可。

4. 时间复杂度
`on` 和 `once` 注册阶段可以看成 `O(1)`；`emit` 需要把当前事件的监听器跑一遍，所以是 `O(k)`，`k` 是该事件的监听器个数。

5. 空间复杂度
整体空间复杂度是 `O(k)`，本质上取决于当前总共注册了多少监听器。

## Part 3｜题 2：商品列表 diff

### 原始题干

实现一个函数，比较编辑前后商品列表，找出哪些商品是新增，哪些商品被去除，哪些字段被修改了。

### 思维导图关键点

```txt
商品列表 diff
├─ 先确认同一个商品靠什么识别
├─ 默认用 id 当主键
├─ 先把新旧列表建成 Map
├─ 找不到旧商品就是新增
├─ 找到了就用 key 并集比较
├─ 再遍历旧表
└─ 新表里找不到就是删除
```

### 60-90 秒口语稿

这题我会先和面试官确认商品主键，通常默认用 `id`。如果按严格口径要覆盖字段增删改，我会直接把新旧列表建成 `Map`，因为这里 `Map` 既能明显降低复杂度，也不会把代码写得更绕。主流程就是：先按 `id` 建两张表；遍历新表时，旧表里没有就是新增，旧表里有就用 `Set` 合并新旧 key 比出 `changes`；最后再遍历旧表，新表里没有就是删除。这样主版本既完整，也比反复 `find` 更稳。

### 最小可用版代码

```js
function diffGoods(oldList, newList) {
  const oldMap = new Map(oldList.map(item => [item.id, item]))
  const newMap = new Map(newList.map(item => [item.id, item]))

  const add = []
  const remove = []
  const update = []

  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id)

    if (!oldItem) {
      add.push(newItem)
      continue
    }

    const changes = {}
    const keys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)])

    for (const key of keys) {
      if (key === 'id' || oldItem[key] === newItem[key]) continue

      changes[key] = {
        before: oldItem[key],
        after: newItem[key]
      }
    }

    if (Object.keys(changes).length) {
      update.push({
        id,
        changes
      })
    }
  }

  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      remove.push(oldItem)
    }
  }

  return { add, remove, update }
}
```

### 关键边界 / 高频追问

1. 为什么主版本直接用了 `Map + Set`
因为这题既要覆盖字段增删改，又天然有稳定主键 `id`。`Map` 能把反复查找降成查表，`Set` 能把新旧字段并起来统一比较，这样主版本既正确，也不难讲。

2. 如果字段里有对象或数组怎么办
这版是浅比较，只适合普通标量字段。如果字段里还有嵌套对象，要继续确认是比引用，还是做深比较。

3. 这版和 `find` 版相比，提升主要在哪
提升点在查找。`find` 版每次都要去数组里扫，`Map` 版先建索引，后面直接 `get` 和 `has`，所以整体复杂度会更低。

4. 时间复杂度
建两张 `Map` 是 `O(n + m)`，后面分别遍历新表和旧表也是 `O(n + m)`。如果把字段比较成本记成 `f`，更严谨一点可以写成 `O(n + m + u * f)`，`u` 是两边都存在、需要比字段的商品数。如果字段数近似看成常数，整体就接近 `O(n + m)`。

5. 空间复杂度
空间复杂度主要来自两张 `Map` 和结果数组。只看辅助结构可以记成 `O(n + m)`；如果把输出结果也算上，再叠加新增、删除、修改结果量。

6. 如果题目只要求输出“哪些字段名变了”
那可以把 `changes` 从对象改成数组，代码还能再短一点。

## Part 4｜题 3：请求去重、缓存与超时保护

### 原始题干

多个模块可能同时请求同一接口，需要避免重复请求并缓存结果，同时对慢请求做超时保护。

### 思维导图关键点

```txt
请求去重
├─ 先准备两张表
├─ cache 存成功结果
├─ pending 存进行中的 Promise
├─ 先查 cache
├─ 再查 pending
├─ 都没有才发请求
├─ Promise.race 做超时保护
└─ 结束后一定清掉 pending
```

### 60-90 秒口语稿

这题最核心的是把“已经成功的结果”和“正在进行中的请求”分开存。我的做法是用两张表，`cache` 存成功结果，`pending` 存进行中的 Promise。请求进来先查 `cache`，命中就直接返回；再查 `pending`，如果已经有人在请求同一个 key，就直接复用那条 Promise；都没有才真正发请求。超时保护我会用 `Promise.race`，让真实请求和一个超时 Promise 竞速，谁先结束就用谁的结果。请求成功后写缓存，不管成功失败都要把 `pending` 清掉。这样多个模块同时进来时，底层只会发一次请求。

### 最小可用版代码

```js
function createRequest() {
  const cache = {}
  const pending = {}

  return function request(key, api, timeout = 3000) {
    if (key in cache) return Promise.resolve(cache[key])
    if (pending[key]) return pending[key]

    const p = Promise.race([
      Promise.resolve().then(api),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeout)
      })
    ])
      .then(res => {
        cache[key] = res
        return res
      })
      .finally(() => {
        delete pending[key]
      })

    pending[key] = p
    return p
  }
}
```

### 关键边界 / 高频追问

1. 为什么命中缓存时要 `Promise.resolve`
因为外部通常会继续 `.then(...)`，所以即使命中缓存，也最好保持返回值类型一致，统一返回 Promise。

2. 为什么这里不额外包一层 `catch`
因为这层封装的职责主要是去重、缓存、超时和清理 `pending`。清理逻辑已经放在 `finally` 里了，错误继续交给调用方处理更清晰。

3. `Promise.race` 能真正取消请求吗
不能。它只能让外层更快失败，底层请求不一定停掉。如果要真取消，请继续补 `AbortController`。

4. 时间复杂度
不考虑真实网络耗时，`cache` 和 `pending` 的查表平均都可以认为是 `O(1)`，这层封装自身的逻辑也是 `O(1)`。

5. 空间复杂度
空间复杂度是 `O(c + p)`，`c` 是缓存条目数，`p` 是进行中的请求数。

6. `key` 应该怎么设计
最好把接口路径、请求方法、查询参数一起编码进去，不能只写一个接口名，否则不同请求容易串缓存。

## Part 5｜面试里怎么把这组三题串起来

如果面试官连续问这三题，我会把它们统一成一句话：

“这几题看起来题型不一样，但核心都是先抽一个稳定 key，再围绕这个 key 管理状态。事件题按事件名存回调，列表题按商品 id 判断新增删除修改，请求题按请求 key 记录缓存和进行中的 Promise。第一版我会先写最小可用版，保证能写对、能讲顺，后面再补复杂度和优化方向。”
