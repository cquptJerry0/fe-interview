---
name: interview-training
description: 前端面试训练主编排（拆题、路由、训练、编程题、归档）
---

# Interview Training Playbook

## 目标

把一组面经题与编程题训练成可复用的面试表达，并同步沉淀到训练记录。

## 输入

- 面经题清单（可混合：八股/场景/开放/手写/编程）
- 可选：画像片段（tag -> level/confidence）
- 可选：岗位与时间约束

## 输出

- 结构化题目清单（含类型、难度、tags）
- 每题：评分 + 改写满分回答 + 追问脚本
- 编程题：MVP + 加分点
- 模块归档：unknown/new_learned/need_review/mastered + 画像更新建议

## 执行顺序（单一真相）

1. `intake-routing`
2. `answer-coaching`
3. `coding-exercise`（存在编程题时）
4. `archive-sync`

## 专项路由（按题目 tag 或用户显式要求）

- 工程化题：Webpack/Vite/构建链路
- React 深挖：Hooks/渲染机制/性能
- 跨栈速学：Go/服务端/Agent 开发
- 满分答案按题型路由：八股/场景/开放/手写/项目复盘（由 `answer-coaching` 内部处理）

## 统一约束

- 先结论后展开；必须可口述
- 每题至少 1 个可验证证据（最小例子/日志指标/实验/排障路径）
- 评分统一遵循 `.ai/policies/02-评分标准与维度.md`
