import { t } from "../i18n.js";
import { esc, $, toast, errMsg, openModal, confirmDialog, pill, fmtDateTime, typeName, downloadCSV, debounce } from "../ui.js";
import * as api from "../api.js";

const STATUSES = ["available", "reserved", "borrowed", "maintenance", "damaged", "lost"];

// =====================================================================
//  DASHBOARD
// =====================================================================
export function dashboard(root) {
  let types = [], units = [], pending = [], issues = [];
  root.innerHTML = `<h1>${esc(t("admin.dashboard"))}</h1><div id="sum" class="summary"></div><div class="table-wrap"><table class="sheet" id="tbl"></table></div>`;
  function draw() {
    const open = issues.filter((i) => i.resolutionStatus === "open").length;
    $("#sum", root).innerHTML = `
      <div><span>${esc(t("admin.totalUnits"))}</span><b>${units.length}</b></div>
      <div class="g"><span>${esc(t("st.available"))}</span><b>${units.filter((u) => u.status === "available").length}</b></div>
      <div class="a"><span>${esc(t("st.pending_collection"))}</span><b>${pending.length}</b></div>
      <div class="r"><span>${esc(t("issues.title"))}</span><b>${open}</b></div>`;
    $("#tbl", root).innerHTML = `<thead><tr><th>${esc(t("col.equipment"))}</th><th class="num">Total</th>${STATUSES.map((s) => `<th class="num">${esc(t(`st.${s}`))}</th>`).join("")}</tr></thead>
      <tbody>${types.map((ty) => {
        const us = units.filter((u) => u.typeId === ty.id);
        return `<tr><td><b>${esc(typeName(ty))}</b></td><td class="num">${us.length}</td>${STATUSES.map((s) => `<td class="num">${us.filter((u) => u.status === s).length || "–"}</td>`).join("")}</tr>`;
      }).join("") || `<tr><td colspan="8" class="empty">${esc(t("inv.empty"))}</td></tr>`}</tbody>`;
  }
  const u = [
    api.watchTypes((x) => { types = x.sort((a, b) => (a.name || "").localeCompare(b.name || "")); draw(); }),
    api.watchUnits((x) => { units = x; draw(); }),
    api.watchPending((x) => { pending = x; draw(); }),
  ];
  api.listIssues().then((x) => { issues = x; draw(); }).catch(() => {});
  return () => u.forEach((f) => f());
}

