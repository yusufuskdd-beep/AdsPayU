const BACKEND_URL = "https://adspayu-backend-5y7g.onrender.com";
const USER_ID = localStorage.getItem('userId') || 'user_' + Date.now();
localStorage.setItem('userId', USER_ID);

let coins = 0; // this will now come from server
let usdt = 0;

async function loadUserData(){
  try {
    const res = await fetch(`${BACKEND_URL}/api/user/${USER_ID}`);
    const data = await res.json();
    if(data.success){
      coins = data.user.coins;
      usdt = data.user.usdt;
      localStorage.setItem('coins', coins);
      updateUI();
    }
  } catch(err){
    console.log("Failed to load user data", err);
  }
}

function init(){
    loadUserData(); // NEW: load coins from backend first
    updateUI();checkDaily();renderMiners();updateTotalIncome();loadTonPrice();initTonConnect();
    setInterval(updateAllMiners,1000);
    const uid=document.getElementById('userId');if(uid)uid.innerText=tg.initDataUnsafe?.user?.id||USER_ID;
    const un=document.getElementById('username');if(un)un.innerText=tg.initDataUnsafe?.user?.username||'-'
    
    // BIND WALLET BUTTONS AFTER PAGE LOADS
    document.getElementById('depositBtn').onclick=openDeposit;
    document.getElementById('withdrawBtn').onclick=openWithdraw;
}

// REMOVED: local coins += 
// Coins are now only updated by ads.js calling the backend
function giveAdReward(callback){
  lastAdTime=Date.now();
  localStorage.setItem('lastAdTime',lastAdTime);
  callback(); // this will call giveAdRewardToServer in ads.js
  setTimeout(loadUserData, 500); // wait 0.5s then reload balance from server
  updateUI();renderMiners()
}

function updateUI(){
  const usdtFromCoins=(coins*COIN_VALUE).toFixed(4);
  document.getElementById('coinsHome').innerText=coins.toLocaleString()+' APU';
  document.getElementById('usdtHome').innerText=usdtFromCoins+' USDT | Wallet: '+usdt.toFixed(2)+' USDT';
  document.getElementById('coinsWallet').innerText=coins.toLocaleString()+' APU';
  document.getElementById('usdtWallet').innerText=usdtFromCoins+' USDT | Wallet: '+usdt.toFixed(2)+' USDT';
  document.getElementById('gigaCount').innerText=gigaWatched;
  document.getElementById('monetagCount').innerText=monetagWatched;
  document.getElementById('totalEarned').innerText=coins.toLocaleString();
  document.getElementById('totalAds').innerText=totalAdsWatched;
  checkCooldown()
}

function updateAllMiners(){renderMiners();checkCooldown()}

function showToast(msg,type='success'){
  const toast=document.getElementById('toast');
  toast.innerText=msg;toast.className='toast '+type;toast.classList.add('show');
  setTimeout(()=>{toast.classList.remove('show')},2500)
}

function showTopTab(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.top-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('tab'+id.charAt(0).toUpperCase()+id.slice(1)).classList.add('active')
}

function showTab(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.target.closest('.nav-item').classList.add('active');
    if(id === 'admin'){renderAdminRequests();}
}

init();