/**
 * Capture RVA — BuildFlow backend (Google Apps Script + Google Sheets)
 * Powered by BuildFlow — Weblina LLC
 *
 * One-time setup (see _backend/SETUP.md):
 *   1. Create a Google Sheet, Extensions > Apps Script, paste this file + appsscript.json.
 *   2. Project Settings > Script properties:
 *        ADMIN_PIN          admin app PIN (required)
 *        ANTHROPIC_API_KEY  for AI replies and AI posts
 *        AI_MODEL           optional, default claude-haiku-5-5
 *        META_PAGE_ID       Facebook Page ID
 *        META_PAGE_TOKEN    long-lived Page access token
 *        IG_USER_ID         Instagram business account ID linked to the Page
 *        META_API_VERSION   optional, default v21.0
 *   3. Run setup() once from the editor (creates tabs, default settings, automations).
 *   4. Deploy > New deployment > Web app: Execute as Me, Who has access: Anyone.
 */

// ───────────────────────────────────────────── config
var TABS = {
  Leads:    ["id","createdAt","source","status","name","email","phone","eventDate","eventType","package","venue","guests","startTime","notes","message","page","utm","threadId","lastInboundAt","lastReplyAt","bookingId"],
  Bookings: ["id","createdAt","date","status","leadId","name","email","phone","eventType","package","venue","guests","startTime","endTime","price","deposit","attendant","notes"],
  Blocked:  ["date","reason"],
  Messages: ["id","leadId","createdAt","direction","kind","status","subject","body","note"],
  Posts:    ["id","createdAt","scheduledAt","platforms","caption","imageUrl","status","source","fbPostId","igPostId","error","publishedAt"],
  Settings: ["key","value"]
};

var PACKAGES = [
  {id:"drop-off",  name:"Salsa 2 Drop-Off",  price:446, note:"limited-time price, regularly $550; self-run, no attendant, digital only"},
  {id:"exclusive", name:"Salsa 2 Exclusive", price:750, note:"adds a dedicated booth attendant and premium props"},
  {id:"wedding",   name:"Wedding Elegance",  price:950, note:"adds premium backdrops (drapes, floral, custom), wedding props, attendant, and a FREE 2-hour rehearsal dinner booth"}
];

var DEFAULT_SETTINGS = {
  businessName: "Capture RVA",
  fromName: "Capture RVA",
  notifyEmail: "",
  businessPhone: "",
  website: "https://capturerva.com",
  boothsPerDay: "1",

  autoAck: "on",
  ackSubject: "We received your request - Capture RVA",
  ackBody: "Hi {{firstName}},\n\nThank you for your interest in Capture RVA! We received your request{{dateLine}} and will get back to you shortly to confirm, or if we have any other questions about your event.\n\n{{summary}}\n\nTalk soon,\nThe Capture RVA Team\n{{phoneLine}}{{website}}",

  confirmSubject: "Your Capture RVA booking is confirmed",
  confirmBody: "Hi {{firstName}},\n\nGreat news! Your {{package}} photo booth is confirmed for {{eventDate}}{{venueLine}}.\n\nWe'll reach out before the event to design your start screen and go over setup details. Reply to this email any time with questions.\n\nSee you there,\nThe Capture RVA Team\n{{phoneLine}}{{website}}",

  aiReplies: "on",
  aiAutoSend: "off",
  aiKnowledge: "Every package runs up to 4 hours with unlimited digital sessions, a custom start screen, and a private online gallery. 60 miles of round-trip travel included, then $1.50/mile. Service area: Richmond, Midlothian, Chesterfield, Henrico, Glen Allen, Short Pump, Powhatan, Mechanicsville, Petersburg, Williamsburg, Charlottesville. Packages are digital (no prints). Backdrop choice: sequin or pillowcase (Wedding adds drapes/floral/custom).",
  aiSignature: "The Capture RVA Team",

  socialAuto: "off",
  socialPlatforms: "facebook,instagram",
  postDays: "Tue,Thu,Sat",
  postTime: "11:00",
  brandVoice: "Warm, upbeat, a little playful. Short sentences. 1-3 emojis max. Always local to Richmond, VA (RVA). End with a call to action to check dates at capturerva.com/book. 3-6 relevant hashtags like #RVA #RichmondVA #photobooth #RVAevents.",
  postIdeas: "Recent event highlights, wedding season tips, corporate holiday party booking reminders, behind-the-scenes setup, backdrop and prop showcases, limited-time Drop-Off price, client shout-outs (Classic Granite & Marble, Rountrey Social, Krisi High Heels Dance Showcase).",
  photoLibrary: JSON.stringify([
    "cgm-1","cgm-2","cgm-3","cgm-4","cgm-5","krisi-1","krisi-2","krisi-3","krisi-4","krisi-5","krisi-6",
    "rountrey-1","rountrey-2","rountrey-3","rountrey-4","rountrey-5","pro-1","pro-2","pro-3","pro-4","pro-5","pro-6",
    "tmm-1","tmm-2","bday-1"
  ].map(function (n) { return "https://capturerva.com/assets/img/events/" + n + ".jpg"; }))
};

