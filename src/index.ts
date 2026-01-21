// POLI - Portable Overlay for Live Inspection
// A QA testing overlay for React apps

// Main components
export { QAProvider, useQA } from './components/QAContext';
export { QAPanel } from './components/QAPanel';
export { PoliLogo } from './components/PoliLogo';

// Hooks
export { useQAShortcut } from './hooks/useQAShortcut';

// Storage utilities
export {
  loadQAState,
  saveQAState,
  clearQAState,
  exportQAState,
  importQAState,
} from './services/qaStorage';

// Types
export type {
  TestStatus,
  BugSeverity,
  BugStatus,
  TestItem,
  BugReport,
  TestSession,
  TestChecklist,
  QAState,
} from './types';
