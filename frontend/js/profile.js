/* ============================================================
   PROFILE PAGE LOGIC
   ============================================================ */

Api.requireAuth();
renderSidebar("profile.html");

let certifications = [];
let projects = [];

function renderChips(containerId, items, onRemove){
  const el = document.getElementById(containerId);
  if(items.length === 0){
    el.innerHTML = `<div class="stat-sub">Nothing added yet.</div>`;
    return;
  }
  el.innerHTML = items.map((item, i) => `
    <div class="bar-row" style="border-bottom:1px solid var(--border); padding-bottom:8px;">
      <span>${item}</span>
      <button type="button" class="icon-btn" onclick="${onRemove}(${i})">Remove</button>
    </div>
  `).join("");
}

function removeCert(i){ certifications.splice(i, 1); renderChips("cert-list", certifications, "removeCert"); }
function removeProject(i){ projects.splice(i, 1); renderChips("project-list", projects, "removeProject"); }

document.getElementById("add-cert").addEventListener("click", () => {
  const input = document.getElementById("cert-input");
  if(input.value.trim()){
    certifications.push(input.value.trim());
    input.value = "";
    renderChips("cert-list", certifications, "removeCert");
  }
});

document.getElementById("add-project").addEventListener("click", () => {
  const input = document.getElementById("project-input");
  if(input.value.trim()){
    projects.push(input.value.trim());
    input.value = "";
    renderChips("project-list", projects, "removeProject");
  }
});

async function loadProfile(){
  try{
    const p = await Api.get("/profile");
    document.getElementById("p-name").value = p.name || "";
    document.getElementById("p-email").value = p.email || "";
    document.getElementById("p-phone").value = p.phone || "";
    document.getElementById("p-college").value = p.college || "";
    document.getElementById("p-branch").value = p.branch || "";
    document.getElementById("p-cgpa").value = p.cgpa || "";
    document.getElementById("p-skills").value = (p.skills || []).join(", ");
    document.getElementById("p-languages").value = (p.languages || []).join(", ");
    document.getElementById("p-linkedin").value = p.linkedin || "";
    document.getElementById("p-github").value = p.github || "";
    document.getElementById("p-leetcode").value = p.leetcode || "";
    document.getElementById("p-hackerrank").value = p.hackerrank || "";
    certifications = p.certifications || [];
    projects = p.projects || [];
    renderChips("cert-list", certifications, "removeCert");
    renderChips("project-list", projects, "removeProject");
    document.getElementById("resume-status").textContent = p.resumeUrl ? "Resume on file." : "No resume uploaded yet.";
  }catch(err){
    const user = Api.currentUser();
    document.getElementById("p-name").value = (user && user.name) || "";
    document.getElementById("p-email").value = (user && user.email) || "";
    renderChips("cert-list", certifications, "removeCert");
    renderChips("project-list", projects, "removeProject");
    toast("Could not load saved profile — starting from a blank form.", "info");
  }
}

document.getElementById("save-btn").addEventListener("click", async () => {
  const payload = {
    name: document.getElementById("p-name").value.trim(),
    phone: document.getElementById("p-phone").value.trim(),
    college: document.getElementById("p-college").value.trim(),
    branch: document.getElementById("p-branch").value.trim(),
    cgpa: Number(document.getElementById("p-cgpa").value) || null,
    skills: document.getElementById("p-skills").value.split(",").map(s=>s.trim()).filter(Boolean),
    languages: document.getElementById("p-languages").value.split(",").map(s=>s.trim()).filter(Boolean),
    linkedin: document.getElementById("p-linkedin").value.trim(),
    github: document.getElementById("p-github").value.trim(),
    leetcode: document.getElementById("p-leetcode").value.trim(),
    hackerrank: document.getElementById("p-hackerrank").value.trim(),
    certifications,
    projects
  };

  try{
    await Api.put("/profile", payload);
    toast("Profile saved.", "success");
  }catch(err){
    toast(err.message, "error");
  }
});

// Resume upload via S3 presigned URL
document.getElementById("resume-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if(!file) return;

  try{
    const { uploadUrl, fileUrl } = await Api.post("/resume/upload-url", { fileName: file.name, contentType: file.type });
    await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    await Api.put("/profile", { resumeUrl: fileUrl });
    document.getElementById("resume-status").textContent = "Resume uploaded successfully.";
    toast("Resume uploaded.", "success");
  }catch(err){
    toast("Resume upload failed: " + err.message, "error");
  }
});

loadProfile();
