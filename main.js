// 清除可能干扰的环境变量
delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, Tray, screen, ipcMain, clipboard, nativeImage } = require('electron');
const path = require('path');
const { initDatabase, getHistory, addItem, deleteItem, pinItem, getSettings, setSetting, cleanupExpired, checkpointWAL } = require('./database');
const { startWatching, stopWatching } = require('./clipboard');

// 开机自启
let autoLauncher = null;
try {
  const AutoLaunch = require('electron-auto-launch');
  autoLauncher = new AutoLaunch({ name: 'AshleyMemo' });
} catch (e) {
  console.log('AutoLaunch init failed:', e.message);
}

let tray = null;
let mainWindow = null;
let isQuitting = false;

// 创建托盘图标和窗口
function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 18, height: 18 });
  tray = new Tray(trayIcon);
  tray.setToolTip('AshleyMemo');

  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    mainWindow.hide();
  });
}

function showWindow() {
  if (!tray) return;

  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();

  // 计算窗口位置：托盘图标正下方
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  let y = Math.round(trayBounds.y + trayBounds.height);

  // 确保窗口不超出屏幕
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const screenBounds = display.workArea;

  if (x + windowBounds.width > screenBounds.x + screenBounds.width) {
    x = screenBounds.x + screenBounds.width - windowBounds.width - 8;
  }
  if (x < screenBounds.x) {
    x = screenBounds.x + 8;
  }
  if (y + windowBounds.height > screenBounds.y + screenBounds.height) {
    y = Math.round(trayBounds.y - windowBounds.height);
  }

  mainWindow.setPosition(x, y);
  mainWindow.show();
  mainWindow.focus();
}

// IPC 处理
function setupIPC() {
  ipcMain.handle('get-history', async (event, searchQuery, limit, offset) => {
    return getHistory(searchQuery, limit, offset);
  });

  ipcMain.handle('pin-item', async (event, id, isPinned) => {
    return pinItem(id, isPinned);
  });

  ipcMain.handle('delete-item', async (event, id) => {
    return deleteItem(id);
  });

  ipcMain.handle('get-settings', async () => {
    return getSettings();
  });

  ipcMain.handle('set-setting', async (event, key, value) => {
    const result = setSetting(key, value);
    // 同步开机自启状态
    if (key === 'auto_launch' && autoLauncher) {
      try {
        if (value === 'true') {
          await autoLauncher.enable();
        } else {
          await autoLauncher.disable();
        }
      } catch (e) {
        console.log('AutoLaunch toggle failed:', e.message);
      }
    }
    return result;
  });

  ipcMain.on('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.on('copy-image-to-clipboard', (event, imagePath) => {
    const img = nativeImage.createFromPath(imagePath);
    clipboard.writeImage(img);
  });
}

// 通知渲染进程有新条目
function notifyNewItem(item) {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.webContents.send('new-item', item);
  }
}

// 应用启动
app.whenReady().then(async () => {
  initDatabase();
  cleanupExpired();
  setupIPC();
  createWindow();
  createTray();

  // 开机自启（默认开启）
  if (autoLauncher) {
    try {
      const settings = getSettings();
      if (settings.auto_launch !== 'false') {
        await autoLauncher.enable();
      }
    } catch (e) {
      console.log('AutoLaunch enable failed:', e.message);
    }
  }

  // 启动剪贴板监听
  startWatching((item) => {
    notifyNewItem(item);
  });

  // 每小时清理一次过期记录 + WAL 压缩
  setInterval(() => {
    cleanupExpired();
    checkpointWAL();
  }, 3600000);
});

app.on('window-all-closed', (e) => {
  // 不退出，只隐藏窗口
});

app.on('before-quit', () => {
  isQuitting = true;
  stopWatching();
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  }
});
