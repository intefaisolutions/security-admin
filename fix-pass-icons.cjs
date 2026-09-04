const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('setShowPassword') || content.includes('setShowPasswords')) {
    content = content.replace(/color:\s*'var\(--text-muted\)',?/g, '');
    content = content.replace(/color:\s*"var\(--text-muted\)",?/g, '');
    content = content.replace(/onClick=\{\(\) => setShowPassword\(!showPassword\)\}/g, 'className="password-eye-btn" onClick={() => setShowPassword(!showPassword)}');
    content = content.replace(/onClick=\{\(\) => setShowPasswords\(!showPasswords\)\}/g, 'className="password-eye-btn" onClick={() => setShowPasswords(!showPasswords)}');
    fs.writeFileSync(filePath, content);
  }
}
console.log('Fixed pages.');
