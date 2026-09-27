// api/gemini.ts - Chuẩn hóa tham số gọi Gemini API (Sửa lỗi 401 Unauthenticated)

const KEY_PART_1 = 'AIzaSyCfS8J6reeEKEUm';
const KEY_PART_2 = '6yJdbX106r01WUr3OIY';
const FULL_API_KEY = (KEY_PART_1 + KEY_PART_2).trim();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu prompt hoặc ảnh' });
  }

  // Ưu tiên lấy Key từ môi trường Vercel, nếu không lấy Key ghép
  const rawKey = process.env.GEMINI_API_KEY || process.env.API_KEY || FULL_API_KEY;
  // Làm sạch chuỗi key (xóa khoảng trắng/mã hóa dư thừa)
  const apiKey = rawKey.trim();

  try {
    const parts: any[] = [];

    // Xử lý ảnh base64
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

    // Thêm prompt văn bản
    parts.push({
      text: prompt || 'Hãy đọc hình ảnh đề toán này, trích xuất chính xác đề bài và trình bày lời giải chi tiết, rõ ràng nhất bằng Tiếng Việt.',
    });

    const requestBody: any = {
      contents: [{ parts }],
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    // Truyền API Key qua Header x-goog-api-key ĐẶC THỤ của Google API
    const googleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey, // Bổ sung Header x-goog-api-key để tránh bị nhầm OAuth2 Token
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      return res.status(googleResponse.status).json({
        error: `Google API Error (${googleResponse.status}): ${data.error?.message || JSON.stringify(data)}`,
      });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textResult) {
      return res.status(200).json({ text: textResult });
    } else {
      return res.status(500).json({ error: 'Không nhận được nội dung phản hồi từ Gemini API.' });
    }
  } catch (err: any) {
    return res.status(500).json({
      error: `Lỗi kết nối Serverless Function: ${err?.message || JSON.stringify(err)}`,
    });
  }
}