// ───────────────────────────────────────────── plumbing
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function prop_(k, d) { var v = PropertiesService.getScriptProperties().getProperty(k); return v == null || v === "" ? d : v; }
function tz_() { return Session.getScriptTimeZone() || "America/New_York"; }
function now_() { return new Date().toISOString(); }
function uid_(p) { return p + "-" + Utilities.getUuid().slice(0, 8); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet_(name) {
  var ss = ss_(), s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, s.getMaxRows(), TABS[name].length).setNumberFormat("@"); // keep dates/ids as plain text
    s.getRange(1, 1, 1, TABS[name].length).setValues([TABS[name]]).setFontWeight("bold");
    s.setFrozenRows(1);
  }
  return s;
}

function rows_(name) {
  var d = sheet_(name).getDataRange().getValues();
  if (d.length < 2) return [];
  var h = d[0];
  return d.slice(1).map(function (r) {
    var o = {};
    h.forEach(function (k, i) {
      var v = r[i];
      if (v instanceof Date) v = (k === "date" || k === "eventDate") ? Utilities.formatDate(v, tz_(), "yyyy-MM-dd") : v.toISOString();
      o[k] = v;
    });
    return o;
  });
}

function append_(name, obj) {
  var s = sheet_(name), h = TABS[name];
  s.appendRow(h.map(function (k) { return obj[k] == null ? "" : obj[k]; }));
  return obj;
}

function update_(name, id, patch, keyCol) {
  keyCol = keyCol || "id";
  var s = sheet_(name), d = s.getDataRange().getValues(), h = d[0], ki = h.indexOf(keyCol);
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][ki]) === String(id)) {
      var row = d[i].slice();
      Object.keys(patch).forEach(function (k) { var c = h.indexOf(k); if (c > -1) row[c] = patch[k] == null ? "" : patch[k]; });
      s.getRange(i + 1, 1, 1, row.length).setValues([row]);
      var o = {}; h.forEach(function (k, j) { o[k] = row[j]; });
      return o;
    }
  }
  return null;
}

function delete_(name, id, keyCol) {
  keyCol = keyCol || "id";
  var s = sheet_(name), d = s.getDataRange().getValues(), ki = d[0].indexOf(keyCol);
  for (var i = d.length - 1; i >= 1; i--) {
    var v = d[i][ki]; if (v instanceof Date) v = Utilities.formatDate(v, tz_(), "yyyy-MM-dd");
    if (String(v) === String(id)) { s.deleteRow(i + 1); return true; }
  }
  return false;
}

function find_(name, id) { return rows_(name).filter(function (r) { return String(r.id) === String(id); })[0] || null; }

function settings_() {
  var o = {}; Object.keys(DEFAULT_SETTINGS).forEach(function (k) { o[k] = DEFAULT_SETTINGS[k]; });
  rows_("Settings").forEach(function (r) { o[r.key] = String(r.value); });
  return o;
}
function on_(v) { return String(v).toLowerCase() === "on" || v === true || String(v).toLowerCase() === "true"; }

