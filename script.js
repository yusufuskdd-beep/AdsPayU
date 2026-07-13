const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0a0f1a');

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;

let balance = 10.0;
let lastTick = Date.now();

const miners = [
  { id: 1, name: "Micro Miner", cost: 1, bonus: 0.10, rate: 0.000000424, owned: 0, max: 3, img: "⛏️", farmed: 0 },
  { id: 2, name: "Basic Miner", cost: 3, bonus: 0.15, rate: 0.000001331, owned: 0, max: 3, img: "⚙️", farmed: 0 },
  { id: 3, name: "Pro Miner", cost: 5, bonus: 0.20, rate: 0.000002315, owned: 0, max: 3, img: "🚀", farmed: 0 },
  { id: 4, name: "GPU Rig", cost: 10, bonus: 0.25, rate: 0.000004823, owned: 0, max: 3, img: "🖥️", farmed: 0 },
  { id: 5, name: "ASIC Farm", cost: 25, bonus: 0.30, rate: 0.000012540, owned: 0, max: 3, img: "🏭", farmed: 0 },
  { id: 6, name: "Quantum Miner", cost: 50, bonus: 0.35, rate: 0.000026042, owned: 0, max: 3, img: "⚡", farmed: 0 }
];

let tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://yourdomain.com/tonconnect-manifest.json'
});

const tabs = { home: renderHome, shop: renderShop, tasks: renderTasks, referral: renderReferral, wallet: renderWallet, profile: renderProfile };

document.querySelectorAll('.tabbar button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabs[btn.dataset.tab]();
  }
});

// HELPERS
function getTotalRate() {
  return miners.reduce((sum, m) => sum + m.rate * m.owned, 0);
}
function getTotalFarmed() {
  return miners.reduce((sum, m) => sum + m.farmed * m.owned, 0);
}

// SAVE / LOAD
function loadGame() {
  const save = localStorage.getItem(SAVE_KEY);
  if (save) {
    const data = JSON.parse(save);
    balance = data.balance || 10.0;
    lastTick = data.lastTick || Date.now();
    
    data.miners.forEach((m, i) => {
      miners[i].owned = m.owned;
      miners[i].farmed = m.farmed || 0;
    });

    // offline earnings per miner
    const offlineSeconds = (Date.now() - lastTick) / 1000;
    miners.forEach(m => {
      m.farmed += m.rate * m.owned * offlineSeconds;
    });
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    balance,
    lastTick: Date.now(),
    miners: miners.map(m => ({ owned: m.owned, farmed: m.farmed }))
  }));
}

function updateBalance() {
  document.getElementById('balance').innerText = `${balance.toFixed(4)} TON`;
}

// LIVE FARM TICK
function farmTick() {
  const now = Date.now();
  const delta = (now - lastTick) / 1000;
  lastTick = now;
  
  miners.forEach(m => {
    m.farmed += m.rate * m.owned * delta;
  });

  // update UI
  const totalEl = document.getElementById('farmedTotal');
  if (totalEl) totalEl.innerText = getTotalFarmed().toFixed(6);
  
  miners.filter(m => m.owned > 0).forEach(m => {
    const el = document.getElementById(`farmed-${m.id}`);
    if (el) el.innerText = (m.farmed * m.owned).toFixed(6);
  });
}

function buyMiner(id) {
  const m = miners.find(x => x.id === id);
  if (m.owned >= m.max) return tg.showAlert(`Max ${m.max} ${m.name} reached`);
  if (balance >= m.cost) {
    balance -= m.cost;
    m.owned += 1;
    updateBalance();
    saveGame();
    tg.showPopup({ title: "Purchased!", message: `You bought ${m.name} for ${m.cost} TON` });
    renderShop();
    renderHome();
  } else {
    tg.showAlert("Not enough TON");
  }
}

