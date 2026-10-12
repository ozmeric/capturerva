#!/usr/bin/env python3
"""Capture RVA static site builder.

Usage:
  python3 _build/build.py                 # production build into the repo root (clean URLs, local images)
  python3 _build/build.py --preview OUT   # preview build into OUT (relative links, remote images)

Edit SITE / PACKAGES / EVENTS below, re-run, commit. GitHub Pages serves the repo root.
"""
import json, os, sys, html
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- settings
SITE = {
    "name": "Capture RVA",
    "domain": "https://capturerva.com",
    "email": "hello@capturerva.com",     # TODO confirm the real inbox
    "phone": "",                          # TODO add e.g. "(804) 555-0123" — leave empty to hide
    "instagram": "https://www.instagram.com/capture.rva/",
    "facebook": "https://www.facebook.com/share/15khMyve44/?mibextid=wwXIfr",
    "city": "Richmond",
    "region": "VA",
    "areas": ["Richmond", "Midlothian", "Chesterfield", "Henrico", "Glen Allen", "Short Pump",
              "Powhatan", "Mechanicsville", "Petersburg", "Williamsburg", "Charlottesville"],
    "offer": "Limited time: the drop-off booth is $446 (regularly $550).",
}
GA_ID = ""  # optional Google Analytics 4 ID, e.g. "G-XXXXXXX"

PACKAGES = [
    {
        "id": "drop-off", "name": "Salsa 2 Drop-Off", "price": 446, "was": 550,
        "for": "Self-run fun for birthdays, office parties and casual get-togethers.",
        "items": ["The Salsa 2 booth, set up and ready", "Up to 4 hours of runtime", "Unlimited digital sessions",
                  "Custom art design and start screen", "Private online gallery",
                  "Sequin or pillowcase backdrop", "60 miles of round-trip travel included"],
        "note": "Digital only. No attendant: we set it up, your guests run it.",
    },
    {
        "id": "exclusive", "name": "Salsa 2 Exclusive", "price": 750,
        "for": "Upscale parties and corporate VIP events that want a hosted booth.",
        "inherit": "Everything in Drop-Off, plus:",
        "items": ["A dedicated booth attendant all event", "Premium props and accessories"],
        "plus": True,
    },
    {
        "id": "wedding", "name": "Wedding Elegance", "price": 950, "featured": True,
        "for": "Weddings, engagement parties and anniversaries.",
        "inherit": "Everything in Exclusive, plus:",
        "items": ["Up to 4 hours of wedding-day coverage", "Premium backdrops: elegant drapes, floral or custom",
                  "Exclusive wedding props", "Start screen designed in your wedding colors"],
        "plus": True,
        "bonus": "Free 2-hour photo booth at your rehearsal dinner.",
    },
]
TRAVEL_NOTE = "Every package includes 60 miles of round-trip travel; beyond that it's $1.50 per mile."

EVT = "https://capturerva.com/wp-content/uploads/2025/06/"
def ev(slug, fname, alt, w=1080, h=1440):
    return {"local": f"assets/img/events/{slug}.jpg", "remote": EVT + fname, "alt": alt, "w": w, "h": h}

EVENTS = [
    {"id": "cgm", "title": "Classic Granite & Marble", "when": "Valentine's Day happy hour, February 2025",
     "blurb": "A showroom happy hour where the booth became the after-work hangout.",
     "photos": [ev(f"cgm-{i+1}", f, "Guests posing at the Capture RVA booth during Classic Granite & Marble's Valentine's Day happy hour", 1512, 1563)
                for i, f in enumerate(["CGM_Valentines_Day_Happy_Hour_photo_20250214_Time-160213_2wyar8.jpeg",
                                       "CGM_Valentines_Day_Happy_Hour_photo_20250214_Time-170236_62prmz.jpeg",
                                       "CGM_Valentines_Day_Happy_Hour_photo_20250214_Time-160212_dy5o04.jpeg",
                                       "CGM_Valentines_Day_Happy_Hour_photo_20250214_Time-170247_kclgrk.jpeg",
                                       "CGM_Valentines_Day_Happy_Hour_photo_20250214_Time-160267_qsuuwj.jpeg"])]},
    {"id": "krisi", "title": "Krisi High Heels Dance Showcase", "when": "June 2025",
     "blurb": "Dancers and families capturing showcase night in costume.",
     "photos": [ev(f"krisi-{i+1}", f, "Dancers at the Krisi High Heels Dance Showcase posing in the Capture RVA photo booth")
                for i, f in enumerate(["Krisi_High_Heels_Dance_Showcase_photo_20250607_Time-180698_ew2t4x.jpeg",
                                       "Krisi_High_Heels_Dance_Showcase_photo_20250607_Time-190669_lb3ogu.jpeg",
                                       "Krisi_High_Heels_Dance_Showcase_photo_20250607_Time-180656_nqnos1.jpeg",
                                       "Krisi_High_Heels_Dance_Showcase_photo_20250607_Time-180694_og7le4.jpeg",
                                       "Krisi_High_Heels_Dance_Showcase_photo_20250607_Time-180682_ogup6v.jpeg",
                                       "Krisi_High_Heels_Dance_Showcase_photo_20250607_Time-180695_sqtqnf.jpeg"])]},
    {"id": "rountrey", "title": "Rountrey Social", "when": "Father's Day event, June 2025",
     "blurb": "A community Father's Day celebration with dads, kids and grandparents in every frame.",
     "photos": [ev(f"rountrey-{i+1}", f, "Families at the Rountrey Father's Day event posing in the Capture RVA photo booth")
                for i, f in enumerate(["RounTrey_Fathers_Day_Event_photo_20250613_Time-190637_6ousto.jpeg",
                                       "RounTrey_Fathers_Day_Event_photo_20250613_Time-190609_bhgpln.jpeg",
                                       "RounTrey_Fathers_Day_Event_photo_20250613_Time-200681_ltjsqr.jpeg",
                                       "RounTrey_Fathers_Day_Event_photo_20250613_Time-190644_st0v4y.jpeg",
                                       "RounTrey_Fathers_Day_Event_photo_20250613_Time-200683_xnefyw.jpeg"])]},
    {"id": "pro", "title": "Pro Smart Series", "when": "April 2025",
     "blurb": "A professional networking series that used the booth to break the ice.",
     "photos": [ev(f"pro-{i+1}", f, "Attendees of the Pro Smart Series event in the Capture RVA photo booth")
                for i, f in enumerate(["PRO_Smart_Series_photo_20250423_Time-170442_6qnzv2.jpeg",
                                       "PRO_Smart_Series_photo_20250423_Time-190414_82w4nk.jpeg",
                                       "PRO_Smart_Series_photo_20250423_Time-170415_9idxfh.jpeg",
                                       "PRO_Smart_Series_photo_20250423_Time-190401_glb47o.jpeg",
                                       "PRO_Smart_Series_photo_20250423_Time-160451_lwufpb.jpeg",
                                       "PRO_Smart_Series_photo_20250423_Time-190402_rw0fdk.jpeg"])]},
    {"id": "tmm", "title": "Talking Monkey Media", "when": "March 2025",
     "blurb": "A media company event with a branded start screen.",
     "photos": [ev(f"tmm-{i+1}", f, "Guests at a Talking Monkey Media event in the Capture RVA photo booth")
                for i, f in enumerate(["TMM_Event_photo_20250311_Time-180343_ks1pmg.jpeg",
                                       "TMM_Event_photo_20250311_Time-190329_mpvbbw.jpeg"])]},
    {"id": "bday", "title": "Birthday parties", "when": "2025",
     "blurb": "Backyard and venue birthdays across the Richmond area.",
     "photos": [ev("bday-1", "UG_Baha_Bday_Photo_20250518_Time-181911_3wtrs2.jpeg", "Birthday guests posing with props in the Capture RVA photo booth"),
                ev("bday-2", "Screenshot-2025-06-21-at-10.17.52 PM.png", "Birthday party photo booth picture by Capture RVA", 486, 726)]},
]
LOGO = {"local": "assets/img/capture-rva-logo.png", "remote": "https://capturerva.com/wp-content/uploads/2024/12/cropped-cropped-CAPTURERVA-270x270.png"}

