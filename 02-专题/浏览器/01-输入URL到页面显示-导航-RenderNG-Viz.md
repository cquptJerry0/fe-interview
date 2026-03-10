# 输入 URL 到页面显示

副标题：导航、Blink、RenderingNG、Viz

## Part 1｜技术讲解

### 1. 一句话结论

这题如果只答 `DNS、TCP、HTTP、渲染`，深度是不够的。

更完整的 Chromium 视角应该是：

用户在地址栏输入 URL 后，首先由 browser process 发起 navigation；旧页面先走 `beforeunload` 检查；随后导航请求可能命中缓存、Service Worker，也可能真正进入 DNS、建连、TLS 和 HTTP；拿到响应头后，browser process 会根据 URL、响应头和隔离策略决定由哪个 renderer process 承载新文档；renderer commit 之后，Blink 开始解析 HTML、CSS、JS；接着进入现代 Chromium 的 RenderingNG 流水线：`style -> layout -> pre-paint -> paint -> commit -> layerize -> raster -> activate -> aggregate -> draw`；最后由 Viz 统一聚合各个 renderer 和浏览器 UI 的 compositor frame，并在 GPU 上真正画到屏幕上。

真正的高分点，是你能把“导航”和“出像素”讲成一条连续链，而不是两段互相断开的知识点。

### 2. 主链路图

```txt
用户在地址栏输入 URL
  ->
Browser Process 接管
  ->
旧页面 beforeunload
  ->
发起 Navigation
  ->
可能直接命中：
  Cache / Service Worker / WebUI / data:
或者真正走网络：
  DNS -> TCP/QUIC -> TLS -> HTTP request
  ->
收到 response headers
  ->
Browser Process 判断：
  1. 是否重定向
  2. 是否错误页
  3. 是否下载
  4. MIME 类型是什么
  5. 新文档该放到哪个 Renderer Process
  ->
Renderer Process 创建新 Document
  ->
Commit
  ->
Blink 开始加载与解析：
  HTML -> DOM
  CSS -> CSSOM
  JS -> V8 parse / execute
  ->
RenderingNG 主线程阶段：
  Style
  Layout
  Pre-paint
  Paint
  Commit 到 compositor thread
  ->
RenderingNG 合成阶段：
  Layerize
  Raster
  Activate
  ->
Viz Process：
  Aggregate 多个 compositor frame
  Draw 到 GPU
  ->
屏幕出像素
```

```txt
如果是跨站点导航

site A 页面
  ->
Browser Process
  ->
根据 Site Isolation / 响应头 / 进程模型
选择新的 Renderer Process
  ->
site B 页面 commit

所以“输入 URL”不只是网络请求
它经常还伴随进程切换和安全边界切换
```

### 3. 分阶段展开

#### 阶段 1｜先是导航，不是先渲染

Chromium 官方 navigation 文档把“从地址栏输入 URL 到页面完全加载”定义为完整的导航生命周期。

地址栏输入后，第一步不是 DNS，而是先执行旧文档的 `beforeunload`。如果用户取消离开，后面的请求和渲染都不会发生。

这一步很能体现你是不是只会背网络层。真正的浏览器先要处理“能不能离开当前文档”，再处理“要不要拿新文档”。

#### 阶段 2｜请求不一定真的打到网络

导航请求不一定真的进入真实网络。它可能直接命中：

1. HTTP 缓存
2. Service Worker
3. 浏览器内部页面
4. `data:` URL

所以面试里如果一上来就说“先 DNS 查询”，口径已经偏旧了。更稳的说法应该是：

“浏览器先发起 navigation request，这个请求可能命中本地能力，也可能真正进入网络栈。”

#### 阶段 3｜响应头一到，浏览器就开始做关键决策

收到 response headers 后，browser process 已经能判断很多关键事情：

1. 是不是 3xx，要不要继续重定向
2. 是不是 4xx / 5xx，后面可能提交错误页
3. 是不是 204 / 205，这种情况下不会产生新文档
4. 是不是下载而不是导航
5. `Content-Type` 是否可信，是否要 MIME sniffing
6. 新文档最终该放到哪个 renderer process

