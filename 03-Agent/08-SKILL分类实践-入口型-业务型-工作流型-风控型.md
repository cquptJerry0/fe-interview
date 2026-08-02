# SKILL 分类实践：入口型 / 业务型 / 工作流型 / 风控型

## Part 1｜技术讲解

### 1. 一句话结论

SKILL 按职责可以分成四种类型：**入口型**管全局上下文、**业务型**管对象操作、**工作流型**管状态流转、**风控型**管高危操作。分清类型才能写对 SKILL 的侧重点。

### 2. 四种 SKILL 类型总览

| 类型 | 核心职责 | 重点写什么 | 代表例子 |
|------|---------|-----------|---------|
| **入口型** | 全局上下文、认证、参数 | 共享配置、子能力路由 | vimocli 总入口 |
| **业务型** | 对象的 CRUD + 语义映射 | 用户意图→操作映射、业务坑 | vimocli-material |
| **工作流型** | 多步骤状态流转 | 状态机、中间 ID、前置条件 | vimocli-experiment |
| **风控型** | 高危操作的风险控制 | 确认、预览、备份、回滚 | vimocli-admin |

---

### 3. 入口型 SKILL

**特点**：不直接做业务，负责初始化全局上下文和路由到子能力。

**以 vimocli 总入口为例**：

```yaml
name: vimocli
description: |
  vimo 平台 CLI 工具总入口。
  负责认证、业务线切换、站点选择、输出格式控制。
  具体业务操作请路由到子 SKILL：素材用 vimocli-material，实验用 vimocli-experiment，管理用 vimocli-admin。
```

```markdown
# vimocli 总入口

## 初始化（任何操作前必须先完成）

1. 认证：`vimocli auth login`
2. 选择业务线：`vimocli biz set --name {bizName}`
3. 选择站点：`vimocli --site {site}` （可选，默认当前站点）

## 全局参数

- `--json`：输出 JSON 格式（脚本友好）
- `--raw`：输出原始 API 响应（调试用）
- `--site {site}`：指定站点（覆盖默认值）

## 子能力路由

| 用户说 | 路由到 |
|-------|--------|
| 素材、物料、自定义字段 | vimocli-material |
| 实验、AB测试、实验组 | vimocli-experiment |
| 同步、清理、权限、授权 | vimocli-admin |
```

**写作要点**：
- 写清楚**初始化流程**：认证、业务线、站点——这些是所有子操作的共享上下文
- 写清楚**子能力路由表**：Agent 看到用户意图后知道转交哪个子 SKILL
- 不写具体业务操作——那是子 SKILL 的事

---

### 4. 业务型 SKILL

**特点**：围绕一个业务对象的 CRUD，重点是用户语义到具体操作的映射。

**以 vimocli-material 为例**：

```yaml
name: vimocli-material
description: |
  vimo 素材管理能力。支持素材的查询、创建、更新、上传、分级、自定义字段管理。
  当用户提到"素材"、"物料"、"自定义字段"时触发。
```

```markdown
# vimo 素材管理

## 用户意图 → 操作映射

| 用户说 | 操作 | 命令 |
|-------|------|------|
| "查素材" / "素材列表" | 查询 | vimocli material list |
| "创建素材" | 创建 | vimocli material create |
| "上传素材" | 上传 | vimocli material upload |
| "改自定义字段" / "改 biz_extra" | 更新自定义字段 | ⚠️ 见下方特殊流程 |
| "素材分级" | 分级 | ⚠️ 不可逆操作，见风控规则 |

## ⚠️ 核心业务坑：update-custom-info 是整体覆盖

`update-custom-info` 是整体覆盖 `biz_extra`，不是增量更新！

正确流程：
1. 先 get：vimocli material get {id} --json
2. 拿到完整 biz_extra
3. 局部修改目标字段
4. 完整回写：vimocli material update-custom-info {id} --biz-extra '{完整JSON}'

错误做法（会导致其他字段被清空）：
❌ 直接调用 update-custom-info 只传修改的字段
```

**写作要点**：
- **用户意图→操作映射表**：这是业务型 SKILL 最重要的部分
- **标注业务坑**：比如整体覆盖、隐式默认值、参数互斥
- **给正确和错误示例**：对比比纯文字描述更清晰

---

### 5. 工作流型 SKILL

**特点**：涉及多步骤状态流转，重点是状态机和中间 ID 的管理。

**以 vimocli-experiment 为例**：

```yaml
name: vimocli-experiment
description: |
  vimo 实验管理能力。支持实验的创建（草稿→正式）、查询、状态变更。
  当用户提到"实验"、"AB测试"、"实验组"、"流量分配"时触发。
```

```markdown
# vimo 实验管理

## 状态流转

```
草稿(draft) → 创建(create) → 运行中(running) → 暂停(paused) → 完成(completed)
                                         ↓
                                      可以回到运行中
```

## 创建实验的完整流程

1. 创建草稿：vimocli experiment create-draft --name {name}
   → 返回 draft_id，**必须记录**
2. 配置实验组：vimocli experiment config-group --draft-id {draft_id}
3. 配置流量分配：vimocli experiment config-traffic --draft-id {draft_id}
4. 正式创建：vimocli experiment create --draft-id {draft_id}
   → 返回 experiment_id

## 关键注意

- draft_id 是中间 ID，只在草稿阶段有效
- 正式创建后使用 experiment_id
- 运行中的实验不能直接修改，需要先暂停
- 流量分配总和必须 = 100%
```

