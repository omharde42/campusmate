/**
 * CampusMate API client.
 *
 * Talks to the FastAPI backend under `/api`. When the backend is unreachable
 * (for example, a static-only preview deployment) every call falls back to a
 * local demo engine so the interface stays fully explorable. The fallback is
 * clearly surfaced in the UI via `mode` ("live" | "offline").
 */

import { offlineAnswer, OFFLINE_NOTICES } from "./offlineEngine.js";

const BASE = import.meta.env.VITE_API_BASE || "/api";

let authToken = sessionStorage.getItem("cm-admin-token") || null;

export function getMode() {
  return mode;
}
let mode = "live"; // becomes "offline" after the first failed request

function setMode(next) {
  mode = next;
}

async function request(path, { method = "GET", body, form, auth = false } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* non-JSON error */
    }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  const type = res.headers.get("content-type") || "";
  return type.includes("application/json") ? res.json() : res.text();
}

/** Wrap a live call with the offline fallback. */
async function withFallback(liveFn, offlineFn) {
  if (mode === "offline") return offlineFn();
  try {
    const result = await liveFn();
    setMode("live");
    return result;
  } catch (error) {
    if (error.status && error.status < 500) throw error; // real validation error
    setMode("offline");
    return offlineFn();
  }
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  "Admissions",
  "Fees",
  "Examinations",
  "Timetables",
  "College activities",
];

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
export function askCampusMate(question, context = {}) {
  return withFallback(
    () => request("/chat", { method: "POST", body: { question, context } }),
    () => offlineAnswer(question, context)
  );
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export function listDocuments() {
  return withFallback(
    () => request("/documents"),
    () => OFFLINE_NOTICES
  );
}

export function getDocument(docUid) {
  return withFallback(
    () => request(`/documents/${docUid}`),
    () => OFFLINE_NOTICES.find((d) => d.doc_uid === docUid) || null
  );
}

export function sourceUrl(docUid) {
  return `${BASE}/documents/${docUid}/source`;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
export function createTicket(payload) {
  return withFallback(
    () => request("/tickets", { method: "POST", body: payload }),
    () => ({
      ...payload,
      id: Date.now(),
      reference: `CM-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      offline: true,
    })
  );
}

export function getTicket(reference) {
  return withFallback(
    () => request(`/tickets/${reference}`),
    () => null
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  authToken = data.access_token;
  sessionStorage.setItem("cm-admin-token", authToken);
  return data;
}

export function logout() {
  authToken = null;
  sessionStorage.removeItem("cm-admin-token");
}

export function isLoggedIn() {
  return Boolean(authToken);
}

export function currentAdmin() {
  return withFallback(() => request("/auth/me", { auth: true }), () => null);
}

export function adminOverview() {
  return withFallback(
    () => request("/admin/overview", { auth: true }),
    () => ({
      total_notices: OFFLINE_NOTICES.length,
      published_notices: OFFLINE_NOTICES.filter((n) => n.status === "published")
        .length,
      replaced_notices: OFFLINE_NOTICES.filter((n) => n.status === "replaced")
        .length,
      pending_tickets: 0,
      resolved_tickets: 0,
      unanswered_categories: {},
      active_knowledge_version: "kv-offline",
      is_sample_data: true,
    })
  );
}

export function adminListNotices() {
  return withFallback(
    () => request("/admin/notices", { auth: true }),
    () => OFFLINE_NOTICES
  );
}

export function adminUploadNotice(formData) {
  return request("/admin/notices", { method: "POST", form: formData, auth: true });
}

export function adminPublishNotice(id) {
  return request(`/admin/notices/${id}/publish`, { method: "POST", auth: true });
}

export function adminRetireNotice(id) {
  return request(`/admin/notices/${id}/retire`, { method: "POST", auth: true });
}

export function adminReindex(id) {
  return request(`/admin/notices/${id}/reindex`, { method: "POST", auth: true });
}

export function adminVersionHistory(id) {
  return request(`/admin/notices/${id}/versions`, { auth: true });
}

export function adminExtracted(id) {
  return request(`/admin/notices/${id}/extracted`, { auth: true });
}

export function adminListTickets(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v)
  ).toString();
  return withFallback(
    () => request(`/admin/tickets${params ? `?${params}` : ""}`, { auth: true }),
    () => []
  );
}

export function adminTicketDetail(id) {
  return request(`/admin/tickets/${id}`, { auth: true });
}

export function adminAddMessage(id, payload) {
  return request(`/admin/tickets/${id}/messages`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function adminUpdateTicketStatus(id, status) {
  return request(`/admin/tickets/${id}`, {
    method: "PATCH",
    body: { status },
    auth: true,
  });
}
