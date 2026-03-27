import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Settings, Edit3, Share, LogOut, Palette } from 'lucide-react';
import { auth, db } from '../firebase';
import { useAppStore } from '../store';
import { signOut } from 'firebase/auth';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

export default function Profile() {
  const navigate = useNavigate();
  const { user, userProfile, theme, setTheme } = useAppStore();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const themes = [
    { id: 'chalk', name: 'Chalk', color: '#ffffff', accent: '#f28482' },
    { id: 'ink', name: 'Ink', color: '#0a1128', accent: '#007bff' },
    { id: 'petal', name: 'Petal', color: '#fdfbf7', accent: '#e5989b' },
    { id: 'forest', name: 'Forest', color: '#1a3a2a', accent: '#ffb703' },
    { id: 'slate', name: 'Slate', color: '#121212', accent: '#9d4edd' },
  ];

  useEffect(() => {
    if (user?.uid) {
      const fetchStats = async () => {
        const qPosts = query(collection(db, 'posts'), where('authorId', '==', user.uid));
        const qFollowers = query(collection(db, 'follows'), where('followingId', '==', user.uid));
        const qFollowing = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        
        const [postsSnap, followersSnap, followingSnap] = await Promise.all([
          getCountFromServer(qPosts),
          getCountFromServer(qFollowers),
          getCountFromServer(qFollowing)
        ]);

        setPostCount(postsSnap.data().count);
        setFollowerCount(followersSnap.data().count);
        setFollowingCount(followingSnap.data().count);
      };
      fetchStats();
    }
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const isAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'schooladmin' || userProfile?.email === 'nredbangladesh@gmail.com';

  return (
    <div className="min-h-full pb-24 relative">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-br from-[var(--accent-color)] to-purple-500 relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors">
            <Share className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="flex justify-between items-end mb-4">
          <div className="w-32 h-32 rounded-full border-4 border-[var(--bg-color)] bg-black/10 dark:bg-white/10 overflow-hidden relative">
            <img src={userProfile?.photoUrl || `https://picsum.photos/seed/${user?.uid || 'me'}/200/200`} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <button 
            onClick={() => navigate('/profile-setup')}
            className="px-6 py-2 rounded-full bg-black/5 dark:bg-white/5 font-bold text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{userProfile?.name || user?.displayName || 'Student Name'}</h1>
          <p className="text-sm opacity-60">
            {userProfile?.academicClass ? `${userProfile.academicClass} • ` : ''}
            {userProfile?.session || 'Session'} • {userProfile?.bloodGroup || 'Blood Group'}
          </p>
        </div>

        <p className="mt-4 text-sm leading-relaxed opacity-80">
          {userProfile?.bio || 'Building cool things and drinking too much coffee. Always down for a hackathon or a late-night study session at the library.'}
        </p>

        {userProfile?.address && (
          <p className="mt-2 text-sm opacity-70">
            📍 {userProfile.address}
          </p>
        )}
        
        {userProfile?.relationshipStatus && (
          <p className="mt-1 text-sm opacity-70">
            ❤️ {userProfile.relationshipStatus}
          </p>
        )}

        <div className="flex gap-2 mt-4 flex-wrap">
          {userProfile?.skills ? (
            userProfile.skills.split(',').map((skill: string) => (
              <span key={skill.trim()} className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-medium">{skill.trim()}</span>
            ))
          ) : userProfile?.interests?.length > 0 ? (
            userProfile.interests.map((interest: string) => (
              <span key={interest} className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-medium">{interest}</span>
            ))
          ) : (
            <>
              <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-medium">Coding</span>
              <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-medium">Coffee</span>
              <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-medium">Music</span>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-around py-6 mt-6 border-y border-black/5 dark:border-white/5">
          <div className="text-center">
            <p className="text-xl font-bold">{postCount}</p>
            <p className="text-xs opacity-60 uppercase tracking-wider font-medium mt-1">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{followerCount}</p>
            <p className="text-xs opacity-60 uppercase tracking-wider font-medium mt-1">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{followingCount}</p>
            <p className="text-xs opacity-60 uppercase tracking-wider font-medium mt-1">Following</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button 
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 opacity-70" />
              <span className="font-medium">App Theme</span>
            </div>
            <div className="flex gap-1">
              {themes.map(t => (
                <div key={t.id} className={`w-4 h-4 rounded-full border border-black/10 dark:border-white/10 ${theme === t.id ? 'ring-2 ring-offset-1 ring-offset-[var(--bg-color)] ring-[var(--text-color)]' : ''}`} style={{ backgroundColor: t.color }} />
              ))}
            </div>
          </button>

          {showThemePicker && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 flex justify-between"
            >
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-12 h-12 rounded-full border-2 border-black/10 dark:border-white/10 flex items-center justify-center ${theme === t.id ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-color)] ring-[var(--text-color)]' : ''}`} style={{ backgroundColor: t.color }}>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.accent }} />
                  </div>
                  <span className="text-xs font-medium opacity-70">{t.name}</span>
                </button>
              ))}
            </motion.div>
          )}

          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[var(--accent-color)] text-white hover:opacity-90 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Admin Panel</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
