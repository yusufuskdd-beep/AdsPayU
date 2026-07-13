const tg = window.Telegram.WebApp;
const API_URL = "https://adspayu-backend-5y7g.onrender.com";
let userId = null;
let userData = {};
let miningInterval = null; // for live counter

tg.expand();
tg.setHeaderColor("#0a0b0f");
tg.BackButton.show();

// Mining rates per MINER per SECOND
const RATES_PER_SECOND = {
  1: 0.005 / 60,   // Tier 1
  2: 0.035 / 60,   // Tier 2  
  3: 0.150 / 60,   // Tier 3
  4: 0.312 / 60,   // Tier 4
  5: 0.957 / 60    // Tier 5
};

async function init() {
  try {
    const res = await fetch(`${API_URL}/api/auth`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({initData: tg.initData})
    });
    userData = await res.json();
    userId = userData.id;
    updateUI();
    startLiveMining(); // start the counter
  } catch(e) {
    tg.showPopup({message: "Backend Error: " + e.message});
  }
}
init();

function updateUI() {
  document.getElementById('totalBalance').innerHTML = userData.balance.toFixed(4) + ' <span>MCT</span>';
  document.getElementById('vaultBalance').innerHTML = userData.balance.toFixed(3) + ' <span>MCT</span>';
  document.getElementById('pendingYield').textContent = '+' + userData.pending.toFixed(6);
  document.getElementById('activeMiners').textContent = userData.miners;
  document.getElementById('totalEarned').textContent = userData.earned.toFixed(2);
}

function startLiveMining() {
  clearInterval(miningInterval); // stop old one
  miningInterval = setInterval(() => {
    const ratePerSec = RATES_PER_SECOND[userData.miners] || RATES_PER_SECOND[1];
    userData.pending += ratePerSec * userData.miners; // add every second
    document.getElementById('pendingYield').textContent = '+' + userData.pending.toFixed(6);
  }, 1000); // every 1 second
}

function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}

async function claim() {
  clearInterval(miningInterval); // stop counter to sync with server
  const res = await fetch(`${API_URL}/api/claim`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId})});
  const data = await res.json();
  if(data.success) { 
    userData.balance = data.balance; 
    userData.earned = data.earned; 
    userData.pending = 0; 
    updateUI(); 
    startLiveMining(); // restart counter
  }
  tg.showPopup({message: "Yield claimed!"});
}

async function buyMiner(price, tier) {
  const res = await fetch(`${API_URL}/api/buy`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId, price})});
  const data = await res.json();
  if(data.success) { 
    userData.balance -= price; 
    userData.miners += 1; 
    updateUI(); 
    startLiveMining(); // restart with new rate
    tg.showPopup({message: `Tier ${tier} Miner Deployed!`}); 
  }
  else { tg.showPopup({message: data.error}); }
}

async function deposit() {
  let amount = parseFloat(document.getElementById('depositAmount').value);
  if(amount <= 0) return tg.showPopup({message: "Enter amount"});
  await fetch(`${API_URL}/api/deposit`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId, amount})});
  userData.balance += amount; updateUI();
  document.getElementById('depositAmount').value = "0.00";
  tg.showPopup({message: `Deposited ${amount} MCT`});
}

function copyLink() {
  navigator.clipboard.writeText(document.getElementById('refLink').value);
  tg.showPopup({message: "Link copied!"});
}