/**
 * POLI CLI - JSX Parser
 *
 * Extracts UI elements from JSX/TSX files to generate specific test suggestions.
 * Uses regex-based parsing to avoid external dependencies.
 */

export interface ExtractedButton {
  label: string;
  type?: string;
  onClick?: string;
  disabled?: boolean;
}

export interface ExtractedInput {
  name?: string;
  type: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export interface ExtractedSelect {
  name?: string;
  label?: string;
  options: string[];
  multiple?: boolean;
}

export interface ExtractedLink {
  to: string;
  text: string;
}

export interface ExtractedModal {
  name?: string;
  trigger?: string;
}

export interface ExtractedForm {
  id?: string;
  onSubmit?: string;
  fields: string[];
}

export interface ComponentAnalysis {
  buttons: ExtractedButton[];
  inputs: ExtractedInput[];
  selects: ExtractedSelect[];
  links: ExtractedLink[];
  modals: ExtractedModal[];
  forms: ExtractedForm[];
  tables: boolean;
  pagination: boolean;
  search: boolean;
  dataFetching: boolean;
  loadingState: boolean;
  errorState: boolean;
  emptyState: boolean;
}

/**
 * Parse JSX props string into key-value pairs
 */
function parseProps(propsString: string): Record<string, string> {
  const props: Record<string, string> = {};

  // Match prop="value" or prop='value'
  const stringPropRegex = /(\w+)\s*=\s*["']([^"']+)["']/g;
  let match;
  while ((match = stringPropRegex.exec(propsString)) !== null) {
    props[match[1]] = match[2];
  }

  // Match prop={value} or prop={...}
  const exprPropRegex = /(\w+)\s*=\s*\{([^}]+)\}/g;
  while ((match = exprPropRegex.exec(propsString)) !== null) {
    props[match[1]] = match[2].trim();
  }

  // Match boolean props (just the prop name without value)
  const boolPropRegex = /\s(\w+)(?=\s|\/?>|$)(?!\s*=)/g;
  while ((match = boolPropRegex.exec(' ' + propsString)) !== null) {
    props[match[1]] = 'true';
  }

  return props;
}

/**
 * Extract text content from JSX children (handles simple cases)
 */
function extractTextContent(jsxContent: string): string {
  // Remove nested tags and get text
  const text = jsxContent
    .replace(/<[^>]+>/g, ' ')  // Remove all tags
    .replace(/\{[^}]+\}/g, '') // Remove expressions
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
  return text;
}

/**
 * Extract buttons from JSX content
 */
export function extractButtons(content: string): ExtractedButton[] {
  const buttons: ExtractedButton[] = [];
  const seen = new Set<string>();

  // Pattern 1: <button ...>Label</button>
  const buttonRegex = /<button([^>]*)>([^]*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const label = extractTextContent(match[2]) || props.children || props.title || '';

    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      buttons.push({
        label,
        type: props.type,
        onClick: props.onClick,
        disabled: props.disabled === 'true' || props.disabled === 'disabled',
      });
    }
  }

  // Pattern 2: <Button ...>Label</Button> (common component pattern)
  const ButtonRegex = /<Button([^>]*)>([^]*?)<\/Button>/gi;
  while ((match = ButtonRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const label = extractTextContent(match[2]) || props.children || props.title || props.label || '';

    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      buttons.push({
        label,
        type: props.type || props.variant,
        onClick: props.onClick,
        disabled: props.disabled === 'true',
      });
    }
  }

  // Pattern 3: <IconButton>, <Btn>, etc with aria-label or title
  const iconButtonRegex = /<(?:IconButton|Btn|ActionButton)([^>]*)(?:\/>|>[^]*?<\/\w+>)/gi;
  while ((match = iconButtonRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const label = props['aria-label'] || props.title || props.label || '';

    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      buttons.push({
        label,
        onClick: props.onClick,
      });
    }
  }

  return buttons;
}

/**
 * Extract input fields from JSX content
 */
