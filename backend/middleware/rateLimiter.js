import rateLimit from "express-rate-limit"

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" }
})

// Säkerhetskrav 6. Här har jag lagt in en funktion LoginLimiter som använder express-rate-limit för att begränsa antalet inloggningsförsök till 5 per 15 minuter. Sedan använder jag loginLimiter som middleware i server.js: app.post("/login") för att tillämpa denna begränsning på inloggningsförsöken.