const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// ===== GLOBAL STATE =====
let state = {
  apu: 1089,
  usdt: 0.0272,
  tonAddress: null,
  lastDaily: 0,
  gigaCount: 0,
  monetagCount: 0,
  totalEarned: 0,
  totalAds: 0,
  miners: [],
  requests: []
};

let isAdmin = false;
let currentAdType = '';
let tonRate = 1.67; // 1 TON = 1.67 USDT

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initUser();
  initTON();
  renderAll();
  setInterval(tickMiners, 1000); // 1s tick for miner income
});

function initUser() {
  const user = tg.initDataUnsafe?.user;
  if(user) {
    document.getElementById('userId').textContent = user.id;
    document.getElementById('username').textContent = user.username || user.first_name;
  }
}

// ===== PAGE SWITCHING =====
function showTab(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item, .top-tab').forEach(b => b.classList.remove('active'));
  
  document.getElementById(page).classList.add('active');
  document.querySelectorAll(`[onclick="showTab('${page}')"]`).forEach(b => b.classList.add('active'));
  
  tg.HapticFeedback?.impactOccurred('light');
  renderAll();
}

// ===== STATE SAVE/LOAD =====
function saveState() {
  localStorage.setItem('adsPayU', JSON.stringify(state));
}
function loadState() {
  const saved = localStorage.getItem('adsPayU');
  if(saved) state = {...state, ...JSON.parse(saved)};
}

// ===== RENDER =====
function renderAll() {
  // Balance
  document.getElementById('coinsHome').textContent = `${state.apu.toLocaleString()} APU`;
  document.getElementById('coinsWallet').textContent = `${state.apu.toLocaleString()} APU`;
  document.getElementById('usdtHome').textContent = `${state.usdt.toFixed(4)} USDT | Wallet: ${state.usdt.toFixed(2)} USDT`;
  document.getElementById('usdtWallet').textContent = `${state.usdt.toFixed(4)} USDT`;

  // Profile
  document.getElementById('tonAddress').textContent = state.tonAddress || 'Not Connected';
  document.getElementById('totalEarned').textContent = state.totalEarned;
  document.getElementById('totalAds').textContent = state.totalAds;
  document.getElementById('gigaCount').textContent = state.gigaCount;
  document.getElementById('monetagCount').textContent = state.monetagCount;

  // Daily
  const today = new Date().toDateString();
  document.getElementById('dailyClaimBtn').disabled = state.lastDaily === today;
  document.getElementById('dailyClaimBtn').textContent = state.lastDaily === today ? '✅ CLAIMED TODAY' : '🎁 CLAIM DAILY 50 APU';

  // Miner + Admin
  if(typeof renderMiners === 'function') renderMiners();
  if(typeof renderRequests === 'function') renderRequests();
}

// ===== DAILY CLAIM =====
function claimDaily() {
  const today = new Date().toDateString();
  if(state.lastDaily === today) return;
  state.apu += 50;
  state.totalEarned += 50;
  state.lastDaily = today;
  saveState();
  renderAll();
  showToast('Claimed 50 APU!', 'success');
  tg.HapticFeedback?.notificationOccurred('success');
}

// ===== ADS =====
function showAdConfirm(type){ 
  currentAdType = type; 
  document.getElementById('adConfirmModal').classList.add('active'); 
}
function closeAdConfirm(){ 
  document.getElementById('adConfirmModal').classList.remove('active'); 
}
function proceedAd(){ 
  closeAdConfirm(); 
  watchAd(currentAdType); // this function should be in ads.js
}

function onAdComplete(type) {
  if(type === 'giga' && state.gigaCount < 100) {
    state.gigaCount++; 
  } else if(type === 'monetag' && state.monetagCount < 100) {
    state.monetagCount++;
  } else {
    showToast('Daily limit reached', 'warning'); return;
  }
  state.apu += 2;
  state.totalEarned += 2;
  state.totalAds += 1;
  saveState();
  renderAll();
  showToast('+2 APU', 'success');
}

// ===== SWAP =====
function openSwap(){ 
  document.getElementById('swapModal').classList.add('active'); 
  updateSwapPreview();
}
function closeSwap(){ document.getElementById('swapModal').classList.remove('active'); }
function updateSwapPreview(){
  const amount = parseFloat(document.getElementById('swapInput').value) || 0;
  const usdt = amount * 0.000025;
  document.getElementById('swapPreview').textContent = `You will receive: ${usdt.toFixed(4)} USDT`;
}
function confirmSwap(){
  const amount = parseFloat(document.getElementById('swapInput').value);
  if(!amount || amount < 200){ showToast('Min 200 APU', 'error'); return; }
  if(amount > state.apu){ showToast('Not enough APU', 'error'); return; }
  
  const usdt = amount * 0.000025;
  state.apu -= amount;
  state.usdt += usdt;
  saveState();
  renderAll();
  closeSwap();
  showToast(`Swapped ${amount} APU`, 'success');
}