// ───────────────────────────────────────────── routing
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === "availability") return out_(availability_(p.from, p.to));
    return out_({ ok: true, service: "Capture RVA BuildFlow" });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  var body;
  try {
    var raw = (e.postData && e.postData.contents) ? e.postData.contents : (e.parameter && e.parameter.body ? e.parameter.body : "{}");
    body = JSON.parse(raw);
  } catch (err) { return out_({ ok: false, error: "Bad request" }); }

  try {
    var a = body.action;
    // Public endpoints (website)
    if (a === "lead") return out_(newLead_(body));
    if (a === "availability") return out_(availability_(body.from, body.to));

    // Admin endpoints
    var auth = checkPin_(body.pin);
    if (!auth.ok) return out_({ ok: false, error: auth.error });
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      switch (a) {
        case "auth":            return out_({ ok: true });
        case "getAll":          return out_(getAll_());
        case "saveSettings":    return out_(saveSettings_(body.settings));
        case "updateLead":      return out_({ ok: true, lead: update_("Leads", body.id, clean_(body.patch, TABS.Leads)) });
        case "deleteLead":      return out_({ ok: delete_("Leads", body.id) });
        case "draftReply":      return out_(draftReply_(body.leadId, body.instruction || ""));
        case "sendReply":       return out_(sendReply_(body.leadId, body.body, body.draftId, "manual"));
        case "discardDraft":    return out_({ ok: true, msg: update_("Messages", body.id, { status: "Discarded" }) });
        case "checkInbox":      return out_(checkInbox());
        case "saveBooking":     return out_(saveBooking_(body.booking));
        case "confirmBooking":  return out_(confirmBooking_(body.id, body.sendEmail !== false));
        case "deleteBooking":   return out_({ ok: delete_("Bookings", body.id) });
        case "blockDate":       append_("Blocked", { date: body.date, reason: body.reason || "" }); return out_({ ok: true });
        case "unblockDate":     return out_({ ok: delete_("Blocked", body.date, "date") });
        case "generatePosts":   return out_(generatePosts_(Number(body.count) || 3, body.theme || ""));
        case "savePost":        return out_(savePost_(body.post));
        case "deletePost":      return out_({ ok: delete_("Posts", body.id) });
        case "publishPost":     return out_(publishPost_(body.id));
        default:                return out_({ ok: false, error: "Unknown action" });
      }
    } finally { lock.releaseLock(); }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function checkPin_(pin) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get("pinFails") || 0);
  if (fails >= 10) return { ok: false, error: "Too many attempts. Try again in 10 minutes." };
  var real = prop_("ADMIN_PIN", "");
  if (!real) return { ok: false, error: "ADMIN_PIN is not set in Script properties." };
  if (String(pin) !== String(real)) { cache.put("pinFails", String(fails + 1), 600); return { ok: false, error: "Wrong PIN" }; }
  return { ok: true };
}

function clean_(patch, allowed) {
  var o = {}; Object.keys(patch || {}).forEach(function (k) { if (allowed.indexOf(k) > -1 && k !== "id") o[k] = patch[k]; }); return o;
}

// ───────────────────────────────────────────── availability
function availability_(from, to) {
  var cap = Math.max(1, Number(settings_().boothsPerDay) || 1);
  var counts = {}, pending = {}, booked = [], limited = [];
  rows_("Bookings").forEach(function (b) {
    if (!b.date || (from && b.date < from) || (to && b.date > to)) return;
    if (b.status === "Confirmed") counts[b.date] = (counts[b.date] || 0) + 1;
    else if (b.status === "Requested") pending[b.date] = true;
  });
  var blocked = {};
  rows_("Blocked").forEach(function (r) { blocked[r.date] = true; });
  Object.keys(blocked).forEach(function (d) { if ((!from || d >= from) && (!to || d <= to)) booked.push(d); });
  Object.keys(counts).forEach(function (d) {
    if (blocked[d]) return;
    if (counts[d] >= cap) booked.push(d); else limited.push(d);
  });
  Object.keys(pending).forEach(function (d) { if (!blocked[d] && booked.indexOf(d) < 0 && limited.indexOf(d) < 0) limited.push(d); });
  return { ok: true, booked: booked, limited: limited };
}

// ───────────────────────────────────────────── leads
function newLead_(b) {
  var email = String(b.email || "").trim().toLowerCase();
  var name = String(b.name || "").trim().slice(0, 120);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Name and a valid email are required." };

  // basic flood protection: 5 submissions per email per hour
  var cache = CacheService.getScriptCache(), ck = "lead:" + email, n = Number(cache.get(ck) || 0);
  if (n >= 5) return { ok: false, error: "Too many requests. Try again later." };
  cache.put(ck, String(n + 1), 3600);

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var lead;
  try {
    var pkg = String(b.package || "");
    lead = {
      id: uid_("L"), createdAt: now_(), source: b.source === "booking" ? "Booking" : "Contact", status: "New",
      name: name, email: email, phone: String(b.phone || "").slice(0, 40), eventDate: String(b.eventDate || "").slice(0, 10),
      eventType: String(b.eventType || "").slice(0, 60), package: pkg, venue: String(b.venue || "").slice(0, 200),
      guests: String(b.guests || "").slice(0, 10), startTime: String(b.startTime || "").slice(0, 10),
      notes: String(b.notes || "").slice(0, 3000), message: String(b.message || "").slice(0, 3000),
      page: String(b.page || "").slice(0, 120),
      utm: [b.utm_source, b.utm_medium, b.utm_campaign].filter(Boolean).join(" / ")
    };
    if (lead.source === "Booking" && lead.eventDate) {
      var bk = append_("Bookings", {
        id: uid_("B"), createdAt: now_(), date: lead.eventDate, status: "Requested", leadId: lead.id,
        name: lead.name, email: lead.email, phone: lead.phone, eventType: lead.eventType, package: pkgName_(pkg),
        venue: lead.venue, guests: lead.guests, startTime: lead.startTime, price: pkgPrice_(pkg), notes: lead.notes
      });
      lead.bookingId = bk.id;
    }
    append_("Leads", lead);
  } finally { lock.releaseLock(); }

  var S = settings_();
  try { if (on_(S.autoAck)) sendAck_(lead, S); } catch (err) { log_(lead.id, "out", "ack", "Failed", "", "", String(err)); }
  try { notifyAdmin_(lead, S); } catch (err) {}
  return { ok: true, id: lead.id };
}

