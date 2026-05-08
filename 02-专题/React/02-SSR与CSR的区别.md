# SSR 与 CSR 的区别

副标题：渲染位置、首屏链路、Hydration、同构、RSC 序列化、SSG/ISR/CDN 缓存、Next.js

## Part 1｜技术讲解

### 1. 一句话结论

CSR 把渲染推到浏览器，服务器只返回空壳 HTML，JS 下载执行后才渲染内容；SSR 在服务端把首屏 HTML 直接渲染好返回，浏览器拿到就是可见内容，再通过 Hydration 接管交互。核心差异是**渲染发生的位置**，由此衍生出首屏速度、SEO、服务端压力、Hydration 一致性、缓存策略、序列化方式等一系列工程取舍。

### 2. 主链路图

```txt
用户请求页面
  │
  ├── CSR 链路
  │   服务器返回空壳 HTML（<div id="root"></div> + <script>）
  │     → 浏览器下载 JS bundle（几百 KB ~ 几 MB）
  │       → JS 执行，React/Vue 初始化
  │         → useEffect 触发 API 请求拿数据（走公网）
  │           → 数据返回，框架渲染 DOM
  │             → 页面可见内容出现 + 绑定事件，交互就绪
  │
  └── SSR 链路
      服务器接收请求
        → 执行 React renderToString（服务端渲染）
          → 服务端查数据库 / 调 API 拿数据（走内网，极快）
            → 数据 + 组件 → 渲染成完整 HTML
              → 数据序列化进 HTML（__NEXT_DATA__ / window.__INITIAL_STATE__）
                → 返回给浏览器（此时已有可见内容）
                  → 浏览器显示首屏
                    → 下载 JS bundle
                      → hydrateRoot：遍历已有 DOM，逐节点对比，绑定事件
                        → Hydration 完成，页面可交互
```

**关键时间线对比：**

```txt
CSR：  请求 → [白屏] → JS下载 → JS执行 → 数据请求 → 渲染 → 可见+可交互
SSR：  请求 → 服务端渲染 → 首屏可见 → JS下载 → Hydration → 可交互
                  ↑ 用户已经能看到内容        ↑ 可见 ≠ 可交互
```

**CSR 请求清单：**

```txt
第 1 次：GET /product/123    → 返回空壳 HTML（0.5KB）
第 2 次：GET /bundle.js       → 下载全部组件 + React 框架（800KB+）
第 3 次：GET /api/product/123 → 浏览器发 API 拿商品数据（走公网）
第 4 次：GET /api/reviews/123 → 浏览器发 API 拿评价数据（走公网）
白屏 = 4 次请求全部完成（串行）
```

**SSR 请求清单：**

```txt
第 1 次：GET /product/123 → 服务端查数据(内网) + renderToString → 返回完整 HTML
第 2 次：GET /bundle.js    → 下载 JS（Hydration 用）
数据请求在服务端内部完成（走内网/同机房，微秒级），不占浏览器请求
首屏可见 = 第 1 次请求返回后立刻可见
```

### 3. 分阶段展开

#### 3.1 CSR 的完整流程与特征

**流程拆解：**

1. 用户访问 URL，浏览器发 HTTP 请求
2. 服务器返回极简 HTML：
   ```html
   <html>
     <body>
       <div id="root"></div>
       <script src="/bundle.js"></script>
     </body>
   </html>
   ```
3. 浏览器解析 HTML，下载 JS bundle（最大瓶颈）
4. JS 执行，React 初始化，组件树挂载
5. `useEffect` 触发数据请求
6. 数据返回，框架重新渲染
7. 用户看到内容，页面可交互

**为什么 CSR 不直接出 HTML？** 因为 CSR 的服务器是静态文件服务器，不管你访问什么 URL，都返回同一个空壳。JS 才知道你要什么页面、该请求什么数据、该渲染什么 HTML。如果让服务器也来渲染 HTML——那就变成 SSR 了。

**优势：** 后续路由切换极快（SPA）、服务端压力小、开发体验好、CDN 友好。

**劣势：** 首屏白屏长、SEO 不友好、TTFP/FCP 指标差。

#### 3.2 SSR 的完整流程与特征

**流程拆解：**

1. 用户访问 URL，浏览器发 HTTP 请求
2. Node.js 服务器拦截请求，执行 `renderToString`
3. 服务端执行组件树，查数据库拿数据
4. 渲染结果拼接成完整 HTML 返回：
   ```html
   <html>
     <body>
       <div id="root">
         <h1>iPhone 16 Pro</h1>
         <p>价格：9999</p>
       </div>
       <script src="/bundle.js"></script>
       <script>window.__INITIAL_STATE__ = {name:"iPhone 16 Pro",price:9999}</script>
     </body>
   </html>
   ```
5. 浏览器收到 HTML，立刻显示内容
6. 下载 JS bundle，执行 Hydration

**优势：** 首屏速度快、SEO 友好、弱网体验更好、社交媒体分享预览正常。

**劣势：** 服务端压力大、TTFB 可能更长、Hydration 一致性问题、缓存策略复杂、运维成本高。

#### 3.3 Hydration——SSR 最核心也最容易踩坑的环节

