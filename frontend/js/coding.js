/* ============================================================
   CODING TRACKER LOGIC
   ============================================================ */

Api.requireAuth();
renderSidebar("coding.html");

let entries = [];
let diffChart;

const DEMO_ENTRIES = [
  { date: daysAgo(0), platform: "LeetCode", count: 2, difficulty: "Medium" },
  { date: daysAgo(1), platform: "GeeksforGeeks", count: 3, difficulty: "Easy" },
  { date: daysAgo(2), platform: "LeetCode", count: 1, difficulty: "Hard" },
  { date: daysAgo(5), platform: "HackerRank", count: 2, difficulty: "Medium" },
];

function daysAgo(n){
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function loadCoding(){
  try{
    entries = await Api.get("/coding");
  }catch(err){
    entries = DEMO_ENTRIES;
    toast("Showing demo data — connect API_BASE_URL to see your live data.", "info");
  }
  renderSummary();
  renderDifficultyChart();
  renderHeatmap();
  renderTable();
}

function renderSummary(){
  const totalProblems = entries.reduce((sum, e) => sum + e.count, 0);
  const streak = computeStreak();
  const weekCount = entries.filter(e => isWithinDays(e.date, 7)).reduce((s,e)=>s+e.count,0);

  document.getElementById("coding-summary").innerHTML = `
    <div class="card"><div class="label">Total problems</div><div class="stat-value mt-8">${totalProblems}</div></div>
    <div class="card"><div class="label">Current streak</div><div class="stat-value mt-8">${streak} 🔥</div></div>
    <div class="card"><div class="label">This week</div><div class="stat-value mt-8">${weekCount}</div></div>
    <div class="card"><div class="label">Platforms logged</div><div class="stat-value mt-8">${new Set(entries.map(e=>e.platform)).size}</div></div>
  `;
}

function isWithinDays(dateStr, days){
  return (new Date() - new Date(dateStr)) / (1000*60*60*24) <= days;
}

function computeStreak(){
  const datesSet = new Set(entries.map(e => e.date));
  let streak = 0;
  let cursor = new Date();
  while(datesSet.has(cursor.toISOString().split("T")[0])){
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderDifficultyChart(){
  const buckets = { Easy: 0, Medium: 0, Hard: 0 };
  entries.forEach(e => { buckets[e.difficulty] = (buckets[e.difficulty] || 0) + e.count; });

  const ctx = document.getElementById("diff-chart");
  if(diffChart) diffChart.destroy();
  diffChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(buckets),
      datasets: [{ data: Object.values(buckets), backgroundColor: ["#3DDC97", "#F2B705", "#FF6B6B"] }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

function renderHeatmap(){
  const countByDate = {};
  entries.forEach(e => { countByDate[e.date] = (countByDate[e.date] || 0) + e.count; });

  let cells = "";
  for(let i = 89; i >= 0; i--){
    const date = daysAgo(i);
    const count = countByDate[date] || 0;
    const intensity = count === 0 ? "var(--surface-2)" : count < 2 ? "rgba(61,220,151,.35)" : count < 4 ? "rgba(61,220,151,.65)" : "#3DDC97";
    cells += `<div title="${date}: ${count} problems" style="width:100%; aspect-ratio:1; border-radius:3px; background:${intensity};"></div>`;
  }
  document.getElementById("heatmap").innerHTML = cells;
}

function renderTable(){
  const sorted = [...entries].sort((a,b) => new Date(b.date) - new Date(a.date));
  document.getElementById("coding-tbody").innerHTML = sorted.map(e => `
    <tr><td class="mono">${e.date}</td><td>${e.platform}</td><td class="mono">${e.count}</td><td>${e.difficulty}</td></tr>
  `).join("");
}

document.getElementById("cd-date").value = new Date().toISOString().split("T")[0];

document.getElementById("coding-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    date: document.getElementById("cd-date").value,
    platform: document.getElementById("cd-platform").value,
    count: Number(document.getElementById("cd-count").value) || 1,
    difficulty: document.getElementById("cd-difficulty").value
  };
  try{
    const created = await Api.post("/coding", payload);
    entries.push(created);
  }catch(err){
    entries.push(payload);
  }
  renderSummary();
  renderDifficultyChart();
  renderHeatmap();
  renderTable();
  toast("Practice logged.", "success");
});

loadCoding();
