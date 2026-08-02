# Redis 大全：从业务场景到面试满分回答

## 0. 这篇怎么学

这篇不是 Redis 命令百科，而是一条从业务到原理再到面试表达的学习路径。

核心路线是 BFS：

```text
先看业务为什么需要 Redis
  |
  v
再看 Redis 承担哪些职责
  |
  v
再看每类职责背后的数据结构和原理
  |
  v
最后沉淀成面试可复述答案
```

学习时先记住一句话：

```text
Redis 适合放高频访问、短生命周期、并发敏感、可以重建或可以补偿的数据。
```

小白注释：

```text
不要一上来背 String、Hash、List、Set、ZSet。
先问这个业务到底遇到了什么问题，再倒推为什么 Redis 合适。
```

## 1. Redis 的一句话心智

Redis 是一个以内存为主的高性能 key-value 数据库。业务代码通过 Redis 客户端连接它，然后用 key 找 value。它的 value 不只是字符串，也可以是 Hash、List、Set、ZSet、Stream 等数据结构。

费曼解释：

```text
MySQL 像档案室，资料完整、可靠，但每次查找都比较重。
Redis 像前台白板，把最近最常用、马上要用、临时要记的信息写在上面。
来人问问题，先看白板；白板没有，再去档案室查。
```

ASCII 图：

```text
用户请求
  |
  v
先查 Redis
  |
  |-- 命中：直接返回
  |
  |-- 未命中
        |
        v
      查 MySQL / Mongo / 下游服务
        |
        v
      写回 Redis，设置 TTL
        |
        v
      返回结果
```

关键思考：

```text
Redis 不是默认替代数据库。
判断一个数据能不能放 Redis，要先问：
1. 这个数据是不是热点？
2. 这个状态是不是短生命周期？
3. 这个操作是不是怕并发冲突？
4. 这个链路是不是需要异步削峰？
5. Redis 里的数据丢了，能不能从最终事实源恢复？
```

## 2. Redis 在业务系统里的 6 类职责

| 职责 | 解决的问题 | 典型业务 | 常用结构 |
|---|---|---|---|
| 缓存 | 下游查询慢、贵、压力大 | 商品详情、Manifest、权限配置 | String / Hash |
| 临时状态 | 一个流程需要短期上下文 | 审批单、验证码、OAuth state | String + TTL |
| 分布式锁 | 多个请求抢同一资源 | 快照恢复、token 刷新、库存扣减 | SET NX EX |
| 队列 | 同步链路太重，需要后台处理 | 持久化任务、聊天轮次、订单后处理 | List / Stream |
| 计数限流 | 快速统计次数或额度 | API 限流、未读数、秒杀库存 | INCR / DECR |
| 排行集合 | 需要按分数或时间排序 | 热榜、最近会话、排行榜 | ZSet |

小白注释：

```text
Redis 的本质不是“快一点的 Map”。
它真正厉害的地方是：内存访问 + 多种数据结构 + TTL + 原子命令。
这几个能力组合起来，就能承接很多业务中间态。
```

引导思考：

```text
每次看到业务场景，都先把它归到这 6 类职责里。
归类清楚以后，数据结构自然就出来了。
```

## 3. Case 1：审批系统里的临时上下文

### 3.1 业务问题

飞书审批回调通常只告诉业务系统：

```text
instance_code = xxx
status = APPROVED
approval_code = xxx
```

但真正授权还需要：

```text
要给谁授权
要加哪些 permissionIds
这是 API / 面板 / 素材哪种权限
申请理由是什么
```

问题本质：

```text
回调只带流程 ID，不带完整业务上下文。
```

### 3.2 Redis 角色

Redis 在这里做临时上下文仓库和幂等状态记录。

数据设计：

```text
approval:instance:{instance_code}
  -> {
       targetUser,
       permissionIds,
       permissionType,
       targets,
       reason,
       status: "PENDING"
     }

approval:user:{applicantUid}:{businessType}
  -> Set(instance_code)
```

小白注释：

```text
instance_code 就像取件码。
Redis 里存的是“这个取件码对应哪一件业务事情”。
```

### 3.3 链路图

```text
创建审批
  |
  v
飞书返回 instance_code
  |
  v
Redis 存审批上下文，设置 TTL
  |
  v
用户在飞书点同意
  |
  v
飞书回调：instance_code + APPROVED
  |
  v
服务用 instance_code 查 Redis
  |
  v
拿到 targetUser / permissionIds
  |
  v
写最终权限表
  |
  v
Redis 状态改 APPROVED，防重复处理
```

