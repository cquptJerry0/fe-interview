# 前端手写题：数组判断、原生 DOM TodoList、两栏布局、字符串加法

副标题：`Array.isArray`、DOM 增删改、事件委托、Flex/Grid 两栏布局、大数字符串按位相加

口径说明：这篇按“面试最小可用版 + 可直接运行示例 + 高频追问”整理。默认代码以能现场手写、能解释清楚边界为优先。

## Part 1｜这组题在考什么

### 一句话结论

这组题表面上分别在考 JS 类型判断、原生 DOM、CSS 布局和算法，底层都在考一件事：

先确定数据结构和边界，再用最少依赖实现可验证的功能。

### 总套路图

```txt
前端手写题
├─ 类型题：先选稳定 API，再解释边界
├─ DOM 题：状态数组 + 渲染函数 + 事件委托
├─ CSS 题：先说布局模型，再给完整页面
└─ 算法题：模拟过程，不依赖语言隐式转换
```

## Part 2｜题 1：JS 中判断数组

### 原始题干

JS 中判断数组。

### 思维导图关键点

```txt
判断数组
├─ 首选 Array.isArray(value)
├─ instanceof Array
│  └─ 跨 iframe / 多 realm 可能失败
├─ Object.prototype.toString.call(value)
│  └─ 老兼容兜底
└─ constructor 不推荐
   └─ 可被改写
```

### 60-90 秒口语稿

JS 判断数组最推荐用 `Array.isArray(value)`，语义最清楚，也能处理跨 iframe 或多 realm 的场景。`value instanceof Array` 在普通场景下也能判断，但它依赖原型链和当前执行环境里的 `Array` 构造函数，如果数组来自另一个 iframe，可能判断失败。更老的通用写法是 `Object.prototype.toString.call(value) === '[object Array]'`。`constructor === Array` 不推荐，因为 `constructor` 可能被改写。真实业务里我一般直接用 `Array.isArray`，除非要兼容非常老的环境。

### 最小可用版代码

```js
function isArray(value) {
  return Array.isArray(value)
}

console.log(isArray([]))
console.log(isArray({}))
```

### 兜底版代码

```js
function isArrayByToString(value) {
  return Object.prototype.toString.call(value) === '[object Array]'
}
```

### 高频追问

1. 为什么 `instanceof Array` 不够稳  
因为它判断的是对象原型链上是否能找到当前环境的 `Array.prototype`，跨 iframe 时构造函数环境不同。

2. 为什么不推荐 `constructor`  
因为对象的 `constructor` 属性不是不可变规则，可能被覆盖或伪造。

## Part 3｜题 2：如何创建 DOM 元素，添加属性

### 原始题干

如何创建 DOM 元素，添加属性。

### 思维导图关键点

```txt
DOM 创建
├─ document.createElement
├─ textContent 设置文本
├─ setAttribute 设置属性
├─ classList 添加类名
├─ dataset 设置 data-*
├─ appendChild / append 插入
└─ DocumentFragment 批量插入
```

### 60-90 秒口语稿

原生 DOM 创建元素一般用 `document.createElement`，然后用 `textContent` 设置文本，用 `setAttribute` 设置普通属性，用 `classList.add` 添加类名，用 `dataset` 设置自定义属性，最后用 `appendChild` 或 `append` 插入父节点。需要注意的是，如果内容来自用户输入，优先用 `textContent`，不要直接拼到 `innerHTML`，否则可能有 XSS 风险。真实业务里如果要批量创建很多节点，可以先放到 `DocumentFragment` 里，最后一次性插入，减少多次 DOM 操作。

### 最小可用版代码

```js
const li = document.createElement('li')

li.textContent = '学习 JS'
li.setAttribute('title', 'todo item')
li.classList.add('todo-item')
li.dataset.id = '1'

document.querySelector('#todoList').appendChild(li)
```

### 批量插入版本

```js
const fragment = document.createDocumentFragment()

for (let i = 0; i < 100; i++) {
  const li = document.createElement('li')
  li.textContent = `item ${i}`
  fragment.appendChild(li)
}

document.querySelector('#list').appendChild(fragment)
```

### 高频追问

1. `textContent` 和 `innerHTML` 有什么区别  
`textContent` 会把内容当普通文本，`innerHTML` 会按 HTML 解析，用户输入直塞 `innerHTML` 有 XSS 风险。

