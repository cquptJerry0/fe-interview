# R0｜VIMO 业务全景与个人职责

> 来源任务：[转正答辩 R0｜VIMO 业务全景与职责总览](codex://threads/01a05728-579b-7593-a617-91c08a338a53)
>
> 最近核验：`2026-09-03`
>
> 用途：保存业务全景和全部工作范围的稳定事实。正式第一部分由 `03-VIMO业务全景与个人产出.md`编译。

## 1. 当前事实摘要

1. VIMO 是字节内部运营后台，服务剪映／CapCut、醒图／Hypic、即梦／Dreamina、Pippit 等业务。
2. 素材业务覆盖素材接入、元数据和资源配置、分类与面板、Draft、审核、Pre／Prod 发布和客户端消费。
3. 自动分发、OpenAPI／vimocli／Agent 和全球搬运是主链上的入口或分支。
4. 用户工作以素材方向为主，商业化为次要业务方向。
5. 当前四个强候选是 TTP、自动链路、OpenAPI/vimocli、全球素材搬运重构。
6. Coco、Skill 和 VIMO Agent 是 AI 工作方式候选，成熟度需要分别表述。

## 2. 业务、用户和真实链路

### 用户

| 角色 | 主要任务 |
|---|---|
| 素材运营 | 创建、配置、分发和发布素材 |
| TTP 可信审批员 | 对 US 候选版本执行最终审批和晋升 |
| 业务研发 | 接入能力、排查问题、构建自动化 |
| 脚本与服务账号 | 使用 OpenAPI 和 vimocli 批量操作 |
| Agent | 理解任务并调用 vimocli 等确定性工具 |
| 目标业务运营 | 复用其他业务已验证的素材 |
| 客户端用户 | 消费 Prod 版本和素材资源 |

### 核心对象

```text
业务线／站点
→ 素材
→ 分类
→ 面板
→ Draft
→ Pre／审批（合规分支）
→ Prod
→ 客户端
```

### 入口与分支

```text
素材／分类事件 → distribute_record → Draft → publish_task → Prod
用户／脚本／Agent → vimocli → OpenAPI → 领域 Service
源业务素材 → 搬运任务 → Workflow → 素材服务 → 目标素材 → 面板／测试
```

## 3. 用户的 Ownership

| 业务块 | Ownership 口径 |
|---|---|
| TTP | 用户确认为项目 Owner，负责主要工程落地、环境接入、风险修复、测试和交付 |
| 自动链路 | 用户确认为项目 Owner，负责 `publish_task`、统计、批量 Plan、主库读取、无变化跳过和性能收口等 |
| OpenAPI/vimocli | 用户确认为项目 Owner，负责资源权限、发布、多站点身份、CLI 语义承接和交付链 |
| 全球搬运 | 用户与 MT 共同 Owner，用户负责 VIMO 侧方案和实现 |
| AI 工作方式 | 用户负责 Coco、vimocli Skill 收敛、素材 subagent 增量、SG 部署和模型选择等具体交付 |
| 商业化 | 用户负责审计、权益预设、AI 模板配置和预览接口等需求 |

团队基座和协作方仍要保留：素材服务、Workflow、初版 OpenAPI/CLI、评测和业务需求分别有团队投入。

## 4. 已确认的业务判断

1. 第一部分需要把业务全景和个人工作放在同一组内容中。
2. `publish_task`属于自动执行链路的正式发布阶段。
3. 全球素材搬运已有旧链路，本轮价值是存量重构。
4. OpenAPI/vimocli 的内容范围包含 CLI 设计、鉴权中间件、JWT 公共能力、多站点 contract、OpenAPI 到 CLI 的交付链、版本发布和 Skill／Agent 复用。
5. 小项应按业务问题聚合：素材接入与批量运营、素材策略与控制、商业化后台、日常正确性修复。
6. 四个强候选在业务图上分别落在合规发布、自动执行、开放调用和跨业务复用。

## 5. 结果、数据和口径

| 分类 | 当前可用事实 |
|---|---|
| 业务覆盖 | 服务剪映／CapCut、醒图／Hypic、即梦／Dreamina、Pippit 等业务 |
| TTP | 2026-03-27 ROW PPE → US TTP 在线审批；2026-04-10 主干合入 |
| 自动链路 | SG PPE 50 条任务、976 action、143 分类、16 面板；50 成功、0 失败；1188 秒降到约 12～24 秒 |
| OpenAPI/vimocli | 2026-05-06～08-31：208 个去重调用身份、442,078 次已验签请求事件 |
| 全球搬运 | 输入材料记录 20 个，操作截图执行 19 个且搬运、入面板、测试均成功；重构 MR 当时未合入 |
| AI 工作方式 | Coco 至少两次 Patch 被人工 Apply；Agent 缺真实运营结果 |
| 商业化 | 核心需求已合入，缺审计量、配置量和商业指标 |

## 6. 证据入口

| 主题 | 证据 |
|---|---|
| TTP | [业务 OnePage](https://bytedance.larkoffice.com/docx/VSI3ds489oonomxsdMHcE5aPnog) · [技术方案](https://bytedance.larkoffice.com/wiki/AoNUwyhVXiG4Sckck2WcoH22nyc) · [MR 2302](https://code.byted.org/ies/tool_platform/merge_requests/2302) |
| 自动链路 | [统一正式发布](https://bytedance.larkoffice.com/wiki/D5gTwDx9li9VUXkbImKcjTKon7b) · [性能记录](https://bytedance.larkoffice.com/wiki/K395wkrvuiUXtkkwpevcNjKunTg) |
| OpenAPI/vimocli | [技术总结](https://bytedance.larkoffice.com/wiki/J5MTwCCDAiMkMMkga4ccUVZRnBf) · [接入文档](https://bytedance.larkoffice.com/wiki/US3uwQ8XtiVtlWkgYItcg5qpnfe) |
| 全球搬运 | [项目专辑](https://bytedance.larkoffice.com/wiki/KPX1wgFl2iZ11ZkVribc7iAgnXi) · [技术方案](https://bytedance.larkoffice.com/wiki/MH7ywRDpVi8LCnk7F94cacvmn2f) |
| AI 工作方式 | [Coco MR 2434](https://code.byted.org/ies/tool_platform/merge_requests/2434) · [Agent 方案](https://bytedance.larkoffice.com/wiki/OlMuwebo7idB2kkceUNcgQzPn2c) |
| 个人推进 | [王子豪周报](https://bytedance.larkoffice.com/wiki/RJnKwYTaUiuc4wkmL4FcnPdEnzf) |

## 7. 新增变化

9 月 5 日后新增工作按以下格式追加：

```text
日期：
业务问题：
我的职责：
技术判断：
当前状态：
证据：
结果与口径：
影响模块：
```

## 8. 待确认项

1. VIMO 的官方一句话定位。
2. 主要业务线、运营人数、素材量和面板量。
3. 四个强候选的投入时间占比。
4. 商业化是否存在可用业务结果。
5. 9 月新增项目是否会改变当前候选结构。
