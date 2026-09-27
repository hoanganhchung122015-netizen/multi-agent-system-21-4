import { Subject, AgentResult } from '../types';

async function callBackendGemini(prompt: string, systemInstruction: string): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi kết nối tới Serverless API');
  }
  return data.text;
}

// 1. Tác tử Điều phối (Orchestrator)
export async function runOrchestrator(subject: Subject, rawText: string): Promise<string> {
  const sysPrompt = `Bạn là Tác tử Điều phối MAS (Orchestrator) chuyên môn ${subject} cấp THPT.
Nhiệm vụ: Chuẩn hóa đề bài gốc, sửa lỗi chính tả OCR, trích xuất chính xác các công thức Toán/Lý/Hóa dưới dạng mã LaTeX nằm trong cặp dấu $...$ hoặc $$...$$. Định dạng rõ ràng bài toán chuẩn.`;
  return callBackendGemini(`Đề bài gốc: ${rawText}`, sysPrompt);
}

// 2. Tác tử Giải nhanh 1S
export async function runGiaiNhanh1S(subject: Subject, formattedText: string): Promise<string> {
  const sysPrompt = `Bạn là Chuyên gia Giải nhanh 1S môn ${subject}.
Nhiệm vụ: Đưa ra ĐÁP ÁN CUỐI CÙNG ngay lập tức, phương pháp giải trắc nghiệm siêu tốc (mẹo bấm máy tính Casio, loại trừ đáp án, tư duy nhanh). Trình bày ngắn gọn, sắc bén, chuẩn công thức LaTeX.`;
  return callBackendGemini(`Đề bài đã chuẩn hóa: ${formattedText}`, sysPrompt);
}

// 3. Tác tử Gia sư AI
export async function runGiaSuAI(subject: Subject, formattedText: string): Promise<string> {
  const sysPrompt = `Bạn là Gia sư AI tận tâm môn ${subject}.
Nhiệm vụ:
1. Phân tích bản chất kiến thức trọng tâm.
2. Trình bày chi tiết lời giải tự luận từng bước một (Step-by-step).
3. Nhắc nhở các sai lầm học sinh thường gặp khi làm dạng bài này. Chuẩn LaTeX.`;
  return callBackendGemini(`Đề bài đã chuẩn hóa: ${formattedText}`, sysPrompt);
}

// 4. Tác tử Luyện Skill
export async function runLuyenSkill(subject: Subject, formattedText: string): Promise<string> {
  const sysPrompt = `Bạn là Tác tử Luyện Skill môn ${subject}.
Nhiệm vụ: Tạo ra 2 bài tập tương tự (1 câu trắc nghiệm, 1 câu tự luận) có độ khó tương đương để học sinh rèn luyện skill, kèm đáp án ẩn bên dưới. Chuẩn LaTeX.`;
  return callBackendGemini(`Đề bài gốc: ${formattedText}`, sysPrompt);
}

// Chạy phối hợp cả 4 Tác tử đồng thời
export async function runFullMAS(subject: Subject, rawText: string): Promise<AgentResult> {
  // Bước 1: Điều phối chuẩn hóa đề trước
  const orchestratorRes = await runOrchestrator(subject, rawText);

  // Bước 2: Truyền đồng thời sang 3 tác tử còn lại
  const [giaiNhanh, giaSu, luyenSkill] = await Promise.all([
    runGiaiNhanh1S(subject, orchestratorRes),
    runGiaSuAI(subject, orchestratorRes),
    runLuyenSkill(subject, orchestratorRes)
  ]);

  return {
    orchestrator: orchestratorRes,
    giaiNhanh,
    giaSu,
    luyenSkill
  };
}
