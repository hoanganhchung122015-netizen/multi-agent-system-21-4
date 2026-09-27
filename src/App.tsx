import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { runFullMAS } from './services/geminiService';

export default function App() {
  const [screen, setScreen] = useState<'LOGIN' | 'DASHBOARD' | 'INPUT' | 'RESULT'>('LOGIN');
  const [student, setStudent] = useState({
    name: 'HOÀNG KHÁNH LINH',
    className: '12A',
    school: 'THPT MAI SƠN - SƠN LA'
  });
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.name.trim()) return alert('Vui lòng nhập tên học sinh');
    setScreen('DASHBOARD');
  };

  const handleSelectSubject = (subj: string) => {
    setSelectedSubject(subj);
    setInputText('');
    setResultText('');
    setScreen('INPUT');
  };

  const handleExecute = async () => {
    if (!inputText.trim()) {
      alert('Vui lòng nhập nội dung bài tập!');
      return;
    }

    setIsProcessing(true);
    setScreen('RESULT');

    try {
      const res = await runFullMAS(selectedSubject, inputText);
      setResultText(res?.giaiNhanh || 'Không nhận được dữ liệu phản hồi.');
    } catch (err: any) {
      setResultText(`❌ Đã xảy ra lỗi: ${err?.message || 'Không thể kết nối đến hệ thống.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-[#1E293B] flex flex-col items-center justify-between p-4 font-sans">
      
      {/* Header */}
      <header className="text-center my-4">
        <p className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wide mb-1">
          NGÀY HỘI ĐỔI MỚI SÁNG TẠO VÀ CHUYỂN ĐỔI SỐ TỈNH SƠN LA NĂM 2026
        </p>
        <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight">SYMBIOTIC AI</h1>
        <p className="text-xs font-bold text-[#64748B] tracking-widest uppercase">MULTI AGENT SYSTEMS</p>
      </header>

      {/* MÀN HÌNH 1: ĐĂNG NHẬP */}
      {screen === 'LOGIN' && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-blue-50 my-auto">
          <h2 className="text-xl font-extrabold text-center text-[#0F172A] mb-1">ĐĂNG NHẬP HỌC SINH</h2>
          <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Họ và tên học sinh:</label>
              <input
                type="text"
                value={student.name}
                onChange={(e) => setStudent({ ...student, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-bold text-[#0F172A]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lớp:</label>
              <input
                type="text"
                value={student.className}
                onChange={(e) => setStudent({ ...student, className: e.target.value })}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-bold text-[#0F172A]"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 mt-2 bg-[#4F46E5] hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all uppercase"
            >
              XÁC NHẬN ĐĂNG NHẬP
            </button>
          </form>
        </div>
      )}

      {/* MÀN HÌNH 2: DASHBOARD */}
      {screen === 'DASHBOARD' && (
        <div className="w-full max-w-md my-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {['Toán học', 'Vật lí', 'Hóa học', 'Sinh học'].map((subj) => (
              <button
                key={subj}
                onClick={() => handleSelectSubject(subj)}
                className="bg-[#4F46E5] hover:bg-indigo-700 text-white aspect-square rounded-3xl p-4 flex flex-col items-center justify-center space-y-2 shadow-lg transition-all"
              >
                <span className="font-extrabold text-base uppercase">{subj}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MÀN HÌNH 3: NHẬP LIỆU */}
      {screen === 'INPUT' && (
        <div className="w-full max-w-md my-auto space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-md space-y-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Nhập đề bài môn ${selectedSubject} vào đây...`}
              className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:outline-none"
            />
            <button
              onClick={handleExecute}
              className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md uppercase"
            >
              🚀 THỰC HIỆN GIẢI BÀI TẬP
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH 4: KẾT QUẢ */}
      {screen === 'RESULT' && (
        <div className="w-full max-w-md my-auto space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 min-h-[250px]">
            {isProcessing ? (
              <div className="text-center py-10 font-bold text-blue-600 animate-pulse">
                ⏳ Đang xử lý và kết nối tác tử AI...
              </div>
            ) : (
              <div className="text-sm leading-relaxed overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {resultText || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
          <button
            onClick={() => setScreen('INPUT')}
            className="w-full py-3 bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl uppercase"
          >
            ← Giải bài tập khác
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center my-4">
        <p className="text-[11px] font-extrabold text-[#334155]">SYMBIOTIC AI — GIẢI PHÁP CHUYỂN ĐỔI SỐ GIÁO DỤC</p>
      </footer>

    </div>
  );
}