export function extractInputs(content: string): ExtractedInput[] {
  const inputs: ExtractedInput[] = [];
  const seen = new Set<string>();

  // Pattern 1: <input ... />
  const inputRegex = /<input([^>]*)\/?>/gi;
  let match;
  while ((match = inputRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const key = props.name || props.id || props.placeholder || props.type || 'input';

    if (!seen.has(key)) {
      seen.add(key);
      inputs.push({
        name: props.name || props.id,
        type: props.type || 'text',
        placeholder: props.placeholder,
        required: props.required === 'true' || props.required === 'required',
      });
    }
  }

  // Pattern 2: <Input ... /> (component pattern)
  const InputRegex = /<(?:Input|TextField|TextInput)([^>]*)\/?>/gi;
  while ((match = InputRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const key = props.name || props.id || props.placeholder || props.label || 'input';

    if (!seen.has(key)) {
      seen.add(key);
      inputs.push({
        name: props.name || props.id,
        type: props.type || 'text',
        placeholder: props.placeholder,
        label: props.label,
        required: props.required === 'true',
      });
    }
  }

  // Pattern 3: <textarea ... />
  const textareaRegex = /<textarea([^>]*)(?:\/?>[^]*?(?:<\/textarea>)?)/gi;
  while ((match = textareaRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const key = props.name || props.id || props.placeholder || 'textarea';

    if (!seen.has(key)) {
      seen.add(key);
      inputs.push({
        name: props.name || props.id,
        type: 'textarea',
        placeholder: props.placeholder,
        required: props.required === 'true',
      });
    }
  }

  return inputs;
}

/**
 * Extract select/dropdown elements
 */
export function extractSelects(content: string): ExtractedSelect[] {
  const selects: ExtractedSelect[] = [];

  // Pattern: <select ...>...</select>
  const selectRegex = /<select([^>]*)>([^]*?)<\/select>/gi;
  let match;
  while ((match = selectRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const optionsContent = match[2];

    // Extract option values
    const options: string[] = [];
    const optionRegex = /<option[^>]*>([^<]*)<\/option>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(optionsContent)) !== null) {
      if (optMatch[1].trim()) {
        options.push(optMatch[1].trim());
      }
    }

    selects.push({
      name: props.name || props.id,
      options,
      multiple: props.multiple === 'true',
    });
  }

  // Pattern: <Select ...>...</Select> (component pattern)
  const SelectRegex = /<Select([^>]*)(?:\/?>)/gi;
  while ((match = SelectRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    selects.push({
      name: props.name || props.id,
      label: props.label,
      options: [],
      multiple: props.multiple === 'true',
    });
  }

  return selects;
}

/**
 * Extract links/navigation elements
 */
export function extractLinks(content: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  // Pattern 1: <Link to="...">Text</Link>
  const linkRegex = /<Link([^>]*)>([^]*?)<\/Link>/gi;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const to = props.to || props.href || '';
    const text = extractTextContent(match[2]);

    if (to && !seen.has(to)) {
      seen.add(to);
      links.push({ to, text });
    }
  }

  // Pattern 2: <NavLink to="...">Text</NavLink>
  const navLinkRegex = /<NavLink([^>]*)>([^]*?)<\/NavLink>/gi;
  while ((match = navLinkRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const to = props.to || '';
    const text = extractTextContent(match[2]);

    if (to && !seen.has(to)) {
      seen.add(to);
      links.push({ to, text });
    }
  }

  // Pattern 3: <a href="...">Text</a> (for internal links)
  const anchorRegex = /<a([^>]*)>([^]*?)<\/a>/gi;
  while ((match = anchorRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const href = props.href || '';
    const text = extractTextContent(match[2]);

    // Only include internal links
    if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !seen.has(href)) {
      seen.add(href);
      links.push({ to: href, text });
    }
  }

  return links;
}

/**
 * Detect modals/dialogs in content
 */
export function extractModals(content: string): ExtractedModal[] {
  const modals: ExtractedModal[] = [];

  // Common modal patterns
  const modalPatterns = [
    /<Modal([^>]*)(?:\/?>)/gi,
    /<Dialog([^>]*)(?:\/?>)/gi,
    /<Drawer([^>]*)(?:\/?>)/gi,
    /<Popup([^>]*)(?:\/?>)/gi,
    /<Overlay([^>]*)(?:\/?>)/gi,
  ];

  for (const regex of modalPatterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const props = parseProps(match[1]);
      modals.push({
        name: props.title || props['aria-label'] || 'Modal',
        trigger: props.trigger,
      });
    }
  }

  return modals;
}

/**
 * Detect forms in content
 */
export function extractForms(content: string): ExtractedForm[] {
  const forms: ExtractedForm[] = [];

  // Pattern: <form ...>...</form>
  const formRegex = /<form([^>]*)>([^]*?)<\/form>/gi;
  let match;
  while ((match = formRegex.exec(content)) !== null) {
    const props = parseProps(match[1]);
    const formContent = match[2];

    // Extract field names from the form
    const fields: string[] = [];
    const fieldRegex = /(?:name|id)\s*=\s*["']([^"']+)["']/gi;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(formContent)) !== null) {
      fields.push(fieldMatch[1]);
    }

    forms.push({
      id: props.id,
      onSubmit: props.onSubmit,
      fields: [...new Set(fields)],
    });
  }

  return forms;
}

/**
 * Analyze a component file and extract all UI elements
 */