function pkgName_(id) { var p = PACKAGES.filter(function (x) { return x.id === id; })[0]; return p ? p.name : (id === "not-sure" ? "Not sure yet" : id); }
function pkgPrice_(id) { var p = PACKAGES.filter(function (x) { return x.id === id; })[0]; return p ? p.price : ""; }

function niceDate_(iso) {
  if (!iso) return "";
  var p = String(iso).split("-");
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return Utilities.formatDate(d, tz_(), "EEEE, MMMM d, yyyy");
}

function fill_(tpl, lead, S) {
  var first = String(lead.name || "").split(" ")[0] || "there";
  var summaryLines = [];
  if (lead.eventDate) summaryLines.push("Date: " + niceDate_(lead.eventDate));
  if (lead.package) summaryLines.push("Package: " + pkgName_(lead.package));
  if (lead.eventType) summaryLines.push("Event: " + lead.eventType);
  if (lead.venue) summaryLines.push("Location: " + lead.venue);
  var vars = {
    firstName: first, name: lead.name || "", eventDate: niceDate_(lead.eventDate), package: pkgName_(lead.package),
    venue: lead.venue || "", venueLine: lead.venue ? " at " + lead.venue : "",
    dateLine: lead.eventDate ? " for " + niceDate_(lead.eventDate) : "",
    summary: summaryLines.length ? "Here's what you sent us:\n" + summaryLines.join("\n") : "",
    phoneLine: S.businessPhone ? S.businessPhone + "\n" : "", website: S.website || "", businessName: S.businessName
  };
  return String(tpl).replace(/\{\{(\w+)\}\}/g, function (_, k) { return vars[k] == null ? "" : vars[k]; });
}

/** Sends a new email (starting a Gmail thread) and remembers the thread on the lead. */
function startThread_(lead, subject, body, S) {
  var draft = GmailApp.createDraft(lead.email, subject, body, { name: S.fromName, replyTo: S.notifyEmail || undefined });
  var msg = draft.send();
  var threadId = msg.getThread().getId();
  update_("Leads", lead.id, { threadId: threadId, lastReplyAt: now_() });
  return threadId;
}

function sendAck_(lead, S) {
  var subject = fill_(S.ackSubject, lead, S), body = fill_(S.ackBody, lead, S);
  startThread_(lead, subject, body, S);
  update_("Leads", lead.id, { status: "Acknowledged" });
  log_(lead.id, "out", "ack", "Sent", subject, body, "Automatic thank-you");
}

function notifyAdmin_(lead, S) {
  var to = S.notifyEmail || Session.getEffectiveUser().getEmail();
  if (!to) return;
  var lines = ["New " + lead.source.toLowerCase() + " request from " + lead.name, "",
    "Email: " + lead.email, "Phone: " + (lead.phone || "-"), "Date: " + (niceDate_(lead.eventDate) || "-"),
    "Package: " + (pkgName_(lead.package) || "-"), "Event: " + (lead.eventType || "-"), "Venue: " + (lead.venue || "-"),
    "Guests: " + (lead.guests || "-"), "", (lead.notes || lead.message || ""), "",
    on_(S.autoAck) ? "The automatic thank-you email was sent." : "Auto thank-you is OFF. Reply from the admin app.",
    "Open the admin app: " + (S.website || "") + "/admin/"];
  MailApp.sendEmail({ to: to, subject: "New lead: " + lead.name + (lead.eventDate ? " (" + lead.eventDate + ")" : ""), body: lines.join("\n"), name: "Capture RVA BuildFlow" });
}

function log_(leadId, direction, kind, status, subject, body, note) {
  return append_("Messages", { id: uid_("M"), leadId: leadId, createdAt: now_(), direction: direction, kind: kind, status: status, subject: subject || "", body: body || "", note: note || "" });
}

