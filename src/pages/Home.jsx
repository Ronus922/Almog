import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { currentUser, loading, isPublicAccessEnabled } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (loading) return;

      // If user is logged in, go to dashboard
      if (currentUser) {
        navigate(createPageUrl('Dashboard'), { replace: true });
        return;
      }

      // Check if public access is enabled
      const publicEnabled = await isPublicAccessEnabled();
      if (publicEnabled) {
        navigate(createPageUrl('Dashboard'), { replace: true });
      } else {
        navigate(createPageUrl('Login'), { replace: true });
      }
    };

    checkAndRedirect();
  }, [currentUser, loading, navigate, isPublicAccessEnabled]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">טוען...</p>
      </div>
    </div>
  );
}