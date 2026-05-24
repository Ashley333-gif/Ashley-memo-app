const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取历史列表
  getHistory: (searchQuery, limit, offset) => {
    return ipcRenderer.invoke('get-history', searchQuery, limit, offset);
  },

  // 置顶/取消置顶
  pinItem: (id, isPinned) => {
    return ipcRenderer.invoke('pin-item', id, isPinned);
  },

  // 删除记录
  deleteItem: (id) => {
    return ipcRenderer.invoke('delete-item', id);
  },

  // 复制文字到剪贴板
  copyToClipboard: (text) => {
    ipcRenderer.send('copy-to-clipboard', text);
  },

  // 复制图片到剪贴板
  copyImageToClipboard: (imagePath) => {
    ipcRenderer.send('copy-image-to-clipboard', imagePath);
  },

  // 获取设置
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },

  // 修改设置
  setSetting: (key, value) => {
    return ipcRenderer.invoke('set-setting', key, value);
  },

  // 监听新条目（剪贴板有新内容时触发）
  onNewItem: (callback) => {
    ipcRenderer.on('new-item', (event, item) => callback(item));
  }
});
