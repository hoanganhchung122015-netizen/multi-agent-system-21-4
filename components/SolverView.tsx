import React, { useState, useRef } from 'react';

export default function SolverView() {
  const [activeTab, setActiveTab] = useState<'1s' | 'tutor' | 'skill'>('1s');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConfirmVisible, setIsConfirmVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [solution, setSolution] = useState<string>('');

  // Ref lưu Promise gọi API chạy ngầm ngay khi tải ảnh
  const apiPromiseRef = useRef<Promise<any> | null>(null);

  // 1. Hàm tự động trigger gọi API ngay khi nhận file ảnh
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      setSelectedImage(base64Data);
      setIsConfirmVisible(true); // Hiển thị nút "Xác nhận" cho học sinh
      setSolution(''); // Reset kết quả cũ

      // KÍCH HOẠT TỰ ĐỘNG: Gọi API ngay lập tức trong lúc học sinh xem lại ảnh
      apiPromiseRef.current = fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          prompt: 'Hãy đọc hình ảnh đề toán này, trích xuất chính xác đề bài và trình bày lời giải chi tiết, rõ ràng nhất bằng Tiếng Việt.',
        }),
      }).then((res) => res.json());
    };
    reader.readAsDataURL(file);
  };

  // 2. Hàm khi học sinh bấm nút "Xác nhận"
  const handleConfirm = async () => {
    setIsConfirmVisible(false);
    setLoading(true);
    setActiveTab('1s'); // Chuyển thẳng về Tab Giải 1s

    try {
      if (apiPromiseRef.current) {
        // Hứng kết quả từ Promise đã chạy trước đó
        const data = await apiPromiseRef.current;
        if (data && data.text) {
          setSolution(data.text);
        } else {
          setSolution(data?.error || 'Không thể giải bài toán này. Vui lòng thử lại.');
        }
      }
    } catch (error) {
      setSolution('Đã xảy ra lỗi khi kết nối với máy chủ AI.');
    } finally {
      setLoading(false);
      apiPromiseRef.current = null; // Dọn dẹp ref
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Thanh Tab Navigation: Chỉ còn GIẢI 1S, GIA SƯ AI, LUYỆN SKILL (Đã xóa ĐIỀU PHỐI) */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-2 mb-6">
        <button
          onClick={() => setActiveTab('1s')}
          className={`flex-1 py-3 font-bold rounded-xl transition-all ${
            activeTab === '1s'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          GIẢI 1S
        </button>
        <button
          onClick={() => setActiveTab('tutor')}
          className={`flex-1 py-3 font-bold rounded-xl transition-all ${
            activeTab === 'tutor'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          GIA SƯ AI
        </button>
        <button
          onClick={() => setActiveTab('skill')}
          className={`flex-1 py-3 font-bold rounded-xl transition-all ${
            activeTab === 'skill'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          LUYỆN SKILL
        </button>
      </div>

      {/* Khu vực chọn / Xem trước ảnh */}
      <div className="mb-6 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-6">
        {!selectedImage ? (
          <label className="cursor-pointer flex flex-col items-center">
            <span className="text-blue-600 font-semibold mb-2">📸 Chọn hoặc chụp ảnh đề bài</span>
            <span className="text-xs text-gray-400">Tự động tải và chuẩn bị giải</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        ) : (
          <div className="flex flex-col items-center w-full">
            <img
              src={selectedImage}
              alt="Đề bài"
              className="max-h-60 rounded-xl mb-4 border shadow-sm object-contain"
            />
            
            {/* Nút XÁC NHẬN: Bấm vào nhận ngay kết quả đã/đang xử lý */}
            {isConfirmVisible && (
              <button
                onClick={handleConfirm}
                className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🚀 XÁC NHẬN GIẢI BÀI</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hiển thị kết quả tại vị trí GIẢI 1S */}
      <div className="bg-white rounded-3xl p-6 min-h-[350px] border border-gray-200 shadow-sm">
        {activeTab === '1s' && (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-600 font-semibold animate-pulse">
                  Agent Điều Phối đang hoàn tất kết quả...
                </p>
              </div>
            ) : solution ? (
              <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                {solution}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-16">
                Chưa có dữ liệu lời giải. Vui lòng tải ảnh và ấn Xác nhận.
              </p>
            )}
          </div>
        )}

        {/* Các Agent còn lại đứng ở trạng thái chờ (Idle) */}
        {activeTab === 'tutor' && (
          <div className="text-center py-16 text-gray-500">
            Hỏi đáp chi tiết cùng Gia Sư AI.
          </div>
        )}
        {activeTab === 'skill' && (
          <div className="text-center py-16 text-gray-500">
            Luyện tập các dạng bài tương tự.
          </div>
        )}
      </div>
    </div>
  );
}