def unsplash(pid, alt, w=1400):
    return {"remote": f"https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&w={w}&q=75", "alt": alt, "stock": True, "w": 1400, "h": 1120}

STOCK = {
    "props": unsplash("1746587224861-521244472226", "Friends laughing with props inside a photo booth"),
    "strips": unsplash("1784146042602-7bef7460aba2", "A hand holding three black-and-white photo booth strips"),
    "toast": unsplash("1527529482837-4698179dc6ce", "Coworkers raising glasses at an evening event"),
    "wedding": unsplash("1648154164366-d067faecdc51", "A bride and groom dancing at their wedding reception"),
    "tables": unsplash("1511795409834-ef04bbd61622", "An elegant reception table with a floral centerpiece"),
    "confetti": unsplash("1699730185428-d11054059c7f", "A group celebrating with confetti and balloons"),
    "balloons": unsplash("1763652566301-e88adc3d3d89", "A woman celebrating her 40th birthday with balloons"),
    "party": unsplash("1505236858219-8359eb29e329", "A crowd dancing at a party"),
}

def ph(eid, i):
    return next(e for e in EVENTS if e["id"] == eid)["photos"][i]

# ---------------------------------------------------------------- mode helpers
class B:
    preview = False
    out = ROOT
    depth = 0

def href(path):
    """path like '' or 'packages/'. Returns a link for the current mode."""
    if B.preview:
        return ("../" * B.depth) + (path + "index.html" if path == "" or path.endswith("/") else path)
    return "/" + path

def asset(p):
    return ("../" * B.depth) + p if B.preview else "/" + p

def has_local(im):
    return "local" in im and os.path.exists(os.path.join(ROOT, im["local"]))

def img_src(im):
    """Self-hosted copy when it exists in assets/img, otherwise the original URL."""
    if im.get("stock"):
        return im["remote"]
    if B.preview or not has_local(im):
        return im["remote"]
    return asset(im["local"])

def abs_img(im):
    if im.get("stock") or not has_local(im):
        return im["remote"]
    return SITE["domain"] + "/" + im["local"]

def esc(s): return html.escape(s, quote=True)

def img(im, cls="", eager=False, sizes=None):
    a = f' class="{cls}"' if cls else ""
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return f'<img src="{esc(img_src(im))}" alt="{esc(im["alt"])}" width="{im["w"]}" height="{im["h"]}" {load}{a}>'

# ---------------------------------------------------------------- layout
NAV = [("packages/", "Packages"), ("weddings/", "Weddings"), ("corporate-events/", "Corporate"),
       ("birthday-parties/", "Birthdays"), ("gallery/", "Gallery"), ("about/", "About"), ("contact/", "Contact")]

def business_schema():
    s = {
        "@context": "https://schema.org",
        "@type": "EntertainmentBusiness",
        "@id": SITE["domain"] + "/#business",
        "name": SITE["name"],
        "url": SITE["domain"] + "/",
        "logo": abs_img(LOGO),
        "image": [abs_img(ph("cgm", 0)), abs_img(ph("krisi", 0))],
        "description": "Photo booth rentals in Richmond, VA with the Salsa 2 booth: custom start screens, unlimited digital sessions and private online galleries for weddings, birthdays and corporate events.",
        "priceRange": "$446–$950",
        "address": {"@type": "PostalAddress", "addressLocality": SITE["city"], "addressRegion": SITE["region"], "addressCountry": "US"},
        "areaServed": [{"@type": "City", "name": f"{a}, VA"} for a in SITE["areas"]],
        "sameAs": [SITE["instagram"], SITE["facebook"]],
    }
    if SITE["email"]: s["email"] = SITE["email"]
    if SITE["phone"]: s["telephone"] = SITE["phone"]
    return s

def crumbs_schema(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE["domain"] + "/" + p}
                                for i, (p, n) in enumerate(trail)]}

def head(page):
    canonical = SITE["domain"] + "/" + page["path"]
    og = abs_img(page.get("og") or ph("krisi", 0))
    schemas = [business_schema()] + page.get("schema", [])
    ld = "\n".join(f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>' for s in schemas)
    ga = ""
    if GA_ID and not B.preview:
        ga = f'''<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>'''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(page["title"])}</title>
<meta name="description" content="{esc(page["desc"])}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="{'noindex' if page.get('noindex') else 'index, follow, max-image-preview:large'}">
<meta name="theme-color" content="#0B4A4F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Capture RVA">
<meta property="og:title" content="{esc(page.get("og_title", page["title"]))}">
<meta property="og:description" content="{esc(page["desc"])}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{esc(og)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="geo.region" content="US-VA">
<meta name="geo.placename" content="Richmond">
<link rel="icon" href="{asset('assets/img/favicon-48.png')}" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="{asset('assets/img/apple-touch-icon.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Unbounded:wght@500;600;700&display=swap">
<link rel="stylesheet" href="{asset('assets/css/site.css')}">
{ld}
{ga}
</head>'''

def header(active):
    links = "\n".join(
        f'<a href="{href(p)}"{" aria-current=\"page\"" if p == active else ""}>{n}</a>' for p, n in NAV)
    return f'''<body>
