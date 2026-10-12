/* Capture RVA — booking calendar + request form */
(function () {
  "use strict";
  var CFG = window.CRVA_CONFIG || {};
  var calEl = document.getElementById("cal");
  if (!calEl) return;

  var monthLabel = document.getElementById("cal-month");
  var prevBtn = document.getElementById("cal-prev");
  var nextBtn = document.getElementById("cal-next");
  var pickedEl = document.getElementById("picked-date");
  var dateInput = document.getElementById("event-date");
  var demoNote = document.getElementById("demo-note");

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var maxMonths = CFG.bookingMonthsAhead || 18;
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var selected = null;
  var cache = {}; // "YYYY-MM" -> {booked:Set, limited:Set}

  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseIso(s) {
    var p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function key(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function nice(d) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  /* Demo availability so the page works before the backend is connected */
  function demoMonth(d) {
    var booked = new Set(), limited = new Set();
    var y = d.getFullYear(), m = d.getMonth();
    var days = new Date(y, m + 1, 0).getDate();
    for (var i = 1; i <= days; i++) {
      var dt = new Date(y, m, i);
      var seed = (y * 372 + m * 31 + i) % 7;
      if (dt.getDay() === 6 && seed < 3) booked.add(iso(dt));
      else if ((dt.getDay() === 5 || dt.getDay() === 6) && seed < 5) limited.add(iso(dt));
    }
    return { booked: booked, limited: limited };
  }

  function loadMonth(d) {
    var k = key(d);
    if (cache[k]) return Promise.resolve(cache[k]);
    if (!CFG.apiUrl) {
      if (demoNote) demoNote.hidden = false;
      cache[k] = demoMonth(d);
      return Promise.resolve(cache[k]);
    }
    var from = iso(new Date(d.getFullYear(), d.getMonth(), 1));
    var to = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    var url = CFG.apiUrl + (CFG.apiUrl.indexOf("?") > -1 ? "&" : "?") + "action=availability&from=" + from + "&to=" + to;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      cache[k] = { booked: new Set(j.booked || []), limited: new Set(j.limited || []) };
      return cache[k];
    }).catch(function () {
      // If availability can't load, let people request any date; the team confirms by email.
      cache[k] = { booked: new Set(), limited: new Set(), failed: true };
      return cache[k];
    });
  }

  function render() {
    monthLabel.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    var minView = new Date(today.getFullYear(), today.getMonth(), 1);
    var maxView = new Date(today.getFullYear(), today.getMonth() + maxMonths, 1);
    prevBtn.disabled = view <= minView;
    nextBtn.disabled = view >= maxView;

    calEl.setAttribute("aria-busy", "true");
    loadMonth(view).then(function (av) {
      calEl.innerHTML = "";
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (d) {
        var h = document.createElement("div");
        h.className = "dow"; h.setAttribute("aria-hidden", "true"); h.textContent = d;
        calEl.appendChild(h);
      });
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      for (var b = 0; b < first.getDay(); b++) {
        var blank = document.createElement("div"); blank.className = "blank"; calEl.appendChild(blank);
      }
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var i = 1; i <= days; i++) {
        (function (dt) {
          var s = iso(dt);
          var bt = document.createElement("button");
          bt.type = "button";
          bt.textContent = dt.getDate();
          var label = nice(dt);
          if (dt <= today) {
            bt.disabled = true; bt.classList.add("past"); label += ", not available";
          } else if (av.booked.has(s)) {
            bt.disabled = true; label += ", booked";
          } else if (av.limited.has(s)) {
            bt.classList.add("limited"); label += ", limited availability";
          } else {
            label += ", available";
          }
          bt.setAttribute("aria-label", label);
          bt.setAttribute("aria-pressed", selected === s ? "true" : "false");
          bt.addEventListener("click", function () { pick(s); });
          calEl.appendChild(bt);
        })(new Date(view.getFullYear(), view.getMonth(), i));
      }
      calEl.setAttribute("aria-busy", "false");
    });
  }

  function pick(s) {
    selected = s;
    dateInput.value = s;
    var d = parseIso(s);
    var av = cache[key(d)] || { limited: new Set() };
    pickedEl.classList.add("ready");
    pickedEl.textContent = nice(d) + (av.limited.has(s) ? " — limited, request soon" : " — open");
    calEl.querySelectorAll("button[aria-pressed]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    var btns = calEl.querySelectorAll("button");
    btns.forEach(function (b) { if (b.textContent === String(d.getDate()) && !b.disabled) b.setAttribute("aria-pressed", "true"); });
    var err = document.getElementById("event-date-err");
    if (err) err.textContent = "";
  }

  prevBtn.addEventListener("click", function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
  nextBtn.addEventListener("click", function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });

  /* Prefill from ?date= and ?package= */
  var qs = new URLSearchParams(location.search);
  var qd = qs.get("date");
  if (qd && /^\d{4}-\d{2}-\d{2}$/.test(qd)) {
    var d = parseIso(qd);
    if (d > today) {
      view = new Date(d.getFullYear(), d.getMonth(), 1);
      loadMonth(view).then(function (av) {
        if (av.booked.has(qd)) {
          pickedEl.classList.remove("ready");
          pickedEl.textContent = nice(d) + " is already booked. Pick another date, or send the request anyway and we'll see if a second booth is free.";
        } else {
          pick(qd);
        }
        render();
      });
    } else { render(); }
  } else {
    render();
  }
  var qp = qs.get("package");
  if (qp) {
    var r = document.querySelector('input[name="package"][value="' + qp.replace(/[^a-z-]/g, "") + '"]');
    if (r) r.checked = true;
  }

  /* Submit */
  var form = document.getElementById("book-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("book-status");
    status.className = "form-status";
    if (form.website && form.website.value) return;
    var ok = true;
    if (!dateInput.value) {
      document.getElementById("event-date-err").textContent = "Pick a date on the calendar.";
      document.getElementById("cal-prev").focus();
      ok = false;
    }
    if (!window.CRVA.validate(form) || !ok) return;
    var b = form.querySelector('button[type="submit"]');
    b.disabled = true; b.textContent = "Sending request…";
    var data = Object.fromEntries(new FormData(form).entries());
    delete data.website;
    data.source = "booking";
    window.CRVA.sendLead(data).then(function (res) {
      if (!res || !res.ok) throw new Error(res && res.error || "Not saved");
      form.hidden = true;
      var done = document.getElementById("book-done");
      done.hidden = false;
      document.getElementById("done-date").textContent = nice(parseIso(data.eventDate));
      done.focus();
      window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
    }).catch(function () {
      status.className = "form-status bad";
      status.textContent = "Your request didn't go through. Check your connection and try again, or message us on Instagram @capture.rva.";
    }).finally(function () {
      b.disabled = false; b.textContent = "Request this date";
    });
  });
})();
