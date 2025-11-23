// analyze-views.mjs
// Comprehensive analysis of all view files

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const viewsDir = 'src/views';
const files = readdirSync(viewsDir).filter(f => f.endsWith('.tsx') && !f.includes('backup'));

const issues = [];
const recommendations = [];

files.forEach(file => {
  const path = join(viewsDir, file);
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  
  // Check 1: Loading states
  const hasLoadingState = /const\s+\[.*loading/i.test(content);
  const hasLoadingUI = /loading.*\?|if.*loading/i.test(content);
  if (hasLoadingState && !hasLoadingUI) {
    issues.push(`${file}: Has loading state but no loading UI`);
  }
  
  // Check 2: Error handling
  const hasErrorState = /const\s+\[.*error/i.test(content);
  const hasErrorUI = /error.*\?|if.*error/i.test(content);
  if (hasErrorState && !hasErrorUI) {
    issues.push(`${file}: Has error state but no error UI`);
  }
  
  // Check 3: Empty data handling
  const hasMapFunction = /\.map\(/g.test(content);
  const hasLengthCheck = /\.length.*===.*0|\.length.*>.*0/g.test(content);
  if (hasMapFunction && !hasLengthCheck) {
    recommendations.push(`${file}: Uses .map() but might not check for empty arrays`);
  }
  
  // Check 4: Inline styles vs className
  const inlineStyles = (content.match(/style=\{\{/g) || []).length;
  const classNames = (content.match(/className=/g) || []).length;
  if (inlineStyles > 20) {
    recommendations.push(`${file}: Has ${inlineStyles} inline styles - consider using Tailwind classes`);
  }
  
  // Check 5: Hardcoded colors
  const hardcodedColors = content.match(/#[0-9a-fA-F]{3,6}|rgb\(|rgba\(/g) || [];
  if (hardcodedColors.length > 10) {
    recommendations.push(`${file}: Has ${hardcodedColors.length} hardcoded colors - consider using CSS variables`);
  }
  
  // Check 6: Responsive design
  const hasResponsive = /md:|lg:|xl:|sm:/g.test(content);
  const hasGrid = /grid|flex/g.test(content);
  if (hasGrid && !hasResponsive) {
    recommendations.push(`${file}: Uses grid/flex but might not be responsive`);
  }
  
  // Check 7: Accessibility
  const hasAriaLabels = /aria-label|aria-/g.test(content);
  const hasButtons = /<button/g.test(content);
  if (hasButtons && !hasAriaLabels) {
    recommendations.push(`${file}: Has buttons but might lack aria labels`);
  }
});

console.log('='.repeat(80));
console.log('VIEW FILES ANALYSIS REPORT');
console.log('='.repeat(80));
console.log(`\nTotal files analyzed: ${files.length}\n`);

if (issues.length > 0) {
  console.log('🔴 CRITICAL ISSUES:\n');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('');
}

if (recommendations.length > 0) {
  console.log('⚠️  RECOMMENDATIONS:\n');
  recommendations.forEach(rec => console.log(`  - ${rec}`));
  console.log('');
}

if (issues.length === 0 && recommendations.length === 0) {
  console.log('✅ No critical issues found!\n');
}

console.log('='.repeat(80));

