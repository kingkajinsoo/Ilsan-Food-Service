import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Order, UserProfile, UserAddress } from '../types';

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  // Profile editing states
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [editingBusinessNumber, setEditingBusinessNumber] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [businessNameValue, setBusinessNameValue] = useState('');
  const [businessNumberValue, setBusinessNumberValue] = useState('');

  // Address management states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ address: '', detail_address: '' });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/');
        return;
      }

      // 1) 사용자 프로필 조회
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && !profileError) {
        setUser(profile as UserProfile);
        setPhoneValue(profile.phone || '');
        setBusinessNameValue(profile.business_name || '');
        setBusinessNumberValue(profile.business_number || '');
      }

      // 2) 주소 목록 조회
      const { data: addressData, error: addressError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: false });

      if (!addressError && addressData) {
        setAddresses(addressData as UserAddress[]);
      }

      // 3) 주문 내역 조회
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!orderError && orderData) {
        setOrders(orderData as Order[]);
      }

      setLoading(false);
    };

    init();
  }, [navigate]);

  // Formatting helpers
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const formatBizNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // Profile update handlers
  const handlePhoneUpdate = async () => {
    if (!user) return;
    const digits = phoneValue.replace(/\D/g, '');
    const { error } = await supabase
      .from('users')
      .update({ phone: digits })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, phone: digits });
      setEditingPhone(false);
      alert('연락처가 수정되었습니다.');
    } else {
      alert('연락처 수정에 실패했습니다.');
    }
  };

  const handleBusinessNameUpdate = async () => {
    if (!user || user.business_name_updated) return;
    const { error } = await supabase
      .from('users')
      .update({ business_name: businessNameValue, business_name_updated: true })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, business_name: businessNameValue, business_name_updated: true });
      setEditingBusinessName(false);
      alert('상호명이 수정되었습니다. (1회 수정 완료)');
    } else {
      alert('상호명 수정에 실패했습니다.');
    }
  };

  const handleBusinessNumberUpdate = async () => {
    if (!user || user.business_number_updated) return;
    const digits = businessNumberValue.replace(/\D/g, '');
    const { error } = await supabase
      .from('users')
      .update({ business_number: digits, business_number_updated: true })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, business_number: digits, business_number_updated: true });
      setEditingBusinessNumber(false);
      alert('사업자등록번호가 수정되었습니다. (1회 수정 완료)');
    } else {
      alert('사업자등록번호 수정에 실패했습니다.');
    }
  };

  // Address management handlers
  const handleAddAddress = async () => {
    if (!user || !newAddress.address.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    const isFirstAddress = addresses.length === 0;
    const { error } = await supabase
      .from('user_addresses')
      .insert({
        user_id: user.id,
        address: newAddress.address,
        detail_address: newAddress.detail_address || null,
        is_main: isFirstAddress,
      });

    if (!error) {
      // Refresh addresses
      const { data } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: false });

      if (data) setAddresses(data as UserAddress[]);
      setNewAddress({ address: '', detail_address: '' });
      setShowAddressForm(false);
      alert('주소가 추가되었습니다.');
    } else {
      alert('주소 추가에 실패했습니다.');
    }
  };

  const handleSetMainAddress = async (addressId: string) => {
    if (!user) return;

    // 1) 모든 주소의 is_main을 false로
    await supabase
      .from('user_addresses')
      .update({ is_main: false })
      .eq('user_id', user.id);

    // 2) 선택한 주소만 is_main = true
    const { error } = await supabase
      .from('user_addresses')
      .update({ is_main: true })
      .eq('id', addressId);

    if (!error) {
      const { data } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: false });

      if (data) setAddresses(data as UserAddress[]);
      alert('메인 주소로 설정되었습니다.');
    } else {
      alert('메인 주소 설정에 실패했습니다.');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('이 주소를 삭제하시겠습니까?')) return;

    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId);

    if (!error) {
      const { data } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: false });

      if (data) setAddresses(data as UserAddress[]);
      alert('주소가 삭제되었습니다.');
    } else {
      alert('주소 삭제에 실패했습니다.');
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return '접수 대기';
      case 'confirmed':
        return '확정';
      case 'delivered':
        return '배송 완료';
      case 'cancelled':
        return '취소';
      default:
        return status;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">마이페이지</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'profile'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          내 정보
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'orders'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          주문 내역
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && user && (
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">기본 정보</h3>

            {/* Email (read-only) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                {user.email || '(카카오 로그인)'}
              </div>
              <p className="text-xs text-gray-400 mt-1">※ 카카오 계정 정보로 자동 설정됩니다.</p>
            </div>

            {/* Business Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">상호명 (업소명)</label>
              {editingBusinessName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={businessNameValue}
                    onChange={(e) => setBusinessNameValue(e.target.value)}
                    className="flex-1 p-2 border rounded text-sm"
                  />
                  <button
                    onClick={handleBusinessNameUpdate}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditingBusinessName(false);
                      setBusinessNameValue(user.business_name || '');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-800">{user.business_name || '(미등록)'}</span>
                  {!user.business_name_updated ? (
                    <button
                      onClick={() => setEditingBusinessName(true)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                    >
                      수정 (1회 가능)
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">(수정 완료)</span>
                  )}
                </div>
              )}
              {user.business_name_updated && (
                <p className="text-xs text-orange-600 mt-1">
                  ※ 추가 수정이 필요하시면 031-XXX-XXXX로 연락주세요.
                </p>
              )}
            </div>

            {/* Business Number */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">사업자등록번호</label>
              {editingBusinessNumber ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formatBizNumber(businessNumberValue)}
                    onChange={(e) => setBusinessNumberValue(e.target.value)}
                    placeholder="123-45-67890"
                    className="flex-1 p-2 border rounded text-sm"
                  />
                  <button
                    onClick={handleBusinessNumberUpdate}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditingBusinessNumber(false);
                      setBusinessNumberValue(user.business_number || '');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-800">
                    {user.business_number ? formatBizNumber(user.business_number) : '(미등록)'}
                  </span>
                  {!user.business_number_updated ? (
                    <button
                      onClick={() => setEditingBusinessNumber(true)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                    >
                      수정 (1회 가능)
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">(수정 완료)</span>
                  )}
                </div>
              )}
              {user.business_number_updated && (
                <p className="text-xs text-orange-600 mt-1">
                  ※ 추가 수정이 필요하시면 031-XXX-XXXX로 연락주세요.
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">연락처</label>
              {editingPhone ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formatPhoneNumber(phoneValue)}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    placeholder="010-1234-5678"
                    className="flex-1 p-2 border rounded text-sm"
                  />
                  <button
                    onClick={handlePhoneUpdate}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditingPhone(false);
                      setPhoneValue(user.phone || '');
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-800">
                    {user.phone ? formatPhoneNumber(user.phone) : '(미등록)'}
                  </span>
                  <button
                    onClick={() => setEditingPhone(true)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  >
                    수정
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Address Management Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-gray-800">배송지 관리</h3>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                {showAddressForm ? '취소' : '+ 주소 추가'}
              </button>
            </div>

            {showAddressForm && (
              <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">주소</label>
                  <input
                    type="text"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    placeholder="예: 경기도 고양시 일산서구..."
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">상세주소</label>
                  <input
                    type="text"
                    value={newAddress.detail_address}
                    onChange={(e) => setNewAddress({ ...newAddress, detail_address: e.target.value })}
                    placeholder="예: 101동 202호"
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <button
                  onClick={handleAddAddress}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  추가하기
                </button>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                등록된 주소가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-3 rounded border ${
                      addr.is_main
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {addr.is_main && (
                          <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs rounded mr-2 mb-1">
                            메인
                          </span>
                        )}
                        <div className="text-sm text-gray-800 font-medium">{addr.address}</div>
                        {addr.detail_address && (
                          <div className="text-xs text-gray-600 mt-1">{addr.detail_address}</div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {!addr.is_main && (
                          <button
                            onClick={() => handleSetMainAddress(addr.id)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            메인 설정
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              ※ 메인 주소는 주문 페이지에서 기본값으로 자동 선택됩니다.
            </p>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-semibold mb-1">내 주문 내역</p>
            <p>언제, 어떤 상품을 주문했는지 한눈에 확인하실 수 있습니다.</p>
            <p className="mt-1 text-xs text-gray-500">※ 실제 배송 상태는 롯데칠성 담당자 확인에 따라 변경될 수 있습니다.</p>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
              아직 주문 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="text-xs text-gray-500">주문일시</div>
                      <div className="text-sm font-semibold text-gray-800">{formatDateTime(order.created_at)}</div>
                      <div className="text-xs text-gray-400 mt-1">주문번호: {order.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <div className="text-xs text-gray-500 text-right">
                        <div>총 {order.total_boxes}박스</div>
                        <div>주문금액 {order.total_amount.toLocaleString()}원</div>
                      </div>
                    </div>
                  </div>

                  {('delivery_address' in (order as any)) && (order as any).delivery_address && (
                    <div className="mt-3 text-xs text-gray-600">
                      <span className="font-semibold mr-1">배송지:</span>
                      <span>{(order as any).delivery_address}</span>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-800 mb-1">주문한 상품</div>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-700">
                            <span>
                              {item.productName} × {item.quantity}
                            </span>
                            <span className="font-medium">
                              {(item.price * item.quantity).toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {order.service_items && order.service_items.length > 0 && (
                      <div>
                        <div className="font-semibold text-green-700 mb-1">서비스 상품</div>
                        <div className="space-y-1">
                          {order.service_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-green-700">
                              <span>
                                {item.productName} × {item.quantity}
                              </span>
                              <span className="font-medium">0원 (3+1 행사분)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

