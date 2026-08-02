# 前端依赖工程化：从 package.json 到 monorepo，再到微前端运行时共享

副标题：声明依赖、锁定依赖、摆放 `node_modules`、治理多包工程、发布包、运行时共享

## 使用说明｜最高 ROI 读法

这篇不是用来从头到尾慢慢背的。最高 ROI 的读法是三遍：

```txt
第一遍：只抓主线
  package.json 声明范围
  lockfile 锁定结果
  node_modules 决定摆法
  pnpm 解决复用和严格性
  workspace 治理多包
  package exports 决定别人怎么消费
  Module Federation 处理运行时共享

第二遍：每章只背一个矛盾
  package.json：范围 vs 结果
  lockfile：不确定安装 vs 可复现安装
  node_modules：依赖边界 vs 去重复用
  pnpm：扁平宽松 vs 链接严格
  workspace：多仓割裂 vs 一仓协同
  包发布：自己能跑 vs 别人能消费
  微前端：应用隔离 vs 运行时共享

第三遍：只练输出
  每章看“训练卡”
  先复述训练卡前三句
  再讲对应案例
  最后接 3 个面试官追问
```

你最后不需要逐字背完整正文，只要能抓住这 12 个关键词：

```txt
1. package.json
2. semver
3. peerDependencies
4. lockfile
5. npm ci
6. npm v2 nested
7. npm v3 hoist
8. phantom dependency
9. pnpm store
10. hard link / symlink
11. workspace
12. Module Federation shared
```

上场验收标准：

```txt
能用 2 分钟讲完整链路。
能用 30 秒讲 npm / yarn / pnpm。
能解释 package.json 和 lockfile 的区别。
能画出 nested、hoist、pnpm store 三张图。
能把组件库 peerDependencies 和微前端 shared 联系起来。
```

## Part 1｜技术讲解

### 1. 一句话结论

前端依赖工程化不是一道简单的 `npm / yarn / pnpm 有什么区别`。

更完整的理解应该是：

一个前端项目从单应用变成多人协作、多包仓库、组件库发布、微前端运行时共享之后，依赖问题会沿着一条链路不断升级：先要声明“我需要什么包”，再要锁定“我实际装了什么版本”，再要决定“这些包如何被安装和摆放”，再要治理“多个项目怎么共享依赖”，最后还要处理“多个独立应用在浏览器运行时如何共享依赖”。

真正的高分点，是你能把 `package.json`、lockfile、npm v2/v3、hoist、幽灵依赖、pnpm、workspace、包入口、Module Federation 串成一条连续的工程演进链，而不是把它们背成一堆零散名词。

### 2. 主链路图

```txt
一个前端项目
  |
  v
声明依赖
  package.json
  dependencies / devDependencies / peerDependencies
  semver / ^ / ~
  |
  v
锁定依赖
  package-lock.json / yarn.lock / pnpm-lock.yaml
  npm install / npm ci
  lockfileVersion
  |
  v
安装依赖
  registry 下载
  cache 复用
  integrity 校验
  |
  v
摆放 node_modules
  npm v2 nested
  npm v3 hoist / dedupe
  phantom dependency
  |
  v
复用与严格性
  npm / yarn / pnpm
  pnpm store
  hard link / symlink
  strict dependency
  |
  v
治理多包工程
  monorepo
  workspace
  内部包引用
  统一 lockfile
  |
  v
构建和发布
  main / module / exports / types
  CJS / ESM
  sideEffects / tree-shaking
  peerDependencies
  |
  v
运行时共享
  micro frontend
  Module Federation
  shared / singleton / requiredVersion
```

```txt
这条链路的核心问题：

依赖到底应该如何被声明、锁定、安装、复用、隔离、发布和共享？
```

### 3. 分阶段展开

#### 阶段 0｜为什么前端依赖工程化会变复杂

先从一个项目演进故事开始。

一开始，一个中后台项目可能只有：

```txt
react
react-dom
axios
antd
vite
typescript
```

这个阶段你会觉得包管理很简单：

```txt
npm install
npm run dev
```

但项目继续长大后，问题会越来越多：

```txt
1. 新同事拉项目，本地能不能装出和你一样的依赖？
2. CI 构建时，依赖版本会不会和本地不一致？
3. 为什么 node_modules 这么大？
4. 为什么 package.json 没声明的包也能 import？
5. 为什么切到 pnpm 后，某些包突然找不到？
6. 组件库发布时，React 要不要打进产物？
7. monorepo 里多个应用怎么共用组件库？
8. 微前端里多个子应用都带 React，会不会重复加载？
```

这些问题表面分散，底层其实都是依赖治理问题。

所以这章的总心智是：

```txt
包管理不是下载依赖。
包管理是在治理依赖关系。
```

要打穿的大问题：

```txt
1. 依赖从哪里声明？
2. 真实安装结果怎么固定？
3. node_modules 为什么会演进？
4. 包管理器到底差在哪里？
5. 多包工程怎么治理依赖？
6. 我发布的包如何被别人消费？
7. 多个应用运行时怎么共享依赖？
```

掌握标准：

```txt
你能把“npm/yarn/pnpm 区别”升级成“前端依赖工程化演进链”。
```

本阶段训练卡：

```txt
三句背诵版：
1. 包管理不是下载依赖，而是治理依赖关系。
2. 项目越大，依赖问题越会从安装扩展到协作、发布和运行时共享。
3. npm/yarn/pnpm 只是这条链路中的一段，不是全部。

一个真实案例：
一个后台平台从单应用变成多个业务应用、组件库、monorepo、微前端后，依赖问题会从“能不能装上”变成“能不能稳定复现、统一治理、正确发布和运行时共享”。

自测题：
如果面试官问 npm/yarn/pnpm 区别，你能先说“这题背后其实是依赖工程化演进”吗？
```

