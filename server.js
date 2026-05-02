const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'budget.db'));

app.use(express.json());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT NOT NULL,
    earned_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

const BADGE_DEFS = [
  { count: 1,   name: '初めての記録',       icon: '🌱' },
  { count: 10,  name: '10件マスター',        icon: '⭐' },
  { count: 30,  name: '30件チャレンジャー',  icon: '🔥' },
  { count: 50,  name: '50件プロ',            icon: '💎' },
  { count: 100, name: '100件レジェンド',     icon: '👑' },
];

app.get('/api/transactions', (req, res) => {
  const { month } = req.query;
  if (month) {
    const rows = db.prepare(
      "SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC, id DESC"
    ).all(month);
    return res.json(rows);
  }
  res.json(db.prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT 100").all());
});

app.post('/api/transactions', (req, res) => {
  const { type, amount, category, description, date } = req.body;
  if (!type || !amount || !category || !date) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }

  const result = db.prepare(
    "INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)"
  ).run(type, parseInt(amount), category, description || '', date);

  const count = db.prepare("SELECT COUNT(*) as c FROM transactions").get().c;
  const newBadges = [];

  for (const def of BADGE_DEFS) {
    if (count === def.count) {
      try {
        db.prepare("INSERT INTO badges (name, icon) VALUES (?, ?)").run(def.name, def.icon);
        newBadges.push({ name: def.name, icon: def.icon });
      } catch (_) {}
    }
  }

  res.json({ id: result.lastInsertRowid, newBadges });
});

app.delete('/api/transactions/:id', (req, res) => {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(parseInt(req.params.id));
  res.json({ ok: true });
});

app.get('/api/summary', (req, res) => {
  const { month } = req.query;

  if (month) {
    const income = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND strftime('%Y-%m',date)=?"
    ).get(month);
    const expense = db.prepare(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND strftime('%Y-%m',date)=?"
    ).get(month);
    const byCategory = db.prepare(
      "SELECT category, type, SUM(amount) as total FROM transactions WHERE strftime('%Y-%m',date)=? GROUP BY category, type ORDER BY total DESC"
    ).all(month);
    return res.json({ income: income.total, expense: expense.total, balance: income.total - expense.total, byCategory });
  }

  const income = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income'").get();
  const expense = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense'").get();
  const byCategory = db.prepare(
    "SELECT category, type, SUM(amount) as total FROM transactions GROUP BY category, type ORDER BY total DESC"
  ).all();
  res.json({ income: income.total, expense: expense.total, balance: income.total - expense.total, byCategory });
});

app.get('/api/badges', (req, res) => {
  res.json(db.prepare("SELECT * FROM badges ORDER BY earned_at ASC").all());
});

app.get('/api/monthly', (req, res) => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const data = months.map(m => {
    const inc = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='income' AND strftime('%Y-%m',date)=?").get(m);
    const exp = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense' AND strftime('%Y-%m',date)=?").get(m);
    return { month: m, label: `${parseInt(m.split('-')[1])}月`, income: inc.t, expense: exp.t };
  });
  res.json(data);
});

app.listen(3000, () => {
  console.log('🎓 大学生のおサイフ帳 → http://localhost:3000');
});
