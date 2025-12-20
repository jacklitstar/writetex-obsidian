import multicastDns from 'multicast-dns';
import { Bonjour } from 'bonjour-service';
import * as os from 'os';
import { Buffer } from 'buffer';
import { Platform } from 'obsidian';

export interface MdnsHandle {
  stop: () => Promise<void>;
}

/**
 * Get all active IPv4 addresses from network interfaces
 */
function getActiveIPv4Addresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name in interfaces) {
    const iface = interfaces[name];
    if (!iface) {
      continue;
    }

    for (const addr of iface) {
      // Only IPv4, not internal/loopback
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }

  return addresses;
}

/**
 * Advertise WriteTex OCR service via mDNS on the local network
 * 
 * Uses platform-specific implementation:
 * - macOS: bonjour-service (native Bonjour, iOS compatible)
 * - Windows: multicast-dns (explicit interface binding)
 */
export function advertise(port: number): MdnsHandle {
  const isMac = Platform.isMacOS;

  if (isMac) {
    return advertiseMac(port);
  } else {
    return advertiseWindows(port);
  }
}

/**
 * macOS implementation using bonjour-service
 * Native Bonjour for perfect iOS compatibility
 */
function advertiseMac(port: number): MdnsHandle {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const instance = new Bonjour();
  const hostname = os.hostname();
  const serviceName = `WriteTex Obsidian @ ${hostname}`;

  console.debug(`[mDNS] Starting macOS Bonjour advertising for ${serviceName} on port ${port}`);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  if (typeof (service as any).start === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (service as any).start();
  }

  console.debug(`[mDNS] Service published: ${serviceName}`);

  return {
    stop: async () => new Promise(resolve => {
      console.debug('[mDNS] Stopping macOS Bonjour...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const s: any = service;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (typeof s.stop === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        s.stop(() => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          instance.destroy();
          resolve();
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        instance.destroy();
        resolve();
      }
    })
  };
}

/**
 * Windows implementation using multicast-dns
 * Explicit interface binding for reliability
 */
function advertiseWindows(port: number): MdnsHandle {
  const hostname = os.hostname();
  const serviceName = `WriteTex Obsidian @ ${hostname}`;
  const serviceType = '_writetex-vscode._tcp.local'; // Keep compatibility
  const fqdn = `${hostname}.local`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mdnsInstances: any[] = [];
  const addresses = getActiveIPv4Addresses();

  if (addresses.length === 0) {
    console.warn('[mDNS] No active IPv4 interfaces found, using default binding');
    try {
      const mdns = multicastDns({ interface: '0.0.0.0' });
      mdnsInstances.push(mdns);
      setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port);
    } catch (e: unknown) {
      console.error('[mDNS] Failed to bind to 0.0.0.0:', e);
    }
  } else {
    console.debug(`[mDNS] Windows binding to ${addresses.length} network interface(s):`, addresses);

    for (const addr of addresses) {
      try {
        const mdns = multicastDns({ interface: addr });
        mdnsInstances.push(mdns);
        setupMdnsResponder(mdns, serviceName, serviceType, fqdn, port, addr);
        console.debug(`[mDNS] Bound to interface: ${addr}`);
      } catch (err) {
        console.error(`[mDNS] Failed to bind to interface ${addr}:`, err);
      }
    }
  }

  console.debug(`[mDNS] Advertising service: ${serviceName} on port ${port}`);

  return {
    stop: async () => {
      for (const mdns of mdnsInstances) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          mdns.destroy();
        } catch (err) {
          console.error('[mDNS] Error destroying instance:', err);
        }
      }
    }
  };
}

/**
 * Setup mDNS responder for Windows multicast-dns
 */
function setupMdnsResponder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mdns: any,
  serviceName: string,
  serviceType: string,
  fqdn: string,
  port: number,
  boundAddress?: string
): void {
  const serviceInstanceName = `${serviceName}.${serviceType}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  mdns.on('query', (query: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responses: any[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (const question of query.questions || []) {
      // Respond to service type queries (PTR)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (question.name === serviceType && question.type === 'PTR') {
        responses.push({
          name: serviceType,
          type: 'PTR',
          ttl: 120,
          data: serviceInstanceName
        });
      }

      // Respond to service instance queries (SRV, TXT)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (question.name === serviceInstanceName) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (question.type === 'SRV' || question.type === 'ANY') {
          responses.push({
            name: serviceInstanceName,
            type: 'SRV',
            ttl: 120,
            data: {
              priority: 0,
              weight: 0,
              port: port,
              target: fqdn
            }
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (question.type === 'TXT' || question.type === 'ANY') {
          responses.push({
            name: serviceInstanceName,
            type: 'TXT',
            ttl: 120,
            data: Buffer.from(`fork=Obsidian`)
          });
        }
      }

      // Respond to hostname queries (A)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (question.name === fqdn && (question.type === 'A' || question.type === 'ANY')) {
        const addresses = boundAddress ? [boundAddress] : getActiveIPv4Addresses();
        for (const addr of addresses) {
          responses.push({
            name: fqdn,
            type: 'A',
            ttl: 120,
            data: addr
          });
        }
      }
    }

    if (responses.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      mdns.respond(responses);
    }
  });

  // Proactively announce our service
  const announceService = () => {
    const addresses = boundAddress ? [boundAddress] : getActiveIPv4Addresses();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const announcements: any[] = [
      {
        name: serviceType,
        type: 'PTR',
        ttl: 120,
        data: serviceInstanceName
      },
      {
        name: serviceInstanceName,
        type: 'SRV',
        ttl: 120,
        data: {
          priority: 0,
          weight: 0,
          port: port,
          target: fqdn
        }
      },
      {
        name: serviceInstanceName,
        type: 'TXT',
        ttl: 120,
        data: Buffer.from(`fork=Obsidian`)
      }
    ];

    // Add A records for all interfaces
    for (const addr of addresses) {
      announcements.push({
        name: fqdn,
        type: 'A',
        ttl: 120,
        data: addr
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    mdns.respond(announcements);
  };

  // Announce immediately and periodically
  announceService();
  const announceInterval = setInterval(announceService, 60000); // Every 60 seconds

  // Clean up interval on destroy
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const originalDestroy = mdns.destroy.bind(mdns) as () => void;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  mdns.destroy = () => {
    clearInterval(announceInterval);
    originalDestroy();
  };
}
