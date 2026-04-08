/**
 * faceManager.js — Face registration, recognition, and descriptor management
 */

import { saveProfiles, loadProfiles } from './storage.js';

let profiles = [];
let faceMatcher = null;

const MATCH_THRESHOLD = 0.6; // Lower = stricter matching

/**
 * Initialize face manager — load profiles from storage
 */
export function initFaceManager() {
  profiles = loadProfiles();
  rebuildMatcher();
  return profiles;
}

/**
 * Rebuild the FaceMatcher from current profiles
 */
function rebuildMatcher() {
  if (profiles.length === 0) {
    faceMatcher = null;
    return;
  }

  const labeledDescriptors = profiles.map(p => {
    return new faceapi.LabeledFaceDescriptors(
      p.id,
      p.descriptors
    );
  });

  faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);
}

/**
 * Register a new face profile
 * @param {Object} profileData - { name, info, websiteUrl, videoUrl, paymentAmount }
 * @param {Float32Array} descriptor - 128-dim face descriptor
 * @returns {Object} The created profile
 */
export function registerFace(profileData, descriptor) {
  const id = 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const profile = {
    id,
    name: profileData.name,
    info: profileData.info || '',
    websiteUrl: profileData.websiteUrl || '',
    videoUrl: profileData.videoUrl || '',
    paymentAmount: profileData.paymentAmount || '',
    descriptors: [descriptor],
    createdAt: new Date().toISOString(),
    avatar: profileData.avatar || null
  };
  profiles.push(profile);
  saveProfiles(profiles);
  rebuildMatcher();
  return profile;
}

/**
 * Add additional descriptor to existing profile (improves recognition)
 * @param {string} profileId
 * @param {Float32Array} descriptor
 */
export function addDescriptor(profileId, descriptor) {
  const profile = profiles.find(p => p.id === profileId);
  if (profile) {
    profile.descriptors.push(descriptor);
    saveProfiles(profiles);
    rebuildMatcher();
  }
}

/**
 * Recognize a face from a descriptor
 * @param {Float32Array} descriptor - Face descriptor to match
 * @returns {Object|null} { profile, distance, confidence }
 */
export function recognizeFace(descriptor) {
  if (!faceMatcher) return null;

  const match = faceMatcher.findBestMatch(descriptor);
  if (match.label === 'unknown') return null;

  const profile = profiles.find(p => p.id === match.label);
  if (!profile) return null;

  const confidence = Math.round((1 - match.distance) * 100);
  return {
    profile,
    distance: match.distance,
    confidence
  };
}

/**
 * Get all registered profiles
 */
export function getProfiles() {
  return [...profiles];
}

/**
 * Delete a profile by ID
 */
export function deleteProfile(id) {
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);
  rebuildMatcher();
}

/**
 * Get profile count
 */
export function getProfileCount() {
  return profiles.length;
}
