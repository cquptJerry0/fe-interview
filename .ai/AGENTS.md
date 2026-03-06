# Runtime Playbooks

这个文件是 `.ai` 的“总入口”。  
如果你只想知道“应该用哪个流程、每个 skill 是干嘛的”，看这一页就够了。

## 1) interview-training（训练主流程）

定位：前端面试训练主编排，覆盖拆题、路由、评分改写、追问、编程题与模块归档。

适用输入：
- 一整套题单（可混合八股/场景/开放/手写/编程）
- 可选画像片段（tag -> level/confidence）

输出保证：
- 结构化题目清单（类型/难度/tags）
- 每题双评分 + 改写回答 + 追问脚本
- 编程题 MVP + 加分点
- 模块归档与画像更新建议

内部调用顺序：
1. `intake-routing`
2. `answer-coaching`
3. `coding-exercise`（有编程题时）
4. `archive-sync`

## 2) interview-archive-retro（归档复盘流程）

定位：一轮面试训练结束后的资产沉淀编排（内容库 + 导航 + 训练记录）。

适用输入：
- 公司/岗位/轮次/日期
- 原始面经文本 + 本轮高质量回答

输出保证：
- 原始面经入口 + 满分回答条目
- 导航索引更新
- 画像与 jsonl 日志更新

内部调用顺序：
1. `archive-sync`

---

# Skills / Capabilities 详解

下面这 4 个 capability 就是你现在最需要理解的“skills”。

## A) intake-routing（拆题 + 路由）

一句话：把一坨题目先整理成结构化清单，再决定每题讲解强度。

主要作用：
- 拆题、去重、分类（八股/场景/开放/手写/编程）
- 生成稳定 tags
- 根据画像给每题策略（快答/深讲/教到会）

输入：
- 原始题目文本
- 可选画像（level/confidence）

输出：
- `questions[]`：`id/title/type/difficulty/tags`
- `strategy[]`：每题训练策略

何时用：
- 你给了一整套题单，准备开始训练前

对应文件：
- `.ai/capabilities/intake-routing.capability.md`

## B) answer-coaching（评分 + 改写 + 追问）

一句话：这是“满分答案生成 skill”，会按题型自动切不同攻略，再输出可口述、可追问版本。

主要作用：
- 给双评分（逻辑性 + 面试满分度）
- 指出具体扣分点
- 生成改写版满分回答
- 生成 4 轮追问脚本（理解/边界/取舍/排障）
- 教到会场景下给费曼复述检查清单
- 按题型路由攻略：八股/场景/开放/手写/项目复盘

回答结构硬约束（必须）：
- 技术解释
- 业务举例
- 面试口述版（60-90秒）
- 追问

输入：
- 单题（title/type/tags）
- 用户原回答（可选）
- 路由策略（快答/深讲/教到会）

输出：
- 分数与扣分点
- 改写回答
- 追问脚本

何时用：
- 每道非编程题训练的核心阶段

对应文件：
- `.ai/capabilities/answer-coaching.capability.md`
- `.ai/references/answer-strategies/01-八股题攻略.md`
- `.ai/references/answer-strategies/02-场景题攻略.md`
- `.ai/references/answer-strategies/03-开放题攻略.md`
- `.ai/references/answer-strategies/04-手写题攻略.md`
- `.ai/references/answer-strategies/05-项目复盘攻略.md`

## C) coding-exercise（编程题训练）

一句话：先做可跑 MVP，再给可落地加分项。

主要作用：
- 题意复述（输入输出边界）
- 给 MVP 思路 + 代码 + 复杂度 + 边界用例
- 给 3-6 个“收益排序”的工程化加分点

输入：
- 编程题题面
- 时间/空间/边界约束

输出：
- MVP 方案
- 加分项清单（带最小改动方案）

何时用：
- 题单里有 LeetCode/组件题/系统小设计题时

对应文件：
- `.ai/capabilities/coding-exercise.capability.md`

## D) archive-sync（沉淀与同步）

一句话：把训练产物写回仓库，让内容可复用、可检索、可统计。

主要作用：
- 写入内容库（原始题单 + 知识条目）
- 更新导航（按公司/按模块/按Tag/本周复习）
- 更新训练记录（会话/画像/jsonl）

输入：
- 最终答案与掌握度分类
- tags
- 会话元信息（日期、公司、轮次、来源）

输出：
- 内容库更新
- 导航更新
- 训练记录更新

何时用：
- `interview-training` 收尾阶段
- 或单独执行 `interview-archive-retro`

对应文件：
- `.ai/capabilities/archive-sync.capability.md`
- `.ai/references/interview-archive-retro.md`

---

# 快速使用建议

- 想“做一轮训练”：用 `interview-training`
- 想“只做沉淀归档”：用 `interview-archive-retro`
- 想“只改某个环节”：直接看并调用对应 capability 文件