#### 阶段 1｜依赖声明：为什么 package.json 不够

真实项目故事：

```txt
你写了一个页面，本地运行正常。
新同事拉代码后 npm install，也能启动。
但过几天另一个同事安装时报错，CI 上又是另一个结果。
大家明明用的是同一个 package.json，为什么结果不一样？
```

引出的大问题：

```txt
1. package.json 到底描述什么？
2. dependencies / devDependencies / peerDependencies 有什么区别？
3. semver 里的 ^、~、精确版本怎么理解？
4. 为什么 package.json 不能保证安装结果完全一致？
```

原理图和费曼解释：

```txt
package.json 像一张采购申请单。

dependencies：
  我要上线运行时也需要这些东西。

devDependencies：
  我开发、构建、测试时需要这些东西，上线运行时不一定需要。

peerDependencies：
  我这个包不自己带这份依赖，但我要求使用方提供一个兼容版本。

semver：
  我不是永远只要一个固定版本，而是允许在一个兼容范围内选择版本。
```

例子：

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "react": ">=18"
  }
}
```

这里要记住：

```txt
dependencies 解决运行时依赖。
devDependencies 解决开发构建依赖。
peerDependencies 解决“我需要你外部提供某个宿主依赖”。
```

`^` 和 `~` 的面试理解：

```txt
"^1.2.3"：
  通常允许升级 minor 和 patch，也就是 1.x.x 范围内的兼容版本。

"~1.2.3"：
  通常只允许升级 patch，也就是 1.2.x 范围内的兼容版本。

"1.2.3"：
  精确版本。
```

所以：

```json
{
  "lodash": "^4.17.0"
}
```

不等于永远安装 `4.17.0`。

它表达的是：

```txt
我接受 4.x 范围内的兼容更新。
```

今天可能装到：

```txt
lodash 4.17.20
```

明天可能装到：

```txt
lodash 4.17.21
```

这就是为什么光有 `package.json` 不够。

这一阶段的核心图：

```txt
package.json
  |
  +-- 描述依赖范围
  |
  +-- 不保证唯一安装结果
  |
  v
需要 lockfile 锁定真实依赖树
```

真实模拟口述答案：

```txt
我会先把 package.json 理解成依赖声明文件。它描述项目需要哪些依赖，以及这些依赖的大概版本范围，但它不一定等于最终安装结果。

比如 dependencies 里一般放运行时需要的依赖，像 react、axios；devDependencies 放开发和构建时需要的工具，像 vite、typescript；peerDependencies 常见于组件库或者插件，意思是我这个包要求宿主项目提供某个依赖，比如组件库通常会把 react 放到 peerDependencies，而不是自己打包一份 react。

版本上，package.json 经常会用 semver 范围，比如 ^4.17.0 代表可以接受同 major 下的兼容更新。所以不同时间安装，可能拿到不同的小版本。这就是为什么 package.json 只能说明“我要什么范围”，不能保证“实际装了什么”。要保证团队和 CI 安装一致，就需要 lockfile。
```

高频追问：

```txt
问：为什么组件库通常把 React 放 peerDependencies？
答：因为组件库希望复用宿主应用的 React。如果组件库自己打包一份 React，业务应用又有一份 React，就可能出现重复打包、Hooks 上下文不一致、包体变大等问题。

问：dependencies 和 devDependencies 在线上有什么区别？
答：从语义上看，dependencies 是运行时依赖，devDependencies 是开发构建依赖。但对前端应用来说，最终上线的是构建产物，构建工具如何处理依赖还要看打包配置。面试里重点是语义和职责，不要简单说 devDependencies 一定不会影响线上。

问：^ 和 ~ 哪个范围更大？
答：通常 ^ 范围更大，允许 minor 和 patch 更新；~ 更保守，主要允许 patch 更新。
```

掌握标准：

```txt
你能解释“我声明我要什么”和“我实际装了什么”不是一回事。
```

本阶段训练卡：

```txt
三句背诵版：
1. package.json 描述的是依赖范围，不是唯一安装结果。
2. dependencies 是运行时依赖，devDependencies 是开发构建依赖，peerDependencies 是要求宿主提供的依赖。
3. ^ 和 ~ 都表示可接受版本范围，所以不同时间安装可能拿到不同版本。

一个真实案例：
package.json 写 lodash ^4.17.0，今天可能装到 4.17.20，明天可能装到 4.17.21，所以只看 package.json 无法保证团队安装一致。

自测题：
为什么组件库更适合把 React 放 peerDependencies，而不是 dependencies？
```

#### 阶段 2｜依赖锁定：为什么需要 package-lock

真实项目故事：

```txt
一个项目昨天 CI 构建成功。
今天没有改业务代码，CI 却挂了。
排查后发现不是你的代码变了，而是某个间接依赖发布了新版本。
```

这时就会出现一个非常工程化的问题：

```txt
如果 package.json 只是版本范围，谁来记录“这次到底安装了哪些精确版本”？
```

引出的大问题：

```txt
1. package-lock.json / yarn.lock / pnpm-lock.yaml 锁的是什么？
2. 为什么 lockfile 要提交到仓库？
3. npm install 和 npm ci 有什么区别？
4. lockfileVersion v1 / v2 / v3 大概为什么演进？
5. 为什么 CI 更适合 npm ci？
```

原理图和费曼解释：

```txt
package.json 是采购申请单。
lockfile 是这次实际入库清单。

申请单写：
  我要 lodash ^4.17.0

入库清单写：
  实际拿到 lodash 4.17.21
  下载地址是什么
  integrity hash 是什么
  它又依赖了哪些精确版本
```

核心图：

```txt
package.json
  |
  +-- lodash: ^4.17.0
  |
  v
npm install
  |
  v