<a class="skip" href="#main">Skip to content</a>
<div class="offer">{esc(SITE["offer"])} <a href="{href("book/")}?package=drop-off">Check your date</a></div>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{href("")}"><img src="{asset('assets/img/logo-horizontal-white.png')}" alt="Capture RVA" width="174" height="54"></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">
      {links}
      <a class="btn btn-primary" href="{href("book/")}">Check your date</a>
    </nav>
  </div>
</header>
<main id="main">'''

def footer(extra_js=""):
    yr = date.today().year
    contact = []
    if SITE["phone"]:
        contact.append(f'<li><a href="tel:{SITE["phone"]}">{esc(SITE["phone"])}</a></li>')
    if SITE["email"]:
        contact.append(f'<li><a href="mailto:{SITE["email"]}">{esc(SITE["email"])}</a></li>')
    contact.append(f'<li><a href="{SITE["instagram"]}" rel="noopener" target="_blank">Instagram @capture.rva</a></li>')
    contact.append(f'<li><a href="{SITE["facebook"]}" rel="noopener" target="_blank">Facebook</a></li>')
    areas = ", ".join(SITE["areas"][:-1]) + " and " + SITE["areas"][-1]
    return f'''</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand brand-stacked" href="{href("")}"><img src="{asset('assets/img/logo-stacked-white.png')}" alt="Capture RVA" width="106" height="111" loading="lazy"></a>
        <p>Photo booth rentals for weddings, birthdays and company events in {areas}, Virginia.</p>
      </div>
      <div>
        <h2>Book</h2>
        <ul>
          <li><a href="{href("packages/")}">Packages and pricing</a></li>
          <li><a href="{href("book/")}">Check your date</a></li>
          <li><a href="{href("faq/")}">Questions</a></li>
        </ul>
      </div>
      <div>
        <h2>Events</h2>
        <ul>
          <li><a href="{href("weddings/")}">Wedding photo booth</a></li>
          <li><a href="{href("corporate-events/")}">Corporate events</a></li>
          <li><a href="{href("birthday-parties/")}">Birthday parties</a></li>
          <li><a href="{href("gallery/")}">Gallery</a></li>
        </ul>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>{"".join(contact)}</ul>
      </div>
    </div>
    <div class="legal">
      <span>© {yr} Capture RVA. Richmond, Virginia.</span>
      <span>Designed &amp; built by <a href="https://weblina.llc" rel="noopener">Weblina LLC</a></span>
    </div>
  </div>
</footer>
<script src="{asset('assets/js/config.js')}"></script>
<script src="{asset('assets/js/site.js')}" defer></script>
{extra_js}
</body>
</html>'''

def page_hero(title, lede, trail, image=None, caption=None):
    crumbs = " / ".join([f'<a href="{href(p)}">{esc(n)}</a>' for p, n in trail[:-1]] + [esc(trail[-1][1])])
    if image:
        cap = f"<figcaption>{esc(caption)}</figcaption>" if caption else ""
        return f'''<section class="page-hero has-img"><div class="wrap">
<div><nav class="crumbs" aria-label="Breadcrumb">{crumbs}</nav><h1>{esc(title)}</h1><p>{lede}</p>
<div class="center-cta"><a class="btn btn-primary" href="{href("book/")}">Check your date</a><a class="btn btn-ghost" href="{href("packages/")}">See packages</a></div></div>
<figure>{img(image, eager=True)}{cap}</figure>
</div></section>'''
    return f'''<section class="page-hero"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb">{crumbs}</nav><h1>{esc(title)}</h1><p>{lede}</p>
</div></section>'''

def cta_band(title="Your date might still be open.", text="Most Saturdays book weeks ahead. Pick your date and we'll confirm by email."):
    return f'''<section class="cta-band"><div class="wrap">
<div><h2>{esc(title)}</h2><p>{esc(text)}</p></div>
<a class="btn btn-dark" href="{href("book/")}">Check your date</a>
</div></section>'''

# ---------------------------------------------------------------- shared blocks
def packages_block(heading=True, highlight=None):
    cols = []
    for p in PACKAGES:
        feat = " featured" if p.get("featured") else ""
        price = f'${p["price"]}' + (f' <s>${p["was"]}</s>' if p.get("was") else "")
        note = '<p class="price-note">Limited-time price</p>' if p.get("was") else ('<p class="price-note">Best for weddings</p>' if p.get("featured") else '<p class="price-note">&nbsp;</p>')
        inherit = f'<li class="inherit">{esc(p["inherit"])}</li>' if p.get("inherit") else ""
        items = "".join(f'<li{" class=\"plus\"" if p.get("plus") else ""}>{esc(i)}</li>' for i in p["items"])
        bonus = f'<div class="bonus">Bonus: {esc(p["bonus"])}</div>' if p.get("bonus") else ""
        extra = f'<p class="muted" style="font-size:.9rem">{esc(p["note"])}</p>' if p.get("note") else ""
        btn = "btn-primary" if p.get("featured") else "btn-dark"
        cols.append(f'''<article class="pkg{feat}" id="{p["id"]}" aria-labelledby="{p["id"]}-h">
<h3 id="{p["id"]}-h">{esc(p["name"])}</h3>
<p class="for">{esc(p["for"])}</p>
<div class="price">{price}</div>{note}
<ul>{inherit}{items}</ul>{bonus}{extra}
<a class="btn {btn}" href="{href("book/")}?package={p["id"]}">Book {esc(p["name"].replace("Salsa 2 ", ""))}</a>
</article>''')
    head_html = ""
    if heading:
        head_html = f'''<div class="section-head"><h2>Three ways to bring the booth</h2>
<p>Every package runs up to four hours with unlimited sessions, a start screen designed for your event and a private online gallery for sharing afterward.</p></div>'''
    return f'''{head_html}<div class="packages">{"".join(cols)}</div>
<p class="pkg-foot">{esc(TRAVEL_NOTE)} Not sure which fits? <a href="{href("contact/")}">Ask us</a>.</p>'''

def steps_block(dark=False):
    return f'''<div class="section-head"><h2>How booking works</h2></div>
