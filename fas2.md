Kodändringar och förslag för att uppfylla säkerhetskraven. 

1. Krav: Backend ska validera och sanitera input, samt säkert hantera input från användare så att det inte kan tolkas som databaskommandon.

Fixat genom att importera och använda mongoSanitize i server.js. Se filen för ändringarna. 

2. Krav: En användare ska inte kunna ändra sina behörigheter till admin 

Applikationen har ingen admin-roll implementerad, vilket innebär att det idag inte finns någon möjlighet för en användare att eskalera sina behörigheter till admin. User-modellen innehåller inget role-fält och det finns inga endpoints som tillåter en användare att ändra sina egna behörigheter. Alla användare har samma behörighetsnivå och kan endast påverka sina egna meddelanden.

Att det inte finns några endpoints där användare kan ändra sina behörigheter betyder att det inte finns någon route i server.js, till exempel PATCH /users/:id, där en användare kan skicka in data för att uppdatera sitt eget konto — som till exempel { role: "admin" }. Eftersom den routen inte existerar finns det inget API-anrop att göra för att försöka ge sig själv högre behörigheter.

Om vi i framtiden vill implementera en adminroll skulle det vara viktigt att:

role aldrig sätts via API:et: en användare ska inte kunna skicka { role: "admin" } vid registrering eller via en PATCH-route och få det sparat

role ska sättas direkt i databasen: en administratör med databasåtkomst sätter rollen manuellt

requireAdmin-middleware: en kontroll som körs innan admin-routes och avvisar alla som inte har rätt roll

authenticateUser körs alltid före requireAdmin: annars kan man nå admin-routes utan att vara inloggad alls

3. Krav: Systemet ska kräva inloggning för att en användare ska kunna se, skriva eller redigera meddelanden. 

Uppfylldes till viss del redan, men har också gjort ändringar i backend och frontend för att uppfylla kravet. Se ändringar gjorda i server.js, app.jsx, samt postmessage.jsx och singlemessage.jsx. 

4. Krav: Innan redigering eller radering av ett meddelande ska systemet kontrollera att meddelandet är kopplat till den inloggade användaren. 

Uppfylldes till viss del redan vad gällde redigering av meddelande, men jag har gjort förändringar för radering av meddelanden. Se ändringar i server.js, singlemessage.jsx 

5. Krav: Lösenord ska aldrig lagras i klartext i databasen. 

Detta krav uppfylldes redan i koden. Se server.js för kommentarer. 

6. Krav: Systemet ska blockera inloggning efter 5 misslyckade försök. 

Detta la jag till genom rate-limiting. Se ny middleware i rateLimiter.js och användning av den i server.js 

7. Krav: För att återställa lösenord krävs en engångskod skickad till användarens e-post. 

För att implementera lösenordsåterställning via engångskod behövs flera delar. För det första behövs en funktion för att återställa lösenordet, samt en e-posttjänst, till exempel Nodemailer, som kan skicka ett e-postmeddelande med en engångskod till användaren.

Implementationen skulle börja med en POST /forgot-password-route som tar emot användarens e-postadress, genererar en tidsbegränsad engångskod och skickar den till användaren via e-post med exempelvis Nodemailer. 

I databasen behöver User-modellen utökas med ett fält för engångskoden och ett fält för när koden går ut, så att koden inte kan återanvändas eller användas efter att tidsgränsen passerat.

Därefter behövs en POST /reset-password-route där användaren anger koden tillsammans med sitt nya lösenord. Backenden validerar att koden stämmer och inte har gått ut, varefter det nya lösenordet hashas med bcrypt och sparas i databasen, på samma sätt som vid registrering.


8. Krav: All kommunikation ska vara krypterad via HTTPS och TLS. 

För att anropen ska ske via HTTPS är det viktigt att BASE_URL i api.js pekar mot en https-adress. Just nu är URL:n i api.js en lokal host för utveckling, som går över http, men i produktion måste det vara en HTTPS-adress för att uppfylla säkerhetskravet. 

För att kommunikationen ska vara krypterad enligt TLS behöver vi skaffa ett TLS-certifikat. Det fixas inte i koden utan när vi deployar. 

9. Systemet ska logga vem som skapade, redigerade och raderade varje meddelande. 

För att logga vem som skapade, redigerade och raderade meddelanden bör en separat AuditLog-collection i databasen implementeras. Varje gång ett meddelande skapas, redigeras eller raderas sparas en logg-post med action (created, edited, deleted), meddelande-id, användar-id och tidsstämpel.

Loggarna nås direkt i databasen via MongoDB Compass eller MongoDB Atlas av den med databasåtkomst. I en produktionssatt app med admin-roll skulle loggarna istället nås via en skyddad endpoint som endast administratörer har tillgång till.

10. Krav: Ett meddelande ska vara minst 3 och max 140 tecken.

Implementerat. Se ändringar i server.js, message.js, samt singlemessage.jsx och postmessage.jsx
