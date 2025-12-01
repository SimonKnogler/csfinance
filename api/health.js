module.exports = async (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({ 
    status: 'ok', 
    timestamp: Date.now(),
    nodeVersion: process.version,
    build: 'v2-esm'
  }));
}
