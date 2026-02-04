import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConfirmDialog, confirm } from "../../src/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  let dialog: ConfirmDialog;

  beforeEach(() => {
    dialog = new ConfirmDialog();
  });

  afterEach(() => {
    // Clean up any dialogs left in the DOM
    document.querySelectorAll(".dialog-overlay").forEach((el) => el.remove());
  });

  describe("show", () => {
    it("should add dialog to DOM when shown", async () => {
      const promise = dialog.show({
        title: "Test Title",
        message: "Test Message",
      });

      expect(document.querySelector(".dialog-overlay")).not.toBeNull();
      expect(document.querySelector(".dialog")).not.toBeNull();

      // Clean up by clicking cancel
      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();
      await promise;
    });

    it("should display correct title and message", async () => {
      const promise = dialog.show({
        title: "My Title",
        message: "My Message",
      });

      const title = document.querySelector(".dialog-title");
      const body = document.querySelector(".dialog-body p");

      expect(title?.textContent).toBe("My Title");
      expect(body?.textContent).toBe("My Message");

      // Clean up
      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();
      await promise;
    });

    it("should use custom button text when provided", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
        confirmText: "Yes",
        cancelText: "No",
      });

      const confirmBtn = document.querySelector(".dialog-btn-confirm");
      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;

      expect(confirmBtn?.textContent).toBe("Yes");
      expect(cancelBtn?.textContent).toBe("No");

      // Clean up
      cancelBtn.click();
      await promise;
    });

    it("should use default button text when not provided", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const confirmBtn = document.querySelector(".dialog-btn-confirm");
      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;

      expect(confirmBtn?.textContent).toBe("Confirm");
      expect(cancelBtn?.textContent).toBe("Cancel");

      // Clean up
      cancelBtn.click();
      await promise;
    });
  });

  describe("confirmation", () => {
    it("should resolve true when confirm button is clicked", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const confirmBtn = document.querySelector(
        ".dialog-btn-confirm"
      ) as HTMLButtonElement;
      confirmBtn.click();

      const result = await promise;
      expect(result).toBe(true);
    });

    it("should resolve false when cancel button is clicked", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();

      const result = await promise;
      expect(result).toBe(false);
    });

    it("should resolve false when clicking outside the dialog", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const overlay = document.querySelector(
        ".dialog-overlay"
      ) as HTMLDivElement;
      // Simulate click on overlay (not on dialog)
      overlay.click();

      const result = await promise;
      expect(result).toBe(false);
    });

    it("should remove dialog from DOM after confirmation", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const confirmBtn = document.querySelector(
        ".dialog-btn-confirm"
      ) as HTMLButtonElement;
      confirmBtn.click();

      await promise;
      expect(document.querySelector(".dialog-overlay")).toBeNull();
    });

    it("should remove dialog from DOM after cancellation", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();

      await promise;
      expect(document.querySelector(".dialog-overlay")).toBeNull();
    });
  });

  describe("keyboard handling", () => {
    it("should resolve true when Enter key is pressed", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const event = new KeyboardEvent("keydown", { key: "Enter" });
      document.dispatchEvent(event);

      const result = await promise;
      expect(result).toBe(true);
    });

    it("should resolve false when Escape key is pressed", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "Test",
      });

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe("HTML escaping", () => {
    it("should escape HTML in title", async () => {
      const promise = dialog.show({
        title: "<script>alert('xss')</script>",
        message: "Test",
      });

      const title = document.querySelector(".dialog-title");
      expect(title?.innerHTML).not.toContain("<script>");
      expect(title?.textContent).toBe("<script>alert('xss')</script>");

      // Clean up
      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();
      await promise;
    });

    it("should escape HTML in message", async () => {
      const promise = dialog.show({
        title: "Test",
        message: "<img src=x onerror=alert('xss')>",
      });

      const body = document.querySelector(".dialog-body p");
      expect(body?.innerHTML).not.toContain("<img");
      expect(body?.textContent).toBe("<img src=x onerror=alert('xss')>");

      // Clean up
      const cancelBtn = document.querySelector(
        ".dialog-btn-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();
      await promise;
    });
  });
});

describe("confirm function", () => {
  afterEach(() => {
    document.querySelectorAll(".dialog-overlay").forEach((el) => el.remove());
  });

  it("should show a dialog and return result", async () => {
    const promise = confirm({
      title: "Test",
      message: "Test message",
    });

    expect(document.querySelector(".dialog-overlay")).not.toBeNull();

    const confirmBtn = document.querySelector(
      ".dialog-btn-confirm"
    ) as HTMLButtonElement;
    confirmBtn.click();

    const result = await promise;
    expect(result).toBe(true);
  });

  it("should reuse the same dialog instance", async () => {
    // First dialog
    const promise1 = confirm({
      title: "First",
      message: "First message",
    });

    const cancelBtn1 = document.querySelector(
      ".dialog-btn-cancel"
    ) as HTMLButtonElement;
    cancelBtn1.click();
    await promise1;

    // Second dialog
    const promise2 = confirm({
      title: "Second",
      message: "Second message",
    });

    const title = document.querySelector(".dialog-title");
    expect(title?.textContent).toBe("Second");

    const cancelBtn2 = document.querySelector(
      ".dialog-btn-cancel"
    ) as HTMLButtonElement;
    cancelBtn2.click();
    await promise2;
  });
});
