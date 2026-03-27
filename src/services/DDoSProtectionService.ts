/**
 * DDoS_PROTECTION_SERVICE - IP and user-based DDoS detection
 * ===========================================================
 * 
 * USAGE:
 * - Track request: ddosService.trackRequest(userId, ipAddress)
 * - Check if blocked: ddosService.isUserBlocked(userId)
 * - Check if IP blocked: ddosService.isIPBlocked(ipAddress)
 * - Unblock user: ddosService.unblockUser(userId)
 * - Get stats: ddosService.getDDoSStats()
 * 
 * SEARCHABLE KEYWORDS:
 * - DDoS protection, IP blocking, spam detection
 * - Suspicious activity detection, security
 * - Automatic blocking, admin controls
 */

export interface BlockedUser {
  userId: string;
  blockedAt: number;
  unblockedAt: number | null;
  reason: string;
  requestCount: number; // Requests that triggered the block
}

export interface BlockedIP {
  ipAddress: string;
  blockedAt: number;
  unblockedAt: number | null;
  reason: string;
  requestCount: number;
}

export interface DDoSStats {
  totalRejectedRequests: number;
  blockedUsers: number;
  blockedIPs: number;
  timestamp: number;
}

/**
 * Storage for blocked entities
 * In production, use distributed cache (Redis)
 * SEARCHABLE: "BLOCKED_USERS_CACHE", "BLOCKED_IPS_CACHE"
 */
const BLOCKED_USERS_MAP = new Map<string, BlockedUser>();
const BLOCKED_IPS_MAP = new Map<string, BlockedIP>();
const REQUEST_COUNTER = {
  rejectedRequests: 0,
  timestamp: Date.now(),
};

/**
 * DDoS PROTECTION THRESHOLDS
 * SEARCHABLE: "DDoS_THRESHOLDS", "SUSPICIOUS_ACTIVITY"
 */
export const DDOS_PROTECTION_THRESHOLDS = {
  // IP-based detection
  MAX_REQUESTS_FROM_IP_PER_MINUTE: 60, // If exceeded, IP is suspicious
  IP_BLOCK_DURATION_MS: 3600000, // 1 hour
  
  // User-based detection (separate from rate limiting)
  MAX_FAILED_AUTH_ATTEMPTS: 10, // Lock account after X failed attempts
  AUTH_LOCK_DURATION_MS: 900000, // 15 minutes
  
  // Pattern detection
  MINIMUM_TIME_BETWEEN_DIFFERENT_ACCOUNTS: 1000, // 1 second between account creations from same IP
};

/**
 * Cleanup interval - remove expired blocks
 * SEARCHABLE: "DDOS_CLEANUP", "BLOCK_EXPIRATION"
 */
function initDDoSCleanup() {
  setInterval(() => {
    const now = Date.now();
    
    // Clean up expired user blocks
    for (const [userId, blockInfo] of BLOCKED_USERS_MAP.entries()) {
      if (blockInfo.unblockedAt && blockInfo.unblockedAt < now) {
        BLOCKED_USERS_MAP.delete(userId);
      }
    }
    
    // Clean up expired IP blocks
    for (const [ip, blockInfo] of BLOCKED_IPS_MAP.entries()) {
      if (blockInfo.unblockedAt && blockInfo.unblockedAt < now) {
        BLOCKED_IPS_MAP.delete(ip);
      }
    }
  }, 300000); // Check every 5 minutes
}

initDDoSCleanup();

/**
 * TRACK REQUEST
 * 
 * SEARCHABLE: "trackRequest", "REQUEST_TRACKING", "MONITOR_ACTIVITY"
 * 
 * Track a user request (call this on every action)
 * 
 * @param userId - User making the request
 * @param ipAddress - Client IP address
 * @returns true if request should be rejected
 */
export function trackRequest(userId: string, ipAddress: string): boolean {
  // Check if user is already blocked
  if (isUserBlocked(userId)) {
    REQUEST_COUNTER.rejectedRequests++;
    return true;
  }
  
  // Check if IP is already blocked
  if (isIPBlocked(ipAddress)) {
    REQUEST_COUNTER.rejectedRequests++;
    return true;
  }
  
  return false;
}

/**
 * CHECK IF USER IS BLOCKED
 * 
 * SEARCHABLE: "isUserBlocked", "USER_BLOCKED_STATUS"
 * 
 * Check if a user is currently blocked from DDoS
 * 
 * @param userId - User to check
 * @returns true if user is blocked
 */
export function isUserBlocked(userId: string): boolean {
  const blockInfo = BLOCKED_USERS_MAP.get(userId);
  if (!blockInfo) return false;
  
  const now = Date.now();
  
  // Check if block has expired
  if (blockInfo.unblockedAt && blockInfo.unblockedAt < now) {
    BLOCKED_USERS_MAP.delete(userId);
    return false;
  }
  
  return true;
}

/**
 * CHECK IF IP IS BLOCKED
 * 
 * SEARCHABLE: "isIPBlocked", "IP_BLOCKED_STATUS"
 * 
 * Check if an IP address is currently blocked
 * 
 * @param ipAddress - IP to check
 * @returns true if IP is blocked
 */
export function isIPBlocked(ipAddress: string): boolean {
  const blockInfo = BLOCKED_IPS_MAP.get(ipAddress);
  if (!blockInfo) return false;
  
  const now = Date.now();
  
  // Check if block has expired
  if (blockInfo.unblockedAt && blockInfo.unblockedAt < now) {
    BLOCKED_IPS_MAP.delete(ipAddress);
    return false;
  }
  
  return true;
}

