import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocFromServer, setDoc, updateDoc, collection, query, where, orderBy,
  limit, getDocs, runTransaction, writeBatch, serverTimestamp, Timestamp, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { dayKey } from "./ui.js";

export const configured = !String(firebaseConfig.apiKey).startsWith("PASTE");
let auth = null, db = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}
export { Timestamp, onSnapshot, collection, query, where, orderBy, limit, doc };
export const getDb = () => db;

export const DEFAULT_SETTINGS = {
  expireMinutes: 10,
  maxItemsPerRequest: 6,
  enforceHours: false,
  hours: {
    weekday: { start: "17:00", end: "19:00" }, // Mon-Fri 5pm-7pm
    weekend: { start: "07:00", end: "11:00" }, // Sat-Sun 7am-11am
  },
};

export const state = { user: null, profile: null, settings: { ...DEFAULT_SETTINGS }, offset: 0, signingUp: false };

export const err = (code, vars) => Object.assign(new Error(code), { code, vars });
export const nowMs = () => Date.now() + state.offset;
export const isStaff = () => ["sports_exco", "admin", "super_admin"].includes(state.profile?.role);
export const isAdmin = () => ["admin", "super_admin"].includes(state.profile?.role);
export const isSuper = () => state.profile?.role === "super_admin";
const col = (n) => collection(db, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tsMs = (ts) => (ts && ts.toMillis ? ts.toMillis() : 0);

// =====================================================================
//  AUTH + SESSION
// =====================================================================
async function loadProfile() {
  const ref = doc(db, "users", state.user.uid);
  for (let i = 0; i < 6; i++) {
    const s = await getDoc(ref);
    if (s.exists()) { state.profile = { id: s.id, ...s.data() }; return; }
    if (!state.signingUp) break;
    await sleep(400);
  }
  // Account exists in Auth but has no profile yet (e.g. created from the console): create a student profile.
  await setDoc(ref, {
    fullName: state.user.email, studentId: "", dorm: "", roomNumber: "", studyYear: "",
    role: "student", accountStatus: "active", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  const s = await getDoc(ref);
  state.profile = { id: s.id, ...s.data() };
}

/** Measure the difference between this device's clock and the Firebase server clock. */
async function syncClock() {
  try {
    const ref = doc(db, "serverClock", state.user.uid);
    const t0 = Date.now();
    await setDoc(ref, { t: serverTimestamp() });
    const s = await getDocFromServer(ref);
    const t1 = Date.now();
    state.offset = s.data().t.toMillis() - (t0 + t1) / 2;
  } catch (e) { console.warn("clock sync failed", e); state.offset = 0; }
}

export async function loadSettings() {
  try {
    const s = await getDoc(doc(db, "settings", "system"));
    state.settings = s.exists() ? { ...DEFAULT_SETTINGS, ...s.data(), hours: { ...DEFAULT_SETTINGS.hours, ...(s.data().hours || {}) } } : { ...DEFAULT_SETTINGS };
  } catch { state.settings = { ...DEFAULT_SETTINGS }; }
}

export function watchAuth(cb) {
  return onAuthStateChanged(auth, async (u) => {
    state.user = u;
    state.profile = null;
    if (u) {
      try {
        await loadProfile();
        if (state.profile.accountStatus !== "active") {
          await signOut(auth);
          state.user = null; state.profile = null;
          return cb(null, "suspended");
        }
        await syncClock();
        await loadSettings();
      } catch (e) { console.error(e); return cb(u, "error"); }
    }
    cb(state.user);
  });
}

export const logIn = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const logOut = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export async function signUp({ email, password, fullName, studentId, dorm, roomNumber, studyYear }) {
  state.signingUp = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      fullName, studentId, dorm, roomNumber, studyYear,
      role: "student", accountStatus: "active",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  } finally { state.signingUp = false; }
}

export async function updateMyProfile(fields) {
  await updateDoc(doc(db, "users", state.user.uid), { ...fields, updatedAt: serverTimestamp() });
  Object.assign(state.profile, fields);
}

// =====================================================================
//  HELPERS
// =====================================================================
function logTx(tx, action, entityType, entityId, details = {}) {
  tx.set(doc(col("activityLogs")), {
    actorUid: state.user.uid, actorName: state.profile.fullName, actorRole: state.profile.role,
    action, entityType, entityId, details, createdAt: serverTimestamp(),
  });
}
const isFree = (u) =>
  u.status === "available" || (u.status === "reserved" && u.reservedUntil && tsMs(u.reservedUntil) < nowMs() - 2000);
const byCode = (a, b) => (a.assetCode || a.id).localeCompare(b.assetCode || b.id, undefined, { numeric: true });

// =====================================================================
//  STUDENT: create borrow request (atomic)
// =====================================================================
export async function createBorrow(cart, typesById) {
  const entries = Object.entries(cart).filter(([, q]) => q > 0);
  if (!entries.length) throw err("empty");
  const total = entries.reduce((a, [, q]) => a + q, 0);
  const max = state.settings.maxItemsPerRequest || 6;
  if (total > max) throw err("toomany", { max });
  const p = state.profile;

  await releaseExpiredUnits().catch(() => {});

  for (let attempt = 0; attempt < 4; attempt++) {
    // 1. choose candidate units (query cannot run inside a transaction)
    const picked = [];
    for (const [typeId, qty] of entries) {
      const snap = await getDocs(query(col("equipmentUnits"), where("typeId", "==", typeId)));
      const free = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isFree).sort(byCode);
      if (free.length < qty) throw err("stock", { name: typesById[typeId]?.name || typeId });
      picked.push(...free.slice(0, qty));
    }
    // 2. verify + reserve atomically; if someone grabbed a unit meanwhile, retry with fresh candidates
    try {
      return await runTransaction(db, async (tx) => {
        const key = dayKey(new Date(nowMs())).slice(2).replace(/-/g, ""); // YYMMDD (Kuala Lumpur)
        const cref = doc(db, "counters", key);
        const cs = await tx.get(cref);
        const unitSnaps = await Promise.all(picked.map((u) => tx.get(doc(db, "equipmentUnits", u.id))));
        unitSnaps.forEach((s) => { if (!s.exists() || !isFree(s.data())) throw err("conflict"); });

        const n = (cs.exists() ? cs.data().n : 0) + 1;
        const code = `REQ-${key}-${String(n).padStart(4, "0")}`;
        const rref = doc(col("borrowRequests"));
        const pickup = Timestamp.fromMillis(nowMs() + (state.settings.expireMinutes || 10) * 60000);

        const items = picked.map((u) => ({
          assetCode: u.id, typeId: u.typeId, typeName: u.typeName, typeNameMs: u.typeNameMs || u.typeName,
          itemDocId: `${rref.id}_${u.id}`,
        }));

        tx.set(cref, { n });
        tx.set(rref, {
          requestCode: code, studentUid: state.user.uid, studentName: p.fullName, studentNo: p.studentId || "",
          dorm: p.dorm || "", room: p.roomNumber || "", status: "pending_collection",
          requestedAt: serverTimestamp(), pickupExpiresAt: pickup,
          collectedAt: null, collectedBy: null, collectedByName: null, closedAt: null,
          items, itemCount: items.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        items.forEach((it) => {
          tx.set(doc(db, "borrowItems", it.itemDocId), {
            requestId: rref.id, requestCode: code, studentUid: state.user.uid, studentName: p.fullName,
            assetCode: it.assetCode, typeId: it.typeId, typeName: it.typeName, typeNameMs: it.typeNameMs,
            status: "reserved", borrowedAt: null, returnedAt: null, returnedBy: null, returnedByName: null,
            returnCondition: null, hasIssue: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          });
          tx.update(doc(db, "equipmentUnits", it.assetCode), {
            status: "reserved", currentRequestId: rref.id, reservedUntil: pickup, updatedAt: serverTimestamp(),
          });
        });
        logTx(tx, "request_submitted", "borrowRequest", rref.id, { code, items: items.map((i) => i.assetCode) });
        return rref.id;
      });
    } catch (e) {
      if (e.code === "conflict") continue;
      throw e;
    }
  }
  throw err("conflict");
}

// =====================================================================
//  EXPIRY  (see README: the Cloud Function is the fully reliable version)
// =====================================================================
/** Free units whose reservation time has passed. Rules verify the time using the SERVER clock. */
export async function releaseExpiredUnits() {
  const snap = await getDocs(query(col("equipmentUnits"), where("status", "==", "reserved")));
  const due = snap.docs.filter((d) => tsMs(d.data().reservedUntil) < nowMs() - 2000);
  if (!due.length) return 0;
  const b = writeBatch(db);
  due.forEach((d) => b.update(d.ref, { status: "available", currentRequestId: null, reservedUntil: null, updatedAt: serverTimestamp() }));
  await b.commit();
  return due.length;
}

async function expireOne(reqId) {
  await runTransaction(db, async (tx) => {
    const rref = doc(db, "borrowRequests", reqId);
    const rs = await tx.get(rref);
    if (!rs.exists()) return;
    const r = rs.data();
    if (r.status !== "pending_collection" || tsMs(r.pickupExpiresAt) > nowMs() - 2000) return;
    const itemSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "borrowItems", i.itemDocId))));
    const unitSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "equipmentUnits", i.assetCode))));
    tx.update(rref, { status: "expired", updatedAt: serverTimestamp() });
    itemSnaps.forEach((s) => { if (s.exists() && s.data().status === "reserved") tx.update(s.ref, { status: "expired", updatedAt: serverTimestamp() }); });
    unitSnaps.forEach((s) => {
      const u = s.data();
      if (s.exists() && u.status === "reserved" && u.currentRequestId === reqId)
        tx.update(s.ref, { status: "available", currentRequestId: null, reservedUntil: null, updatedAt: serverTimestamp() });
    });
    logTx(tx, "request_expired", "borrowRequest", reqId, { code: r.requestCode });
  });
}

