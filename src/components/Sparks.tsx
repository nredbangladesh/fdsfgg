import { useState, useEffect } from 'react';
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, X, Info, MapPin, MessageCircle, Heart, Sparkles } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';

export default function Sparks() {
  const navigate = useNavigate();
  const { userProfile } = useAppStore();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [receivedSparks, setReceivedSparks] = useState<any[]>([]);
  const [mutualSparks, setMutualSparks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'discover' | 'mutual'>('discover');

  useEffect(() => {
    if (!userProfile?.schoolId || !auth.currentUser) return;

    // Fetch Received Sparks (pending)
    const qReceived = query(
      collection(db, 'sparks'),
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', 'pending'),
      limit(20)
    );

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      setReceivedSparks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sparks'));

    // Fetch Mutual Sparks
    const qMutualSent = query(
      collection(db, 'sparks'),
      where('senderId', '==', auth.currentUser.uid),
      where('status', '==', 'mutual'),
      limit(20)
    );
    const qMutualReceived = query(
      collection(db, 'sparks'),
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', 'mutual'),
      limit(20)
    );

    const processMutual = async (docs: any[]) => {
      const mutualList = await Promise.all(docs.map(async (spark) => {
        const otherId = spark.senderId === auth.currentUser?.uid ? spark.receiverId : spark.senderId;
        const userSnap = await getDoc(doc(db, 'users', otherId));
        return { ...spark, otherUser: userSnap.exists() ? { id: otherId, ...userSnap.data() } : null };
      }));
      setMutualSparks(mutualList.filter(m => m.otherUser));
    };

    const unsubMutualSent = onSnapshot(qMutualSent, (snap) => processMutual([...snap.docs]), (error) => handleFirestoreError(error, OperationType.GET, 'sparks'));
    const unsubMutualReceived = onSnapshot(qMutualReceived, (snap) => processMutual([...snap.docs]), (error) => handleFirestoreError(error, OperationType.GET, 'sparks'));

    // Fetch Potential Matches
    const fetchSuggestions = async () => {
      try {
        const sentSnap = await getDocs(query(
          collection(db, 'sparks'),
          where('senderId', '==', auth.currentUser?.uid)
        ));
        const sparkedUserIds = new Set(sentSnap.docs.map(d => d.data().receiverId));
        sparkedUserIds.add(auth.currentUser?.uid);

        const qUsers = query(
          collection(db, 'users'),
          where('schoolId', '==', userProfile.schoolId),
          limit(50)
        );

        const unsubUsers = onSnapshot(qUsers, (snap) => {
          const users = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => !sparkedUserIds.has(u.id));
          setSuggestions(users);
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

        return unsubUsers;
      } catch (error) {
        console.error("Error fetching suggestions", error);
        setLoading(false);
      }
    };

    const unsubUsersPromise = fetchSuggestions();

    return () => {
      unsubReceived();
      unsubMutualSent();
      unsubMutualReceived();
      unsubUsersPromise.then(unsub => unsub && unsub());
    };
  }, [userProfile?.schoolId]);

  const handleAction = async (targetUser: any, action: 'spark' | 'skip') => {
    if (!auth.currentUser || !userProfile) return;

    if (action === 'spark') {
      try {
        const incoming = receivedSparks.find(s => s.senderId === targetUser.id);
        
        if (incoming) {
          await updateDoc(doc(db, 'sparks', incoming.id), {
            status: 'mutual',
            updatedAt: serverTimestamp()
          });
          // Mutual spark logic - maybe show a modal
        } else {
          await addDoc(collection(db, 'sparks'), {
            senderId: auth.currentUser.uid,
            receiverId: targetUser.id,
            schoolId: userProfile.schoolId,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'sparks');
      }
    }

    setSuggestions(prev => prev.filter(s => s.id !== targetUser.id));
  };

  return (
    <div className="min-h-full pb-24 flex flex-col">
      <header className="sticky top-0 z-30 bg-[var(--bg-color)]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-4 py-3 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-[var(--accent-color)]" /> Sparks
          </h1>
          <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full">
            <button 
              onClick={() => setActiveView('discover')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeView === 'discover' ? 'bg-[var(--accent-color)] text-white shadow-lg' : 'opacity-50'}`}
            >
              Discover
            </button>
            <button 
              onClick={() => setActiveView('mutual')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeView === 'mutual' ? 'bg-[var(--accent-color)] text-white shadow-lg' : 'opacity-50'}`}
            >
              Matches
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-8 flex-1 flex flex-col">
        {activeView === 'discover' ? (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Your Sparks</h2>
                <span className="text-sm font-medium opacity-60">{receivedSparks.length} people</span>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {receivedSparks.map(spark => (
                  <div key={spark.id} className="w-20 h-20 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden shrink-0 relative">
                    <img 
                      src={`https://picsum.photos/seed/${spark.senderId}/100/100`} 
                      alt="Blurred Spark" 
                      className="w-full h-full object-cover blur-md scale-110 opacity-50" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Flame className="w-6 h-6 text-[var(--accent-color)] opacity-80" />
                    </div>
                  </div>
                ))}
                {receivedSparks.length === 0 && (
                  <div className="w-full py-4 text-center opacity-30 text-sm italic">
                    No sparks yet. Keep exploring!
                  </div>
                )}
              </div>
              {receivedSparks.length > 0 && (
                <p className="text-xs opacity-50 text-center">Spark someone back to reveal who they are.</p>
              )}
            </section>

            <section className="flex-1 flex flex-col">
              <h2 className="font-bold text-lg mb-4">Send a Spark</h2>
              
              <div className="relative flex-1 flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    <div className="animate-pulse space-y-4 w-full max-w-sm">
                      <div className="aspect-[4/5] bg-black/5 dark:bg-white/5 rounded-3xl" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    <motion.div
                      key={suggestions[0].id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -20 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="w-full max-w-sm bg-black/5 dark:bg-white/5 rounded-3xl overflow-hidden shadow-xl"
                    >
                      <div className="aspect-[4/5] bg-black/10 dark:bg-white/10 relative">
                        <img 
                          src={`https://picsum.photos/seed/${suggestions[0].id}/400/500`} 
                          alt="Suggestion" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-white">
                          <h3 className="text-2xl font-bold">{suggestions[0].name}</h3>
                          <p className="opacity-80">{suggestions[0].academicStatus} • {suggestions[0].major || 'Undeclared'}</p>
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {suggestions[0].interests?.slice(0, 3).map((interest: string) => (
                              <span key={interest} className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-medium">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 flex items-center justify-center gap-8">
                        <button 
                          onClick={() => handleAction(suggestions[0], 'skip')}
                          className="w-16 h-16 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                        >
                          <X className="w-8 h-8 opacity-50" />
                        </button>
                        <button 
                          onClick={() => handleAction(suggestions[0], 'spark')}
                          className="w-20 h-20 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                        >
                          <Flame className="w-10 h-10" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center opacity-50 space-y-4">
                      <div className="w-24 h-24 rounded-full bg-black/5 dark:bg-white/5 mx-auto flex items-center justify-center">
                        <Flame className="w-10 h-10 opacity-20" />
                      </div>
                      <p>No more suggestions right now.<br/>Check back later!</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </>
        ) : (
          <div className="space-y-4">
            {mutualSparks.map(spark => (
              <motion.div 
                key={spark.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/5 dark:bg-white/5 rounded-3xl p-4 flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-black/10 dark:bg-white/10 overflow-hidden shrink-0 relative">
                  <img 
                    src={`https://picsum.photos/seed/${spark.otherUser.id}/100/100`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-[var(--accent-color)] rounded-full flex items-center justify-center border-2 border-[var(--bg-color)]">
                    <Heart className="w-3 h-3 text-white fill-current" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{spark.otherUser.name}</h3>
                  <p className="text-xs opacity-60 truncate">Mutual Spark!</p>
                </div>
                <button 
                  onClick={() => navigate('/messages')}
                  className="w-12 h-12 rounded-2xl bg-[var(--accent-color)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent-color)]/20"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
            {mutualSparks.length === 0 && (
              <div className="text-center py-20 opacity-50 space-y-4">
                <Sparkles className="w-12 h-12 mx-auto opacity-20" />
                <p>No mutual sparks yet.<br/>Keep sparking to find matches!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
