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

export async function runFullMAS(subject: Subject, rawText: string): Promise<AgentResult> {
  const sysPrompt = `Bạn là Tác tử Chuyên gia Giải nhanh 1S môn ${subject} cấp THPT.
Nhiệm vụ của bạn:
1. Đọc bài toán (chuẩn hóa lỗi OCR nếu có).
2. Trích xuất chính xác các công thức Toán/Lý/Hóa dưới dạng mã LaTeX nằm trong cặp dấu $...$ hoặc $$...$$.
3. Đưa ra ĐÁP ÁN CUỐI CÙNG ngay lập tức kèm phương pháp giải trắc nghiệm siêu tốc (mẹo bấm máy tính Casio, loại trừ đáp án, tư duy nhanh).
4. Trình bày ngắn gọn, sắc bén, dễ nhìn.`;

  // Chỉ thực hiện 1 lượt gọi API duy nhất
  const giaiNhanhText = await callBackendGemini(`Đề bài: ${rawText}`, sysPrompt);

  return {
    orchestrator: `**[HỆ THỐNG ĐIỀU PHỐI]**\n- Đã tiếp nhận bài tập môn **${subject}**.\n- Đã phân tích dữ liệu và chuyển giao nhiệm vụ cho **Tác tử Chuyên gia Giải nhanh 1S**.`,
    giaiNhanh: giaiNhanhText,
    giaSu: "Chức năng Gia sư AI đang trong tiến trình nâng cấp bảo trì tính năng tương tác chuyên sâu.",
    luyenSkill: "Chức năng Luyện Skill đang trong tiến trình cập nhật ngân hàng đề thi mới."
  };
}