function renderHome() {
  const totalRate = getTotalRate();
  const totalFarmed = getTotalFarmed();
  const ownedMiners = miners.filter(m => m.owned > 0);

  document.getElementById('content').innerHTML = `
    <div class="card">
      <h2>Welcome, ${user.first_name}</h2>
      <p style="color:var(--muted)">All miners ROI in 30 days + bonus</p>
    </div>
    <div class="card">
      <h3>⛏️ Farming</h3>
      <p>Rate: <b>${(totalRate*86400).toFixed(4)} TON/day</b></p>
      <p>Farmed: <b id="farmedTotal">${totalFarmed.toFixed(6)}</b> TON</p>
      <div class="progress"><div class="progress-bar" style="width:100%"></div></div>
      <button class="btn" style="margin-top:12px" onclick="claim()">Claim</button>
    </div>
    <div class="card">
      <h3>Your Miners</h3>
      ${ownedMiners.length > 0 ? ownedMiners.map(m => `
        <div style="margin-bottom:10px">
          <p><b>${m.img} ${m.name} x${m.owned}</b></p>
          <p style="color:var(--muted); font-size:12px">
            ${(m.rate*86400*m.owned).toFixed(4)} TON/day • Farmed: <span id="farmed-${m.id}">${(m.farmed*m.owned).toFixed(6)}</span> TON
          </p>
        </div>
      `).join('') : '<p style="color:var(--muted)">No miners yet</p>'}
    </div>
  `;
}

function renderShop() {
  document.getElementById('content').innerHTML = `
    <h2>Shop</h2>
    ${miners.map(m => {
      const payout = (m.cost * (1 + m.bonus)).toFixed(2);
      const disabled = m.owned >= m.max ? 'disabled' : '';
      return `
      <div class="card miner">
        <div class="miner-info">
          <h3>${m.img} ${m.name}</h3>
          <p>${(m.rate*86400).toFixed(4)} TON/day • Owned: ${m.owned}/${m.max}</p>
          <p>30d Payout: <b>${payout} TON</b>  +${(m.bonus*100)}%</p>
          <p><b>${m.cost} TON</b></p>
        </div>
        <button class="btn" ${disabled} onclick="buyMiner(${m.id})">${disabled ? 'MAX' : 'Buy'}</button>
      </div>
    `}).join('')}
  `;
}

function renderTasks() {
  document.getElementById('content').innerHTML = `
    <h2>Tasks</h2>
    <div class="card"><p>Join Telegram Channel</p><button class="btn">+0.1 TON</button></div>
    <div class="card"><p>Invite 3 Friends</p><button class="btn">+0.5 TON</button></div>
  `;
}

function renderReferral() {
  const refLink = `https://t.me/your_bot?start=${user.id}`;
  document.getElementById('content').innerHTML = `
    <h2>Referral</h2>
    <div class="card">
      <p>Earn 10% from friends mining</p>
      <input value="${refLink}" readonly style="width:100%;padding:8px;border-radius:8px;background:#1e2a40;border:1px solid #333;color:var(--text)"/>
      <button class="btn" onclick="navigator.clipboard.writeText('${refLink}')">Copy Link</button>
    </div>
  `;
}

function renderWallet() {
  document.getElementById('content').innerHTML = `
    <h2>Wallet</h2>
    <div class="card">
      <p>Connect your TON wallet to withdraw</p>
      <div id="ton-connect-button"></div>
    </div>
  `;
  tonConnectUI.mount('#ton-connect-button');
}

function renderProfile() {
  document.getElementById('content').innerHTML = `
    <h2>Profile</h2>
    <div class="card">
      <p><b>Name:</b> ${user.first_name}</p>
      <p><b>ID:</b> ${user.id}</p>
      <p><b>Total Mined:</b> ${getTotalFarmed().toFixed(4)} TON</p>
    </div>
  `;
}

function claim() {
  const total = getTotalFarmed();
  balance += total;
  miners.forEach(m => m.farmed = 0); // reset each miner
  updateBalance();
  saveGame();
  tg.showPopup({ title: "Claimed!", message: `${total.toFixed(4)} TON added to balance` });
  renderHome();
}

// INIT
loadGame();
updateBalance();
renderHome();
document.querySelector('.tabbar button[data-tab="home"]').classList.add('active');
setInterval(farmTick, 1000);
setInterval(saveGame, 3000);