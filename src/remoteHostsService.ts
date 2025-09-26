import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { SSHHost, SSHGroup, RemoteHostsConfig, RemoteResponse } from './types';

export class RemoteHostsService {
  private cache: Map<string, { response: RemoteResponse, timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  constructor() {}

  private processUrl(url: string): string {
    return url.replace(/\[timestamp\]/g, Date.now().toString());
  }

  async fetchRemoteData(config: RemoteHostsConfig): Promise<RemoteResponse> {
    const cacheKey = this.getCacheKey(config);
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.response;
    }

    try {
      const response = await this.downloadRemoteData(config);
      this.cache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.error('Failed to fetch remote data:', error);
      
      if (cached) {
        vscode.window.showWarningMessage(`Failed to fetch remote data, using cached data. Error: ${error}`);
        return cached.response;
      }
      
      throw error;
    }
  }

  private async downloadRemoteData(config: RemoteHostsConfig): Promise<RemoteResponse> {
    return new Promise((resolve, reject) => {
      const processedAddress = this.processUrl(config.address);
      const url = new URL(processedAddress);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: { [key: string]: string } = {};

      if (config.basicAuth) {
        const auth = Buffer.from(`${config.basicAuth.username}:${config.basicAuth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers
      };

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const response = this.parseRemoteData(data);
              resolve(response);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse remote data: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private parseRemoteData(data: string): RemoteResponse {
    try {
      const jsonData = JSON.parse(data);
      
      if (Array.isArray(jsonData)) {
        return { hosts: jsonData };
      } else if (jsonData.hosts || jsonData.groups) {
        return {
          hosts: jsonData.hosts || [],
          groups: jsonData.groups || []
        };
      } else if (jsonData.hosts && Array.isArray(jsonData.hosts)) {
        return { hosts: jsonData.hosts };
      } else {
        throw new Error('Invalid JSON structure');
      }
    } catch (jsonError) {
      const hosts = this.parseTextFormat(data);
      return { hosts };
    }
  }

  private parseTextFormat(data: string): SSHHost[] {
    const hosts: SSHHost[] = [];
    const lines = data.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
        continue;
      }

      const parts = trimmed.split(':');
      
      if (parts.length >= 1) {
        const host: SSHHost = {
          hostName: parts[0].trim(),
          name: parts[1]?.trim() || parts[0].trim()
        };

        if (parts[2]?.trim()) {
          host.user = parts[2].trim();
        }

        if (parts[3]?.trim()) {
          const port = parseInt(parts[3].trim(), 10);
          if (!isNaN(port)) {
            host.port = port;
          }
        }

        hosts.push(host);
      }
    }

    return hosts;
  }

  private getCacheKey(config: RemoteHostsConfig): string {
    return `${config.address}:${config.basicAuth?.username || 'noauth'}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheInfo(): Array<{ url: string, hostsCount: number, groupsCount: number, age: number }> {
    const info: Array<{ url: string, hostsCount: number, groupsCount: number, age: number }> = [];
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      const url = key.split(':')[0];
      info.push({
        url,
        hostsCount: value.response.hosts?.length || 0,
        groupsCount: value.response.groups?.length || 0,
        age: Math.floor((now - value.timestamp) / 1000)
      });
    }
    
    return info;
  }
}