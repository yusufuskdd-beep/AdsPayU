const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#0a0f1a');

let user = tg.initDataUnsafe.user || { first_name: "Miner", id: "guest" };
const SAVE_KEY = `minerads_save_${user.id}`;
const TASK_KEY = `minerads_tasks_${user.id}`;
const YOUR_WALLET_ADDRESS = "UQD63olQ9L4WryJy8YJ9kEfO4gaen-GkbtvLy5-co2hkI4kv";

let balance = 10.0;
let lastTick = Date.now();
let minerInstances = [];
let nextInstanceId = 1;
let completedTasks = [];
let activeTaskTab = 'oneTime';
let taskProgress = {};
let lastDailySpin = 0;
let isSpinning = false;

const minerTemplates = [
  { id: 1, name: "Micro Miner", cost: 1, bonus: 0.10, rate: 0.000000424, img: "micro.png" },
  { id: 2, name: "Basic Miner", cost: 3, bonus: 0.15, rate: 0.000001331, img: "basic.png" },
  { id: 3, name: "Pro Miner", cost: 5, bonus: 0.20, rate: 0.000002315, img: "pro.png" },
  { id: 4, name: "GPU Rig", cost: 10, bonus: 0.25, rate: 0.000004823, img: "gpu.png" },
  { id: 5, name: "ASIC Farm", cost: 25, bonus: 0.30, rate: 0.000012540, img: "asic.png" },
  { id: 6, name: "Quantum Miner", cost: 50, bonus: 0.35, rate: 0.000026042, img: "quantum.png" }
];

const tasksData = {
  oneTime: [
    { id: 'join_channel', title: "Join Telegram Channel", reward: 0.1, link: "https://t.me/MinerAAds", type: "join" },
    { id: 'join_chat', title: "Join Telegram Chat", reward: 0.1, link: "https://t.me/+EiLZpWqcoA8zYjU0", type: "join" }
  ],
  ads: [], partnership: []
};

const dailyPrizes = [
  { label: "0.01", value: 0.01, type: "ton", color: "#00e5ff" },
  { label: "0.02", value: 0.02, type: "ton", color: "#00b8d4" },
  { label: "Micro", value: 1, type: "miner", color: "#22c55e" },
  { label: "0.05", value: 0.05, type: "ton", color: "#00e5ff" },
  { label: "0.03", value: 0.03, type: "ton", color: "#00b8d4" },
  { label: "Basic", value: 2, type: "miner", color: "#22c55e" },
  { label: "0.10", value: 0.10, type: "ton", color: "#00e5ff" },
  { label: "x", value: 0, type: "none", color: "#555" }
];

const paidPrizes = [
  { label: "0.10", value: 0.10, type: "ton", color: "#fbbf24" },
  { label: "0.20", value: 0.20, type: "ton", color: "#f59e0b" },
  { label: "Pro", value: 3, type: "miner", color: "#fbbf24" },
  { label: "0.50", value: 0.50, type: "ton", color: "#f59e0b" },
  { label: "1 TON", value: 1.0, type: "ton", color: "#fbbf24" },
  { label: "GPU", value: 4, type: "miner", color: "#fbbf24" },
  { label: "0.30", value: 0.30, type: "ton", color: "#f59e0b" },
  { label: "2xMicro", value: [1,1], type: "miner", color: "#fbbf24" }
];

function showPopup(type, title, message) {
  const icons = { success: "✅", error: "❌", info: "💰", alert: "⚠️" };
  const popup = document.createElement('div');
  popup.className = 'popup-overlay';
  popup.innerHTML = `<div class="popup"><div class="popup-icon">${icons[type] || "ℹ️"}</div><h3>${title}</h3><p>${message}</p><button class="popup-btn" onclick="this.closest('.popup-overlay').remove()">OK</button></div>`;
  document.body.appendChild(popup);
  setTimeout(() => { if(popup.parentNode) popup.remove() }, 3000);
}

let tonConnectUI;
try {
  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl: 'https://adspayu.vercel.app/tonconnect-manifest.json' });
  tonConnectUI.onStatusChange(() => { if(document.querySelector('.tabbar button.active')?.dataset.tab === 'wallet') renderWallet(); });
} catch(e){ console.error("TonConnect init error", e) }

