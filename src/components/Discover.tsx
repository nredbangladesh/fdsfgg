import { useState, useEffect } from 'react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Users, Calendar, Filter, X, ArrowRight, Plus } from 'lucide-react';

export default function Discover() {
  const [activeTab, setActiveTab] = useState<'people' | 'events' | 'clubs'>('people');
  const { userProfile } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [people, setPeople] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (!userProfile?.schoolId) return;

    // Fetch People
    const qPeople = query(collection(db, 'users'), where('schoolId', '==', userProfile.schoolId), limit(50));
    const unsubPeople = onSnapshot(qPeople, (snap) => {
      setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== userProfile.uid));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    // Fetch Events
    const qEvents = query(collection(db, 'events'), where('schoolId', '==', userProfile.schoolId), limit(50));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'events'));

    // Fetch Clubs
    const qClubs = query(collection(db, 'clubs'), where('schoolId', '==', userProfile.schoolId), limit(50));
    const unsubClubs = onSnapshot(qClubs, (snap) => {
      setClubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'clubs'));

    return () => {
      unsubPeople();
      unsubEvents();
      unsubClubs();
    };
  }, [userProfile?.schoolId, userProfile?.uid]);

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.major?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.interests?.some((i: string) => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClubs = clubs.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full pb-24">
      <header className="sticky top-0 z-30 bg-[var(--bg-color)]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-4 py-3 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <button className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
          {['people', 'events', 'clubs'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-[var(--accent-color)] text-white' : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {activeTab === 'people' && (
          <div className="grid grid-cols-2 gap-4">
            {filteredPeople.map(person => (
              <motion.div 
                key={person.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedItem({ type: 'person', ...person })}
                className="bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:ring-2 hover:ring-[var(--accent-color)] transition-all"
              >
                <div className="aspect-square bg-black/10 dark:bg-white/10 relative">
                  <img src={`https://picsum.photos/seed/${person.id}/200/200`} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Campus
                  </div>
                </div>
                <div className="p-3 space-y-1 flex-1">
                  <h3 className="font-bold text-sm truncate">{person.name}</h3>
                  <p className="text-[10px] opacity-60 truncate">{person.academicStatus} • {person.major || 'Undeclared'}</p>
                  <div className="flex gap-1 pt-2 flex-wrap">
                    {person.interests?.slice(0, 2).map((interest: string) => (
                      <span key={interest} className="text-[9px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-medium">{interest}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredPeople.length === 0 && <p className="col-span-2 text-center opacity-50 py-12">No matches found for "{searchQuery}"</p>}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedItem({ type: 'event', ...event })}
                className="bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:ring-2 hover:ring-[var(--accent-color)] transition-all"
              >
                <div className="h-40 bg-black/10 dark:bg-white/10 relative">
                  <img src={`https://picsum.photos/seed/${event.id}/400/200`} alt="Event" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-3 right-3 bg-[var(--accent-color)] text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                    {event.category || 'Social'}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-lg">{event.title}</h3>
                  <div className="flex items-center gap-4 text-xs opacity-70">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(event.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.locationName}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="w-8 h-8 rounded-full border-2 border-[var(--bg-color)] bg-black/20 overflow-hidden">
                          <img src={`https://picsum.photos/seed/u${j}/50/50`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-[var(--bg-color)] bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                        +12
                      </div>
                    </div>
                    <button className="px-6 py-2 rounded-full bg-[var(--accent-color)] text-white font-bold text-sm shadow-lg shadow-[var(--accent-color)]/20">
                      RSVP
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredEvents.length === 0 && <p className="text-center opacity-50 py-12">No events found for "{searchQuery}"</p>}
          </div>
        )}

        {activeTab === 'clubs' && (
          <div className="space-y-4">
            {filteredClubs.map(club => (
              <motion.div 
                key={club.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedItem({ type: 'club', ...club })}
                className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:ring-2 hover:ring-[var(--accent-color)] transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-black/10 dark:bg-white/10 overflow-hidden shrink-0">
                  <img src={`https://picsum.photos/seed/${club.id}/100/100`} alt="Club" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{club.name}</h3>
                  <p className="text-xs opacity-60 truncate mb-1">{club.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--accent-color)] uppercase tracking-wider">
                    <Users className="w-3 h-3" /> {club.memberCount || 0} members
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-30" />
              </motion.div>
            ))}
            {filteredClubs.length === 0 && <p className="text-center opacity-50 py-12">No clubs found for "{searchQuery}"</p>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[var(--bg-color)] rounded-t-[32px] overflow-hidden shadow-2xl"
            >
              <div className="h-1.5 w-12 bg-black/10 dark:bg-white/10 rounded-full mx-auto my-4" />
              
              <div className="p-6 pt-2 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-3xl bg-black/10 dark:bg-white/10 overflow-hidden shrink-0">
                    <img 
                      src={`https://picsum.photos/seed/${selectedItem.id}/200/200`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold truncate">{selectedItem.name || selectedItem.title}</h2>
                    <p className="opacity-60 text-sm">
                      {selectedItem.type === 'person' ? `${selectedItem.academicStatus} • ${selectedItem.major}` : 
                       selectedItem.type === 'event' ? `${selectedItem.category} • ${selectedItem.locationName}` :
                       `${selectedItem.category} Club`}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-2.5 rounded-xl bg-[var(--accent-color)] text-white font-bold text-sm">
                        {selectedItem.type === 'person' ? 'Message' : 
                         selectedItem.type === 'event' ? 'RSVP Now' : 'Join Club'}
                      </button>
                      <button className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <Filter className="w-5 h-5 opacity-50" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider opacity-50">About</h4>
                  <p className="text-sm leading-relaxed opacity-80">
                    {selectedItem.bio || selectedItem.description || 'No description provided.'}
                  </p>
                </div>

                {selectedItem.interests && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider opacity-50">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.interests.map((i: string) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-medium">{i}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
