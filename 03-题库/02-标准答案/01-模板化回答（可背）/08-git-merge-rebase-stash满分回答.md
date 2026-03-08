---
title: "Git 里的 merge、rebase、stash 怎么讲才不乱？"
tags: ["git.merge.rebase", "git.stash", "git.model.objects", "git.branch.head"]
type: "对比题"
difficulty: 4
---

## 这题在问什么

面试官通常不是想听你背命令，而是想确认你是否理解：
- 分支和 HEAD 本质是什么
- merge 和 rebase 为什么结果不同
- stash 什么时候该用，什么时候会埋坑

## 60 秒直答

我一般先讲分支本质：分支只是指向某个 commit 的引用，HEAD 表示当前检出位置。`merge` 是把两条历史合并，通常会生成一个新的 merge commit，优点是历史完整；`rebase` 是把当前分支提交搬到新的基底上重放，历史更线性，但 commit hash 会变，所以更适合个人分支整理历史，不适合在多人共用远端分支上乱用。`stash` 我把它当短期临时工作栈，适合切任务前先把未完成改动收起来，但不适合长期堆积。

## 核心机制

- `merge`：保留分叉历史，合并结果更完整
- `rebase`：改写提交历史，让分支看起来像从最新基底直接长出来
- `stash`：把当前工作区和暂存区状态临时压栈保存

## 最小例子

```bash
git checkout feature
git fetch origin

git rebase origin/main   # 个人分支整理历史
# 或

git merge origin/main    # 保留真实分叉关系

git stash push -m "half-done search panel"
git stash pop
```

## 业务 / 验证

团队协作里我会主动给规则：
- 公共分支优先 `merge`
- 个人功能分支允许 `rebase`
- `stash` 只做短期临时切换，不长期积压

这样说出来就像你真在团队里用过，而不是只会背命令。

## 常见追问

- 为什么 rebase 之后 commit hash 会变？
- 为什么共用远端分支不要随意 rebase？
- merge 冲突和 rebase 冲突处理思路有什么差别？
- stash 和临时 commit 该怎么选？

## 易错点

- 把分支当“提交副本”而不是“指针”
- 只会背 `merge` / `rebase` 好处，不讲适用边界
- stash 用完不清，最后不知道内容从哪来的

## 关联深挖

- [Git merge vs rebase 协作策略](../02-专题深挖/03-Git-merge-vs-rebase-协作策略.md)
- [Git stash 使用边界与风险](../02-专题深挖/04-Git-stash-使用边界与风险.md)
