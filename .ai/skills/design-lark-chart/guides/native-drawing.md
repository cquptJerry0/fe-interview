# 默认绘制：飞书原生组件

适用于已确定的骨架、内容补充或局部修改。这里负责实现设计，不重新启动一套图型或技术路线选择。

## 已验证的制作链

脚本生成 DSL 节点与布局 → whiteboard-cli 转 OpenAPI 原生节点 → 必要的原生属性修正 → 检查 → 飞书写入、回读、真实导图。

DSL 是中间格式；交付对象是独立可编辑的形状、节点内文字、绑定连线与标签。DSL 与原生 raw 不是同一协议，不把 board.json 直接当 raw 请求。若已拿到原生图且只改文案，可直接修改现有原生结构，不必重新转换。

原生组件默认用于技术流程和架构图。图型名、内容复杂、追求美观都不是改用 SVG 的理由。仅用户明确指定特殊格式，或查证原生组件不能表达关键要求时，读 [特殊格式](optional-formats.md)，说明能力限制与编辑性差异后再采用。

## 组件与版面

按 [四通道案例](../references/four-lane-case.md) 可查已验证的原生形状与转换后修正方法；案例参数是起点，不是所有图的硬约束。

| 语义 | 本案例用过的原生类型 | 注意 |
|---|---|---|
| 动作 | round_rect | 主体文字放节点 text，不漂在外面 |
| 阶段/职责范围 | section + section.title | 真正包含子节点，原生标题标签；服务名在区内留白 |
| 消息队列 | horiz_cylinder | 水平圆柱，中文用途＋topic在内部 |
| 起止或人工节点 | round_rect2 | 胶囊两端留足文字空间 |
| 判断 | diamond | 判断条件在内，分支结果在线上 |
| 平台 | predefined_process | 与服务账号分开 |
| 执行环境 | hexagon | 仅有真实环境对象时用 |
| 存储 | cylinder | 版本产物不自动等于数据库 |
| 认证 | parallelogram | 表达身份，不填写凭据值 |
| 文件或版本产物 | note_shape | 折角侵占文字区，增加内边距 |

具体 enum 以当前工具 schema 和真实回读为准。只有截图时可以描述外观，不能断言底层原生类型。

文字采用少数稳定层级；按最长标签、实际行数与形状内接区计算宽高。优先删冗余、改短句、增加尺寸，不靠不断缩字号。阶段标题明显，节点与线标签之间也要有留白。

同类节点的尺寸、间距、颜色用集中参数维护，坐标按本轮行列与内容计算。固定布局常量可以用于间距和对齐，不复用与新业务无关的案例坐标。不强制所有样式来自历史统计第一项。

## DSL 与转换的边界

详细语法按需读取 lark-whiteboard-cli 的 schema、layout、connectors 与 typography 参考；命令以当前 --help 为准。已验证的易错点：

- 文档 version 为 2，节点 ID 唯一；先定义节点，连接线引用真实端点。
- connector 放顶层，不放在 frame.children 内。
- frame 明确 gap / padding；等高行按实际需要设置 alignItems。
- 被连接线引用的 frame 应具有实际可写入对象，避免虚拟布局容器被优化掉导致悬空。
- cylinder 使用明确宽度，不假设支持 fill-container。
- DSL 的 fit-content 不保证转换后的菱形、胶囊和平行四边形有足够内接空间。
- 转换器无法表达的原生属性可按已验证 schema 修正；改变形状或尺寸后重新计算端点、折点和文字位置。

不要把原生换形后的问题当成 DSL 检查已覆盖。最终送往飞书的结构才是本轮验证对象。

## 分区坐标与最终几何（必须遵守）

已验证的 section 以 parent_id 关联子节点，子节点 x/y 是局部坐标。同一分区的折线也应归属同一 parent_id 并转换局部坐标；跨区连线保持全局坐标。DSL connector 顶层约束不禁止原生 connector 的 section 归属，它们不是同一协议层。

先在全局空间计算所有节点与连接端点、拐点和包围盒，最终统一局部化；仅减节点父坐标而不处理同区折线会造成导图穿线/错位。复用 [native_stage_flow.cjs](../scripts/native_stage_flow.cjs) 的 finalize、worldNodes、geometry 和 checkNative。业务 specs/routes 作为输入，不在通用函数里硬编码素材字段或目标 token。