package-lock.json
  |
  +-- lodash: 4.17.21
  +-- resolved: 下载地址
  +-- integrity: 内容校验
  +-- dependencies: 子依赖精确版本
```

`npm install` 和 `npm ci` 的面试理解：

```txt
npm install：
  面向开发环境。
  会根据 package.json 和 package-lock 安装依赖。
  在需要时可能更新 lockfile。

npm ci：
  面向 CI 和可复现构建。
  要求 package-lock 和 package.json 一致。
  通常会删除现有 node_modules，再严格按 lockfile 安装。
  不会顺手改 lockfile。
```

`lockfileVersion` 怎么讲：

```txt
不用死背每个字段。
面试里可以说：
lockfileVersion 的演进，本质是 npm 为了记录更完整的依赖树、node_modules 布局、包元信息和兼容不同 npm 版本的安装行为。
```

这一阶段要注意一个误区：

```txt
lockfile 不是“多余文件”。
lockfile 是团队协作和 CI 可复现安装的核心依据。
```

真实模拟口述答案：

```txt
package.json 只描述依赖范围，所以它不能保证每个人装出来完全一样。lockfile 的作用就是把一次真实安装得到的完整依赖树锁下来，包括每个包的精确版本、下载地址、完整性校验和子依赖关系。

开发时我们通常用 npm install，它会根据 package.json 和 lockfile 安装依赖，必要时可能更新 lockfile。CI 环境更适合用 npm ci，因为它会严格按照 package-lock 安装，要求 package.json 和 lockfile 一致，并且不会改 lockfile。这样可以避免“本地能跑、CI 装出另一棵依赖树”的问题。

所以我理解 lockfile 的核心价值是可复现安装。它把“我想要什么依赖范围”变成“我这次实际安装了什么精确依赖树”。
```

高频追问：

```txt
问：lockfile 要不要提交？
答：应用项目一般应该提交，因为要保证团队和 CI 可复现安装。库项目是否提交会看团队策略，但现代前端仓库通常也会保留，用于自身开发和测试稳定。

问：npm ci 为什么比 npm install 更适合 CI？
答：因为 CI 要的是确定性。npm ci 严格按 lockfile 安装，不会修改 lockfile，发现 package.json 和 lockfile 不一致就失败，这反而能提前暴露依赖声明和锁文件不一致的问题。

问：只锁直接依赖够不够？
答：不够。很多风险来自间接依赖。lockfile 的价值就在于锁住整棵依赖树。
```

掌握标准：

```txt
你能讲清楚 lockfile 是为了可复现安装，不是多余文件。
```

本阶段训练卡：

```txt
三句背诵版：
1. package.json 是依赖范围，lockfile 是真实依赖树。
2. lockfile 锁的是精确版本、下载地址、integrity 和子依赖关系。
3. npm ci 更适合 CI，因为它严格按 lockfile 安装，不会顺手改锁文件。

一个真实案例：
项目没改业务代码但 CI 挂了，常见原因是间接依赖版本漂移；lockfile 就是为了避免这种不可复现安装。

自测题：
npm install 和 npm ci 的差异，能不能用“开发灵活性 vs CI 确定性”来解释？
```

#### 阶段 3｜node_modules 演进：npm v2 到 npm v3

真实项目故事：

```txt
老项目的 node_modules 特别大。
目录路径特别深。
同一个 lodash 可能被不同依赖重复安装很多份。

后来 node_modules 变扁平了，重复少了。
但又出现一个更隐蔽的问题：
项目没有声明某个包，却也能 import 成功。
```

引出的大问题：

```txt
1. npm v2 的嵌套 node_modules 是什么样？
2. npm v3 为什么做扁平化和 hoist？
3. hoist 和 dedupe 解决了什么问题？
4. 幽灵依赖是什么？
5. 为什么扁平化既是优化也是风险？
```

原理图和费曼解释：

npm v2 的心智：

```txt
依赖树怎么长，node_modules 就怎么嵌套。
```

例子：

```txt
app
  node_modules
    A
      node_modules
        lodash
    B
      node_modules
        lodash
```

好处：

```txt
依赖边界清晰。
A 用自己的 lodash。
B 用自己的 lodash。
```

问题：

```txt
重复安装多。
目录层级深。
node_modules 体积大。
```

npm v3 之后的扁平化心智：

```txt
能提升到顶层的公共依赖，就尽量提升。
```

例子：

```txt
app
  node_modules
    A
    B
    lodash
```

好处：

```txt
减少重复。
路径更浅。
安装结果更接近扁平结构。
```

但副作用就是幽灵依赖。

幽灵依赖例子：

```json
{
  "dependencies": {
    "antd": "^5.0.0"
  }
}
```

你的代码却写：

```js
import warning from 'rc-util/lib/warning'
```

如果 `rc-util` 是 `antd` 的间接依赖，并且被 hoist 到顶层，你可能会在本地 import 成功。

但你的 `package.json` 没声明它。

这就是：

```txt
用了，但没声明。
能跑，但不可靠。
```

如果哪天 `antd` 不再依赖 `rc-util`，或者包管理器换成更严格的结构，这段代码就会炸。

这一阶段的核心图：

```txt
npm v2：
  依赖边界清晰
  重复多、路径深

npm v3：
  hoist 减少重复
  但依赖边界变模糊
  可能产生幽灵依赖
```

真实模拟口述答案：

```txt
npm v2 更接近嵌套依赖树，一个包的依赖会装在它自己的 node_modules 下面。这样依赖边界清楚，但会导致重复安装多、目录层级深、node_modules 很大。

npm v3 之后更倾向于扁平化和 hoist，也就是把可以复用的依赖提升到顶层，减少重复安装。但它也带来一个问题：项目可能没有在 package.json 里声明某个包，却因为这个包被间接依赖提升到了顶层，所以可以被 import 到。这就是幽灵依赖。

