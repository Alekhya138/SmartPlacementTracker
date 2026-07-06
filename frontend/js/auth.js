/* ============================================================
   AUTH PAGE LOGIC
   ============================================================ */

// If already logged in, skip straight to dashboard
if(Api.token()){
  window.location.href = "dashboard.html";
}

function switchTab(tab){
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
  document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try{
    const data = await Api.request("/auth/login", { method: "POST", body: { email, password }, auth: false });
    Api.setToken(data.token, data.user);
    window.location.href = "dashboard.html";
  }catch(err){
    if(isBackendUnreachable(err)){
      enterDemoMode(email);
      return;
    }
    errEl.textContent = err.message;
    errEl.style.display = "block";
  }
});

document.getElementById("demo-btn").addEventListener("click", () => {
  // No real token/API — pages fall back to demo data automatically
  // whenever an API call fails. This just gets you past the login screen.
  Api.setToken("demo-preview-token", { userId: "demo-user", name: "Alekhya", email: "demo@preview.local" });
  window.location.href = "dashboard.html";
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("register-error");
  errEl.style.display = "none";

  const payload = {
    name: document.getElementById("reg-name").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    college: document.getElementById("reg-college").value.trim(),
    branch: document.getElementById("reg-branch").value.trim(),
    graduationYear: Number(document.getElementById("reg-gradyear").value),
    password: document.getElementById("reg-password").value
  };

  if(payload.password.length < 8){
    errEl.textContent = "Password must be at least 8 characters.";
    errEl.style.display = "block";
    return;
  }

  try{
    const data = await Api.request("/auth/register", { method: "POST", body: payload, auth: false });
    Api.setToken(data.token, data.user);
    window.location.href = "dashboard.html";
  }catch(err){
    if(isBackendUnreachable(err)){
      enterDemoMode(payload.email, payload.name);
      return;
    }
    errEl.textContent = err.message;
    errEl.style.display = "block";
  }
});

/* ---------- Local preview / demo mode ----------
   Used only when API_BASE_URL is unreachable (e.g. before AWS is deployed),
   so the interface can be reviewed end-to-end with sample data. Once a
   real API_BASE_URL is set and reachable, this path is never triggered. */
function isBackendUnreachable(err){
  return /Could not reach the server/i.test(err.message);
}

function enterDemoMode(email, name){
  Api.setToken("demo-token", { userId: "demo-user", name: name || "Demo Student", email: email || "demo@student.edu" });
  toast("No backend connected yet — showing the interface with demo data.", "info");
  window.location.href = "dashboard.html";
}
