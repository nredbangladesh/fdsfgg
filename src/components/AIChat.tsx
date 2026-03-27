import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useMessageRateLimit } from '../hooks/useRateLimit';
import { RateLimitDisplay, RateLimitBadge } from './RateLimitDisplay';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function AIChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Hi! I am your Campus AI assistant. I can help you find events, clubs, or answer questions about campus life. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // MESSAGE RATE LIMITING - SEARCHABLE: "MESSAGE_THROTTLE", "RATE_LIMIT_MESSAGE"
  const { isAllowed: canSendMessage, message: messageRateLimitMsg, timeRemaining: messageTimeRemaining } = useMessageRateLimit();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'ai_chats'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setMessages([
          { role: 'model', text: 'Hi! I am your Campus AI assistant. I can help you find events, clubs, or answer questions about campus life. How can I help you today?' }
        ]);
      } else {
        setMessages(snap.docs.map(d => ({ role: d.data().role, text: d.data().text })));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'ai_chats'));

    return () => unsub();
  }, []);
  
  // Keep the chat instance alive across renders
  const chatRef = useRef(ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: 'You are a helpful, friendly AI assistant for a university campus social app called Quad. You help students find events, clubs, and answer questions about campus life. Keep your answers concise and conversational.',
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // CHECK MESSAGE RATE LIMIT - SEARCHABLE: "CHECK_MESSAGE_LIMIT"
    if (!canSendMessage) {
      console.warn('Message rate limit exceeded:', messageRateLimitMsg);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Save user message
      await addDoc(collection(db, 'ai_chats'), {
        userId: auth.currentUser?.uid,
        role: 'user',
        text: userMessage,
        createdAt: serverTimestamp()
      });

      const response = await chatRef.current.sendMessage({ message: userMessage });
      const modelText = response.text || 'Sorry, I could not process that.';

      // Save model message
      await addDoc(collection(db, 'ai_chats'), {
        userId: auth.currentUser?.uid,
        role: 'model',
        text: modelText,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('AI Chat Error:', error);
      // Fallback local message if save fails
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[var(--accent-color)] text-white' : 'bg-black/10 dark:bg-white/10'}`}>
              {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-[var(--accent-color)] text-white rounded-tr-sm' : 'bg-black/5 dark:bg-white/5 rounded-tl-sm'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 flex-row"
          >
            <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[80%] p-4 rounded-2xl bg-black/5 dark:bg-white/5 rounded-tl-sm flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-black/5 dark:border-white/5 bg-[var(--bg-color)] space-y-2">
        {/* MESSAGE RATE LIMIT DISPLAY - SEARCHABLE: "MESSAGE_RATE_FEEDBACK" */}
        <RateLimitDisplay 
          isBlocked={!canSendMessage}
          timeRemaining={messageTimeRemaining}
          message={messageRateLimitMsg}
          type="message"
          size="small"
        />
        
        <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-full p-1 pl-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !(!canSendMessage) && handleSend()}
            placeholder="Ask Campus AI..."
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:opacity-50"
            disabled={!canSendMessage}
            title={!canSendMessage ? messageRateLimitMsg : ''}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !canSendMessage}
            className="w-10 h-10 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center disabled:opacity-50 transition-opacity shrink-0"
            title={!canSendMessage ? messageRateLimitMsg : 'Send message'}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
