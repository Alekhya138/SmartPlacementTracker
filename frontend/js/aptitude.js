/* ============================================================
   APTITUDE TRACKER LOGIC
   ============================================================ */

Api.requireAuth();
renderSidebar("aptitude.html");

let records = [];
let chart;

const DEMO_RECORDS = [
  { date: "2026-06-01", category: "Quantitative", score: 60 },
  { date: "2026-06-10", category: "Logical Reasoning", score: 55 },
  { date: "2026-06-20", category: "Verbal", score: 70 },
  { date: "2026-06-28", category: "Quantitative", score: 68 },
];

async function loadAptitude(){
  try{
    records = await Api.get("/aptitude");
  }catch(err){
    records = DEMO_RECORDS;
    toast("Showing demo data — connect API_BASE_URL to see your live data.", "info");
  }
  renderSummary();
  renderChart();
  renderTable();
}

function renderSummary(){
  const scores = records.map(r => r.score);
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const thisWeek = records.filter(r => isWithinDays(r.date, 7)).length;
  const thisMonth = records.filter(r => isWithinDays(r.date, 30)).length;

  document.getElementById("apt-summary").innerHTML = `
    <div class="card"><div class="label">Average score</div><div class="stat-value mt-8">${avg}</div></div>
    <div class="card"><div class="label">Best score</div><div class="stat-value mt-8">${best}</div></div>
    <div class="card"><div class="label">This week</div><div class="stat-value mt-8">${thisWeek}</div></div>
    <div class="card"><div class="label">This month</div><div class="stat-value mt-8">${thisMonth}</div></div>
  `;
}

function isWithinDays(dateStr, days){
  const d = new Date(dateStr);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

function renderChart(){
  const sorted = [...records].sort((a,b) => new Date(a.date) - new Date(b.date));
  const ctx = document.getElementById("apt-chart");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: sorted.map(r => r.date),
      datasets: [{
        label: "Score",
        data: sorted.map(r => r.score),
        borderColor: "#F2B705",
        backgroundColor: "rgba(242,183,5,.15)",
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100 } }
    }
  });
}

function renderTable(){
  const sorted = [...records].sort((a,b) => new Date(b.date) - new Date(a.date));
  document.getElementById("apt-tbody").innerHTML = sorted.map(r => `
    <tr><td class="mono">${r.date}</td><td>${r.category}</td><td class="mono">${r.score}</td></tr>
  `).join("");
}

document.getElementById("apt-date").value = new Date().toISOString().split("T")[0];

document.getElementById("apt-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    category: document.getElementById("apt-category").value,
    score: Number(document.getElementById("apt-score").value),
    date: document.getElementById("apt-date").value
  };
  try{
    const created = await Api.post("/aptitude", payload);
    records.push(created);
  }catch(err){
    records.push(payload); // demo fallback
  }
  renderSummary();
  renderChart();
  renderTable();
  document.getElementById("apt-form").reset();
  document.getElementById("apt-date").value = new Date().toISOString().split("T")[0];
  toast("Score logged.", "success");
});

loadAptitude();
