import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// --- ENUMS & TYPES ---
export enum Subject {
  MATH = 'TOÁN HỌC',
  PHYSICS = 'VẬT LÍ',
  CHEMISTRY = 'HÓA HỌC',
  BIOLOGY = 'SINH HỌC'
}

export enum AgentType {
  SPEED = 'GIẢI NHANH 1S',
  SOCRATIC = 'GIA SƯ AI',
  SKILL = 'LUYỆN SKILL'
}

interface UserProfile {
  fullName: string;
  className: string;
  school: string;
  province: string;
}

interface Professor1Result {
  finalAnswer: string;
  casioSteps: string;
}

interface QuizItem {
  question: string;
  options: string[];
  answer: string;
  solution: string;
}

interface Professor3QuizResult {
  quizzes: QuizItem[];
}

interface DiaryEntry {
  id: string;
  date: string;
  subject: Subject;
  agentType: AgentType;
  input: string;
  image?: string;
  resultContent: string;
  casioSteps?: string;
  userInfo?: UserProfile;
}

const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby5E5_L510S92C3V4J46V3D17V-u5g_H9c2M8Vp8B1x_1X8f4y_1x2y3z4/exec";

// --- CONTROLLER LAYER: Custom Hook (v16.5) ---
const useAgentSystem = (selectedSubject: Subject | null) => {
  const [allRawResults, setAllRawResults] = useState<Partial<Record<AgentType, string>>>({});
  const [professor1Result, setProfessor1Result] = useState<Professor1Result | null>(null);
  const [professor3QuizResult, setProfessor3QuizResult] = useState<Professor3QuizResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const resetResults = useCallback(() => {
    setAllRawResults({});
    setProfessor1Result(null);
    setProfessor3QuizResult(null);
    setLoading(false);
    setLoadingStatus('');
  }, []);

  const runAgents = useCallback(async (
    primaryAgent: AgentType,
    allAgents: AgentType[],
    voiceText: string,
    image: string | null
  ) => {
    if (!selectedSubject || (!image && !voiceText)) return;

    setLoading(true);
    setLoadingStatus(`Đang kết nối Hệ thống Tác tử AI (${selectedSubject})...`);

    const processAgent = async (agent: AgentType) => {
      try {
        let resText = "";
        
        if (agent === AgentType.SPEED) {
          const mockProf1: Professor1Result = {
            finalAnswer: `### Lời giải nhanh (${selectedSubject}):\nĐáp án đúng là **C. 5 cm**.\n\nBiểu thức li độ $x = 5\\cos(10\\pi t + \\pi/3)$ (cm) có biên độ $A = 5\\text{ cm}$.`,
            casioSteps: "Bấm [MODE] -> [1] (Tính toán chuẩn)\nNhập hàm li độ để tính giá trị cực đại hoặc bấm SHIFT 7."
          };
          resText = JSON.stringify(mockProf1);
          setProfessor1Result(mockProf1);
          setAllRawResults(prev => ({ ...prev, [agent]: mockProf1.finalAnswer }));
        } 
        else if (agent === AgentType.SOCRATIC) {
          resText = `### Phân tích tư duy Socratic (${selectedSubject}):\n1. **Nhận biết dạng bài**: Phương trình tổng quát $x = A\\cos(\\omega t + \\varphi)$.\n2. **Xác định các đại lượng**:\n   - Biên độ dao động: $A = 5\\text{ cm}$.\n   - Tần số góc: $\\omega = 10\\pi\\text{ rad/s}$.\n   - Pha ban đầu: $\\varphi = \\pi/3\\text{ rad}$.\n3. **Kết luận**: Chọn phương án có biên độ bằng 5 cm.`;
          setAllRawResults(prev => ({ ...prev, [agent]: resText }));
        } 
        else if (agent === AgentType.SKILL) {
          const mockProf3: Professor3QuizResult = {
            quizzes: [
              {
                question: "Một vật dao động điều hòa theo phương trình $x = 8\\cos(4\\pi t - \\pi/6)$ (cm). Biên độ dao động của vật là:",
                options: ["4 cm", "8 cm", "-8 cm", "16 cm"],
                answer: "B",
                solution: "So sánh với phương trình $x = A\\cos(\\omega t + \\varphi)$, ta thấy $A = 8\\text{ cm}$."
              },
              {
                question: "Một chất điểm dao động với phương trình $x = 6\\cos(2\\pi t)$ (cm). Pha ban đầu của dao động là:",
                options: ["0 rad", "2 rad", "6 rad", "\\pi rad"],
                answer: "A",
                solution: "Pha ban đầu $\\varphi = 0\\text{ rad}$."
              }
            ]
          };
          resText = JSON.stringify(mockProf3);
          setProfessor3QuizResult(mockProf3);
          setAllRawResults(prev => ({ ...prev, [agent]: "Bộ bài tập luyện skill tương tự đã sẵn sàng!" }));
        }

      } catch (error) {
        setAllRawResults(prev => ({ ...prev, [agent]: "Chuyên gia AI đang bận, vui lòng thử lại." }));
      }
    };

    await Promise.allSettled(allAgents.map(a => processAgent(a)));
    setLoading(false);

  }, [selectedSubject]);

  return {
    allRawResults,
    professor1Result,
    professor3QuizResult,
    loading,
    loadingStatus,
    resetResults,
    runAgents
  };
};

