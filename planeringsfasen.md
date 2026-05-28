# Inlämning 1 - Planeringsfasen

<img width="1894" height="405" alt="Hotmodellering" src="https://github.com/user-attachments/assets/5d1e53ea-5b10-4fbf-bca3-710dc47c244f" />

Säkerhetsrisker:
1. En angripare kan skriva in skadliga databaskommandon via formulär och på så sätt logga in som andra användare, få tillgång till data i databasen eller radera all data. (E, D, S)
2. En inloggad användare kan ge sig själv admin-rättigheter. (E)
3. En användare kan nå meddelandesidan och skriva meddelanden utan att vara inloggad, genom att skriva in URL:en direkt i webbläsaren. (E)
4. En inloggad användare kan redigera någon annans meddelande genom att manipulera id-numret i anropet. (E, T)
5. En angripare som kommer åt databasen hittar lösenord sparade i klartext. (I)
6. En angripare kan använda brute force för att logga in som en annan användare. (S)
7. En angripare kan kapa ett konto via lösenordsåterställning. (S, E)
8 En angripare kan avlyssna och ändra data som är i transit mellan systemets delar. (T, I)
9. En användare kan skapa, redigera eller radera ett meddelande och förneka att de gjorde det. (R)
10. En användare kan skicka extremt långa meddelanden som överbelastar servern. (D)

Säkerhetskrav: 
1. Backend ska validera och rensa input, samt säkert hantera input från användare så att det inte kan tolkas som databaskommandon (t.ex parameterized queries för sql-databas, eller sanitering av input for MongoDB)
2. Systemet ska inte tillåta användare att själva sätta eller ändra sin roll.
3. Systemet ska kräva inloggning för att en användare ska kunna se, skriva eller redigera meddelanden. 
4. Innan redigering eller radering av ett meddelande ska systemet kontrollera att meddelandets id är kopplat till den inloggade användaren. 
5. Lösenord ska aldrig lagras i klartext i databasen. 
6. Systemet ska blockera inloggning efter 5 misslyckade försök. 
7. För att återställa lösenord krävs en engångskod skickad till användarens e-post. 
8. All kommunikation ska vara krypterad via HTTPS och TLS. 
9. Systemet ska logga vem som skapade, redigerade och raderade varje meddelande. 
10. Ett meddelande ska vara minst 3 och max 140 tecken.
