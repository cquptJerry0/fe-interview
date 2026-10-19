# sketch-architecture example

- scenario: 数据湖手绘风架构
- style_tokens: `assets/style-tokens/sketch-architecture.json`
- verify_session: `data/design-lark-chart/verify_sketch-architecture/`
- feishu_doc: https://www.feishu.cn/docx/G0C8dnTGIoAuJkxGcdAcv2A5nbg
- style_budget:
  - connector_shape: `straight`
  - connector_arrow_end: `none`
  - connector_color: `#5b7fcb`
  - primary_border: `#5b7fcb`
  - label_color: `#1f2329`
  - layer_fill: `#fbfcfd`
  - layer_border: `#5b7fcb`

- verification_note:
  - 已完成 Gate A、飞书写入与真实导出图回收，Gate B 可执行。
  - 这是历史结构输入示例，不要求新图复制装饰性笔触。先按[原生组件](../../guides/native-drawing.md)实现；明确要求的手绘效果确实无法表达时才查看特殊格式补充。旧验证记录不等于本次重新验证。
