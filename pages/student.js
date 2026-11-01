import { t } from "../i18n.js";
import { esc, $, $$, toast, errMsg, openModal, confirmDialog, pill, fmtDateTime, fmtTime, typeName, TZ } from "../ui.js";
import * as api from "../api.js";

// ---------- operating hours (Asia/Kuala_Lumpur, configurable in settings) ----------
export function hoursInfo() {
  const s = api.state.settings;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(api.nowMs()));
  const get = (k) => parts.find((p) => p.type === k).value;
  const weekend = ["Sat", "Sun"].includes(get("weekday"));
  const h = weekend ? s.hours.weekend : s.hours.weekday;
  const cur = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
  const m = (x) => { const [a, b] = x.split(":").map(Number); return a * 60 + b; };
  return { open: cur >= m(h.start) && cur < m(h.end), window: h, weekend };
}
const to12 = (x) => { const [h, m] = x.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
export function hoursBanner() {
  const h = hoursInfo();
  return `<div class="banner ${h.open ? "ok" : "warn"}">
    <b>${esc(t(h.open ? "hours.open" : "hours.closed"))}</b>
    <span>${esc(t(h.weekend ? "hours.weekend" : "hours.weekday"))}: ${to12(h.window.start)} – ${to12(h.window.end)}</span>
  </div>`;
}

const ACTIVE = ["pending_collection", "collected", "partially_returned"];

// ---------- request card used on dashboard + my borrowings + history ----------
function requestCard(r, itemsByReq) {
  const items = (itemsByReq?.[r.id] || []).length ? itemsByReq[r.id] : r.items.map((i) => ({ ...i, status: null }));
  return `
  <article class="req-card">
    <header>
      <div><a class="code" href="#/receipt/${esc(r.id)}">${esc(r.requestCode)}</a>
        <div class="muted small">${esc(fmtDateTime(r.requestedAt))}</div></div>
      ${pill(r.status)}
    </header>
    ${r.status === "pending_collection" ? `<p class="small warn-text">${esc(t("receipt.collectBefore", { time: fmtTime(r.pickupExpiresAt) }))}</p>` : ""}
    <ul class="chips">${items.map((i) => `<li><b>${esc(i.assetCode)}</b> ${esc(typeName(i))}${i.status && i.status !== "reserved" ? ` ${pill(i.status)}` : ""}</li>`).join("")}</ul>
    <footer><a class="btn small" href="#/receipt/${esc(r.id)}">${esc(t("student.viewReceipt"))}</a></footer>
  </article>`;
}

function watchRequestsAndItems(cb) {
  let reqs = [], items = {};
  const push = () => cb(reqs, items);
  const u1 = api.watchMyRequests((r) => { reqs = r; push(); });
  const u2 = api.watchMyItems((arr) => {
    items = {};
    arr.forEach((i) => (items[i.requestId] ||= []).push(i));
    Object.values(items).forEach((l) => l.sort((a, b) => a.assetCode.localeCompare(b.assetCode, undefined, { numeric: true })));
    push();
  });
  return () => { u1(); u2(); };
}

// =====================================================================
export function home(root) {
  const name = api.state.profile.fullName.split(" ")[0];
  root.innerHTML = `
    <h1>${esc(t("student.hello", { name }))}</h1>
    ${hoursBanner()}
    <div class="cta-row"><a class="btn primary big" href="#/inventory">${esc(t("student.borrowNow"))}</a></div>
    <h2>${esc(t("student.activeTitle"))}</h2>
    <div id="list" class="stack"></div>`;
  return watchRequestsAndItems((reqs, items) => {
    const act = reqs.filter((r) => ACTIVE.includes(r.status));
    $("#list", root).innerHTML = act.length ? act.map((r) => requestCard(r, items)).join("") : `<p class="empty">${esc(t("student.noActive"))}</p>`;
  });
}

export function active(root) {
  root.innerHTML = `<h1>${esc(t("nav.active"))}</h1><div id="list" class="stack"></div>`;
  return watchRequestsAndItems((reqs, items) => {
    const act = reqs.filter((r) => ACTIVE.includes(r.status));
    $("#list", root).innerHTML = act.length ? act.map((r) => requestCard(r, items)).join("") : `<p class="empty">${esc(t("student.noActive"))}</p>`;
  });
}

export function history(root) {
  root.innerHTML = `<h1>${esc(t("nav.history"))}</h1><div id="list" class="stack"></div>`;
  return watchRequestsAndItems((reqs, items) => {
    $("#list", root).innerHTML = reqs.length ? reqs.map((r) => requestCard(r, items)).join("") : `<p class="empty">${esc(t("student.noHistory"))}</p>`;
  });
}

// =====================================================================
//  INVENTORY + CART
// =====================================================================
let cart = {};

export function inventory(root) {
  let types = [], units = [];
  root.innerHTML = `
    <h1>${esc(t("nav.inventory"))}</h1>
    ${hoursBanner()}
    <div id="grid" class="eq-grid"></div>
    <div id="cartbar" class="cartbar" hidden></div>`;

  const avail = (typeId) => units.filter((u) => u.typeId === typeId && api_isFree(u)).length;

  function draw() {
    const maxItems = api.state.settings.maxItemsPerRequest;
    $("#grid", root).innerHTML = types.length
      ? types.map((ty) => {
          const total = units.filter((u) => u.typeId === ty.id).length;
          const a = avail(ty.id);
          const q = Math.min(cart[ty.id] || 0, a);
          if (q) cart[ty.id] = q; else delete cart[ty.id];
          return `
          <article class="eq ${a ? "" : "empty"}" data-type="${esc(ty.id)}">
            <div class="eq-img">${ty.imageUrl ? `<img src="${esc(ty.imageUrl)}" alt="" loading="lazy">` : `<span>${esc(ty.prefix || "?")}</span>`}</div>
            <div class="eq-body">
              <h3>${esc(typeName(ty))}</h3>
              <p class="muted small">${esc(ty.brand || "")}</p>
              <p class="avail ${a ? "ok" : "none"}"><b>${a}</b> / ${total} · ${esc(t(a ? "inv.available" : "inv.noStock"))}</p>
              ${a
                ? `<div class="stepper">
                     <button class="btn icon" data-dec aria-label="-" ${q ? "" : "disabled"}>−</button>
                     <span class="qty">${q}</span>
                     <button class="btn icon" data-inc aria-label="+" ${q >= a ? "disabled" : ""}>+</button>
                   </div>`
                : `<button class="btn" disabled>${esc(t("inv.noStock"))}</button>`}
            </div>
          </article>`;
        }).join("")
      : `<p class="empty">${esc(t("inv.empty"))}</p>`;

    const total = Object.values(cart).reduce((x, y) => x + y, 0);
    const bar = $("#cartbar", root);
    bar.hidden = !total;
    bar.innerHTML = total
      ? `<span><b>${total}</b> ${esc(t("inv.itemsSelected"))}${total > maxItems ? ` <span class="warn-text">(max ${maxItems})</span>` : ""}</span>
         <button class="btn primary" id="review">${esc(t("inv.review"))}</button>`
      : "";
    const rv = $("#review", root);
    if (rv) rv.onclick = review;
  }

  function review() {
    const typesById = Object.fromEntries(types.map((x) => [x.id, x]));
    const lines = Object.entries(cart).map(([id, q]) => `<tr><td>${esc(typeName(typesById[id]))}</td><td class="num">${q}</td></tr>`).join("");
    const m = openModal(`
      <h3>${esc(t("inv.reviewTitle"))}</h3>
      <table class="tbl"><thead><tr><th>${esc(t("col.equipment"))}</th><th class="num">${esc(t("col.qty"))}</th></tr></thead><tbody>${lines}</tbody></table>
      <p class="muted small">${esc(t("inv.expireNote", { min: api.state.settings.expireMinutes }))}</p>
      <div class="modal-actions">
        <button class="btn" data-close>${esc(t("common.cancel"))}</button>
        <button class="btn primary" id="submit">${esc(t("inv.submit"))}</button>
      </div>`);
    $("#submit", m.el).onclick = async (e) => {
      e.target.disabled = true;
      try {
        if (api.state.settings.enforceHours && !hoursInfo().open) throw api.err("closed");
        const id = await api.createBorrow(cart, typesById);
        cart = {};
        m.close();
        location.hash = `#/receipt/${id}`;
      } catch (er) { toast(errMsg(er), "err"); e.target.disabled = false; }
    };
  }

  root.addEventListener("click", (e) => {
    const card = e.target.closest("[data-type]");
    if (!card) return;
    const id = card.dataset.type;
    if (e.target.closest("[data-inc]")) cart[id] = (cart[id] || 0) + 1;
    else if (e.target.closest("[data-dec]")) { cart[id] = (cart[id] || 1) - 1; if (cart[id] <= 0) delete cart[id]; }
    else return;
    draw();
  });

  const u1 = api.watchTypes((x) => { types = x.sort((a, b) => (a.name || "").localeCompare(b.name || "")); draw(); });
  const u2 = api.watchUnits((x) => { units = x; draw(); });
  const tick = setInterval(draw, 15000); // reservations lapse with time, refresh counts
  return () => { u1(); u2(); clearInterval(tick); };
}
const api_isFree = (u) => u.status === "available" || (u.status === "reserved" && u.reservedUntil && api.tsMs(u.reservedUntil) < api.nowMs() - 2000);

// =====================================================================
//  DIGITAL RECEIPT
// =====================================================================
export function receipt(root, params) {
  root.innerHTML = `<div id="rc"></div>`;
  let r = null, timer = null, swept = false;

  function draw() {
    const box = $("#rc", root);
    if (!r) { box.innerHTML = `<p class="empty">${esc(t("receipt.notFound"))}</p>`; return; }
    const pending = r.status === "pending_collection";
    box.innerHTML = `
      <section class="ticket">
        <div class="ticket-head">
          <img src="assets/kv-logo.png" alt="Kolej Vokasional" class="ticket-logo">
          <div><b>ASRAMA SPORTS HUB</b><div class="small muted">${esc(t("receipt.digital"))}</div></div>
        </div>
        <div class="ticket-code"><span class="small muted">${esc(t("receipt.requestId"))}</span><strong>${esc(r.requestCode)}</strong></div>
        <div class="ticket-status">
          ${pill(r.status)}
          ${pending ? `<div class="countdown"><div class="small">${esc(t("receipt.collectBefore", { time: fmtTime(r.pickupExpiresAt) }))}</div><div id="cd" class="cd">--:--</div></div>` : ""}
        </div>
        <dl class="kv">
          <dt>${esc(t("receipt.student"))}</dt><dd>${esc(r.studentName)}</dd>
          ${r.studentNo ? `<dt>${esc(t("profile.studentId"))}</dt><dd>${esc(r.studentNo)}</dd>` : ""}
          ${r.dorm ? `<dt>${esc(t("receipt.dormRoom"))}</dt><dd>${esc(r.dorm)}${r.room ? ` / ${esc(r.room)}` : ""}</dd>` : ""}
          <dt>${esc(t("receipt.requested"))}</dt><dd>${esc(fmtDateTime(r.requestedAt))}</dd>
          <dt>${esc(t("receipt.expires"))}</dt><dd>${esc(fmtDateTime(r.pickupExpiresAt))}</dd>
          ${r.collectedAt ? `<dt>${esc(t("receipt.collected"))}</dt><dd>${esc(fmtDateTime(r.collectedAt))}</dd>` : ""}
        </dl>
        <table class="tbl">
          <thead><tr><th>${esc(t("col.itemId"))}</th><th>${esc(t("col.equipment"))}</th></tr></thead>
          <tbody>${r.items.map((i) => `<tr><td class="mono"><b>${esc(i.assetCode)}</b></td><td>${esc(typeName(i))}</td></tr>`).join("")}</tbody>
        </table>
        <p class="small muted note">${esc(t("receipt.disclaimer"))}</p>
        <div class="ticket-actions no-print">
          <button class="btn" id="print">${esc(t("common.print"))}</button>
          ${pending && r.studentUid === api.state.user.uid ? `<button class="btn danger" id="cancel">${esc(t("receipt.cancel"))}</button>` : ""}
          <a class="btn" href="#/active">${esc(t("nav.active"))}</a>
        </div>
      </section>`;
    $("#print", box).onclick = () => window.print();
    const c = $("#cancel", box);
    if (c) c.onclick = async () => {
      if (!(await confirmDialog({ title: t("receipt.cancelTitle"), body: esc(t("receipt.cancelBody")), okText: t("receipt.cancel"), danger: true }))) return;
      try { await api.cancelRequest(r.id); toast(t("receipt.cancelled")); } catch (er) { toast(errMsg(er), "err"); }
    };
    tickCountdown();
  }

  function tickCountdown() {
    const el = $("#cd", root);
    if (!el || !r) return;
    const left = api.tsMs(r.pickupExpiresAt) - api.nowMs();
    if (left <= 0) {
      el.textContent = t("st.expired");
      if (!swept) { swept = true; api.sweepExpired().catch(() => {}); }
      return;
    }
    const s = Math.floor(left / 1000);
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    el.classList.toggle("urgent", s < 120);
  }

  const un = api.watchRequest(params.id, (x) => { r = x; swept = false; draw(); }, () => { r = null; draw(); });
  timer = setInterval(tickCountdown, 1000);
  return () => { un(); clearInterval(timer); };
}

// =====================================================================
//  PROFILE
// =====================================================================
export function profile(root) {
  const p = api.state.profile;
  root.innerHTML = `
    <h1>${esc(t("nav.profile"))}</h1>
    <section class="card narrow">
      <p class="muted small">${esc(api.state.user.email)} · <span class="pill s-role">${esc(t(`role.${p.role}`))}</span></p>
      <form id="f" class="form">
        <label>${esc(t("profile.fullName"))}<input name="fullName" required maxlength="80" value="${esc(p.fullName)}"></label>
        <label>${esc(t("profile.studentId"))}<input name="studentId" maxlength="30" value="${esc(p.studentId)}"></label>
        <div class="grid2">
          <label>${esc(t("profile.dorm"))}<input name="dorm" maxlength="30" value="${esc(p.dorm)}"></label>
          <label>${esc(t("profile.room"))}<input name="roomNumber" maxlength="10" value="${esc(p.roomNumber)}"></label>
        </div>
        <label>${esc(t("profile.year"))}<input name="studyYear" maxlength="20" value="${esc(p.studyYear)}"></label>
        <button class="btn primary" type="submit">${esc(t("common.save"))}</button>
      </form>
    </section>
    <p><button class="btn" id="out">${esc(t("auth.logout"))}</button></p>`;
  $("#f", root).onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { await api.updateMyProfile(f); toast(t("common.saved")); } catch (er) { toast(errMsg(er), "err"); }
  };
  $("#out", root).onclick = () => api.logOut();
}