export async function sweepExpired() {
  if (!state.user || !state.profile) return 0;
  const base = col("borrowRequests");
  const q = isStaff()
    ? query(base, where("status", "==", "pending_collection"))
    : query(base, where("studentUid", "==", state.user.uid), where("status", "==", "pending_collection"));
  const snap = await getDocs(q);
  const due = snap.docs.filter((d) => tsMs(d.data().pickupExpiresAt) <= nowMs() - 2000);
  for (const d of due) await expireOne(d.id).catch((e) => console.warn("expire failed", e));
  await releaseExpiredUnits().catch(() => {});
  return due.length;
}

// =====================================================================
//  STUDENT: cancel own pending request
// =====================================================================
export async function cancelRequest(reqId) {
  await runTransaction(db, async (tx) => {
    const rref = doc(db, "borrowRequests", reqId);
    const rs = await tx.get(rref);
    const r = rs.data();
    if (!rs.exists() || r.status !== "pending_collection") throw err("notpending");
    const itemSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "borrowItems", i.itemDocId))));
    const unitSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "equipmentUnits", i.assetCode))));
    tx.update(rref, { status: "cancelled", updatedAt: serverTimestamp() });
    itemSnaps.forEach((s) => tx.update(s.ref, { status: "cancelled", updatedAt: serverTimestamp() }));
    unitSnaps.forEach((s) => {
      if (s.data().status === "reserved" && s.data().currentRequestId === reqId)
        tx.update(s.ref, { status: "available", currentRequestId: null, reservedUntil: null, updatedAt: serverTimestamp() });
    });
    logTx(tx, "request_cancelled", "borrowRequest", reqId, { code: r.requestCode });
  });
}

