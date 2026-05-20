import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import { useAuth } from '../lib/auth-store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const nav = useNavigate();
  const loc = useLocation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const from = (loc.state as any)?.from?.pathname ?? '/posts';
      nav(from, { replace: true });
    } catch (e: any) {
      setError(e.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-lg font-medium">Đăng nhập CloudCMS</h1>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</div>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </div>
      </form>
    </div>
  );
}