所以我理解 npm v2 到 v3 的演进，是从“依赖边界清晰但重复多”，走向“减少重复但边界更模糊”。这也解释了为什么后面 pnpm 会强调更严格的依赖结构。
```

高频追问：

```txt
问：hoist 是什么？
答：把依赖从深层 node_modules 提升到更靠上的 node_modules，减少重复安装。

问：dedupe 是什么？
答：尽量复用兼容版本的依赖，减少同一依赖的多份副本。

问：幽灵依赖为什么危险？
答：因为它没有被当前项目显式声明，只是偶然出现在 node_modules。依赖树变化、包管理器变化或间接依赖升级后，它可能消失。
```

掌握标准：

```txt
你能画出嵌套结构和扁平结构，并解释幽灵依赖怎么产生。
```

本阶段训练卡：

```txt
三句背诵版：
1. npm v2 更像真实依赖树，边界清晰但重复多、路径深。
2. npm v3 通过 hoist 把依赖提升到顶层，减少重复但模糊边界。
3. 幽灵依赖就是用了但没声明，只是因为被提升到顶层才侥幸能访问。

一个真实案例：
项目只声明 antd，却直接 import rc-util；如果 rc-util 被 hoist 到顶层，本地可能能跑，但这就是不可靠的幽灵依赖。

自测题：
为什么 npm v3 的扁平化既是优化，也会制造风险？
```

#### 阶段 4｜npm、yarn、pnpm 的真正区别

真实项目故事：

```txt
同一个大型 monorepo：

用 npm 装依赖，速度比较慢。
用 yarn classic，安装体验更稳。
切到 pnpm 后，安装明显变快、磁盘也更省。
但一些没在 package.json 里声明的包突然找不到了。
```

这时面试官问：

```txt
npm、yarn、pnpm 有什么区别？
```

不能只答：

```txt
pnpm 更快。
```

要从依赖存储和依赖边界回答。

引出的大问题：

```txt
1. npm 的优势为什么是兼容性？
2. yarn classic 主要解决早期 npm 哪些痛点？
3. pnpm 的 global store 是什么？
4. 硬链接和软链接分别负责什么？
5. pnpm 为什么更严格？
```

原理图和费曼解释：

npm 心智：

```txt
官方默认。
生态兼容最好。
传统 node_modules 结构最容易被老项目和工具链接受。
```

yarn classic 心智：

```txt
更像早期 npm 的工程化加强版。
重点解决安装速度、缓存、lockfile 稳定性和多人协作安装体验。
```

pnpm 心智：

```txt
真实包内容放进全局 store。
项目中通过链接组织 node_modules。
```

pnpm 核心图：

```txt
pnpm store
  |
  +-- react@18 的真实文件
  +-- lodash@4 的真实文件
        |
        | hard link：复用真实文件内容
        v
项目 node_modules/.pnpm
        |
        | symlink：组织依赖路径
        v
项目 node_modules/react
```

硬链接和软链接怎么记：

```txt
hard link：
  像同一份文件的多个入口。
  重点是复用文件内容，节省磁盘。

symlink：
  像快捷方式。
  重点是组织路径，让 Node 能按规则找到依赖。
```

pnpm 为什么严格：

```txt
npm/yarn classic 的扁平化结构可能让你访问到没声明的包。
pnpm 的结构更接近“声明了才能稳定访问”。
所以幽灵依赖在 pnpm 下更容易暴露。
```

真实模拟口述答案：

```txt
我会从兼容性、安装体验和依赖存储结构三个角度区分 npm、yarn 和 pnpm。

npm 是 Node 官方默认包管理器，生态兼容性最好，很多老项目和工具链默认就是传统 node_modules 结构。

yarn classic 更像是对早期 npm 的增强，主要解决当时 npm 安装慢、缓存和 lockfile 体验不稳定的问题，所以它在大型项目里曾经很流行。

pnpm 的差异更底层。它把包内容放到全局 store，通过 hard link 复用真实文件，通过 symlink 组织项目中的依赖路径。这样相同版本的包不用在每个项目里重复复制，所以更快、更省磁盘。同时 pnpm 的依赖边界更严格，能减少幽灵依赖。比如项目没有声明 rc-util，只是因为 antd 间接依赖了它，在 npm 扁平结构下可能侥幸能 import 到，但 pnpm 下更容易暴露这个问题。
```

高频追问：

```txt
问：pnpm 快在哪里？
答：已经存在的包可以从全局 store 复用，项目里主要通过链接组织依赖，减少重复下载和复制。

问：pnpm 为什么省空间？
答：相同版本的包内容在 store 中存一份，项目通过 hard link 复用文件内容。

问：pnpm 为什么有兼容风险？
答：一些依赖声明不规范的老项目，可能依赖了幽灵依赖。pnpm 更严格后，这类问题会暴露出来。
```

掌握标准：

```txt
你不再背“pnpm 快”，而是能说出 store、hard link、symlink、strict dependency。
```

本阶段训练卡：

```txt
三句背诵版：
1. npm 的优势是官方默认和兼容性，yarn classic 的优势是早期更快更稳的安装体验。
2. pnpm 的核心是 global store、hard link 复用内容、symlink 组织路径。
3. pnpm 更严格，所以能暴露幽灵依赖，也可能让不规范老项目迁移时出问题。

一个真实案例：
同一个 monorepo 切到 pnpm 后安装更快、更省磁盘，但某些没声明的间接依赖突然找不到，这通常不是 pnpm 坏了，而是项目依赖声明不规范。

自测题：
能不能不用“pnpm 快”四个字，而用 store、hard link、symlink 解释 pnpm 为什么快？
```

#### 阶段 5｜monorepo 和 workspace

真实项目故事：

```txt
一个团队同时维护：

