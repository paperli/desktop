import { UI } from '../config/constants.js';

/**
 * Handles error display and messaging
 */
export class ErrorHandler {
  constructor() {
    this.errorElement = document.getElementById('error-message');
  }

  /**
   * Show error message
   * @param {string} message
   */
  showError(message) {
    if (this.errorElement) {
      this.errorElement.textContent = message;
      this.errorElement.style.display = 'block';
    }
    console.error('Error:', message);
  }

  /**
   * Hide error message
   */
  hideError() {
    if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }
  }

  /**
   * Show WebXR not supported error
   */
  showWebXRNotSupported() {
    this.showError(UI.ERROR_NO_WEBXR);
  }

  /**
   * Show AR not available error
   */
  showARNotAvailable() {
    this.showError(UI.ERROR_NO_AR);
  }

  /**
   * Show session failed error
   */
  showSessionFailed() {
    this.showError(UI.ERROR_SESSION_FAILED);
  }

  /**
   * Show custom error
   * @param {string} message
   */
  showCustomError(message) {
    this.showError(message);
  }
}
