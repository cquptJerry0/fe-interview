---
name: interview-archive-retro
description: 面经归档与复盘编排（原始题单、知识条目、索引、画像、日志）
---

# Interview Archive & Retro Playbook

## 目标

把一轮完整面经输出为可检索、可回放、可统计的资产。

## 输入

- 公司/岗位/轮次/日期
- 原始题目文本（可带来源）
- 本轮高质量回答与 tags
- 可选：掌握度落位（unknown/new_learned/need_review/mastered）

## 输出

- 原始面经入口（内容库）
- 满分回答条目（内容库）
- 导航更新（按公司/按模块/按Tag/本周复习）
- 训练记录更新（会话/画像/jsonl）

## 执行顺序（单一真相）

1. `archive-sync`（写入内容、导航、记录）
2. 失败校验：路径可达、links 可点击、画像与日志可解析

## 详细流程

详见 `.ai/references/interview-archive-retro.md`。
