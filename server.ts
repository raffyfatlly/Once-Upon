import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Check if API key is provided
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;

  // Initialize Gemini client
  let ai: GoogleGenAI | null = null;
  if (hasGeminiKey) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API endpoints
  app.post("/api/analytics/expert", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing or invalid. Please check Settings > Secrets." });
    }

    try {
      const { data, type, period } = req.body;
      
      const prompt = `As an expert business analyst, please analyze the following sales data for a premium store. The data shows ${type === 'daily' ? 'daily' : 'monthly'} sales trends for the period: ${period}. It also includes the top products sold in each time grouping.

Data payload:
${JSON.stringify(data.slice(-30), null, 2)}

Please provide a concise, smart analysis of the overall sales trend focusing on:
1. Identifying peaks or slow periods (e.g. slow mid-month, specific high-performing weeks, etc.)
2. Any notable anomalies or consistencies and actionable insights.
3. Observations about which products are performing best during these trends month-by-month (or day-by-day) and overall.

Format your response in Markdown with clear headings and bullet points.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to run analysis." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