packages/app-web
packages/app-admin
packages/ui-components
packages/utils
packages/hooks
```

一开始这些项目分散在多个仓库里。

后来大家发现：

```txt
1. 组件库改了，业务应用联调很麻烦。
2. 多个项目依赖版本不一致。
3. utils 改动后，不知道影响哪些应用。
4. 每个仓库都有一套 lockfile 和构建配置，维护成本高。
```

于是团队把它们放进 monorepo。

引出的大问题：

```txt
1. monorepo 解决什么问题？
2. workspace 是什么？
3. 内部包之间怎么引用？
4. 为什么需要统一 lockfile？
5. 依赖版本不一致会有什么风险？
```

原理图和费曼解释：

```txt
monorepo：
  多个相关项目放在一个仓库里一起管理。

workspace：
  包管理器知道这个仓库里有哪些内部包，并把它们当成一个整体安装、链接和管理。
```

目录例子：

```txt
repo
  package.json
  pnpm-workspace.yaml
  packages
    app-web
    app-admin
    ui-components
    utils
```

内部包引用心智：

```txt
app-web 可以依赖 ui-components。
ui-components 可以依赖 utils。
workspace 会优先把这些内部包链接到一起，方便本地联调。
```

依赖治理问题：

```txt
如果 app-web 用 React 18，
app-admin 用 React 17，
ui-components 又 peer 了 React >=18，
那升级和发布时就会产生版本约束问题。
```

所以 monorepo 的重点不是目录放一起，而是：

```txt
统一依赖
统一 lockfile
统一构建
统一联调
统一影响面分析
```

真实模拟口述答案：

```txt
monorepo 主要解决多个相关项目协同开发的问题。比如一个团队同时维护后台应用、运营应用、组件库和 utils，如果拆在多个仓库里，组件库改动后业务应用联调很麻烦，依赖版本也容易不一致。

workspace 是包管理器对 monorepo 的支持。它会识别仓库里的多个 package，把它们当成一个整体安装和链接。这样 app-web 可以直接依赖本地的 ui-components，改组件库后能在业务应用里快速联调。

同时 monorepo 通常会有统一 lockfile，这样多个包共享一套依赖解析结果，避免每个项目各装各的。真正要治理的是依赖版本、内部包关系、构建顺序和变更影响面，而不只是把目录放到一起。
```

高频追问：

```txt
问：monorepo 和 multirepo 的区别？
答：monorepo 是多个相关项目放在一个仓库里统一管理，方便共享代码、统一依赖和联调；multirepo 是每个项目独立仓库，边界清晰但跨仓协作成本更高。

问：workspace 的作用是什么？
答：让包管理器知道哪些目录是内部包，并在安装时进行统一依赖解析和本地链接。

问：统一 lockfile 的好处是什么？
答：保证整个仓库依赖解析一致，减少不同 package 各自安装导致的版本漂移。
```

掌握标准：

```txt
你能从“多项目协作”角度讲 workspace，而不是只说目录放一起。
```

本阶段训练卡：

```txt
三句背诵版：
1. monorepo 解决的是多项目协同，不只是把目录放一起。
2. workspace 让包管理器识别内部包，并统一安装、链接和管理。
3. 统一 lockfile 能减少多项目各自安装造成的版本漂移。

一个真实案例：
app-web、app-admin、ui-components、utils 放在一个仓库里，ui-components 改动后可以直接在 app-web 本地联调，这就是 workspace 的价值。

自测题：
如果面试官说 monorepo 就是多个项目放一起，你怎么补充“依赖治理、内部包联调、统一 lockfile”？
```

#### 阶段 6｜构建、发布和包入口

真实项目故事：

```txt
你写了一个组件库。

业务方 A 用 Vite，希望消费 ESM。
业务方 B 用老 Webpack，希望消费 CJS。
业务方 C 需要 TypeScript 类型。
还有人反馈 tree-shaking 不生效。
线上包体里甚至重复打进了一份 React。
```

这时依赖工程化已经从“我怎么装包”升级成：

```txt
我发布的包，别人怎么正确消费？
```

引出的大问题：

```txt
1. main / module / exports / types 分别干什么？
2. CJS 和 ESM 对包发布有什么影响？
3. sideEffects 和 tree-shaking 有什么关系？
4. 组件库为什么要关心 peerDependencies？
5. 为什么 React 通常不应该被组件库打进产物？
```

原理图和费曼解释：

```txt
发布一个包，就像开一家店。

main：
  老顾客从这个门进来，通常指向 CJS 入口。

module：
  给支持 ESM 的打包工具看的入口。

exports：
  更现代、更明确的入口地图，告诉别人哪些路径能访问。

types：
  TypeScript 类型入口。
```

示意：

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "sideEffects": false,
  "peerDependencies": {
    "react": ">=18"
  }
}
```

tree-shaking 心智：

```txt
tree-shaking 依赖静态模块结构。
ESM 的 import/export 更容易被静态分析。
sideEffects 用来告诉打包器：这个包的模块是否有不能随便删除的副作用。
```

React 为什么通常放 `peerDependencies`：

```txt
组件库不是 React 宿主。
业务应用才是 React 宿主。

组件库应该声明：
  我需要宿主提供 React。

而不是：
  我自己再带一份 React。
```

否则可能出现：

```txt
1. React 被重复打包，包体变大。
2. 应用和组件库使用不同 React 实例。
3. Hooks、Context、状态共享出现奇怪问题。
```

真实模拟口述答案：

