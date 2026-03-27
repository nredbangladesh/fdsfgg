import { useAppStore } from '../store';
import { motion } from 'motion/react';

export default function SystemOverlay() {
  const { systemState } = useAppStore();

  if (!systemState || systemState.status === 'live') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-color)] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-24 h-24 mx-auto bg-[var(--accent-color)] rounded-3xl animate-pulse" />
        
        <h1 className="text-3xl font-bold tracking-tight">
          {systemState.message?.title || 'System Update'}
        </h1>
        
        <p className="text-lg opacity-80">
          {systemState.message?.body || 'We are currently performing maintenance.'}
        </p>

        {systemState.message?.eta && (
          <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">
            <p className="text-sm font-medium uppercase tracking-wider opacity-60">Estimated Return</p>
            <p className="text-xl mt-1">{new Date(systemState.message.eta).toLocaleString()}</p>
          </div>
        )}

        <div className="pt-8 flex flex-col gap-3">
          {systemState.message?.statusPageUrl && (
            <a 
              href={systemState.message.statusPageUrl}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-full bg-[var(--accent-color)] text-white font-medium"
            >
              Check Status Page
            </a>
          )}
          {systemState.message?.contactEmail && (
            <a 
              href={`mailto:${systemState.message.contactEmail}`}
              className="px-6 py-3 rounded-full border border-current opacity-70 hover:opacity-100 font-medium"
            >
              Contact Support
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
