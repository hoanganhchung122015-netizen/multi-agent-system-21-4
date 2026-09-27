import { Subject, AgentType, Professor1Result, Professor3QuizResult } from './src/types';

/**
 * Hàm gọi chung tới Vercel Serverless Function /api/gemini
 */
export async function callGeminiApi(
  subject: Subject,
  agentType: AgentType,
  prompt: string,
  image?: string
): Promise<string> {
  const response = await fetch('../api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, agentType, prompt, image }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi kết nối Server API: ${response.status}`);
  }

  const data = await response.json();
  return data.result || '';
}

/**
 * Tác tử 1 (ORCHESTRATOR): Bóc tách, làm sạch đề bài & lập Mindmap
 */
export async function runOrchestrator(
  subject: Subject,
  promptText: string,
  image?: string
): Promise<string> {
  return await callGeminiApi(subject, AgentType.ORCHESTRATOR, promptText, image);
}

/**
 * Tác tử 2 (GIAI_NHANH_1S): Trả đáp án kết quả ngắn gọn dạng JSON
 */
export async function runGiaiNhanh1S(
  subject: Subject,
  cleanedPrompt: string
): Promise<Professor1Result> {
  const rawText = await callGeminiApi(subject, AgentType.GIAI_NHANH_1S, cleanedPrompt);
  
  try {
    // Làm sạch chuỗi JSON nếu AI bọc trong markdown ```json ... ```
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return { finalAnswer: parsed.finalAnswer || rawText };
  } catch (e) {
    return { finalAnswer: rawText };
  }
}

/**
 * Tác tử 3 (GIA_SU_AI): Trả lời giải chi tiết theo phương pháp Socratic dạng Markdown
 */
export async function runGiaSuAI(
  subject: Subject,
  cleanedPrompt: string
): Promise<string> {
  return await callGeminiApi(subject, AgentType.GIA_SU_AI, cleanedPrompt);
}

/**
 * Tác tử 4 (LUYEN_SKILL): Trả về 2 bài tập tương tự kèm lời giải dạng JSON
 */
export async function runLuyenSkill(
  subject: Subject,
  cleanedPrompt: string
): Promise<Professor3QuizResult> {
  const rawText = await callGeminiApi(subject, AgentType.LUYEN_SKILL, cleanedPrompt);
  
  try {
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed.quizzes)) {
      return { quizzes: parsed.quizzes };
    }
    return { quizzes: [] };
  } catch (e) {
    console.error("Không thể bóc tách JSON danh sách bài tập Luyện Skill:", e);
    return { quizzes: [] };
  }
}
