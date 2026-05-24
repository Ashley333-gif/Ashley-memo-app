const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

// 数据库文件路径
function getDbPath() {
  const userDataPath = require('electron').app
    ? require('electron').app.getPath('userData')
    : path.join(__dirname, 'data');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'ashleymemo.db');
}

// 图片存储目录
function getImagesDir() {
  const userDataPath = require('electron').app
    ? require('electron').app.getPath('userData')
    : path.join(__dirname, 'data');
  const imagesDir = path.join(userDataPath, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
}

// 初始化数据库
function initDatabase() {
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT,
      image_path TEXT,
      image_thumb TEXT,
      app_source TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 插入默认设置（如果不存在）
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('retention_days', '3');
  insertSetting.run('auto_launch', 'true');

  return db;
}

// 获取历史列表
function getHistory(searchQuery, limit = 100, offset = 0) {
  let query = 'SELECT * FROM history';
  const params = [];

  if (searchQuery && searchQuery.trim()) {
    query += ' WHERE content LIKE ?';
    params.push(`%${searchQuery.trim()}%`);
  }

  query += ' ORDER BY is_pinned DESC, created_at DESC';
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

// 添加记录
function addItem(type, content, imagePath, imageThumb) {
  const stmt = db.prepare(`
    INSERT INTO history (type, content, image_path, image_thumb, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(type, content || null, imagePath || null, imageThumb || null, Date.now());

  return db.prepare('SELECT * FROM history WHERE id = ?').get(result.lastInsertRowid);
}

// 删除记录
function deleteItem(id) {
  const item = db.prepare('SELECT * FROM history WHERE id = ?').get(id);
  if (!item) return false;

  // 删除图片文件
  if (item.image_path && fs.existsSync(item.image_path)) {
    fs.unlinkSync(item.image_path);
  }
  if (item.image_thumb && fs.existsSync(item.image_thumb)) {
    fs.unlinkSync(item.image_thumb);
  }

  db.prepare('DELETE FROM history WHERE id = ?').run(id);
  return true;
}

// 置顶/取消置顶
function pinItem(id, isPinned) {
  db.prepare('UPDATE history SET is_pinned = ? WHERE id = ?').run(isPinned ? 1 : 0, id);
  return true;
}

// 获取所有设置
function getSettings() {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// 修改设置
function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  return true;
}

// 根据保留天数清理过期记录
function getRetentionDays() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'retention_days'").get();
  return parseInt(row ? row.value : '3', 10);
}

function cleanupExpired() {
  const retentionDays = getRetentionDays();
  const cutoff = Date.now() - retentionDays * 86400000;

  const expiredItems = db.prepare(
    'SELECT * FROM history WHERE is_pinned = 0 AND created_at < ?'
  ).all(cutoff);

  for (const item of expiredItems) {
    if (item.image_path && fs.existsSync(item.image_path)) {
      fs.unlinkSync(item.image_path);
    }
    if (item.image_thumb && fs.existsSync(item.image_thumb)) {
      fs.unlinkSync(item.image_thumb);
    }
  }

  db.prepare('DELETE FROM history WHERE is_pinned = 0 AND created_at < ?').run(cutoff);
  return expiredItems.length;
}

// 更新记录的图片路径
function updateItemImagePath(id, imagePath, imageThumb) {
  if (imageThumb) {
    db.prepare('UPDATE history SET image_path = ?, image_thumb = ? WHERE id = ?').run(imagePath, imageThumb, id);
  } else {
    db.prepare('UPDATE history SET image_path = ? WHERE id = ?').run(imagePath, id);
  }
  return db.prepare('SELECT * FROM history WHERE id = ?').get(id);
}

// 保存图片到本地
function saveImage(imageData, id, suffix = '') {
  const imagesDir = getImagesDir();
  const filename = `${id}${suffix}_${Date.now()}.png`;
  const filepath = path.join(imagesDir, filename);
  fs.writeFileSync(filepath, imageData);
  return filepath;
}

// 定期压缩 WAL 日志
function checkpointWAL() {
  if (db) {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) { /* ignore */ }
  }
}

module.exports = {
  initDatabase,
  getHistory,
  addItem,
  deleteItem,
  pinItem,
  updateItemImagePath,
  getSettings,
  setSetting,
  getRetentionDays,
  cleanupExpired,
  checkpointWAL,
  saveImage,
  getImagesDir
};
