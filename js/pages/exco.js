import { t } from "../i18n.js";
import { esc, $, $$, toast, errMsg, openModal, confirmDialog, pill, fmtDateTime, fmtTime, dayKey, dayStart, dayEnd, typeName, downloadCSV, debounce } from "../ui.js";
import * as api from "../api.js";

// =====================================================================
//  PICKUP QUEUE  (requests waiting to be prepared / handed over)
// =====================================================================
export function queue(root) {
  let list = [], search = "";
  root.innerHTML = `
    <div class="page-head">
      <h1>${esc(t("queue.title"))}</h1>
      <input id="q" class="search" type="search" placeholder="${esc(t("common.searchRequest"))}">
    </div>
    <p class="muted">${esc(t("queue.hint"))}</p>
    <div id="list" class="stack"></div>`;

  const left = (r) => api.tsMs(r.pickupExpiresAt) - api.nowMs();
  function draw() {
    const s = search.toLowerCase();
    const rows = list.filter((r) => !s || `${r.requestCode} ${r.studentName} ${r.studentNo} ${r.items.map((i) => i.assetCode).join(" ")}`.toLowerCase().includes(s));
    $("#list", root).innerHTML = rows.length
      ? rows.map((r) => `
        <article class="req-card" data-id="${esc(r.id)}">
          <header>
            <div><span class="code">${esc(r.requestCode)}</span>
              <div>${esc(r.studentName)} <span class="muted small">${esc(r.studentNo)} · ${esc(r.dorm)} ${esc(r.room)}</span></div></div>
            <div class="cd-wrap"><span class="small muted">${esc(t("queue.expiresIn"))}</span><b class="cd" data-cd="${esc(r.id)}">--:--</b></div>
          </header>
          <ul class="chips big">${r.items.map((i) => `<li><b>${esc(i.assetCode)}</b> ${esc(typeName(i))}</li>`).join("")}</ul>
          <footer><button class="btn primary" data-collect>${esc(t("queue.markCollected"))}</button></footer>
        </article>`).join("")
      : `<p class="empty">${esc(t("queue.empty"))}</p>`;
    tick();
  }
  let sweepAt = 0;
  function tick() {
    let expired = false;
    list.forEach((r) => {
      const el = $(`[data-cd="${r.id}"]`, root);
      if (!el) return;
      const l = left(r);
      if (l <= 0) { el.textContent = t("st.expired"); el.classList.add("urgent"); expired = true; return; }
      const s = Math.floor(l / 1000);
      el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      el.classList.toggle("urgent", s < 120);
    });
    if (expired && Date.now() - sweepAt > 8000) { sweepAt = Date.now(); api.sweepExpired().catch(() => {}); }
  }

  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-collect]");
    if (!b) return;
    const id = b.closest("[data-id]").dataset.id;
    b.disabled = true;
    try { await api.collectRequest(id); toast(t("queue.collectedOk")); }
    catch (er) { toast(errMsg(er), "err"); b.disabled = false; }
  });
  $("#q", root).addEventListener("input", debounce((e) => { search = e.target.value.trim(); draw(); }, 150));

  const un = api.watchPending((x) => { list = x; draw(); });
  const iv = setInterval(tick, 1000);
  return () => { un(); clearInterval(iv); };
}

// =====================================================================
//  DAILY EQUIPMENT MANAGEMENT  (Exco home page - spreadsheet style)
// =====================================================================
const PAGE_SIZE = 20; // requests per page

