import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="p-10 flex flex-col items-center text-center">
          {/* Google Logo */}
          <div className="mb-4">
            <svg width="75" height="24" viewBox="0 0 75 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.24 4.42C12.24 3.99 12.2 3.58 12.13 3.18H6.25V5.54H9.61C9.46 6.3 9.03 6.94 8.39 7.37V8.9H10.36C11.51 7.84 12.24 6.28 12.24 4.42Z" fill="#4285F4"/>
              <path d="M6.25 10.51C7.94 10.51 9.35 9.95 10.36 8.9L8.39 7.37C7.84 7.74 7.11 7.97 6.25 7.97C4.62 7.97 3.24 6.87 2.75 5.39H0.71V6.97C1.75 9.07 3.83 10.51 6.25 10.51Z" fill="#34A853"/>
              <path d="M2.75 5.39C2.63 5.02 2.56 4.63 2.56 4.23C2.56 3.83 2.63 3.44 2.75 3.07V1.49H0.71C0.26 2.31 0 3.24 0 4.23C0 5.22 0.26 6.15 0.71 6.97L2.75 5.39Z" fill="#FBBC05"/>
              <path d="M6.25 0.49C7.17 0.49 8 0.81 8.65 1.43L10.41 -0.33C9.35 -1.32 7.94 -1.93 6.25 -1.93C3.83 -1.93 1.75 -0.49 0.71 1.61L2.75 3.19C3.24 1.71 4.62 0.49 6.25 0.49Z" fill="#EA4335"/>
              <text x="15" y="18" fill="#5f6368" style={{font: '500 22px product sans, arial, sans-serif'}}>Quad</text>
            </svg>
          </div>

          <h1 className="text-2xl font-normal text-gray-900 mb-2">Sign in</h1>
          <p className="text-base text-gray-700 mb-8">Use your Google Account</p>

          {error && (
            <div className="w-full p-3 mb-6 bg-red-50 text-red-600 rounded border border-red-100 text-sm text-left">
              {error}
            </div>
          )}

          <div className="w-full space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Campus Social Network</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            <div className="flex justify-between items-center pt-4">
              <button 
                onClick={() => navigate('/signup')}
                className="text-blue-600 font-medium text-sm hover:bg-blue-50 px-2 py-1.5 rounded transition-colors"
              >
                Create account
              </button>
              <button 
                onClick={() => navigate('/')}
                className="bg-blue-600 text-white font-medium text-sm px-6 py-2 rounded hover:bg-blue-700 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="w-full max-w-[450px] mt-6 flex justify-between items-center px-2 text-xs text-gray-600">
        <div className="flex gap-4">
          <button className="hover:underline">English (United States)</button>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </div>
        <div className="flex gap-6">
          <button className="hover:underline">Help</button>
          <button className="hover:underline">Privacy</button>
          <button className="hover:underline">Terms</button>
        </div>
      </div>
    </div>
  );
}
