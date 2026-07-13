const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE'; // from @BotFather

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve your 3 frontend files

// DB setup
const db = new sqlite3.Database('./users.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  balance REAL DEFAULT 165.048,
  miners INTEGER DEFAULT 1,
  earned REAL DEFAULT 15.05,
  pending REAL DEFAULT 0.209802
)`);

// Verify Telegram initData
function verifyTelegramData(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckArr = [];
  urlParams.sort();
  urlParams.forEach((val, key) => dataCheckArr.push(`${key}=${val}`));
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calculatedHash === hash;
}

// API: Get user data
app.post('/api/auth', (req, res) => {
  const { initData } = req.body;
  if (!verifyTelegramData(initData)) return res.status(403).json({error: 'Invalid data'});

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));

  db.get('SELECT * FROM users WHERE id =?', [user.id], (err, row) => {
    if (!row) {
      db.run('INSERT INTO users (id, username) VALUES (?,?)', [user.id, user.username]);
      row = {id: user.id, balance: 165.048, miners: 1, earned: 15.05, pending: 0.209802};
    }
    res.json(row);
  });
});

// API: Claim yield
app.post('/api/claim', (req, res) => {
  const { userId } = req.body;
  db.get('SELECT * FROM users WHERE id =?', [userId], (err, user) => {
    const newBalance = user.balance + user.pending;
    const newEarned = user.earned + user.pending;
    db.run('UPDATE users SET balance =?, earned =?, pending = 0 WHERE id =?',
      [newBalance, newEarned, userId]);
    res.json({success: true, balance: newBalance});
  });
});

// API: Buy miner
app.post('/api/buy', (req, res) => {
  const { userId, price } = req.body;
  db.get('SELECT * FROM users WHERE id =?', [userId], (err, user) => {
    if (user.balance < price) return res.json({success: false, error: 'Not enough MCT'});
    db.run('UPDATE users SET balance = balance -?, miners = miners + 1 WHERE id =?',
      [price, userId]);
    res.json({success: true});
  });
});

// API: Deposit
app.post('/api/deposit', (req, res) => {
  const { userId, amount } = req.body;
  db.run('UPDATE users SET balance = balance +? WHERE id =?', [amount, userId]);
  res.json({success: true});
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));