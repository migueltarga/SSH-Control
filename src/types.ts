export interface SSHHost {
  hostName: string;
  name: string;
  user?: string;
  port?: number;
  identityFile?: string;
  preferredAuthentication?: 'publickey' | 'password';
}

export interface RemoteHostsConfig {
  address: string;
  basicAuth?: {
    username: string;
    password: string;
  };
}

export interface RemoteResponse {
  hosts?: SSHHost[];
  groups?: SSHGroup[];
}

export interface SSHGroup {
  name: string;
  defaultUser?: string;
  defaultPort?: number;
  defaultIdentityFile?: string;
  defaultPreferredAuthentication?: 'publickey' | 'password';
  hosts: SSHHost[];
  groups?: SSHGroup[];
  remoteHosts?: RemoteHostsConfig;
}

export interface SSHConfig {
  groups: SSHGroup[];
}

export interface SSHTreeItem {
  type: 'group' | 'host';
  group?: SSHGroup;
  host?: SSHHost;
  groupIndex?: number;
  hostIndex?: number;
  parentGroup?: SSHGroup;
  groupPath?: number[];
}