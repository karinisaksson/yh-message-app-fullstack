# Inlämning 1 - Planeringsfasen

<img width="1894" height="405" alt="Hotmodellering" src="https://github.com/user-attachments/assets/5d1e53ea-5b10-4fbf-bca3-710dc47c244f" />

Säkerhetsrisker:
1. En angripare kan skriva in skadliga databaskommandon via formulär och på så sätt logga in som andra användare, få tillgång till data i databasen eller radera all data. (E, D, S)
2. En användare kan nå meddelandesidan och skriva meddelanden utan att vara inloggad, genom att skriva in URL:en direkt i webbläsaren. (E)
3. En inloggad användare kan redigera någon annans meddelande genom att manipulera id-numret i anropet. (E, T)
4. En angripare som kommer åt databasen hittar lösenord sparade i klartext. (I)
5. En angripare kan använda brute force för att logga in som en annan användare. (S)
6. En angripare kan kapa ett konto via lösenordsåterställning. (S, E)
7. En angripare kan avlyssna och ändra data som är i transit mellan systemets delar. (T, I)
8. En användare kan skapa, redigera eller radera ett meddelande och förneka att de gjorde det. (R)
9. En användare kan skicka extremt långa meddelanden som överbelastar servern. (D)

Säkerhetskrav: 
1. Backend ska validera och rensa input, samt säkert hantera input från användare så att det inte kan tolkas som databaskommandon (t.ex parameterized queries för sql-databas, eller sanitering av input for MongoDB)
2. Systemet ska kräva inloggning för att en användare ska kunna se, skriva eller redigera meddelanden. 
3. Innan redigering eller radering av ett meddelande ska systemet kontrollera att meddelandets id är kopplat till den inloggade användaren. 
4. Lösenord ska aldrig lagras i klartext i databasen. 
5. Systemet ska blockera inloggning efter 5 misslyckade försök. 
6. För att återställa lösenord krävs en engångskod skickad till användarens e-post. 
7. All kommunikation ska vara krypterad via HTTPS och TLS. 
8. Systemet ska logga vem som skapade, redigerade och raderade varje meddelande. 
9. Ett meddelande ska vara minst 3 och max 140 tecken.