const tabs = { home: renderHome, wheel: renderWheel, shop: renderShop, tasks: renderTasks, referral: renderReferral, wallet: renderWallet, profile: renderProfile };
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tabbar button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tabbar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabs[btn.dataset.tab]();
    }
  });
});

function getTotalRate() { return minerInstances.reduce((sum, m) => sum + m.rate, 0); }
function getTotalFarmed() { return minerInstances.reduce((sum, m) => sum + m.farmed, 0); }

function loadGame() {
  const save = localStorage.getItem(SAVE_KEY);
  if (save) {
    const data = JSON.parse(save);
    balance = data.balance || 10.0; lastTick = data.lastTick || Date.now(); minerInstances = data.minerInstances || [];
    nextInstanceId = data.nextInstanceId || 1; taskProgress = data.taskProgress || {}; lastDailySpin = data.lastDailySpin || 0;
    minerInstances.forEach(m => { const template = minerTemplates.find(t => t.id === m.templateId); if (template) { m.img = template.img; m.rate = template.rate; } });
    const offlineSeconds = (Date.now() - lastTick) / 1000; minerInstances.forEach(m => { m.farmed += m.rate * offlineSeconds; });
  }
  const taskSave = localStorage.getItem(TASK_KEY); if(taskSave) completedTasks = JSON.parse(taskSave);
  saveGame();
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ balance, lastTick: Date.now(), minerInstances, nextInstanceId, taskProgress, lastDailySpin }));
  localStorage.setItem(TASK_KEY, JSON.stringify(completedTasks));
}

function updateBalance() { const el = document.getElementById('balance'); if(el) el.innerText = `${balance.toFixed(4)} TON`; }

function addMinerById(id, count = 1) {
  for(let i=0; i<count; i++) {
    const template = minerTemplates.find(t => t.id === id);
    minerInstances.push({ instanceId: nextInstanceId++, templateId: template.id, name: template.name, rate: template.rate, bonus: template.bonus, img: template.img, farmed: 0 });
  }
  showPopup('success', 'New Miner!', `You got ${count}x ${minerTemplates.find(t=>t.id===id).name}`);
}

function givePrize(prize) {
  if(prize.type === "ton") { balance += prize.value; showPopup('success', 'You Won!', `${prize.label} TON added to balance`); }
  if(prize.type === "miner") { if(Array.isArray(prize.value)) prize.value.forEach(id => addMinerById(id)); else addMinerById(prize.value); }
  if(prize.type === "none") { showPopup('info', 'Better Luck Next Time', 'Try again tomorrow'); }
  updateBalance(); saveGame(); renderHome();
}

function spinWheel(type) {
  if(isSpinning) return;
  let prizes = type === 'daily'? dailyPrizes : paidPrizes;
  const cost = type === 'paid'? 0.5 : 0;

  if(type === 'daily') {
    const now = Date.now();
    const hoursLeft = 24 - ((now - lastDailySpin) / 1000 / 3600);
    if(hoursLeft > 0) return showPopup('alert', 'Come Back Later', `Next free spin in ${hoursLeft.toFixed(1)}h`);
    lastDailySpin = now;
  }
  if(balance < cost) return showPopup('error', 'Not Enough TON', `You need ${cost} TON to spin`);

  isSpinning = true;
  balance -= cost; updateBalance();

  const prizeIndex = Math.floor(Math.random() * prizes.length);
  const prize = prizes[prizeIndex];

  // Calculate rotation: 4 full spins + land on prize
  const segmentAngle = 360 / prizes.length;
  const rotation = 360 * 4 + (360 - prizeIndex * segmentAngle - segmentAngle/2);

  const wheelEl = document.getElementById('wheel');
  wheelEl.style.transform = `rotate(${rotation}deg)`;
  tg.HapticFeedback.impactOccurred('medium');

  setTimeout(() => {
    isSpinning = false;
    givePrize(prize);
    renderWheel(); // re-render to update cooldown
  }, 4200);
}

function createWheel(prizes) {
  const segmentAngle = 360 / prizes.length;
  return prizes.map((p, i) => {
    const rotate = i * segmentAngle;
    return `<div class="wheel-segment" style="background:${p.color}; transform:rotate(${rotate}deg) skewY(-${90-segmentAngle}deg)">
      <div style="transform: skewY(${90-segmentAngle}deg) rotate(${segmentAngle/2}deg); margin-top: -80px;">${p.label}</div>
    </div>`
  }).join('');
}

