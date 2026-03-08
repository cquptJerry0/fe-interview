---
title: "Vue2 和 Vue3 响应式有什么区别？为什么 Vue3 要改成 Proxy？"
tags: ["vue.reactivity.defineproperty", "vue.reactivity.proxy"]
type: "对比题"
difficulty: 4
---

## 这题在问什么

这题核心不是背“defineProperty vs Proxy”两个词，而是要讲清：
- Vue2 为什么有一些监听盲区
- Vue3 为什么换成 Proxy
- 这个变化给开发体验和实现能力带来了什么提升

## 60 秒直答

Vue2 的响应式核心基于 `Object.defineProperty`，它能拦截已有属性的读取和设置，但对对象新增属性、删除属性和数组下标/长度变化支持不够自然，所以才会有 `Vue.set` 之类的补丁式 API。Vue3 改成 `Proxy` 后，可以直接代理整个对象，天然支持属性新增删除、数组和集合类型，拦截能力更完整，响应式模型也更统一。面试里我会再补一句：这不是单纯“新 API 更高级”，而是为了解决 Vue2 的覆盖面和维护复杂度问题。

## 核心机制

- Vue2：初始化时递归劫持已有属性
- Vue3：运行时代理整个对象，按访问路径做 `track` / `trigger`
- Vue3 的拦截粒度更完整，对数组、Map、Set 支持更自然

## 最小例子

```js
// Vue2 的典型问题
vm.user.age = 18 // 直接新增属性，默认不响应
Vue.set(vm.user, 'age', 18) // 才能补上响应式
```

```js
// Vue3
const state = reactive({ user: {} })
state.user.age = 18 // 直接可响应
```

## 业务 / 验证

如果项目里对象结构经常动态扩展，或者列表、集合操作很多，Vue3 的心智负担明显更低。验证时可以直接做最小实验：新增属性、改数组下标、改 length，看视图是否自动更新。

## 常见追问

- Proxy 为什么不能被完整 polyfill？
- Vue3 的 `track` / `trigger` 是什么思路？
- Vue2 为什么数组需要重写变更方法？
- Vue3 响应式是不是绝对更快？

## 易错点

- 只说 Vue3“性能更好”，却说不出根因
- 不知道 Vue2 对新增属性和数组下标的限制
- 把“API 变化”当成全部答案，忽略底层代理能力变化

## 关联深挖

- [Vue2 vs Vue3 响应式完整对比](../02-专题深挖/07-Vue2-vs-Vue3-响应式完整对比.md)