### 3.4 为什么不用 MySQL 直接存

可以用 MySQL，但这个场景 Redis 更轻。

原因：

1. 审批上下文是短生命周期状态。
2. 查询路径非常简单，就是 instance_code 查 record。
3. 处理完以后只需要保留一段时间。
4. 最终事实源是权限表，不是这个审批上下文。

费曼解释：

```text
飞书回调像快递员拿着取件码回来。
Redis 就是你提前放好的取件登记表。
没有登记表，你只知道“这个取件码通过了”，不知道该把什么东西交给谁。
```

引导思考：

```text
这里最关键的问题不是“Redis 比 MySQL 快”。
而是这个数据本来就是流程中间态。
中间态适合 TTL，最终状态适合落库。
```

### 3.5 面试回答

如果面试官问“你们审批链路为什么用 Redis”，可以这样答：

```text
在审批链路里，飞书回调只会带 instance_code 和审批状态，不会带完整授权上下文。
所以我们在创建审批时，用 instance_code 作为 key，把 targetUser、permissionIds、permissionType、targets 和申请原因临时存到 Redis，并设置 TTL。
回调回来后，再用 instance_code 从 Redis 取出业务上下文，执行真正授权。
同时 Redis 里会记录状态，比如 PENDING 到 APPROVED，防止重复回调导致重复授权。
这里 Redis 不替代最终权限表，只承担短生命周期上下文和幂等状态。
```

满分心智：

```text
审批场景考的是：回调缺上下文 + 短生命周期状态 + 幂等处理。
```

## 4. Case 2：电商商品详情缓存

### 4.1 业务问题

商品详情页 QPS 很高，尤其是活动商品、爆款商品、广告引流商品。如果每次都查 MySQL 或商品服务，下游压力会很大。

问题本质：

```text
读多写少，热点明显，下游查询成本高。
```

### 4.2 Redis 角色

Redis 做热点商品详情缓存。

数据设计：

```text
product:detail:{productId}
  -> 商品详情 JSON

product:price:{skuId}
  -> 当前展示价

product:stock:display:{skuId}
  -> 展示库存
```

### 4.3 链路图

```text
用户打开商品详情页
  |
  v
GET product:detail:1001
  |
  |-- 命中
  |     |
  |     v
  |   直接返回
  |
  |-- 未命中
        |
        v
      查商品服务 / MySQL
        |
        v
      SET product:detail:1001 TTL 5min
        |
        v
      返回
```

费曼解释：

```text
热门商品像饭店菜单里的招牌菜。
每天很多人问，不可能每次都跑后厨重新确认一遍。
Redis 就像前台贴的一张今日菜单，大部分人看这张就够了。
```

### 4.4 引导思考

缓存不是越久越好。

```text
TTL 太短：缓存命中率低，数据库压力还是大。
TTL 太长：商品价格、上下架、库存展示可能不新。
```

所以设计缓存时要问：

```text
这个字段允许几秒或几分钟不一致吗？
价格变动、库存变动、上下架状态是否需要主动删除缓存？
缓存 miss 时，是不是可能大量请求一起打到数据库？
```

### 4.5 高频追问

问题 1：缓存和数据库怎么保证一致？

```text
常见做法是先更新数据库，再删除缓存。
如果对一致性要求更高，可以用消息补偿、延迟双删、订阅数据变更事件来兜底。
```

问题 2：缓存穿透是什么？

```text
请求一个根本不存在的商品 id，Redis 没有，数据库也没有。
如果恶意请求很多，就会绕过缓存一直打数据库。
解决方式是缓存空值或用布隆过滤器。
```

问题 3：缓存击穿是什么？

```text
某个超级热点 key 突然过期，很多请求同时打到数据库。
解决方式是热点 key 加互斥锁、逻辑过期、后台刷新。
```

问题 4：缓存雪崩是什么？

```text
大量 key 同一时间过期，数据库瞬间被打爆。
解决方式是 TTL 加随机值、分批过期、多级缓存。
```

### 4.6 面试回答

```text
商品详情是典型读多写少场景，我会用 Redis 做 cache aside 缓存。
请求先进 Redis，命中就直接返回；未命中再查商品服务或数据库，并把结果写回 Redis 设置 TTL。
对价格、上下架这类敏感字段，会在变更后主动删除缓存，必要时加消息补偿。
同时要考虑穿透、击穿、雪崩：不存在数据缓存空值，热点 key 用互斥锁或逻辑过期，大量 key 的 TTL 加随机抖动。
```

