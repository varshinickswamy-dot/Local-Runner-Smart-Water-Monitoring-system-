// =====================================================
// JalRakshak AI - Backend address
// =====================================================
//
// Change the backend address in ONE place. For a deployed
// site, set VITE_API_BASE_URL in frontend/.env, e.g.
//   VITE_API_BASE_URL=https://api.example.com

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// ws:// for http backends, wss:// for https backends
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");
