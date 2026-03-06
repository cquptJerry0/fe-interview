---
title: "git merge 和 rebase 区别？从对象模型讲清 commit/tree/blob、HEAD/branch、stash"
tags: ["git.model.objects", "git.branch.head", "git.merge.rebase", "git.stash"]
type: "八股"
difficulty: 5
---

## 一句话结论

Git 的底层是“对象数据库 + 指针系统”：commit 指向 tree（目录快照）与 parent，branch 是指向 commit 的 ref，HEAD 表示当前检出位置；merge 生成一个有两个 parent 的合并提交并移动分支指针，rebase 在新基底上重放提交生成新 commit（hash 变化）；stash 不是新区，是 `refs/stash` 指向的一组保存对象。

## 解释（从零到一）

先从“人类只看得到文件/目录”映射到 Git：

```text
Working Tree（你看到的目录与文件）
   │ git add
   ▼
Index/Stage（下一次 commit 的候选目录快照表：path -> blob）
   │ git commit
   ▼
commit -> tree -> blob（写入 .git/objects 对象库）
```

对象模型（最底层）：
- blob：文件内容快照
- tree：目录结构快照（指向 blob/tree）
- commit：一次版本（指向 tree + parent + meta）
- ref：指向某个 commit 的指针（分支/标签/refs/stash）

HEAD vs branch：
- `.git/HEAD` 通常是 `ref: refs/heads/main`，表示 HEAD 指向当前分支引用
- branch（如 main）是一个 ref，内容是某个 commit hash
- detached HEAD 时，HEAD 直接指向 commit（不通过分支名）

merge 做了什么（指针层）：
- 新建一个 merge commit（2 个 parent）
- 把当前分支 ref 移到这个 merge commit

```text
main:   C1---C2---C3-----M
               \       /
feature:        D1---D2
M.parent = (C3, D2)
```

rebase 做了什么：
- 把 feature 上的提交“改动”依次重放到新基底上（类似连续 cherry-pick）
- 生成新的提交 D1'/D2'（parent 变了，所以 hash 必变）

```text
rebase 前：
main:    C1---C2---C3
feature:       \---D1---D2

rebase 后：
main:    C1---C2---C3
feature:             D1'---D2'
```

stash 是什么（不是第四个区）：
- stash 是一个 ref：`refs/stash`
- `stash@{n}` 来自 `refs/stash` 的 reflog
- `stash apply/pop` 是把这份保存的改动应用到当前工作区（可能冲突）

## 图解

```text
refs/heads/main  -> commit(C3)
HEAD             -> refs/heads/main

refs/stash       -> stashCommit(S0) -> S1 -> ...
```

## 对比与取舍

- merge vs rebase（协作维度）
  - merge：不重写历史，公共分支安全；缺点是历史可能有分叉
  - rebase：历史线性、MR 更干净；缺点是重写历史，公共分支上会坑协作者

- stash vs WIP commit
  - stash：适合本地临时切换上下文；缺点是不易协作追踪、容易忘
  - WIP commit：可追踪可协作；缺点是可能污染历史（可在合并时 squash）

## 实践与验证

- 验证对象与指针：
  - `cat .git/HEAD` 看 HEAD 指向
  - `cat .git/refs/heads/main` 看分支指针指到哪个 commit
  - `git cat-file -p HEAD` 看 commit 的 tree/parent
  - `git cat-file -p <tree>` 看目录快照条目
- 排障：
  - rebase 后推送用 `--force-with-lease`，避免误覆盖别人提交
  - stash 跨分支 apply 可能冲突，优先 `apply` 确认再 `drop`

## 常见追问

- 为什么 rebase 会改 hash？hash 里包含了什么？
- merge 冲突和 rebase 冲突处理体验差异？
- stash 能不能恢复到别的分支？有哪些风险？

## 易错点

- 对公共分支 rebase 并 force push，导致团队历史错乱
- 把 stash 当成“安全长期存储”，最后忘记清理或难以追踪来源
