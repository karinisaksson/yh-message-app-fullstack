# yh-message-app-fullstack

Säkerhetskrav som jag inte ändrat i koden:

2. En användare ska inte kunna ändra sina behörigheter till admin 

Applikationen har ingen admin-roll implementerad, vilket innebär att det inte finns någon möjlighet för en användare att eskalera sina behörigheter till admin. User-modellen innehåller inget role-fält och det finns inga endpoints som tillåter en användare att ändra sina egna behörigheter. Alla användare har samma behörighetsnivå och kan endast påverka sina egna meddelanden. 

Att det inte finns några endpoints där användare kan ändra sina behörigheter betyder att det inte finns någon route i server.js, till exempel PATCH /users/:id, där en användare kan skicka in data för att uppdatera sitt eget konto — som till exempel { role: "admin" }. Eftersom den routen inte existerar finns det inget API-anrop att göra för att försöka ge sig själv högre behörigheter.

Om vi i framtiden vill implementera en adminroll skulle det vara viktigt att: v
role aldrig sätts via API:et: en användare ska inte kunna skicka { role: "admin" } vid registrering eller via en PATCH-route och få det sparat
role ska sättas direkt i databasen: en administratör med databasåtkomst sätter rollen manuellt
requireAdmin-middleware: en kontroll som körs innan admin-routes och avvisar alla som inte har rätt roll
authenticateUser körs alltid före requireAdmin: annars kan man nå admin-routes utan att vara inloggad alls

7. För att återställa lösenord krävs en engångskod skickad till användarens e-post. 

För att implementera lösenordsåterställning via engångskod behövs flera delar. Först behövs en e-posttjänst, till exempel Nodemailer, som kan skicka ett e-postmeddelande med en engångskod till användaren.

Implementationen skulle börja med en POST /forgot-password-route som tar emot användarens e-postadress, genererar en tidsbegränsad engångskod och skickar den till användaren via e-post med exempelvis Nodemailer. 

I databasen behöver User-modellen utökas med ett fält för engångskoden och ett fält för när koden går ut, så att koden inte kan återanvändas eller användas efter att tidsgränsen passerat.

Därefter behövs en POST /reset-password-route där användaren anger koden tillsammans med sitt nya lösenord. Backenden validerar att koden stämmer och inte har gått ut, varefter det nya lösenordet hashas med bcrypt och sparas i databasen, på samma sätt som vid registrering.


8. All kommunikation ska vara krypterad via HTTPS och TLS. 
Att kommunikation ska vara krypterad via HTTPS och TLS fixas i Render när man deployar där. Render sätter automatiskt upp HTTPS och TLS för backenden. Det man kan göra är att se till att ens base_url i frontend pekar på en https://-adress och inte http://

Om man inte deployar via render så måste man skaffa ett TLS-certifikat, och en reverse proxy som tar emot https-anrop, dekrypterar och vidarebefordrar anropen till min express-server.

9. Systemet ska logga vem som skapade, redigerade och raderade varje meddelande. 

För att logga vem som skapade, redigerade och raderade meddelanden bör en separat AuditLog-collection i databasen implementeras. Varje gång ett meddelande skapas, redigeras eller raderas sparas en logg-post med action (created, edited, deleted), meddelande-id, användar-id och tidsstämpel.

Loggarna nås direkt i databasen via MongoDB Compass eller MongoDB Atlas av den med databasåtkomst. I en produktionssatt app med admin-roll skulle loggarna istället nås via en skyddad endpoint som endast administratörer har tillgång till.