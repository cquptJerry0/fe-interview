---
title: "Vue2 vs Vue3 响应式完整对比"
tags: ["vue.reactivity.defineproperty", "vue.reactivity.proxy"]
type: "专题深挖"
difficulty: 4
---

## 为什么要深挖这题

因为 `defineProperty` 和 `Proxy` 只是表层词汇，真正拉开水平的是你能不能讲清“为什么要换”。

## 上游原理

- Vue2 初始化时要递归劫持已有属性
- Vue3 在访问层面统一代理对象
- 两者的差别最终体现为覆盖面、维护成本和扩展能力

## 核心机制拆解

### Vue2
- 递归遍历对象已有属性
- 用 getter / setter 做依赖收集和触发更新
- 对新增属性、数组索引、长度变化支持不自然

### Vue3
- 通过 Proxy 代理对象本身
- 在 `get` 时 `track`，在 `set` 时 `trigger`
- 对数组、Map、Set、属性新增删除支持更完整

## Demo / 最小复现

```js
// Vue2 常见痛点
vm.list[2] = 'x' // 默认不稳定
vm.list.length = 1 // 也不是天然可监听
```

```js
// Vue3
const state = reactive({ list: ['a', 'b'] })
state.list[1] = 'x'
state.list.push('c')
```

## 排障脚本

- 先判断问题发生在“新增属性”还是“已有属性更新”
- 如果是 Vue2，再看是不是踩到了 `Vue.set` / 数组方法边界
- 如果是 Vue3，再查代理是否被 `toRaw` / 解构破坏响应式链路

## 什么时候该用 / 不该用

- Vue3 在新项目里通常更自然
- Vue2 老项目迁移时，重点不是 API 替换，而是排查响应式边界差异

## 面试追问链

- Proxy 为什么不能完全 polyfill？
- Vue3 响应式一定更快吗？
- `ref` 和 `reactive` 的边界怎么讲？
