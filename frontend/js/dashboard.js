/* ============================================================
   DASHBOARD LOGIC
   Calls GET /dashboard which returns an aggregated summary.
   Falls back to demo data if the API isn't deployed yet, so the
   UI can be reviewed before AWS is wired up.
   ============================================================ */

Api.requireAuth();
renderSidebar("dashboard.html");

const DEMO_SUMMARY = {
  readinessScore: 42,
  breakdown: {
    aptitude: 55,
    coding: 38,
    communication: 50,
    resume: 20,
    projects: 60,
    certifications: 30
  },
  profileCompletion: 65,
  resumeUploaded: false,
  mockInterviewScore: null,
  pipeline: { total: 6, applied: 3, interview: 1, selected: 0, rejected: 1 }
};

async function loadDashboard(){
  const user = Api.currentUser();
  document.getElementById("welcome-heading").textContent = user && user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back";

  let summary;
  try{
    summary = await Api.get("/dashboard");
  }catch(err){
    summary = DEMO_SUMMARY;
    toast("Showing demo data — connect API_BASE_URL to see your live data.", "info");
  }

  renderGauge(summary.readinessScore);
  document.getElementById("readiness-note").textContent =
    summary.readinessScore >= 75 ? "You're in strong shape. Keep your streaks going and start scheduling mock interviews."
    : summary.readinessScore >= 45 ? "You're on track. Focus on your weakest area below to move into GO status."
    : "Let's build momentum — start with profile completion and a first round of aptitude + coding practice.";

  renderStatCards(summary);
  renderPipeline(summary.pipeline);
  renderFocus(summary);
}

function statCard(label, value, sub){
  return `
    <div class="card">
      <div class="label">${label}</div>
      <div class="stat-value mt-8">${value}</div>
      <div class="stat-sub">${sub}</div>
    </div>`;
}

function renderStatCards(s){
  const cards = [
    statCard("Aptitude", s.breakdown.aptitude + "%", "Avg across mock tests"),
    statCard("Coding", s.breakdown.coding + "%", "Problems + streak weighted"),
    statCard("Resume", s.resumeUploaded ? "Uploaded" : "Missing", s.resumeUploaded ? "ATS check available" : "Upload to unlock scoring"),
    statCard("Profile", s.profileCompletion + "%", "Overall completion"),
  ];
  document.getElementById("stat-cards").innerHTML = cards.join("");
}

function renderPipeline(p){
  const rows = [
    ["Total applications", p.total],
    ["Applied / in process", p.applied],
    ["Interview stage", p.interview],
    ["Selected", p.selected],
    ["Rejected", p.rejected],
  ];
  document.getElementById("pipeline-summary").innerHTML = rows.map(([label, val]) => `
    <div class="bar-row"><span>${label}</span><span class="mono">${val}</span></div>
  `).join("") + `<a href="companies.html" class="btn btn-ghost btn-block mt-16">Open company tracker</a>`;
}

function renderFocus(s){
  const items = [];
  if(!s.resumeUploaded) items.push("Upload your resume for an ATS check");
  if(s.breakdown.coding < 50) items.push("Log a coding practice session — your coding score is lagging");
  if(s.breakdown.aptitude < 50) items.push("Take an aptitude mock test this week");
  if(s.profileCompletion < 80) items.push("Finish filling out your profile");
  if(items.length === 0) items.push("You're covering all the basics — consider a mock interview next.");

  document.getElementById("focus-list").innerHTML = items.map(i => `
    <div class="bar-row" style="border-bottom:1px solid var(--border); padding-bottom:8px;"><span>• ${i}</span></div>
  `).join("");
}

loadDashboard();