function renderWheel() {
  const now = Date.now();
  const hoursLeft = 24 - ((now - lastDailySpin) / 1000 / 3600);
  const canSpinDaily = hoursLeft <= 0;

  document.getElementById('content').innerHTML = `
    <h2>🎡 Lucky Wheel</h2>
    <div class="card" style="text-align:center">
      <h3>Daily Wheel - FREE</h3>
      <p style="color:var(--muted)">Spin once every 24 hours</p>
      <div class="wheel-container">
        <div class="wheel-pointer"></div>
        <div class="wheel" id="wheel">${createWheel(dailyPrizes)}</div>
        <div class="wheel-center"></div>
      </div>
      <button class="btn" ${!canSpinDaily || isSpinning? 'disabled' : ''} onclick="spinWheel('daily')">
        ${canSpinDaily? 'SPIN NOW' : `Wait ${hoursLeft.toFixed(1)}h`}
      </button>
    </div>
    <div class="card" style="text-align:center">
      <h3>Premium Wheel - 0.5 TON</h3>
      <p style="color:var(--muted)">Bigger prizes, spin anytime</p>
      <div class="wheel-container">
        <div class="wheel-pointer"></div>
        <div class="wheel" id="wheel-paid" style="border-color:#fbbf24">${createWheel(paidPrizes)}</div>
        <div class="wheel-center" style="border-color:#fbbf24"></div>
      </div>
      <button class="btn" style="background:#fbbf24; color:#000" ${isSpinning? 'disabled' : ''} onclick="spinWheel('paid')">SPIN FOR 0.5 TON</button>
    </div>
  `;
}

function resetTasks() {
  if(confirm("Reset all tasks? You will lose task progress but keep TON balance")) {
    completedTasks = []; taskProgress = {}; saveGame();
    showPopup('success', 'Reset Done', 'All tasks reset'); renderProfile();
  }
}

function isTaskComplete(task) { if(task.type === "join") return taskProgress[task.id] === true; return false; }

function completeTask(taskId, reward) {
  if(completedTasks.includes(taskId)) return showPopup('alert', 'Already Claimed', 'You already claimed this reward');
  const task = Object.values(tasksData).flat().find(t => t.id === taskId);
  if(!isTaskComplete(task)) return showPopup('error', 'Not Done Yet', 'Please complete the task first');
  completedTasks.push(taskId); balance += reward; updateBalance(); saveGame();
  tg.HapticFeedback.impactOccurred('light');
  showPopup('success', 'Reward Claimed!', `+${reward} TON added to balance`); renderTasks();
}

function markTaskProgress(taskId) { taskProgress[taskId] = true; saveGame(); showPopup('success', 'Verified!', 'You can now claim the reward'); renderTasks(); }

function renderTasks() {
  const tabsHtml = ['oneTime', 'ads', 'partnership'].map(tab => {
    const label = tab === 'oneTime'? 'One Time' : tab === 'ads'? 'Ads' : 'Partnership';
    const active = activeTaskTab === tab? 'active' : '';
    return `<button class="subtab-btn ${active}" onclick="switchTaskTab('${tab}')">${label}</button>`
  }).join('');
  const tasks = tasksData[activeTaskTab];
  let tasksHtml = tasks.length === 0? `<div class="card"><p style="text-align:center; color:var(--muted)">No tasks here yet</p></div>` : tasks.map(t => {
    const claimed = completedTasks.includes(t.id); const canClaim = isTaskComplete(t);
    const verifyBtn =!taskProgress[t.id] &&!claimed? `<button class="btn" style="width:80px; background:#fbbf24; color:#000; margin-right:8px" onclick="markTaskProgress('${t.id}')">Verify</button>` : '';
    const actionBtn = `<button class="btn" style="width:70px; background:#1e2a40; margin-right:8px" onclick="tg.openTelegramLink('${t.link}'); setTimeout(() => markTaskProgress('${t.id}'), 1000)">Join</button>${verifyBtn}`;
    let claimBtnText = 'Claim'; let claimBtnDisabled =!canClaim; let claimBtnStyle = canClaim? '' : 'opacity:0.4';
    if(claimed) { claimBtnText = 'DONE'; claimBtnDisabled = true; claimBtnStyle = 'background:linear-gradient(90deg,#22c55e,#16a34a); opacity:1'; }
    return `<div class="card miner"><div class="miner-info"><h3>${t.title}</h3><p>Reward: <b>${t.reward} TON</b></p><p style="font-size:11px; color:${claimed? '#22c55e' : canClaim? '#fbbf24' : 'var(--muted)'}">${claimed? 'Completed' : canClaim? 'Ready to claim' : 'Incomplete'}</p></div><div style="display:flex">${actionBtn}<button class="btn" style="width:80px; ${claimBtnStyle}" ${claimBtnDisabled? 'disabled' : ''} onclick="completeTask('${t.id}', ${t.reward})">${claimBtnText}</button></div></div>`
  }).join('');
  document.getElementById('content').innerHTML = `<h2>Tasks</h2><div class="subtabs">${tabsHtml}</div>${tasksHtml}`;
}

