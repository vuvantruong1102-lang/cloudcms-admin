/**
 * Slugify chuỗi tiếng Việt → URL-friendly slug
 *
 * Ví dụ:
 *   "Quà tặng công nghệ cho doanh nghiệp" → "qua-tang-cong-nghe-cho-doanh-nghiep"
 *   "OL212 vs SL207: Chọn ổ điện?" → "ol212-vs-sl207-chon-o-dien"
 *   "  Sạc nhanh 65W  " → "sac-nhanh-65w"
 */
export function slugify(text: string): string {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Tách dấu tổ hợp (á → a + ́)
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu tổ hợp
    .replace(/đ/g, 'd') // đ không bị NFD xử lý
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '') // Chỉ giữ alphanumeric, space, dash
    .trim()
    .replace(/\s+/g, '-') // Space → dash
    .replace(/-+/g, '-') // Multiple dashes → single
    .replace(/^-+|-+$/g, ''); // Trim dashes
}
