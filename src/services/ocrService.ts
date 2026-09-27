import { createWorker } from 'tesseract.js';

/**
 * Trích xuất văn bản từ hình ảnh Base64 ngay trên Trình duyệt (Client-side)
 * Tiết kiệm Token hình ảnh gửi lên Gemini API.
 */
export const extractTextFromImageClient = async (base64Image: string): Promise<string> => {
  try {
    const worker = await createWorker('vie+eng');
    const ret = await worker.recognize(base64Image);
    await worker.terminate();
    
    const extractedText = ret.data.text.trim();
    return extractedText.length > 10 ? extractedText : "";
  } catch (error) {
    console.warn("Lỗi OCR client, tự động chuyển sang luồng dự phòng nhận diện trực tiếp bằng AI Vision:", error);
    return "";
  }
};
