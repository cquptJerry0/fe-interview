
## Next.js 原理

### 没有它会怎样

纯 CSR：首屏白屏 + SEO 差。手搭 SSR：自己处理路由、渲染、缓存、代码拆分，工程成本极高。

### Next.js 做了什么

把"React 组件 → 服务端/客户端渲染 → 用户看到页面"这条链路的工程化全包了。

---

### Pages Router 的 SSR 怎么做的

**构建阶段**：
1. 扫描 `pages/` 目录，生成路由表
2. 每个页面做 code splitting，生成独立 chunk
3. SSG 页面：执行 `getStaticProps`，生成静态 HTML + JSON
4. SSR 页面：打包页面组件 + `getServerSideProps`，留到运行时执行

**请求阶段（SSR）**：
```
请求进来
  → Next 匹配路由
  → 执行 getServerSideProps，拿到 props
  → renderToString(pageComponent, props)，生成 HTML
  → 把 props 序列化塞进 <script id="__NEXT_DATA__"> 里
  → 返回 HTML
  → 客户端 JS 加载后，用 __NEXT_DATA__ 里的 props 做 hydration
  → 页面变为可交互
```

**核心问题**：
- 页面组件**全量发 JS 到客户端**做 hydration，不管组件有没有交互
- `getServerSideProps` 和组件分离，逻辑不内聚
- hydration 是 all-or-nothing，整个页面一起 hydrate，不能按组件粒度

---

### App Router 的 RSC 怎么做的

**核心变化：从"页面级 SSR + 全量 hydration"变成"组件级服务端渲染 + 按需 hydration"**

**构建阶段**：
1. 扫描 `app/` 目录，生成路由树
2. 分析每个组件是 Server Component 还是 Client Component
3. Server Component：只保留服务端 bundle，**不生成客户端 JS**
4. Client Component（`'use client'`）：生成客户端 chunk
5. SSG 页面：预渲染 HTML；SSR 页面：留到运行时

**请求阶段（SSR）**：
```
请求进来
  → Next 匹配路由，找到 layout + page 组成的组件树
  → 从叶子节点开始，递归渲染组件树：
     - 遇到 Server Component：在服务端执行，输出 RSC Payload
     - 遇到 Client Component：输出一个占位引用（placeholder + chunkId）
     - 遇到 Suspense boundary：先输出 fallback，子树就绪后追加
  → RSC Payload 是一种序列化格式（不是 HTML），描述了组件树的结构和数据
  → 流式返回：先发 HTML shell（layout + loading），再流式追加 RSC Payload
  → 客户端 React 消费 RSC Payload，重建虚拟 DOM 树
  → Client Component 对应的 chunk 加载后，做局部 hydration
  → 页面变为可交互
```

**RSC Payload 长什么样（简化）**：
```
// 服务端组件的输出：类型 + props
0:{"id":"./app/page.tsx","chunks":[],"name":"default"}
1:{"title":"Hello"}          // props 数据
2:{"$$typeof":"Symbol(client)"}  // 客户端组件占位
3:{"id":"./components/Button.tsx","chunks":["123"]}
```
它是序列化指令流，客户端 React 逐条消费，遇到客户端组件引用就加载对应 chunk。

---

### 关键优化

| 优化点 | Pages Router | App Router | 原理 |
|--------|-------------|------------|------|
| **JS 体积** | 全量发 | Server Component 不发 JS | RSC 只传序列化数据，不发组件代码 |
| **Hydration 粒度** | 整页一次性 | 按客户端组件局部 hydrate | 只有 `'use client'` 的组件才 hydrate |
| **流式渲染** | 不支持 | Suspense + 流式 | 先发 shell，数据到了追加 RSC Payload |
| **布局持久化** | 每次重渲染 | layout 保持挂载 | 路由切换只替换 children slot |
| **代码拆分** | 按页面 | 按页面 + 按客户端组件 | Client Component 独立 chunk，懒加载 |
| **Prefetch** | Link hover 时 | Link 可见就 prefetch | 路由预加载，切换几乎瞬间 |
| **Partial Prerendering** | 不支持 | 静态 shell + 动态洞 | 同一页面静态部分缓存，动态部分流式填充 |

---

### 60-90 秒口语稿

> Next.js 解决的是 React SPA 首屏白屏和 SEO 差的问题，同时把 SSR 的工程难度降下来。
>
> 老版本 Pages Router 的 SSR 原理是：请求进来，先执行 `getServerSideProps` 拿数据，再用 `renderToString` 生成完整 HTML，同时把 props 序列化塞进页面的 `__NEXT_DATA__`，客户端加载 JS 后用这些 props 做 hydration。问题是页面组件全量发 JS 到客户端，hydration 也是整页一次性，不管组件有没有交互。
>
> 新版本 App Router 引入了 React Server Components，原理变了：服务端递归渲染组件树，Server Component 在服务端执行后输出 RSC Payload——一种序列化指令流，不是 HTML。遇到 Client Component 只输出占位引用和 chunkId。然后流式返回，先发 HTML 骨架，数据到了追加 Payload。客户端 React 消费 Payload 重建虚拟 DOM，只有 Client Component 才加载 JS 做 hydration。这样从页面级 SSR 变成了组件级，客户端 JS 大幅减少，hydration 也是按需局部做。
>
> 实际项目里我会根据页面选策略：内容页 SSG/ISR，个性化页 SSR，交互部分 `'use client'`，这样首屏快、SEO 好、JS 体积也能控制住。

### 高频追问

- **RSC Payload 和 HTML 区别？** HTML 是视觉描述，Payload 是结构+数据描述，客户端 React 消费后能精确还原组件树，做到局部 hydration
- **为什么 Server Component 不发 JS？** 因为它在服务端已经执行完了，输出的是结果数据，客户端只需要消费结果，不需要组件代码
- **hydration 失败怎么办？** React 18 可以降级为客户端渲染，但不推荐，应该保证服务端和客户端输出一致

---

这下原理层面讲清楚了吧？