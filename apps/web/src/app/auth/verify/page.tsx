'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyToken, user } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new magic link.');
      return;
    }

    const handleVerification = async () => {
      try {
        await verifyToken(token);
        setStatus('success');
        setMessage('Successfully logged in! Redirecting...');
        
        // Redirect after a brief delay
        setTimeout(() => {
          if (user?.hasCompletedOnboarding) {
            router.push('/dashboard');
          } else {
            router.push('/org/setup');
          }
        }, 2000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Invalid or expired magic link. Please request a new one.');
      }
    };

    handleVerification();
  }, [searchParams, verifyToken, router, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">🇲🇾</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifying your login
          </h2>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Verifying your magic link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success-100">
                <svg className="h-6 w-6 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Login Successful!</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100">
                <svg className="h-6 w-6 text-error-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Verification Failed</h3>
              <p className="mt-2 text-sm text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="btn-primary w-full"
              >
                Request New Magic Link
              </button>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@easyeinvoice.my" className="text-primary-600 hover:text-primary-500">
              support@easyeinvoice.my
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}