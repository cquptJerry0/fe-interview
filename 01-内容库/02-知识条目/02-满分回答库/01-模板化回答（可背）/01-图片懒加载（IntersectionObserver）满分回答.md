---
title: "图片懒加载怎么实现？IntersectionObserver 是什么？兼容性怎么做？"
tags: ["browser.api.intersection-observer", "browser.performance.lazyload", "browser.event.passive-listener"]
type: "八股"
difficulty: 4
---

## 一句话结论

图片懒加载的本质是“延迟设置真实 `src`”，现代浏览器优先用 `IntersectionObserver` 观察元素进入视口（含 `rootMargin` 预加载），老浏览器退化为 `scroll/resize` 监听 + rAF/节流 + `getBoundingClientRect` 判断，并在滚动监听中使用 `{ passive: true }` 避免阻塞滚动。

## 解释（从零到一）

最底层视角：浏览器只会在 `img.src` 被赋值后才发起图片网络请求（或从缓存命中）。懒加载做的事就是把真实地址先放在 `data-src`，等“接近可见”再把 `data-src` 赋给 `src`。

IntersectionObserver（IO）是什么：
- 一个浏览器 API：`new IntersectionObserver(callback, options)`
- callback 入参是 `entries`，每个 entry 代表一个被观察的 target 当前的相交状态
- options 常用参数：
  - `root`：滚动容器（不传就是 viewport）
  - `rootMargin`：提前量（预加载），例如底部提前 200px 触发
  - `threshold`：相交比例阈值（0/0.1/1）

最小例子（IO）：

```js
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const img = e.target;
      img.src = img.dataset.src;
      io.unobserve(img);
    }
  },
  { root: null, rootMargin: "0px 0px 200px 0px", threshold: 0 }
);

document.querySelectorAll("img[data-src]").forEach((img) => io.observe(img));
```

兼容退化（不支持 IO）：
- 监听 `scroll/resize` 触发检查
- 用 `requestAnimationFrame` 把多次滚动合并到一帧检查
- 用 `getBoundingClientRect()` 判断元素是否进入“预加载区域”

最小例子（退化版）：

```js
function inPreloadArea(el, preloadPx = 200) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight + preloadPx && rect.bottom > -preloadPx;
}

function makeLazyloadFallback(images) {
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      for (const img of images) {
        if (img.dataset.src && inPreloadArea(img)) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
      }
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

const imgs = Array.from(document.querySelectorAll("img[data-src]"));
makeLazyloadFallback(imgs);
```

`passive: true` 是什么：
- `addEventListener` 的选项，表示监听器不会调用 `preventDefault()`
- 浏览器因此可以不等待回调执行就开始滚动，减少卡顿
- 代价：你不能在该监听器里 `preventDefault()` 来阻止滚动

## 图解

```text
HTML 初始：
<img data-src="real.jpg" src="placeholder.jpg" />

触发条件：
元素进入（或接近）视口

执行动作：
img.src = img.dataset.src  -> 浏览器发起 real.jpg 请求
unobserve / 移除 data-src  -> 避免重复处理
```

## 对比与取舍

- IntersectionObserver vs scroll 监听
  - IO：回调由浏览器调度、低侵入、性能更稳；缺点是老浏览器不支持
  - scroll：兼容性好；缺点是需要自己控频、容易造成滚动卡顿与边界 bug

## 实践与验证

- Network 验证：滚动前不应看到真实图片 URL 请求；接近视口（受 rootMargin 影响）时才出现请求
- Performance 验证：滚动时主线程不出现密集长任务；退化版应在 rAF 中批量处理而不是每个 scroll 都跑重逻辑
- 线上排障：如果图片不加载，先看 target 是否被 observe、root 是否为实际滚动容器、rootMargin/threshold 是否设置错误

## 常见追问

- entries 里最关注哪些字段？
- root 与 rootMargin 的差别是什么？如何做“预加载”？
- 为什么 scroll 监听要加 `{ passive: true }`？
- 老浏览器怎么兜底？怎么避免滚动卡顿？

## 易错点

- 忘了 `unobserve` 或移除 `data-src`，导致反复触发与重复赋值
- 滚动容器不是 window（例如一个内部滚动 div），却没传 `root`，导致永远不触发
- 退化版在 scroll 里直接做大量 DOM 查询/布局读取，导致滚动明显卡顿