满分心智：

```text
商品缓存考的是：读多写少 + cache aside + 一致性 + 三大缓存问题。
```

## 5. Case 3：电商秒杀库存扣减

### 5.1 业务问题

秒杀开始时，瞬间大量用户抢同一个商品。如果每个请求都直接打数据库，数据库扛不住；如果并发控制不好，还可能超卖。

问题本质：

```text
高并发写同一个资源，需要快速原子判断和扣减。
```

### 5.2 Redis 角色

Redis 做活动库存的前置扣减层，用原子操作或 Lua 脚本保证扣库存、判断重复购买等动作一次完成。

数据设计：

```text
seckill:stock:{skuId}
  -> 100

seckill:order:{activityId}:{userId}
  -> 1
```

小白注释：

```text
原子操作可以理解成：这几个关键动作要么一起成功，要么一起失败，中间不会被别的请求插队。
```

### 5.3 链路图

```text
用户点击抢购
  |
  v
判断用户是否已经抢过
  |
  v
Redis 原子扣库存
  |
  |-- 库存足够
  |     |
  |     v
  |   写入下单队列
  |
  |-- 库存不足
        |
        v
      返回售罄

后台 worker
  |
  v
消费下单任务
  |
  v
写订单库和库存库
```

### 5.4 引导思考

这里最容易答浅的地方是：“用 Redis 扣库存就完了”。

实际上还要问：

```text
Redis 库存从哪里预热？
扣减成功后怎么落数据库？
下单失败要不要回补库存？
如何防止同一个用户重复抢？
Redis 挂了以后活动怎么降级？
最终库存以谁为准？
```

答案心智：

```text
Redis 是秒杀流量入口，不是最终库存账本。
最终事实源仍然是库存系统或数据库。
```

### 5.5 面试回答

```text
秒杀场景下，我会把活动库存预热到 Redis，用原子命令或 Lua 脚本完成重复购买判断、库存判断和扣减。
扣减成功后，不直接在请求链路里同步写数据库，而是把下单任务放入队列，由后台 worker 异步创建订单、落库存。
这样 Redis 承担高并发入口削峰，数据库承担最终事实源。
同时要设计失败补偿，比如订单创建失败后回补 Redis 库存，活动结束后做库存对账。
```

满分心智：

```text
秒杀库存考的是：原子扣减 + 异步削峰 + 最终一致 + 对账补偿。
```

## 6. Case 4：Agent 系统里的锁、缓存、队列、Auth 刷新

### 6.1 业务背景

Agent 系统里，一个 session 会发生很多后台动作：

```text
保存快照
恢复快照
重置环境
GC 清理
聊天轮次处理
token 刷新
读取最新文件清单
```

这些动作有两个共同点：

```text
第一，它们经常围绕同一个 session。
第二，它们既要快，又怕并发互相踩。
```

Redis 在 Agent 场景里承担四类职责：

| 职责 | 业务对象 | Redis 设计 |
|---|---|---|
| 分布式锁 | session 快照 / 恢复 / 重置 / GC | lock:session:{sessionId} |
| Manifest 缓存 | 最新文件清单 | manifest:session:{sessionId}:latest |
| 任务队列 | 持久化任务、聊天轮次 | queue:persistence / queue:chat-turn |
| Auth 刷新锁 | session token 刷新 | lock:auth-refresh:{sessionId} |

### 6.2 Session 分布式锁

业务问题：

```text
同一个 session 不能一边恢复快照，一边重置环境，一边 GC。
否则文件状态可能互相覆盖。
```

Redis 设计：

```text
SET lock:session:{sessionId} {requestId} NX EX 30
```

小白注释：

```text
NX：只有锁不存在时才能设置成功。
EX 30：锁 30 秒自动过期，防止服务挂了以后锁永远不释放。
requestId：解锁时确认锁是自己加的，避免误删别人的锁。
```

ASCII 图：

```text
请求 A：恢复 session
  |
  v
尝试加锁 lock:session:123
  |
  |-- 成功
  |     |
  |     v
  |   执行恢复，结束后释放锁
  |
  |-- 失败
        |
        v
      返回已有操作进行中
```

并发冲突图：

```text
没有锁：

恢复快照 A ---- 写文件 ---- 完成
重置环境 B ------ 删除文件 ---- 完成

结果：最终文件状态不可预测

有锁：

恢复快照 A ---- 加锁 ---- 写文件 ---- 解锁
重置环境 B ---- 等待或失败

结果：同一时间只有一个重操作
```

