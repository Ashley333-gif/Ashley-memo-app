// ================================
// AshleyMemo — 前端交互逻辑
// ================================

let currentRetentionDays = '3';

function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 259200000) return `${Math.floor(diff / 86400000)} 天前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function createCard(item) {
  const isPinned = item.is_pinned === 1;
  const isImage = item.type === 'image';

  let inner;
  if (isImage) {
    const src = item.image_thumb ? `file://${item.image_thumb}` : (item.image_path ? `file://${item.image_path}` : '');
    inner = `
      ${src ? `<img class="card-image-thumb" src="${src}" decoding="async" loading="lazy" data-full="${item.image_path ? `file://${item.image_path}` : ''}">` : ''}
      <div class="card-image-info">
        <span class="type-label">图片</span>
        <span class="time">${formatTime(item.created_at)}</span>
      </div>`;
  } else {
    inner = `
      <div class="card-text">
        <div class="preview">${escapeHtml(item.content || '')}</div>
        <div class="time">${formatTime(item.created_at)}</div>
      </div>`;
  }

  return `
    <div class="card" data-id="${item.id}" data-type="${item.type}" data-content="${escapeHtml(item.content || '')}" data-image="${item.image_path || ''}">
      ${inner}
      <div class="card-actions">
        <button class="action-btn pin-btn ${isPinned ? 'pinned' : ''}" data-action="pin">${isPinned ? '📌' : '📌'}</button>
        <button class="action-btn delete-btn" data-action="delete">✕</button>
      </div>
    </div>`;
}

function renderCards(items) {
  const cardList = document.getElementById('cardList');
  const emptyState = document.getElementById('emptyState');

  if (!items || items.length === 0) {
    cardList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const pinned = items.filter(i => i.is_pinned === 1);
  const normal = items.filter(i => i.is_pinned === 0);

  let html = pinned.map(createCard).join('');
  if (pinned.length && normal.length) html += '<div class="pinned-divider"><span>置顶</span></div>';
  html += normal.map(createCard).join('');

  cardList.innerHTML = html;
}

// === 事件委托（核心优化：一个监听器处理所有卡片交互） ===
document.getElementById('cardList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.action-btn');
  const card = e.target.closest('.card');

  if (btn) {
    const action = btn.dataset.action;
    const cardEl = btn.closest('.card');
    const id = parseInt(cardEl.dataset.id);

    if (action === 'pin') {
      const isPinned = btn.classList.contains('pinned');
      await window.electronAPI.pinItem(id, !isPinned);
      await loadHistory();
    } else if (action === 'delete') {
      cardEl.classList.add('deleting');
      setTimeout(async () => {
        await window.electronAPI.deleteItem(id);
        await loadHistory();
      }, 150);
    }
    return;
  }

  // 点击缩略图 → 大图预览
  const thumb = e.target.closest('.card-image-thumb');
  if (thumb) {
    const full = thumb.dataset.full;
    if (full) openImagePreview(full);
    return;
  }

  // 点击卡片空白区 → 复制
  if (card) {
    if (card.dataset.type === 'text') {
      window.electronAPI.copyToClipboard(card.dataset.content);
    } else if (card.dataset.image) {
      window.electronAPI.copyImageToClipboard(card.dataset.image);
    }
    showToast(card.dataset.type === 'text' ? '已复制' : '图片已复制');
  }
});

async function loadHistory() {
  const q = document.getElementById('searchInput').value.trim();
  const items = await window.electronAPI.getHistory(q, 200, 0);
  renderCards(items);
}

function openImagePreview(src) {
  const overlay = document.getElementById('imagePreview');
  document.getElementById('imagePreviewImg').src = src;
  overlay.classList.add('visible');
}

function closeImagePreview() {
  document.getElementById('imagePreview').classList.remove('visible');
}

function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg });
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 1200);
}

async function loadSettings() {
  const s = await window.electronAPI.getSettings();
  currentRetentionDays = s.retention_days || '3';
  document.querySelectorAll('.retention-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.days === currentRetentionDays);
  });
}

// === 一次性事件绑定 ===
document.getElementById('searchInput').addEventListener('input', (() => {
  let timer;
  return () => { clearTimeout(timer); timer = setTimeout(loadHistory, 200); };
})());

document.getElementById('retentionButtons').addEventListener('click', async (e) => {
  const btn = e.target.closest('.retention-btn');
  if (!btn) return;
  const days = btn.dataset.days;
  await window.electronAPI.setSetting('retention_days', days);
  currentRetentionDays = days;
  document.querySelectorAll('.retention-btn').forEach(b => b.classList.toggle('active', b === btn));
});

document.getElementById('imagePreview').addEventListener('click', closeImagePreview);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeImagePreview(); });

// 新条目防抖：避免剪贴板高频变化时频繁刷新
let newItemTimer = null;
window.electronAPI.onNewItem(() => {
  clearTimeout(newItemTimer);
  newItemTimer = setTimeout(loadHistory, 500);
});

// Toast 样式
const ts = document.createElement('style');
ts.textContent = `.toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.8);background:rgba(0,0,0,.75);color:#FFF;padding:8px 20px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s}.toast.show{opacity:1;transform:translate(-50%,-50%) scale(1)}`;
document.head.appendChild(ts);

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadHistory();
});
