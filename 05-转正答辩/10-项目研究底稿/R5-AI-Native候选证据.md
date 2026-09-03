# R5｜AI Native 候选证据

> 来源任务：[转正答辩 R5｜AI Native 横向证据](codex://threads/01a05698-987e-7c52-af95-8dcdc4d2764f)
>
> 最近核验：`2026-09-03`
>
> 本底稿保存 Coco、vimocli Skill 和 VIMO Agent 的事实。它们当前是横向候选，尚未决定是否独立成章。

## 1. 当前事实摘要

1. 三个场景共同体现一种职责划分：模型处理语义判断，代码和 CLI 执行真实 contract，人工控制高风险修改。
2. Coco 已有主干代码、开发期运行记录和至少两次人工 Apply。当前自动触发关闭，只保留手动 Inspect 和人工 Apply。
3. vimocli 统一 Skill、自更新、结构化输出、鉴权恢复和多站点 contract 已合入并发布。
4. VIMO Agent 的素材 subagent、请求级业务线和 JWT 注入、只读失败重试、SG 能力裁剪已经交付。
5. Agent 的素材写操作主要依赖 Prompt 软确认，运行时尚无完整硬门禁。
6. 当前缺 Coco 长期正确率、Skill 独立使用量、Agent 真实任务成功率和运营采纳数据。

## 2. 三个场景的真实流程

### 2.1 Coco 素材文档巡检

```text
代码发生变化
→ 手动触发 Inspect
→ Coco 读取 context.json
→ 构造 changed_files / commit_messages / diff_patch
→ 控制总上下文上限 20KB
→ 模型判断哪些 biz-context 文档可能需要调整
→ 只允许修改 biz-context/biz/*.md
→ 越界修改自动还原
→ 生成 Patch
→ git apply --check
→ 人工查看 Diff
→ 人工 Apply 或 Skip
```

当前状态：主干已交付；自动触发关闭；至少两次 Patch 被人工采纳。

### 2.2 vimocli 与 Skill

```text
用户或 Agent 描述任务
→ 统一 Skill 选择领域 Guide
→ 补全业务输入和风险检查
→ 选择语义命令
→ OperationSpec 固定 site / method / path / bid / auth
→ vimocli 发起真实请求
→ 返回 table / JSON / exit code / error
→ 写操作展示变更并由人确认
→ 执行后回读
```

当前状态：CLI 和 Skill 已交付；CLI 有真实调用数据；Skill 自身的活跃使用和任务成功率仍缺。

### 2.3 VIMO Agent

```text
运营目标
→ Root 判断业务域
→ 委派 material subagent
→ subagent 读取最窄 vimocli Skill
→ managed_cli_run 执行 vimocli
→ CLI allowlist + 参数数组 + shell:false
→ 请求级注入 biz / JWT
→ 大结果写 outputPath
→ 只读 HTTP 500 有界重试并保留 tt-logid
→ 写操作要求用户确认
→ 执行并回读
```

当前状态：素材 subagent、CN 基础链路、SG 素材能力和模型选择已交付。`managed_cli_run interruptOn=false`，命令级策略未强制启用，写操作仍是软门禁。

## 3. 用户的 Ownership

| 场景 | 用户贡献 | 团队基础 |
|---|---|---|
| Coco | 设计并交付 MR 2434；负责上下文、文件范围、Patch、校验和 Apply；后续关闭自动触发 | Codebase Pipeline 和 Coco 平台 |
| vimocli Skill | MR 32 的统一路由、自更新和 Skill 同步；后续参与多站点、权限和素材命令 | vimocli、素材命令和旧分域 Skill 已存在 |
| 素材 subagent | MR 2730 中负责运行时上下文、素材路由、事件流、只读重试、Skill 配置和脚本权限收紧 | DeepAgent、Sandbox 和活动 Agent 基座 |
| SG 部署 | MR 2854 中负责 SG 配置、I18N Sandbox 和能力裁剪 | 国内 Agent 基座 |
| 模型选择 | MR 2985 中负责 TCC 配置、接口、前端选择和服务端回退 | 模型工厂和聊天页已有 |
| Agent 评测 | 当前未发现用户对 Fornax 评测主链的主要提交 | 由团队成员吴炜豪建设 |

## 4. 已确认的技术判断

### 4.1 模型生成待审 Patch

问题：代码变化后，业务文档依赖研发主动发现和手工补写；模型直接提交又可能误改业务语义。

选择：

1. 动态构造有限上下文。
2. 模型只在规定文档范围生成 Patch。
3. 流水线还原越界修改并执行 `git apply --check`。
4. 人工决定 Apply 或 Skip。
5. 自动 Inspect 因 Token、运行时机和不阻塞 MR 等原因关闭。

边界：更新 5 篇或 6 篇文档代表模型生成了修改，不代表发现了相同数量的正确问题。

### 4.2 Skill 保存业务方法，CLI 保存真实 contract

问题：把 API path、鉴权和站点规则都写进 Prompt，会产生参数幻觉和版本漂移。

选择：

1. Skill 保存意图路由、业务 SOP、风险提示和验证方式。
2. vimocli 保存站点、身份、HTTP、输出和错误恢复。
3. CLI 使用结构化结果和退出码，写操作执行后回读。

边界：Skill 文档不能替代 CLI 结果；CLI 调用量也不能当作 Skill 使用量。

### 4.3 模型生成脚本与凭证执行分权

问题：批量过滤需要脚本，但把用户 JWT 注入模型生成的通用脚本会扩大凭证暴露面。

选择：

1. 通用脚本只处理文件和已有结果。
2. JWT 和业务线只进入受控 `managed_cli_run`。
3. 参数使用数组传递，runner 设置 `shell:false`。
4. 只读 HTTP 500 可以有限重试，写请求不自动重放。

边界：

1. 需要确认底层控制面是否记录完整命令前缀中的环境变量。
2. 素材写入尚无命令级硬 HITL。

## 5. 结果、复用和口径

### Coco

| 结果 | 限制 |
|---|---|
| MR 2434 有 12 个版本生成 Inspect Check | 2 个 neutral/ignored，10 个进入执行路径 |
| 可确认 8 次非零耗时成功执行 | 开发期数据，不代表长期运行 |
| 至少两次 Apply 成功，分别更新 6 篇和 5 篇文档 | 缺人工改写量、误报和漏报 |
| 有失败记录和零变化自动跳过 | 说明失败和 no-op 可被观察 |

### vimocli 与 Skill

1. MR 32 合入时 3 个 Check 通过，`0.2.0`于 2026-06-25 发布。
2. 更新后的 R3 TEA 口径为 208 个去重调用身份、442,078 次已验签请求事件。
3. 统一 Skill 快照为 1.0.52，累计下载 880，近周 108。
4. CLI 调用数据不能证明 Skill 被加载或 Agent 任务成功。

### VIMO Agent

1. MR 2730：10 个 Check，无失败。
2. MR 2854：12 个 Check，无失败。
3. MR 2985：质量门禁通过，有一项 Warning 级分析。
4. 代码能证明素材路由、SG 裁剪、结构化输出、只读重试和失败诊断。
5. 8 个 Golden Case、5 人灰度、日均 30 次、P0=0、工单下降 50%均属于规划或退出标准，不作为实际结果。

## 6. 代码、MR 和文档证据

| 证据 | 说明 |
|---|---|
| [Coco MR 2434](https://code.byted.org/ies/tool_platform/merge_requests/2434) | Pipeline、Commit、开发期 Check 和 Ownership |
| `tool_platform/.codebase/pipelines/material_doc_inspect.yaml` | Coco 真实配置、范围、Patch 和人工边界 |
| [四月日报](https://bytedance.larkoffice.com/wiki/HMSlw3jyRiaa4GkUrWacMPH7nId) | 关闭自动 Inspect 的原因 |
| [vimocli MR 32](https://code.byted.org/ies/vimocli/merge_requests/32) | Skill 收敛、自更新和发布 |
| [vimocli 技术总结](https://bytedance.larkoffice.com/wiki/J5MTwCCDAiMkMMkga4ccUVZRnBf) | 开放能力和规划 |
| [vimocli 快速接入](https://bytedance.larkoffice.com/wiki/GbcNwsuAzivvMakKOcxcuBBDnKc) | 接入与发布流程 |
| [VIMO 素材 Agent 基础能力](https://bytedance.larkoffice.com/wiki/OlMuwebo7idB2kkceUNcgQzPn2c) | Root、subagent、vimocli 和脚本边界 |
| [Agent MR 2730](https://code.byted.org/ies/tool_platform/merge_requests/2730) · [集成 MR 2670](https://code.byted.org/ies/tool_platform/merge_requests/2670) | 用户增量和最终合入链路 |
| [SG MR 2854](https://code.byted.org/ies/tool_platform/merge_requests/2854) | 海外部署与能力裁剪 |
| [模型选择 MR 2985](https://code.byted.org/ies/tool_platform/merge_requests/2985) | 模型选择已交付 |
| [Agent 第一期案例](https://bytedance.larkoffice.com/wiki/Q6L4wxkT2idytJkJ3R2cenhpnyk) | Golden Case 设计，不能证明已跑通 |
| [Agent 架构规划](https://bytedance.larkoffice.com/wiki/Mm3twq9b6ioZIvk2E2mcuTvZnEd) | RoadMap 和退出标准，不能证明实际指标 |

## 7. 新增变化

```text
日期：
场景：Coco／Skill／Agent
真实任务：
我的职责：
模型判断：
确定性执行：
人工门禁：
结果与回读：
失败或接管：
证据：
影响模块：
```

## 8. 待确认项

1. Coco 合入后的手动 Inspect 次数、触发人、采纳和人工改写情况。
2. 是否有同事独立安装和使用统一 vimocli Skill。
3. VIMO Agent 是否执行过真实素材写操作，确认发生在哪一层。
4. Agent 的任务成功率、人工接管率和失败分布。
5. `managed_cli_run`底层日志对凭证和完整命令的记录边界。
