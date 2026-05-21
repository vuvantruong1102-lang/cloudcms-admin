import { useState, useEffect } from 'react';
import { HelpCircle, Plus, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export type FAQEntry = {
  id: string;
  question: string;
  answer: string;
};

type Props = {
  open: boolean;
  initialFaqs: FAQEntry[]; // FAQ hiện có (parse từ HTML khi mở)
  onClose: () => void;
  onSave: (faqs: FAQEntry[]) => void;
};

let _idCounter = 0;
const genId = () => `faq_${Date.now()}_${++_idCounter}`;

export default function FAQManager({ open, initialFaqs, onClose, onSave }: Props) {
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Reset khi modal mở lại
  useEffect(() => {
    if (open) {
      if (initialFaqs.length > 0) {
        setFaqs(initialFaqs);
      } else {
        // Tạo sẵn 1 câu mẫu nếu chưa có
        setFaqs([{ id: genId(), question: '', answer: '' }]);
      }
    }
  }, [open, initialFaqs]);

  if (!open) return null;

  function addFaq() {
    setFaqs([...faqs, { id: genId(), question: '', answer: '' }]);
  }

  function removeFaq(id: string) {
    if (faqs.length === 1) {
      if (!window.confirm('Đây là câu cuối. Xóa sẽ xóa cả FAQ section. Tiếp tục?')) return;
    }
    setFaqs(faqs.filter((f) => f.id !== id));
  }

  function updateFaq(id: string, field: 'question' | 'answer', value: string) {
    setFaqs(faqs.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  }

  function moveFaq(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= faqs.length || fromIndex === toIndex) return;
    const next = [...faqs];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setFaqs(next);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;
    moveFaq(dragIndex, dropIndex);
    setDragIndex(null);
  }

  function handleSave() {
    // Filter bỏ câu trống
    const valid = faqs.filter((f) => f.question.trim() && f.answer.trim());
    if (valid.length === 0) {
      if (!window.confirm('Tất cả câu đều trống. Xóa FAQ section khỏi bài?')) return;
    }
    onSave(valid);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Quản lý FAQ
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Thêm câu hỏi thường gặp để tăng SEO và trải nghiệm người đọc. Có thể drag-drop để sắp xếp lại.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List FAQs */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-gray-50 border ${
                dragIndex === index ? 'border-blue-400 opacity-50' : 'border-gray-200'
              } rounded-lg p-3 transition-all`}
            >
              <div className="flex items-start gap-2">
                {/* Drag handle */}
                <div
                  className="flex-shrink-0 mt-1 text-gray-400 hover:text-gray-600 cursor-move"
                  title="Kéo để sắp xếp"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Index badge */}
                <div className="flex-shrink-0 mt-1 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Form fields */}
                <div className="flex-1 space-y-2">
                  <input
                    value={faq.question}
                    onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                    placeholder="Câu hỏi (vd: Yokool có hỗ trợ in logo không?)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                    placeholder="Câu trả lời chi tiết (có thể nhiều dòng, dùng xuống dòng để chia đoạn)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm leading-relaxed focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveFaq(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Lên"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFaq(index, index + 1)}
                    disabled={index === faqs.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Xuống"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFaq(faq.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Xóa câu này"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Nút thêm câu */}
          <button
            type="button"
            onClick={addFaq}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            {faqs.length} câu hỏi · {faqs.filter((f) => f.question.trim() && f.answer.trim()).length} câu hợp lệ
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Lưu FAQ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