function switchTaskTab(tab) { activeTaskTab = tab; renderTasks(); }

function renderWallet() {
  const isConnected = tonConnectUI && tonConnectUI.connected;
  const walletAddr = isConnected? tonConnectUI.account.address.slice(0,6) + "..." + tonConnectUI.account.address.slice(-4) : "Not Connected";
  document.getElementById('content').innerHTML = `
    <h2>Wallet</h2>
    <div class="card"><h3>Wallet Status</h3><p style="color:var(--muted); font-size:12px">Connected: <b>${walletAddr}</b></p><div id="ton-connect-button" style="margin-bottom:8px"></div>${!isConnected? `<button class="btn" onclick="connectWallet()">Connect Wallet</button>` : ''}${isConnected? `<button class="btn" style="background:var(--danger)" onclick="disconnectWallet()">Disconnect</button>` : ''}</div>
    <div class="card"><h3>Deposit TON</h3><p style="color:var(--muted); font-size:12px">Send to: <b>${YOUR_WALLET_ADDRESS.slice(0,6)}...${YOUR_WALLET_ADDRESS.slice(-4)}</b></p><input id="depositAmount" type="number" placeholder="Amount in TON" step="0.1" min="0.1" style="width:100%;padding:12px;border-radius:8px;background:#1e2a40;border:1px solid #333;color:var(--text);margin:8px 0"/><button class="btn" onclick="deposit()">Deposit Now</button></div>
  `;
  setTimeout(() => { if(tonConnectUI) tonConnectUI.mount('#ton-connect-button'); }, 100);
}

async function connectWallet() { if(tonConnectUI) await tonConnectUI.connectWallet(); }
async function disconnectWallet() { await tonConnectUI.disconnect(); showPopup('info', 'Disconnected', 'Wallet disconnected'); renderWallet(); }

async function deposit() {
  const amount = parseFloat(document.getElementById('depositAmount').value);
  if(!amount || amount < 0.1) return showPopup('error', 'Invalid Amount', 'Min deposit 0.1 TON');
  if(!tonConnectUI ||!tonConnectUI.connected) return showPopup('error', 'No Wallet', 'Please connect wallet first');
  try {
    const transaction = { validUntil: Math.floor(Date.now() / 1000) + 600, messages: [{ address: YOUR_WALLET_ADDRESS, amount: (amount * 1e9).toString() }] };
    await tonConnectUI.sendTransaction(transaction);
    balance += amount; updateBalance(); saveGame();
    showPopup('success', 'Deposit Successful!', `${amount} TON added to your balance`);
    document.getElementById('depositAmount').value = '';
  } catch(e) { showPopup('error', 'Failed', 'Transaction cancelled or failed'); }
}

function farmTick() {
  const now = Date.now(); const delta = (now - lastTick) / 1000; lastTick = now;
  minerInstances.forEach(m => { m.farmed += m.rate * delta; });
  const totalEl = document.getElementById('farmedTotal'); if (totalEl) totalEl.innerText = getTotalFarmed().toFixed(6);
  minerInstances.forEach(m => { const el = document.getElementById(`farmed-${m.instanceId}`); if (el) el.innerText = m.farmed.toFixed(6); });
}

