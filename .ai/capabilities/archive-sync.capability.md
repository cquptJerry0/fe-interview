# archive-sync

## 目标

把训练结果同步到内容库、导航与训练记录，保证可检索与可统计。

## 输入

- 模块题目与最终回答
- tags 与掌握度分类
- 会话元信息（日期、公司、轮次、来源）

## 输出

- 内容库：原始题单 + 知识条目
- 导航：总导航/按Tag/按公司/按模块/本周复习
- 训练记录：会话、画像、jsonl 日志

## 规则

- unknown 与 need_review 必须给下次复习建议
- jsonl 不写隐私，仅写 tag、变化、证据摘要
- 所有路径使用 `.ai/runtime/paths.yaml` 逻辑别名，不写硬编码绝对路径

## 模板引用

- `.ai/templates/05-模块归档.template.md`
- `.ai/templates/06-知识条目.template.md`
- 详版流程：`.ai/references/interview-archive-retro.md`