/** Sends a reply in the lead's thread (or starts one). Used by manual sends and approved AI drafts. */
function sendReply_(leadId, body, draftId, kind) {
  var lead = find_("Leads", leadId); if (!lead) return { ok: false, error: "Lead not found" };
  if (!String(body || "").trim()) return { ok: false, error: "The reply is empty." };
  var S = settings_();
  var subject;
  if (lead.threadId) {
    var thread = GmailApp.getThreadById(lead.threadId);
    var msgs = thread.getMessages();
    msgs[msgs.length - 1].reply(body, { name: S.fromName, replyTo: S.notifyEmail || undefined });
    subject = "Re: " + thread.getFirstMessageSubject();
  } else {
    subject = "Your Capture RVA photo booth request";
    startThread_(lead, subject, body, S);
  }
  if (draftId) update_("Messages", draftId, { status: "Sent", body: body, subject: subject });
  else log_(leadId, "out", kind || "manual", "Sent", subject, body, "");
  update_("Leads", leadId, { lastReplyAt: now_(), status: lead.status === "Booked" ? "Booked" : "Replied" });
  return { ok: true };
}

// ───────────────────────────────────────────── AI replies
function claude_(system, user, maxTokens) {
  var key = prop_("ANTHROPIC_API_KEY", "");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set in Script properties.");
  var res = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    payload: JSON.stringify({ model: prop_("AI_MODEL", "claude-haiku-5-5"), max_tokens: maxTokens || 900, system: system, messages: [{ role: "user", content: user }] })
  });
  var j = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300) throw new Error("AI error: " + (j.error && j.error.message || res.getResponseCode()));
  return j.content.map(function (c) { return c.text || ""; }).join("").trim();
}

function parseJson_(text) {
  var t = String(text).replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(t); } catch (err) {}
  var a = t.indexOf("["), o = t.indexOf("{");
  var start = (a > -1 && (o < 0 || a < o)) ? a : o;
  var end = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
  return JSON.parse(t.slice(start, end + 1));
}

function replySystem_(S) {
  var pk = PACKAGES.map(function (p) { return "- " + p.name + ": $" + p.price + " (" + p.note + ")"; }).join("\n");
  return [
    "You write email replies for " + S.businessName + ", a photo booth rental company in Richmond, Virginia, using the Salsa 2 photo booth.",
    "Packages:\n" + pk,
    "Facts:\n" + S.aiKnowledge,
    "Rules:",
    "- Be warm, concise and specific. Plain text email, no markdown. 60-160 words.",
    "- Never confirm a booking, hold a date, promise availability, or agree to discounts, custom pricing, refunds or deposits. Say the team will confirm.",
    "- Only use prices and facts listed above. If the client asks something you don't know, say the team will follow up.",
    "- Sign off as: " + S.aiSignature,
    "- Set needsHuman true if the client wants to book/confirm, negotiates price, asks about payment, cancels or reschedules, complains, or asks anything you can't answer from the facts.",
    'Respond ONLY with JSON: {"reply": "...", "needsHuman": true|false, "reason": "short note for the admin"}'
  ].join("\n");
}

function leadContext_(lead, convo) {
  var av = lead.eventDate ? availability_(lead.eventDate, lead.eventDate) : { booked: [], limited: [] };
  var dateStatus = !lead.eventDate ? "no date given" : (av.booked.length ? "BOOKED/unavailable" : (av.limited.length ? "has other requests, not yet confirmed" : "open on the calendar"));
  return "Lead: " + JSON.stringify({ name: lead.name, eventDate: niceDate_(lead.eventDate), dateStatus: dateStatus, package: pkgName_(lead.package),
    eventType: lead.eventType, venue: lead.venue, guests: lead.guests, startTime: lead.startTime, notes: lead.notes || lead.message, status: lead.status }) +
    "\n\nConversation so far (oldest first):\n" + (convo || "(none yet)");
}

function convo_(leadId) {
  return rows_("Messages").filter(function (m) { return m.leadId === leadId && m.status !== "Discarded" && m.status !== "Needs approval"; })
    .slice(-8).map(function (m) { return (m.direction === "in" ? "CLIENT: " : "US: ") + String(m.body).slice(0, 1500); }).join("\n---\n");
}

function draftReply_(leadId, instruction) {
  var lead = find_("Leads", leadId); if (!lead) return { ok: false, error: "Lead not found" };
  var S = settings_();
  var user = leadContext_(lead, convo_(leadId)) + "\n\nWrite our next reply." + (instruction ? "\nAdmin instruction: " + instruction : "");
  var j = parseJson_(claude_(replySystem_(S), user));
  var m = log_(leadId, "out", "ai", "Needs approval", "", j.reply, j.reason || "");
  return { ok: true, draft: m, needsHuman: !!j.needsHuman };
}

