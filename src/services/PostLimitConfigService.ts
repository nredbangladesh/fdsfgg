/**
 * POST_LIMIT_CONFIG_SERVICE - Admin configuration for post limits
 * ===============================================================
 * 
 * USAGE:
 * - Save config: configService.savePostLimitConfig(schoolId, config)
 * - Load config: configService.loadPostLimitConfig(schoolId)
 * - Get default: configService.getDefaultConfig()
 * - Reset: configService.resetPostLimitConfig(schoolId)
 * 
 * SEARCHABLE KEYWORDS:
 * - Post limit configuration, admin settings
 * - Throttle time, hourly limit, daily limit
 * - Per-school configuration, admin dashboard
 */

import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export interface PostLimitConfiguration {
  schoolId: string;
  
  // Message settings
  messageThrottleMs: number; // Min time between messages
  messageDailyLimit: number; // Max messages per day
  
  // Post settings
  postThrottleMs: number; // Min time between posts
  postHourlyLimit: number; // Max posts per hour
  postDailyLimit: number; // Max posts per day
  
  // DDoS settings
  ddosThreshold: number; // Requests before blocking
  ddosWindowMs: number; // Time window for counting requests
  ddosBlockDurationMs: number; // How long to block
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  updatedBy: string; // Admin user ID who made the change
  isEnabled: boolean;
}

/**
 * DEFAULT CONFIGURATION - Student-friendly defaults
 * SEARCHABLE: "DEFAULT_POST_LIMIT", "DEFAULT_CONFIG"
 */
export const DEFAULT_POST_LIMIT_CONFIG: Omit<PostLimitConfiguration, 'schoolId' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  // Messages: 2 second throttle, 500 msgs/day
  messageThrottleMs: 2000,
  messageDailyLimit: 500,
  
  // Posts: 5 second throttle, 10/hour, 30/day
  postThrottleMs: 5000,
  postHourlyLimit: 10,
  postDailyLimit: 30,
  
  // DDoS: Block after 50 requests in 60s for 1 hour
  ddosThreshold: 50,
  ddosWindowMs: 60000,
  ddosBlockDurationMs: 3600000,
  
  isEnabled: true,
};

/**
 * CONSERVATIVE CONFIGURATION - For strict control
 * SEARCHABLE: "CONSERVATIVE_CONFIG", "STRICT_LIMIT"
 */
export const CONSERVATIVE_POST_LIMIT_CONFIG: Omit<PostLimitConfiguration, 'schoolId' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  messageThrottleMs: 3000,
  messageDailyLimit: 200,
  postThrottleMs: 10000,
  postHourlyLimit: 5,
  postDailyLimit: 15,
  ddosThreshold: 30,
  ddosWindowMs: 60000,
  ddosBlockDurationMs: 3600000,
  isEnabled: true,
};

/**
 * RELAXED CONFIGURATION - For trusted schools
 * SEARCHABLE: "RELAXED_CONFIG", "TRUSTED_SCHOOL"
 */
export const RELAXED_POST_LIMIT_CONFIG: Omit<PostLimitConfiguration, 'schoolId' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  messageThrottleMs: 1000,
  messageDailyLimit: 1000,
  postThrottleMs: 3000,
  postHourlyLimit: 20,
  postDailyLimit: 100,
  ddosThreshold: 100,
  ddosWindowMs: 60000,
  ddosBlockDurationMs: 3600000,
  isEnabled: true,
};

/**
 * COLLECTION NAME IN FIRESTORE
 * SEARCHABLE: "POST_LIMIT_CONFIGS", "FIRESTORE_COLLECTION"
 */
const COLLECTION_NAME = 'post_limit_configs';

/**
 * SAVE POST LIMIT CONFIGURATION
 * 
 * SEARCHABLE: "savePostLimitConfig", "UPDATE_CONFIG", "ADMIN_SAVE"
 * 
 * Saves configuration to Firestore with audit trail
 * 
 * @param schoolId - School ID
 * @param config - Configuration object
 * @param adminUserId - Admin user ID who made the change
 * @returns Updated configuration object
 */
export async function savePostLimitConfig(
  schoolId: string,
  config: Omit<PostLimitConfiguration, 'schoolId' | 'createdAt' | 'updatedAt' | 'updatedBy'>,
  adminUserId: string
): Promise<PostLimitConfiguration> {
  try {
    const now = new Date().toISOString();
    const existingConfig = await loadPostLimitConfig(schoolId);
    const configToSave: PostLimitConfiguration = {
      schoolId,
      ...config,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
      updatedBy: adminUserId,
    };
    
    await setDoc(doc(db, COLLECTION_NAME, schoolId), configToSave);
    
    console.log(`✅ Post limit config saved for school: ${schoolId}`);
    return configToSave;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    throw new Error(`Failed to save post limit config: ${error}`);
  }
}

