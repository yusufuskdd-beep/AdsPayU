let balance = 165.048;
let miners = 1;
let earned = 15.05;
let pending = 0.209802;

const tg = window.Telegram?.WebApp;

// Init Telegram if available
if (tg) {
  tg.expand();
  tg.setHeaderColor("#0a0b0f");
  tg.BackButton.show();
  tg.BackButton.onClick(() => tg.close());
}

function updateUI() {
  document.getElementById('totalBalance').innerHTML = balance.toFixed(4) + ' <span>MCT</span>';
  document.getElementById('vaultBalance').innerHTML = balance.toFixed(3) + ' <span>MCT</span>';
  document.getElementById('pendingYield').textContent = '+' + pending.toFixed(6);
  document.getElementById('activeMiners').textContent = miners;
  document.getElementById('totalEarned').textContent = earned.toFixed(2);
}

function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}

function copyLink() {
  const link = document.getElementById('refLink');
  navigator.clipboard.writeText(link.value);
  showMsg("Link copied!");
}

function shareLink() {
  if (tg && tg.shareUrl) {
    tg.shareUrl(document.getElementById('refLink').value);
  } else if (navigator.share) {
    navigator.share({url: document.getElementById('refLink').value});
  } else {
    showMsg("Share: " + document.getElementById('refLink').value);
  }
}

function claim() {
  balance += pending;
  earned += pending;
  pending = 0;
  updateUI();
  showMsg("Yield claimed!");
}

function buyMiner(price, tier) {
  if (balance >= price) {
    balance -= price;
    miners += 1;
    updateUI();
    showMsg(`Tier ${tier} Miner Deployed! -${price} MCT`);
  } else {
    showMsg("Not enough MCT");
  }
}

function deposit() {
  let amount = parseFloat(document.getElementById('depositAmount').value);
  if (amount > 0) {
    balance += amount;
    updateUI();
    document.getElementById('depositAmount').value = "0.00";
    showMsg(`Deposited ${amount} MCT`);
  } else {
    showMsg("Enter amount");
  }
}

function showMsg(msg) {
  if (tg) tg.showPopup({message: msg});
  else alert(msg);
}

updateUI();