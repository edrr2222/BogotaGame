import { AVATAR_MANIFEST } from './gameConfig.js';

let onConfirmCallback = null;

function randomAvatarId() {
  const randomIndex = Math.floor(Math.random() * AVATAR_MANIFEST.length);
  return AVATAR_MANIFEST[randomIndex]?.id || null;
}

export function initSetupOverlay() {
  const overlay = document.getElementById('setup-overlay');
  const nameInput = document.getElementById('player-name');
  const confirmBtn = document.getElementById('confirm-setup');
  const errorEl = document.getElementById('setup-error');

  confirmBtn.addEventListener('click', () => {
    const playerName = nameInput.value.trim();
    if (!playerName) {
      errorEl.textContent = 'Escribe un nombre para empezar.';
      return;
    }

    const characterId = randomAvatarId();
    if (!characterId) {
      errorEl.textContent = 'No hay personajes disponibles.';
      return;
    }

    errorEl.textContent = '';
    overlay.hidden = true;
    const cb = onConfirmCallback;
    onConfirmCallback = null;
    if (cb) cb({ playerName, characterId });
  });

  window.showSetupOverlay = (onConfirm) => {
    onConfirmCallback = onConfirm;
    nameInput.value = '';
    errorEl.textContent = '';
    overlay.hidden = false;
    nameInput.focus();
  };
}
