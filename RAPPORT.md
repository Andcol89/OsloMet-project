# Teknisk rapport – Studentoppslag OsloMet

**Prosjekt:** Studentoppslag  
**Utvikler:** Andreas Collberg  
**Dato:** April 2026  
**Repository:** https://github.com/Andcol89/OsloMet-project

---

## 1. Oversikt

Studentoppslag er en intern webapplikasjon for OsloMet som lar autoriserte brukere slå opp studentinformasjon direkte i nettleseren. Applikasjonen henter data fra Felles Studentsystem (FSS) via et GraphQL-API, med Microsoft Power Automate som mellomlag for å håndtere autentisering og CORS.

---

## 2. Arkitektur

```
Nettleser (HTML/CSS/JS)
        │
        │  HTTP POST (JSON)
        ▼
Power Automate Flow
  (HTTP-trigger, CORS-headers, autentisering)
        │
        │  GraphQL-spørring
        ▼
FSS GraphQL API
  (api.fellesstudentsystem.no)
        │
        │  Studentdata
        ▼
Power Automate → Nettleser
```

Arkitekturen har tre lag:

1. **Frontend** – statisk HTML/CSS/JS som kjører i nettleseren
2. **Power Automate** – fungerer som en sikker proxy som holder API-nøkler server-side og legger til CORS-headers
3. **FSS API** – Felles Studentsystem, kildesystemet for all studentdata ved norske universiteter

---

## 3. Filstruktur

| Fil | Beskrivelse |
|-----|-------------|
| `index.html` | HTML-struktur for applikasjonen |
| `style.css` | All CSS-styling |
| `app.js` | All JavaScript-logikk |
| `oslomet-logo.png` | OsloMet-logo brukt i navbar og favicon |
| `generate_basic_auth.py` | Hjelpeskript for å generere Basic Auth-token |
| `pa_trigger.txt` | Power Automate flow-URL og curl-testkommandoer |
| `GUIDE.md` | Oppsettguide for Power Automate og frontend |
| `docs/POWERAUTOMATEGRAPHQL.md` | Teknisk dokumentasjon for CORS-oppsett |
| `docs/testquery.md` | Eksempel på GraphQL-spørring og respons |

---

## 4. Frontend (index.html / style.css / app.js)

### 4.1 HTML-struktur

Applikasjonen består av én side med følgende elementer:

- **Navbar** med OsloMet-logo
- **Søkefelt** for studentnummer eller feide-adresse
- **Statusmelding** som viser laste-/feil-/ok-tilstand
- **Profilkort** som vises etter vellykket oppslag
- Kommentert-ut seksjon for fremtidig "Last inn alle studenter"-funksjon

### 4.2 Styling (style.css)

Designet følger OsloMet sin visuelle profil:

- **Primærfarge:** `#F5C800` (OsloMet-gul)
- **Fontfamilie:** `system-ui` (systemfonter, ingen ekstern avhengighet)
- **Layout:** Maksbredde 680px, sentrert
- Responsivt grid-layout for profilkortets feltvisning

### 4.3 JavaScript (app.js)

#### Konstanter og tilstand
```js
const FLOW_URL  // Power Automate endpoint-URL
let allStudents // Buffer for eventuell listevisning (deaktivert)
let selectedNr  // Valgt studentnummer
```

#### Studieinformasjon (deterministisk randomisering)
Siden API-kontoen ikke har tilgang til studieprogramdata, genereres kull, program og klasse deterministisk basert på studentnummeret:

```js
const SI_PROGRAM = ["ANVDATA", "ACIT", "INFORMATIK", "PDB", "MAMECH", "HINGELEKTR"];
const SI_KLASSE  = ["A", "B", "C"];

function hash(nr)              // Enkel strenghash (polynomial rolling hash)
function getStudieinfo(nr, fodselsdato)  // Beregner kull (fødselsår + 19), program og klasse
```

- **Kull** beregnes som `fødselsår + 19` (studenten antatt å starte studier som 19-åring)
- **Program** og **klasse** velges deterministisk med hash-funksjonen, slik at samme student alltid får samme verdier

#### GraphQL-spørringer
Tre spørringsfunksjoner er implementert:

| Funksjon | Spørring | Bruk |
|----------|----------|------|
| `listQuery(cursor)` | `studenter` | Henter liste (deaktivert) |
| `detailQuery(feide)` | `studenterGittFeideBrukere` | Oppslag via feide-adresse |
| `detailQueryByNr(nr)` | `studenterGittStudentnumre` | Oppslag via studentnummer |

Alle spørringer filtrerer på `eierOrganisasjonskode: "215"` (OsloMet TKD-fakultet).

#### API-kall
```js
async function callFlow(query)
```
Sender GraphQL-spørringen som JSON til Power Automate-flyten via `fetch()`. Håndterer HTTP-feil og GraphQL-feil separat.