export function daily(root) {
  let date = dayKey(new Date(api.nowMs()));
  let search = "", filter = "all", outstanding = true, page = 0;
  let dayRows = [], openRows = [];
  let unDay = null, unOpen = null;
  const busy = new Set();

  root.innerHTML = `
    <div class="page-head">
      <h1>${esc(t("daily.title"))}</h1>
    </div>
    <div class="toolbar">
      <label class="inline">${esc(t("common.date"))} <input type="date" id="date" value="${date}"></label>
      <input id="q" class="search" type="search" placeholder="${esc(t("daily.search"))}">
      <select id="flt" aria-label="${esc(t("daily.filter"))}">
        ${["all", "not_returned", "returned", "issues"].map((k) => `<option value="${k}">${esc(t(`flt.${k}`))}</option>`).join("")}
      </select>
      <label class="inline check"><input type="checkbox" id="outs" checked> ${esc(t("daily.includeOutstanding"))}</label>
      <button class="btn" id="csv">${esc(t("common.exportCsv"))}</button>
    </div>
    <div id="sum" class="summary"></div>
    <div class="table-wrap"><table class="sheet" id="tbl"></table></div>
    <div id="pager" class="pager"></div>`;

  const merged = () => {
    const m = new Map();
    dayRows.forEach((r) => m.set(r.id, r));
    if (outstanding) openRows.forEach((r) => m.set(r.id, r));
    return [...m.values()];
  };
  const isIssue = (r) => r.hasIssue || r.status === "lost";
  const visible = () => {
    const s = search.toLowerCase();
    return merged().filter((r) => {
      if (filter === "not_returned" && r.status !== "borrowed") return false;
      if (filter === "returned" && !(r.status === "returned" && !r.hasIssue)) return false;
      if (filter === "issues" && !isIssue(r)) return false;
      return !s || `${r.requestCode} ${r.studentName} ${r.assetCode} ${r.typeName} ${r.typeNameMs || ""}`.toLowerCase().includes(s);
    });
  };

  function draw() {
    const all = merged();
    const nBorrowed = all.length;
    const nOut = all.filter((r) => r.status === "borrowed").length;
    const nRet = all.filter((r) => r.status === "returned" || r.status === "lost").length;
    const nIss = all.filter(isIssue).length;
    $("#sum", root).innerHTML = `
      <div><span>${esc(t("sum.borrowed"))}</span><b>${nBorrowed}</b></div>
      <div class="g"><span>${esc(t("sum.returned"))}</span><b>${nRet}</b></div>
      <div class="a"><span>${esc(t("sum.notReturned"))}</span><b>${nOut}</b></div>
      <div class="r"><span>${esc(t("sum.issues"))}</span><b>${nIss}</b></div>`;

    // group by request
    const rows = visible();
    const groups = new Map();
    rows.forEach((r) => { if (!groups.has(r.requestId)) groups.set(r.requestId, []); groups.get(r.requestId).push(r); });
    const glist = [...groups.values()]
      .map((g) => g.sort((a, b) => a.assetCode.localeCompare(b.assetCode, undefined, { numeric: true })))
      .sort((a, b) => api.tsMs(b[0].borrowedAt) - api.tsMs(a[0].borrowedAt));
    const pages = Math.max(1, Math.ceil(glist.length / PAGE_SIZE));
    if (page >= pages) page = pages - 1;
    const slice = glist.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const head = `<thead><tr>
      <th>${esc(t("col.requestId"))}</th><th>${esc(t("col.student"))}</th><th>${esc(t("col.itemId"))}</th>
      <th>${esc(t("col.equipment"))}</th><th>${esc(t("col.borrowTime"))}</th><th>${esc(t("col.returnStatus"))}</th><th>${esc(t("col.action"))}</th></tr></thead>`;
    const body = slice.length
      ? slice.map((g) => {
          const open = g.filter((r) => r.status === "borrowed");
          const grp = `<tr class="grp"><td colspan="7">
              <span><b>${esc(g[0].requestCode)}</b> · ${esc(g[0].studentName)}</span>
              ${open.length > 1 ? `<button class="btn small" data-all="${esc(g[0].requestId)}">${esc(t("daily.markAll"))} (${open.length})</button>` : ""}
            </td></tr>`;
          const lines = g.map((r) => {
            const done = r.status !== "borrowed";
            const st = r.status === "lost" ? pill("lost")
              : r.status === "returned" ? (r.hasIssue ? `${pill("returned")} ${pill("issue")}` : pill("returned"))
              : pill("borrowed");
            return `<tr class="${done ? "done" : ""}" data-item="${esc(r.id)}">
              <td class="mono">${esc(r.requestCode)}</td><td>${esc(r.studentName)}</td>
              <td class="mono"><b>${esc(r.assetCode)}</b></td><td>${esc(typeName(r))}</td>
              <td>${esc(fmtTime(r.borrowedAt))}</td><td>${st}</td>
              <td class="act">
                <label class="chk"><input type="checkbox" data-ret ${done ? "checked disabled" : ""} ${busy.has(r.id) ? "disabled" : ""} aria-label="${esc(t("daily.markReturned"))}"><span></span></label>
                ${done ? "" : `<button class="btn small" data-issue>${esc(t("daily.issue"))}</button>`}
              </td></tr>`;
          }).join("");
          return grp + lines;
        }).join("")
      : `<tr><td colspan="7" class="empty">${esc(t("daily.empty"))}</td></tr>`;
    $("#tbl", root).innerHTML = head + `<tbody>${body}</tbody>`;
    $("#pager", root).innerHTML = pages > 1
      ? `<button class="btn small" data-pg="-1" ${page === 0 ? "disabled" : ""}>‹</button><span>${page + 1} / ${pages}</span><button class="btn small" data-pg="1" ${page >= pages - 1 ? "disabled" : ""}>›</button>`
      : "";
  }

  function subscribe() {
    unDay && unDay();
    unDay = api.watchItemsBetween(dayStart(date), dayEnd(date), (x) => { dayRows = x; draw(); });
  }
  unOpen = api.watchItemsByStatus("borrowed", (x) => { openRows = x; draw(); });
  subscribe();

  const find = (id) => merged().find((r) => r.id === id);

  root.addEventListener("change", async (e) => {
    const cb = e.target.closest("[data-ret]");
    if (!cb) return;
    const row = find(cb.closest("[data-item]").dataset.item);
    if (!row || !cb.checked) return;
    busy.add(row.id); cb.disabled = true;
    try { await api.returnItems(row.requestId, [{ assetCode: row.assetCode, condition: "good" }]); toast(`${row.assetCode} ✓ ${t("daily.returnedOk")}`); }
    catch (er) { toast(errMsg(er), "err"); cb.checked = false; }
    busy.delete(row.id); draw();
  });

  root.addEventListener("click", async (e) => {
    const pg = e.target.closest("[data-pg]");
    if (pg) { page += Number(pg.dataset.pg); draw(); return; }

    const all = e.target.closest("[data-all]");
    if (all) {
      const reqId = all.dataset.all;
      const open = merged().filter((r) => r.requestId === reqId && r.status === "borrowed");
      const ok = await confirmDialog({
        title: t("daily.markAllTitle"),
        body: `<b>${esc(open[0].requestCode)}</b> · ${esc(open[0].studentName)}<br>${open.map((o) => esc(o.assetCode)).join(", ")}<br><br>${esc(t("daily.markAllBody"))}`,
        okText: t("daily.markAll"),
      });
      if (!ok) return;
      all.disabled = true;
      try { await api.returnItems(reqId, open.map((o) => ({ assetCode: o.assetCode, condition: "good" }))); toast(t("daily.allReturnedOk")); }
      catch (er) { toast(errMsg(er), "err"); all.disabled = false; }
      return;
    }

    const iss = e.target.closest("[data-issue]");
    if (iss) {
      const row = find(iss.closest("[data-item]").dataset.item);
      if (row) issueModal(row);
    }
  });

  function issueModal(row) {
    const m = openModal(`
      <h3>${esc(t("issue.title"))}: <span class="mono">${esc(row.assetCode)}</span></h3>
      <p class="muted small">${esc(typeName(row))} · ${esc(row.requestCode)} · ${esc(row.studentName)}</p>
      <form class="form" id="f">
        <label>${esc(t("issue.type"))}
          <select name="condition">${["damaged", "lost", "missing_parts", "other"].map((k) => `<option value="${k}">${esc(t(`issue.t.${k}`))}</option>`).join("")}</select></label>
        <label>${esc(t("issue.action"))}
          <select name="action">${["repair", "inspection", "unusable", "follow_up"].map((k) => `<option value="${k}">${esc(t(`issue.a.${k}`))}</option>`).join("")}</select></label>
        <label>${esc(t("issue.notes"))}<textarea name="notes" rows="3" maxlength="500"></textarea></label>
        <p class="muted small">${esc(t("issue.note"))}</p>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>${esc(t("common.cancel"))}</button>
          <button class="btn danger" type="submit">${esc(t("issue.save"))}</button>
        </div>
      </form>`);
    $("#f", m.el).onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      e.submitter && (e.submitter.disabled = true);
      try { await api.returnItems(row.requestId, [{ assetCode: row.assetCode, condition: f.condition, action: f.action, notes: f.notes.trim() }]); m.close(); toast(t("issue.saved")); }
      catch (er) { toast(errMsg(er), "err"); e.submitter && (e.submitter.disabled = false); }
    };
  }

  $("#date", root).onchange = (e) => { date = e.target.value || date; page = 0; subscribe(); };
  $("#q", root).addEventListener("input", debounce((e) => { search = e.target.value.trim(); page = 0; draw(); }, 150));
  $("#flt", root).onchange = (e) => { filter = e.target.value; page = 0; draw(); };
  $("#outs", root).onchange = (e) => { outstanding = e.target.checked; page = 0; draw(); };
  $("#csv", root).onclick = () => {
    const rows = visible();
    downloadCSV(`daily-${date}.csv`, [
      [t("col.requestId"), t("col.student"), t("col.itemId"), t("col.equipment"), t("col.borrowTime"), t("col.returnStatus"), t("col.returnTime"), t("col.condition")],
      ...rows.map((r) => [r.requestCode, r.studentName, r.assetCode, r.typeName, fmtDateTime(r.borrowedAt), r.status, r.returnedAt ? fmtDateTime(r.returnedAt) : "", r.returnCondition || ""]),
    ]);
  };

  return () => { unDay && unDay(); unOpen && unOpen(); };
}

