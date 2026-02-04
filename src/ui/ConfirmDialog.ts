/**
 * A reusable confirmation dialog component
 */
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export class ConfirmDialog {
  private overlay: HTMLDivElement;
  private dialog: HTMLDivElement;
  private resolvePromise: ((value: boolean) => void) | null = null;

  constructor() {
    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "dialog-overlay";

    // Create dialog container
    this.dialog = document.createElement("div");
    this.dialog.className = "dialog";
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-modal", "true");

    this.overlay.appendChild(this.dialog);

    // Handle clicks outside dialog
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close(false);
      }
    });

    // Handle keyboard
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Show the confirmation dialog
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  show(options: ConfirmDialogOptions): Promise<boolean> {
    const {
      title,
      message,
      confirmText = "Confirm",
      cancelText = "Cancel",
    } = options;

    // Build dialog content
    this.dialog.innerHTML = `
      <div class="dialog-header">
        <span class="dialog-icon">&#9888;</span>
        <span class="dialog-title">${this.escapeHtml(title)}</span>
      </div>
      <div class="dialog-body">
        <p>${this.escapeHtml(message)}</p>
      </div>
      <div class="dialog-footer">
        <button class="dialog-btn dialog-btn-cancel">${this.escapeHtml(cancelText)}</button>
        <button class="dialog-btn dialog-btn-confirm">${this.escapeHtml(confirmText)}</button>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(this.overlay);

    // Set up button handlers
    const cancelBtn = this.dialog.querySelector(
      ".dialog-btn-cancel"
    ) as HTMLButtonElement;
    const confirmBtn = this.dialog.querySelector(
      ".dialog-btn-confirm"
    ) as HTMLButtonElement;

    cancelBtn.addEventListener("click", () => this.close(false));
    confirmBtn.addEventListener("click", () => this.close(true));

    // Focus confirm button
    confirmBtn.focus();

    // Add keyboard listener
    document.addEventListener("keydown", this.handleKeyDown);

    // Return promise
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      this.close(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.close(true);
    }
  }

  private close(result: boolean): void {
    // Remove keyboard listener
    document.removeEventListener("keydown", this.handleKeyDown);

    // Remove from DOM
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    // Resolve promise
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Singleton instance for convenience
let dialogInstance: ConfirmDialog | null = null;

/**
 * Show a confirmation dialog
 * @param options Dialog options
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function confirm(options: ConfirmDialogOptions): Promise<boolean> {
  if (!dialogInstance) {
    dialogInstance = new ConfirmDialog();
  }
  return dialogInstance.show(options);
}
