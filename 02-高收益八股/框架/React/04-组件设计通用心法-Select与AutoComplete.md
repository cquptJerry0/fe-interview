# 组件设计通用心法 - Select 与 AutoComplete

## 题型定位

这类题不是考某一个下拉框怎么写，而是考基础组件的 Owner 心智。

面试官通常会连续追问：

```txt
API 怎么设计
状态怎么设计
受控和非受控怎么处理
value 和 defaultValue 同时传怎么办
键盘操作怎么做
focus 落在哪里
测试怎么覆盖
```

现场不要一上来铺满 props。更好的回答节奏是：

```txt
先给固定心法
  ->
再用伪代码证明能落地
  ->
最后补通用细节和追问
```

## 思维导图关键点

```txt
组件设计通用心法

这个组件解决什么问题
  ->
对外契约怎么设计
  ->
内部状态归谁管理
  ->
交互链路是否完整
  ->
边界和测试怎么兜底
```

## 面试现场答法

如果让我设计一个 Select 或 AutoComplete，我不会先从 UI 开始想，而是先把它当成一个对外契约来设计。

第一层是 API。使用者最关心的是怎么传值、怎么监听变化、怎么传数据。所以我会提供 `value`、`defaultValue`、`onChange`、`options`、`disabled`、`loading` 这些基础能力。AutoComplete 还要区分选中值和输入内容，所以会额外有 `searchValue` 和 `onSearch`。如果业务需要定制展示，再提供 `renderOption`、`filterOption`、`notFoundContent` 这种扩展点。

第二层是状态归属。像选中值、输入值、弹层展开状态、键盘高亮项都要单独拆开。选中值可以受控也可以非受控，传了 `value` 就以外部为准；没传 `value` 就用内部 state，并用 `defaultValue` 初始化。`defaultValue` 只负责初始化，不参与后续同步。

第三层是交互闭环。鼠标点击选项要触发 `onChange` 并关闭弹层；键盘要支持上下键移动、`Enter` 选中、`Escape` 关闭；焦点要落在真正能接收键盘事件的元素上。AutoComplete 通常是 `input`，Select 如果不能输入，可以用 `button`，或者给 trigger 加 `tabIndex={0}`。

最后是测试。组件库组件不能只测能不能渲染，我会重点测 API 契约、受控非受控、键盘操作、空态、loading、disabled option、异步 options 更新，以及 aria 属性是否随状态变化。

所以这类组件的核心不是“做一个下拉框”，而是设计一个稳定、可扩展、可验证的公共组件契约。

## ASCII 图

```txt
Select / AutoComplete

外部使用者
    |
    v
+-----------------------------+
| 对外契约 API                 |
| value / defaultValue         |
| onChange / options           |
| searchValue / onSearch       |
| renderOption / filterOption  |
+--------------+--------------+
               |
               v
+-----------------------------+
| 状态归属                     |
| selectedValue  选中值        |
| searchValue    输入值        |
| open           弹层状态      |
| activeIndex    键盘高亮项    |
+--------------+--------------+
               |
               v
+-----------------------------+
| 交互闭环                     |
| click 选择                   |
| ArrowUp / ArrowDown          |
| Enter 确认                   |
| Escape 关闭                  |
| focus / blur                 |
+--------------+--------------+
               |
               v
+-----------------------------+
| 测试兜底                     |
| controlled / uncontrolled    |
| empty / loading / disabled   |
| async options                |
| aria / keyboard              |
+-----------------------------+
```

## 伪代码

这段不用在面试里完整写完，重点是证明你知道状态怎么合并、键盘怎么落地。