// =====================================================================
//  INVENTORY MANAGEMENT
// =====================================================================
export function inventory(root) {
  let types = [], units = [];
  root.innerHTML = `
    <div class="page-head"><h1>${esc(t("admin.inventory"))}</h1>
      <button class="btn primary" id="add">${esc(t("admin.addType"))}</button></div>
    <div id="seed"></div>
    <div id="list" class="stack"></div>`;

  function draw() {
    $("#seed", root).innerHTML = types.length ? "" : `
      <div class="banner warn"><div><b>${esc(t("admin.noInventory"))}</b><br><span class="small">${esc(t("admin.seedHint"))}</span></div>
      <button class="btn primary" id="seedBtn">${esc(t("admin.seed"))}</button></div>`;
    const sb = $("#seedBtn", root);
    if (sb) sb.onclick = async () => {
      sb.disabled = true;
      try { await api.seedInventory(); toast(t("common.saved")); } catch (er) { toast(errMsg(er), "err"); sb.disabled = false; }
    };
    $("#list", root).innerHTML = types.map((ty) => {
      const us = units.filter((u) => u.typeId === ty.id);
      return `<article class="card" data-type="${esc(ty.id)}">
        <header class="card-head">
          <div><h3>${esc(typeName(ty))} <span class="muted small">/ ${esc(ty.nameMs || "")}</span></h3><p class="muted small">${esc(ty.brand || "")} · ${esc(ty.prefix)}</p></div>
          <div class="btn-row"><button class="btn small" data-img>${esc(t("admin.setImage"))}</button><button class="btn small" data-addu>${esc(t("admin.addUnits"))}</button></div>
        </header>
        <div class="unit-grid">${us.map((u) => `
          <label class="unit s-${esc(u.status)}"><b class="mono">${esc(u.assetCode)}</b>
            <select data-unit="${esc(u.id)}" ${["reserved", "borrowed"].includes(u.status) ? "disabled" : ""}>
              ${STATUSES.map((s) => `<option value="${s}" ${s === u.status ? "selected" : ""} ${["reserved", "borrowed"].includes(s) && s !== u.status ? "disabled" : ""}>${esc(t(`st.${s}`))}</option>`).join("")}
            </select></label>`).join("")}</div>
      </article>`;
    }).join("");
  }

  root.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-unit]");
    if (!sel) return;
    try { await api.setUnitStatus(sel.dataset.unit, sel.value); toast(t("common.saved")); } catch (er) { toast(errMsg(er), "err"); draw(); }
  });
  root.addEventListener("click", async (e) => {
    const card = e.target.closest("[data-type]");
    if (!card) return;
    const ty = types.find((x) => x.id === card.dataset.type);
    if (e.target.closest("[data-addu]")) {
      const m = openModal(`<h3>${esc(t("admin.addUnits"))}: ${esc(typeName(ty))}</h3>
        <form id="f" class="form"><label>${esc(t("col.qty"))}<input type="number" name="n" min="1" max="50" value="1" required></label>
        <div class="modal-actions"><button type="button" class="btn" data-close>${esc(t("common.cancel"))}</button><button class="btn primary">${esc(t("common.save"))}</button></div></form>`);
      $("#f", m.el).onsubmit = async (ev) => {
        ev.preventDefault();
        try { await api.addUnits(ty, parseInt(new FormData(ev.target).get("n"), 10)); m.close(); toast(t("common.saved")); } catch (er) { toast(errMsg(er), "err"); }
      };
    } else if (e.target.closest("[data-img]")) {
      const url = prompt(t("admin.imagePrompt"), ty.imageUrl || "");
      if (url === null) return;
      try { await api.setTypeImage(ty.id, url.trim()); toast(t("common.saved")); } catch (er) { toast(errMsg(er), "err"); }
    }
  });
  $("#add", root).onclick = () => {
    const m = openModal(`<h3>${esc(t("admin.addType"))}</h3>
      <form id="f" class="form">
        <label>${esc(t("admin.nameEn"))}<input name="name" required maxlength="80"></label>
        <label>${esc(t("admin.nameMs"))}<input name="nameMs" maxlength="80"></label>
        <label>${esc(t("admin.brand"))}<input name="brand" maxlength="60"></label>
        <div class="grid2">
          <label>${esc(t("admin.prefix"))}<input name="prefix" required maxlength="5" pattern="[A-Za-z]{2,5}" placeholder="BSK"></label>
          <label>${esc(t("col.qty"))}<input type="number" name="qty" min="0" max="50" value="1"></label>
        </div>
        <div class="modal-actions"><button type="button" class="btn" data-close>${esc(t("common.cancel"))}</button><button class="btn primary">${esc(t("common.save"))}</button></div>
      </form>`);
    $("#f", m.el).onsubmit = async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      try { await api.addType({ ...f, qty: parseInt(f.qty, 10) || 0 }); m.close(); toast(t("common.saved")); } catch (er) { toast(errMsg(er), "err"); }
    };
  };
  const u1 = api.watchTypes((x) => { types = x.sort((a, b) => (a.name || "").localeCompare(b.name || "")); draw(); });
  const u2 = api.watchUnits((x) => { units = x; draw(); });
  return () => { u1(); u2(); };
}

