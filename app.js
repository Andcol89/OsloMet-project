// MERK: FLOW_URL inneholder en signaturnøkkel og bør behandles som et passord.
// I produksjon bør denne ligge server-side og ikke eksponeres i frontend-kode.
const FLOW_URL = "https://defaultfec81f12628645508911f446fcdafa.1f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/458dbe403099446fb09394403a3ae1af/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=REDACTED";

const statusEl   = document.getElementById("status");
const listEl     = document.getElementById("list-container");
const detailEl   = document.getElementById("detail");
// const searchEl = document.getElementById("search-input"); // Last inn alle — deaktivert
// const btnLoad  = document.getElementById("btn-load");     // Last inn alle — deaktivert
const nrInput    = document.getElementById("nr-input");
const btnLookup  = document.getElementById("btn-lookup");

let allStudents = [];
let selectedNr  = null;

const SI_PROGRAM = ["ANVDATA", "ACIT", "INFORMATIK", "PDB", "MAMECH", "HINGELEKTR"];
const SI_KLASSE  = ["A", "B", "C"];

function hash(nr) {
  let h = 0;
  for (const c of String(nr)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function getStudieinfo(nr, fodselsdato) {
  const h       = hash(nr);
  const program = SI_PROGRAM[(h >> 4) % SI_PROGRAM.length];
  const klasse  = program + "-" + SI_KLASSE[(h >> 8) % SI_KLASSE.length];

  let kull = "—";
  if (fodselsdato) {
    const birthYear = parseInt(fodselsdato.substring(0, 4), 10);
    if (!isNaN(birthYear)) kull = String(birthYear + 19);
  }

  return { kull, program, klasse };
}

// ── GraphQL-spørringer ────────────────────────────────────────────────────

// Listespørring: henter kun felt nødvendige for oversiktsvisning (dataminimering).
// privatEpost og fodselsdato hentes IKKE her — kun ved direkte oppslag på én student.
function listQuery(cursor) {
  const after = cursor ? `, after: "${cursor}"` : "";
  return `{
  studenter(filter: {eierOrganisasjonskode: "215"}, first: 50${after}) {
    edges {
      node {
        studentnummer
        personProfil {
          navn { fornavn etternavn }
          institusjonsEpost
          feideBruker
        }
        semesterregistreringer {
          edges { node { id } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
}

// Detaljspørring: henter fullstendig datasett inkl. privatEpost og fødselsdato.
// Brukes kun ved oppslag på én konkret student — begrunnet av behov i saksbehandling.
function detailQuery(feide) {
  return `{
  studenterGittFeideBrukere(
    eierOrganisasjonskode: "215"
    feideBrukere: "${feide}"
  ) {
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
}`;
}

function detailQueryByNr(nr) {
  return `{
  studenterGittStudentnumre(
    eierOrganisasjonskode: "215"
    studentnumre: "${nr}"
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
}`;
}

// ── Normalisering av studentnummer → feide-bruker ─────────────────────────
// Feide-format: s{studentnummer}@oslomet.no
// Aksepterer: "s300055", "300055", "s300055@oslomet.no"
function toFeide(input) {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  const nr = trimmed.startsWith("s") ? trimmed.slice(1) : trimmed;
  if (!nr || !/^\d+$/.test(nr)) return null;
  return `s${nr}@oslomet.no`;
}

// ── API-kall ──────────────────────────────────────────────────────────────

async function callFlow(query) {
  const res = await fetch(FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data;
}

// ── Direkte oppslag på studentnummer ─────────────────────────────────────

btnLookup.addEventListener("click", async () => {
  const raw = nrInput.value.trim();
  if (!raw) return;

  // Avgjør om input er feide-adresse eller studentnummer
  const isFeide = raw.includes("@");
  const nr = raw.toLowerCase().startsWith("s") ? raw.slice(1) : raw;

  if (!isFeide && !/^\d+$/.test(nr)) {
    setStatus("Ugyldig format. Skriv studentnummer (f.eks. 867184) eller feide-adresse.", "error");
    return;
  }

  btnLookup.disabled = true;
  detailEl.innerHTML = "";
  setStatus("Henter student…", "loading");

  try {
    let student = null;

    if (isFeide) {
      const data = await callFlow(detailQuery(raw.toLowerCase()));
      student = data?.data?.studenterGittFeideBrukere?.[0] ?? null;
    } else {
      const data = await callFlow(detailQueryByNr(nr));
      student = data?.data?.studenterGittStudentnumre?.[0] ?? null;
    }

    if (!student) {
      setStatus("Ingen student funnet.", "error");
    } else {
      setStatus("", "");
      detailEl.innerHTML = renderCard(student);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (err) {
    setStatus("Feil: " + err.message, "error");
  } finally {
    btnLookup.disabled = false;
  }
});

nrInput.addEventListener("keydown", e => {
  if (e.key === "Enter") btnLookup.click();
});

// ── Hent og vis detaljkort ────────────────────────────────────────────────

async function showDetail(feide, nr) {
  detailEl.innerHTML = "";
  setStatus("Henter detaljer…", "loading");
  try {
    const data = await callFlow(detailQuery(feide));
    const studenter = data?.data?.studenterGittFeideBrukere ?? [];
    if (!studenter.length || !studenter[0]) {
      renderDetailFromList(allStudents.find(s => s.studentnummer === nr));
      return;
    }
    setStatus("", "");
    detailEl.innerHTML = renderCard(studenter[0]);
  } catch (err) {
    setStatus("Feil ved henting av detaljer: " + err.message, "error");
  }
}

function renderDetailFromList(s) {
  setStatus("", "");
  detailEl.innerHTML = renderCard(s);
}

// ── Profilkort ────────────────────────────────────────────────────────────

function renderCard(s) {
  const navn    = s.personProfil?.navn;
  const fullt   = [navn?.fornavn, navn?.etternavn].filter(Boolean).join(" ") || "—";
  const iepost  = s.personProfil?.institusjonsEpost ?? "—";
  const pepost  = s.personProfil?.privatEpost ?? "—";
  const feide   = s.personProfil?.feideBruker ?? "—";
  const fødsel  = s.personProfil?.fodselsdato ?? "—";
  const nSem    = s.semesterregistreringer?.edges?.length ?? "—";

  const info = getStudieinfo(s.studentnummer, s.personProfil?.fodselsdato);
  const studieHTML = (info.kull || info.program || info.klasse) ? `
      <div class="section">
        <p class="section-title">Studieinformasjon</p>
        <div class="field-grid">
          ${info.kull    ? row("Kull",    info.kull)    : ""}
          ${info.program ? row("Program", info.program) : ""}
          ${info.klasse  ? row("Klasse",  info.klasse)  : ""}
        </div>
      </div>` : "";

  return `
    <div class="profile-card">
      <div class="profile-header">
        <p class="name">${fullt}</p>
        <p class="meta">Studentnummer: ${s.studentnummer ?? "—"} &nbsp;·&nbsp; ${iepost}</p>
        <button class="close-btn" onclick="document.getElementById('detail').innerHTML=''" title="Lukk">&times;</button>
      </div>
      <div class="section">
        <p class="section-title">Personinfo</p>
        <div class="field-grid">
          ${row("Fornavn", navn?.fornavn)}
          ${row("Etternavn", navn?.etternavn)}
          ${row("Institusjonsepost", iepost)}
          ${row("Privat e-post", pepost)}
          ${row("Feide-bruker", feide)}
          ${row("Fødselsdato", fødsel)}
          ${row("Semesterregistreringer", nSem)}
        </div>
      </div>
      ${studieHTML}
    </div>`;
}

function row(label, value) {
  return `<div class="field-label">${label}</div><div class="field-value">${value ?? "—"}</div>`;
}

// ── Hjelpefunksjoner ──────────────────────────────────────────────────────

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className   = cls;
}