老八股常常漏掉最后一点，但这正是现代浏览器架构的关键。响应头一到，不是立刻在“当前页面线程里开始解析”，而是 browser process 先做安全边界和进程选择判断。

#### 阶段 4｜commit 是导航里的硬边界

`commit` 不是“HTML 开始解析”的别名，它是导航生命周期里的一个明确边界。

browser process 会根据 origin、响应头、当前进程模型和 isolation policy 选择合适的 renderer process，然后把响应交给它。等 renderer 创建好新文档并回 ACK，这个 ACK 才算真正 commit。

到了 commit 这一刻，browser process 还会更新安全状态，并为旧文档创建 session history entry。

所以 commit 不只是渲染起点，它还是：

1. 安全状态切换的边界
2. 会话历史切换的边界
3. 文档真正替换的边界

#### 阶段 5｜为什么这里一定要讲多进程和 Site Isolation

RenderingNG 的公开架构文档把现代 Chromium 的 CPU process 结构讲得很清楚：

1. browser process 负责浏览器 UI 和剩余输入路由
2. render process 负责页面内容、动画、滚动和页面侧输入路由
3. Viz process 负责集中式的 aggregate、raster 和 draw

跨站 iframe 会落到不同 render process，跨站文档也会因为 Site Isolation 被放到不同进程。官方 Site Isolation 文档明确强调，跨站文档放进不同进程，是 Chrome 的额外安全防线之一。

所以这题真正高级的讲法是：

“输入 URL 不只是把资源拿回来，还涉及浏览器安全边界、进程选择和渲染承载位置的重新分配。”

#### 阶段 6｜commit 之后才进入 Blink 和 RenderingNG

Blink 官方总览里明确说到：浏览器拿到 HTML、CSS、JS、图片、视频等资源后，HTML 和 CSS 到了就可以开始 parse，JavaScript 则要交给 V8 parse 和 execute。

也就是说，commit 之后并不是一句“浏览器开始渲染”就完了，而是至少要区分：

1. HTML 解析成 DOM
2. CSS 解析成 CSSOM
3. JavaScript 解析和执行
4. 样式计算
5. 布局
6. 生成绘制记录

#### 阶段 7｜为什么今天要讲 RenderingNG，而不是只讲 render tree

传统前端八股常讲：

```txt
DOM + CSSOM
  ->
Render Tree
  ->
Layout
  ->
Paint
  ->
Composite
```

这套讲法没有错，但它太粗。

RenderingNG 把现代 Chromium 的渲染流水线拆得更细，公开架构里列出的核心阶段包括：

1. Animate
2. Style
3. Layout
4. Pre-paint
5. Scroll
6. Paint
7. Commit
8. Layerize
9. Raster
10. Activate
11. Aggregate
12. Draw

这套分法比传统“渲染树”更有价值，因为它把：

1. 主线程里的文档生命周期
2. compositor thread 的合成生命周期
3. Viz process 的聚合和绘制生命周期

彻底拆开了。

#### 阶段 8｜Viz 到底是什么，为什么一定值得讲

Viz 不是“可选细节”，它是现代 Chromium 里很核心的一层。

官方 RenderingNG 文档对 Viz 的定位很明确：它是 Chromium 的集中式 raster 和 draw 进程。它带来的核心价值包括：

1. 提高吞吐
2. 优化内存
3. 更好利用硬件能力
4. 解锁 Site Isolation
5. 把页面渲染流水线和浏览器 UI 渲染解耦

从架构上看，Viz 至少有两条很值得记住的线程：

1. display compositor thread  
负责把各个 render process 加上 browser process 的 compositor frame 聚合成一个全局 frame

2. GPU main thread  
负责把 display list 和视频帧 raster 成 GPU texture tiles，并负责最终 draw

所以今天在 Chromium 里，说“renderer 直接把页面画到屏幕上”已经不够准确了。更准确的说法是：

