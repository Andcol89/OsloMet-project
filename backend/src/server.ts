import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const FLOW_URL = process.env.FLOW_URL;
if (!FLOW_URL) {
	console.error('FLOW_URL mangler i .env');
	process.exit(1);
}

app.post('/api/student', async (req, res) => {
	const { studentnummer } = req.body;
	if (!studentnummer) {
		return res.status(400).json({ error: 'studentnummer mangler' });
	}

	try {
		const fetch = (await import('node-fetch')).default;
		const paRes = await fetch(FLOW_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ studentnummer })
		});
		const text = await paRes.text();
		let data;
		try {
			data = JSON.parse(text);
		} catch {
			data = { raw: text };
		}
		res.status(paRes.status).json(data);
	} catch (err) {
		res.status(502).json({ error: { code: 'NoResponse', message: String(err) } });
	}
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Backend kjører på port ${PORT}`);
});
