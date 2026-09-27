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

  // Quét tự động tất cả các biến môi trường có tên chứa GEMINI hoặc API_KEY
  const envKeys = Object.keys(process.env)
    .filter((key) => key.includes('GEMINI') || key.includes('API_KEY'))
    .map((key) => process.env[key])
    .filter(Boolean) as string[];

  // Tách thêm trường hợp người dùng nhập nhiều key phân cách bằng dấu phẩy
  const apiKeys = Array.from(
    new Set(
      envKeys.flatMap((k) => k.split(',')).map((k) => k.trim()).filter(Boolean)
    )
  );

  if (apiKeys.length === 0) {
    return res.status(500).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel Environment Variables.'
    });
  }

  let lastErrorMessage = '';

  // Xoay vòng qua từng API Key
  for (const apiKey of apiKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      if (response && response.text) {
        return res.status(200).json({ text: response.text });
      }
    } catch (err: any) {
      console.error(`Key execution failed:`, err?.message || err);
      lastErrorMessage = err?.message || JSON.stringify(err);
    }
  }

  // Trả về chính xác thông điệp lỗi từ phía Google
  return res.status(500).json({
    error: `Gọi API thất bại. Lỗi chi tiết từ Google: ${lastErrorMessage}`
  });
}
