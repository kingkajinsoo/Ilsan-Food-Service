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
  const [usedServiceBoxesThisMonth, setUsedServiceBoxesThisMonth] = useState(0);
	const [willAutoApron, setWillAutoApron] = useState(false);
	const [supportsBizNumber, setSupportsBizNumber] = useState(false);

	// User Form State
	const [formData, setFormData] = useState({
	  business_name: '',
	  businessNumber: '',
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
	          businessNumber: 'business_number' in (profile as any)
	            ? formatBizNumber(((profile as any).business_number as string | null) || '')
	            : prev.businessNumber,
	          phone: profile.phone || ''
	        }));

	        if ('business_number' in (profile as any)) {
	          setSupportsBizNumber(true);
	        }
        }

        // Calculate how many free service boxes (3+1) this user already received this month
        try {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const { data: pastOrders, error: pastOrdersError } = await supabase
            .from('orders')
            .select('service_items, created_at')
            .eq('user_id', session.user.id)
            .gte('created_at', startOfMonth.toISOString());

          if (!pastOrdersError && pastOrders) {
            let used = 0;
            (pastOrders as any[]).forEach((order: any) => {
              const serviceItems = (order.service_items || []) as any[];
              serviceItems.forEach((item: any) => {
                if (item && typeof item.quantity === 'number') {
                  used += item.quantity;
                }
              });
            });
            setUsedServiceBoxesThisMonth(used);
          }
        } catch (e) {
          console.error('Failed to calculate used service boxes this month', e);
        }

	        // Determine whether this business will get apron auto-application on the next order
	        try {
	          const { count: existingOrderCount, error: orderCountError } = await supabase
	            .from('orders')
	            .select('*', { count: 'exact', head: true })
	            .eq('user_id', session.user.id);

	          if (orderCountError) {
	            console.error('Failed to check existing orders for apron info', orderCountError);
	          } else {
	            const isFirstOrder = (existingOrderCount ?? 0) === 0;

	            const { data: apronData, error: apronError } = await supabase
	              .from('apron_requests')
	              .select('id')
	              .eq('user_id', session.user.id)
	              .limit(1);

	            if (apronError) {
	              console.error('Failed to check apron_requests for apron info', apronError);
	            }

	            const hasExistingApron = !!(apronData && apronData.length > 0);
	            setWillAutoApron(isFirstOrder && !hasExistingApron);
	          }
	        } catch (e) {
	          console.error('Failed to calculate apron auto-application info', e);
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

	// Helpers for formatting business registration number & phone number
	const formatBizNumber = (value: string): string => {
	  const digits = value.replace(/\D/g, '').slice(0, 10); // 최대 10자리 (예: 123-45-67890)
	  if (digits.length <= 3) return digits;
	  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
	};

	const formatPhoneNumber = (value: string): string => {
	  const digits = value.replace(/\D/g, '').slice(0, 11); // 국내 휴대폰 10~11자리 기준
	  if (digits.length <= 3) return digits;
	  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
	};

	const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
	  const raw = e.target.value.replace(/\D/g, '');
	  const formatted = formatBizNumber(raw);
	  setFormData(prev => ({
	    ...prev,
	    businessNumber: formatted,
	  }));
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
	  const raw = e.target.value.replace(/\D/g, '');
	  const formatted = formatPhoneNumber(raw);
	  setFormData(prev => ({
	    ...prev,
	    phone: formatted,
	  }));
	};

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
  // 전체 박스 수량 (생수 포함)
  const totalAllBoxes = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);

  // 3+1 대상 박스 수량 (생수 제외)
  const totalPaidBoxes = Object.entries(cart).reduce((acc, [pid, qty]) => {
    const product = products.find(p => p.id === pid);
    if (product && product.category !== 'WATER') {
      return acc + (qty as number);
    }
    return acc;
  }, 0);

  const totalAmount = Object.entries(cart).reduce((acc, [pid, qty]) => {
    const quantity = qty as number;
    const product = products.find(p => p.id === pid);
    return acc + (product ? product.price * quantity : 0);
  }, 0);

  const hasPepsi = Object.keys(cart).some(pid => {
    const p = products.find(prod => prod.id === pid);
    return p?.is_pepsi_family;
  });

  // 3+1 Logic (생수 제외된 totalPaidBoxes 기준)
	  const rawServiceBoxes = (totalPaidBoxes >= 3 && hasPepsi)
	    ? Math.floor(totalPaidBoxes / 3)
	    : 0;

	  const remainingFreeBoxes = Math.max(0, 10 - usedServiceBoxesThisMonth);

	  const serviceBoxesCount = Math.min(rawServiceBoxes, remainingFreeBoxes);

  // Auto-select cheapest product as service item (생수 제외)
  useEffect(() => {
    if (serviceBoxesCount > 0 && Object.keys(cart).length > 0) {
      // Find the cheapest product in cart (생수 제외)
      const cartProducts = Object.keys(cart)
        .map(pid => products.find(p => p.id === pid))
        .filter(p => p !== undefined && p.category !== 'WATER') as Product[];

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
	  formData.business_name && formData.businessNumber && formData.phone && formData.address;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOrder || !user) return;
    setLoading(true);

    try {
	      // 0. Determine if this order should trigger automatic apron request
	      let shouldCreateApron = false;
	      try {
	        const { count: existingOrderCount, error: orderCountError } = await supabase
	          .from('orders')
	          .select('*', { count: 'exact', head: true })
	          .eq('user_id', user.id);

	        if (orderCountError) {
	          console.error('Failed to check existing orders for apron logic', orderCountError);
	        } else {
	          const isFirstOrder = (existingOrderCount ?? 0) === 0;

	          const { data: existingApron, error: apronError } = await supabase
	            .from('apron_requests')
	            .select('id')
	            .eq('user_id', user.id)
	            .limit(1)
	            .maybeSingle();

	          if (apronError) {
	            console.error('Failed to check existing apron requests', apronError);
	          }

	          const hasExistingApron = !!existingApron;
	          shouldCreateApron = isFirstOrder && !hasExistingApron;
	        }
	      } catch (logicError) {
	        console.error('Apron auto-application logic failed', logicError);
	      }

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
	  // Update User info first (business_name, business_number, phone)
	  const currentBizNumberRaw = supportsBizNumber
	    ? ((((user as any).business_number as string | null) || '').replace(/\D/g, ''))
	    : '';
	  const newBizNumberRaw = formData.businessNumber.replace(/\D/g, '');

	  const shouldUpdateUser =
	    user.business_name !== formData.business_name ||
	    user.phone !== formData.phone ||
	    (supportsBizNumber && currentBizNumberRaw !== newBizNumberRaw);

	  if (shouldUpdateUser) {
	    const updatePayload: any = {
	      business_name: formData.business_name,
	      phone: formData.phone,
	    };
	    if (supportsBizNumber) {
	      updatePayload.business_number = newBizNumberRaw;
	    }
	    await supabase.from('users').update(updatePayload).eq('id', user.id);
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
        phone: formData.phone,
        business_number: formData.businessNumber,
        status: 'pending'
      });

      if (error) throw error;
	      
	      // 3. Auto-create apron request on first order (once per business)
	      if (shouldCreateApron) {
	        const { error: apronInsertError } = await supabase.from('apron_requests').insert({
	          user_id: user.id,
	          quantity: 5,
	          status: 'pending'
	        });
	        if (apronInsertError) {
	          console.error('앞치마 자동 신청 실패:', apronInsertError);
	        }
	      }
	      
	      alert(shouldCreateApron
	        ? '주문이 성공적으로 접수되었습니다!\n앞치마 5장 자동 신청이 완료되었습니다. (관리자 확인 후 발송)'
	        : '주문이 성공적으로 접수되었습니다!\n관리자 확인 후 연락드립니다.'
	      );
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
	            <p className="text-xs text-gray-600 mt-2">* 신규 1개 사업자당 월 최대 10박스까지 한정기간동안 무료 혜택이 적용됩니다.</p>
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
                  <div className="flex items-center space-x-3">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-[77px] h-[77px] object-cover rounded bg-gray-100 flex-shrink-0" />
                    ) : (
                      <div className="w-[77px] h-[77px] bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                        No Image
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm">{product.name}</h3>
                      {/* 2열 레이아웃: 정가 / 혜택 문구 */}
                      <div className="mt-1">
                        {product.category === 'WATER' ? (
                          // 생수는 정가만 표시 (3+1 미적용)
                          <span className="text-gray-900 font-bold text-sm">{product.price.toLocaleString()}원</span>
                        ) : (
                          <>
                            <span className="text-gray-500 text-sm">정가 </span>
                            <span className="text-red-400 line-through decoration-red-500 decoration-2 text-sm font-medium">{product.price.toLocaleString()}원</span>
                          </>
                        )}
                      </div>
                      {product.category !== 'WATER' && (
                        <div className="mt-1">
                          {totalPaidBoxes >= 3 && hasPepsi ? (
                            // 3박스 이상 + 펩시 포함 시 실제 할인가 표시
                            <span className="text-red-600 font-bold text-base">
                              ✅ 박스당 {perBoxPrice.toLocaleString()}원
                            </span>
                          ) : (
                            // 조건 미충족 시 궁금증 유발 문구
                            <div>
                              <span className="text-blue-600 font-bold text-sm">
                                🎁 3박스(교차가능) 담으면 +1 증정!
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                └ 담아서 내 혜택가 확인하기
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {product.category === 'WATER' ? (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">물량지원 대상 아님</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">물량지원 대상</span>
                        )}
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
                <span>3+1 대상 수량</span>
                <span className="font-bold">{totalPaidBoxes} 박스</span>
              </div>
              {totalAllBoxes - totalPaidBoxes > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>생수 (3+1 제외)</span>
                  <span className="font-medium">{totalAllBoxes - totalPaidBoxes} 박스</span>
                </div>
              )}
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
	                <div>
	                  <div className="text-sm font-bold text-green-800">🎁 서비스 상품 (자동선택)</div>
	                  <div className="text-xs text-green-600 mt-1">
	                    {products.find(p => p.id === serviceItem)?.name} × {serviceBoxesCount}
	                  </div>
	                </div>
	              </div>
	            )}

            <div className="mb-6 pt-4 border-t">
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-600">총 결제금액</span>
                <span className="text-2xl font-extrabold text-blue-700">{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="text-right">
                {serviceBoxesCount > 0 && (
                  <>
                    <div className="text-xs text-gray-500">3+1 적용: {totalPaidBoxes + serviceBoxesCount}박스</div>
                    <div className="text-sm text-green-600 font-bold">🎉 {discountRate}% 할인 적용!</div>
                  </>
                )}
                {totalAllBoxes - totalPaidBoxes > 0 && (
                  <div className="text-xs text-gray-400 mt-1">+ 생수 {totalAllBoxes - totalPaidBoxes}박스 (별도)</div>
                )}
              </div>
	            </div>

	            {/* Apron auto-application info */}
	            <div className="mb-4 bg-orange-50 p-3 rounded border border-orange-200 text-xs">
	              <div className="font-bold text-orange-800 mb-1">{'\uc55e\uce58\ub9c8 \ud61c\ud0dd'}</div>
	              <p className="text-orange-700">
	                {'1\uac1c \uc0ac\uc5c5\uc790 \uae30\uc900, \ucd5c\ucd08 \uc8fc\ubb38 1\ud68c\uc5d0 \ud55c\ud574 \uc55e\uce58\ub9c8 5\uc7a5\uc774 \uc790\ub3d9 \uc2e0\uccad\ub429\ub2c8\ub2e4.'}
	              </p>
	              {willAutoApron && (
	                <p className="mt-1 font-semibold">
	                  {'\u279c \uc774\ubc88 \uc8fc\ubb38\uc740 \ucd5c\ucd08 \uc8fc\ubb38\uc73c\ub85c \ud655\uc778\ub418\uc5b4, \uc55e\uce58\ub9c8 5\uc7a5\uc774 \uc790\ub3d9 \uc2e0\uccad\ub429\ub2c8\ub2e4.'}
	                </p>
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
	                placeholder="사업자등록번호 (예: 123-45-67890)"
	                required
	                className="w-full p-2 border rounded text-sm"
	                value={formData.businessNumber}
	                onChange={handleBusinessNumberChange}
	              />
              <input
                type="text"
                placeholder="연락처"
                required
                className="w-full p-2 border rounded text-sm"
                value={formData.phone}
	                onChange={handlePhoneChange}
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
