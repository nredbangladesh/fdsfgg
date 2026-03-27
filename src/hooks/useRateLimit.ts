/**
 * useRateLimit HOOK - React integration for rate limiting
 * =========================================================
 * 
 * USAGE: 
 * const { canPost, timeRemaining, postRetry } = useRateLimit('post', userPostConfig);
 * const { canMessage, timeRemaining, messageRetry } = useRateLimit('message');
 * 
 * SEARCHABLE KEYWORDS:
 * - useRateLimit, rate limit hook, throttle
 * - React rate limiting, user feedback
 * - Countdown timer, remaining time
 */

import { useState, useEffect, useCallback } from 'react';
import RateLimitService, { RateLimitResult } from '../services/RateLimitService';
import { useAppStore } from '../store';

export type LimitType = 'post' | 'message' | 'ddos';

export interface UseRateLimitResult {
  // Status
  isAllowed: boolean;
  isBlocked: boolean;
  
  // Timing information
  timeRemaining: number; // milliseconds
  retryAfter: number; // seconds
  
  // Count information
  currentCount: number;
  maxCount: number;
  
  // User message
  message: string;
  
  // Helper to check limit and get result
  checkLimit: () => RateLimitResult;
}

/**
 * MAIN HOOK: useRateLimit
 * 
 * SEARCHABLE: "useRateLimit", "RATE_LIMIT_HOOK", "THROTTLE_HOOK"
 * 
 * @param limitType - Type of limit to check: 'post' | 'message' | 'ddos'
 * @param postLimitConfig - Optional custom post limit configuration
 * @returns Rate limit status and helpers
 */
export function useRateLimit(
  limitType: LimitType,
  postLimitConfig?: {
    throttleMs: number;
    hourlyLimit: number;
    dailyLimit: number;
  }
): UseRateLimitResult {
  const { user } = useAppStore();
  const [result, setResult] = useState<UseRateLimitResult>({
    isAllowed: true,
    isBlocked: false,
    timeRemaining: 0,
    retryAfter: 0,
    currentCount: 0,
    maxCount: 0,
    message: '',
    checkLimit: () => ({
      allowed: true,
      remainingTime: 0,
      retryAfter: 0,
      currentCount: 0,
      maxCount: 0,
      message: '',
    }),
  });
  
  const checkLimit = useCallback(() => {
    if (!user?.uid) {
      return {
        allowed: false,
        remainingTime: 0,
        retryAfter: 0,
        currentCount: 0,
        maxCount: 0,
        message: 'Not authenticated',
      };
    }
    
    let limitResult: RateLimitResult;
    
    switch (limitType) {
      case 'message':
        limitResult = RateLimitService.checkMessageLimit(user.uid);
        break;
      case 'post':
        limitResult = RateLimitService.checkPostLimit(user.uid, postLimitConfig);
        break;
      case 'ddos':
        // DDoS check returns boolean, convert to RateLimitResult
        const isDdosBlocked = RateLimitService.checkDDoSThreshold(user.uid);
        limitResult = isDdosBlocked
          ? {
              allowed: false,
              remainingTime: 3600000,
              retryAfter: 3600,
              currentCount: 0,
              maxCount: 1,
              message: 'Too many requests. Please wait before trying again.',
            }
          : {
              allowed: true,
              remainingTime: 0,
              retryAfter: 0,
              currentCount: 0,
              maxCount: 1,
              message: 'OK',
            };
        break;
      default:
        limitResult = {
          allowed: true,
          remainingTime: 0,
          retryAfter: 0,
          currentCount: 0,
          maxCount: 0,
          message: '',
        };
    }
    
    setResult({
      isAllowed: limitResult.allowed,
      isBlocked: !limitResult.allowed,
      timeRemaining: limitResult.remainingTime,
      retryAfter: limitResult.retryAfter,
      currentCount: limitResult.currentCount,
      maxCount: limitResult.maxCount,
      message: limitResult.message,
      checkLimit,
    });
    
    return limitResult;
  }, [user?.uid, limitType, postLimitConfig]);
  
  // Check limit on mount
  useEffect(() => {
    checkLimit();
  }, [checkLimit]);
  
  // Update remaining time countdown
  useEffect(() => {
    if (result.timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setResult(prev => {
        const newTime = Math.max(0, prev.timeRemaining - 100);
        return {
          ...prev,
          timeRemaining: newTime,
          retryAfter: Math.ceil(newTime / 1000),
        };
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [result.timeRemaining]);
  
  return {
    ...result,
    checkLimit,
  };
}

/**
 * HELPER HOOK: usePostRateLimit
 * 
 * SEARCHABLE: "usePostRateLimit", "POST_LIMIT_HOOK"
 * 
 * Convenient hook for post rate limiting
 * 
 * @param postLimitConfig - Post limit configuration
 * @returns Rate limit status
 */
export function usePostRateLimit(postLimitConfig?: {
  throttleMs: number;
  hourlyLimit: number;
  dailyLimit: number;
}): UseRateLimitResult {
  return useRateLimit('post', postLimitConfig);
}

/**
 * HELPER HOOK: useMessageRateLimit
 * 
 * SEARCHABLE: "useMessageRateLimit", "MESSAGE_LIMIT_HOOK"
 * 
 * Convenient hook for message rate limiting
 * 
 * @returns Rate limit status
 */
export function useMessageRateLimit(): UseRateLimitResult {
  return useRateLimit('message');
}

/**
 * HELPER HOOK: useDDoSProtection
 * 
 * SEARCHABLE: "useDDoSProtection", "DDOS_HOOK", "DDOS_BLOCK"
 * 
 * Convenient hook for DDoS protection
 * 
 * @returns DDoS block status
 */
export function useDDoSProtection(): UseRateLimitResult {
  return useRateLimit('ddos');
}

/**
 * HELPER FUNCTION: Format remaining time for display
 * 
 * SEARCHABLE: "formatTimeRemaining", "TIME_DISPLAY", "USER_MESSAGE"
 * 
 * Convert milliseconds to human-readable format
 * 
 * @param ms - Milliseconds
 * @returns Formatted string like "2s", "1m 30s", "1h"
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ready';
  
  const seconds = Math.ceil(ms / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default useRateLimit;
