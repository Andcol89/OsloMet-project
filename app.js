// FLOW_URL lastes fra config.js som er gitignorert og aldri committet.
// Se config.example.js for oppsett.
const FLOW_URL = window.APP_CONFIG?.FLOW_URL;
if (!FLOW_URL) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = `<div style="font-family:sans-serif;padding:40px;color:#c0392b">
      <strong>Konfigurasjonsfeil:</strong> config.js mangler eller er ikke konfigurert.<br>
      Kopier <code>config.example.js</code> til <code>config.js</code> og fyll inn FLOW_URL.
    </div>`;
  });
}

const statusEl  = document.getElementById("status");
const listEl    = document.getElementById("list-container");
const detailEl  = document.getElementById("detail");
const nrInput   = document.getElementById("nr-input");
const btnLookup = document.getElementById("btn-lookup");
const navnInput = document.getElementById("navn-input");
const btnLoad   = document.getElementById("btn-load");
const tabNr     = document.getElementById("tab-nr");
const tabNavn   = document.getElementById("tab-navn");

tabNr.addEventListener("click", () => {
  tabNr.classList.add("active");   tabNavn.classList.remove("active");
  document.getElementById("search-nr").style.display   = "flex";
  document.getElementById("search-navn").style.display = "none";
  detailEl.innerHTML = ""; listEl.innerHTML = ""; setStatus("", "");
});
tabNavn.addEventListener("click", () => {
  tabNavn.classList.add("active"); tabNr.classList.remove("active");
  document.getElementById("search-navn").style.display = "block";
  document.getElementById("search-nr").style.display   = "none";
  detailEl.innerHTML = ""; listEl.innerHTML = ""; setStatus("", "");
});

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

// ── GraphQL-spørringer ─────────────────────────────────────────────────────