// --- HELPER COMPONENTS ---
const AgentLogo = React.memo(({ type, active }: { type: AgentType, active: boolean }) => {
  const cls = `w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'} transition-colors duration-300`;
  switch (type) {
    case AgentType.SPEED:
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14H11V21L20 10H13Z" /></svg>;
    case AgentType.SOCRATIC:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case AgentType.SKILL:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
    default: return null;
  }
});

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  // 1. User Registration State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile>({ fullName: '', className: '', school: '', province: '' });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // 2. Navigation & Data State (Chuẩn v16.5)
  const [screen, setScreen] = useState<'HOME' | 'INPUT' | 'ANALYSIS' | 'DIARY'>('HOME');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(AgentType.SPEED);
  
  const [image, setImage] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  
  // Interactive Quiz State
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, string>>({});
  const [shownSolutions, setShownSolutions] = useState<Record<number, boolean>>({});

  // Feedback State
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isCurrentResultSaved, setIsCurrentResultSaved] = useState(false);

  // Camera & Recording State
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const [isImageCaptured, setIsImageCaptured] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isRecording, setIsRecording] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agents = useMemo(() => Object.values(AgentType), []);

  const { 
    allRawResults, professor1Result, professor3QuizResult, loading, loadingStatus, 
    resetResults, runAgents 
  } = useAgentSystem(selectedSubject);

  // Load User & Diary from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('symbiotic_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedDiary = localStorage.getItem('symbiotic_diary');
    if (savedDiary) setDiaryEntries(JSON.parse(savedDiary));
  }, []);

  // Form Registration Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.className || !form.school || !form.province) {
      return alert("Vui lòng nhập đầy đủ thông tin!");
    }
    setIsSubmittingForm(true);
    try {
      localStorage.setItem('symbiotic_user', JSON.stringify(form));
      setUser(form);

      fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      }).catch(err => console.error("Sheet sync error:", err));

    } catch (err) {
      alert("Đã xảy ra lỗi, vui lòng thử lại!");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const resetAppState = useCallback(() => {
    resetResults();
    setImage(null);
    setVoiceText('');
    setCapturedImagePreview(null);
    setIsImageCaptured(false);
    setUserQuizAnswers({});
    setShownSolutions({});
    setSelectedAgent(AgentType.SPEED);
    setIsCurrentResultSaved(false);
  }, [resetResults]);

  // Điều hướng khi chọn Môn học
  const handleSubjectSelect = useCallback((sub: Subject) => {
    resetAppState();
    setSelectedSubject(sub);
    setScreen('INPUT');
  }, [resetAppState]);

  // Điều hướng mở Nhật ký
  const handleOpenDiary = useCallback(() => {
    setScreen('DIARY');
  }, []);

  // Điều hướng quay lại Menu chính (HOME) chuẩn v16.5
  const handleGoHome = useCallback(() => {
    resetAppState();
    setSelectedSubject(null);
    setScreen('HOME');
  }, [resetAppState]);

  // Camera Handler
  const startCamera = useCallback(async () => {
    setImage(null);
    setVoiceText('');
    setCapturedImagePreview(null);
    setIsImageCaptured(false);
    setIsCurrentResultSaved(false);
    setShowCamera(true); 
    setIsCounting(true); 
    setCountdown(3);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { 
      setShowCamera(false); 
      setIsCounting(false);
      alert("Không thể truy cập camera thiết bị.");
    }
  }, []);

  useEffect(() => {
    if (isCounting && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isCounting && countdown === 0) {
      if (videoRef.current && canvasRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        setCapturedImagePreview(canvasRef.current.toDataURL('image/jpeg', 0.8)); 
        setIsImageCaptured(true);
        (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
        setShowCamera(false); 
        setIsCounting(false);
      }
    }
  }, [isCounting, countdown]);

  // Voice Recording Handler
  const toggleRecording = useCallback(() => {
    setImage(null);
    setCapturedImagePreview(null);
    setIsImageCaptured(false);
    setIsCurrentResultSaved(false);

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return alert("Trình duyệt không hỗ trợ nhận diện giọng nói!");
      const r = new SR(); 
      r.lang = 'vi-VN';
      r.onstart = () => setIsRecording(true);
      r.onend = () => setIsRecording(false);
      r.onresult = (e: any) => {
        setVoiceText(e.results[0][0].transcript);
        setImage(null);
      };
      recognitionRef.current = r; 
      r.start();
    }
  }, [isRecording]);

  const handleRunAnalysis = useCallback(() => {
     if (!selectedSubject || (!image && !voiceText) || isImageCaptured) return alert("Vui lòng chụp ảnh, chọn ảnh hoặc nhập giọng nói!");
     setScreen('ANALYSIS');
     setIsCurrentResultSaved(false);
     runAgents(selectedAgent, agents, voiceText, image);
  }, [selectedSubject, image, voiceText, isImageCaptured, selectedAgent, agents, runAgents]);

  // Lưu bài học vào Nhật ký
  const handleSaveToDiary = useCallback(() => {
    if (!selectedSubject || isCurrentResultSaved) return;

    let resultContentToSave = allRawResults[selectedAgent] || "Không có dữ liệu";
    let casioStepsToSave: string | undefined = undefined;

    if (selectedAgent === AgentType.SPEED && professor1Result) {
      resultContentToSave = professor1Result.finalAnswer;
      casioStepsToSave = professor1Result.casioSteps;
    }

    const newEntry: DiaryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      subject: selectedSubject,
      agentType: selectedAgent,
      input: voiceText || "Đề bài dạng hình ảnh",
      image: image || undefined,
      resultContent: resultContentToSave,
      casioSteps: casioStepsToSave,
      userInfo: user || undefined
    };

    const updatedDiary = [newEntry, ...diaryEntries];
    setDiaryEntries(updatedDiary);
    localStorage.setItem('symbiotic_diary', JSON.stringify(updatedDiary));
    setShowSaveSuccess(true);
    setIsCurrentResultSaved(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  }, [selectedSubject, allRawResults, selectedAgent, isCurrentResultSaved, professor1Result, voiceText, image, user, diaryEntries]);

  const markdownConfig = useMemo(() => ({
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex]
  }), []);

  // RENDER FORM GHI DANH
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl border border-slate-200 animate-in fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black mb-3 shadow-lg">
              AI
            </div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ghi Danh Học Sinh</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">Hệ thống Tác tử AI Học tập Thông minh</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Họ và Tên</label>
              <input type="text" required placeholder="Ví dụ: Nguyễn Văn A" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Lớp</label>
              <input type="text" required placeholder="Ví dụ: 12A1" value={form.className} onChange={e => setForm({...form, className: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Trường THPT</label>
              <input type="text" required placeholder="Ví dụ: THPT Mai Sơn" value={form.school} onChange={e => setForm({...form, school: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tỉnh / Thành phố</label>
              <input type="text" required placeholder="Ví dụ: Sơn La" value={form.province} onChange={e => setForm({...form, province: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 bg-slate-50" />
            </div>
            <button type="submit" disabled={isSubmittingForm} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-2">
              {isSubmittingForm ? 'Đang đồng bộ...' : 'Bắt đầu Học tập'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-2xl relative">
        
        {/* HEADER CHUẨN v16.5: LUÔN CÓ NÚT VỀ MENU HOẶC NÚT NHẬT KÝ */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
          {screen !== 'HOME' ? (
            <button onClick={handleGoHome} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl active:scale-90 transition-transform">
              <span>← Menu chính</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">AI</div>
              <span className="font-black text-sm text-slate-800 tracking-tight">SYMBIOTIC MAS</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {screen === 'HOME' && (
              <button onClick={handleOpenDiary} className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-90 transition-transform">
                📓 Nhật ký
              </button>
            )}
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800">{user.fullName}</div>
              <div className="text-[10px] text-slate-400 font-medium">{user.className}</div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 overflow-y-auto">
          
          {/* SCREEN 1: HOME - ĐỦ 4 MÔN HỌC CHUẨN (TOÁN, LÝ, HÓA, SINH) */}
          {screen === 'HOME' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Hệ thống Tác tử AI</span>
                <h2 className="text-2xl font-black mt-1">Xin chào, {user.fullName}!</h2>
                <p className="text-xs text-blue-100 mt-1 opacity-90">Chọn môn học để gửi đề bài cho các Tác tử AI phân tích.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { name: Subject.MATH, color: 'bg-indigo-600', icon: '📐' },
                  { name: Subject.PHYSICS, color: 'bg-violet-600', icon: '⚛️' },
                  { name: Subject.CHEMISTRY, color: 'bg-emerald-600', icon: '🧪' },
                  { name: Subject.BIOLOGY, color: 'bg-teal-600', icon: '🧬' },
                ].map((sub) => (
                  <button key={sub.name} onClick={() => handleSubjectSelect(sub.name as Subject)} className={`${sub.color} aspect-square rounded-[2rem] flex flex-col items-center justify-center text-white shadow-lg active:scale-95 transition-all p-4`}>
                    <span className="text-4xl mb-2">{sub.icon}</span>
                    <span className="text-xs font-black uppercase tracking-tight">{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 2: INPUT */}
          {screen === 'INPUT' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Môn đang chọn:</span>
                <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{selectedSubject}</span>
              </div>

              <div className="w-full aspect-[16/10] bg-slate-50 rounded-[2rem] flex items-center justify-center overflow-hidden border-2 border-slate-200 relative shadow-inner">
                {showCamera ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : capturedImagePreview ? (
                  <img src={capturedImagePreview} className="p-2 h-full object-contain" alt="Ảnh đã chụp" />
                ) : image ? (
                  <img src={image} className="p-2 h-full object-contain" alt="Ảnh đề bài" />
                ) : (
                  <div className="p-8 text-center text-slate-500 font-medium text-xs leading-relaxed">
                    {voiceText ? (
                      <span className="text-blue-600 font-bold text-sm">"{voiceText}"</span>
                    ) : (
                      "Vui lòng chụp ảnh, tải ảnh lên hoặc bấm ghi âm đề bài..."
                    )}
                  </div>
                )}
                {isCounting && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-6xl font-black text-white drop-shadow-lg">
                    {countdown}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-between items-center px-2">
                {isImageCaptured ? (
                  <>
                    <button onClick={() => { setCapturedImagePreview(null); setIsImageCaptured(false); startCamera(); }} className="flex-1 mr-2 py-4 rounded-2xl bg-rose-500 text-white font-bold text-xs uppercase shadow-md active:scale-95 transition-all">
                      🔄 Chụp lại
                    </button>
                    <button onClick={() => { if (capturedImagePreview) { setImage(capturedImagePreview); setVoiceText(''); setCapturedImagePreview(null); setIsImageCaptured(false); } }} className="flex-1 ml-2 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs uppercase shadow-md active:scale-95 transition-all">
                      ✅ Lưu ảnh này
                    </button>
                  </>
                ) : (
                  <>
                    {[
                      { l: 'Chụp ảnh', i: '📸', a: startCamera }, 
                      { l: 'Thư viện', i: '🖼️', a: () => fileInputRef.current?.click() }, 
                      { l: isRecording ? 'Đang ghi' : 'Ghi âm', i: isRecording ? '⏹️' : '🎙️', a: toggleRecording }
                    ].map((it) => (
                      <button key={it.l} onClick={it.a} className="flex flex-col items-center gap-1 group">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 shadow-sm flex items-center justify-center text-xl group-active:scale-90 transition-transform">
                          {it.i}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{it.l}</span>
                      </button>
                    ))}
                    
                    <button onClick={handleRunAnalysis} disabled={(!image && !voiceText) || isImageCaptured} className="flex flex-col items-center gap-1 group disabled:opacity-30">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg flex items-center justify-center text-xl group-active:scale-90 transition-transform">
                        🚀
                      </div>
                      <span className="text-[10px] font-black text-blue-600 uppercase">Thực hiện</span>
                    </button>
                  </>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setImage(e.target?.result as string);
                    setVoiceText('');
                  };
                  reader.readAsDataURL(file);
                }
              }} className="hidden" accept="image/*" />
            </div>
          )}

          {/* SCREEN 3: ANALYSIS */}
          {screen === 'ANALYSIS' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* TAB SELECTION */}
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                {agents.map((ag) => (
                  <button key={ag} onClick={() => setSelectedAgent(ag)} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase transition-all ${selectedAgent === ag ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    <AgentLogo type={ag} active={selectedAgent === ag} />
                    <span>{ag}</span>
                  </button>
                ))}
              </div>

              {/* RESULT DISPLAY */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm min-h-[400px] relative">
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-white/90 rounded-3xl z-10">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{loadingStatus}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{selectedAgent}</span>
                      
                      <button onClick={handleSaveToDiary} disabled={isCurrentResultSaved} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-90 transition-transform disabled:opacity-50">
                        {isCurrentResultSaved ? '✓ Đã lưu Nhật ký' : '💾 Lưu Nhật ký'}
                      </button>
                    </div>

                    {showSaveSuccess && (
                      <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-xl text-center animate-in fade-in">
                        Đã lưu thành công vào Nhật ký học tập!
                      </div>
                    )}

                    {/* PROF 1: SPEED RESULT */}
                    {selectedAgent === AgentType.SPEED && (
                      <div className="space-y-4">
                        <div className="prose prose-slate max-w-none text-sm math-font">
                          <ReactMarkdown remarkPlugins={markdownConfig.remarkPlugins} rehypePlugins={markdownConfig.rehypePlugins}>
                            {professor1Result?.finalAnswer || "Đang tải lời giải..."}
                          </ReactMarkdown>
                        </div>

                        {professor1Result?.casioSteps && (
                          <div className="bg-emerald-50/70 p-4 rounded-2xl border-l-4 border-emerald-500">
                            <h4 className="text-xs font-black uppercase text-emerald-700 mb-1">Thao tác Casio 580VN X:</h4>
                            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{professor1Result.casioSteps}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PROF 2: SOCRATIC TUTOR */}
                    {selectedAgent === AgentType.SOCRATIC && (
                      <div className="prose prose-slate max-w-none text-sm math-font">
                        <ReactMarkdown remarkPlugins={markdownConfig.remarkPlugins} rehypePlugins={markdownConfig.rehypePlugins}>
                          {allRawResults[AgentType.SOCRATIC] || "Đang soạn phân tích..."}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* PROF 3: SKILL QUIZ INTERACTIVE */}
                    {selectedAgent === AgentType.SKILL && (
                      <div className="space-y-6">
                        {professor3QuizResult?.quizzes.map((q, idx) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                            <div className="font-bold text-xs text-slate-800">
                              Câu {idx + 1}: <ReactMarkdown remarkPlugins={markdownConfig.remarkPlugins} rehypePlugins={markdownConfig.rehypePlugins}>{q.question}</ReactMarkdown>
                            </div>

                            <div className="grid gap-2">
                              {q.options.map((opt, optIdx) => {
                                const optLetter = String.fromCharCode(65 + optIdx);
                                const isSelected = userQuizAnswers[idx] === optLetter;
                                const isCorrect = q.answer === optLetter;

                                let btnClass = "bg-white border-slate-200 text-slate-700";
                                if (userQuizAnswers[idx]) {
                                  if (isSelected && isCorrect) btnClass = "bg-emerald-500 text-white border-emerald-500 font-bold";
                                  else if (isSelected && !isCorrect) btnClass = "bg-rose-500 text-white border-rose-500 font-bold";
                                  else if (isCorrect) btnClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                                }

                                return (
                                  <button key={optIdx} disabled={!!userQuizAnswers[idx]} onClick={() => setUserQuizAnswers(prev => ({ ...prev, [idx]: optLetter }))} className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${btnClass}`}>
                                    <span className="font-black mr-2">{optLetter}.</span> {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {userQuizAnswers[idx] && (
                              <div className="pt-2">
                                <button onClick={() => setShownSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))} className="text-[10px] font-bold text-blue-600 underline">
                                  {shownSolutions[idx] ? 'Ẩn lời giải' : 'Hiện lời giải chi tiết'}
                                </button>
                                {shownSolutions[idx] && (
                                  <div className="mt-2 p-3 bg-blue-50/50 rounded-xl text-xs text-slate-700 font-medium">
                                    {q.solution}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 4: DIARY (NHẬT KÝ HỌC TẬP TÁCH BIỆT CHUẨN v16.5) */}
          {screen === 'DIARY' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Nhật ký Lịch sử Học tập</h3>
                <span className="text-xs font-bold text-slate-400">{diaryEntries.length} bài đã lưu</span>
              </div>

              {diaryEntries.length === 0 ? (
                <div className="py-16 text-center text-slate-400 italic text-xs bg-white rounded-3xl border border-slate-100">
                  Chưa có bài tập nào được lưu vào nhật ký.
                </div>
              ) : (
                diaryEntries.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span>{item.date}</span>
                      <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">{item.subject}</span>
                    </div>

                    {item.image && (
                      <img src={item.image} alt="Đề bài" className="max-h-36 rounded-xl object-contain bg-slate-50 border p-1" />
                    )}

                    <div className="prose prose-slate max-w-none text-xs math-font">
                      <ReactMarkdown remarkPlugins={markdownConfig.remarkPlugins} rehypePlugins={markdownConfig.rehypePlugins}>
                        {item.resultContent}
                      </ReactMarkdown>
                    </div>

                    {item.casioSteps && (
                      <div className="bg-emerald-50 p-3 rounded-xl text-[11px] text-emerald-800">
                        <span className="font-bold block mb-1">Hướng dẫn Casio:</span>
                        {item.casioSteps}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
