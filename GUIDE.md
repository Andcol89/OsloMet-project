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

## Power Automate-flyt (eksisterende – HTTP-trigger)

**Flyt-ID:** `458dbe403099446fb09394403a3ae1af`
**Miljø:** `Default-fec81f12-6286-4550-8911-f446fcdafa1f`

Flyten tar imot `{ query: "..." }` som JSON-body og sender GraphQL-spørringen videre til Felles studentsystem.

### GraphQL API
- **URL:** `https://api.fellesstudentsystem.no/graphql/`
- **Auth:** Basic Auth (brukernavn/passord i `.env`)
- **Org-kode:** `215` (OsloMet)

### Eksempel på spørring
```graphql
{
  studenterGittFeideBrukere(
    eierOrganisasjonskode: "215"
    feideBrukere: "s300055@oslomet.no"
  ) {
    personProfil {
      navn { fornavn etternavn }
      institusjonsepost
      fodselsdato
    }
    studentforhold {
      status
      startdato
      studieprogram {
        studieprogramkode
        studieprogramnavn
        studieniva
      }
      semesterregistrering {
        semester { arstall terminkode }
        status
      }
    }
  }
}
```

> Feide-format: `s{studentnummer}@oslomet.no`

---

## Power Apps-oppsett (ny flyt + canvas app)

### Steg 1 – Ny flyt med Power Apps-trigger

Opprett en ny flyt i Power Automate med følgende struktur:

#### Trigger: Power Apps (V2)
- Input: `studentnummer` (Text)

#### Action 1: Compose – Bygg feide-ID
```
concat("s", triggerBody()['studentnummer'], "@oslomet.no")
```

#### Action 2: HTTP – Kall GraphQL API
| Felt | Verdi |
|---|---|
| Method | POST |
| URI | `https://api.fellesstudentsystem.no/graphql/` |
| Content-Type | `application/json` |
| Authorization | `Basic b3Nsb21ldF9kaXVfc2VrOmk1ZWdFSE40MUU3NDZNZnc=` |

Body:
```json
{
  "query": "{ studenterGittFeideBrukere(eierOrganisasjonskode: \"215\" feideBrukere: \"@{outputs('FeideID')}\") { personProfil { navn { fornavn etternavn } institusjonsepost fodselsdato } studentforhold { status startdato studieprogram { studieprogramkode studieprogramnavn studieniva } semesterregistrering { semester { arstall terminkode } status } } } }"
}
```

#### Action 3: Parse JSON
Parse body fra HTTP-steget med dette skjemaet:
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
                  "institusjonsepost": { "type": "string" },
                  "fodselsdato": { "type": "string" }
                }
              },
              "studentforhold": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string" },
                    "startdato": { "type": "string" },
                    "studieprogram": {
                      "type": "object",
                      "properties": {
                        "studieprogramkode": { "type": "string" },
                        "studieprogramnavn": { "type": "string" },
                        "studieniva": { "type": "string" }
                      }
                    }
                  }
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

#### Action 4: Respond to Power Apps (V2)
| Navn | Expression |
|---|---|
| `fornavn` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['navn']?['fornavn']` |
| `etternavn` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['navn']?['etternavn']` |
| `epost` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['institusjonsepost']` |
| `fodselsdato` | `first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['personProfil']?['fodselsdato']` |
| `programnavn` | `first(first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['studentforhold'])?['studieprogram']?['studieprogramnavn']` |
| `programkode` | `first(first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['studentforhold'])?['studieprogram']?['studieprogramkode']` |
| `studentStatus` | `first(first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['studentforhold'])?['status']` |
| `startdato` | `first(first(body('Parse_JSON')?['data']?['studenterGittFeideBrukere'])?['studentforhold'])?['startdato']` |

---

### Steg 2 – Canvas App i Power Apps

1. **Power Apps → Opprett → Tom canvas-app**
2. Koble til flyten: **Power Automate-panel → Legg til flyt**

#### Elementer på skjermen

**Text input** – navn: `InputStudentnr`
- Placeholder: `"Studentnummer, f.eks. 300055"`

**Button** – tekst: `"Hent"`
- OnSelect:
```
Set(varStudent, DittFlytNavn.Run(InputStudentnr.Text))
```

**Labels** for visning:

| Label | Text-egenskap |
|---|---|
| Navn | `varStudent.fornavn & " " & varStudent.etternavn` |
| E-post | `varStudent.epost` |
| Fødselsdato | `varStudent.fodselsdato` |
| Studieprogram | `varStudent.programnavn & " (" & varStudent.programkode & ")"` |
| Status | `varStudent.studentStatus` |
| Startdato | `varStudent.startdato` |

---

### Steg 3 – Legg inn i SharePoint

1. Gå til SharePoint-siden → **Rediger**
2. Legg til webdelen **Power Apps**
3. Velg canvas-appen
4. **Publiser siden**

---

## Kjente problemer

| Problem | Årsak | Løsning |
|---|---|---|
| 502 NoResponse | GraphQL API svarer ikke innen timeout | Sjekk run history i PA, øk timeout i HTTP-action (Advanced parameters) |
| Ingen student funnet | Feil studentnummer eller feide-format | Sjekk at feide-ID er `s{nr}@oslomet.no` |
| CORS-feil | Manglende headers i Response-action | Sørg for at CORS-headers er satt i flyten |
