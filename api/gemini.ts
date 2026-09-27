import { GoogleGenAI } from '@google/genai';

// Lấy danh sách API Keys dự phòng từ biến môi trường
const getApiKeys = (): string[] => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((key): key is string => Boolean(key && key.trim().length > 0));

  return keys.length > 0 ? keys : [''];
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { subject, agentType, prompt, image } = req.body || {};

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Thiếu dữ liệu đầu vào (prompt hoặc image)' });
  }

  const apiKeys = getApiKeys();
  let lastError: any = null;

  // Xoay vòng các API Key nếu gặp lỗi Quota/Busy
  for (const apiKey of apiKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-1.5-flash';

      // Xây dựng System Prompt chuẩn hóa cho từng Tác tử
      let systemInstruction = `Bạn là hệ thống AI giáo dục môn ${subject || 'Toán học'}. `;
      
      if (agentType === 'Điều phối MAS') {
        systemInstruction += `Nhiệm vụ: Trích xuất, làm sạch đề bài từ input (ảnh/văn bản). YÊU CẦU CỐ ĐỊNH: Bắt buộc định dạng toàn bộ công thức toán/lý/hóa bằng LaTeX ($...$ cho inline và $$...$$ cho block). Xuất ra đề bài chuẩn xác 100% kèm sơ đồ tư duy tóm tắt ngắn gọn.`;
      } else if (agentType === 'Giải nhanh 1S') {
        systemInstruction += `Nhiệm vụ: Trả về kết quả/đáp số ngắn gọn nhất. Bắt buộc trả về đúng định dạng JSON duy nhất dạng: {"finalAnswer": "Nội dung đáp số hoặc đáp án chọn ngắn gọn kèm LaTeX"}. Không thêm lời dẫn ngoài JSON.`;
      } else if (agentType === 'Gia sư AI') {
        systemInstruction += `Nhiệm vụ: Đóng vai Gia sư AI giảng dạy theo phương pháp Socratic. Hướng dẫn giải chi tiết từng bước, gợi mở tư duy, dùng công thức LaTeX ($...$) hiển thị rõ ràng, sắc nét.`;
      } else if (agentType === 'Luyện Skill') {
        systemInstruction += `Nhiệm vụ: Tạo 2 bài tập tương tự kèm lời giải ngắn gọn. Bắt buộc trả về đúng định dạng JSON dạng: {"quizzes": [{"question": "...", "options": ["A...", "B...", "C...", "D..."], "answer": "...", "solution": "..."}]}. Tất cả công thức phải dùng LaTeX.`;
      }

      const contents: any[] = [];
      
      // Thêm ảnh nếu có
      if (image && typeof image === 'string') {
        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const mimeType = image.includes('data:image/png') ? 'image/png' : 'image/jpeg';
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      // Thêm văn bản prompt
      if (prompt) {
        contents.push({ text: prompt });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      const textResult = response.text || '';
      return res.status(200).json({ result: textResult });

    } catch (err: any) {
      console.warn(`API Key gặp lỗi, đang thử Key tiếp theo:`, err?.message || err);
      lastError = err;
    }
  }

  return res.status(500).json({ 
    error: 'Tất cả API Keys đều thất bại hoặc hết hạn quota.', 
    details: lastError?.message || String(lastError) 
  });
}