// =====================================================================
//  EXCO: Mark as Collected (physical handover)
// =====================================================================
export async function collectRequest(reqId) {
  await runTransaction(db, async (tx) => {
    const rref = doc(db, "borrowRequests", reqId);
    const rs = await tx.get(rref);
    if (!rs.exists()) throw err("notfound");
    const r = rs.data();
    if (r.status !== "pending_collection") throw err("notpending");
    if (tsMs(r.pickupExpiresAt) < nowMs()) throw err("expired");
    const itemSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "borrowItems", i.itemDocId))));
    const unitSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "equipmentUnits", i.assetCode))));
    unitSnaps.forEach((s) => {
      if (!s.exists() || s.data().status !== "reserved" || s.data().currentRequestId !== reqId) throw err("conflict");
    });
    tx.update(rref, {
      status: "collected", collectedAt: serverTimestamp(), collectedBy: state.user.uid,
      collectedByName: state.profile.fullName, updatedAt: serverTimestamp(),
    });
    itemSnaps.forEach((s) => tx.update(s.ref, { status: "borrowed", borrowedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    unitSnaps.forEach((s) => tx.update(s.ref, { status: "borrowed", updatedAt: serverTimestamp() }));
    logTx(tx, "equipment_handed_over", "borrowRequest", reqId, { code: r.requestCode, items: r.items.map((i) => i.assetCode) });
  });
}

