import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, OrderItem, Product } from '../types';
import { useNavigate } from 'react-router-dom';

// Simple Modal Component
const Modal = ({ isOpen, title, message, onClose, type = 'info' }: {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onClose: () => void;
  type?: 'info' | 'error' | 'success';
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-fade-in">
        <div className={`text-xl font-bold mb-4 ${type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-gray-800'}`}>
          {type === 'success' && <i className="fa-solid fa-circle-check mr-2"></i>}
          {type === 'error' && <i className="fa-solid fa-circle-exclamation mr-2"></i>}
          {title}
        </div>
        <div className="text-gray-600 mb-6 whitespace-pre-wrap leading-relaxed">
          {message}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export const Order: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>(''); // Progress Log
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

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type: 'info' | 'error' | 'success';
    onCloseAction?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

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
    if (!(window as any).daum?.Postcode) {
      setModalState({
        isOpen: true,
        title: '오류',
        message: '주소 검색 서비스가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.',
        type: 'error'
      });
      return;
    }

    new (window as any).daum.Postcode({
      oncomplete: function (data: any) {
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
      // 1. Get current session first
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // 2. Check Expiry: Only refresh if expired or expiring in < 5 mins (300s)
        const expiresAt = session.expires_at;
        const nowSeconds = Math.floor(Date.now() / 1000);

        if (expiresAt && (expiresAt - nowSeconds < 300)) {
          console.log('Session expiring soon, refreshing...');
          try {
            const refreshPromise = supabase.auth.refreshSession();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
            const { data, error }: any = await Promise.race([refreshPromise, timeoutPromise]);

            if (error || !data.session) {
              throw new Error('Refresh failed');
            }
          } catch (e) {
            console.error('Session refresh failed:', e);
            alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            navigate('/');
            return;
          }
        }

        // 3. Valid Session - Load User Data
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
              console.error('Failed to check existing apron_requests for apron info', apronError);
            }

            const hasExistingApron = !!(apronData && apronData.length > 0);
            setWillAutoApron(isFirstOrder && !hasExistingApron);
          }
        } catch (e) {
          console.error('Failed to calculate apron auto-application info', e);
        }
      } else {
        // No session found
        navigate('/');
        return;
      }

      // Fetch products from database
      const { data: productsData, error: productsError } = await supabase.from('products').select('*');
      if (productsError) {
        console.error('Failed to load products:', productsError);
      }
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
    // 9자리 이상이면 끝 4자리 분리
    if (digits.length <= 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    return digits;
  };

  const handleBusinessNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = formatBizNumber(raw);
    setFormData(prev => ({
      ...prev,
      businessNumber: formatted,
    }));

    // 사업자번호 10자리 완성되면 월별 사용량 조회
    if (raw.length === 10) {
      const yearMonth = new Date().toISOString().slice(0, 7); // "2025-01"
      try {
        const { data, error } = await supabase
          .from('monthly_service_usage')
          .select('used_boxes')
          .eq('business_number', formatted)
          .eq('year_month', yearMonth)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          console.error('월별 사용량 조회 실패:', error);
        }
        setUsedServiceBoxesThisMonth(data?.used_boxes || 0);
      } catch (e) {
        console.error('월별 사용량 조회 실패:', e);
        setUsedServiceBoxesThisMonth(0);
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = formatPhoneNumber(raw);
    setFormData(prev => ({
      ...prev,
      phone: formatted,
    }));

    // iOS Autofill workaround checks checked during submit
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

  // Validation Check Variables
  const bizNumRaw = formData.businessNumber.replace(/\D/g, '');
  const isBizNumValid = bizNumRaw.length === 10;

  const phoneRaw = formData.phone.replace(/\D/g, '');
  const isPhoneValid = phoneRaw.length >= 9;

  const isDetailAddressValid = formData.detailAddress.trim().length >= 2;

  // Order validation: 3박스 이상이면 펩시 필수!
  const isValidOrder = totalPaidBoxes > 0 &&
    (totalPaidBoxes >= 3 ? hasPepsi : true) && // 3박스 이상이면 펩시 필수
    (serviceBoxesCount > 0 ? !!serviceItem : true) &&
    formData.business_name &&
    isBizNumValid && // 사업자번호 10자리
    isPhoneValid && // 전화번호 9자리 이상
    formData.address &&
    isDetailAddressValid; // 상세주소 2글자 이상

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOrder || !user) return;

    setLoading(true);
    setProcessingStatus('로그인 연결 상태 확인 중...');

    // 0. Session Check & Force Refresh (Fix for Mobile Freeze)
    try {
      // Race: Refresh vs 5s Timeout (Prevent Infinite Hang)
      const refreshPromise = supabase.auth.refreshSession();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));

      const { data, error }: any = await Promise.race([refreshPromise, timeoutPromise]);

      if (error || !data?.session) {
        throw new Error('Session invalid');
      }
    } catch (e) {
      console.error('Session validation failed:', e);
      setLoading(false);
      setModalState({
        isOpen: true,
        title: '로그인 만료',
        message: '로그인 연결이 끊어졌습니다.\n보안을 위해 다시 로그인해주세요.',
        type: 'error',
        onCloseAction: () => {
          navigate('/'); // Go back to login
        }
      });
      return;
    }

    setProcessingStatus('주문 처리를 시작합니다...');

    // Safety Timeout Promise (모바일 환경에서는 타임아웃 시간 늘림)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const timeoutMs = isMobile ? 30000 : 15000;

    const mainTimeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('서버 응답이 지연되고 있습니다. 네트워크 연결을 확인해주세요.')),
        timeoutMs
      )
    );

    // Business Logic Promise
    const orderPromise = (async () => {
      // 1. Apron Check
      setProcessingStatus('1/5. 앞치마 혜택 확인 중...');
      let shouldCreateApron = false;

      const { data: existingOrders, error: orderCheckError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (orderCheckError) {
        console.error('Failed to check existing orders', orderCheckError);
      } else {
        const isFirstOrder = !existingOrders || existingOrders.length === 0;

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

      // 1. Prepare Items
      const orderItems: OrderItem[] = Object.entries(cart).map(([pid, qty]) => {
        const quantity = qty as number;
        const p = products.find(prod => prod.id === pid)!;
        return {
          productId: pid,
          productName: p.name,
          quantity,
          price: p.price,
        };
      });

      let serviceItemsList: OrderItem[] = [];
      if (serviceBoxesCount > 0 && serviceItem) {
        const p = products.find(prod => prod.id === serviceItem);
        if (p) {
          serviceItemsList.push({
            productId: p.id,
            productName: `[서비스] ${p.name}`,
            quantity: serviceBoxesCount,
            price: 0,
          });
        }
      }

      // 2. 회원 정보 업데이트
      setProcessingStatus('2/5. 회원 정보 업데이트 중...');
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
        const { error: userUpdateError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', user.id);
        if (userUpdateError) {
          console.error('Failed to update user info:', userUpdateError);
          // 주문 자체는 계속 진행
        }
      }

      // 3. 주문 INSERT (핵심)
      setProcessingStatus('3/5. 주문 정보 저장 중...');
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
        status: 'pending',
      });

      if (error) {
        throw error;
      }

      // 4. 월별 무료 박스 사용량 업데이트
      if (serviceBoxesCount > 0) {
        setProcessingStatus('4/5. 프로모션 혜택 적용 중...');
        const yearMonth = new Date().toISOString().slice(0, 7);
        const newUsedBoxes = usedServiceBoxesThisMonth + serviceBoxesCount;

        const { error: usageError } = await supabase
          .from('monthly_service_usage')
          .upsert(
            {
              business_number: formData.businessNumber,
              year_month: yearMonth,
              used_boxes: newUsedBoxes,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'business_number,year_month',
            }
          );

        if (usageError) {
          console.error('월별 사용량 업데이트 실패:', usageError);
        }
      }

      // 5. 앞치마 자동 신청
      if (shouldCreateApron) {
        setProcessingStatus('5/5. 앞치마 신청 접수 중...');
        const { error: apronInsertError } = await supabase.from('apron_requests').insert({
          user_id: user.id,
          quantity: 5,
          status: 'pending',
        });
        if (apronInsertError) {
          console.error('앞치마 자동 신청 실패:', apronInsertError);
        }
      }

      return { shouldCreateApron };
    })();

    try {
      const result = await Promise.race([orderPromise, mainTimeoutPromise]) as { shouldCreateApron: boolean };

      setProcessingStatus('완료!');
      setModalState({
        isOpen: true,
        title: '주문 접수 완료',
        message: result.shouldCreateApron
          ? '주문이 성공적으로 접수되었습니다!\n앞치마 5장 자동 신청이 완료되었습니다. (관리자 확인 후 발송)'
          : '주문이 성공적으로 접수되었습니다!\n관리자 확인 후 연락드립니다.',
        type: 'success',
        onCloseAction: () => {
          setCart({});
          setServiceItem('');
          setUsedServiceBoxesThisMonth(prev => prev + serviceBoxesCount);
          navigate('/');
        },
      });

    } catch (err: any) {
      console.error(err);
      setModalState({
        isOpen: true,
        title: '주문 실패',
        message: (
          <div className="text-left">
            <p className="mb-2 font-bold">주문 처리 중 오류가 발생했습니다.</p>
            <p className="mb-2 text-sm text-gray-600">다시 시도해 주세요.</p>
            <div className="bg-gray-100 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
              <p className="text-red-600 font-bold mb-1">Error: {err.message || 'Unknown'}</p>
            </div>
          </div>
        ),
        type: 'error',
      });
    } finally {
      setLoading(false);
      setProcessingStatus('');
    }
  };

  const handleModalClose = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (modalState.onCloseAction) {
      modalState.onCloseAction();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Modal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onClose={handleModalClose}
        type={modalState.type}
      />
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">상품 주문하기</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left: Product List */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm mb-4">
            <h4 className="font-bold text-blue-800 mb-1"><i className="fa-solid fa-circle-info mr-2"></i>3+1 행사 안내</h4>
            <p>총 3박스 주문 시마다 서비스 음료 1박스를 드립니다.</p>
            <p className="text-red-500 font-semibold">* 단, 주문 목록에 펩시(콜라/제로) 제품이 1박스 이상 포함되어야 합니다.</p>
            <p className="text-xs text-gray-600 mt-2">* 신규(롯데칠성음료 고양지점 첫 거래) 1개 사업자당<br />월 최대 10박스까지 한정기간동안 무료 혜택이 적용됩니다.</p>
            <p className="text-xs text-gray-500 mt-1">* 이 프로모션은 일정 기간에만 제공됩니다. (당 지부의 사정에 따라 조기 종료될 수 있습니다.)</p>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${activeCategory === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                }`}
            >
              전체
            </button>
            <button
              onClick={() => setActiveCategory('CAN')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${activeCategory === 'CAN'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                }`}
            >
              🥫 캔
            </button>
            <button
              onClick={() => setActiveCategory('BOTTLE')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${activeCategory === 'BOTTLE'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                }`}
            >
              🍾 페트병
            </button>
            <button
              onClick={() => setActiveCategory('WATER')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${activeCategory === 'WATER'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
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
                  <div key={product.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-start space-x-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-[77px] h-[77px] object-cover rounded bg-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-[77px] h-[77px] bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                          No Image
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                          {/* 상품 정보 */}
                          <div className="flex-1">
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
                                <span className="text-blue-600 font-bold text-sm">
                                  🎁 3박스(교차가능) 담으면 +1 증정!
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  └ 담아서 내 혜택가 확인하기
                                </p>
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
                          {/* 수량 조절 버튼 - 모바일: 아래, 태블릿/PC: 오른쪽 */}
                          <div className="flex items-center space-x-3 bg-gray-50 p-1 rounded-lg mt-3 md:mt-0 md:ml-3 self-start">
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
                      </div>
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
              {/* 월별 무료 박스 잔량 표시 */}
              <div className="bg-purple-50 border border-purple-200 p-2 rounded mt-2">
                <div className="flex justify-between text-purple-700 text-xs">
                  <span>이달 무료 박스 사용</span>
                  <span className="font-bold">{usedServiceBoxesThisMonth} / 10 박스</span>
                </div>
                <div className="flex justify-between text-purple-600 text-xs mt-1">
                  <span>남은 무료 박스</span>
                  <span className="font-bold">{Math.max(0, 10 - usedServiceBoxesThisMonth)} 박스</span>
                </div>
                {10 - usedServiceBoxesThisMonth <= 0 && (
                  <p className="text-red-500 text-xs mt-1 font-bold">⚠️ 이달 무료 박스 소진!</p>
                )}
              </div>

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

            {/* Apron auto-application info - 최초 주문 시에만 표시 */}
            {willAutoApron && (
              <div className="mb-4 bg-orange-50 p-3 rounded border border-orange-200 text-xs">
                <div className="font-bold text-orange-800 mb-1">🎽 앞치마 혜택</div>
                <p className="text-orange-700">
                  1개 사업자 기준, 최초 주문 1회에 한해 앞치마 5장이 자동 신청됩니다.
                </p>
                <p className="mt-1 font-semibold text-orange-800">
                  ➜ 이번 주문은 최초 주문으로 확인되어, 앞치마 5장이 자동 신청됩니다.
                </p>
              </div>
            )}

            {/* User Info Form */}
            <div className="space-y-4 mb-6">

              {/* 업소명 */}
              <div>
                <input
                  type="text"
                  placeholder="업소명 (상호)"
                  required
                  className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>

              {/* 사업자등록번호 */}
              <div>
                <input
                  type="text"
                  placeholder="사업자등록번호 (10자리 입력)"
                  maxLength={12}
                  required
                  className={`w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.businessNumber.replace(/\D/g, '').length === 10 ? 'border-green-500 bg-green-50' :
                    formData.businessNumber.length > 0 ? 'border-red-300 bg-red-50' : ''
                    }`}
                  value={formData.businessNumber}
                  onChange={handleBusinessNumberChange}
                />
                {formData.businessNumber.length > 0 && formData.businessNumber.replace(/\D/g, '').length !== 10 && (
                  <p className="text-red-500 text-xs mt-1 font-bold">⚠️ 사업자번호 10자리를 모두 입력해주세요.</p>
                )}
                {formData.businessNumber.replace(/\D/g, '').length === 10 && (
                  <p className="text-green-600 text-xs mt-1 font-bold">✅ 올바른 형식입니다.</p>
                )}
              </div>

              {/* 전화번호 */}
              <div>
                <input
                  type="text"
                  placeholder="연락처 (번호만 입력)"
                  maxLength={13}
                  required
                  className={`w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.phone.replace(/\D/g, '').length >= 9 ? 'border-green-500 bg-green-50' :
                    formData.phone.length > 0 ? 'border-red-300 bg-red-50' : ''
                    }`}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                />
                {formData.phone.length > 0 && formData.phone.replace(/\D/g, '').length < 9 && (
                  <p className="text-red-500 text-xs mt-1 font-bold">⚠️ 연락처를 정확히 입력해주세요 (9자리 이상).</p>
                )}
                {formData.phone.replace(/\D/g, '').length >= 9 && (
                  <p className="text-green-600 text-xs mt-1 font-bold">✅ 확인되었습니다.</p>
                )}
              </div>

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
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="상세주소 (2글자 이상 입력, 예: 1층)"
                      className={`w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formData.detailAddress.trim().length >= 2 ? 'border-green-500 bg-green-50' :
                        formData.detailAddress.length > 0 ? 'border-red-300 bg-red-50' : ''
                        }`}
                      value={formData.detailAddress}
                      onChange={(e) => setFormData({ ...formData, detailAddress: e.target.value })}
                    />
                    {formData.detailAddress.length > 0 && formData.detailAddress.trim().length < 2 && (
                      <p className="text-red-500 text-xs mt-1 font-bold">⚠️ 상세주소를 2글자 이상 입력해주세요.</p>
                    )}
                    {formData.detailAddress.trim().length >= 2 && (
                      <p className="text-green-600 text-xs mt-1 font-bold">✅ 확인되었습니다.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValidOrder || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors relative"
            >
              {loading ? (
                <span>주문 처리 중...<br /><span className="text-xs font-normal opacity-90 animate-pulse">{processingStatus}</span></span>
              ) : serviceBoxesCount > 0 ? (
                <>🎁 3+1 프로모션으로<br />주문하기</>
              ) : '주문하기'}
            </button>
            {totalPaidBoxes >= 3 && !hasPepsi && (
              <p className="text-red-500 text-xs text-center mt-2 font-bold">
                ⚠️ 펩시 제품 1박스 이상 필요합니다
              </p>
            )}
            {!isBizNumValid && formData.businessNumber.length > 0 && (
              <p className="text-red-500 text-xs text-center mt-1">※ 사업자번호 10자리를 확인해주세요.</p>
            )}
            {!isPhoneValid && formData.phone.length > 0 && (
              <p className="text-red-500 text-xs text-center mt-1">※ 연락처 형식을 확인해주세요.</p>
            )}
            {!isDetailAddressValid && formData.detailAddress.length > 0 && (
              <p className="text-red-500 text-xs text-center mt-1">※ 상세주소를 확인해주세요.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
