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

  async addGroup(group: SSHGroup): Promise<void> {
    const config = await this.loadConfig();
    config.groups.push(group);
    await this.saveConfig(config);
  }

  async addHost(groupIndex: number, host: SSHHost): Promise<void> {
    const config = await this.loadConfig();
    if (config.groups[groupIndex]) {
      config.groups[groupIndex].hosts.push(host);
      await this.saveConfig(config);
    }
  }

  async updateHost(groupIndex: number, hostIndex: number, host: SSHHost): Promise<void> {
    const config = await this.loadConfig();
    if (config.groups[groupIndex] && config.groups[groupIndex].hosts[hostIndex]) {
      config.groups[groupIndex].hosts[hostIndex] = host;
      await this.saveConfig(config);
    }
  }

  async deleteHost(groupIndex: number, hostIndex: number): Promise<void> {
    const config = await this.loadConfig();
    if (config.groups[groupIndex] && config.groups[groupIndex].hosts[hostIndex]) {
      config.groups[groupIndex].hosts.splice(hostIndex, 1);
      await this.saveConfig(config);
    }
  }

  async deleteGroup(groupIndex: number): Promise<void> {
    const config = await this.loadConfig();
    if (config.groups[groupIndex]) {
      config.groups.splice(groupIndex, 1);
      await this.saveConfig(config);
    }
  }

  getConfigFilePath(): string {
    return this.configPath;
  }
}