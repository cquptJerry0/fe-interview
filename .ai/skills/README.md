# 仓库 Skill

## 写作、调研与面试训练

| Skill | 适用场景 | 配套资源 |
| --- | --- | --- |
| [writing-collab](writing-collab/SKILL.md) | 按读者和用途共创大纲、正文、反馈与验收 | 写作参考、样本分析、约定模板和行为验证用例 |
| [architecture-research](architecture-research/SKILL.md) | 技术调研、多来源合订、知识体系与文档职责梳理 | 来源与架构指南、文档校验脚本和回归测试 |
| [interview-bagu-coding-coach](interview-bagu-coding-coach/SKILL.md) | 八股、手写题、组件设计与复述训练 | 题目路由与高收益训练地图 |

三个 Skill 可独立使用，将对应完整目录交给使用端的 Skill 安装机制即可。`interview-bagu-coding-coach` 沿用仓库已有版本；另两个同步自本机安装版本，仓库副本不反向覆盖本机。

写作样本已去除内部文档链接和私人会话 ID，保留观察与适用边界。`writing-collab` 的 Markdown 测试文件是行为验证用例，不是自动化测试。`architecture-research` 的结构校验脚本需要 Python 3.10+；后续授课或正式技术方案可按需交接 `course-delivery-orchestrator`、`technical-document-writing`，这两个可选 Skill 不随本次收录。

在仓库根目录运行调研 Skill 的回归测试：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s .ai/skills/architecture-research/tests -v
```

## 飞书画板套件

三个 Skill 配合使用，以 `design-lark-chart` 为创作入口，不重复启动三套设计流程。

| Skill | 职责 |
| --- | --- |
| [design-lark-chart](design-lark-chart/SKILL.md) | 定主题、搭骨架、填内容、展开细节、整体优化 |
| [lark-whiteboard-cli](lark-whiteboard-cli/SKILL.md) | 组件、布局、连线、DSL 与原生节点转换 |
| [lark-whiteboard](lark-whiteboard/SKILL.md) | 查询、备份、更新、回读与导图 |

本套件从本机已安装版本同步。保留各 Skill 的职责、参考资料、案例与测试；仓库副本不自动覆盖本机安装版本。案例中的业务名称与流程仅用于解释图形设计，不是其他项目的默认业务规则。

## 外部依赖

运行环境需要 Node.js 18+、`lark-cli` 和 `@larksuite/whiteboard-cli`；Python 检查脚本需要 Python 3。新增安装依赖前遵循当前环境的授权规则，命令参数以安装版本的 `--help` 为准。

执行飞书操作前，需在使用端安装并读取 `lark-shared` Skill，处理身份、认证与权限。需要创建文档或画板容器时，再安装并读取 `lark-doc` 及其 `references/lark-doc-whiteboard.md`。它们由使用端的飞书 CLI / Skill 分发渠道提供，本仓库不复制整套飞书能力；`lark-sheets`、`lark-base` 也不在画板套件内。

仅做主题、ASCII 或 Prompt 设计时无需远端写入。真实写入前确认目标和范围，备份现状并 dry-run；写后回读节点、查看真实导图。本地测试通过不代表远端写入成功。

在仓库根目录运行以下命令，可将三个目录复制到一个尚未存在的暂存目录，检查后再按使用端的 Skill 安装机制安装：

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
STAGING="$(mktemp -d "${TMPDIR:-/tmp}/lark-chart-skills.XXXXXX")"
for name in design-lark-chart lark-whiteboard-cli lark-whiteboard; do
  cp -R "$REPO_ROOT/.ai/skills/$name" "$STAGING/$name"
done
printf '%s\n' "$STAGING"
```

## 本地校验

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s .ai/skills/design-lark-chart/tests -v
PYTHONDONTWRITEBYTECODE=1 python3 .ai/skills/design-lark-chart/scripts/test_clarity_checks.py
```

参考画板批量拉取脚本需要显式传入自己的 manifest 和输出目录，不包含私人画板 token 清单，也不默认覆盖 Skill 自带素材。