费曼解释：

```text
一个 session 像一个房间。
恢复、重置、GC 都是在房间里搬东西。
Redis 锁就是门口的“施工中”牌子。
有牌子时，其他人不能同时进去乱搬。
```

引导思考：

```text
为什么锁一定要有 TTL？
因为服务可能执行到一半挂掉。
如果锁没有过期时间，这个 session 以后就永远没人能操作。
```

### 6.3 Manifest 缓存

业务问题：

```text
恢复 session 时，经常要知道最新快照包含哪些文件。
如果每次都去 Mongo 聚合查询，会慢，也会给 Mongo 压力。
```

Redis 设计：

```text
manifest:session:{sessionId}:latest
  -> {
       snapshotId,
       files: [
         "src/index.ts",
         "package.json"
       ],
       updatedAt
     }
```

流程图：

```text
恢复 session
  |
  v
读 Redis manifest
  |
  |-- 命中
  |     |
  |     v
  |   直接拿文件清单
  |
  |-- 未命中
        |
        v
      查 Mongo 聚合
        |
        v
      写回 Redis
        |
        v
      继续恢复
```

费曼解释：

```text
Mongo 像仓库总账，信息完整但查起来重。
Manifest 缓存像最近一次装箱清单。
恢复时先看清单，就知道要拿哪些文件。
```

引导思考：

```text
Manifest 缓存丢了会不会影响正确性？
通常不会，因为可以从 Mongo 重建。
这就是缓存型 Redis 数据的关键：丢了最多变慢，不应该丢事实。
```

### 6.4 后台任务队列

业务问题：

```text
用户发起聊天或保存快照时，不希望请求一直卡着等后台重任务完成。
```

Redis 设计：

```text
queue:persistence
  -> List[task]

queue:chat-turn
  -> List[task]
```

流程图：

```text
用户请求
  |
  v
生成任务
  |
  v
LPUSH queue:chat-turn task
  |
  v
立即返回“任务已接收”
  |
  v
后台 worker BRPOP queue:chat-turn
  |
  v
执行任务
```

小白注释：

```text
队列就是排队。
用户请求只负责把任务放进队伍，后台 worker 一个个取出来做。
这样前台请求不会被重活拖慢。
```

引导思考：

```text
Redis List 可以做简单队列，但不是最完整的消息系统。
如果需要消费者组、ack、重试状态、消息保留，更适合 Redis Stream 或专业 MQ。
面试里主动说边界，会比只说“Redis 能做队列”更成熟。
```

### 6.5 Auth 刷新锁

业务问题：

```text
同一个 session 的 token 过期后，可能同时来了多个请求。
如果每个请求都刷新 token，会产生并发轮转，甚至旧 token 覆盖新 token。
```

Redis 设计：

```text
lock:auth-refresh:{sessionId}
  -> requestId
  TTL: 5s 或 10s
```

流程图：

```text
多个请求发现 token 过期
  |
  v
同时抢刷新锁
  |
  |-- 抢到锁的请求
  |     |
  |     v
  |   刷新 token，写回新 token
  |
  |-- 没抢到的请求
        |
        v
      等待或复用刷新结果
```

费曼解释：

```text
token 刷新像换门禁卡。
不能十个人同时去换同一张卡。
否则有人拿到新卡，有人又把旧卡登记回去了。
Redis 锁保证同一时间只有一个人换卡。
```

### 6.6 Agent 场景面试回答

```text
在 Agent 系统里，Redis 不只是缓存。
它同时承担 session 级分布式锁、manifest 热数据缓存、后台任务队列、auth 刷新互斥锁。
这些场景共同点是：状态生命周期短、并发敏感、访问频繁，而且多数数据可以从 Mongo、文件存储或认证服务恢复。
所以 Redis 很适合放在主存储和业务逻辑之间，负责加速、互斥和削峰。
```

满分心智：

```text
Agent 场景考的是：同一个 session 下的并发安全、缓存加速、异步化和 token 刷新互斥。
```

## 7. Case 5：登录态、验证码、OAuth state

### 7.1 业务问题

验证码、登录 session、OAuth state 都有有效期。业务需要快速校验，到期自动失效。

Redis 设计：

```text
login:code:{phone}
  -> 123456
  TTL: 5min

session:{token}
  -> userId
  TTL: 7d

oauth:state:{state}
  -> redirectUrl
  TTL: 10min
```

