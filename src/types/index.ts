// POLI QA System Type Definitions

// Generic screen type - users define their own screens
export type TestStatus = 'not_started' | 'passed' | 'failed' | 'skipped';
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugStatus = 'open' | 'in_progress' | 'fixed' | 'wont_fix';

export interface TestItem<TScreen extends string = string> {
  id: string;
  screen: TScreen;
  category: 'UI' | 'Functionality' | 'Performance' | 'Integration';
  description: string;
  status: TestStatus;
  notes?: string;
  testedAt?: number;
}

export interface BugReport<TScreen extends string = string> {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  screen: TScreen;
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

export interface TestChecklist<TScreen extends string = string> {
  screen: TScreen;
  items: TestItem<TScreen>[];
}

export interface QAState<TScreen extends string = string> {
  isOpen: boolean;
  currentSession: TestSession | null;
  testSessions: TestSession[];
  checklists: TestChecklist<TScreen>[];
  bugs: BugReport<TScreen>[];
}

// Helper type to extract screen names from checklists
export type ExtractScreens<T extends TestChecklist<string>[]> = T[number]['screen'];
