---
title: "图片懒加载怎么实现？IntersectionObserver 是什么？兼容性怎么做？"
tags: ["browser.api.intersection-observer", "browser.performance.lazyload", "browser.event.passive-listener"]
type: "八股"
difficulty: 4
---

## 一句话结论

图片懒加载本质是“延迟触发真实资源请求”。现代浏览器优先用 `IntersectionObserver` 观察元素进入预加载区，再把 `data-src` 赋给 `src`；老浏览器退化为 `scroll/resize + rAF + getBoundingClientRect`。真正做对这题的关键不是 API 名字，而是预加载窗口、失败兜底、可观测指标。

## 技术解释

### 1) 懒加载的本质

- 浏览器只有在 `img.src` 确认后才会发起该资源请求。
- 懒加载就是把真实地址先放在 `data-src`，等元素接近可视区再赋值到 `src`。
- 如果是现代项目，还可以叠加原生 `loading="lazy"` 作为基础能力，再用 IO 做更精细控制。

### 2) IntersectionObserver 的工作模型

- 你注册观察目标：`io.observe(target)`。
- 浏览器在布局变化和滚动过程中计算相交关系。
- 满足阈值时触发 callback，返回 `entries`。
- 命中后立即 `unobserve`，避免重复处理。

```js
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
      io.unobserve(img);
    });
  },
  {
    root: null,
    rootMargin: "0px 0px 200px 0px",
    threshold: 0,
  }
);

document.querySelectorAll("img[data-src]").forEach((img) => io.observe(img));
```

### 3) 关键参数怎么讲才像工程实践

- `root`：滚动容器，不传就是 viewport。很多“IO 不触发”的线上问题都来自 root 设错。
- `rootMargin`：预加载窗口。图片类场景通常给底部提前量（如 200px~400px），平衡“白屏风险”和“请求提前过多”。
- `threshold`：相交比例阈值。懒加载通常 `0` 足够；曝光统计才会用更高阈值。

### 4) 兼容退化策略

- 检测 `window.IntersectionObserver`。
- 不支持时用 `scroll/resize` 监听，配合 `requestAnimationFrame` 合帧，避免每次 scroll 都做重计算。
- 滚动监听加 `{ passive: true }`，减少滚动阻塞风险。

### 5) 失败与异常处理

- 首次加载失败要有占位兜底图，避免破图。
- 图片请求超时或 4xx/5xx 要打日志，不能只在 UI 层静默失败。
- SSR 场景要保证首屏关键图可直接请求，不要全部延迟。

## 对比与取舍

- IO vs scroll 监听：IO 更省心更稳；scroll 兼容更广但维护成本高。
- `loading="lazy"` vs 自定义 IO：原生实现简单；自定义 IO 可做预加载窗口与埋点控制。
- 预加载窗口大 vs 小：窗口大体验更稳但请求提前；窗口小省流量但容易出现滚动到位仍未完成加载。

## 实践与验证

- Network：确认非首屏图请求在接近视口时才出现。
- Performance：滚动过程中长任务数量下降，主线程卡顿减少。
- RUM：记录图片加载成功率、首屏完成时间、滚动到图可见时的加载命中率。

## 业务举例

### 背景与约束

- 首页信息流包含 80+ 张封面图，弱网下首屏白屏和卡顿投诉高。
- 业务要求两周内上线优化，不能改接口结构。
- 兼容约束：仍需支持一部分旧浏览器。

### 方案与取舍

- 现代浏览器主链路用 IO，`rootMargin` 设为 300px 做预加载。
- 老浏览器退化成 `scroll + rAF`，并限制单帧处理图片数量。
- 首屏前 6 张关键图不懒加载，保证首屏稳定。

### 实施与验证

- 增加埋点：图片首次可见时间、首次请求时间、加载耗时。
- 灰度 20% 流量，观察首屏和滚动阶段长任务。
- 补充异常兜底：加载失败替换默认图并上报 URL 与错误码。

### 结果与复盘

- 首屏阶段图片请求数显著下降，滚动卡顿投诉减少。
- 图片“可见但未加载完成”的问题在低端机仍存在，后续按机型动态调整 `rootMargin`。
- 结论：懒加载不是简单延迟请求，核心是“预加载窗口 + 兼容 + 可观测”。

## 面试口述版（60-90秒）

图片懒加载我会先讲本质：延迟设置真实 `src`，让浏览器在元素接近可视区时才请求资源。实现上现代浏览器优先用 `IntersectionObserver`，我会重点提 `root`、`rootMargin`、`threshold` 三个参数，尤其 `rootMargin` 用来做提前加载。命中后要 `unobserve`，避免重复触发。兼容上我会提供 `scroll/resize + rAF + getBoundingClientRect` 的降级方案，并在滚动监听里用 `passive: true`。落地时不会只讲代码，我会给验证方法：看 Network 是否按预期延迟请求、看 Performance 滚动长任务是否下降、看线上埋点的图片加载成功率与可见时延。

## 追问

- 如果页面是内部滚动容器，不是 window，IO 该怎么配？
- 懒加载和首屏体验冲突时，如何决定哪些图片不懒加载？
- `loading="lazy"` 和 IO 应该怎么组合，而不是二选一？
- 线上出现“图片偶尔不加载”时，你会优先检查哪三件事？
- 如何给低端机和弱网做差异化 `rootMargin` 策略？

## 易错点

- 忘记 `unobserve`，造成重复赋值和重复回调。
- 把所有图片都懒加载，反而拖慢首屏关键内容。
- 没有失败兜底图和日志，线上问题难以定位。
