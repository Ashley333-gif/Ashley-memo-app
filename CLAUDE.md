# CLAUDE.md — AshleyMemo 项目指引

## 项目简介

AshleyMemo 是一款 macOS 菜单栏剪贴板历史管理器，基于 Electron 构建，自动记录文字和图片复制内容。

## 标准文档路径

| 文档 | 路径 | 说明 |
|------|------|------|
| 用户需求 | [docs/requirements.md](docs/requirements.md) | 功能需求和用户故事 |
| 技术规格 | [docs/technical-spec.md](docs/technical-spec.md) | 技术栈、数据库设计、IPC 接口 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 色彩、布局、组件规格 |
| 执行步骤 | [docs/implementation-steps.md](docs/implementation-steps.md) | 分阶段开发计划 |

## 开发日志

每次开发前在 [dev-logs/](dev-logs/) 目录创建当日日志文件（格式 `YYYY-MM-DD.md`），参考 [dev-logs/template.md](dev-logs/template.md) 模板。

## 工作约定

- 每次改动前先查看相关标准文档，确保改动符合需求、技术方案和设计规范
- 阶段性改动遵循 [docs/implementation-steps.md](docs/implementation-steps.md) 中的顺序
- 改动完成后更新当日的开发日志
- 不要一次性做大范围改动，按阶段稳定推进
- 数据库 schema 变更需同步更新 [docs/technical-spec.md](docs/technical-spec.md)
- UI 样式变更需同步更新 [docs/design-spec.md](docs/design-spec.md)

## 关键命令

```bash
# 安装依赖
npm install

# 开发模式运行
npm start

# 打包为 .dmg
npm run build
```
