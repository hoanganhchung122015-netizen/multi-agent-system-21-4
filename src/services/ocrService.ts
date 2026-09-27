import { createWorker } from 'tesseract.js';

export async function extractTextFromImageClient(file: File): Promise<string> {
  const worker = await createWorker('vie+eng');
  try {
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    return text.trim();
  } catch (error) {
    await worker.terminate();
    console.error("OCR Error:", error);
    throw new Error("Không thể đọc được chữ từ ảnh này. Vui lòng thử lại với ảnh rõ hơn.");
  }
}
