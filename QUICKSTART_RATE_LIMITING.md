# 🚀 Quick Start Guide - Rate Limiting & DDoS Protection

## Copy-Paste These Examples

### 1️⃣ Use Rate Limit in A Component

```typescript
// At the top of your component file
import { usePostRateLimit, useMessageRateLimit } from '../hooks/useRateLimit';
import { RateLimitDisplay } from '../components/RateLimitDisplay';

// In your component
export function MyPostComponent() {
  const { isAllowed, message, timeRemaining } = usePostRateLimit();
  
  const handleCreatePost = async () => {
    // Check limit before doing anything
    if (!isAllowed) {
      alert(message); // "Please wait 5s before posting again"
      return;
    }
    
    // Safe to create post now
    await createPost();
  };
  
  return (
    <>
      {/* Show rate limit warning if blocked */}
      <RateLimitDisplay 
        isBlocked={!isAllowed}
        timeRemaining={timeRemaining}
        message={message}
        type="post"
      />
      
      <button onClick={handleCreatePost} disabled={!isAllowed}>
        Post
      </button>
    </>
  );
}
```

### 2️⃣ Add Rate Limiting to AdminPanel

```typescript
// In AdminPanel.tsx, add this import at top
import AdminLimitControls from './AdminLimitControls';

// In your return/render, add this section
<div className="mt-8 border-t pt-8 space-y-6">
  <div>
    <h2 className="text-xl font-bold mb-4">🛡️ Security & Rate Limits</h2>
    <AdminLimitControls />
  </div>
</div>
```

### 3️⃣ Check If User Can Perform Action

```typescript
// In any component or service
import RateLimitService from '../services/RateLimitService';

const canPost = RateLimitService.checkPostLimit(userId, {
  throttleMs: 5000,
  hourlyLimit: 10,
  dailyLimit: 30,
});

if (canPost.allowed) {
  console.log('✅ User can post');
} else {
  console.log(`❌ Must wait ${canPost.retryAfter}s`);
  console.log(`📝 Message: ${canPost.message}`);
}
```

### 4️⃣ Manually Block/Unblock Users (Admin Only)

```typescript
import DDoSProtectionService from '../services/DDoSProtectionService';

// Block a user
DDoSProtectionService.blockUser(userId, 'Spam detected', 3600000);

// Block an IP
DDoSProtectionService.blockIPAddress('192.168.1.1', 'DDoS attack', 3600000);

// Unblock
DDoSProtectionService.unblockUser(userId);

// Get stats
const stats = DDoSProtectionService.getDDoSStats();
console.log(`Blocked users: ${stats.blockedUsers}`);
```

### 5️⃣ Load/Save Admin Configuration

```typescript
import PostLimitConfigService from '../services/PostLimitConfigService';

// Load current config
const config = await PostLimitConfigService.loadPostLimitConfig(schoolId);
console.log(`Hourly post limit: ${config.postHourlyLimit}`);

// Save custom config
await PostLimitConfigService.savePostLimitConfig(
  schoolId,
  {
    messageThrottleMs: 2000,
    messageDailyLimit: 500,
    postThrottleMs: 5000,
    postHourlyLimit: 10,
    postDailyLimit: 30,
    ddosThreshold: 50,
    ddosWindowMs: 60000,
    ddosBlockDurationMs: 3600000,
    isEnabled: true,
  },
  adminUserId
);

// Apply a preset
const strictConfig = PostLimitConfigService.getConfigPreset('conservative', schoolId);
```

---

## 🎯 Common Scenarios

### "I need to allow only 5 posts per hour for a school"

```typescript
// Admin Panel → Rate Limiting & Security → Post Settings
// Change "Hourly Limit" from 10 to 5
// Click "Save Configuration"
```

### "A user is spamming, block them immediately"

```typescript
// Admin Panel → DDoS Protection
// Find user in "Blocked Users" list
// Or manually block: DDoSProtectionService.blockUser(userId)
```

### "Reset all DDoS blocks"

```typescript
// Warning: This unblocks everyone!
// Admin Panel → DDoS Protection → "Reset All Blocks" button
// Or: DDoSProtectionService.resetAllBlocks();
```

### "Check if a user is currently blocked"

```typescript
const isBlocked = DDoSProtectionService.isUserBlocked(userId);
console.log(isBlocked ? '🔒 Blocked' : '✅ OK');
```

