import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileText, Image, LogOut, Cloud, Megaphone, CalendarDays } from 'lucide-react';
import { useAuth } from '../lib/auth-store';

const navItems = [
  { to: '/posts', label: 'Website', icon: FileText },
  { to: '/media', label: 'Thư viện ảnh', icon: Image },
  { to: '/content', label: 'Nội dung đa kênh', icon: Megaphone },
  { to: '/calendar', label: 'Lịch đăng', icon: CalendarDays },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar: sticky theo viewport, h-screen để cố định khi body scroll */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
            <Cloud className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium text-sm">CloudCMS</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main: KHÔNG overflow-auto → để body scroll → sticky toolbar hoạt động */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
