const CATEGORIES = {
  income: [
    { id: '仕送り',   emoji: '🏦' },
    { id: 'バイト',   emoji: '💼' },
    { id: '奨学金',   emoji: '📚' },
    { id: 'お祝い',   emoji: '🎁' },
    { id: 'その他収入', emoji: '💰' },
  ],
  expense: [
    { id: '食費',   emoji: '🍜' },
    { id: '交通費', emoji: '🚃' },
    { id: '教材費', emoji: '📖' },
    { id: '娯楽',   emoji: '🎮' },
    { id: '衣服',   emoji: '👕' },
    { id: '医療',   emoji: '💊' },
    { id: '家賃',   emoji: '🏠' },
    { id: '通信費', emoji: '📱' },
    { id: '美容',   emoji: '💇' },
    { id: 'その他', emoji: '🛍️' },
  ],
};

const MASCOTS = { happy: '😊', excited: '🥳', cool: '😎', thinking: '🤔', worried: '😰', cry: '😭', panic: '😱' };

const SPENDING_MSGS = [
  { max: 30,       msg: '節約上手！この調子で頑張ろう！👍',       mascot: 'cool' },
  { max: 50,       msg: 'いい感じ！バランスが取れてるね！💪',     mascot: 'happy' },
  { max: 70,       msg: 'ちょっと使いすぎかも？気をつけて！🤔',   mascot: 'thinking' },
  { max: 90,       msg: 'ピンチ！節約モードに入ろう！⚠️',         mascot: 'worried' },
  { max: 100,      msg: 'もう少しで赤字！踏ん張ろう！🆘',         mascot: 'worried' },
  { max: Infinity, msg: '赤字だよ！出費を減らすか収入を増やそう！🚨', mascot: 'panic' },
];

const state = { month: '', type: 'expense', category: '' };
let budgetChart = null;

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  state.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('date').value = localDateStr(now);

  initMonthNav();
  initTabs();
  initTypeToggle();
  renderCategoryGrid('expense');
  loadSummary();
  loadMonthlyChart();
});

// ── Month navigation ──────────────────────────────────
function initMonthNav() {
  updateMonthDisplay();
  document.getElementById('prevMonth').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
}

function shiftMonth(delta) {
  const [y, m] = state.month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  state.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  updateMonthDisplay();
  document.getElementById('date').value = `${state.month}-01`;
  loadSummary();
  if (document.getElementById('tab-history').classList.contains('active')) loadTransactions();
}

function updateMonthDisplay() {
  const [y, m] = state.month.split('-').map(Number);
  document.getElementById('currentMonth').textContent = `${y}年${m}月`;
}

// ── Tabs ──────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      if (tab.dataset.tab === 'history') loadTransactions();
      if (tab.dataset.tab === 'badges')  loadBadges();
    });
  });
}

// ── Type toggle ───────────────────────────────────────
function initTypeToggle() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.type = btn.dataset.type;
      state.category = '';
      renderCategoryGrid(state.type);
      const sb = document.getElementById('submitBtn');
      sb.className = `submit-btn ${state.type}-mode`;
      sb.textContent = state.type === 'income' ? '収入を登録！💚' : '支出を登録！💸';
    });
  });
}

// ── Category grid ─────────────────────────────────────
function renderCategoryGrid(type) {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  CATEGORIES[type].forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.id   = cat.id;
    btn.dataset.type = type;
    btn.innerHTML = `<span class="emoji">${cat.emoji}</span><span>${cat.id}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.category = cat.id;
      btn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1.08)' }],
        { duration: 220 }
      );
    });
    grid.appendChild(btn);
  });
}

// ── Monthly chart ─────────────────────────────────────
async function loadMonthlyChart() {
  try {
    const data = await api('/api/monthly');
    const ctx = document.getElementById('budgetChart').getContext('2d');

    if (budgetChart) budgetChart.destroy();

    budgetChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: '収入',
            data: data.map(d => d.income),
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: '支出',
            data: data.map(d => d.expense),
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: c => ` ${c.dataset.label}: ¥${c.raw.toLocaleString('ja-JP')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 11 },
              callback: v => v >= 10000 ? `¥${(v / 10000).toFixed(0)}万` : `¥${v.toLocaleString()}`,
            },
          },
        },
      },
    });
  } catch (e) { console.error(e); }
}

// ── API helpers ───────────────────────────────────────
async function loadSummary() {
  try {
    const data = await api(`/api/summary?month=${state.month}`);
    document.getElementById('totalIncome').textContent  = fmt(data.income);
    document.getElementById('totalExpense').textContent = fmt(data.expense);

    const balEl   = document.getElementById('totalBalance');
    const balCard = balEl.closest('.card');
    if (data.balance < 0) {
      balEl.textContent = '-' + fmt(Math.abs(data.balance));
      balCard.classList.add('negative');
    } else {
      balEl.textContent = fmt(data.balance);
      balCard.classList.remove('negative');
    }
    updateSpendingBar(data.income, data.expense);
  } catch (e) { console.error(e); }
}

async function loadTransactions() {
  try {
    const data = await api(`/api/transactions?month=${state.month}`);
    renderTransactions(data);
  } catch (e) { console.error(e); }
}

async function loadBadges() {
  try {
    const data = await api('/api/badges');
    renderBadges(data);
  } catch (e) { console.error(e); }
}

