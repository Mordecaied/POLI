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

export function QAProvider({
  children,
  defaultChecklists = [],
  storageKey = 'poli_qa_state',
  enableScreenDetection = true,
}: QAProviderProps) {
  // Load initial state from localStorage or use default
  const [state, setState] = useState<QAState>(() => {
    const loaded = loadQAState(storageKey);
    if (loaded) {
      return { ...loaded, isOpen: false }; // Always start closed
    }
    return { ...DEFAULT_STATE, checklists: defaultChecklists };
  });

  const [currentScreen, setCurrentScreen] = useState<string | null>(null);

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
