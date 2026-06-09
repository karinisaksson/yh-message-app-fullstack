import rateLimit from "express-rate-limit"

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" }
})

// Säkerhetskrav 6. Här har jag lagt in en funktion loginLimiter som använder express-rate-limit för att begränsa antalet inloggningsförsök till 5 per 15 minuter. Sedan använder jag loginLimiter som middleware i server.js: app.post("/login") för att tillämpa denna begränsning på inloggningsförsöken.


// Efter att ha använt CodeQL och hittat sårbarheter la jag till ytterligare en limiter för att använda på övriga endpoints som gör databasanrop. Annars kan en angripare skicka tusentals requests per sekund och överlasta databas/server. Satte ett högre tak än loginLimiter eftersom 5 anrop på 15 minuter skulle göra appen oanvändbar på tex /messages GET/POST/PATCH/DELETE. 
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 100,                  // 100 requests per 15 min per IP
  message: { success: false, message: "Too many requests, please try again later" }
})