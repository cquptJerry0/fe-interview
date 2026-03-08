---
title: "图片懒加载怎么实现？IntersectionObserver 为什么更合适？"
tags: ["browser.api.intersection-observer", "browser.performance.lazyload", "browser.event.passive-listener"]
type: "八股"
difficulty: 4
---

## 这题在问什么

面试官通常不只是想听一个 `IntersectionObserver` API 名字，而是在问你：
- 图片为什么可以“晚一点再请求”
- 现代方案和兼容方案分别是什么
- 真正上线时你怎么验证它确实生效了

## 60 秒直答

图片懒加载的本质是延迟设置真实 `src`，让浏览器在图片接近可视区时再发请求。现代浏览器我会优先用 `IntersectionObserver`，因为它不用手写滚动节流和可视区计算，稳定性更高。命中后再把 `data-src` 赋给 `src`，并及时 `unobserve`。如果要兼容老浏览器，我会降级成 `scroll/resize + requestAnimationFrame + getBoundingClientRect`。上线后不会只看页面效果，还会看 Network 请求时机、滚动阶段长任务和图片加载失败率。

## 核心机制

- 浏览器只有在拿到真实 `img.src` 后才会发起资源请求
- 懒加载就是把真实地址先暂存，到了时机再赋值
- `IntersectionObserver` 帮你判断“元素是否进入预加载区”
- `rootMargin` 决定提前量，`threshold` 决定触发阈值

## 最小例子

```js
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return
    const img = entry.target
    img.src = img.dataset.src
    io.unobserve(img)
  })
}, {
  root: null,
  rootMargin: '0px 0px 300px 0px',
  threshold: 0,
})

document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img))
```

兼容兜底时，最小思路就是：
- 监听 `scroll/resize`
- 用 `requestAnimationFrame` 合帧
- 用 `getBoundingClientRect()` 判断是否接近视口

## 业务 / 验证

我会主动补一句项目话术：信息流页面图片很多时，懒加载的目标不是“越晚越好”，而是“首屏少请求、滚动时不卡、用户看到前能提前加载完成”。验证时至少看三件事：
- Network：非首屏图是不是接近可视区才请求
- Performance：滚动时长任务有没有下降
- 监控：图片失败率、可见到加载完成的时延

## 常见追问

- 为什么 `rootMargin` 很关键，而不是随便写个 0？
- 内部滚动容器不是 `window` 时该怎么配 `root`？
- `loading="lazy"` 和 IO 是替代关系还是组合关系？
- 线上偶发不加载时你先查什么？

## 易错点

- 命中后忘记 `unobserve`
- 所有图片都懒加载，连首屏关键图也延迟
- 只有实现，没有验证方案

## 关联深挖

- 这题目前不强制跳深挖，但如果继续追问“曝光统计”和“内部滚动容器”，建议补独立 Demo
