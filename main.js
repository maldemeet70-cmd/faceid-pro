/**
 * main.js — App initialization, camera management, face detection loop
 * Entry point for the FaceID Pro application
 */

import { initFaceManager, registerFace, recognizeFace, getProfiles, deleteProfile, addDescriptor } from './modules/faceManager.js';
import { triggerAction } from './modules/actionEngine.js';
import {
  showLoadingScreen,
  updateLoadingProgress,
  hideLoadingScreen,
  updateStatus,
  showToast,
  showRegistrationModal,
  updateRecognitionPanel,
  renderProfilesList
} from './modules/ui.js';

// ─── State ─────────────────────────────────────────────────────────
let videoEl, canvasEl, ctx;
let isDetecting = false;
let showLandmarks = true;
let showDetectionInfo = true;
let currentRecognition = null;
let lastRecognitionTime = 0;
let detectionFrameId = null;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';

// ─── Initialization ────────────────────────────────────────────────

async function init() {
  showLoadingScreen('Loading AI models...');

  try {
    // Load face-api models
    updateLoadingProgress('Loading face detector...', 10);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

    updateLoadingProgress('Loading landmark model...', 35);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    updateLoadingProgress('Loading recognition model...', 60);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    updateLoadingProgress('Loading expression model...', 80);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    updateLoadingProgress('Initializing...', 95);

    // Initialize face manager (loads stored profiles)
    initFaceManager();
    refreshProfilesList();

    updateLoadingProgress('Ready!', 100);

    setTimeout(() => {
      hideLoadingScreen();
      updateStatus('Models loaded — ready to start', 'active');
      setupEventListeners();
    }, 500);

  } catch (error) {
    console.error('Failed to load models:', error);
    updateLoadingProgress('Error loading models!', 0);
    updateStatus('Error loading models', 'error');
    showToast('Failed to load AI models. Please refresh the page.', 'error');
  }
}

// ─── Event Listeners ───────────────────────────────────────────────

function setupEventListeners() {
  // Start camera
  document.getElementById('start-camera-btn').addEventListener('click', startCamera);

  // Register face
  document.getElementById('register-btn').addEventListener('click', handleRegisterFace);

  // Toggle landmarks
  document.getElementById('toggle-landmarks-btn').addEventListener('click', () => {
    showLandmarks = !showLandmarks;
    const btn = document.getElementById('toggle-landmarks-btn');
    btn.classList.toggle('btn-primary', showLandmarks);
    btn.classList.toggle('btn-ghost', !showLandmarks);
    showToast(`Landmarks ${showLandmarks ? 'enabled' : 'disabled'}`, 'info');
  });

  // Toggle detection info
  document.getElementById('toggle-detection-btn').addEventListener('click', () => {
    showDetectionInfo = !showDetectionInfo;
    const btn = document.getElementById('toggle-detection-btn');
    btn.classList.toggle('btn-primary', showDetectionInfo);
    btn.classList.toggle('btn-ghost', !showDetectionInfo);
    showToast(`Detection info ${showDetectionInfo ? 'enabled' : 'disabled'}`, 'info');
  });

  // Snapshot
  document.getElementById('snapshot-btn').addEventListener('click', takeSnapshot);
}

// ─── Camera ─────────────────────────────────────────────────────────

async function startCamera() {
  try {
    updateStatus('Starting camera...', 'loading');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    });

    videoEl = document.getElementById('webcam');
    canvasEl = document.getElementById('overlay-canvas');
    ctx = canvasEl.getContext('2d');

    videoEl.srcObject = stream;

    await new Promise((resolve) => {
      videoEl.onloadedmetadata = resolve;
    });

    // Show video and canvas
    videoEl.style.display = 'block';
    canvasEl.style.display = 'block';
    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('camera-corners').style.display = 'block';

    // Size canvas to match video
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Enable buttons
    document.getElementById('register-btn').disabled = false;
    document.getElementById('toggle-landmarks-btn').disabled = false;
    document.getElementById('toggle-detection-btn').disabled = false;
    document.getElementById('snapshot-btn').disabled = false;

    updateStatus('Camera active — detecting faces', 'active');
    showToast('Camera started successfully!', 'success');

    // Start detection loop
    isDetecting = true;
    detectFaces();

  } catch (error) {
    console.error('Camera error:', error);
    updateStatus('Camera access denied', 'error');
    showToast('Could not access camera. Please allow camera permissions.', 'error');
  }
}

