# 九十九散记 · 网站源码

《九十九散记》的静态展示站,线上地址:**https://jiushijiu.pages.dev**

高一七班的集体回忆录。纯静态 HTML / CSS / JavaScript,**数据全部内嵌在 JS 文件中,无需构建、无需服务器**,由一份 Word 文档自动切分整理而成。

## 文件结构

```
index.html                  页面骨架(顶栏 / 阅读进度条 / 容器 / 字号切换)
css/style.css               全部样式(淡色素色主题,:root 变量控制配色与字号)
js/data.js                  正文数据:25 个章节,由 Word 文档自动切分生成
js/extra.js                 手工数据:29 位人物小传、14 条时间线、15 条高光语录
js/app.js                   hash 路由与页面渲染(首页 / 阅读 / 人物 / 时间线 / 语录 / 关于)
functions/_lib/api.js         两个接口共用的辅助模块(CORS、限流、校验、IP 哈希)
functions/api/comments.js   留言接口(Pages Functions,绑定 D1)
functions/api/quotes.js     划线评论接口
wrangler.toml               Pages 项目配置(D1 绑定)
```

全仓库约 1700 行,没有任何依赖清单或打包配置。

## 页面与路由

纯前端 hash 路由,单文件 SPA 风格,支持 `file://` 直接打开:

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `#/` | 首页 | 入口卡片,展示人物数量等概览 |
| `#/read/01` … `#/read/25` | 阅读 | 单章节正文,分栏布局(章节列表 + 正文) |
| `#/characters` | 人物图鉴 | 29 位人物卡片列表 |
| `#/character/<id>` | 人物详情 | 小传 + 由 `aliases` 自动从正文抽取的相关片段 |
| `#/timeline` | 时间线 | 14 个关键节点,可跳转到对应章节 |
| `#/quotes` | 高光语录 | 15 条语录,标注出处章节 |
| `#/about` | 关于 | 说明页 |

字体大小分三档(小 / 中 / 大),实现方式是全站 `px → rem` 后调整根字号(14.5 / 16 / 18px),由顶栏按钮切换。

## 留言功能

这是全站**唯一的动态部分**,跑在 Cloudflare Pages Functions + D1 上。

- 章节页与人物页底部各有一个留言区
- **划线评论**:在正文里划选一句话即可"引用留言",原句带荧光标记,悬停显示该句的所有评论

### 接口

```
GET    /api/comments?page=<pageId>                     列出某页留言(最多 200 条)
POST   /api/comments     body: { page, name, text }     发表评论
GET    /api/quotes?page=<pageId>                       列出某页划线评论(最多 500 条)
POST   /api/quotes       body: { page, para_idx, quote, name, text }
DELETE /api/comments?id=<id>&key=<ADMIN_KEY>           管理员删除
DELETE /api/quotes?id=<id>&key=<ADMIN_KEY>             管理员删除
```

两个接口各自只处理自己那条路径,共用的 CORS、限流计数、字段校验、IP 哈希等逻辑集中在 `functions/_lib/api.js`。表名(`comments` / `quote_comments`)是文件内的常量,不是用户输入,因此拼进 SQL 是安全的;新增接口时同样请保持这个约定。

> 早期版本的 `comments.js` 里还重复写了一份 `/api/quotes` 的处理分支,属于永远不会被执行到的死代码,现已删除。

### 数据表

D1 数据库 `jiushijiu-comments` 中有两张表:

```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL, name TEXT, text TEXT NOT NULL,
  ip_hash TEXT, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE quote_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL, para_idx INTEGER, quote TEXT,
  name TEXT, text TEXT NOT NULL,
  ip_hash TEXT, created_at TEXT DEFAULT (datetime('now'))
);
```

### 限制与防滥用

- 同一 IP **十分钟内各最多 3 条**(两张表分别计数)
- 昵称 ≤ 20 字,内容 ≤ 500 字,引用原句 2–150 字,`page` 参数须匹配 `/^[a-z0-9-]{1,80}$/`
- IP 取自 `CF-Connecting-IP`,只以 `sha256(盐 + IP)` 形式存储,**不保存明文**
- CORS 白名单:`jiushijiu.pages.dev` 及其 `*.jiushijiu.pages.dev` 子域、`http://localhost:8899`、`null`(本地双击打开);同源 GET 不带 Origin 头时放行

### 管理员密钥

`ADMIN_KEY` 从环境变量 `env.ADMIN_KEY` 读取,**不写在仓库里**,需在 Cloudflare 面板或用 `wrangler pages secret` 设置。作者本地那份明文存在 `D:\jiushijiu\comments-worker\admin_key.txt`,切勿提交。

删除示例:

```
curl -X DELETE "https://jiushijiu.pages.dev/api/comments?id=1&key=<你的ADMIN_KEY>"
curl -X DELETE "https://jiushijiu.pages.dev/api/quotes?id=1&key=<你的ADMIN_KEY>"
```

### 新增接口的注意点

Pages Functions **按文件路径路由**:`functions/api/comments.js` → `/api/comments`。新增接口必须建对应的 `functions/api/xxx.js` 文件,在已有文件里加分支不会生效。

## 本地预览

纯静态页面可直接双击 `index.html` 打开(阅读完全正常,但留言接口会失败)。若要调试留言,起一个静态服务器:

```
python -m http.server 8899
# 打开 http://localhost:8899
```

该端口已在接口的 CORS 白名单里。注意留言接口是 Pages Functions,**本地静态服务器不提供 `/api/*`**,完整留言功能需部署后验证。

## 重新部署

Cloudflare 账号需已 `wrangler login`。改完文件后执行:

```
npx wrangler pages deploy . --project-name=jiushijiu --branch=main
```

大约十几秒后 https://jiushijiu.pages.dev 即更新。

首次部署或换账号时,还需在 Cloudflare 侧创建 D1 数据库 `jiushijiu-comments`,并把返回的 `database_id` 填进 `wrangler.toml`。

## 常见修改位置

- **改正文 / 增删章节**:编辑 `js/data.js`。每章是一个 `{ num, title, paragraphs }` 对象,`num` 为两位数字字符串且需连续;章节标题直接取自文档,没有单独的标题映射表
- **改人物、时间线、语录**:编辑 `js/extra.js`(`window.EXTRAS` 下的 `characters` / `timeline` / `quotes` 三个数组)。人物页的"相关片段"由 `aliases` 自动从正文全文匹配抽取,改别名即可调整匹配范围
- **改配色 / 字体**:编辑 `css/style.css` 顶部的 `:root` 变量
- **改导航与页面结构**:编辑 `js/app.js`(路由在 `route()` 函数,各页面渲染函数见同文件)

### 改完记得刷缓存

`index.html` 里的 `?v=` 查询串是手动维护的缓存版本号(`css/style.css?v=...`、`js/data.js?v=...` 等)。**改完对应文件后必须手动更新版本号**,否则浏览器或 Cloudflare 边缘缓存可能仍在加载旧内容:

```html
<script src="js/data.js?v=20261005c"></script>
```

## 注意事项

- 源码含真实同学姓名、班级信息与校内事件描述,对外分享前请自行斟酌
- `wrangler.toml` 中的 `database_id` 属部署绑定信息,不是密钥,可入库