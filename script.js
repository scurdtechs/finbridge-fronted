// FinBridge Client
// This script is used by index.html, register.html, and dashboard.html.

// Deployed backend base (frontend may be served from a different origin)
const API_BASE = "http://localhost:3000";

const token = localStorage.getItem("token");

function setMessage(el, msg, isError) {
  if (!el) return;
  el.textContent = msg || "";
  if (!msg) return;
  el.style.color = isError ? "#ffb3c1" : "#b6fff7";
}

async function api(path, options = {}, { auth = true, download = false } = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});

  if (auth) {
    const t = localStorage.getItem("token");
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!download) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
    return data;
  }

  // download: return blob/text
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  return text;
}

// ---------------- Logout ----------------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
  });
}

// ---------------- Login ----------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const loginMsg = document.getElementById("loginMsg");

    try {
      setMessage(loginMsg, "Logging in...", false);
      const data = await api("/api/users/login", { method: "POST", body: { phone, password } }, { auth: false });
      localStorage.setItem("token", data.token);
      window.location.href = "./dashboard.html";
    } catch (err) {
      setMessage(loginMsg, err.message || "Login failed", true);
    }
  });
}

// ---------------- Register ----------------
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const registerMsg = document.getElementById("registerMsg");

    try {
      setMessage(registerMsg, "Registering...", false);
      const body = { name, phone, password };
      if (email) body.email = email;
      const data = await api("/api/users/register", { method: "POST", body }, { auth: false });
      setMessage(registerMsg, data.message || "Registered. You can login now.", false);
      setTimeout(() => (window.location.href = "./index.html"), 800);
    } catch (err) {
      setMessage(registerMsg, err.message || "Register failed", true);
    }
  });
}

// ---------------- Forgot/Reset Password (console-token) ----------------
const forgotToggle = document.getElementById("forgotToggle");
const forgotSection = document.getElementById("forgotSection");
if (forgotToggle && forgotSection) {
  forgotToggle.addEventListener("click", () => {
    forgotSection.classList.toggle("hidden");
  });
}

const forgotBtn = document.getElementById("forgotBtn");
if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const forgotMsg = document.getElementById("forgotMsg");
    const forgotPhone = document.getElementById("forgotPhone").value.trim();
    const forgotEmail = document.getElementById("forgotEmail").value.trim();
    try {
      setMessage(forgotMsg, "Generating token (check server console)...", false);
      const body = {};
      if (forgotPhone) body.phone = forgotPhone;
      if (forgotEmail) body.email = forgotEmail;
      const data = await api("/api/users/forgot-password", { method: "POST", body }, { auth: false });
      setMessage(forgotMsg, data.message || "Token generated. Check server console.", false);
    } catch (err) {
      setMessage(forgotMsg, err.message || "Failed to generate token", true);
    }
  });
}

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const resetToken = document.getElementById("resetToken").value.trim();
    const newPassword = document.getElementById("newPassword").value;
    // We ask only token+newPassword; backend requires phone OR email too,
    // so we read whichever the user provided in the forgot section.
    const forgotPhone = document.getElementById("forgotPhone").value.trim();
    const forgotEmail = document.getElementById("forgotEmail").value.trim();
    const forgotMsg = document.getElementById("forgotMsg");

    try {
      if (!resetToken) throw new Error("Reset token is required");
      if (!newPassword) throw new Error("New password is required");
      const body = { token: resetToken, newPassword };
      if (forgotPhone) body.phone = forgotPhone;
      if (forgotEmail) body.email = forgotEmail;
      if (!body.phone && !body.email) throw new Error("Provide phone or email for reset");

      setMessage(forgotMsg, "Resetting password...", false);
      const data = await api("/api/users/reset-password", { method: "POST", body }, { auth: false });
      setMessage(forgotMsg, data.message || "Password updated. Please login.", false);
      setTimeout(() => (window.location.href = "./index.html"), 900);
    } catch (err) {
      setMessage(forgotMsg, err.message || "Reset failed", true);
    }
  });
}

