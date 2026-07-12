const BACKEND_URL = "https://adspayu-backend-5y7g.onrender.com";

function updateTotalIncome(){let total=0;MINERS.forEach(m=>{if(minerData[m.id].owned)total+=m.reward});document.getElementById('totalIncome').innerText=total.toLocaleString()+' APU/h'}

function renderMiners(){const container=document.getElementById('minerList');container.innerHTML='';MINERS.forEach(m=>{const data=minerData[m.id];const now=Date.now();const isReady=data.owned&&(now-data.lastClaim>=MINER_INTERVAL);const canClaim=isReady&&data.adsWatched>=2;const daysToROI=m.cost>0?(m.cost/(m.reward*24*COIN_VALUE)).toFixed(1):'N/A';const onCooldown=(COOLDOWN_TIME-(now-lastAdTime))>0;let buttons='';let extraHTML='';let cardClass='miner-card';if(m.type==='starter'){cardClass+=' starter';const progress=Math.min(totalAdsWatched,m.unlockAds);const percent=(progress/m.unlockAds)*100;extraHTML=`<div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div><div class="progress-text">${progress}/${m.unlockAds} Ads Watched</div>`;if(!data.owned){buttons=totalAdsWatched>=m.unlockAds?`<button class="miner-btn btn-buy" onclick="unlockStarter()">UNLOCK FREE</button>`:`<button class="miner-btn btn-buy" disabled>WATCH ${m.unlockAds-totalAdsWatched} MORE ADS</button>`}}else{if(!data.owned)buttons=`<button class="miner-btn btn-buy" onclick="buyMiner(${m.id})">BUY - $${m.cost.toFixed(2)}</button>`}if(data.owned&&!isReady){const timeLeft=MINER_INTERVAL-(now-data.lastClaim);const mins=Math.floor(timeLeft/6e4);const secs=Math.floor((timeLeft%6e4)/1e3);buttons=`<button class="miner-btn btn-buy" disabled>MINING... ${mins}m ${secs}s</button>`}if(data.owned&&isReady){buttons=`<div class="miner-btns"><button class="miner-btn btn-ad" onclick="watchAdForMiner(${m.id})" ${data.adsWatched>=2||onCooldown?'disabled':''}>${onCooldown?'WAIT 5s':`WATCH AD ${data.adsWatched}/2`}</button><button class="miner-btn btn-claim" onclick="claimMiner(${m.id})" ${!canClaim?'disabled':''}>CLAIM ${m.reward}</button></div>`}container.innerHTML+=`<div class="${cardClass} ${data.owned?'active':''}"><div class="miner-header"><div class="miner-name">${m.icon} ${m.name}</div><div class="miner-status ${data.owned?'active':''}">${data.owned?'ACTIVE':'LOCKED'}</div></div><div class="miner-info">Cost: ${m.cost>0?'$'+m.cost.toFixed(2):'200 Total Ads'} | Earn: ${m.reward} APU/hour</div><div class="miner-roi">ROI: ${m.roi} in 30 days ${daysToROI!=='N/A'?'| Break-even: ~'+daysToROI+' days':''}</div>${extraHTML}<div class="miner-progress">${isReady?m.reward+'/'+m.reward+' APU':'0/'+m.reward+' APU'}</div>${buttons}</div>`})}

function unlockStarter(){
  minerData[0].owned=true;
  minerData[0].lastClaim=Date.now();
  localStorage.setItem(`miner0_owned`,'true');
  localStorage.setItem(`miner0_lastClaim`,minerData[0].lastClaim);
  renderMiners();updateTotalIncome();
  showToast("🎁 Starter Miner Unlocked!",'success')
}

// CHANGED: Buy miner now calls backend
async function buyMiner(id){
  const m=MINERS.find(x=>x.id===id);
  if(usdt<m.cost)return showToast(`Not enough USDT. Need $${m.cost.toFixed(2)}`,'error');

  try {
    const res = await fetch(`${BACKEND_URL}/api/buy-miner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, minerId: id, cost: m.cost })
    });
    const data = await res.json();
    if(data.success){
      usdt = data.newUsdt;
      minerData[id].owned=true;
      minerData[id].lastClaim=Date.now();
      localStorage.setItem(`miner${id}_owned`,'true');
      localStorage.setItem(`miner${id}_lastClaim`,minerData[id].lastClaim);
      updateUI();renderMiners();updateTotalIncome();
      showToast(`${m.name} Purchased!`,'success')
    } else { showToast(data.error,'error') }
  } catch(e){ showToast("Server error",'error') }
}

function watchAdForMiner(id){
  const now=Date.now();
  if((COOLDOWN_TIME-(now-lastAdTime))>0)return showToast("Wait 5 seconds",'warning');
  const data=minerData[id];
  if(data.adsWatched>=2)return;
  openAdConfirm('miner',id)
}

// CHANGED: Claim miner now calls backend
async function claimMiner(id){
  const m=MINERS.find(x=>x.id===id);
  const data=minerData[id];
  const now=Date.now();
  if(now-data.lastClaim<MINER_INTERVAL)return showToast("Not ready yet",'warning');
  if(data.adsWatched<2)return showToast("Watch 2 ads first",'warning');

  try {
    const res = await fetch(`${BACKEND_URL}/api/claim-miner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, minerId: id, reward: m.reward })
    });
    const data = await res.json();
    if(data.success){
      coins = data.newCoins;
      data.lastClaim=now;
      data.adsWatched=0;
      localStorage.setItem(`miner${id}_lastClaim`,data.lastClaim);
      localStorage.setItem(`miner${id}_adsWatched`,0);
      updateUI();renderMiners();updateTotalIncome();
      showToast(`+${m.reward} APU Claimed!`,'success')
    } else { showToast(data.error,'error') }
  } catch(e){ showToast("Server error",'error') }
}

