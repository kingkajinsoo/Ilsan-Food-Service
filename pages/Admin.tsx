import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, ApronRequest, UserProfile, Product } from '../types';
import { useNavigate } from 'react-router-dom';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'aprons' | 'users' | 'products'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [aprons, setAprons] = useState<ApronRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // --- Filtering States ---

  // 1. Order Filters
  const [orderDateStart, setOrderDateStart] = useState('');
  const [orderDateEnd, setOrderDateEnd] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('ALL');
  const [orderSearchKeyword, setOrderSearchKeyword] = useState('');

  // 2. Apron Filters
  const [apronDateStart, setApronDateStart] = useState('');
  const [apronDateEnd, setApronDateEnd] = useState('');
  const [apronStatusFilter, setApronStatusFilter] = useState<'ALL' | 'pending' | 'completed'>('ALL');
  const [apronSearchKeyword, setApronSearchKeyword] = useState('');

  // 3. User Filters
  const [userSearchKeyword, setUserSearchKeyword] = useState('');

  // 4. Product Filters
  const [productCategoryFilter, setProductCategoryFilter] = useState<'ALL' | 'CAN' | 'BOTTLE' | 'WATER'>('ALL');
  const [productPepsiFilter, setProductPepsiFilter] = useState<'ALL' | 'PEPSI_ONLY'>('ALL');
  const [productSearchKeyword, setProductSearchKeyword] = useState('');

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    category: 'CAN',
    image: '',
    is_pepsi_family: false
  });

  useEffect(() => {
    // Set default date range (this month)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    setOrderDateStart(lastMonthStr);
    setOrderDateEnd(todayStr);
    setApronDateStart(lastMonthStr);
    setApronDateEnd(todayStr);

    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('관리자 로그인이 필요합니다.');
      navigate('/');
      return;
    }

    const { data: user } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (!user || user.role !== 'admin') {
      alert('관리자 권한이 없습니다.');
      navigate('/');
      return;
    }

    try {
      await Promise.all([fetchOrders(), fetchAprons(), fetchUsers(), fetchProducts()]);
    } catch (e) {
      console.error("Error fetching admin data", e);
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, users(name, business_name, phone)')
      .order('created_at', { ascending: false });

    if (error) console.error('Orders error:', error);
    if (data) {
      const formatted = data.map((o: any) => ({
        ...o,
        user_name: o.users?.name,
        business_name: o.business_name || o.users?.business_name,
        user_phone: o.users?.phone // Keep generic user phone for reference
      }));
      setOrders(formatted);
    }
  };

  const fetchAprons = async () => {
    const { data, error } = await supabase
      .from('apron_requests')
      .select('*, users(name, business_name)')
      .order('created_at', { ascending: false });

    if (error) console.error('Aprons error:', error);
    if (data) {
      const formatted = data.map((a: any) => ({
        ...a,
        user_name: a.users?.name,
        business_name: a.users?.business_name
      }));
      setAprons(formatted);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) console.error('Users error:', error);
    if (data) setUsers(data as UserProfile[]);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) console.error('Products error:', error);
    if (data) {
      const sortedProducts = (data as Product[]).sort((a, b) => {
        const aIsCider = a.name.includes('칠성사이다');
        const bIsCider = b.name.includes('칠성사이다');
        const aIsPepsi = a.name.includes('펩시');
        const bIsPepsi = b.name.includes('펩시');

        if (aIsCider && !bIsCider) return -1;
        if (!aIsCider && bIsCider) return 1;
        if (aIsPepsi && !bIsPepsi && !bIsCider) return -1;
        if (!aIsPepsi && bIsPepsi && !aIsCider) return 1;
        return a.name.localeCompare(b.name, 'ko');
      });
      setProducts(sortedProducts);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
  };

  const updateApronStatus = async (id: string, status: string) => {
    await supabase.from('apron_requests').update({ status }).eq('id', id);
    fetchAprons();
  };

  // Product CRUD
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const { error } = await supabase.from('products').update({
        name: productForm.name,
        price: productForm.price,
        category: productForm.category,
        image: productForm.image || null,
        is_pepsi_family: productForm.is_pepsi_family,
        updated_at: new Date().toISOString()
      }).eq('id', editingProduct.id);
      if (error) { alert('상품 수정 실패: ' + error.message); return; }
      alert('상품이 수정되었습니다.');
    } else {
      const { error } = await supabase.from('products').insert({
        name: productForm.name,
        price: productForm.price,
        category: productForm.category,
        image: productForm.image || null,
        is_pepsi_family: productForm.is_pepsi_family
      });
      if (error) { alert('상품 추가 실패: ' + error.message); return; }
      alert('상품이 추가되었습니다.');
    }
    setProductForm({ name: '', price: 0, category: 'CAN', image: '', is_pepsi_family: false });
    setEditingProduct(null);
    setShowProductForm(false);
    fetchProducts();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image || '',
      is_pepsi_family: product.is_pepsi_family
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('상품 삭제 실패: ' + error.message);
    else {
      alert('상품이 삭제되었습니다.');
      fetchProducts();
    }
  };

  const handleCancelProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({ name: '', price: 0, category: 'CAN', image: '', is_pepsi_family: false });
  };

  // --- Filtering Logic ---

  const getFilteredOrders = () => {
    return orders.filter(order => {
      // 1. Date Range
      const orderDate = order.created_at.split('T')[0];
      if (orderDateStart && orderDate < orderDateStart) return false;
      if (orderDateEnd && orderDate > orderDateEnd) return false;

      // 2. Status
      if (orderStatusFilter !== 'ALL' && order.status !== orderStatusFilter) return false;

      // 3. Keyword Search (Business Name, User Name, Phone, Address)
      if (orderSearchKeyword) {
        const keyword = orderSearchKeyword.toLowerCase();
        const businessName = (order as any).business_name?.toLowerCase() || '';
        const userName = (order as any).user_name?.toLowerCase() || '';
        const address = ((order as any).delivery_address || '').toLowerCase();
        const phone = (order as any).phone?.replace(/-/g, '') || '';
        const userPhone = (order as any).user_phone?.replace(/-/g, '') || '';
        const searchPhone = keyword.replace(/-/g, '');

        if (!businessName.includes(keyword) &&
          !userName.includes(keyword) &&
          !address.includes(keyword) &&
          !phone.includes(searchPhone) &&
          !userPhone.includes(searchPhone)) {
          return false;
        }
      }
      return true;
    });
  };

  const getFilteredAprons = () => {
    return aprons.filter(apron => {
      // 1. Date Range
      const apronDate = apron.created_at.split('T')[0];
      if (apronDateStart && apronDate < apronDateStart) return false;
      if (apronDateEnd && apronDate > apronDateEnd) return false;

      // 2. Status
      if (apronStatusFilter !== 'ALL' && apron.status !== apronStatusFilter) return false;

      // 3. Keyword Search
      if (apronSearchKeyword) {
        const keyword = apronSearchKeyword.toLowerCase();
        const businessName = (apron as any).business_name?.toLowerCase() || '';
        const userName = (apron as any).user_name?.toLowerCase() || '';

        if (!businessName.includes(keyword) && !userName.includes(keyword)) return false;
      }
      return true;
    });
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      if (!userSearchKeyword) return true;
      const keyword = userSearchKeyword.toLowerCase();

      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const businessName = user.business_name?.toLowerCase() || '';
      const phone = user.phone?.replace(/-/g, '') || '';
      const businessNumber = user.business_number?.replace(/-/g, '') || '';
      const searchNumber = keyword.replace(/-/g, '');

      return name.includes(keyword) ||
        email.includes(keyword) ||
        businessName.includes(keyword) ||
        phone.includes(searchNumber) ||
        businessNumber.includes(searchNumber);
    });
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      // 1. Category
      if (productCategoryFilter !== 'ALL' && product.category !== productCategoryFilter) return false;

      // 2. Pepsi Family
      if (productPepsiFilter === 'PEPSI_ONLY' && !product.is_pepsi_family) return false;

      // 3. Keyword
      if (productSearchKeyword) {
        if (!product.name.toLowerCase().includes(productSearchKeyword.toLowerCase())) return false;
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();
  const filteredAprons = getFilteredAprons();
  const filteredUsers = getFilteredUsers();
  const filteredProducts = getFilteredProducts();

  if (loading) return <div className="p-8 text-center bg-gray-100 min-h-screen pt-20">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">관리자 대시보드</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500">총 주문 건수</p>
            <p className="text-3xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
            <p className="text-gray-500">대기중 앞치마 신청</p>
            <p className="text-3xl font-bold">{aprons.filter(a => a.status === 'pending').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500">총 회원 수</p>
            <p className="text-3xl font-bold">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500">등록 상품 수</p>
            <p className="text-3xl font-bold">{products.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {['orders', 'aprons', 'users', 'products'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 font-medium whitespace-nowrap transition-colors ${activeTab === tab
                    ? `bg-${tab === 'orders' ? 'blue' : tab === 'aprons' ? 'orange' : tab === 'users' ? 'green' : 'purple'}-50 text-${tab === 'orders' ? 'blue' : tab === 'aprons' ? 'orange' : tab === 'users' ? 'green' : 'purple'}-600 border-b-2 border-${tab === 'orders' ? 'blue' : tab === 'aprons' ? 'orange' : tab === 'users' ? 'green' : 'purple'}-600`
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab === 'orders' && '주문 관리'}
                {tab === 'aprons' && '앞치마 신청'}
                {tab === 'users' && '회원 목록'}
                {tab === 'products' && '상품 관리'}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* 1. ORDER MANAGEMENT */}
            {activeTab === 'orders' && (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                  {/* Date Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">기간 조회</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={orderDateStart}
                        onChange={(e) => setOrderDateStart(e.target.value)}
                        className="p-2 border rounded text-sm"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="date"
                        value={orderDateEnd}
                        onChange={(e) => setOrderDateEnd(e.target.value)}
                        className="p-2 border rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">상태 필터</label>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                      className="p-2 border rounded text-sm w-32"
                    >
                      <option value="ALL">전체</option>
                      <option value="pending">접수대기</option>
                      <option value="confirmed">주문확정</option>
                      <option value="delivered">배송완료</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">통합 검색 (업소명, 주문자, 연락처)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={orderSearchKeyword}
                        onChange={(e) => setOrderSearchKeyword(e.target.value)}
                        placeholder="검색어를 입력하세요..."
                        className="w-full p-2 pl-8 border rounded text-sm"
                      />
                      <i className="fa-solid fa-search absolute left-2.5 top-2.5 text-gray-400"></i>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => {
                      setOrderSearchKeyword('');
                      setOrderStatusFilter('ALL');
                      const today = new Date();
                      const lastMonth = new Date();
                      lastMonth.setMonth(today.getMonth() - 1);
                      setOrderDateStart(lastMonth.toISOString().split('T')[0]);
                      setOrderDateEnd(today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 text-sm"
                  >
                    초기화
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업소명</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문내역</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">검색 결과가 없습니다.</td></tr>
                      ) : (
                        filteredOrders.map(order => (
                          <React.Fragment key={order.id}>
                            <tr
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <i className={`fa-solid fa-chevron-${expandedOrderId === order.id ? 'down' : 'right'} text-gray-400`}></i>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {(order as any).business_name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {order.items.map((i: any) => `${i.productName}`).join(', ')}
                                {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.total_boxes}박스
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className={`text-sm rounded-full px-3 py-1 font-semibold border-none focus:ring-2 focus:ring-blue-500 ${order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}
                                >
                                  <option value="pending">접수대기</option>
                                  <option value="confirmed">주문확정</option>
                                  <option value="delivered">배송완료</option>
                                  <option value="cancelled">취소</option>
                                </select>
                              </td>
                            </tr>
                            {expandedOrderId === order.id && (
                              <tr className="bg-gray-50">
                                <td colSpan={6} className="px-6 py-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    {/* Order Details */}
                                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                      <h4 className="font-bold text-gray-800 mb-4 pb-2 border-b flex items-center">
                                        <i className="fa-solid fa-cart-shopping mr-2 text-blue-600"></i>주문 상세
                                      </h4>
                                      <div className="space-y-3">
                                        {order.items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{item.productName}</span>
                                            <span className="font-medium">{item.quantity}박스 × {item.price.toLocaleString()}원</span>
                                          </div>
                                        ))}
                                        {order.service_items && order.service_items.length > 0 && (
                                          <div className="bg-blue-50 p-3 rounded mt-2">
                                            <p className="text-xs text-blue-700 font-bold mb-2">🎁 서비스 상품 (3+1)</p>
                                            {order.service_items.map((item: any, idx: number) => (
                                              <div key={idx} className="flex justify-between text-sm text-blue-600">
                                                <span>{item.productName}</span>
                                                <span>{item.quantity}박스</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <div className="border-t pt-3 mt-2 flex justify-between items-center">
                                          <span className="font-bold text-gray-700">총 합계</span>
                                          <div className="text-right">
                                            <div className="text-xl font-bold text-blue-600">{order.total_amount.toLocaleString()}원</div>
                                            <div className="text-xs text-gray-500">총 {order.total_boxes}박스</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Delivery Info */}
                                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                      <h4 className="font-bold text-gray-800 mb-4 pb-2 border-b flex items-center">
                                        <i className="fa-solid fa-truck mr-2 text-green-600"></i>배송 정보
                                      </h4>
                                      <div className="space-y-4 text-sm">
                                        <div>
                                          <span className="block text-xs text-gray-500 mb-1">업소명 / 사업자번호</span>
                                          <div className="font-medium text-gray-900">
                                            {(order as any).business_name}
                                            <span className="text-gray-400 font-normal ml-2">
                                              {(order as any).business_number ? (order as any).business_number : '(미등록)'}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <span className="block text-xs text-gray-500 mb-1">연락처</span>
                                          <div className="font-medium text-gray-900">{(order as any).phone || (order as any).user_phone || '-'}</div>
                                        </div>
                                        <div>
                                          <span className="block text-xs text-gray-500 mb-1">배송지</span>
                                          <div className="font-medium text-gray-900 leading-relaxed">
                                            {(order as any).delivery_address}
                                            {(order as any).detail_address && <span className="block text-gray-600">{(order as any).detail_address}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. APRON REQUESTS */}
            {activeTab === 'aprons' && (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                  {/* Date Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">기간 조회</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={apronDateStart}
                        onChange={(e) => setApronDateStart(e.target.value)}
                        className="p-2 border rounded text-sm"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="date"
                        value={apronDateEnd}
                        onChange={(e) => setApronDateEnd(e.target.value)}
                        className="p-2 border rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">상태 필터</label>
                    <select
                      value={apronStatusFilter}
                      onChange={(e) => setApronStatusFilter(e.target.value as any)}
                      className="p-2 border rounded text-sm w-32"
                    >
                      <option value="ALL">전체</option>
                      <option value="pending">접수</option>
                      <option value="completed">발송완료</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">통합 검색 (업소명, 신청자)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={apronSearchKeyword}
                        onChange={(e) => setApronSearchKeyword(e.target.value)}
                        placeholder="검색어를 입력하세요..."
                        className="w-full p-2 pl-8 border rounded text-sm"
                      />
                      <i className="fa-solid fa-search absolute left-2.5 top-2.5 text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업소명</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">신청수량</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAprons.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">검색 결과가 없습니다.</td></tr>
                      ) : (
                        filteredAprons.map(req => (
                          <tr key={req.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(req.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {(req as any).business_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {req.quantity}장
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={req.status}
                                onChange={(e) => updateApronStatus(req.id, e.target.value)}
                                className={`text-sm rounded-full px-3 py-1 font-semibold border-none focus:ring-2 focus:ring-orange-500 ${req.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                                <option value="pending">접수</option>
                                <option value="completed">발송완료</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. USER LIST */}
            {activeTab === 'users' && (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                  {/* Search */}
                  <div className="flex-1 min-w-[300px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">회원 검색 (이름, 업소명, 연락처, 이메일, 사업자번호)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearchKeyword}
                        onChange={(e) => setUserSearchKeyword(e.target.value)}
                        placeholder="검색어를 입력하세요..."
                        className="w-full p-2 pl-8 border rounded text-sm"
                      />
                      <i className="fa-solid fa-search absolute left-2.5 top-2.5 text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업소명 / 사업자번호</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">연락처 / 이메일</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">검색 결과가 없습니다.</td></tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {u.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="font-semibold text-gray-700">{u.business_name || '-'}</div>
                              <div className="text-xs">{u.business_number ? u.business_number.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="text-gray-900">{u.phone ? u.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}</div>
                              <div className="text-xs text-gray-400">{u.email || '-'}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. PRODUCT MANAGEMENT */}
            {activeTab === 'products' && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">상품 목록</h2>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors"
                  >
                    + 상품 추가
                  </button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value as any)}
                      className="p-2 border rounded text-sm min-w-[100px]"
                    >
                      <option value="ALL">전체</option>
                      <option value="CAN">캔</option>
                      <option value="BOTTLE">페트병</option>
                      <option value="WATER">생수</option>
                    </select>
                  </div>

                  {/* Pepsi Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">제품군</label>
                    <select
                      value={productPepsiFilter}
                      onChange={(e) => setProductPepsiFilter(e.target.value as any)}
                      className="p-2 border rounded text-sm min-w-[120px]"
                    >
                      <option value="ALL">전체</option>
                      <option value="PEPSI_ONLY">펩시 제품만</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">상품 검색</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearchKeyword}
                        onChange={(e) => setProductSearchKeyword(e.target.value)}
                        placeholder="상품명 검색..."
                        className="w-full p-2 pl-8 border rounded text-sm"
                      />
                      <i className="fa-solid fa-search absolute left-2.5 top-2.5 text-gray-400"></i>
                    </div>
                  </div>
                </div>

                {showProductForm && (
                  <div className="mb-6 bg-purple-50 p-6 rounded-lg border border-purple-200 animate-slide-in">
                    <h3 className="text-lg font-bold mb-4 text-purple-800">{editingProduct ? '상품 수정' : '새 상품 추가'}</h3>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">상품명 *</label>
                          <input
                            type="text"
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="예: 펩시콜라 업소용 355ml (24캔)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원) *</label>
                          <input
                            type="number"
                            required
                            value={productForm.price}
                            onChange={(e) => setProductForm({ ...productForm, price: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="17000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
                          <select
                            required
                            value={productForm.category}
                            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                          >
                            <option value="CAN">🥫 캔</option>
                            <option value="BOTTLE">🍾 페트병</option>
                            <option value="WATER">💧 생수</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
                          <input
                            type="text"
                            value={productForm.image}
                            onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isPepsiFamily"
                          checked={productForm.is_pepsi_family}
                          onChange={(e) => setProductForm({ ...productForm, is_pepsi_family: e.target.checked })}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="isPepsiFamily" className="ml-2 text-sm font-medium text-gray-700">
                          펩시 제품군 (3+1 프로모션 대상)
                        </label>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={handleCancelProductForm}
                          className="bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors shadow-sm"
                        >
                          {editingProduct ? '수정 저장' : '상품 등록'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이미지</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가격</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">분류</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">관리</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        {products.length === 0 ? '등록된 상품이 없습니다.' : '검색 결과가 없습니다.'}
                      </td></tr>
                    ) : (
                      filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded border border-gray-200" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.price.toLocaleString()}원
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category === 'CAN' ? '🥫 캔' : product.category === 'BOTTLE' ? '🍾 페트병' : '💧 생수'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {product.is_pepsi_family ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">펩시</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">일반</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
