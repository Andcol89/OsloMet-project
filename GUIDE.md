# Studentoppslag – OsloMet
Prototype for å hente studentdata fra Felles studentsystem via GraphQL og Power Automate.

---

## Arkitektur

```
SharePoint-side
    └── Power Apps-webdel
            └── Canvas App
                    └── Power Automate-flyt (Power Apps-trigger)
                            └── GraphQL API (api.fellesstudentsystem.no/graphql/)
```

Det finnes også en frittstående HTML-versjon (`index.html`) som kaller flyten direkte via HTTP.

---

## Filer i prosjektet

| Fil | Beskrivelse |
|---|---|
| `index.html` | Frittstående HTML-prototype (kaller PA-flyten direkte) |
| `pa_trigger.txt` | HTTP-URL og curl-eksempel for den gamle flyten |
| `generate_basic_auth.py` | Skript for å generere Basic Auth-streng |
| `.env` | Lokale hemmeligheter (ikke pushet til GitHub) |
| `.env.example` | Mal for `.env` |
| `docs/` | Dokumentasjon og testspørringer |

---

## DEL 1 — Power Automate: Ny flyt med Power Apps-trigger

### 1.1 Opprett ny flyt

1. Gå til [make.powerautomate.com](https://make.powerautomate.com)
2. Klikk **"Opprett"** i venstre meny
3. Velg **"Automatisert skyflyt"**
4. Gi flyten et navn, f.eks. `StudentOppslag_PowerApps`
5. Klikk **"Hopp over"** (du setter trigger manuelt i neste steg)

---

### 1.2 Legg til trigger: Power Apps (V2)

1. Klikk **"Legg til en trigger"**
2. Søk etter `Power Apps`
3. Velg **"Power Apps (V2)"** — *ikke den vanlige "Power Apps", men V2*
4. Klikk på triggeren for å åpne den
5. Klikk **"+ Legg til en inndata"**
6. Velg **"Tekst"**
7. Skriv inn `studentnummer` som navn
8. Klikk **"Ferdig"**

---

### 1.3 Action 1: Compose — Bygg feide-ID

1. Klikk **"+ Nytt steg"**
2. Søk etter `Compose` (eller `Skriv`)
3. Velg **"Compose"** under Data-operasjoner
4. Gi den et navn ved å klikke på tittelen og skriv `FeideID`
5. I **"Inputs"**-feltet — klikk i feltet og velg **"Uttrykk"** (Expression-fanen)
6. Lim inn dette uttrykket:
   ```
   concat("s", triggerBody()['studentnummer'], "@oslomet.no")
   ```
7. Klikk **"OK"**

---

### 1.4 Action 2: HTTP — Kall GraphQL API

1. Klikk **"+ Nytt steg"**
2. Søk etter `HTTP`
3. Velg **"HTTP"** (ikke HTTP + Swagger)
4. Fyll inn feltene:

**Method:** POST

**URI:**
```
https://api.fellesstudentsystem.no/graphql/
```

**Headers** — klikk "+ Legg til header" to ganger:

| Nøkkel | Verdi |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Basic b3Nsb21ldF9kaXVfc2VrOmk1ZWdFSE40MUU3NDZNZnc=` |

**Body** — lim inn følgende (FeideID settes inn automatisk):
```
{
  "query": "{ studenterGittFeideBrukere(eierOrganisasjonskode: \"215\" feideBrukere: \"@{outputs('FeideID')}\") { personProfil { navn { fornavn etternavn } institusjonsEpost fodselsdato privatEpost feideBruker } } }"
}
```

> **NB:** `@{outputs('FeideID')}` henter verdien fra Compose-steget automatisk.

---

### 1.5 Action 3: Parse JSON

1. Klikk **"+ Nytt steg"**
2. Søk etter `Parse JSON`
3. Velg **"Parse JSON"** under Data-operasjoner
4. I **"Content"**-feltet: klikk i feltet → velg **"Dynamisk innhold"** → velg **"Body"** fra HTTP-steget
5. I **"Schema"**-feltet — lim inn:

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "studenterGittFeideBrukere": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "personProfil": {
                "type": "object",
                "properties": {
                  "navn": {
                    "type": "object",
                    "properties": {
                      "fornavn": { "type": "string" },
                      "etternavn": { "type": "string" }
                    }
                  },
                  "institusjonsEpost": { "type": "string" },
                  "privatEpost": { "type": "string" },
                  "feideBruker": { "type": "string" },
                  "fodselsdato": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

### 1.6 Action 4: Respond to Power Apps (V2)

1. Klikk **"+ Nytt steg"**
2. Søk etter `Respond to a PowerApp`
3. Velg **"Respond to a PowerApp or flow"**
4. Klikk **"+ Legg til en utdata"** for hvert felt under:

For hvert felt — velg type **"Tekst"**, skriv inn navnet, klikk i verdi-feltet → velg **"Uttrykk"** og lim inn expression:

| Navn | Expression (lim inn i Uttrykk-fanen) |
|---|---|
| `fornavn` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['navn']?['fornavn']` |
| `etternavn` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['navn']?['etternavn']` |
| `epost` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['institusjonsEpost']` |
| `privatepost` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['privatEpost']` |
| `feidebruker` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['feideBruker']` |
| `fodselsdato` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['fodselsdato']` |

5. Klikk **"Lagre"** øverst til høyre
6. Test flyten: klikk **"Test"** → **"Manuelt"** → skriv inn `300055` som studentnummer → klikk **"Kjør flyt"**

---

## DEL 2 — Power Apps: Canvas App

### 2.1 Opprett ny app

1. Gå til [make.powerapps.com](https://make.powerapps.com)
2. Klikk **"Opprett"** i venstre meny
3. Velg **"Tom app"**
4. Velg **"Tom canvas-app"**
5. Gi appen et navn, f.eks. `Studentoppslag`
6. Velg format: **"Nettbrett"** (passer best i SharePoint)
7. Klikk **"Opprett"**

---

### 2.2 Koble til Power Automate-flyten

1. Klikk på **strømbol-ikonet** i venstre panel (Power Automate)
2. Klikk **"Legg til flyt"**
3. Finn flyten `StudentOppslag_PowerApps` du lagde
4. Klikk på den — den legges nå til i appen

---

### 2.3 Legg til søkefelt (Text input)

1. Klikk **"+ Sett inn"** i toppmenyen
2. Velg **"Tekstinndata"** (Text input)
3. Klikk på elementet → gi det navnet `InputStudentnr` i navnefeltet øverst til venstre
4. I høyre panel under **"Placeholder"**, skriv:
   ```
   "Studentnummer, f.eks. 300055"
   ```
5. Plasser det øverst på skjermen

---

### 2.4 Legg til Hent-knapp

1. Klikk **"+ Sett inn"** → **"Knapp"**
2. Endre teksten til `"Hent"`
3. Klikk på knappen → velg **"OnSelect"** i formellinjen øverst
4. Lim inn:
   ```
   Set(varStudent, StudentOppslag_PowerApps.Run(InputStudentnr.Text))
   ```
   > Bytt `StudentOppslag_PowerApps` med det eksakte navnet på flyten din slik den vises i Power Apps

---

### 2.5 Legg til visning av studentdata (Labels)

For hvert felt — klikk **"+ Sett inn"** → **"Etikett"** (Label):

Klikk på etiketten → velg **"Text"** i formellinjen og lim inn:

| Hva | Text-formel |
|---|---|
| Navn | `varStudent.fornavn & " " & varStudent.etternavn` |
| Institusjonsepost | `varStudent.epost` |
| Privat e-post | `varStudent.privatepost` |
| Feide-bruker | `varStudent.feidebruker` |
| Fødselsdato | `varStudent.fodselsdato` |

> **Tips:** Legg til en overskriftsetikett over hvert felt med fast tekst, f.eks. `"Navn:"`, `"E-post:"` osv.

---

### 2.6 Test appen

1. Klikk **"Spill av"** (trekant-knappen) øverst til høyre
2. Skriv inn `300055` i søkefeltet
3. Klikk **"Hent"**
4. Verifiser at studentdata vises

---

### 2.7 Publiser appen

1. Klikk **"Fil"** → **"Lagre"**
2. Klikk **"Publiser"** → **"Publiser denne versjonen"**

---

## DEL 3 — SharePoint: Legg inn appen

### 3.1 Åpne SharePoint-siden

1. Gå til SharePoint-siden der du vil legge inn studentoppslagsappen
2. Klikk **"Rediger"** øverst til høyre

### 3.2 Legg til Power Apps-webdel

1. Klikk på **"+"** der du vil legge inn appen
2. Søk etter `Power Apps`
3. Velg **"Power Apps"**-webdelen
4. Klikk **"Legg til en app"**
5. Finn og velg `Studentoppslag`-appen din
6. Juster størrelsen ved å dra i kantene

### 3.3 Publiser siden

1. Klikk **"Publiser"** øverst til høyre
2. Appen er nå tilgjengelig for alle med tilgang til SharePoint-siden

---

## Kjente problemer

| Problem | Årsak | Løsning |
|---|---|---|
| 502 NoResponse | GraphQL API svarer ikke fra Microsofts sky-IP-er | OsloMet IT må hviteliste Power Automates IP-adresser |
| Ingen student funnet | Feil studentnummer eller feide-format | Feide-ID er `s{nr}@oslomet.no` — fungerer kun for testbrukere |
| Tom respons fra flyt | Parse JSON finner ikke feltet | Sjekk run history i PA — se hva HTTP-steget faktisk returnerte |
| CORS-feil i HTML | Manglende headers i Response-action | Sørg for at CORS-headers er satt i den eksisterende flyten |
| "Name isn't valid" i Power Apps | Flytnavn med mellomrom | Bruk understrek i flytnavn, f.eks. `StudentOppslag_PowerApps` |

---

## GraphQL API — Gyldige felt

Bekreftet fungerende felt på `studenterGittFeideBrukere`:

```graphql
{
  studenterGittFeideBrukere(
    eierOrganisasjonskode: "215"
    feideBrukere: "s300055@oslomet.no"
  ) {
    id
    studentnummer
    personProfil {
      navn { fornavn etternavn }
      institusjonsEpost
      privatEpost
      feideBruker
      fodselsdato
    }
    semesterregistreringer {
      edges { node { id } }
    }
  }
}
```

> **NB:** `studentforhold`, `studieprogram`, `institusjonsepost` (liten e) finnes **ikke** i dette APIet.
