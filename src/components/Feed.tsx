import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uploadPhotoWithAdminCopy } from '../lib/imgbb';
import { usePostRateLimit } from '../hooks/useRateLimit';
import { RateLimitDisplay, RateLimitProgress } from './RateLimitDisplay';
import PostLimitConfigService from '../services/PostLimitConfigService';

function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden bg-black/5 dark:bg-white/5 ${className}`}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          referrerPolicy="no-referrer"
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin opacity-20" />
        </div>
      )}
    </div>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStory, setActiveStory] = useState<any[] | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const { userProfile } = useAppStore();
  
  // Rate limiting state - SEARCHABLE: "POST_RATE_LIMIT"
  const [postLimitConfig, setPostLimitConfig] = useState<any>(null);
  const { isAllowed: canPost, message: postMessage, timeRemaining: postTimeRemaining, checkLimit: checkPostLimit } = usePostRateLimit(postLimitConfig);
  
  // Load post limit configuration from admin panel
  useEffect(() => {
    const loadConfig = async () => {
      if (!userProfile?.schoolId) return;
      try {
        const config = await PostLimitConfigService.loadPostLimitConfig(userProfile.schoolId);
        setPostLimitConfig({
          throttleMs: config.postThrottleMs,
          hourlyLimit: config.postHourlyLimit,
          dailyLimit: config.postDailyLimit,
        });
      } catch (error) {
        console.error('Failed to load post limit config:', error);
        // Use defaults on error
        setPostLimitConfig({
          throttleMs: 5000,
          hourlyLimit: 10,
          dailyLimit: 30,
        });
      }
    };
    
    loadConfig();
  }, [userProfile?.schoolId]);

  useEffect(() => {
    if (!userProfile?.schoolId) return;

    // Fetch Posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('schoolId', '==', userProfile.schoolId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(newPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
    });

    // Fetch Stories
    const now = new Date().toISOString();
    const storiesQuery = query(
      collection(db, 'stories'),
      where('schoolId', '==', userProfile.schoolId),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')
    );

    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const allStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Group stories by author
      const grouped = allStories.reduce((acc: any, story: any) => {
        if (!acc[story.authorId]) acc[story.authorId] = [];
        acc[story.authorId].push(story);
        return acc;
      }, {});
      setStories(Object.values(grouped));
    }, (error) => {
      console.error("Stories fetch error", error);
    });

    return () => {
      unsubscribePosts();
      unsubscribeStories();
    };
  }, [userProfile?.schoolId]);

  const handlePost = async () => {
    if ((!newPostText.trim() && !postImage) || !auth.currentUser || !userProfile?.schoolId) return;
    
    // CHECK RATE LIMIT - SEARCHABLE: "CHECK_POST_LIMIT", "THROTTLE_CHECK"
    const limitCheck = checkPostLimit();
    if (!limitCheck.allowed) {
      console.warn('Post rate limit exceeded:', limitCheck.message);
      return;
    }
    
    setIsUploading(true);
    try {
      let imageUrl = '';
      let adminImageUrl = '';
      if (postImage) {
        const urls = await uploadPhotoWithAdminCopy(postImage, 'feed_post');
        imageUrl = urls.clientUrl;
        adminImageUrl = urls.adminUrl;
      }

      await addDoc(collection(db, 'posts'), {
        authorId: auth.currentUser.uid,
        schoolId: userProfile.schoolId,
        text: newPostText,
        imageUrl,
        adminImageUrl,
        audience: 'campus',
        status: 'active',
        reactionCount: 0,
        replyCount: 0,
        reportCount: 0,
        createdAt: new Date().toISOString()
      });
      setNewPostText('');
      setPostImage(null);
      setPostImagePreview(null);
      setIsComposing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPostImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser || !userProfile?.schoolId) return;
    
    setIsUploading(true);
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    try {
      const urls = await uploadPhotoWithAdminCopy(file, 'story');

      await addDoc(collection(db, 'stories'), {
        authorId: auth.currentUser.uid,
        schoolId: userProfile.schoolId,
        mediaUrl: urls.clientUrl,
        adminMediaUrl: urls.adminUrl,
        mediaType: 'image',
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        viewers: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'stories');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm('Delete this story?')) return;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setActiveStory(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stories/${storyId}`);
    }
  };

  const nextStory = () => {
    if (!activeStory) return;
    if (activeStoryIndex < activeStory.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStory(null);
      setActiveStoryIndex(0);
    }
  };

  const prevStory = () => {
    if (!activeStory) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    }
  };

  return (
    <div className="relative min-h-full pb-24 bg-black/5 dark:bg-black/20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-color)]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter text-[var(--accent-color)]">CAMPUS</h1>
        <div className="flex gap-1">
          {['For You', 'Following'].map(filter => (
            <button key={filter} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'For You' ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60'}`}>
              {filter}
            </button>
          ))}
        </div>
      </header>

      {/* Stories Bar */}
      <div className="bg-[var(--bg-color)] border-b border-black/5 dark:border-white/5 mb-2">
        <div className="flex gap-4 overflow-x-auto px-4 py-4 no-scrollbar">
          <label className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleAddStory} disabled={isUploading} />
            <div className={`w-14 h-14 rounded-full border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center ${isUploading ? 'animate-pulse' : ''}`}>
              <Plus className="w-5 h-5 opacity-50" />
            </div>
            <span className="text-[10px] font-bold opacity-60">Your Story</span>
          </label>
          
          {stories.map((authorStories: any) => (
            <button 
              key={authorStories[0].authorId} 
              onClick={() => {
                setActiveStory(authorStories);
                setActiveStoryIndex(0);
              }}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[var(--accent-color)] to-purple-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-[var(--bg-color)] border-2 border-[var(--bg-color)] overflow-hidden">
                  <img 
                    src={`https://picsum.photos/seed/${authorStories[0].authorId}/100/100`} 
                    alt="Story" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              </div>
              <span className="text-[10px] font-bold truncate w-14 text-center opacity-80">
                {authorStories[0].authorId === auth.currentUser?.uid ? 'You' : 'Student'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed Posts */}
      <div className="space-y-2">
        {posts.map(post => (
          <motion.article 
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[var(--bg-color)] p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden shrink-0">
                  <img src={`https://picsum.photos/seed/${post.authorId}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-sm truncate">{post.authorId === auth.currentUser?.uid ? 'You' : 'Student'}</p>
                    <span className="text-xs opacity-40">•</span>
                    <p className="text-xs opacity-40 truncate">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) : 'just now'}</p>
                  </div>
                  <p className="text-[10px] font-bold text-[var(--accent-color)] uppercase tracking-wider">Campus Resident</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {post.authorId === auth.currentUser?.uid && (
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 text-red-500 opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button className="p-2 opacity-40 hover:opacity-100 transition-opacity"><MoreHorizontal className="w-5 h-5" /></button>
              </div>
            </div>
            
            <p className="text-[15px] leading-snug whitespace-pre-wrap">{post.text}</p>
            
            {post.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/5">
                <LazyImage src={post.imageUrl} alt="Post content" className="aspect-video" />
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 opacity-60 hover:opacity-100 hover:text-[var(--accent-color)] transition-all group">
                  <div className="p-2 rounded-full group-hover:bg-[var(--accent-color)]/10">
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">{post.reactionCount || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 opacity-60 hover:opacity-100 hover:text-blue-500 transition-all group">
                  <div className="p-2 rounded-full group-hover:bg-blue-500/10">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">{post.replyCount || 0}</span>
                </button>
              </div>
              <button className="p-2 opacity-60 hover:opacity-100 hover:text-green-500 transition-all group">
                <div className="p-2 rounded-full group-hover:bg-green-500/10">
                  <Share2 className="w-5 h-5" />
                </div>
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden group">
              <img 
                src={activeStory[activeStoryIndex].mediaUrl} 
                alt="Story Content" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
              
              {/* Navigation Areas */}
              <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                <div className="w-2/3 h-full cursor-pointer" onClick={nextStory} />
              </div>

              {/* Progress Indicators */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                {activeStory.map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-white transition-all duration-300 ${i < activeStoryIndex ? 'w-full' : i === activeStoryIndex ? 'w-full' : 'w-0'}`} 
                    />
                  </div>
                ))}
              </div>

              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${activeStory[activeStoryIndex].authorId}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm block leading-none">
                      {activeStory[activeStoryIndex].authorId === auth.currentUser?.uid ? 'You' : 'Student'}
                    </span>
                    <span className="text-white/60 text-[10px]">
                      {formatDistanceToNow(new Date(activeStory[activeStoryIndex].createdAt))} ago
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeStory[activeStoryIndex].authorId === auth.currentUser?.uid && (
                    <button 
                      onClick={() => handleDeleteStory(activeStory[activeStoryIndex].id)}
                      className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setActiveStory(null)} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent z-20">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Reply to story..." 
                    className="flex-1 bg-white/20 backdrop-blur-md border-none rounded-full px-4 py-2 text-white placeholder:text-white/70 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button 
        onClick={() => setIsComposing(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[var(--accent-color)] text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Composer Modal */}
      <AnimatePresence>
        {isComposing && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-lg bg-[var(--bg-color)] rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">New Post</h3>
                <button onClick={() => setIsComposing(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <X className="w-5 h-5 opacity-50" />
                </button>
              </div>
              
              {/* RATE LIMIT DISPLAY - SEARCHABLE: "RATE_LIMIT_FEEDBACK" */}
              <RateLimitDisplay 
                isBlocked={!canPost}
                timeRemaining={postTimeRemaining}
                message={postMessage}
                type="post"
                size="small"
              />
              
              {/* POST LIMIT PROGRESS - Shows how many posts user has left this hour */}
              {postLimitConfig && (
                <RateLimitProgress 
                  currentCount={0} // In production, track this from Firestore
                  maxCount={postLimitConfig.hourlyLimit}
                  type="post"
                />
              )}
              
              <textarea 
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full h-32 bg-transparent border-none outline-none resize-none text-lg"
                autoFocus
              />
              {postImagePreview && (
                <div className="relative rounded-2xl overflow-hidden border border-black/5 dark:border-white/5">
                  <img src={postImagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                  <button 
                    onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
                <div className="flex gap-2">
                  <label className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-[var(--accent-color)] cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <ImageIcon className="w-5 h-5" />
                  </label>
                </div>
                <button 
                  onClick={handlePost}
                  disabled={(!newPostText.trim() && !postImage) || isUploading || !canPost}
                  className="px-8 py-2.5 rounded-full bg-[var(--accent-color)] text-white font-bold disabled:opacity-50 shadow-lg shadow-[var(--accent-color)]/20 transition-opacity"
                  title={!canPost ? postMessage : ''}
                >
                  {isUploading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
