# R1｜TTP 预发与合规发布

> 来源任务：[转正答辩 R1｜TTP 预发与合规发布](codex://threads/01a05696-b1dc-77b2-a3e5-64e699ea73ac)
>
> 最近核验：`2026-09-03`

## 1. 当前事实摘要

1. 原链路允许 ROW 运营将 US 内容直接写入 Prod，不符合最终写入发生在 TTP 的合规要求。
2. 改造引入 Draft、Pre、Prod 和审批单。ROW 提交 Pre，TTP 可信审批员执行最终晋升。
3. 用户是项目 Owner，负责主要工程落地、TTP 环境接入、风险修复、评审收口、测试和主干交付。
4. 团队确定合规目标，导师参与总体模型和第一版基座。答辩中需要说明这段协作，但不弱化用户的 Owner 角色。
5. 2026-03-27 跑通 ROW PPE → US TTP 在线审批；2026-04-10 MR 2302 合入主干。
6. 当前缺正式审批量、发布量和长期线上运行数据。

## 2. 业务、用户和真实链路

### 用户

| 角色 | 职责 |
|---|---|
| ROW 运营 | 编辑 Draft，提交 US 候选版本 |
| TTP 可信审批员 | 查看 Pre 相对 Prod 的 Diff，执行最终晋升 |
| 素材运营和研发 | 处理发布配置、权限、失败和版本问题 |
| 客户端 | 只读取 Prod，不直接消费 Pre |

### 原链路

```text
ROW 运营修改 Draft
→ ROW 服务直接发布 Prod
→ US 客户端读取
```

风险：最终写入位置和操作者不满足合规要求，候选版本和正式版本缺少独立审计锚点。

### 当前链路

```text
ROW 运营修改 Draft
→ 提交 Pre
→ Pre + Pending 审批单在同一本地事务提交
→ 跨区同步到 TTP
→ 可信审批员查看 Pre vs Prod Diff
→ 锁定审批单、Pre、Prod
→ 校验审批状态和版本
→ Pre 晋升 Prod
→ 审批历史、分类回写、MQ 和缓存清理
→ 客户端读取 Prod
```

## 3. 用户的 Ownership

| 动作 | 已确认内容 |
|---|---|
| 定义与承接 | 接住团队合规目标和初版模型，把需求拆进前端、Node、审批、Diff 和 TTP 环境 |
| 决策 | 明确事务所有权、版本校验、Diff 缓存身份和 TTP 分级降级边界 |
| 推动 | 推进依赖包、TCE、TLB、TCC、Kani、US 同学协测和审批链路 |
| 实现 | MR 2302 中承担主要后续 Commit 和多轮版本收口；另有 MR 2534 收敛发布权限 |
| 验证 | 创建自测、协测、操作和部署问题文档，跑通真实 TTP 控制面 |
| 收口 | 处理大量 Review、旧业务线兼容、旧 Diff、事务锁和提交后副作用 |

团队基础：

1. 合规目标和 TTP 最终写入原则由团队确定。
2. Draft／Pre／Prod 总体模型和第一版 WIP 有导师投入。
3. 团队协助评审、单测、构建和环境资源。

推荐事实口径：用户是本轮项目 Owner，团队提供合规目标和初版基座，用户负责把方案推进到真实 TTP 和主干交付。

## 4. 已确认的技术判断

### 4.1 用状态晋升约束最终写入

问题：只在 ROW 页面补审批无法改变最终写入主体。

选择：

1. ROW 提交阶段使用本地事务保存 Pre 与 Pending 审批单。
2. TTP 审批阶段在一个事务内校验并完成 Pre → Prod。
3. 跨区同步保持最终一致，TTP 侧依靠版本校验确认 Pre 已到达。

关键机制：

```text
新 Pre 版本 = max(preVersion, prodVersion) + 1
Pre.version == Approval.version
Prod.version >= Approval.version 时拒绝晋升
审批更新要求 expectedStatus = Pending
审批人使用发起时快照
```

边界：

1. ROW 与 TTP 之间没有分布式事务。
2. “同一面板单 Pending”主要靠应用层顺序覆盖；数据库索引包含版本，不能宣称严格全局唯一。
3. Reject 只有枚举，缺正式接口、UI、通知和审计流程。
4. 分类回写、MQ 和缓存清理发生在数据库 Commit 后，失败不能回滚核心状态。

### 4.2 Diff 缓存绑定真实比较目标

真实问题：引入 Pre 后，页面可能比较 Draft vs Prod、Draft vs Pre、Pre vs Prod。旧缓存键没有区分目标环境和版本，连续 Pre 会读到第一次的旧 Diff。

最终缓存身份包含：

```text
biz
+ sceneKey
+ areaKey
+ draftVersion
+ prodVersion
+ targetEnv
+ targetVersion
+ needUpdator
```

同时补充分块元数据、MD5 校验、失败回收和发布后清理。

边界：

1. 该改造解决比较上下文缺失导致的旧 Diff 风险，没有性能收益数据。
2. Diff Service 实例字段仍有并发上下文风险；2026-08-26 有隔离修复分支，当时未合入主干。

### 4.3 TTP 主链路和辅助能力分级处理

真实环境遇到：BAM/npm 包、Kani、TCC、TQS、OneService、ABase2、地区树和 ByteBench 等依赖不完整。

选择：

1. 本地化必要依赖并增加 TTP 环境配置。
2. 审批入口、审批提交和 Pre → Prod 保持硬失败。
3. 地区树、列表补充信息等辅助能力允许显式 fallback。
4. fallback 收敛到 API middleware，避免散落在前端。

边界：

1. fallback 保住可用性，不代表 TTP 与 ROW 功能完全等价。
2. 通知、Tea 和 Argos 等能力关闭会削弱观测。
3. 本地 tgz 解决构建问题，同时增加版本维护成本。

## 5. 结果、数据和口径

| 结果 | 口径 | 可证明 | 不能证明 |
|---|---|---|---|
| ROW PPE → US TTP 在线审批 | 2026-03-27 真实控制面联调 | 跨环境主链路可跑通 | ROW 正式流量长期稳定 |
| MR 2302 合入 | 2026-04-10，124 文件、64 Commit、111 个 MR 版本 | 工程交付和评审收口 | 业务已经规模使用 |
| 自测覆盖 | 发布、连续 Pre、审批、权限、地区／面板、自动分发等九类 Case | 主要状态和权限链路有验证 | 全部预期都已在线运行 |
| 发布权限加固 | MR 2534 于 2026-04-27 合入 | 素材／面板发布权限进一步收敛 | 原方案已经覆盖全部权限风险 |

当前优先使用正确性、合规风险和工程交付，不写效率百分比。

## 6. 代码、MR 和文档证据

| 证据 | 能证明 | 不能证明 |
|---|---|---|
| [VIMO TTP 业务合规常态化改造 One Page](https://bytedance.larkoffice.com/docx/VSI3ds489oonomxsdMHcE5aPnog) | 合规目标和 ROW／TTP 边界 | 用户的全部个人贡献 |
| [素材面板 TTP 改造方案](https://bytedance.larkoffice.com/wiki/AoNUwyhVXiG4Sckck2WcoH22nyc) | 状态、配置和方案演进 | 每项设计的最初提出者 |
| [MR 2302](https://code.byted.org/ies/tool_platform/merge_requests/2302) | 代码范围、评审、Commit 和合入 | 业务使用规模 |
| [前端自测](https://bytedance.larkoffice.com/wiki/NBFewcrZPiuFFWkQrDJcyuW4ntc) | 测试 Case 和部分实际记录 | 正式生产验收 |
| [协助测试步骤](https://bytedance.larkoffice.com/wiki/N597wwUP5in0pykw8C9cgmucnFg) | ROW 与 TTP 协测方法 | 正式流量 |
| [操作文档](https://bytedance.larkoffice.com/wiki/CiBLw7j6liYMxmkiswjcUcpbnie) | 运营和审批操作 | 实际审批量 |
| [TTP 部署问题记录](https://bytedance.larkoffice.com/wiki/CN6fwn2VuiRJzOk3Xftcd009nJX) | 真实环境依赖和故障 | 所有问题长期关闭 |
| [108 业务线 Pre 失效复盘](https://bytedance.larkoffice.com/wiki/DfhowBdhdi0fuLkz6kRcOQwNniP) | 旧组件和配置断链 | 原因归属 |
| [MR 2534](https://code.byted.org/ies/tool_platform/merge_requests/2534) | 发布最小权限加固 | TTP 总体方案 |

关键代码：

```text
apps/material/api/service/scene/publish.ts
apps/material/api/service/scene/approval.ts
apps/material/api/service/scene/diff/genDiff.ts
apps/material/api/service/scene/diff/index.ts
apps/material/api/middleware/usTtpFallback.ts
apps/material/api/utils/usTtpFallback.ts
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

1. ROW 正式环境是否完成过完整发布回读，能否提供审批单、版本或 LogID。
2. 正式审批量、发布量、覆盖业务线和审批角色。
3. Commit 后分类回写失败时的实际恢复方式。
4. Diff 并发上下文隔离分支未合入的原因和当前风险。
