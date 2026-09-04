const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  // 1. Fix the double className in Login/SignUp/etc.
  content = content.replace(/className="input-password-toggle"\s*\n\s*className="password-eye-btn"/g, 'className="input-password-toggle password-eye-btn"');
  content = content.replace(/className="input-password-toggle"\s*className="password-eye-btn"/g, 'className="input-password-toggle password-eye-btn"');

  // 2. In files that just have password-eye-btn, make them both.
  // But wait, if we already fixed the double className, any remaining standalone password-eye-btn can be upgraded, EXCEPT we don't want to double it if it already has both.
  content = content.replace(/className="password-eye-btn"/g, 'className="input-password-toggle password-eye-btn"');
  // Fix potential duplication from the above line
  content = content.replace(/className="input-password-toggle input-password-toggle/g, 'className="input-password-toggle');
  content = content.replace(/input-password-toggle password-eye-btn input-password-toggle/g, 'input-password-toggle password-eye-btn');

  // 3. Remove inline styles from these buttons in Modal files.
  content = content.replace(/style=\{\{\s*position:\s*['"]absolute['"],[^\}]+\}\}/g, '');

  // 4. Change wrapper divs to use input-with-icon.
  content = content.replace(/<div style=\{\{\s*position:\s*['"]relative['"]\s*\}\}>/g, '<div className="input-with-icon">');
  content = content.replace(/<div style=\{\{\s*display:\s*['"]flex['"],\s*width:\s*['"]100%['"],\s*position:\s*['"]relative['"]\s*\}\}>/g, '<div className="input-with-icon">');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
console.log('Done');