<ol class="steps">
<li><h3>Pick your date</h3><p>Check the calendar and send a request with your package and venue. Takes about two minutes.</p></li>
<li><h3>We confirm</h3><p>You get an email back confirming the date and the details of your event.</p></li>
<li><h3>We design your screen</h3><p>Your names, logo, colors or theme go on the start screen and photo layout.</p></li>
<li><h3>Strike a pose</h3><p>We set up before guests arrive. Afterward, everyone gets the photos in your private online gallery.</p></li>
</ol>'''

def quotes_block():
    return '''<div class="section-head"><h2>What hosts tell us</h2></div>
<div class="quotes">
<figure class="quote"><div class="stars" aria-label="5 out of 5 stars">★★★★★</div>
<blockquote>Capture RVA made our event so much more enjoyable with their fun photo booth. Guests loved it!</blockquote>
<figcaption><strong>Toni Owen Alaimo</strong>, Rountrey Social</figcaption></figure>
<figure class="quote"><div class="stars" aria-label="5 out of 5 stars">★★★★★</div>
<blockquote>The team at Capture RVA was professional and friendly! The photos turned out amazing, and we had a blast.</blockquote>
<figcaption><strong>Event manager</strong>, Classic Granite &amp; Marble</figcaption></figure>
</div>'''

FAQ = [
    ("How much does a photo booth rental cost in Richmond?",
     "Our packages are $446 for the self-run Drop-Off booth (limited-time price, regularly $550), $750 for the attended Exclusive booth and $950 for Wedding Elegance. Each includes up to four hours, unlimited digital sessions and 60 miles of round-trip travel."),
    ("How long is the booth at my event?",
     "Every package includes up to four hours of runtime. If your event runs longer, mention it in your request and we'll quote the extra time."),
    ("Do you travel outside Richmond?",
     "Yes. We regularly work in Midlothian, Chesterfield, Henrico, Powhatan, Williamsburg and Charlottesville. 60 miles of round-trip travel is included; beyond that it's $1.50 per mile."),
    ("Do guests get prints?",
     "Our packages are digital. Guests can take unlimited sessions, and every photo lands in a private online gallery you can share after the event."),
    ("Is someone there to run the booth?",
     "With Drop-Off, we set up the booth and your guests run it themselves; it's built to be easy. Exclusive and Wedding Elegance include a dedicated attendant for the whole event."),
    ("Can you match our theme, colors or logo?",
     "Yes. Every package includes a custom start screen and photo design. Send us your colors, names, logo or event theme and we'll design around it."),
    ("Which backdrops can I choose?",
     "Drop-Off and Exclusive come with a sequin or pillowcase backdrop. Wedding Elegance adds premium backdrops like elegant drapes, floral walls or a custom theme."),
    ("How far ahead should I book?",
     "As soon as you have a date. Fridays and Saturdays in spring, fall and December go first. The calendar on our booking page shows what's open."),
]

def faq_block(items, schema=False):
    rows = "".join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in items)
    return f'<div class="faq">{rows}</div>'

def faq_schema(items):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}

def offer_schema():
    return {"@context": "https://schema.org", "@type": "Service",
            "serviceType": "Photo booth rental", "name": "Photo booth rental in Richmond, VA",
            "provider": {"@id": SITE["domain"] + "/#business"},
            "areaServed": [{"@type": "City", "name": f"{a}, VA"} for a in SITE["areas"]],
            "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Photo booth packages",
                                "itemListElement": [{"@type": "Offer", "name": p["name"], "price": str(p["price"]), "priceCurrency": "USD",
                                                     "url": SITE["domain"] + "/packages/#" + p["id"],
                                                     "description": p["for"]} for p in PACKAGES]}}

def contact_sheet(n=12):
    picks = [ph("krisi", 0), ph("cgm", 0), ph("rountrey", 0), ph("pro", 0), ph("krisi", 2), ph("tmm", 0),
             ph("cgm", 2), ph("rountrey", 2), ph("bday", 0), ph("pro", 2), ph("krisi", 4), ph("cgm", 3)][:n]
    caps = {"krisi": "Krisi Dance Showcase", "cgm": "Classic Granite & Marble", "rountrey": "Rountrey Social",
            "pro": "Pro Smart Series", "tmm": "Talking Monkey Media", "bday": "Birthday party"}
    out = []
    for i, p in enumerate(picks):
        cls = ' class="wide"' if i in (0, 7) else ""
        key = p["local"].split("/")[-1].split("-")[0]
        out.append(f'<figure{cls}>{img(p)}<figcaption>{caps.get(key, "")}</figcaption></figure>')
    return f'<div class="sheet">{"".join(out)}</div>'

def areas_block():
    lis = "".join(f"<li>{esc(a)}</li>" for a in SITE["areas"])
    return f'''<div class="section-head"><h2>Where we set up</h2>
<p>Based in the Richmond area. We bring the booth to venues, backyards, offices and ballrooms across Central Virginia.</p></div>
<ul class="areas">{lis}</ul>
<p class="muted">{esc(TRAVEL_NOTE)}</p>'''

# ---------------------------------------------------------------- pages
def p_home():
    strip = [ph("krisi", 0), ph("cgm", 0), ph("rountrey", 0)]
    frames = "".join(f'<div class="strip-frame"><img src="{esc(img_src(s))}" alt="{esc(s["alt"])}" width="{s["w"]}" height="{s["h"]}" fetchpriority="high"><span class="count" aria-hidden="true"></span><span class="flash" aria-hidden="true"></span></div>' for s in strip)
    clients = ["Classic Granite & Marble", "Rountrey Social", "Powhatan Chamber of Commerce", "First Heritage Mortgage",
               "Krisi High Heels Dance Showcase", "365 Pergola", "Talking Monkey Media"]
    body = f'''
<section class="hero">
  <div class="wrap">
    <div>
      <h1>The photo booth your guests line up for.</h1>
      <p class="hero-lede">Capture RVA brings the Salsa 2 photo booth to weddings, birthdays and company events across Richmond, VA, with a start screen designed for your event and a private online gallery when the night is over.</p>
      <form class="date-check" action="{href("book/")}" method="get">
        <label>Your event date<input type="date" name="date" required></label>
        <button class="btn btn-primary" type="submit">Check availability</button>
      </form>
      <p class="hero-area">Serving Richmond, Midlothian, Henrico, Chesterfield, Williamsburg and Charlottesville.</p>
    </div>
    <div class="strip-stage" aria-label="Photo strip of real Capture RVA guests">
      <div class="strip">
        {frames}
        <div class="strip-foot"><span>capture rva</span><small>real guests, real events</small></div>
      </div>
      <span class="strip-tag">Unlimited sessions</span>
    </div>
  </div>