### 7.2 为什么适合 Redis

```text
这类数据的核心需求就是 TTL。
你不希望自己写定时任务去扫描数据库删除过期验证码。
Redis 原生支持 key 过期，到期自动失效。
```

费曼解释：

```text
验证码像临时门票。
只在几分钟内有效，过期就不能再进场。
Redis 的 TTL 就是门票上的过期时间。
```

引导思考：

```text
验证码这种数据如果 Redis 丢了会怎样？
用户重新获取一次验证码即可。
所以它适合 Redis。

订单这种数据如果 Redis 丢了会怎样？
订单事实丢失，用户权益受损。
所以不能只放 Redis。
```

### 7.3 面试回答

```text
登录态和验证码非常适合 Redis，因为它们生命周期短、校验频繁、天然需要过期。
验证码可以用 phone 作为 key，验证码作为 value，设置 5 分钟 TTL。
session 可以用 token 作为 key，userId 或用户摘要作为 value，设置登录有效期。
这样业务侧不需要自己维护过期扫描，Redis 会自动让 key 失效。
```

满分心智：

```text
登录态场景考的是：短生命周期状态 + TTL 自动过期 + 快速校验。
```

## 8. Case 6：排行榜、热榜、最近会话

### 8.1 业务问题

热榜需要按热度排序，排行榜需要按分数排序，最近会话需要按最后消息时间排序。

这种问题本质是：

```text
我不只是要存数据，还要频繁按分数或时间取 Top N。
```

### 8.2 Redis 角色

Redis 用 ZSet 承接有序集合。

数据设计：

```text
ranking:hot:daily
  member: contentId
  score: hotScore

conversation:recent:{userId}
  member: chatId
  score: lastMessageTimestamp

game:rank:{seasonId}
  member: userId
  score: gameScore
```

ASCII 图：

```text
ZSet: ranking:hot:daily

score 100  -> 内容 A
score  95  -> 内容 B
score  80  -> 内容 C
score  63  -> 内容 D
```

费曼解释：

```text
ZSet 像一个自动排序的名单。
每个成员都有一个分数。
分数变了，Redis 会帮你维护顺序。
```

### 8.3 引导思考

为什么不用 MySQL 排序？

```text
MySQL 当然可以 order by。
但如果热度变化非常频繁，而且页面经常取 Top N，Redis ZSet 会更适合承接实时排序读。
```

边界是什么？

```text
如果榜单需要强审计、长期留存、复杂多维分析，最终仍然要落数据库或数仓。
Redis 更适合实时榜单展示层。
```

### 8.4 面试回答

```text
排行榜和最近会话可以用 Redis ZSet。
ZSet 里 member 是业务对象，比如 userId、contentId、chatId；score 是排序依据，比如分数、热度、最后消息时间。
业务更新时调整 score，展示时直接取 Top N。
它的优势是实时排序和范围查询很方便，但如果需要长期分析或强审计，最终数据仍然要落库或进数仓。
```

满分心智：

```text
排行榜场景考的是：ZSet = 唯一成员 + 分数排序 + Top N 查询。
```

## 9. Redis 底层原理主干

### 9.1 数据到底怎么存

业务层看到的是：

```text
key -> value
```

Redis 内部大致可以理解成：

```text
Redis DB
  |
  v
全局哈希表 dict
  |
  |-- key1 -> redisObject(value1)
  |-- key2 -> redisObject(value2)
  |-- key3 -> redisObject(value3)
```

小白注释：

```text
哈希表可以先理解成一本超快的目录。
给它一个 key，它能很快定位到对应的 value。
```

value 不是只有字符串，它会带上类型信息：

```text
redisObject
  |
  |-- type：String / Hash / List / Set / ZSet / Stream
  |-- encoding：底层具体编码
  |-- ptr：指向真实数据
```

常见对应关系：

| Redis 类型 | 业务理解 | 典型场景 |
|---|---|---|
| String | 一个值 | JSON 缓存、计数器、验证码 |
| Hash | 一个对象的多个字段 | 用户信息、购物车 |
| List | 按顺序排队 | 简单任务队列 |
| Set | 不重复集合 | 去重、标签、用户集合 |
| ZSet | 带分数的有序集合 | 排行榜、最近会话 |
| Stream | 可消费的事件流 | 更可靠的消息队列 |

### 9.2 Redis 为什么快

先给结论：

