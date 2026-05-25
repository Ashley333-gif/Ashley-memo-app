# AshleyMemo

A pink-themed macOS menu bar clipboard history manager built with Electron.

**AshleyMemo** — 一款粉色主题的 macOS 菜单栏剪贴板历史管理器，基于 Electron 构建。

---

## Features | 功能

- Automatically records all copied text and images | 自动记录所有复制的文字和图片
- Cards displayed in reverse chronological order | 时间降序排列的卡片列表
- Pin important items, delete unwanted ones | 置顶重要内容，删除不需要的记录
- Real-time keyword search | 关键词实时搜索
- Click a card to copy back to clipboard | 点击卡片重新复制到剪贴板
- Set retention period: 1 / 3 / 5 days | 设置保留时长：1天 / 3天 / 5天
- Auto-launch on system startup | 开机自动启动
- Clean pink UI with thumbnail previews | 简洁粉色界面，图片缩略图预览

## Screenshot | 截图

> *Click the pink circle icon in the menu bar to open the panel.*
> *点击菜单栏粉色圆形图标打开面板。*

## Install | 安装

Download the latest `.dmg` from [Releases](../../releases), open it, and drag **AshleyMemo** into **Applications**.

从 [Releases](../../releases) 下载最新的 `.dmg`，打开后将 **AshleyMemo** 拖入 **Applications** 文件夹。

> First launch: right-click the app and select "Open" to bypass Gatekeeper.
> 首次打开：右键点击应用 → 选择"打开"以绕过未签名提示。

## Dev | 开发

```bash
npm install
npm start        # Run in development mode | 开发模式运行
npm run build    # Package as .dmg | 打包为 .dmg
```

## Tech Stack | 技术栈

- Electron 28
- better-sqlite3
- Vanilla HTML / CSS / JavaScript

## License

MIT
