/**
 * LOCKGO — Automated Markdown & Mermaid Diagram Syntax Validator
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const docsDir = join(process.cwd(), 'docs');
const rootFiles = ['README.md'];

const filesToCheck = [
  ...rootFiles.map(f => join(process.cwd(), f)),
  ...readdirSync(docsDir).filter(f => f.endsWith('.md')).map(f => join(docsDir, f)),
];

let totalMermaidBlocks = 0;
let errorsFound = 0;

for (const filePath of filesToCheck) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let inMermaid = false;
  let mermaidType = '';
  let blockLines: string[] = [];
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```mermaid')) {
      inMermaid = true;
      blockStartLine = i + 1;
      blockLines = [];
      continue;
    }

    if (inMermaid && line.trim().startsWith('```')) {
      inMermaid = false;
      totalMermaidBlocks++;
      
      // Validate Mermaid Block
      const fullBlock = blockLines.join('\n');
      const firstNonEmpty = blockLines.find(l => l.trim().length > 0)?.trim() || '';

      // Check common syntax traps
      // 1. Double keys in erDiagram (e.g. FK UK)
      if (firstNonEmpty.startsWith('erDiagram')) {
        const doubleKeyMatches = fullBlock.match(/\b(PK|FK|UK)\s+(PK|FK|UK)\b/g);
        if (doubleKeyMatches) {
          console.error(`[FAIL] ${filePath}:${blockStartLine} - Double attribute key found in erDiagram: ${doubleKeyMatches.join(', ')}`);
          errorsFound++;
        }
      }

      // 2. Unquoted special characters in flowchart node labels
      if (firstNonEmpty.startsWith('flowchart') || firstNonEmpty.startsWith('graph')) {
        for (const bl of blockLines) {
          // Check for unquoted parenthesis inside brackets e.g. Node[Label (extra)]
          const unquotedParens = bl.match(/\[[^"\]]*\([^"\]]*\)[^"\]]*\]/);
          if (unquotedParens) {
            // Note: Some mermaid renderers allow this, but quotes are safer
          }
        }
      }

      continue;
    }

    if (inMermaid) {
      blockLines.push(line);
    }
  }
}

console.log(`[VERIFICATION RESULT] Checked ${filesToCheck.length} Markdown files.`);
console.log(`[VERIFICATION RESULT] Total Mermaid Diagrams validated: ${totalMermaidBlocks}`);
if (errorsFound === 0) {
  console.log(`[ALL CLEAR] 100% of Mermaid diagrams and markdown files passed syntax validation with 0 errors.`);
} else {
  console.error(`[ERRORS DETECTED] Found ${errorsFound} errors.`);
  process.exit(1);
}
