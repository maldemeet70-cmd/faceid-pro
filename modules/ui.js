/**
 * ui.js — UI rendering, modals, panels, animations, and toast notifications
 */

let activeModal = null;

// ─── Toast Notifications ─────────────────────────────────────────────

/**
 * Show a toast notification
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

// ─── Modal System ─────────────────────────────────────────────────────

function createModal(title, content, options = {}) {
  closeActiveModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';

  const modal = document.createElement('div');
  modal.className = `modal ${options.className || ''}`;

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" id="modal-close-btn" aria-label="Close modal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal-body">${content}</div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('modal-visible'));

  overlay.querySelector('#modal-close-btn').addEventListener('click', closeActiveModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeActiveModal();
  });

  activeModal = overlay;
  return modal;
}

export function closeActiveModal() {
  if (activeModal) {
    activeModal.classList.remove('modal-visible');
    activeModal.addEventListener('transitionend', () => activeModal?.remove());
    activeModal = null;
  }
}

// ─── Registration Modal ──────────────────────────────────────────────

/**
 * Show the face registration modal
 * @param {string} capturedImageDataUrl - Base64 snapshot from camera
 * @param {Function} onSubmit - Callback with profile data
 */
export function showRegistrationModal(capturedImageDataUrl, onSubmit) {
  const content = `
    <div class="registration-form">
      <div class="registration-preview">
        <div class="preview-image-wrapper">
          <img src="${capturedImageDataUrl}" alt="Captured face" class="preview-image" />
          <div class="preview-badge">📸 Captured</div>
        </div>
      </div>
      <div class="form-fields">
        <div class="form-group">
          <label for="reg-name" class="form-label">
            <span class="label-icon">👤</span> Full Name *
          </label>
          <input type="text" id="reg-name" class="form-input" placeholder="Enter name..." required />
        </div>
        <div class="form-group">
          <label for="reg-info" class="form-label">
            <span class="label-icon">📋</span> Bio / Info
          </label>
          <textarea id="reg-info" class="form-input form-textarea" placeholder="Brief description, role, etc..." rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="reg-website" class="form-label">
            <span class="label-icon">🌐</span> Website URL
          </label>
          <input type="url" id="reg-website" class="form-input" placeholder="https://example.com" />
        </div>
        <div class="form-group">
          <label for="reg-video" class="form-label">
            <span class="label-icon">▶️</span> Video URL
          </label>
          <input type="url" id="reg-video" class="form-input" placeholder="YouTube or MP4 URL..." />
        </div>
        <div class="form-group">
          <label for="reg-payment" class="form-label">
            <span class="label-icon">💳</span> Payment Amount ($)
          </label>
          <input type="number" id="reg-payment" class="form-input" placeholder="0.00" min="0" step="0.01" />
        </div>
        <button id="reg-submit-btn" class="btn btn-primary btn-glow">
          <span class="btn-icon">✨</span> Register Face
        </button>
      </div>
    </div>
  `;

  const modal = createModal('Register New Face', content, { className: 'modal-lg' });

  modal.querySelector('#reg-submit-btn').addEventListener('click', () => {
    const name = modal.querySelector('#reg-name').value.trim();
    if (!name) {
      showToast('Please enter a name', 'warning');
      return;
    }

    const profileData = {
      name,
      info: modal.querySelector('#reg-info').value.trim(),
      websiteUrl: modal.querySelector('#reg-website').value.trim(),
      videoUrl: modal.querySelector('#reg-video').value.trim(),
      paymentAmount: modal.querySelector('#reg-payment').value.trim(),
      avatar: capturedImageDataUrl
    };

    onSubmit(profileData);
    closeActiveModal();
    showToast(`${name} registered successfully!`, 'success');
  });
}

// ─── Profile Info Modal ──────────────────────────────────────────────

export function showProfileInfoModal(profile) {
  const content = `
    <div class="profile-info-content">
      <div class="profile-info-header">
        <div class="profile-avatar-lg">
          ${profile.avatar
            ? `<img src="${profile.avatar}" alt="${profile.name}" />`
            : `<div class="avatar-placeholder-lg">${profile.name.charAt(0).toUpperCase()}</div>`
          }
        </div>
        <div class="profile-info-meta">
          <h3 class="profile-info-name">${profile.name}</h3>
          <span class="profile-info-date">Registered: ${new Date(profile.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      ${profile.info ? `<div class="profile-info-bio"><p>${profile.info}</p></div>` : ''}
      <div class="profile-info-details">
        ${profile.websiteUrl ? `<div class="detail-row"><span class="detail-icon">🌐</span><span class="detail-value">${profile.websiteUrl}</span></div>` : ''}
        ${profile.videoUrl ? `<div class="detail-row"><span class="detail-icon">▶️</span><span class="detail-value">${profile.videoUrl}</span></div>` : ''}
        ${profile.paymentAmount ? `<div class="detail-row"><span class="detail-icon">💳</span><span class="detail-value">$${profile.paymentAmount}</span></div>` : ''}
        <div class="detail-row"><span class="detail-icon">🔐</span><span class="detail-value">${profile.descriptors.length} face sample(s) stored</span></div>
      </div>
    </div>
  `;

  createModal(`${profile.name}'s Profile`, content);
}