**什么是 Hydration？**

SSR 返回的 HTML 是静态快照，没有事件绑定、没有状态管理。Hydration 是客户端 JS 加载后，React 在已有 DOM 上"注水"，接管事件和状态，使页面变成可交互的 SPA。

**对比 CSR 的挂载方式：**

```tsx
// CSR：createRoot 从零创建 DOM
const root = createRoot(document.getElementById('root'));
root.render(<App />);  // 创建所有 DOM 节点

// SSR：hydrateRoot 复用已有 DOM
const root = hydrateRoot(document.getElementById('root'));
root.render(<App />);  // 遍历已有 DOM，对比，绑定事件
```

**Hydration 的逐节点对比过程：**

React 同时持有虚拟 DOM（组件函数执行结果）和真实 DOM（SSR 渲染的 HTML），从根节点开始逐节点遍历：

```txt
对于 HTML 元素节点：
  1. 标签名是否一致（div vs div）       → 必须一致
  2. key 是否一致（列表中的 key）        → 必须一致
  3. HTML 属性值是否一致（className, id, src...）
  4. style 每个属性值是否一致
  5. 事件监听器（onClick, onChange...）→ 不对比，直接绑定（HTML 上不可能有）
  6. ref → 挂到真实 DOM 上

对于文本节点：
  1. 文本内容是否一致

全部匹配 → 复用 DOM 节点，只绑定事件 → "注水"完成
不匹配 → Hydration Mismatch 报错
```

**"注水"的本质：** 不重新创建 DOM，只在已有 DOM 上补上事件监听器和状态绑定。

**一个具体的例子：**

```txt
服务端渲染出来的 HTML：
  <button>加入购物车</button>

这个按钮用户能看到，但点了没反应——因为没有绑定 onClick。

Hydration 做的事：
  React 执行组件，发现虚拟 DOM 里有 <button onClick={handleAddToCart}>
  React 找到页面上已有的 <button>，对比文本内容一致
  → 不创建新 button，直接给这个已有 button 绑上 onClick
  → 现在用户点了就有反应了
```

**常见 Hydration Mismatch 原因：**

1. **时间/随机数**：`Date.now()`、`Math.random()` 服务端客户端结果不同
2. **浏览器 API**：`window.innerWidth`、`navigator.userAgent` 服务端不存在
3. **浏览器插件**：密码管理器、翻译插件修改了 DOM
4. **异步数据差异**：服务端和客户端拿到的数据不一致
5. **HTML 规范化**：服务端 `<br>` vs 浏览器 `<br></br>`

**Mismatch 的后果（按 React 版本）：**

```txt
React 17：直接丢弃服务端 HTML，客户端重新创建 DOM → 页面闪烁
React 18：控制台警告，保留服务端 HTML → 不闪烁，但状态可能不一致
React 19：更严格，某些情况抛错
```

**解决模式：**

```tsx
// 延迟到客户端渲染
function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : null;
}

// 已知差异，抑制警告
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

#### 3.4 序列化——服务端数据怎么传给浏览器

**为什么必须序列化？** 服务端和浏览器是两台不同的机器，内存是隔离的。服务端 Node.js 查到的数据存在阿里云服务器的内存里，浏览器的 Chrome JS 进程根本访问不到。HTTP 响应是唯一的桥梁——数据必须"顺路"带进 HTML 里，浏览器才能拿到。就像寄快递：蛋糕（HTML）和配方纸条（序列化数据）必须装在同一个箱子里，收件人才能同时拿到两者。

**问题推导：** Hydration 时 React 需要重新执行组件函数。如果组件初始状态是 `null`，第一次渲染会返回"加载中..."，但页面上已有的 DOM 是真实内容 → Mismatch。

**解决：** 服务端渲染时已查过数据，把数据序列化进 HTML，客户端直接复用，这样客户端第一次渲染结果和服务端一致，Hydration 就不会 Mismatch。

**传统 SSR 的序列化方式：**

```html
<script>window.__INITIAL_STATE__ = {"name":"iPhone 16 Pro","price":9999}</script>
```

```tsx
// 客户端组件
function ProductPage() {
  const [product, setProduct] = useState(window.__INITIAL_STATE__);
  // 第一次渲染结果和服务端一致 → Hydration 成功
  return <h1>{product.name}</h1>;
}
```

**Next.js Pages Router 的序列化方式：** 用 `__NEXT_DATA__` 代替 `window.__INITIAL_STATE__`，本质一样，但额外带了路由信息：

```html
<script id="__NEXT_DATA__" type="application/json">
{
  "props": { "product": { "name": "iPhone 16 Pro", "price": 9999 } },
  "page": "/product/[id]",
  "query": { "id": "123" }
}
</script>
```

**JSON 序列化的限制：** 只能传 `string`、`number`、`boolean`、`null`、`Array`、`Object`。`Date` 变成字符串，`Map/Set` 变成 `{}`，`undefined` 丢失，`Function` 报错，循环引用报错。

**`getServerSideProps` 和 `window.__INITIAL_STATE__` 的关系：** 不是同一个东西，而是流程中的两个环节——`getServerSideProps` 是"取数据"的动作，`window.__INITIAL_STATE__` / `__NEXT_DATA__` 是"传数据给浏览器"的载体。Next.js 帮你把中间的序列化和 Hydration 全自动了。

#### 3.5 同构（Isomorphic）——SSR 的工程基础

现代 SSR 是同构应用：同一套代码在服务端和客户端都能运行。

**同构的关键约束：**

1. **代码兼容性**：不能直接用 `window`、`document`、`localStorage`（服务端没有）
2. **路由同构**：服务端和客户端使用同一套路由配置
3. **数据层同构**：服务端预取数据 + 客户端路由切换时也取数据 + 数据序列化供 Hydration 复用
4. **样式同构**：CSS-in-JS 需要在服务端收集样式注入 `<style>` 标签

#### 3.6 RSC（React Server Components）——不同的序列化与渲染方式

传统 SSR 序列化只传数据，RSC 序列化**整个组件树**。

**核心思路：** 有些组件只在服务端执行，代码永远不发到浏览器。

```tsx
// ProductInfo.tsx —— 服务端组件（纯展示）
// 不会发到浏览器
function ProductInfo({ product }) {
  return <h1>{product.name}</h1>;  // 假设 500 行展示代码
}