// =====================================================================
//  USERS
// =====================================================================
export function users(root) {
  let list = [], search = "";
  root.innerHTML = `
    <div class="page-head"><h1>${esc(t("admin.users"))}</h1><input id="q" class="search" type="search" placeholder="${esc(t("admin.searchUser"))}"></div>
    <div class="table-wrap"><table class="sheet" id="tbl"></table></div>`;
  const roles = api.isSuper() ? ["student", "sports_exco", "admin", "super_admin"] : ["student", "sports_exco"];
  function draw() {
    const s = search.toLowerCase();
    const rows = list.filter((u) => !s || `${u.fullName} ${u.studentId} ${u.dorm}`.toLowerCase().includes(s));
    $("#tbl", root).innerHTML = `<thead><tr><th>${esc(t("profile.fullName"))}</th><th>${esc(t("profile.studentId"))}</th><th>${esc(t("profile.dorm"))}</th><th>${esc(t("col.role"))}</th><th>${esc(t("col.status"))}</th></tr></thead>
      <tbody>${rows.map((u) => {
        const self = u.id === api.state.user.uid;
        const locked = self || (!api.isSuper() && ["admin", "super_admin"].includes(u.role));
        return `<tr data-id="${esc(u.id)}"><td>${esc(u.fullName)}</td><td>${esc(u.studentId)}</td><td>${esc(u.dorm)} ${esc(u.roomNumber)}</td>
          <td><select data-role ${locked ? "disabled" : ""}>${(roles.includes(u.role) ? roles : [...roles, u.role]).map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${esc(t(`role.${r}`))}</option>`).join("")}</select></td>
          <td><select data-status ${locked ? "disabled" : ""}>${["active", "suspended"].map((s2) => `<option value="${s2}" ${s2 === u.accountStatus ? "selected" : ""}>${esc(t(`acct.${s2}`))}</option>`).join("")}</select></td></tr>`;
      }).join("")}</tbody>`;
  }
  root.addEventListener("change", async (e) => {
    const row = e.target.closest("[data-id]");
    if (!row) return;
    const id = row.dataset.id;
    try {
      if (e.target.matches("[data-role]")) { await api.setUserRole(id, e.target.value); list.find((u) => u.id === id).role = e.target.value; }
      if (e.target.matches("[data-status]")) { await api.setUserStatus(id, e.target.value); list.find((u) => u.id === id).accountStatus = e.target.value; }
      toast(t("common.saved"));
    } catch (er) { toast(errMsg(er), "err"); draw(); }
  });
  $("#q", root).addEventListener("input", debounce((e) => { search = e.target.value.trim(); draw(); }, 150));
  api.listUsers().then((x) => { list = x; draw(); }).catch((e) => toast(errMsg(e), "err"));
}

// =====================================================================
//  ALL REQUESTS
// =====================================================================
export function requests(root) {
  let list = [], flt = "all", search = "";
  root.innerHTML = `
    <div class="page-head"><h1>${esc(t("admin.requests"))}</h1></div>
    <div class="toolbar">
      <input id="q" class="search" type="search" placeholder="${esc(t("common.searchRequest"))}">
      <select id="flt"><option value="all">${esc(t("flt.all"))}</option>${["pending_collection", "collected", "partially_returned", "returned", "expired", "cancelled"].map((s) => `<option value="${s}">${esc(t(`st.${s}`))}</option>`).join("")}</select>
      <button class="btn" id="csv">${esc(t("common.exportCsv"))}</button>
    </div>
    <div class="table-wrap"><table class="sheet" id="tbl"></table></div>`;
  const rows = () => list.filter((r) => (flt === "all" || r.status === flt) &&
    (!search || `${r.requestCode} ${r.studentName} ${r.items.map((i) => i.assetCode).join(" ")}`.toLowerCase().includes(search.toLowerCase())));
  function draw() {
    $("#tbl", root).innerHTML = `<thead><tr><th>${esc(t("col.requestId"))}</th><th>${esc(t("col.student"))}</th><th>${esc(t("col.itemId"))}</th><th>${esc(t("col.borrowTime"))}</th><th>${esc(t("col.status"))}</th></tr></thead>
      <tbody>${rows().map((r) => `<tr><td class="mono"><a href="#/receipt/${esc(r.id)}">${esc(r.requestCode)}</a></td><td>${esc(r.studentName)}</td>
        <td class="mono">${esc(r.items.map((i) => i.assetCode).join(", "))}</td><td>${esc(fmtDateTime(r.requestedAt))}</td><td>${pill(r.status)}</td></tr>`).join("")
        || `<tr><td colspan="5" class="empty">${esc(t("daily.empty"))}</td></tr>`}</tbody>`;
  }
  $("#q", root).addEventListener("input", debounce((e) => { search = e.target.value.trim(); draw(); }, 150));
  $("#flt", root).onchange = (e) => { flt = e.target.value; draw(); };
  $("#csv", root).onclick = () => downloadCSV("requests.csv", [
    [t("col.requestId"), t("col.student"), t("col.itemId"), t("col.borrowTime"), t("col.status")],
    ...rows().map((r) => [r.requestCode, r.studentName, r.items.map((i) => i.assetCode).join(" "), fmtDateTime(r.requestedAt), r.status]),
  ]);
  api.listRequests().then((x) => { list = x; draw(); }).catch((e) => toast(errMsg(e), "err"));
}

// =====================================================================
//  ACTIVITY LOGS
// =====================================================================
export function logs(root) {
  root.innerHTML = `
    <div class="page-head"><h1>${esc(t("admin.logs"))}</h1><button class="btn" id="csv">${esc(t("common.exportCsv"))}</button></div>
    <div class="table-wrap"><table class="sheet" id="tbl"></table></div>`;
  let list = [];
  const label = (a) => { const k = `log.${a}`; const x = t(k); return x === k ? a : x; };
  $("#csv", root).onclick = () => downloadCSV("activity-log.csv", [["time", "actor", "role", "action", "entity", "details"],
    ...list.map((l) => [fmtDateTime(l.createdAt), l.actorName, l.actorRole, l.action, `${l.entityType}:${l.entityId}`, JSON.stringify(l.details || {})])]);
  api.listLogs().then((x) => {
    list = x;
    $("#tbl", root).innerHTML = `<thead><tr><th>${esc(t("common.date"))}</th><th>${esc(t("col.user"))}</th><th>${esc(t("col.action"))}</th><th>${esc(t("col.details"))}</th></tr></thead>
      <tbody>${x.map((l) => `<tr><td>${esc(fmtDateTime(l.createdAt))}</td><td>${esc(l.actorName)} <span class="muted small">${esc(l.actorRole)}</span></td>
        <td>${esc(label(l.action))}</td><td class="small mono">${esc(JSON.stringify(l.details || {}))}</td></tr>`).join("")}</tbody>`;
  }).catch((e) => toast(errMsg(e), "err"));
}

// =====================================================================
//  SETTINGS
// =====================================================================
export function settings(root) {
  const s = api.state.settings;
  root.innerHTML = `
    <h1>${esc(t("admin.settings"))}</h1>
    <section class="card narrow">
      <form id="f" class="form">
        <label>${esc(t("set.expire"))}<input type="number" name="expireMinutes" min="3" max="30" value="${esc(s.expireMinutes)}" required></label>
        <label>${esc(t("set.maxItems"))}<input type="number" name="maxItemsPerRequest" min="1" max="30" value="${esc(s.maxItemsPerRequest)}" required></label>
        <fieldset><legend>${esc(t("hours.weekday"))}</legend>
          <div class="grid2"><input type="time" name="wdStart" value="${esc(s.hours.weekday.start)}" required><input type="time" name="wdEnd" value="${esc(s.hours.weekday.end)}" required></div></fieldset>
        <fieldset><legend>${esc(t("hours.weekend"))}</legend>
          <div class="grid2"><input type="time" name="weStart" value="${esc(s.hours.weekend.start)}" required><input type="time" name="weEnd" value="${esc(s.hours.weekend.end)}" required></div></fieldset>
        <label class="inline check"><input type="checkbox" name="enforceHours" ${s.enforceHours ? "checked" : ""}> ${esc(t("set.enforce"))}</label>
        <button class="btn primary" type="submit">${esc(t("common.save"))}</button>
      </form>
    </section>`;
  $("#f", root).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.saveSettings({
        expireMinutes: parseInt(f.get("expireMinutes"), 10), maxItemsPerRequest: parseInt(f.get("maxItemsPerRequest"), 10),
        enforceHours: f.get("enforceHours") === "on",
        hours: { weekday: { start: f.get("wdStart"), end: f.get("wdEnd") }, weekend: { start: f.get("weStart"), end: f.get("weEnd") } },
      });
      toast(t("common.saved"));
    } catch (er) { toast(errMsg(er), "err"); }
  };
}
