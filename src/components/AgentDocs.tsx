import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Code, Database, Layout, ShieldAlert } from 'lucide-react';

export default function AgentDocs() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20 min-h-screen bg-[var(--bg-color)] text-[var(--text-color)]">
      <button 
        onClick={() => navigate(-1)} 
        className="text-sm opacity-70 hover:opacity-100 mb-4 flex items-center gap-2 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      
      <div className="space-y-2 border-b border-black/10 dark:border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8" />
          <h1 className="text-3xl font-bold tracking-tight">AI Agent Documentation</h1>
        </div>
        <p className="opacity-70 text-lg">
          System architecture, guidelines, and strict instructions for future AI assistants working on this codebase.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        
        {/* Core Directives */}
        <section className="space-y-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h2>1. Core Directives for AI Agents</h2>
          </div>
          <p className="opacity-80 font-medium text-red-500 dark:text-red-400">
            CRITICAL: Read these rules before making ANY modifications to the app.
          </p>
          <ul className="list-disc pl-5 space-y-3 opacity-80">
            <li><strong>Read Before Edit:</strong> Always use <code>view_file</code> before modifying any component. Do not assume file structures or variable names.</li>
            <li><strong>Preserve Theming:</strong> The app uses a custom CSS variable theming system (Chalk, Dark, Light) in <code>index.css</code>. Rely on <code>var(--bg-color)</code>, <code>var(--text-color)</code>, <code>var(--border-color)</code>, and Tailwind's opacity modifiers (e.g., <code>bg-black/5 dark:bg-white/5</code>) rather than hardcoded colors.</li>
            <li><strong>Mobile-First UI:</strong> The UI is designed to be mobile-friendly and app-like. Maintain bottom navigation padding (<code>pb-20</code>) on main scrollable views.</li>
            <li><strong>Error Handling:</strong> Always use the custom <code>handleFirestoreError</code> from <code>firebase.ts</code> for any database operations to maintain security auditability.</li>
            <li><strong>No Mock Data:</strong> Do not use placeholder data for user requests. Always implement real Firebase integrations.</li>
          </ul>
        </section>

        {/* Tech Stack */}
        <section className="space-y-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Code className="w-5 h-5" />
            <h2>2. Tech Stack & Architecture</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 opacity-80">
            <li><strong>Frontend:</strong> React 18, Vite, React Router DOM v6.</li>
            <li><strong>Styling:</strong> Tailwind CSS, Lucide React (icons).</li>
            <li><strong>State Management:</strong> Zustand (<code>src/store.ts</code>). Contains <code>user</code>, <code>userProfile</code>, and <code>theme</code>.</li>
            <li><strong>Backend/BaaS:</strong> Firebase (Auth, Firestore, Storage).</li>
            <li><strong>Image Processing:</strong> <code>react-easy-crop</code> for profile pictures.</li>
          </ul>
        </section>

        {/* Database Schema */}
        <section className="space-y-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Database className="w-5 h-5" />
            <h2>3. Database Schema (Firestore)</h2>
          </div>
          <div className="space-y-5 opacity-80">
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Collection: <code>users</code></h3>
              <p className="font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded">
                uid, email, name, username, photoURL, academicClass, session, bloodGroup, address, relationshipStatus, skills, bio, onboardingCompleted, createdAt
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Collection: <code>posts</code></h3>
              <p className="font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded">
                id, authorId, authorName, authorPhoto, content, imageUrl, likesCount, commentsCount, createdAt
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Collection: <code>system</code></h3>
              <p className="font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded">
                Document: appState (Controls maintenance mode/live status)
              </p>
            </div>
          </div>
        </section>

        {/* Key Components */}
        <section className="space-y-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Layout className="w-5 h-5" />
            <h2>4. Key Components</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 opacity-80">
            <li><code>App.tsx</code>: Routing and global auth/system state listeners.</li>
            <li><code>MainLayout.tsx</code>: Wrapper for authenticated routes, includes the bottom navigation bar.</li>
            <li><code>ProfileSetup.tsx</code>: 2-step onboarding modal (Info + Photo Cropping). Do not break this flow.</li>
            <li><code>firebase.ts</code>: Firebase initialization and error handling wrappers.</li>
          </ul>
        </section>

        {/* Future Modifications */}
        <section className="space-y-4 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="w-5 h-5" />
            <h2>5. Future Modifications</h2>
          </div>
          <p className="opacity-80">
            When adding new features, ensure you:
          </p>
          <ul className="list-disc pl-5 space-y-2 opacity-80">
            <li>Update <code>firebase-blueprint.json</code> and <code>firestore.rules</code> if data structures change.</li>
            <li>Ensure new routes are added to <code>App.tsx</code> and protected by <code>&lt;RequireOnboarding&gt;</code> if they require a completed profile.</li>
            <li>Keep UI elements minimal. Use high contrast, large typography, and subtle borders to match the existing aesthetic.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