// AddToCartButton.tsx —— 客户端组件（需要交互）
'use client';
function AddToCartButton({ productId }) {
  const [loading, setLoading] = useState(false);
  return <button onClick={handleClick}>加入购物车</button>;
}
```

**RSC vs 传统 SSR 对比：**

| | 传统 SSR | RSC |
|---|---|---|
| 序列化内容 | 只有数据 | 组件树结构 + 数据 + 组件引用 |
| 客户端组件 | 重新执行所有组件 | 只执行 `'use client'` 的组件 |
| JS bundle | 全部组件代码发到浏览器 | 只有客户端组件的代码发到浏览器 |
| 数据获取 | API 请求 → JSON | 服务端直接查数据库 |
| 服务端代码 | 也会发到浏览器（同构） | **永远不会发到浏览器** |
| Hydration | 遍历全部 DOM 做对比 | 只对客户端组件做 Hydration |

**服务端组件的代码不发到浏览器，那它写的意义是什么？**

1. **Bundle 更小**：纯展示组件代码不发浏览器，可能省掉 80% 的 JS
2. **不需要 API 层**：服务端组件直接查数据库，省掉 API 路由 + 前端 fetch
3. **敏感代码不泄露**：数据库连接、API Key、条件渲染逻辑全留在服务端
4. **Hydration 更快**：只对客户端组件注水，跳过纯展示部分

**RSC Payload 逐行解读**

RSC 不是传"数据让你自己渲染"，而是传"渲染结果让你直接用"。浏览器拿到 Payload 后，服务端组件部分直接关联已有 DOM，只有客户端组件需要执行和 diff。

```
0:D{"name":"div"}
0:D{"name":"h1"}
0:T"iPhone 16 Pro"
0:D{"name":"p"}
0:T"9999"
0:J["AddToCartButton",{"productId":123}]
```

```txt
每行格式：行号:类型+内容

0:D  → D = DOM Element（HTML 元素），{"name":"div"} 表示 <div>
0:D  → DOM Element，{"name":"h1"} 表示 <h1>
0:T  → T = Text（文本节点），"iPhone 16 Pro" 是 h1 里的文字
0:D  → DOM Element，{"name":"p"} 表示 <p>
0:T  → Text，"9999" 是 p 里的文字
0:J  → J = Client Component Reference（客户端组件引用）
      ["AddToCartButton", {"productId":123}]
      翻译：这个位置有个客户端组件叫 AddToCartButton，
      浏览器去 JS bundle 里找到它，用 { productId: 123 } 作为 props 渲染
```

**"组件引用"和传统 JSON 的区别：** 传统 JSON 只能传数据 `{ name: "iPhone", price: 9999 }`，浏览器拿到后不知道怎么渲染——渲染逻辑在组件函数里。RSC 的 `0:J` 行传的是指令：不传组件代码，传组件名字和 props，浏览器自己去找代码执行。

**RSC 能传传统 JSON 不能传的东西：** 组件引用（`0:J`）、Promise（未完成的异步操作）、Server Action（函数引用，客户端调用时实际是发请求回服务端执行）。

**RSC 完整请求时间线（从用户输入 URL 到页面可交互）：**

```txt
第 1 毫秒：浏览器发出 GET /product/123

第 2-50 毫秒：Next.js 服务器执行 ProductPage（服务端组件）
  → await db.product.findUnique 查数据库（走内网，几毫秒）
  → 开始渲染组件树，逐个处理子节点
  → 遇到 <div>, <h1>, <p> → 普通HTML元素，记下来
  → 遇到 <AddToCartButton> → 标记了 'use client'！
    → 不执行内部逻辑，生成占位 HTML + 记录组件引用
  → 服务器手里有两样东西：
    1. 渲染出的 HTML（给浏览器直接显示）
    2. RSC Payload（给 JS 运行时用的元数据）

