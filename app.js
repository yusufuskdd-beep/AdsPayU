function showToast(msg){alert(msg)}
function showTab(tab){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
}
function claimDaily(){showToast("Daily Clicked!")}

window.onload = () => {
    alert("APP LOADED - JS IS WORKING");
}