</section>

<section class="clients" aria-label="Clients">
  <div class="wrap"><p>Booked by</p><ul>{"".join(f"<li>{esc(c)}</li>" for c in clients)}</ul></div>
</section>

<section class="section on-light" id="packages"><div class="wrap">{packages_block()}</div></section>

<section class="section dark"><div class="wrap">{steps_block(dark=True)}</div></section>

<section class="section"><div class="wrap">
  <div class="section-head"><h2>Straight off the booth</h2>
  <p>Every photo here came out of our booth at a real Richmond-area event.</p></div>
  {contact_sheet()}
  <div class="center-cta"><a class="btn btn-dark" href="{href("gallery/")}">See the full gallery</a></div>
</div></section>

<section class="section tint"><div class="wrap split">
  <div>
    <h2>Built around your event, not a template</h2>
    <p>The start screen guests tap and the layout on every photo carry your names, logo or theme. Pick a sequin or pillowcase backdrop, or go floral and draped for a wedding.</p>
    <ul>
      <li>Unlimited sessions for up to four hours</li>
      <li>Premium props with Exclusive and Wedding packages</li>
      <li>A private online gallery so nobody has to ask "can you send me that?"</li>
    </ul>
    <a class="btn btn-dark" href="{href("packages/")}">Compare packages</a>
  </div>
  <div>{img(STOCK["props"])}</div>
</div></section>

<section class="section dark"><div class="wrap">{quotes_block()}</div></section>

<section class="section"><div class="wrap">
  <div class="section-head"><h2>Good to know</h2></div>
  {faq_block(FAQ[:4])}
  <div class="center-cta"><a class="btn btn-ghost on-light" href="{href("faq/")}">All questions</a></div>
</div></section>

<section class="section tint"><div class="wrap">{areas_block()}</div></section>
{cta_band()}
'''
    return {"path": "", "title": "Photo Booth Rental Richmond VA | Capture RVA",
            "og_title": "Capture RVA — Photo booth rentals in Richmond, VA",
            "desc": "Photo booth rental in Richmond, VA for weddings, birthdays and corporate events. Custom start screen, unlimited sessions and an online gallery from $446.",
            "body": body, "active": "", "og": ph("krisi", 0)}

def p_packages():
    trail = [("", "Home"), ("packages/", "Packages")]
    body = page_hero("Photo booth packages and pricing", "Three packages, all with up to four hours of unlimited sessions, a custom start screen and a private online gallery. Prices include 60 miles of round-trip travel from Richmond.", trail) + f'''
<section class="section on-light"><div class="wrap">{packages_block(heading=False)}</div></section>
<section class="section tint"><div class="wrap split">
  <div>
    <h2>Which one is right for you?</h2>
    <p><strong>Drop-Off</strong> suits a house party, office celebration or kids' birthday where guests are happy to run it themselves.</p>
    <p><strong>Exclusive</strong> adds an attendant who keeps the line moving, hands out props and makes sure nobody's left out of the group shot.</p>
    <p><strong>Wedding Elegance</strong> is the full treatment: premium backdrops, wedding props, colors matched to your day and a free two-hour booth at your rehearsal dinner.</p>
    <a class="btn btn-dark" href="{href("book/")}">Check your date</a>
  </div>
  <div>{img(STOCK["strips"])}</div>
</div></section>
<section class="section"><div class="wrap">{steps_block()}</div></section>
<section class="section tint"><div class="wrap"><div class="section-head"><h2>Pricing questions</h2></div>{faq_block([FAQ[0], FAQ[1], FAQ[2], FAQ[3]])}</div></section>
{cta_band()}'''
    return {"path": "packages/", "title": "Photo Booth Packages & Pricing | Capture RVA Richmond",
            "desc": "Capture RVA photo booth packages: Drop-Off $446, Exclusive with attendant $750, Wedding Elegance $950. Up to 4 hours of unlimited sessions in Richmond, VA.",
            "body": body, "active": "packages/", "schema": [offer_schema(), crumbs_schema(trail)]}

def p_weddings():
    trail = [("", "Home"), ("weddings/", "Weddings")]
    w = next(p for p in PACKAGES if p["id"] == "wedding")
    body = page_hero("Wedding photo booth rental in Richmond, VA",
                     "Your guests will remember the toasts. They'll keep the photo booth pictures. Wedding Elegance brings premium backdrops, a booth attendant and a start screen in your wedding colors.",
                     trail, STOCK["wedding"], "Photo: Unsplash") + f'''
<section class="section"><div class="wrap split">
  <div>
    <h2>Wedding Elegance, ${w["price"]}</h2>
    <p>Everything you'd want from a wedding photo booth, with someone there to run it so you can stay on the dance floor.</p>
    <ul>
      <li>The Salsa 2 booth for up to four hours of wedding-day coverage</li>
      <li>Premium backdrops: elegant drapes, floral walls or a custom theme</li>
      <li>Exclusive wedding props</li>
      <li>A start screen and photo layout designed in your colors, with your names and date</li>
      <li>A dedicated booth attendant the whole time</li>
      <li>A private online gallery to share with guests after the wedding</li>
      <li>60 miles of round-trip travel included</li>
    </ul>
    <div class="pkg" style="padding:0;border:0"><div class="bonus" style="margin:0 0 24px">Bonus: a free 2-hour photo booth at your rehearsal dinner.</div></div>
    <a class="btn btn-dark" href="{href("book/")}?package=wedding">Check your wedding date</a>
  </div>
  <div>{img(STOCK["tables"])}</div>
</div></section>
<section class="section dark"><div class="wrap">{steps_block(dark=True)}</div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><h2>Wedding questions</h2></div>
  {faq_block([FAQ[4], FAQ[5], FAQ[6], FAQ[7]])}
</div></section>
<section class="section tint"><div class="wrap">{areas_block()}</div></section>
{cta_band("Wedding Saturdays go first.", "Send your date now and we'll hold it while we confirm the details.")}'''
    return {"path": "weddings/", "title": "Wedding Photo Booth Rental Richmond VA | Capture RVA",
            "desc": "Wedding photo booth rental in Richmond, VA: premium backdrops, attendant, custom colors and a free rehearsal dinner booth. Wedding Elegance package $950.",
            "body": body, "active": "weddings/", "og": STOCK["wedding"], "schema": [crumbs_schema(trail)]}

def p_corporate():
    trail = [("", "Home"), ("corporate-events/", "Corporate events")]
    body = page_hero("Corporate event photo booth rental in Richmond",
                     "Holiday parties, client happy hours, grand openings and networking nights. Put your logo on every photo and give people a reason to mingle.",
                     trail, STOCK["toast"], "Photo: Unsplash") + f'''
