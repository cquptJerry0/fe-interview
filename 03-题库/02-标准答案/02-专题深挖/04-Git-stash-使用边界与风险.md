---
title: "Git stash 使用边界与风险"
tags: ["git.stash"]
type: "专题深挖"
difficulty: 3
---

## 为什么要深挖这题

因为 stash 很好用，但也最容易变成“临时内容黑洞”。

## 上游原理

- stash 是一组临时快照
- 适合短期切任务，不适合长期积压

## 核心机制拆解

- `stash push`：把当前工作区和暂存区压栈
- `stash pop`：恢复并删除
- `stash apply`：恢复但保留
- 可以带 message 方便追踪

## Demo / 最小复现

```bash
git stash push -m "wip: search panel"
git stash list
git stash apply stash@{0}
```

## 排障脚本

- stash 恢复冲突时，按普通冲突处理
- stash 太多时，先 `stash list` 看 message 再清理
- 长期没用的 stash 要及时 drop

## 什么时候该用 / 不该用

- 临时切任务、半成品不适合 commit 时可以用
- 需要长期保留或协作共享时，不要滥用 stash

## 面试追问链

- stash 和临时 commit 怎么选？
- 为什么有时 apply 比 pop 更稳？
- stash 会不会丢文件？
