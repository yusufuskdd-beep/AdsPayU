// 1. YOUR BACKEND URL
const BACKEND_URL = "https://adspayu-backend-5y7g.onrender.com";

// 2. CREATE A USER ID THAT STAYS THE SAME
const USER_ID = localStorage.getItem('userId') || 'user_' + Date.now();
localStorage.setItem('userId', USER_ID); // save it so it's the same next time

let pendingAdType = null;
let pendingMinerId = null;

function openAdConfirm(type,minerId=null){
  pendingAdType=type;
  pendingMinerId=minerId;
  document.getElementById('adConfirmModal').classList.add('active')
}

function closeAdConfirm(){
  pendingAdType=null;
  pendingMinerId=null;
  document.getElementById('adConfirmModal').classList.remove('active')
}

// This function talks to your backend to save coins
async function giveAdRewardToServer(type, adId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/watch-ad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        adId: adId,
        duration: 30 // we assume they watched 30s
      })
    });
    const data = await res.json();
    if(data.success) {
      coins = data.newBalance; // update coins from server response
      localStorage.setItem('coins', coins);
      showToast(`+10 APU Earned! Balance: ${coins}`, 'success');
    } else {
      showToast(data.error, 'error');
    }
  } catch(err) {
    showToast("Server error. Coins not saved.", 'error');
    console.log(err);
  }
}

function proceedAd(){
  const type=pendingAdType;
  const minerId=pendingMinerId;
  closeAdConfirm();
  const adId = type + '_' + Date.now(); // unique ad ID for anti-cheat

  if(type==='giga'){
    window.showGiga().then(()=>{
      giveAdRewardToServer('giga', adId);
      gigaWatched+=1;
      trackTotalAds();
      localStorage.setItem('gigaWatched',gigaWatched);
    }).catch(()=>showToast("No ads available",'error'))
  }

  if(type==='monetag'){
    window.show_11258922().then(()=>{
      giveAdRewardToServer('monetag', adId);
      monetagWatched+=1;
      trackTotalAds();
      localStorage.setItem('monetagWatched',monetagWatched);
    }).catch(()=>showToast("No ads available",'error'))
  }

  if(type==='miner'){
    const data=minerData[minerId];
    window.showGiga().then(()=>{
      giveAdRewardToServer('miner_'+minerId, adId);
      data.adsWatched+=1;
      totalAdsWatched+=1;
      localStorage.setItem(`miner${minerId}_adsWatched`,data.adsWatched);
      localStorage.setItem('totalAdsWatched',totalAdsWatched);
      showToast(`+10 APU! ${2-data.adsWatched} left`,'success')
    }).catch(()=>showToast("No ads available",'error'))
  }
}

function checkCooldown(){
  const now=Date.now();
  const timeLeft=COOLDOWN_TIME-(now-lastAdTime);
  const onCooldown=timeLeft>0;
  document.getElementById('gigaBtn').disabled=onCooldown||gigaWatched>=DAILY_LIMIT;
  document.getElementById('monetagBtn').disabled=onCooldown||monetagWatched>=DAILY_LIMIT;
  if(onCooldown){
    const secs=Math.ceil(timeLeft/1000);
    document.getElementById('gigaBtn').innerText=`Wait ${secs}s`;
    document.getElementById('monetagBtn').innerText=`Wait ${secs}s`
  }else{
    document.getElementById('gigaBtn').innerText='Watch';
    document.getElementById('monetagBtn').innerText='Watch'
  }
}

document.getElementById('gigaBtn').onclick=function(){
  const now=Date.now();
  if((COOLDOWN_TIME-(now-lastAdTime))>0)return showToast("Wait 5 seconds",'warning');
  if(gigaWatched>=DAILY_LIMIT)return showToast("Giga limit reached",'error');
  openAdConfirm('giga')
};

document.getElementById('monetagBtn').onclick=function(){
  const now=Date.now();
  if((COOLDOWN_TIME-(now-lastAdTime))>0)return showToast("Wait 5 seconds",'warning');
  if(monetagWatched>=DAILY_LIMIT)return showToast("Monetag limit reached",'error');
  openAdConfirm('monetag')
};