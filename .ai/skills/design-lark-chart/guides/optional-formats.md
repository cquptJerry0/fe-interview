# 特殊格式补充

只在用户明确指定代码图或 SVG，或已查证原生组件无法满足关键表达时读取。不根据“高级”“架构图”“像参考图”自动切换。设计仍按五步推进；换格式不免除授权与实际验收。

## Mermaid / PlantUML

保留可编辑源码，例如 diagram.mmd 或 diagram.puml。使用 lark-whiteboard 当前帮助中支持的 input_format 写入，回读 code 时核对 syntax_type、非空源码及关键参与者、状态和关系，再导出真实图片。

时序图要保留参与者、生命线、消息先后与实际返回；状态图保留状态与事件迁移；ER 图保留真实关系基数。不能为凑标准符号虚构终态、返回或关系。代码图可编辑源码不等于每个图形都是独立原生节点，交付时说明实际编辑方式。

已有代码图的小改可以沿用其格式；不为统一外观重绘整张图。回读源码失败则先查接口与格式支持，不把普通节点 raw 当作源码回读成功。

## SVG 转 OpenAPI

SVG 是例外设计源，不是默认的技术图绘制方式。先说明哪些内容能转换成独立形状、哪些可能仍为 SVG，未经真实回读不能承诺全部原生可编辑。

保留 text/tspan 文字，不转成 path；使用平台支持的基础图元。当前校验器禁止 filter、radialGradient、pattern、clipPath、mask、foreignObject 及不稳定的 skew/matrix 变换。颜色使用本次确认的参数，不要求取历史样本频率。

只有实际需要此路径时才准备包装器输入：

- diagram.svg：带 title、desc 与实际语义的 data-role。
- freeform_brief.json：chart_type 为 freeform-drawing，含 freeform_mode、intent、visual_anchor、deliverables；可选 style_seed 和允许的检查警告。
- plan.json：只需提供工具消费的 style_budget，推荐非空十六进制颜色数组；不是恢复整套 Planner schema。

~~~json
{
  "style_budget": ["#ffffff", "#1f2329", "#dbeafe"]
}
~~~

~~~bash
bash "$SKILL_ROOT/scripts/render_freeform.sh" "$SESSION" --strict-budget
~~~

检查输出 render_freeform.report.json 的 ok、退出码及 board.openapi.json。包装器可能在上游失败后仍留下转换文件，文件存在不代表通过；输入校验早期失败也可能未生成新报告，不能沿用上次报告。

现有 mode 支持 sankey、roadmap、prototype、illustration、custom。前两者检查真实流带/时间轴等语义；prototype 和 illustration 保留了旧版数量阈值。对于不符合这些旧阈值但结构合理的特殊图，明确选择 custom 并按真实需求检查，不添加无意义控件或装饰来过门。未来修改这些检查器时单独补测试。

需要专项 SVG 检查时可用 lint_svg_quality.py；历史 premium 检查器 lint_premium_style.py 仍保留供对应旧样例回归，不代表所有架构图必须走它。

通过检查后按授权写入，回读实际节点类型、文字、关系和编辑性，再查看真实导图。只有本地 SVG 或转换成功不足以证明远端交付完成。
