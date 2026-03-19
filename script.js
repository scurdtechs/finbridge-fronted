// ================================
// BACKEND URL (LIVE SERVER)
// ================================
// Live backend deployed on Vercel
const BASE_URL = "https://finbridge-backened-6x4h.vercel.app";

// ================================
// SHOW ALERT MESSAGE
// ================================
function showAlert(message, type = "success") {
    const alert = document.createElement("div");
    alert.className = "alert alert-" + type;
    alert.innerText = message;
    document.body.prepend(alert);
    setTimeout(() => alert.remove(), 3000);
}

// ================================
// REGISTER
// ================================
const registerForm = document.getElementById("registerForm");
if (registerForm) registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const phone = document.getElementById("regPhone").value;
    const password = document.getElementById("regPassword").value;
    try {
        const res = await fetch(BASE_URL + "/api/users/register", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({name,email,phone,password})
        });
        const data = await res.json();
        if(res.ok){ showAlert(data.message,"success"); registerForm.reset();}
        else showAlert(data.message,"error");
    } catch { showAlert("Registration failed","error"); }
});

// ================================
// LOGIN
// ================================
const loginForm = document.getElementById("loginForm");
if (loginForm) loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value;
    const password = document.getElementById("loginPassword").value;
    try {
        const res = await fetch(BASE_URL + "/api/users/login", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({phone,password})
        });
        const data = await res.json();
        if(res.ok){
            localStorage.setItem("token",data.token);
            localStorage.setItem("name",data.name);
            window.location.href="dashboard.html";
        } else showAlert(data.message,"error");
    } catch { showAlert("Login failed","error"); }
});

// ================================
// AUTH CHECK
// ================================
function requireLogin(){
    const token = localStorage.getItem("token");
    if(!token){ window.location.href="index.html"; return false; }
    return true;
}

// ================================
// BALANCE
// ================================
async function getBalance(){
    if(!requireLogin()) return;
    try {
        const res = await fetch(BASE_URL + "/api/users/balance", {
            headers: { Authorization: "Bearer "+localStorage.getItem("token") }
        });
        const data = await res.json();
        const el = document.getElementById("balance");
        if(el) el.innerText = "Balance: KES "+data.balance;
    } catch { showAlert("Failed to load balance","error"); }
}

// ================================
// DEPOSIT
// ================================
const depositForm = document.getElementById("depositForm");
if(depositForm) depositForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const amount = Number(document.getElementById("depositAmount").value);
    try {
        const res = await fetch(BASE_URL+"/api/deposit",{
            method:"POST",
            headers:{"Content-Type":"application/json",Authorization:"Bearer "+localStorage.getItem("token")},
            body:JSON.stringify({amount})
        });
        const data = await res.json();
        if(res.ok){ showAlert(data.message,"success"); document.getElementById("depositAmount").value=""; getBalance(); getTransactions(); }
        else showAlert(data.message,"error");
    } catch { showAlert("Deposit failed","error"); }
});

// ================================
// SEND MONEY
// ================================
const sendForm = document.getElementById("sendForm");
if(sendForm) sendForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const receiverPhone = document.getElementById("receiverPhone").value;
    const amount = Number(document.getElementById("sendAmount").value);
    try{
        const res = await fetch(BASE_URL+"/api/send",{
            method:"POST",
            headers:{"Content-Type":"application/json",Authorization:"Bearer "+localStorage.getItem("token")},
            body:JSON.stringify({receiverPhone,amount})
        });
        const data = await res.json();
        if(res.ok){ showAlert(data.message,"success"); document.getElementById("receiverPhone").value=""; document.getElementById("sendAmount").value=""; getBalance(); getTransactions(); }
        else showAlert(data.message,"error");
    } catch{ showAlert("Transaction failed","error"); }
});

// ================================
// LOAN REQUEST
// ================================
const loanForm = document.getElementById("loanForm");
if(loanForm) loanForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const amount = Number(document.getElementById("loanAmount").value);
    try{
        const res = await fetch(BASE_URL+"/api/loan",{
            method:"POST",
            headers:{"Content-Type":"application/json",Authorization:"Bearer "+localStorage.getItem("token")},
            body:JSON.stringify({amount})
        });
        const data = await res.json();
        if(res.ok){ showAlert(data.message,"success"); document.getElementById("loanAmount").value=""; getBalance(); getTransactions();}
        else showAlert(data.message,"error");
    } catch{ showAlert("Loan request failed","error"); }
});

// ================================
// SAVINGS GOALS
// ================================
const goalForm = document.getElementById("goalForm");
if(goalForm) goalForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const name = document.getElementById("goalName").value;
    const amount = Number(document.getElementById("goalAmount").value);
    try{
        const res = await fetch(BASE_URL+"/api/goals",{
            method:"POST",
            headers:{"Content-Type":"application/json",Authorization:"Bearer "+localStorage.getItem("token")},
            body:JSON.stringify({name,amount})
        });
        const data = await res.json();
        if(res.ok){ showAlert(data.message,"success"); document.getElementById("goalName").value=""; document.getElementById("goalAmount").value=""; getGoals();}
        else showAlert(data.message,"error");
    } catch{ showAlert("Failed to add goal","error"); }
});

// ================================
// TRANSACTIONS
// ================================
async function getTransactions(){
    if(!requireLogin()) return;
    try{
        const res = await fetch(BASE_URL+"/api/transactions",{headers:{Authorization:"Bearer "+localStorage.getItem("token")}});
        const txs = await res.json();
        const table = document.getElementById("transactionTable");
        if(!table) return;
        table.innerHTML=`<tr><th>Sender</th><th>Receiver</th><th>Amount</th><th>Date</th></tr>`;
        txs.forEach(tx=>{
            const row = table.insertRow();
            row.insertCell(0).innerText=tx.senderPhone;
            row.insertCell(1).innerText=tx.receiverPhone;
            row.insertCell(2).innerText="KES "+tx.amount;
            row.insertCell(3).innerText=new Date(tx.date).toLocaleString();
        });
    } catch { showAlert("Failed to load transactions","error"); }
}

// ================================
// SAVINGS GOALS TABLE
// ================================
async function getGoals(){
    if(!requireLogin()) return;
    try{
        const res = await fetch(BASE_URL+"/api/goals",{headers:{Authorization:"Bearer "+localStorage.getItem("token")}});
        const goals = await res.json();
        const table = document.getElementById("goalTable");
        if(!table) return;
        table.innerHTML=`<tr><th>Goal</th><th>Target</th><th>Progress</th></tr>`;
        goals.forEach(g=>{
            const row=table.insertRow();
            row.insertCell(0).innerText=g.name;
            row.insertCell(1).innerText="KES "+g.amount;
            row.insertCell(2).innerText="KES "+g.progress;
        });
    } catch{ showAlert("Failed to load goals","error"); }
}

// ================================
// MINI-GAME
// ================================
let points=0;
const gameBtn=document.getElementById("gameBtn");
const gamePoints=document.getElementById("gamePoints");
if(gameBtn) gameBtn.addEventListener("click",()=>{
    points++; gamePoints.innerText=points;
    showAlert("You earned 1 point!","success");
});

// ================================
// LOGOUT
// ================================
const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn) logoutBtn.addEventListener("click",()=>{
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    window.location.href="index.html";
});

// ================================
// INITIALIZE DASHBOARD
// ================================
if(document.getElementById("balance")){
    getBalance(); getTransactions(); getGoals();
}