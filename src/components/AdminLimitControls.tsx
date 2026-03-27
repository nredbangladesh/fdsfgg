/**
 * AdminLimitControls - Admin panel for managing rate limits and DDoS protection
 * ============================================================================
 * 
 * USAGE (add to AdminPanel.tsx):
 * <AdminLimitControls />
 * 
 * FEATURES:
 * - Configure post/message limits per school
 * - View and manage blocked users
 * - View DDoS statistics
 * - Preset templates (default, conservative, relaxed)
 * 
 * SEARCHABLE KEYWORDS:
 * - Admin controls, rate limit config, DDoS protection
 * - User management, blocking, security
 * - Configuration presets
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { AlertTriangle, Download, RotateCcw, Shield, Users, Settings } from 'lucide-react';
import PostLimitConfigService from '../services/PostLimitConfigService';
import DDoSProtectionService from '../services/DDoSProtectionService';

interface PostLimitConfig {
  schoolId: string;
  messageThrottleMs: number;
  messageDailyLimit: number;
  postThrottleMs: number;
  postHourlyLimit: number;
  postDailyLimit: number;
  ddosThreshold: number;
  ddosWindowMs: number;
  ddosBlockDurationMs: number;
  isEnabled: boolean;
}

/**
 * ADMIN LIMIT CONTROLS COMPONENT
 * SEARCHABLE: "AdminLimitControls", "ADMIN_SECURITY"
 */
