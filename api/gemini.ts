import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, systemInstruction } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  // Danh sách các API Key dự phòng
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel Environment Variables.' });
  }

  let lastError: any = null;

  // Xoay vòng chìa khóa API phòng trường hợp chạm trần quota
  for (const apiKey of apiKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      return res.status(200).json({ text: response.text });
    } catch (err: any) {
      console.error(`Key failure:`, err.message || err);
      lastError = err;
    }
  }

  return res.status(500).json({ 
    error: 'Tất cả API Keys đều thất bại hoặc hết hạn quota. Vui lòng cập nhật API Key mới trên Vercel.' 
  });
}
