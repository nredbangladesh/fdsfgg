/**
 * RATE_LIMIT_SERVICE - Core rate limiting and throttling logic
 * ============================================================
 * 
 * USAGE:
 * - Check message rate limit: rateLimitService.checkMessageLimit(userId)
 * - Check post rate limit: rateLimitService.checkPostLimit(userId, userPostLimitConfig)
 * - Check DDoS: rateLimitService.checkDDoSThreshold(userId)
 * - Clear cache: rateLimitService.clearUserCache(userId)
 * 
 * SEARCHABLE KEYWORDS:
 * - Rate limiting, throttling, time limit, cooldown
 * - DDoS protection, spam detection
 * - User action tracking, timestamp management
 */

export interface RateLimitResult {
  allowed: boolean;
  remainingTime: number; // milliseconds until next action allowed
  retryAfter: number; // seconds to wait
  currentCount: number;
  maxCount: number;
  message: string;
}

export interface UserActionTracker {
  userId: string;
  lastActionTime: number;
  actionCount: number;
  hourlyCount: number;
  hourlyWindowStart: number;
  blockedUntil: number;
}

/**
 * In-memory cache for rate limiting
 * For production, replace with distributed cache (Redis)
 * SEARCHABLE: "ACTION_TRACKER_CACHE"
 */
const ACTION_TRACKER_CACHE = new Map<string, UserActionTracker>();

/**
 * Time-based constants (milliseconds)
 * SEARCHABLE: These are the primary rate limit controls
 */
export const RATE_LIMIT_CONFIG = {
  // MESSAGE: Maximum 1 message per 2 seconds
  MESSAGE_THROTTLE_MS: 2000,
  MESSAGE_DAILY_LIMIT: 500,
  
  // POST: Maximum 1 post per 5 seconds
  POST_THROTTLE_MS: 5000,
  POST_HOURLY_LIMIT: 10,
  POST_DAILY_LIMIT: 30,
  
  // DDoS: Trigger block after 50 requests in 60 seconds
  DDOS_REQUEST_THRESHOLD: 50,
  DDOS_TIME_WINDOW_MS: 60000,
  DDOS_BLOCK_DURATION_MS: 3600000, // 1 hour
  
  // Cleanup: Clear old entries every 5 minutes
  CACHE_CLEANUP_INTERVAL_MS: 300000,
};

/**
 * Initialize automatic cache cleanup
 * SEARCHABLE: "CACHE_CLEANUP"
 */
function initCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [userId, tracker] of ACTION_TRACKER_CACHE.entries()) {
      // Remove entries older than 1 hour
      if (now - tracker.lastActionTime > 3600000) {
        ACTION_TRACKER_CACHE.delete(userId);
      }
    }
  }, RATE_LIMIT_CONFIG.CACHE_CLEANUP_INTERVAL_MS);
}

// Initialize cleanup on import
initCacheCleanup();

/**
 * Get or create user action tracker
 * SEARCHABLE: "GET_USER_TRACKER"
 */
function getOrCreateTracker(userId: string): UserActionTracker {
  if (!ACTION_TRACKER_CACHE.has(userId)) {
    const now = Date.now();
    ACTION_TRACKER_CACHE.set(userId, {
      userId,
      lastActionTime: 0,
      actionCount: 0,
      hourlyCount: 0,
      hourlyWindowStart: now,
      blockedUntil: 0,
    });
  }
  return ACTION_TRACKER_CACHE.get(userId)!;
}

/**
 * Reset hourly counter if window has passed
 * SEARCHABLE: "RESET_HOURLY_COUNTER", "HOURLY_WINDOW"
 */
function updateHourlyCounter(tracker: UserActionTracker): void {
  const now = Date.now();
  const hourInMs = 3600000;
  
  if (now - tracker.hourlyWindowStart >= hourInMs) {
    tracker.hourlyCount = 0;
    tracker.hourlyWindowStart = now;
  }
}

