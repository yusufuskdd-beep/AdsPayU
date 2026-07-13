const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0a0f1a');

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;

let balance = 10.0;
let lastTick = Date.now();
let minerInstances = []; // each miner is its own object now
let nextInstanceId = 1;

const minerTemplates = [
  { id: 1, name: "Micro Miner", cost: 1, bonus: 0.10, rate: 0.000424, img: "⛏️" },
  { id: 2, name: "Basic Miner", cost: 3, bonus: 0.15, rate: 0.000001331, img: "⚙️" },
  { id: 3, name: "Pro Miner", cost: 5, bonus: 0.20, rate: 0.000002315, img: "🚀" },
  { id: 4, name: "GPU Rig", cost: 10, bonus: 0.25, rate: 0.000004823, img: "🖥️" },
  { id: 5, name: "ASIC Farm", cost: 25, bonus: 0.30, rate: 0.000012540, img: "🏭" },
  { id: 6, name: "Quantum Miner", cost: 50, bonus: 0.35, rate: 0.000026042, img: "⚡" }
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

function getTotalRate() {
  return minerInstances.reduce((sum, m) => sum + m.rate, 0);
}
function getTotalFarmed() {
  return minerInstances.reduce((sum, m) => sum + m.farmed, 0);
}

// SAVE / LOAD
function loadGame() {
  const save = localStorage.getItem(SAVE_KEY);
  if (save) {
    const data = JSON.parse(save);
    balance = data.balance || 10.0;
    lastTick = data.lastTick || Date.now();
    minerInstances = data.minerInstances || [];
    nextInstanceId = data.nextInstanceId || 1;

    const offlineSeconds = (Date.now() - lastTick) / 1000;
    minerInstances.forEach(m => {
      m.farmed += m.rate * offlineSeconds;
    });
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    balance,
    lastTick: Date.now(),
    minerInstances,
    nextInstanceId
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
  
  minerInstances.forEach(m => {
    m.farmed += m.rate * delta;
  });

  const totalEl = document.getElementById('farmedTotal');
  if (totalEl) totalEl.innerText = getTotalFarmed().toFixed(6);
  
  minerInstances.forEach(m => {
    const el = document.getElementById(`farmed-${m.instanceId}`);
    if (el) el.innerText = m.farmed.toFixed(6);
  });
}

function buyMiner(templateId) {
  const template = minerTemplates.find(x => x.id === templateId);
  const ownedCount = minerInstances.filter(m => m.templateId === templateId).length;
  if (ownedCount >= 3) return tg.showAlert(`Max 3 ${template.name} reached`);
  if (balance >= template.cost) {
    balance -= template.cost;
    
    minerInstances.push({
      instanceId: nextInstanceId++,
      templateId: template.id,
      name: template.name,
      rate: template.rate,
      bonus: template.bonus,
      img: template.img,
      farmed: 0
    });

    updateBalance();
    saveGame();
    tg.showPopup({ title: "Purchased!", message: `You bought ${template.name} for ${template.cost} TON` });
    renderShop();
    renderHome();
  } else {
    tg.showAlert("Not enough TON");
  }
}

function renderHome() {
  const totalRate = getTotalRate();
  const totalFarmed = getTotalFarmed();

  document.getElementById('content').innerHTML = `
    <div class="card">
      <h2>Welcome, ${user.first_name}</h2>
      <p style="color:var(--muted)">All miners ROI in 30 days + bonus</p>
    </div>
    <div class="card">
      <h3>⛏️ Farming</h3>
      <p>Rate: <b>${(totalRate*86400).toFixed(4)} TON/day</b></p>
      <p>Farmed: <b id="farmedTotal">${totalFarmed.toFixed(6)}</b> TON</p>
      <div class="progress"><div class="progress-bar" style="width:100