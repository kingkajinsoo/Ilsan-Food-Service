import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Landing: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showApronModal, setShowApronModal] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'account_email profile_nickname'
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
          <h1 className="font-extrabold tracking-tight mb-4">
            <div className="text-5xl sm:text-6xl lg:text-7xl">한국외식업중앙회</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl mt-2">경기도북부지회 고양시일산구지부</div>
          </h1>
	          <p className="mt-6 text-xl text-blue-100 max-w-3xl mx-auto">
	            회원님들을 위한 특별한 혜택! <br />
	            업소용 음료 주문부터 직원용 앞치마 무상 지급 혜택까지, 간편하게 이용하세요.
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
          <div className="mt-4 text-sm">
            <p className="text-blue-200">* 카카오 계정으로 간편하게 가입하고 로그인할 수 있습니다.</p>
            <p className="text-red-400 font-semibold">* 회원사가 아닐 경우 주문이 불가능 합니다.</p>
          </div>
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
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                <span className="md:hidden">롯데칠성음료<br />업소용 제품 특별 행사</span>
                <span className="hidden md:inline">롯데칠성음료 업소용 제품 특별 행사</span>
              </h3>
              <p className="text-gray-600 mb-4">
                <span className="font-semibold text-blue-700">롯데칠성음료 고양지점과 함께하는 특별 혜택!</span><br />
                업소용 음료 3박스 주문 시 <span className="text-blue-600 font-bold">1박스 무료 증정!</span><br />
                (단, 주문 목록에 펩시 제품 1박스 이상 포함 필수)<br />
                <span className="text-xs text-gray-500 block mt-1">
                  <span className="md:hidden">* 신규 1개 사업자당 월 최대 10박스까지<br />한정기간동안 무료 혜택이 적용됩니다.</span>
                  <span className="hidden md:inline">* 신규 1개 사업자당 월 최대 10박스까지 한정기간동안 무료 혜택이 적용됩니다.</span>
                </span>
              </p>
              <ul className="text-sm text-gray-500 space-y-2 text-left bg-white p-4 rounded-lg w-full max-w-xs">
                <li><i className="fa-solid fa-check text-green-500 mr-2"></i>펩시 콜라 / 펩시 제로</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2"></i>칠성 사이다</li>
                <li><i className="fa-solid fa-check text-green-500 mr-2"></i>탐스 제로 외 다수</li>
              </ul>
            </div>

            {/* Apron Card */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 shadow-sm border border-orange-100 flex flex-col items-center text-center">
              <div className="mb-4 cursor-pointer" onClick={() => setShowApronModal(true)}>
                <img
                  src="/앞치마 이미지.jpg"
                  alt="앞치마"
                  className="w-48 h-48 object-contain rounded-lg hover:scale-105 transition-transform"
                />
                <p className="text-xs text-gray-500 mt-2">
                  <i className="fa-solid fa-magnifying-glass-plus mr-1"></i>클릭하여 크게 보기
                </p>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">직원용 앞치마 지급</h3>
              <p className="text-gray-600 mb-6">
                1개 사업자 기준, <span className="font-semibold">최초 주문 1회에 한해</span><br />
                앞치마 5장을 자동으로 신청해 드립니다.
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

      {/* Apron Image Modal */}
      {showApronModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowApronModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowApronModal(false)}
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 transition"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img
              src="/앞치마 이미지.jpg"
              alt="앞치마 상세 이미지"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
