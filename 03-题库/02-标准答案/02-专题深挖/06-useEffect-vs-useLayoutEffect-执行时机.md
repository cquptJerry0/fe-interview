---
title: "useEffect vs useLayoutEffect 执行时机"
tags: ["react.hooks.internal", "react.effect.layout"]
type: "专题深挖"
difficulty: 4
---

## 为什么要深挖这题

因为 `useEffect` 和 `useLayoutEffect` 经常在 React 面经里被连续追问，而且“同步 / 异步”如果不解释相对谁，就很容易说空。

## 上游原理

- React 渲染大致可分为 render 和 commit
- DOM 提交后，浏览器还要决定何时绘制到屏幕
- 两个 hook 的差别就在“绘制前后”的时机

## 核心机制拆解

- `useLayoutEffect`：DOM 已更新，但浏览器还没绘制；适合测量布局、同步修正位置
- `useEffect`：通常在绘制后执行；适合数据请求、订阅、日志等不要求阻塞绘制的副作用

## Demo / 最小复现

- 用 `useLayoutEffect` 在绘制前同步读取元素尺寸并立即修正位置
- 用 `useEffect` 打日志或发请求，不阻塞首帧渲染

## 排障脚本

- 页面闪一下再回正：优先检查是否该用 `useLayoutEffect`
- 页面首帧卡顿：检查是不是把大量副作用塞进了 `useLayoutEffect`
- SSR 警告：确认是否在服务端环境误用了 `useLayoutEffect`

## 什么时候该用 / 不该用

- 需要读写布局、避免视觉闪烁时才用 `useLayoutEffect`
- 普通副作用默认用 `useEffect`

## 面试追问链

- 所谓“同步 / 异步”是相对于什么阶段说的？
- 为什么 `useLayoutEffect` 容易影响首屏性能？
- React SSR 里为什么会警告 `useLayoutEffect`？