export function analyzeComponent(content: string): ComponentAnalysis {
  const contentLower = content.toLowerCase();

  return {
    buttons: extractButtons(content),
    inputs: extractInputs(content),
    selects: extractSelects(content),
    links: extractLinks(content),
    modals: extractModals(content),
    forms: extractForms(content),

    // Feature detection
    tables: /(<table|<Table|DataTable|DataGrid|\.map\s*\(\s*\([^)]*\)\s*=>\s*<tr)/i.test(content),
    pagination: /(pagination|paginate|pageSize|currentPage|nextPage|prevPage|<Pagination)/i.test(content),
    search: /(<input[^>]*type\s*=\s*["']search["']|search|SearchInput|onSearch|searchTerm)/i.test(content),
    dataFetching: /(fetch\s*\(|useQuery|useSWR|axios\.|\.get\(|\.post\(|useEffect.*fetch)/i.test(content),
    loadingState: /(isLoading|loading|Loading|Spinner|Skeleton|\.loading)/i.test(content),
    errorState: /(isError|error|Error|\.error|onError|errorMessage)/i.test(content),
    emptyState: /(emptyState|noData|NoResults|\.length\s*===?\s*0|isEmpty)/i.test(content),
  };
}

/**
 * Generate specific test suggestions based on component analysis
 */
export function generateSpecificTests(
  componentName: string,
  analysis: ComponentAnalysis
): string[] {
  const tests: string[] = [];

  // Basic screen test
  tests.push('Screen loads without errors');

  // Button-specific tests
  for (const btn of analysis.buttons) {
    if (btn.label) {
      const label = btn.label.substring(0, 30); // Truncate long labels
      tests.push(`"${label}" button is clickable and functional`);

      // Specific button action tests
      if (/submit|save|send/i.test(btn.label)) {
        tests.push(`"${label}" button submits data correctly`);
      }
      if (/delete|remove/i.test(btn.label)) {
        tests.push(`"${label}" button shows confirmation before action`);
      }
      if (/cancel|close/i.test(btn.label)) {
        tests.push(`"${label}" button dismisses/closes correctly`);
      }
    }
  }

  // Input-specific tests
  for (const input of analysis.inputs) {
    const fieldName = input.label || input.name || input.placeholder || input.type;
    if (fieldName && fieldName !== 'text') {
      tests.push(`"${fieldName}" field accepts valid input`);

      // Type-specific validation tests
      if (input.type === 'email') {
        tests.push(`"${fieldName}" validates email format`);
      }
      if (input.type === 'password') {
        tests.push(`"${fieldName}" masks password input`);
      }
      if (input.type === 'number') {
        tests.push(`"${fieldName}" accepts only numeric values`);
      }
      if (input.type === 'tel') {
        tests.push(`"${fieldName}" validates phone number format`);
      }
      if (input.required) {
        tests.push(`"${fieldName}" shows required field error when empty`);
      }
    }
  }

  // Select/dropdown tests
  for (const select of analysis.selects) {
    const name = select.label || select.name || 'dropdown';
    if (select.options.length > 0) {
      tests.push(`"${name}" dropdown shows ${select.options.length} options`);
    } else {
      tests.push(`"${name}" dropdown displays available options`);
    }
  }

  // Form tests
  if (analysis.forms.length > 0) {
    tests.push('Form validates required fields before submission');
    tests.push('Form shows appropriate error messages for invalid input');
    tests.push('Form submits successfully with valid data');
  }

  // Modal tests
  for (const modal of analysis.modals) {
    const name = modal.name || 'Modal';
    tests.push(`${name} opens when triggered`);
    tests.push(`${name} closes when dismissed`);
  }

  // Link/navigation tests
  if (analysis.links.length > 0) {
    const uniqueLinks = analysis.links.slice(0, 3); // Limit to 3 links
    for (const link of uniqueLinks) {
      if (link.text) {
        tests.push(`"${link.text}" link navigates to correct destination`);
      }
    }
  }

  // Table/list tests
  if (analysis.tables) {
    tests.push('Table/list displays data correctly');
    tests.push('Table rows are properly formatted');
  }

  // Pagination tests
  if (analysis.pagination) {
    tests.push('Pagination controls are visible');
    tests.push('Next/Previous page buttons work correctly');
  }

  // Search tests
  if (analysis.search) {
    tests.push('Search input accepts text');
    tests.push('Search filters results correctly');
  }

  // Data fetching tests
  if (analysis.dataFetching) {
    tests.push('Data loads successfully from API');

    if (analysis.loadingState) {
      tests.push('Loading indicator displays while fetching');
    }
    if (analysis.errorState) {
      tests.push('Error state displays when API fails');
    }
    if (analysis.emptyState) {
      tests.push('Empty state displays when no data');
    }
  }

  // Remove duplicates and return
  return [...new Set(tests)];
}
