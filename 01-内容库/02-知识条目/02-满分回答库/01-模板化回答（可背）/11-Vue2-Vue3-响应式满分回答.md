---
title: "Vue2 和 Vue3 响应式区别？从 defineProperty 与 Proxy 的拦截能力讲清"
tags: ["vue.reactivity.defineproperty", "vue.reactivity.proxy"]
type: "八股"
difficulty: 4
---

## 一句话结论

Vue2 用 `Object.defineProperty` 按属性劫持 getter/setter，初始化要遍历 key，新增/删除属性与数组细节需要额外处理；Vue3 用 `Proxy` 代理整个对象，能拦截 get/set/delete/ownKeys 等操作，新增/删除更自然且支持懒代理，代价是无法兼容 IE11。

## 解释（从零到一）

Vue2（defineProperty）底层形态：

```js
function defineReactive(obj, key) {
  let val = obj[key];
  const dep = new Dep();
  Object.defineProperty(obj, key, {
    get() { dep.depend(); return val; },
    set(v) { val = v; dep.notify(); },
  });
}
```

关键边界：
- 只能劫持“已存在 key”，后续新增 key 没 getter/setter → 不响应（需要 `Vue.set` 或替换对象）
- 数组下标与 length 变化不易完整覆盖（Vue2 通过重写数组方法等方式补齐）

Vue3（Proxy）底层形态：

```js
const state = new Proxy(target, {
  get(t, k, r) { track(t, k); return Reflect.get(t, k, r); },
  set(t, k, v, r) { const ok = Reflect.set(t, k, v, r); trigger(t, k); return ok; },
  deleteProperty(t, k) { const ok = Reflect.deleteProperty(t, k); trigger(t, k); return ok; },
});
```

关键能力：
- 新增属性会走 `set` trap，删除会走 `deleteProperty` trap
- 支持懒代理：只有访问到子对象时才继续包 Proxy，初始化更轻

## 图解

```text
Vue2：对每个 key 打补丁（defineProperty）
  新 key：没补丁 -> 不响应

Vue3：对整个对象包一层代理（Proxy）
  所有操作都经过代理层 -> 新 key/删除/枚举都可拦截
```

## 对比与取舍

- defineProperty vs Proxy
  - defineProperty：兼容性更广；缺点是初始化成本高、覆盖面受限
  - Proxy：覆盖完整、表达自然、可懒代理；缺点是老环境不支持且不可完全 polyfill

## 实践与验证

业务例子：后端返回 user，对象上动态加 `isSelected`
- Vue2：需要 `Vue.set(user, "isSelected", true)` 或 `user = { ...user, isSelected: true }`
- Vue3：`user.isSelected = true`（前提 user 是 reactive 代理）

排障：
- Vue3 中改了“原始对象”而不是代理对象，不会触发更新

## 常见追问

- 为什么 Proxy 不能被 polyfill？
- Reflect 在 Proxy 里有什么意义？
- Vue2 为什么数组要额外处理？

## 易错点

- 把“是否响应式”当成“对象本身的属性”，忽略了代理对象与原始对象的差别
