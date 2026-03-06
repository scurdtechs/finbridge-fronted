// ---------- BASE URL ----------
const BASE_URL = "http://localhost:3000";

// ---------- USER DATA ----------
let token = null;  // logged-in user token (phone)
let userName = null;

// ---------- LOGIN ----------
const loginForm = document.getElementById("loginForm");
loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch(`${BASE_URL}/api/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            userName = data.name;
            showDashboard();
            loadWallet();
            loadTransactions();
        } else {
            showAlert(data.message, "error");
        }
    } catch (err) {
        showAlert("Login failed", "error");
    }
});

// ---------- REGISTER ----------
const registerForm = document.getElementById("registerForm");
registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const phone = document.getElementById("regPhone").value;
    const password = document.getElementById("regPassword").value;

    try {
        const res = await fetch(`${BASE_URL}/api/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();
        showAlert(data.message, res.ok ? "success" : "error");
    } catch (err) {
        showAlert("Registration failed", "error");
    }
});

// ---------- LOAD WALLET ----------
async function loadWallet() {
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/api/users/${token}`, {
            headers: { "Authorization": token }
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById("balance").innerText = data.balance.toFixed(2);
        } else {
            showAlert(data.message, "error");
        }
    } catch (err) {
        showAlert("Failed to fetch wallet", "error");
    }
}

// ---------- DEPOSIT ----------
const depositForm = document.getElementById("depositForm");
depositForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById("depositAmount").value);
    if (!amount || amount <= 0) return showAlert("Enter a valid amount", "error");

    try {
        const res = await fetch(`${BASE_URL}/api/deposit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ amount })
        });
        const data = await res.json();
        showAlert(data.message, res.ok ? "success" : "error");
        if (res.ok) {
            loadWallet();
            loadTransactions();
        }
    } catch (err) {
        showAlert("Deposit failed", "error");
    }
});

// ---------- SEND MONEY ----------
const sendForm = document.getElementById("sendForm");
sendForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const receiverPhone = document.getElementById("sendPhone").value;
    const amount = Number(document.getElementById("sendAmount").value);
    if (!receiverPhone || !amount || amount <= 0) return showAlert("Enter valid data", "error");

    try {
        const res = await fetch(`${BASE_URL}/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ receiverPhone, amount })
        });
        const data = await res.json();
        showAlert(data.message, res.ok ? "success" : "error");
        if (res.ok) {
            loadWallet();
            loadTransactions();
        }
    } catch (err) {
        showAlert("Send money failed", "error");
    }
});

// ---------- TRANSACTIONS ----------
async function loadTransactions() {
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/api/transactions`, {
            headers: { "Authorization": token }
        });
        const txs = await res.json();
        const txList = document.getElementById("transactions");
        if (!txList) return;

        txList.innerHTML = "";
        txs.forEach(tx => {
            const li = document.createElement("li");
            li.innerText = `${tx.type.toUpperCase()} | ${tx.amount} | From: ${tx.senderPhone} To: ${tx.receiverPhone} | ${new Date(tx.date).toLocaleString()}`;
            txList.appendChild(li);
        });
    } catch (err) {
        showAlert("Failed to load transactions", "error");
    }
}

// ---------- SHOW DASHBOARD ----------
function showDashboard() {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "block";
    document.getElementById("welcomeUser").innerText = `Welcome, ${userName}`;
}

// ---------- LIVE ALERTS ----------
function showAlert(message, type="success") {
    const alertDiv = document.createElement("div");
    alertDiv.innerText = message;
    alertDiv.style.position = "fixed";
    alertDiv.style.top = "20px";
    alertDiv.style.right = "20px";
    alertDiv.style.padding = "15px 20px";
    alertDiv.style.background = type === "success" ? "#21d07a" : "#ff4d4d";
    alertDiv.style.color = "#fff";
    alertDiv.style.borderRadius = "10px";
    alertDiv.style.zIndex = "9999";
    alertDiv.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}