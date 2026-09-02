import { AVATAR_MANIFEST, assetUrl } from './gameConfig.js';

let selectedKey = null;
let onConfirmCallback = null;

export function initSetupOverlay() {
  const overlay = document.getElementById('setup-overlay');
  const nameInput = document.getElementById('player-name');
  const grid = document.getElementById('avatar-grid');
  const confirmBtn = document.getElementById('confirm-setup');
  const errorEl = document.getElementById('setup-error');

  AVATAR_MANIFEST.forEach(av => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'avatar-option';
    el.title = av.label;
    const img = document.createElement('img');
    img.src = assetUrl(av.path);
    img.alt = av.label;
    const span = document.createElement('span');
    span.textContent = av.label;
    el.appendChild(img);
    el.appendChild(span);
    el.addEventListener('click', () => {
      grid.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedKey = av.key;
    });
    grid.appendChild(el);
  });

  confirmBtn.addEventListener('click', () => {
    const playerName = nameInput.value.trim();
    if (!playerName) {
      errorEl.textContent = 'Escribe un nombre para empezar.';
      return;
    }
    if (!selectedKey) {
      errorEl.textContent = 'Elige un personaje de la galería.';
      return;
    }
    errorEl.textContent = '';
    overlay.hidden = true;
    const cb = onConfirmCallback;
    onConfirmCallback = null;
    if (cb) cb({ playerName, characterKey: selectedKey });
  });

  window.showSetupOverlay = (onConfirm) => {
    onConfirmCallback = onConfirm;
    nameInput.value = '';
    selectedKey = null;
    errorEl.textContent = '';
    grid.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    overlay.hidden = false;
    nameInput.focus();
  };
}