/**
 * Time-driven (every 10 min): reads client replies in lead threads, drafts AI answers,
 * and sends them automatically when "AI auto-send" is on and the AI didn't flag the message.
 */
function checkInbox() {
  var S = settings_(), processed = 0, sent = 0, held = 0;
  rows_("Leads").forEach(function (lead) {
    if (!lead.threadId || lead.status === "Lost") return;
    var thread;
    try { thread = GmailApp.getThreadById(lead.threadId); } catch (err) { return; }
    if (!thread) return;
    var since = lead.lastInboundAt ? new Date(lead.lastInboundAt) : new Date(0);
    var fresh = thread.getMessages().filter(function (m) {
      return m.getDate() > since && String(m.getFrom()).toLowerCase().indexOf(String(lead.email).toLowerCase()) > -1;
    });
    if (!fresh.length) return;
    fresh.forEach(function (m) {
      log_(lead.id, "in", "client", "Received", m.getSubject(), stripQuoted_(m.getPlainBody()), "");
    });
    var last = fresh[fresh.length - 1];
    update_("Leads", lead.id, { lastInboundAt: last.getDate().toISOString(), status: lead.status === "Booked" ? "Booked" : "Needs reply" });
    processed++;
    if (!on_(S.aiReplies)) { notifyReply_(lead, S, null); return; }
    try {
      var j = parseJson_(claude_(replySystem_(S), leadContext_(lead, convo_(lead.id)) + "\n\nThe client just wrote the last CLIENT message. Write our reply."));
      if (on_(S.aiAutoSend) && !j.needsHuman) {
        last.reply(j.reply, { name: S.fromName, replyTo: S.notifyEmail || undefined });
        log_(lead.id, "out", "ai", "Sent", "Re: " + last.getSubject(), j.reply, "Auto-sent by AI" + (j.reason ? ": " + j.reason : ""));
        update_("Leads", lead.id, { lastReplyAt: now_(), status: lead.status === "Booked" ? "Booked" : "Replied" });
        sent++;
      } else {
        var d = log_(lead.id, "out", "ai", "Needs approval", "", j.reply, (j.needsHuman ? "Needs you: " : "") + (j.reason || ""));
        notifyReply_(lead, S, d);
        held++;
      }
    } catch (err) {
      log_(lead.id, "out", "ai", "Failed", "", "", String(err));
      notifyReply_(lead, S, null);
    }
  });
  return { ok: true, processed: processed, sent: sent, held: held };
}

function stripQuoted_(t) {
  t = String(t || "");
  var cut = t.search(/\n(On .+wrote:|-{2,}\s*Original Message|From: .+)/);
  return (cut > 0 ? t.slice(0, cut) : t).trim().slice(0, 3000);
}

function notifyReply_(lead, S, draft) {
  var to = S.notifyEmail || Session.getEffectiveUser().getEmail(); if (!to) return;
  MailApp.sendEmail({ to: to, name: "Capture RVA BuildFlow",
    subject: (draft ? "Approve AI reply: " : "Client replied: ") + lead.name,
    body: lead.name + " replied to your email." + (draft ? "\n\nAI draft waiting for your approval:\n\n" + draft.body : "") + "\n\nOpen the admin app: " + (S.website || "") + "/admin/" });
}

// ───────────────────────────────────────────── bookings
function saveBooking_(b) {
  if (!b || !b.date) return { ok: false, error: "A booking needs a date." };
  var data = clean_(b, TABS.Bookings);
  if (b.id && find_("Bookings", b.id)) return { ok: true, booking: update_("Bookings", b.id, data) };
  data.id = uid_("B"); data.createdAt = now_(); data.status = data.status || "Confirmed";
  return { ok: true, booking: append_("Bookings", data) };
}

function confirmBooking_(id, sendEmail) {
  var b = find_("Bookings", id); if (!b) return { ok: false, error: "Booking not found" };
  update_("Bookings", id, { status: "Confirmed" });
  var lead = b.leadId ? find_("Leads", b.leadId) : null;
  if (lead) update_("Leads", lead.id, { status: "Booked" });
  if (sendEmail && (lead || b.email)) {
    var S = settings_();
    var who = lead || { id: "", name: b.name, email: b.email, eventDate: b.date, package: b.package, venue: b.venue };
    who.eventDate = b.date; who.venue = b.venue;
    var pid = PACKAGES.filter(function (p) { return p.name === b.package || p.id === b.package; })[0];
    who.package = pid ? pid.id : b.package;
    var body = fill_(S.confirmBody, who, S);
    if (lead) sendReply_(lead.id, body, null, "confirm");
    else GmailApp.sendEmail(b.email, fill_(S.confirmSubject, who, S), body, { name: S.fromName });
  }
  return { ok: true };
}

