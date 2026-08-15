const tg=window.Telegram.WebApp;tg.ready();tg.expand();tg.setHeaderColor('#070A12');tg.setBackgroundColor('#070A12');let user=tg.initDataUnsafe.user||{first_name:"Miner",id:"guest"};

const BOT_USERNAME = "AdsPayU_bot";
const SAVE_KEY=`ads_earn_save_${user.id}`;const MAX_ADS_PER_DAY=50,AD_REWARD_MAD=5,REF_BONUS_MAD=100;function getUTCTimestamp(){return Date.now()}let madBalance=0,adsWatchedToday=0,lastLoginDay=0,loginStreak=0,referredBy=null,myReferrals=[];

const DAILY_REWARDS=[
  {day:1,mad:10},{day:2,mad:20},{day:3,mad:30},{day:4,mad:40},
  {day:5,mad:50},{day:6,mad:70},{day:7,mad:150}
];

function showPopup(t,e,i){tg.showPopup({title:e,message:i,buttons:[{type:"ok"}]})}
function showRewardedAd(){return new Promise((res,rej)=>{
  if(typeof window.showGiga!=="function"){showPopup("error","Ad Error","GigaPub not loaded. Refresh app");rej();return}
  window.showGiga().then(()=>{res()}).catch(e=>{showPopup("error","Ad Failed","No ads available. Try in 30s");rej(e)})
})}

async function claimDailyLogin(){
  const today=Math.floor(getUTCTimestamp()/86400000);
  if(lastLoginDay===today)return showPopup("alert","Already Claimed","Come back tomorrow");
  await showRewardedAd();
  if(lastLoginDay===today-1){loginStreak++;}else{loginStreak=1;}
  if(loginStreak>7)loginStreak=1;
  lastLoginDay=today;
  const reward=DAILY_REWARDS[loginStreak-1];
  madBalance+=reward.mad;
  updateBalance();saveGame();showPopup("success",`Day ${loginStreak} Bonus!`, `+${reward.mad} MAD`);renderHome();
}

function canClaimDaily(){const today=Math.floor(getUTCTimestamp()/86400000);return lastLoginDay!==today;}

// REMOVED WALLET TAB
const tabs={home:renderHome,tasks:renderTasks,referral:renderReferral,profile:renderProfile};

document.addEventListener("DOMContentLoaded",()=>{
  handleReferral();
  document.querySelectorAll(".tabbar button").forEach(t=>{t.onclick=()=>{document.querySelectorAll(".tabbar button").forEach(e=>e.classList.remove("active"));t.classList.add("active");tabs[t.dataset.tab]()}});
  loadGame();updateBalance();
  document.querySelector('.tabbar button[data-tab="home"]').classList.add("active");renderHome();
  setTimeout(()=>{if(typeof window.showGiga==="function")renderHome()},2000)
});

function handleReferral(){
  const startParam = tg.initDataUnsafe.start_param;
  const claimed = localStorage.getItem(`claimed_ref_${user.id}`);
  if(startParam && startParam !== user.id.toString() && !claimed){
    madBalance += REF_BONUS_MAD;
    referredBy = startParam;
    localStorage.setItem(`claimed_ref_${user.id}`, startParam);
    let inviterRefs = JSON.parse(localStorage.getItem(`refs_of_${startParam}`) || '[]');
    if(!inviterRefs.includes(user.id)){
      inviterRefs.push(user.id);
      localStorage.setItem(`refs_of_${startParam}`, JSON.stringify(inviterRefs));
    }
    saveGame();
    setTimeout(()=>showPopup("success","Welcome! 🎉",`+${REF_BONUS_MAD} MAD for joining!`),1000);
  }
}

function loadGame(){try{const t=localStorage.getItem(SAVE_KEY);if(t){const e=JSON.parse(t);madBalance=e.madBalance||0;adsWatchedToday=e.adsWatchedToday||0;lastLoginDay=e.lastLoginDay||0;loginStreak=e.loginStreak||0;referredBy=e.referredBy||null;}}catch{}saveGame()}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify({madBalance,adsWatchedToday,lastLoginDay,loginStreak,referredBy}))}
function updateBalance(){const el=document.getElementById("balance");if(el)el.innerHTML=`${madBalance.toFixed(0)} MAD`}