检查时从最终原生 raw 还原全局坐标，使用真实非中点端口，不伪造中点来过检查。当前脚本检查绑定、坐标空间、重叠和穿节点；文字内接区、标签布局、曲线、无关线交叉仍需真实导图，不能超出范围宣称“全部通过”。完整制作例见 [素材供给案例](../references/material-supply-case.md)。

## 连线、标签与层级

原生连接线两端绑定实际节点，不用视觉上碰到边缘的裸坐标假装绑定。执行线与展开、依赖线各有明确含义，箭头由语义决定。普通无向关联不强加方向。

已验证的原生附着字段包含 attached_object；标签使用 connector.captions，必要时调 caption_position。准确字段按回读/schema 确认，不能在 DSL 字段里套 raw 名称。

非中点端口用于避免高节点的多条触发线挤在一起。正交拐点对齐；标签避开节点、箭头、折点及其他线交叉。无关线不共用通道造成假合流。

背景和范围框放底层，业务节点与连接线按正确 z_index 排序。正文保留在形状内；转换器拆成独立 text_shape 时，按已验证能力合回 text 或组合，再回读。区域标题与连接条件标签不误并入节点正文。

## 检查与实际写入

1. 本地源生成后，执行适用的静态检查；检查失败先修复，不直接写入。
2. 转换和原生修正后，核对最终节点 ID、连线引用、关键文字、形状、端口和层级，必要时看本地预览。
3. 用 lark-whiteboard skill 查询当前目标并保存 raw 备份；合并用户修改，dry-run 检查范围和删除项，按已有授权写入。新建、局部修改、整板替换不能混用权限。
4. 写入后回读关键节点、文字和绑定关系，导出真实飞书图片并实际查看；同时检查本轮改动区及整体阅读顺序。
5. 若返回 doc is applying / doc data is not ready，约等 2 秒后重试查询，最多三次；结果未知只读观察，不立即重写或新建画板。
6. 真实导图为空、占位或旧内容时，保留源、raw 和本地预览并报告缺口，不把本地稿冒充飞书验收。图片为 JPG 时保留真实格式；展示可裁白边，保留未裁原图。

未修改的已验收版本不重复写入。收尾规则见 [整体优化](../workflow/05-refinement.md)。

## 工具与最少产物

以下命令中的 SKILL_ROOT 指实际加载的技能根目录，SESSION 指本次输出目录；先解析实际位置，不硬编码个人路径。不要在 assets/cases 里直接运行会写文件的案例脚本。

~~~bash
bash "$SKILL_ROOT/scripts/check_board.sh" "$SESSION/board.json"
npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$SESSION/board.json" --to openapi -o "$SESSION/converted.json" --format json
~~~

示例版本来自已验证案例；当前安装版本和能力要核实。脚本依赖缺失按下游技能要求处理，不擅自安装或升级工具。

| 工具 | 何时用 |
|---|---|
| scripts/check_board.sh | DSL 静态检查；当前包装器要求 errors=0、warnings=0、issues=[] |
| scripts/render_preview.sh | 需要检查本地稿时，不替代真实飞书导图 |
| scripts/check_geometry.py | 有可导出的真实几何时检查重叠、穿节点、端口与标签 |
| scripts/lint_lark_style_architecture.py | 选用对应案例色板且需检查引用时，不是所有架构图必跑 |
| scripts/fetch_reference_boards.sh / extract_style_tokens.py | 用户要求刷新参考素材时，不在每次画图时全量拉取 |

复杂图可从同一源或回读生成 geometry.json，其中 nodes、edges、labels 描述真实几何，范围框使用 containers。当前检查器针对边中点端口，非中点或曲线不能伪造中点数据来过检查；使用实际回读与人工视觉复核，必要时另行扩展检查器。已知交叉警告要判断是否造成歧义，不能以检查器不支持为由宣称通过。

通常保留当前可编辑源及本轮实际检查结果；远端更新加写前备份、raw 回读、真实导图与简短结论。输出目录遵守当前项目规则，不假设 data/ 自动被 Git 忽略。
