import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, OrderItem, Product } from '../types';
import { useNavigate } from 'react-router-dom';

export const Order: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceProductOptions, setServiceProductOptions] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'CAN' | 'BOTTLE' | 'WATER'>('ALL');

  // Cart State: { productId: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [serviceItem, setServiceItem] = useState<string>('');

  // User Form State
  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    address: '',
    detailAddress: ''
  });

  // Daum Postcode
  const openAddressSearch = () => {
    new (window as any).daum.Postcode({
      oncomplete: function(data: any) {
        // 도로명 주소 또는 지번 주소 선택
        const fullAddress = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;

        // 건물명이 있으면 추가
        let extraAddress = '';
        if (data.userSelectedType === 'R') {
          if (data.bname !== '') {
            extraAddress += data.bname;
          }
          if (data.buildingName !== '') {
            extraAddress += (extraAddress !== '' ? ', ' + data.buildingName : data.buildingName);
          }
          if (extraAddress !== '') {
            extraAddress = ' (' + extraAddress + ')';
          }
        }

        setFormData(prev => ({
          ...prev,
          address: fullAddress + extraAddress
        }));
      }
    }).open();
  };

  useEffect(() => {
    const init = async () => {
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
        alert('로그인이 필요한 서비스입니다.');
        navigate('/');
      }

      // Fetch products from database
      const { data: productsData } = await supabase.from('products').select('*');
      if (productsData) {
        // Custom sort: 칠성사이다 → 펩시 → 기타
        const sortedProducts = (productsData as Product[]).sort((a, b) => {
          const aIsCider = a.name.includes('칠성사이다');
          const bIsCider = b.name.includes('칠성사이다');
          const aIsPepsi = a.name.includes('펩시');
          const bIsPepsi = b.name.includes('펩시');

          // 칠성사이다 우선
          if (aIsCider && !bIsCider) return -1;
          if (!aIsCider && bIsCider) return 1;

          // 펩시 다음
          if (aIsPepsi && !bIsPepsi && !bIsCider) return -1;
          if (!aIsPepsi && bIsPepsi && !aIsCider) return 1;

          // 같은 그룹 내에서는 이름순
          return a.name.localeCompare(b.name, 'ko');
        });

        setProducts(sortedProducts);
        // Filter service product options (Pepsi family or contains '칠성사이다' or '탐스')
        const serviceOptions = sortedProducts.filter((p: Product) =>
          p.is_pepsi_family || p.name.includes('칠성사이다') || p.name.includes('탐스')
        );
        setServiceProductOptions(serviceOptions as Product[]);
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
    const product = products.find(p => p.id === pid);
    return acc + (product ? product.price * quantity : 0);
  }, 0);

  const hasPepsi = Object.keys(cart).some(pid => {
    const p = products.find(prod => prod.id === pid);
    return p?.is_pepsi_family;
  });

  // 3+1 Logic
  const serviceBoxesCount = (totalPaidBoxes >= 3 && hasPepsi) ? Math.floor(totalPaidBoxes / 3) : 0;

  // Auto-select cheapest product as service item
  useEffect(() => {
    if (serviceBoxesCount > 0 && Object.keys(cart).length > 0) {
      // Find the cheapest product in cart
      const cartProducts = Object.keys(cart)
        .map(pid => products.find(p => p.id === pid))
        .filter(p => p !== undefined) as Product[];

      if (cartProducts.length > 0) {
        const cheapest = cartProducts.reduce((min, p) => p.price < min.price ? p : min);
        setServiceItem(cheapest.id);
      }
    } else {
      setServiceItem('');
    }
  }, [serviceBoxesCount, cart, products]);

  // Calculate discount rate
  const calculateDiscountRate = () => {
    if (serviceBoxesCount === 0) return 0;
    const serviceProduct = products.find(p => p.id === serviceItem);
    if (!serviceProduct) return 0;
    const totalValue = totalAmount + (serviceProduct.price * serviceBoxesCount);
    const discountAmount = serviceProduct.price * serviceBoxesCount;
    return Math.round((discountAmount / totalValue) * 100);
  };

  const discountRate = calculateDiscountRate();

  // Calculate per-box price
  const perBoxPrice = serviceBoxesCount > 0
    ? Math.round(totalAmount / (totalPaidBoxes + serviceBoxesCount))
    : 0;

  // Order validation: 3박스 이상이면 펩시 필수!
  const isValidOrder = totalPaidBoxes > 0 &&
    (totalPaidBoxes >= 3 ? hasPepsi : true) && // 3박스 이상이면 펩시 필수
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
        const p = products.find(prod => prod.id === pid)!;
        return {
          productId: pid,
          productName: p.name,
          quantity: quantity,
          price: p.price
        };
      });

      let serviceItemsList: OrderItem[] = [];
      if (serviceBoxesCount > 0 && serviceItem) {
        const p = products.find(prod => prod.id === serviceItem)!;
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
      const fullAddress = formData.detailAddress
        ? `${formData.address} ${formData.detailAddress}`
        : formData.address;

      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        items: orderItems,
        service_items: serviceItemsList,
        total_boxes: totalPaidBoxes + serviceBoxesCount,
        total_amount: totalAmount,
        delivery_address: fullAddress,
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

          {/* Category Tabs */}
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setActiveCategory('CAN')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'CAN'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🥫 캔
            </button>
            <button
              onClick={() => setActiveCategory('BOTTLE')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'BOTTLE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🍾 페트병
            </button>
            <button
              onClick={() => setActiveCategory('WATER')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'WATER'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💧 생수
            </button>
          </div>

          <div className="space-y-4">
            {products.filter(product => activeCategory === 'ALL' || product.category === activeCategory).length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
                해당 카테고리에 상품이 없습니다.
              </div>
            ) : (
              products
                .filter(product => activeCategory === 'ALL' || product.category === activeCategory)
                .map(product => (
                <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded bg-gray-100" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{product.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 line-through text-sm">{product.price.toLocaleString()}원</span>
                          <span className="text-red-600 font-bold text-lg">최대 {Math.round(product.price * 0.75).toLocaleString()}원</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">최대 25% 할인</span>
                        {product.is_pepsi_family && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">필수포함</span>
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
              ))
            )}
          </div>
        </div>

        {/* Right: Summary & Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-lg sticky top-20 border border-gray-200">
            <h3 className="text-lg font-bold mb-4">주문 요약</h3>

            {/* Cart Items Display */}
            {Object.keys(cart).length > 0 && (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(cart).map(([pid, qty]) => {
                  const product = products.find(p => p.id === pid);
                  if (!product) return null;
                  const itemTotal = product.price * (qty as number);
                  return (
                    <div key={pid} className="flex justify-between text-sm border-b pb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{product.name}</div>
                        <div className="text-gray-500 text-xs">
                          {product.price.toLocaleString()}원 × {qty}
                        </div>
                      </div>
                      <div className="font-bold text-gray-800">{itemTotal.toLocaleString()}원</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Logic Status */}
            <div className="mb-4 text-sm space-y-2 bg-gray-50 p-3 rounded">
              <div className="flex justify-between">
                <span>총 주문 수량</span>
                <span className="font-bold">{totalPaidBoxes} 박스</span>
              </div>
              <div className="flex justify-between">
                <span>펩시 포함 여부</span>
                <span className={hasPepsi ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {hasPepsi ? "✅ 포함됨" : "❌ 미포함"}
                </span>
              </div>
              {totalPaidBoxes >= 3 && !hasPepsi && (
                <div className="bg-red-50 border border-red-200 p-2 rounded mt-2">
                  <p className="text-red-600 text-xs font-bold">⚠️ 3박스 이상 주문 시 펩시 제품 1박스 이상 필수!</p>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span>서비스 수량</span>
                <span className="font-bold text-blue-600">+{serviceBoxesCount} 박스</span>
              </div>
              {serviceBoxesCount > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>할인율</span>
                    <span className="font-bold">{discountRate}% 할인!</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>박스당 평균</span>
                    <span className="font-bold">{perBoxPrice.toLocaleString()}원</span>
                  </div>
                </>
              )}
            </div>

            {serviceBoxesCount > 0 && serviceItem && (
              <div className="mb-6 bg-green-50 p-3 rounded border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-green-800">🎁 서비스 상품 (자동선택)</div>
                    <div className="text-xs text-green-600 mt-1">
                      {products.find(p => p.id === serviceItem)?.name} × {serviceBoxesCount}
                    </div>
                  </div>
                  <div className="text-green-700 font-bold">무료</div>
                </div>
              </div>
            )}

            <div className="mb-6 pt-4 border-t">
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-600">총 결제금액</span>
                <span className="text-2xl font-extrabold text-blue-700">{totalAmount.toLocaleString()}원</span>
              </div>
              {serviceBoxesCount > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">총 받는 박스: {totalPaidBoxes + serviceBoxesCount}박스</div>
                  <div className="text-sm text-green-600 font-bold">🎉 {discountRate}% 할인 적용!</div>
                </div>
              )}
            </div>

            {/* User Info Form */}
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="업소명 (상호)"
                required
                className="w-full p-2 border rounded text-sm"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="연락처"
                required
                className="w-full p-2 border rounded text-sm"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              {/* 주소 검색 */}
              <div>
                <input
                  type="text"
                  placeholder="배송지 주소"
                  required
                  readOnly
                  className="w-full p-2 border rounded text-sm bg-gray-50 cursor-pointer"
                  value={formData.address}
                  onClick={openAddressSearch}
                />
                <button
                  type="button"
                  onClick={openAddressSearch}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                >
                  주소 검색
                </button>
                {formData.address && (
                  <input
                    type="text"
                    placeholder="상세주소 (동/호수 등)"
                    className="w-full p-2 border rounded text-sm mt-2"
                    value={formData.detailAddress}
                    onChange={(e) => setFormData({ ...formData, detailAddress: e.target.value })}
                  />
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValidOrder || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '주문 중...' : serviceBoxesCount > 0 ? '🎁 3+1 프로모션으로 주문하기' : '주문하기'}
            </button>
            {totalPaidBoxes >= 3 && !hasPepsi && (
              <p className="text-red-500 text-xs text-center mt-2 font-bold">
                ⚠️ 펩시 제품 1박스 이상 필요합니다
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
