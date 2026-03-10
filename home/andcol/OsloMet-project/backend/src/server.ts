import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3001;
const FLOW_URL = process.env.FLOW_URL || "";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.post("/api/student", async (req, res) => {
  const { studentnummer } = req.body;

  if (!studentnummer) {
    res.status(400).json({ error: "Studentnummer mangler" });
    return;
  }

  const studentEmail = `${studentnummer}@oslomet.no`;

  try {
    const response = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentEmail }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Feil ved kall til Power Automate:", error);
    res.status(500).json({ error: "Kunne ikke hente studentdata" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend kjører på http://localhost:${PORT}`);
});