// =====================================================================
//  DAILY CLOSING REPORT
// =====================================================================
export function closing(root) {
  let date = dayKey(new Date(api.nowMs()));
  let dayRows = [], openRows = [], issues = [], unDay = null;
  root.innerHTML = `
    <div class="page-head no-print">
      <h1>${esc(t("closing.title"))}</h1>
      <div class="toolbar">
        <label class="inline">${esc(t("common.date"))} <input type="date" id="date" value="${date}"></label>
        <button class="btn" id="csv">${esc(t("common.exportCsv"))}</button>
        <button class="btn" id="print">${esc(t("common.print"))}</button>
      </div>
    </div>
    <div class="print-only"><img src="assets/kv-logo.png" alt="" class="ticket-logo"> <b>ASRAMA SPORTS HUB</b> – ${esc(t("closing.title"))}</div>
    <div id="sum" class="summary"></div>
    <h2>${esc(t("closing.followUp"))}</h2>
    <div class="table-wrap"><table class="sheet" id="tbl"></table></div>`;

  const issueSet = () => new Set(issues.filter((i) => i.resolutionStatus === "open").map((i) => i.assetCode));
  function draw() {
    const returned = dayRows.filter((r) => r.status === "returned" || r.status === "lost").length;
    const withIssue = dayRows.filter((r) => r.hasIssue || r.status === "lost").length;
    const openIssues = issues.filter((i) => i.resolutionStatus === "open");
    $("#sum", root).innerHTML = `
      <div><span>${esc(t("sum.borrowedToday"))}</span><b>${dayRows.length}</b></div>
      <div class="g"><span>${esc(t("sum.returned"))}</span><b>${returned}</b></div>
      <div class="a"><span>${esc(t("sum.notReturnedAll"))}</span><b>${openRows.length}</b></div>
      <div class="r"><span>${esc(t("sum.issues"))}</span><b>${withIssue}</b></div>`;

    const lines = [
      ...openRows.map((r) => ({ code: r.assetCode, name: typeName(r), what: pill("borrowed"), who: `${r.studentName} (${r.requestCode})`, when: fmtDateTime(r.borrowedAt) })),
      ...openIssues.map((i) => ({ code: i.assetCode, name: typeName(i), what: `${pill("issue")} ${esc(t(`issue.t.${i.issueType}`))} → ${esc(t(`issue.a.${i.actionRequired}`))}`, who: `${i.studentName || ""} (${i.requestCode || ""})`, when: fmtDateTime(i.reportedAt) })),
    ].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    $("#tbl", root).innerHTML = `<thead><tr><th>${esc(t("col.itemId"))}</th><th>${esc(t("col.equipment"))}</th><th>${esc(t("col.returnStatus"))}</th><th>${esc(t("col.student"))}</th><th>${esc(t("common.date"))}</th></tr></thead>
      <tbody>${lines.length ? lines.map((l) => `<tr><td class="mono"><b>${esc(l.code)}</b></td><td>${esc(l.name)}</td><td>${l.what}</td><td>${esc(l.who)}</td><td>${esc(l.when)}</td></tr>`).join("")
        : `<tr><td colspan="5" class="empty ok-text">${esc(t("closing.allClear"))}</td></tr>`}</tbody>`;
  }
  function subscribe() { unDay && unDay(); unDay = api.watchItemsBetween(dayStart(date), dayEnd(date), (x) => { dayRows = x; draw(); }); }
  const unOpen = api.watchItemsByStatus("borrowed", (x) => { openRows = x; draw(); });
  api.listIssues().then((x) => { issues = x; draw(); }).catch((e) => toast(errMsg(e), "err"));
  subscribe();
  $("#date", root).onchange = (e) => { date = e.target.value || date; subscribe(); };
  $("#print", root).onclick = () => window.print();
  $("#csv", root).onclick = () => downloadCSV(`closing-${date}.csv`, [
    [t("col.itemId"), t("col.equipment"), t("col.returnStatus"), t("col.student"), t("col.requestId")],
    ...openRows.map((r) => [r.assetCode, r.typeName, "borrowed", r.studentName, r.requestCode]),
    ...issues.filter((i) => i.resolutionStatus === "open").map((i) => [i.assetCode, i.typeName, `${i.issueType}/${i.actionRequired}`, i.studentName || "", i.requestCode || ""]),
  ]);
  return () => { unDay && unDay(); unOpen(); };
}

