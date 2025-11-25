import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';

export const Apron: React.FC = () => {
	  const navigate = useNavigate();
	  const [user, setUser] = useState<UserProfile | null>(null);
	  const [hasApronRequest, setHasApronRequest] = useState(false);
	  const [loading, setLoading] = useState(true);

	  useEffect(() => {
	    const init = async () => {
	      const { data: { session } } = await supabase.auth.getSession();
	      if (!session) {
	        alert('로그인이 필요합니다.');
	        navigate('/');
	        return;
	      }

	      const { data: userData } = await supabase
	        .from('users')
	        .select('*')
	        .eq('id', session.user.id)
	        .single();
	      if (userData) {
	        setUser(userData as UserProfile);
	      }

	      const { data: apronData, error } = await supabase
	        .from('apron_requests')
	        .select('id')
	        .eq('user_id', session.user.id)
	        .limit(1);

	      if (!error && apronData && apronData.length > 0) {
	        setHasApronRequest(true);
	      }

	      setLoading(false);
	    };

	    init();
	  }, [navigate]);

	  if (loading) {
	    return (
	      <div className="max-w-md mx-auto px-4 py-12">
	        <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-orange-100">
	          <p className="text-gray-600">앞치마 혜택 정보를 불러오는 중입니다...</p>
	        </div>
	      </div>
	    );
	  }

	  return (
	    <div className="max-w-md mx-auto px-4 py-12">
	      <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-orange-100">
	        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 text-3xl">
	          <i className="fa-solid fa-shirt"></i>
	        </div>
	        
	        <h2 className="text-2xl font-bold text-gray-900 mb-2">앞치마 혜택 안내</h2>
	        <p className="text-gray-500 mb-6">
	          앞치마는 별도 신청 없이<br />
	          <span className="font-bold text-orange-600">1개 사업자 기준, 최초 주문 1회에 한해 5장이 자동 신청</span>됩니다.
	        </p>

	        {user && (
	          <div className="mb-6 text-left text-sm bg-gray-50 p-4 rounded-lg">
	            <div className="font-semibold text-gray-800 mb-1">사업자</div>
	            <div className="text-gray-700">
	              {user.business_name || user.name || user.email}
	            </div>
	          </div>
	        )}

	        {hasApronRequest ? (
	          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
	            <p className="font-bold mb-1">앞치마 5장 자동 신청 완료</p>
	            <p>고객님 명의로 앞치마 5장 신청이 이미 접수되었습니다.<br />관리자(롯데칠성) 확인 후 발송됩니다.</p>
	          </div>
	        ) : (
	          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
	            <p className="font-bold mb-1">아직 앞치마 신청 내역이 없습니다.</p>
	            <p>첫 주문을 완료하시면 앞치마 5장이 자동으로 신청됩니다.</p>
	          </div>
	        )}
	      </div>
	    </div>
	  );
	};