function openSwap(){document.getElementById('swapModal').classList.add('active');document.getElementById('swapInput').value=MIN_SWAP;updateSwapPreview()}
function closeSwap(){document.getElementById('swapModal').classList.remove('active')}
function updateSwapPreview(){const amount=parseInt(document.getElementById('swapInput').value)||0;const usdtValue=(amount*COIN_VALUE).toFixed(4);document.getElementById('swapPreview').innerText=`You will receive: ${usdtValue} USDT`}

// CHANGED: Swap now calls backend
async function confirmSwap(){
  const amount=parseInt(document.getElementById('swapInput').value)||0;
  if(amount<MIN_SWAP)return showToast(`Minimum swap is ${MIN_SWAP} APU`,'error');
  if(amount>coins)return showToast("Not enough APU",'error');

  try {
    const res = await fetch(`${BACKEND_URL}/api/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, amount: amount })
    });
    const data = await res.json();
    if(data.success){
      coins = data.newCoins;
      usdt = data.newUsdt;
      updateUI();closeSwap();
      showToast(`Swapped ${amount} APU for ${data.usdtReceived.toFixed(4)} USDT!`,'success')
    } else { showToast(data.error,'error') }
  } catch(e){ showToast("Server error",'error') }
}

function checkDaily(){const btn=document.getElementById('dailyClaimBtn');const today=new Date().toDateString();const lastDailyClaim=localStorage.getItem('lastDailyClaim');if(lastDailyClaim===today){btn.disabled=true;btn.innerText="✅ CLAIMED TODAY";btn.style.background="#333"}}

// CHANGED: Daily claim now calls backend
async function claimDaily(){
  const today=new Date().toDateString();
  const lastDailyClaim=localStorage.getItem('lastDailyClaim');
  if(lastDailyClaim===today)return showToast("Already claimed today",'warning');

  try {
    const res = await fetch(`${BACKEND_URL}/api/daily-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID })
    });
    const data = await res.json();
    if(data.success){
      coins = data.newCoins;
      localStorage.setItem('lastDailyClaim',today);
      updateUI();checkDaily();
      showToast("+50 APU Claimed!",'success')
    } else { showToast(data.error,'error') }
  } catch(e){ showToast("Server error",'error') }
}

function trackTotalAds(){totalAdsWatched+=1;localStorage.setItem('totalAdsWatched',totalAdsWatched)}

function openAdmin(){document.getElementById('adminPassModal').classList.add('active')}
function closeAdminPass(){document.getElementById('adminPassModal').classList.remove('active')}
function checkAdminPass(){const pass=document.getElementById('adminPassInput').value;if(pass!==ADMIN_PASS)return showToast("Wrong Password",'error');closeAdminPass();showTab('admin');renderAdminRequests()}

// CHANGED: Admin now loads from backend
async function renderAdminRequests(){
    const list=document.getElementById('reqList');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/withdraws`);
      const data = await res.json();
      const requests = data.requests || [];
      document.getElementById('totalReq').innerText=requests.length;
      if(requests.length===0){
          list.innerHTML='<div class="card"><div class="card-sub">No withdraw requests yet.</div></div>';
          return
      }
      list.innerHTML='';
      requests.forEach(r=>{
          list.innerHTML+=`<div class="req-item"><b>ID:</b> ${r._id}<br><b>Amount:</b> ${r.amount.toFixed(2)} USDT<br><b>Fee 5%:</b> ${r.fee.toFixed(4)} USDT<br><b>You Send:</b> ${r.receive.toFixed(4)} USDT<br><b>Wallet:</b> ${r.wallet}<br><b>Date:</b> ${new Date(r.date).toLocaleString()}<br><b>Status:</b> ${r.status}</div>`
      })
    } catch(e){ list.innerHTML = "Failed to load requests" }
}

function clearAllReq(){if(!confirm("Delete all withdraw requests?"))return;showToast("Use MongoDB to delete",'warning')}