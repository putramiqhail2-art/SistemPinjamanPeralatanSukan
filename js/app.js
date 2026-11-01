import { t, getLang, setLang } from "./i18n.js";
import { esc, $, toast } from "./ui.js";
import * as api from "./api.js";
import * as auth from "./pages/auth.js";
import * as student from "./pages/student.js";
import * as exco from "./pages/exco.js";
import * as admin from "./pages/admin.js";

const STUDENT = ["student", "sports_exco", "admin", "super_admin"];
const STAFF = ["sports_exco", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];

// path pattern -> page. `pub` = only for signed-out visitors.
const ROUTES = [
  { re: /^\/login$/, fn: auth.login, pub: true },
  { re: /^\/signup$/, fn: auth.signup, pub: true },
  { re: /^\/home$/, fn: student.home, roles: STUDENT },
  { re: /^\/inventory$/, fn: student.inventory, roles: STUDENT },
  { re: /^\/receipt\/([\w-]+)$/, fn: student.receipt, roles: STUDENT, params: ["id"] },
  { re: /^\/active$/, fn: student.active, roles: STUDENT },
  { re: /^\/history$/, fn: student.history, roles: STUDENT },
  { re: /^\/profile$/, fn: student.profile, roles: STUDENT },
  { re: /^\/queue$/, fn: exco.queue, roles: STAFF },
  { re: /^\/exco$/, fn: exco.daily, roles: STAFF },
  { re: /^\/closing$/, fn: exco.closing, roles: STAFF },
  { re: /^\/issues$/, fn: exco.issues, roles: STAFF },
  { re: /^\/admin$/, fn: admin.dashboard, roles: ADMIN },
  { re: /^\/admin\/inventory$/, fn: admin.inventory, roles: ADMIN },
  { re: /^\/admin\/users$/, fn: admin.users, roles: ADMIN },
  { re: /^\/admin\/requests$/, fn: admin.requests, roles: ADMIN },
  { re: /^\/admin\/logs$/, fn: admin.logs, roles: ADMIN },
  { re: /^\/admin\/settings$/, fn: admin.settings, roles: ADMIN },
];

const NAV = {
  student: [["/home", "nav.home"], ["/inventory", "nav.inventory"], ["/active", "nav.active"], ["/history", "nav.history"], ["/profile", "nav.profile"]],
  staff: [["/exco", "nav.daily"], ["/queue", "nav.queue"], ["/closing", "nav.closing"], ["/issues", "nav.issues"], ["/inventory", "nav.inventory"], ["/profile", "nav.profile"]],
  admin: [["/admin", "nav.dashboard"], ["/admin/inventory", "nav.adminInventory"], ["/admin/users", "nav.users"], ["/admin/requests", "nav.requests"], ["/admin/logs", "nav.logs"], ["/admin/settings", "nav.settings"]],
};

let ready = false, cleanup = null;

const homeFor = (role) => (ADMIN.includes(role) ? "/admin" : role === "sports_exco" ? "/exco" : "/home");

function match(path) {
  for (const r of ROUTES) {
    const m = path.match(r.re);
    if (m) return { ...r, p: Object.fromEntries((r.params || []).map((k, i) => [k, m[i + 1]])) };
  }
  return null;
}

function renderChrome(path) {
  const u = api.state.user, p = api.state.profile;
  $("#topbar").innerHTML = `
    <a class="brand" href="#${u && p ? homeFor(p.role) : "/login"}" aria-label="ASRAMA SPORTS HUB">
      <img src="assets/kv-logo.png" alt="Kolej Vokasional Tengku Ampuan Afzan" class="brand-logo">
      <span class="brand-name">${esc(t("app.name"))}</span>
    </a>
    <div class="top-actions">
      <div class="lang" role="group" aria-label="Language">
        <button data-lang="en" class="${getLang() === "en" ? "on" : ""}">EN</button><button data-lang="ms" class="${getLang() === "ms" ? "on" : ""}">BM</button>
      </div>
      ${u && p ? `<span class="who">${esc(p.fullName.split(" ")[0])}<small>${esc(t(`role.${p.role}`))}</small></span><button class="btn small" id="logout">${esc(t("auth.logout"))}</button>` : ""}
    </div>`;

  let links = [];
  if (u && p) {
    if (p.role === "student") links = NAV.student;
    else { links = NAV.staff; if (ADMIN.includes(p.role)) links = [...links, ...NAV.admin]; }
  }
  $("#navbar").hidden = !links.length;
  $("#navbar").innerHTML = links.map(([to, key]) => `<a href="#${to}" class="${path === to || (to !== "/admin" && path.startsWith(to + "/")) ? "on" : ""}">${esc(t(key))}</a>`).join("");
  $("#footer").innerHTML = `<img src="assets/kv-logo.png" alt="" class="foot-logo"><span>${esc(t("footer.college"))}</span>`;
}

async function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  const path = location.hash.slice(1) || "/";
  const view = $("#view");
  renderChrome(path);

  if (!api.configured) { auth.setup(view); return; }
  if (!ready) { view.innerHTML = `<p class="empty">${esc(t("common.loading"))}</p>`; return; }

  const m = match(path);
  const p = api.state.profile;
  if (!api.state.user || !p) {
    if (!m || !m.pub) { location.hash = "#/login"; return; }
  } else if (!m || m.pub || !m.roles.includes(p.role)) {
    location.hash = `#${homeFor(p.role)}`; return;
  }
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  cleanup = m.fn(view, m.p) || null;
  view.focus({ preventScroll: true });
}

document.addEventListener("click", (e) => {
  const lb = e.target.closest("[data-lang]");
  if (lb) { setLang(lb.dataset.lang); route(); return; }
  if (e.target.closest("#logout")) api.logOut();
});
window.addEventListener("hashchange", route);

setLang(getLang());
if (api.configured) {
  api.watchAuth((user, reason) => {
    ready = true;
    if (reason === "suspended") toast(t("auth.suspended"), "err");
    if (!user && location.hash.slice(1) && !/^#\/(login|signup)/.test(location.hash)) location.hash = "#/login";
    route();
    if (user) api.sweepExpired().catch(() => {});
  });
  // Expired requests are released by whoever has the app open (see README for the Cloud Function that does it with nobody online).
  setInterval(() => { if (api.state.user && !document.hidden) api.sweepExpired().catch(() => {}); }, 30000);
} else {
  route();
}
