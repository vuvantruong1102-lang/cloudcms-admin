import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FileText, Image, LogOut, Cloud, Megaphone, CalendarDays, Film, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth-store';

const navItems = [
  { to: '/posts', label: 'Website', icon: FileText },
  { to: '/media', label: 'Thư viện ảnh', icon: Image },
  { to: '/videos', label: 'Video', icon: Film },
  { to: '/content', label: 'Nội dung đa kênh', icon: Megaphone },
  { to: '/calendar', label: 'Lịch đăng', icon: CalendarDays },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Đóng drawer mỗi khi đổi route (bấm menu trên mobile)
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Khoá scroll body khi drawer mở trên mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Đặt biến CSS chiều cao header mobile để editor toolbar sticky đúng vị trí
  useEffect(() => {
    function setHeaderVar() {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;
      document.documentElement.style.setProperty('--mobile-header-h', isMobile ? '56px' : '0px');
    }
    setHeaderVar();
    window.addEventListener('resize', setHeaderVar);
    return () => window.removeEventListener('resize', setHeaderVar);
  }, []);

  const SidebarContent = (
    <>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
            <Cloud className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium text-sm">CloudCMS</span>
        </div>
        {/* Nút đóng chỉ hiện trong drawer mobile */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1.5 -mr-1.5 text-gray-500 hover:bg-gray-100 rounded"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <div className="text-xs text-gray-500">Đăng nhập với</div>
          <div className="text-sm font-medium truncate">{user?.name}</div>
        </div>
        <button
          onClick={() => { logout(); nav('/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ===== Sidebar desktop: cố định, luôn hiện từ lg ===== */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen flex-shrink-0">
        {SidebarContent}
      </aside>

      {/* ===== Drawer mobile ===== */}
      {/* Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />
      {/* Panel trượt từ trái */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[78%] max-w-xs bg-white border-r border-gray-200 flex flex-col shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {SidebarContent}
      </aside>

      {/* ===== Khu vực chính ===== */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar mobile: hamburger + logo, chỉ hiện dưới lg */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-medium text-sm">CloudCMS</span>
          </div>
        </header>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