```text
Redis 快，不是因为一个神奇技巧，而是多个设计叠加：
数据主要在内存
key 查找走哈希表
命令执行模型简单
数据结构为业务场景定制
网络和 IO 模型高效
```

ASCII 图：

```text
请求到 Redis
  |
  v
事件循环接收命令
  |
  v
哈希表定位 key
  |
  v
在内存数据结构上操作
  |
  v
返回结果
```

费曼解释：

```text
数据库查磁盘像去仓库翻箱子。
Redis 查内存像在桌面上拿便签。
当然快。
```

面试里要答完整：

```text
第一，Redis 主要数据在内存里，避免了大量磁盘随机 IO。
第二，Redis 通过 key 的哈希定位数据，很多操作时间复杂度很低。
第三，经典 Redis 命令执行模型强调单线程顺序执行，减少锁竞争，也让单条命令具备天然原子性。
第四，它提供 String、Hash、List、Set、ZSet、Stream 这些面向场景的数据结构，业务不用自己在数据库里硬拼。
第五，Redis 支持 TTL、原子命令、Lua 等能力，能把很多中间态操作做得很轻。
```

小白注释：

```text
单线程不是说 Redis 整个程序永远只有一个线程。
面试里重点讲的是：核心命令执行路径避免大量多线程锁竞争。
```

### 9.3 Redis 数据是不是只在内存

不是。

Redis 主要数据在内存，但可以配置持久化。

常见方式：

| 方式 | 直觉解释 | 优点 | 缺点 |
|---|---|---|---|
| RDB | 定期拍快照 | 恢复快、文件紧凑 | 可能丢最近一段数据 |
| AOF | 记录每次写命令 | 数据更完整 | 文件更大，恢复可能更慢 |
| RDB + AOF | 快照 + 写日志 | 兼顾恢复速度和完整性 | 配置和运维更复杂 |
| 不持久化 | 纯缓存 | 最快最轻 | 重启后数据丢失 |

费曼解释：

```text
RDB 像每隔一段时间拍一张全家福。
AOF 像把每一步操作都写进日记。
全家福恢复快，但可能漏掉最近几分钟。
日记更细，但太长了读起来也更慢。
```

引导思考：

```text
不是所有 Redis 数据都需要持久化。
商品缓存、验证码、manifest 缓存，丢了可以重建。
但如果你把重要业务事实只放 Redis，那就要非常小心持久化和高可用。
```

### 9.4 TTL 和淘汰

TTL 是 key 的过期时间。

```text
SET login:code:13800000000 123456 EX 300
```

表示这个验证码 300 秒后过期。

小白注释：

```text
TTL 就像食物保质期。
过期以后，这个 key 就不应该再被使用。
```

淘汰策略是 Redis 内存满了以后，决定删谁。

面试表达：

```text
TTL 解决的是“这个数据本来就应该什么时候失效”。
淘汰策略解决的是“内存不够了，被迫删哪些数据”。
这两个概念不要混。
```

### 9.5 主从、哨兵、Cluster

单机 Redis 可能挂，所以线上一般会有高可用设计。

```text
主从复制：
主节点负责写，从节点复制数据，可以承担读或作为故障切换基础。

哨兵：
监控主从节点，主挂了以后自动选一个从节点变主。

Cluster：
把数据按 hash slot 分散到多个节点，提升容量和吞吐。
```

ASCII 图：

```text
主从复制

Client
  |
  v
Master Redis
  |
  |-- Replica 1
  |
  |-- Replica 2
```

```text
Cluster

key A -> slot 100   -> Node 1
key B -> slot 9000  -> Node 2
key C -> slot 15000 -> Node 3
```

引导思考：

```text
高可用不是让 Redis 变成强一致数据库。
复制可能是异步的，故障切换时仍然可能有少量数据风险。
所以核心事实源仍然要谨慎设计。
```

## 10. 高频面试题与满分答案

### 10.1 Redis 为什么快

思维导图关键点：

```text
内存访问
哈希定位
单线程命令执行减少锁竞争
高效 IO
定制数据结构
```

60-90 秒口语稿：

```text
Redis 快主要是几个原因叠加。
第一，它主要把数据放在内存里，避免了大量磁盘随机 IO。
第二，Redis 是 key-value 模型，key 通常通过哈希表快速定位，很多操作复杂度很低。
第三，经典 Redis 的命令执行路径强调单线程顺序执行，避免多线程锁竞争，也让单条命令具备天然原子性。
第四，它提供 String、Hash、List、Set、ZSet、Stream 等定制数据结构，比如排行榜直接用 ZSet，队列可以用 List 或 Stream，不需要业务自己在数据库里硬拼。
比如商品详情缓存或 Agent 的 manifest 缓存，本质都是把高频读取的结果放到内存层，减少下游压力。
```