// =====================================================================
//  EXCO: Return items (per Item ID, partial, Mark All Returned, issues)
// =====================================================================
const unitStatusFor = (condition, action) => {
  if (condition === "good") return "available";
  if (condition === "lost") return "lost";
  if (condition === "damaged") return action === "unusable" || action === "follow_up" ? "damaged" : "maintenance";
  return "maintenance"; // missing_parts, other
};
const defaultAction = (condition) => ({ damaged: "repair", lost: "follow_up", missing_parts: "inspection", other: "follow_up" }[condition] || "follow_up");

/** entries: [{ assetCode, condition: good|damaged|lost|missing_parts|other, action?, notes? }] */
export async function returnItems(reqId, entries) {
  if (!entries.length) return;
  await runTransaction(db, async (tx) => {
    const rref = doc(db, "borrowRequests", reqId);
    const rs = await tx.get(rref);
    if (!rs.exists()) throw err("notfound");
    const r = rs.data();
    const itemSnaps = await Promise.all(r.items.map((i) => tx.get(doc(db, "borrowItems", i.itemDocId))));
    const items = Object.fromEntries(itemSnaps.map((s) => [s.data().assetCode, s]));
    const unitSnaps = await Promise.all(entries.map((e) => tx.get(doc(db, "equipmentUnits", e.assetCode))));

    const closing = new Set();
    entries.forEach((e, idx) => {
      const is = items[e.assetCode];
      if (!is || is.data().status !== "borrowed") throw err("notborrowed");
      closing.add(e.assetCode);
      const cond = e.condition || "good";
      const action = e.action || defaultAction(cond);
      tx.update(is.ref, {
        status: cond === "lost" ? "lost" : "returned", returnedAt: serverTimestamp(),
        returnedBy: state.user.uid, returnedByName: state.profile.fullName,
        returnCondition: cond, hasIssue: cond !== "good", updatedAt: serverTimestamp(),
      });
      tx.update(unitSnaps[idx].ref, {
        status: unitStatusFor(cond, action), currentRequestId: null, reservedUntil: null, updatedAt: serverTimestamp(),
      });
      if (cond !== "good") {
        tx.set(doc(col("equipmentIssues")), {
          assetCode: e.assetCode, typeName: is.data().typeName, typeNameMs: is.data().typeNameMs || is.data().typeName,
          requestId: reqId, requestCode: r.requestCode, borrowItemId: is.id, studentName: r.studentName,
          issueType: cond, actionRequired: action, notes: e.notes || "",
          reportedBy: state.user.uid, reportedByName: state.profile.fullName, reportedAt: serverTimestamp(),
          resolutionStatus: "open", resolvedBy: null, resolvedByName: null, resolvedAt: null,
        });
      }
      logTx(tx, cond === "good" ? "item_returned" : "issue_reported", "borrowItem", is.id,
        { code: r.requestCode, assetCode: e.assetCode, condition: cond, notes: e.notes || "" });
    });

    const stillOpen = Object.values(items).filter((s) => s.data().status === "borrowed" && !closing.has(s.data().assetCode)).length;
    const patch = { status: stillOpen === 0 ? "returned" : "partially_returned", updatedAt: serverTimestamp() };
    if (stillOpen === 0) patch.closedAt = serverTimestamp();
    tx.update(rref, patch);
  });
}