/**
 * BLOCK USER
 * 
 * SEARCHABLE: "blockUser", "MANUAL_BLOCK", "ADMIN_ACTION"
 * 
 * Manually block a user (admin action)
 * 
 * @param userId - User to block
 * @param reason - Reason for blocking
 * @param durationMs - How long to block (optional, defaults to 1 hour)
 */
export function blockUser(
  userId: string,
  reason: string = 'Suspected DDoS/spam activity',
  durationMs: number = DDOS_PROTECTION_THRESHOLDS.IP_BLOCK_DURATION_MS
): void {
  const now = Date.now();
  BLOCKED_USERS_MAP.set(userId, {
    userId,
    blockedAt: now,
    unblockedAt: now + durationMs,
    reason,
    requestCount: 0,
  });
  console.log(`🚫 User blocked: ${userId} - Reason: ${reason}`);
}

/**
 * BLOCK IP ADDRESS
 * 
 * SEARCHABLE: "blockIP", "BLOCK_IP_ADDRESS", "IP_BAN"
 * 
 * Manually block an IP address (admin action)
 * 
 * @param ipAddress - IP to block
 * @param reason - Reason for blocking
 * @param durationMs - How long to block (optional)
 */
export function blockIPAddress(
  ipAddress: string,
  reason: string = 'Suspected DDoS/spam activity',
  durationMs: number = DDOS_PROTECTION_THRESHOLDS.IP_BLOCK_DURATION_MS
): void {
  const now = Date.now();
  BLOCKED_IPS_MAP.set(ipAddress, {
    ipAddress,
    blockedAt: now,
    unblockedAt: now + durationMs,
    reason,
    requestCount: 0,
  });
  console.log(`🚫 IP blocked: ${ipAddress} - Reason: ${reason}`);
}

/**
 * UNBLOCK USER
 * 
 * SEARCHABLE: "unblockUser", "REMOVE_BLOCK", "ADMIN_UNBLOCK"
 * 
 * Unblock a user (admin action)
 * 
 * @param userId - User to unblock
 */
export function unblockUser(userId: string): void {
  BLOCKED_USERS_MAP.delete(userId);
  console.log(`✅ User unblocked: ${userId}`);
}

/**
 * UNBLOCK IP ADDRESS
 * 
 * SEARCHABLE: "unblockIP", "REMOVE_IP_BLOCK"
 * 
 * Unblock an IP address (admin action)
 * 
 * @param ipAddress - IP to unblock
 */
export function unblockIPAddress(ipAddress: string): void {
  BLOCKED_IPS_MAP.delete(ipAddress);
  console.log(`✅ IP unblocked: ${ipAddress}`);
}

/**
 * GET DDOS STATISTICS
 * 
 * SEARCHABLE: "getDDoSStats", "DDOS_MONITORING", "SECURITY_STATS"
 * 
 * Get DDoS protection statistics
 * 
 * @returns DDoS stats object
 */
export function getDDoSStats(): DDoSStats {
  return {
    totalRejectedRequests: REQUEST_COUNTER.rejectedRequests,
    blockedUsers: BLOCKED_USERS_MAP.size,
    blockedIPs: BLOCKED_IPS_MAP.size,
    timestamp: Date.now(),
  };
}

/**
 * GET LIST OF BLOCKED USERS
 * 
 * SEARCHABLE: "getBlockedUsers", "ADMIN_VIEW", "BLOCK_LIST"
 * 
 * Get list of all currently blocked users (admin only)
 * 
 * @returns Array of blocked users
 */
export function getBlockedUsers(): BlockedUser[] {
  const now = Date.now();
  return Array.from(BLOCKED_USERS_MAP.values())
    .filter(block => !block.unblockedAt || block.unblockedAt > now)
    .sort((a, b) => b.blockedAt - a.blockedAt);
}

/**
 * GET LIST OF BLOCKED IPS
 * 
 * SEARCHABLE: "getBlockedIPs", "IP_BAN_LIST"
 * 
 * Get list of all currently blocked IPs (admin only)
 * 
 * @returns Array of blocked IPs
 */
export function getBlockedIPs(): BlockedIP[] {
  const now = Date.now();
  return Array.from(BLOCKED_IPS_MAP.values())
    .filter(block => !block.unblockedAt || block.unblockedAt > now)
    .sort((a, b) => b.blockedAt - a.blockedAt);
}

/**
 * RESET ALL BLOCKS
 * 
 * SEARCHABLE: "resetAllBlocks", "ADMIN_RESET", "CLEAR_BLOCKS"
 * 
 * Clear all blocks (admin action, use with caution)
 */
export function resetAllBlocks(): void {
  BLOCKED_USERS_MAP.clear();
  BLOCKED_IPS_MAP.clear();
  REQUEST_COUNTER.rejectedRequests = 0;
  console.log('⚠️  All DDoS blocks cleared');
}

/**
 * EXPORT SERVICE OBJECT
 * SEARCHABLE: "DDoSProtectionService"
 */
export const DDoSProtectionService = {
  trackRequest,
  isUserBlocked,
  isIPBlocked,
  blockUser,
  blockIPAddress,
  unblockUser,
  unblockIPAddress,
  getDDoSStats,
  getBlockedUsers,
  getBlockedIPs,
  resetAllBlocks,
  DDOS_PROTECTION_THRESHOLDS,
};

export default DDoSProtectionService;
