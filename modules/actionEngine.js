/**
 * actionEngine.js — Action triggers for recognized faces
 * Supports: info display, website opening, video playback, payment simulation
 */

import { showProfileInfoModal, showVideoPlayerModal, showPaymentModal, showToast } from './ui.js';

/**
 * Trigger an action based on type
 * @param {string} type - 'info' | 'website' | 'video' | 'payment'
 * @param {Object} profile - The recognized face profile
 */
export function triggerAction(type, profile) {
  switch (type) {
    case 'info':
      handleInfoAction(profile);
      break;
    case 'website':
      handleWebsiteAction(profile);
      break;
    case 'video':
      handleVideoAction(profile);
      break;
    case 'payment':
      handlePaymentAction(profile);
      break;
    default:
      console.warn('Unknown action type:', type);
  }
}

/**
 * Display profile information in a modal
 */
function handleInfoAction(profile) {
  showProfileInfoModal(profile);
}

/**
 * Open a website
 */
function handleWebsiteAction(profile) {
  if (!profile.websiteUrl) {
    showToast('No website configured for this profile', 'warning');
    return;
  }
  let url = profile.websiteUrl;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast(`Opening ${profile.name}'s website...`, 'success');
}

/**
 * Play a video in a modal player
 */
function handleVideoAction(profile) {
  if (!profile.videoUrl) {
    showToast('No video configured for this profile', 'warning');
    return;
  }
  showVideoPlayerModal(profile);
}

/**
 * Show payment simulation modal
 */
function handlePaymentAction(profile) {
  if (!profile.paymentAmount) {
    showToast('No payment amount configured for this profile', 'warning');
    return;
  }
  showPaymentModal(profile);
}
