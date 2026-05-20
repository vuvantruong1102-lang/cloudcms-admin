import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth-store';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import PostsListPage from './pages/PostsList';
import PostEditorPage from './pages/PostEditor';
import MediaPage from './pages/Media';
import CategoriesPage from './pages/Categories';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-gray-500">Đang tải…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export default function App() {
  const fetchMe = useAuth((s) => s.fetchMe);
  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/posts" replace />} />
        <Route path="posts" element={<PostsListPage />} />
        <Route path="posts/new" element={<PostEditorPage />} />
        <Route path="posts/:id" element={<PostEditorPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>
    </Routes>
  );
}
