import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

export default function ErrorPage({ code = 404, message = "We couldn't find the page you're looking for." }: { code?: number, message?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  // If it's a 404 from a bad route, we can show a specific message
  const is404 = code === 404;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="w-32 h-32 mx-auto bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center relative">
          <AlertCircle className="w-16 h-16 opacity-50" />
          <div className="absolute -bottom-2 -right-2 bg-[var(--accent-color)] text-white text-xl font-bold px-4 py-1 rounded-full shadow-lg">
            {code}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {is404 ? 'Page Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-lg opacity-70">
            {message}
          </p>
          {is404 && (
            <p className="text-sm opacity-50 font-mono mt-2">
              {location.pathname}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 rounded-xl bg-black/5 dark:bg-white/5 font-bold flex items-center justify-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-xl bg-[var(--accent-color)] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Home className="w-5 h-5" /> Return Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
