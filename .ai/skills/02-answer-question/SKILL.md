---
name: answer-question
description: 回答单道面试题，按题型生成可背答案稿，并判断是否需要专题化沉淀；适用于简单题、代码输出题、开放题、项目题、编程题和系统专题题。
---

# Answer Question

在用户要求回答一道题、写答案稿、写专题稿、优化口语稿或判断是否值得深挖时使用这个 skill。

## 先做什么

1. 先判断题型。
2. 如果是专题题、现代框架题、浏览器架构题、运行时题，先搜索最新官方或一手资料。
3. 再选对应参考材料。
4. 最后决定输出为面经正文答案稿，还是专题文章。

## 题型判断补充

1. 题目核心如果是“实现一个”“手写一个”“设计一个函数 / 类 / 机制”“写出代码”“补全代码”，优先判为编程题，不要因为题目使用 JavaScript 就误判成代码输出题。
2. 像事件总线、列表 diff、请求去重、缓存、超时控制、Promise 封装、组件 / 页面实现，这类默认都按编程题处理。
3. 只有题目核心是在判断“最终输出是什么”或解释 `this`、作用域链、闭包、事件循环、原型链执行结果时，才走代码输出题。
4. 如果用户明确提到“笔试”“手写”“先输出在聊天框”“先给简单版”“先给最短可写版”，编程题默认先给最小可用版，再补进阶版。

## 题型与参考材料

简单题：

- `[simple-question.md](/Users/bytedance/Projects/personal/面试/.ai/skills/02-answer-question/references/simple-question.md)`

代码输出题：

- `[code-output.md](/Users/bytedance/Projects/personal/面试/.ai/skills/02-answer-question/references/code-output.md)`

系统专题题：

- `[deep-topic.md](/Users/bytedance/Projects/personal/面试/.ai/skills/02-answer-question/references/deep-topic.md)`

项目题：

- `[project-story.md](/Users/bytedance/Projects/personal/面试/.ai/skills/02-answer-question/references/project-story.md)`

编程题：

- `[coding-question.md](/Users/bytedance/Projects/personal/面试/.ai/skills/02-answer-question/references/coding-question.md)`

## 统一输出要求

1. `20 秒快答` 不再使用，统一改成 `思维导图关键点`。
2. 简单题以“能背、能说、不过度堆字”为目标。
3. 深题必须讲链路、现代实现和工程落地。
4. `60-90 秒口语稿` 结尾默认补 1 句工程或业务例子。
5. 如果题目本身明显值得长期复用，优先产出专题文章。
6. 用户已经认可过的高质量回答，落盘版本不得降级，不得为了压缩篇幅把专题写回泛化八股。
7. 专题题优先使用官方或一手资料，尤其是浏览器、React、Vue、构建工具、运行时这类会演进的话题。
8. 如果专题题没有先搜索最新资料，不要直接写“现代实现”判断。
9. 代码输出题默认保留原始题干或原始代码，再开始分析。
10. 如果多道代码输出题本质上在考同一条知识链，优先沉淀成一个总专题，不要机械拆成多个小专题。
11. `JS 底层` 总专题必须覆盖：编译时、运行时、执行上下文、Lexical Environment、Variable Environment、Environment Record、词法作用域、作用域链、Reference Record、普通函数 `this`、箭头函数、函数对象的 `[[Environment]]`、原型、原型链、`new`、属性查找 vs 变量查找、闭包、`Promise Reaction Job`、微任务、宿主事件循环。
12. `JS 底层` 总专题必须包含：原始题干、总链路图、关键误判点、把面经题串回总图、官方资料链接。
13. 编程题如果用户没有额外要求，第一版代码默认写成“笔试最小可用版”，体量以 3-5 分钟可手写完成为准。
14. 编程题第一版不要一上来写工程化封装、泛化参数、完整容错、可扩展抽象；这些放到追问、优化点或第二版。
15. 如果同一道编程题既能写短版，也能写工程版，默认先给短版代码，再单独补一句可以继续升级到工程版。