### 10.2 Redis 的数据到底怎么存

思维导图关键点：

```text
全局 dict
key
redisObject
type
encoding
真实数据结构
```

60-90 秒口语稿：

```text
从业务视角看，Redis 是 key-value。
但内部不是简单字符串 Map。Redis DB 里有类似全局哈希表的结构，通过 key 定位 value。
value 会被包装成对象，里面记录类型，比如 String、Hash、List、Set、ZSet、Stream，也会记录底层编码和真实数据指针。
所以同样是一个 key，value 可能是一段字符串，也可能是一个哈希对象、列表、集合或有序集合。
比如审批上下文可以用 String 存 JSON，购物车可以用 Hash，排行榜可以用 ZSet。
```

### 10.3 Redis 常见数据结构怎么选

| 业务问题 | 推荐结构 | 理由 |
|---|---|---|
| 缓存一段 JSON | String | 简单直接 |
| 存对象多个字段 | Hash | 可按字段更新 |
| 做简单队列 | List | 按顺序 push/pop |
| 做去重集合 | Set | 成员不重复 |
| 做排行榜 | ZSet | member + score |
| 做更可靠事件流 | Stream | 有消息 ID、消费组、ack 能力 |

口语稿：

```text
我不会先背数据结构，而是先看业务需要。
如果只是缓存一段结果，比如商品详情 JSON，用 String 就够。
如果是购物车这种对象字段结构，可以用 Hash。
如果是后台任务排队，可以用 List；如果需要消费者组、ack 和重试状态，可以升级到 Stream。
如果是去重关系，比如某用户是否参加过活动，用 Set。
如果是热榜、排行榜、最近会话，用 ZSet，因为它天然支持按 score 排序。
```

### 10.4 缓存和数据库如何保证一致性

思维导图关键点：

```text
Cache Aside
先更新 DB
再删除缓存
消息补偿
允许短暂不一致
```

口语稿：

```text
常见模式是 Cache Aside。
读的时候先查 Redis，未命中再查数据库并写回缓存。
写的时候通常先更新数据库，再删除缓存，而不是直接更新缓存。
因为删除缓存后，下一次读会重新从数据库加载最新值。
如果业务对一致性要求更高，可以用消息队列做删除缓存的补偿，或者对热点 key 做延迟双删。
这里要承认一点：缓存和数据库很难做到绝对强一致，工程上通常追求可接受的短暂不一致和最终一致。
```

### 10.5 缓存穿透、击穿、雪崩是什么

```text
穿透：查不存在的数据，缓存和数据库都没有。
解决：空值缓存、布隆过滤器、参数校验。

击穿：一个超级热点 key 过期，大量请求同时打数据库。
解决：互斥锁、逻辑过期、后台刷新。

雪崩：大量 key 同时过期或 Redis 故障，数据库瞬间被打爆。
解决：TTL 随机化、多级缓存、限流降级、高可用。
```

费曼解释：

```text
穿透：问一个不存在的人住哪，前台没有，档案室也没有，但每次都去档案室查。
击穿：全公司都在问同一个爆款商品，白板上这条刚好擦掉了，大家一起冲进档案室。
雪崩：白板上一大片内容同一时间都过期了，所有人都去档案室。
```

### 10.6 Redis 分布式锁怎么实现，有什么坑

基本写法：

```text
SET lock:resource:{id} {requestId} NX EX 30
```

释放锁要校验 requestId：

```text
if GET lockKey == requestId:
  DEL lockKey
```

小白注释：

```text
requestId 是为了证明这把锁是我加的。
否则我的锁过期后，别人刚加了新锁，我再执行 DEL，就可能删掉别人的锁。
```

面试回答：

```text
Redis 分布式锁通常用 SET key value NX EX seconds。
NX 保证只有锁不存在时才能加锁，EX 保证服务挂了锁也能过期。
value 要放唯一 requestId，释放锁时用 Lua 脚本保证“判断 requestId 和删除锁”是原子的，避免误删别人的锁。
还要注意锁超时时间要覆盖业务执行时间，长任务要考虑续期，极高一致性场景不能只依赖简单 Redis 锁。
```

### 10.7 Redis 能不能做消息队列

结论：

