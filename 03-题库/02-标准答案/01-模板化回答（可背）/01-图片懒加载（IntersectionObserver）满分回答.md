---
title: "图片懒加载怎么实现？IntersectionObserver 为什么更合适？"
tags: ["browser.api.intersection-observer", "browser.performance.lazyload", "browser.event.passive-listener"]
type: "八股"
difficulty: 4
---

## 模块 1｜主回答

### 1）一句话结论

- 图片懒加载的本质，是先不设置真实 `src`，等图片进入“预加载区”后再赋值，让请求延后到更接近用户可见的时机。
- 现代浏览器优先用 `IntersectionObserver`，因为它把“元素是否进入视口或预加载区”的判断交给浏览器，不需要自己反复监听滚动、节流和算坐标。
- 兼容老浏览器时，降级成 `scroll / resize + requestAnimationFrame + getBoundingClientRect()`，核心还是算元素矩形和视口矩形是否相交。
- 真正上线时不能只看“图有没有出来”，还要验证请求时机、滚动性能、失败率和布局稳定性。

### 2）原理图（ASCII）

```txt
初始渲染
  img 只有 data-src，没有真实 src
        |
        v
浏览器不会请求真实图片
        |
        v
进入预加载区
        |
        +-- 现代方案：IntersectionObserver 命中
        |
        +-- 兼容方案：scroll + rect 计算命中
        |
        v
把 data-src 赋给 src
        |
        v
浏览器发起图片请求
        |
        v
加载完成后展示，并停止继续观察
```

### 3）最小例子

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

document.querySelectorAll('img[data-src]').forEach((img) => {
  io.observe(img)
})
```

```js
const preload = 300
let ticking = false

function checkImages() {
  const vh = window.innerHeight
  const vw = window.innerWidth

  document.querySelectorAll('img[data-src]').forEach((img) => {
    const rect = img.getBoundingClientRect()
    const inVertical = rect.top <= vh + preload && rect.bottom >= -preload
    const inHorizontal = rect.left <= vw + preload && rect.right >= -preload

    if (inVertical && inHorizontal) {
      img.src = img.dataset.src
      img.removeAttribute('data-src')
    }
  })
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    checkImages()
    ticking = false
  })
}

window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('resize', onScroll)
checkImages()
```

### 4）面试口语稿

- 图片懒加载的核心不是某个 API 名字，而是延迟设置真实 `src`，让浏览器在图片接近可视区时再发请求。现代浏览器我会优先用 `IntersectionObserver`，因为浏览器帮你处理了视口命中判断，不需要自己写滚动监听、节流和坐标计算，稳定性更高。命中后把 `data-src` 赋给 `src`，加载成功后及时 `unobserve`。如果要兼容老浏览器，我会降级成 `scroll / resize + requestAnimationFrame + getBoundingClientRect()`：本质就是拿元素矩形和视口矩形做相交判断。上线后我不会只看效果，而是会看 Network 里图片是不是接近可视区才请求、滚动是不是更流畅、失败率和布局抖动有没有控制住。

## 模块 2｜深入展开

### 1）原理链路

```txt
懒加载问题
  -> 什么时候才真正发图片请求
  -> 如何判断“快进入可视区了”
  -> 现代浏览器能否把判断交给浏览器做
  -> 老浏览器如何自己算矩形相交
  -> 最后如何验证真的生效了
```

- 浏览器只有在 `img.src` 指向真实资源后，才会发起图片请求。
- 所谓懒加载，本质就是先把真实地址存到 `data-src`，到了时机再赋给 `src`。
- `IntersectionObserver` 的优势是：它天然围绕“相交”建模，不需要你自己高频监听滚动，也不需要你自己维护节流和命中边界。
- 兼容方案依然能做，但你必须自己处理滚动频率、计算时机、矩形相交公式和清理逻辑。

### 2）业务化解释

- 信息流、商品列表、图库页面图片很多，如果首屏就把所有图都请求下来，首屏资源压力会明显上升。
- 但懒加载也不是越晚越好，太晚会导致用户滚动到图的位置时看到空白，所以通常会配一个 `rootMargin` 或预加载距离。
- 实战里还要配合固定宽高或 `aspect-ratio`，否则图片加载前后会导致布局抖动。
- 如果页面里是首屏主视觉图、商品首图、LCP 关键图，这类图片通常不建议懒加载，至少不能一刀切。

### 3）取舍 / 易错点

- `IntersectionObserver` 更像“浏览器帮你做命中判断”，代码更短，性能和一致性通常更好。
- `getBoundingClientRect()` 方案不是不能用，但如果滚动频繁、节点很多、逻辑复杂，就更容易写出卡顿和漏判。
- `rootMargin` 很关键。它不是装饰参数，而是决定“提前多少开始请求”，直接影响用户是否会看到白块。
- 命中后要及时 `unobserve` 或移除 `data-src`，不然会重复判断。
- 首屏关键图、骨架图、占位图、失败图、监控上报要成套考虑，不能只停在“图能出来”。

### 4）深挖判断

- 这题可以进入模板化回答。
- 如果继续追问“内部滚动容器怎么配 `root`”“曝光统计和懒加载的关系”“大图失败怎么降级”，建议补内部专题深挖卡。

### 难题加厚｜额外图

```txt
getBoundingClientRect() 返回的是“元素相对当前视口”的矩形