// ---------------- Dashboard ----------------
const mainContent = document.getElementById("mainContent");
if (mainContent) {
  // Require auth for dashboard
  if (!localStorage.getItem("token")) {
    window.location.href = "./index.html";
  }

  const profileSummary = document.getElementById("profileSummary");
  const state = { profile: null, isAdmin: false };

  async function loadProfile() {
    const data = await api("/api/users/me", {}, { auth: true });
    state.profile = data;
    state.isAdmin = Boolean(data.isAdmin);
    profileSummary.textContent = `${data.name} (${data.phone})${state.isAdmin ? " • Admin" : ""}`;
  }

  function renderEmpty() {
    mainContent.innerHTML = `<div class="empty-state">Select a module from the left menu.</div>`;
  }

  function card(title, bodyHtml) {
    return `
      <div class="mini-card">
        <div class="section-title">${title}</div>
        ${bodyHtml}
      </div>
    `;
  }

  async function renderWallet() {
    const [bal, txs] = await Promise.all([
      api("/api/wallet/balance"),
      api("/api/wallet/transactions"),
    ]);

    mainContent.innerHTML = `
      <div class="section-title">Wallet</div>
      <div class="grid2">
        ${card("Balance", `<div class="row"><div class="item"><strong>KES ${bal.balance}</strong></div><div class="item"><strong>Points ${bal.points || 0}</strong></div></div>`)}
        ${card("Deposit", `
          <div class="row">
            <input id="depositAmount" type="number" min="1" placeholder="Amount" />
            <button id="depositBtn" class="btn btn-primary btn-inline">Deposit</button>
          </div>
          <div class="message" id="walletMsg"></div>
        `)}
      </div>
      <div class="grid2" style="margin-top:14px;">
        ${card("Send", `
          <div class="row">
            <input id="receiverPhone" type="text" placeholder="Receiver phone" />
            <input id="sendAmount" type="number" min="1" placeholder="Amount" />
            <button id="sendBtn" class="btn btn-secondary btn-inline">Send</button>
          </div>
          <div class="message" id="sendMsg"></div>
        `)}
        ${card("Split", `
          <div class="row">
            <input id="splitRecipients" type="text" placeholder="Recipients (comma separated phones)" />
            <input id="splitAmount" type="number" min="1" placeholder="Total amount" />
            <button id="splitBtn" class="btn btn-secondary btn-inline">Split</button>
          </div>
          <div class="message" id="splitMsg"></div>
        `)}
      </div>

      <div style="margin-top:14px;">
        ${card("Recent Transactions", `
          <div class="row" style="justify-content: space-between;">
            <div class="muted">Showing latest transactions</div>
            <button id="exportCsvBtn" class="btn btn-secondary btn-inline" style="width:auto;">Export CSV</button>
          </div>
          <div class="list" id="txList"></div>
        `)}
      </div>
    `;

    const txList = document.getElementById("txList");
    txs.transactions?.forEach((t) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<strong>${t.type}</strong> | ${t.senderPhone || ""} -> ${t.receiverPhone || ""} | KES ${t.amount} <div class="muted" style="margin-top:6px;">${new Date(t.date).toLocaleString()}</div>`;
      txList.appendChild(div);
    });

    document.getElementById("depositBtn").addEventListener("click", async () => {
      const walletMsg = document.getElementById("walletMsg");
      try {
        setMessage(walletMsg, "Depositing...", false);
        const amount = document.getElementById("depositAmount").value;
        const data = await api("/api/wallet/deposit", { method: "POST", body: { amount } });
        setMessage(walletMsg, data.message || "Deposit successful", false);
        await renderWallet();
      } catch (err) {
        setMessage(walletMsg, err.message || "Deposit failed", true);
      }
    });

    document.getElementById("sendBtn").addEventListener("click", async () => {
      const sendMsg = document.getElementById("sendMsg");
      try {
        setMessage(sendMsg, "Sending...", false);
        const receiverPhone = document.getElementById("receiverPhone").value.trim();
        const amount = document.getElementById("sendAmount").value;
        const data = await api("/api/wallet/send", { method: "POST", body: { receiverPhone, amount } });
        setMessage(sendMsg, data.message || "Send successful", false);
        await renderWallet();
      } catch (err) {
        setMessage(sendMsg, err.message || "Send failed", true);
      }
    });

    document.getElementById("splitBtn").addEventListener("click", async () => {
      const splitMsg = document.getElementById("splitMsg");
      try {
        setMessage(splitMsg, "Splitting...", false);
        const recipientsRaw = document.getElementById("splitRecipients").value.trim();
        const recipients = recipientsRaw ? recipientsRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
        const amount = document.getElementById("splitAmount").value;
        const data = await api("/api/wallet/split", { method: "POST", body: { recipients, amount } });
        setMessage(splitMsg, data.message || "Split successful", false);
        await renderWallet();
      } catch (err) {
        setMessage(splitMsg, err.message || "Split failed", true);
      }
    });

    document.getElementById("exportCsvBtn").addEventListener("click", async () => {
      try {
        // Export endpoint returns text/csv (and requires Authorization).
        const csvText = await api("/api/wallet/export-transactions", {}, { auth: true, download: true });
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finbridge-transactions.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(err.message || "CSV export failed");
      }
    });
  }

  async function renderLoans() {
    const { loans } = await api("/api/loans");
    mainContent.innerHTML = `
      <div class="section-title">Loans</div>
      <div class="grid2">
        ${card("Request Loan", `
          <div class="row">
            <input id="loanAmount" type="number" min="1" placeholder="Amount" />
            <input id="loanInterest" type="number" min="0" step="0.1" placeholder="Interest % (optional)" />
          </div>
          <div class="row">
            <input id="loanDueDate" type="date" placeholder="Due date (optional)" />
            <button id="requestLoanBtn" class="btn btn-primary btn-inline">Request</button>
          </div>
          <div class="message" id="loanReqMsg"></div>
        `)}
        ${card("My Loans", `
          <div class="message">${state.isAdmin ? "Admin controls enabled." : "Admin controls hidden."}</div>
          <div class="list" id="loansList"></div>
        `)}
      </div>
    `;

    const loansList = document.getElementById("loansList");
    loans.forEach((l) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div><strong>${l.status}</strong> | Amount KES ${l.amount} | Interest ${l.interest || 0}%</div>
        <div class="muted" style="margin-top:6px;">Due: ${l.dueDate ? new Date(l.dueDate).toLocaleDateString() : "-"}</div>
        <div class="muted" style="margin-top:6px;">Total to repay: KES ${l.totalToRepay || 0}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <input style="flex:1; min-width:120px;" type="number" min="1" class="repayAmount" placeholder="Repayment amount" data-loan="${l._id}" />
          <button class="btn btn-secondary btn-inline repayBtn" data-loan="${l._id}">Repay</button>
          ${state.isAdmin ? `<button class="btn btn-secondary btn-inline approveBtn" data-loan="${l._id}">Approve</button><button class="btn btn-secondary btn-inline declineBtn" data-loan="${l._id}">Decline</button>` : ""}
        </div>
        <div class="message repayMsg" id="repayMsg-${l._id}"></div>
      `;
      loansList.appendChild(div);
    });

    document.querySelectorAll(".repayBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const loanId = btn.getAttribute("data-loan");
        const input = document.querySelector(`.repayAmount[data-loan="${loanId}"]`);
        const msgEl = document.getElementById(`repayMsg-${loanId}`);
        try {
          setMessage(msgEl, "Recording repayment...", false);
          const amount = input.value;
          const data = await api(`/api/loans/${loanId}/repay`, { method: "POST", body: { amount } });
          setMessage(msgEl, data.message || "Repayment recorded", false);
          await renderLoans();
        } catch (err) {
          setMessage(msgEl, err.message || "Repay failed", true);
        }
      });
    });

    if (state.isAdmin) {
      document.querySelectorAll(".approveBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const loanId = btn.getAttribute("data-loan");
          try {
            await api(`/api/admin/loans/${loanId}/approve`, { method: "POST", body: {} });
            await renderLoans();
          } catch (err) {
            alert(err.message || "Approve failed");
          }
        });
      });
      document.querySelectorAll(".declineBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const loanId = btn.getAttribute("data-loan");
          try {
            await api(`/api/admin/loans/${loanId}/decline`, { method: "POST", body: {} });
            await renderLoans();
          } catch (err) {
            alert(err.message || "Decline failed");
          }
        });
      });
    }

    document.getElementById("requestLoanBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("loanReqMsg");
      try {
        setMessage(msgEl, "Requesting loan...", false);
        const amount = document.getElementById("loanAmount").value;
        const interest = document.getElementById("loanInterest").value;
        const dueDateRaw = document.getElementById("loanDueDate").value;
        const body = { amount };
        if (interest) body.interest = interest;
        if (dueDateRaw) body.dueDate = dueDateRaw;
        const data = await api("/api/loans/request", { method: "POST", body });
        setMessage(msgEl, data.message || "Loan requested", false);
        await renderLoans();
      } catch (err) {
        setMessage(msgEl, err.message || "Request failed", true);
      }
    });
  }

  async function renderStudy() {
    const { courses } = await api("/api/study/courses");
    mainContent.innerHTML = `
      <div class="section-title">FinStudy</div>
      <div class="grid2">
        ${card("Courses", `
          <div class="list" id="coursesList"></div>
        `)}
        ${card("Course Details", `
          <div class="muted">Select a course to view progress, forum, quizzes, and certificates.</div>
          <div style="margin-top:12px;" id="courseDetails"></div>
        `)}
      </div>
    `;

    const coursesList = document.getElementById("coursesList");
    courses.forEach((c) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div><strong>${c.title}</strong></div>
        <div class="muted" style="margin-top:6px;">${c.description || ""}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn btn-secondary btn-inline enrollBtn" data-id="${c._id}">Enroll</button>
          <button class="btn btn-primary btn-inline openBtn" data-id="${c._id}">Open</button>
        </div>
      `;
      coursesList.appendChild(div);
    });

    const courseDetails = document.getElementById("courseDetails");
    async function loadCourseDetails(courseId) {
      courseDetails.innerHTML = `<div class="message">Loading...</div>`;
      const [progress, offline, forum, certs, quizzesResp] = await Promise.all([
        api(`/api/study/progress/${courseId}`),
        api(`/api/study/courses/${courseId}/offline`),
        api(`/api/study/courses/${courseId}/forum/posts`),
        api(`/api/study/certificates/${courseId}`),
        api(`/api/study/courses/${courseId}/quizzes`),
      ]);

      const quizzesHtml = (quizzesResp.quizzes || [])
        .map((q) => `<option value="${q.title}">${q.title}</option>`)
        .join("");

      courseDetails.innerHTML = `
        <div class="mini-card" style="background: rgba(0,0,0,0.22); border-radius:16px; border: 1px solid rgba(255,255,255,0.12); padding:12px;">
          <div class="muted">Progress</div>
          <div style="margin-top:6px;" class="item">
            ${progress.enrollment ? `Completed: ${progress.enrollment.completedLessons} / ${progress.enrollment.totalLessons}` : "Not enrolled yet."}
          </div>
          <div style="margin-top:12px;">
            <div class="muted">Offline content</div>
            <div class="list" style="margin-top:8px;">
              ${(offline.offlineContent || []).map((x) => `<div class="item">${x}</div>`).join("") || "<div class='muted'>None</div>"}
            </div>
          </div>
          <div style="margin-top:12px;">
            <div class="muted">Certificates</div>
            <div class="item" style="margin-top:8px;">
              ${certs.certificate ? `Issued: ${new Date(certs.certificate.issuedDate).toLocaleString()}` : "No certificate yet."}
            </div>
          </div>
          <div style="margin-top:12px;">
            <div class="muted">Quizzes</div>
            <div class="row" style="margin-top:8px;">
              <input id="quizSelect" list="quizList" placeholder="Select quiz..." />
              <datalist id="quizList">
                ${quizzesHtml}
              </datalist>
            </div>
            <div class="muted" style="margin-top:10px;">To take a quiz, you will be asked to submit answers. (Client shows questions & options.)</div>
            <div style="margin-top:10px;">
              <button class="btn btn-secondary btn-inline" id="loadQuizBtn">Load Quiz</button>
              <div class="message" id="quizMsg"></div>
              <div id="quizRender" style="margin-top:10px;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top:14px;" class="mini-card">
          <div class="muted">Forum posts</div>
          <div class="list" id="forumList" style="margin-top:10px;"></div>
          <div style="margin-top:12px;">
            <input id="forumContent" type="text" placeholder="Write a post..." />
            <input id="forumMedia" type="text" placeholder="Media URLs (comma separated, optional)" />
            <button class="btn btn-primary btn-inline" id="postForumBtn">Post</button>
          </div>
        </div>
      `;

      const forumList = document.getElementById("forumList");
      (forum.posts || []).slice(0, 30).forEach((p) => {
        const item = document.createElement("div");
        item.className = "item";
        item.innerHTML = `<strong>Post</strong><div class="muted" style="margin-top:6px;">${p.content}</div><div class="muted" style="margin-top:6px;">${new Date(p.createdAt).toLocaleString()}</div>`;
        forumList.appendChild(item);
      });

      document.getElementById("postForumBtn").addEventListener("click", async () => {
        try {
          const content = document.getElementById("forumContent").value.trim();
          const mediaRaw = document.getElementById("forumMedia").value.trim();
          if (!content) throw new Error("Content is required");
          const media = mediaRaw ? mediaRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
          await api(`/api/study/courses/${courseId}/forum/posts`, { method: "POST", body: { content, media } });
          await loadCourseDetails(courseId);
        } catch (err) {
          alert(err.message || "Posting failed");
        }
      });

      // quiz rendering requires quizzes array; store locally
      const quizzes = quizzesResp.quizzes || [];
      let selectedQuizId = null;

      document.getElementById("loadQuizBtn").addEventListener("click", async () => {
        const quizMsg = document.getElementById("quizMsg");
        const selectInput = document.getElementById("quizSelect").value.trim();
        if (!selectInput) {
          setMessage(quizMsg, "Choose a quiz", true);
          return;
        }
        const quiz = quizzes.find((q) => String(q.title) === selectInput) || quizzes[0];
        if (!quiz) {
          setMessage(quizMsg, "Quiz not found", true);
          return;
        }
        selectedQuizId = quiz._id;
        setMessage(quizMsg, "Rendering quiz...", false);

        // Render questions & radio selections
        const render = document.getElementById("quizRender");
        render.innerHTML = `
          <div class="item">
            <div><strong>${quiz.title}</strong></div>
            <div class="muted" style="margin-top:6px;">Answer each question by selecting the correct option text.</div>
          </div>
          <div style="margin-top:10px; display:grid; gap:12px;">
            ${quiz.questions
              .map((qq, i) => {
                const options = (qq.options || [])
                  .map((opt, j) => {
                    return `<label style="display:flex; gap:8px; margin:6px 0;"><input type="radio" name="q-${i}" value="${String(opt).replace(/"/g, "&quot;")}" /> ${opt}</label>`;
                  })
                  .join("");
                return `<div class="mini-card" style="background: rgba(0,0,0,0.22);"><div class="muted">Q${i + 1}: ${qq.question}</div>${options}</div>`;
              })
              .join("")}
          </div>
          <div style="margin-top:12px;">
            <button class="btn btn-primary btn-inline" id="submitQuizBtn">Submit Quiz</button>
          </div>
        `;

        document.getElementById("submitQuizBtn").addEventListener("click", async () => {
          try {
            const answers = [];
            for (let i = 0; i < quiz.questions.length; i++) {
              const checked = document.querySelector(`input[name="q-${i}"]:checked`);
              if (!checked) throw new Error(`Please answer question ${i + 1}`);
              answers.push(checked.value);
            }
            const res = await api(`/api/study/quizzes/${selectedQuizId}/submit`, { method: "POST", body: { answers } });
            setMessage(quizMsg, `Submitted. Score: ${res.score}`, false);
            await loadCourseDetails(courseId);
          } catch (err) {
            setMessage(quizMsg, err.message || "Quiz submission failed", true);
          }
        });
      });
    }

    document.querySelectorAll(".openBtn").forEach((b) => b.addEventListener("click", async () => loadCourseDetails(b.dataset.id)));
    document.querySelectorAll(".enrollBtn").forEach((b) => {
      b.addEventListener("click", async () => {
        try {
          await api(`/api/study/enroll/${b.dataset.id}`, { method: "POST", body: {} });
          await renderStudy();
        } catch (err) {
          alert(err.message || "Enroll failed");
        }
      });
    });
  }

  async function renderLibrary() {
    const { materials } = await api("/api/library/materials");
    mainContent.innerHTML = `
      <div class="section-title">FinLibrary</div>
      <div class="grid2">
        ${card("Materials", `
          <div class="row">
            <input id="searchQ" type="text" placeholder="Search (q)" />
            <input id="searchCategory" type="text" placeholder="Category (optional)" />
            <button class="btn btn-secondary btn-inline" id="searchBtn" style="width:auto;">Search</button>
          </div>
          <div class="list" id="materialsList"></div>
        `)}
        ${card("My Bookmarks", `
          <button class="btn btn-secondary btn-inline" id="loadBookmarksBtn" style="width:auto;">Load Bookmarks</button>
          <div class="list" id="bookmarksList"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        <div class="muted">Rate/Bookmark</div>
        <div class="message" id="libMsg"></div>
      </div>
    `;

    const materialsList = document.getElementById("materialsList");
    function renderMaterials(list) {
      materialsList.innerHTML = "";
      list.forEach((m) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div><strong>${m.title}</strong> <span class="muted">(${m.subject || ""})</span></div>
          <div class="muted" style="margin-top:6px;">Category: ${m.category || ""} • Offline: ${m.offlineAvailable ? "Yes" : "No"}</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <a class="btn btn-secondary btn-inline" href="${m.url}" target="_blank" style="width:auto;">Open</a>
            <input type="number" min="1" max="5" id="rate-${m._id}" placeholder="Rate 1-5" style="width:140px;" />
            <button class="btn btn-secondary btn-inline" data-rate="${m._id}" style="width:auto;">Rate</button>
            <button class="btn btn-secondary btn-inline" data-bm="${m._id}" style="width:auto;">Bookmark</button>
            ${state.isAdmin ? `<button class="btn btn-secondary btn-inline" data-offline="${m._id}" style="width:auto;">Offline URL</button>` : `<button class="btn btn-secondary btn-inline" data-offline="${m._id}" style="width:auto;">Offline URL</button>`}
          </div>
        `;
        materialsList.appendChild(el);
      });
    }
    renderMaterials(materials || []);

    function bindMaterialActions() {
      document.querySelectorAll("[data-rate]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const id = btn.getAttribute("data-rate");
            const rating = document.getElementById(`rate-${id}`).value;
            await api(`/api/library/materials/${id}/rate`, { method: "POST", body: { rating } });
            await renderLibrary();
          } catch (err) {
            alert(err.message || "Rate failed");
          }
        });
      });

      document.querySelectorAll("[data-bm]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const id = btn.getAttribute("data-bm");
            await api(`/api/library/materials/${id}/bookmark`, { method: "POST", body: {} });
            await renderLibrary();
          } catch (err) {
            alert(err.message || "Bookmark failed");
          }
        });
      });

      document.querySelectorAll("[data-offline]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const id = btn.getAttribute("data-offline");
            const data = await api(`/api/library/materials/${id}/offline`);
            alert(data.offlineAvailable ? `Offline URL: ${data.url}` : "Offline not available");
          } catch (err) {
            alert(err.message || "Offline lookup failed");
          }
        });
      });
    }

    bindMaterialActions();

    document.getElementById("searchBtn").addEventListener("click", async () => {
      try {
        const q = document.getElementById("searchQ").value.trim();
        const category = document.getElementById("searchCategory").value.trim();
        const url = `/api/library/materials/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`;
        const data = await api(url);
        renderMaterials(data.materials || []);
        bindMaterialActions();
      } catch (err) {
        alert(err.message || "Search failed");
      }
    });

    document.getElementById("loadBookmarksBtn").addEventListener("click", async () => {
      try {
        const { materials: bms } = await api("/api/library/bookmarks");
        const list = document.getElementById("bookmarksList");
        list.innerHTML = "";
        bms.forEach((m) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>${m.title}</strong>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Load bookmarks failed");
      }
    });

    // rate/bookmark/offline handlers are bound by bindMaterialActions()

    // Admin upload area
    if (state.isAdmin) {
      mainContent.innerHTML += `
        <div style="margin-top:14px;">${card("Admin Upload Material", `
          <div class="row">
            <input id="upTitle" type="text" placeholder="Title" />
            <input id="upSubject" type="text" placeholder="Subject" />
          </div>
          <div class="row">
            <input id="upUrl" type="text" placeholder="PDF URL" />
            <input id="upCategory" type="text" placeholder="Category" />
          </div>
          <div class="row">
            <input id="upOffline" type="text" placeholder="Offline available (true/false)" />
            <button class="btn btn-primary btn-inline" id="uploadBtn" style="width:auto;">Upload</button>
          </div>
          <div class="message" id="uploadMsg"></div>
        `)}</div>
      `;
      document.getElementById("uploadBtn").addEventListener("click", async () => {
        const uploadMsg = document.getElementById("uploadMsg");
        try {
          setMessage(uploadMsg, "Uploading...", false);
          const title = document.getElementById("upTitle").value.trim();
          const subject = document.getElementById("upSubject").value.trim();
          const url = document.getElementById("upUrl").value.trim();
          const category = document.getElementById("upCategory").value.trim();
          const offlineAvailable = document.getElementById("upOffline").value.trim();
          await api("/api/library/materials/admin/upload", {
            method: "POST",
            body: { title, subject, url, category, offlineAvailable },
          });
          setMessage(uploadMsg, "Uploaded", false);
          await renderLibrary();
        } catch (err) {
          setMessage(uploadMsg, err.message || "Upload failed", true);
        }
      });
    }
  }

  async function renderMarket() {
    const { items } = await api("/api/market/items");
    mainContent.innerHTML = `
      <div class="section-title">FinMarket</div>
      <div class="grid2">
        ${card("Marketplace", `
          <div class="list" id="marketList"></div>
        `)}
        ${card("Wishlist", `
          <button class="btn btn-secondary btn-inline" id="loadWishlistBtn" style="width:auto;">Load Wishlist</button>
          <div class="list" id="wishlistList"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Add Item (Sell)", `
          <div class="row">
            <input id="sellTitle" type="text" placeholder="Title" />
            <input id="sellPrice" type="number" min="0" placeholder="Price" />
          </div>
          <div class="row">
            <input id="sellCategory" type="text" placeholder="Category" />
            <input id="sellImages" type="text" placeholder="Image URLs (comma separated, optional)" />
          </div>
          <input id="sellDesc" type="text" placeholder="Description" />
          <button class="btn btn-primary btn-inline" id="addItemBtn" style="width:auto;">Add Item</button>
          <div class="message" id="marketMsg"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Chat", `
          <div class="row">
            <input id="chatOtherUserId" type="text" placeholder="Other user id (ObjectId) for chat" />
            <button class="btn btn-secondary btn-inline" id="loadChatBtn" style="width:auto;">Load Messages</button>
          </div>
          <div class="list" id="chatList" style="margin-top:10px;"></div>
          <div class="row">
            <input id="chatContent" type="text" placeholder="Message..." />
            <button class="btn btn-primary btn-inline" id="sendChatBtn" style="width:auto;">Send</button>
          </div>
          <div class="message" id="chatMsg"></div>
        `)}
      </div>
    `;

    const marketList = document.getElementById("marketList");
    const chatList = document.getElementById("chatList");

    items.forEach((i) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${i.title}</strong> <span class="muted">(${i.category || "uncategorized"})</span></div>
        <div class="muted" style="margin-top:6px;">KES ${i.price} • Owner: ${i.owner || ""}</div>
        <div class="muted" style="margin-top:6px;">${i.description || ""}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn btn-primary btn-inline" data-buy="${i._id}" style="width:auto;">Buy</button>
          <button class="btn btn-secondary btn-inline" data-wish="${i._id}" style="width:auto;">Wishlist</button>
          <button class="btn btn-secondary btn-inline" data-chat="${i._id}" data-other="${i.owner}" style="width:auto;">Chat</button>
        </div>
      `;
      marketList.appendChild(el);
    });

    let currentChatItemId = null;
    document.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/market/items/${btn.getAttribute("data-buy")}/buy`, { method: "POST", body: {} });
          await renderMarket();
        } catch (err) {
          alert(err.message || "Buy failed");
        }
      });
    });

    document.querySelectorAll("[data-wish]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/market/wishlist/${btn.getAttribute("data-wish")}`, { method: "POST", body: {} });
          await renderMarket();
        } catch (err) {
          alert(err.message || "Wishlist failed");
        }
      });
    });

    document.querySelectorAll("[data-chat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentChatItemId = btn.getAttribute("data-chat");
        const otherUserId = btn.getAttribute("data-other");
        document.getElementById("chatOtherUserId").value = otherUserId || "";
      });
    });

    document.getElementById("loadWishlistBtn").addEventListener("click", async () => {
      try {
        const { items: wish } = await api("/api/market/wishlist");
        const list = document.getElementById("wishlistList");
        list.innerHTML = "";
        wish.forEach((m) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>${m.title}</strong> • KES ${m.price}`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Load wishlist failed");
      }
    });

    document.getElementById("addItemBtn").addEventListener("click", async () => {
      const msg = document.getElementById("marketMsg");
      try {
        setMessage(msg, "Adding item...", false);
        const title = document.getElementById("sellTitle").value.trim();
        const price = document.getElementById("sellPrice").value;
        const category = document.getElementById("sellCategory").value.trim();
        const description = document.getElementById("sellDesc").value.trim();
        const imagesRaw = document.getElementById("sellImages").value.trim();
        const images = imagesRaw ? imagesRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
        await api("/api/market/items", { method: "POST", body: { title, price, category, description, images } });
        setMessage(msg, "Item added", false);
        await renderMarket();
      } catch (err) {
        setMessage(msg, err.message || "Add failed", true);
      }
    });

    document.getElementById("loadChatBtn").addEventListener("click", async () => {
      const otherUserId = document.getElementById("chatOtherUserId").value.trim();
      if (!otherUserId) return alert("Enter other user id");
      try {
        const data = await api(`/api/market/chats?otherUserId=${encodeURIComponent(otherUserId)}`);
        chatList.innerHTML = "";
        (data.messages || []).forEach((m) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<div><strong>${m.senderId}</strong></div><div class="muted" style="margin-top:6px;">${m.content}</div><div class="muted" style="margin-top:6px;">${new Date(m.createdAt).toLocaleString()}</div>`;
          chatList.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Load chat failed");
      }
    });

    document.getElementById("sendChatBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("chatMsg");
      const otherUserId = document.getElementById("chatOtherUserId").value.trim();
      const content = document.getElementById("chatContent").value.trim();
      try {
        if (!currentChatItemId) throw new Error("Select a Chat item first");
        if (!otherUserId) throw new Error("Enter other user id");
        if (!content) throw new Error("Message is required");
        setMessage(msgEl, "Sending...", false);
        await api(`/api/market/items/${currentChatItemId}/chat`, { method: "POST", body: { content } });
        setMessage(msgEl, "Sent", false);
        document.getElementById("loadChatBtn").click();
      } catch (err) {
        setMessage(msgEl, err.message || "Send failed", true);
      }
    });
  }

  async function renderGram() {
    const postsData = await api("/api/social/posts");
    mainContent.innerHTML = `
      <div class="section-title">FinGram</div>
      <div class="grid2">
        ${card("Create Post", `
          <input id="postContent" type="text" placeholder="Write something..." />
          <input id="postMedia" type="text" placeholder="Media URLs comma separated (optional)" />
          <input id="postHashtags" type="text" placeholder="Hashtags comma separated (optional)" />
          <div class="row" style="margin-top:10px;">
            <button class="btn btn-primary btn-inline" id="createPostBtn" style="width:auto;">Post</button>
          </div>
          <div class="message" id="gramMsg"></div>
        `)}
        ${card("Posts", `
          <div class="row">
            <input id="hashtagFilter" type="text" placeholder="Filter by hashtag (optional, e.g. study)" />
            <button id="filterBtn" class="btn btn-secondary btn-inline" style="width:auto;">Filter</button>
          </div>
          <div class="list" id="postsList" style="margin-top:10px;"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Stories", `
          <button class="btn btn-secondary btn-inline" id="loadStoriesBtn" style="width:auto;">Load Stories</button>
          <div class="list" id="storiesList" style="margin-top:10px;"></div>
        `)}
      </div>
    `;

    const postsList = document.getElementById("postsList");
    function renderPosts(posts) {
      postsList.innerHTML = "";
      (posts || []).forEach((p) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div><strong>${p.userId}</strong></div>
          <div class="muted" style="margin-top:6px;">${p.content || ""}</div>
          <div class="muted" style="margin-top:6px;">Likes: ${p.likes?.length || 0} • Hashtags: ${(p.hashtags || []).map((h) => `#${h}`).join(" ")}</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn btn-secondary btn-inline likeBtn" data-id="${p._id}" style="width:auto;">Like</button>
            <input class="commentInput" type="text" placeholder="Comment..." style="min-width:160px;" />
            <button class="btn btn-secondary btn-inline commentBtn" data-id="${p._id}" style="width:auto;">Comment</button>
            <input class="followInput" type="text" placeholder="Follow userId (optional)" style="min-width:160px;" />
            <button class="btn btn-secondary btn-inline followBtn" data-target="${p.userId}" style="width:auto;">Follow/Unfollow</button>
          </div>
          <div class="muted" style="margin-top:8px;">${new Date(p.createdAt).toLocaleString()}</div>
        `;
        postsList.appendChild(el);
      });
    }

    renderPosts(postsData.posts || []);

    document.getElementById("createPostBtn").addEventListener("click", async () => {
      const msg = document.getElementById("gramMsg");
      try {
        const content = document.getElementById("postContent").value.trim();
        const mediaRaw = document.getElementById("postMedia").value.trim();
        const hashtagsRaw = document.getElementById("postHashtags").value.trim();
        if (!content) throw new Error("Content is required");
        const media = mediaRaw ? mediaRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
        const hashtags = hashtagsRaw ? hashtagsRaw.split(",").map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/^#/, "")) : [];
        setMessage(msg, "Posting...", false);
        await api("/api/social/posts", { method: "POST", body: { content, media, hashtags } });
        setMessage(msg, "Posted", false);
        await renderGram();
      } catch (err) {
        setMessage(msg, err.message || "Post failed", true);
      }
    });

    document.getElementById("filterBtn").addEventListener("click", async () => {
      try {
        const tag = document.getElementById("hashtagFilter").value.trim();
        const url = tag ? `/api/social/posts?hashtag=${encodeURIComponent(tag.replace(/^#/, ""))}` : "/api/social/posts";
        const data = await api(url);
        renderPosts(data.posts || []);
      } catch (err) {
        alert(err.message || "Filter failed");
      }
    });

    document.querySelectorAll(".likeBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/social/posts/${btn.getAttribute("data-id")}/like`, { method: "POST", body: {} });
          await renderGram();
        } catch (err) {
          alert(err.message || "Like failed");
        }
      });
    });

    document.querySelectorAll(".commentBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-id");
          const input = btn.parentElement.querySelector(".commentInput");
          const comment = input.value.trim();
          if (!comment) throw new Error("Comment is required");
          await api(`/api/social/posts/${id}/comment`, { method: "POST", body: { comment } });
          await renderGram();
        } catch (err) {
          alert(err.message || "Comment failed");
        }
      });
    });

    document.querySelectorAll(".followBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const targetUserId = btn.getAttribute("data-target");
          await api(`/api/social/follow/${encodeURIComponent(targetUserId)}`, { method: "POST", body: {} });
          await renderGram();
        } catch (err) {
          alert(err.message || "Follow failed");
        }
      });
    });

    document.getElementById("loadStoriesBtn").addEventListener("click", async () => {
      try {
        const data = await api("/api/social/stories");
        const list = document.getElementById("storiesList");
        list.innerHTML = "";
        (data.stories || []).forEach((s) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>Story</strong><div class="muted" style="margin-top:6px;">${s.userId}: ${s.content || ""}</div>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Load stories failed");
      }
    });
  }

  async function renderEvents() {
    const { events } = await api("/api/events");
    mainContent.innerHTML = `
      <div class="section-title">Events</div>
      <div class="grid2">
        ${card("Create Event", `
          <input id="evTitle" type="text" placeholder="Title" />
          <input id="evDescription" type="text" placeholder="Description" />
          <div class="row">
            <input id="evDate" type="date" placeholder="Date" />
            <input id="evLocation" type="text" placeholder="Location" />
          </div>
          <div class="row">
            <input id="evFee" type="number" min="0" placeholder="Fee (optional)" />
            <input id="evAR" type="text" placeholder="ARavailable (true/false, optional)" />
          </div>
          <button class="btn btn-primary btn-inline" id="createEvBtn" style="width:auto;">Create</button>
          <div class="message" id="evMsg"></div>
        `)}
        ${card("Event List", `
          <div class="list" id="eventsList"></div>
        `)}
      </div>
    `;

    const list = document.getElementById("eventsList");
    (events || []).forEach((e) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${e.title}</strong></div>
        <div class="muted" style="margin-top:6px;">${e.description || ""}</div>
        <div class="muted" style="margin-top:6px;">Date: ${new Date(e.date).toLocaleString()} • Fee: ${e.fee || 0}</div>
        <div class="muted" style="margin-top:6px;">Location: ${e.location || ""} • AR: ${e.ARavailable ? "Yes" : "No"}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn btn-secondary btn-inline rsvpBtn" data-id="${e._id}" style="width:auto;">RSVP</button>
          <button class="btn btn-primary btn-inline payBtn" data-id="${e._id}" style="width:auto;">Pay Ticket</button>
        </div>
      `;
      list.appendChild(el);
    });

    document.querySelectorAll(".rsvpBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/events/${btn.getAttribute("data-id")}/rsvp`, { method: "POST", body: {} });
          await renderEvents();
        } catch (err) {
          alert(err.message || "RSVP failed");
        }
      });
    });
    document.querySelectorAll(".payBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/events/${btn.getAttribute("data-id")}/ticket-pay`, { method: "POST", body: {} });
          await renderEvents();
        } catch (err) {
          alert(err.message || "Payment failed");
        }
      });
    });

    document.getElementById("createEvBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("evMsg");
      try {
        const title = document.getElementById("evTitle").value.trim();
        const description = document.getElementById("evDescription").value.trim();
        const date = document.getElementById("evDate").value;
        const location = document.getElementById("evLocation").value.trim();
        const fee = document.getElementById("evFee").value;
        const ARavailableRaw = document.getElementById("evAR").value.trim();
        if (!title || !date) throw new Error("title and date are required");
        setMessage(msgEl, "Creating event...", false);
        const body = { title, description, date, location, fee: fee ? Number(fee) : 0 };
        if (ARavailableRaw) body.ARavailable = ARavailableRaw === "true" || ARavailableRaw === "1" || ARavailableRaw === "yes";
        await api("/api/events", { method: "POST", body });
        setMessage(msgEl, "Event created", false);
        await renderEvents();
      } catch (err) {
        setMessage(msgEl, err.message || "Create failed", true);
      }
    });
  }

  async function renderHealth() {
    mainContent.innerHTML = `
      <div class="section-title">Health</div>
      <div class="grid2">
        ${card("Log Mood", `
          <div class="row">
            <input id="moodVal" type="text" placeholder="Mood (e.g. happy)" />
            <input id="moodDate" type="date" />
          </div>
          <input id="moodNotes" type="text" placeholder="Notes (optional)" />
          <button class="btn btn-primary btn-inline" id="moodBtn" style="width:auto;">Save Mood</button>
          <div class="message" id="moodMsg"></div>
        `)}
        ${card("Log Fitness", `
          <div class="row">
            <input id="fitSteps" type="number" min="0" placeholder="Steps" />
            <input id="fitCalories" type="number" min="0" placeholder="Calories" />
          </div>
          <input id="fitMinutes" type="number" min="0" placeholder="Duration minutes" />
          <input id="fitNotes" type="text" placeholder="Notes (optional)" />
          <button class="btn btn-secondary btn-inline" id="fitBtn" style="width:auto;">Save Fitness</button>
          <div class="message" id="fitMsg"></div>
        `)}
      </div>
      <div class="grid2" style="margin-top:14px;">
        ${card("Habits", `
          <input id="habitTask" type="text" placeholder="Habit task" />
          <input id="habitProgress" type="number" min="0" max="100" placeholder="Progress 0-100" />
          <input id="habitRemindAt" type="datetime-local" placeholder="Remind at (optional)" />
          <button class="btn btn-primary btn-inline" id="habitCreateBtn" style="width:auto;">Add Habit</button>
          <div class="message" id="habitMsg"></div>
          <div class="list" id="habitsList" style="margin-top:10px;"></div>
        `)}
        ${card("Reminders", `
          <input id="remTask" type="text" placeholder="Reminder task" />
          <input id="remAt" type="datetime-local" placeholder="Remind at" />
          <input id="remMsgBody" type="text" placeholder="Message (optional)" />
          <button class="btn btn-secondary btn-inline" id="remCreateBtn" style="width:auto;">Create Reminder</button>
          <div class="list" id="remindersList" style="margin-top:10px;"></div>
        `)}
      </div>
    `;

    async function loadHabits() {
      const { habits } = await api("/api/health/habits");
      const list = document.getElementById("habitsList");
      list.innerHTML = "";
      (habits || []).forEach((h) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div><strong>${h.task}</strong></div>
          <div class="muted" style="margin-top:6px;">Progress: ${h.progress}</div>
          <div class="row" style="margin-top:10px;">
            <input type="number" min="0" max="100" class="habitProgInput" data-id="${h._id}" value="${h.progress || 0}" />
            <button class="btn btn-secondary btn-inline habitSaveBtn" data-id="${h._id}" style="width:auto;">Update</button>
          </div>
        `;
        list.appendChild(el);
      });
      document.querySelectorAll(".habitSaveBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const input = document.querySelector(`.habitProgInput[data-id="${id}"]`);
          try {
            await api(`/api/health/habits/${id}/progress`, { method: "PUT", body: { progress: input.value } });
            await loadHabits();
          } catch (err) {
            alert(err.message || "Update failed");
          }
        });
      });
    }

    async function loadReminders() {
      const { reminders } = await api("/api/health/reminders");
      const list = document.getElementById("remindersList");
      list.innerHTML = "";
      (reminders || []).forEach((r) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div><strong>${r.task}</strong></div>
          <div class="muted" style="margin-top:6px;">${new Date(r.remindAt).toLocaleString()}</div>
          <div class="muted" style="margin-top:6px;">${r.delivered ? "Delivered" : "Pending"}</div>
          ${r.delivered ? "" : `<button class="btn btn-primary btn-inline" style="width:auto; margin-top:10px;" data-id="${r._id}">Mark Delivered</button>`}
        `;
        list.appendChild(el);
      });
      document.querySelectorAll("button[data-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await api(`/api/health/reminders/${btn.getAttribute("data-id")}/mark-delivered`, { method: "POST", body: {} });
            await loadReminders();
          } catch (err) {
            alert(err.message || "Update reminder failed");
          }
        });
      });
    }

    loadHabits();
    loadReminders();

    document.getElementById("moodBtn").addEventListener("click", async () => {
      const msg = document.getElementById("moodMsg");
      try {
        const mood = document.getElementById("moodVal").value.trim();
        const dateRaw = document.getElementById("moodDate").value;
        const notes = document.getElementById("moodNotes").value.trim();
        if (!mood) throw new Error("mood is required");
        await api("/api/health/moodlogs", { method: "POST", body: { mood, date: dateRaw, notes } });
        setMessage(msg, "Mood saved", false);
        document.getElementById("moodVal").value = "";
      } catch (err) {
        setMessage(msg, err.message || "Failed to save mood", true);
      }
    });

    document.getElementById("fitBtn").addEventListener("click", async () => {
      const msg = document.getElementById("fitMsg");
      try {
        const steps = document.getElementById("fitSteps").value;
        const calories = document.getElementById("fitCalories").value;
        const durationMinutes = document.getElementById("fitMinutes").value;
        const notes = document.getElementById("fitNotes").value.trim();
        await api("/api/health/fitness", { method: "POST", body: { steps, calories, durationMinutes, notes } });
        setMessage(msg, "Fitness saved", false);
        document.getElementById("fitNotes").value = "";
      } catch (err) {
        setMessage(msg, err.message || "Failed to save fitness", true);
      }
    });

    document.getElementById("habitCreateBtn").addEventListener("click", async () => {
      const msg = document.getElementById("habitMsg");
      try {
        const task = document.getElementById("habitTask").value.trim();
        const progress = document.getElementById("habitProgress").value;
        const remindAt = document.getElementById("habitRemindAt").value;
        if (!task) throw new Error("Habit task is required");
        await api("/api/health/habits", { method: "POST", body: { task, progress, remindAt: remindAt || undefined } });
        setMessage(msg, "Habit added", false);
        document.getElementById("habitTask").value = "";
        await loadHabits();
      } catch (err) {
        setMessage(msg, err.message || "Failed to add habit", true);
      }
    });

    document.getElementById("remCreateBtn").addEventListener("click", async () => {
      const task = document.getElementById("remTask").value.trim();
      const remindAt = document.getElementById("remAt").value;
      const message = document.getElementById("remMsgBody").value.trim();
      try {
        if (!task || !remindAt) throw new Error("task and remindAt are required");
        await api("/api/health/reminders", { method: "POST", body: { task, remindAt, message } });
        await loadReminders();
      } catch (err) {
        alert(err.message || "Create reminder failed");
      }
    });
  }

  async function renderMentorship() {
    const { mentors } = await api("/api/mentorship/mentors");
    const { requests } = await api("/api/mentorship/requests/mine");
    mainContent.innerHTML = `
      <div class="section-title">Mentorship</div>
      <div class="grid2">
        ${card("Mentors", `
          <div class="list" id="mentorList"></div>
        `)}
        ${card("My Requests", `
          <div class="list" id="requestList"></div>
          <div style="margin-top:12px;" class="muted">Select a request ID to view/send messages.</div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Messages", `
          <div class="row">
            <input id="activeRequestId" type="text" placeholder="requestId (ObjectId)" />
            <button class="btn btn-secondary btn-inline" id="loadMessagesBtn" style="width:auto;">Load</button>
          </div>
          <div class="list" id="messagesList" style="margin-top:10px;"></div>
          <div class="row">
            <input id="msgContent" type="text" placeholder="Message content..." />
            <button class="btn btn-primary btn-inline" id="sendMsgBtn" style="width:auto;">Send</button>
          </div>
        `)}
      </div>
    `;

    const mentorList = document.getElementById("mentorList");
    mentors.forEach((m) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${m.name}</strong></div>
        <div class="muted" style="margin-top:6px;">Expertise: ${(m.expertise || []).join(", ")}</div>
        <div class="muted" style="margin-top:6px;">Contact: ${m.contact || ""}</div>
        <button class="btn btn-primary btn-inline" data-mentor="${m._id}" style="width:auto; margin-top:10px;">Request Chat</button>
      `;
      mentorList.appendChild(el);
    });

    document.querySelectorAll("[data-mentor]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/mentorship/requests/${btn.getAttribute("data-mentor")}/request-chat`, { method: "POST", body: {} });
          await renderMentorship();
        } catch (err) {
          alert(err.message || "Request failed");
        }
      });
    });

    const requestList = document.getElementById("requestList");
    requests.forEach((r) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${r.status}</strong></div>
        <div class="muted" style="margin-top:6px;">mentorId: ${r.mentorId}</div>
        <div class="muted" style="margin-top:6px;">scheduledAt: ${r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : "-"}</div>
        <div class="row" style="margin-top:10px;">
          <input type="datetime-local" class="schedInput" placeholder="Schedule at" />
          <button class="btn btn-secondary btn-inline schedBtn" style="width:auto;" data-req="${r._id}">Schedule</button>
          <button class="btn btn-secondary btn-inline useBtn" style="width:auto;" data-req="${r._id}">Use</button>
        </div>
      `;
      requestList.appendChild(el);
    });

    document.querySelectorAll(".useBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("activeRequestId").value = btn.getAttribute("data-req");
        document.getElementById("loadMessagesBtn").click();
      });
    });

    document.querySelectorAll(".schedBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const reqId = btn.getAttribute("data-req");
          const schedInput = btn.parentElement.querySelector(".schedInput");
          if (!schedInput.value) throw new Error("scheduledAt is required");
          await api(`/api/mentorship/requests/${reqId}/schedule`, { method: "POST", body: { scheduledAt: schedInput.value } });
          await renderMentorship();
        } catch (err) {
          alert(err.message || "Scheduling failed");
        }
      });
    });

    document.getElementById("loadMessagesBtn").addEventListener("click", async () => {
      const reqId = document.getElementById("activeRequestId").value.trim();
      if (!reqId) return alert("Enter requestId");
      try {
        const data = await api(`/api/mentorship/requests/${reqId}/messages`);
        const list = document.getElementById("messagesList");
        list.innerHTML = "";
        (data.messages || []).forEach((m) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<div><strong>${m.senderId}</strong></div><div class="muted" style="margin-top:6px;">${m.content}</div><div class="muted" style="margin-top:6px;">${new Date(m.createdAt).toLocaleString()}</div>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Load messages failed");
      }
    });

    document.getElementById("sendMsgBtn").addEventListener("click", async () => {
      const reqId = document.getElementById("activeRequestId").value.trim();
      const content = document.getElementById("msgContent").value.trim();
      if (!reqId) return alert("Enter requestId");
      if (!content) return alert("Message content required");
      try {
        await api(`/api/mentorship/requests/${reqId}/message`, { method: "POST", body: { content } });
        document.getElementById("loadMessagesBtn").click();
        document.getElementById("msgContent").value = "";
      } catch (err) {
        alert(err.message || "Send failed");
      }
    });
  }

  async function renderAI() {
    mainContent.innerHTML = `
      <div class="section-title">AI Tools</div>
      <div class="grid2">
        ${card("Financial Advisor", `
          <input id="finPrompt" type="text" placeholder="Ask about your finances..." />
          <button class="btn btn-primary btn-inline" id="finAdvisorBtn" style="width:auto;">Get Suggestions</button>
          <div class="message" id="aiFinMsg"></div>
        `)}
        ${card("Study Assistant", `
          <input id="studyCourseId" type="text" placeholder="courseId (optional)" />
          <input id="studyPrompt" type="text" placeholder="Study prompt..." />
          <button class="btn btn-secondary btn-inline" id="studyAssistantBtn" style="width:auto;">Get Study Plan</button>
          <div class="message" id="aiStudyMsg"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Digital Companion Suggestions", `
          <button class="btn btn-secondary btn-inline" id="loadCompanionBtn" style="width:auto;">Load Suggestions</button>
          <div class="list" id="companionList" style="margin-top:10px;"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Notifications (Simulated)", `
          <button class="btn btn-primary btn-inline" id="notifyBtn" style="width:auto;">Generate Notification</button>
          <div class="message" id="aiNotifMsg"></div>
        `)}
      </div>
    `;

    document.getElementById("finAdvisorBtn").addEventListener("click", async () => {
      try {
        const prompt = document.getElementById("finPrompt").value.trim();
        const data = await api("/api/ai/financial-advisor", { method: "POST", body: { prompt } });
        document.getElementById("aiFinMsg").textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        document.getElementById("aiFinMsg").textContent = err.message || "Failed";
      }
    });
    document.getElementById("studyAssistantBtn").addEventListener("click", async () => {
      try {
        const courseId = document.getElementById("studyCourseId").value.trim();
        const prompt = document.getElementById("studyPrompt").value.trim();
        const body = { prompt };
        if (courseId) body.courseId = courseId;
        const data = await api("/api/ai/study-assistant", { method: "POST", body });
        document.getElementById("aiStudyMsg").textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        document.getElementById("aiStudyMsg").textContent = err.message || "Failed";
      }
    });
    document.getElementById("loadCompanionBtn").addEventListener("click", async () => {
      try {
        const data = await api("/api/companion/suggestions");
        const list = document.getElementById("companionList");
        list.innerHTML = "";
        (data.suggestions || []).forEach((s) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>Suggestion</strong><div class="muted" style="margin-top:6px;">${s}</div>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Failed");
      }
    });
    document.getElementById("notifyBtn").addEventListener("click", async () => {
      try {
        const data = await api("/api/ai/notifications", { method: "POST", body: {} });
        document.getElementById("aiNotifMsg").textContent = data.message || "OK";
      } catch (err) {
        document.getElementById("aiNotifMsg").textContent = err.message || "Failed";
      }
    });
  }

  async function renderGroups() {
    const { groups } = await api("/api/groups");
    mainContent.innerHTML = `
      <div class="section-title">Groups & Community</div>
      <div class="grid2">
        ${card("Create & Join", `
          <input id="groupName" type="text" placeholder="Group name" />
          <input id="groupDesc" type="text" placeholder="Description (optional)" />
          <button class="btn btn-primary btn-inline" id="createGroupBtn" style="width:auto;">Create Group</button>
          <div class="message" id="grpMsg"></div>
          <div class="list" id="groupsList" style="margin-top:10px;"></div>
        `)}
        ${card("Posts & Polls", `
          <input id="activeGroupId" type="text" placeholder="Select group id to manage" />
          <button class="btn btn-secondary btn-inline" id="loadGroupBtn" style="width:auto;">Load</button>
          <div id="groupManage" style="margin-top:12px;"></div>
          <div style="margin-top:12px;">
            <button class="btn btn-secondary btn-inline" id="loadTrendingBtn" style="width:auto;">Trending</button>
            <div class="list" id="trendingList" style="margin-top:10px;"></div>
          </div>
        `)}
      </div>
    `;

    const groupsList = document.getElementById("groupsList");
    (groups || []).forEach((g) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `<div><strong>${g.name}</strong></div><div class="muted" style="margin-top:6px;">${g.description || ""}</div><div class="muted" style="margin-top:6px;">Members: ${(g.members || []).length}</div><div style="margin-top:10px;"><button class="btn btn-secondary btn-inline joinBtn" data-id="${g._id}" style="width:auto;">Join</button> <button class="btn btn-primary btn-inline useGroupBtn" data-id="${g._id}" style="width:auto;">Use</button></div>`;
      groupsList.appendChild(el);
    });

    document.querySelectorAll(".joinBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/groups/${btn.getAttribute("data-id")}/join`, { method: "POST", body: {} });
          await renderGroups();
        } catch (err) {
          alert(err.message || "Join failed");
        }
      });
    });
    document.querySelectorAll(".useGroupBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("activeGroupId").value = btn.getAttribute("data-id");
      });
    });

    document.getElementById("createGroupBtn").addEventListener("click", async () => {
      const msg = document.getElementById("grpMsg");
      try {
        const name = document.getElementById("groupName").value.trim();
        const description = document.getElementById("groupDesc").value.trim();
        if (!name) throw new Error("group name is required");
        const data = await api("/api/groups", { method: "POST", body: { name, description } });
        setMessage(msg, data.message || "Created", false);
        await renderGroups();
      } catch (err) {
        setMessage(msg, err.message || "Create failed", true);
      }
    });

    async function loadGroup(groupId) {
      const postsData = await api(`/api/groups/${groupId}/posts`);
      const pollsData = await api(`/api/groups/${groupId}/polls`);
      const manage = document.getElementById("groupManage");
      manage.innerHTML = `
        <div class="mini-card" style="margin-top:10px;">
          <div class="muted">Posts</div>
          <div class="list" id="groupPostsList" style="margin-top:10px;"></div>
          <div style="margin-top:12px;">
            <input id="newPostContent" type="text" placeholder="New post content" />
            <button class="btn btn-primary btn-inline" id="addPostBtn" style="width:auto;">Post</button>
          </div>
        </div>
        <div class="mini-card" style="margin-top:14px;">
          <div class="muted">Polls</div>
          <div class="list" id="pollsList" style="margin-top:10px;"></div>
          <div style="margin-top:12px;">
            <input id="pollQuestion" type="text" placeholder="Poll question" />
            <input id="pollOptions" type="text" placeholder="Options comma separated (at least 2)" />
            <button class="btn btn-secondary btn-inline" id="createPollBtn" style="width:auto;">Create Poll</button>
          </div>
        </div>
      `;

      const postsList = document.getElementById("groupPostsList");
      (postsData.posts || []).slice(0, 30).forEach((p) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `<div><strong>${p.authorId}</strong></div><div class="muted" style="margin-top:6px;">${p.content}</div><div class="muted" style="margin-top:6px;">${new Date(p.createdAt).toLocaleString()}</div>`;
        postsList.appendChild(el);
      });

      const pollsList = document.getElementById("pollsList");
      (pollsData.polls || []).forEach((pl) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div><strong>${pl.question}</strong></div>
          <div class="muted" style="margin-top:8px;">${(pl.options || []).map((o, i) => `<div><label><input type="radio" name="poll-${pl._id}" value="${i}" /> ${o}</label></div>`).join("")}</div>
          <button class="btn btn-primary btn-inline" style="width:auto; margin-top:10px;" data-poll="${pl._id}">Vote</button>
        `;
        pollsList.appendChild(el);
      });

      document.querySelectorAll("button[data-poll]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pollId = btn.getAttribute("data-poll");
          const selected = document.querySelector(`input[name="poll-${pollId}"]:checked`);
          if (!selected) return alert("Select an option");
          try {
            const optionIndex = Number(selected.value);
            const data = await api(`/api/polls/${pollId}/vote`, { method: "POST", body: { optionIndex } });
            alert(`Vote saved. Totals: ${data.totals.join(", ")}`);
            await loadGroup(groupId);
          } catch (err) {
            alert(err.message || "Vote failed");
          }
        });
      });

      document.getElementById("addPostBtn").addEventListener("click", async () => {
        try {
          const content = document.getElementById("newPostContent").value.trim();
          if (!content) throw new Error("Content required");
          await api(`/api/groups/${groupId}/posts`, { method: "POST", body: { content } });
          await loadGroup(groupId);
        } catch (err) {
          alert(err.message || "Post failed");
        }
      });

      document.getElementById("createPollBtn").addEventListener("click", async () => {
        try {
          const question = document.getElementById("pollQuestion").value.trim();
          const optionsRaw = document.getElementById("pollOptions").value.trim();
          if (!question) throw new Error("question required");
          const options = optionsRaw ? optionsRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
          if (options.length < 2) throw new Error("Need at least 2 options");
          await api(`/api/groups/${groupId}/polls`, { method: "POST", body: { question, options } });
          await loadGroup(groupId);
        } catch (err) {
          alert(err.message || "Create poll failed");
        }
      });
    }

    document.getElementById("loadGroupBtn").addEventListener("click", async () => {
      const groupId = document.getElementById("activeGroupId").value.trim();
      if (!groupId) return alert("Enter groupId");
      try {
        await loadGroup(groupId);
      } catch (err) {
        alert(err.message || "Load failed");
      }
    });

    document.getElementById("loadTrendingBtn").addEventListener("click", async () => {
      const list = document.getElementById("trendingList");
      list.innerHTML = "";
      try {
        const data = await api("/api/community/trending");
        (data.trending || []).forEach((x) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>${x.name}</strong><div class="muted" style="margin-top:6px;">Posts: ${x.postsCount} • Polls: ${x.pollCount}</div>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Trending failed");
      }
    });
  }

  async function renderEntertainment() {
    const { items } = await api("/api/entertainment/items");
    mainContent.innerHTML = `
      <div class="section-title">Entertainment</div>
      <div class="grid2">
        ${card("Create", `
          <input id="entCategory" type="text" placeholder="category: media, music, gaming" />
          <input id="entTitle" type="text" placeholder="Title (optional)" />
          <input id="entDesc" type="text" placeholder="Description (optional)" />
          <input id="entUrl" type="text" placeholder="Media URL (optional)" />
          <button class="btn btn-primary btn-inline" id="entCreateBtn" style="width:auto;">Create</button>
          <div class="message" id="entMsg"></div>
        `)}
        ${card("List", `
          <div class="list" id="entList"></div>
        `)}
      </div>
    `;

    const list = document.getElementById("entList");
    (items || []).forEach((i) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${i.title || "Item"}</strong> <span class="muted">(${i.category})</span></div>
        <div class="muted" style="margin-top:6px;">${i.description || ""}</div>
        <div class="muted" style="margin-top:6px;">Participants: ${(i.participants || []).length} • Likes: ${(i.likes || []).length}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn btn-secondary btn-inline likeBtn" data-id="${i._id}" style="width:auto;">Like</button>
          ${i.category === "gaming" ? `<button class="btn btn-primary btn-inline joinBtn" data-id="${i._id}" style="width:auto;">Join Challenge</button>` : ""}
        </div>
      `;
      list.appendChild(el);
    });

    document.querySelectorAll(".likeBtn").forEach((b) => b.addEventListener("click", async () => {
      try {
        await api(`/api/entertainment/items/${b.getAttribute("data-id")}/like`, { method: "POST", body: {} });
        await renderEntertainment();
      } catch (err) { alert(err.message || "Like failed"); }
    }));

    document.querySelectorAll(".joinBtn").forEach((b) => b.addEventListener("click", async () => {
      try {
        await api(`/api/entertainment/items/${b.getAttribute("data-id")}/join`, { method: "POST", body: {} });
        await renderEntertainment();
      } catch (err) { alert(err.message || "Join failed"); }
    }));

    document.getElementById("entCreateBtn").addEventListener("click", async () => {
      const msg = document.getElementById("entMsg");
      try {
        const category = document.getElementById("entCategory").value.trim();
        if (!category) throw new Error("category is required");
        const title = document.getElementById("entTitle").value.trim();
        const description = document.getElementById("entDesc").value.trim();
        const url = document.getElementById("entUrl").value.trim();
        setMessage(msg, "Creating...", false);
        await api("/api/entertainment/items", { method: "POST", body: { category, title, description, url } });
        setMessage(msg, "Created", false);
        await renderEntertainment();
      } catch (err) {
        setMessage(msg, err.message || "Create failed", true);
      }
    });
  }

  async function renderVolunteer() {
    const { events } = await api("/api/volunteer/events");
    mainContent.innerHTML = `
      <div class="section-title">Volunteer</div>
      <div class="grid2">
        ${card("Create Volunteer Event", `
          <input id="volTitle" type="text" placeholder="Title" />
          <input id="volDesc" type="text" placeholder="Description" />
          <input id="volDate" type="date" placeholder="Date" />
          <button class="btn btn-primary btn-inline" id="createVolBtn" style="width:auto;">Create</button>
          <div class="message" id="volMsg"></div>
        `)}
        ${card("Upcoming", `
          <div class="list" id="volList"></div>
        `)}
      </div>
    `;
    const list = document.getElementById("volList");
    (events || []).forEach((e) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${e.title}</strong></div>
        <div class="muted" style="margin-top:6px;">${e.description || ""}</div>
        <div class="muted" style="margin-top:6px;">${new Date(e.date).toLocaleString()}</div>
        <div class="muted" style="margin-top:6px;">Participants: ${(e.participants || []).length}</div>
        <button class="btn btn-secondary btn-inline joinBtn" data-id="${e._id}" style="width:auto; margin-top:10px;">Join</button>
      `;
      list.appendChild(el);
    });
    document.querySelectorAll(".joinBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/volunteer/events/${btn.getAttribute("data-id")}/join`, { method: "POST", body: {} });
          await renderVolunteer();
        } catch (err) { alert(err.message || "Join failed"); }
      });
    });

    document.getElementById("createVolBtn").addEventListener("click", async () => {
      const msg = document.getElementById("volMsg");
      try {
        const title = document.getElementById("volTitle").value.trim();
        const description = document.getElementById("volDesc").value.trim();
        const date = document.getElementById("volDate").value;
        if (!title || !date) throw new Error("title and date are required");
        setMessage(msg, "Creating...", false);
        await api("/api/volunteer/events", { method: "POST", body: { title, description, date } });
        setMessage(msg, "Created", false);
        await renderVolunteer();
      } catch (err) {
        setMessage(msg, err.message || "Create failed", true);
      }
    });
  }

  async function renderDevices() {
    mainContent.innerHTML = `
      <div class="section-title">Device Sharing & AR/VR</div>
      <div class="grid2">
        ${card("Device Sharing", `
          <input id="dsItemType" type="text" placeholder="itemType (e.g. laptop)" />
          <input id="dsOwnerId" type="text" placeholder="ownerId (user id ObjectId)" />
          <button class="btn btn-primary btn-inline" id="dsRequestBtn" style="width:auto;">Request</button>
          <div class="message" id="dsMsg"></div>
          <button class="btn btn-secondary btn-inline" id="dsMineBtn" style="width:auto;">Load My Requests</button>
          <div class="list" id="dsList" style="margin-top:10px;"></div>
        `)}
        ${card("AR/VR Rooms", `
          <button class="btn btn-secondary btn-inline" id="arLoadBtn" style="width:auto;">Load Rooms</button>
          <div class="list" id="arList" style="margin-top:10px;"></div>
        `)}
      </div>
    `;

    document.getElementById("dsRequestBtn").addEventListener("click", async () => {
      const msg = document.getElementById("dsMsg");
      try {
        const itemType = document.getElementById("dsItemType").value.trim();
        const ownerId = document.getElementById("dsOwnerId").value.trim();
        if (!itemType || !ownerId) throw new Error("itemType and ownerId are required");
        setMessage(msg, "Creating request...", false);
        await api("/api/tech/device-sharing/request", { method: "POST", body: { itemType, ownerId } });
        setMessage(msg, "Request created", false);
      } catch (err) {
        setMessage(msg, err.message || "Failed", true);
      }
    });

    async function loadDeviceSharingMine() {
      const { requests } = await api("/api/tech/device-sharing/mine");
      const list = document.getElementById("dsList");
      list.innerHTML = "";
      (requests || []).forEach((r) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div><strong>${r.itemType}</strong> • Status: ${r.status}</div>
          <div class="muted" style="margin-top:6px;">Owner: ${r.owner} • Borrower: ${r.borrower}</div>
          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            ${state.isAdmin ? `<button class="btn btn-secondary btn-inline" style="width:auto;" data-act="approve" data-id="${r._id}">Approve</button><button class="btn btn-secondary btn-inline" style="width:auto;" data-act="decline" data-id="${r._id}">Decline</button>` : ""}
            ${state.isAdmin ? `<button class="btn btn-secondary btn-inline" style="width:auto;" data-act="return" data-id="${r._id}">Return</button>` : ""}
          </div>
        `;
        list.appendChild(el);
      });

      document.querySelectorAll("button[data-act]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const act = btn.getAttribute("data-act");
            const id = btn.getAttribute("data-id");
            await api(`/api/tech/device-sharing/${id}/${act}`, { method: "POST", body: {} });
            await loadDeviceSharingMine();
          } catch (err) {
            alert(err.message || "Action failed");
          }
        });
      });
    }

    document.getElementById("dsMineBtn").addEventListener("click", loadDeviceSharingMine);
    // initial load
    loadDeviceSharingMine().catch(() => {});

    document.getElementById("arLoadBtn").addEventListener("click", async () => {
      const list = document.getElementById("arList");
      list.innerHTML = "";
      try {
        const data = await api("/api/tech/arvr-rooms");
        (data.rooms || []).forEach((r) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `
            <div><strong>Room ${r.roomId}</strong></div>
            <div class="muted" style="margin-top:6px;">Participants: ${(r.participants || []).length}</div>
            <button class="btn btn-primary btn-inline" style="width:auto; margin-top:10px;" data-join="${r.roomId}">Join</button>
          `;
          list.appendChild(el);
        });
        document.querySelectorAll("button[data-join]").forEach((b) => {
          b.addEventListener("click", async () => {
            try {
              await api(`/api/tech/arvr-rooms/${encodeURIComponent(b.getAttribute("data-join"))}/join`, { method: "POST", body: {} });
              await document.getElementById("arLoadBtn").click();
            } catch (err) {
              alert(err.message || "Join failed");
            }
          });
        });
      } catch (err) {
        alert(err.message || "Load rooms failed");
      }
    });
  }

  async function renderOffline() {
    mainContent.innerHTML = `
      <div class="section-title">Offline Tools</div>
      <div class="grid2">
        ${card("Offline Chat", `
          <div class="row">
            <input id="offOtherId" type="text" placeholder="Other userId (ObjectId)" />
            <button class="btn btn-secondary btn-inline" id="offLoadBtn" style="width:auto;">Load Chat</button>
          </div>
          <div class="list" id="offChatList" style="margin-top:10px;"></div>
          <div class="row">
            <input id="offChatContent" type="text" placeholder="Message..." />
            <button class="btn btn-primary btn-inline" id="offSendBtn" style="width:auto;">Send</button>
          </div>
          <div class="message" id="offChatMsg"></div>
        `)}
        ${card("Offline File Sharing", `
          <input id="offBorrowerId" type="text" placeholder="borrowerId (ObjectId)" />
          <input id="offItemType" type="text" placeholder="item type (e.g. pdf)" />
          <input id="offFileName" type="text" placeholder="fileName" />
          <input id="offFileUrl" type="text" placeholder="fileUrl (or data URL)" />
          <button class="btn btn-secondary btn-inline" id="offFileShareBtn" style="width:auto;">Share</button>
          <div class="message" id="offFileMsg"></div>
        `)}
      </div>
    `;

    document.getElementById("offLoadBtn").addEventListener("click", async () => {
      try {
        const otherUserId = document.getElementById("offOtherId").value.trim();
        if (!otherUserId) throw new Error("otherUserId is required");
        const data = await api(`/api/offline/chat/with/${encodeURIComponent(otherUserId)}`);
        const list = document.getElementById("offChatList");
        list.innerHTML = "";
        (data.messages || []).forEach((m) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>${m.senderId}</strong><div class="muted" style="margin-top:6px;">${m.content}</div>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Load chat failed");
      }
    });

    document.getElementById("offSendBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("offChatMsg");
      try {
        const otherUserId = document.getElementById("offOtherId").value.trim();
        const content = document.getElementById("offChatContent").value.trim();
        if (!otherUserId) throw new Error("otherUserId is required");
        if (!content) throw new Error("content is required");
        setMessage(msgEl, "Sending...", false);
        await api("/api/offline/chat/send", { method: "POST", body: { receiverId: otherUserId, content } });
        setMessage(msgEl, "Sent", false);
        document.getElementById("offLoadBtn").click();
      } catch (err) {
        setMessage(msgEl, err.message || "Send failed", true);
      }
    });

    document.getElementById("offFileShareBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("offFileMsg");
      try {
        const borrowerId = document.getElementById("offBorrowerId").value.trim();
        const itemType = document.getElementById("offItemType").value.trim();
        const fileName = document.getElementById("offFileName").value.trim();
        const fileUrl = document.getElementById("offFileUrl").value.trim();
        if (!borrowerId || !itemType || !fileName || !fileUrl) throw new Error("All fields are required");
        setMessage(msgEl, "Sharing file...", false);
        await api("/api/offline/files/share", { method: "POST", body: { borrowerId, itemType, fileName, fileUrl } });
        setMessage(msgEl, "Shared", false);
      } catch (err) {
        setMessage(msgEl, err.message || "Share failed", true);
      }
    });
  }

  async function renderSmartStudy() {
    const { sessions } = await api("/api/smartstudy/sessions");
    mainContent.innerHTML = `
      <div class="section-title">Smart Study</div>
      <div class="grid2">
        ${card("Start Session", `
          <div class="row">
            <input id="ssType" type="text" placeholder="type (focus/pomodoro/break)" />
            <input id="ssDuration" type="number" min="0" placeholder="durationSeconds" />
          </div>
          <button class="btn btn-primary btn-inline" id="ssStartBtn" style="width:auto;">Start</button>
          <div class="message" id="ssMsg"></div>
        `)}
        ${card("Your Sessions", `
          <div class="list" id="ssList"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Digital Companion Suggestions", `
          <button class="btn btn-secondary btn-inline" id="compSugBtn" style="width:auto;">Load Suggestions</button>
          <div class="list" id="compSugList" style="margin-top:10px;"></div>
        `)}
      </div>
    `;

    const list = document.getElementById("ssList");
    (sessions || []).forEach((s) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${s.type}</strong> • Duration: ${s.durationSeconds || 0}s</div>
        <div class="muted" style="margin-top:6px;">Started: ${new Date(s.startedAt).toLocaleString()}</div>
        <div class="muted" style="margin-top:6px;">Completed: ${s.completedAt ? new Date(s.completedAt).toLocaleString() : "No"}</div>
        ${s.completedAt ? "" : `<button class="btn btn-primary btn-inline" style="width:auto; margin-top:10px;" data-complete="${s._id}">Complete</button>`}
      `;
      list.appendChild(el);
    });

    document.querySelectorAll("button[data-complete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/smartstudy/sessions/${btn.getAttribute("data-complete")}/complete`, { method: "POST", body: {} });
          await renderSmartStudy();
        } catch (err) {
          alert(err.message || "Complete failed");
        }
      });
    });

    document.getElementById("ssStartBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("ssMsg");
      try {
        const type = document.getElementById("ssType").value.trim() || "focus";
        const durationSeconds = document.getElementById("ssDuration").value;
        setMessage(msgEl, "Starting session...", false);
        await api("/api/smartstudy/sessions", { method: "POST", body: { type, durationSeconds } });
        setMessage(msgEl, "Started", false);
        await renderSmartStudy();
      } catch (err) {
        setMessage(msgEl, err.message || "Start failed", true);
      }
    });

    document.getElementById("compSugBtn").addEventListener("click", async () => {
      try {
        const data = await api("/api/companion/suggestions");
        const list = document.getElementById("compSugList");
        list.innerHTML = "";
        (data.suggestions || []).forEach((s) => {
          const el = document.createElement("div");
          el.className = "item";
          el.innerHTML = `<strong>Suggestion</strong><div class="muted" style="margin-top:6px;">${s}</div>`;
          list.appendChild(el);
        });
      } catch (err) {
        alert(err.message || "Failed to load suggestions");
      }
    });
  }

  async function renderGamification() {
    const [{ users }, daily] = await Promise.all([
      api("/api/gamification/leaderboard"),
      api("/api/gamification/daily-challenge/today"),
    ]);

    mainContent.innerHTML = `
      <div class="section-title">Gamification</div>
      <div class="grid2">
        ${card("Daily Challenge", `
          <div class="item">
            <div class="muted">Date</div>
            <div style="margin-top:6px;"><strong>${daily.dateKey}</strong></div>
            <div style="margin-top:12px;">
              <div class="muted">Tasks</div>
              <div id="dailyTasks" class="list" style="margin-top:10px;"></div>
            </div>
            <div class="message" style="margin-top:10px;">Rewarded: ${daily.rewarded ? "Yes" : "No"}</div>
          </div>
        `)}
        ${card("Leaderboard", `
          <div class="list" id="leaderList"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Your Badges", `
          <div class="message" id="badgeMsg">Loading badges...</div>
        `)}
      </div>
    `;

    const dailyTasks = document.getElementById("dailyTasks");
    (daily.tasks || []).forEach((t) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${t.label}</strong></div>
        <div class="muted" style="margin-top:6px;">Reward: +${t.rewardPoints} points</div>
        <div class="muted" style="margin-top:6px;">Status: ${t.completed ? "Completed" : "Pending"}</div>
      `;
      dailyTasks.appendChild(el);
    });

    const leaderList = document.getElementById("leaderList");
    (users || []).forEach((u, idx) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>#${idx + 1}</strong> ${u.name}</div>
        <div class="muted" style="margin-top:6px;">${u.phone || ""}</div>
        <div class="muted" style="margin-top:6px;">Points: ${u.points || 0}</div>
      `;
      leaderList.appendChild(el);
    });

    try {
      const me = await api("/api/users/me");
      const badgeMsg = document.getElementById("badgeMsg");
      const badges = (me.badges || []).slice().sort();
      badgeMsg.textContent = badges.length ? badges.join(", ") : "No badges yet.";
    } catch (err) {
      document.getElementById("badgeMsg").textContent = "Failed to load badges";
    }
  }

  async function renderNotifications() {
    const { notifications } = await api("/api/notifications");
    mainContent.innerHTML = `
      <div class="section-title">Notifications</div>
      <div class="list" id="notifList"></div>
      <div style="margin-top:14px;">
        <button class="btn btn-secondary" id="clearReadBtn">Clear Read</button>
      </div>
    `;

    const list = document.getElementById("notifList");
    (notifications || []).forEach((n, idx) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${n.read ? "Read" : "New"}</strong> • ${n.type}</div>
        <div class="muted" style="margin-top:6px;">${n.message || ""}</div>
        <div class="muted" style="margin-top:6px;">${n.date ? new Date(n.date).toLocaleString() : ""}</div>
        ${
          n.read
            ? ""
            : `<button class="btn btn-primary btn-inline" style="width:auto; margin-top:10px;" data-idx="${idx}">Mark as read</button>`
        }
      `;
      list.appendChild(el);
    });

    document.querySelectorAll("button[data-idx]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = btn.getAttribute("data-idx");
        await api(`/api/notifications/${idx}/mark-read`, { method: "POST", body: {} });
        await renderNotifications();
      });
    });

    document.getElementById("clearReadBtn").addEventListener("click", async () => {
      await api("/api/notifications/clear-read", { method: "POST", body: {} });
      await renderNotifications();
    });
  }

  async function renderAdmin() {
    if (!state.isAdmin) {
      mainContent.innerHTML = `<div class="section-title">Admin</div><div class="message">Admin access required.</div>`;
      return;
    }

    const [usersData, analytics] = await Promise.all([api("/api/admin/users"), api("/api/admin/analytics")]);

    mainContent.innerHTML = `
      <div class="section-title">Admin Dashboard</div>
      <div class="grid2">
        ${card("Analytics", `
          <div class="item"><strong>User count</strong>: ${analytics.totals.userCount}</div>
          <div class="item"><strong>Loan count</strong>: ${analytics.totals.loanCount}</div>
          <div class="item"><strong>Library count</strong>: ${analytics.totals.libraryCount}</div>
          <div class="item"><strong>Event count</strong>: ${analytics.totals.eventCount}</div>
        `)}
        ${card("Users", `
          <div class="list" id="adminUsersList"></div>
        `)}
      </div>
      <div style="margin-top:14px;">
        ${card("Broadcast Notification (Simulated)", `
          <input id="bcTitle" type="text" placeholder="Title" />
          <input id="bcBody" type="text" placeholder="Body" />
          <button class="btn btn-primary btn-inline" id="bcBtn" style="width:auto;">Broadcast</button>
          <div class="message" id="bcMsg"></div>
        `)}
      </div>
    `;

    const list = document.getElementById("adminUsersList");
    (usersData.users || []).forEach((u) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div><strong>${u.name}</strong> <span class="muted">(${u.phone})</span></div>
        <div class="muted" style="margin-top:6px;">Email: ${u.email || "-"}</div>
        <div class="muted" style="margin-top:6px;">Balance: ${u.balance}</div>
        <div class="muted" style="margin-top:6px;">Role: ${u.isAdmin ? "admin" : "user"}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn btn-secondary btn-inline suspendBtn" style="width:auto;" data-id="${u._id}" data-suspended="true">Suspend</button>
          <button class="btn btn-secondary btn-inline suspendBtn" style="width:auto;" data-id="${u._id}" data-suspended="false">Unsuspend</button>
        </div>
      `;
      list.appendChild(el);
    });

    document.querySelectorAll(".suspendBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-id");
          const suspended = btn.getAttribute("data-suspended") === "true";
          await api(`/api/admin/users/${id}/suspend`, { method: "POST", body: { suspended } });
          await renderAdmin();
        } catch (err) {
          alert(err.message || "Update failed");
        }
      });
    });

    document.getElementById("bcBtn").addEventListener("click", async () => {
      const msgEl = document.getElementById("bcMsg");
      try {
        const title = document.getElementById("bcTitle").value.trim();
        const body = document.getElementById("bcBody").value.trim();
        setMessage(msgEl, "Broadcasting...", false);
        await api("/api/admin/notifications/broadcast", { method: "POST", body: { title, body } });
        setMessage(msgEl, "Queued (simulated)", false);
      } catch (err) {
        setMessage(msgEl, err.message || "Failed", true);
      }
    });
  }

  // Router: module buttons
  async function routeModule(moduleName) {
    switch (moduleName) {
      case "wallet":
        return renderWallet();
      case "loans":
        return renderLoans();
      case "study":
        return renderStudy();
      case "library":
        return renderLibrary();
      case "market":
        return renderMarket();
      case "gram":
        return renderGram();
      case "events":
        return renderEvents();
      case "health":
        return renderHealth();
      case "mentorship":
        return renderMentorship();
      case "ai":
        return renderAI();
      case "groups":
        return renderGroups();
      case "entertainment":
        return renderEntertainment();
      case "volunteer":
        return renderVolunteer();
      case "devices":
        return renderDevices();
      case "arvr":
        return renderDevices();
      case "offline":
        return renderOffline();
      case "smartstudy":
        return renderSmartStudy();
      case "gamification":
        return renderGamification();
      case "notifications":
        return renderNotifications();
      case "admin":
        return renderAdmin();
      default:
        return renderEmpty();
    }
  }

  async function init() {
    try {
      await loadProfile();
      // Default view
      renderEmpty();

      document.querySelectorAll(".nav-link").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const mod = btn.getAttribute("data-module");
          try {
            // Small loading state
            mainContent.innerHTML = `<div class="message">Loading ${mod}...</div>`;
            await routeModule(mod);
          } catch (err) {
            mainContent.innerHTML = `<div class="message" style="border-color: rgba(255,77,109,0.5); color:#ffb3c1;">${err.message || "Error loading module"}</div>`;
          }
        });
      });
    } catch (err) {
      // Token invalid
      localStorage.removeItem("token");
      window.location.href = "./index.html";
    }
  }

  init().catch(() => {});
}

