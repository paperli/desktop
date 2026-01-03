/**
 * Manages entry page UI and transitions
 */
export class EntryPage {
  constructor() {
    this.entryPage = document.getElementById('entry-page');
    this.enterARButton = document.getElementById('enter-ar-button');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.arCanvas = document.getElementById('ar-canvas');
  }

  /**
   * Set up Enter AR button click handler
   * @param {Function} callback - Function to call when button is clicked
   */
  onEnterAR(callback) {
    if (this.enterARButton) {
      this.enterARButton.addEventListener('click', callback);
    }
  }

  /**
   * Disable Enter AR button
   */
  disableButton() {
    if (this.enterARButton) {
      this.enterARButton.disabled = true;
    }
  }

  /**
   * Enable Enter AR button
   */
  enableButton() {
    if (this.enterARButton) {
      this.enterARButton.disabled = false;
    }
  }

  /**
   * Show loading overlay
   */
  showLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Transition from entry page to AR mode
   */
  transitionToAR() {
    // Hide entry page
    if (this.entryPage) {
      this.entryPage.classList.add('hidden');
    }

    // Show AR canvas
    if (this.arCanvas) {
      this.arCanvas.style.display = 'block';
    }

    // Hide loading
    this.hideLoading();
  }

  /**
   * Return to entry page from AR mode
   */
  returnToEntry() {
    // Show entry page
    if (this.entryPage) {
      this.entryPage.classList.remove('hidden');
    }

    // Hide AR canvas
    if (this.arCanvas) {
      this.arCanvas.style.display = 'none';
    }

    // Hide loading
    this.hideLoading();

    // Re-enable button
    this.enableButton();
  }
}
