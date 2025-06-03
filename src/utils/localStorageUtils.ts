
// Utility functions for managing localStorage quota
export const getStorageQuota = (): { used: number; total: number; percentage: number } => {
  try {
    let total = 0;
    let used = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length;
      }
    }
    
    total = 5 * 1024 * 1024; // 5MB in bytes
    
    return {
      used,
      total,
      percentage: (used / total) * 100
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return { used: 0, total: 0, percentage: 0 };
  }
};

export const cleanupOldTempData = (): void => {
  try {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('temp_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.created_at) {
            const createdAt = new Date(data.created_at).getTime();
            if (now - createdAt > maxAge) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // If we can't parse the data, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleaned up ${keysToRemove.length} old temporary entries`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

export const checkAndCleanStorage = (): boolean => {
  const quota = getStorageQuota();
  
  // If we're using more than 80% of storage, clean up
  if (quota.percentage > 80) {
    console.warn('localStorage quota nearly exceeded, cleaning up...');
    cleanupOldTempData();
    return true;
  }
  
  return false;
};

export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    // Check quota before setting
    checkAndCleanStorage();
    
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.code === 22) {
      // Quota exceeded
      console.warn('localStorage quota exceeded, attempting cleanup...');
      cleanupOldTempData();
      
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Unable to save to localStorage even after cleanup:', retryError);
        return false;
      }
    } else {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }
};
