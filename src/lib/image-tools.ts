// Tiện ích xử lý ảnh phía client (không cần thư viện ngoài)

export type Dim = { width: number; height: number };

/** Đọc kích thước (px) của một File ảnh. */
export function readImageSize(file: File): Promise<Dim> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

/** Tải một ảnh từ URL về dạng HTMLImageElement (cần CORS cho phép khi vẽ canvas). */
export function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tải được ảnh (có thể do CORS)'));
    img.src = src;
  });
}

export type ExportOpts = {
  /** vùng cắt theo px gốc; bỏ qua = lấy cả ảnh */
  crop?: { x: number; y: number; w: number; h: number };
  /** kích thước đầu ra mong muốn (px). Nếu chỉ có 1 chiều, chiều kia tính theo tỉ lệ. */
  outWidth?: number;
  outHeight?: number;
  mime?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number; // 0..1 cho jpeg/webp
};

/**
 * Vẽ ảnh (đã crop nếu có) ra canvas theo kích thước đích rồi xuất Blob.
 */
export async function renderToBlob(img: HTMLImageElement, opts: ExportOpts): Promise<{ blob: Blob; width: number; height: number }> {
  const crop = opts.crop ?? { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  const srcRatio = crop.w / crop.h;

  let outW = opts.outWidth ?? 0;
  let outH = opts.outHeight ?? 0;
  if (outW && !outH) outH = Math.round(outW / srcRatio);
  else if (outH && !outW) outW = Math.round(outH * srcRatio);
  else if (!outW && !outH) { outW = Math.round(crop.w); outH = Math.round(crop.h); }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas không khả dụng');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);

  const mime = opts.mime ?? 'image/jpeg';
  const quality = opts.quality ?? 0.9;
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Xuất ảnh thất bại'))), mime, quality);
  });
  return { blob, width: outW, height: outH };
}

/** Đổi Blob thành File với tên gợi ý. */
export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}

/** Định dạng dung lượng. */
export function fmtBytes(b: number | null | undefined): string {
  if (!b) return '—';
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}
