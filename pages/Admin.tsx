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
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    // 1. Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('관리자 로그인이 필요합니다.');
      navigate('/');
      return;
    }

    // 2. Check Admin Role
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
    // Select business_name specifically from orders table as well
    const { data, error } = await supabase
      .from('orders')
      .select('*, users(name, business_name)')
      .order('created_at', { ascending: false });

    if (error) console.error('Orders error:', error);

    if (data) {
      const formatted = data.map((o: any) => ({
        ...o,
        user_name: o.users?.name,
        // Prioritize snapshot (o.business_name) -> Fallback to current profile (o.users.business_name)
        business_name: o.business_name || o.users?.business_name
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
      // Custom sort: 칠성사이다 → 펩시 → 기타
      const sortedProducts = (data as Product[]).sort((a, b) => {
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

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProduct) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update({
          name: productForm.name,
          price: productForm.price,
          category: productForm.category,
          image: productForm.image || null,
          is_pepsi_family: productForm.is_pepsi_family,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id);

      if (error) {
        alert('상품 수정 실패: ' + error.message);
        return;
      }
      alert('상품이 수정되었습니다.');
    } else {
      // Create new product
      const { error } = await supabase.from('products').insert({
        name: productForm.name,
        price: productForm.price,
        category: productForm.category,
        image: productForm.image || null,
        is_pepsi_family: productForm.is_pepsi_family
      });

      if (error) {
        alert('상품 추가 실패: ' + error.message);
        return;
      }
      alert('상품이 추가되었습니다.');
    }

    // Reset form
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

    if (error) {
      alert('상품 삭제 실패: ' + error.message);
      return;
    }

    alert('상품이 삭제되었습니다.');
    fetchProducts();
  };

  const handleCancelProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({ name: '', price: 0, category: 'CAN', image: '', is_pepsi_family: false });
  };

  if (loading) return <div className="p-8 text-center">Loading Admin Dashboard...</div>;

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
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-4 font-medium whitespace-nowrap ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              주문 관리
            </button>
            <button
              onClick={() => setActiveTab('aprons')}
              className={`flex-1 py-4 font-medium whitespace-nowrap ${activeTab === 'aprons' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              앞치마 신청
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-4 font-medium whitespace-nowrap ${activeTab === 'users' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              회원 목록
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-4 font-medium whitespace-nowrap ${activeTab === 'products' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              상품 관리
            </button>
          </div>

          <div className="p-6 overflow-x-auto">
            {activeTab === 'orders' && (
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
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">주문 내역이 없습니다.</td></tr>
                  ) : (
                    orders.map(order => (
                      <React.Fragment key={order.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <i className={`fa-solid fa-chevron-${expandedOrderId === order.id ? 'down' : 'right'} text-gray-400`}></i>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.business_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {order.items.map((i: any) => `${i.productName} (${i.quantity})`).join(', ')}
                            {order.service_items && order.service_items.length > 0 &&
                              <span className="text-blue-600 ml-2">+ 서비스</span>
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.total_boxes}박스
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className={`text-sm rounded-full px-3 py-1 font-semibold ${order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                              <option value="pending">접수대기</option>
                              <option value="confirmed">확인완료</option>
                              <option value="delivered">배송완료</option>
                              <option value="cancelled">취소</option>
                            </select>
                          </td>
                        </tr>
                        {expandedOrderId === order.id && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 주문 상품 상세 */}
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <i className="fa-solid fa-box mr-2 text-blue-600"></i>주문 상품
                                  </h4>
                                  <div className="space-y-2">
                                    {order.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-sm border-b pb-2">
                                        <span className="text-gray-700">{item.productName}</span>
                                        <span className="text-gray-900 font-medium">{item.quantity}박스 × {item.price.toLocaleString()}원</span>
                                      </div>
                                    ))}
                                    {order.service_items && order.service_items.length > 0 && (
                                      <>
                                        <div className="border-t pt-2 mt-2">
                                          <p className="text-xs text-blue-600 font-semibold mb-2">
                                            <i className="fa-solid fa-gift mr-1"></i>서비스 상품 (무료)
                                          </p>
                                        </div>
                                        {order.service_items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-blue-600">{item.productName}</span>
                                            <span className="text-blue-600 font-medium">{item.quantity}박스 (무료)</span>
                                          </div>
                                        ))}
                                      </>
                                    )}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                      <span>총 수량</span>
                                      <span className="text-blue-600">{order.total_boxes}박스</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 배송 및 연락처 정보 */}
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <i className="fa-solid fa-truck mr-2 text-green-600"></i>배송 정보
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-gray-500 text-xs mb-1">업소명</p>
                                      <p className="text-gray-900 font-medium">{order.business_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs mb-1">배송지 주소</p>
                                      <p className="text-gray-900">{order.delivery_address}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs mb-1">연락처</p>
                                      <p className="text-gray-900">{order.phone || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs mb-1">사업자등록번호</p>
                                      <p className="text-gray-900">{order.business_number || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs mb-1">주문 시간</p>
                                      <p className="text-gray-900">
                                        {new Date(order.created_at).toLocaleString('ko-KR', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )))}
                </tbody>
              </table>
            )}

            {activeTab === 'aprons' && (
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
                  {aprons.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">앞치마 신청 내역이 없습니다.</td></tr>
                  ) : (
                    aprons.map(req => (
                      <tr key={req.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {req.business_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {req.quantity}장
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={req.status}
                            onChange={(e) => updateApronStatus(req.id, e.target.value)}
                            className={`text-sm rounded-full px-3 py-1 font-semibold ${req.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            <option value="pending">접수</option>
                            <option value="completed">발송완료</option>
                          </select>
                        </td>
                      </tr>
                    )))}
                </tbody>
              </table>
            )}

            {activeTab === 'users' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업소명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사업자번호</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">연락처</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">회원 내역이 없습니다.</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {u.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {u.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.business_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.business_number ? u.business_number.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {u.phone ? u.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}
                        </td>
                      </tr>
                    )))}
                </tbody>
              </table>
            )}

            {activeTab === 'products' && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">상품 목록</h2>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
                  >
                    + 상품 추가
                  </button>
                </div>

                {showProductForm && (
                  <div className="mb-6 bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-bold mb-4">{editingProduct ? '상품 수정' : '새 상품 추가'}</h3>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">상품명 *</label>
                          <input
                            type="text"
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="17000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
                          <select
                            required
                            value={productForm.category}
                            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                          className="mr-2"
                        />
                        <label htmlFor="isPepsiFamily" className="text-sm font-medium text-gray-700">
                          펩시 제품군 (3+1 프로모션 대상)
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium"
                        >
                          {editingProduct ? '수정하기' : '추가하기'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelProductForm}
                          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-medium"
                        >
                          취소
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">펩시제품</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">관리</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">등록된 상품이 없습니다.</td></tr>
                    ) : (
                      products.map(product => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
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
                            {product.category === 'CAN' ? '🥫 캔' : product.category === 'BOTTLE' ? '🍾 페트병' : product.category === 'WATER' ? '💧 생수' : product.category}
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