第 50 毫秒：服务器返回 HTTP 响应，包含三部分：
  第一部分 HTML：<h1>iPhone 16 Pro</h1>（浏览器立刻显示）
  第二部分 Payload：组件树结构 + 客户端组件引用（嵌入在 <script> 里）
  第三部分 main.js：Next.js 运行时引用

第 100 毫秒：浏览器解析 HTML → 显示内容（FCP！用户看到"iPhone 16 Pro"）
  → 但按钮点了没反应（还没有事件绑定）

第 100-500 毫秒：浏览器下载 JS
  → 下载 main.js（Next.js 运行时，约 50KB）
  → 解析 Payload 发现引用了 AddToCartButton → 下载 AddToCartButton.js（约 3KB）
  → 注意：没有下载 ProductPage / ProductInfo 的代码（服务端组件）

第 500 毫秒：JS 执行，开始 Hydration
  → 解析 RSC Payload 逐行处理：
    D(div)   → 页面已有，直接关联，不执行组件函数
    D(h1)    → 页面已有，直接关联
    T("iPhone 16 Pro") → 页面已有，直接关联
    D(p)     → 页面已有，直接关联
    T("9999") → 页面已有，直接关联
    J(AddToCartButton) → 客户端组件！执行 → 产出虚拟DOM → 和已有DOM对比 → 绑事件

第 501 毫秒：Hydration 完成 → 页面可交互

浏览器全程只执行了 AddToCartButton 这一个组件
ProductInfo 等 700 行纯展示代码没有下载、没有执行、没有 diff
```

**传统 SSR 同一时刻对比：** 浏览器下载了全部组件 JS（800KB+），执行了每个组件函数重建完整虚拟 DOM，对整棵 DOM 树做了全量 diff（包括 700 行纯展示部分，对比完就扔了）。

#### 3.7 SSG / ISR——构建时渲染与增量更新

**SSG 的诞生动机：** SSR 每个请求都要渲染，但大部分页面内容很少变。同一个商品被访问 50 万次，渲染 50 万次，其实渲染 1 次就够了。

**SSG（Static Site Generation）：** 构建时把所有页面渲染成 HTML 文件，部署到 CDN，用户请求时直接返回文件。

```txt
构建时（npm run build）：
  遍历所有商品 → 查数据库 → renderToString → 生成 HTML 文件
  /product/123.html, /product/456.html, ... 共 10 万个

运行时：CDN 直接返回文件（1ms），不经过 Node.js
```

**每个 URL 内容不同，所以 SSG 要为每个 URL 生成一个独立的 HTML 文件。** 10 万个商品 = 10 万个 HTML 文件。CSR 只需要 1 个空壳 HTML，因为内容靠 JS 动态填充。

**SSG 的问题：** 内容变了要 `npm run build` 重新构建全部页面。改 1 个商品要重建 10 万个。因为传统 SSG 的构建命令一跑，所有页面全部重新来一遍，没有"只构建某个页面"的能力。

**ISR（Incremental Static Regeneration）：** 只重新生成变化的那个页面。

```tsx
// Next.js ISR 配置
export const revalidate = 60;  // 60 秒后标记为过期

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  return <h1>{product.name}</h1>;
}

// 构建时只预生成热门商品
export async function generateStaticParams() {
  const products = await fetch('/api/products?top=100').then(r => r.json());
  return products.map(p => ({ id: String(p.id) }));
}
```

**ISR 运行时行为：**

```txt
用户访问已预生成的页面（缓存未过期）→ CDN 直接返回（1ms）
用户访问已预生成的页面（缓存超过 60 秒）
  → CDN 返回旧的 + 后台重新渲染 + 更新缓存（stale-while-revalidate）
用户访问未预生成的页面 → 首次 SSR 渲染 → 存缓存 → 返回
```

**主动触发重新验证：**

```tsx
// 管理员改了价格后，后台系统调用
import { revalidatePath, revalidateTag } from 'next/cache';

revalidatePath('/product/123');        // 按路径失效
revalidateTag('product-123');          // 按标签失效（配合 next: { tags: [...] }）
```

**SSG / ISR / SSR 对比：**

```txt
               HTML 什么时候生成？      内容变了怎么办？           服务器成本

SSG：          构建时，全部生成        重新构建全部页面（30min）   零（纯 CDN）
ISR：          构建时 + 按需生成       单个页面后台重新生成（1-2s） 极低
SSR：          每次请求时             实时，永远是新的             高
```

**选型依据：**

```txt
几乎不变（博客、文档、落地页） → SSG
偶尔变（商品详情、新闻文章）   → ISR
实时变（首页、信息流）         → SSR + 缓存
不需要 SEO（后台管理）         → CSR
```

**为什么不在 SSG 的 HTML 里加客户端请求让数据"活"起来？** 这个方案存在，但有三个问题：JS 执行前用户看到旧数据，请求回来后页面跳变闪烁；爬虫看到的还是构建时的旧数据，SEO 对动态部分无效；如果只生成骨架不加内容，就退化成了 CSR。ISR 是更好的折中——用最多 60 秒的延迟，换来了不闪烁 + SEO 完整 + 低服务器成本。

#### 3.8 SSR 缓存策略——分层设计

```txt
请求到达 SSR 服务器
  │
  ├── 1. CDN / 反向代理层缓存（整体页面缓存）
  │   按 URL + 关键请求头做缓存 key
  │   适合内容稳定、访问量大的页面
  │   缓存命中 → 直接返回，不进 Node.js
  │   失效策略：TTL + 主动 purge
  │
  ├── 2. 页面级缓存（Render Cache）
  │   服务器渲染完一次后，缓存渲染结果 HTML
  │   Next.js ISR 就是这种思路
  │   stale-while-revalidate：先返回缓存，后台重新渲染
  │
  ├── 3. 片段级缓存（Fragment Cache）
  │   只缓存页面中不变的部分（Header、Footer）
  │   React 18 Suspense + Streaming 天然支持分段渲染
  │   复杂度较高，需要按组件粒度设计缓存 key
  │
  └── 4. 数据层缓存
      缓存 API 请求结果（Redis / 内存缓存）
      服务端数据请求先查缓存，miss 再取
      数据更新时主动失效