```txt
依赖工程化还会延伸到包发布。比如我写一个组件库，不只是把代码打出来，还要考虑业务方怎么消费。

package.json 里的 main 通常给 CJS 消费方，module 给支持 ESM 的打包工具，types 提供 TypeScript 类型，exports 则是更现代的入口声明方式，可以明确控制哪些路径能被外部访问。

如果希望业务方 tree-shaking 生效，组件库最好提供 ESM 产物，并正确声明 sideEffects。比如纯组件导出通常可以标记 sideEffects false，但如果某些文件会全局注入样式或修改运行时，就不能随便标。

另外组件库通常应该把 React 放到 peerDependencies，而不是打进自己的产物。因为 React 应该由宿主应用提供，避免重复打包和多 React 实例带来的 Hooks 或 Context 问题。
```

高频追问：

```txt
问：exports 比 main 强在哪里？
答：exports 可以精确声明包的可访问入口，并支持 import/require 条件分发，避免用户随便深度引用内部文件。

问：sideEffects false 一定安全吗？
答：不一定。如果模块有全局副作用，比如自动引入全局 CSS、注册 polyfill、修改全局对象，就不能随便标 false。

问：为什么 ESM 更利于 tree-shaking？
答：因为 ESM 的 import/export 是静态结构，打包器更容易在构建阶段分析哪些导出没有被使用。
```

掌握标准：

```txt
你能把“包管理”延伸到“我发布的包别人怎么消费”。
```

本阶段训练卡：

```txt
三句背诵版：
1. 包发布不是自己能跑就行，还要让不同工具正确消费。
2. main、module、exports、types 分别服务不同消费入口和类型系统。
3. 组件库通常把 React 放 peerDependencies，避免重复打包和多 React 实例。

一个真实案例：
组件库被 Vite、老 Webpack、TypeScript 项目同时消费时，入口字段、ESM/CJS 产物、types、sideEffects 和 peerDependencies 都会影响使用体验。

自测题：
为什么 sideEffects false 不能随便写？
```

#### 阶段 7｜微前端里的运行时依赖共享

真实项目故事：

```txt
一个主应用加载多个子应用：

host
  |
  +-- app-a：React 18
  +-- app-b：React 18
  +-- app-c：React 17
```

如果每个子应用都自己打包一份 React：

```txt
包体会变大。
加载会重复。
公共依赖没法复用。
```

但如果强行共享 React：

```txt
版本不一致怎么办？
某个子应用升级 React，会不会影响其他子应用？
共享后是不是增加了应用耦合？
```

这时依赖治理从安装时、构建时，进入了浏览器运行时。

引出的大问题：

```txt
1. 微前端为什么还会有依赖治理问题？
2. 构建时依赖和运行时依赖有什么区别？
3. Module Federation 的 shared 是什么？
4. singleton / requiredVersion 是什么？
5. 共享依赖和应用隔离怎么取舍？
```

原理图和费曼解释：

```txt
普通项目：
  构建前决定依赖怎么安装。

微前端：
  多个独立构建的应用，要在浏览器里同时运行。
  所以有些依赖要不要共享，是运行时也要协调的问题。
```

Module Federation 心智：

```txt
shared：
  这个依赖可以在多个应用之间共享。

singleton：
  这个依赖尽量只保留一个实例。

requiredVersion：
  我需要的兼容版本范围。
```

示意：

```js
shared: {
  react: {
    singleton: true,
    requiredVersion: "^18.0.0"
  },
  "react-dom": {
    singleton: true,
    requiredVersion: "^18.0.0"
  }
}
```

共享与隔离的取舍：

```txt
共享：
  优点：减少重复加载，降低包体。
  风险：版本耦合，升级影响面变大。

隔离：
  优点：子应用独立性强。
  风险：重复依赖多，包体和运行时成本更高。
```

真实模拟口述答案：

```txt
微前端里的依赖治理和普通项目不一样。普通项目主要在安装时和构建时决定依赖，而微前端是多个独立构建的子应用在浏览器里一起运行，所以依赖问题会延伸到运行时。

比如多个子应用都使用 React，如果每个子应用都打包一份 React，包体会变大，也会重复加载。但如果共享 React，又要考虑版本是否兼容，以及是否会增加应用之间的耦合。

Webpack Module Federation 里的 shared 就是为了解决这类运行时依赖共享问题。shared 表示某个依赖可以共享，singleton 表示尽量只保留一个实例，requiredVersion 用来声明需要的版本范围。

所以微前端依赖治理不是简单地全部共享或者全部隔离，而是在包体积、版本一致性、应用独立性和升级风险之间做权衡。React、react-dom 这种运行时单例特征强的依赖，通常更适合谨慎共享；而业务强相关或者版本差异大的依赖，可能更适合隔离。
```

高频追问：

```txt
问：为什么 React 适合 singleton？
答：因为多个 React 实例可能导致 Hooks、Context、状态共享等行为异常，也会增加包体。通常希望一个页面运行环境里 React 实例保持一致。

问：共享依赖一定更好吗？
答：不一定。共享可以减少重复加载，但会带来版本耦合和升级风险。微前端强调独立性，不能为了省包体把所有应用绑死。

问：构建时共享和运行时共享有什么区别？
答：构建时共享是在打包前决定依赖如何进入产物；运行时共享是多个独立构建产物在浏览器加载时协商依赖实例。
```

掌握标准：

```txt
你能讲出“依赖问题从安装时延伸到了浏览器运行时”。
```

本阶段训练卡：

```txt
三句背诵版：
1. 微前端让多个独立构建的应用在浏览器里一起运行，依赖治理进入运行时。
2. shared 解决公共依赖共享，singleton 控制单例，requiredVersion 表达版本约束。
3. 共享能减少重复加载，但会带来版本耦合；隔离能保持独立，但会增加包体。

一个真实案例：
host 同时加载 app-a、app-b、app-c，如果每个子应用都带一份 React，包体和运行时成本会变大；如果共享 React，就要处理版本兼容和单例约束。

自测题：
为什么微前端不是所有依赖都应该 shared？
```

