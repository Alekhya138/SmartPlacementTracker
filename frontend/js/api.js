/* ============================================================
   API CONFIG + FETCH WRAPPER
   Set API_BASE_URL to your API Gateway invoke URL after deploy.
   e.g. "https://abc123.execute-api.ap-south-1.amazonaws.com/prod"
   ============================================================ */

const API_BASE_URL = "https://1qnlmsh239.execute-api.us-east-1.amazonaws.com";
const Api = {
  token(){
    return localStorage.getItem("spt_token");
  },

  setToken(token, user){
    localStorage.setItem("spt_token", token);
    localStorage.setItem("spt_user", JSON.stringify(user || {}));
  },

  currentUser(){
    try{ return JSON.parse(localStorage.getItem("spt_user") || "null"); }
    catch(e){ return null; }
  },

  logout(){
    localStorage.removeItem("spt_token");
    localStorage.removeItem("spt_user");
    window.location.href = "index.html";
  },

  requireAuth(){
    if(!this.token()){
      window.location.href = "index.html";
    }
  },

  async request(path, { method = "GET", body = null, auth = true } = {}){
    const headers = { "Content-Type": "application/json" };
    if(auth && this.token()){
      headers["Authorization"] = `Bearer ${this.token()}`;
    }

    let res;
    try{
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    }catch(networkErr){
      throw new Error("Could not reach the server. Check your internet connection or API URL.");
    }

    let data = null;
    try{ data = await res.json(); }catch(e){ /* empty body */ }

    if(res.status === 401){
      this.logout();
      throw new Error("Session expired. Please log in again.");
    }

    if(!res.ok){
      throw new Error((data && (data.message || data.error)) || `Request failed (${res.status})`);
    }

    return data;
  },

  get(path){ return this.request(path, { method: "GET" }); },
  post(path, body){ return this.request(path, { method: "POST", body }); },
  put(path, body){ return this.request(path, { method: "PUT", body }); },
  del(path){ return this.request(path, { method: "DELETE" }); }
};
