let onConfirmCallback = null;

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
    errorEl.textContent = '';
    overlay.hidden = true;
    const cb = onConfirmCallback;
    onConfirmCallback = null;
    if (cb) cb({ playerName });
  });

  window.showSetupOverlay = (onConfirm) => {
    onConfirmCallback = onConfirm;
    nameInput.value = '';
    errorEl.textContent = '';
    overlay.hidden = false;
    nameInput.focus();
  };
}
