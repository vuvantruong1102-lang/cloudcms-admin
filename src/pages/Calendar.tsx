import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';

const PF: Record<string, string> = { youtube: 'bg-red-600', facebook: 'bg-blue-600', zalo: 'bg-sky-500', tiktok: 'bg-black' };
const PF_SHORT: Record<string, string> = { youtube: 'YT', facebook: 'FB', zalo: 'ZL', tiktok: 'TT' };
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

type Item = { id: string; title: string; scheduled_at: number | null; targets?: { platform: string }[] };

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [byDay, setByDay] = useState<Record<string, Item[]>>({});

  useEffect(() => {
    const from = new Date(year, month, 1).getTime();
    const to = new Date(year, month + 1, 0, 23, 59, 59).getTime();
    api.get<{ items: Item[] }>(`/content?from=${from}&to=${to}&limit=100`).then((data) => {
      const map: Record<string, Item[]> = {};
      for (const it of data.items) {
        if (!it.scheduled_at) continue;
        const d = new Date(it.scheduled_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        (map[key] ||= []).push(it);
      }
      setByDay(map);
    });
  }, [year, month]);

  const first = new Date(year, month, 1);
  let startWd = first.getDay(); startWd = startWd === 0 ? 6 : startWd - 1; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  function prev() { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); }
  function next() { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startWd; i++) cells.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`;
    const dayItems = byDay[key] ?? [];
    const isToday = key === todayKey;
    cells.push(
      <div key={d} className={`min-h-[96px] bg-white border rounded-lg p-1.5 flex flex-col gap-1 ${isToday ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-100'}`}>
        <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{d}</div>
        {dayItems.map((it) => (
          <Link key={it.id} to={`/content/${it.id}`} className="block bg-gray-50 hover:bg-blue-50 rounded px-1.5 py-1 text-[11px] leading-tight">
            <div className="truncate">{it.title}</div>
            <div className="flex gap-0.5 mt-0.5">
              {(it.targets ?? []).map((t) => (
                <span key={t.platform} className={`inline-flex items-center justify-center text-white text-[8px] font-bold w-4 h-3.5 rounded ${PF[t.platform] ?? 'bg-gray-400'}`}>
                  {PF_SHORT[t.platform] ?? '?'}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-xl font-semibold">{MONTHS[month]} {year}</h1>
        <div className="flex gap-2">
          <button onClick={prev} className="border border-gray-300 p-2 rounded-md hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={next} className="border border-gray-300 p-2 rounded-md hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
          <Link to="/content/new" className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tạo nội dung
          </Link>
        </div>
      </div>
      {/* Lưới lịch: cuộn ngang trên mobile để giữ 7 cột, đủ rộng để bấm */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[640px] sm:min-w-0">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-xs font-medium text-gray-400 text-center">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{cells}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">Chỉ hiện bài đã đặt lịch. Bấm vào bài để soạn caption từng nền tảng.</p>
    </div>
  );
}
