const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Simple server is working!', 
    timestamp: new Date().toISOString(),
    url: req.url 
  }));
});

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/test`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
}); 