### 4. 怎么把这 7 个阶段串起来

这 7 个阶段不是 7 个孤立知识点，而是一条连续演进：

```txt
先有 package.json：
  解决依赖声明。

再有 lockfile：
  解决安装结果可复现。

再看 node_modules：
  解决依赖到底怎么摆放。

再比较 npm/yarn/pnpm：
  解决安装体验、复用效率、依赖严格性。

再到 monorepo：
  解决多个项目和内部包协作。

再到包发布：
  解决我产出的包如何被别人正确消费。

最后到微前端：
  解决多个独立应用如何在运行时共享依赖。
```

总图：

```txt
单项目
  |
  +-- package.json：声明我要什么
  +-- lockfile：锁定实际装了什么
  +-- node_modules：决定依赖怎么摆
  |
  v
大型项目
  |
  +-- npm/yarn/pnpm：安装体验与依赖边界
  +-- pnpm store：复用真实文件
  |
  v
多包仓库
  |
  +-- workspace：内部包联调
  +-- 统一 lockfile：依赖治理
  |
  v
对外发布
  |
  +-- exports / types：别人怎么消费
  +-- peerDependencies：宿主提供什么
  |
  v
微前端
  |
  +-- shared：运行时共享
  +-- singleton：单例约束
  +-- requiredVersion：版本协商
```

面试里最容易答浅的地方：

```txt
1. 只说 npm/yarn/pnpm 区别，不讲 package.json 和 lockfile。
2. 只说 pnpm 快，不讲 store、hard link、symlink。
3. 只说 monorepo 是“多个项目放一起”，不讲 workspace 和依赖治理。
4. 只说组件库用 peerDependencies，不讲为什么 React 不该重复打包。
5. 只说微前端能共享依赖，不讲运行时版本冲突和隔离取舍。
```

工程/业务例子：

```txt
如果你做的是一个中后台平台，一开始只是一个 React 应用，npm/yarn 足够。

等平台变成多个业务应用加一个组件库，就会自然进入 monorepo 和 workspace。

等组件库对外发布，就要关心 exports、types、sideEffects、peerDependencies。

等平台继续拆成微前端，依赖治理就从安装时和构建时进入运行时，需要考虑 React 这类公共依赖是否通过 Module Federation shared 共享。
```

## Part 2｜面试作答

### 1. 思维导图关键点

```txt
前端依赖工程化
  |
  +-- package.json
  |     +-- dependencies
  |     +-- devDependencies
  |     +-- peerDependencies
  |     +-- semver
  |
  +-- lockfile
  |     +-- package-lock
  |     +-- npm install
  |     +-- npm ci
  |     +-- 可复现安装
  |
  +-- node_modules
  |     +-- npm v2 nested
  |     +-- npm v3 hoist
  |     +-- dedupe
  |     +-- phantom dependency
  |
  +-- package manager
  |     +-- npm：兼容
  |     +-- yarn：稳定安装体验
  |     +-- pnpm：store + hard link + symlink
  |
  +-- monorepo
  |     +-- workspace
  |     +-- 内部包引用
  |     +-- 统一 lockfile
  |
  +-- package publish
  |     +-- main / module / exports / types
  |     +-- CJS / ESM
  |     +-- sideEffects / tree-shaking
  |     +-- peerDependencies
  |
  +-- micro frontend
        +-- shared
        +-- singleton
        +-- requiredVersion
        +-- runtime dependency
```

### 2. 60-90 秒口语稿

```txt
前端依赖工程化不是只比较 npm、yarn、pnpm，而是一条从单项目装包到多应用依赖治理的演进链路。

最开始，package.json 负责声明依赖范围，比如 dependencies、devDependencies、peerDependencies 和 semver 版本范围。但 package.json 只能说明我要什么范围的包，不能保证每个人实际安装出来完全一致，所以需要 lockfile 锁定真实依赖树，让本地和 CI 安装结果可复现。

接着是 node_modules 结构的演进。npm v2 更接近嵌套依赖树，结构清晰但重复多、路径深。npm v3 之后通过 hoist 和扁平化减少重复，但也带来了幽灵依赖，也就是项目没声明某个包，却因为它被提升到了顶层而能被 import。

pnpm 是另一种思路。它把真实包内容放到全局 store，通过硬链接复用文件，通过软链接组织 node_modules 结构，所以更快、更省空间，也能让依赖边界更严格，减少幽灵依赖。

再往后到 monorepo，问题升级为多个包、多个应用之间如何共享依赖、统一 lockfile、本地联调和版本治理。到包发布阶段，还要考虑 main、module、exports、types、sideEffects、peerDependencies，保证组件库能被不同构建工具正确消费。

最后到微前端，依赖问题甚至延伸到运行时。多个子应用是否共享 React、共享哪个版本、是否 singleton，都需要在包体积、版本一致性和应用隔离之间权衡。

所以我会把前端依赖工程化总结为：从声明依赖，到锁定依赖，再到安装和摆放 node_modules，再到 monorepo 治理、包发布设计，最后到微前端运行时共享。真实业务里，比如一个后台平台从单应用演进到组件库、monorepo 和微前端，基本就会完整经历这条链路。
```

### 3. 高频追问

#### 追问 1｜为什么 package.json 不够，还需要 lockfile？

```txt
package.json 描述的是依赖范围，比如 ^4.17.0，而不是唯一版本。
不同时间安装可能解析出不同的小版本。
lockfile 会记录真实安装出来的完整依赖树，包括精确版本、下载地址、integrity 和子依赖。
所以 lockfile 的核心价值是可复现安装。
```

#### 追问 2｜npm install 和 npm ci 有什么区别？

