import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Crop as CropIcon, Maximize2, Loader2 } from 'lucide-react';
import { loadImage, renderToBlob, blobToFile, fmtBytes } from '../lib/image-tools';

type Props = {
  src: string;          // URL ảnh gốc
  filename: string;     // tên file gốc (để gợi ý tên mới)
  onClose: () => void;
  onExport: (file: File, dim: { width: number; height: number }) => Promise<void>;
};

type Rect = { x: number; y: number; w: number; h: number }; // theo px gốc

const RATIOS: { label: string; value: number | null }[] = [
  { label: 'Tự do', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '1.91:1 (OG)', value: 1.91 },
];

export default function ImageEditor({ src, filename, onClose, onExport }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // khung crop theo px gốc
  const [crop, setCrop] = useState<Rect | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);

  // kích thước xuất
  const [outW, setOutW] = useState<number>(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [fmt, setFmt] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
  const [quality, setQuality] = useState(0.9);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1); // hiển thị px / px gốc
  const drag = useRef<{ mode: 'move' | 'nw' | 'ne' | 'sw' | 'se'; sx: number; sy: number; start: Rect } | null>(null);

  // Tải ảnh
  useEffect(() => {
    let alive = true;
    loadImage(src).then((i) => {
      if (!alive) return;
      setImg(i);
      const init: Rect = { x: 0, y: 0, w: i.naturalWidth, h: i.naturalHeight };
      setCrop(init);
      setOutW(i.naturalWidth);
    }).catch((e) => setErr(e.message));
    return () => { alive = false; };
  }, [src]);

  // Tính scale hiển thị
  const recalcScale = useCallback(() => {
    if (!img || !wrapRef.current) return;
    const maxW = wrapRef.current.clientWidth;
    const maxH = Math.min(window.innerHeight * 0.5, 460);
    const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    setScale(s || 1);
  }, [img]);

  useEffect(() => { recalcScale(); }, [recalcScale]);
  useEffect(() => {
    window.addEventListener('resize', recalcScale);
    return () => window.removeEventListener('resize', recalcScale);
  }, [recalcScale]);

  // Áp tỉ lệ cố định cho khung crop
  function applyRatio(r: number | null) {
    setRatio(r);
    if (!img || !crop || r == null) return;
    // giữ tâm, điều chỉnh chiều cao theo width hiện tại
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    let w = crop.w;
    let h = w / r;
    if (h > img.naturalHeight) { h = img.naturalHeight; w = h * r; }
    let x = cx - w / 2, y = cy - h / 2;
    x = Math.max(0, Math.min(x, img.naturalWidth - w));
    y = Math.max(0, Math.min(y, img.naturalHeight - h));
    const next = { x, y, w, h };
    setCrop(next);
    if (lockRatio) setOutW(Math.round(w));
  }

  // Kéo khung
  function onPointerDown(e: React.PointerEvent, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') {
    if (!crop) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: { ...crop } };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !img || !crop) return;
    const dx = (e.clientX - drag.current.sx) / scale;
    const dy = (e.clientY - drag.current.sy) / scale;
    const s = drag.current.start;
    let { x, y, w, h } = s;
    const W = img.naturalWidth, H = img.naturalHeight;

    if (drag.current.mode === 'move') {
      x = Math.max(0, Math.min(s.x + dx, W - s.w));
      y = Math.max(0, Math.min(s.y + dy, H - s.h));
    } else {
      // resize từ góc
      if (drag.current.mode === 'nw') { x = s.x + dx; y = s.y + dy; w = s.w - dx; h = s.h - dy; }
      if (drag.current.mode === 'ne') { y = s.y + dy; w = s.w + dx; h = s.h - dy; }
      if (drag.current.mode === 'sw') { x = s.x + dx; w = s.w - dx; h = s.h + dy; }
      if (drag.current.mode === 'se') { w = s.w + dx; h = s.h + dy; }
      if (ratio != null) h = w / ratio; // ép tỉ lệ theo width
      // min 16px
      w = Math.max(16, w); h = Math.max(16, h);
      // clamp trong ảnh
      if (x < 0) { w += x; x = 0; }
      if (y < 0) { h += y; y = 0; }
      if (x + w > W) w = W - x;
      if (y + h > H) h = H - y;
      if (ratio != null) { h = w / ratio; if (y + h > H) { h = H - y; w = h * ratio; } }
    }
    const next = { x, y, w, h };
    setCrop(next);
    if (lockRatio) setOutW(Math.round(w));
  }
  function onPointerUp() { drag.current = null; }

  if (err) {
    return (
      <Shell onClose={onClose}>
        <div className="p-6 text-sm text-red-600">
          {err}. Ảnh cần cho phép CORS để chỉnh sửa. Nếu bucket R2 đang ở domain riêng, hãy bật CORS cho phép GET từ trang admin.
        </div>
      </Shell>
    );
  }
  if (!img || !crop) {
    return <Shell onClose={onClose}><div className="p-10 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải ảnh…</div></Shell>;
  }

  const outH = ratio != null ? Math.round(outW / ratio) : Math.round(outW * (crop.h / crop.w));
  const dispW = crop.w * scale, dispH = crop.h * scale;
  const dispX = crop.x * scale, dispY = crop.y * scale;

  async function doExport() {
    setBusy(true);
    try {
      const { blob, width, height } = await renderToBlob(img!, {
        crop: crop!,
        outWidth: outW,
        mime: fmt,
        quality,
      });
      const base = filename.replace(/\.[^.]+$/, '');
      const ext = fmt === 'image/png' ? 'png' : fmt === 'image/webp' ? 'webp' : 'jpg';
      const file = blobToFile(blob, `${base}-edited-${width}x${height}.${ext}`);
      await onExport(file, { width, height });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const handle = 'absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-sm';

  return (
    <Shell onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] max-h-[88vh] overflow-hidden">
        {/* Canvas crop */}
        <div ref={wrapRef} className="bg-gray-900 flex items-center justify-center p-4 overflow-hidden select-none">
          <div
            className="relative"
            style={{ width: img.naturalWidth * scale, height: img.naturalHeight * scale }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img src={src} crossOrigin="anonymous" alt="" draggable={false}
              className="absolute inset-0 w-full h-full opacity-40" />
            {/* vùng sáng = crop */}
            <div className="absolute overflow-hidden ring-1 ring-blue-400" style={{ left: dispX, top: dispY, width: dispW, height: dispH }}>
              <img src={src} crossOrigin="anonymous" alt="" draggable={false}
                style={{ position: 'absolute', left: -dispX, top: -dispY, width: img.naturalWidth * scale, height: img.naturalHeight * scale, maxWidth: 'none' }} />
            </div>
            {/* khung kéo */}
            <div className="absolute border border-blue-500 cursor-move"
              style={{ left: dispX, top: dispY, width: dispW, height: dispH }}
              onPointerDown={(e) => onPointerDown(e, 'move')}>
              <div className={`${handle} -left-1.5 -top-1.5 cursor-nw-resize`} onPointerDown={(e) => onPointerDown(e, 'nw')} />
              <div className={`${handle} -right-1.5 -top-1.5 cursor-ne-resize`} onPointerDown={(e) => onPointerDown(e, 'ne')} />
              <div className={`${handle} -left-1.5 -bottom-1.5 cursor-sw-resize`} onPointerDown={(e) => onPointerDown(e, 'sw')} />
              <div className={`${handle} -right-1.5 -bottom-1.5 cursor-se-resize`} onPointerDown={(e) => onPointerDown(e, 'se')} />
            </div>
          </div>
        </div>

        {/* Panel điều khiển */}
        <div className="p-4 space-y-4 overflow-y-auto border-l border-gray-100">
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1"><CropIcon className="w-3.5 h-3.5" /> Tỉ lệ cắt</div>
            <div className="flex flex-wrap gap-1.5">
              {RATIOS.map((r) => (
                <button key={r.label} onClick={() => applyRatio(r.value)}
                  className={`px-2 py-1 rounded text-xs border ${ratio === r.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1.5">Vùng cắt: {Math.round(crop.w)} × {Math.round(crop.h)} px</div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> Kích thước xuất</div>
            <div className="flex items-center gap-2">
              <input type="number" min={16} value={outW}
                onChange={(e) => setOutW(Math.max(16, Number(e.target.value) || 0))}
                className="w-20 px-2 py-1 border border-gray-200 rounded text-sm" />
              <span className="text-xs text-gray-400">× {outH || '—'} px</span>
            </div>
            <label className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
              <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} />
              Giữ tỉ lệ vùng cắt
            </label>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-700 mb-1.5">Định dạng</div>
            <select value={fmt} onChange={(e) => setFmt(e.target.value as any)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
              <option value="image/jpeg">JPEG (nhẹ, ảnh chụp)</option>
              <option value="image/webp">WebP (nhẹ nhất)</option>
              <option value="image/png">PNG (giữ trong suốt)</option>
            </select>
            {fmt !== 'image/png' && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Chất lượng: {Math.round(quality * 100)}%</div>
                <input type="range" min={0.5} max={1} step={0.05} value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2">
            <button onClick={doExport} disabled={busy}
              className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu…</> : 'Lưu thành ảnh mới'}
            </button>
            <button onClick={onClose} className="w-full text-sm py-2 rounded-md border border-gray-300 hover:bg-gray-50">Huỷ</button>
            <p className="text-[11px] text-gray-400 leading-relaxed">Ảnh chỉnh sửa được lưu thành bản mới trong thư viện; ảnh gốc giữ nguyên.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium">Chỉnh sửa ảnh</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
