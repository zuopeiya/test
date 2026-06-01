# 前后端分离个人名片网站

这是一个不依赖第三方安装包的多人个人名片网站示例，适合本地演示、二次开发和后续部署。访客可以创建自己的名片，并获得一个公开访问地址。

## 项目结构

```text
mingpian/
  backend/              # 独立后端 API
    data/cards.json     # 多张名片数据
    data/profile.json   # 名片资料数据
    server.js           # Node.js HTTP 服务
  frontend/             # 独立前端站点
    index.html
    styles.css
    app.js
    dev-server.js       # 本地静态资源服务
  docs/
    project-plan.md     # 项目规划
  package.json
```

## 本地运行

先启动后端接口：

```bash
node backend/server.js
```

再启动前端页面：

```bash
node frontend/dev-server.js
```

打开：

```text
http://localhost:5173
```

常用页面：

```text
http://localhost:5173/             # 首页
http://localhost:5173/create       # 创建名片
http://localhost:5173/u/linzhixing # 示例公开名片
http://localhost:5173/edit/linzhixing # 编辑示例名片
```

后端接口：

```text
GET http://localhost:4000/api/profile
GET http://localhost:4000/api/health
GET http://localhost:4000/api/cards
GET http://localhost:4000/api/cards/:slug
POST http://localhost:4000/api/cards
PUT http://localhost:4000/api/cards/:slug
```

## 修改名片内容

默认示例名片来自 `backend/data/cards.json`。创建新名片时，后端会把资料保存到这个 JSON 文件里。

创建名片时需要设置编辑密码；公开访问不需要密码，编辑保存时需要输入创建时设置的密码。示例名片 `linzhixing` 的本地编辑密码是 `123456`。