// ─── Video Player Modal ──────────────────────────────────────────────

export function showVideoPlayerModal(profile) {
  let videoEmbed = '';
  const url = profile.videoUrl;

  // Check for YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    videoEmbed = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen class="video-iframe"></iframe>`;
  } else {
    videoEmbed = `<video src="${url}" controls autoplay class="video-player"><p>Your browser does not support the video tag.</p></video>`;
  }

  const content = `
    <div class="video-container">
      ${videoEmbed}
    </div>
  `;

  createModal(`${profile.name}'s Video`, content, { className: 'modal-video' });
}

// ─── Payment Modal ───────────────────────────────────────────────────

export function showPaymentModal(profile) {
  const content = `
    <div class="payment-content">
      <div class="payment-summary">
        <div class="payment-to">
          <span class="payment-label">Paying</span>
          <span class="payment-name">${profile.name}</span>
        </div>
        <div class="payment-amount-display">
          <span class="payment-currency">$</span>
          <span class="payment-value">${parseFloat(profile.paymentAmount).toFixed(2)}</span>
        </div>
      </div>
      <div class="payment-form">
        <div class="form-group">
          <label class="form-label"><span class="label-icon">💳</span> Card Number</label>
          <input type="text" class="form-input" placeholder="4242 4242 4242 4242" maxlength="19" id="pay-card" />
        </div>
        <div class="payment-row">
          <div class="form-group">
            <label class="form-label">Expiry</label>
            <input type="text" class="form-input" placeholder="MM/YY" maxlength="5" id="pay-expiry" />
          </div>
          <div class="form-group">
            <label class="form-label">CVV</label>
            <input type="text" class="form-input" placeholder="123" maxlength="4" id="pay-cvv" />
          </div>
        </div>
        <button id="pay-submit-btn" class="btn btn-success btn-glow">
          <span class="btn-icon">🔒</span> Pay $${parseFloat(profile.paymentAmount).toFixed(2)}
        </button>
        <p class="payment-disclaimer">This is a simulated payment — no real charges will be made.</p>
      </div>
    </div>
  `;

  const modal = createModal('Secure Payment', content, { className: 'modal-payment' });

  // Format card input
  const cardInput = modal.querySelector('#pay-card');
  cardInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    e.target.value = val;
  });

  // Format expiry
  const expiryInput = modal.querySelector('#pay-expiry');
  expiryInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
    e.target.value = val;
  });

  modal.querySelector('#pay-submit-btn').addEventListener('click', () => {
    const card = cardInput.value.trim();
    const expiry = expiryInput.value.trim();
    const cvv = modal.querySelector('#pay-cvv').value.trim();

    if (!card || !expiry || !cvv) {
      showToast('Please fill in all payment fields', 'warning');
      return;
    }

    const btn = modal.querySelector('#pay-submit-btn');
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    btn.disabled = true;

    setTimeout(() => {
      closeActiveModal();
      showToast(`Payment of $${parseFloat(profile.paymentAmount).toFixed(2)} to ${profile.name} was successful! ✨`, 'success');
    }, 2000);
  });
}

// ─── Profiles List Panel ─────────────────────────────────────────────

/**
 * Render the profiles list in the sidebar
 * @param {Array} profiles
 * @param {Function} onDelete - Callback when delete is clicked
 */
