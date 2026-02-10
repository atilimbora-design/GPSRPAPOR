import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Personnel from './pages/Personnel';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Products from './pages/Products';
import Chat from './pages/Chat';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
}


function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="personnel" element={<Personnel />} />
        <Route path="orders" element={<Orders />} />
        <Route path="reports" element={<Reports />} />
        <Route path="products" element={<Products />} />
        <Route path="chat" element={<Chat />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