// =====================================================================
//  EQUIPMENT ISSUES
// =====================================================================
export function issues(root) {
  let list = [], flt = "open";
  root.innerHTML = `
    <div class="page-head"><h1>${esc(t("issues.title"))}</h1>
      <select id="flt">${["open", "resolved", "all"].map((k) => `<option value="${k}">${esc(t(`issues.f.${k}`))}</option>`).join("")}</select></div>
    <div class="table-wrap"><table class="sheet" id="tbl"></table></div>`;
  function draw() {
    const rows = list.filter((i) => flt === "all" || i.resolutionStatus === flt);
    $("#tbl", root).innerHTML = `<thead><tr>
      <th>${esc(t("col.itemId"))}</th><th>${esc(t("col.equipment"))}</th><th>${esc(t("issue.type"))}</th><th>${esc(t("issue.action"))}</th>
      <th>${esc(t("issue.notes"))}</th><th>${esc(t("col.reportedBy"))}</th><th>${esc(t("common.date"))}</th><th>${esc(t("col.status"))}</th><th></th></tr></thead>
      <tbody>${rows.length ? rows.map((i) => `<tr data-id="${esc(i.id)}">
        <td class="mono"><b>${esc(i.assetCode)}</b></td><td>${esc(typeName(i))}</td>
        <td>${esc(t(`issue.t.${i.issueType}`))}</td><td>${esc(t(`issue.a.${i.actionRequired}`))}</td>
        <td>${esc(i.notes)}</td><td>${esc(i.reportedByName)}</td><td>${esc(fmtDateTime(i.reportedAt))}</td>
        <td>${pill(i.resolutionStatus === "open" ? "issue" : "returned")}</td>
        <td>${i.resolutionStatus === "open" ? `<button class="btn small" data-resolve>${esc(t("issues.resolve"))}</button>` : ""}</td></tr>`).join("")
        : `<tr><td colspan="9" class="empty">${esc(t("issues.empty"))}</td></tr>`}</tbody>`;
  }
  async function load() { try { list = await api.listIssues(); draw(); } catch (e) { toast(errMsg(e), "err"); } }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-resolve]");
    if (!b) return;
    const id = b.closest("[data-id]").dataset.id;
    const m = openModal(`
      <h3>${esc(t("issues.resolve"))}</h3>
      <p class="muted">${esc(t("issues.resolveBody"))}</p>
      <div class="modal-actions">
        <button class="btn" data-close>${esc(t("common.cancel"))}</button>
        <button class="btn" id="no">${esc(t("issues.closeOnly"))}</button>
        <button class="btn primary" id="yes">${esc(t("issues.restock"))}</button>
      </div>`);
    const go = (restock) => async () => {
      try { await api.resolveIssue(id, restock); m.close(); toast(t("common.saved")); load(); } catch (er) { toast(errMsg(er), "err"); }
    };
    $("#yes", m.el).onclick = go(true);
    $("#no", m.el).onclick = go(false);
  });
  $("#flt", root).onchange = (e) => { flt = e.target.value; draw(); };
  load();
}
