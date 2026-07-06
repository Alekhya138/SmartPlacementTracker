/* ============================================================
   COMPANY TRACKER LOGIC
   ============================================================ */

Api.requireAuth();
renderSidebar("companies.html");

let allCompanies = [];

const DEMO_COMPANIES = [
  { id: "demo1", name: "TCS", role: "Software Engineer", package: 7, location: "Hyderabad", status: "Applied", applicationDate: "2026-06-01", deadline: "2026-07-15" },
  { id: "demo2", name: "Infosys", role: "AI Engineer", package: 9, location: "Bangalore", status: "OA Cleared", applicationDate: "2026-05-20", deadline: "2026-06-30" },
];

async function loadCompanies(){
  try{
    allCompanies = await Api.get("/companies");
  }catch(err){
    allCompanies = DEMO_COMPANIES;
    toast("Showing demo data — connect API_BASE_URL to see your live data.", "info");
  }
  renderSummary();
  renderTable();
}

function renderSummary(){
  const total = allCompanies.length;
  const selected = allCompanies.filter(c => c.status === "Selected").length;
  const rejected = allCompanies.filter(c => c.status === "Rejected").length;
  const pending = total - selected - rejected;

  document.getElementById("summary-cards").innerHTML = `
    <div class="card"><div class="label">Total applications</div><div class="stat-value mt-8">${total}</div></div>
    <div class="card"><div class="label">Selected</div><div class="stat-value mt-8" style="color:var(--go)">${selected}</div></div>
    <div class="card"><div class="label">Pending</div><div class="stat-value mt-8" style="color:var(--caution)">${pending}</div></div>
    <div class="card"><div class="label">Rejected</div><div class="stat-value mt-8" style="color:var(--hold)">${rejected}</div></div>
  `;
}

function renderTable(){
  const search = document.getElementById("search-input").value.toLowerCase();
  const statusFilter = document.getElementById("status-filter").value;

  const filtered = allCompanies.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search) || c.role.toLowerCase().includes(search);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  document.getElementById("empty-state").classList.toggle("hidden", filtered.length !== 0);

  document.getElementById("companies-tbody").innerHTML = filtered.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.role}</td>
      <td>${c.package ? c.package + " LPA" : "—"}</td>
      <td>${c.location || "—"}</td>
      <td class="mono">${c.deadline || "—"}</td>
      <td><span class="pill ${statusPillClass(c.status)}">${c.status}</span></td>
      <td>
        <button class="icon-btn" onclick="editCompany('${c.id}')">Edit</button>
        <button class="icon-btn" onclick="deleteCompany('${c.id}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

document.getElementById("search-input").addEventListener("input", renderTable);
document.getElementById("status-filter").addEventListener("change", renderTable);

function openModal(company){
  document.getElementById("modal-title").textContent = company ? "Edit company" : "Add company";
  document.getElementById("c-id").value = company ? company.id : "";
  document.getElementById("c-name").value = company ? company.name : "";
  document.getElementById("c-role").value = company ? company.role : "";
  document.getElementById("c-package").value = company ? company.package : "";
  document.getElementById("c-location").value = company ? company.location : "";
  document.getElementById("c-status").value = company ? company.status : "Interested";
  document.getElementById("c-appdate").value = company ? company.applicationDate : "";
  document.getElementById("c-deadline").value = company ? company.deadline : "";
  document.getElementById("modal-backdrop").classList.remove("hidden");
}

document.getElementById("open-add").addEventListener("click", () => openModal(null));
document.getElementById("close-modal").addEventListener("click", () => document.getElementById("modal-backdrop").classList.add("hidden"));

function editCompany(id){
  openModal(allCompanies.find(c => c.id === id));
}

async function deleteCompany(id){
  if(!confirm("Remove this application from your tracker?")) return;
  try{
    await Api.del(`/companies/${id}`);
  }catch(err){ /* demo mode: ignore */ }
  allCompanies = allCompanies.filter(c => c.id !== id);
  renderSummary();
  renderTable();
  toast("Application removed.", "success");
}

document.getElementById("company-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("c-id").value;
  const payload = {
    name: document.getElementById("c-name").value.trim(),
    role: document.getElementById("c-role").value.trim(),
    package: Number(document.getElementById("c-package").value) || null,
    location: document.getElementById("c-location").value.trim(),
    status: document.getElementById("c-status").value,
    applicationDate: document.getElementById("c-appdate").value,
    deadline: document.getElementById("c-deadline").value
  };

  try{
    if(id){
      await Api.put(`/companies/${id}`, payload);
      allCompanies = allCompanies.map(c => c.id === id ? { ...c, ...payload } : c);
    }else{
      const created = await Api.post("/companies", payload);
      allCompanies.push(created);
    }
  }catch(err){
    // demo mode fallback so the UI still works before AWS is wired up
    if(id){
      allCompanies = allCompanies.map(c => c.id === id ? { ...c, ...payload } : c);
    }else{
      allCompanies.push({ id: "local-" + Date.now(), ...payload });
    }
  }

  document.getElementById("modal-backdrop").classList.add("hidden");
  renderSummary();
  renderTable();
  toast("Saved.", "success");
});

loadCompanies();