视口左上角 (0, 0)
+--------------------------------------------------+
|                                                  |
|      rect.top                                    |
|         ↓                                        |
|      +------------------------+                  |
|      |         element        |  rect.height     |
|      +------------------------+                  |
|                ↑                                 |
|            rect.bottom                           |
|                                                  |
+--------------------------------------------------+
                               视口右边界 -> innerWidth
                               视口下边界 -> innerHeight

rect.left   = 元素左边到视口左边的距离
rect.right  = 元素右边到视口左边的距离
rect.top    = 元素上边到视口上边的距离
rect.bottom = 元素下边到视口上边的距离
rect.width  = rect.right - rect.left
rect.height = rect.bottom - rect.top
```

```txt
进入预加载区的常见判断

纵向命中：rect.top <= vh + preload  && rect.bottom >= -preload
横向命中：rect.left <= vw + preload && rect.right  >= -preload

解释：
- 元素上边还没超过“视口底部 + 预加载距离”
- 元素下边也还没完全跑到“视口顶部 - 预加载距离”之上
- 两边都成立，说明元素矩形和“扩大的视口矩形”发生了相交
```

### 难题加厚｜额外例子

```js
function isInPreloadZone(img, preload = 300) {
  const rect = img.getBoundingClientRect()
  const vh = window.innerHeight
  const vw = window.innerWidth

  const inVertical = rect.top <= vh + preload && rect.bottom >= -preload
  const inHorizontal = rect.left <= vw + preload && rect.right >= -preload

  return inVertical && inHorizontal
}
```

- `vh` / `vw` 就是视口高和视口宽。
- `rect.top`、`rect.bottom` 负责纵向判断，`rect.left`、`rect.right` 负责横向判断。
- 如果页面只是普通纵向列表，很多时候你主要关心纵向命中；但从原理上讲，完整判断是“横向和纵向都要相交”。

### 难题加厚｜精炼伪代码

```txt
if supportIntersectionObserver:
  observe(img)
  if img enters preload area:
    img.src = img.dataSrc
    stop observing
else:
  on scroll / resize:
    schedule by requestAnimationFrame
    rect = img.getBoundingClientRect()
    if rect intersects expanded viewport:
      img.src = img.dataSrc
      remove from pending list
```

## 模块 3｜追问与详细回答

### 追问 1｜为什么 `IntersectionObserver` 通常比手写滚动监听更合适？

- 因为手写滚动监听要自己处理触发频率、节流时机、坐标计算和节点清理。
- `IntersectionObserver` 直接以“是否相交”为模型，代码更短，也更不容易漏掉边界。
- 更关键的是，它把很多判断成本交给浏览器内部实现，不需要你在每次滚动时自己遍历一堆节点算矩形。
- 所以现代浏览器下，它通常是首选，而不是“可选优化”。

### 追问 2｜`rootMargin` 和 `threshold` 分别控制什么？

- `rootMargin` 控制的是观察区域的扩张或收缩，本质上就是预加载距离。
- 例如 `0px 0px 300px 0px` 表示底部多扩 300px，这样图片还没真正进视口时就能提前开始请求。
- `threshold` 控制的是相交比例达到多少才算命中，比如 `0`、`0.5`、`1`。
- 懒加载里更常用 `rootMargin` 调提前量，而不是靠 `threshold` 去微调，因为图片请求更关心“提前多久开始”，不是“露出了多少比例”。

### 追问 3｜`getBoundingClientRect()` 里的这些值到底怎么理解、怎么算？

- `rect.top` 表示元素上边距离当前视口上边的距离；如果元素还在视口下方，它通常是一个正数且比较大。
- `rect.bottom` 表示元素下边距离当前视口上边的距离，所以 `rect.height = rect.bottom - rect.top`。
- `rect.left` 和 `rect.right` 是横向同理，`rect.width = rect.right - rect.left`。
- 判断是否进入预加载区，本质不是看某一个点，而是看“元素矩形”和“扩大的视口矩形”是否相交。
- 所以纵向常用 `rect.top <= vh + preload && rect.bottom >= -preload`。前半句保证元素没完全在扩展视口下方，后半句保证元素没完全在扩展视口上方。两句同时成立，说明纵向上已经有交集。
- 横向同理，用 `rect.left <= vw + preload && rect.right >= -preload`。如果页面只是纵向列表，很多时候横向默认就在容器内，但原理上完整写法还是要知道。

### 追问 4｜如果图片在内部滚动容器里，不是跟着 `window` 滚怎么办？

- `IntersectionObserver` 方案里，要把 `root` 配成这个滚动容器，而不是默认的视口。
- `getBoundingClientRect()` 兼容方案里，也不能只拿 `window.innerHeight` 去算，而是要拿滚动容器自己的可视区域边界来算相交。
- 也就是说，关键不是“API 写法变了”，而是你比较的参考系从 `window viewport` 变成了“容器 viewport”。
- 这也是为什么手写方案更容易出错，因为参考系一变，整套计算都要跟着变。

### 追问 5｜怎么验证懒加载真的生效了，而不是“看起来像生效了”？

- 第一看 `Network`：非首屏图片是不是到了接近可视区才请求，而不是页面一打开就全发了。
- 第二看 `Performance`：滚动时有没有长任务，滚动掉帧有没有改善。
- 第三看体验：关键图是否过晚加载，用户会不会看到白块。
- 第四看稳定性：图片失败率、平均加载时延、布局抖动是否可控。
- 所以验证不是“图片出来了”这么简单，而是要看请求时机、滚动性能和用户感知。