// ───────────────────────────────────────────── social posts
function generatePosts_(count, theme) {
  var S = settings_();
  var lib = []; try { lib = JSON.parse(S.photoLibrary || "[]"); } catch (err) {}
  if (!lib.length) return { ok: false, error: "Add photos to the photo library in Settings first." };
  var recent = rows_("Posts").slice(-12).map(function (p) { return p.caption; }).join("\n---\n");
  var slots = nextSlots_(S, count);
  var system = "You are the social media manager for " + S.businessName + ", a photo booth rental company in Richmond, VA. Brand voice: " + S.brandVoice +
    "\nPackages: " + PACKAGES.map(function (p) { return p.name + " $" + p.price; }).join(", ") + ". " + S.aiKnowledge +
    "\nOnly state facts given here. Never invent clients, reviews, discounts or events." +
    '\nRespond ONLY with a JSON array of objects: [{"caption": "...", "photo": <index of the photo to use>}].';
  var user = "Write " + count + " distinct Facebook + Instagram posts (caption 40-110 words each)." +
    "\nIdeas to draw from: " + S.postIdeas + (theme ? "\nThis batch's theme: " + theme : "") +
    "\nPhotos available (index: url): " + lib.map(function (u, i) { return i + ": " + u.split("/").pop(); }).join(", ") +
    "\nAvoid repeating these recent captions:\n" + (recent || "(none)");
  var arr = parseJson_(claude_(system, user, 2000));
  var status = on_(S.socialAuto) ? "Approved" : "Draft";
  var made = arr.slice(0, count).map(function (p, i) {
    var url = lib[Math.max(0, Math.min(lib.length - 1, Number(p.photo) || 0))];
    return append_("Posts", { id: uid_("P"), createdAt: now_(), scheduledAt: slots[i] || slots[slots.length - 1], platforms: S.socialPlatforms,
      caption: p.caption, imageUrl: url, status: status, source: "ai" });
  });
  return { ok: true, posts: made };
}

/** Next open posting slots based on postDays/postTime, skipping slots that already have a post. */
function nextSlots_(S, count) {
  var dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var days = String(S.postDays || "Tue,Thu,Sat").split(",").map(function (d) { return dayMap[d.trim().slice(0, 3)]; }).filter(function (d) { return d != null; });
  var hm = String(S.postTime || "11:00").split(":");
  var taken = {}; rows_("Posts").forEach(function (p) { if (p.status !== "Skipped") taken[String(p.scheduledAt).slice(0, 10)] = true; });
  var out = [], d = new Date(); d.setDate(d.getDate() + 1);
  for (var i = 0; i < 90 && out.length < count; i++, d.setDate(d.getDate() + 1)) {
    if (days.indexOf(d.getDay()) < 0) continue;
    var iso = Utilities.formatDate(d, tz_(), "yyyy-MM-dd");
    if (taken[iso]) continue;
    var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(hm[0]) || 11, Number(hm[1]) || 0);
    out.push(at.toISOString());
  }
  return out;
}

function savePost_(p) {
  if (!p) return { ok: false, error: "Missing post" };
  var data = clean_(p, TABS.Posts);
  if (p.id && find_("Posts", p.id)) return { ok: true, post: update_("Posts", p.id, data) };
  data.id = uid_("P"); data.createdAt = now_(); data.source = data.source || "manual"; data.status = data.status || "Draft";
  data.platforms = data.platforms || settings_().socialPlatforms;
  return { ok: true, post: append_("Posts", data) };
}

function graph_(path, params) {
  var v = prop_("META_API_VERSION", "v21.0");
  var res = UrlFetchApp.fetch("https://graph.facebook.com/" + v + "/" + path, { method: "post", payload: params, muteHttpExceptions: true });
  var j = JSON.parse(res.getContentText());
  if (j.error) throw new Error(j.error.message);
  return j;
}