### "Show user how long until they can post again"

```typescript
import { formatTimeRemaining } from '../hooks/useRateLimit';

const timeMs = 5000;
console.log(formatTimeRemaining(timeMs)); // "5s"
console.log(formatTimeRemaining(65000)); // "1m 5s"
console.log(formatTimeRemaining(3665000)); // "1h 1m"
```

---

## 🔍 Finding Things

### I need to find where posts are throttled
1. Search for: `checkPostLimit`
2. Files: `RateLimitService.ts`, `Feed.tsx`
3. Keyword: `POST_THROTTLE`

### I need to find DDoS settings
1. Search for: `DDOS_PROTECTION_THRESHOLDS`
2. File: `DDoSProtectionService.ts`
3. Update: `ddosThreshold`, `ddosWindowMs`

### I need to find admin controls
1. File: `AdminLimitControls.tsx`
2. Search for: `AdminLimitControls` in AdminPanel.tsx
3. UI Tab: Configuration or DDoS Protection

### I need to find message throttling
1. Search for: `checkMessageLimit`
2. File: `AIChat.tsx`, `RateLimitService.ts`
3. Keyword: `MESSAGE_THROTTLE`

---

## 📊 Monitoring

### Get current stats
```typescript
const stats = DDoSProtectionService.getDDoSStats();
console.table(stats);
// {
//   totalRejectedRequests: 42,
//   blockedUsers: 3,
//   blockedIPs: 2,
//   timestamp: 1711617600000
// }
```

### Get list of blocked users
```typescript
const blocked = DDoSProtectionService.getBlockedUsers();
blocked.forEach(user => {
  console.log(`${user.userId}: ${user.reason}`);
});
```

### Find a specific user's tracking info
```typescript
const tracker = RateLimitService.getUserTrackingInfo(userId);
console.table(tracker);
// {
//   userId: 'user123',
//   lastActionTime: 1711617590000,
//   actionCount: 25,
//   blockedUntil: 0
// }
```

---

## ⚡ Performance Tips

### Reduce Memory Usage
```typescript
// In server/cron job - run every 5 minutes
RateLimitService.cacheStats(); // See current user count
// If > 10k users, consider Redis
```

### Custom Limits Per User Type
```typescript
const config = {
  throttleMs: isVerifiedUser ? 2000 : 5000,
  hourlyLimit: isPremium ? 50 : 10,
};
const result = RateLimitService.checkPostLimit(userId, config);
```

### Cache Config Locally
```typescript
// Don't reload from DB on every request
const configCache = {};
const getConfig = async (schoolId) => {
  if (!configCache[schoolId]) {
    configCache[schoolId] = await PostLimitConfigService.loadPostLimitConfig(schoolId);
  }
  return configCache[schoolId];
};
```

---

## 🆘 Troubleshooting

### "Rate limit not working"
1. Check user is authenticated: `auth.currentUser`
2. Verify hook is called: `usePostRateLimit()`
3. Check if limit is disabled: `config.isEnabled === true`
4. Clear cache: `RateLimitService.clearUserCache(userId)`

### "User says they're blocked but shouldn't be"
1. Check block time: `DDoSProtectionService.isUserBlocked(userId)`
2. Check expiration: `getDDoSStats()` → check `unblockedAt`
3. Manually unblock: `DDoSProtectionService.unblockUser(userId)`

### "Config won't save"
1. Check schoolId exists: `userProfile.schoolId`
2. Check user is admin: `userProfile.role === 'admin'`
3. Check Firestore rules allow write to `post_limit_configs`
4. Clear browser cache and reload

### "Performance is slow"
1. Check cache size: `RateLimitService.getCacheStats()`
2. If > 50k users, switch to Redis
3. Use monitoring: `setInterval(() => getCacheStats(), 60000)`

---

## 📚 Learn More

See full guide: [RATE_LIMITING_IMPLEMENTATION_GUIDE.md](./RATE_LIMITING_IMPLEMENTATION_GUIDE.md)

Key sections:
- Architecture (3 services)
- Configuration guide (presets)
- Searchable keywords (for grep)
- Testing checklist
- Security notes
- Maintenance guide

---

**Created**: March 28, 2025
**Duration**: ~5 minutes to read and understand
