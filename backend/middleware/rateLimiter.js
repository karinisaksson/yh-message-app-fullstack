import rateLimit from "express-rate-limit"

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" }
})

// här har jag lagt in en funktion LoginLimiter som använder express-rate-limit för att begränsa antalet inloggningsförsök till 5 per 15 minuter. Detta är en del av säkerhetskrav 6, som handlar om att implementera rate limiting för att skydda mot brute-force attacker. Sedan använder jag loginLimiter som middleware i app.post("/login") för att tillämpa denna begränsning på inloggningsförsöken.