<section class="clients" aria-label="Business clients"><div class="wrap"><p>Business clients include</p>
<ul><li>Classic Granite &amp; Marble</li><li>First Heritage Mortgage</li><li>Powhatan Chamber of Commerce</li><li>Pro Smart Series</li><li>Talking Monkey Media</li><li>365 Pergola</li></ul></div></section>
<section class="section"><div class="wrap split">
  <div>
    <h2>A booth that works for your brand</h2>
    <p>Your logo and colors go on the start screen and on every photo, so each picture guests share is a small ad for your company or event.</p>
    <ul>
      <li>Branded start screen and photo layout</li>
      <li>Unlimited sessions for up to four hours</li>
      <li>A private online gallery you can share with attendees and on social</li>
      <li>A dedicated attendant with the Exclusive package, a good fit for client-facing events</li>
    </ul>
    <a class="btn btn-dark" href="{href("book/")}?package=exclusive">Check your event date</a>
  </div>
  <div>{img(ph("cgm", 1))}</div>
</div></section>
<section class="section tint"><div class="wrap">{packages_block(heading=False)}</div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><h2>From recent business events</h2></div>
  <div class="sheet">{"".join(f"<figure>{img(p)}</figure>" for p in [ph("pro",0),ph("pro",1),ph("cgm",3),ph("tmm",0),ph("pro",3),ph("cgm",4)])}</div>
</div></section>
{cta_band("Planning the company party?", "Tell us the date and venue. We'll confirm availability and send the details by email.")}'''
    return {"path": "corporate-events/", "title": "Corporate Event Photo Booth Rental Richmond VA | Capture RVA",
            "desc": "Branded photo booth rental for corporate events, holiday parties and networking nights in Richmond, VA. Custom logo start screen, attendant and online gallery.",
            "body": body, "active": "corporate-events/", "og": ph("cgm", 1), "schema": [crumbs_schema(trail)]}

def p_birthday():
    trail = [("", "Home"), ("birthday-parties/", "Birthday parties")]
    body = page_hero("Birthday party photo booth rental in Richmond",
                     "Sweet sixteens, milestone 30s, 40s and 50s, and backyard bashes. Bring the Salsa 2 booth, pick a backdrop and let your guests take as many photos as they want.",
                     trail, STOCK["balloons"], "Photo: Unsplash") + f'''
<section class="section"><div class="wrap split flip">
  <div>
    <h2>The easy way: Drop-Off for ${PACKAGES[0]["price"]}</h2>
    <p>We deliver and set up the booth, your guests run it. Most birthday hosts don't need more than this.</p>
    <ul>{"".join(f"<li>{esc(i)}</li>" for i in PACKAGES[0]["items"])}</ul>
    <p class="muted">Regularly ${PACKAGES[0]["was"]}. Want someone to run it and bring premium props? Choose Exclusive for ${PACKAGES[1]["price"]}.</p>
    <a class="btn btn-dark" href="{href("book/")}?package=drop-off">Check your party date</a>
  </div>
  <div>{img(ph("bday", 0))}</div>
</div></section>
<section class="section dark"><div class="wrap">{steps_block(dark=True)}</div></section>
<section class="section"><div class="wrap"><div class="section-head"><h2>Birthday questions</h2></div>{faq_block([FAQ[3], FAQ[4], FAQ[5], FAQ[2]])}</div></section>
{cta_band()}'''
    return {"path": "birthday-parties/", "title": "Birthday Party Photo Booth Rental Richmond VA | Capture RVA",
            "desc": "Birthday party photo booth rental in Richmond, Midlothian and Chesterfield. Self-run Drop-Off booth $446 with unlimited sessions and an online gallery.",
            "body": body, "active": "birthday-parties/", "og": ph("bday", 0), "schema": [crumbs_schema(trail)]}

def p_gallery():
    trail = [("", "Home"), ("gallery/", "Gallery")]
    groups = []
    for e in EVENTS:
        btns = "".join(
            f'<button type="button" data-full="{esc(img_src(p))}" data-caption="{esc(e["title"])}, {esc(e["when"])}" aria-label="Enlarge photo from {esc(e["title"])}">{img(p)}</button>'
            for p in e["photos"])
        groups.append(f'<section class="event-group" aria-labelledby="g-{e["id"]}"><h2 id="g-{e["id"]}">{esc(e["title"])}</h2><p>{esc(e["when"])}. {esc(e["blurb"])}</p><div class="event-grid">{btns}</div></section>')
    body = page_hero("Photo booth gallery", "Real photos from real Capture RVA events around Richmond. Tap any photo to see it larger.", trail) + f'''
<section class="section"><div class="wrap">{"".join(groups)}</div></section>
<dialog class="lightbox" id="lightbox" aria-label="Photo viewer"><button class="close" type="button">Close</button><img src="" alt=""><p></p></dialog>
{cta_band("Want your event in here next?")}'''
    images = [{"@type": "ImageObject", "contentUrl": abs_img(p), "caption": e["title"]} for e in EVENTS for p in e["photos"]]
    return {"path": "gallery/", "title": "Photo Booth Gallery | Capture RVA Richmond Events",
            "desc": "See real photo booth pictures from Capture RVA events in Richmond: corporate happy hours, dance showcases, Father's Day events and birthday parties.",
            "body": body, "active": "gallery/", "og": ph("krisi", 1),
            "schema": [crumbs_schema(trail), {"@context": "https://schema.org", "@type": "ImageGallery", "name": "Capture RVA photo booth gallery", "image": images}]}

def p_about():
    trail = [("", "Home"), ("about/", "About")]
    body = page_hero("About Capture RVA", "We're a Richmond photo booth company that started with one idea: the best part of a party should be something you can keep.", trail) + f'''
<section class="section"><div class="wrap split">
  <div class="prose">
    <h2 class="mt-0">Modern booths, made for Richmond's events</h2>
    <p>Capture RVA brings the Salsa 2 photo booth and themed accessories to weddings, birthdays, community events and company parties across the Richmond metro. We've set up in Richmond, Midlothian, Powhatan, Williamsburg and Charlottesville, for clients from local showrooms to dance studios to chambers of commerce.</p>
    <p>Every event gets a start screen designed for it, a backdrop that suits the room and a private online gallery afterward. We show up early, set up clean and make it easy for guests to jump in.</p>
  </div>
  <div>{img(ph("rountrey", 1))}</div>