renderer 生成文档和 compositor frame，Viz 负责统一 aggregate 和最终 draw。

#### 阶段 9｜为什么动画和滚动有时能绕开主线程

RenderingNG 官方文档还专门强调了一点：有些视觉效果动画和滚动可以跳过 `layout`、`pre-paint`、`paint`，直接在 compositor thread 上推进，不必每次都回主线程。

这就是现代浏览器能更流畅地滚动和做 `transform`、`opacity` 动画的重要原因。

所以如果面试官继续追问“为什么有些动画不卡，有些动画卡”，你就可以顺势讲：

1. 能否 compositor-only
2. 是否引发布局
3. 是否需要回主线程
4. 是否还要重新 raster
5. Viz 最终如何 aggregate 和 draw

### 4. 结论证明材料

这题最容易被答散，是因为大家会把它拆成两个互相断开的模块：

1. 网络请求
2. 页面渲染

但真正更接近 Chromium 真实架构的理解应该是：

```txt
Navigation
  ->
Commit
  ->
Blink parse / execute
  ->
RenderingNG pipeline
  ->
Viz aggregate / draw
```

也就是说：

1. `输入 URL` 不是传统意义上的纯网络题
2. `页面渲染` 也不是脱离导航单独开始的
3. 最终页面显示，是导航、多进程、Blink、RenderingNG、Viz 串起来的结果

### 5. 关键误判点

1. 不要一上来就说“先 DNS”，因为 navigation request 可能根本不进网络。
2. 不要把 commit 理解成“HTML 一到浏览器就开始 parse”，中间还有 browser process 的安全边界和进程选择。
3. 不要把现代 Chromium 还讲成“renderer 最后自己直接画到屏幕”。
4. 不要把 RenderingNG 简化成只有 layout、paint、composite 三步。
5. 不要把动画卡顿都怪给 JavaScript，很多问题其实出在合成路径、raster 或 draw。

### 6. 工程/业务例子

这条链在真实项目里至少能解释五类常见问题：

1. TTFB 慢  
通常还是卡在重定向、TLS、CDN、后端处理或缓存命中率。

2. DOMContentLoaded 很早，但首屏还是慢  
问题往往不在“有没有 HTML”，而在 CSS、图片、字体、主线程长任务、raster 或 draw 还没走完。

3. 滚动卡顿  
不一定是“浏览器慢”，很多时候是事件监听阻塞了 compositor 路径，导致本该走 compositor 的滚动被拉回主线程。

4. LCP 慢  
经常和关键资源、图片 decode、布局、绘制、raster、最终 draw 都有关。

5. SSR 之所以有价值  
不只是“SEO 更好”，而是它让浏览器更早拿到可解析的 HTML，更早进入 Blink 和后续渲染流水线；但 SSR 之后仍然有 hydration、样式计算、布局、合成和 Viz 出像素的问题。

## Part 2｜面试作答

### 1. 思维导图关键点

```txt
输入 URL
├─ Browser Process 发起 navigation
├─ beforeunload / Cache / Service Worker / 网络栈
├─ response headers 决定重定向 / commit / renderer process
├─ Blink 解析 HTML / CSS / JS
├─ RenderingNG: style -> layout -> pre-paint -> paint -> raster
├─ Viz: aggregate + draw
└─ 最终出像素
```

### 2. 60-90 秒口语稿

