# Presentasjon: Studentoppslag – OsloMet
> Kopier innholdet slide for slide inn i PowerPoint. Bruk OsloMet sin mal/farger (#F5C800 gul, hvit bakgrunn).

---

## SLIDE 1 — Tittel

**Tittel:** Studentoppslag
**Undertittel:** Et internt søkeverktøy for rask tilgang til studentinformasjon
**Navn / seksjon / dato**

---

## SLIDE 2 — Bakgrunn

**Overskrift:** Utfordringen

**Innhold:**
- Saksbehandlere trenger raskt tilgang til grunnleggende studentinformasjon
- Tidligere krevde dette innlogging i flere systemer
- Felles Studentsystem (FSS) inneholder all informasjonen — men er ikke lett tilgjengelig for alle
- **Mål:** Gjøre studentoppslag enkelt og raskt for alle i seksjonen

---

## SLIDE 3 — Løsningen

**Overskrift:** Hva er Studentoppslag?

**Innhold:**
- Et enkelt søkeverktøy som kjører direkte i nettleseren
- Søk på studentnummer → full studentprofil på sekunder
- Henter data direkte fra OsloMets offisielle studentsystem (FSS)
- Ingen installasjon — åpnes med én lenke

**Bilde/illustrasjon:** Skjermbilde av applikasjonen

---

## SLIDE 4 — DEMO

**Overskrift:** Se det i praksis

> 🎯 VIS APPLIKASJONEN LIVE HER
> 1. Åpne applikasjonen i nettleser
> 2. Skriv inn et studentnummer
> 3. Vis profilkortet som dukker opp

*(Denne sliden kan ha kun logoen og teksten "Demo" — la applikasjonen snakke for seg selv)*

---

## SLIDE 5 — Hva vises?

**Overskrift:** Informasjon per student

**To kolonner:**

| Felt | Eksempel |
|------|---------|
| Fullt navn | Kari Nordmann |
| Studentnummer | 867184 |
| Institusjonsepost | kari.nordmann@student.oslomet.no |
| Privat e-post | kari@gmail.com |
| Feide-bruker | s867184@oslomet.no |
| Fødselsdato | 1998-03-15 |
| Semesterregistreringer | 6 |

---

## SLIDE 6 — Teknologi (valgfri — kan hoppes over)

**Overskrift:** Hvordan fungerer det?

**Enkel flyt (tre bokser med piler):**

```
Nettleser  →  Power Automate  →  Felles Studentsystem (FSS)
(søk)          (sikker kobling)    (OsloMets studentsystem)
```

- Alt skjer innenfor OsloMets egne systemer
- Bruker Microsoft Power Automate som sikker mellomtjeneste
- Data hentes direkte fra FSS — ingen kopi lagres noe sted

---

## SLIDE 7 — Sikkerhet og personvern

**Overskrift:** Personvern og sikkerhet

✅ Data hentes direkte fra OsloMets eget system — ingen ekstern lagring
✅ Kun tilgjengelig for dem som har lenken til verktøyet
✅ Sensitiv informasjon (fødselsdato, privat e-post) vises kun ved direkte oppslag
✅ All kode er gjennomgått for kjente sikkerhetsproblemer

⚠️ Anbefaling videre: Koble til OsloMet-innlogging (Azure AD) for full tilgangsstyring

---

## SLIDE 8 — Begrensninger

**Overskrift:** Kjente begrensninger

- Søk kun på studentnummer (ikke navn) — API-begrensning
- Kun studenter under TKD-fakultetet (organisasjonskode 215)
- Studieprogramdata (kull, program, klasse) er foreløpig estimert — ikke hentet fra API
- Ingen innlogging — tilgang styres via lenken

---

## SLIDE 9 — Videre utvikling

**Overskrift:** Muligheter fremover

🔐 **Innlogging via OsloMet-konto** — kun autoriserte ansatte får tilgang
🔍 **Navnesøk** — søke på fornavn/etternavn (krever utvidet API-tilgang)
🏫 **Alle fakulteter** — utvide utover TKD (krever utvidet API-tilgang fra IT)
📊 **Eksport** — laste ned søkeresultater til Excel/CSV
📱 **SharePoint-integrasjon** — tilgjengelig direkte i OsloMet-intranett

---

## SLIDE 10 — Avslutning

**Overskrift:** Oppsummering

> *"Fra manuelt arbeid i flere systemer til ett søk på sekunder."*

- Verktøyet er ferdig og klart til bruk
- Kildekoden er tilgjengelig og vedlikeholdbar
- Kan bygges videre på etter behov

**Spørsmål?**

---

## TIPSNOTAT TIL DEG SOM PRESENTERER

- **Tid:** Sett av 10–15 minutter totalt, inkl. spørsmål
- **Demo-tips:** Ha applikasjonen åpen i en annen fane klar til bruk
- **Hvis noe feiler under demo:** Ha et skjermbilde av applikasjonen som backup
- **Fokus:** Bruk mesteparten av tiden på slide 3–5 og demoen
- **Unngå:** Tekniske detaljer om GraphQL, JavaScript, CSS osv.
- **Si gjerne:** "Dette er bygget med OsloMets egne systemer og verktøy"
