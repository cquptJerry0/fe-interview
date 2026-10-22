# 仓库 Skill

## 写作、调研与面试训练

| Skill | 适用场景 | 配套资源 |
| --- | --- | --- |
| [writing-collab](writing-collab/SKILL.md) | 按读者任务组织整体到局部的正文，执行语言、最终状态与格式红线 | 核心规则、写作流程、场景专项、样本、结构检查与行为用例 |
| [architecture-research](architecture-research/SKILL.md) | 技术调研、多来源合订、知识体系与文档职责梳理 | 来源与架构指南、文档校验脚本和回归测试 |
| [interview-bagu-coding-coach](interview-bagu-coding-coach/SKILL.md) | 八股、手写题、组件设计与复述训练 | 题目路由与高收益训练地图 |

三个 Skill 可独立使用，将对应完整目录交给使用端的 Skill 安装机制即可。`writing-collab` 的仓库与本机安装副本同步维护；其余 Skill 按各自分发规则更新。

写作样本使用匿名对照，结构与扫描器测试由 Python 自动执行；Markdown 行为用例用于验证实际首稿和多轮表现，自动检查不证明文档可读性。`architecture-research` 的结构校验脚本需要 Python 3.10+。

在仓库根目录运行写作 Skill 的结构与回归检查：

```bash
PYTHONDONTWRITEBYTECODE=1 python3 .ai/skills/writing-collab/scripts/check_skill.py .ai/skills/writing-collab
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s .ai/skills/writing-collab/tests -p 'test_*.py' -v
```

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
