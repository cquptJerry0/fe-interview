---
name: intake-interview
description: 读取一篇面经，抽取题目清单，判断哪些题直接写在面经正文里，哪些题需要抽成专题文章，并按仓库新结构完成归档。
---

# Intake Interview

在用户给出一篇面经，并希望整理、归档、重构、拆题或专题化时使用这个 skill。

## 目标

把一篇面经整理成两层内容：

1. 面经正文
2. 专题文章

## 执行顺序

1. 先读取面经全文，保留原始题目顺序。
2. 抽取题目清单，不改写题意。
3. 按题型分类：
   - 代码输出题
   - 简单八股题
   - 开放题
   - 项目题
   - 编程题
   - 专题题
4. 判断归档去向：
   - 直接写进面经正文：简单题、代码输出题、轻量开放题、轻量编程题
   - 单独抽专题：系统链路长、明显值得反复复用、能承接多篇面经的问题
5. 按固定格式重写面经正文。
6. 如果生成了专题文章，在正文对应题目下放专题链接。

## 路由规则

只在需要判断题目归档位置时，读取：

- `[routing-rules.md](/Users/bytedance/Projects/personal/面试/.ai/skills/01-intake-interview/references/routing-rules.md)`

只在需要落盘或重写面经正文时，读取：

- `[archive-format.md](/Users/bytedance/Projects/personal/面试/.ai/skills/01-intake-interview/references/archive-format.md)`

## 输出要求

1. 面经正文保留原始顺序。
2. 正文优先短、稳、能背。
3. 专题链接要明确告诉读者为什么值得深挖。
4. 不要把简单题也抽成专题。
5. 不要在正文里重复抄写专题全文。
