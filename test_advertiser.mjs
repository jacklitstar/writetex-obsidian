import { Bonjour } from 'bonjour-service';
import os from 'os';

console.log('Starting Test Advertiser...');

function advertiseMac(port) {
  try {
      const instance = new Bonjour();
      const hostname = os.hostname();
      const serviceName = `WriteTex Obsidian @ ${hostname}`;

      console.log(`[mDNS] Starting macOS Bonjour advertising for ${serviceName} on port ${port}`);

      const service = instance.publish({
        name: serviceName,
        type: 'writetex-vscode', // Keep the same type for compatibility with the iOS app
        protocol: 'tcp',
        port,
        txt: {
          fork: 'Obsidian'
        }
      });

      // Start if method exists (some versions require this)
      if (typeof service.start === 'function') {
        service.start();
      }

      console.log(`[mDNS] Service published: ${serviceName}`);
      console.log('Press Ctrl+C to stop...');
      
      // Keep alive
      setInterval(() => {}, 10000);
  } catch (e) {
      console.error('Error:', e);
  }
}

advertiseMac(50905);