function resizeCanvas() {
  if (!videoEl || !canvasEl) return;
  const viewport = document.getElementById('camera-viewport');
  canvasEl.width = viewport.clientWidth;
  canvasEl.height = viewport.clientHeight;
}

// ─── Face Detection Loop ───────────────────────────────────────────

async function detectFaces() {
  if (!isDetecting || !videoEl || videoEl.paused || videoEl.ended) {
    detectionFrameId = requestAnimationFrame(detectFaces);
    return;
  }

  try {
    const detections = await faceapi
      .detectAllFaces(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();

    // Clear canvas
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (detections.length > 0) {
      // Resize detections to match canvas
      const dims = {
        width: canvasEl.width,
        height: canvasEl.height
      };
      const resized = faceapi.resizeResults(detections, dims);

      // Draw each detection
      resized.forEach((detection, i) => {
        drawFaceBox(detection, i);

        if (showLandmarks) {
          drawLandmarks(detection);
        }

        if (showDetectionInfo) {
          drawDetectionInfo(detection);
        }
      });

      // Try to recognize the primary (largest) face
      const now = Date.now();
      if (now - lastRecognitionTime > 500) { // Throttle to every 500ms
        lastRecognitionTime = now;
        const primaryDetection = detections.reduce((a, b) => {
          const areaA = a.detection.box.width * a.detection.box.height;
          const areaB = b.detection.box.width * b.detection.box.height;
          return areaA > areaB ? a : b;
        });

        const result = recognizeFace(primaryDetection.descriptor);
        if (result) {
          if (!currentRecognition || currentRecognition.profile.id !== result.profile.id) {
            currentRecognition = result;
            updateRecognitionPanel(result);
            bindActionButtons(result.profile);
          }
        } else {
          if (currentRecognition) {
            currentRecognition = null;
            updateRecognitionPanel(null);
          }
        }
      }
    } else {
      if (currentRecognition) {
        currentRecognition = null;
        updateRecognitionPanel(null);
      }
    }
  } catch (error) {
    // Silently continue — detection errors are common and transient
  }

  detectionFrameId = requestAnimationFrame(detectFaces);
}

// ─── Drawing Functions ──────────────────────────────────────────────

function drawFaceBox(detection, index) {
  const box = detection.detection.box;

  // Mirror the x-coordinate since video is mirrored
  const mirroredX = canvasEl.width - box.x - box.width;

  // Glow effect
  ctx.shadowColor = currentRecognition ? '#3fb950' : '#58a6ff';
  ctx.shadowBlur = 15;

  // Box
  ctx.strokeStyle = currentRecognition ? '#3fb950' : '#58a6ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  // Draw rounded rect
  const r = 8;
  const x = mirroredX, y = box.y, w = box.width, h = box.height;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Corner accents
  const cornerLen = 15;
  ctx.lineWidth = 3;
  ctx.strokeStyle = currentRecognition ? '#3fb950' : '#39d0d8';

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - cornerLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cornerLen, y + h);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cornerLen);
  ctx.stroke();

  // Label
  if (currentRecognition) {
    const label = `${currentRecognition.profile.name} (${currentRecognition.confidence}%)`;
    ctx.font = '600 14px Inter, sans-serif';
    const labelWidth = ctx.measureText(label).width + 16;
    const labelHeight = 26;
    const labelX = x;
    const labelY = y - labelHeight - 4;

    ctx.fillStyle = 'rgba(63, 185, 80, 0.85)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillText(label, labelX + 8, labelY + 17);
  }
}

