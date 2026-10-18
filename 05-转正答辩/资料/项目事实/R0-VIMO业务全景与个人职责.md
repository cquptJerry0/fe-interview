# R0｜VIMO 业务全景与个人职责

> 历史核验资料，2026-10-13 整理迁入。只按问题读取；以下事实适用原核验时间，不定义当前章节、比重或最新项目状态。

> 来源任务：[转正答辩 R0｜VIMO 业务全景与职责总览](codex://threads/01a05728-579b-7593-a617-91c08a338a53)
>
> 最近核验：`2026-10-07`（补充第二部分涉及的文档与群聊证据；未重新核验全部历史指标）
>
> 用途：查找业务对象、职责和原始证据；当前结构见上层 WIP，数据需核对来源时间。

## 1. 当前事实摘要

1. VIMO 是字节内部运营后台，服务剪映／CapCut、醒图／Hypic、即梦／Dreamina、Pippit 等业务。
2. 素材业务覆盖素材接入、元数据和资源配置、分类与面板、Draft、审核、Pre／Prod 发布和客户端消费。
3. 自动分发、OpenAPI／vimocli／Agent 和全球搬运是主链上的入口或分支。
4. 用户工作以素材方向为主，商业化为次要业务方向。
5. TTP、自动链路、OpenAPI/vimocli、全球素材搬运及 AI 工具实践的事实分项保存，不在此决定章节位置。

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
| 全球搬运 | 早期演练输入材料记录 20 个，操作截图执行 19 个且搬运、入面板、测试均成功；2026-09-17 用户在项目群确认功能上线，更新此前“未合入”的阶段状态 |
| AI 工作方式 | Coco 至少两次 Patch 被人工 Apply；Agent 缺真实运营结果 |
| 商业化 | 核心需求已合入；权益预设包 7 月复盘记录首页预设卡片点击到付费转化率约 0.5%，为对比楼层最高。属于后台建设支撑的项目结果，不单独归因于后台；审计量与配置量仍缺数据 |

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

### 2026-10-07 核验：合同授权

- 时间：9 月第三周周报记录上线；9 月 29 日群内说明当前使用入口。
- 业务问题：采购字体与合同授权分散维护，合同范围收紧后，字体授权需同步调整。
- 我的职责：VIMO 合同关联、授权回填与保存、范围冲突处理、关联字体及授权记录查询导出。
- 技术判断：素材与授权保存由 Node 编排；合同缩小时按合同范围收紧素材授权，不能保留越界授权。
- 状态：合同版权重构已上线；9 月 29 日提出的批量绑定合同不计入已完成范围。
- 证据：[PRD](https://bytedance.larkoffice.com/docx/QcTodiQSzoGJuWx1tVPcI3dZnSf)、[方案](https://bytedance.larkoffice.com/wiki/CJlSwRAJKitYVxk7GjFcrVqOnhb)、[个人周报](https://bytedance.larkoffice.com/wiki/RJnKwYTaUiuc4wkmL4FcnPdEnzf)。群“合同”消息 `om_x100b66d1c28390a4c3af7d52701f32e` 确认范围联动规则；`om_x100b648126497880b495de3e674aaa2` 确认素材新增、编辑时绑定合同的入口。
- 结果与口径：支持授权范围核对、关联追查与凭证留存；没有量化节省工时或版权事故下降数据。
- 影响模块：素材管理；第二部分列为“合同与授权管理”。

### 2026-10-07 核验：全球素材搬运上线

- 时间：2026-09-17 16:19。
- 业务问题：跨业务复用依赖多环节人工核对，旧链路任务结果和后处理状态不易追踪。
- 我的职责：与 MT 共同 Owner，负责 VIMO 侧方案及实现；素材服务负责实际复制。
- 技术判断：补齐同区搬运、任务持久化、预检审批、逐素材结果与面板／测试后处理；跟随与独立模式分别管理维护归属。
- 状态：用户在“素材全球搬运”群确认功能上线，后续仍有优化。
- 证据：[方案](https://bytedance.larkoffice.com/wiki/MH7ywRDpVi8LCnk7F94cacvmn2f)、[操作说明](https://bytedance.larkoffice.com/wiki/PNlawcyO5iZuzfk9YQWceUBxnEh)，上线消息 `om_x100b658e66f6ac88b182da0b5d005a1`。
- 结果与口径：已提供可查询的搬运与后处理结果；早期演练数据仍按原样本口径，不扩写为长期线上成功率。
- 影响模块：素材供给；补强既有搬运 Case，更新交付状态。

### 2026-10-07 核验：动转静供给与后续治理

- 时间：7 月推进正式发布改造；9 月第四周补充供给异常治理。
- 业务问题：图片编辑场景的静态文字模板供给有限，需要复用视频场景的动态文字模板。
- 我的职责：VIMO 侧资格判断、目标分类匹配、自动同步、入面板与正式发布；静态产物生成和审核由上游服务承担。
- 技术判断：同时承接存量回扫与新增内容；自动链路重构作为供给支撑，不在第二部分另列一项。
- 状态：已有供给链路持续运行，9 月第四周修复审核状态导致的自动入面板异常。
- 证据：[统一正式发布方案](https://bytedance.larkoffice.com/wiki/D5gTwDx9li9VUXkbImKcjTKon7b)、[个人周报](https://bytedance.larkoffice.com/wiki/RJnKwYTaUiuc4wkmL4FcnPdEnzf)，发布群消息 `om_x100b693840f094a4b1f74d460841c72`、`om_x100b643b794a2880b4bf52e7faf19f6`。
- 结果与口径：9 月第四周周报记录将 2.64 万条确认审核通过且静态预览时间有效的存量素材补入“文字模板-图场景”面板。可作为概览中的供给产出；不是新生产 2.64 万条模板，不推断客户端渗透率或收入。技术性能与验证范围留给重点项目章节。
- 影响模块：素材供给；第三部分仍负责展开自动链路的工程设计与验证。

### 2026-10-07 核验：数字资产录入与海外部署

- 时间：2026-09-21 确认 ROW 范围；9 月 24 日用户通知开发完成并提供 PPE 验收；9 月第四周周报将模型部署与全链路构建列为后续计划。
- 业务问题：海外 IP、肖像等授权资料需要主动录入，经安审、法务审批后供 AI 创作授权判断使用。
- 我的职责：后台录入表单、文件上传预览、Node 接 BPM 审批和业务服务、工单与授权结果查询；承担海外资产事件处理与人脸特征计算相关服务部署接入。
- 技术判断：区分申请账号和被授权账号；BPM 管理工单与审批，业务服务负责资产入库。部署范围含资产创建后的特征计算、授权查询及鉴权日志消费，不能将业务 RDS 和其他后端迁移归为个人交付。
- 状态：后台录入已完成开发，提供 `ppe_digital_asset_i18n` 验收；未查到正式线上验收通过记录。海外部署仅确认方案分工与推进计划，未核实全链路部署完成。当前范围为 ROW，不包含 TTP。
- 证据：[主方案](https://bytedance.larkoffice.com/wiki/KwHpwJhRbivPlskXMTzcp1C6nRe)、[PRD](https://bytedance.larkoffice.com/wiki/X3LTwahfHiin0JkT85lcbyTmnjc)、[个人周报](https://bytedance.larkoffice.com/wiki/RJnKwYTaUiuc4wkmL4FcnPdEnzf)。开发完成消息 `om_x100b64788c07a0a0b4b042167e27783`；ROW 范围消息 `om_x100b643efe0bd0a4c340a0fcd39f6c6`；TTP 限制消息 `om_x100b643ef67d5ca0c3e4ef3bc2d5e57`。
- 结果与口径：后台提供授权申请与结果追查入口；海外部署的用途为支持资产识别和授权查询，按推进中表述，不写成上线收益。
- 影响模块：第二部分新增“数字资产”，下设“海外 IP 后台录入”“数字资产海外部署”两项。

### 2026-10-07 补核：既有批量与商业化交付

| 工作 | 个人交付与业务用途 | 状态与证据 |
|---|---|---|
| 通用批量 | 配置驱动的导入流程，统一 Excel 解析、文件匹配、上传校验、批量创建与结果导出；减少素材类型各自开发批量流程的重复投入 | [方案](https://bytedance.larkoffice.com/wiki/JqrGwPaAtilSdck8XmncznH7nIb)。只使用已交付 v1 的范围，不合并 v2 未交付能力 |
| 权益预设包 | 后台配置调色、功能和素材组合，支持预览、审批与上下线；服务客户端一键应用效果和权益体验 | [方案](https://bytedance.larkoffice.com/wiki/Gu76w638TiZPh8knCWYcxDAlnmf)。6 月 9 日用户在测试群确认 VIMO 发布完成：`om_x100b6d4bfcead8a0b3c3e9161ea511f`。方案中的历史收入数据不归为本人成果 |
| AI 模板配置 | 模板 ID 维度积分、限免配置，支持单条编辑、表格批量配置提审和任务结果查询 | [方案](https://bytedance.larkoffice.com/wiki/VQAiwwdkni9LHxkj2i2c5PiHn8d)。7 月 21 日用户确认前端上线：`om_x100b6adb78e4b8a0c4a895090266721`。没有可用收入归因 |
| 海外商业化审计 | 补齐海外商业化写操作日志；ROW 接入 VIMO 操作日志插件，US 接入天穹，分别提供操作核查入口 | [过程汇总](https://bytedance.larkoffice.com/wiki/GE6EwFkPpiJJ7AkILIdcr9Qindd)。3 月 18 日用户确认 TTP 天穹日志在 3 月 17 日完成接入验证：`om_x100b5491c15828bcb33f3a23a033c71`。本次改价追查背景限定海外，不与国内补日志或 9 月素材发布审计混写 |

### 2026-10-07 补核：权益包本期业务结果

- 时间：6 月 9 日后台发布完成；7 月 20 日产品在需求群同步转化数据，7 月 23 日同步完整复盘。
- 业务问题：调色、美颜等功能参数复杂，权益预设将多个功能和素材组合为可直接应用的效果，验证用户使用和付费意愿。
- 我的职责：权益预设后台列表、参数配置、预览、审批与上下线，以及客户端、服务端协议对齐；不包含全部客户端和活动投放工作。
- 技术判断：后台提供组合效果的配置与投放管理，业务收益按对应预设活动和首页楼层的项目复盘口径引用。
- 状态：已发布并完成本期业务复盘。
- 证据：[预设活动复盘](https://bytedance.larkoffice.com/wiki/KwNdwwJC2ik6bEk5IMqcbgfYnsh)，正文块 `CNPrdhauwo6nQYxzeRjcQTSRn8d`；需求群 `oc_c7b5e89ea953bb77ba4bca6a726d8371` 中消息 `om_x100b6aecb18a9d04c4481c539e59e63`（7 月 20 日）及 `om_x100b6916dd4af0a4b21f58c6913c6f5`（7 月 23 日）。
- 结果与口径：首页楼层实验中，预设卡片整体点击到付费转化率约 0.5%，为所对比楼层卡片中最高。该指标是转化率，不是转化率提升 0.5%，也不是后台单独贡献的收入增长。复盘另记录活动页支付 UV 134、预设功能支付 UV 360，但各指标入口不同，不相加、不混用。
- 数据边界：历史方案中的 4.4 万元、+0.31% 不属于本期结果；未视觉核验的图像 alt 数字不入正文。已下钻复盘嵌入表格，分功能数据正负混合且统计边界不完整，不挑取正向项作为大盘收益。
- 影响模块：第二部分权益包成果描述；更新此前“缺商业指标”的结论。

### 2026-10-07 补核：通用批量结果口径

- 时间：本轮补查通用批量方案、个人周报、发布消息和素材用户反馈群。
- 业务问题：旧批量创建按素材类型分别开发步骤模板和上传适配，新增类型存在重复开发。
- 我的职责：配置驱动的通用批量 v1 导入与结果管理，范围沿用上表。
- 技术判断：将 Excel 字段解析校验、资源文件匹配、批量提交与结果导出纳入通用流程；新增类型复用配置和流程，不将 v2 规划计为交付。
- 状态：周报记录完成改造；未找到可以归属于本次改造的实际使用量或同口径耗时对比。
- 证据：[通用批量方案](https://bytedance.larkoffice.com/wiki/JqrGwPaAtilSdck8XmncznH7nIb)的背景与三步向导章节、个人周报。3 月 31 日“批量上传加速”评审消息 `om_x100b5383cd6c10b0b378b1889363968` 未给出加速数据。
- 结果与口径：可写通用配置接入、整批录入与逐条结果核对。设计图中 28／25／23 条属于示例，不能当作使用指标；6 月 3 日反馈中的 Pose 约 16 个、Emoji 约 60 个是导入需求量，早于通用批量评审，不当作已完成处理量；CLI 上传记录不归入此项。
- 影响模块：第二部分通用批量，只写已交付操作变化，不编造量化收益。

### 2026-10-07 增补：第二部分批注与业务起因

- 时间：本轮回读答辩主文档 revision 1001、用户正文批注及两条对话纠正。
- 业务定位：[素材 OnePage](https://bytedance.larkoffice.com/wiki/PrwtwRmysiNLQEk3mMkcQYPonlT)说明 VIMO 是综合管理后台，素材仅为其中一个模块；素材工作连接生产、采买、存储上线及售卖。[商业化 OnePage](https://bytedance.larkoffice.com/wiki/SZ4owd0z3igTRrkOrVqc0Q3Nn9d)覆盖资源位、订阅、权益转商与活动，VIMO 配置用于支持权益上线和售卖验证。个人工作归为四方向，不等同于平台完整模块划分。
- 通用批量：AI 特效批量新增是具体接入场景，关键建设是配置化的通用创建流程。旧方案需按素材类型开发步骤模板和上传适配，新类型可以复用导入流程；结果口径沿用前节，不补造使用量。
- 版权协作：[PRD](https://bytedance.larkoffice.com/docx/QcTodiQSzoGJuWx1tVPcI3dZnSf)确认合同录入与素材入库割裂，运营需二次绑定且无法直接核对授权，商务需要另行索取素材 ID。本人交付支持素材入库时选择合同、回填和校验授权，以及合同侧查看关联素材；导出和 PDF 留作辅助功能，不将主价值缩成合同范围收紧。
- 素材供给：[动转静 PRD](https://bytedance.larkoffice.com/docx/YrWYdxzPUonH9ExEIzHc0a22ndf)确认图片编辑静态文字模板不足，复用视频动态模板的静态产物补供给；VIMO 承接筛选、配置和发布。搬运背景是剪映、CapCut、醒图、Hypic 的效果覆盖不同，以已有素材补充其他产品或场景；概览仅说明 VIMO 侧跨业务、跨区和同区搬运能力，工程机制留第三部分。
- 权益预设与 AI 模板：预设包将用户常用功能、素材组合为一键应用效果，VIMO 提供运营配置、预览、审批及上下线，项目结果沿用约 0.5% 点击到付费转化率。AI 模板原有精细到模板 ID 的入口仅支持限免，无法设置积分价格；本人补齐按模板定价及表格批量配置、提审和结果查询，来源为[方案](https://bytedance.larkoffice.com/wiki/VQAiwwdkni9LHxkj2i2c5PiHn8d)。
- 海外审计：群 `oc_e625d81f754c86e7a1315cc82bc5d376` 的批量改价追查暴露低频接口日志遗漏；ROW 使用 VIMO 插件，US 因隔离及依赖成本采用天穹 Thrift 接入。起因消息 `om_x100b57218fefe8bcc35c8e42a062e10`、遗漏消息 `om_x100b5722ca568ca8c2bde0978603cc9`、ROW 查询说明 `om_x100b5491eb2a9490b3d14e4f580bf77`。用户本轮再次确认站点区分，覆盖旧的“国内外统一接入”概括。
- 数字资产：[鉴权 OnePage](https://bytedance.larkoffice.com/wiki/DSD5w38WrihGObkhWDCcuuXqnoc)确认人脸和版权形象创作因风险受限，账号级人工豁免既有越权风险，也难以规模化；按资产和授权判断创作权限。[后台录入 PRD](https://bytedance.larkoffice.com/wiki/X3LTwahfHiin0JkT85lcbyTmnjc)补充主动录入入口，减少依赖原安审申请链路。
- 数字资产使用方：小云雀为数字资产版权保护能力使用方。群 `oc_f396bef60441301b57085d1d232f6881` 于 9 月 21 日提供 `ppe_xyq_asset` 联调，相关[技术方案](https://bytedance.larkoffice.com/docx/LpygdmQaboIQNfxiL1rcHpPinGf)服务版权保护与创作者分成。概览可直接点名小云雀，不展开无助于阅读的限定；不将小云雀完整业务上线或收入归为个人交付。
- 部署分工与状态：主方案 revision 795 的海外部署表确认本人范围为 FaaS 事件消费、人脸 Embedding 服务、资产创建与授权查询事件及同步／异步鉴权日志消费；后端迁移和业务 RDS 属 BE。部署表尚未填写完成状态，周报仍记录模型部署与全链路构建计划，正文描述部署工作范围，不补写全部上线。
- 影响模块：第二部分的业务导语与十项代表工作；保留已有图片、画板、分栏比例及需求卡片。其它章节不改。

## 8. 待确认项

1. VIMO 官方定位已由素材 OnePage 补核；平台全量范围不在本轮重新盘点。
2. 主要业务线、运营人数、素材量和面板量。
3. 四个强候选的投入时间占比。
4. 通用批量的实际使用量与同口径耗时对比；商业化配置量及审计使用量。权益包本期转化结果已补核。
5. 数字资产海外部署完成时间与全链路验收结果；后台录入正式上线及业务使用情况。