/**
 * CHECK MESSAGE RATE LIMIT
 * 
 * SEARCHABLE: "checkMessageLimit", "MESSAGE_THROTTLE"
 * 
 * Returns:
 * - allowed: true if user can send message
 * - remainingTime: ms until next message allowed
 * - retryAfter: seconds to display to user
 * 
 * @param userId - The user attempting to send a message
 * @returns RateLimitResult with decision and timing info
 */
export function checkMessageLimit(userId: string): RateLimitResult {
  const tracker = getOrCreateTracker(userId);
  const now = Date.now();
  
  // Check if user is blocked from DDoS
  if (tracker.blockedUntil > now) {
    const remainingTime = tracker.blockedUntil - now;
    return {
      allowed: false,
      remainingTime,
      retryAfter: Math.ceil(remainingTime / 1000),
      currentCount: tracker.actionCount,
      maxCount: RATE_LIMIT_CONFIG.MESSAGE_DAILY_LIMIT,
      message: `Too many requests. Please wait ${Math.ceil(remainingTime / 1000)}s before trying again.`,
    };
  }
  
  // Check throttle (minimum time between messages)
  const timeSinceLastAction = now - tracker.lastActionTime;
  if (timeSinceLastAction < RATE_LIMIT_CONFIG.MESSAGE_THROTTLE_MS) {
    const remainingTime = RATE_LIMIT_CONFIG.MESSAGE_THROTTLE_MS - timeSinceLastAction;
    return {
      allowed: false,
      remainingTime,
      retryAfter: Math.ceil(remainingTime / 1000),
      currentCount: tracker.actionCount,
      maxCount: RATE_LIMIT_CONFIG.MESSAGE_DAILY_LIMIT,
      message: `Please wait ${Math.ceil(remainingTime / 1000)}s before sending another message.`,
    };
  }
  
  // Check daily limit
  updateHourlyCounter(tracker);
  tracker.hourlyCount++;
  
  if (tracker.actionCount >= RATE_LIMIT_CONFIG.MESSAGE_DAILY_LIMIT) {
    return {
      allowed: false,
      remainingTime: 0,
      retryAfter: 86400, // 24 hours
      currentCount: tracker.actionCount,
      maxCount: RATE_LIMIT_CONFIG.MESSAGE_DAILY_LIMIT,
      message: `Daily message limit (${RATE_LIMIT_CONFIG.MESSAGE_DAILY_LIMIT}) reached. Try again tomorrow.`,
    };
  }
  
  // Action is allowed
  tracker.lastActionTime = now;
  tracker.actionCount++;
  
  return {
    allowed: true,
    remainingTime: 0,
    retryAfter: 0,
    currentCount: tracker.actionCount,
    maxCount: RATE_LIMIT_CONFIG.MESSAGE_DAILY_LIMIT,
    message: 'Message sent successfully.',
  };
}

/**
 * CHECK POST RATE LIMIT
 * 
 * SEARCHABLE: "checkPostLimit", "POST_THROTTLE", "HOURLY_POST_LIMIT"
 * 
 * Uses custom post limits from admin configuration
 * 
 * @param userId - The user attempting to create a post
 * @param postLimitConfig - Configuration from admin panel {throttleMs, hourlyLimit, dailyLimit}
 * @returns RateLimitResult with decision and timing info
 */
