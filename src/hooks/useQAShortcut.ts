// POLI - Keyboard Shortcut Hook
// Handles Ctrl+Shift+Q (or Cmd+Shift+Q on Mac) for toggling QA panel

import { useEffect } from 'react';

interface UseQAShortcutOptions {
  onToggle: () => void;
  enabled?: boolean;
}

/**
 * Hook to listen for Ctrl+Shift+Q (Cmd+Shift+Q on Mac) keyboard shortcut
 *
 * @param onToggle - Callback to execute when shortcut is pressed
 * @param enabled - Whether the shortcut is enabled (default: true)
 */
export function useQAShortcut({ onToggle, enabled = true }: UseQAShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+Q (Windows/Linux) or Cmd+Shift+Q (Mac)
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isQ = e.key === 'Q' || e.key === 'q';

      if (isCtrlOrCmd && isShift && isQ) {
        e.preventDefault(); // Prevent any browser default
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggle, enabled]);
}
