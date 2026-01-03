import { UI } from '../config/constants.js';

/**
 * Manages hint text display in AR
 */
export class HintDisplay {
  constructor() {
    this.hintElement = document.getElementById('hint-text');
    this.isVisible = false;
  }

  /**
   * Show placement hint
   */
  showPlacementHint() {
    if (this.hintElement) {
      this.hintElement.querySelector('p').textContent = UI.HINT_PLACEMENT;
      this.hintElement.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Show interaction hint
   */
  showInteractionHint() {
    if (this.hintElement) {
      this.hintElement.querySelector('p').textContent = UI.HINT_INTERACTION;
      this.hintElement.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Hide hint
   */
  hide() {
    if (this.hintElement) {
      this.hintElement.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Check if hint is visible
   * @returns {boolean}
   */
  isHintVisible() {
    return this.isVisible;
  }
}
