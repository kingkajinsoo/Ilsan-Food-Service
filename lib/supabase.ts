import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// 브라우저(특히 모바일) 환경에서 Kakao OAuth 세션이 안정적으로 유지되도록
// 명시적으로 auth 옵션을 설정합니다.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'ilsan-food-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true, // OAuth 콜백 URL에서 토큰 자동 감지
  },
});