# R3｜OpenAPI 与 vimocli

> 历史核验资料，2026-10-13 整理迁入。身份、接口、使用量和版本状态适用各记录原日期，不能作为当日全量验证；写正文先核对最新来源。

> 来源任务：[转正答辩 R3｜OpenAPI 与 vimocli](codex://threads/01a05697-9a4c-7cd1-aaca-49780ed74b20)
>
> 最近核验：`2026-09-03`

## 1. 当前事实摘要

1. OpenAPI 和 vimocli 为用户、脚本、服务账号和 Agent 提供页面之外的 VIMO 操作入口。
2. 真实链路跨越领域 Service、OpenAPI contract、权限、BAM／IDL、组件后台网关、CLI API 层和语义命令。
3. 用户是该方向 Owner，投入覆盖资源权限、发布接口、风险分级、多站点统一身份、CLI 语义层、Skill 和交付流程。
4. 团队已有开放方向、初始 vimocli、codegen 和审批底座。用户负责本轮核心能力扩展和工程收口。
5. 2026-05-06～08-31，统计到 208 个去重调用身份、442,078 次已验签请求事件。
6. 该数据包含个人、服务账号和自动化，也可能包含最终返回 `403` 的请求。
7. CN／I18N 个人 JWT 和 CN 服务账号有真实 `200`；I18N 服务账号存在 `401`和验签后 `403`样本。

## 2. 业务、用户和真实调用链

### 业务用户

| 用户 | 需求 |
|---|---|
| 运营和研发 | 使用稳定命令查询、修改和发布 VIMO 资源 |
| 自动化脚本 | 使用机器身份和结构化输出批量执行 |
| 服务账号 | 脱离个人浏览器会话调用 OpenAPI |
| Agent | 使用 Skill 理解任务，再调用 vimocli 执行真实 contract |
| 其他业务服务 | 通过网关调用素材或商业化能力 |

### 原有问题

1. 直接复刻页面请求，需要每个脚本处理认证、站点和历史 DTO。
2. 接口权限只能判断能否访问 path，无法限制具体面板或素材类型。
3. BAM 接口名和内部参数不适合直接暴露给运营。
4. CN／I18N 的域名、bid、JWT、服务账号和 DTO 差异容易进入每个命令。
5. CLI、npm、tag 和 Skill 版本可能不同拍。

### 当前调用链

```text
业务需求
→ 领域 Service
→ OpenAPI contract
→ API 权限 + 资源权限
→ BAM／IDL
→ 组件后台网关或 direct Kani
→ vimocli generated API / hidden command
→ 手写语义命令
→ 用户／脚本／服务账号／Agent
→ 结构化结果、退出码和回读
```

### 能力域

```text
素材：查询、创建、更新、上传、屏蔽、分级、自定义字段
面板：版本、区域、分类、素材关系和发布
实验：草稿、层级、状态和资源包
管理：跨业务同步、权限、清理和运维
开放基础：鉴权、站点、业务线、PPE、输出、错误恢复
```

## 3. 用户的 Ownership

| 内容 | 用户职责 | 团队基础 |
|---|---|---|
| 资源权限与发布 | 方案、实现、审批规则、服务端校验和 CLI 承接 | 已有 OpenAPI 和权限申请底座 |
| P0／P1／P2 治理 | 风险分级、个人与服务账号差异、批量最高风险规则 | 飞书审批平台 |
| 多站点身份 | `OperationSpec`、站点 adapter、JWT／SA、错误引导 | 各站点已有服务和登录能力 |
| CLI 语义层 | 素材、面板、商业化等语义命令、精度保护和回读 | 初始仓库、codegen 和 API Client |
| Skill 与更新 | 统一 Skill 收敛、自更新、onboarding 资产 | 统一 Skill 最初由团队创建，后续多人维护 |
| 接入交付链 | OpenAPI → BAM → 网关 → vimocli → 测试发布的文档和实践 | ByteCloud、BAM 和网关平台 |
| 使用与验证 | TEA 口径、真实 CN／I18N 请求和错误边界 | 平台日志与数据系统 |

## 4. 已确认的技术判断

### 4.1 API 可达性与资源可操作范围分层

问题：拿到发布接口权限后，如果服务端只校验 path，调用者可能操作该接口覆盖的全部面板或素材类型。

选择：

```text
API 权限：fullPath + HTTP operation + bid
面板权限：sceneKey + add / modify / publish
素材权限：itemType + add / modify / publish
```

风险策略：

```text
P2 个人账号 → 自动开通
P2 服务账号 → 仍需审批
P1 / P0 → 审批
批量申请 → 按最高风险等级
```

边界：

1. 身份有效仍可能因接口或资源权限缺失返回 `403`。
2. 资源映射缺失、业务线不一致或 action 不匹配时不能自动放行。
3. 审批上下文在 Redis 保留 30 天；过期后不能仅凭表单重建授权。

### 4.2 generated 层保接口覆盖，手写层保用户语义

选择：

```text
BAM／IDL
→ codegen
   ├─ generated API
   └─ hidden command
→ 手写 material／panel／admin／experiment
   ├─ 语义参数
   ├─ 64 位 ID 精度保护
   ├─ 错误提示
   └─ 写后回读
```

边界：

1. codegen 成功不代表语义命令已经可用。
2. 新 contract 未经过业务语义设计时，hidden command 可以存在，公开命令不自动增加。
3. Skill 版本领先于 npm 时，Agent 可能读取到本地版本无法执行的命令。
4. 双层基础由团队早期建立，用户的增量集中在语义承接、自更新、Skill 收敛和多站点。

### 4.3 身份、站点与传输集中到 Operation contract

问题：每个命令分别判断域名、site、JWT、服务账号和 DTO，会造成协议差异扩散，也容易把不同原因的 `403`混在一起。

选择：

```text
OperationSpec
└─ targets
   ├─ cn
   │  ├─ routeType
   │  ├─ authMode
   │  ├─ service / path / bid
   │  └─ request / response adapter
   └─ i18n
      └─ 站点配置独立
```

类型约束：

```text
gateway → gateway_db
direct  → direct_kani
```

身份规则：

1. 个人 JWT 使用 `x-jwt-token`。
2. 服务账号使用 `Authorization: Bearer`。
3. 无效 JWT 不能回退浏览器 CAS，避免调用主体改变。
4. PPE 额外叠加泳道 header。

边界：站点框架支持不代表每个站点的所有服务账号已经授权。

### 4.4 开放能力交付链需要版本一致性

当前真实对象：

```text
领域 Service
→ IDL/BAM 版本
→ 组件网关配置
→ vimocli API/command
→ npm 版本
→ Skill 文档
→ Agent 运行环境
```

当前快照存在 `main/npm/tag/Skill`不同拍。Tag 驱动发布和自动同步有候选 MR，当时未合入，不能写成已经解决。

## 5. 结果、数据和口径

### TEA

```text
事件：call_open_api_vimocli
区间：2026-05-06～2026-08-31
CN：project 30808592，Asia/Shanghai
I18N：project 303503，UTC
```

| 指标 | 结果 |
|---|---:|
| 合并去重 uid | 208 |
| 总 PV | 442,078 |
| CN uid / PV | 136 / 312,752 |
| I18N uid / PV | 119 / 129,326 |
| PV ≥ 10 | 136 uid |
| PV ≥ 100 | 74 uid |
| PV ≥ 1000 | 30 uid |

限制：uid 可能是个人、服务账号或自动化；PV 是已验签事件，可能最终返回 `403`。

### 真实请求

| 场景 | 结果 | 结论 |
|---|---|---|
| CN 个人 JWT | `200`，body `[]` | 个人身份链路可用 |
| I18N 个人 JWT | `200`，返回 8 个区域配置 | I18N 个人链路可用 |
| CN 服务账号 | `200` | 所测 SA 已授权 |
| I18N 服务账号 A | `401` | secret 或身份配置不完整 |
| I18N 服务账号 B | 验签后 `403 No permission` | 身份成立，目标 API 权限未开 |
| 商业化路径无 JWT | `401 Authorization Failed` | 网关鉴权前置生效 |

### 版本快照

| 对象 | 快照 |
|---|---|
| `vimocli/main` | `0.2.39` |
| bnpm `latest` | `0.2.40` |
| 远端 Git tag | 最高约 `v0.2.27` |
| 统一 vimocli Skill | `1.0.52`，累计下载 880，近周 108 |
| onboarding Skill | `1.0.0`，累计下载 7 |

下载量只能证明资产被获取。

## 6. 代码、MR 和文档证据

### 文档

| 证据 | 说明 |
|---|---|
| [开放能力 OnePage](https://bytedance.larkoffice.com/wiki/Wl8ZwjRtBiwePUkdEEIcm501nNe) | 团队背景和早期方向 |
| [OpenAPI 新增发布及细粒度鉴权](https://bytedance.larkoffice.com/wiki/OFHCwjV2ni0WxEks5jacSp15nAf) | 资源权限和发布方案 |
| [OpenAPI／CLI 接入文档](https://bytedance.larkoffice.com/wiki/US3uwQ8XtiVtlWkgYItcg5qpnfe) | BAM、IDL、网关和 CLI 交付链 |
| [多站点与统一身份设计](https://bytedance.larkoffice.com/docx/R8t8d6pWSo0hCFxXPj0c0XcCn2b) | Operation 和身份决策 |
| [统一鉴权与模板业务接入](https://bytedance.larkoffice.com/docx/AujUd8fZuo9UeUxhDLccoWzOnpg) | 中间件和验证边界 |
| [vimocli 快速接入](https://bytedance.larkoffice.com/wiki/GbcNwsuAzivvMakKOcxcuBBDnKc) | 接入与 release 约定 |
| [vimocli 技术总结和规划](https://bytedance.larkoffice.com/wiki/J5MTwCCDAiMkMMkga4ccUVZRnBf) | 整体设计和当前风险 |

### MR

| 证据组 | MR |
|---|---|
| 资源权限与发布 | [tool_platform 2665](https://code.byted.org/ies/tool_platform/merge_requests/2665) · [2744](https://code.byted.org/ies/tool_platform/merge_requests/2744) · [2900](https://code.byted.org/ies/tool_platform/merge_requests/2900) |
| 商业化开放 | [tool_platform 2708](https://code.byted.org/ies/tool_platform/merge_requests/2708) · [3011](https://code.byted.org/ies/tool_platform/merge_requests/3011) |
| CLI 增量 | [vimocli 32](https://code.byted.org/ies/vimocli/merge_requests/32) · [39](https://code.byted.org/ies/vimocli/merge_requests/39) · [65](https://code.byted.org/ies/vimocli/merge_requests/65) |
| 未合入候选 | [vimocli 47](https://code.byted.org/ies/vimocli/merge_requests/47) · [48](https://code.byted.org/ies/vimocli/merge_requests/48) |

### 真实代码落点

```text
tool_platform/apps/material/idls/ies_vimo_material_web.thrift
vimo_platform_cn/apps/videocut/bam.config.json
vimo_platform_cn/apps/videocut/idls/vimo.commercialization.openapi.thrift
```

BAM 核验快照：

```text
ies.vimo.material_web：1.0.103，61 个方法
vimo.commercialization.openapi：1.0.2，1 个方法
```

## 7. 新增变化

### 2026-10-07：核对开放基础设施与客户端关键设计

- 时间：本次核对于 2026-10-07 完成；以下为当前主干实现，不以核对日期代替功能交付日期。
- 业务问题：答辩正文对资源权限、公共身份组件、客户端协议适配和观测的说明偏重功能，缺少真实约束及处理机制。
- 我的职责：开放能力与 vimocli 方向 Owner；本次补充负责范围内已实现设计的证据，不扩大为网关或凭证签发平台的建设。
- 当前状态：只读核对远端主干源码，未修改业务仓库，未执行生产写请求。本记录证明代码机制，不新增线上可用性或收益结论。
- 核对基线：tool_platform master `1ad9e61efa07dcafc2ed1637c2d1726cfcdd9fb8`；vimocli main `6cb9f11f5db734dc777deba0a3aeab5c76d17878`。

| 设计 | 问题与技术判断 | 已核实机制及边界 | 主干代码证据 |
| --- | --- | --- | --- |
| 面板发布的业务表达 | 调用方知道要发布哪些素材或分类，不应各自计算内部变更集合 | 服务端读取待发布变更，匹配素材及关联分类、强插列表等，补充版本信息后复用既有发布能力。OpenAPI 对没有待发布变更的指定素材采用严格校验；不据此推导所有并发风险已经消除 | tool_platform：`apps/material/api/lambda/openapi/v1/panel/publishByMaterialIds.ts`、`publishByCategoryIds.ts`、`apps/material/api/service/scene/publish.ts` |
| 批量素材资源权限 | 请求传入素材 ID，授权却按业务线、素材类型及操作配置；不能信任调用方填写的类型 | 回查全部素材实体，校验存在性及业务线，汇总真实类型，逐类型校验发布权；所有授权检查通过后才调用批量发布。这是执行前授权检查，不等于发布事务原子成功 | tool_platform：`apps/material/api/lambda/openapi/v1/material/batchPublishMaterials.ts`；本地补充核对 `apps/material/api/service/material.ts`、`apps/material/api/middleware/checkResourcePermission.ts` |
| 身份中间件 | 个人 JWT 不带浏览器会话，必须接入存量登录链路，同时保持原业务授权 | 先验签后按可信签发方分类。普通接口个人身份接回 Kani；正式 OpenAPI 要求网关身份及开放授权。内部可信状态在验证后写入，不能由客户端调用模式声明替代。无效 JWT 不回退会话 | tool_platform：`packages/vimo_auth_plugin/src/identity/index.ts` |
| 浏览器凭证工具 | 测试页和 Agent 可复用已有登录态，各自实现缓存、刷新会重复维护 | ByteCloud 签发；工具按站点在内存缓存，在使用时检查有效期，距到期不足 60 秒则重新获取。封装的业务请求收到 401 后强制获取并最多重试一次。登录失效交还业务入口；取得凭证不赋予业务权限 | tool_platform：`packages/vimo_utils/src/browser/cloudJwt.ts` |
| 多协议客户端 | 素材 OpenAPI 与已有后台接口的路由、身份、参数包装及返回结构不同 | 操作定义分别选择站点、路由、鉴权与请求响应适配；领域保留协议及重试，公共层复用请求能力。BAM 生成仅覆盖对应接口，不概括为所有系统经过同一生成链 | vimocli：`src/api/endpointOperation.ts`、`src/console/client.ts`；本地补充核对 `src/cli/commands/material/panel.ts` |
| 调用观测 2.0 | 原服务端事件看不到其他系统调用，也不能独立代表 CLI 使用 | 每次命令有独立上下文；每次实际 HTTP 发送一条事件。请求开始固定真实目标站点及操作者，响应被业务读取时采集，从响应头取 LogID，不提前消费响应流。队列最多 1000 条或 2 MiB，退出最多等待 1.5 秒；未获发送确认不自动补发，避免重复计数，不改变业务结果。入参和返回各限 32 KiB，仅裁剪观测副本 | vimocli：`src/api/request.ts`、`src/api/reporting/session.ts` |
| CLI 与 Skill 自更新 | 旧进程安装新包后仍执行旧同步器；直接使用包管理器升级又不会经过旧 CLI 回调 | 新包全局安装生命周期执行新版同步逻辑，校验实际匹配与更新结果；新进程运行时补偿安装脚本未执行或同步失败。CLI 与 Skill 分别节流。未安装 Skill 时跳过；Skill 同步失败不阻断安装。自动重跑受平台支持限制，不表述为所有平台保证 | vimocli：`scripts/postinstall.cjs`、`src/self/auto-upgrade/skill-sync.ts`；故障背景见仓库 `docs/ai/gotchas.md` |

结果与口径：补充机制证据，不新增用户数、提效比例、任务成功数或线上验证数据。客户端上报用于使用分析及调用定位，不承担完整审计；长载荷完整回查仍有接收端截断限制。

影响模块：正文与逐字稿的 3.1.3、3.1.4。3.1.5 的多产物发布保留已有展开，本次只核对章节职责与衔接。


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

### 2026-10-08：接入流程与新增展示证据

- `vimo-openapi-onboarding` 当前保存跨服务 OpenAPI 的接入要求，覆盖目标服务、IDL/BAM、网关路由、权限与 CLI 承接；不能将其名称替换到原有六阶段流程上，并据此认定内容相同。来源：本机同名 Skill。
- [VIMO CLI 快速接入方案以及步骤](https://bytedance.larkoffice.com/wiki/GbcNwsuAzivvMakKOcxcuBBDnKc) revision 309 分别说明国内外个人 JWT 接入、原 Kani 授权、命令适配及用户 Skill。模板预览是说明接入步骤的假设示例，不作为新增上线案例。
- 用户补充的调用看板截图显示 10 月 1 日至 7 日数据，上排为客户端模块、下排为服务端接口，标明客户端含联调事件；只用于证明看板及观测维度，不并入 Q3 使用量。

### 2026-10-07：业务案例与 Q3 使用明细

本次按答辩文档内批注核对案例、图片和接入方记录；以下用于替换旧使用窗口，不新增生产写操作验证结论。

| 对象 | 已核实事实 | 证据与边界 |
| --- | --- | --- |
| Q3 使用排行 | 313 个账号，调用次数合计 608,126；109 个账号不少于 100 次；49 个账号活跃不少于 10 天，其中 11 个不少于 30 天 | [Q3 用户使用排行](https://bytedance.larkoffice.com/wiki/M0HswXOzMimQFlkCnjVcFNBMn8g)，底层文档 revision 18。过滤 7 次重复表头后按账号行汇总。账号包含个人与服务账号，未从该表取得国内外拆分，不把请求数作为任务成功数 |
| AIGLE | 特效团队服务账号（用户确认）。Q3 266,573 次调用、83 个活跃日；含素材创建 360 次、上传 3,255 次、面板/分类 208,582 次 | 同上；创建接口次数不等于成功素材数，面板/分类次数也不等于上面板素材数。创建至上面板的同一批素材回读和稳定生产数量仍待补 |
| 批量查询 | 运营查询约 150 个老特效 key 的上下线状态；已有 Agent 结果表和“看起来没问题”反馈 | 当前答辩文档中两张原图；保留原资源并补原生 caption |
| 分类关系调整 | 一万多个素材从贴纸各区域 love 分类移除；原指南记录人工 1 天、AI 15 分钟 | [原始案例](https://bytedance.larkoffice.com/docx/PcejdMrPnoLfmGxWac3cxVKgnIc#GekLdn4gCshpKJbUIDYckt0inEe)；图片资源 NIb1bS4LNotFTsxahZkcM5Qsnbg。仅对应此次任务，不外推平均提效 |
| 分级维护 | 近 200 条配置需批量补充主题色；海外人工操作一条约 15–20 秒，为群中广州工区实测反馈。修复后业务反馈测试未再发现原问题；更新为覆盖语义，需保留原字段 | 群 oc_4c00bf33514d3ad8fa530c34eafe654d，position 16、24、34–42、45。后续存在配置及回滚讨论，不写成全量无误完成，不计算未经确认的总节省时间 |
| 素材类型配置 | 研发提出新增素材类型的自定义参数配置需求，回复已支持全部配置的 OpenAPI 操作 | 用户贴入正文的对话与两张图片。对外开放完整新增类型 AI 流程后来未继续推进；不能把配置接口交付写成完整流程落地 |
| 云端 Agent | 王杰团队复用已有登录态换取 ByteCloud JWT 的实现与文档；另补生产网配置以便沙箱调用 CLI | 群 oc_3be4d935bdd86a5c10d2da341effc6ee，8/10 凭证方案、8/13 NETWORK_PROFILE 支持；[素材 Agent 方案](https://bytedance.larkoffice.com/wiki/OlMuwebo7idB2kkceUNcgQzPn2c)。接入记录不等于全量生产验证；不保存聊天中的凭证 |
| Q&A Agent | 商业化 RD/QA 提出测试态准备需求；群中已有预览策略工具调用，8/20 提出 DID/UID 覆盖问题并回复调整为追加语义 | [需求文档](https://bytedance.larkoffice.com/docx/GvGidvHCoo8w52xvXBYckY4anKc)，群 oc_b1e12a462bcff313e695aa702de84490 position 277–278、297–300。可确认接口已进入实际调用；不能据此将文档全部 P0/P1/P2 能力写成上线 |
| Devharness | E2E 阶段受手动个人登录影响，会议讨论服务账号与预置凭证接入 | [9/29 会议纪要](https://bytedance.larkoffice.com/docx/UnwVdIdW8okcb4xUtS8c18bgnKh)。接入推进中；15 个需求为下季度目标，不能当已完成结果 |
| GrowAI | 用户确认用于 Oncall，正文保留原始链接预览 | 具体任务及调用结果待补；原只读 URL 预览块 RZY9dIhFuoz6RsxvX10cfixcnCh 需要移动保留，不能重建或删除 |

2026-10-08 补充：用户在飞书中将王杰团队的接入方名称明确为“Capcut运营Agent”，并补充 Q&A 工具查询测试权益的截图。截图展示目标资源与权益类型的回读结果，仅作为该次查询证据，不扩展为全部测试态功能已完成。正文与逐字稿跟随最新名称；用户删去的引用和占位不恢复。

2026-10-08 接入方补核：[Grow AI 项目记录](https://bytedance.larkoffice.com/docx/Tjqldh9UKok2OSxtSh3crLLkneb)的 Q3 小结包含 Vimo 活动 MCP 工具，能力表明确用途为收集 Vimo 运营活动信息。结合用户确认的 Oncall 用途，可描述为向告警与排查流程补充活动信息；不归属 GrowAI 的告警框架或其他工具建设。用户新增的商业化后验证截图显示 VIMO 平台授权入口及“已授权”状态，不能据此宣称无人值守服务账号方案或完整 E2E 已验证成功；接入方名称沿用用户最新的“商业化后验证”。

## 8. 待确认项

1. 208 个 uid 中个人、服务账号、自动化和复用团队的拆分。
2. I18N 服务账号的目标授权范围和 `403`处理状态。
3. main、npm、tag、Skill 不同拍是否发生过真实故障。
4. 当前 release Owner、发布卡口和回滚责任。
5. 可量化的人工步骤或接入耗时变化。