export function checkPostLimit(
  userId: string,
  postLimitConfig: {
    throttleMs: number;
    hourlyLimit: number;
    dailyLimit: number;
  } = {
    throttleMs: RATE_LIMIT_CONFIG.POST_THROTTLE_MS,
    hourlyLimit: RATE_LIMIT_CONFIG.POST_HOURLY_LIMIT,
    dailyLimit: RATE_LIMIT_CONFIG.POST_DAILY_LIMIT,
  }
): RateLimitResult {
  const tracker = getOrCreateTracker(userId);
  const now = Date.now();
  
  // Check if user is blocked from DDoS
  if (tracker.blockedUntil > now) {
    const remainingTime = tracker.blockedUntil - now;
    return {
      allowed: false,
      remainingTime,
      retryAfter: Math.ceil(remainingTime / 1000),
      currentCount: tracker.hourlyCount,
      maxCount: postLimitConfig.hourlyLimit,
      message: `Too many requests. Please wait ${Math.ceil(remainingTime / 1000)}s before trying again.`,
    };
  }
  
  // Check throttle (minimum time between posts)
  const timeSinceLastAction = now - tracker.lastActionTime;
  if (timeSinceLastAction < postLimitConfig.throttleMs) {
    const remainingTime = postLimitConfig.throttleMs - timeSinceLastAction;
    return {
      allowed: false,
      remainingTime,
      retryAfter: Math.ceil(remainingTime / 1000),
      currentCount: tracker.hourlyCount,
      maxCount: postLimitConfig.hourlyLimit,
      message: `Please wait ${Math.ceil(remainingTime / 1000)}s before posting again.`,
    };
  }
  
  // Check hourly limit
  updateHourlyCounter(tracker);
  if (tracker.hourlyCount >= postLimitConfig.hourlyLimit) {
    return {
      allowed: false,
      remainingTime: 0,
      retryAfter: Math.ceil((tracker.hourlyWindowStart + 3600000 - now) / 1000),
      currentCount: tracker.hourlyCount,
      maxCount: postLimitConfig.hourlyLimit,
      message: `Hourly post limit (${postLimitConfig.hourlyLimit}) reached. Try again in an hour.`,
    };
  }
  
  // Action is allowed
  tracker.lastActionTime = now;
  tracker.hourlyCount++;
  tracker.actionCount++;
  
  return {
    allowed: true,
    remainingTime: 0,
    retryAfter: 0,
    currentCount: tracker.hourlyCount,
    maxCount: postLimitConfig.hourlyLimit,
    message: 'Post created successfully.',
  };
}

/**
 * CHECK DDoS THRESHOLD
 * 
 * SEARCHABLE: "checkDDoSThreshold", "DDoS", "SPAM_DETECTION"
 * 
 * Detects suspicious rapid requests and blocks user temporarily
 * 
 * @param userId - The user making the request
 * @returns true if user exceeded DDoS threshold
 */
export function checkDDoSThreshold(userId: string): boolean {
  const tracker = getOrCreateTracker(userId);
  const now = Date.now();
  
  // Reset counter if outside time window
  if (now - tracker.hourlyWindowStart > RATE_LIMIT_CONFIG.DDOS_TIME_WINDOW_MS) {
    tracker.hourlyCount = 0;
    tracker.hourlyWindowStart = now;
  }
  
  // Check if threshold exceeded
  if (tracker.hourlyCount >= RATE_LIMIT_CONFIG.DDOS_REQUEST_THRESHOLD) {
    // Block user for 1 hour
    tracker.blockedUntil = now + RATE_LIMIT_CONFIG.DDOS_BLOCK_DURATION_MS;
    return true;
  }
  
  return false;
}

/**
 * CLEAR USER CACHE
 * 
 * SEARCHABLE: "clearUserCache", "MANUAL_RESET"
 * 
 * Manually reset a user's rate limit (admin action)
 * 
 * @param userId - The user to reset
 */
export function clearUserCache(userId: string): void {
  ACTION_TRACKER_CACHE.delete(userId);
}

/**
 * GET USER TRACKING INFO
 * 
 * SEARCHABLE: "getUserTrackingInfo", "DEBUG_INFO"
 * 
 * Get current tracking state for a user (useful for debugging)
 * 
 * @param userId - The user to check
 * @returns Current tracker state or null if not found
 */
export function getUserTrackingInfo(userId: string): UserActionTracker | null {
  return ACTION_TRACKER_CACHE.get(userId) || null;
}

/**
 * GET CACHE STATS
 * 
 * SEARCHABLE: "getCacheStats", "ADMIN_MONITORING"
 * 
 * Get stats about the cache (useful for monitoring)
 * 
 * @returns Stats about tracked users and memory usage
 */
export function getCacheStats() {
  return {
    trackedUsers: ACTION_TRACKER_CACHE.size,
    timestamp: new Date().toISOString(),
  };
}

export const RateLimitService = {
  checkMessageLimit,
  checkPostLimit,
  checkDDoSThreshold,
  clearUserCache,
  getUserTrackingInfo,
  getCacheStats,
};

export default RateLimitService;
