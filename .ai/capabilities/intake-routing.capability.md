# intake-routing

## 目标

把原始输入拆为结构化题目，并给每题分配训练策略。

## 输入

- 原始题目文本
- 可选：用户画像（tag 的 level/confidence）

## 输出

- `questions[]`: `{ id, title, type, difficulty, tags }`
- `strategy[]`: `快答 | 深讲 | 教到会`

## 规则

- 拆题：先粗分，再识别复合题
- 类型：八股/场景/开放/手写/编程
- tag：优先复用 `.ai/schemas/tags.yaml`
- 缺失画像：默认 level=2，先追问校准

## 路由

- level 0-1 -> 教到会
- level 2-3 -> 深讲
- level 4-5 -> 快答
- confidence < 0.6 -> 下调一档
- confidence > 0.8 且快速举例 -> 上调一档
