# Inlämning 3 - Granskningsfasen

Jag använde mig av CodeQL och Dependabot i GitHub för att granska koden. 

## CodeQL larmade om 9 problem i koden

**CORS-konfiguration** 1 av CodeQL-larmen var CORS-sårbarheten som jag redan hittat själv i fas 2. Att CORS-konfigurationen var för slapp mappar jag mot OWASP 2025 A02: Security Misconfiguration. Det är åtgärdat genom att jag ändrade origin från "*" till "http://localhost:5173". I en deployad version skulle det ändras till min frontend-URL.

**Rate limiting** 8 av 9 larm i CodeQL. Utan rate limiting på endpointsen kan en angripare skicka tusentals requests per sekund till API:et, vilket överlastar servern och gör tjänsten otillgänglig för riktiga användare (DoS). Detta mappar jag mot OWASP 2025: A04: Insecure Design.

För att åtgärda detta skapade jag en ny middleware i rateLimiter.js, som jag döpte till generalLimiter som tillåter som mest 100 requests per IP under 15 minuter.

Först satte jag den per endpoint, men larm kvarstod eftersom jag placerat den efter authenticateUser i middleware-ordningen. Ett databasanrop hann alltså ske innan limitern stoppade requesten. Jag la den därför globalt i stället. Det följer principen secure by default då alla endpoints, även nya, skyddas automatiskt utan att utvecklaren behöver komma ihåg att lägga till limitern per endpoint. Det följer också DRY-principen, eftersom skyddet definieras på ett ställe i stället för att upprepas.

## Dependabot
Dependabot larmade om 16 potentiella sårbarheter som jag löste genom att uppdatera de olika biblioteken som var berörda. Övergripande mappar sårbarheterna mot OWASP 2025 A03: Software Supply Chain Failures som handlar om risker i kedjan av kod man förlitar sig på. 

**jsonwebtoken (3 larm).** Version 8.5.1 hade brister i hur tokens verifieras, varav en av de tre bristerna kunde ha en påverkan på vår app genom koden. 
Den gamla versionen av biblioteket kunde under vissa förhållanden luras att godkänna en token som inte hade en signatur. För att kryphålet skulle kunna utnyttjas krävdes tre saker samtidigt: att ingen algoritm angavs i jwt.verify(), att en token utan signatur togs emot, och att JWT_SECRET var falsy (saknades eller laddades inte). Var alla tre uppfyllda kunde verifieringen falla tillbaka på algoritmen "none" och godkänna en oäkta token. I vår app var ingen algoritm angiven, och eftersom en angripare alltid kan skicka en signaturlös token, så hölls skyddet uppe bara av att JWT_SECRET var korrekt ifylld. Hade den saknats eller laddats fel hade kryphålet öppnats. 

De två övriga jwt-larmen rörde verifiering med asymmetriska nycklar och var inte aktuella för vår webapp. 
Lösningen för alla tre larmen var att uppgradera till 9.0.0, där algoritmen "none" inte längre finns att falla tillbaka på. 

**tar (6 larm).** tar är ett uppackningsverktyg som låg flera led ner bland beroendena. Hashningsbiblioteket bcrypt använde ett verktyg som i sin tur använde tar för att packa upp filer vid installation. tar kontrollerade inte vart filerna i ett paket tog vägen, så ett illvilligt paket hade kunnat lägga skadliga filer på fel ställen på utvecklarens dator, och i värsta fall köra skadlig kod där. Dependabot kunde inte lösa larmen automatiskt, eftersom den lagade versionen av tar var nyare än vad mellanledet tillät, och Dependabot får inte bryta ett pakets versionskrav på egen hand. Jag löste det genom att uppgradera bcrypt till en version som inte längre använder tar.

**Vite/esbuild – obehörig åtkomst till utvecklingsservern (5 larm).** Vites utvecklingsserver serverar projektets filer till webbläsaren och har regler för vad som inte får lämnas ut (t.ex. .env med hemligheter). Fem larm var olika sätt den kontrollen kunde kringgås. Gemensamt: data som borde varit skyddad kunde läsas av obehöriga. Vite körs bara under utveckling och följer inte med i den färdiga appen, så risken för användarna var låg, men det är viktigt att hemligheter i .env inte sprids.

**launch-editor – kommandoinjektion (1 larm).**  Vite har en funktion där man kan klicka på ett felmeddelande i webbläsaren för att öppna rätt fil i sin kodeditor, vilket sköts av verktyget launch-editor som kör ett kommando på datorn. På Windows kunde en manipulerad förfrågan injicera egna kommandon i det anropet, alltså få datorn att köra angriparens kod.

Samtliga Vite-kopplade larm åtgärdades genom att jag uppgraderade Vite från v4 till v8. 

**qs (1 larm).** qs är ett paket som följer med Express och hanterar query-strängar. Dependabot larmade om att en bugg i funktionen qs.stringify  under specifika inställningar kunde få servern att krascha (DoS). När jag granskade min kod såg jag dock att jag aldrig använder den sårbara kodvägen, så buggen var i praktiken inte exploaterbar hos vår app. Jag åtgärdade larmet ändå med npm audit fix, eftersom paketet körs i drift och den lagade versionen rymdes inom tillåtet versionsspann.

## Sammanfattning dependabot
Efter att ha granskat min kod kan jag konstatera som koden ser ut nu var varken qs eller jsonwebtoken-sårbarheterna exploaterbara i praktiken: jag använder aldrig den sårbara qs-funktionen (qs.stringify med encodeValuesOnly), och jwt-kryphålet hölls stängt av att JWT_SECRET var satt. Larmen var alltså reella, men den faktiska risken för min app var låg.

Samma relativt låga risk gäller även de övriga larmen. tar kördes bara vid installation, inte av min kod, och kunde bara utnyttjas om någon lyckades mata in ett manipulerat arkiv i nedladdningssteget, låg sannolikhet, men hög konsekvens (kodkörning på utvecklarens dator), vilket motiverade åtgärd. Två av Vite-larmen var Windows-specifika och därför inte aktuella på min Mac, medan de återstående Vite- och esbuild-larmen krävde att utvecklingsservern var igång och kunde nås av manipulerade förfrågningar, i praktiken genom att jag besökte en illvillig webbsida medan servern kördes. Det är en smal attackväg som bara var relevant under aktiv utveckling, inte i den färdiga appen.

Samtliga dependabot-larm var reella, men den praktiska risken för att sårbarheterna skulle exploateras var låg, antingen på grund av att jag inte anropade sårbar kod (qs, jwt), att sårbarheten gällde annat operativsystem än mitt (Vite på Windows), samt smal attackväg genom installations- och utvecklingsmiljön (tar, esbuild) Att avgöra det krävde att jag gick från vad verktyget rapporterade till vad det faktiskt betydde för min kodbas och miljö. 
