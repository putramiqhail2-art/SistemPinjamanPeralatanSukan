import { t, locale } from "./i18n.js";

export const TZ = "Asia/Kuala_Lumpur";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const debounce = (fn, ms = 200) => {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
};

// ---------- dates (always Asia/Kuala_Lumpur) ----------
export const toDate = (ts) => (!ts ? null : ts.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts));
const fmt = (opts) => (ts) => { const d = toDate(ts); return d ? new Intl.DateTimeFormat(locale(), { timeZone: TZ, ...opts }).format(d) : "-"; };
export const fmtDateTime = (ts) => fmt({ day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })(ts);
export const fmtTime = (ts) => fmt({ hour: "numeric", minute: "2-digit" })(ts);
export const fmtDate = (ts) => fmt({ day: "2-digit", month: "short", year: "numeric" })(ts);
/** YYYY-MM-DD in Kuala Lumpur */
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
export const dayStart = (key) => new Date(`${key}T00:00:00+08:00`);
export const dayEnd = (key) => new Date(dayStart(key).getTime() + 24 * 3600 * 1000);

// ---------- feedback ----------
export function toast(msg, type = "ok") {
  const root = $("#toast-root");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.classList.add("out"), 2600);
  setTimeout(() => el.remove(), 3100);
}

export function errMsg(e) {
  const code = e && e.code ? String(e.code) : "";
  const key = `err.${code}`;
  const txt = t(key, e && e.vars);
  if (txt !== key) return txt;
  if (code.startsWith("auth/")) {
    const k2 = `err.${code}`;
    return t(k2) === k2 ? t("err.auth/generic") : t(k2);
  }
  if (code === "permission-denied") return t("err.permission-denied");
  console.error(e);
  return t("err.generic");
}

// ---------- modal ----------
export function openModal(innerHtml, { wide = false } = {}) {
  const root = $("#modal-root");
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${innerHtml}</div>`;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  $$("[data-close]", wrap).forEach((b) => b.addEventListener("click", close));
  const first = wrap.querySelector("input,select,textarea,button.primary,button");
  if (first) first.focus();
  return { el: wrap.firstElementChild, wrap, close };
}

export function confirmDialog({ title, body = "", okText, danger = false }) {
  return new Promise((resolve) => {
    const m = openModal(`
      <h3>${esc(title)}</h3>
      ${body ? `<p class="muted">${body}</p>` : ""}
      <div class="modal-actions">
        <button class="btn" data-no>${esc(t("common.cancel"))}</button>
        <button class="btn ${danger ? "danger" : "primary"}" data-yes>${esc(okText || t("common.confirm"))}</button>
      </div>`);
    m.el.querySelector("[data-no]").onclick = () => { m.close(); resolve(false); };
    m.el.querySelector("[data-yes]").onclick = () => { m.close(); resolve(true); };
    m.wrap.addEventListener("click", (e) => { if (e.target === m.wrap) resolve(false); });
  });
}

// ---------- status pills ----------
export const pill = (status) => `<span class="pill s-${esc(status)}">${esc(t(`st.${status}`))}</span>`;

// ---------- CSV (UTF-8 BOM so Excel opens it correctly) ----------
export function downloadCSV(filename, rows) {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = "\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Equipment name in the active language. Works for types (name/nameMs) and items/units (typeName/typeNameMs). */
export const typeName = (o) =>
  locale().startsWith("ms")
    ? o.typeNameMs || o.nameMs || o.typeName || o.name || ""
    : o.typeName || o.name || "";
