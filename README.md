# 九十九散记 · 网站源码

《九十九散记》的静态展示站,线上地址:**https://jiushijiu.pages.dev**

纯静态 HTML / CSS / JavaScript,数据全部内嵌在 js 文件中,无需构建、无需服务器。

## 文件结构

```
index.html      页面骨架(顶栏 / 进度条 / 容器)
css/style.css   全部样式(淡色素色主题)
js/data.js      正文数据:22 个章节 + 空白的第 23 节,由 Word 文档自动切分生成
js/extra.js     手工数据:29 位人物小传、时间线、高光语录
js/app.js       hash 路由与页面渲染(首页 / 阅读 / 人物 / 时间线 / 语录 / 关于)
functions/api/comments.js   留言接口(Pages Functions,绑定 D1 数据库)
wrangler.toml   Pages 项目配置(D1 绑定)
```

## 留言功能

- 章节页与人物页底部各有一个留言区,数据存在 Cloudflare D1 数据库 `jiushijiu-comments`
- 接口:`GET/POST /api/comments`(同域名,无需鉴权);`DELETE /api/comments?id=<id>&key=<ADMIN_KEY>` 供管理员删留言
- 管理员密钥存放在本地 `D:\jiushijiu\comments-worker\admin_key.txt`(不要提交进仓库),删除留言示例:

```
curl -X DELETE "https://jiushijiu.pages.dev/api/comments?id=1&key=<你的ADMIN_KEY>"
```

- 防滥用:同一 IP 十分钟内最多 3 条,昵称 ≤20 字、留言 ≤500 字,IP 只存哈希

## 本地预览

双击 `index.html` 即可,或:

```
python -m http.server 8899
# 打开 http://localhost:8899
```

## 修改内容后重新部署

改完文件后执行(Cloudflare 账号需已 `wrangler login`):

```
npx wrangler pages deploy . --project-name=jiushijiu --branch=main
```

大约十几秒后 https://jiushijiu.pages.dev 即更新。

## 常见修改位置

- **改正文 / 增删章节**:编辑 `js/data.js`(每章是一个 `{ num, title, paragraphs }` 对象;章节标题映射在标题表里)
- **改人物、时间线、语录**:编辑 `js/extra.js`(人物页的"相关片段"由别名自动从正文抽取,改 `aliases` 即可调整匹配)
- **改配色 / 字体**:编辑 `css/style.css` 顶部的 `:root` 变量
