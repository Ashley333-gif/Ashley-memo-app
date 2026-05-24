# AshleyMemo 技术规格文档

## 技术栈

| 层面 | 技术 | 版本要求 |
|------|------|----------|
| 框架 | Electron | ^28.0.0 |
| 数据库 | better-sqlite3 | ^9.0.0 |
| 运行时 | Node.js | ^20.0.0 |
| 打包 | electron-builder | ^24.0.0 |
| 开机启动 | electron-auto-launch | ^1.0.0 |

## 项目结构

```
/Users/zfc/UCI/历史黏贴/
├── CLAUDE.md
├── package.json
├── main.js            # Electron 主进程入口
├── preload.js         # 预加载脚本（IPC 桥接）
├── database.js        # 数据库初始化与操作
├── clipboard.js       # 剪贴板轮询监听
├── renderer/
│   ├── index.html     # 主界面 HTML
│   ├── style.css      # 样式表
│   └── app.js         # 前端渲染逻辑
├── assets/            # 图标资源
├── images/            # 剪贴板图片存储
├── docs/              # 项目文档
└── dev-logs/          # 开发日志
```

## 数据库设计

### 表：history

| 列名 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK AUTOINCREMENT | 主键 |
| type | TEXT NOT NULL | 'text' 或 'image' |
| content | TEXT | 文字内容（type='text'时使用） |
| image_path | TEXT | 原图路径（type='image'时使用） |
| image_thumb | TEXT | 缩略图路径 |
| app_source | TEXT | 来源应用名（预留） |
| is_pinned | INTEGER DEFAULT 0 | 置顶标记 0/1 |
| created_at | INTEGER NOT NULL | Unix 时间戳（毫秒） |

### 表：settings

| 列名 | 类型 | 说明 |
|------|------|------|
| key | TEXT PRIMARY KEY | 设置键名 |
| value | TEXT | 设置值 |

### 默认设置值
- `retention_days`: `"3"`（默认保留3天）
- `auto_launch`: `"true"`（默认开机自启）

## 剪贴板监听机制

- 使用 `setInterval` 每 **500ms** 轮询剪贴板内容
- 比较当前内容与上一次记录内容的哈希值
- 文字：直接比较内容字符串
- 图片：比较 PNG 数据的 Buffer 内容
- 检测到变化后，写入数据库并通知渲染进程

## 过期清理机制

- 应用启动时执行一次清理
- 之后每隔 **1小时** 执行一次清理
- 清理条件：`created_at < (当前时间 - retention_days * 86400000)` 且 `is_pinned = 0`
- 图片记录清理时同时删除 `images/` 下的原图和缩略图文件

## IPC 通信接口

主进程暴露给渲染进程的 API（通过 preload.js）：

```
window.electronAPI = {
  getHistory(searchQuery, limit, offset) → Promise<Array>
  pinItem(id, isPinned)                  → Promise<void>
  deleteItem(id)                         → Promise<void>
  copyToClipboard(text)                  → void
  getSettings()                          → Promise<Object>
  setSetting(key, value)                 → Promise<void>
  onNewItem(callback)                    → void (监听新条目)
  openImagePreview(imagePath)            → void
}
```

## 窗口管理

- 菜单栏托盘图标点击：在图标下方弹出 BrowserWindow
- 窗口类型：`type: 'panel'` 或使用 `setVisibleOnAllWorkspaces`
- 窗口失去焦点时自动隐藏（`blur` 事件）
- 窗口尺寸：360×520px，不可调整大小
- 无边框窗口，带圆角和阴影
