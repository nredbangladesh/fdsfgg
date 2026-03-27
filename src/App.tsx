import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { useAppStore, SystemState } from './store';
import SystemOverlay from './components/SystemOverlay';
import Splash from './components/Splash';
import SignUp from './components/SignUp';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import MainLayout from './components/MainLayout';
import RequestSchool from './components/RequestSchool';
import AgentDocs from './components/AgentDocs';

import Feed from './components/Feed';
import Discover from './components/Discover';
import Sparks from './components/Sparks';
import Messages from './components/Messages';
import Profile from './components/Profile';
import SettingsPage from './components/Settings';
import AdminPanel from './components/AdminPanel';

import ErrorPage from './components/ErrorPage';

const RequireOnboarding = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAppStore();
  if (userProfile && !userProfile.onboardingCompleted) {
    return <Navigate to="/profile-setup" replace />;
  }
  return <>{children}</>;
};

export default function App() {

  const { user, setUser, userProfile, setUserProfile, setAuthReady, isAuthReady, setSystemState, systemState, theme } = useAppStore();

  useEffect(() => {
    // Load theme from local storage
    const savedTheme = localStorage.getItem('theme') || 'chalk';
    document.documentElement.className = savedTheme;
    useAppStore.setState({ theme: savedTheme });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    // Listen to system state
    const unsubscribeSystem = onSnapshot(doc(db, 'system', 'appState'), (docSnap) => {
      if (docSnap.exists()) {
        setSystemState(docSnap.data() as SystemState);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system/appState');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSystem();
    };
  }, [setUser, setAuthReady, setSystemState]);

  useEffect(() => {
    if (user) {
      const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        } else {
          setUserProfile(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubscribeProfile();
    } else {
      setUserProfile(null);
    }
  }, [user, setUserProfile]);

  if (!isAuthReady) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If system is not live and user is not admin, show overlay
  // (Simplified admin check for now, ideally check custom claims)
  const isSystemLive = !systemState || systemState.status === 'live';
  
  if (!isSystemLive) {
    return <SystemOverlay />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-300">
        <Routes>
          {user ? (
            <>
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/settings" element={<RequireOnboarding><SettingsPage /></RequireOnboarding>} />
              <Route path="/admin" element={<RequireOnboarding><AdminPanel /></RequireOnboarding>} />
              <Route path="/agent-docs" element={<RequireOnboarding><AgentDocs /></RequireOnboarding>} />
              <Route element={<RequireOnboarding><MainLayout /></RequireOnboarding>}>
                <Route path="/" element={<Feed />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/sparks" element={<Sparks />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/signup" element={<Navigate to="/" replace />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<ErrorPage code={404} message="The page you are looking for doesn't exist or has been moved." />} />
              </Route>
            </>
          ) : (
            <>
              <Route path="/" element={<Splash />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/request-school" element={<RequestSchool />} />
              <Route path="*" element={<ErrorPage code={404} message="The page you are looking for doesn't exist or has been moved." />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