```text
能，但要看可靠性要求。
```

List 队列：

```text
生产者 LPUSH queue task
消费者 BRPOP queue
```

Stream 队列：

```text
XADD stream task
XREADGROUP 读取
XACK 确认
```

对比：

| 方案 | 适合场景 | 局限 |
|---|---|---|
| List | 简单后台任务 | ack、重试、消费组能力弱 |
| Stream | 更像消息流 | 使用复杂度更高 |
| 专业 MQ | 强可靠、复杂路由、大规模消息 | 引入额外系统成本 |

面试回答：

```text
Redis 可以做队列。简单任务可以用 List，通过 LPUSH 和 BRPOP 实现生产消费。
如果需要消息 ID、消费者组、ack、pending 消息追踪和重试，Redis Stream 更合适。
但如果是核心交易消息、强可靠消息、大规模复杂路由，通常还是会选择 Kafka、RocketMQ 这类专业 MQ。
所以我会把 Redis 队列用于轻量后台任务、削峰和短链路异步，不会默认把它当所有消息场景的最终方案。
```

### 10.8 Agent 场景里为什么 Redis 同时能做锁、缓存、队列

口语稿：

```text
因为 Agent 系统里有很多 session 维度的短生命周期状态。
比如恢复、重置、GC 需要互斥，所以用 Redis 分布式锁。
最新 manifest 读取频繁，但可以从 Mongo 重建，所以适合 Redis 缓存。
聊天轮次和持久化任务不适合同步阻塞用户请求，所以可以用 Redis List 或 Stream 做后台队列。
token 刷新怕并发轮转，所以用短 TTL 锁保证同一 session 同一时间只有一个刷新操作。
这些场景共同点是高频、短期、并发敏感、可恢复或可补偿，所以 Redis 很合适。
```

### 10.9 Redis 挂了怎么办

思维导图关键点：

```text
数据分类
缓存可重建
状态可重试
核心事实不能只放 Redis
主从哨兵 Cluster
降级限流
```

口语稿：

```text
Redis 挂了以后怎么处理，首先要看里面放的是什么数据。
如果是商品详情缓存、manifest 缓存，丢了可以回源数据库或 Mongo，只是性能下降。
如果是验证码、OAuth state，用户可以重新发起流程。
如果是分布式锁，可能要依赖 TTL 和业务幂等兜底。
但如果是订单、最终权限、最终库存这类核心事实，就不能只放 Redis。
线上一般还会用主从复制、哨兵或 Cluster 提高可用性，同时业务侧要有限流、降级、回源保护，防止 Redis 故障把数据库打穿。
```

## 11. 一句话总结

Redis 的面试核心不是背命令，而是讲清楚它在业务系统里承担什么角色。

最终收束：

```text
Redis 是以内存为主的高性能数据结构服务器。
它适合做缓存、短生命周期状态、分布式锁、轻量队列、计数限流和排行榜。
业务上要先区分 Redis 里的数据是加速层、中间态还是最终事实。
如果能从主存储恢复，Redis 丢了最多变慢；如果是核心事实，就必须落数据库或有持久化和补偿。
面试里把业务场景、数据结构、并发风险、失败兜底一起讲出来，才是项目级 Redis 回答。
```

## 12. 复习顺序

第一轮只背这 6 个业务职责：

```text
缓存
临时状态
分布式锁
队列
计数限流
排行集合
```

第二轮按 case 复述：

```text
审批：临时上下文和幂等
电商商品：热点缓存
电商秒杀：原子扣减和削峰
Agent：锁、manifest 缓存、队列、auth 刷新
登录：TTL 状态
排行榜：ZSet 排序
```

第三轮背面试题：

```text
为什么快
数据怎么存
数据结构怎么选
缓存一致性
穿透击穿雪崩
分布式锁
队列 List vs Stream
Redis 挂了怎么办
```

## 13. 资料依据

- Redis 官方 Data types：<https://redis.io/docs/latest/develop/data-types/>
- Redis 官方 Lists：<https://redis.io/docs/latest/develop/data-types/lists/>
- Redis 官方 Streams：<https://redis.io/docs/latest/develop/data-types/streams/>
- Redis 官方 Sorted sets：<https://redis.io/docs/latest/develop/data-types/sorted-sets/>
- Redis 官方 Distributed locks：<https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/>
- Redis 官方 Persistence：<https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/>
- Redis 官方 Replication：<https://redis.io/docs/latest/operate/oss_and_stack/management/replication/>
