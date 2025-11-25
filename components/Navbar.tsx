import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface MobileNavLinkProps {
  to: string;
  children: React.ReactNode;
  currentPath: string;
  onClose: () => void;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, children, currentPath, onClose }) => (
  <Link
    to={to}
    onClick={onClose}
    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
      currentPath === to
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {children}
  </Link>
);

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await ensureUserProfile(session);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [location]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await ensureUserProfile(session);
    } else {
      setUser(null);
    }
  };

  const ensureUserProfile = async (session: any) => {
    try {
      // 1. Try to get existing profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data && !error) {
        setUser(data as UserProfile);
      } else {
        // 2. Create profile if it doesn't exist
        const newProfile = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || '회원',
          role: 'user', // Default role
        };

        const { error: insertError } = await supabase.from('users').insert(newProfile);
        
        if (!insertError) {
           setUser({ ...newProfile, created_at: new Date().toISOString() } as UserProfile);
        } else {
           console.error("Error creating user profile:", insertError);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
    setIsOpen(false);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">
                <i className="fa-solid fa-utensils mr-2"></i>
                일산서구 외식업
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <>
                <Link to="/order" className="text-gray-700 hover:text-blue-600 font-medium">상품 주문</Link>
                <Link to="/apron" className="text-gray-700 hover:text-blue-600 font-medium">앞치마 신청</Link>
                {isAdmin && (
                  <Link to="/admin" className="text-red-600 font-bold hover:text-red-800">관리자</Link>
                )}
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">{user.business_name || user.name}님</span>
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-300"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                  await supabase.auth.signInWithOAuth({ 
                    provider: 'kakao',
                    options: { redirectTo: window.location.origin }
                  });
                }} 
                className="bg-yellow-400 text-black px-4 py-2 rounded-md text-sm font-bold hover:bg-yellow-500 shadow-sm"
              >
                <i className="fa-solid fa-comment mr-2"></i>카카오 로그인
              </button>
            )}
          </div>

          <div className="-mr-2 flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <i className={`fa-solid ${isOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user ? (
              <>
                <div className="px-3 py-2 text-sm text-gray-500 font-semibold">
                  {user.business_name || user.name}님 환영합니다.
                </div>
                <MobileNavLink to="/order" currentPath={location.pathname} onClose={() => setIsOpen(false)}>
                  상품 주문
                </MobileNavLink>
                <MobileNavLink to="/apron" currentPath={location.pathname} onClose={() => setIsOpen(false)}>
                  앞치마 신청
                </MobileNavLink>
                {isAdmin && (
                  <MobileNavLink to="/admin" currentPath={location.pathname} onClose={() => setIsOpen(false)}>
                    관리자 페이지
                  </MobileNavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                   await supabase.auth.signInWithOAuth({ 
                    provider: 'kakao',
                    options: { redirectTo: window.location.origin }
                  });
                }}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium bg-yellow-400 text-black"
              >
                <i className="fa-solid fa-comment mr-2"></i>카카오 로그인
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
