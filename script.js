// ================================
// BACKEND URL (YOUR VERCEL SERVER)
// ================================
const BASE_URL = "https://finbridge-backened-elwl-3wwml2qjw-scurd142-glitchs-projects.vercel.app";


// ================================
// SHOW ALERT MESSAGE
// ================================
function showAlert(message, type = "success") {

    const alert = document.createElement("div");
    alert.className = "alert alert-" + type;
    alert.innerText = message;

    document.body.prepend(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}



// ================================
// REGISTER USER
// ================================
const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("regName").value;
        const email = document.getElementById("regEmail").value;
        const phone = document.getElementById("regPhone").value;
        const password = document.getElementById("regPassword").value;

        try {

            const response = await fetch(BASE_URL + "/api/users/register", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    password
                })

            });

            const data = await response.json();

            if (response.ok) {

                showAlert(data.message, "success");
                registerForm.reset();

            } else {

                showAlert(data.message, "error");

            }

        } catch (error) {

            showAlert("Registration failed", "error");

        }

    });

}



// ================================
// LOGIN USER
// ================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const phone = document.getElementById("loginPhone").value;
        const password = document.getElementById("loginPassword").value;

        try {

            const response = await fetch(BASE_URL + "/api/users/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    phone,
                    password
                })

            });

            const data = await response.json();

            if (response.ok) {

                localStorage.setItem("token", data.token);
                localStorage.setItem("name", data.name);

                window.location.href = "dashboard.html";

            } else {

                showAlert(data.message, "error");

            }

        } catch (error) {

            showAlert("Login failed", "error");

        }

    });

}



// ================================
// CHECK LOGIN
// ================================
function requireLogin() {

    const token = localStorage.getItem("token");

    if (!token) {

        window.location.href = "index.html";
        return false;

    }

    return true;

}



// ================================
// GET WALLET BALANCE
// ================================
async function getBalance() {

    if (!requireLogin()) return;

    try {

        const response = await fetch(BASE_URL + "/api/users/balance", {

            headers: {
                Authorization: localStorage.getItem("token")
            }

        });

        const data = await response.json();

        const balanceElement = document.getElementById("balance");

        if (balanceElement) {

            balanceElement.innerText = "Balance: KES " + data.balance;

        }

    } catch (error) {

        showAlert("Failed to load balance", "error");

    }

}



// ================================
// DEPOSIT MONEY
// ================================
const depositForm = document.getElementById("depositForm");

if (depositForm) {

    depositForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const amount = document.getElementById("depositAmount").value;

        try {

            const response = await fetch(BASE_URL + "/api/deposit", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: localStorage.getItem("token")
                },

                body: JSON.stringify({
                    amount: Number(amount)
                })

            });

            const data = await response.json();

            if (response.ok) {

                showAlert(data.message, "success");

                document.getElementById("depositAmount").value = "";

                getBalance();
                getTransactions();

            } else {

                showAlert(data.message, "error");

            }

        } catch (error) {

            showAlert("Deposit failed", "error");

        }

    });

}



// ================================
// SEND MONEY
// ================================
const sendForm = document.getElementById("sendForm");

if (sendForm) {

    sendForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const receiverPhone = document.getElementById("receiverPhone").value;
        const amount = document.getElementById("sendAmount").value;

        try {

            const response = await fetch(BASE_URL + "/api/send", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: localStorage.getItem("token")
                },

                body: JSON.stringify({
                    receiverPhone,
                    amount: Number(amount)
                })

            });

            const data = await response.json();

            if (response.ok) {

                showAlert(data.message, "success");

                document.getElementById("receiverPhone").value = "";
                document.getElementById("sendAmount").value = "";

                getBalance();
                getTransactions();

            } else {

                showAlert(data.message, "error");

            }

        } catch (error) {

            showAlert("Transaction failed", "error");

        }

    });

}



// ================================
// GET TRANSACTIONS
// ================================
async function getTransactions() {

    if (!requireLogin()) return;

    try {

        const response = await fetch(BASE_URL + "/api/transactions", {

            headers: {
                Authorization: localStorage.getItem("token")
            }

        });

        const transactions = await response.json();

        const table = document.getElementById("transactionTable");

        if (!table) return;

        table.innerHTML = `
        <tr>
        <th>Sender</th>
        <th>Receiver</th>
        <th>Amount</th>
        <th>Date</th>
        </tr>
        `;

        transactions.forEach(tx => {

            const row = table.insertRow();

            row.insertCell(0).innerText = tx.senderPhone;
            row.insertCell(1).innerText = tx.receiverPhone;
            row.insertCell(2).innerText = "KES " + tx.amount;
            row.insertCell(3).innerText = new Date(tx.date).toLocaleString();

        });

    } catch (error) {

        showAlert("Failed to load transactions", "error");

    }

}



// ================================
// LOGOUT
// ================================
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        localStorage.removeItem("token");
        localStorage.removeItem("name");

        window.location.href = "index.html";

    });

}



// ================================
// INITIALIZE DASHBOARD
// ================================
if (document.getElementById("balance")) {

    getBalance();
    getTransactions();

}