const path = require('path');

const cluster = require('cluster');
const os = require('os');
const http = require('http');
const https = require('https');

const express = require('express');
const fs = require('fs');
const cert = fs.readFileSync('./data/certs/cert.crt');
const ca = fs.readFileSync('./data/certs/ca.pem');
const key = fs.readFileSync('./data/certs/private.key');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('message', (worker, msg, handle) => {
    for (const id in cluster.workers) {
      cluster.workers[id].send(msg);
    }
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker process ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();
  const server = http.createServer(app);
  const httpsserver = https.createServer({
    key,
    cert,
    ca
  }, app)

  // Client static files
  app.use(express.static(path.join(__dirname, '../client')))
  app.use(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  })

  httpsserver.listen(443, '0.0.0.0', () => {
    console.log('listening on *:443');
  })
  
  server.listen(80, () => {
    console.log('listening on *:80');
  });
}
