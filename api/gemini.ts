// api/gemini.ts - Tự động Fallback Model để không bao giờ bị sập 404

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, image, systemInstruction } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu prompt hoặc ảnh' });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trong Settings -> Environment Variables trên Vercel.',
    });
  }

  // Danh sách các model theo thứ tự ưu tiên
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
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
      text:
        prompt ||
        'Hãy đọc hình ảnh đề toán này, trích xuất chính xác đề bài và trình bày lời giải chi tiết, rõ ràng nhất bằng Tiếng Việt.',
    });

    const requestBody: any = {
      contents: [{ parts }],
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    let lastError = null;

    // Vòng lặp thử qua các Model nếu model trước bị lỗi 404
    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        const data = await response.json();

        if (response.ok) {
          const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResult) {
            return res.status(200).json({ text: textResult, modelUsed: model });
          }
        } else {
          lastError = data.error?.message || JSON.stringify(data);
          // Nếu không phải lỗi 404 (ví dụ 401 hết quyền) thì dừng luôn
          if (response.status !== 404) {
            return res.status(response.status).json({ error: `Lỗi Google API (${response.status}): ${lastError}` });
          }
        }
      } catch (e: any) {
        lastError = e?.message;
      }
    }

    return res.status(500).json({ error: `Không thể kết nối tới các Model Gemini. Lỗi cuối: ${lastError}` });

  } catch (err: any) {
    return res.status(500).json({
      error: `Lỗi Serverless Function: ${err?.message || JSON.stringify(err)}`,
    });
  }
}
