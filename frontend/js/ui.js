/* ============================================================
   SHARED UI: theme toggle + sidebar nav injection
   ============================================================ */

const Theme = {
  init(){
    const saved = localStorage.getItem("spt_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  },
  toggle(){
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", current);
    localStorage.setItem("spt_theme", current);
  }
};
Theme.init();

const NAV_ITEMS = [
  { href: "dashboard.html",  icon: "◎", label: "Dashboard" },
  { href: "profile.html",    icon: "▣", label: "Profile" },
  { href: "companies.html",  icon: "▤", label: "Companies" },
  { href: "aptitude.html",   icon: "▲", label: "Aptitude" },
  { href: "coding.html",     icon: "◆", label: "Coding" },
  { href: "analytics.html",  icon: "▥", label: "Analytics" },
];

function renderSidebar(activePage){
  const el = document.getElementById("sidebar-root");
  if(!el) return;

  const user = Api.currentUser();
  const initials = user && user.name ? user.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() : "SP";

  el.innerHTML = `
    <div class="sidebar">
      <div class="brand"><span class="dot"></span> Smart Placement</div>
      ${NAV_ITEMS.map(item => `
        <a class="nav-item ${item.href === activePage ? "active" : ""}" href="${item.href}">
          <span class="icon">${item.icon}</span> ${item.label}
        </a>
      `).join("")}
      <div class="sidebar-footer">
        <button class="theme-toggle w-full" onclick="Theme.toggle()">🌓 Toggle theme</button>
        <button class="icon-btn w-full" onclick="Api.logout()">⎋ Log out (${initials})</button>
      </div>
    </div>
  `;
}

function toast(message, kind = "info"){
  let box = document.getElementById("spt-toast");
  if(!box){
    box = document.createElement("div");
    box.id = "spt-toast";
    box.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999;display:flex;flex-direction:column;gap:8px;";
    document.body.appendChild(box);
  }
  const colors = { info: "#F2B705", success: "#3DDC97", error: "#FF6B6B" };
  const item = document.createElement("div");
  item.textContent = message;
  item.style.cssText = `background:#171D26;border:1px solid ${colors[kind]};color:#E8ECF1;padding:12px 16px;border-radius:8px;font-size:.85rem;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.35);`;
  box.appendChild(item);
  setTimeout(() => item.remove(), 3500);
}

function readinessStatus(score){
  if(score >= 75) return { label: "Placement Ready", cls: "status-go" };
  if(score >= 45) return { label: "In Progress", cls: "status-caution" };
  return { label: "Needs Work", cls: "status-hold" };
}

function statusPillClass(status){
  const map = {
    "Interested": "pill-interested",
    "Applied": "pill-applied",
    "OA Scheduled": "pill-applied",
    "OA Cleared": "pill-oa",
    "Interview Scheduled": "pill-interview",
    "HR Round": "pill-interview",
    "Selected": "pill-selected",
    "Rejected": "pill-rejected"
  };
  return map[status] || "pill-interested";
}
