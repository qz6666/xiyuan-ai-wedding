# AI 婚礼流程系统

一个面向婚礼筹备的本地工作台，用来集中管理筹备阶段、任务、预算、宾客、供应商和 AI 文案建议。

## 当前版本

- 筹备阶段看板：定方向、订资源、做内容、落执行
- 任务管理：按阶段筛选、新增任务、切换任务状态
- 预算总览：计划预算、已支付金额、分项进度
- 宾客进度：邀请人数、确认人数、预计桌数
- 供应商状态：签约、比价、待沟通
- AI 辅助：婚礼流程、誓词、父母致辞、请柬文案的初版建议

## 本地运行

```bash
npm install
npm run dev
```

当前开发预览地址通常是 `http://localhost:3001/`。

## 页面入口

首页只展示红金首屏、功能卡片和导航，点击入口后打开独立工具页。所有工具共用原来的本机和账号云端资料。

| 功能 | 地址 |
| --- | --- |
| 首页 | `/` |
| 喜缘小助手 | `/workspace/service` |
| 新人资料 | `/workspace/profile` |
| 备婚计划 / 阶段计划 / 预算 | `/workspace/plan`、`/workspace/details`、`/workspace/budget` |
| AI 文案 / AI 影像 | `/workspace/copywriting`、`/workspace/media-studio` |
| 婚礼故事采集卡 | `/wedding-story/` |
| 业务工具入口 | `/workspace/business` |
| 宾客 / 供应商 / 排桌 | `/workspace/guests`、`/workspace/vendors`、`/workspace/seating` |
| 当天流程 / 现场指挥 / 回收站 | `/workspace/timeline`、`/workspace/wedding-command`、`/workspace/recycle-bin` |
| 协助清单 / 账号 | `/workspace/collaboration`、`/workspace/account` |

旧的 `/#plan` 等模块锚点会自动转到相应的独立页面。

## 验证

```bash
npm test
```

测试会构建页面并检查婚礼系统的核心内容是否能正常渲染。

## Render 部署

仓库根目录包含 `render.yaml`。在 Render 创建 Blueprint 并连接
`qz6666/xiyuan-ai-wedding` 后，Render 会执行 `npm ci && npm run build`，再通过
`npm start` 启动服务。

Render 可以托管网页和公开工具页。账号、跨设备云端同步、云端素材库和后台视频
队列依赖 Cloudflare D1/KV/R2/Queue；未迁移到 Render Postgres、对象存储和后台
任务系统前，这些功能会显示云端服务未连接。浏览器本机保存仍可正常使用。

## 后续迭代建议

- 把示例数据改成可编辑的婚礼项目资料
- 增加导出流程表、预算表、座位表的功能
- 接入真实 AI 模型生成誓词、请柬、主持词和当天流程单
- 增加账号、云端保存和多角色协作
