
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { requestNotificationPermission, onMessageListener } from '../lib/firebase';
import { supabase } from '../lib/supabase';

import { NotificationService } from '../services/notification.service';

interface NotificationContextType {
    token: string | null;
    notifications: any[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // 1. Initialize & Request Permission on Mount (if user is logged in)
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const fcmToken = await requestNotificationPermission(session.user.id);
                if (fcmToken) {
                    setToken(fcmToken);
                    // Optionally save token using service if strictly following the pattern
                    // await NotificationService.saveFcmToken(session.user.id, fcmToken);
                }

                // Fetch initial notifications
                await fetchNotifications();
            }
        };
        init();
    }, []);

    // 2. Listen for Foreground Messages
    useEffect(() => {
        onMessageListener().then((payload: any) => {
            console.log('Foreground notification received:', payload);
            // Add custom toast or banner logic here
            // Also refresh the notification list
            fetchNotifications();
        });
    }, []); // Re-subscribe if needed

    const fetchNotifications = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const data = await NotificationService.getMyNotifications(session.user.id);
            setNotifications(data || []);
            setUnreadCount(data?.filter((n: any) => !n.is_read).length || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await NotificationService.markAsRead(id);
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{ token, notifications, unreadCount, fetchNotifications, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
