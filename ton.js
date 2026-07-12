const BACKEND_URL = "https://adspayu-backend-5y7g.onrender.com"; // already in config.js but safe to keep

async function loadTonPrice(){try{const res=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');const data=await res.json();currentTonPrice=data['the-open-network'].usd}catch{}document.getElementById('tonRateText').innerText=`Rate: 1 TON = $${currentTonPrice.toFixed(2)} USDT\nSend TON to your in-game balance`}

function openDeposit(){loadTonPrice();document.getElementById('depositInput').value="0.5";updateDepositPreview();document.getElementById('depositModal').classList.add('active')}
function closeDeposit(){document.getElementById('depositModal').classList.remove('active')}
document.getElementById('depositInput').oninput=updateDepositPreview;

function updateDepositPreview(){const ton=parseFloat(document.getElementById('depositInput').value)||0;const usdtValue=(ton*currentTonPrice).toFixed(2);document.getElementById('depositPreview').innerText=`You will receive: ${usdtValue} USDT`}

async function confirmDeposit(){
  if(!walletConnected)return showToast("Connect TON wallet first",'error');
  const amountTON=parseFloat(document.getElementById('depositInput').value);
  if(!amountTON||amountTON<0.1)return showToast("Min deposit 0.1 TON",'error');
  const usdtToReceive=(amountTON*currentTonPrice).toFixed(2);
  if(!confirm(`Send ${amountTON} TON = ${usdtToReceive} USDT?\n\nTo: ${YOUR_TON_WALLET}`))return;
  
  document.getElementById('depositConfirmBtn').disabled=true;
  const amountNano=(amountTON*1e6).toString();
  const transaction={validUntil:Math.floor(Date.now()/1e3)+600,messages:[{address:YOUR_TON_WALLET,amount:amountNano,payload:userWalletAddress}]};
  
  try{
    await tonConnectUI.sendTransaction(transaction);
    showToast(`Sent ${amountTON} TON! Crediting...`,'success');
    
    // CHANGED: Credit USDT via backend instead of localStorage
    setTimeout(async ()=>{
      try {
        const res = await fetch(`${BACKEND_URL}/api/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_ID, amount: parseFloat(usdtToReceive) })
        });
        const data = await res.json();
        if(data.success){
          usdt = data.newBalance; // update from server
          updateUI();
          closeDeposit();
          showToast(`+${usdtToReceive} USDT Credited!`,'success')
        }
      } catch(e){ showToast("Failed to credit balance",'error') }
    },15000)
  }catch(e){showToast("Transaction cancelled",'error')}
  
  document.getElementById('depositConfirmBtn').disabled=false
}

function initTonConnect(){
  tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:'https://adspayu.vercel.app/tonconnect-manifest.json',buttonRootId:'connectBtn'});
  tonConnectUI.onStatusChange(wallet=>{
    if(wallet){
      userWalletAddress=wallet.account.address;
      walletConnected=true;
      localStorage.setItem('walletConnected','true');
      localStorage.setItem('walletAddress',userWalletAddress);
      showToast("TON Wallet Connected!",'success')
    }else{
      userWalletAddress=null;walletConnected=false;
      localStorage.setItem('walletConnected','false');
      localStorage.setItem('walletAddress','');
      showToast("TON Wallet Disconnected",'warning')
    }
    updateConnectBtn();updateUI()
  })
}

function updateConnectBtn(){
  const btn=document.getElementById('connectBtn');
  const addrEl=document.getElementById('tonAddress');
  if(walletConnected&&userWalletAddress){
    const shortAddr=userWalletAddress.slice(0,4)+'...'+userWalletAddress.slice(-4);
    btn.innerText=`✅ ${shortAddr}`;
    btn.style.background="#00C853";
    btn.onclick=()=>tonConnectUI.disconnect();
    addrEl.innerText=shortAddr
  }else{
    btn.innerText="🔗 CONNECT TON";
    btn.style.background="#FF8A00";
    btn.onclick=()=>tonConnectUI.openModal();
    addrEl.innerText="Not Connected"
  }
}

function openWithdraw(){
  if(!walletConnected)return showToast("Connect TON wallet first",'error');
  document.getElementById('withdrawInput').value="0.50";
  updateWithdrawPreview();
  document.getElementById('withdrawModal').classList.add('active')
}

function closeWithdraw(){document.getElementById('withdrawModal').classList.remove('active')}
document.getElementById('withdrawInput').oninput=updateWithdrawPreview;

function updateWithdrawPreview(){
  const amount=parseFloat(document.getElementById('withdrawInput').value)||0;
  const fee=amount*0.05;
  const receive=(amount-fee).toFixed(4);
  document.getElementById('withdrawPreview').innerText=`Fee: ${fee.toFixed(4)} USDT | You will receive: ${receive} USDT`
}

// CHANGED: Send withdraw request to backend
async function requestWithdraw(){
  const amount=parseFloat(document.getElementById('withdrawInput').value)||0;
  if(amount<0.5)return showToast("Minimum withdraw is $0.50 USDT",'error');
  if(amount>usdt)return showToast("Not enough USDT balance",'error');
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/withdraw-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: USER_ID, 
        amount: amount, 
        wallet: userWalletAddress 
      })
    });
    const data = await res.json();
    if(data.success){
      usdt = data.newBalance; // updated from server
      updateUI();
      closeWithdraw();
      showToast(`Withdraw request for ${data.receive.toFixed(4)} USDT submitted!`,'success')
    } else {
      showToast(data.error,'error')
    }
  } catch(e){ showToast("Server error",'error') }
}