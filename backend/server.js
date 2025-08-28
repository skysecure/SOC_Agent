import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeIncident } from './services/geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/analyse', async (req, res) => {
  try {
    const incidentData = req.body;
    const report = await analyzeIncident(incidentData);
    res.json(report);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze incident' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});