function drawLandmarks(detection) {
  const landmarks = detection.landmarks;
  const positions = landmarks.positions;

  // Mirror positions
  const mirrored = positions.map(pt => ({
    x: canvasEl.width - pt.x,
    y: pt.y
  }));

  ctx.fillStyle = 'rgba(57, 208, 216, 0.5)';
  mirrored.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDetectionInfo(detection) {
  const box = detection.detection.box;
  const mirroredX = canvasEl.width - box.x - box.width;

  // Expression
  const expressions = detection.expressions;
  const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
  const topExpression = sorted[0];

  if (topExpression[1] > 0.5) {
    const expressionIcons = {
      happy: '😊', sad: '😢', angry: '😠', fearful: '😨',
      disgusted: '🤢', surprised: '😮', neutral: '😐'
    };

    const icon = expressionIcons[topExpression[0]] || '😐';
    const text = `${icon} ${topExpression[0]} ${Math.round(topExpression[1] * 100)}%`;

    ctx.font = '500 12px Inter, sans-serif';
    const textWidth = ctx.measureText(text).width + 12;

    ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
    ctx.beginPath();
    ctx.roundRect(mirroredX, box.y + box.height + 8, textWidth, 22, 4);
    ctx.fill();

    ctx.fillStyle = '#8b949e';
    ctx.fillText(text, mirroredX + 6, box.y + box.height + 23);
  }
}

// ─── Face Registration ──────────────────────────────────────────────

async function handleRegisterFace() {
  if (!videoEl) {
    showToast('Please start the camera first', 'warning');
    return;
  }

  // Detect face in current frame
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    showToast('No face detected! Please position your face in the camera.', 'warning');
    return;
  }

  // Capture snapshot
  const snapshotCanvas = document.createElement('canvas');
  snapshotCanvas.width = videoEl.videoWidth;
  snapshotCanvas.height = videoEl.videoHeight;
  const snapshotCtx = snapshotCanvas.getContext('2d');
  snapshotCtx.translate(snapshotCanvas.width, 0);
  snapshotCtx.scale(-1, 1);
  snapshotCtx.drawImage(videoEl, 0, 0);
  const imageDataUrl = snapshotCanvas.toDataURL('image/jpeg', 0.8);

  // Show registration modal
  showRegistrationModal(imageDataUrl, (profileData) => {
    const profile = registerFace(profileData, detection.descriptor);
    refreshProfilesList();
    updateStatus(`Registered: ${profile.name}`, 'active');
  });
}

// ─── Snapshot ───────────────────────────────────────────────────────

function takeSnapshot() {
  if (!videoEl) return;

  const snapshotCanvas = document.createElement('canvas');
  snapshotCanvas.width = videoEl.videoWidth;
  snapshotCanvas.height = videoEl.videoHeight;
  const snapshotCtx = snapshotCanvas.getContext('2d');
  snapshotCtx.translate(snapshotCanvas.width, 0);
  snapshotCtx.scale(-1, 1);
  snapshotCtx.drawImage(videoEl, 0, 0);

  const link = document.createElement('a');
  link.download = `faceid_snapshot_${Date.now()}.jpg`;
  link.href = snapshotCanvas.toDataURL('image/jpeg', 0.9);
  link.click();

  showToast('Snapshot saved!', 'success');
}

// ─── Action Buttons ─────────────────────────────────────────────────

function bindActionButtons(profile) {
  // Wait for DOM to update
  setTimeout(() => {
    const panel = document.getElementById('recognition-panel');

    panel.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        triggerAction(action, profile);
      });
    });
  }, 100);
}

// ─── Profiles List ──────────────────────────────────────────────────

function refreshProfilesList() {
  const profiles = getProfiles();
  renderProfilesList(profiles, (id) => {
    deleteProfile(id);
    refreshProfilesList();
    showToast('Profile deleted', 'info');

    // Clear recognition if the deleted profile was active
    if (currentRecognition && currentRecognition.profile.id === id) {
      currentRecognition = null;
      updateRecognitionPanel(null);
    }
  });
}

// ─── Start App ──────────────────────────────────────────────────────

init();
