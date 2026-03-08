---
title: "Git merge vs rebase 协作策略"
tags: ["git.merge.rebase", "git.branch.head"]
type: "专题深挖"
difficulty: 4
---

## 为什么要深挖这题

因为大部分人只会背“merge 保留历史，rebase 更线性”，但讲不出团队里到底怎么定规则。

## 上游原理

- 分支本质是 ref
- rebase 会重放提交，因此 hash 变化
- merge 保留原分叉关系

## 核心机制拆解

- 公共分支：优先 `merge`
- 个人功能分支：允许 `rebase` 整理历史
- 共享远端分支：谨慎改写历史，避免影响别人协作

## Demo / 最小复现

```bash
git checkout feature
git fetch origin
git rebase origin/main
```

## 排障脚本

- rebase 后发现远端冲突：先确认是否有人基于旧历史继续开发
- 强推前确认是不是个人分支
- 冲突解决后用 `git log --graph` 检查结果是否符合预期

## 什么时候该用 / 不该用

- 追求主干历史线性，可在个人分支 rebase
- 多人共用分支，优先 merge，少做历史改写

## 面试追问链

- 为什么 rebase hash 会变？
- 为什么公共分支不要乱 rebase？
- squash merge 和 rebase 有什么关系？
