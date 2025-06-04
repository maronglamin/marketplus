import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';

const DISCOVERY_PORT = 3001;

// Get the server's IP address
const getServerIp = (): string => {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      const address = networkInterface.find(
        addr => addr.family === 'IPv4' && !addr.internal
      );
      if (address) {
        return address.address;
      }
    }
  }
  return '0.0.0.0';
};

// Create WebSocket server for discovery
const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'DISCOVER') {
        ws.send(JSON.stringify({
          type: 'DISCOVER_RESPONSE',
          ip: getServerIp()
        }));
      }
    } catch (error) {
      console.error('Error handling discovery message:', error);
    }
  });
});

server.listen(DISCOVERY_PORT, '0.0.0.0', () => {
  console.log(`Discovery service running on port ${DISCOVERY_PORT}`);
  console.log('Server IP:', getServerIp());
}); 