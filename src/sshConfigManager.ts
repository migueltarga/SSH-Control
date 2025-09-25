import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SSHConfig, SSHGroup, SSHHost } from './types';

export class SSHConfigManager {
  private configPath: string;
  private _onDidChangeConfig: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeConfig: vscode.Event<void> = this._onDidChangeConfig.event;

  constructor() {
    this.configPath = this.getConfigPath();
  }

  private getConfigPath(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return path.join(workspaceFolder.uri.fsPath, 'ssh-config.json');
    }
    // Fallback to user's home directory
    const homeDir = require('os').homedir();
    return path.join(homeDir, '.ssh-control', 'ssh-config.json');
  }

  private async ensureConfigExists(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig: SSHConfig = {
        groups: [
          {
            name: "Default",
            defaultUser: "root",
            defaultPort: 22,
            defaultIdentityFile: "",
            hosts: []
          }
        ]
      };
      
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      await this.saveConfig(defaultConfig);
    }
  }

  async loadConfig(): Promise<SSHConfig> {
    await this.ensureConfigExists();
    
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load SSH config: ${error}`);
      return { groups: [] };
    }
  }

  async saveConfig(config: SSHConfig): Promise<void> {
    try {
      const configData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      this._onDidChangeConfig.fire();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save SSH config: ${error}`);
    }
  }

  async addGroup(group: SSHGroup, parentGroupPath?: number[]): Promise<void> {
    const config = await this.loadConfig();
    if (parentGroupPath) {
      const parentGroup = this.getGroupByPath(config, parentGroupPath);
      if (parentGroup) {
        if (!parentGroup.groups) {
          parentGroup.groups = [];
        }
        parentGroup.groups.push(group);
      }
    } else {
      config.groups.push(group);
    }
    await this.saveConfig(config);
  }

  async addHost(groupPath: number[], host: SSHHost): Promise<void> {
    const config = await this.loadConfig();
    const group = this.getGroupByPath(config, groupPath);
    if (group) {
      group.hosts.push(host);
      await this.saveConfig(config);
    }
  }

  async updateHost(groupPath: number[], hostIndex: number, host: SSHHost): Promise<void> {
    const config = await this.loadConfig();
    const group = this.getGroupByPath(config, groupPath);
    if (group && group.hosts[hostIndex]) {
      group.hosts[hostIndex] = host;
      await this.saveConfig(config);
    }
  }

  async deleteHost(groupPath: number[], hostIndex: number): Promise<void> {
    const config = await this.loadConfig();
    const group = this.getGroupByPath(config, groupPath);
    if (group && group.hosts[hostIndex]) {
      group.hosts.splice(hostIndex, 1);
      await this.saveConfig(config);
    }
  }

  async deleteGroup(groupPath: number[]): Promise<void> {
    const config = await this.loadConfig();
    if (groupPath.length === 1) {
      // Deleting a top-level group
      if (config.groups[groupPath[0]]) {
        config.groups.splice(groupPath[0], 1);
        await this.saveConfig(config);
      }
    } else {
      // Deleting a nested group
      const parentPath = groupPath.slice(0, -1);
      const groupIndex = groupPath[groupPath.length - 1];
      const parentGroup = this.getGroupByPath(config, parentPath);
      if (parentGroup && parentGroup.groups && parentGroup.groups[groupIndex]) {
        parentGroup.groups.splice(groupIndex, 1);
        await this.saveConfig(config);
      }
    }
  }

  private getGroupByPath(config: SSHConfig, groupPath: number[]): SSHGroup | null {
    let currentGroups = config.groups;
    let group: SSHGroup | null = null;

    for (const index of groupPath) {
      if (!currentGroups[index]) {
        return null;
      }
      group = currentGroups[index];
      currentGroups = group.groups || [];
    }

    return group;
  }

  getConfigFilePath(): string {
    return this.configPath;
  }
}