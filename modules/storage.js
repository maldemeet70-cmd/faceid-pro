/**
 * storage.js — LocalStorage persistence for face descriptors and profiles
 */

const STORAGE_KEY = 'faceRecognition_profiles';

/**
 * Serialize a Float32Array to a plain array for JSON storage
 */
function serializeDescriptor(descriptor) {
  return Array.from(descriptor);
}

/**
 * Deserialize a plain array back to Float32Array
 */
function deserializeDescriptor(arr) {
  return new Float32Array(arr);
}

/**
 * Save all profiles to localStorage
 * @param {Array} profiles - Array of profile objects
 */
export function saveProfiles(profiles) {
  const serialized = profiles.map(p => ({
    ...p,
    descriptors: p.descriptors.map(serializeDescriptor)
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

/**
 * Load all profiles from localStorage
 * @returns {Array} Array of profile objects with Float32Array descriptors
 */
export function loadProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.map(p => ({
      ...p,
      descriptors: p.descriptors.map(deserializeDescriptor)
    }));
  } catch (e) {
    console.error('Failed to parse stored profiles:', e);
    return [];
  }
}

/**
 * Clear all stored profiles
 */
export function clearProfiles() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export profiles as a downloadable JSON file
 */
export function exportProfiles(profiles) {
  const serialized = profiles.map(p => ({
    ...p,
    descriptors: p.descriptors.map(serializeDescriptor)
  }));
  const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'face_profiles.json';
  a.click();
  URL.revokeObjectURL(url);
}
