import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Landing: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert('로그인 오류: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-blue-700 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
            alt="Restaurant Background"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
            고양시 일산서구<br className="sm:hidden" /> 외식업중앙회
          </h1>
          <p className="mt-6 text-xl text-blue-100 max-w-3xl mx-auto">
            회원님들을 위한 특별한 혜택! <br />
            업소용 음료 주문부터 앞치마 무료 신청까지, 간편하게 이용하세요.
          </p>
          <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-md text-black bg-yellow-400 hover:bg-yellow-500 md:py-4 md:text-xl md:px-10 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-wait"
            >
              <i className="fa-solid fa-comment mr-3"></i>
              {loading ? '연결 중...' : '카카오로 시작하기'}
            </button>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            * 카카오 계정으로 간편하게 가입하고 로그인할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">

            {/* Promo Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-sm border border-blue-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl mb-6 shadow-md">
                <i className="fa-solid fa-boxes-stacked"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">3+1 특별 행사</h3>
              <p className="text-gray-600 mb-6">
                업소용 음료 3박스 주문 시 <span className="text-blue-600 font-bold">1박스 무료 증정!</span><br />
                (단, 주문 목록에 펩시 제품 1박스 이상 포함 필수)
              </p>
              <ul className="text-sm text-gray-500 space-y-2 text-left bg-white p-4 rounded-lg w-full max-w-xs">
                <li><i className="fa-solid fa-check text-green-500 mr-2"></i>펩시 콜라 / 펩시 제로</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2"></i>칠성 사이다</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2"></i>탐스 제로 외 다수</li>
              </ul>
            </div>

            {/* Apron Card */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 shadow-sm border border-orange-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl mb-6 shadow-md">
                <i className="fa-solid fa-shirt"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">앞치마 무료 신청</h3>
              <p className="text-gray-600 mb-6">
                신규 가입처 및 기존 회원님들을 위한<br />
                위생 앞치마를 무료로 지원해 드립니다.
              </p>
              <div className="mt-auto">
                <p className="text-sm text-orange-600 font-semibold bg-orange-100 px-4 py-2 rounded-full">
                  재고 소진 시까지 (관리자 확인 후 발송)
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
