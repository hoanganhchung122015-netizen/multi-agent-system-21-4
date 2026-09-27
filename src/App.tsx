import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { 
  Subject, 
  AgentType, 
  InputMode, 
  Professor1Result, 
  Professor3QuizResult, 
  DiaryEntry 
} from '../types';
import { extractTextFromImageClient } from './services/ocrService';
import { 
  runOrchestrator, 
  runGiaiNhanh1S, 
  runGiaSuAI, 
  runLuyenSkill 
} from './services/geminiService';

export default function App() {
  const [selectedSubject, setSelectedSubject] = useState<Subject>(Subject.MATH);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(AgentType.GIAI_NHANH_1S);
  const [inputMode, setInputMode] = useState<InputMode>('GALLERY');
  
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  
  // Dữ liệu kết quả thực tế từ Multi-Agent
  const [orchestratorResult, setOrchestratorResult] = useState<string>('');
  const [giaiNhanhResult, setGiaiNhanhResult] = useState<Professor1Result | null>(null);
  const [giaSuResult, setGiaSuResult] = useState<string>('');
  const [luyenSkillResult, setLuyenSkillResult] = useState<Professor3QuizResult | null>(null);

  // Nhật ký lưu trữ tại LocalStorage
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => {
    const saved = localStorage.getItem('sm_as_diary');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sm_as_diary', JSON.stringify(diaryEntries));
  }, [diaryEntries]);

  // Xử lý chọn ảnh từ máy/camera
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset sạch sẽ kết quả trước khi chạy đề mới
  const resetResults = () => {
    setOrchestratorResult('');
    setGiaiNhanhResult(null);
    setGiaSuResult('');
    setLuyenSkillResult(null);
  };

  // LUỒNG ĐIỀU PHỐI CHÍNH (SM-AS WORKFLOW)
  const handleExecute = async () => {
    if (!inputText && !selectedImage) {
      alert('Vui lòng nhập văn bản đề bài hoặc chọn hình ảnh!');
      return;
    }

    setLoading(true);
    resetResults();

    try {
      let finalPromptForAgent1 = inputText;

      // Bước 1: Tiền xử lý OCR nếu có ảnh
      if (selectedImage) {
        setLoadingStatus('Tác tử 1: Đang chạy OCR bóc tách chữ từ ảnh...');
        const ocrText = await extractTextFromImageClient(selectedImage);
        if (ocrText) {
          finalPromptForAgent1 = `[Đề bài trích xuất từ ảnh]: ${ocrText}\n${inputText}`;
        }
      }

      // Bước 2: Tác tử 1 (ORCHESTRATOR) chuẩn hóa đề & lập Mindmap
      setLoadingStatus('Tác tử 1 (Điều phối MAS): Đang chuẩn hóa đề bài & công thức LaTeX...');
      const cleanedPrompt = await runOrchestrator(
        selectedSubject, 
        finalPromptForAgent1, 
        selectedImage || undefined
      );
      setOrchestratorResult(cleanedPrompt);

      // Bước 3: Chạy song song các Tác tử Chuyên môn dựa trên đề bài đã bóc tách chuẩn
      setLoadingStatus('Các Tác tử chuyên môn đang giải song song...');
      
      const [resGiaiNhanh, resGiaSu, resLuyenSkill] = await Promise.all([
        runGiaiNhanh1S(selectedSubject, cleanedPrompt),
        runGiaSuAI(selectedSubject, cleanedPrompt),
        runLuyenSkill(selectedSubject, cleanedPrompt)
      ]);

      setGiaiNhanhResult(resGiaiNhanh);
      setGiaSuResult(resGiaSu);
      setLuyenSkillResult(resLuyenSkill);

      // Bước 4: Tự động lưu vào Nhật ký học tập
      const newEntry: DiaryEntry = {
        date: new Date().toLocaleString('vi-VN'),
        subject: selectedSubject,
        agentType: selectedAgent,
        input: inputText || 'Bài tập dạng hình ảnh',
        image: selectedImage || undefined,
        resultContent: resGiaSu || resGiaiNhanh.finalAnswer,
        professor3Quizzes: resLuyenSkill
      };

      setDiaryEntries((prev) => [newEntry, ...prev]);

    } catch (error: any) {
      console.error('Lỗi luồng MAS:', error);
      alert(`Đã xảy ra lỗi: ${error.message || 'Không thể kết nối với AI'}`);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight">
          SYMBIOTIC MULTI-AGENT SYSTEM (SM-AS)
        </h1>
        <p className="text-slate-600 mt-2">
          Hệ thống Tác tử AI Cộng sinh Hỗ trợ Học tập Môn Toán, Lý, Hóa
        </p>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CỘT BÊN TRÁI: ĐIỀU KHIỂN & ĐẦU VÀO */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          {/* Chọn Môn */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">1. Chọn Môn học</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(Subject).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    selectedSubject === sub
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn Tác tử Chế độ xem ưu tiên */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">2. Chế độ Tác tử xem trước</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(AgentType).map((agent) => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>

          {/* Đầu vào Ảnh/Text */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">3. Nhập Đề bài / Tải Ảnh</label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu hỏi hoặc công thức đề bài..."
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-3"
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            {selectedImage && (
              <div className="mt-3 relative">
                <img src={selectedImage} alt="Đề bài" className="w-full h-40 object-cover rounded-lg border" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                >
                  ✕ Xóa ảnh
                </button>
              </div>
            )}
          </div>

          {/* Nút Thực Hiện */}
          <button
            onClick={handleExecute}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-md transition-all text-center"
          >
            {loading ? 'Đang phân tích...' : 'Thực hiện (Phối hợp MAS)'}
          </button>

          {loadingStatus && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs animate-pulse">
              {loadingStatus}
            </div>
          )}
        </section>

        {/* CỘT BÊN PHẢI: HIỂN THỊ KẾT QUẢ KHI CÁC TÁC TỬ PHẢN HỒI */}
        <section className="md:col-span-2 space-y-6">
          {/* TAB NHẬT KÝ HỌC TẬP */}
          {selectedSubject === Subject.DIARY ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Nhật ký Học tập (DIARY)</h2>
              {diaryEntries.length === 0 ? (
                <p className="text-slate-500 text-sm">Chưa có nhật ký bài tập nào được lưu.</p>
              ) : (
                diaryEntries.map((entry, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                    <div className="flex justify-between font-semibold text-blue-600">
                      <span>[{entry.subject}] - {entry.agentType}</span>
                      <span className="text-xs text-slate-400">{entry.date}</span>
                    </div>
                    <p className="font-medium text-slate-700">Đầu vào: {entry.input}</p>
                    <div className="p-3 bg-white rounded border prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {entry.resultContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {/* TÁC TỬ 1: ĐIỀU PHỐI & CÔNG THỨC CHUẨN */}
              {orchestratorResult && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200">
                  <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Tác tử 1 (Điều phối MAS) - Bóc tách đề bài chuẩn LaTeX:
                  </h3>
                  <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50 p-3 rounded-lg border">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {orchestratorResult}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* TÁC TỬ 2: GIẢI NHANH 1S */}
              {giaiNhanhResult && (
                <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-200">
                  <h3 className="text-sm font-bold text-emerald-800 mb-2">
                    Tác tử 2 (Giải nhanh 1S) - Kết quả ngắn gọn:
                  </h3>
                  <div className="text-lg font-extrabold text-emerald-900">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {giaiNhanhResult.finalAnswer}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* TÁC TỬ 3: GIA SƯ AI SOCRATIC */}
              {giaSuResult && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-indigo-700 mb-2">
                    Tác tử 3 (Gia sư AI) - Lời giải chi tiết Socratic:
                  </h3>
                  <div className="prose prose-slate max-w-none text-sm bg-slate-50 p-4 rounded-xl border">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {giaSuResult}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* TÁC TỬ 4: LUYỆN SKILL (BÀI TẬP TƯƠNG TỰ) */}
              {luyenSkillResult && luyenSkillResult.quizzes.length > 0 && (
                <div className="bg-amber-50 p-5 rounded-2xl shadow-sm border border-amber-200 space-y-4">
                  <h3 className="text-sm font-bold text-amber-800">
                    Tác tử 4 (Luyện Skill) - 2 Bài tập tương tự rèn luyện:
                  </h3>
                  {luyenSkillResult.quizzes.map((quiz, qIdx) => (
                    <div key={qIdx} className="bg-white p-4 rounded-xl border border-amber-100 text-sm space-y-2">
                      <p className="font-bold text-slate-800">Câu {qIdx + 1}: {quiz.question}</p>
                      <div className="grid grid-cols-2 gap-2 my-2">
                        {quiz.options.map((opt, oIdx) => (
                          <div key={oIdx} className="p-2 bg-slate-50 rounded border text-xs">
                            {opt}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-emerald-700">Đáp án: {quiz.answer}</p>
                      <details className="text-xs text-slate-600 cursor-pointer mt-1">
                        <summary className="font-semibold text-blue-600">Xem lời giải ngắn</summary>
                        <div className="p-2 bg-slate-50 rounded mt-1 border">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {quiz.solution}
                          </ReactMarkdown>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
