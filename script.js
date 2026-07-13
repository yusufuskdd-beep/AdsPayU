const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor("#0a0b0f");

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.closest('.nav-btn').classList.add('active');
}

function copyLink() {
  const link = document.getElementById('refLink');
  link.select();
  document.execCommand('copy');
  tg.showPopup({message: "Link copied!"});
}

function shareLink() {
  tg.showPopup({message: "Share feature triggered"});
}

function claim() {
  tg.showPopup({message: "Yield claimed!"});
}

// Close app on back button
tg.BackButton.onClick(() => tg.close());