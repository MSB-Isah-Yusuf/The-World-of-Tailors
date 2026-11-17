const fs = require('fs');
const path = require('path');
const glob = require('fs');

function stripFile(filePath, shellNames) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Remove imports of shell components
  for (const name of shellNames) {
    // Match import { X } from "...AdvancedCustomerShell" or DashboardShell etc
    const importRegex = new RegExp(`import\\s+\\{[^}]*${name}[^}]*\\}\\s+from\\s+["'][^"']+["'];?\\n?`, 'g');
    content = content.replace(importRegex, '');
    // Also plain import DashboardShell
    const plainImportRegex = new RegExp(`import\\s+\\{[^}]*${name}[^}]*\\}[^;]*;?\\n?`, 'g');
    content = content.replace(plainImportRegex, '');
  }
  // Also handle generic shell imports like AdvancedShell
  // Already covered
  
  // Unwrap <AdvancedCustomerShell title="..."> -> keep inner
  // Replace return (<AdvancedCustomerShell ...> with return (
  // and return <AdvancedCustomerShell ...> with return (
  content = content.replace(/return\s*\(\s*<AdvancedCustomerShell[^>]*>/g, 'return (');
  content = content.replace(/return\s+<AdvancedCustomerShell[^>]*>/g, 'return (');
  content = content.replace(/return\s*\(\s*<AdvancedSellerShell[^>]*>/g, 'return (');
  content = content.replace(/return\s+<AdvancedSellerShell[^>]*>/g, 'return (');
  content = content.replace(/return\s*\(\s*<AdvancedTailorShell[^>]*>/g, 'return (');
  content = content.replace(/return\s+<AdvancedTailorShell[^>]*>/g, 'return (');
  content = content.replace(/return\s*\(\s*<AdvancedShell[^>]*>/g, 'return (');
  content = content.replace(/return\s+<AdvancedShell[^>]*>/g, 'return (');
  // DashboardShell with props multiline
  content = content.replace(/return\s*\(\s*<DashboardShell[\s\S]*?>\n?/g, 'return (');
  content = content.replace(/return\s+<DashboardShell[\s\S]*?>\n?/g, 'return (');

  // Closing tags: </AdvancedCustomerShell> etc, often with ); or ) or ;
  content = content.replace(/<\/AdvancedCustomerShell>\s*\)?\s*;?/g, ')');
  content = content.replace(/<\/AdvancedSellerShell>\s*\)?\s*;?/g, ')');
  content = content.replace(/<\/AdvancedTailorShell>\s*\)?\s*;?/g, ')');
  content = content.replace(/<\/AdvancedShell>\s*\)?\s*;?/g, ')');
  content = content.replace(/<\/DashboardShell>\s*\)?\s*;?/g, ')');

  // Clean up double parentheses like return (( -> return (
  content = content.replace(/return\s*\(\s*\(/g, 'return (');
  // Ensure balancing: if we have `return (<div> ... </div>)` we added extra ) earlier, need to check
  // Count and fix `return ( ... )` vs `return (...))`
  // Simple cleanup: remove `) )` double
  // content = content.replace(/\)\s*\)\s*;/g, ');');

  // Fix specific pattern: `if (!profile) return (<Card>` -> should be `if (!profile) return (<Card>...</Card>);` but our transform turned closing `</AdvancedCustomerShell>)` into `)` leading to `return (<Card>...</Card>)` extra )
  // Actually we replaced `</AdvancedCustomerShell>` with `)`, but original had `</AdvancedCustomerShell>;` after that, we did replace with `)`, so we get `return (<Card>...)` need semicolon
  // Ensure not double closing

  // Clean up stray `import { } from` empty
  content = content.replace(/^import\s*\{\s*\}\s*from.*\n/gm, '');

  // Remove double blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Stripped ${filePath}`);
    return true;
  } else {
    console.log(`No change ${filePath}`);
    return false;
  }
}

// Get file lists
const customerFiles = fs.readdirSync('src/app/dashboard/customer', { recursive: true }) || [];
// Use bash find for simplicity via manual list
const { execSync } = require('child_process');
const cust = execSync('find src/app/dashboard/customer -name "*.tsx" -type f').toString().trim().split('\n').filter(Boolean);
const sell = execSync('find src/app/dashboard/seller -name "*.tsx" -type f').toString().trim().split('\n').filter(Boolean);
const tail = execSync('find src/app/dashboard/tailor -name "*.tsx" -type f').toString().trim().split('\n').filter(Boolean);

for (const f of cust) {
  if (f.includes('layout.tsx')) continue;
  stripFile(f, ['AdvancedCustomerShell']);
}
for (const f of sell) {
  if (f.includes('layout.tsx')) continue;
  stripFile(f, ['AdvancedSellerShell']);
}
for (const f of tail) {
  if (f.includes('layout.tsx')) continue;
  stripFile(f, ['AdvancedTailorShell', 'AdvancedShell', 'DashboardShell']);
}
console.log('Done');