export async function resolveIssue(issueId, restock) {
  await runTransaction(db, async (tx) => {
    const iref = doc(db, "equipmentIssues", issueId);
    const is = await tx.get(iref);
    if (!is.exists() || is.data().resolutionStatus !== "open") throw err("notfound");
    const uref = doc(db, "equipmentUnits", is.data().assetCode);
    const us = await tx.get(uref);
    tx.update(iref, { resolutionStatus: "resolved", resolvedBy: state.user.uid, resolvedByName: state.profile.fullName, resolvedAt: serverTimestamp() });
    if (restock && us.exists() && ["maintenance", "damaged", "lost"].includes(us.data().status))
      tx.update(uref, { status: "available", updatedAt: serverTimestamp() });
    logTx(tx, "issue_resolved", "equipmentIssue", issueId, { assetCode: is.data().assetCode, restock });
  });
}

// =====================================================================
//  ADMIN
// =====================================================================
export const SEED = [
  { prefix: "FB",  name: "Training Football",           nameMs: "Bola Sepak Latihan",         brand: "Adidas",         qty: 2 },
  { prefix: "TAK", name: "Sepak Takraw Ball",           nameMs: "Bola Takraw",                brand: "Gajah Emas 511", qty: 4 },
  { prefix: "VB",  name: "Training Volleyball",         nameMs: "Bola Tampar Latihan",        brand: "Molten",         qty: 2 },
  { prefix: "NB",  name: "Training Netball (Rubber)",   nameMs: "Bola Jaring Latihan Getah",  brand: "Molten",         qty: 2 },
  { prefix: "BDM", name: "Training Badminton Racket",   nameMs: "Raket Badminton Latihan",    brand: "Ambros",         qty: 8 },
  { prefix: "TT",  name: "Training Ping Pong Bat",      nameMs: "Bat Pingpong Latihan",       brand: "2 in 1",         qty: 4 },
  { prefix: "NET", name: "Portable Badminton Net",      nameMs: "Portable Net Badminton",     brand: "",               qty: 2 },
  { prefix: "KAR", name: "Carrom Set",                  nameMs: "Set Karrom",                 brand: "",               qty: 2 },
];