async function watchAdTask(){if(adsWatchedToday>=MAX_ADS_PER_DAY)return showPopup("alert","Limit","50/50 today");await showRewardedAd();adsWatchedToday++;madBalance+=AD_REWARD_MAD;updateBalance();saveGame();showPopup("success","Earned!",`+${AD_REWARD_MAD} MAD`);renderTasks()}

function renderHome(){
  const c=document.getElementById("content");const adsReady=typeof window.showGiga==="function";const dailyReady=canClaimDaily();const nextReward=DAILY_REWARDS[loginStreak>=7?0:loginStreak];
  let gridHTML='';DAILY_REWARDS.forEach((r,idx)=>{const dayNum=idx+1;let cls='';if(dayNum<loginStreak+1)cls='done';else if(dayNum===loginStreak+1&&dailyReady)cls='active';gridHTML+=`<div class="daily-item ${cls}"><div class="daily-icon">🪙</div><div class="daily-amt">${r.mad} MAD</div></div>`;});
  c.innerHTML=`<div class="card"><h2>Welcome ${user.first_name}</h2><p>Watch ads and earn MAD</p></div>
  <div class="daily-card"><div class="daily-header"><h3>🎁 Daily Rewards</h3><div class="daily-streak">Day ${loginStreak}/7</div></div><div class="daily-grid">${gridHTML}</div><div class="daily-reward"><div class="daily-info"><p>Next Reward</p><b>${nextReward.mad} MAD</b></div><button class="daily-btn" ${!adsReady||!dailyReady?"disabled":""} onclick="claimDailyLogin()">${!dailyReady?'Claimed':adsReady?'Watch Ad':'Loading...'}</button></div></div>
  <div class="card"><h3>📊 Your Stats</h3><p>MAD Balance: <b>${madBalance.toFixed(0)}</b></p><p>Ads Today: <b>${adsWatchedToday}/${MAX_ADS_PER_DAY}</b></p></div>`
}

function renderTasks(){const adsReady=typeof window.showGiga==="function";document.getElementById("content").innerHTML=`<h2>Earn</h2><div class="card"><h3>📺 Watch Ads</h3><p>Earn <b>${AD_REWARD_MAD} MAD</b> per ad</p><p>${adsWatchedToday}/${MAX_ADS_PER_DAY}</p><button class="btn" ${!adsReady?"disabled":""} onclick="watchAdTask()">${adsReady?`WATCH AD +${AD_REWARD_MAD} MAD`:'LOADING ADS...'}</button></div><div class="card"><h3>💡 Tip</h3><p style="font-size:13px;color:var(--muted)">Come back daily for bonus rewards and invite friends to earn more!</p></div>`}

function renderReferral(){
  myReferrals = JSON.parse(localStorage.getItem(`refs_of_${user.id}`) || '[]');
  const earned = myReferrals.length * REF_BONUS_MAD;
  const link = `https://t.me/${BOT_USERNAME}?start=${user.id}`;
  
  document.getElementById("content").innerHTML=`<h2>👥 Referral</h2>
  <div class="card"><h3>Invite Friends</h3><p>Earn <b>${REF_BONUS_MAD} MAD</b> per friend!</p>
  <div style="background:#0A0D14;padding:12px;border-radius:10px;margin:10px 0"><p style="font-size:12px;color:var(--muted)">Your Link:</p><p style="word-break:break-all;font-size:13px">${link}</p></div>
  <button class="btn" onclick="navigator.clipboard.writeText('${link}');showPopup('success','Copied!','Link copied')">📋 Copy Link</button></div>
  
  <div class="card"><h3>Your Stats</h3><p>👥 Invited: <b>${myReferrals.length}</b></p><p>💰 Earned: <b>${earned.toFixed(0)} MAD</b></p></div>
  
  <div class="card"><h3>How it works</h3><p style="font-size:13px;color:var(--muted)">1. Share your link<br>2. Friend joins @${BOT_USERNAME}<br>3. Both get instant bonus</p></div>`;
}

function renderProfile(){document.getElementById("content").innerHTML=`<h2>Profile</h2><div class="card"><p>Name: ${user.first_name}</p><p>Streak: Day ${loginStreak}/7</p><p>MAD: ${madBalance.toFixed(0)}</p><p>Ads Today: ${adsWatchedToday}/${MAX_ADS_PER_DAY}</p>${referredBy?`<p>Invited by: ${referredBy}</p>`:''}</div>`}

setInterval(saveGame,10000);