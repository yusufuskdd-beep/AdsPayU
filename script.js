const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0a0f1a');

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;

let balance = 10.0;
let farmed = 0;
let farmingRate = 0;
let lastTick = Date.now();

const miners = [
  { id: 1, name: "Micro Miner", cost: 1, bonus: 0.10, rate: 0.000000424, owned: 0, max: 3, img: "⛏️" },
  { id: 2, name: "Basic Miner", cost: 3, bonus: 0.15, rate: 0.000001331, owned: 0, max: 3, img: "⚙️" },
  { id: 3, name: "Pro Miner", cost: 5, bonus: 0.20, rate: 0.000002315, owned: 0, max: 3, img: "🚀" },
  { id: 4, name: "GPU Rig", cost: 10, bonus: 0.25, rate: 0.000004823, owned: 0, max: 3, img: "🖥️" },
  { id: 5, name: "ASIC Farm", cost: 25, bonus: 0.30, rate: 0.000012540, owned: 0, max: 3, img: "🏭" },
  { id: 6, name: "Quantum Miner", cost: 50, bonus: 0.35, rate: 0.000026042, owned: 0, max: 3, img: "⚡" }
];

let tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://yourdomain.com/tonconnect-manifest.json'
});

const tabs = {
  home: renderHome,
  shop: renderShop,
  tasks: renderTasks,
  referral: renderReferral,
  wallet: renderWallet,
  profile: renderProfile
};

document.querySelectorAll('.tabbar button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabs[btn.dataset.tab]();
  }
});

// SAVE / LOAD SYSTEM
function loadGame() {
  const save = localStorage.getItem(SAVE_KEY);
  if (save) {
    const data = JSON.parse(save);
    balance = data.balance || 10.0;
    farmed = data.farmed || 0;
    lastTick = data.lastTick || Date.now();
    
    data.miners.forEach((m, i) => {
      miners[i].owned = m.owned;
      farmingRate += miners[i].rate * miners[i].owned;
    });

    // offline earnings
    const offlineSeconds = (Date.now() - lastTick) / 1000;
    if (offlineSeconds > 0 && farmingRate > 0) {
      farmed += farmingRate * offlineSeconds;
    }
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    balance,
    farmed,
    lastTick: Date.now(),
    miners: miners.map(m => ({ owned: m.owned }))
  }));
}

function updateBalance() {
  document.getElementById('balance').innerText = `${balance.toFixed(4)} TON`;
}

function farmTick() {
  const now = Date.now();
  const delta = (now - lastTick) / 1000;
  farmed += farmingRate * delta;
  lastTick = now;
  const el = document.getElementById('farmed');
  if (el) el.innerText = farmed.toFixed(6);
}

function buyMiner(id) {
  const m = miners.find(x => x.id === id);
  if (m.owned >= m.max) return tg.showAlert(`Max ${m.max} ${m.name} reached`);
  if (balance >= m.cost) {
    balance -= m.cost;
    m.owned += 1;
    farmingRate += m.rate;
    updateBalance();
    saveGame();
    tg.showPopup({ title: "Purchased!", message: `You bought ${m.name} for ${m.cost} TON` });
    renderShop();
  } else {
    tg.showAlert("Not enough TON");
  }
}

function renderHome() {
  document.getElementById('content').innerHTML = `
    <div class="card">
      <h2>Welcome, ${user.first_name}</h2>
      <p style="color:var(--muted)">All miners ROI in 30 days + bonus</p>
    </div>
    <div class="card">
      <h3>⛏️ Farming</h3>
      <p>Rate: <b>${(farmingRate*86400).toFixed(4)} TON/day</b></p>
      <p>Farmed: <b id="farmed">${farmed.toFixed(6)}</b> TON</p>
      <div class="progress"><div class="progress-bar" style="width:100%"></div></div>
      <button class="btn" style="margin-top:12px" onclick="claim()">Claim</button>
    </div>
    <div class="card">
      <h3>Your Miners</h3>
      ${miners.filter(m=>m.owned>0).map(m=>`<p>${m.img} ${m.name} x${m.owned}</p>`).join('') || '<p style="color:var(--muted)">No miners yet</p>'}
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
      <p><b>Total Mined:</b> ${farmed.toFixed(4)} TON</p>
    </div>
  `;
}

function claim() {
  balance += farmed;
  farmed = 0;
  updateBalance();
  saveGame();
  tg.showPopup({ title: "Claimed!", message: "TON added to balance" });
}

// INIT
loadGame();
updateBalance();
renderHome();
document.querySelector('.tabbar button[data-tab="home"]').classList.add('active');
setInterval(farmTick, 1000);
setInterval(saveGame, 3000); // auto save every 3s