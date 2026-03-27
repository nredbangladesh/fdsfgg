/**
 * RateLimitDisplay - Responsive component for showing rate limit status
 * ====================================================================
 * 
 * USAGE:
 * <RateLimitDisplay 
 *   isBlocked={true} 
 *   timeRemaining={5000}
 *   message="Please wait 5s before posting again"
 *   type="post"
 * />
 * 
 * SEARCHABLE KEYWORDS:
 * - Rate limit display, user feedback, responsive
 * - UI component, warning message, countdown
 * - Student-friendly, accessibility
 */

import React from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { formatTimeRemaining } from '../hooks/useRateLimit';

export interface RateLimitDisplayProps {
  // Status
  isBlocked: boolean;
  
  // Timing
  timeRemaining: number; // milliseconds
  retryAfter: number; // seconds
  
  // Content
  message: string;
  type?: 'post' | 'message' | 'ddos';
  
  // Styling
  className?: string;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * FORMAT TIME FOR DISPLAY
 * SEARCHABLE: "COUNTDOWN_FORMAT", "USER_FRIENDLY_TIME"
 */
export function formatCountdown(ms: number): string {
  return formatTimeRemaining(ms);
}

/**
 * RATE LIMIT DISPLAY COMPONENT
 * 
 * SEARCHABLE: "RateLimitDisplay", "RATE_LIMIT_WARNING", "RESPONSIVE_FEEDBACK"
 * 
 * Shows rate limit status with countdown timer
 * Fully responsive on mobile, tablet, desktop
 */
export function RateLimitDisplay({
  isBlocked,
  timeRemaining,
  message,
  type = 'post',
  className = '',
  showIcon = true,
  size = 'medium',
}: RateLimitDisplayProps) {
  if (!isBlocked) {
    return <></>;
  }
  
  const sizeClasses = {
    small: 'px-2 py-1 text-xs gap-2',
    medium: 'px-3 py-2 text-sm gap-2',
    large: 'px-4 py-3 text-base gap-3',
  };
  
  const iconSize = {
    small: 16,
    medium: 20,
    large: 24,
  };
  
  const getIcon = () => {
    switch (type) {
      case 'ddos':
        return <AlertCircle size={iconSize[size]} className="text-red-500 flex-shrink-0" />;
      case 'message':
        return <Clock size={iconSize[size]} className="text-amber-500 flex-shrink-0" />;
      case 'post':
      default:
        return <Zap size={iconSize[size]} className="text-blue-500 flex-shrink-0" />;
    }
  };
  
  const getBgColor = () => {
    switch (type) {
      case 'ddos':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'message':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'post':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };
  
  const getTextColor = () => {
    switch (type) {
      case 'ddos':
        return 'text-red-800 dark:text-red-200';
      case 'message':
        return 'text-amber-800 dark:text-amber-200';
      case 'post':
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };
  
  const countdown = formatCountdown(timeRemaining);
  
  return (
    <div
      className={`
        flex items-center rounded-lg border
        ${getBgColor()}
        ${getTextColor()}
        ${sizeClasses[size]}
        ${className}
        transition-all duration-300
      `}
      role="alert"
      aria-live="polite"
    >
      {showIcon && getIcon()}
      
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight">{message}</p>
        <p className="text-xs opacity-75 mt-0.5">
          Try again in {countdown}
        </p>
      </div>
      
      {/* Countdown indicator */}\n      <div className="flex-shrink-0 flex items-center gap-1">
        <div className="w-12 h-12 rounded-full border-2 border-current border-t-transparent animate-spin opacity-30" />
      </div>
    </div>
  );
}

/**
 * RATE LIMIT BADGE - Compact version
 * 
 * SEARCHABLE: "RateLimitBadge", "INLINE_BADGE", "COMPACT_DISPLAY"
 * 
 * Minimal badge for inline display
 */
export function RateLimitBadge({
  isBlocked,
  timeRemaining,
  type = 'post',
}: {
  isBlocked: boolean;
  timeRemaining: number;
  type?: 'post' | 'message' | 'ddos';
}) {
  if (!isBlocked) {
    return <></>;
  }
  
  const countdown = formatCountdown(timeRemaining);
  
  const badgeColor = {
    ddos: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    message: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    post: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badgeColor[type]}`}>
      <Clock size={12} />
      {countdown}
    </span>
  );
}

/**
 * RATE LIMIT PROGRESS BAR
 * 
 * SEARCHABLE: "RateLimitProgress", "PROGRESS_INDICATOR", "VISUAL_FEEDBACK"
 * 
 * Shows progress bar for rate limits (useful for hourly/daily limits)
 */
export function RateLimitProgress({
  currentCount,
  maxCount,
  type = 'post',
}: {
  currentCount: number;
  maxCount: number;
  type?: 'post' | 'message' | 'ddos';
}) {
  const percentage = Math.min((currentCount / maxCount) * 100, 100);
  
  const getBarColor = () => {
    if (percentage < 50) return 'bg-green-500 dark:bg-green-600';
    if (percentage < 80) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-red-500 dark:bg-red-600';
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          {type === 'post' ? 'Posts this hour' : 'Messages sent'}
        </span>
        <span className="font-medium">
          {currentCount} / {maxCount}
        </span>
      </div>
      
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * BUTTON DISABLED STATE WITH TIMER
 * 
 * SEARCHABLE: "RateLimitButton", "DISABLED_BUTTON", "ACTION_BUTTON"
 * 
 * Wrapper for buttons that respects rate limiting
 */
export interface RateLimitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isBlocked: boolean;
  timeRemaining: number;
  children: React.ReactNode;
  blockMessage?: string;
}

export function RateLimitButton({
  isBlocked,
  timeRemaining,
  children,
  blockMessage = 'Please wait to continue',
  ...props
}: RateLimitButtonProps) {
  const countdown = formatCountdown(timeRemaining);
  
  return (
    <button
      disabled={isBlocked || (props as any).disabled}
      title={isBlocked ? `${blockMessage} (${countdown})` : ''}
      className={`
        relative transition-all duration-300
        ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}
        ${(props as any).className || ''}
      `}
      {...(props as any)}
    >
      {children}
      
      {isBlocked && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded pointer-events-none">
          <Clock size={16} className="text-white" />
          <span className="text-white text-xs ml-1 font-semibold">{countdown}</span>
        </span>
      )}
    </button>
  );
}

export default RateLimitDisplay;
