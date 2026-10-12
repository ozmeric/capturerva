# Capture RVA — BuildFlow backend setup

Stack: GitHub Pages (website + `/admin/`) → Cloudflare Worker → Google Apps Script → Google Sheets.
Email goes out through the Gmail account that owns the Apps Script, so set it up under the
Capture RVA Google account (the inbox clients should reply to).

## 1. Google Sheet + Apps Script (15 min)
1. Signed in as the Capture RVA Google account, create a Google Sheet named **Capture RVA BuildFlow**.
2. Extensions > Apps Script. Replace `Code.gs` with `_backend/Code.gs`.
   Project Settings > check "Show appsscript.json", then paste `_backend/appsscript.json`.
3. Project Settings > Script properties > add:

| Property | Value |
|---|---|
| `ADMIN_PIN` | the admin app PIN (6+ digits) |
| `ANTHROPIC_API_KEY` | from console.anthropic.com (AI replies + AI posts) |
| `AI_MODEL` | optional, default `claude-haiku-5-5` |
| `META_PAGE_ID` | step 4 |
| `META_PAGE_TOKEN` | step 4 |
| `IG_USER_ID` | step 4 |

4. In the editor, select `setup` and click Run. Approve the permissions (Sheets, Gmail, external requests, triggers).
   This creates the tabs (Leads, Bookings, Blocked, Messages, Posts, Settings) and three automations:
   - `checkInbox` every 10 minutes — reads client replies, AI drafts or sends an answer
   - `publishDue` hourly — publishes approved posts whose time has come
   - `generateWeekly` Sundays 6 pm — AI drafts next week's posts
5. Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Copy the `/exec` URL.

## 2. Cloudflare Worker (5 min)
1. Cloudflare > Workers > Create > paste `_backend/worker.js`.
2. Settings > Variables > add `APPS_SCRIPT_URL` = the `/exec` URL. Deploy.
3. Put the Worker URL in two places, then commit:
   - `assets/js/config.js` → `apiUrl`
   - `admin/index.html` → `CONFIG.apiUrl`

## 3. Test
- Book a date on capturerva.com/book → the thank-you email arrives, and a lead alert goes to `notifyEmail`.
- Open capturerva.com/admin, sign in with the PIN, find the lead, tap **Confirm & email client**.
- Reply to the thank-you email from the client's inbox, then tap **Check email now** in the admin.

## 4. Facebook + Instagram (20–30 min, once)
Requirements: a Facebook **Page** for Capture RVA, and the Instagram account switched to a
**Business** (or Creator) account and linked to that Page (Instagram app > Settings > Account type and tools,
then Page settings > Linked accounts).

1. developers.facebook.com > My Apps > Create app (type: Business). Add the products
   "Facebook Login for Business" and "Instagram Graph API".
2. Graph API Explorer: pick the app, choose "Get User Access Token" with
   `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, business_management`.
3. Exchange it for a long-lived user token, then call `GET /me/accounts`. The Capture RVA row gives the
   **Page ID** and a **Page access token** (from a long-lived user token, this Page token does not expire).
4. `GET /{page-id}?fields=instagram_business_account` gives the **IG_USER_ID**.
5. Add all three to Script properties. The admin's Today screen shows the connections as "Connected".

Instagram only accepts photos at public JPEG URLs. The photo library defaults to
`https://capturerva.com/assets/img/events/*.jpg`, which exists after the "Self-host photos" GitHub job runs.

## How the autopilot behaves
| Event | What happens | Setting |
|---|---|---|
| New website booking or message | Standard thank-you email goes out instantly; admin gets a lead alert | "Thank-you email on every new lead" (on) |
| Client replies to the email | AI writes an answer. Off: waits in Leads for approval. On: sends itself | "AI drafts replies" (on), "Send AI replies without approval" (off) |
| Client wants to book, pay, negotiate, cancel or complains | AI reply always waits for the admin, even with auto-send on | — |
| Sunday 6 pm | AI drafts posts for next week's posting days | "Publish social posts without approval" (off = admin approves) |
| Approved post's time arrives | Publishes to Facebook + Instagram | — |
| Admin taps Confirm & email client | Booking confirmed, confirmation email sent, date shows as booked on the website | "Booths available per day" |

The AI only uses the package prices and the "What the AI knows" text in Settings. It never confirms a
booking or a price change on its own.

## Limits
- Gmail via Apps Script: about 100 emails/day on a free Gmail account, 1,500/day on Google Workspace.
- Apps Script triggers: 90 minutes of run time per day on free accounts; this setup uses a small fraction.
