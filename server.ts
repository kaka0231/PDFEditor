import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for document & image processing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Shared Gemini client
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // AI Document Assistant Endpoint
  app.post('/api/ai/analyze-doc', async (req, res) => {
    try {
      const { prompt, textContent, imageBase64, mimeType, task } = req.body;
      const ai = getAiClient();

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API key is not configured in server environment.',
        });
      }

      let systemInstruction = 'You are a professional document analysis and processing assistant. Provide clear, accurate, formatted output in Traditional Chinese (繁體中文) unless requested otherwise.';
      if (task === 'ocr') {
        systemInstruction = 'You are an advanced OCR engine. Transcribe and extract all textual content and tables faithfully from the provided image/document. Maintain original layout structure using Markdown.';
      } else if (task === 'summarize') {
        systemInstruction = 'You are an executive document summarizer. Generate a structured summary with: 1. Executive Summary, 2. Key Action Items, 3. Important Dates & Numbers, 4. Detailed Section Breakdown.';
      } else if (task === 'translate') {
        systemInstruction = 'You are a professional document translator. Translate the document accurately into the requested language while preserving tone, formatting, and technical terminology.';
      }

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }

      const fullPrompt = [
        prompt || 'Please analyze this document thoroughly.',
        textContent ? `\n\n[Document Text Content]:\n${textContent}` : '',
      ].filter(Boolean).join('');

      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: { parts },
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      res.json({
        result: response.text,
      });
    } catch (error: any) {
      console.error('AI Document analysis error:', error);
      res.status(500).json({
        error: error.message || 'Failed to process document with AI.',
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuMaster server running on port ${PORT}`);
  });
}

startServer();
