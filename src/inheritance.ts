import { SSHHost, SSHGroup } from './types';

export function resolveHostSettings(host: SSHHost, groupChain: SSHGroup[]): {
  user: string;
  port: number;
  identityFile?: string;
  preferredAuthentication?: 'publickey' | 'password';
} {
  let user = host.user;
  let port = host.port;
  let identityFile = host.identityFile;
  let preferredAuthentication = host.preferredAuthentication;

  for (const group of groupChain) {
    if (!user && group.defaultUser) {
      user = group.defaultUser;
    }
    if (!port && group.defaultPort) {
      port = group.defaultPort;
    }
    if (!identityFile && group.defaultIdentityFile) {
      identityFile = group.defaultIdentityFile;
    }
    if (!preferredAuthentication && group.defaultPreferredAuthentication) {
      preferredAuthentication = group.defaultPreferredAuthentication;
    }
  }

  return {
    user: user || 'root',
    port: port || 22,
    identityFile,
    preferredAuthentication
  };
}

export function findGroupByPath(config: { groups: SSHGroup[] }, path: number[]): SSHGroup | undefined {
  let current: SSHGroup[] = config.groups;
  let group: SSHGroup | undefined;

  for (const index of path) {
    if (!current[index]) {
      return undefined;
    }
    group = current[index];
    current = group.groups || [];
  }

  return group;
}

export function getGroupChain(config: { groups: SSHGroup[] }, groupPath: number[]): SSHGroup[] {
  const chain: SSHGroup[] = [];
  let current: SSHGroup[] = config.groups;

  for (const index of groupPath) {
    if (!current[index]) {
      break;
    }
    const group = current[index];
    chain.push(group);
    current = group.groups || [];
  }

  return chain.reverse();
}