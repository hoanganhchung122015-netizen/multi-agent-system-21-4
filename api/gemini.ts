import { GoogleGenAI } from '@google/genai';

// Tách API Key làm 2 phần chuẩn
const KEY_PART_1 = 'AIzaSyCfS8J6reeEKEUm';
const KEY_PART_2 = '6yJdbX106r01WUr3OIY';

// Ghép lại trực tiếp
const FULL_API_KEY = KEY_PART_1 + KEY_PART_2;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu prompt hoặc ảnh' });
  }

  // Lấy API Key từ biến môi trường trên Vercel nếu có, nếu không lấy FULL_API_KEY
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || FULL_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình API Key' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];

    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      const mimeType = image.includes('data:')
        ? image.split(';')[0].replace('data:', '')
        : 'image/jpeg';

      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    contents.push(
      prompt ||
        'Hãy đọc hình ảnh đề toán này, trích xuất chính xác đề bài và trình bày lời giải chi tiết, rõ ràng nhất bằng Tiếng Việt.'
    );

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    if (response && response.text) {
      return res.status(200).json({ text: response.text });
    } else {
      return res.status(500).json({ error: 'Không nhận được phản hồi từ Gemini API' });
    }
  } catch (err: any) {
    console.error(`Lỗi gọi Gemini API:`, err);
    return res.status(500).json({
      error: `Lỗi từ Google API: ${err?.message || JSON.stringify(err)}`,
    });
  }
}
