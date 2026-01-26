// POLI - QA Context Provider
// Zero dependencies beyond React, works in any React app

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  QAState,
  TestChecklist,
  TestItem,
  BugReport,
  TestSession,
} from '../types';
import { loadQAState, saveQAState } from '../services/qaStorage';
import { useQAShortcut } from '../hooks/useQAShortcut';

interface QAContextValue {
  // State
  state: QAState;
  currentScreen: string | null;

  // Panel control
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Screen detection
  setCurrentScreen: (screen: string | null) => void;

  // Test management
  updateTestStatus: (testId: string, status: TestItem['status'], notes?: string) => void;
  addTestItem: (item: TestItem) => void;
  removeTestItem: (testId: string) => void;

  // Bug reporting
  reportBug: (bug: Omit<BugReport, 'id' | 'reportedAt'>) => void;
  updateBugStatus: (bugId: string, status: BugReport['status']) => void;
  deleteBug: (bugId: string) => void;

  // Test sessions
  startTestSession: (name: string, tester: string) => void;
  completeTestSession: (notes?: string) => void;
  deleteSession: (sessionId: string) => void;

  // Report generation
  generateMarkdownReport: () => string;

  // State management
  resetState: () => void;
  exportState: () => void;
}

const QAContext = createContext<QAContextValue | null>(null);

interface QAProviderProps {
  children: React.ReactNode;
  defaultChecklists?: TestChecklist[];
  storageKey?: string;
  enableScreenDetection?: boolean;
  testerName?: string;
}

const DEFAULT_STATE: QAState = {
  isOpen: false,
  currentSession: null,
  testSessions: [],
  checklists: [],
  bugs: [],
};

// Generate a fingerprint of checklists to detect changes
function generateChecklistFingerprint(checklists: TestChecklist[]): string {
  const ids = checklists
    .flatMap(c => c.items.map(i => i.id))
    .sort()
    .join(',');
  return ids;
}

// Merge saved state with new default checklists, preserving test results
function mergeChecklists(
  savedChecklists: TestChecklist[],
  defaultChecklists: TestChecklist[]
): TestChecklist[] {
  // Build a map of saved test results by ID
  const savedResults = new Map<string, { status: TestItem['status']; notes?: string; testedAt?: number }>();
  savedChecklists.forEach(checklist => {
    checklist.items.forEach(item => {
      if (item.status !== 'not_started' || item.notes || item.testedAt) {
        savedResults.set(item.id, {
          status: item.status,
          notes: item.notes,
          testedAt: item.testedAt,
        });
      }
    });
  });

  // Apply saved results to default checklists
  return defaultChecklists.map(checklist => ({
    ...checklist,
    items: checklist.items.map(item => {
      const saved = savedResults.get(item.id);
      if (saved) {
        return { ...item, ...saved };
      }
      return item;
    }),
  }));
}

// Try to detect current screen from URL
function detectScreenFromURL(checklists: TestChecklist[]): string | null {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase().replace('#', '');
  const searchPath = hash || path;

  // Try to match screen names to URL
  for (const checklist of checklists) {
    const screenLower = checklist.screen.toLowerCase().replace(/_/g, '-');
    if (searchPath.includes(screenLower) || searchPath.includes(checklist.screen.toLowerCase())) {
      return checklist.screen;
    }
  }

  // Default to first screen or HOME if on root
  if (searchPath === '/' || searchPath === '') {
    const homeScreen = checklists.find(c =>
      c.screen === 'HOME' || c.screen === 'DASHBOARD' || c.screen === 'MAIN'
    );
    return homeScreen?.screen || checklists[0]?.screen || null;
  }

  return null;
}

