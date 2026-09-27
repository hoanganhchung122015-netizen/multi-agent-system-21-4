import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { Subject, ScreenState, StudentInfo, AgentResult, DiaryEntry } from './types';
import { extractTextFromImageClient } from './services/ocrService';
import { runFullMAS } from './services/geminiService';

export default function App() {
  // States
  const [screen, setScreen] = useState<ScreenState>('LOGIN');
  const [student, setStudent] = useState<StudentInfo>({
    name: 'CHUNG ANH',
    className: '12A',
    school: 'THPT MAI SƠN - Sơn La'
  });
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Toán học');
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  
  // Tab Agent được chọn ở màn hình kết quả
  const [activeTab, setActiveTab] = useState<'orchestrator' | 'giaiNhanh' | 'giaSu' | 'luyenSkill'>('giaiNhanh');
  const [agentResults, setAgentResults] = useState<AgentResult | null>(null);
  const [diaryList, setDiaryList] = useState<DiaryEntry[]>([]);

  // Ref cho file input & recording
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // 1. Đăng nhập (Hình 2)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.name.trim()) return alert('Vui lòng nhập tên học sinh');
    setScreen('DASHBOARD');
  };

  // 2. Chọn Môn học từ Dashboard (Hình 3)
  const handleSelectSubject = (subj: Subject) => {
    setSelectedSubject(subj);
    if (subj === 'Nhật ký') {
      setScreen('RESULT');
    } else {
      setInputText('');
      setSelectedImage(null);
      setImagePreviewUrl(null);
      setAgentResults(null);
      setScreen('INPUT');
    }
  };

  // 3. Chọn file ảnh từ thư viện hoặc Camera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  // 4. Ghi âm giọng nói (Web Speech API)
  const handleToggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói!');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  // 5. Thực hiện phối hợp MAS (Hình 4 -> Hình 5)
  const handleExecuteMAS = async () => {
    if (!inputText && !selectedImage) {
      alert('Vui lòng chụp ảnh, chọn ảnh hoặc nhập nội dung bài tập!');
      return;
    }

    setIsProcessing(true);
    setScreen('RESULT');
    setLoadingText('ĐANG TẢI DỮ LIỆU TỪ CHUYÊN GIA GIẢI NHANH 1S...');

    try {
      let finalPrompt = inputText;

      // Bước 1: Nếu có ảnh thì chạy OCR trước
      if (selectedImage) {
        setLoadingText('ĐANG XỬ LÝ ẢNH & BẢN QUYỀN VĂN BẢN (OCR)...');
        const ocrText = await extractTextFromImageClient(selectedImage);
        finalPrompt = ocrText + (inputText ? `\nGhi chú: ${inputText}` : '');
      }

      // Bước 2: Chạy Multi-Agent Systems
      setLoadingText('ĐANG PHỐI HỢP ĐỒNG THỜI 4 TÁC TỬ AI (MAS)...');
      const results = await runFullMAS(selectedSubject, finalPrompt);
      setAgentResults(results);

      // Lưu vào Nhật ký
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('vi-VN'),
        student,
        subject: selectedSubject,
        question: finalPrompt,
        results
      };
      setDiaryList((prev) => [newEntry, ...prev]);

    } catch (err: any) {
      alert(err.message || 'Đã xảy ra lỗi khi chạy tác tử.');
      setScreen('INPUT');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-[#1E293B] flex flex-col items-center justify-between p-4 font-sans">
      
      {/* Header dùng chung */}
      <header className="text-center my-4">
        <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight">SYMBIOTIC AI</h1>
        <p className="text-xs font-bold text-[#64748B] tracking-widest uppercase">MULTI AGENT SYSTEMS</p>
        <p className="text-sm italic text-[#4F46E5] font-medium mt-1">Gia sư ảo thông minh của mọi thế hệ học sinh</p>
      </header>

      {/* MÀN HÌNH 1: ĐĂNG NHẬP HỌC SINH (HÌNH 2) */}
      {screen === 'LOGIN' && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-blue-50 my-auto">
          <h2 className="text-xl font-extrabold text-center text-[#0F172A] mb-1">ĐĂNG NHẬP HỌC SINH</h2>
          <p className="text-xs text-center text-[#64748B] mb-6">Nhập thông tin để bắt đầu học tập cùng AI</p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Họ và tên học sinh:</label>
              <input
                type="text"
                value={student.name}
                onChange={(e) => setStudent({ ...student, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập họ và tên"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lớp:</label>
              <input
                type="text"
                value={student.className}
                onChange={(e) => setStudent({ ...student, className: e.target.value })}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: 12A"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Trường:</label>
              <input
                type="text"
                value={student.school}
                onChange={(e) => setStudent({ ...student, school: e.target.value })}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-2 bg-[#4F46E5] hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-200 transition-all uppercase tracking-wider"
            >
              XÁC NHẬN ĐĂNG NHẬP
            </button>
          </form>
        </div>
      )}

      {/* MÀN HÌNH 2: DASHBOARD LỰA CHỌN MÔN (HÌNH 3) */}
      {screen === 'DASHBOARD' && (
        <div className="w-full max-w-md my-auto space-y-4">
          {/* Thanh thông tin tài khoản */}
          <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-[#0F172A]">
              {student.name.toUpperCase()} ({student.className}) <span className="text-slate-300 mx-1">|</span> <span className="text-slate-500 font-normal">{student.school}</span>
            </span>
            <button
              onClick={() => setScreen('LOGIN')}
              className="text-[#4F46E5] font-bold hover:underline uppercase text-[10px]"
            >
              ĐỔI TÀI KHOẢN
            </button>
          </div>

          {/* Grid 4 môn học */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectSubject('Toán học')}
              className="bg-[#4F46E5] hover:bg-indigo-700 text-white aspect-square rounded-3xl p-4 flex flex-col items-center justify-center space-y-3 shadow-lg shadow-indigo-100 transition-all"
            >
              <span className="font-extrabold tracking-wider text-base uppercase">TOÁN HỌC</span>
              <span className="text-4xl">📐</span>
            </button>

            <button
              onClick={() => handleSelectSubject('Vật lí')}
              className="bg-[#8B5CF6] hover:bg-purple-700 text-white aspect-square rounded-3xl p-4 flex flex-col items-center justify-center space-y-3 shadow-lg shadow-purple-100 transition-all"
            >
              <span className="font-extrabold tracking-wider text-base uppercase">VẬT LÍ</span>
              <span className="text-4xl">⚛️</span>
            </button>

            <button
              onClick={() => handleSelectSubject('Hóa học')}
              className="bg-[#059669] hover:bg-emerald-700 text-white aspect-square rounded-3xl p-4 flex flex-col items-center justify-center space-y-3 shadow-lg shadow-emerald-100 transition-all"
            >
              <span className="font-extrabold tracking-wider text-base uppercase">HÓA HỌC</span>
              <span className="text-4xl">🧪</span>
            </button>

            <button
              onClick={() => handleSelectSubject('Nhật ký')}
              className="bg-[#D97706] hover:bg-amber-700 text-white aspect-square rounded-3xl p-4 flex flex-col items-center justify-center space-y-3 shadow-lg shadow-amber-100 transition-all"
            >
              <span className="font-extrabold tracking-wider text-base uppercase">NHẬT KÝ</span>
              <span className="text-4xl">📖</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH 3: NHẬP LIỆU BÀI TẬP (HÌNH 4) */}
      {screen === 'INPUT' && (
        <div className="w-full max-w-md my-auto space-y-4">
          {/* Tag môn học */}
          <div className="flex justify-center">
            <span className="px-6 py-1.5 bg-blue-100 text-[#3B82F6] font-extrabold text-xs rounded-full uppercase tracking-wider">
              {selectedSubject}
            </span>
          </div>

          {/* User info bar */}
          <div className="bg-white rounded-2xl px-4 py-2 shadow-sm border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-[#0F172A]">
              {student.name.toUpperCase()} ({student.className}) <span className="text-slate-300 mx-1">|</span> <span className="text-slate-500 font-normal">{student.school}</span>
            </span>
            <button onClick={() => setScreen('LOGIN')} className="text-[#4F46E5] font-bold text-[10px]">ĐỔI TÀI KHOẢN</button>
          </div>

          {/* Khung preview/nhập bài tập */}
          <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-3xl p-6 min-h-[260px] flex flex-col items-center justify-center text-center relative overflow-hidden">
            {imagePreviewUrl ? (
              <div className="w-full h-full flex flex-col items-center">
                <img src={imagePreviewUrl} alt="Preview" className="max-h-48 rounded-xl object-contain shadow-sm mb-2" />
                <button
                  onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }}
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  Xóa ảnh này
                </button>
              </div>
            ) : (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Vui lòng chụp ảnh hoặc ghi âm đề bài..."
                className="w-full h-44 bg-transparent resize-none border-none text-center text-slate-600 font-semibold text-sm focus:outline-none placeholder-slate-400"
              />
            )}
          </div>

          {/* Inputs ẩn */}
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

          {/* 4 Nút hành động tròn */}
          <div className="grid grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center text-xl shadow-md transition-all">
                📷
              </div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">CAMERA</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center text-xl shadow-md transition-all">
                🖼️
              </div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">THƯ VIỆN</span>
            </button>

            <button
              onClick={handleToggleRecording}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className={`w-14 h-14 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#2563EB]'} hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center text-xl shadow-md transition-all`}>
                🎙️
              </div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">{isRecording ? 'ĐANG GHI' : 'GHI ÂM'}</span>
            </button>

            <button
              onClick={handleExecuteMAS}
              className="flex flex-col items-center space-y-1 group"
            >
              <div className="w-14 h-14 bg-[#93C5FD] hover:bg-blue-300 text-white rounded-2xl flex items-center justify-center text-xl shadow-md transition-all">
                🚀
              </div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">THỰC HIỆN</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH 4: KẾT QUẢ PHỐI HỢP AGENTS (HÌNH 5 & NHẬT KÝ) */}
      {screen === 'RESULT' && (
        <div className="w-full max-w-md my-auto space-y-4">
          
          {selectedSubject !== 'Nhật ký' && (
            <>
              {/* Tag môn học */}
              <div className="flex justify-center">
                <span className="px-6 py-1.5 bg-blue-100 text-[#3B82F6] font-extrabold text-xs rounded-full uppercase">
                  {selectedSubject}
                </span>
              </div>

              {/* User info bar */}
              <div className="bg-white rounded-2xl px-4 py-2 shadow-sm border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A]">
                  {student.name.toUpperCase()} ({student.className}) <span className="text-slate-300 mx-1">|</span> <span className="text-slate-500 font-normal">{student.school}</span>
                </span>
                <button onClick={() => setScreen('DASHBOARD')} className="text-[#4F46E5] font-bold text-[10px]">ĐỔI MÔN</button>
              </div>

              {/* Đang xử lý Loading (Hình 5) */}
              {isProcessing && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl flex flex-col items-center justify-center space-y-6 min-h-[300px]">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-extrabold text-[#2563EB] text-center tracking-wider uppercase">{loadingText}</p>
                </div>
              )}

              {/* Hiển thị kết quả 4 Agent dạng Tab ngang (Hình 5) */}
              {!isProcessing && agentResults && (
                <div className="space-y-3">
                  {/* Thanh điều hướng 4 Agent */}
                  <div className="bg-[#2563EB] p-1.5 rounded-2xl grid grid-cols-4 gap-1 shadow-md">
                    <button
                      onClick={() => setActiveTab('orchestrator')}
                      className={`py-2 px-1 rounded-xl text-[9px] font-extrabold transition-all ${activeTab === 'orchestrator' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-white hover:bg-blue-600'}`}
                    >
                      ĐIỀU PHỐI MAS
                    </button>
                    <button
                      onClick={() => setActiveTab('giaiNhanh')}
                      className={`py-2 px-1 rounded-xl text-[9px] font-extrabold transition-all ${activeTab === 'giaiNhanh' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-white hover:bg-blue-600'}`}
                    >
                      ⚡ GIẢI NHANH 1S
                    </button>
                    <button
                      onClick={() => setActiveTab('giaSu')}
                      className={`py-2 px-1 rounded-xl text-[9px] font-extrabold transition-all ${activeTab === 'giaSu' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-white hover:bg-blue-600'}`}
                    >
                      🎓 GIA SƯ AI
                    </button>
                    <button
                      onClick={() => setActiveTab('luyenSkill')}
                      className={`py-2 px-1 rounded-xl text-[9px] font-extrabold transition-all ${activeTab === 'luyenSkill' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-white hover:bg-blue-600'}`}
                    >
                      🎯 LUYỆN SKILL
                    </button>
                  </div>

                  {/* Nội dung kết quả Agent tương ứng */}
                  <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 min-h-[300px] text-sm text-slate-800 leading-relaxed overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {agentResults[activeTab]}
                    </ReactMarkdown>
                  </div>

                  <button
                    onClick={() => setScreen('INPUT')}
                    className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-2xl transition-all uppercase"
                  >
                    ← Giải bài tập khác
                  </button>
                </div>
              )}
            </>
          )}

          {/* Màn hình Nhật ký học tập */}
          {selectedSubject === 'Nhật ký' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-800 uppercase">📖 Nhật ký học tập ({diaryList.length})</h3>
                <button onClick={() => setScreen('DASHBOARD')} className="text-xs font-bold text-[#4F46E5]">Trở về</button>
              </div>

              {diaryList.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs">
                  Chưa có lịch sử giải bài tập nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {diaryList.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md uppercase">{entry.subject}</span>
                        <span>{entry.timestamp}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2">{entry.question}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Footer Chuyển đổi số */}
      <footer className="text-center my-4 space-y-0.5">
        <p className="text-[11px] font-extrabold text-[#334155] tracking-wide">SYMBIOTIC AI — GIẢI PHÁP CHUYỂN ĐỔI SỐ GIÁO DỤC</p>
        <p className="text-[10px] font-bold text-[#4F46E5] tracking-wider uppercase">TRƯỜNG THPT MAI SƠN</p>
      </footer>

    </div>
  );
}
