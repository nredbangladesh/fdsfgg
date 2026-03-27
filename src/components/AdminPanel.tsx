import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Database, Upload } from 'lucide-react';
import { seedDummyData } from '../lib/seed';
import AdminLimitControls from './AdminLimitControls';

interface Institution {
  id: string;
  name: string;
  type: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { userProfile } = useAppStore();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('University');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Check admin access
  const isAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'schooladmin' || userProfile?.email === 'nredbangladesh@gmail.com';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchInstitutions();
  }, [isAdmin, navigate]);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'schools'));
      const insts: Institution[] = [];
      querySnapshot.forEach((doc) => {
        insts.push({ id: doc.id, ...doc.data() } as Institution);
      });
      // Sort alphabetically
      insts.sort((a, b) => a.name.localeCompare(b.name));
      setInstitutions(insts);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'schools');
      setError('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'schools'), {
        name: newName.trim(),
        type: newType
      });
      setInstitutions([...institutions, { id: docRef.id, name: newName.trim(), type: newType }].sort((a, b) => a.name.localeCompare(b.name)));
      setIsAdding(false);
      setNewName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'schools');
      setError('Failed to add institution');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this institution?')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
      setInstitutions(institutions.filter(i => i.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `schools/${id}`);
      setError('Failed to delete institution');
    }
  };

  const startEdit = (inst: Institution) => {
    setEditingId(inst.id);
    setEditName(inst.name);
    setEditType(inst.type);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateDoc(doc(db, 'schools', editingId), {
        name: editName.trim(),
        type: editType
      });
      setInstitutions(institutions.map(i => i.id === editingId ? { ...i, name: editName.trim(), type: editType } : i).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schools/${editingId}`);
      setError('Failed to update institution');
    }
  };

  const handleSeedData = async () => {
    if (!userProfile?.schoolId) {
      alert('Please select a school first or make sure your profile has a schoolId.');
      return;
    }
    if (!window.confirm('This will create 100 dummy users and random posts. Continue?')) return;
    
    setIsSeeding(true);
    try {
      await seedDummyData(userProfile.schoolId);
      alert('Seeding complete!');
      fetchInstitutions();
    } catch (error) {
      console.error('Seeding failed', error);
      alert('Seeding failed. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  const [stats, setStats] = useState({ users: 0, posts: 0, schools: 0, follows: 0, ai_chats: 0 });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => setStats(prev => ({ ...prev, users: snap.size })));
    const unsubPosts = onSnapshot(collection(db, 'posts'), snap => setStats(prev => ({ ...prev, posts: snap.size })));
    const unsubSchools = onSnapshot(collection(db, 'schools'), snap => setStats(prev => ({ ...prev, schools: snap.size })));
    const unsubFollows = onSnapshot(collection(db, 'follows'), snap => setStats(prev => ({ ...prev, follows: snap.size })));
    const unsubAIChats = onSnapshot(collection(db, 'ai_chats'), snap => setStats(prev => ({ ...prev, ai_chats: snap.size })));
    return () => {
      unsubUsers();
      unsubPosts();
      unsubSchools();
      unsubFollows();
      unsubAIChats();
    };
  }, []);

  const handleClearData = async () => {
    if (!window.confirm('WARNING: This will delete ALL users (except admins), posts, follows, and AI chats. Continue?')) return;
    
    setLoading(true);
    try {
      // Delete posts
      const postsSnap = await getDocs(collection(db, 'posts'));
      for (const d of postsSnap.docs) {
        await deleteDoc(doc(db, 'posts', d.id));
      }
      
      // Delete follows
      const followsSnap = await getDocs(collection(db, 'follows'));
      for (const d of followsSnap.docs) {
        await deleteDoc(doc(db, 'follows', d.id));
      }

      // Delete AI chats
      const aiChatsSnap = await getDocs(collection(db, 'ai_chats'));
      for (const d of aiChatsSnap.docs) {
        await deleteDoc(doc(db, 'ai_chats', d.id));
      }

      // Delete users (except admins)
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        const data = d.data();
        if (data.role !== 'superadmin' && data.email !== 'nredbangladesh@gmail.com') {
          await deleteDoc(doc(db, 'users', d.id));
        }
      }
      
      alert('Data cleared successfully!');
    } catch (error) {
      console.error('Clear data error', error);
      alert('Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) return;
    const lines = bulkData.split('\n');
    const batch = writeBatch(db);
    
    for (const line of lines) {
      const [name, type] = line.split(',').map(s => s.trim());
      if (name) {
        const schoolRef = doc(collection(db, 'schools'));
        batch.set(schoolRef, {
          name,
          type: type || 'University',
          createdAt: new Date().toISOString(),
          status: 'active'
        });
      }
    }

    try {
      await batch.commit();
      setBulkData('');
      setIsBulkAdding(false);
      alert('Bulk import successful!');
      fetchInstitutions();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schools_batch');
    }
  };

  const handleImportDefault = async () => {
    const data = [
      { "name": "Jahangirnagar University", "type": "University" },
      { "name": "Savar Cantonment Public School and College", "type": "School & College" },
      { "name": "Savar Government College", "type": "College" },
      { "name": "Sena Public School and College", "type": "School & College" },
      { "name": "Morning Glory School and College", "type": "School & College" },
      { "name": "Savar Model College", "type": "College" },
      { "name": "Enam Medical College and Hospital", "type": "Medical College" },
      { "name": "Bangladesh Noubahini School and College Savar", "type": "School & College" },
      { "name": "AERE School and College", "type": "School & College" },
      { "name": "Gonoshasthaya Samaj Vittik Medical College", "type": "Medical College" },
      { "name": "Savar Laboratory College", "type": "College" },
      { "name": "Savar Laboratory School", "type": "School" },
      { "name": "Green Bell Laboratory School", "type": "School" },
      { "name": "Australis International School", "type": "School" },
      { "name": "Mofazzal-Momena Chakladar Mohila College", "type": "College" },
      { "name": "Adhar Chandra High School", "type": "School" },
      { "name": "Savar Girls' High School", "type": "School" },
      { "name": "Dairy Farm High School", "type": "School" },
      { "name": "BPATC School and College", "type": "School & College" },
      { "name": "Savar University College", "type": "College" },
      { "name": "Ashulia School and College", "type": "School & College" },
      { "name": "Dhamsona Karamatia High School", "type": "School" },
      { "name": "Genda Government Primary School", "type": "School" },
      { "name": "Thana Road Ideal School", "type": "School" },
      { "name": "Bank Colony High School", "type": "School" },
      { "name": "Savar Residential School & College", "type": "School & College" },
      { "name": "Zirabo Cantonment Public School & College", "type": "School & College" },
      { "name": "Shaheed Monsur Ali Medical College", "type": "Medical College" },
      { "name": "Savar Primary Training Institute (PTI)", "type": "Training Institute" },
      { "name": "Savar High School", "type": "School" },
      { "name": "Bananighat High School", "type": "School" },
      { "name": "Vatpara High School", "type": "School" },
      { "name": "Pathalia High School", "type": "School" },
      { "name": "Shimulia High School", "type": "School" },
      { "name": "Bishmail High School", "type": "School" },
      { "name": "Rajashon High School", "type": "School" },
      { "name": "Savar City College", "type": "College" },
      { "name": "Amin Bazar High School", "type": "School" },
      { "name": "Kadda High School", "type": "School" },
      { "name": "Bhanga Wall High School", "type": "School" },
      { "name": "Mirzanagar High School", "type": "School" },
      { "name": "Nayarhat High School", "type": "School" },
      { "name": "Kushumbra High School", "type": "School" },
      { "name": "Tetuljhora High School", "type": "School" },
      { "name": "Hemayetpur High School", "type": "School" },
      { "name": "Savar Ideal College", "type": "College" },
      { "name": "Gono Bishwabidyalay", "type": "University" },
      { "name": "Asian University of Bangladesh (Savar Campus)", "type": "University" },
      { "name": "City University (Permanent Campus)", "type": "University" },
      { "name": "Brac University (Savar Campus)", "type": "University" },
      { "name": "Daffodil International University (Permanent Campus)", "type": "University" }
    ];

    if (!window.confirm(`Are you sure you want to import ${data.length} institutions?`)) return;

    setLoading(true);
    let addedCount = 0;
    try {
      for (const item of data) {
        // Check if exists
        if (!institutions.some(i => i.name === item.name)) {
          await addDoc(collection(db, 'schools'), item);
          addedCount++;
        }
      }
      alert(`Successfully imported ${addedCount} new institutions.`);
      fetchInstitutions();
    } catch (err) {
      console.error(err);
      setError('Error during bulk import');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-color)] p-4 md:p-8">
      {isBulkAdding && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-color)] rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg">Bulk Import Schools</h3>
            <p className="text-xs opacity-60">Format: Name, Type (one per line)</p>
            <textarea 
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder="Harvard University, University&#10;Stanford University, University"
              className="w-full h-48 bg-black/5 dark:bg-white/5 rounded-xl p-4 outline-none resize-none font-mono text-sm border border-black/10 dark:border-white/10"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsBulkAdding(false)} className="flex-1 py-3 rounded-xl bg-black/5 dark:bg-white/5 font-bold">Cancel</button>
              <button onClick={handleBulkImport} className="flex-1 py-3 rounded-xl bg-[var(--accent-color)] text-white font-bold">Import</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold flex-1">Admin Panel</h1>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {isSeeding ? 'Seeding...' : 'Seed Data'}
            </button>
            <button 
              onClick={handleClearData}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </button>
            <button 
              onClick={() => setIsBulkAdding(true)}
              className="px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Bulk
            </button>
            <button 
              onClick={handleImportDefault}
              className="px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10"
            >
              Default List
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Users', value: stats.users, color: 'text-blue-500' },
            { label: 'Posts', value: stats.posts, color: 'text-green-500' },
            { label: 'Schools', value: stats.schools, color: 'text-purple-500' },
            { label: 'Follows', value: stats.follows, color: 'text-orange-500' },
            { label: 'AI Chats', value: stats.ai_chats, color: 'text-pink-500' }
          ].map(stat => (
            <div key={stat.label} className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Institutions ({institutions.length})</h2>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Add New
            </button>
          </div>

          {isAdding && (
            <div className="flex gap-2 mb-4 p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
              <input 
                type="text" 
                placeholder="Institution Name" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-color)] border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              />
              <select 
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-40 px-3 py-2 rounded-lg bg-[var(--bg-color)] border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              >
                <option value="University">University</option>
                <option value="College">College</option>
                <option value="School & College">School & College</option>
                <option value="School">School</option>
                <option value="Medical College">Medical College</option>
                <option value="Training Institute">Training Institute</option>
              </select>
              <button onClick={handleAdd} className="p-2 bg-[var(--accent-color)] text-white rounded-lg hover:opacity-90">
                <Save className="w-5 h-5" />
              </button>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-black/10 dark:bg-white/10 rounded-lg hover:bg-black/20 dark:hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 opacity-50">Loading institutions...</div>
          ) : (
            <div className="space-y-2">
              {institutions.map(inst => (
                <div key={inst.id} className="flex items-center justify-between p-3 bg-[var(--bg-color)] rounded-xl border border-black/5 dark:border-white/5">
                  {editingId === inst.id ? (
                    <div className="flex flex-1 gap-2 mr-2">
                      <input 
                        type="text" 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                      />
                      <select 
                        value={editType}
                        onChange={e => setEditType(e.target.value)}
                        className="w-40 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                      >
                        <option value="University">University</option>
                        <option value="College">College</option>
                        <option value="School & College">School & College</option>
                        <option value="School">School</option>
                        <option value="Medical College">Medical College</option>
                        <option value="Training Institute">Training Institute</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-medium">{inst.name}</div>
                      <div className="text-xs opacity-60">{inst.type}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    {editingId === inst.id ? (
                      <>
                        <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(inst)} className="p-2 opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(inst.id)} className="p-2 text-red-500 opacity-50 hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {institutions.length === 0 && !isAdding && (
                <div className="text-center py-8 opacity-50">No institutions found.</div>
              )}
            </div>
          )}
        </div>

        {/* Rate Limiting & Security Section */}
        <div className="mt-8 border-t border-black/5 dark:border-white/5 pt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            🛡️ Rate Limiting & DDoS Protection
          </h2>
          <p className="text-sm opacity-60 mb-4">
            Configure post/message limits and monitor DDoS threats for {userProfile?.schoolId || 'this school'}
          </p>
          <AdminLimitControls />
        </div>
      </div>
    </div>
  );
}
