/**
 * POLI CLI - Router Configuration Parser
 *
 * Parses React Router configurations to extract route definitions.
 * Supports: createBrowserRouter, <Routes>/<Route> JSX syntax
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ParsedRoute {
  path: string;
  componentName: string;
  filePath?: string;
  children?: ParsedRoute[];
}

export interface RouterParserResult {
  type: 'createBrowserRouter' | 'Routes' | 'file-pattern' | 'none';
  routes: ParsedRoute[];
  configFile?: string;
}

// Common files where router configurations are defined
const ROUTER_FILE_PATTERNS = [
  'src/router.tsx',
  'src/router.ts',
  'src/routes.tsx',
  'src/routes.ts',
  'src/App.tsx',
  'src/App.jsx',
  'src/app/routes.tsx',
  'src/app/router.tsx',
  'app/routes.tsx',
  'app/router.tsx',
  'src/main.tsx',
  'src/index.tsx',
];

/**
 * Parse createBrowserRouter([...]) or createHashRouter([...]) syntax
 */
function parseCreateBrowserRouter(content: string): ParsedRoute[] {
  const routes: ParsedRoute[] = [];

  // Match createBrowserRouter([...]) or createHashRouter([...])
  const routerMatch = content.match(/create(?:Browser|Hash|Memory)Router\s*\(\s*\[([^]*?)\]\s*(?:,|\))/);
  if (!routerMatch) return routes;

  const routerContent = routerMatch[1];

  // Extract route objects with various patterns
  // Pattern 1: { path: "...", element: <Component /> }
  const routeRegex1 = /\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*element:\s*<(\w+)/g;
  let match;
  while ((match = routeRegex1.exec(routerContent)) !== null) {
    routes.push({
      path: match[1],
      componentName: match[2],
    });
  }

  // Pattern 2: { element: <Component />, path: "..." } (reversed order)
  const routeRegex2 = /\{\s*element:\s*<(\w+)[^>]*>\s*,\s*path:\s*['"]([^'"]+)['"]/g;
  while ((match = routeRegex2.exec(routerContent)) !== null) {
    routes.push({
      path: match[2],
      componentName: match[1],
    });
  }

  // Pattern 3: { path: "...", Component: ComponentName }
  const routeRegex3 = /\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*Component:\s*(\w+)/g;
  while ((match = routeRegex3.exec(routerContent)) !== null) {
    routes.push({
      path: match[1],
      componentName: match[2],
    });
  }

  return routes;
}

/**
 * Parse <Routes>/<Route> JSX syntax
 */
function parseRoutesJSX(content: string): ParsedRoute[] {
  const routes: ParsedRoute[] = [];

  // Pattern 1: <Route path="..." element={<Component />} />
  const routeRegex1 = /<Route\s+[^>]*path\s*=\s*['"]([^'"]+)['"][^>]*element\s*=\s*\{?\s*<(\w+)/g;
  let match;
  while ((match = routeRegex1.exec(content)) !== null) {
    routes.push({
      path: match[1],
      componentName: match[2],
    });
  }

  // Pattern 2: <Route element={<Component />} path="..." /> (reversed)
  const routeRegex2 = /<Route\s+[^>]*element\s*=\s*\{?\s*<(\w+)[^>]*path\s*=\s*['"]([^'"]+)['"]/g;
  while ((match = routeRegex2.exec(content)) !== null) {
    routes.push({
      path: match[2],
      componentName: match[1],
    });
  }

  // Pattern 3: <Route path="..." component={Component} />
  const routeRegex3 = /<Route\s+[^>]*path\s*=\s*['"]([^'"]+)['"][^>]*component\s*=\s*\{?\s*(\w+)/g;
  while ((match = routeRegex3.exec(content)) !== null) {
    routes.push({
      path: match[1],
      componentName: match[2],
    });
  }

  return routes;
}

/**
 * Parse Next.js style pages directory structure
 */
function parseNextJsPages(projectRoot: string): ParsedRoute[] {
  const routes: ParsedRoute[] = [];
  const pagesDir = path.join(projectRoot, 'pages');
  const appDir = path.join(projectRoot, 'app');

  // Check for pages directory (Next.js pages router)
  if (fs.existsSync(pagesDir)) {
    scanNextJsDirectory(pagesDir, '', routes);
  }

  // Check for app directory (Next.js app router)
  if (fs.existsSync(appDir)) {
    scanNextJsAppDirectory(appDir, '', routes);
  }

  return routes;
}

function scanNextJsDirectory(dir: string, basePath: string, routes: ParsedRoute[]): void {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip special directories
        if (!item.startsWith('_') && !item.startsWith('.') && item !== 'api') {
          scanNextJsDirectory(fullPath, `${basePath}/${item}`, routes);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        const name = path.basename(item, ext);

        if (['.tsx', '.jsx', '.ts', '.js'].includes(ext) && !name.startsWith('_')) {
          let routePath = basePath;
          if (name === 'index') {
            routePath = basePath || '/';
          } else if (name.startsWith('[') && name.endsWith(']')) {
            // Dynamic route: [id].tsx -> /:id
            routePath = `${basePath}/:${name.slice(1, -1)}`;
          } else {
            routePath = `${basePath}/${name}`;
          }

          routes.push({
            path: routePath || '/',
            componentName: name === 'index' ? 'Index' : toPascalCase(name),
            filePath: fullPath,
          });
        }
      }
    }
  } catch (err) {
    // Directory not readable
  }
}

function scanNextJsAppDirectory(dir: string, basePath: string, routes: ParsedRoute[]): void {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Check for page.tsx in this directory
        const pageFile = ['page.tsx', 'page.jsx', 'page.ts', 'page.js']
          .map(f => path.join(fullPath, f))
          .find(f => fs.existsSync(f));

        if (pageFile) {
          let routePath = basePath;
          if (item.startsWith('[') && item.endsWith(']')) {
            routePath = `${basePath}/:${item.slice(1, -1)}`;
          } else if (item.startsWith('(') && item.endsWith(')')) {
            // Route group - don't add to path
            routePath = basePath;
          } else {
            routePath = `${basePath}/${item}`;
          }

          routes.push({
            path: routePath || '/',
            componentName: toPascalCase(item.replace(/[[\]()]/g, '')),
            filePath: pageFile,
          });
        }

        // Continue scanning subdirectories
        if (!item.startsWith('_') && !item.startsWith('.')) {
          const subPath = item.startsWith('(') && item.endsWith(')') ? basePath : `${basePath}/${item}`;
          scanNextJsAppDirectory(fullPath, subPath, routes);
        }
      }
    }
  } catch (err) {
    // Directory not readable
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/**
 * Convert route path to screen name
 * /dashboard -> DASHBOARD
 * /user-profile -> USER_PROFILE
 * /users/:id -> USERS_DETAIL
 */
export function routePathToScreenName(routePath: string): string {
  let name = routePath
    .replace(/^\//, '')           // Remove leading slash
    .replace(/\/:[\w]+/g, '')     // Remove dynamic segments
    .replace(/\//g, '_')          // Replace slashes with underscores
    .replace(/-/g, '_')           // Replace hyphens with underscores
    .toUpperCase();

  // Handle empty path (home/root)
  if (!name) {
    return 'HOME';
  }

  // Handle dynamic routes
  if (routePath.includes(':')) {
    name = name + '_DETAIL';
  }

  return name;
}

/**
 * Main function to detect routes from a project
 */
export function detectRoutes(projectRoot: string): RouterParserResult {
  // Try to find and parse router configuration files
  for (const pattern of ROUTER_FILE_PATTERNS) {
    const filePath = path.join(projectRoot, pattern);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Try createBrowserRouter syntax
        const browserRoutes = parseCreateBrowserRouter(content);
        if (browserRoutes.length > 0) {
          return {
            type: 'createBrowserRouter',
            routes: browserRoutes,
            configFile: pattern,
          };
        }

        // Try <Routes>/<Route> JSX syntax
        const jsxRoutes = parseRoutesJSX(content);
        if (jsxRoutes.length > 0) {
          return {
            type: 'Routes',
            routes: jsxRoutes,
            configFile: pattern,
          };
        }
      } catch (err) {
        // File not readable, continue
      }
    }
  }

  // Try Next.js style routing
  const nextRoutes = parseNextJsPages(projectRoot);
  if (nextRoutes.length > 0) {
    return {
      type: 'file-pattern',
      routes: nextRoutes,
      configFile: 'pages/ or app/',
    };
  }

  return {
    type: 'none',
    routes: [],
  };
}
