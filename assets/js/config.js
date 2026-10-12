/* Capture RVA site settings.
   apiUrl: the Cloudflare Worker URL that proxies to the Google Apps Script backend
   (e.g. "https://capturerva-api.<your-subdomain>.workers.dev").
   Leave it empty to run the site in demo mode (no data is sent). */
window.CRVA_CONFIG = {
  apiUrl: "",
  bookingMonthsAhead: 18
};
