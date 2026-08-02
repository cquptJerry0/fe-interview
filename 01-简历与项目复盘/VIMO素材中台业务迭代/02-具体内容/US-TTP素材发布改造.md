# Vimo US-TTP 素材发布改造

> 状态：初步草稿。当前用于沉淀简历主干、事实证据和待确认指标，不作为最终简历正文。

## 一、项目定位

面向 Project Texas 合规要求，Vimo 素材配置需要由 ROW 直接发布，调整为经过预发布与可信审批后生效的多阶段发布体系。本次改造的主要工作是重构发布状态与版本一致性，并解决 US-TTP 运行环境中内部依赖不完整带来的持续交付问题。

背景文档：[US-TTP 部署与合规背景](https://bytedance.larkoffice.com/wiki/Y5Ifw1KGNiw7fAkI80HcQEdVnsf)

当前叙事主线：

```text
合规约束改变发布模型
        ↓
多阶段发布产生事务、并发与版本一致性问题
        ↓
Draft / Pre / Approval / Prod 状态模型
        ↓
Redis / Abase Diff 缓存需要表达多版本关系
        ↓
目标机房依赖不完整，需要标准化兼容与构建机制
```

## 二、简历版初稿

### 参与项目：Vimo US-TTP 素材发布链路改造

简介：面向 Project Texas 合规要求，将素材配置由 ROW 直接发布重构为经过预发布与可信审批后生效的多阶段发布体系，并完成 US-TTP 依赖兼容与构建链路适配。

核心贡献：

1. 设计 `Draft → Pre → Approval → Prod` 发布状态机，通过事务、行锁、审批人快照、状态条件更新与版本冲突校验，保证 Pre 数据、审批单和 Prod 一致流转，治理重复审批、过期版本发布及链路半成功问题。

2. 重构 Redis / Abase 多版本 Diff 缓存模型，将业务线、面板、区域、Draft / Prod 版本、对比环境、目标版本及操作人信息开关编码进缓存 Key；结合源内容指纹、发布前完整 Diff MD5 校验及大对象分块存储，避免旧缓存命中、页面 Diff 失真和错误版本提交。

3. 建设 US-TTP 依赖兼容与本地化构建机制：以 `package.json` 与 TTP 依赖基线进行版本 Diff，自动查询 us-ttp Luban；对缺失版本执行本地 `npm pack`、tgz 归档、依赖映射及 `pnpm.overrides` 更新，并在 OCI 构建阶段自动替换。当前覆盖 29 个内部依赖，将依赖查询、打包、映射维护和构建验证等多步人工流程收敛为一条命令。

## 三、项目真正难在哪里

### 1. 发布链路最怕留下半成功状态

原链路只有 Draft 与 Prod，发布动作可以直接推进正式版本。加入 Pre 和 Approval 后，一次发布同时涉及候选版本、审批记录、正式版本、版本快照和操作历史。如果这些对象分别提交，任何一步失败都可能留下“Pre 已更新但审批单不存在”或“Prod 已更新但审批状态仍为 Pending”的脏状态。

当前方案拆分了两类边界：

```text
事务内：
Pre / Prod 核心数据
审批状态
版本快照
操作历史

事务提交后：
分类回写
Diff 缓存清理
其他不可随数据库回滚的副作用
```

审批阶段对审批单、Pre 和 Prod 加行锁，并校验审批状态、审批人快照与版本关系；审批状态更新附带预期状态条件，避免并发操作重复推进同一张审批单。

### 2. Diff 缓存失效来自对比目标变化

加入预发布后，页面比较对象由固定的 `Draft vs Prod` 变为动态的 `Draft vs Pre / Prod`。只按面板维度缓存 Diff，会在 Pre 或 Prod 版本推进后继续命中旧结果，导致页面展示与实际版本不一致，甚至携带旧 Diff 提交发布。

当前缓存模型将以下上下文编码进 Key：

```text
bid
sceneKey
areaKey
draftVersion
prodVersion
targetEnv
targetVersion
needUpdator
```

缓存值额外保存源内容指纹。即使 Key 命中，只要 Draft 或目标内容的指纹不一致，也会重新计算 Diff。发布阶段不直接信任页面缓存，而是重新计算完整 Diff MD5；请求携带的 MD5 与最新结果不一致时拒绝发布。

针对超过 500KB 的 Diff，数据会被拆分为多个 Redis / Abase 分块，并保存分块数量、原始大小和 MD5 元数据；读取时重新组装并校验完整性，写入失败时回滚已落下的分块。

### 3. TTP 环境缺失依赖会持续阻塞迭代

US-TTP Luban 并不具备 ROW 环境中的全部内部 npm 包。单次手工补包只能解决当前构建，后续依赖新增或版本升级仍需重复查询、安装、打包、重命名和维护映射，容易在 SCM 构建阶段暴露缺包问题。

依赖兼容链路被收敛为：

```text
package.json
    ↓ 版本 Diff
TTP_DEPS_MAP baseline
    ↓
查询 us-ttp Luban
    ├── 已存在：无需本地化
    └── 不存在：emo i → npm pack → tgz 归档
                              ↓
              更新依赖映射与 pnpm.overrides
                              ↓
                    BUILD_REGION=oci 自动消费
```

Skill 负责定义使用入口和判断流程，`sync.sh` 执行差异分析、包查询、本地打包与映射更新，`pre-ttp-deps.js` 在 OCI 构建阶段消费最终映射。

## 四、已确认事实与证据

| 结论 | 证据 | 当前状态 |
|---|---|---|
| 素材发布状态机、审批与 Diff 链路 | [tool_platform !2302](https://code.byted.org/ies/tool_platform/merge_requests/2302) | 已合入；64 个非合并提交中 62 个由本人提交 |
| Pre 数据与审批单共用事务 | `apps/material/api/service/scene/publish.ts` | 代码已确认 |
| 审批行锁、状态和版本校验 | `apps/material/api/service/scene/approval.ts` | 代码已确认 |
| 多版本 Diff Key、源内容指纹和分块存储 | `apps/material/api/service/scene/diff/genDiff.ts` | 代码与单测已确认 |
| 发布前完整 Diff MD5 校验 | `apps/material/api/service/scene/diff/index.ts` | 代码已确认 |
| TTP 依赖同步脚本与 Skill | [tool_platform !2515](https://code.byted.org/ies/tool_platform/merge_requests/2515) | 已合入，CI 通过 |
| 当前依赖映射覆盖规模 | `scripts/pre-ttp-deps.js` | 29 个内部依赖 |
| Material TTP 专属 CAS、Kani、TCC 与插件配置 | `apps/material/api/config/*.us-ttp.ts` | 代码已确认 |
| Material 单测、隐私合规与主流水线 | !2302 Check Runs | 门禁通过；单测 261 个，Diff Line Coverage 71.71% |

说明：代码量、提交量和测试数量用于证明参与深度，不建议直接作为简历收益。

## 五、时间线

| 时间 | 阶段 | 主要内容 |
|---|---|---|
| 2026.03-04 | 可信发布链路 | 预发布、审批、版本 Diff、事务一致性、缓存与降级治理 |
| 2026.04 | TTP 依赖工程化 | 依赖预处理、tgz 本地化、自动同步脚本与 Skill |
| 2026.06 | 合规出网补充治理 | Material BFF 3PG、Python / FaaS Mesh Egress，暂不进入本项目简历主干 |

## 六、待补充的量化结果

当前可以安全使用：

1. 覆盖 29 个内部依赖。
2. 将版本核对、包查询、本地打包、映射更新与构建验证等约 5 个手工环节收敛为一条命令。

仍需确认：

1. 改造前一次依赖新增或升级平均耗时。
2. 改造后运行工具并检查结果的平均耗时。
3. 实际发生过多少次依赖新增或版本升级。
4. 覆盖多少业务线、面板或审批发布场景。
5. 是否有真实 USDS 使用记录、发布次数或线上故障数据。

人效计算口径：

```text
单次节省时间 = 改造前耗时 - 改造后耗时
累计节省人时 = 单次节省时间 × 实际依赖迭代次数
```

没有真实数据前，不在简历中填写百分比或节省人日。

## 七、事实边界

可以描述为个人贡献：

1. Material 可信发布链路的核心实现。
2. 事务、审批并发、版本 Diff 与 Redis / Abase 缓存治理。
3. Material TTP 配置、依赖兼容脚本及 Skill。

只能作为团队背景：

1. Project Texas 整体合规要求。
2. ROW、VPC2、US-TTP 三层系统边界。
3. 整体代码分仓、DES / DECC 数据同步和全部 TTP 基础设施。

暂不能描述为结果：

1. 所有 TTP 流量已经完成线上切换。
2. 所有第三方请求均无 NAT 泄漏。
3. 审批或依赖工具节省了确定比例的人效。

## 八、暂不进入简历的追问池

以下内容具备技术价值，但当前放入简历会稀释主线：

1. Material BFF 的 `HTTPClient` 统一 3PG 出口拦截、ZTI 与敏感 Header 清理。
2. Python / FaaS 子流程绕过 Node 代理后的 Mesh UDS 与四 Header 改造。
3. 3PG fail-closed 与业务连续性 fallback 的取舍。
4. HTTP 层最终降级与服务内部主动降级的边界。
5. 商业化 US-TTP 审计与 API 敏感级别映射。
6. 提交后副作用进一步演进为 Outbox、幂等重试和补偿机制的可能性。

这些内容后续可拆成项目追问页，不与当前三条简历主干并列。
