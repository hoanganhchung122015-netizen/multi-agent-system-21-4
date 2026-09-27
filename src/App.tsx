// api/gemini.ts - Cấu hình ưu tiên mô hình gemini-3.5-flash
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Xu ly CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu bài tập hoặc hình ảnh' });
  }

  // Lay API Key tu bien moi truong Vercel/Vite
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trong Environment Variables trên Vercel.',
    });
  }

  // Danh sách ưu tiên gọi gemini-3.5-flash hàng đầu
  const modelsToTry = [
    'gemini-3.5-flash'
  ];

  try {
    const parts: any[] = [];

    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      let mimeType = 'image/jpeg';
      if (image.includes('data:')) {
        mimeType = image.split(';')[0].replace('data:', '');
      }

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      });
    }

    parts.push({
      text: prompt || 'Hãy trích xuất nội dung bài tập và giải chi tiết từng bước bằng Tiếng Việt.',
    });

    const requestBody: any = {
      contents: [{ parts }],
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    let lastError = '';

    // Thực thi gọi API theo danh sách model
    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok) {
          const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResult) {
            return res.status(200).json({ 
              text: textResult, 
              modelUsed: model 
            });
          }
        } else {
          lastError = data.error?.message || JSON.stringify(data);
        }
      } catch (e: any) {
        lastError = e?.message || 'Lỗi kết nối mạng';
      }
    }

    return res.status(500).json({
      error: `Chi tiết phản hồi từ Google API: ${lastError}`,
    });

  } catch (err: any) {
    return res.status(500).json({
      error: `Lỗi Serverless: ${err?.message || JSON.stringify(err)}`,
    });
  }
}
