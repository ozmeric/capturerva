/* Capture RVA — shared site behavior */
(function () {
  "use strict";

  var CFG = window.CRVA_CONFIG || {};

  /* Mobile menu */
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Close" : "Menu";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Menu";
        btn.focus();
      }
    });
  }

  /* Hero photo strip: one 3-2-1-flash sequence on load */
  var strip = document.querySelector(".strip");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (strip && !reduce) {
    document.documentElement.classList.add("js-motion");
    var frames = strip.querySelectorAll(".strip-frame");
    var counts = ["3", "2", "1"];
    frames.forEach(function (f, i) {
      var c = f.querySelector(".count");
      if (c) c.textContent = counts[i] || "";
      setTimeout(function () { f.classList.add("shoot"); }, 400 + i * 1100);
    });
  }

  /* Hero "check your date" -> booking page with date prefilled */
  document.querySelectorAll("form.date-check").forEach(function (form) {
    var input = form.querySelector('input[type="date"]');
    if (input) {
      var t = new Date();
      t.setDate(t.getDate() + 1);
      input.min = t.toISOString().slice(0, 10);
    }
  });

  /* Lightbox for gallery */
  var dlg = document.getElementById("lightbox");
  if (dlg && typeof dlg.showModal === "function") {
    var img = dlg.querySelector("img");
    var cap = dlg.querySelector("p");
    var opener = null;
    document.querySelectorAll("[data-full]").forEach(function (b) {
      b.addEventListener("click", function () {
        opener = b;
        img.src = b.getAttribute("data-full");
        img.alt = b.querySelector("img").alt;
        cap.textContent = b.getAttribute("data-caption") || "";
        dlg.showModal();
      });
    });
    dlg.querySelector(".close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { if (opener) opener.focus(); });
  }

  /* Shared lead submit (used by contact + booking forms) */
  window.CRVA = window.CRVA || {};
  window.CRVA.sendLead = function (payload) {
    payload.page = location.pathname;
    payload.referrer = document.referrer || "";
    payload.submittedAt = new Date().toISOString();
    var params = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
      if (params.get(k)) payload[k] = params.get(k);
    });
    if (!CFG.apiUrl) {
      return new Promise(function (res) {
        setTimeout(function () { res({ ok: true, demo: true, id: "DEMO" }); }, 600);
      });
    }
    return fetch(CFG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action: "lead" }, payload))
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  };

  /* Simple validation helper */
  window.CRVA.validate = function (form) {
    var ok = true;
    var first = null;
    form.querySelectorAll("[required]").forEach(function (el) {
      var errEl = document.getElementById(el.id + "-err");
      var bad = !el.value.trim() || (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (errEl) errEl.textContent = bad ? (el.getAttribute("data-err") || "Fill this in to continue.") : "";
      if (bad) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  };

  /* Contact form */
  var contact = document.getElementById("contact-form");
  if (contact) {
    contact.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("contact-status");
      status.className = "form-status";
      if (contact.website && contact.website.value) return; // honeypot
      if (!window.CRVA.validate(contact)) return;
      var b = contact.querySelector('button[type="submit"]');
      b.disabled = true; b.textContent = "Sending…";
      var data = Object.fromEntries(new FormData(contact).entries());
      delete data.website;
      data.source = "contact";
      window.CRVA.sendLead(data).then(function (res) {
        if (!res || !res.ok) throw new Error(res && res.error || "Not saved");
        contact.reset();
        status.className = "form-status ok";
        status.textContent = "Message sent. We'll reply by email shortly — check your inbox (and spam folder) for a note from Capture RVA.";
        status.focus && status.focus();
      }).catch(function () {
        status.className = "form-status bad";
        status.textContent = "Your message didn't go through. Check your connection and try again, or message us on Instagram @capture.rva.";
      }).finally(function () {
        b.disabled = false; b.textContent = "Send message";
      });
    });
  }
})();
