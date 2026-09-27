export type Subject = 'Toán học' | 'Vật lí' | 'Hóa học' | 'Nhật ký';

export type ScreenState = 'LOGIN' | 'DASHBOARD' | 'INPUT' | 'RESULT';

export type InputModeText = 'CAMERA' | 'THƯ VIỆN' | 'GHI ÂM';

export interface StudentInfo {
  name: string;
  className: string;
  school: string;
}

export interface AgentResult {
  orchestrator: string; // Tác tử 1: Điều phối MAS
  giaiNhanh: string;    // Tác tử 2: Giải nhanh 1s
  giaSu: string;        // Tác tử 3: Gia sư AI
  luyenSkill: string;   // Tác tử 4: Luyện skill
}

export interface DiaryEntry {
  id: string;
  timestamp: string;
  student: StudentInfo;
  subject: Subject;
  question: string;
  results: AgentResult;
}