**写作要点**：
- **画状态机**：让 Agent 一眼看出什么状态能做什么操作
- **标注中间 ID**：工作流中产生的临时 ID 必须记录，后续步骤依赖它
- **写前置条件**：某些操作需要前置状态，比如"先暂停再修改"
- **写约束条件**：比如流量分配总和必须 100%

---

### 6. 风控型 SKILL

**特点**：涉及高危操作，重点是确认、预览、备份、回滚。

**以 vimocli-admin 为例**：

```yaml
name: vimocli-admin
description: |
  vimo 管理能力。涉及同步、清理、授权撤权等高危操作。
  当用户提到"同步数据"、"清理缓存"、"权限管理"、"授权"、"撤权"时触发。
```

```markdown
# vimo 管理（高危操作）

## ⛔ 操作分级

| 级别 | 操作 | 要求 |
|------|------|------|
| 🔴 不可逆 | 数据清理、批量删除 | 必须预览 + 二次确认 + 保留操作记录 |
| 🟡 可逆但影响大 | 同步、授权撤权 | 必须预览 + 确认 + 通知当事人 |
| 🟢 安全 | 查询权限、查看配置 | 直接执行 |

## 同步操作流程

1. 预览影响范围：vimocli admin sync-preview --scope {scope}
2. 展示预览结果给用户确认
3. 用户确认后执行：vimocli admin sync --scope {scope}
4. 同步后验证：vimocli admin sync-status

## 撤权操作流程

1. 查看当前权限：vimocli admin check-permission --user {userId}
2. 确认影响：撤权后该用户无法访问哪些资源
3. 用户确认后撤权：vimocli admin revoke --user {userId} --permission {perm}
4. 通知当事人（如有可能）

## 数据清理流程

1. ⛔ 必须先在测试环境验证
2. 列出清理范围：vimocli admin cleanup-preview --filter {condition}
3. 备份：vimocli admin backup --scope {scope}
4. 用户确认后清理：vimocli admin cleanup --filter {condition}
5. 验证清理结果
6. 如有问题，用备份回滚：vimocli admin restore --backup-id {id}
```

**写作要点**：
- **操作分级**：不可逆/可逆但影响大/安全，不同级别不同确认策略
- **给完整流程**：不是写"注意安全"，而是写 预览→确认→执行→验证→回滚
- **强调回滚**：能回滚的写回滚步骤，不能回滚的用 ⛔ 标注
- **通知相关方**：影响他人的操作要写通知步骤

---

### 7. 四种类型的写作侧重点对比

| 写作要素 | 入口型 | 业务型 | 工作流型 | 风控型 |
|---------|--------|--------|---------|--------|
| 初始化流程 | ⭐⭐⭐ | ⭐ | ⭐ | ⭐ |
| 意图→操作映射 | ⭐（路由表） | ⭐⭐⭐ | ⭐ | ⭐ |
| 业务坑 | ⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| 状态机 | ⭐ | ⭐ | ⭐⭐⭐ | ⭐ |
| 中间 ID 管理 | ⭐ | ⭐ | ⭐⭐⭐ | ⭐ |
| 风险分级 | ⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 确认流程 | ⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 回滚方案 | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ |

### 8. 一句话总结

> SKILL 按职责分四种：入口型管全局上下文和路由、业务型管对象操作和语义映射、工作流型管状态流转和中间 ID、风控型管高危操作的确认和回滚。写 SKILL 前先判断类型，才能写对侧重点。

---

## Part 2｜面试答题稿

### 题型判断

问"SKILL 怎么分类 / 不同 SKILL 怎么拆"→ 场景题-方案设计型

### 思维链

```
分类维度 → 四种类型 → 各自特点 → 实践案例
```

### 口语化输出

> "我一般把 SKILL 按职责分成四种类型。
>
> 第一种是入口型，管全局上下文。比如 vimo-cli 的总入口，负责认证、业务线切换、站点选择，然后根据用户意图路由到子 SKILL。重点是写清楚初始化流程和路由表。
>
> 第二种是业务型，围绕一个业务对象的 CRUD。重点是用户意图到操作的映射表，以及标注业务坑。比如素材的 update-custom-info 是整体覆盖 biz_extra，不是增量更新，必须先 get 再局部修改再完整回写——这种坑如果不写在 SKILL 里，Agent 一定会踩。
>
> 第三种是工作流型，涉及多步骤状态流转。重点是画状态机和标注中间 ID。比如实验有草稿和正式两个阶段，draft_id 只在草稿阶段有效，正式创建后要用 experiment_id。如果 Agent 没记录中间 ID，后续步骤就断了。
>
> 第四种是风控型，涉及高危操作。重点是操作分级和完整确认流程。不可逆操作要预览+二次确认+保留记录，能回滚的写回滚步骤。不是写'注意安全'，而是写具体的 预览→确认→执行→验证→回滚 流程。
>
> 写 SKILL 前先判断类型，才能把侧重点写对——业务型重点写映射和坑，工作流型重点写状态机，风控型重点写确认和回滚。"

### 追问预判

| 追问 | 应对 |
|------|------|
| "一个 CLI 只能拆这四种吗？" | 不是固定四种，是按职责分。有些 CLI 可能只有两三种，有些可能有更多细分 |
| "入口型和业务型能合并吗？" | 小项目可以，大项目合并会导致 SKILL.md 太长、职责不清 |
| "风控型能和业务型合并吗？" | 不建议。高危操作的确认逻辑如果混在业务逻辑里，容易被 Agent 忽略 |
