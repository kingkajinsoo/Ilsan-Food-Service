import React, { useState, useEffect } from 'react';
import { PRODUCTS, SERVICE_PRODUCT_OPTIONS } from '../constants';
import { supabase } from '../lib/supabase';
import { UserProfile, OrderItem } from '../types';
import { useNavigate } from 'react-router-dom';

export const Order: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Cart State: { productId: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [serviceItem, setServiceItem] = useState<string>('');
  
  // User Form State
  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const init = async () => {
      // 1. Check Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (profile) {
          setUser(profile as UserProfile);
          setFormData(prev => ({
            ...prev,
            business_name: profile.business_name || '',
            phone: profile.phone || ''
          }));
        }
      } else {
        // Not logged in
        alert('로그인이 필요한 서비스입니다.');
        navigate('/');
      }
    };
    init();
  }, [navigate]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Logic Calculations
  const totalPaidBoxes = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);
  const totalAmount = Object.entries(cart).reduce((acc, [pid, qty]) => {
    const quantity = qty as number;
    const product = PRODUCTS.find(p => p.id === pid);
    return acc + (product ? product.price * quantity : 0);
  }, 0);

  const hasPepsi = Object.keys(cart).some(pid => {
    const p = PRODUCTS.find(prod => prod.id === pid);
    return p?.isPepsiFamily;
  });

  // 3+1 Logic
  const serviceBoxesCount = (totalPaidBoxes >= 3 && hasPepsi) ? Math.floor(totalPaidBoxes / 3) : 0;
  
  const isValidOrder = totalPaidBoxes > 0 && 
    (serviceBoxesCount > 0 ? !!serviceItem : true) &&
    formData.business_name && formData.phone && formData.address;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOrder || !user) return;
    setLoading(true);

    try {
      // 1. Prepare Items
      const orderItems: OrderItem[] = Object.entries(cart).map(([pid, qty]) => {
        const quantity = qty as number;
        const p = PRODUCTS.find(prod => prod.id === pid)!;
        return {
          productId: pid,
          productName: p.name,
          quantity: quantity,
          price: p.price
        };
      });

      let serviceItemsList: OrderItem[] = [];
      if (serviceBoxesCount > 0 && serviceItem) {
        const p = PRODUCTS.find(prod => prod.id === serviceItem)!;
        serviceItemsList.push({
          productId: p.id,
          productName: `[서비스] ${p.name}`,
          quantity: serviceBoxesCount,
          price: 0
        });
      }

      // 2. Real DB Insert
      // Update User info first (business_name, phone)
      if (user.business_name !== formData.business_name || user.phone !== formData.phone) {
        await supabase.from('users').update({
          business_name: formData.business_name,
          phone: formData.phone
        }).eq('id', user.id);
      }

      // Insert Order
      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        items: orderItems,
        service_items: serviceItemsList,
        total_boxes: totalPaidBoxes + serviceBoxesCount,
        total_amount: totalAmount,
        delivery_address: formData.address,
        status: 'pending'
      });

      if (error) throw error;

      alert('주문이 성공적으로 접수되었습니다!\n관리자 확인 후 연락드립니다.');
      setCart({});
      setServiceItem('');
      navigate('/');

    } catch (err: any) {
      console.error(err);
      alert(`주문 실패: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">상품 주문하기</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left: Product List */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm mb-4">
            <h4 className="font-bold text-blue-800 mb-1"><i className="fa-solid fa-circle-info mr-2"></i>3+1 행사 안내</h4>
            <p>총 3박스 주문 시마다 서비스 음료 1박스를 드립니다.</p>
            <p className="text-red-500 font-semibold">* 단, 주문 목록에 펩시(콜라/제로) 제품이 1박스 이상 포함되어야 합니다.</p>
          </div>

          <div className="space-y-4">
            {PRODUCTS.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded bg-gray-100" />
                  <div>
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 font-bold">{product.price.toLocaleString()}원</span>
                      {product.isPepsiFamily && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">필수포함 대상</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 p-1 rounded-lg">
                  <button 
                    onClick={() => updateQuantity(product.id, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded shadow text-gray-600 hover:text-red-500 font-bold"
                  >-</button>
                  <span className="w-8 text-center font-bold">{cart[product.id] || 0}</span>
                  <button 
                    onClick={() => updateQuantity(product.id, 1)}
                    className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded shadow text-white hover:bg-blue-700 font-bold"
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary & Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-lg sticky top-20 border border-gray-200">
            <h3 className="text-lg font-bold mb-4">주문 요약</h3>
            
            {/* Logic Status */}
            <div className="mb-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span>총 주문 수량</span>
                <span className="font-bold">{totalPaidBoxes} 박스</span>
              </div>
              <div className="flex justify-between">
                <span>펩시 포함 여부</span>
                <span className={hasPepsi ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {hasPepsi ? "포함됨 (O)" : "미포함 (X)"}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span>서비스 가능 수량</span>
                <span className="font-bold text-blue-600">+{serviceBoxesCount} 박스</span>
              </div>
            </div>

            {serviceBoxesCount > 0 && (
              <div className="mb-6 bg-yellow-50 p-3 rounded border border-yellow-200 animate-pulse">
                <label className="block text-sm font-bold text-yellow-800 mb-2">
                  서비스 상품 선택 ({serviceBoxesCount}박스)
                </label>
                <select 
                  value={serviceItem} 
                  onChange={(e) => setServiceItem(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">상품을 선택해주세요</option>
                  {SERVICE_PRODUCT_OPTIONS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-6 pt-4 border-t">
              <div className="flex justify-between items-end">
                <span className="text-gray-600">총 결제예상금액</span>
                <span className="text-2xl font-extrabold text-blue-700">{totalAmount.toLocaleString()}원</span>
              </div>
            </div>

            {/* User Info Form */}
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="업소명 (상호)"
                required
                className="w-full p-2 border rounded text-sm"
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              />
              <input
                type="text"
                placeholder="전화번호"
                required
                className="w-full p-2 border rounded text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
               <input
                type="text"
                placeholder="배송지 주소"
                required
                className="w-full p-2 border rounded text-sm"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValidOrder || loading}
              className={`w-full py-3 rounded-lg font-bold text-white text-lg shadow transition-all ${
                isValidOrder && !loading 
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? '처리중...' : '주문하기'}
            </button>
            
            {!isValidOrder && totalPaidBoxes > 0 && (
              <p className="text-xs text-red-500 mt-2 text-center">
                {!hasPepsi 
                  ? "펩시 제품을 1개 이상 담아주세요." 
                  : (serviceBoxesCount > 0 && !serviceItem) 
                    ? "서비스 상품을 선택해주세요." 
                    : "필수 정보를 입력해주세요."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
