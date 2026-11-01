// OPTIONAL but recommended: expires unclaimed requests on the SERVER every minute,
// even when nobody has the website open. Needs the Firebase Blaze (pay-as-you-go) plan.
// For a hostel-sized system the cost is normally RM0 (well inside the free monthly quota).
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

exports.expireRequests = onSchedule(
  { schedule: "every 1 minutes", timeZone: "Asia/Kuala_Lumpur", region: "asia-southeast1" },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection("borrowRequests").where("status", "==", "pending_collection").get();
    const due = snap.docs.filter((d) => d.data().pickupExpiresAt.toMillis() <= now.toMillis());

    for (const d of due) {
      await db.runTransaction(async (tx) => {
        const rref = d.ref;
        const rs = await tx.get(rref);
        const r = rs.data();
        if (!r || r.status !== "pending_collection") return;
        const items = await Promise.all(r.items.map((i) => tx.get(db.doc(`borrowItems/${i.itemDocId}`))));
        const units = await Promise.all(r.items.map((i) => tx.get(db.doc(`equipmentUnits/${i.assetCode}`))));
        tx.update(rref, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
        items.forEach((s) => { if (s.exists && s.data().status === "reserved") tx.update(s.ref, { status: "expired", updatedAt: FieldValue.serverTimestamp() }); });
        units.forEach((s) => {
          if (s.exists && s.data().status === "reserved" && s.data().currentRequestId === rref.id)
            tx.update(s.ref, { status: "available", currentRequestId: null, reservedUntil: null, updatedAt: FieldValue.serverTimestamp() });
        });
        tx.set(db.collection("activityLogs").doc(), {
          actorUid: "system", actorName: "System", actorRole: "system", action: "request_expired",
          entityType: "borrowRequest", entityId: rref.id, details: { code: r.requestCode }, createdAt: FieldValue.serverTimestamp(),
        });
      });
    }
    console.log(`Expired ${due.length} request(s)`);
  }
);
