import { useState, useEffect, useRef } from 'react';
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit, Flame, Users, Hash, Info, Bot, ArrowLeft, Send, User as UserIcon, MoreVertical, Paperclip, Smile, Check, CheckCheck } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import AIChat from './AIChat';

export default function Messages() {
  const { userProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState<'dms' | 'campus' | 'ai'>('dms');
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isNewMessage, setIsNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch all messages involving the current user to build chat list
    // In a real app, we'd have a 'conversations' collection.
    const qSent = query(collection(db, 'messages'), where('senderId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'), limit(100));
    const qReceived = query(collection(db, 'messages'), where('receiverId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'), limit(100));

    const processMessages = async (docs: any[]) => {
      const chatMap = new Map();
      
      // Add "Saved Messages" (Self)
      chatMap.set(auth.currentUser?.uid, {
        id: auth.currentUser?.uid,
        text: 'Cloud storage for your messages',
        createdAt: { toDate: () => new Date() },
        user: { name: 'Saved Messages', isSaved: true }
      });

      for (const d of docs) {
        const data = d.data();
        const otherId = data.senderId === auth.currentUser?.uid ? data.receiverId : data.senderId;
        
        // Skip self messages for the map, we already added Saved Messages
        if (otherId === auth.currentUser?.uid) {
          if (!chatMap.get(otherId).realMessage || data.createdAt?.toMillis() > chatMap.get(otherId).createdAt?.toMillis()) {
            chatMap.set(otherId, { id: otherId, ...data, user: { name: 'Saved Messages', isSaved: true }, realMessage: true });
          }
          continue;
        }

        if (!chatMap.has(otherId) || data.createdAt?.toMillis() > chatMap.get(otherId).createdAt?.toMillis()) {
          chatMap.set(otherId, { id: otherId, ...data });
        }
      }

      const chatList = await Promise.all(Array.from(chatMap.values()).map(async (chat) => {
        if (chat.user?.isSaved) return chat;
        const userSnap = await getDoc(doc(db, 'users', chat.id));
        return { ...chat, user: userSnap.exists() ? userSnap.data() : { name: 'Unknown User' } };
      }));

      setChats(chatList.sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toMillis?.() || a.createdAt?.toDate?.().getTime() || 0)));
    };

    const unsubSent = onSnapshot(qSent, (snap) => processMessages([...snap.docs]), (error) => handleFirestoreError(error, OperationType.GET, 'messages'));
    const unsubReceived = onSnapshot(qReceived, (snap) => processMessages([...snap.docs]), (error) => handleFirestoreError(error, OperationType.GET, 'messages'));

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, []);

  useEffect(() => {
    if (!selectedChat || !auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [auth.currentUser.uid, selectedChat.id]),
      where('receiverId', 'in', [auth.currentUser.uid, selectedChat.id]),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Mark as read if receiver
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.receiverId === auth.currentUser?.uid && !data.read) {
          updateDoc(doc(db, 'messages', d.id), { read: true });
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));

    return () => unsub();
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChat || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        receiverId: selectedChat.id,
        text: input.trim(),
        read: false,
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  const startNewChat = async (user: any) => {
    setSelectedChat({ id: user.id, user });
    setIsNewMessage(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (isNewMessage && userProfile?.schoolId) {
      const q = query(collection(db, 'users'), where('schoolId', '==', userProfile.schoolId), limit(20));
      const unsub = onSnapshot(q, (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== auth.currentUser?.uid));
      });
      return () => unsub();
    }
  }, [isNewMessage, userProfile?.schoolId]);

  if (selectedChat) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e1621] text-white flex flex-col">
        <header className="h-14 bg-[#17212b] px-4 flex items-center gap-4 shadow-md shrink-0">
          <button onClick={() => setSelectedChat(null)} className="p-2 -ml-2 rounded-full hover:bg-white/5">
            <ArrowLeft className="w-6 h-6 text-[#6c7883]" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[#2b5278] overflow-hidden shrink-0 flex items-center justify-center">
            {selectedChat.user?.isSaved ? (
              <div className="w-full h-full bg-[#5288c1] flex items-center justify-center">
                <CheckCheck className="w-5 h-5 text-white" />
              </div>
            ) : (
              <img src={`https://picsum.photos/seed/${selectedChat.id}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{selectedChat.user?.name || selectedChat.name}</h3>
            <p className="text-[11px] text-[#6c7883]">{selectedChat.user?.isSaved ? 'Cloud storage' : 'last seen recently'}</p>
          </div>
          <button className="p-2 rounded-full hover:bg-white/5">
            <MoreVertical className="w-5 h-5 text-[#6c7883]" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0e1621] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-1.5 rounded-xl relative shadow-sm ${
                msg.senderId === auth.currentUser?.uid 
                  ? 'bg-[#2b5278] text-white rounded-tr-none' 
                  : 'bg-[#182533] text-white rounded-tl-none'
              }`}>
                <p className="text-[14px] leading-tight pr-12">{msg.text}</p>
                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span className="text-[10px] text-[#6c7883]">
                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {msg.senderId === auth.currentUser?.uid && (
                    msg.read ? <CheckCheck className="w-3 h-3 text-[#4fae4e]" /> : <Check className="w-3 h-3 text-[#6c7883]" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-[#17212b] p-2 flex items-end gap-2 shrink-0">
          <button className="p-2 text-[#6c7883] hover:text-white transition-colors">
            <Paperclip className="w-6 h-6" />
          </button>
          <div className="flex-1 bg-transparent min-h-[40px] flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message"
              className="w-full bg-transparent border-none outline-none text-[15px] py-2"
            />
          </div>
          <button className="p-2 text-[#6c7883] hover:text-white transition-colors">
            <Smile className="w-6 h-6" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 text-[#5288c1] hover:text-[#64b5f6] transition-colors disabled:opacity-30"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0e1621] text-white flex flex-col">
      <header className="h-14 bg-[#17212b] px-4 flex items-center gap-4 shadow-md shrink-0 sticky top-0 z-30">
        <button className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <MoreVertical className="w-6 h-6 text-[#6c7883]" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7883]" />
          <input 
            type="text"
            placeholder="Search"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            className="w-full bg-[#242f3d] border-none rounded-full py-1.5 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#5288c1]"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex gap-0 border-b border-[#0e1621]">
          {['dms', 'campus', 'ai'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors relative ${
                activeTab === tab ? 'text-[#5288c1]' : 'text-[#6c7883] hover:text-white'
              }`}
            >
              {tab === 'dms' ? 'Chats' : tab === 'campus' ? 'Rooms' : 'AI'}
              {activeTab === tab && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5288c1]" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'dms' && (
          <div className="divide-y divide-[#0e1621]">
            {chats
              .filter(chat => chat.user?.name?.toLowerCase().includes(chatSearchQuery.toLowerCase()) || chat.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
              .map(chat => (
              <button 
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#17212b] transition-colors text-left group"
              >
                <div className="w-14 h-14 rounded-full bg-[#2b5278] overflow-hidden shrink-0 relative flex items-center justify-center">
                  {chat.user?.isSaved ? (
                    <div className="w-full h-full bg-[#5288c1] flex items-center justify-center">
                      <CheckCheck className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <img src={chat.user?.photoUrl || `https://picsum.photos/seed/${chat.id}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-[15px] truncate">{chat.user?.name}</h3>
                    <div className="flex items-center gap-1.5">
                      {chat.senderId === auth.currentUser?.uid && (
                        chat.read ? <CheckCheck className="w-3 h-3 text-[#4fae4e]" /> : <Check className="w-3 h-3 text-[#6c7883]" />
                      )}
                      <span className="text-[12px] text-[#6c7883]">
                        {chat.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] truncate text-[#6c7883]">
                      {chat.text}
                    </p>
                    {chat.read === false && chat.receiverId === auth.currentUser?.uid && (
                      <div className="bg-[#5288c1] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        1
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {chats.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
                <Edit className="w-12 h-12 mb-4" />
                <p>No messages yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campus' && (
          <div className="p-4 space-y-4">
            <div className="p-4 rounded-xl bg-[#17212b] border border-[#2b5278]/30 text-[#6c7883] text-sm">
              <p>Campus rooms are anonymous. You appear as "Student #XXXX".</p>
            </div>
            <div className="text-center py-12 opacity-30">
              <Hash className="w-12 h-12 mx-auto mb-4" />
              <p>Rooms coming soon!</p>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col h-[calc(100vh-180px)]">
            <AIChat />
          </div>
        )}
      </div>

      <button 
        onClick={() => setIsNewMessage(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#5288c1] text-white shadow-xl flex items-center justify-center hover:bg-[#64b5f6] transition-colors z-40"
      >
        <Edit className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isNewMessage && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-50 bg-[#0e1621] flex flex-col"
          >
            <header className="h-14 bg-[#17212b] px-4 flex items-center gap-4 shadow-md shrink-0">
              <button onClick={() => setIsNewMessage(false)} className="p-2 -ml-2 rounded-full hover:bg-white/5">
                <ArrowLeft className="w-6 h-6 text-[#6c7883]" />
              </button>
              <h2 className="text-lg font-bold">New Message</h2>
            </header>
            <div className="p-4">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7883]" />
                <input 
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#242f3d] border-none rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#5288c1]"
                />
              </div>
              <div className="space-y-1">
                {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                  <button 
                    key={user.id}
                    onClick={() => startNewChat(user)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#17212b] transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#2b5278] overflow-hidden shrink-0">
                      <img src={`https://picsum.photos/seed/${user.id}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px]">{user.name}</h3>
                      <p className="text-[12px] text-[#6c7883]">{user.major || 'Student'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
