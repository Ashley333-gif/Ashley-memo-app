const { clipboard, nativeImage } = require('electron');
const { addItem, updateItemImagePath, saveImage } = require('./database');

let lastText = '';
let lastImageHash = '';
let watchInterval = null;

// 简单哈希用于快速比较
function simpleHash(buf) {
  if (!buf || buf.length === 0) return '';
  let hash = 0;
  // 只取前 4096 字节 + 后 4096 字节 + 长度做快速比较
  const len = Math.min(buf.length, 4096);
  for (let i = 0; i < len; i++) hash = ((hash << 5) - hash + buf[i]) | 0;
  for (let i = Math.max(0, buf.length - 4096); i < buf.length; i++) hash = ((hash << 5) - hash + buf[i]) | 0;
  return `${buf.length}_${hash}`;
}

// 检查剪贴板变化
function checkClipboard(onNewItem) {
  const formats = clipboard.availableFormats();

  // 检查图片（仅当剪贴板包含图片格式时）
  if (formats.includes('image/png') || formats.includes('image/tiff')) {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const pngData = image.toPNG();
      const hash = simpleHash(pngData);
      if (hash !== lastImageHash) {
        lastImageHash = hash;
        lastText = '';

        const item = addItem('image', null, null, null);
        const imagePath = saveImage(pngData, item.id);
        const thumb = nativeImage.createFromBuffer(pngData).resize({ height: 60 });
        const thumbPath = saveImage(thumb.toPNG(), item.id, '_thumb');
        const updatedItem = updateItemImagePath(item.id, imagePath, thumbPath);

        if (onNewItem) onNewItem(updatedItem);
        return;
      }
    }
  }

  // 检查文字
  const text = clipboard.readText();
  if (text && text !== lastText) {
    lastText = text;
    lastImageHash = '';

    const item = addItem('text', text, null, null);
    if (onNewItem) onNewItem(item);
  }
}

function startWatching(onNewItem) {
  watchInterval = setInterval(() => checkClipboard(onNewItem), 1500);
}

function stopWatching() {
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
  }
}

module.exports = { startWatching, stopWatching };
