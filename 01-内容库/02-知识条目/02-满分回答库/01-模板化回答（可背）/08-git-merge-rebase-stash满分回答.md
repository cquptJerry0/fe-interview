---
title: "git merge 和 rebase 区别？从对象模型讲清 commit/tree/blob、HEAD/branch、stash"
tags: ["git.model.objects", "git.branch.head", "git.merge.rebase", "git.stash"]
type: "八股"
difficulty: 5
---

## 一句话结论

Git 的本质是对象数据库加引用系统：`commit -> tree -> blob`，分支只是指向 commit 的 ref，HEAD 表示当前检出位置。`merge` 保留分叉历史并生成合并提交，`rebase` 在新基底重放提交（产生新 commit）；`stash` 是挂在 `refs/stash` 的临时保存栈。高分点是能把“指针如何移动”讲清。

## 技术解释

### 1) 对象模型

- blob：文件内容快照。
- tree：目录快照，记录文件名到 blob/tree 的映射。
- commit：提交对象，指向一个 tree 和父 commit，并附带作者、时间、消息。

```text
commit
  ├─ parent: <commit>
  ├─ tree: <tree>
  └─ meta: author/message/time
```

### 2) HEAD 与 branch 的关系

- 分支是 ref（如 `refs/heads/main`），值是 commit hash。
- HEAD 通常指向当前分支 ref，不直接指向 commit。
- detached HEAD 时，HEAD 直接指向某个 commit，后续提交容易“游离”。

### 3) merge 做了什么

- 找最近共同祖先。
- 以三方合并生成结果树。
- 产生一个双父（或多父）merge commit，保留分叉历史。

### 4) rebase 做了什么

- 选择一组提交作为“待重放序列”。
- 按顺序在新基底上重放，每个提交都会生成新 hash。
- 结果是历史更线性，但原提交身份改变。

### 5) stash 是什么

- `git stash` 会把当前工作区和暂存区状态保存为对象，并更新 `refs/stash`。
- 可以理解为一个临时栈：`stash@{0}` 最新。
- 常见操作：`stash list/apply/pop/drop`。

## 对比与取舍

- `merge`：保留真实分叉历史，适合公共分支协作。
- `rebase`：历史干净，便于阅读，但改写历史需谨慎。
- 团队实践：私有分支可 rebase 整理，公共分支优先 merge。

## 实践与验证

- 用 `git log --graph --oneline --decorate` 观察指针变化。
- 合并前先跑测试，冲突解决后再次全量验证。
- 对 rebase 后分支避免强推到多人共用分支。

## 业务举例

### 背景与约束

- 多人并行开发，主干要求可随时发布。
- 需求分支较多，历史很容易变成“意大利面”图。
- 团队希望兼顾历史可读性与协作安全。

### 方案与取舍

- 主干和发布分支只允许 merge，不允许 rebase 改写。
- 个人功能分支提交前允许 rebase/squash 整理历史。
- 临时切任务统一用 stash，禁止“半成品直接 commit 到主分支”。

### 实施与验证

- 在 CI 加规则：主分支保护 + 必须通过测试才能合并。
- 代码评审中检查提交历史可读性与冲突处理说明。
- 定期抽查 `stash list`，避免长期遗留临时改动。

### 结果与复盘

- 主干稳定性提升，回溯问题更快。
- 分支历史更可读，评审成本下降。
- 复盘发现部分同学滥用 stash，后续补“stash 生命周期规范”。

## 面试口述版（60-90秒）

我会先讲 Git 底层：文件内容是 blob，目录是 tree，提交是 commit，分支只是指向 commit 的 ref，HEAD 表示当前检出位置。然后解释 merge 和 rebase 的本质区别：merge 是保留分叉历史并生成 merge commit，rebase 是在新基底重放提交，历史更线性但 hash 会变。团队协作上我一般建议公共分支用 merge，个人分支可以 rebase 整理。stash 我会当成短期临时栈，不会长期堆积。

## 追问

- 为什么 rebase 后 commit hash 一定变化？
- 什么场景下绝对不该在远端分支 rebase？
- merge 冲突和 rebase 冲突处理思路有什么不同？
- stash 和临时 commit 各自适用什么场景？

## 易错点

- 把分支当成“提交副本”，而不是“指针”。
- 在多人共用分支随意 rebase 并强推。
- stash 后长期不清理，后续来源不可追踪。
