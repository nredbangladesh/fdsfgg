import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';

export default function SignUp() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedSchool = location.state?.school;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      if (!selectedSchool) throw new Error('Please select a school first.');
      
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Check if user document already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Create user document
        const userDoc = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || '',
          schoolId: selectedSchool.id,
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        try {
          await setDoc(userDocRef, userDoc);
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      // Navigate to profile setup
      navigate('/profile-setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--accent-color)] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[var(--text-color)] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 mb-8 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 dark:bg-black/50 backdrop-blur-xl p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-2xl"
        >
          <div className="w-16 h-16 bg-[var(--accent-color)]/20 rounded-2xl flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-[var(--accent-color)]" />
          </div>
          
          <h1 className="text-4xl font-black mb-2 tracking-tight">Join {selectedSchool?.name || 'Quad'}</h1>
          <p className="opacity-70 mb-8 text-lg">Let's get your campus account set up.</p>

          {error && (
            <div className="p-4 mb-6 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button 
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-black/10 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? 'Creating account...' : 'Sign up with Google'}
            </button>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm opacity-60">
              Already have an account? <button onClick={() => navigate('/login')} className="text-[var(--accent-color)] font-medium hover:underline">Log in</button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
