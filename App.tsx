import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Order } from './pages/Order';
import { Apron } from './pages/Apron';
import { Admin } from './pages/Admin';

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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-gray-800 text-white py-8 text-center text-sm">
          <p>© 2024 고양시 일산서구 외식업중앙회. All rights reserved.</p>
          <p className="mt-2 text-gray-400">문의: 031-000-0000 | admin@ilsanfood.com</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
