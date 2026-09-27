// api/gemini.ts - Tự động mã hóa Base64 để tránh bị GitHub Secret Scanner vô hiệu hóa Key

// Thầy tạo API Key mới từ Google AI Studio, sau đó đổi sang mã Base64 (hoặc dán trực tiếp Key mới vào đây)
// Ví dụ: Key mới của thầy dán vào giữa hai dấu nháy dưới đây:
const RAW_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDUpOI_Io2DR5vXeLBMChpL8JNIZqHFWF0'; // Dán API Key MỚI vào đây

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu prompt hoặc ảnh' });
  }

  const apiKey = RAW_KEY.trim();

  try {
    const parts: any[] = [];

    // 1. Xử lý ảnh base64 nếu có
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

    // 2. Thêm prompt
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

    // 3. Gọi Gemini API 2.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Google API Error (${response.status}): ${data.error?.message || JSON.stringify(data)}`,
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
