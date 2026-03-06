# .ai

`.ai/` 是仓库的 AI 运行时配置目录，包含编排、能力、策略、模板与 schema。

内容约束：
- 只放运行时资产（playbooks/capabilities/policies/templates/schemas/runtime）
- 不放题库、知识条目、训练记录等业务数据

目录说明：
- `playbooks/`：场景编排（训练主流程、归档复盘）
- `capabilities/`：原子能力（解析路由、回答训练、编程题、归档同步）
- `policies/`：统一规范（风格/命名/评分）
- `templates/`：输出模板
- `schemas/`：结构化 schema 与 tag 词表
- `runtime/`：工作流、能力注册、路径别名（单一真相源）

维护建议：
- 优先在 `runtime/` 与 `policies/` 做收敛，减少重复规则
- 修改后使用仓库根目录 `验收用例.md` 回归
