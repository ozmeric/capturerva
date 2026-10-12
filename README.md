# capturerva.com

Static site for Capture RVA (photo booth rentals, Richmond VA). Hosted on GitHub Pages.
Designed & built by Weblina LLC.

## Edit content
All copy, packages, prices, events and photos live at the top of `_build/build.py`.
After editing, run `python3 _build/build.py` and commit. The script writes every page,
`sitemap.xml`, `robots.txt` and `CNAME`.

Contact details still to fill in (`SITE` in `_build/build.py`): `email`, `phone`.

## Go-live checklist
1. Push this folder to a GitHub repo, then Settings > Pages > Deploy from branch `main` / root.
2. Actions > **Self-host photos** > Run workflow (copies photos off WordPress). Do this before DNS moves.
3. DNS: point `capturerva.com` to GitHub Pages (A records 185.199.108.153 / .109 / .110 / .111,
   `www` CNAME to `<user>.github.io`). Enable "Enforce HTTPS".
4. Set up the backend (`_backend/SETUP.md`), then set the Worker URL in `assets/js/config.js` and
   `admin/index.html`. Until then the booking calendar runs in demo mode and forms don't send.
5. Google Search Console: verify the domain and submit `https://capturerva.com/sitemap.xml`.
   Update the Google Business Profile website link.

## Admin app (BuildFlow)
`/admin/` is the Capture RVA admin PWA: Today, Schedule, Leads (with AI replies), Social, Settings.
Backend code and setup steps are in `_backend/` (see `_backend/SETUP.md`). Folders starting with `_`
are not published by GitHub Pages.

## Old WordPress URLs
`/about-2/`, `/contact-2/`, `/services/`, `/booking/` redirect to the new pages
(`/Booking/` is handled in `404.html`).