2. 为什么批量插入用 `DocumentFragment`  
它可以先在内存里组织节点，最后一次性插入真实 DOM，减少频繁 DOM 操作。

## Part 4｜题 3：原生 DOM 实现 TodoList

### 原始题干

原生 DOM 如何实现 TodoList，要求动态添加、完成、删除。

### 思维导图关键点

```txt
TodoList
├─ input 读取输入
├─ todos 数组维护状态
├─ render 统一渲染
├─ add 添加任务
├─ toggle 切换完成状态
├─ delete 删除任务
└─ 事件委托处理动态节点
```

### 60-90 秒口语稿

原生 DOM 实现 TodoList，我会用一个数组维护状态，而不是只操作零散 DOM。添加时读取输入框内容，生成一条 todo 放进数组，然后调用 `render` 重新渲染列表。完成和删除可以用事件委托，把点击事件绑在 `ul` 上，根据按钮的 `data-id` 和 `data-action` 判断操作哪一项。完成就是切换 `done`，删除就是过滤掉对应 id。这样动态添加出来的节点也不需要重复绑定事件。真实业务里这其实就是框架状态驱动 UI 的简化版，只是这里我们手动维护状态和渲染。

### 最小可用版代码

```html
<div>
  <input id="todoInput" placeholder="请输入任务" />
  <button id="addBtn">添加</button>
  <ul id="todoList"></ul>
</div>

<script>
  const input = document.querySelector('#todoInput')
  const addBtn = document.querySelector('#addBtn')
  const list = document.querySelector('#todoList')

  let todos = []

  function render() {
    list.innerHTML = ''

    const fragment = document.createDocumentFragment()

    todos.forEach(todo => {
      const li = document.createElement('li')
      li.dataset.id = todo.id

      const text = document.createElement('span')
      text.textContent = todo.text
      text.style.textDecoration = todo.done ? 'line-through' : 'none'

      const toggleBtn = document.createElement('button')
      toggleBtn.textContent = todo.done ? '取消完成' : '完成'
      toggleBtn.dataset.action = 'toggle'
      toggleBtn.dataset.id = todo.id

      const deleteBtn = document.createElement('button')
      deleteBtn.textContent = '删除'
      deleteBtn.dataset.action = 'delete'
      deleteBtn.dataset.id = todo.id

      li.append(text, toggleBtn, deleteBtn)
      fragment.appendChild(li)
    })

    list.appendChild(fragment)
  }

  addBtn.addEventListener('click', () => {
    const text = input.value.trim()
    if (!text) return

    todos.push({
      id: String(Date.now()),
      text,
      done: false
    })

    input.value = ''
    render()
  })

  list.addEventListener('click', event => {
    const action = event.target.dataset.action
    const id = event.target.dataset.id

    if (!action) return

    if (action === 'toggle') {
      todos = todos.map(todo => {
        if (todo.id !== id) return todo
        return { ...todo, done: !todo.done }
      })
    }

    if (action === 'delete') {
      todos = todos.filter(todo => todo.id !== id)
    }

    render()
  })
</script>
```

### 高频追问

1. 为什么用事件委托  
因为 todo 项是动态新增的，把监听器挂在父元素上，后续新增按钮也能通过冒泡被统一处理。

2. 为什么不用字符串拼接 `innerHTML`  
可以用，但用户输入直拼有 XSS 风险。面试时用 `createElement + textContent` 更稳。

3. 这个写法和 Vue/React 有什么关系  
本质是自己手写状态驱动 UI：状态数组变了以后重新渲染视图。

## Part 5｜题 4：两栏布局

### 原始题干

两栏布局。

### 思维导图关键点

```txt
两栏布局
├─ 左固定，右自适应
├─ Flex：display: flex + flex: 1
├─ Grid：grid-template-columns: 240px 1fr
├─ min-width: 0 防止内容撑破
└─ 移动端改成上下布局
```

### 60-90 秒口语稿

两栏布局最常见是左侧固定宽度，右侧自适应。现代项目里我优先用 `flex`：父容器 `display: flex`，左栏设置固定宽度并 `flex-shrink: 0`，右栏设置 `flex: 1` 和 `min-width: 0`，避免长内容把布局撑破。如果布局更偏二维结构，也可以用 `grid-template-columns: 240px 1fr`。真实业务里像后台管理系统的侧边栏加内容区、个人中心的菜单加内容页、订单管理页筛选栏加列表区，用 flex 或 grid 都很自然。

