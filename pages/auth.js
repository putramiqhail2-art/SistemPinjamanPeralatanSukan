import { t } from "../i18n.js";
import { esc, $, toast, errMsg } from "../ui.js";
import * as api from "../api.js";

export function setup(root) {
  root.innerHTML = `
    <section class="auth-card">
      <h1>${esc(t("setup.title"))}</h1>
      <p>${esc(t("setup.body"))}</p>
      <pre class="code">js/firebase-config.js</pre>
      <p class="muted">${esc(t("setup.hint"))}</p>
    </section>`;
}

export function login(root) {
  root.innerHTML = `
    <section class="auth-card">
      <h1>${esc(t("auth.login"))}</h1>
      <p class="muted">${esc(t("auth.loginSub"))}</p>
      <form id="f" class="form" autocomplete="on">
        <label>${esc(t("auth.email"))}<input name="email" type="email" required autocomplete="email"></label>
        <label>${esc(t("auth.password"))}<input name="password" type="password" required autocomplete="current-password" minlength="6"></label>
        <button class="btn primary block" type="submit">${esc(t("auth.login"))}</button>
      </form>
      <p class="row-links">
        <a href="#" id="forgot">${esc(t("auth.forgot"))}</a>
        <a href="#/signup">${esc(t("auth.noAccount"))}</a>
      </p>
    </section>`;
  $("#f", root).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = $("button[type=submit]", root);
    btn.disabled = true;
    try { await api.logIn(f.get("email").trim(), f.get("password")); }
    catch (er) { toast(errMsg(er), "err"); btn.disabled = false; }
  });
  $("#forgot", root).addEventListener("click", async (e) => {
    e.preventDefault();
    const email = $("input[name=email]", root).value.trim();
    if (!email) return toast(t("auth.enterEmailFirst"), "err");
    try { await api.resetPassword(email); toast(t("auth.resetSent")); }
    catch (er) { toast(errMsg(er), "err"); }
  });
}

export function signup(root) {
  root.innerHTML = `
    <section class="auth-card">
      <h1>${esc(t("auth.signup"))}</h1>
      <p class="muted">${esc(t("auth.signupSub"))}</p>
      <form id="f" class="form">
        <label>${esc(t("profile.fullName"))}<input name="fullName" required maxlength="80" autocomplete="name"></label>
        <label>${esc(t("profile.studentId"))}<input name="studentId" required maxlength="30"></label>
        <div class="grid2">
          <label>${esc(t("profile.dorm"))}<input name="dorm" required maxlength="30" placeholder="Blok A"></label>
          <label>${esc(t("profile.room"))}<input name="roomNumber" required maxlength="10"></label>
        </div>
        <label>${esc(t("profile.year"))}<input name="studyYear" maxlength="20"></label>
        <label>${esc(t("auth.email"))}<input name="email" type="email" required autocomplete="email"></label>
        <label>${esc(t("auth.password"))}<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
        <p class="muted small">${esc(t("auth.privacyNote"))}</p>
        <button class="btn primary block" type="submit">${esc(t("auth.signup"))}</button>
      </form>
      <p class="row-links"><a href="#/login">${esc(t("auth.haveAccount"))}</a></p>
    </section>`;
  $("#f", root).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = $("button[type=submit]", root);
    btn.disabled = true;
    try {
      await api.signUp({ ...f, fullName: f.fullName.trim(), studentId: f.studentId.trim(), email: f.email.trim() });
    } catch (er) { toast(errMsg(er), "err"); btn.disabled = false; }
  });
}
