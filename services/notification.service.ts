
import { supabase } from '../lib/supabase';

export interface NotificationRecord {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'order_status' | 'care_alert' | 'notice' | 'promo' | 'issue';
    is_read: boolean;
    action_url?: string;
    created_at: string;
}

export const NotificationService = {
    // Fetch my notifications
    async getMyNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data as NotificationRecord[];
    },

    // Mark as read
    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    // Mark all as read
    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    },

    // Save FCM Token (for the 'Device' layer)
    async saveFcmToken(userId: string, token: string) {
        const { error } = await supabase
            .from('users')
            .update({ fcm_token: token })
            .eq('id', userId);

        if (error) throw error;
    }
};