### 完整 HTML 应用示例

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>两栏布局示例</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        background: #f5f6f8;
        color: #1f2937;
      }

      .layout {
        display: flex;
        min-height: 100vh;
      }

      .sidebar {
        width: 240px;
        flex-shrink: 0;
        padding: 24px;
        background: #111827;
        color: #fff;
      }

      .sidebar h2 {
        margin: 0 0 16px;
        font-size: 20px;
      }

      .sidebar a {
        display: block;
        padding: 10px 0;
        color: #d1d5db;
        text-decoration: none;
      }

      .sidebar a:hover {
        color: #fff;
      }

      .content {
        flex: 1;
        min-width: 0;
        padding: 32px;
      }

      .card {
        padding: 24px;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 8px 24px rgb(15 23 42 / 8%);
      }

      @media (max-width: 768px) {
        .layout {
          flex-direction: column;
        }

        .sidebar {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar">
        <h2>个人中心</h2>
        <a href="#">我的订单</a>
        <a href="#">我的收藏</a>
        <a href="#">浏览历史</a>
        <a href="#">设置</a>
      </aside>

      <main class="content">
        <section class="card">
          <h1>两栏布局示例</h1>
          <p>
            左侧栏固定宽度，右侧内容区自适应剩余空间。
            这是后台系统、个人中心、订单管理页中非常常见的布局。
          </p>
        </section>
      </main>
    </div>
  </body>
</html>
```

### Grid 版本

```css
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  padding: 24px;
  background: #111827;
  color: #fff;
}

.content {
  min-width: 0;
  padding: 32px;
}
```

### 高频追问

1. 为什么右侧要加 `min-width: 0`  
Flex 子项默认 `min-width: auto`，长文本或表格可能把右侧撑破，加 `min-width: 0` 可以允许它在剩余空间内收缩。

2. Flex 和 Grid 怎么选  
一维主轴布局优先 Flex，二维网格布局优先 Grid。两栏布局两者都可以，Flex 更常见。

3. 移动端怎么处理  
可以在媒体查询里把 `flex-direction` 改成 `column`，让侧边栏和内容区上下排列。

## Part 6｜题 5：字符串加法

### 原始题干

字符串加法，不能直接转换成数字相加，按位相加。

### 思维导图关键点

```txt
字符串加法
├─ 不能转 Number
│  └─ 可能超过安全整数
├─ 双指针从末尾开始
├─ 每位转数字
├─ sum = x + y + carry
├─ 当前位 sum % 10
├─ 进位 Math.floor(sum / 10)
└─ 最后反转结果
```

### 60-90 秒口语稿

字符串加法不能直接转数字，因为可能超过 JS 安全整数范围，导致精度丢失。正确思路是模拟竖式加法，从两个字符串末尾开始，用两个指针分别指向当前位，再加上进位 `carry`。每轮计算当前位之和，结果位是 `sum % 10`，新的进位是 `Math.floor(sum / 10)`。两个字符串都遍历完后，如果还有进位也要补上。最后因为我们是从低位到高位收集结果，所以要反转再拼成字符串。真实业务里这种题考的是边界处理，比如长度不同、最后进位、前导零和大数精度。

### 最小可用版代码

```js
function addStrings(num1, num2) {
  let i = num1.length - 1
  let j = num2.length - 1
  let carry = 0
  const result = []

  while (i >= 0 || j >= 0 || carry) {
    const x = i >= 0 ? num1.charCodeAt(i) - 48 : 0
    const y = j >= 0 ? num2.charCodeAt(j) - 48 : 0

    const sum = x + y + carry
    result.push(sum % 10)
    carry = Math.floor(sum / 10)

    i--
    j--
  }

  return result.reverse().join('')
}

console.log(addStrings('123', '789'))
console.log(addStrings('999', '1'))
```

### 高频追问

1. 为什么不用 `Number(num1) + Number(num2)`  
因为大数字可能超过 `Number.MAX_SAFE_INTEGER`，导致精度丢失。

2. 时间复杂度  
`O(n)`，其中 `n` 是两个字符串长度的最大值。

3. 空间复杂度  
`O(n)`，用于保存结果数组。

4. 如果有前导零怎么办  
一般题目会约定输入格式；如果要处理，可以最后用正则或手动去掉前导零，但要保留全零结果为 `'0'`。
