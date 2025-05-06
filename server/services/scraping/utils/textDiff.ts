import { diffWords, diffLines, diffJson, diffArrays, convertChangesToDMP } from 'diff';
import * as cheerio from 'cheerio';

interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  mode?: 'words' | 'lines' | 'json' | 'arrays' | 'html';
  htmlContext?: boolean; // Include surrounding context for HTML changes
}

interface DiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
  changes: {
    added: number;
    removed: number;
    unchanged: number;
  };
  changePercentage: number;
  patches?: string; // Diff-Match-Patch format for applying changes
  htmlChanges?: Array<{
    selector: string;
    before: string;
    after: string;
    context?: string;
  }>
}

/**
 * Calculate the difference between two text strings
 * 
 * @param oldText - The original text
 * @param newText - The new text
 * @param options - Options for the diff operation
 * @returns Detailed information about differences
 */
export function diffText(oldText: string, newText: string, options: DiffOptions = {}): DiffResult {
  // Prepare texts based on options
  if (options.ignoreWhitespace) {
    oldText = oldText.replace(/\s+/g, ' ').trim();
    newText = newText.replace(/\s+/g, ' ').trim();
  }
  
  if (options.ignoreCase) {
    oldText = oldText.toLowerCase();
    newText = newText.toLowerCase();
  }
  
  let diffResult: any[] = [];
  
  // Select diff mode based on options
  if (options.mode === 'lines') {
    diffResult = diffLines(oldText, newText);
  } else if (options.mode === 'json') {
    try {
      // Parse strings as JSON
      const oldJson = typeof oldText === 'string' ? JSON.parse(oldText) : oldText;
      const newJson = typeof newText === 'string' ? JSON.parse(newText) : newText;
      diffResult = diffJson(oldJson, newJson);
    } catch (error) {
      // Fallback to lines if JSON parsing fails
      console.warn('Failed to parse JSON, falling back to line-based diff', error);
      diffResult = diffLines(oldText, newText);
    }
  } else if (options.mode === 'arrays') {
    try {
      // Parse strings as arrays
      const oldArray = typeof oldText === 'string' ? JSON.parse(oldText) : oldText;
      const newArray = typeof newText === 'string' ? JSON.parse(newText) : newText;
      
      if (!Array.isArray(oldArray) || !Array.isArray(newArray)) {
        throw new Error('Inputs are not arrays');
      }
      
      diffResult = diffArrays(oldArray, newArray);
    } catch (error) {
      // Fallback to words if array parsing fails
      console.warn('Failed to parse arrays, falling back to word-based diff', error);
      diffResult = diffWords(oldText, newText);
    }
  } else if (options.mode === 'html') {
    // Special handling for HTML content
    return diffHtml(oldText, newText, options);
  } else {
    // Default to word-based diff
    diffResult = diffWords(oldText, newText);
  }
  
  // Collect the changes
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;
  
  diffResult.forEach(part => {
    if (part.added) {
      added.push(part.value);
      addedCount += part.count || part.value.length;
    } else if (part.removed) {
      removed.push(part.value);
      removedCount += part.count || part.value.length;
    } else {
      unchanged.push(part.value);
      unchangedCount += part.count || part.value.length;
    }
  });
  
  // Calculate change percentage
  const totalCount = addedCount + removedCount + unchangedCount;
  const changePercentage = totalCount > 0
    ? (addedCount + removedCount) / totalCount
    : 0;
  
  // Generate patches for applying changes
  const patches = convertChangesToDMP(diffResult);
  
  return {
    added,
    removed,
    unchanged,
    changes: {
      added: addedCount,
      removed: removedCount,
      unchanged: unchangedCount
    },
    changePercentage,
    patches
  };
}

/**
 * Specialized function for diffing HTML content
 */
function diffHtml(oldHtml: string, newHtml: string, options: DiffOptions): DiffResult {
  // First, do a raw text diff for the overall statistics
  const textDiff = diffText(oldHtml, newHtml, { ...options, mode: 'words' });
  
  // Then do an element-by-element comparison
  const $old = cheerio.load(oldHtml);
  const $new = cheerio.load(newHtml);
  
  const htmlChanges: Array<{
    selector: string;
    before: string;
    after: string;
    context?: string;
  }> = [];
  
  // Compare specific elements that are common to both versions
  // This approach helps identify changes in specific components of the page
  
  // Compare text content of all elements
  $new('*').each((i, elem) => {
    const $elem = $new(elem);
    const selector = getSelector($elem);
    
    if (!selector) return; // Skip if we can't create a useful selector
    
    // Try to find the same element in the old HTML
    const $oldElem = $old(selector);
    
    if ($oldElem.length === 0) {
      // New element that didn't exist before
      htmlChanges.push({
        selector,
        before: '',
        after: $elem.html() || $elem.text() || '',
        context: options.htmlContext ? getContext($new, $elem) : undefined
      });
    } else if ($oldElem.html() !== $elem.html()) {
      // Element exists but content changed
      htmlChanges.push({
        selector,
        before: $oldElem.html() || $oldElem.text() || '',
        after: $elem.html() || $elem.text() || '',
        context: options.htmlContext ? getContext($new, $elem) : undefined
      });
    }
  });
  
  // Look for elements that were removed
  $old('*').each((i, elem) => {
    const $elem = $old(elem);
    const selector = getSelector($elem);
    
    if (!selector) return; // Skip if we can't create a useful selector
    
    // Check if this element still exists in new HTML
    if ($new(selector).length === 0) {
      htmlChanges.push({
        selector,
        before: $elem.html() || $elem.text() || '',
        after: '',
        context: options.htmlContext ? getContext($old, $elem) : undefined
      });
    }
  });
  
  return {
    ...textDiff,
    htmlChanges
  };
}

/**
 * Generate a CSS selector for an element that's reasonably specific
 */
function getSelector($elem: cheerio.Cheerio): string | null {
  // Try to use ID
  const id = $elem.attr('id');
  if (id) {
    return `#${id}`;
  }
  
  // Use classes
  const classes = $elem.attr('class');
  if (classes) {
    const classList = classes.split(/\s+/).filter(Boolean);
    if (classList.length > 0) {
      return `.${classList.join('.')}`;
    }
  }
  
  // Use element type with any distinguishing attributes
  const tagName = $elem.prop('tagName')?.toLowerCase();
  if (!tagName || tagName === 'html' || tagName === 'body') {
    return null; // Too generic
  }
  
  // Add specific attributes that help identification
  const name = $elem.attr('name');
  const href = $elem.attr('href');
  const src = $elem.attr('src');
  
  if (name) {
    return `${tagName}[name="${name}"]`;
  }
  
  if (href && !href.includes('javascript:')) {
    return `${tagName}[href="${href}"]`;
  }
  
  if (src) {
    return `${tagName}[src="${src}"]`;
  }
  
  // If we can't create a specific enough selector, return null
  return null;
}

/**
 * Get surrounding context for an element
 */
function getContext($: cheerio.Root, $elem: cheerio.Cheerio): string {
  // Get parent element
  const $parent = $elem.parent();
  if (!$parent || $parent.length === 0) {
    return '';
  }
  
  // Return parent element's outer HTML, limited to a reasonable size
  const parentHtml = $.html($parent);
  if (parentHtml.length > 500) {
    return parentHtml.substring(0, 500) + '...';
  }
  
  return parentHtml;
}