</div></section>
<section class="section tint"><div class="wrap">
  <div class="values">
    <div><h3>Our mission</h3><p>Give every guest an easy, fun way to be part of the memories, and give every host photos worth keeping.</p></div>
    <div><h3>What we care about</h3><p>Creativity, quality and customer care, from the first email to the last photo in your gallery.</p></div>
    <div><h3>Where we're headed</h3><p>To be the first name people in Virginia think of when they want a photo booth at their event.</p></div>
  </div>
</div></section>
<section class="section dark"><div class="wrap">{quotes_block()}</div></section>
{cta_band()}'''
    return {"path": "about/", "title": "About Capture RVA | Richmond Photo Booth Company",
            "desc": "Capture RVA is a Richmond, VA photo booth company bringing the Salsa 2 booth, custom backdrops and online galleries to events across Central Virginia.",
            "body": body, "active": "about/", "og": ph("rountrey", 1), "schema": [crumbs_schema(trail)]}

def p_faq():
    trail = [("", "Home"), ("faq/", "Questions")]
    body = page_hero("Photo booth questions", "Pricing, travel, backdrops and how the day works. Don't see yours? Ask us.", trail) + f'''
<section class="section"><div class="wrap">{faq_block(FAQ)}
<div class="center-cta"><a class="btn btn-dark" href="{href("book/")}">Check your date</a><a class="btn btn-ghost on-light" href="{href("contact/")}">Ask a question</a></div></div></section>'''
    return {"path": "faq/", "title": "Photo Booth Rental FAQ | Capture RVA Richmond",
            "desc": "Answers about Capture RVA photo booth rentals in Richmond: pricing, how long the booth runs, travel, prints, attendants, backdrops and booking.",
            "body": body, "active": "", "schema": [faq_schema(FAQ), crumbs_schema(trail)]}

def field(id, label, type="text", required=False, hint="", full=False, attrs="", err=""):
    req = " required" if required else ""
    star = "" if required else ' <span class="hint">(optional)</span>'
    h = f'<span class="hint" id="{id}-hint">{esc(hint)}</span>' if hint else ""
    desc = f' aria-describedby="{id}-err{" " + id + "-hint" if hint else ""}"'
    e = f' data-err="{esc(err)}"' if err else ""
    if type == "textarea":
        ctl = f'<textarea id="{id}" name="{id_to_name(id)}"{req}{desc}{e} {attrs}></textarea>'
    else:
        ctl = f'<input id="{id}" name="{id_to_name(id)}" type="{type}"{req}{desc}{e} {attrs}>'
    return f'<div class="field{" full" if full else ""}"><label for="{id}">{esc(label)}{star}</label>{h}{ctl}<span class="err" id="{id}-err" aria-live="polite"></span></div>'

def id_to_name(id):
    return {"f-name": "name", "f-email": "email", "f-phone": "phone", "f-venue": "venue", "f-guests": "guests",
            "f-notes": "notes", "f-start": "startTime", "c-name": "name", "c-email": "email", "c-phone": "phone",
            "c-date": "eventDate", "c-msg": "message"}.get(id, id)

def p_book():
    trail = [("", "Home"), ("book/", "Book")]
    pk = "".join(f'''<label><input type="radio" name="package" value="{p["id"]}"{" checked" if p.get("featured") else ""}>
<span>{esc(p["name"])}<small>{esc(p["for"])}</small></span><b>${p["price"]}</b></label>''' for p in PACKAGES)
    pk += '<label><input type="radio" name="package" value="not-sure"><span>Not sure yet<small>We\'ll recommend one based on your event.</small></span><b></b></label>'
    types = ["Wedding", "Birthday", "Corporate or office party", "Holiday party", "School or graduation", "Community or nonprofit", "Other"]
    body = page_hero("Check your date", "Pick a date on the calendar, tell us about your event and send the request. We'll confirm by email.", trail) + f'''
<section class="section"><div class="wrap">
<div class="book-layout">
  <div class="panel">
    <h2>1. Pick a date</h2>
    <p class="muted" id="demo-note" hidden>Preview mode: availability shown is sample data until the booking system is connected.</p>
    <div class="cal-head"><h3 id="cal-month" aria-live="polite"></h3>
      <div class="cal-nav"><button type="button" id="cal-prev" aria-label="Previous month">‹</button><button type="button" id="cal-next" aria-label="Next month">›</button></div></div>
    <div class="cal" id="cal" role="group" aria-label="Calendar"></div>
    <div class="legend"><span class="l-open">Open</span><span class="l-limited">Limited</span><span class="l-booked">Booked</span><span class="l-picked">Your pick</span></div>
    <div class="picked-date" id="picked-date" aria-live="polite">No date picked yet.</div>
  </div>
  <div class="panel">
    <form id="book-form" novalidate>
      <h2>2. Your event</h2>
      <input type="hidden" name="eventDate" id="event-date">
      <span class="err" id="event-date-err" aria-live="polite"></span>
      <fieldset class="pkg-pick field full" style="margin-bottom:22px"><legend style="margin-bottom:8px">Package</legend>{pk}</fieldset>
      <div class="form-grid">
        <div class="field"><label for="f-type">Type of event</label><select id="f-type" name="eventType">{"".join(f"<option>{t}</option>" for t in types)}</select></div>
        {field("f-start", "Start time", "time")}
        {field("f-venue", "Venue or city", required=True, err="Tell us where the event is so we can confirm travel.")}
        {field("f-guests", "Number of guests", "number", attrs='min="1" inputmode="numeric"')}
        {field("f-name", "Your name", required=True, err="Add your name.", attrs='autocomplete="name"')}
        {field("f-email", "Email", "email", required=True, err="Add an email we can reply to.", attrs='autocomplete="email"')}
        {field("f-phone", "Phone", "tel", attrs='autocomplete="tel"')}
        {field("f-notes", "Anything else?", "textarea", full=True, hint="Theme, colors, logo, timing, questions.")}
      </div>
      <div class="hp" aria-hidden="true"><label>Leave empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button class="btn btn-primary" type="submit" style="margin-top:22px">Request this date</button>
      <p class="form-note">Sending a request doesn't charge you anything. We'll email you to confirm the date and next steps.</p>
      <div class="form-status" id="book-status" role="alert" tabindex="-1"></div>
    </form>
    <div id="book-done" hidden tabindex="-1">
      <h2>Request sent</h2>
      <p>We've got your request for <strong id="done-date"></strong>. Watch your inbox for an email from Capture RVA confirming availability and next steps.</p>
      <p>While you wait, <a href="{href("gallery/")}">browse the gallery</a> or follow us on <a href="{SITE["instagram"]}" target="_blank" rel="noopener">Instagram</a>.</p>
    </div>
  </div>