export function AdminLimitControls() {
  const { userProfile } = useAppStore();
  const [config, setConfig] = useState<Partial<PostLimitConfig>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'ddos' | 'users'>('config');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [ddosStats, setDDoSStats] = useState<any>(null);

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!userProfile?.schoolId) return;
      try {
        const loaded = await PostLimitConfigService.loadPostLimitConfig(userProfile.schoolId);
        setConfig(loaded);
      } catch (err) {
        setError('Failed to load configuration');
        console.error(err);
      }
    };
    loadConfig();
  }, [userProfile?.schoolId]);

  // Load DDoS data
  useEffect(() => {
    if (activeTab === 'ddos') {
      const stats = DDoSProtectionService.getDDoSStats();
      setDDoSStats(stats);
      setBlockedUsers(DDoSProtectionService.getBlockedUsers());
    }
  }, [activeTab]);

  const handleSaveConfig = async () => {
    if (!userProfile?.schoolId || !userProfile?.uid) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate configuration
      const validation = PostLimitConfigService.validatePostLimitConfig({
        messageThrottleMs: config.messageThrottleMs || 2000,
        messageDailyLimit: config.messageDailyLimit || 500,
        postThrottleMs: config.postThrottleMs || 5000,
        postHourlyLimit: config.postHourlyLimit || 10,
        postDailyLimit: config.postDailyLimit || 30,
        ddosThreshold: config.ddosThreshold || 50,
        ddosWindowMs: config.ddosWindowMs || 60000,
        ddosBlockDurationMs: config.ddosBlockDurationMs || 3600000,
        isEnabled: config.isEnabled !== false,
      });

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      await PostLimitConfigService.savePostLimitConfig(
        userProfile.schoolId,
        {
          messageThrottleMs: config.messageThrottleMs || 2000,
          messageDailyLimit: config.messageDailyLimit || 500,
          postThrottleMs: config.postThrottleMs || 5000,
          postHourlyLimit: config.postHourlyLimit || 10,
          postDailyLimit: config.postDailyLimit || 30,
          ddosThreshold: config.ddosThreshold || 50,
          ddosWindowMs: config.ddosWindowMs || 60000,
          ddosBlockDurationMs: config.ddosBlockDurationMs || 3600000,
          isEnabled: config.isEnabled !== false,
        },
        userProfile.uid
      );

      setSuccess('Configuration saved successfully!');
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to save: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (preset: 'default' | 'conservative' | 'relaxed') => {
    if (!userProfile?.schoolId) return;

    const presetConfig = PostLimitConfigService.getConfigPreset(preset, userProfile.schoolId);
    setConfig(presetConfig);

    // Auto-save when applying preset
    try {
      await PostLimitConfigService.savePostLimitConfig(
        userProfile.schoolId,
        {
          messageThrottleMs: presetConfig.messageThrottleMs,
          messageDailyLimit: presetConfig.messageDailyLimit,
          postThrottleMs: presetConfig.postThrottleMs,
          postHourlyLimit: presetConfig.postHourlyLimit,
          postDailyLimit: presetConfig.postDailyLimit,
          ddosThreshold: presetConfig.ddosThreshold,
          ddosWindowMs: presetConfig.ddosWindowMs,
          ddosBlockDurationMs: presetConfig.ddosBlockDurationMs,
          isEnabled: presetConfig.isEnabled,
        },
        userProfile.uid || 'admin'
      );
      setSuccess(`Applied ${preset} preset`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to apply preset');
    }
  };

  const handleUnblockUser = (userId: string) => {
    DDoSProtectionService.unblockUser(userId);
    setBlockedUsers(DDoSProtectionService.getBlockedUsers());
    setSuccess(`User ${userId} unblocked`);
  };

  const handleResetDDoS = () => {
    if (!window.confirm('Reset all DDoS blocks? This cannot be undone.')) return;
    DDoSProtectionService.resetAllBlocks();
    setBlockedUsers([]);
    setSuccess('All blocks cleared');
  };

  const handleResetConfig = async () => {
    if (!userProfile?.schoolId) return;
    if (!window.confirm('Reset to defaults?')) return;

    try {
      await PostLimitConfigService.resetPostLimitConfig(userProfile.schoolId);
      const defaultConfig = PostLimitConfigService.getDefaultPostLimitConfig(userProfile.schoolId);
      setConfig(defaultConfig);
      setSuccess('Configuration reset to defaults');
    } catch (err) {
      setError('Failed to reset configuration');
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-200 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/5 dark:border-white/5">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('ddos')}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'ddos'
              ? 'border-red-500 text-red-500'
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          DDoS Protection
        </button>
      </div>

      {/* CONFIG TAB */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <h3 className="font-bold text-sm mb-2 opacity-60">Quick Presets</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleApplyPreset('default')}
                className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-center transition-colors"
              >
                📊 Default
              </button>
              <button
                onClick={() => handleApplyPreset('conservative')}
                className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-center transition-colors"
              >
                🛡️ Strict
              </button>
              <button
                onClick={() => handleApplyPreset('relaxed')}
                className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-center transition-colors"
              >
                🚀 Relaxed
              </button>
            </div>
          </div>

          {/* MESSAGE SETTINGS */}
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              💬 Message Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Min Time Between (ms)
                </label>
                <input
                  type="number"
                  value={config.messageThrottleMs || 2000}
                  onChange={(e) => setConfig({ ...config, messageThrottleMs: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Daily Limit
                </label>
                <input
                  type="number"
                  value={config.messageDailyLimit || 500}
                  onChange={(e) => setConfig({ ...config, messageDailyLimit: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* POST SETTINGS */}
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              📝 Post Settings
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Min Time Between (ms)
                </label>
                <input
                  type="number"
                  value={config.postThrottleMs || 5000}
                  onChange={(e) => setConfig({ ...config, postThrottleMs: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Hourly Limit
                </label>
                <input
                  type="number"
                  value={config.postHourlyLimit || 10}
                  onChange={(e) => setConfig({ ...config, postHourlyLimit: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Daily Limit
                </label>
                <input
                  type="number"
                  value={config.postDailyLimit || 30}
                  onChange={(e) => setConfig({ ...config, postDailyLimit: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* DDOS SETTINGS */}
          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              🚨 DDoS Protection
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Threshold (requests)
                </label>
                <input
                  type="number"
                  value={config.ddosThreshold || 50}
                  onChange={(e) => setConfig({ ...config, ddosThreshold: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Window (ms)
                </label>
                <input
                  type="number"
                  value={config.ddosWindowMs || 60000}
                  onChange={(e) => setConfig({ ...config, ddosWindowMs: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-1">
                  Block Duration (ms)
                </label>
                <input
                  type="number"
                  value={config.ddosBlockDurationMs || 3600000}
                  onChange={(e) => setConfig({ ...config, ddosBlockDurationMs: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-black/5 dark:border-white/5">
            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white font-semibold disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Saving...' : '💾 Save Configuration'}
            </button>
            <button
              onClick={handleResetConfig}
              className="px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DDOS TAB */}
      {activeTab === 'ddos' && (
        <div className="space-y-4">
          {/* Stats */}
          {ddosStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5">
                <p className="text-xs opacity-60">Rejected Requests</p>
                <p className="text-2xl font-bold">{ddosStats.totalRejectedRequests}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <p className="text-xs opacity-60">Blocked Users</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{ddosStats.blockedUsers}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs opacity-60">Blocked IPs</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{ddosStats.blockedIPs}</p>
              </div>
            </div>
          )}

          {/* Blocked Users List */}
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Blocked Users ({blockedUsers.length})
            </h3>
            {blockedUsers.length === 0 ? (
              <p className="text-sm opacity-60">No blocked users</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((user) => (
                  <div key={user.userId} className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{user.userId}</p>
                      <p className="text-xs opacity-60">{user.reason}</p>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(user.userId)}
                      className="px-3 py-1 text-xs rounded-lg bg-white dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetDDoS}
            className="w-full px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Reset All Blocks
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminLimitControls;