// Listespørring: henter kun felt nødvendige for oversiktsvisning (dataminimering).
// privatEpost og fodselsdato hentes IKKE her — kun ved direkte oppslag på én student.
function listQuery(cursor) {
  const after = cursor ? `, after: "${cursor}"` : "";
  return `{
  studenter(filter: {eierOrganisasjonskode: "215"}, first: 5${after}) {
    edges {
      node {
        studentnummer
        personProfil {
          navn { fornavn etternavn }
          institusjonsEpost
          feideBruker
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

  if (isFeide) {
    // Streng validering av feide — forhindrer GraphQL-injeksjon
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(raw)) {
      setStatus("Ugyldig feide-adresse.", "error");
      return;
    }
  } else if (!/^\d+$/.test(nr)) {
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


// ── Last inn alle studenter (for navnesøk) ────────────────────────────────

btnLoad.addEventListener("click", async () => {
  btnLoad.disabled = true;
  allStudents = [];
  detailEl.innerHTML = "";
  listEl.innerHTML = "";
  setStatus("Laster inn studenter…", "loading");

  try {
    let cursor = null;
    do {
      const data   = await callFlow(listQuery(cursor));
      const result = data?.data?.studenter;
      allStudents.push(...(result?.edges ?? []).map(e => e.node));
      const rawCursor = result?.pageInfo?.endCursor ?? "";
      // Valider cursor (base64) før bruk i neste spørring
      cursor = result?.pageInfo?.hasNextPage && /^[A-Za-z0-9+/=]+$/.test(rawCursor)
        ? rawCursor : null;
      setStatus(`Laster… ${allStudents.length} studenter hentet`, "loading");
    } while (cursor);

    setStatus(`${allStudents.length} studenter lastet — søk på navn nedenfor.`, "ok");
    document.getElementById("load-section").style.display    = "none";
    document.getElementById("navn-filter-row").style.display = "flex";
    navnInput.focus();
  } catch (err) {
    setStatus("Feil: " + err.message, "error");
    btnLoad.disabled = false;
  }
});

navnInput.addEventListener("input", () => {
  const q = navnInput.value.trim().toLowerCase();
  detailEl.innerHTML = "";
  if (!q) { listEl.innerHTML = ""; setStatus(`${allStudents.length} studenter lastet — søk på navn nedenfor.`, "ok"); return; }

  const results = allStudents.filter(s => {
    const fornavn   = s.personProfil?.navn?.fornavn?.toLowerCase() ?? "";
    const etternavn = s.personProfil?.navn?.etternavn?.toLowerCase() ?? "";
    return `${fornavn} ${etternavn}`.includes(q) || fornavn.startsWith(q) || etternavn.startsWith(q);
  });

  if (!results.length) {
    listEl.innerHTML = "";
    setStatus("Ingen treff.", "error");
  } else {
    setStatus(`${results.length} treff`, "ok");
    listEl.innerHTML = renderNameResults(results.slice(0, 50));
  }
});

function renderNameResults(results) {
  const rows = results.map(s => {
    const navn  = s.personProfil?.navn;
    const fullt = [navn?.fornavn, navn?.etternavn].filter(Boolean).map(esc).join(" ") || "—";
    const nr    = esc(s.studentnummer);
    const epost = esc(s.personProfil?.institusjonsEpost);
    // data-nr brukes istedenfor inline onclick for å unngå JS-injeksjon
    return `<div class="list-row" data-nr="${nr}">
      <span class="nr">${nr}</span>
      <span>${fullt}</span>
      <span class="muted">${epost}</span>
    </div>`;
  }).join("");

  const html = `<div class="student-list">
    <div class="list-header"><span>Studentnr</span><span>Navn</span><span>E-post</span></div>
    ${rows}
  </div>`;

  // Bruk event delegation — ingen inline JS med API-data
  setTimeout(() => {
    listEl.querySelectorAll(".list-row[data-nr]").forEach(el => {
      el.addEventListener("click", () => {
        const nr = el.dataset.nr;
        if (/^\d+$/.test(nr)) loadByNr(nr);
      });
    });
  }, 0);

  return html;
}

async function loadByNr(nr) {
  listEl.innerHTML = "";
  setStatus("Henter student…", "loading");
  try {
    const data    = await callFlow(detailQueryByNr(nr));
    const student = data?.data?.studenterGittStudentnumre?.[0] ?? null;
    if (!student) { setStatus("Ingen student funnet.", "error"); return; }
    setStatus("", "");
    detailEl.innerHTML = renderCard(student);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    setStatus("Feil: " + err.message, "error");
  }
}

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
  const fullt   = [navn?.fornavn, navn?.etternavn].filter(Boolean).map(esc).join(" ") || "—";
  const iepost  = esc(s.personProfil?.institusjonsEpost);
  const pepost  = esc(s.personProfil?.privatEpost);
  const feide   = esc(s.personProfil?.feideBruker);
  const fødsel  = esc(s.personProfil?.fodselsdato);
  const nSem    = esc(s.semesterregistreringer?.edges?.length);
  const snr     = esc(s.studentnummer);

  const info = getStudieinfo(s.studentnummer, s.personProfil?.fodselsdato);
  const studieHTML = (info.kull || info.program || info.klasse) ? `
      <div class="section">
        <p class="section-title">Studieinformasjon</p>
        <div class="field-grid">
          ${info.kull    ? row("Kull",    esc(info.kull))    : ""}
          ${info.program ? row("Program", esc(info.program)) : ""}
          ${info.klasse  ? row("Klasse",  esc(info.klasse))  : ""}
        </div>
      </div>` : "";

  return `
    <div class="profile-card">
      <div class="profile-header">
        <p class="name">${fullt}</p>
        <p class="meta">Studentnummer: ${snr} &nbsp;·&nbsp; ${iepost}</p>
        <button class="close-btn" onclick="document.getElementById('detail').innerHTML=''" title="Lukk">&times;</button>
      </div>
      <div class="section">
        <p class="section-title">Personinfo</p>
        <div class="field-grid">
          ${row("Fornavn",               esc(navn?.fornavn))}
          ${row("Etternavn",             esc(navn?.etternavn))}
          ${row("Institusjonsepost",     iepost)}
          ${row("Privat e-post",         pepost)}
          ${row("Feide-bruker",          feide)}
          ${row("Fødselsdato",           fødsel)}
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

// Forhindrer XSS ved å escape HTML-spesialtegn i all API-data
function esc(str) {
  if (str == null) return "—";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
