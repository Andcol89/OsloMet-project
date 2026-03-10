import { useState } from "react";
import StudentCard from "./components/StudentCard";
import "./App.css";

interface StudentData {
  id: string;
  personProfil: {
    navn: {
      fornavn: string;
      etternavn: string;
    };
    privatEpost: string;
  };
}

export default function App() {
  const [studentnummer, setStudentnummer] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [status, setStatus] = useState("");
  const [laster, setLaster] = useState(false);

  const hentStudent = async () => {
    if (!studentnummer.trim()) return;

    setLaster(true);
    setStatus("Henter...");
    setStudent(null);

    try {
      const res = await fetch("http://localhost:3001/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentnummer }),
      });

      const data = await res.json();
      const studentData = data?.data?.studenterGittFeideBrukere?.[0];

      if (!studentData) {
        setStatus("❌ Fant ingen student med dette nummeret");
        return;
      }

      setStudent(studentData);
      setStatus("✅ Student funnet!");
    } catch (err) {
      setStatus("❌ Nettverksfeil – er backend startet?");
    } finally {
      setLaster(false);
    }
  };

  return (
    <div className="container">
      <h1>OsloMet Studentoppslag</h1>

      <div className="search-row">
        <input
          type="text"
          placeholder="Skriv studentnummer, f.eks. s300055"
          value={studentnummer}
          onChange={(e) => setStudentnummer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && hentStudent()}
        />
        <button onClick={hentStudent} disabled={laster}>
          {laster ? "Henter..." : "Søk"}
        </button>
      </div>

      {status && <p className="status">{status}</p>}
      {student && <StudentCard student={student} />}
    </div>
  );
}
