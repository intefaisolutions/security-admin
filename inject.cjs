const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const script = `
<script>
window.onerror = function(msg, src, lineno, colno, error) {
  document.body.innerHTML = '<div style="color:red;font-size:24px;z-index:9999;position:fixed;top:0;left:0;background:white;padding:20px;width:100%;height:100%;">' + msg + '<br>' + (error && error.stack) + '</div>';
};
window.addEventListener('unhandledrejection', function(event) {
  document.body.innerHTML = '<div style="color:red;font-size:24px;z-index:9999;position:fixed;top:0;left:0;background:white;padding:20px;width:100%;height:100%;">Unhandled Rejection: ' + (event.reason && event.reason.stack || event.reason) + '</div>';
});
</script>
`;
if (!html.includes('window.onerror')) {
  html = html.replace('<head>', '<head>' + script);
  fs.writeFileSync('index.html', html);
}