这题我会分成“导航”和“出像素”两段来讲，但它们其实是一条连续链。用户在地址栏输入 URL 后，首先是 browser process 接管，因为地址栏本身就是浏览器 UI 的一部分。它会先处理旧页面的 `beforeunload`，如果用户确认离开，才正式发起 navigation。这个 navigation 不一定真的去网络，也可能命中缓存、Service Worker、WebUI 或 `data:`。如果进入网络栈，就会经历 DNS、建连、TLS、HTTP 请求和重定向。拿到响应头之后，browser process 已经能判断是不是错误页、下载、重定向，以及新文档该交给哪个 renderer process。这里如果是跨站导航，往往还会涉及进程切换，因为 Chrome 有 Site Isolation。等 renderer 创建新文档并回 ACK，这才叫 commit。commit 之后 Blink 开始解析 HTML、CSS、JS，JS 交给 V8 执行，然后进入现代 Chromium 的 RenderingNG 流水线，先做 style、layout、pre-paint、paint，再把结果提交给 compositor thread，后面继续做 layerize、raster、activate。最后不是 renderer 自己直接把页面画到屏幕，而是由 Viz process 统一聚合多个 compositor frame，再通过 GPU draw 到屏幕上。比如真实业务里你会看到 DOMContentLoaded 已经很早了，但首屏还是慢，问题往往不是卡在“有没有 HTML”，而是卡在后面的样式计算、主线程长任务、raster 或最终 draw。

### 3. 高频追问

#### 追问 1｜commit 到底是什么

commit 是导航里的一个明确边界。响应从网络栈交给 browser process 后，browser process 会根据 origin、响应头、进程模型和隔离策略选 renderer process，并把响应发给它。等 renderer 创建好新文档并回 ACK，这个 ACK 才标志 commit。到了 commit 这一刻，browser process 还会更新安全状态，并为旧文档创建 session history entry。所以 commit 不只是“开始解析”的前置点，也是安全边界和历史边界。

#### 追问 2｜为什么跨站导航可能切 renderer process

因为 Chrome 的 Site Isolation 会把跨站文档放进不同进程，降低跨站数据泄露和渲染器被攻破后的风险。官方文档明确说，跨站文档和跨站 iframe 会进入不同进程。所以这题如果继续往下追，核心就会落到“导航不仅换页面，还可能换渲染承载进程和安全上下文”。

#### 追问 3｜Viz 和普通回答里的“合成”有什么区别

普通八股常把 composite 讲成 renderer 里的最后一步，但现代 Chromium 公开架构里更准确的说法是：renderer 侧会产生 compositor frame，Viz 再负责 aggregate 和最终 draw。Viz 是集中式的 raster 和 draw 进程，它的 display compositor thread 负责把多个 renderer 加浏览器 UI 的 frame 聚合成一个全局 frame，GPU main thread 再真正 raster 和 draw。也就是说，今天的“最后出像素”已经被拆到了独立的 Viz process 里。

#### 追问 4｜为什么有些滚动和动画不卡主线程

因为 RenderingNG 里有一部分视觉效果和滚动可以跳过 `layout`、`pre-paint`、`paint`，直接在 compositor thread 上推进，再把结果交给 Viz 出像素。官方架构文档专门强调了这一点。所以像 `transform`、`opacity` 这类更容易走 compositor-only 路径，而会触发布局的属性就更容易卡主线程。

#### 追问 5｜这题怎么和性能优化联系起来

这题几乎能串起整条性能链。网络阶段对应 TTFB；Blink 的解析和 JS 执行对应主线程阻塞；style、layout、paint 对应渲染开销；raster 和 draw 对应 GPU 和出像素；能否走 compositor-only 直接影响滚动和动画流畅度；Viz 的 aggregate 和 draw 影响最终展示路径。你只要把这条链讲顺，后面无论是首屏、LCP、长任务、动画卡顿还是 SSR，都能自然接上。

### 4. 复习标记

复习标记：一追就进专题

## 参考资料

1. Chromium 官方导航文档  
   https://chromium.googlesource.com/chromium/src/+/master/docs/navigation.md
2. Chromium 官方 RenderingNG 架构文档  
   https://developer.chrome.com/docs/chromium/renderingng-architecture?hl=zh-cn
3. Chromium 官方 RenderingNG 总览  
   https://developer.chrome.com/docs/chromium/renderingng
4. Blink 总览  
   https://developer.chrome.com/docs/web-platform/blink
5. Chromium 官方 Site Isolation 文档  
   https://www.chromium.org/Home/chromium-security/site-isolation/
