export interface SSHHost {
  hostName: string;
  name: string;
  user?: string;
  port?: number;
  identityFile?: string;
  preferredAuthentication?: 'publickey' | 'password';
}

export interface SSHGroup {
  name: string;
  defaultUser?: string;
  defaultPort?: number;
  defaultIdentityFile?: string;
  defaultPreferredAuthentication?: 'publickey' | 'password';
  hosts: SSHHost[];
  groups?: SSHGroup[];
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