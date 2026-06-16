# Topic Map

当用户给出八股、手写截图、面经清单或说“最高效率学习这些题”时读取本文件。

## 训练分组

```txt
前端面试训练
   |
   +-- 八股概念线
   |     npm/pnpm/yarn
   |     硬链接/软链接
   |     JS 异步
   |     async/await
   |     for-of/for-in
   |     new
   |     call/apply/bind
   |
   +-- React 线
   |     Hooks 心智
   |     useState/useRef
   |     useMemo/useCallback
   |     依赖数组比较
   |
   +-- 手写线
   |     new
   |     call/apply/bind
   |     useMemo
   |     deep compare useMemo
   |     发布订阅
   |     并发 Token 刷新
   |     字符串大数相加
   |     useControlledValue
   |
   +-- 项目表达线
         组件设计
         AI 提效
         文档生成
         Spec Review
         人工校验闭环
```

## 推荐学习顺序

如果用户说“现在一个问题都不熟练”，按这个顺序：

```txt
第 1 轮：手写必会
new -> call/apply/bind -> 发布订阅 -> 大数相加

第 2 轮：React 高频
Hooks 心智 -> useState/useRef -> useMemo/useCallback -> 依赖数组比较 -> 手写 useMemo

第 3 轮：组件设计
Select/AutoComplete -> 受控非受控 -> focus/keyDown -> A11y -> 测试设计

第 4 轮：JS 底层
异步 -> async/await -> for-of/for-in -> 包管理与软硬链接

第 5 轮：项目表达
AI 工具使用 -> 文档生成 -> Spec Review -> 人工 Review -> 验证闭环
```

## 题目答法锚点

### npm / pnpm / yarn

满分心智：不要只背工具名，要从依赖存储、安装速度、幽灵依赖、磁盘占用、monorepo 支持讲。

关键图：

```txt
npm/yarn classic：node_modules 扁平化
pnpm：全局 store + 硬链接 + 符号链接
```

### 硬链接 / 软链接

满分心智：硬链接是同一个 inode 的多个目录项，软链接是指向路径的快捷方式。pnpm 借硬链接节省磁盘，再用软链接组织依赖关系。

### JS 异步 / async-await

满分心智：把同步调用栈、Promise Job 微任务、宿主事件循环分清。`async/await` 本质是 Promise + 状态机式续执行。

### for-of / for-in

满分心智：`for-in` 遍历可枚举 key，适合对象；`for-of` 消费 iterable，适合数组、字符串、Map、Set。

### new

手写锚点：

```txt
创建对象 -> 链接原型 -> 绑定 this 执行构造函数 -> 返回对象或新对象
```

边界：构造函数显式返回对象时返回该对象，返回原始值时忽略。

### call / apply / bind

手写锚点：

```txt
call：临时挂方法 -> 执行 -> 删除
apply：参数数组
bind：返回函数，支持二次传参，支持 new 调用
```

边界：`null/undefined` 指向全局或保持严格模式语义；`bind` 被 `new` 调用时绑定的 this 失效。

### React Hooks 心智

满分心智：Hook 不是生命周期语法糖，而是让函数组件按调用顺序持久化状态和副作用。

### useState / useRef

满分心智：`useState` 更新触发渲染，适合 UI 状态；`useRef` 跨渲染保持同一个容器，修改不触发渲染，适合 DOM、定时器、实例变量。

### useMemo / useCallback

满分心智：`useMemo` 缓存计算结果，`useCallback` 缓存函数引用。它们解决的是引用稳定和昂贵计算，不是默认性能优化开关。

### 依赖数组比较

满分心智：React 依赖数组是逐项 `Object.is` 风格的浅比较。对象、数组、函数只要引用变了就会重新计算。

### 手写 useMemo

手写锚点：

```txt
保存上次 deps 和 value
首次执行 factory
后续浅比较 deps
相同返回缓存
不同重新执行并更新缓存
```

深比较版要明确代价：能减少引用变化导致的重复计算，但深比较本身也可能很贵，不能滥用。

### 发布订阅进阶版

手写锚点：

```txt
on：订阅
off：取消订阅
once：只执行一次
emit：同步或异步触发
emitAsync：等待所有订阅者完成后再回调或 resolve
```

边界：重复取消、监听器执行时报错、异步监听器失败、emit 过程中修改监听器列表。

### 组件设计

满分心智：组件库题考公共契约设计能力，不是考“写了一个下拉框”。回答必须覆盖 API、状态、交互、A11y、测试和边界。

### AI 工程化

满分心智：AI 只负责生成初稿和提效，人负责规则、校验和最终判断。

```txt
Spec 约束输入 -> AI 生成草稿 -> 自动校验 -> 人工 Review -> 测试回归 -> 合入
```