async function api(url, options = {}) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTPエラー ${res.status}`);
  }
  return res.json();
}

// ── Spending bar ──────────────────────────────────────
function updateSpendingBar(income, expense) {
  const pct = income > 0 ? Math.round((expense / income) * 100) : (expense > 0 ? 999 : 0);
  const display = income > 0 ? `${pct}%` : (expense > 0 ? '∞%' : '0%');
  document.getElementById('spendingPercent').textContent = display;

  const bar = document.getElementById('spendingBar');
  bar.style.width = `${Math.min(pct, 100)}%`;
  bar.className = 'bar-fill' + (pct >= 100 ? ' over' : pct >= 70 ? ' danger' : '');

  const cfg = SPENDING_MSGS.find(s => pct <= s.max) || SPENDING_MSGS[SPENDING_MSGS.length - 1];
  document.getElementById('spendingMessage').textContent = cfg.msg;
  setMascot(cfg.mascot);
}

function setMascot(mood) {
  document.getElementById('mascot').textContent = MASCOTS[mood] || MASCOTS.happy;
}

// ── Render transactions ───────────────────────────────
function renderTransactions(list) {
  const el = document.getElementById('transactionList');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-emoji">📭</div><p>まだ記録がないよ！<br>最初の記録をしてみよう！</p></div>`;
    return;
  }
  el.innerHTML = list.map(t => {
    const cat  = (CATEGORIES[t.type] || []).find(c => c.id === t.category) || { emoji: '💰' };
    const sign = t.type === 'income' ? '+' : '-';
    return `
      <div class="transaction-item">
        <div class="transaction-emoji">${cat.emoji}</div>
        <div class="transaction-info">
          <div class="transaction-category">${t.category}</div>
          <div class="transaction-desc">${t.description || '　'}</div>
          <div class="transaction-date">${t.date.replace(/-/g, '/')}</div>
        </div>
        <div class="transaction-right">
          <div class="transaction-amount ${t.type}">${sign}${fmt(t.amount)}</div>
          <button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑</button>
        </div>
      </div>`;
  }).join('');
}

async function deleteTransaction(id) {
  if (!confirm('この記録を削除しますか？')) return;
  await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
  showToast('削除しました', 'error');
  loadSummary();
  loadTransactions();
}

// ── Render badges ─────────────────────────────────────
const ALL_BADGES = [
  { name: '初めての記録',       icon: '🌱', desc: '最初の記録' },
  { name: '10件マスター',        icon: '⭐', desc: '10件達成' },
  { name: '30件チャレンジャー',  icon: '🔥', desc: '30件達成' },
  { name: '50件プロ',            icon: '💎', desc: '50件達成' },
  { name: '100件レジェンド',     icon: '👑', desc: '100件達成' },
];

function renderBadges(earned) {
  const earnedSet = new Set(earned.map(b => b.name));
  const earnedMap = Object.fromEntries(earned.map(b => [b.name, b]));
  const container = document.getElementById('badgeList');

  const header = earnedSet.size
    ? `<p class="badge-header">${earnedSet.size} / ${ALL_BADGES.length} 個獲得！🎉</p>`
    : `<div class="empty-state"><div class="empty-emoji">🏅</div><p>記録を続けるとバッジがもらえるよ！</p></div>`;

  container.innerHTML = header + `<div class="badge-grid">` +
    ALL_BADGES.map(b => {
      const isEarned = earnedSet.has(b.name);
      const date = isEarned ? new Date(earnedMap[b.name].earned_at).toLocaleDateString('ja-JP') : b.desc;
      return `
        <div class="badge-item ${isEarned ? '' : 'badge-locked'}">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-date">${date}</div>
        </div>`;
    }).join('') + `</div>`;
}

// ── Submit form ───────────────────────────────────────
document.getElementById('submitBtn').addEventListener('click', async () => {
  const amount = parseInt(document.getElementById('amount').value);
  const desc   = document.getElementById('description').value.trim();
  const date   = document.getElementById('date').value;

  if (!state.category) {
    showToast('カテゴリを選んでね！', 'error');
    document.getElementById('categoryGrid').animate(
      [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: 300 }
    );
    return;
  }
  if (!amount || amount <= 0) { showToast('金額を入力してね！', 'error'); return; }
  if (!date)                  { showToast('日付を選んでね！', 'error');   return; }

  try {
    const data = await api('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: state.type, amount, category: state.category, description: desc, date }),
    });

    // Fun reactions
    launchConfetti();
    showToast(state.type === 'income' ? '収入を記録したよ！💚' : '支出を記録したよ！💸', 'success');

    const mascot = document.getElementById('mascot');
    if (state.type === 'income') {
      mascot.textContent = '🥳';
      mascot.classList.add('bounce');
    } else {
      mascot.textContent = amount >= 10000 ? '😭' : amount >= 5000 ? '😰' : '😌';
      mascot.classList.add('shake');
    }
    setTimeout(() => mascot.classList.remove('bounce', 'shake'), 600);

    if (data.newBadges && data.newBadges.length) {
      setTimeout(() => {
        data.newBadges.forEach(b => showToast(`🏆 実績解除！${b.icon} ${b.name}`, 'badge'));
      }, 1500);
    }

    // Reset
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    state.category = '';
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));

  } catch (e) {
    showToast('エラーが発生しました', 'error');
  } finally {
    loadSummary();
    loadMonthlyChart();
  }
});

// ── Helpers ───────────────────────────────────────────
function fmt(n) { return '¥' + Number(n).toLocaleString('ja-JP'); }

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function showToast(message, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 80,
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 10 + 4,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 12,
    circle: Math.random() > 0.5,
  }));

  let frame = 0;
  (function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 100);
      if (p.circle) {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      }
      ctx.restore();
    });
    if (++frame < 120) requestAnimationFrame(animate);
    else canvas.style.display = 'none';
  })();
}