export function QAProvider({
  children,
  defaultChecklists = [],
  storageKey = 'poli_qa_state',
  enableScreenDetection = true,
}: QAProviderProps) {
  // Load initial state, merging saved state with default checklists
  const [state, setState] = useState<QAState>(() => {
    const loaded = loadQAState(storageKey);
    const fingerprintKey = `${storageKey}_fingerprint`;
    const savedFingerprint = typeof window !== 'undefined'
      ? localStorage.getItem(fingerprintKey)
      : null;
    const newFingerprint = generateChecklistFingerprint(defaultChecklists);

    // Save the new fingerprint
    if (typeof window !== 'undefined') {
      localStorage.setItem(fingerprintKey, newFingerprint);
    }

    if (loaded && loaded.checklists.length > 0) {
      // If checklists changed, merge them (preserving test results)
      if (savedFingerprint !== newFingerprint) {
        const mergedChecklists = mergeChecklists(loaded.checklists, defaultChecklists);
        return { ...loaded, checklists: mergedChecklists, isOpen: false };
      }
      return { ...loaded, isOpen: false };
    }

    return { ...DEFAULT_STATE, checklists: defaultChecklists };
  });

  // Auto-detect screen from URL
  const [currentScreen, setCurrentScreenState] = useState<string | null>(() => {
    if (enableScreenDetection) {
      return detectScreenFromURL(defaultChecklists);
    }
    return null;
  });

  // Wrapper to allow manual override
  const setCurrentScreen = useCallback((screen: string | null) => {
    setCurrentScreenState(screen);
  }, []);

  // Listen for URL changes to auto-detect screen
  useEffect(() => {
    if (!enableScreenDetection) return;

    const handleURLChange = () => {
      const detected = detectScreenFromURL(state.checklists);
      if (detected) {
        setCurrentScreenState(detected);
      }
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleURLChange);

    // Listen for hashchange
    window.addEventListener('hashchange', handleURLChange);

    return () => {
      window.removeEventListener('popstate', handleURLChange);
      window.removeEventListener('hashchange', handleURLChange);
    };
  }, [enableScreenDetection, state.checklists]);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    saveQAState(state, storageKey);
  }, [state, storageKey]);

  // Panel control
  const togglePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const openPanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Keyboard shortcut (Ctrl+Shift+Q)
  useQAShortcut({ onToggle: togglePanel, enabled: true });

  // Test management
  const updateTestStatus = useCallback(
    (testId: string, status: TestItem['status'], notes?: string) => {
      setState((prev) => {
        const updatedChecklists = prev.checklists.map((checklist) => ({
          ...checklist,
          items: checklist.items.map((item) =>
            item.id === testId
              ? { ...item, status, notes, testedAt: Date.now() }
              : item
          ),
        }));

        // Update current session stats
        let updatedSession = prev.currentSession;
        if (updatedSession) {
          const allTests = updatedChecklists.flatMap((c) => c.items);
          updatedSession = {
            ...updatedSession,
            totalTests: allTests.length,
            passedTests: allTests.filter((t) => t.status === 'passed').length,
            failedTests: allTests.filter((t) => t.status === 'failed').length,
            skippedTests: allTests.filter((t) => t.status === 'skipped').length,
          };
        }

        return {
          ...prev,
          checklists: updatedChecklists,
          currentSession: updatedSession,
        };
      });
    },
    []
  );

  const addTestItem = useCallback((item: TestItem) => {
    setState((prev) => {
      const existingChecklist = prev.checklists.find((c) => c.screen === item.screen);

      if (existingChecklist) {
        return {
          ...prev,
          checklists: prev.checklists.map((c) =>
            c.screen === item.screen
              ? { ...c, items: [...c.items, item] }
              : c
          ),
        };
      } else {
        return {
          ...prev,
          checklists: [...prev.checklists, { screen: item.screen, items: [item] }],
        };
      }
    });
  }, []);

  const removeTestItem = useCallback((testId: string) => {
    setState((prev) => ({
      ...prev,
      checklists: prev.checklists.map((c) => ({
        ...c,
        items: c.items.filter((item) => item.id !== testId),
      })),
    }));
  }, []);

  // Bug reporting
  const reportBug = useCallback(
    (bug: Omit<BugReport, 'id' | 'reportedAt'>) => {
      const newBug: BugReport = {
        ...bug,
        id: `bug_${Date.now()}`,
        reportedAt: Date.now(),
      };

      setState((prev) => {
        const updatedBugs = [...prev.bugs, newBug];

        // Add bug ID to current session
        let updatedSession = prev.currentSession;
        if (updatedSession) {
          updatedSession = {
            ...updatedSession,
            bugsFound: [...updatedSession.bugsFound, newBug.id],
          };
        }

        return {
          ...prev,
          bugs: updatedBugs,
          currentSession: updatedSession,
        };
      });
    },
    []
  );

  const updateBugStatus = useCallback((bugId: string, status: BugReport['status']) => {
    setState((prev) => ({
      ...prev,
      bugs: prev.bugs.map((bug) =>
        bug.id === bugId
          ? {
              ...bug,
              status,
              fixedAt: status === 'fixed' ? Date.now() : bug.fixedAt,
            }
          : bug
      ),
    }));
  }, []);

  const deleteBug = useCallback((bugId: string) => {
    setState((prev) => ({
      ...prev,
      bugs: prev.bugs.filter((bug) => bug.id !== bugId),
      currentSession: prev.currentSession
        ? {
            ...prev.currentSession,
            bugsFound: prev.currentSession.bugsFound.filter((id) => id !== bugId),
          }
        : null,
    }));
  }, []);

  // Test sessions
  const startTestSession = useCallback(
    (name: string, tester: string) => {
      setState((prev) => {
        // Reset all test statuses to 'not_started'
        const resetChecklists = prev.checklists.map((checklist) => ({
          ...checklist,
          items: checklist.items.map((item) => ({
            ...item,
            status: 'not_started' as const,
            notes: undefined,
            testedAt: undefined,
          })),
        }));

        const allTests = resetChecklists.flatMap((c) => c.items);

        const newSession: TestSession = {
          id: `session_${Date.now()}`,
          name,
          tester,
          startedAt: Date.now(),
          totalTests: allTests.length,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          bugsFound: [],
        };

        return {
          ...prev,
          checklists: resetChecklists,
          currentSession: newSession,
        };
      });
    },
    []
  );

  const completeTestSession = useCallback((notes?: string) => {
    setState((prev) => {
      if (!prev.currentSession) return prev;

      const completedSession: TestSession = {
        ...prev.currentSession,
        completedAt: Date.now(),
        notes,
      };

      return {
        ...prev,
        currentSession: null,
        testSessions: [...prev.testSessions, completedSession],
      };
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setState((prev) => ({
      ...prev,
      testSessions: prev.testSessions.filter((session) => session.id !== sessionId),
    }));
  }, []);

  // Report generation
  const generateMarkdownReport = useCallback(() => {
    const { currentSession, checklists, bugs } = state;

    if (!currentSession) {
      return '# POLI Test Report\n\nNo active test session.';
    }

    const sessionBugs = bugs.filter((b) => currentSession.bugsFound.includes(b.id));

    let report = `# POLI Test Report\n\n`;
    report += `**Session**: ${currentSession.name}\n`;
    report += `**Tester**: ${currentSession.tester}\n`;
    report += `**Started**: ${new Date(currentSession.startedAt).toLocaleString()}\n`;
    report += `**Completed**: ${currentSession.completedAt ? new Date(currentSession.completedAt).toLocaleString() : 'In Progress'}\n\n`;

    report += `## Summary\n\n`;
    report += `- Total Tests: ${currentSession.totalTests}\n`;
    report += `- ✅ Passed: ${currentSession.passedTests}\n`;
    report += `- ❌ Failed: ${currentSession.failedTests}\n`;
    report += `- ⏭️ Skipped: ${currentSession.skippedTests}\n`;
    report += `- 🐛 Bugs Found: ${sessionBugs.length}\n\n`;

    // Test results by screen
    report += `## Test Results by Screen\n\n`;
    checklists.forEach((checklist) => {
      report += `### ${checklist.screen}\n\n`;
      checklist.items.forEach((item) => {
        const statusIcon =
          item.status === 'passed'
            ? '✅'
            : item.status === 'failed'
            ? '❌'
            : item.status === 'skipped'
            ? '⏭️'
            : '⬜';
        report += `${statusIcon} **${item.description}** (${item.category})\n`;
        if (item.notes) {
          report += `   - Notes: ${item.notes}\n`;
        }
      });
      report += `\n`;
    });

    // Bugs found
    if (sessionBugs.length > 0) {
      report += `## Bugs Found\n\n`;
      sessionBugs.forEach((bug, index) => {
        report += `### ${index + 1}. ${bug.title} (${bug.severity.toUpperCase()})\n\n`;
        report += `**Screen**: ${bug.screen}\n`;
        report += `**Status**: ${bug.status}\n`;
        report += `**Description**: ${bug.description}\n\n`;
        report += `**Expected**: ${bug.expectedBehavior}\n`;
        report += `**Actual**: ${bug.actualBehavior}\n\n`;
        if (bug.stepsToReproduce.length > 0) {
          report += `**Steps to Reproduce**:\n`;
          bug.stepsToReproduce.forEach((step, i) => {
            report += `${i + 1}. ${step}\n`;
          });
          report += `\n`;
        }
      });
    }

    if (currentSession.notes) {
      report += `## Session Notes\n\n${currentSession.notes}\n`;
    }

    return report;
  }, [state]);

  // State management
  const resetState = useCallback(() => {
    setState({ ...DEFAULT_STATE, checklists: defaultChecklists });
  }, [defaultChecklists]);

  const exportState = useCallback(() => {
    const report = generateMarkdownReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `poli_report_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [generateMarkdownReport]);

  const value: QAContextValue = {
    state,
    currentScreen: enableScreenDetection ? currentScreen : null,
    isOpen: state.isOpen,
    togglePanel,
    openPanel,
    closePanel,
    setCurrentScreen,
    updateTestStatus,
    addTestItem,
    removeTestItem,
    reportBug,
    updateBugStatus,
    deleteBug,
    startTestSession,
    completeTestSession,
    deleteSession,
    generateMarkdownReport,
    resetState,
    exportState,
  };

  return <QAContext.Provider value={value}>{children}</QAContext.Provider>;
}

/**
 * Hook to access QA context
 */
export function useQA(): QAContextValue {
  const context = useContext(QAContext);
  if (!context) {
    throw new Error('useQA must be used within QAProvider');
  }
  return context;
}
