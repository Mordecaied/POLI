#!/usr/bin/env node

/**
 * POLI CLI - Auto-detect screens and generate test checklists
 *
 * Usage:
 *   npx poli-qa init          # Scan project and generate checklists
 *   npx poli-qa scan          # Re-scan and show detected screens
 *   npx poli-qa add <screen>  # Add a new screen manually
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectRoutes, routePathToScreenName } from './routerParser';
import { analyzeComponent, generateSpecificTests } from './jsxParser';

const CHECKLIST_FILENAME = 'poli.checklists.ts';

interface DetectedScreen {
  name: string;
  filePath: string;
  suggestedTests: string[];
}

// Common patterns that indicate a screen/page component
const SCREEN_PATTERNS = [
  /Page\.(tsx|jsx)$/,
  /Screen\.(tsx|jsx)$/,
  /View\.(tsx|jsx)$/,
  /pages\/.*\.(tsx|jsx)$/,
  /screens\/.*\.(tsx|jsx)$/,
  /views\/.*\.(tsx|jsx)$/,
  /routes\/.*\.(tsx|jsx)$/,
  /components\/.*Page\.(tsx|jsx)$/,
  /components\/.*Calculator\.(tsx|jsx)$/,
  /components\/.*Calendar\.(tsx|jsx)$/,
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.stories\./,
  /index\.(tsx|jsx)$/,
  /__tests__/,
];

// Keywords that suggest certain test categories
const TEST_SUGGESTIONS: Record<string, { pattern: RegExp; tests: string[] }[]> = {
  form: [
    { pattern: /form|input|submit/i, tests: ['Form validation works correctly', 'Submit button is enabled/disabled appropriately', 'Error messages display for invalid input'] },
  ],
  auth: [
    { pattern: /login|signin|auth/i, tests: ['Login form accepts credentials', 'Shows error for invalid credentials', 'Redirects after successful login'] },
    { pattern: /signup|register/i, tests: ['Registration form validates all fields', 'Password requirements are enforced', 'Success message shown after registration'] },
  ],
  list: [
    { pattern: /list|table|grid/i, tests: ['Data loads and displays correctly', 'Pagination works (if applicable)', 'Empty state shows when no data'] },
  ],
  detail: [
    { pattern: /detail|view|profile/i, tests: ['Details load correctly', 'Edit button is visible (if applicable)', 'Back navigation works'] },
  ],
  settings: [
    { pattern: /setting|config|preference/i, tests: ['Settings load with current values', 'Changes can be saved', 'Cancel reverts changes'] },
  ],
  dashboard: [
    { pattern: /dashboard|home|overview/i, tests: ['Dashboard loads with data', 'Charts/widgets display correctly', 'Refresh updates data'] },
  ],
};

function getAllFiles(dir: string, files: string[] = []): string[] {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(p => p.test(fullPath))) {
        continue;
      }

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        getAllFiles(fullPath, files);
      } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx'))) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory doesn't exist or not readable
  }

  return files;
}

function extractComponentName(filePath: string): string {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  // Remove common suffixes FIRST, before converting to snake_case
  const nameWithoutSuffix = basename.replace(/Page$|Screen$|View$|Calculator$|Calendar$/i, '');
  // Then convert to UPPER_SNAKE_CASE for screen name
  return nameWithoutSuffix
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/-/g, '_');
}

function suggestTestsForComponent(filePath: string, content: string): string[] {
  const componentName = extractComponentName(filePath);

  // Use JSX parser to analyze actual component content
  const analysis = analyzeComponent(content);

  // Generate specific tests based on actual UI elements found
  const specificTests = generateSpecificTests(componentName, analysis);

  // If no specific elements found, fall back to pattern-based tests
  if (specificTests.length <= 1) {
    return suggestTestsFromPatterns(filePath, content);
  }

  return specificTests;
}

// Fallback: Pattern-based test suggestions (used when JSX parsing finds nothing specific)
function suggestTestsFromPatterns(filePath: string, content: string): string[] {
  const tests: string[] = [];
  const basename = path.basename(filePath).toLowerCase();
  const contentLower = content.toLowerCase();

  // Always add basic UI test
  tests.push('Screen loads without errors');

  // Check content for patterns
  for (const [, patterns] of Object.entries(TEST_SUGGESTIONS)) {
    for (const { pattern, tests: suggestedTests } of patterns) {
      if (pattern.test(basename) || pattern.test(contentLower)) {
        tests.push(...suggestedTests);
        break; // Only add tests from first matching pattern per category
      }
    }
  }

  // Check for specific elements in content
  if (contentLower.includes('button') || contentLower.includes('onclick')) {
    tests.push('All buttons are clickable and functional');
  }
  if (contentLower.includes('fetch') || contentLower.includes('usequery') || contentLower.includes('axios')) {
    tests.push('Data fetches successfully');
    tests.push('Loading state displays while fetching');
    tests.push('Error state handles fetch failures');
  }
  if (contentLower.includes('modal') || contentLower.includes('dialog')) {
    tests.push('Modal opens and closes correctly');
  }
  if (contentLower.includes('navigation') || contentLower.includes('link') || contentLower.includes('router')) {
    tests.push('Navigation links work correctly');
  }

  // Remove duplicates
  return [...new Set(tests)];
}

function detectScreens(projectRoot: string): DetectedScreen[] {
  const screens: DetectedScreen[] = [];
  const seenScreenNames = new Set<string>();

  // STEP 1: Try to detect routes from router configuration
  const routerResult = detectRoutes(projectRoot);

  if (routerResult.type !== 'none' && routerResult.routes.length > 0) {
    console.log(`  📍 Found router config in ${routerResult.configFile} (${routerResult.type})`);

    for (const route of routerResult.routes) {
      const screenName = routePathToScreenName(route.path);

      if (!seenScreenNames.has(screenName)) {
        seenScreenNames.add(screenName);

        // Try to find and analyze the component file
        let suggestedTests = ['Screen loads without errors'];
        const componentFile = findComponentFile(projectRoot, route.componentName);

        if (componentFile) {
          const content = fs.readFileSync(componentFile, 'utf-8');
          suggestedTests = suggestTestsForComponent(componentFile, content);
        }

        screens.push({
          name: screenName,
          filePath: route.filePath || componentFile || route.componentName,
          suggestedTests,
        });
      }
    }
  }

  // STEP 2: Also scan for additional screens using file patterns
  const srcDir = path.join(projectRoot, 'src');
  const searchDir = fs.existsSync(srcDir) ? srcDir : projectRoot;
  const allFiles = getAllFiles(searchDir);

  for (const filePath of allFiles) {
    const relativePath = path.relative(projectRoot, filePath);
    // Normalize path separators to forward slashes for regex matching
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // Check if file matches screen patterns
    const isScreen = SCREEN_PATTERNS.some(p => p.test(normalizedPath));

    if (isScreen) {
      const name = extractComponentName(filePath);

      // Skip if already detected from router
      if (seenScreenNames.has(name)) {
        continue;
      }
      seenScreenNames.add(name);

      const content = fs.readFileSync(filePath, 'utf-8');
      const suggestedTests = suggestTestsForComponent(filePath, content);

      screens.push({
        name,
        filePath: relativePath,
        suggestedTests,
      });
    }
  }

  return screens;
}

// Helper to find a component file by name
function findComponentFile(projectRoot: string, componentName: string): string | null {
  const srcDir = path.join(projectRoot, 'src');
  const searchDir = fs.existsSync(srcDir) ? srcDir : projectRoot;

  // Common file patterns for a component
  const possiblePaths = [
    `${componentName}.tsx`,
    `${componentName}.jsx`,
    `${componentName}/index.tsx`,
    `${componentName}/index.jsx`,
    `components/${componentName}.tsx`,
    `components/${componentName}.jsx`,
    `pages/${componentName}.tsx`,
    `pages/${componentName}.jsx`,
    `screens/${componentName}.tsx`,
    `screens/${componentName}.jsx`,
    `views/${componentName}.tsx`,
    `views/${componentName}.jsx`,
  ];

  for (const relativePath of possiblePaths) {
    const fullPath = path.join(searchDir, relativePath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Search recursively for the component
  const allFiles = getAllFiles(searchDir);
  for (const file of allFiles) {
    const basename = path.basename(file, path.extname(file));
    if (basename === componentName || basename === `${componentName}Page` || basename === `${componentName}Screen`) {
      return file;
    }
  }

  return null;
}

function generateChecklistFile(screens: DetectedScreen[]): string {
  const screenType = screens.map(s => `  | '${s.name}'`).join('\n');

  const checklists = screens.map(screen => {
    const items = screen.suggestedTests.map((test, i) => {
      const id = `${screen.name.toLowerCase()}_${String(i + 1).padStart(3, '0')}`;
      const category = test.toLowerCase().includes('load') || test.toLowerCase().includes('display')
        ? 'UI'
        : 'Functionality';

      return `      {
        id: '${id}',
        screen: '${screen.name}',
        category: '${category}',
        description: '${test}',
        status: 'not_started',
      },`;
    }).join('\n');

    return `  {
    screen: '${screen.name}',
    // Source: ${screen.filePath}
    items: [
${items}
    ],
  },`;
  }).join('\n');

  return `// POLI Test Checklists - Auto-generated by 'npx poli-qa init'
// Customize these tests for your application

import type { TestChecklist } from 'poli-qa';

// Your app's screen names (auto-detected)
export type AppScreen =
${screenType};

// Test checklists for each screen
export const checklists: TestChecklist<AppScreen>[] = [
${checklists}
];

// Usage in your app:
// import { QAProvider, QAPanel } from 'poli-qa';
// import { checklists } from './poli.checklists';
//
// <QAProvider defaultChecklists={checklists}>
//   <App />
//   <QAPanel />
// </QAProvider>
`;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';
  const projectRoot = process.cwd();

  console.log('🦜 POLI - Portable Overlay for Live Inspection\n');

  switch (command) {
    case 'init': {
      console.log('Scanning project for screens...\n');
      console.log('  🔍 Looking for router configurations...');

      const screens = detectScreens(projectRoot);

      if (screens.length === 0) {
        console.log('\nNo screens detected. POLI looks for:');
        console.log('  1. Router configurations (createBrowserRouter, <Routes>, Next.js pages)');
        console.log('  2. File naming patterns (*Page.tsx, *Screen.tsx, *View.tsx)');
        console.log('  3. Directory conventions (pages/, screens/, views/, routes/)');
        console.log('\nYou can manually create a checklist file or use: npx poli-qa add <ScreenName>');
        return;
      }

      console.log(`Found ${screens.length} screen(s):\n`);
      screens.forEach(s => {
        console.log(`  📱 ${s.name}`);
        console.log(`     File: ${s.filePath}`);
        console.log(`     Tests: ${s.suggestedTests.length} suggested`);
        console.log('');
      });

      const content = generateChecklistFile(screens);
      const outputPath = path.join(projectRoot, 'src', CHECKLIST_FILENAME);

      // Ensure src directory exists
      const srcDir = path.join(projectRoot, 'src');
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, content);

      console.log(`✅ Created ${CHECKLIST_FILENAME} with ${screens.length} screens and ${screens.reduce((acc, s) => acc + s.suggestedTests.length, 0)} tests\n`);
      console.log('Next steps:');
      console.log('  1. Review and customize the generated tests in src/poli.checklists.ts');
      console.log('  2. Import and use in your app:');
      console.log('');
      console.log('     import { QAProvider, QAPanel } from "poli-qa";');
      console.log('     import { checklists } from "./poli.checklists";');
      console.log('');
      console.log('     <QAProvider defaultChecklists={checklists}>');
      console.log('       <App />');
      console.log('       <QAPanel />');
      console.log('     </QAProvider>');
      break;
    }

    case 'scan': {
      console.log('Scanning project for screens...\n');
      console.log('  🔍 Looking for router configurations...');

      const screens = detectScreens(projectRoot);

      if (screens.length === 0) {
        console.log('\nNo screens detected.');
        return;
      }

      console.log(`Found ${screens.length} screen(s):\n`);
      screens.forEach(s => {
        console.log(`  📱 ${s.name}`);
        console.log(`     File: ${s.filePath}`);
        s.suggestedTests.forEach(t => console.log(`     • ${t}`));
        console.log('');
      });
      break;
    }

    case 'add': {
      const screenName = args[1];
      if (!screenName) {
        console.log('Usage: npx poli-qa add <ScreenName>');
        console.log('Example: npx poli-qa add Dashboard');
        return;
      }

      const name = screenName.toUpperCase().replace(/-/g, '_');
      console.log(`Adding screen: ${name}`);
      console.log('TODO: Implement adding to existing checklist file');
      break;
    }

    case 'help':
    default: {
      console.log('Commands:');
      console.log('  npx poli-qa init          Scan project and generate test checklists');
      console.log('  npx poli-qa scan          Show detected screens without generating file');
      console.log('  npx poli-qa add <screen>  Add a new screen to checklists');
      console.log('  npx poli-qa help          Show this help message');
      break;
    }
  }
}

main();
