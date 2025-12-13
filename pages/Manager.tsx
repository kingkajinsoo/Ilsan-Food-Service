import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, ApronRequest, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';

export const Manager: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'logistics' | 'aprons' | 'settlement' | 'performance'>('logistics');
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [aprons, setAprons] = useState<ApronRequest[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);

    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    // --- Verification State ---
    const [unverifiedOrders, setUnverifiedOrders] = useState<Order[]>([]);

    // --- Logistics State ---
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [logisticsDate, setLogisticsDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'today' | 'history'>('today');

    // History Filters
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [historyStatus, setHistoryStatus] = useState<'ALL' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('ALL');

    // --- Settlement State ---
    const [settlementSearch, setSettlementSearch] = useState('');
    const [expandedSettlementUser, setExpandedSettlementUser] = useState<string | null>(null);

    useEffect(() => {
        checkManagerAndFetch();
    }, []);

    const checkManagerAndFetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('매니저 로그인이 필요합니다.');
            navigate('/');
            return;
        }

        const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
            alert('접근 권한이 없습니다.');
            navigate('/');
            return;
        }
        setCurrentUser(user as UserProfile);

        try {
            await Promise.all([fetchOrders(), fetchAprons(), fetchUsers()]);
        } catch (e) {
            console.error("Error fetching manager data", e);
        }
        setLoading(false);
    };

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, users(name, business_name, phone, verification_status)')
            .order('created_at', { ascending: false });

        if (error) console.error('Orders error:', error);
        if (data) {
            const formatted = data.map((o: any) => ({
                ...o,
                user_name: o.users?.name,
                business_name: o.business_name || o.users?.business_name,
                user_phone: o.users?.phone
            }));
            setOrders(formatted);
        }
    };

    const fetchAprons = async () => {
        const { data, error } = await supabase
            .from('apron_requests')
            .select('*, users(name, business_name, phone)')
            .order('created_at', { ascending: false });

        if (error) console.error('Aprons error:', error);
        if (data) {
            const formatted = data.map((a: any) => ({
                ...a,
                user_name: a.users?.name,
                business_name: a.users?.business_name,
                user_phone: a.users?.phone
            }));
            setAprons(formatted);
        }
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data as UserProfile[]);
    };

    // --- Logistics Actions ---
    const toggleOrderSelection = (id: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedOrderIds(newSet);
    };

    const updateOrderStatusBatch = async (status: 'delivered' | 'confirmed') => {
        if (selectedOrderIds.size === 0) return alert('선택된 주문이 없습니다.');
        if (!confirm(`선택한 ${selectedOrderIds.size}건의 주문을 '${status === 'confirmed' ? '주문확정' : '배송완료'}' 처리하시겠습니까?`)) return;

        const { error } = await supabase
            .from('orders')
            .update({ status })
            .in('id', Array.from(selectedOrderIds));

        if (error) alert('오류가 발생했습니다: ' + error.message);
        else {
            alert('처리되었습니다.');
            setSelectedOrderIds(new Set());
            fetchOrders();
        }
    };

    const handlePrintDeliveryList = () => {
        window.print();
    };

    // --- Apron Actions ---
    const handleApronDelivery = async (id: string, method: 'driver' | 'staff') => {
        if (!confirm(`${method === 'driver' ? '기사님 편(음료동봉)' : '협회 담당자(직접전달)'}으로 배송 처리하시겠습니까?`)) return;

        const { error } = await supabase
            .from('apron_requests')
            .update({
                status: 'completed',
                delivery_method: method
            })
            .eq('id', id);

        if (error) alert('오류: ' + error.message);
        else {
            alert('처리되었습니다.');
            fetchAprons();
        }
    };

    // --- Settlement Actions ---
    const handleSettleOrder = async (orderId: string) => {
        if (!confirm('해당 주문을 [입금 확인] 처리하시겠습니까?')) return;

        // Explicitly cast 'paid' to the specific union type expected by TypeScript
        const { error } = await supabase
            .from('orders')
            .update({
                payment_status: 'paid' as 'paid', // Type assertion
                paid_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) alert('오류: ' + error.message);
        else {
            alert('입금 확인되었습니다.');
            fetchOrders();
        }
    };

    // --- Verification Actions ---
    const handleVerifyUser = async (orderId: string, userId: string, type: 'existing' | 'new' | 'block') => {
        let confirmMsg = '';
        if (type === 'block') confirmMsg = '정말 거절(차단)하시겠습니까?\n해당 주문은 취소되고 회원은 차단됩니다.';
        if (type === 'existing') confirmMsg = '기존 거래처로 승인하시겠습니까?\n주문이 확정 처리됩니다.';
        if (type === 'new') confirmMsg = '신규 거래처로 승인하시겠습니까?\n주문 확정 및 앞치마 요청이 자동 생성됩니다.';

        if (!confirm(confirmMsg)) return;

        try {
            if (type === 'block') {
                // 1. Block User
                await supabase.from('users').update({ verification_status: 'blocked' }).eq('id', userId);
                // 2. Cancel Order
                await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
            } else if (type === 'existing') {
                // 1. Verify User
                await supabase.from('users').update({ verification_status: 'verified_existing' }).eq('id', userId);
                // 2. Confirm Order (if pending)
                await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId);
            } else if (type === 'new') {
                // 1. Verify User
                await supabase.from('users').update({ verification_status: 'verified_new' }).eq('id', userId);
                // 2. Confirm Order
                await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId);

                // 3. Create Apron Request (Auto)
                // Get User Info for Apron Request
                const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
                if (userData) {
                    await supabase.from('apron_requests').insert({
                        user_id: userId,
                        quantity: 1, // Default 1 pack? or specific amount? User said "Apron benefit". Let's assume 1 unit/pack.
                        status: 'pending',
                        business_name: userData.business_name,
                        business_number: userData.business_number,
                        phone: userData.phone,
                        delivery_address: userData.address // Assuming address exists on user
                    });
                }
            }
            alert('처리되었습니다.');
            fetchOrders();
            fetchUsers();
        } catch (e: any) {
            alert('오류 발생: ' + e.message);
        }
    };

    // --- Helpers ---
    const setHistoryRange = (range: '1W' | '1M' | '3M') => {
        const end = new Date();
        const start = new Date();
        if (range === '1W') start.setDate(end.getDate() - 7);
        if (range === '1M') start.setMonth(end.getMonth() - 1);
        if (range === '3M') start.setMonth(end.getMonth() - 3);

        setHistoryStartDate(start.toISOString().split('T')[0]);
        setHistoryEndDate(end.toISOString().split('T')[0]);
    };

    const getLogisticsOrders = () => {
        if (viewMode === 'today') {
            // "Today" means the date selected in logisticsDate
            // Range: Previous Day 09:01:00 ~ Target Day 09:00:00

            if (!logisticsDate) return [];

            const targetDate = new Date(logisticsDate); // Local midnight of selected date

            // Cutoff End: Selected Date 09:00:00
            const cutoffEnd = new Date(targetDate);
            cutoffEnd.setHours(9, 0, 0, 0);

            // Cutoff Start: Previous Date 09:01:00
            const cutoffStart = new Date(cutoffEnd);
            cutoffStart.setDate(cutoffStart.getDate() - 1);
            cutoffStart.setHours(9, 1, 0, 0);

            return orders.filter(o => {
                const orderDate = new Date(o.created_at); // UTC to Local conversion
                return orderDate >= cutoffStart && orderDate <= cutoffEnd && o.status !== 'cancelled';
            });
        } else {
            // History Mode
            return orders.filter(o => {
                // Filter by Status
                if (historyStatus !== 'ALL' && o.status !== historyStatus) return false;

                // Filter by Date Range (Compare YYYY-MM-DD strings in local time)
                const orderDate = new Date(o.created_at);
                // Adjust to YYYY-MM-DD string in local time
                const orderDateStr = orderDate.getFullYear() + '-' +
                    String(orderDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(orderDate.getDate()).padStart(2, '0');

                if (historyStartDate && orderDateStr < historyStartDate) return false;
                if (historyEndDate && orderDateStr > historyEndDate) return false;

                return true;
            });
        }
    };

    const getUnpaidOrders = () => {
        return orders.filter(o => o.payment_status === 'unpaid' && o.status !== 'cancelled');
    };

    // Group unpaid orders by User/Business
    const getUnpaidByBusiness = () => {
        const raw = getUnpaidOrders();
        const grouped: Record<string, { name: string, total: number, count: number, orders: Order[] }> = {};

        raw.forEach(o => {
            const key = o.user_id;
            if (!grouped[key]) {
                grouped[key] = {
                    name: o.business_name || o.user_name || '미등록',
                    total: 0,
                    count: 0,
                    orders: []
                };
            }
            grouped[key].total += o.total_amount;
            grouped[key].count += 1;
            grouped[key].orders.push(o);
        });

        return Object.entries(grouped)
            .map(([userId, data]) => ({ userId, ...data }))
            .filter(d => d.name.includes(settlementSearch) || settlementSearch === '')
            .sort((a, b) => b.total - a.total); // Highest debt first
    };


    if (loading) return <div className="p-8 text-center pt-20">매니저 대시보드 로딩중...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        <i className="fa-solid fa-user-tie mr-2 text-blue-600"></i>
                        매니저 대시보드
                        {currentUser?.role === 'admin' && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Admin Access</span>}
                    </h1>
                    <div className="text-sm text-gray-500">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('logistics')} className={`flex-1 py-3 px-4 sm:px-6 whitespace-nowrap font-medium transition-colors ${activeTab === 'logistics' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fa-solid fa-truck mr-2"></i>물류/배송
                    </button>
                    <button onClick={() => setActiveTab('aprons')} className={`flex-1 py-3 px-4 sm:px-6 whitespace-nowrap font-medium transition-colors ${activeTab === 'aprons' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fa-solid fa-vest mr-2"></i>앞치마 관리
                    </button>
                    <button onClick={() => setActiveTab('settlement')} className={`flex-1 py-3 px-4 sm:px-6 whitespace-nowrap font-medium transition-colors ${activeTab === 'settlement' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fa-solid fa-file-invoice-dollar mr-2"></i>수금 관리 <span className="ml-1 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">{getUnpaidOrders().length}</span>
                    </button>
                    <button onClick={() => setActiveTab('performance')} className={`flex-1 py-3 px-4 sm:px-6 whitespace-nowrap font-medium transition-colors ${activeTab === 'performance' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fa-solid fa-chart-line mr-2"></i>영업 성과
                    </button>
                </div>

                {/* ======================= LOGISTICS TAB ======================= */}
                {activeTab === 'logistics' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 print:shadow-none print:border-none">

                        {/* Toggle View Mode */}
                        <div className="flex gap-4 mb-6 border-b pb-4 print:hidden">
                            <button
                                onClick={() => setViewMode('today')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${viewMode === 'today' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                <i className="fa-solid fa-calendar-day mr-2"></i>금일 배송 (9시 기준)
                            </button>
                            <button
                                onClick={() => setViewMode('history')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${viewMode === 'history' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                <i className="fa-solid fa-list mr-2"></i>전체 주문 이력
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 print:hidden">
                            {viewMode === 'today' ? (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-gray-500">배송 기준일 선택</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={logisticsDate}
                                            onChange={(e) => setLogisticsDate(e.target.value)}
                                            className="p-2 border rounded-lg shadow-sm font-medium"
                                        />
                                        <span className="text-gray-500 text-sm">오전 9시 마감</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-gray-500">기간 조회</label>
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="p-2 border rounded text-sm w-32" />
                                            <span className="text-gray-400">~</span>
                                            <input type="date" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="p-2 border rounded text-sm w-32" />
                                        </div>
                                    </div>
                                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setHistoryRange('1W')} className="px-3 py-1.5 text-xs bg-white rounded shadow-sm hover:bg-gray-50">1주</button>
                                        <button onClick={() => setHistoryRange('1M')} className="px-3 py-1.5 text-xs bg-white rounded shadow-sm hover:bg-gray-50">1개월</button>
                                        <button onClick={() => setHistoryRange('3M')} className="px-3 py-1.5 text-xs bg-white rounded shadow-sm hover:bg-gray-50">3개월</button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-gray-500">상태</label>
                                        <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value as any)} className="p-2 border rounded text-sm min-w-[100px]">
                                            <option value="ALL">전체</option>
                                            <option value="pending">접수대기</option>
                                            <option value="confirmed">주문확정</option>
                                            <option value="delivered">배송완료</option>
                                            <option value="cancelled">취소</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={handlePrintDeliveryList} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium shadow-sm">
                                    <i className="fa-solid fa-print mr-2"></i>인쇄 / 엑셀
                                </button>
                                {viewMode === 'today' && (
                                    <>
                                        <button onClick={() => updateOrderStatusBatch('confirmed')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-bold shadow-sm">
                                            선택 주문확정
                                        </button>
                                        <button onClick={() => updateOrderStatusBatch('delivered')} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-bold shadow-sm">
                                            선택 배송완료
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 print:bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 w-8 print:hidden"><input type="checkbox" onChange={(e) => {
                                            if (e.target.checked) setSelectedOrderIds(new Set(getLogisticsOrders().map(o => o.id)));
                                            else setSelectedOrderIds(new Set());
                                        }} /></th>
                                        {viewMode === 'history' && <th className="px-4 py-3 text-left font-semibold text-gray-600">날짜 / 상태</th>}
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">업소명 / 연락처</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">주소</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">주문 내역</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">수량</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600 print:hidden">{viewMode === 'today' ? '상태' : ''}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {getLogisticsOrders().length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">해당 날짜의 주문이 없습니다.</td></tr>
                                    ) : (
                                        getLogisticsOrders().map(order => (
                                            <tr key={order.id} className={`hover:bg-gray-50 transition ${selectedOrderIds.has(order.id) ? 'bg-blue-50' : ''} ${order.status === 'cancelled' ? 'opacity-60 bg-gray-50' : ''}`}>
                                                <td className="px-4 py-3 print:hidden">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrderIds.has(order.id)}
                                                        onChange={() => toggleOrderSelection(order.id)}
                                                        disabled={order.status === 'cancelled'}
                                                    />
                                                </td>
                                                {viewMode === 'history' && (
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="text-gray-900 mb-1">{order.created_at.split('T')[0]}</div>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {order.status === 'pending' ? '대기' : order.status === 'confirmed' ? '확정' : order.status === 'delivered' ? '완료' : '취소'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">{(order as any).business_name}</div>
                                                    <div className="text-xs text-gray-500">{(order as any).phone || (order as any).user_phone}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-gray-800 leading-tight">{(order as any).delivery_address}</div>
                                                    {(order as any).detail_address && <div className="text-xs text-gray-500 mt-0.5">{(order as any).detail_address}</div>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        {order.items.map((i, idx) => (
                                                            <div key={idx}>• {i.productName} <span className="font-bold">x{i.quantity}</span></div>
                                                        ))}
                                                        {order.service_items?.length > 0 && (
                                                            <div className="text-blue-600 text-xs mt-1">
                                                                🎁 서비스: {order.service_items.map(s => `${s.productName} x${s.quantity}`).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-semibold">{order.total_boxes}박스</td>
                                                <td className="px-4 py-3 print:hidden">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {order.status === 'pending' ? '대기' : order.status === 'confirmed' ? '확정' : '완료'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ======================= APRON TAB ======================= */}
                {activeTab === 'aprons' && (
                    <div className="space-y-6">
                        {aprons.filter(a => a.status === 'pending').map(apron => (
                            <div key={apron.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">요청 접수</span>
                                        <span className="text-gray-400 text-xs">{new Date(apron.created_at).toLocaleString()}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{(apron as any).business_name} <span className="text-lg text-blue-600">({apron.quantity}장)</span></h3>
                                    <p className="text-gray-600 text-sm mb-1"><i className="fa-solid fa-map-marker-alt mr-1 text-gray-400"></i>{(apron as any).delivery_address}</p>
                                    <p className="text-gray-500 text-sm"><i className="fa-solid fa-phone mr-1 text-gray-400"></i>{(apron as any).phone || (apron as any).user_phone}</p>
                                </div>

                                <div className="flex flex-col gap-2 justify-center min-w-[200px]">
                                    <p className="text-xs font-bold text-gray-500 text-center mb-1">- 배송 방법 선택 -</p>
                                    <button
                                        onClick={() => handleApronDelivery(apron.id, 'driver')}
                                        className="flex-1 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg font-bold hover:bg-blue-100 transition text-sm flex items-center justify-center"
                                    >
                                        <i className="fa-solid fa-truck mr-2"></i> 기사님 편 (음료동봉)
                                    </button>
                                    <button
                                        onClick={() => handleApronDelivery(apron.id, 'staff')}
                                        className="flex-1 bg-green-50 text-green-700 px-4 py-3 rounded-lg font-bold hover:bg-green-100 transition text-sm flex items-center justify-center"
                                    >
                                        <i className="fa-solid fa-person-walking-luggage mr-2"></i> 협회 담당자 (직접)
                                    </button>
                                </div>
                            </div>
                        ))}
                        {aprons.filter(a => a.status === 'pending').length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">대기 중인 앞치마/비품 요청이 없습니다.</p>
                            </div>
                        )}

                        {/* Completed History Condensed */}
                        <div className="mt-8">
                            <h4 className="text-sm font-bold text-gray-500 mb-4 px-2">완료된 내역</h4>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 space-y-2">
                                {aprons.filter(a => a.status === 'completed').slice(0, 5).map(a => (
                                    <div key={a.id} className="flex justify-between">
                                        <span>{(a as any).business_name} ({a.quantity}장)</span>
                                        <span>{a.delivery_method === 'driver' ? '기사님 배송' : '담당자 배송'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= SETTLEMENT TAB ======================= */}
                {activeTab === 'settlement' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                                <p className="text-red-700 font-bold mb-1">총 미수금 (외상 잔액)</p>
                                <p className="text-3xl font-extrabold text-red-600">
                                    {getUnpaidOrders().reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()} <span className="text-base font-normal">원</span>
                                </p>
                            </div>
                            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                <p className="text-green-700 font-bold mb-1">오늘 수금액</p>
                                <p className="text-3xl font-extrabold text-green-600">
                                    {orders.filter(o =>
                                        o.payment_status === 'paid' &&
                                        o.paid_at &&
                                        o.paid_at.startsWith(new Date().toISOString().split('T')[0])
                                    ).reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()} <span className="text-base font-normal">원</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50">
                                <input
                                    type="text"
                                    value={settlementSearch}
                                    onChange={(e) => setSettlementSearch(e.target.value)}
                                    placeholder="업소명 검색..."
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>
                            <div className="divide-y divide-gray-100">
                                {getUnpaidByBusiness().map(shop => (
                                    <div key={shop.userId} className="bg-white">
                                        <div
                                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                                            onClick={() => setExpandedSettlementUser(expandedSettlementUser === shop.userId ? null : shop.userId)}
                                        >
                                            <div>
                                                <h4 className="font-bold text-gray-800">{shop.name}</h4>
                                                <p className="text-xs text-gray-500">미납 {shop.count}건</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-red-600 font-bold">{shop.total.toLocaleString()}원</span>
                                                <i className={`fa-solid fa-chevron-${expandedSettlementUser === shop.userId ? 'up' : 'down'} text-gray-400`}></i>
                                            </div>
                                        </div>

                                        {expandedSettlementUser === shop.userId && (
                                            <div className="bg-gray-50 p-4 border-t border-gray-100 animate-fade-in pl-8">
                                                {shop.orders.map(o => (
                                                    <div key={o.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-700">{o.created_at.split('T')[0]} 주문</div>
                                                            <div className="text-xs text-gray-500">{o.items.map(i => `${i.productName} ${i.quantity}`).join(', ')}</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-gray-800">{o.total_amount.toLocaleString()}원</span>
                                                            <button
                                                                onClick={() => handleSettleOrder(o.id)}
                                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-bold"
                                                            >
                                                                입금확인
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {getUnpaidByBusiness().length === 0 && (
                                    <div className="p-8 text-center text-gray-400">
                                        미수금 내역이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= PERFORMANCE TAB ======================= */}
                {activeTab === 'performance' && (
                    <div className="space-y-6">
                        {/* --- NEW: Sign-up Review Section --- */}
                        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                <i className="fa-solid fa-clipboard-check mr-2 text-orange-500"></i>
                                신규 가입 심사 대기 ({orders.filter(o => (o.users as any)?.verification_status === 'unverified' && o.status !== 'cancelled').length}건)
                            </h3>
                            <div className="space-y-4">
                                {orders.filter(o => (o.users as any)?.verification_status === 'unverified' && o.status !== 'cancelled').map(order => (
                                    <div key={order.id} className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-bold text-lg">{(order as any).business_name}</span>
                                                <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">{(order as any).users?.name}</span>
                                            </div>

                                            {/* Key Verification Info */}
                                            <div className="bg-orange-100 p-3 rounded-lg border border-orange-200 mb-2 space-y-1">
                                                <p className="text-sm font-bold text-gray-800 flex items-center">
                                                    <i className="fa-solid fa-id-card w-6 text-center mr-2 text-orange-600"></i>
                                                    {(order as any).business_number || '사업자번호 미입력'}
                                                </p>
                                                <p className="text-sm font-bold text-gray-800 flex items-center">
                                                    <i className="fa-solid fa-phone w-6 text-center mr-2 text-orange-600"></i>
                                                    {(order as any).phone || (order as any).user_phone || '연락처 미입력'}
                                                </p>
                                                <p className="text-sm text-gray-700 flex items-start">
                                                    <i className="fa-solid fa-map-marker-alt w-6 text-center mr-2 mt-1 text-orange-600"></i>
                                                    <span className="flex-1">{(order as any).delivery_address}</span>
                                                </p>
                                            </div>

                                            <div className="text-xs text-gray-500 pl-1">
                                                첫 주문일: {order.created_at.split('T')[0]} | 주문액: {order.total_amount.toLocaleString()}원
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 min-w-[180px]">
                                            <button
                                                onClick={() => handleVerifyUser(order.id, order.user_id, 'new')}
                                                className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 transition shadow-sm"
                                            >
                                                🎁 신규 인정 (앞치마)
                                            </button>
                                            <button
                                                onClick={() => handleVerifyUser(order.id, order.user_id, 'existing')}
                                                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-bold hover:bg-gray-50 transition"
                                            >
                                                😐 기존 거래처 승인
                                            </button>
                                            <button
                                                onClick={() => handleVerifyUser(order.id, order.user_id, 'block')}
                                                className="bg-red-100 text-red-600 px-3 py-2 rounded text-sm font-bold hover:bg-red-200 transition"
                                            >
                                                🚫 거절/차단 (BHC 등)
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {orders.filter(o => (o.users as any)?.verification_status === 'unverified' && o.status !== 'cancelled').length === 0 && (
                                    <div className="text-center py-4 text-gray-400 text-sm">심사 대기 중인 신규 주문이 없습니다.</div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><i className="fa-solid fa-user-plus mr-2 text-blue-500"></i>최근 가입 승인 내역</h3>
                                <div className="space-y-4">
                                    {users.filter(u => {
                                        const date = new Date(u.created_at);
                                        const weekAgo = new Date();
                                        weekAgo.setDate(weekAgo.getDate() - 7);
                                        return date > weekAgo;
                                    }).map(u => (
                                        <div key={u.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <div>
                                                <div className="font-bold">{u.business_name || u.name}</div>
                                                <div className="text-xs text-gray-500">{u.address?.split(' ')[1] || '주소미입력'} ({new Date(u.created_at).toLocaleDateString()})</div>
                                            </div>
                                            {u.phone && <a href={`tel:${u.phone}`} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-green-100 hover:text-green-600"><i className="fa-solid fa-phone"></i></a>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center"><i className="fa-solid fa-gift mr-2 text-purple-500"></i>최근 3+1 혜택 제공 내역</h3>
                                <div className="space-y-4">
                                    {/* Logic: Find orders with service_items > 0 */}
                                    {orders.filter(o => o.service_items && o.service_items.length > 0)
                                        .slice(0, 10) // Last 10
                                        .map(o => (
                                            <div key={o.id} className="py-2 border-b last:border-0 border-gray-100">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-sm text-gray-800">{(o as any).business_name}</span>
                                                    <span className="text-xs text-gray-400">{o.created_at.split('T')[0]}</span>
                                                </div>
                                                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                                    {o.service_items.map(s => `🎁 ${s.productName} ${s.quantity}박스`).join(', ')}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
