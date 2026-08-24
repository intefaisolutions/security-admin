const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
    
    console.log("Navigating to http://localhost:3001 ...");
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    console.log("Waiting 2s...");
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    console.log("Done.");
  } catch (err) {
    console.error("SCRIPT_ERROR:", err);
  }
})();
