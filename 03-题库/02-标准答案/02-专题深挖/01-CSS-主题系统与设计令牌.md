---
title: "CSS 主题系统与设计令牌"
tags: ["css.strategy.theming"]
type: "专题深挖"
difficulty: 4
---

## 为什么要深挖这题

因为“会切主题”和“能设计主题系统”不是一回事。真正长期可维护的主题系统，一定要先有令牌，再有语义层，最后才是组件消费。

## 上游原理

- 视觉系统先抽象出设计令牌（颜色、间距、圆角、阴影）
- 再把令牌映射为语义变量（主文本、弱文本、页面背景）
- 组件只消费语义变量，不直接依赖具体颜色值

## 核心机制拆解

- 基础令牌：`blue-500`、`gray-100`
- 语义令牌：`text-primary`、`bg-surface`
- 主题层：light / dark / brandA / brandB
- 组件层：只读语义变量

## Demo / 最小复现

```css
:root {
  --token-blue-500: #1677ff;
  --token-gray-100: #f5f5f5;
  --color-text-primary: #111;
  --color-bg-surface: #fff;
}

[data-theme='dark'] {
  --color-text-primary: #f5f5f5;
  --color-bg-surface: #111;
}
```

## 排障脚本

- 查组件里有没有硬编码颜色
- 查主题切换时是不是只换了颜色，没换阴影/边框/文本层级
- 查新增主题是否需要改组件源码，如果需要，说明分层还不够干净

## 什么时候该用 / 不该用

- 需要多主题、白标、暗色模式时必须做
- 纯静态营销页、一次性活动页可以适当轻量

## 面试追问链

- 设计令牌和语义变量差别是什么？
- Tailwind 怎么接主题系统？
- CSS Variables 和编译时变量什么时候各自更合适？
