// POLI QA System Type Definitions

export type TestStatus = 'not_started' | 'passed' | 'failed' | 'skipped';
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugStatus = 'open' | 'in_progress' | 'fixed' | 'wont_fix';

export interface TestItem {
  id: string;
  screen: string;
  category: 'UI' | 'Functionality' | 'Performance' | 'Integration';
  description: string;
  status: TestStatus;
  notes?: string;
  testedAt?: number;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  screen: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  screenshot?: string;
  consoleErrors?: string;
  sessionMetadata?: Record<string, unknown>;
  reportedAt: number;
  reportedBy: string;
  fixedAt?: number;
  fixedIn?: string;
}

export interface TestSession {
  id: string;
  name: string;
  startedAt: number;
  completedAt?: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  bugsFound: string[];
  notes?: string;
  tester: string;
}

export interface TestChecklist {
  screen: string;
  items: TestItem[];
}

export interface QAState {
  isOpen: boolean;
  currentSession: TestSession | null;
  testSessions: TestSession[];
  checklists: TestChecklist[];
  bugs: BugReport[];
}
