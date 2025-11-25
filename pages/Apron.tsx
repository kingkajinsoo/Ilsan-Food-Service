import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';

export const Apron: React.FC = () => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Check Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (data) setUser(data as UserProfile);
      } else {
        alert('로그인이 필요합니다.');
        navigate('/');
      }
    };
    init();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
        const { error } = await supabase.from('apron_requests').insert({
          user_id: user.id,
          quantity: quantity,
          status: 'pending'
        });
        if (error) throw error;
        alert('앞치마 신청이 완료되었습니다.');
        navigate('/');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-orange-100">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 text-3xl">
          <i className="fa-solid fa-shirt"></i>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">앞치마 신청</h2>
        <p className="text-gray-500 mb-8">
          필요하신 수량을 입력해주시면<br/>관리자 확인 후 배송해 드립니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              신청인 (업소명)
            </label>
            <input
              type="text"
              value={user?.business_name || user?.name || ''}
              disabled
              className="w-full p-3 bg-gray-100 rounded-lg border border-gray-300 text-gray-500"
            />
          </div>

          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              필요 수량 (장)
            </label>
            <div className="flex items-center">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-l-lg font-bold text-lg"
              >-</button>
              <input
                type="number"
                value={quantity}
                readOnly
                className="w-full h-12 text-center border-y border-gray-200 font-bold text-lg"
              />
              <button 
                type="button"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-r-lg font-bold text-lg"
              >+</button>
            </div>
            <p className="text-xs text-orange-500 mt-2">* 최대 10장까지 신청 가능합니다.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-500 text-white font-bold rounded-lg shadow-md hover:bg-orange-600 transition-colors disabled:bg-gray-300"
          >
            {loading ? '신청 처리중...' : '신청하기'}
          </button>
        </form>
      </div>
    </div>
  );
};