/**
 * LOAD POST LIMIT CONFIGURATION
 * 
 * SEARCHABLE: "loadPostLimitConfig", "GET_CONFIG", "FETCH_CONFIG"
 * 
 * Retrieves configuration for a school
 * Falls back to defaults if not found
 * 
 * @param schoolId - School ID
 * @returns Configuration object or defaults
 */
export async function loadPostLimitConfig(schoolId: string): Promise<PostLimitConfiguration> {
  try {
    const docRef = doc(db, COLLECTION_NAME, schoolId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as PostLimitConfiguration;
    }
    
    // Return default config if not found
    const now = new Date().toISOString();
    return {
      schoolId,
      ...DEFAULT_POST_LIMIT_CONFIG,
      createdAt: now,
      updatedAt: now,
      updatedBy: 'system',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    // Return defaults on error
    const now = new Date().toISOString();
    return {
      schoolId,
      ...DEFAULT_POST_LIMIT_CONFIG,
      createdAt: now,
      updatedAt: now,
      updatedBy: 'system',
    };
  }
}

/**
 * GET DEFAULT CONFIGURATION
 * 
 * SEARCHABLE: "getDefaultConfig", "DEFAULT_SETTINGS"
 * 
 * Returns the default configuration template
 * 
 * @param schoolId - School ID
 * @returns Default configuration object
 */
export function getDefaultPostLimitConfig(schoolId: string): PostLimitConfiguration {
  const now = new Date().toISOString();
  return {
    schoolId,
    ...DEFAULT_POST_LIMIT_CONFIG,
    createdAt: now,
    updatedAt: now,
    updatedBy: 'system',
  };
}

/**
 * GET CONFIGURATION PRESET BY NAME
 * 
 * SEARCHABLE: "getConfigPreset", "PRESET_TEMPLATE"
 * 
 * Get a configuration preset
 * 
 * @param presetName - 'default' | 'conservative' | 'relaxed'
 * @param schoolId - School ID
 * @returns Configuration preset
 */
export function getConfigPreset(
  presetName: 'default' | 'conservative' | 'relaxed',
  schoolId: string
): PostLimitConfiguration {
  const now = new Date().toISOString();
  
  const configs = {
    default: DEFAULT_POST_LIMIT_CONFIG,
    conservative: CONSERVATIVE_POST_LIMIT_CONFIG,
    relaxed: RELAXED_POST_LIMIT_CONFIG,
  };
  
  const selectedConfig = configs[presetName] || DEFAULT_POST_LIMIT_CONFIG;
  
  return {
    schoolId,
    ...selectedConfig,
    createdAt: now,
    updatedAt: now,
    updatedBy: 'system',
  };
}

/**
 * RESET POST LIMIT CONFIGURATION
 * 
 * SEARCHABLE: "resetPostLimitConfig", "DELETE_CONFIG", "ADMIN_RESET"
 * 
 * Delete custom config and revert to defaults
 * 
 * @param schoolId - School ID
 */
export async function resetPostLimitConfig(schoolId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, schoolId));
    console.log(`✅ Post limit config reset for school: ${schoolId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${schoolId}`);
    throw new Error(`Failed to reset post limit config: ${error}`);
  }
}

/**
 * VALIDATE CONFIGURATION
 * 
 * SEARCHABLE: "validateConfig", "CONFIG_VALIDATION"
 * 
 * Validate configuration values
 * 
 * @param config - Configuration to validate
 * @returns {valid: boolean, errors: string[]}
 */
export function validatePostLimitConfig(
  config: Omit<PostLimitConfiguration, 'schoolId' | 'createdAt' | 'updatedAt' | 'updatedBy'>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate message settings
  if (config.messageThrottleMs < 100) errors.push('Message throttle must be at least 100ms');
  if (config.messageDailyLimit < 1) errors.push('Daily message limit must be at least 1');
  
  // Validate post settings
  if (config.postThrottleMs < 100) errors.push('Post throttle must be at least 100ms');
  if (config.postHourlyLimit < 1) errors.push('Hourly post limit must be at least 1');
  if (config.postDailyLimit < config.postHourlyLimit) {
    errors.push('Daily post limit must be greater than hourly limit');
  }
  
  // Validate DDoS settings
  if (config.ddosThreshold < 10) errors.push('DDoS threshold must be at least 10');
  if (config.ddosWindowMs < 1000) errors.push('DDoS window must be at least 1000ms');
  if (config.ddosBlockDurationMs < 60000) errors.push('DDoS block duration must be at least 60000ms');
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * EXPORT SERVICE OBJECT
 * SEARCHABLE: "PostLimitConfigService"
 */
export const PostLimitConfigService = {
  savePostLimitConfig,
  loadPostLimitConfig,
  getDefaultPostLimitConfig,
  getConfigPreset,
  resetPostLimitConfig,
  validatePostLimitConfig,
  DEFAULT_POST_LIMIT_CONFIG,
  CONSERVATIVE_POST_LIMIT_CONFIG,
  RELAXED_POST_LIMIT_CONFIG,
};

export default PostLimitConfigService;