// ===== DEPOSIT =====
function openDeposit(){ 
  document.getElementById('tonRateText').textContent = `Rate: 1 TON = $${tonRate.toFixed(2)} USDT`;
  document.getElementById('depositModal').classList.add('active'); 
}
function closeDeposit(){ document.getElementById('depositModal').classList.remove('active'); }
document.getElementById('depositInput').addEventListener('input', () => {
  const ton = parseFloat(document.getElementById('depositInput').value) || 0;
  document.getElementById('depositPreview').textContent = `You will receive: ${(ton * tonRate).toFixed(2)} USDT`;
});
function confirmDeposit(){
  const ton = parseFloat(document.getElementById('depositInput').value);
  if(!ton || ton < 0.1){ showToast('Min 0.1 TON', 'error'); return; }
  // Here you should call TON payment. For now we just credit
  state.usdt += ton * tonRate;
  saveState();
  renderAll();
  closeDeposit();
  showToast(`${ton} TON Deposited`, 'success');
}

// ===== WITHDRAW =====
function openWithdraw(){ document.getElementById('withdrawModal').classList.add('active'); }
function closeWithdraw(){ document.getElementById('withdrawModal').classList.remove('active'); }
document.getElementById('withdrawInput').addEventListener('input', () => {
  const usdt = parseFloat(document.getElementById('withdrawInput').value) || 0;
  const fee = usdt * 0.05;
  document.getElementById('withdrawPreview').textContent = `Fee: ${fee.toFixed(4)} USDT | You will receive: ${(usdt-fee).toFixed(4)} USDT`;
});
function requestWithdraw(){
  const usdt = parseFloat(document.getElementById('withdrawInput').value);
  if(!usdt || usdt < 0.5){ showToast('Min $0.50 USDT', 'error'); return; }
  if(usdt > state.usdt){ showToast('Not enough USDT', 'error'); return; }
  
  const req = {
    id: Date.now(),
    user: tg.initDataUnsafe?.user?.id || 'Guest',
    amount: usdt,
    time: new Date().toLocaleString()
  };
  state.requests.push(req);
  state.usdt -= usdt;
  saveState();
  renderAll();
  closeWithdraw();
  showToast('Withdraw request sent', 'success');
}

// ===== ADMIN =====
function openAdmin() {
  if(isAdmin) showTab('admin');
  else document.getElementById('adminPassModal').classList.add('active');
}
function closeAdminPass(){ document.getElementById('adminPassModal').classList.remove('active'); }
function checkAdminPass(){
  if(document.getElementById('adminPassInput').value === 'admin123'){
    isAdmin = true; closeAdminPass(); showTab('admin'); showToast('Admin logged in', 'success');
  } else { showToast('Wrong password', 'error'); }
}
function renderRequests(){
  const list = document.getElementById('reqList');
  document.getElementById('totalReq').textContent = state.requests.length;
  list.innerHTML = state.requests.map(r => `
    <div class="req-item">
      <b>${r.amount.toFixed(4)} USDT</b> - ${r.user}<br>
      <small>${r.time}</small>
    </div>
  `).join('');
}
function clearAllReq(){
  state.requests = [];
  saveState();
  renderRequests();
  showToast('Cleared', 'success');
}

// ===== TON CONNECT =====
function initTON(){
  const connectBtn = document.getElementById('connectBtn');
  if(window.TONConnectUI) {
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({ manifestUrl: 'https://your-domain.com/tonconnect-manifest.json' });
    connectBtn.onclick = async () => {
      if(tonConnectUI.connected) {
        await tonConnectUI.disconnect();
        state.tonAddress = null;
      } else {
        await tonConnectUI.connectWallet();
        state.tonAddress = tonConnectUI.account.address;
      }
      saveState();
      renderAll();
    };
    tonConnectUI.onStatusChange(wallet => {
      state.tonAddress = wallet?.account?.address || null;
      saveState();
      renderAll();
    });
  }
}

// ===== TOAST =====
function showToast(msg, type='success'){
  const t = document.getElementById('toast');
  t.textContent = msg; 
  t.className = `toast show ${type}`;
  setTimeout(()=>t.className='toast', 3000);
  tg.HapticFeedback?.impactOccurred('light');
}

// ===== MINER TICK =====
function tickMiners() {
  if(typeof getMinerIncome === 'function') {
    const income = getMinerIncome();
    document.getElementById('totalIncome').textContent = `${income.toFixed(2)} APU/h`;
  }
}

// Expose for ads.js and miners.js
window.state = state;
window.saveState = saveState;
window.renderAll = renderAll;
window.showToast = showToast; 
window.onAdComplete = onAdComplete;