```

**CDN 缓存与更新的三种机制：**

CDN 本质上就是一个带缓存的反向代理，缓存完全靠 HTTP 响应头控制。更新 CDN 就是"让它的缓存失效，重新从源站取一份"。

```txt
1. 被动过期：TTL 到期后，CDN 下次回源取新的
   → 有延迟，但什么都不用做

2. stale-while-revalidate：过期先返回旧的，后台取新的
   → 用户无感知，ISR 的核心机制

3. 主动 Purge：调 CDN API 清除缓存，1-5 秒全球生效
   Cloudflare：POST /zones/{id}/purge_cache
   CloudFront：createInvalidation
   阿里云 CDN：PurgeObjectCaches

   Next.js revalidatePath / revalidateTag：
   → 清除 Next.js 内部缓存 + 重新渲染
   → Vercel 部署时同步清除 CDN 边缘节点
   → 自部署需额外调 CDN Purge API
```

**Nginx 配置示意：**

```nginx
# 静态资源（JS/CSS）→ 长缓存（文件名带 hash）
location /_next/static/ {
    proxy_pass http://nextjs:3000;
    proxy_cache_valid 365d;
    add_header Cache-Control "public, immutable";
}

# ISR 页面 → 短缓存 + stale-while-revalidate
location /product/ {
    proxy_pass http://nextjs:3000;
    proxy_cache_valid 200 60s;
    add_header Cache-Control "s-maxage=60, stale-while-revalidate";
}

# revalidate API → 不缓存
location /api/revalidate {
    proxy_pass http://nextjs:3000;
    proxy_cache off;
}
```

#### 3.9 Streaming SSR——React 18 的进化

传统 SSR 全量渲染：整个页面渲染完才发送 HTML。React 18 的 `renderToPipeableStream` 支持 Streaming SSR：

```tsx
function ProductPage() {
  return (
    <div>
      <ProductInfo />           {/* 快的，50ms */}
      <Suspense fallback={<div>评价加载中...</div>}>
        <ReviewList />          {/* 慢的，2s */}
      </Suspense>
    </div>
  );
}
```

```txt
传统 SSR：请求 → 等商品+评价全渲染完(2050ms) → 一次性返回 HTML
Streaming SSR：请求 → 商品部分先渲染先返回(50ms) → 评价好了再流式补充
```

**好处：** TTFB 更短、慢数据不阻塞快数据、用户体验类似 CSR 渐进加载但首屏更快。

#### 3.10 React 18 Selective Hydration

传统 Hydration 从根节点一口气注水完，慢组件会阻塞后续组件。React 18 引入 Selective Hydration：

```tsx
function App() {
  return (
    <div>
      <Header />
      <Suspense fallback={<div>评论加载中...</div>}>
        <CommentList />   {/* JS 还没下载完 */}
      </Suspense>
      <Footer />
    </div>
  );
}
```

```txt
传统 Hydration：Header → CommentList（卡住）→ Footer 等待
Selective Hydration：Header ✅ → CommentList 跳过 → Footer ✅ → CommentList 加载完再注水

用户正在交互的区域会被优先注水
```

#### 3.11 Next.js——SSR 工程化的集大成者

**为什么需要 Next.js？** React 只是 UI 库，只管"怎么渲染组件"，不管路由、服务端渲染、打包、缓存、代码分割、部署。手搭 SSR 需要自己处理：服务器搭建、renderToString 调用、Hydration、路由（两端各一遍）、HTML 模板拼接、数据预取（两端各一遍）、序列化、Webpack 配置、CSS-in-JS 服务端收集、缓存/ISR、静态资源管理、错误降级。每个功能不难，组合在一起就是噩梦。

**Next.js 的核心就是 3 件事：**

**核心 1：路由即文件系统。** 创建文件 → 自动生成路由，服务端客户端共用，永远一致。

```txt
app/
├── page.tsx                    → /
├── about/page.tsx              → /about
├── product/[id]/page.tsx       → /product/:id（动态路由）
├── layout.tsx                  → 全局布局（嵌套，路由切换时不刷新）
├── loading.tsx                 → Suspense loading 态
├── error.tsx                   → 错误边界
├── not-found.tsx               → 404
└── api/revalidate/route.ts     → API 路由
```

**核心 2：渲染策略一句话切换。**

```tsx
// 默认：服务端组件（RSC），自动 SSR
async function ProductPage({ params }) { ... }