export async function seedInventory() {
  const b = writeBatch(db);
  SEED.forEach((s) => {
    const tid = s.prefix.toLowerCase();
    b.set(doc(db, "equipmentTypes", tid), {
      name: s.name, nameMs: s.nameMs, brand: s.brand, prefix: s.prefix, description: "", imageUrl: "",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    for (let i = 1; i <= s.qty; i++) {
      const code = `${s.prefix}-${String(i).padStart(3, "0")}`;
      b.set(doc(db, "equipmentUnits", code), {
        assetCode: code, typeId: tid, typeName: s.name, typeNameMs: s.nameMs, status: "available",
        currentRequestId: null, reservedUntil: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
  });
  b.set(doc(db, "settings", "system"), { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });
  await b.commit();
  await loadSettings();
}

export async function addType({ name, nameMs, brand, prefix, qty }) {
  prefix = prefix.trim().toUpperCase();
  const tid = prefix.toLowerCase();
  const exists = await getDoc(doc(db, "equipmentTypes", tid));
  if (exists.exists()) throw err("duplicate");
  await setDoc(doc(db, "equipmentTypes", tid), {
    name, nameMs: nameMs || name, brand: brand || "", prefix, description: "", imageUrl: "",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  if (qty > 0) await addUnits({ id: tid, prefix, name, nameMs: nameMs || name }, qty);
}

export async function addUnits(type, count) {
  const snap = await getDocs(query(col("equipmentUnits"), where("typeId", "==", type.id)));
  let max = 0;
  snap.docs.forEach((d) => { const n = parseInt(d.id.split("-").pop(), 10); if (n > max) max = n; });
  const b = writeBatch(db);
  for (let i = 1; i <= count; i++) {
    const code = `${type.prefix}-${String(max + i).padStart(3, "0")}`;
    b.set(doc(db, "equipmentUnits", code), {
      assetCode: code, typeId: type.id, typeName: type.name, typeNameMs: type.nameMs || type.name, status: "available",
      currentRequestId: null, reservedUntil: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }
  await b.commit();
}

export async function setUnitStatus(assetCode, status) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "equipmentUnits", assetCode);
    const s = await tx.get(ref);
    if (s.data().status === "reserved" || s.data().status === "borrowed") throw err("unitinuse");
    tx.update(ref, { status, updatedAt: serverTimestamp() });
    logTx(tx, "unit_status_changed", "equipmentUnit", assetCode, { from: s.data().status, to: status });
  });
}

export const setTypeImage = (typeId, imageUrl) =>
  updateDoc(doc(db, "equipmentTypes", typeId), { imageUrl, updatedAt: serverTimestamp() });

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
  await addLog("role_changed", "user", uid, { role });
}
export async function setUserStatus(uid, accountStatus) {
  await updateDoc(doc(db, "users", uid), { accountStatus, updatedAt: serverTimestamp() });
  await addLog("account_status_changed", "user", uid, { accountStatus });
}
async function addLog(action, entityType, entityId, details) {
  await setDoc(doc(col("activityLogs")), {
    actorUid: state.user.uid, actorName: state.profile.fullName, actorRole: state.profile.role,
    action, entityType, entityId, details, createdAt: serverTimestamp(),
  });
}
export async function saveSettings(s) {
  await setDoc(doc(db, "settings", "system"), { ...s, updatedAt: serverTimestamp() });
  await addLog("settings_changed", "settings", "system", s);
  await loadSettings();
}

// =====================================================================
//  QUERIES (all single-field so no composite indexes are needed)
// =====================================================================
export const watchTypes = (cb) => onSnapshot(col("equipmentTypes"), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
export const watchUnits = (cb) => onSnapshot(col("equipmentUnits"), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byCode)));
export const watchRequest = (id, cb, onErr) => onSnapshot(doc(db, "borrowRequests", id), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null), onErr);
export const watchMyRequests = (cb) =>
  onSnapshot(query(col("borrowRequests"), where("studentUid", "==", state.user.uid)), (s) =>
    cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => tsMs(b.requestedAt) - tsMs(a.requestedAt))));
export const watchMyItems = (cb) =>
  onSnapshot(query(col("borrowItems"), where("studentUid", "==", state.user.uid)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
export const watchPending = (cb) =>
  onSnapshot(query(col("borrowRequests"), where("status", "==", "pending_collection")), (s) =>
    cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => tsMs(a.requestedAt) - tsMs(b.requestedAt))));
export const watchItemsBetween = (from, to, cb) =>
  onSnapshot(query(col("borrowItems"), where("borrowedAt", ">=", Timestamp.fromDate(from)), where("borrowedAt", "<", Timestamp.fromDate(to)), orderBy("borrowedAt", "desc")),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.error(e));
export const watchItemsByStatus = (status, cb) =>
  onSnapshot(query(col("borrowItems"), where("status", "==", status)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.error(e));

async function listAll(q) { const s = await getDocs(q); return s.docs.map((d) => ({ id: d.id, ...d.data() })); }
export const listUsers = () => listAll(query(col("users"), limit(500))).then((a) => a.sort((x, y) => (x.fullName || "").localeCompare(y.fullName || "")));
export const listIssues = () => listAll(query(col("equipmentIssues"), orderBy("reportedAt", "desc"), limit(200)));
export const listLogs = () => listAll(query(col("activityLogs"), orderBy("createdAt", "desc"), limit(150)));
export const listRequests = () => listAll(query(col("borrowRequests"), orderBy("requestedAt", "desc"), limit(200)));
export { tsMs };
