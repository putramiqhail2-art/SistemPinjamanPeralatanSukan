// Dual language: English (main) + Bahasa Melayu (secondary).
const dict = {
  en: {
    "app.name": "ASRAMA SPORTS HUB",
    "footer.college": "Kolej Vokasional Tengku Ampuan Afzan · Ministry of Education Malaysia",
    "common.cancel": "Cancel", "common.confirm": "Confirm", "common.print": "Print", "common.save": "Save",
    "common.saved": "Saved", "common.searchRequest": "Search name, Request ID or Item ID", "common.date": "Date",
    "common.exportCsv": "Export CSV", "common.loading": "Loading…",

    "setup.title": "Connect your Firebase project",
    "setup.body": "Paste your Firebase web config into this file, then reload the page:",
    "setup.hint": "Firebase Console → Project settings → Your apps → Web app → SDK setup and configuration.",

    "auth.login": "Log in", "auth.loginSub": "Use the account you registered with.", "auth.email": "Email", "auth.password": "Password",
    "auth.forgot": "Forgot password?", "auth.noAccount": "Create an account", "auth.enterEmailFirst": "Type your email first.",
    "auth.resetSent": "Password reset email sent.", "auth.signup": "Sign up", "auth.signupSub": "Students only. Exco and admin roles are given by an administrator.",
    "auth.privacyNote": "Do not use your IC number. Your student ID is enough.", "auth.haveAccount": "I already have an account", "auth.logout": "Log out",
    "auth.suspended": "This account is suspended. Please contact the administrator.",

    "profile.fullName": "Full name", "profile.studentId": "Student ID", "profile.dorm": "Dorm / block", "profile.room": "Room", "profile.year": "Year of study",

    "nav.home": "Home", "nav.inventory": "Equipment", "nav.active": "My borrowings", "nav.history": "History", "nav.profile": "Profile",
    "nav.queue": "Pickup queue", "nav.daily": "Daily management", "nav.closing": "Daily closing", "nav.issues": "Issues",
    "nav.dashboard": "Dashboard", "nav.adminInventory": "Manage inventory", "nav.users": "Users", "nav.requests": "All requests", "nav.logs": "Activity log", "nav.settings": "Settings",

    "hours.open": "Open now", "hours.closed": "Closed now", "hours.weekday": "Mon – Fri", "hours.weekend": "Sat – Sun",

    "student.hello": "Hi {name}", "student.borrowNow": "Borrow equipment", "student.activeTitle": "Active borrowings",
    "student.noActive": "Nothing borrowed right now.", "student.noHistory": "No borrowing history yet.", "student.viewReceipt": "View receipt",

    "inv.available": "available", "inv.noStock": "Out of stock", "inv.empty": "No equipment has been added yet.",
    "inv.itemsSelected": "items selected", "inv.review": "Review & submit", "inv.reviewTitle": "Review your request",
    "inv.expireNote": "Collect from the Exco within {min} minutes or the request expires and the items are released.", "inv.submit": "Submit Borrowing",

    "receipt.digital": "Digital borrow receipt", "receipt.requestId": "Request ID", "receipt.student": "Student", "receipt.dormRoom": "Dorm / room",
    "receipt.requested": "Requested", "receipt.expires": "Expires", "receipt.collected": "Handed over",
    "receipt.collectBefore": "Please collect before {time}", "receipt.notFound": "Receipt not found.",
    "receipt.disclaimer": "This receipt records your request. It is not proof that the items were handed over. Show it to the sports Exco.",
    "receipt.cancel": "Cancel request", "receipt.cancelTitle": "Cancel this request?", "receipt.cancelBody": "The reserved items will be released for others.", "receipt.cancelled": "Request cancelled",

    "queue.title": "Pickup queue", "queue.hint": "Prepare the listed Item IDs, hand them over, then tap Mark as Collected.",
    "queue.expiresIn": "Expires in", "queue.markCollected": "Mark as Collected", "queue.collectedOk": "Marked as collected", "queue.empty": "No requests waiting for pickup.",

    "daily.title": "Daily Equipment Management", "daily.search": "Search student, Request ID or Item ID", "daily.filter": "Filter",
    "daily.includeOutstanding": "Include unreturned from earlier days", "daily.markAll": "Mark All Returned",
    "daily.markAllTitle": "Mark all as returned?", "daily.markAllBody": "Only do this if every item was received in good condition.",
    "daily.markReturned": "Mark returned", "daily.issue": "Issue", "daily.empty": "No records for this filter.",
    "daily.returnedOk": "returned", "daily.allReturnedOk": "All items marked as returned",
    "flt.all": "All", "flt.not_returned": "Not returned", "flt.returned": "Returned", "flt.issues": "Issues",
    "sum.borrowed": "Borrowed", "sum.returned": "Returned", "sum.notReturned": "Not returned", "sum.issues": "Issues",
    "sum.borrowedToday": "Borrowed this day", "sum.notReturnedAll": "Still not returned",

    "col.itemId": "Item ID", "col.equipment": "Equipment", "col.qty": "Qty", "col.requestId": "Request ID", "col.student": "Student",
    "col.borrowTime": "Borrowed at", "col.returnStatus": "Return status", "col.action": "Action", "col.returnTime": "Returned at",
    "col.condition": "Condition", "col.reportedBy": "Reported by", "col.status": "Status", "col.role": "Role", "col.user": "User", "col.details": "Details",

    "issue.title": "Report issue", "issue.type": "Problem", "issue.action": "Follow-up", "issue.notes": "Notes", "issue.save": "Save issue",
    "issue.note": "The item is recorded as received and removed from available stock.", "issue.saved": "Issue recorded",
    "issue.t.damaged": "Damaged", "issue.t.lost": "Lost", "issue.t.missing_parts": "Missing parts", "issue.t.other": "Other",
    "issue.a.repair": "Needs repair", "issue.a.inspection": "Needs inspection", "issue.a.unusable": "Unusable", "issue.a.follow_up": "Needs follow-up",

    "closing.title": "Daily Closing Report", "closing.followUp": "Items that need follow-up", "closing.allClear": "All clear. Everything is returned and no issues are open.",

    "issues.title": "Equipment issues", "issues.resolve": "Resolve", "issues.resolveBody": "Is the item back in usable condition?",
    "issues.closeOnly": "Close, keep out of stock", "issues.restock": "Close and return to stock", "issues.empty": "No issues found.",
    "issues.f.open": "Open", "issues.f.resolved": "Resolved", "issues.f.all": "All",

    "admin.dashboard": "Admin dashboard", "admin.totalUnits": "Total units", "admin.inventory": "Manage inventory", "admin.addType": "Add equipment type",
    "admin.noInventory": "No inventory yet.", "admin.seedHint": "Load the starting list from the specification (26 units). Check the Takraw quantity afterwards.",
    "admin.seed": "Load starting inventory", "admin.setImage": "Image", "admin.addUnits": "Add units", "admin.imagePrompt": "Image URL (leave empty to remove)",
    "admin.nameEn": "Name (English)", "admin.nameMs": "Name (Bahasa Melayu)", "admin.brand": "Brand / type", "admin.prefix": "Item ID prefix",
    "admin.users": "Users", "admin.searchUser": "Search name, student ID or dorm", "admin.requests": "All requests", "admin.logs": "Activity log", "admin.settings": "Settings",
    "set.expire": "Pickup expiry (minutes)", "set.maxItems": "Max items per request", "set.enforce": "Block new requests outside operating hours",

    "role.student": "Student", "role.sports_exco": "Sports Exco", "role.admin": "Admin", "role.super_admin": "Super Admin",
    "acct.active": "Active", "acct.suspended": "Suspended",

    "st.pending_collection": "Awaiting collection", "st.collected": "Collected", "st.partially_returned": "Partially returned", "st.returned": "Returned",
    "st.expired": "Expired", "st.cancelled": "Cancelled", "st.reserved": "Reserved", "st.borrowed": "Borrowed", "st.available": "Available",
    "st.maintenance": "Maintenance", "st.damaged": "Damaged", "st.lost": "Lost", "st.issue": "Issue",

    "log.request_submitted": "Request submitted", "log.request_expired": "Request expired", "log.request_cancelled": "Request cancelled",
    "log.equipment_handed_over": "Equipment handed over", "log.item_returned": "Item returned", "log.issue_reported": "Issue reported",
    "log.issue_resolved": "Issue resolved", "log.unit_status_changed": "Unit status changed", "log.role_changed": "Role changed",
    "log.account_status_changed": "Account status changed", "log.settings_changed": "Settings changed",

    "err.generic": "Something went wrong. Please try again.", "err.permission-denied": "You are not allowed to do that.",
    "err.auth/generic": "Could not sign in. Check your details and try again.",
    "err.auth/invalid-credential": "Wrong email or password.", "err.auth/wrong-password": "Wrong email or password.", "err.auth/user-not-found": "Wrong email or password.",
    "err.auth/email-already-in-use": "This email is already registered.", "err.auth/weak-password": "Password must be at least 6 characters.",
    "err.auth/invalid-email": "That email address is not valid.", "err.auth/too-many-requests": "Too many attempts. Try again later.",
    "err.empty": "Select at least one item.", "err.toomany": "You can borrow at most {max} items per request.",
    "err.stock": "Not enough stock for {name}. Someone may have just taken it.", "err.conflict": "Stock changed while you were submitting. Please try again.",
    "err.notpending": "This request is no longer waiting for collection.", "err.notfound": "Record not found.",
    "err.expired": "This request has expired. The student must submit a new one.", "err.notborrowed": "That item is not currently marked as borrowed.",
    "err.duplicate": "That Item ID prefix already exists.", "err.unitinuse": "This unit is reserved or borrowed. Return it first.",
    "err.closed": "Borrowing is closed outside operating hours.",
  },

  ms: {
    "app.name": "ASRAMA SPORTS HUB",
    "footer.college": "Kolej Vokasional Tengku Ampuan Afzan · Kementerian Pendidikan Malaysia",
    "common.cancel": "Batal", "common.confirm": "Sahkan", "common.print": "Cetak", "common.save": "Simpan",
    "common.saved": "Disimpan", "common.searchRequest": "Cari nama, ID Permintaan atau ID Item", "common.date": "Tarikh",
    "common.exportCsv": "Eksport CSV", "common.loading": "Memuatkan…",

    "setup.title": "Sambungkan projek Firebase anda",
    "setup.body": "Tampal konfigurasi web Firebase anda dalam fail ini, kemudian muat semula halaman:",
    "setup.hint": "Firebase Console → Project settings → Your apps → Web app → SDK setup and configuration.",

    "auth.login": "Log masuk", "auth.loginSub": "Gunakan akaun yang anda daftarkan.", "auth.email": "Emel", "auth.password": "Kata laluan",
    "auth.forgot": "Lupa kata laluan?", "auth.noAccount": "Daftar akaun baharu", "auth.enterEmailFirst": "Taip emel anda dahulu.",
    "auth.resetSent": "Emel set semula kata laluan telah dihantar.", "auth.signup": "Daftar", "auth.signupSub": "Untuk pelajar sahaja. Peranan Exco dan admin diberi oleh pentadbir.",
    "auth.privacyNote": "Jangan gunakan nombor kad pengenalan. ID pelajar sudah mencukupi.", "auth.haveAccount": "Saya sudah ada akaun", "auth.logout": "Log keluar",
    "auth.suspended": "Akaun ini digantung. Sila hubungi pentadbir.",

    "profile.fullName": "Nama penuh", "profile.studentId": "ID pelajar", "profile.dorm": "Asrama / blok", "profile.room": "Bilik", "profile.year": "Tahun pengajian",

    "nav.home": "Utama", "nav.inventory": "Peralatan", "nav.active": "Pinjaman saya", "nav.history": "Sejarah", "nav.profile": "Profil",
    "nav.queue": "Giliran ambilan", "nav.daily": "Pengurusan harian", "nav.closing": "Penutup harian", "nav.issues": "Isu",
    "nav.dashboard": "Papan pemuka", "nav.adminInventory": "Urus inventori", "nav.users": "Pengguna", "nav.requests": "Semua permintaan", "nav.logs": "Log aktiviti", "nav.settings": "Tetapan",

    "hours.open": "Dibuka sekarang", "hours.closed": "Ditutup sekarang", "hours.weekday": "Isnin – Jumaat", "hours.weekend": "Sabtu – Ahad",

    "student.hello": "Hai {name}", "student.borrowNow": "Pinjam peralatan", "student.activeTitle": "Pinjaman aktif",
    "student.noActive": "Tiada pinjaman buat masa ini.", "student.noHistory": "Belum ada sejarah pinjaman.", "student.viewReceipt": "Lihat resit",

    "inv.available": "tersedia", "inv.noStock": "Tiada stok", "inv.empty": "Belum ada peralatan ditambah.",
    "inv.itemsSelected": "item dipilih", "inv.review": "Semak & hantar", "inv.reviewTitle": "Semak permintaan anda",
    "inv.expireNote": "Ambil daripada Exco dalam masa {min} minit atau permintaan akan luput dan item dilepaskan.", "inv.submit": "Hantar Pinjaman",

    "receipt.digital": "Resit pinjaman digital", "receipt.requestId": "ID Permintaan", "receipt.student": "Pelajar", "receipt.dormRoom": "Asrama / bilik",
    "receipt.requested": "Masa permintaan", "receipt.expires": "Luput pada", "receipt.collected": "Diserahkan",
    "receipt.collectBefore": "Sila ambil sebelum {time}", "receipt.notFound": "Resit tidak dijumpai.",
    "receipt.disclaimer": "Resit ini merekodkan permintaan anda. Ia bukan bukti barang telah diserahkan. Tunjukkan kepada Exco sukan.",
    "receipt.cancel": "Batalkan permintaan", "receipt.cancelTitle": "Batalkan permintaan ini?", "receipt.cancelBody": "Item yang ditempah akan dilepaskan untuk pelajar lain.", "receipt.cancelled": "Permintaan dibatalkan",

    "queue.title": "Giliran ambilan", "queue.hint": "Sediakan Item ID yang tersenarai, serahkan, kemudian tekan Mark as Collected.",
    "queue.expiresIn": "Luput dalam", "queue.markCollected": "Tanda Telah Diambil", "queue.collectedOk": "Ditandakan telah diambil", "queue.empty": "Tiada permintaan menunggu untuk diambil.",

    "daily.title": "Pengurusan Peralatan Harian", "daily.search": "Cari pelajar, ID Permintaan atau ID Item", "daily.filter": "Penapis",
    "daily.includeOutstanding": "Sertakan yang belum dipulangkan dari hari lepas", "daily.markAll": "Tanda Semua Dipulangkan",
    "daily.markAllTitle": "Tandakan semua sebagai dipulangkan?", "daily.markAllBody": "Lakukan hanya jika semua item diterima dalam keadaan baik.",
    "daily.markReturned": "Tanda dipulangkan", "daily.issue": "Isu", "daily.empty": "Tiada rekod untuk penapis ini.",
    "daily.returnedOk": "dipulangkan", "daily.allReturnedOk": "Semua item ditandakan dipulangkan",
    "flt.all": "Semua", "flt.not_returned": "Belum dipulangkan", "flt.returned": "Dipulangkan", "flt.issues": "Bermasalah",
    "sum.borrowed": "Dipinjam", "sum.returned": "Dipulangkan", "sum.notReturned": "Belum dipulangkan", "sum.issues": "Bermasalah",
    "sum.borrowedToday": "Dipinjam pada hari ini", "sum.notReturnedAll": "Masih belum dipulangkan",

    "col.itemId": "ID Item", "col.equipment": "Peralatan", "col.qty": "Kuantiti", "col.requestId": "ID Permintaan", "col.student": "Pelajar",
    "col.borrowTime": "Masa pinjam", "col.returnStatus": "Status pulang", "col.action": "Tindakan", "col.returnTime": "Masa pulang",
    "col.condition": "Keadaan", "col.reportedBy": "Dilaporkan oleh", "col.status": "Status", "col.role": "Peranan", "col.user": "Pengguna", "col.details": "Butiran",

    "issue.title": "Lapor isu", "issue.type": "Masalah", "issue.action": "Tindakan susulan", "issue.notes": "Catatan", "issue.save": "Simpan isu",
    "issue.note": "Item direkodkan sebagai diterima dan dikeluarkan daripada stok tersedia.", "issue.saved": "Isu direkodkan",
    "issue.t.damaged": "Rosak", "issue.t.lost": "Hilang", "issue.t.missing_parts": "Bahagian tidak lengkap", "issue.t.other": "Lain-lain",
    "issue.a.repair": "Perlu dibaiki", "issue.a.inspection": "Perlu pemeriksaan", "issue.a.unusable": "Tidak boleh digunakan", "issue.a.follow_up": "Perlu tindakan lanjut",

    "closing.title": "Laporan Penutup Harian", "closing.followUp": "Item yang memerlukan tindakan susulan", "closing.allClear": "Semua jelas. Semua item dipulangkan dan tiada isu terbuka.",

    "issues.title": "Isu peralatan", "issues.resolve": "Selesaikan", "issues.resolveBody": "Adakah item telah kembali boleh digunakan?",
    "issues.closeOnly": "Tutup, kekal di luar stok", "issues.restock": "Tutup dan kembalikan ke stok", "issues.empty": "Tiada isu dijumpai.",
    "issues.f.open": "Terbuka", "issues.f.resolved": "Selesai", "issues.f.all": "Semua",

    "admin.dashboard": "Papan pemuka admin", "admin.totalUnits": "Jumlah unit", "admin.inventory": "Urus inventori", "admin.addType": "Tambah jenis peralatan",
    "admin.noInventory": "Belum ada inventori.", "admin.seedHint": "Muatkan senarai permulaan daripada spesifikasi (26 unit). Semak kuantiti Takraw selepas itu.",
    "admin.seed": "Muatkan inventori permulaan", "admin.setImage": "Gambar", "admin.addUnits": "Tambah unit", "admin.imagePrompt": "URL gambar (kosongkan untuk buang)",
    "admin.nameEn": "Nama (Inggeris)", "admin.nameMs": "Nama (Bahasa Melayu)", "admin.brand": "Jenama / jenis", "admin.prefix": "Awalan ID Item",
    "admin.users": "Pengguna", "admin.searchUser": "Cari nama, ID pelajar atau asrama", "admin.requests": "Semua permintaan", "admin.logs": "Log aktiviti", "admin.settings": "Tetapan",
    "set.expire": "Tempoh luput ambilan (minit)", "set.maxItems": "Maksimum item setiap permintaan", "set.enforce": "Sekat permintaan baharu di luar waktu operasi",

    "role.student": "Pelajar", "role.sports_exco": "Exco Sukan", "role.admin": "Admin", "role.super_admin": "Super Admin",
    "acct.active": "Aktif", "acct.suspended": "Digantung",

    "st.pending_collection": "Menunggu ambilan", "st.collected": "Telah diambil", "st.partially_returned": "Dipulang sebahagian", "st.returned": "Dipulangkan",
    "st.expired": "Luput", "st.cancelled": "Dibatalkan", "st.reserved": "Ditempah", "st.borrowed": "Dipinjam", "st.available": "Tersedia",
    "st.maintenance": "Penyelenggaraan", "st.damaged": "Rosak", "st.lost": "Hilang", "st.issue": "Isu",

    "log.request_submitted": "Permintaan dihantar", "log.request_expired": "Permintaan luput", "log.request_cancelled": "Permintaan dibatalkan",
    "log.equipment_handed_over": "Peralatan diserahkan", "log.item_returned": "Item dipulangkan", "log.issue_reported": "Isu dilaporkan",
    "log.issue_resolved": "Isu diselesaikan", "log.unit_status_changed": "Status unit diubah", "log.role_changed": "Peranan diubah",
    "log.account_status_changed": "Status akaun diubah", "log.settings_changed": "Tetapan diubah",

    "err.generic": "Sesuatu tidak kena. Sila cuba lagi.", "err.permission-denied": "Anda tidak dibenarkan melakukan tindakan ini.",
    "err.auth/generic": "Tidak dapat log masuk. Semak maklumat anda dan cuba lagi.",
    "err.auth/invalid-credential": "Emel atau kata laluan salah.", "err.auth/wrong-password": "Emel atau kata laluan salah.", "err.auth/user-not-found": "Emel atau kata laluan salah.",
    "err.auth/email-already-in-use": "Emel ini sudah didaftarkan.", "err.auth/weak-password": "Kata laluan mesti sekurang-kurangnya 6 aksara.",
    "err.auth/invalid-email": "Alamat emel tidak sah.", "err.auth/too-many-requests": "Terlalu banyak percubaan. Cuba lagi nanti.",
    "err.empty": "Pilih sekurang-kurangnya satu item.", "err.toomany": "Anda boleh meminjam paling banyak {max} item bagi satu permintaan.",
    "err.stock": "Stok {name} tidak mencukupi. Mungkin ada orang baru mengambilnya.", "err.conflict": "Stok berubah semasa anda menghantar. Sila cuba lagi.",
    "err.notpending": "Permintaan ini tidak lagi menunggu ambilan.", "err.notfound": "Rekod tidak dijumpai.",
    "err.expired": "Permintaan ini telah luput. Pelajar perlu membuat permintaan baharu.", "err.notborrowed": "Item itu tidak ditandakan sebagai sedang dipinjam.",
    "err.duplicate": "Awalan ID Item itu sudah wujud.", "err.unitinuse": "Unit ini sedang ditempah atau dipinjam. Pulangkan dahulu.",
    "err.closed": "Pinjaman ditutup di luar waktu operasi.",
  },
};

let lang = (() => { try { return localStorage.getItem("lang") || "en"; } catch { return "en"; } })();
if (!dict[lang]) lang = "en";

export const getLang = () => lang;
export const locale = () => (lang === "ms" ? "ms-MY" : "en-MY");
export function setLang(l) {
  lang = dict[l] ? l : "en";
  try { localStorage.setItem("lang", lang); } catch { /* storage may be blocked */ }
  document.documentElement.lang = lang === "ms" ? "ms" : "en";
}
export function t(key, vars) {
  let s = dict[lang][key] ?? dict.en[key];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  return s;
}
export const hasKey = (k) => k in dict.en;
export const _dict = dict;
