---
title: CSS 方案怎么选？多主题怎么设计？
tags: ["css.strategy.theming"]
type: 八股
difficulty: 4
---

## 一句话结论

我把 CSS 体系拆成“规则层 + 值层”：规则层决定选择器与 CSS 规则怎么产出（构建时/运行时）；值层承载主题 token 的动态变化（更适合 CSS Variables）。规则尽量静态，值动态切换。

## 解释（从零到一）

### 1）规则层：class/selector → CSS rule

- 构建时生成规则：Tailwind JIT、CSS Modules、抽取式 CSS-in-JS  
  优点：产物可预测，SSR 一致性更简单，排障直接看产物 CSS。
- 运行时生成规则：运行时 CSS-in-JS  
  优点：复杂 props 条件样式表达更直接；  
  代价：运行时成本、SSR 注水与一致性更复杂、排障依赖框架/库。

### 2）值层：token → value

主题、租户品牌色、密度这类“连续变化”，适合用 CSS Variables 承载值：
- 规则里写 `var(--color-brand)`
- 运行时只换 `--color-brand` 的值即可

## 图解

```
规则层（尽量静态）: class/selector → CSS rule
值层（可动态切）  : token         → CSS var value

页面样式 = 命中规则 × 计算变量值
```

## 对比与取舍

决策维度（面试可讲）：
- 确定性：线上产物是否可预测、易排障
- 主题策略：连续变化用变量；离散枚举用 class
- 冗余治理：冗余来自“没用到的规则”还是“碎片化写法”
- SSR 复杂度：是否能接受运行时注入与注水链路
- 协作一致性：能否通过 token/组件 API 收敛组合空间

## 实践与验证

- 验证 Tailwind 是否按需生成：构建后直接检查产物 CSS 是否存在某个 utility 选择器
- 排查“有 class 没样式”：优先怀疑动态拼 class 漏扫，改为枚举映射或 safelist

## 常见追问

- Tailwind 的动态 class 漏扫怎么解决？
- 为什么主题不建议用 class 穷举？
- 运行时 CSS-in-JS 的 SSR 一致性问题怎么排？

## 易错点

- 把“规则层”和“值层”混在一起讲，导致选型逻辑不清
- arbitrary value 滥用导致碎片化与一致性崩坏
