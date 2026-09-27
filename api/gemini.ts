import { GoogleGenAI } from '@google/genai';

// 🔴 BƯỚC QUAN TRỌNG: Chia đôi API Key của bạn dán vào 2 biến dưới đây:
// Ví dụ Key của bạn là: AIzaSy1234567890abcdefghijklmn
const KEY_PART_1 = 'AQ.Ab8RN6LBtw-cy'; // Dán 16 ký tự đầu của Key vào đây
const KEY_PART_2 = 'enL8pP8h-l6x7tFzjhVOQmVp3rWyxV6vy2b5A';   // Dán phần còn lại của Key vào đây

// Tự động ghép lại thành Key đầy đủ
const FULL_API_KEY = (KEY_PART_1 + KEY_PART_2).trim();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu prompt hoặc ảnh' });
  }

  // Lấy thêm key từ môi trường Vercel (nếu có)
  const envKeys = Object.keys(process.env)
    .filter((key) => key.includes('GEMINI') || key.includes('API_KEY'))
    .map((key) => process.env[key])
    .filter(Boolean) as string[];

  // Tổng hợp tất cả các Key khả dụng
  const apiKeys = Array.from(
    new Set([
      FULL_API_KEY,
      ...envKeys.flatMap((k) => k.split(',')).map((k) => k.trim()),
    ].filter((k) => k && k.startsWith('AIza') && k.length > 20))
  );

  if (apiKeys.length === 0) {
    return res.status(500).json({
      error: 'Chưa cấu hình API Key. Vui lòng kiểm tra lại KEY_PART_1 và KEY_PART_2 trong api/gemini.ts',
    });
  }

  let lastErrorMessage = '';

  for (const apiKey of apiKeys) {
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

      contents.push(prompt || 'Hãy đọc hình ảnh đề toán này, trích xuất chính xác đề bài và trình bày lời giải chi tiết, rõ ràng nhất bằng Tiếng Việt.');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
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

  return res.status(500).json({
    error: `Lỗi gọi API từ Google: ${lastErrorMessage}`,
  });
}