</div>
</div></section>
<section class="section tint"><div class="wrap"><div class="section-head"><h2>Before you book</h2></div>{faq_block([FAQ[0], FAQ[2], FAQ[7]])}</div></section>'''
    return {"path": "book/", "title": "Book a Photo Booth in Richmond | Check Availability | Capture RVA",
            "desc": "Check open dates and request a Capture RVA photo booth for your wedding, birthday or corporate event in Richmond, VA. No charge to request.",
            "body": body, "active": "book/", "schema": [crumbs_schema(trail)],
            "js": f'<script src="{asset("assets/js/book.js")}" defer></script>'}

def p_contact():
    trail = [("", "Home"), ("contact/", "Contact")]
    cards = []
    if SITE["phone"]:
        cards.append(f'<a href="tel:{SITE["phone"]}"><strong>Call or text</strong><span>{esc(SITE["phone"])}</span></a>')
    if SITE["email"]:
        cards.append(f'<a href="mailto:{SITE["email"]}"><strong>Email</strong><span>{esc(SITE["email"])}</span></a>')
    cards.append(f'<a href="{SITE["instagram"]}" target="_blank" rel="noopener"><strong>Instagram</strong><span>@capture.rva</span></a>')
    cards.append(f'<div><strong>Service area</strong><span>Richmond and Central Virginia</span></div>')
    body = page_hero("Contact Capture RVA", "Questions about a package, a venue or a custom design? Send a message and we'll reply by email.", trail) + f'''
<section class="section"><div class="wrap book-layout">
  <div class="panel">
    <form id="contact-form" novalidate>
      <h2>Send a message</h2>
      <div class="form-grid">
        {field("c-name", "Your name", required=True, err="Add your name.", attrs='autocomplete="name"')}
        {field("c-email", "Email", "email", required=True, err="Add an email we can reply to.", attrs='autocomplete="email"')}
        {field("c-phone", "Phone", "tel", attrs='autocomplete="tel"')}
        {field("c-date", "Event date", "date")}
        {field("c-msg", "Message", "textarea", required=True, full=True, err="Add a short message.")}
      </div>
      <div class="hp" aria-hidden="true"><label>Leave empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button class="btn btn-primary" type="submit" style="margin-top:22px">Send message</button>
      <div class="form-status" id="contact-status" role="alert" tabindex="-1"></div>
    </form>
  </div>
  <div>
    <div class="contact-cards">{"".join(cards)}</div>
    <p class="form-note">Ready to pick a date? <a href="{href("book/")}">Check availability</a> instead.</p>
  </div>
</div></section>'''
    return {"path": "contact/", "title": "Contact Capture RVA | Photo Booth Rental Richmond VA",
            "desc": "Contact Capture RVA about photo booth rentals for weddings, birthdays and corporate events in Richmond, VA.",
            "body": body, "active": "contact/", "schema": [crumbs_schema(trail)]}

def p_404():
    body = f'''<section class="page-hero"><div class="wrap"><h1>This page took a bad photo.</h1>
<p>The page you're looking for moved or doesn't exist. Try the homepage or check your date.</p>
<div class="center-cta"><a class="btn btn-primary" href="{href("")}">Go to the homepage</a><a class="btn btn-ghost" href="{href("book/")}">Check your date</a></div></div></section>
<script>
(function(){{var m={{"/booking":"/book/","/about-2":"/about/","/contact-2":"/contact/","/services":"/packages/","/contact":"/contact/"}};
var p=location.pathname.toLowerCase().replace(/\\/+$/,"");if(m[p])location.replace(m[p]+location.search);}})();
</script>'''
    return {"path": "404.html", "title": "Page not found | Capture RVA", "desc": "Page not found.", "body": body, "active": "", "noindex": True, "file": "404.html"}

PAGES = [p_home, p_packages, p_weddings, p_corporate, p_birthday, p_gallery, p_about, p_faq, p_book, p_contact, p_404]
REDIRECTS = {"about-2/": "about/", "contact-2/": "contact/", "services/": "packages/", "booking/": "book/"}

# ---------------------------------------------------------------- build
def write(rel, content):
    path = os.path.join(B.out, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def build():
    urls = []
    for fn in PAGES:
        probe = fn.__name__
        # depth is needed before rendering links, so compute from a first pass
        B.depth = 0
        page = fn()
        path = page["path"]
        B.depth = 0 if path in ("", "404.html") else path.count("/")
        page = fn()
        html_out = head(page) + "\n" + header(page["active"]) + page["body"] + footer(page.get("js", ""))
        rel = page.get("file") or (path + "index.html")
        write(rel, html_out)
        if not page.get("noindex"):
            urls.append(path)
    for old, new in REDIRECTS.items():
        B.depth = old.count("/")
        target = href(new)
        write(old + "index.html", f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved | Capture RVA</title>
<link rel="canonical" href="{SITE["domain"]}/{new}"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url={target}"></head><body><p>This page moved to <a href="{target}">{SITE["domain"]}/{new}</a>.</p></body></html>''')
    if not B.preview:
        today = date.today().isoformat()
        sm = "\n".join(f"  <url><loc>{SITE['domain']}/{u}</loc><lastmod>{today}</lastmod><priority>{'1.0' if u == '' else '0.8'}</priority></url>" for u in urls)
        write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sm}\n</urlset>\n')
        write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /_build/\nDisallow: /_backend/\nDisallow: /admin/\n\nSitemap: {SITE['domain']}/sitemap.xml\n")
        write("CNAME", "capturerva.com\n")
        # image manifest for the fetch script
        manifest = [{"local": p["local"], "url": p["remote"]} for e in EVENTS for p in e["photos"]]
        with open(os.path.join(ROOT, "_build", "images.json"), "w") as f:
            json.dump(manifest, f, indent=1)
    print(f"Built {len(PAGES)} pages + {len(REDIRECTS)} redirects into {B.out} ({'preview' if B.preview else 'production'})")

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        B.preview = True
        B.out = os.path.abspath(sys.argv[2])
        import shutil
        shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(B.out, "assets"), dirs_exist_ok=True)
    build()