function publishPost_(id) {
  var p = find_("Posts", id); if (!p) return { ok: false, error: "Post not found" };
  var token = prop_("META_PAGE_TOKEN", ""), pageId = prop_("META_PAGE_ID", ""), igId = prop_("IG_USER_ID", "");
  if (!token) return { ok: false, error: "Connect Facebook first: META_PAGE_TOKEN is not set." };
  var plats = String(p.platforms || "facebook,instagram").toLowerCase();
  var patch = {}, errors = [];
  if (plats.indexOf("facebook") > -1 && !p.fbPostId) {
    try { patch.fbPostId = graph_(pageId + "/photos", { url: p.imageUrl, caption: p.caption, access_token: token }).post_id || "ok"; }
    catch (err) { errors.push("Facebook: " + err.message); }
  }
  if (plats.indexOf("instagram") > -1 && !p.igPostId) {
    try {
      if (!igId) throw new Error("IG_USER_ID is not set.");
      var c = graph_(igId + "/media", { image_url: p.imageUrl, caption: p.caption, access_token: token });
      var done = null;
      for (var i = 0; i < 5 && !done; i++) {
        try { done = graph_(igId + "/media_publish", { creation_id: c.id, access_token: token }); }
        catch (err) { if (i === 4) throw err; Utilities.sleep(3000); }
      }
      patch.igPostId = done.id;
    } catch (err) { errors.push("Instagram: " + err.message); }
  }
  patch.error = errors.join(" | ");
  patch.status = errors.length ? (patch.fbPostId || patch.igPostId ? "Partly published" : "Failed") : "Published";
  if (!errors.length || patch.fbPostId || patch.igPostId) patch.publishedAt = now_();
  update_("Posts", id, patch);
  return { ok: !errors.length, error: patch.error, status: patch.status };
}

/** Time-driven (hourly): publishes approved posts whose time has come. */
function publishDue() {
  var now = new Date(), n = 0;
  rows_("Posts").forEach(function (p) {
    if (p.status === "Approved" && p.scheduledAt && new Date(p.scheduledAt) <= now) { publishPost_(p.id); n++; }
  });
  return n;
}

/** Time-driven (weekly, Sunday evening): drafts next week's posts. Auto-approved when "Social autopilot" is on. */
function generateWeekly() {
  var S = settings_();
  var days = String(S.postDays || "").split(",").filter(String).length || 3;
  var upcoming = rows_("Posts").filter(function (p) { return (p.status === "Draft" || p.status === "Approved") && new Date(p.scheduledAt) > new Date(); }).length;
  var need = Math.max(0, days - upcoming);
  if (need && prop_("ANTHROPIC_API_KEY", "")) {
    generatePosts_(need, "");
    if (!on_(S.socialAuto)) {
      var to = S.notifyEmail || Session.getEffectiveUser().getEmail();
      if (to) MailApp.sendEmail({ to: to, name: "Capture RVA BuildFlow", subject: need + " social posts ready for approval",
        body: "The AI drafted " + need + " Facebook + Instagram posts for next week. Review and approve them in the admin app: " + (S.website || "") + "/admin/" });
    }
  }
}

// ───────────────────────────────────────────── admin data
function getAll_() {
  var S = settings_();
  return { ok: true, leads: rows_("Leads"), bookings: rows_("Bookings"), blocked: rows_("Blocked"), messages: rows_("Messages"),
    posts: rows_("Posts"), settings: S, packages: PACKAGES,
    connected: { ai: !!prop_("ANTHROPIC_API_KEY", ""), facebook: !!prop_("META_PAGE_TOKEN", "") && !!prop_("META_PAGE_ID", ""), instagram: !!prop_("IG_USER_ID", "") } };
}

function saveSettings_(obj) {
  var s = sheet_("Settings"), d = s.getDataRange().getValues(), idx = {};
  for (var i = 1; i < d.length; i++) idx[d[i][0]] = i + 1;
  Object.keys(obj || {}).forEach(function (k) {
    if (!(k in DEFAULT_SETTINGS)) return;
    var v = String(obj[k]);
    if (idx[k]) s.getRange(idx[k], 2).setValue(v); else { s.appendRow([k, v]); idx[k] = s.getLastRow(); }
  });
  return { ok: true, settings: settings_() };
}

// ───────────────────────────────────────────── setup
function setup() {
  Object.keys(TABS).forEach(sheet_);
  var existing = {}; rows_("Settings").forEach(function (r) { existing[r.key] = true; });
  var s = sheet_("Settings");
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { if (!existing[k]) s.appendRow([k, DEFAULT_SETTINGS[k]]); });
  var def = ss_().getSheetByName("Sheet1"); if (def && def.getLastRow() === 0) ss_().deleteSheet(def);
  installTriggers();
  Logger.log("Capture RVA backend ready. Deploy as a web app next.");
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (["checkInbox", "publishDue", "generateWeekly"].indexOf(t.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("checkInbox").timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger("publishDue").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("generateWeekly").timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
}