// 加一行：变成 ISR
export const revalidate = 60;

// 加一行：变成 SSG
export const dynamic = 'force-static';

// 标记：客户端组件（CSR）
'use client';
function AddToCartButton() { ... }
```

**核心 3：数据获取统一化。** 服务端组件直接 `async/await` 查数据库，不需要写 API 层，不需要 `getServerSideProps`。

**Pages Router vs App Router：**

Next.js 有两套路由系统。Pages Router（旧版，`pages/` 目录）没有 RSC，所有组件都是客户端组件，数据获取靠 `getServerSideProps` / `getStaticProps`。App Router（新版，`app/` 目录）基于 RSC 设计，默认服务端组件，数据获取直接 `async/await`，布局支持嵌套且路由切换时不刷新。App Router 是官方推荐的未来方向。

```txt
                    Pages Router              App Router
                    ────────────              ──────────
目录                 pages/                    app/
默认渲染              客户端组件                 服务端组件（RSC）
数据获取              getServerSideProps        async/await 直接写在组件里
                     getStaticProps            export const revalidate
布局                  _app.tsx（全局一个）       layout.tsx（嵌套，不刷新）
Loading 态            手动实现                   loading.tsx（自动 Suspense）
错误处理              手动实现                   error.tsx（自动错误边界）
API 路由              pages/api/*.ts            app/api/*/route.ts
JS 发浏览器量          全部组件                   只有 'use client' 的组件
Hydration 范围        整个页面                   只有客户端组件
```

### 4. 面试里最容易答浅的地方

1. **只说"SSR 首屏快"但说不清为什么快**：快在浏览器拿到 HTML 时已经有内容，不需要等 JS 下载和数据请求。数据请求走内网也比 CSR 走公网快。
2. **忽略 Hydration**：SSR 返回的 HTML 不可交互，必须等 Hydration 完成。FCP 快不代表 TTI 快，首屏可见 ≠ 可交互。
3. **把 SSR 和 SSG 混为一谈**：SSG 是构建时渲染，ISR 是构建时 + 按需更新，SSR 是请求时渲染。三者的缓存策略和适用场景完全不同。
4. **忽略 SSR 的服务端成本**：每个请求都要执行渲染，QPS 高时压力远大于 CSR。需要配合缓存、限流、降级策略。
5. **说"SSR 利于 SEO"但不解释原理**：本质是爬虫拿到的 HTML 直接包含内容，不需要执行 JS。Google 爬虫支持 JS 但慢且不可靠，百度等不支持。
6. **不了解 RSC 和传统 SSR 的区别**：RSC 只发客户端组件 JS 到浏览器，服务端组件代码永远不发；传统 SSR 全部组件 JS 都要发（Hydration 需要重新执行每个组件函数做对比）。
7. **不知道 Next.js 的价值**：React 只管渲染组件，路由/SSR/打包/缓存/代码分割/部署全要自己搞。Next.js 用"遵守文件约定"换"不用手写基础设施"。

### 5. 工程/业务例子

- **内容类页面（资讯、商品详情、文档）**：偏 SSR/SSG/ISR，SEO 和首屏是硬指标。
- **后台管理系统**：偏 CSR，不需要 SEO，SPA 体验更好。
- **混合架构**：Next.js App Router 支持同项目内不同路由使用不同策略——首页 SSR，博客 SSG+ISR，管理后台 CSR，API 路由走 Serverless。

---

## Part 2｜面试作答

### 思维导图关键点

- **渲染位置**：CSR 浏览器端 / SSR 服务端
- **首屏**：SSR 更快可见内容（FCP 优），可交互时间（TTI）取决于 Hydration 速度
- **SEO**：SSR 直接返回完整 HTML，爬虫友好
- **Hydration**：SSR 返回的 HTML 不可交互，需 JS 注水；逐节点对比虚拟 DOM 与真实 DOM；Mismatch 是常见坑
- **序列化**：传统 SSR 用 `window.__INITIAL_STATE__` 传 JSON 数据；Next.js 用 `__NEXT_DATA__`；RSC 用 Flight Protocol 传组件树
- **RSC**：服务端组件代码不发浏览器，只发 `'use client'` 的组件，bundle 更小，Hydration 更精准
- **SSG/ISR**：构建时渲染 + 按需增量更新，配合 CDN 的 stale-while-revalidate
- **缓存分层**：CDN 缓存 / 页面缓存 / 片段缓存 / 数据缓存
- **CDN 更新**：被动过期 / stale-while-revalidate / 主动 Purge API
- **Streaming SSR**：React 18 支持流式渲染，Suspense 配合分段发送 HTML，慢数据不阻塞快数据
- **Selective Hydration**：Suspense 边界可以跳过，优先注水用户正在交互的区域
- **Next.js**：路由即文件系统 / 渲染策略一句话切换 / 数据获取统一化 / Pages Router(旧) vs App Router(新)
- **服务端成本**：SSR 每次请求都渲染，需缓存和降级策略

### 60-90 秒口语稿

"CSR 和 SSR 的核心差异是渲染发生的位置。CSR 首次返回通常是 HTML 壳，浏览器要等 JS 下载、执行、发数据请求之后才能渲染出内容；SSR 是服务端提前把页面和数据渲染成完整 HTML 返回，浏览器拿到就能显示，所以首屏更快，也更利于 SEO。但有个细节：SSR 返回的 HTML 只是静态快照，要等 Hydration 完成后才能交互，所以 FCP 快不代表 TTI 快。Hydration 的过程是 React 拿虚拟 DOM 和已有 HTML 逐节点对比，匹配就复用 DOM 只绑事件，不匹配就报 Mismatch。另外现在有 RSC，服务端组件的代码不发到浏览器，只发需要交互的客户端组件，bundle 更小，Hydration 也更快。缓存方面，内容稳定用 SSG，偶尔更新用 ISR 配合 CDN 的 stale-while-revalidate，实时性要求高用 SSR 加页面级缓存。我们项目里内容详情页用 ISR，保证 SEO 和首屏；后台管理页纯 CSR。"

### 高频追问

**Q1：SSR 如何做缓存？**

三层缓存：CDN 层按 URL 缓存整个页面；应用层做页面级渲染缓存，配合 stale-while-revalidate；数据层缓存 API 结果。Next.js 的 ISR 是页面缓存的工程化实现——先返回缓存页面，后台按 TTL 或按需重新生成。

**Q2：Hydration Mismatch 怎么排查？**

常见原因：`Date.now()` / `Math.random()` 服务端客户端不同；组件依赖 `window` 等浏览器 API；浏览器插件修改了 DOM。排查：React DevTools 标出 Mismatch 位置。解决：延迟到客户端渲染（`useEffect` + mounted flag）、`suppressHydrationWarning`、避免渲染路径中使用浏览器特有 API。

**Q3：CSR/SSR 混合时路由和数据层怎么设计？**

Next.js App Router：默认 Server Component（SSR），需要交互的组件用 `'use client'`。数据层：Server Component 直接 `async/await` 查数据库；Client Component 用 `useEffect` 或 SWR/React Query 取数据。路由层面，`loading.tsx` 配合 Suspense 做 Streaming SSR 的 loading 态。

**Q4：SSR 的 TTFB 比 CSR 长，怎么优化？**

1. Streaming SSR 降低 TTFB；2. 数据预取并行化 `Promise.all`；3. CDN / 页面级缓存命中直接返回；4. SSR 超时 fallback 到 CSR；5. Edge SSR 渲染放到边缘节点减少网络延迟。

**Q5：RSC 和传统 SSR 的本质区别？**

传统 SSR 是同构：所有组件代码都发到浏览器，因为 Hydration 要重新执行每个组件函数做对比。RSC 把组件分为服务端组件和客户端组件：服务端组件代码永远不发到浏览器，只有渲染结果（HTML）发过去；浏览器只需对客户端组件做 Hydration。省掉的是纯展示组件的 JS 传输和 Hydration 开销。

**Q6：SSG、ISR、SSR 怎么选？**

内容几乎不变（博客/文档/落地页）→ SSG；内容偶尔变（商品详情/新闻文章）→ ISR；内容实时变（首页/信息流）→ SSR + 缓存；不需要 SEO（后台管理）→ CSR。本质上是用"内容延迟"换"服务器成本"。

**Q7：Next.js App Router 和 Pages Router 的区别？**

Pages Router 没有服务端组件，所有组件都是客户端组件，数据获取靠 `getServerSideProps` 等特殊函数，布局靠 `_app.tsx` 全局一个。App Router 基于 RSC 设计，默认服务端组件，数据获取直接 `async/await`，布局支持嵌套且路由切换时不刷新，有 `loading.tsx` / `error.tsx` 等约定式文件自动处理 Suspense 和错误边界。App Router 是官方推荐的未来方向。

### 面试满分答案参考

**题目 1：CSR 和 SSR 的本质区别及工程取舍**

核心差异是渲染发生的位置。CSR 的服务器是静态文件服务器，不管访问什么 URL 都返回同一个空壳 HTML，渲染完全在浏览器完成。SSR 的服务器参与渲染，在 Node.js 端执行 React 组件树、查数据库、渲染成完整 HTML 返回。由此导致的取舍：SSR 首屏快（FCP 优）、SEO 好、数据请求走内网更快；但服务端压力大、Hydration 一致性问题、缓存策略复杂、运维成本高。CSR 服务端压力小、开发部署简单、后续路由切换快（SPA）；但首屏白屏长、SEO 差。选型本质是：把渲染工作放在哪里？放服务器→用户快但服务器贵；放浏览器→服务器便宜但用户慢。RSC 不是"两者优点全有"，而是一种新的分工方式：服务端组件负责纯展示（代码不发浏览器），客户端组件负责交互，省掉纯展示组件的 JS 传输和 Hydration 开销，但也有 Server/Client 组件边界设计的心智负担。

**题目 2：CSR 和 SSR 完整请求链路**

CSR：HTML 请求（返回空壳）→ JS 下载（最大瓶颈）→ JS 执行 → API 请求（走公网）→ 数据返回 → 渲染 → FCP + TTI 几乎同时到达，但整体白屏长。SSR：HTML 请求（服务端查数据走内网 + renderToString）→ 返回完整 HTML → FCP（浏览器立刻显示）→ JS 下载 → Hydration → TTI。关键：SSR 让 FCP 大幅提前，但 TTI 和 CSR 差不多（都要等 JS 下载），FCP 和 TTI 之间有"可见但不可交互"的窗口期。

**题目 3：Hydration Mismatch 判断**

`window.innerWidth` 在服务端不存在，直接报 `ReferenceError: window is not defined`。即使做了守卫，服务端 `isMobile` 为 `false` 渲染 `<DesktopLayout />`，客户端可能为 `true` 渲染 `<MobileLayout />`，逐节点对比时第一个子节点标签名不一致 → Mismatch。修复：延迟到客户端渲染（`useEffect` + mounted flag）或用 CSS 媒体查询替代条件渲染（两个布局都渲染，CSS 控制显示哪个，DOM 结构一致就不 Mismatch）。

**题目 4：序列化原理**

服务端和浏览器内存隔离，HTTP 响应是唯一桥梁。传统 SSR 用 `window.__INITIAL_STATE__` 或 `__NEXT_DATA__` 把数据 JSON 化塞进 HTML，客户端 Hydration 时直接取用，保证首次渲染和服务端一致。RSC 用 Flight Protocol 序列化整个组件树：`D` 行是 HTML 元素、`T` 行是文本、`J` 行是客户端组件引用（浏览器去找代码执行）。RSC 能传传统 JSON 不能传的：组件引用、Promise、Server Action。

**题目 5：SSR 高 QPS 优化**

第 1 步加 CDN（重复请求不进 Node.js）→ 第 2 步从 SSR 改 ISR（同一页面 60 秒只渲染一次 + stale-while-revalidate）→ 第 3 步热门商品 SSG 预生成（构建时生成，消除冷启动）→ 第 4 步主动 revalidatePath（数据变了立即更新单个页面）→ 第 5 步极端降级（SSR 超时 fallback 到 CSR、限流返回过期缓存）。

**题目 6：反驳"SSR 一定比 CSR 好"**

场景 1：后台管理系统——不需要 SEO，用户登录后持续使用几小时，首屏快 0.5 秒毫无体感，每个用户看到的页面不同导致 SSR 缓存几乎无效，用 SSR 纯粹浪费服务器资源。场景 2：强交互应用（在线文档、设计工具）——几乎所有组件都有状态和事件，几乎全是客户端组件，服务端渲染出的 HTML 到客户端几乎全要被 Hydration 覆盖，相当于渲染两遍。场景 3：内网工具私有化部署——客户不想为前端买高配服务器，CSR 只需 Nginx 1 核 2G，SSR 需要 Node.js 4 核 8G。核心逻辑：当你不需要首屏快和 SEO 时，SSR 只有代价没有收益。

### 复习标记

- [ ] 能说清 CSR 和 SSR 的完整请求链路和各阶段耗时（FCP vs TTI）
- [ ] 能解释序列化为什么必须做（服务端和浏览器内存隔离，HTTP 响应是唯一桥梁）
- [ ] 能解释 Hydration 的逐节点对比机制和 Mismatch 常见原因及修复方式
- [ ] 能区分传统 SSR 序列化（`window.__INITIAL_STATE__` / `__NEXT_DATA__`）和 RSC 序列化（Flight Protocol 的 D/T/J 行）
- [ ] 能说清 RSC 完整请求时间线（从用户输入 URL 到页面可交互，每一毫秒发生了什么）
- [ ] 能说清 SSG/ISR/SSR 的生成时机、缓存策略和选型依据
- [ ] 能解释 CDN stale-while-revalidate 和主动 Purge 的区别
- [ ] 能解释 Streaming SSR 和 Selective Hydration 的原理
- [ ] 能反驳"SSR 一定比 CSR 好"并给出具体场景
- [ ] 能解释 Next.js 的核心价值（路由即文件系统 / 渲染策略切换 / 数据获取统一化）
- [ ] 能对比 Next.js Pages Router 和 App Router

---

## Part 3｜附录

### 主要资料依据

- React 官方文档：hydrateRoot、Server Components、Streaming SSR、Selective Hydration
- Next.js 官方文档：App Router、ISR、revalidatePath、revalidateTag、Pages Router vs App Router
- HTTP 缓存规范：RFC 7234 Cache-Control、stale-while-revalidate（RFC 5861）

### 版本差异说明

- React 18 引入 `renderToPipeableStream`（Streaming SSR）和 Selective Hydration
- React 19 对 Hydration Mismatch 更严格，某些情况抛错
- Next.js Pages Router 的 ISR 用 `getStaticProps` + `revalidate`；App Router 用 `export const revalidate` + `fetch` 的 `next.tags`
- RSC 在 Next.js App Router 中稳定可用
- App Router 是官方推荐方向，Pages Router 仍支持但不推荐新项目使用
