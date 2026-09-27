// api/gemini.ts - Cấu hình tối ưu tốc độ tối đa cho gemini-3.5-flash
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Xử lý CORS
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

  // Lấy API Key từ biến môi trường Vercel/Vite
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trong Environment Variables trên Vercel.',
    });
  }

  // Danh sách ưu tiên gọi gemini-3.5-flash
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

    // Prompt mặc định yêu cầu CHỈ LẤY ĐÁP ÁN, KHÔNG LỜI GIẢI
    parts.push({
      text: prompt || 'Hãy giải bài tập trong ảnh/văn bản và CHỈ XUẤT RỦY NHẤT ĐÁP ÁN CUỐI CÙNG (không kèm lời giải hay các bước trung gian).',
    });

    // System instruction cứng ép AI trả về ngắn nhất có thể
    const strictSystemInstruction = systemInstruction || 
      'Bạn là chuyên gia giải nhanh trắc nghiệm. Nhiệm vụ duy nhất của bạn là đưa ra ĐÁP ÁN CUỐI CÙNG dạng: "ĐÁP ÁN CUỐI CÙNG: [Kết quả/Chọn A, B, C, D]". TUYỆT ĐỐI KHÔNG giải thích, KHÔNG nêu phương pháp, KHÔNG viết các bước giải.';

    const requestBody: any = {
      contents: [{ parts }],
      systemInstruction: {
        parts: [{ text: strictSystemInstruction }],
      },
      // Cấu hình tham số tối ưu tốc độ
      generationConfig: {
        temperature: 0.1,      // Giảm độ suy đoán ngẫu nhiên để chọn đáp án nhanh nhất
        maxOutputTokens: 100,  // Tối đa 100 token (ngắt câu trả lời ngay khi ra xong đáp án)
      }
    };

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
              text: textResult.trim(), 
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
