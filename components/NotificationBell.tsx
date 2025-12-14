
import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
// Assuming we might use a Drawer component later, but for now a simple dropdown/popover
// using basic Tailwind logic.

export const NotificationBell: React.FC = () => {
    const { unreadCount, notifications, markAsRead } = useNotification();
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleItemClick = (id: string, actionUrl: string | null) => {
        markAsRead(id);
        if (actionUrl) {
            window.location.href = actionUrl; // Simple navigation, ideally use useNavigate in real app
        }
    };

    return (
        <div className="relative inline-block text-left mr-3">
            {/* Bell Icon Trigger */}
            <button
                onClick={toggleOpen}
                className="relative p-2 text-gray-600 hover:text-blue-600 focus:outline-none transition-colors"
            >
                <i className="fa-regular fa-bell text-xl"></i>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown / Modal Content */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10 opactiy-0 cursor-default"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-20 max-h-96 overflow-y-auto">
                        <div className="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0">
                            <span className="font-bold text-gray-700">알림 센터</span>
                            <span className="text-xs text-gray-500">최근 50개 보관</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    새로운 알림이 없습니다.
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleItemClick(n.id, n.action_url)}
                                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50' : 'bg-white'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${n.type === 'order_status' ? 'bg-green-100 text-green-700' :
                                                    n.type === 'care_alert' ? 'bg-orange-100 text-orange-700' :
                                                        n.type === 'issue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {n.type === 'order_status' ? '주문' : n.type === 'care_alert' ? '케어' : n.type === 'issue' ? '경고' : '알림'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className={`text-sm mb-1 ${!n.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {n.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {n.message}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