```txt
npm install 更适合开发环境，会根据 package.json 和 lockfile 安装，必要时可能更新 lockfile。
npm ci 更适合 CI 环境，会严格按照 package-lock 安装，要求 package.json 和 lockfile 一致，并且不会修改 lockfile。
```

#### 追问 3｜什么是幽灵依赖？

```txt
幽灵依赖就是项目代码使用了某个包，但 package.json 没有显式声明。
它可能因为 npm/yarn 的 hoist 被提升到了顶层 node_modules，所以本地能 import。
但一旦间接依赖变化，或者换成 pnpm 这种更严格的结构，就可能找不到。
```

#### 追问 4｜pnpm 为什么更快、更省空间？

```txt
pnpm 把真实包内容存到全局 store。
相同版本的包不会在每个项目重复复制，而是通过 hard link 复用真实文件。
项目中的 node_modules 再通过 symlink 组织依赖路径。
所以它减少重复下载和复制，也让依赖边界更严格。
```

#### 追问 5｜组件库为什么要把 React 放 peerDependencies？

```txt
因为 React 应该由宿主应用提供。
如果组件库自己打包一份 React，业务应用也有一份 React，就可能出现包体变大、多 React 实例、Hooks 或 Context 行为异常。
所以组件库用 peerDependencies 表达“我需要宿主提供兼容版本的 React”。
```

#### 追问 6｜微前端里的 shared dependency 在解决什么？

```txt
它解决的是运行时依赖共享问题。
多个子应用独立构建，但在浏览器里一起运行。
如果每个应用都带一份 React，会重复加载。
Module Federation 的 shared 可以让公共依赖在运行时共享，singleton 表示尽量只保留一个实例，requiredVersion 表示版本约束。
```

### 4. 复述任务

第一轮只复述主线：

```txt
package.json 声明依赖范围。
lockfile 锁定真实依赖树。
node_modules 结构决定依赖怎么摆。
npm v2 嵌套清晰但重复多。
npm v3 hoist 减少重复但带来幽灵依赖。
pnpm 用 store、hard link、symlink 提高复用并保持严格性。
monorepo 用 workspace 治理多个内部包。
包发布要关注 exports、types、sideEffects、peerDependencies。
微前端把依赖治理延伸到运行时 shared dependency。
```

第二轮用 2 分钟讲完整链路。

第三轮准备接这 5 个追问：

```txt
1. 为什么 package.json 不够？
2. lockfile 锁的是什么？
3. 幽灵依赖怎么产生？
4. pnpm 为什么快？
5. 微前端为什么还要共享依赖？
```

### 5. 7 天训练路线

```txt
Day 1：依赖声明
目标：讲清 package.json、dependencies、devDependencies、peerDependencies、semver。
输出：用 60 秒解释“package.json 为什么不等于安装结果”。

Day 2：依赖锁定
目标：讲清 lockfile、npm install、npm ci。
输出：用 60 秒解释“本地没改代码但 CI 挂了，为什么可能是依赖问题”。

Day 3：node_modules 演进
目标：画出 npm v2 nested、npm v3 hoist，并解释幽灵依赖。
输出：用 antd / rc-util 例子讲幽灵依赖。

Day 4：npm / yarn / pnpm
目标：讲清兼容性、安装体验、store、hard link、symlink、strict dependency。
输出：不用“pnpm 快”四个字解释 pnpm 的快。

Day 5：monorepo / workspace
目标：讲清多包协作、内部包链接、统一 lockfile。
输出：用 app-web / ui-components / utils 例子讲 workspace。

Day 6：包发布
目标：讲清 main、module、exports、types、sideEffects、peerDependencies。
输出：用组件库重复打包 React 的例子讲 peerDependencies。

Day 7：微前端运行时共享
目标：讲清 shared、singleton、requiredVersion 和共享隔离取舍。
输出：用 host 加载多个 React 子应用的例子讲运行时依赖共享。
```

### 6. 面试官追问脚本

训练时按这个顺序来，不要跳：

```txt
第一轮：主线追问
Q1：你别直接比较 npm/yarn/pnpm，先说前端依赖工程化到底在解决什么。
Q2：为什么 package.json 不够？
Q3：lockfile 解决的是直接依赖还是整棵依赖树？

第二轮：结构追问
Q4：npm v2 和 npm v3 的 node_modules 结构有什么变化？
Q5：hoist 为什么会带来幽灵依赖？
Q6：pnpm 为什么能减少幽灵依赖？

第三轮：工程追问
Q7：monorepo 里的 workspace 解决什么问题？
Q8：组件库为什么要把 React 放 peerDependencies？
Q9：exports 比 main 更强在哪里？

第四轮：拔高追问
Q10：微前端里的 shared dependency 和普通构建时依赖有什么区别？
Q11：React 为什么常常需要 singleton？
Q12：如果共享依赖会带来版本耦合，你怎么取舍？
```

通过标准：

```txt
你能连续回答 12 个追问，中途不需要回看正文。
回答时每题都有：一句结论 + 一个例子 + 一个风险或取舍。
```

## Part 3｜资料

主要校准资料：

- npm package.json docs: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
- npm package-lock docs: https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json
- npm ci docs: https://docs.npmjs.com/cli/v11/commands/npm-ci
- npm workspaces docs: https://docs.npmjs.com/cli/v11/using-npm/workspaces
- pnpm motivation: https://pnpm.io/motivation
- pnpm symlinked node_modules structure: https://pnpm.io/symlinked-node-modules-structure
- pnpm workspaces: https://pnpm.io/workspaces
- Yarn workspaces: https://yarnpkg.com/features/workspaces
- Node.js packages and exports: https://nodejs.org/api/packages.html
- webpack tree shaking: https://webpack.js.org/guides/tree-shaking
- webpack Module Federation: https://webpack.js.org/concepts/module-federation
