import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Order } from './pages/Order';
import { Apron } from './pages/Apron';
import { Admin } from './pages/Admin';
import { MyPage } from './pages/MyPage';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/order" element={<Order />} />
            <Route path="/apron" element={<Apron />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-gray-800 text-white py-8 text-center text-sm">
          <div className="mb-3">
            <Link to="/privacy" className="text-gray-300 hover:text-white mx-2 underline">
              개인정보처리방침
            </Link>
            <span className="text-gray-500">|</span>
            <Link to="/terms" className="text-gray-300 hover:text-white mx-2 underline">
              이용약관
            </Link>
          </div>
          <p>© 2025 한국외식업중앙회 경기도북부지회 고양시일산구지부. All rights reserved.</p>
          <p className="mt-2 text-gray-400">문의: 031-906-1661 | anenmaketing25@gmail.com</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