#### Søkelogikk
Søket aksepterer tre inputformater:
- Rent studentnummer: `867184`
- Med s-prefiks: `s867184`
- Feide-adresse: `s867184@oslomet.no`

#### Profilkort
`renderCard(s)` genererer HTML for profilkortet med to seksjoner:
1. **Personinfo** – navn, e-poster, feide-bruker, fødselsdato, antall semesterregistreringer
2. **Studieinformasjon** – kull, program, klasse (deterministisk generert)

---

## 5. Power Automate-integrasjon

### 5.1 Flytoppsett
Power Automate-flyten er konfigurert med:
- **HTTP-trigger** (manuell, tilgjengelig for alle)
- **HTTP-aksjon** som videresender GraphQL-spørringen til FSS API med Basic Auth
- **Response-aksjon** som returnerer data med CORS-headers

### 5.2 CORS-headers
For å tillate kall fra nettleser er følgende headers konfigurert i Response-aksjonen:

| Header | Verdi |
|--------|-------|
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type` |

### 5.3 Autentisering mot FSS
FSS GraphQL API bruker Basic Auth. `generate_basic_auth.py` er et hjelpeskript som genererer riktig Base64-kodet token fra brukernavn og passord lagret i en `.env`-fil.

---

## 6. FSS GraphQL API

### 6.1 Endepunkt
```
https://api.fellesstudentsystem.no/graphql
```

### 6.2 Relevante spørringer

**Oppslag på studentnummer:**
```graphql
{
  studenterGittStudentnumre(
    eierOrganisasjonskode: "215"
    studentnumre: "867184"
  ) {
    studentnummer
    personProfil {
      navn { fornavn etternavn }
      institusjonsEpost
      privatEpost
      feideBruker
      fodselsdato
    }
    semesterregistreringer { edges { node { id } } }
  }
}
```

**Oppslag på feide-adresse:**
```graphql
{
  studenterGittFeideBrukere(
    eierOrganisasjonskode: "215"
    feideBrukere: "s867184@oslomet.no"
  ) { ... }
}
```

### 6.3 Organisasjonskoder
| Kode | Enhet |
|------|-------|
| `215` | OsloMet TKD (Teknologi, kunst og design) |
| `186` | OsloMet (hovedinstitusjon) – ikke tilgjengelig med nåværende konto |

---

## 7. Sikkerhet

### 7.1 Kjente risikoer

| Risiko | Alvorlighet | Status |
|--------|-------------|--------|
| `FLOW_URL` eksponert i frontend-kode | Høy | Ikke utbedret – krever server-side løsning |
| `Access-Control-Allow-Origin: *` | Middels | Akseptabelt for intern bruk |
| Ingen autentisering i frontend | Høy | Applikasjonen er åpen for alle som har URL-en |
| Persondata (fødselsdato, privat e-post) hentes ved oppslag | Middels | Begrenset til enkeltoppslag, ikke bulk |

### 7.2 Anbefalinger
1. **Flytt `FLOW_URL` til server-side** – bruk en enkel backend (f.eks. Azure Function) som proxy, slik at URL-en med signaturnøkkel ikke er synlig i nettleseren
2. **Legg til innlogging** – koble applikasjonen til OsloMet sin Azure AD / Entra ID for å sikre at kun autoriserte ansatte har tilgang
3. **Begrens CORS** – sett `Access-Control-Allow-Origin` til applikasjonens faktiske domene i stedet for `*`
4. **Loggfør oppslag** – registrer hvem som slår opp hvilke studenter, for sporbarhet iht. GDPR

---

## 8. Kjente begrensninger

| Begrensning | Årsak |
|-------------|-------|
| Studieprogramdata er hardkodet/tilfeldig | API-kontoen har ikke tilgang til `programStudieretter` |
| Kun studenter under org `215` kan søkes opp | API-kontoen er begrenset til TKD-fakultetet |
| Ansatte kan ikke søkes opp | FSS er et studentsystem; ansattdata ligger i Active Directory/Azure AD |
| Noen studentnumre gir intern serverfeil | FSS API returnerer feil for studenter utenfor org `215` istedenfor tomt resultat |

---

## 9. Mulige forbedringer

- **Søk på navn** – implementer navnesøk via `studenter`-spørringen med filtermuligheter
- **Eksport** – mulighet for å eksportere søkeresultat til CSV/Excel
- **Utvidet organisasjonstilgang** – be OsloMet IT om utvidet API-tilgang til alle fakulteter
- **Faktisk studieprogramdata** – ved utvidet tilgang kan kull/program/klasse hentes direkte fra FSS
- **Innlogging via Azure AD** – sikre applikasjonen med OsloMet-innlogging (MSAL.js)