```tsx
type Option = {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

function useControlledValue<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T
  defaultValue?: T
  onChange?: (nextValue: T) => void
}) {
  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = React.useState(defaultValue)

  const mergedValue = isControlled ? value : innerValue

  const setValue = React.useCallback(
    (nextValue: T) => {
      if (!isControlled) {
        setInnerValue(nextValue)
      }
      onChange?.(nextValue)
    },
    [isControlled, onChange]
  )

  return [mergedValue, setValue] as const
}

function Select({
  value,
  defaultValue,
  onChange,
  options,
  disabled,
  renderOption,
}: {
  value?: string
  defaultValue?: string
  onChange?: (value: string, option: Option) => void
  options: Option[]
  disabled?: boolean
  renderOption?: (option: Option) => React.ReactNode
}) {
  const [selectedValue, setSelectedValue] = useControlledValue({
    value,
    defaultValue,
    onChange: nextValue => {
      const option = options.find(item => item.value === nextValue)
      if (option) onChange?.(nextValue, option)
    },
  })

  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)

  function selectOption(option: Option) {
    if (disabled || option.disabled) return

    setSelectedValue(option.value)
    setOpen(false)
  }

  function moveActive(delta: number) {
    setOpen(true)
    setActiveIndex(index => {
      const nextIndex = index + delta
      return Math.min(Math.max(nextIndex, 0), options.length - 1)
    })
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) selectOption(option)
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const activeOptionId = `select-option-${activeIndex}`

  return (
    <div className="select">
      <button
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls="select-list"
        aria-activedescendant={open ? activeOptionId : undefined}
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
      >
        {selectedValue ?? '请选择'}
      </button>

      {open && (
        <div id="select-list" role="listbox">
          {options.map((option, index) => (
            <div
              id={`select-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={option.value === selectedValue}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option)}
            >
              {renderOption ? renderOption(option) : option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 通用细节

### 1. value 和 defaultValue 同时传怎么办

`value` 优先。只要 `value !== undefined`，组件就是受控模式，真实值来自外部。

`defaultValue` 只在非受控模式下初始化内部 state。开发环境可以给 warning，提醒不要同时传，降低使用者的理解成本。

### 2. 为什么不能用 value || innerValue

因为 `0`、`false`、空字符串都可能是合法值。判断有没有传 `value` 应该用 `value !== undefined`。

### 3. defaultValue 后续变化要不要同步

一般不同步。`defaultValue` 是初始值，不是当前值。

如果业务希望外部持续控制当前值，就应该传 `value`。

### 4. AutoComplete 为什么要区分 value 和 searchValue

`value` 是选中的业务值，`searchValue` 是输入框里的搜索文本。

远程搜索时，用户输入了关键字，但还没有选中任何选项，这时 `searchValue` 有值，`value` 可能还没有。如果混成一个状态，异步搜索、回显、清空输入都会变复杂。

### 5. 键盘事件监听在哪

监听在当前能获得焦点的元素上。

AutoComplete 通常监听 `input`。Select 如果不能输入，可以用 `button` 作为 trigger；如果必须用 `div`，需要 `tabIndex={0}`，但优先选语义化元素。

### 6. 不能输入还能不能 focus

可以。输入能力和聚焦能力是两件事。

Select 不需要输入文字，但 trigger 仍然可以聚焦并响应方向键、`Enter`、`Escape`。

### 7. 为什么不默认监听 document keydown

组件内交互优先绑定在焦点元素上。全局监听容易让多个组件互相影响。

只有 Modal 的 `Escape` 关闭、全局快捷键这类场景，才考虑绑定到 `document`，并且要在卸载时清理。

### 8. 测试怎么设计

```txt
API 契约
  value / defaultValue / onChange

交互行为
  click / input / clear / open / close

键盘操作
  ArrowUp / ArrowDown / Enter / Escape

边界状态
  empty / loading / disabled / disabled option

异步场景
  options 更新 / 远程搜索 / 旧请求覆盖

无障碍
  role / aria-expanded / aria-selected / aria-activedescendant
```

## 追问短答

### 追问 1：组件库为什么要同时支持受控和非受控

组件库要服务不同使用场景。复杂业务希望父组件掌控状态，用受控；简单业务只想给初始值，让组件自己维护，用非受控。

### 追问 2：分页器更适合受控还是非受控

组件库实现上都支持。真实业务里分页器通常更适合受控，因为 `current` 和 `pageSize` 往往是请求参数，会影响接口、URL、筛选条件和刷新回显。

### 追问 3：Select 没有 input，怎么接收键盘事件

让 trigger 可聚焦。优先用 `button`，或者用 `div tabIndex={0}`。键盘事件监听在这个获得焦点的 trigger 上。

### 追问 4：disabled 和 aria-disabled 有什么区别

原生 `disabled` 通常会让元素不可聚焦、不可提交、不可交互。`aria-disabled` 只是告诉辅助技术这个元素不可用，不会自动阻止点击和键盘事件，业务代码需要自己拦截。

### 追问 5：activeIndex 需要暴露给外部吗

通常不需要。它是键盘导航的内部交互状态，不是业务状态。除非有强定制场景，否则内部维护即可。

## 刻意思考

这类题不要把组件当页面片段，要把组件当公共契约。

普通业务组件只要当前页面能跑，基础组件要考虑更多问题：

```txt
别人会怎么传参
哪些状态属于业务
哪些状态只是交互细节
键盘用户能不能操作
读屏用户能不能理解
未来需求变化时有没有扩展口
测试能不能守住契约
```

面试官连续追问 `value/defaultValue`、focus、键盘事件、A11y、测试，本质是在判断你有没有真正从组件库维护者角度思考过。

## 满分心智

组件设计题的满分心智是：

```txt
先定义使用契约
再划清状态所有权
再补齐交互闭环
最后用测试守住契约
```

现场回答时按这个顺序：

```txt
这个组件解决什么问题
  ->
对外 API 怎么设计
  ->
内部状态有哪些，归谁管理
  ->
鼠标、键盘、focus 怎么串起来
  ->
空态、loading、disabled 怎么兜底
  ->
测试怎么证明它稳定
```

一句话收束：

```txt
我设计基础组件时，不会只看 UI 能不能显示，而是先把它当成对外 API，明确状态所有权，再补交互、无障碍和测试。
```

## 复述任务

先按这段复述，不要求一字不差：

```txt
如果设计 Select 或 AutoComplete，我会先看对外契约，再看状态归属，再看交互闭环，最后看测试兜底。
API 上会有 value、defaultValue、onChange、options、loading、disabled，AutoComplete 还要区分 value 和 searchValue。
状态上拆成 selectedValue、searchValue、open、activeIndex。
受控时值来自外部 value，非受控时用 defaultValue 初始化内部 state。
键盘事件监听在能 focus 的元素上，Select 可以用 button 或 tabIndex=0 的 trigger。
测试要覆盖受控非受控、点击、键盘、空态、loading、disabled 和 aria。
```

## 资料锚点

1. WAI-ARIA APG Combobox Pattern：combobox 可以是可输入或 select-only，键盘交互需要覆盖 `Tab`、方向键、`Enter`、`Escape`，并维护 `aria-expanded`、`aria-activedescendant` 等关系。
2. MDN combobox role：`combobox` 可以放在 `input` 或 select-only 的 `button` 上，popup 通常是 `listbox`、`grid`、`tree` 或 `dialog`。
3. MDN tabindex：`tabindex` 可以让元素获得焦点并参与键盘导航，但交互元素优先使用原生语义元素。
4. React Manipulating the DOM with Refs：需要命令式 focus 时，可以通过 ref 拿到 DOM 节点并调用 `focus()`。