export function renderProfilesList(profiles, onDelete) {
  const list = document.getElementById('profiles-list');
  const count = document.getElementById('profiles-count');

  count.textContent = profiles.length;

  if (profiles.length === 0) {
    list.innerHTML = `
      <div class="empty-profiles">
        <div class="empty-icon">👤</div>
        <p>No faces registered yet</p>
        <p class="empty-hint">Click "Register Face" to get started</p>
      </div>
    `;
    return;
  }

  list.innerHTML = profiles.map(p => `
    <div class="profile-card" data-id="${p.id}">
      <div class="profile-card-avatar">
        ${p.avatar
          ? `<img src="${p.avatar}" alt="${p.name}" />`
          : `<div class="avatar-placeholder">${p.name.charAt(0).toUpperCase()}</div>`
        }
      </div>
      <div class="profile-card-info">
        <span class="profile-card-name">${p.name}</span>
        <span class="profile-card-samples">${p.descriptors.length} sample(s)</span>
      </div>
      <button class="profile-card-delete" data-delete-id="${p.id}" title="Delete profile" aria-label="Delete ${p.name}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.profile-card-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      onDelete(id);
    });
  });
}

// ─── Recognition Panel ───────────────────────────────────────────────

/**
 * Update the recognition result panel
 * @param {Object|null} result - { profile, confidence } or null
 */
export function updateRecognitionPanel(result) {
  const panel = document.getElementById('recognition-panel');

  if (!result) {
    panel.classList.remove('panel-active');
    panel.innerHTML = `
      <div class="recognition-idle">
        <div class="scan-animation">
          <div class="scan-ring"></div>
          <div class="scan-ring ring-2"></div>
          <div class="scan-ring ring-3"></div>
          <div class="scan-icon">🔍</div>
        </div>
        <h3 class="idle-title">Scanning...</h3>
        <p class="idle-subtitle">Position your face in the camera view</p>
      </div>
    `;
    return;
  }

  panel.classList.add('panel-active');
  const { profile, confidence } = result;

  const confidenceColor = confidence > 80 ? '#10b981' : confidence > 60 ? '#f59e0b' : '#ef4444';

  panel.innerHTML = `
    <div class="recognition-result">
      <div class="result-header">
        <div class="result-avatar">
          ${profile.avatar
            ? `<img src="${profile.avatar}" alt="${profile.name}" />`
            : `<div class="avatar-placeholder-result">${profile.name.charAt(0).toUpperCase()}</div>`
          }
          <div class="result-status-dot"></div>
        </div>
        <div class="result-meta">
          <h3 class="result-name">${profile.name}</h3>
          <div class="result-confidence">
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${confidence}%; background: ${confidenceColor}"></div>
            </div>
            <span class="confidence-text" style="color: ${confidenceColor}">${confidence}% match</span>
          </div>
        </div>
      </div>
      ${profile.info ? `<p class="result-info">${profile.info}</p>` : ''}
      <div class="action-grid">
        <button class="action-btn action-info" data-action="info" id="action-info-btn">
          <span class="action-btn-icon">📋</span>
          <span class="action-btn-label">View Info</span>
        </button>
        <button class="action-btn action-website" data-action="website" id="action-website-btn" ${!profile.websiteUrl ? 'disabled' : ''}>
          <span class="action-btn-icon">🌐</span>
          <span class="action-btn-label">Open Website</span>
        </button>
        <button class="action-btn action-video" data-action="video" id="action-video-btn" ${!profile.videoUrl ? 'disabled' : ''}>
          <span class="action-btn-icon">▶️</span>
          <span class="action-btn-label">Play Video</span>
        </button>
        <button class="action-btn action-payment" data-action="payment" id="action-payment-btn" ${!profile.paymentAmount ? 'disabled' : ''}>
          <span class="action-btn-icon">💳</span>
          <span class="action-btn-label">Pay $${profile.paymentAmount || '0'}</span>
        </button>
      </div>
    </div>
  `;
}

// ─── Loading Screen ──────────────────────────────────────────────────

export function showLoadingScreen(message = 'Loading models...') {
  const loader = document.getElementById('loading-screen');
  const text = document.getElementById('loading-text');
  if (text) text.textContent = message;
  loader.style.display = 'flex';
}

export function updateLoadingProgress(message, progress) {
  const text = document.getElementById('loading-text');
  const bar = document.getElementById('loading-progress-fill');
  if (text) text.textContent = message;
  if (bar) bar.style.width = `${progress}%`;
}

export function hideLoadingScreen() {
  const loader = document.getElementById('loading-screen');
  loader.classList.add('loading-fadeout');
  setTimeout(() => {
    loader.style.display = 'none';
    loader.classList.remove('loading-fadeout');
  }, 500);
}

// ─── Status Bar ──────────────────────────────────────────────────────

export function updateStatus(message, type = 'info') {
  const status = document.getElementById('status-text');
  const dot = document.getElementById('status-dot');
  if (status) status.textContent = message;
  if (dot) {
    dot.className = 'status-dot';
    dot.classList.add(`status-${type}`);
  }
}
