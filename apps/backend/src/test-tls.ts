import tls from 'tls';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const host = 'ac-dgn9csi-shard-00-00.se5b7wx.mongodb.net';
const port = 27017;

console.log(`Connecting via TLS to ${host}:${port}...`);

const socket = tls.connect({
  host,
  port,
  servername: host,
  rejectUnauthorized: true,
}, () => {
  console.log('✅ TLS Handshake successful! Cipher:', socket.getCipher());
  console.log('Authorized:', socket.authorized);
  socket.end();
});

socket.on('error', (err) => {
  console.error('❌ TLS Socket Error:', err.message);
});
