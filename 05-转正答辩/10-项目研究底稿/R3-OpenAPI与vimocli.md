# R3｜OpenAPI 与 vimocli

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

1. 208 个 uid 中个人、服务账号、自动化和复用团队的拆分。
2. I18N 服务账号的目标授权范围和 `403`处理状态。
3. main、npm、tag、Skill 不同拍是否发生过真实故障。
4. 当前 release Owner、发布卡口和回滚责任。
5. 可量化的人工步骤或接入耗时变化。
