# 素材供给：原生阶段链路成功案例

## 必读资源

- [真实成图](../assets/cases/material-supply-stages/preview.jpg)：先实际读图，不只读取文件名。
- [完整 ASCII](../assets/cases/material-supply-stages/ascii.md)：主题、图例、真实分区、两入口和共用主链。
- [布局生成源](../assets/cases/material-supply-stages/build.cjs)、[原生转换修正入口](../assets/cases/material-supply-stages/finalize.cjs)、[通用原生处理](../scripts/native_stage_flow.cjs)。准备绘制前必须读。
- [最终原生输入](../assets/cases/material-supply-stages/board.openapi.json)、[线上真实回读](../assets/cases/material-supply-stages/verified.openapi.json)。它们是既有验证证据，不代表后来新图已验证。
- [DSL输入](../assets/cases/material-supply-stages/board.json)、[设计参数](../assets/cases/material-supply-stages/design.json)、[视觉参数](../assets/cases/material-supply-stages/style-tokens.json)、[语义标识映射](../assets/cases/material-supply-stages/semantic-map.json)、[最终原生本地检查](../assets/cases/material-supply-stages/native-check.json)。复现与先前已验收版本的节点几何及文字一致，不以此代替新图远端验收。

## 什么情况下必须优先进入

真实流程有多入口、按条件建单、共同内容执行、数据读写与后续发布时，优先使用此案例。用户在成图后明确反馈“这个图画的非常好”。没有这些关系的图不套四阶段；自动发布的四通道案例继续保留。

## 迁移标准

- 整图标题独立原生 text_shape，左对齐加粗；阶段是真实 section，标题使用 section.title。原生标题标签与服务名称分开，不用覆盖文字假造标题。
- 顶部组件和实虚线图例；组件内部中文用途、必要完整名称与字段，外面不挂小字。
- 阶段浅蓝/浅青/浅绿/浅灰，主链水平；上方放必要来源/目标和数据，下方放另一入口和调度。
- 队列 horiz_cylinder，数据库 cylinder，版本/面板 note_shape，判断 diamond，动作 round_rect，结果 round_rect2，调度 predefined_process。
- 两路在真实任务表汇合，不强串成同一事件顺序；数据库与任务执行分开。调度调用执行步骤，不直接操作数据库。
- 案例中分区代表阶段，三个阶段可以由同一个服务负责。不得把这些阶段误画成独立部署服务。

本案例画幅和绝对字号只用于复现，不是所有图的默认尺寸。案例的业务字段、审核规则、来源/目标分类及表名必须按新项目重新核实，不能作为泛化事实。

## 复现（纯本地，不写远端）

先准备自己的可写输出目录。脚本接收输出目录，禁止在只读案例目录产生临时文件。下面使用当前 shell 中用户明确指定的绝对目录变量，不提供默认远端目标。

```bash
node /实际技能目录/assets/cases/material-supply-stages/build.cjs /实际输出目录
npx -y @larksuite/whiteboard-cli@^0.2.13 -i /实际输出目录/board.json -o /实际输出目录/dsl-preview.png --layout /实际输出目录/coords.json
npx -y @larksuite/whiteboard-cli@^0.2.13 -i /实际输出目录/board.json --to openapi --format json -o /实际输出目录/converted.json
node /实际技能目录/assets/cases/material-supply-stages/finalize.cjs /实际输出目录
```

替换路径后执行。制作链输出最终 board.openapi.json、semantic-map.json、native-check.json、native-geometry.json。没有远端创建/覆盖命令；使用新图时按本次授权、回读和 dry-run 确定目标。

## 原生返工必须避免

1. section 子节点存局部坐标；同区折线也必须有相同 parent_id，跨区连线按全局坐标处理。
2. 在全局坐标下先计算端点和拐点，最后统一局部化；禁止重复减父坐标或只局部化节点不处理同区连线。
3. 菱形外框不代表文字区；字段主动按层级换行，不留下单独尾字母。
4. 服务标题卡至少容纳真实行数；标题、服务名、第一排对象不能遮挡。
5. 真实导图的断词、虚线路径和标题裁切必须检查，本地几何通过无法代替。

通用脚本从最终原生结构还原全局几何，再检查绑定、同区坐标一致、重叠与穿节点；真实文字内接区、线标签和无关线交叉仍必须实际读图。