function buyMiner(templateId) {
  const template = minerTemplates.find(x => x.id === templateId);
  const ownedCount = minerInstances.filter(m => m.templateId === templateId).length;
  if (ownedCount >= 3) return showPopup('alert', 'Limit Reached', `Max 3 ${template.name} reached`);
  if (balance >= template.cost) {
    balance -= template.cost;
    minerInstances.push({ instanceId: nextInstanceId++, templateId: template.id, name: template.name, rate: template.rate, bonus: template.bonus, img: template.img, farmed: 0 });
    updateBalance(); saveGame(); showPopup('success', 'Purchased!', `You bought ${template.name} for ${template.cost} TON`); renderShop(); renderHome();
  } else { showPopup('error', 'Not Enough TON', 'Not enough TON') }
}

function renderHome() {
  const totalRate = getTotalRate(); const totalFarmed = getTotalFarmed();
  document.getElementById('content').innerHTML = `
    <div class="card"><h2>Welcome, ${user.first_name}</h2><p style="color:var(--muted)">All miners ROI in 30 days + bonus</p></div>
    <div class="card"><h3>⛏️ Farming</h3><p>Rate: <b>${(totalRate*86400).toFixed(4)} TON/day</b></p><p>Farmed: <b id="farmedTotal">${totalFarmed.toFixed(6)}</b> TON</p><div class="progress"><div class="progress-bar" style="width:100%"></div></div><button class="btn" style="margin-top:12px" onclick="claim()">Claim</button></div>
    <div class="card"><h3>Your Miners</h3>${minerInstances.length > 0? minerInstances.map(m => `<div class="miner-unit" style="display:flex; align-items:center; gap:10px; margin-bottom:8px"><img src="${m.img}" class="miner-img" style="width:40px; height:40px"/><div><h4 style="margin:0">${m.name} #${m.instanceId}</h4><p style="color:var(--muted); font-size:12px; margin:0">${(m.rate*86400).toFixed(4)} TON/day • Farmed: <span id="farmed-${m.instanceId}">${m.farmed.toFixed(6)}</span> TON</p></div></div>`).join('') : '<p style="color:var(--muted)">No miners yet</p>'}</div>
  `;
}

function renderShop() {
  document.getElementById('content').innerHTML = `<h2>Shop</h2>${minerTemplates.map(t => {
    const ownedCount = minerInstances.filter(m => m.templateId === t.id).length;
    const payout = (t.cost * (1 + t.bonus)).toFixed(2);
    const disabled = ownedCount >= 3? 'disabled' : '';
    return `<div class="card miner"><img src="${t.img}" class="miner-img" /><div class="miner-info"><h3>${t.name}</h3><p>${(t.rate*86400).toFixed(4)} TON/day • Owned: ${ownedCount}/3</p><p>30d Payout: <b>${payout} TON</b> +${(t.bonus*100)}%</p><p><b>${t.cost} TON</b></p></div><button class="btn" style="width:80px" ${disabled} onclick="buyMiner(${t.id})">${disabled? 'MAX' : 'Buy'}</button></div>`
  }).join('')}`;
}

function renderReferral() {
  const refLink = `https://t.me/AdsPayU_bot?start=${user.id}`;
  document.getElementById('content').innerHTML = `<h2>Referral</h2><div class="card"><p>Earn 10% from friends mining</p><input value="${refLink}" readonly style="width:100%;padding:8px;border-radius:8px;background:#1e2a40;border:1px solid #333;color:var(--text)"/><button class="btn" onclick="navigator.clipboard.writeText('${refLink}')">Copy Link</button></div>`;
}

function renderProfile() {
  document.getElementById('content').innerHTML = `<h2>Profile</h2>
  <div class="card"><p><b>Name:</b> ${user.first_name}</p><p><b>ID:</b> ${user.id}</p><p><b>Total Mined:</b> ${getTotalFarmed().toFixed(4)} TON</p></div>
  <div class="card"><h3>Developer Tools</h3><button class="btn" style="background:var(--danger)" onclick="resetTasks()">Reset All Tasks</button></div>`;
}

function claim() {
  const total = getTotalFarmed();
  balance += total; minerInstances.forEach(m => m.farmed = 0);
  updateBalance(); saveGame();
  tg.HapticFeedback.impactOccurred('medium');
  showPopup('info', 'Claimed!', `${total.toFixed(4)} TON added to balance`);
  renderHome();
}

loadGame(); updateBalance(); renderHome();
document.querySelector('.tabbar button[data-tab="home"]').classList.add('active');
setInterval(farmTick, 1000); setInterval(saveGame, 3000);