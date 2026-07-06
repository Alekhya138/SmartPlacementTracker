/* ============================================================
   ANALYTICS LOGIC
   Calls GET /analytics which returns pre-aggregated series.
   ============================================================ */

Api.requireAuth();
renderSidebar("analytics.html");

const DEMO_ANALYTICS = {
  readinessTrend: { labels: ["Apr","May","Jun","Jul"], data: [20, 30, 38, 42] },
  applicationsPerMonth: { labels: ["Apr","May","Jun","Jul"], data: [1, 2, 2, 1] },
  selectionRate: { selected: 0, rejected: 1, pending: 5 },
  codingGrowth: { labels: ["Wk1","Wk2","Wk3","Wk4"], data: [3, 6, 5, 9] },
  aptitudeImprovement: { labels: ["Quantitative","Logical Reasoning","Verbal"], data: [60, 55, 65] }
};

function baseLineOptions(){
  return { plugins: { legend: { display: false } } };
}

async function loadAnalytics(){
  let a;
  try{
    a = await Api.get("/analytics");
  }catch(err){
    a = DEMO_ANALYTICS;
    toast("Showing demo data — connect API_BASE_URL to see your live data.", "info");
  }

  new Chart(document.getElementById("chart-readiness"), {
    type: "line",
    data: { labels: a.readinessTrend.labels, datasets: [{ data: a.readinessTrend.data, borderColor: "#F2B705", backgroundColor: "rgba(242,183,5,.15)", fill: true, tension: .3 }] },
    options: baseLineOptions()
  });

  new Chart(document.getElementById("chart-apps-month"), {
    type: "bar",
    data: { labels: a.applicationsPerMonth.labels, datasets: [{ data: a.applicationsPerMonth.data, backgroundColor: "#3DDC97" }] },
    options: baseLineOptions()
  });

  new Chart(document.getElementById("chart-selection"), {
    type: "doughnut",
    data: { labels: ["Selected","Rejected","Pending"], datasets: [{ data: [a.selectionRate.selected, a.selectionRate.rejected, a.selectionRate.pending], backgroundColor: ["#3DDC97","#FF6B6B","#F2B705"] }] },
    options: { plugins: { legend: { position: "bottom" } } }
  });

  new Chart(document.getElementById("chart-coding-growth"), {
    type: "line",
    data: { labels: a.codingGrowth.labels, datasets: [{ data: a.codingGrowth.data, borderColor: "#3DDC97", backgroundColor: "rgba(61,220,151,.15)", fill: true, tension: .3 }] },
    options: baseLineOptions()
  });

  new Chart(document.getElementById("chart-aptitude-improve"), {
    type: "bar",
    data: { labels: a.aptitudeImprovement.labels, datasets: [{ data: a.aptitudeImprovement.data, backgroundColor: "#F2B705" }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } } }
  });
}

loadAnalytics();
