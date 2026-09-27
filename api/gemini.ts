import { GoogleGenAI } from '@google/genai';

// Thầy dán API Key hoạt động ổn định nhất của thầy vào đây để làm Key ưu tiên/backup
const HARDCODED_BACKUP_KEY = 'AQ.Ab8RN6JJzHjMAaYAH_HUatbgusighHYhkr39JWlF-uq7lKn86A';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu prompt hoặc ảnh' });
  }

  const envKeys = Object.keys(process.env)
    .filter((key) => key.includes('GEMINI') || key.includes('API_KEY'))
    .map((key) => process.env[key])
    .filter(Boolean) as string[];

  const apiKeys = Array.from(
    new Set([
      HARDCODED_BACKUP_KEY, // Cho Key backup lên ưu tiên đầu tiên để đạt tốc độ nhanh nhất
      ...envKeys.flatMap((k) => k.split(',')).map((k) => k.trim()),
    ].filter((k) => k && k.startsWith('AIza')))
  );

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'Chưa cấu hình API Key.' });
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

      contents.push(prompt || 'Giải chi tiết bài toán trong ảnh.');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      if (response && response.text) {
        return res.status(200).json({ text: response.text });
      }
    } catch (err: any) {
      console.error(`Key error:`, err?.message || err);
      lastErrorMessage = err?.message || JSON.stringify(err);
    }
  }

  return res.status(500).json({
    error: `Lỗi gọi API từ Google: ${lastErrorMessage}`,
  });
}
