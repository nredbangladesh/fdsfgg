import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, User, Palette, Shield, Bell, LogOut, ChevronRight, Check, Trash2, Info, Globe, Lock, Eye } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';

const THEMES = [
  { id: 'chalk', name: 'Chalk', color: '#f28482' },
  { id: 'ink', name: 'Ink', color: '#007bff' },
  { id: 'petal', name: 'Petal', color: '#e5989b' },
  { id: 'forest', name: 'Forest', color: '#ffb703' },
  { id: 'slate', name: 'Slate', color: '#9d4edd' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { userProfile, theme: currentTheme } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    major: '',
    pronouns: '',
    interests: [] as string[],
    birthYear: '',
    gender: '',
    academicStatus: '',
    locationEnabled: false,
    storyPrivacy: 'campus' // 'campus' or 'following'
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        major: userProfile.major || '',
        pronouns: userProfile.pronouns || '',
        interests: userProfile.interests || [],
        birthYear: userProfile.birthYear?.toString() || '',
        gender: userProfile.gender || '',
        academicStatus: userProfile.academicStatus || '',
        locationEnabled: userProfile.locationEnabled || false,
        storyPrivacy: userProfile.storyPrivacy || 'campus'
      });
    }
  }, [userProfile]);

  const availableInterests = ['Sports', 'Music', 'Gaming', 'Art', 'Food', 'Travel', 'Books', 'Film', 'Tech', 'Fitness', 'Politics', 'Fashion', 'Nature', 'Volunteering'];

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 5 ? [...prev.interests, interest] : prev.interests
    }));
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...formData,
        birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
        updatedAt: new Date().toISOString()
      });
      setActiveSection(null);
    } catch (error) {
      console.error("Update error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (themeId: string) => {
    document.documentElement.className = themeId;
    localStorage.setItem('theme', themeId);
    useAppStore.setState({ theme: themeId });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    const confirmed = window.confirm('Are you absolutely sure? This will delete your profile and all your data. This action cannot be undone.');
    if (!confirmed) return;

    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', uid));
      // Delete Auth User
      await deleteUser(auth.currentUser);
      navigate('/login');
    } catch (error) {
      console.error("Delete account error", error);
      alert('Please re-authenticate to delete your account.');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setActiveSection(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold">Edit Profile</h2>
            </div>
            
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Basic Info</h3>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Display Name</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Pronouns</label>
                  <input 
                    value={formData.pronouns}
                    onChange={e => setFormData({...formData, pronouns: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Bio</label>
                  <textarea 
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    className="w-full h-24 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] resize-none"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Academic</h3>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Major</label>
                  <input 
                    value={formData.major}
                    onChange={e => setFormData({...formData, major: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Academic Status</label>
                  <select 
                    value={formData.academicStatus}
                    onChange={e => setFormData({...formData, academicStatus: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] appearance-none"
                  >
                    <option value="" disabled>Select Status</option>
                    <option value="Undergrad Year 1">Undergrad Year 1</option>
                    <option value="Undergrad Year 2">Undergrad Year 2</option>
                    <option value="Undergrad Year 3">Undergrad Year 3</option>
                    <option value="Undergrad Year 4">Undergrad Year 4</option>
                    <option value="Postgrad">Postgrad</option>
                    <option value="PhD">PhD</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Personal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Birth Year</label>
                    <select 
                      value={formData.birthYear}
                      onChange={e => setFormData({...formData, birthYear: e.target.value})}
                      className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] appearance-none"
                    >
                      <option value="" disabled>Year</option>
                      {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 16 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase opacity-40 ml-4 mb-1 block">Gender</label>
                    <select 
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                      className="w-full p-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] appearance-none"
                    >
                      <option value="" disabled>Gender</option>
                      <option value="Man">Man</option>
                      <option value="Woman">Woman</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Interests (up to 5)</h3>
                <div className="flex flex-wrap gap-2">
                  {availableInterests.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        formData.interests.includes(interest) 
                          ? 'bg-[var(--accent-color)] text-white' 
                          : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Privacy</h3>
                <button 
                  onClick={() => setFormData({...formData, locationEnabled: !formData.locationEnabled})}
                  className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl"
                >
                  <span className="font-bold">Enable Location Services</span>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.locationEnabled ? 'bg-green-500' : 'bg-black/20 dark:bg-white/20'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.locationEnabled ? 'left-7' : 'left-1'}`} />
                  </div>
                </button>
              </section>

              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full py-4 rounded-full bg-[var(--accent-color)] text-white font-bold disabled:opacity-50 sticky bottom-4 shadow-xl"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setActiveSection(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold">Appearance</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {THEMES.map(t => (
                <button 
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all ${currentTheme === t.id ? 'bg-[var(--accent-color)] text-white' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: t.color }} />
                    <span className="font-bold">{t.name}</span>
                  </div>
                  {currentTheme === t.id && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setActiveSection(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold">Privacy & Security</h2>
            </div>
            
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Story Privacy</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'campus', name: 'Entire Campus', desc: 'Anyone at your school can see your stories' },
                    { id: 'following', name: 'Followers Only', desc: 'Only people who follow you can see your stories' }
                  ].map(option => (
                    <button 
                      key={option.id}
                      onClick={() => setFormData({...formData, storyPrivacy: option.id})}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${formData.storyPrivacy === option.id ? 'bg-[var(--accent-color)] text-white' : 'bg-black/5 dark:bg-white/5'}`}
                    >
                      <div className="text-left">
                        <p className="font-bold">{option.name}</p>
                        <p className={`text-[10px] ${formData.storyPrivacy === option.id ? 'text-white/70' : 'opacity-50'}`}>{option.desc}</p>
                      </div>
                      {formData.storyPrivacy === option.id && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2">Location</h3>
                <button 
                  onClick={() => setFormData({...formData, locationEnabled: !formData.locationEnabled})}
                  className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl"
                >
                  <div className="text-left">
                    <p className="font-bold">Location Services</p>
                    <p className="text-[10px] opacity-50">Used for finding nearby students and events</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.locationEnabled ? 'bg-green-500' : 'bg-black/20 dark:bg-white/20'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.locationEnabled ? 'left-7' : 'left-1'}`} />
                  </div>
                </button>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase opacity-50 ml-2 text-red-500">Danger Zone</h3>
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Account</span>
                </button>
              </section>

              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full py-4 rounded-full bg-[var(--accent-color)] text-white font-bold disabled:opacity-50"
              >
                Save Privacy Settings
              </button>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setActiveSection(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold">About Campus</h2>
            </div>
            
            <div className="space-y-4">
              <div className="p-8 bg-black/5 dark:bg-white/5 rounded-3xl text-center space-y-4">
                <div className="w-20 h-20 bg-[var(--accent-color)] rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-[var(--accent-color)]/20">
                  <span className="text-3xl font-black text-white">C</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">CAMPUS</h3>
                  <p className="text-sm opacity-50">Version 1.0.0 (Build 2026)</p>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors">
                  <span className="font-bold">Terms of Service</span>
                  <ChevronRight className="w-5 h-5 opacity-30" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors">
                  <span className="font-bold">Privacy Policy</span>
                  <ChevronRight className="w-5 h-5 opacity-30" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors">
                  <span className="font-bold">Open Source Licenses</span>
                  <ChevronRight className="w-5 h-5 opacity-30" />
                </button>
              </div>

              <p className="text-center text-[10px] opacity-30 pt-8">
                Made with ❤️ for students everywhere.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase opacity-50 ml-4 mb-2">Account</h3>
              <button 
                onClick={() => setActiveSection('profile')}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 opacity-70" />
                  <span className="font-bold">Edit Profile</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
              <button 
                onClick={() => setActiveSection('privacy')}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 opacity-70" />
                  <span className="font-bold">Privacy & Security</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase opacity-50 ml-4 mb-2">Preferences</h3>
              <button 
                onClick={() => setActiveSection('appearance')}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 opacity-70" />
                  <span className="font-bold">Appearance</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 opacity-70" />
                  <span className="font-bold">Notifications</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 opacity-70" />
                  <span className="font-bold">Language</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase opacity-50 ml-4 mb-2">Support</h3>
              <button 
                onClick={() => setActiveSection('about')}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 opacity-70" />
                  <span className="font-bold">About</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
              <button 
                onClick={() => navigate('/agent-docs')}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 opacity-70" />
                  <span className="font-bold">AI Agent Docs</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30" />
              </button>
            </div>

            <div className="pt-8">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] p-4 max-w-2xl mx-auto">
      <motion.div
        key={activeSection || 'main'}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {renderSection()}
      </motion.div>
    </div>
  );
}
