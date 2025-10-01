import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SSHConfig, SSHGroup, SSHHost } from './types';

export class SSHConfigManager {
  private readonly globalConfigPath: string;
  private readonly workspaceConfigPath: string | null;
  private _onDidChangeConfig: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeConfig: vscode.Event<void> = this._onDidChangeConfig.event;

  constructor() {
    this.globalConfigPath = path.join(os.homedir(), '.ssh-control', 'ssh-config.json');
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    this.workspaceConfigPath = workspaceFolder 
      ? path.join(workspaceFolder.uri.fsPath, 'ssh-config.json')
      : null;
  }

  private hasWorkspaceConfig(): boolean {
    return this.workspaceConfigPath !== null && fs.existsSync(this.workspaceConfigPath);
  }

  private getSaveConfigPath(): string {
    return this.hasWorkspaceConfig() ? this.workspaceConfigPath! : this.globalConfigPath;
  }

  private getDefaultConfig(): SSHConfig {
    return {
      groups: [
        {
          name: "Default",
          defaultUser: "root",
          defaultPort: 22,
          defaultIdentityFile: "",
          snippets: [
            {
              name: "System Status",
              command: "uname -a && uptime && df -h"
            },
            {
              name: "Process Monitor",
              command: "top -n 1 | head -20"
            }
          ],
          hosts: []
        }
      ]
    };
  }

  private async ensureConfigExists(): Promise<void> {
    const globalConfigDir = path.dirname(this.globalConfigPath);
    if (!fs.existsSync(globalConfigDir)) {
      fs.mkdirSync(globalConfigDir, { recursive: true });
    }

    if (!fs.existsSync(this.globalConfigPath) && !this.hasWorkspaceConfig()) {
      await this.saveConfig(this.getDefaultConfig());
    }
  }

  private mergeConfigs(globalConfig: SSHConfig, workspaceConfig: SSHConfig): SSHConfig {
    const workspaceGroups = workspaceConfig.groups.map(group => ({
      ...group,
      name: `[Workspace] ${group.name}`
    }));

    return {
      groups: [...globalConfig.groups, ...workspaceGroups]
    };
  }

  private loadConfigFile(filePath: string): SSHConfig | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const configData = fs.readFileSync(filePath, 'utf8');
      return this.validateAndNormalizeConfig(JSON.parse(configData));
    } catch (error) {
      console.error(`Failed to load config from ${filePath}:`, error);
      return null;
    }
  }

  async loadConfig(): Promise<SSHConfig> {
    await this.ensureConfigExists();
    
    try {
      const globalConfig = this.loadConfigFile(this.globalConfigPath) || { groups: [] };
      
      if (this.hasWorkspaceConfig()) {
        const workspaceConfig = this.loadConfigFile(this.workspaceConfigPath!);
        if (workspaceConfig) {
          return this.mergeConfigs(globalConfig, workspaceConfig);
        }
      }

      return globalConfig;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load SSH config: ${error}`);
      return { groups: [] };
    }
  }

  private validateAndNormalizeConfig(config: any): SSHConfig {
    if (!config || typeof config !== 'object') {
      return { groups: [] };
    }

    const normalizedConfig: SSHConfig = {
      groups: Array.isArray(config.groups) ? config.groups.map(this.validateAndNormalizeGroup) : []
    };

    return normalizedConfig;
  }

  private validateAndNormalizeGroup = (group: any): SSHGroup => {
    if (!group || typeof group !== 'object' || !group.name) {
      throw new Error('Invalid group structure');
    }

    return {
      name: group.name,
      defaultUser: group.defaultUser,
      defaultPort: group.defaultPort,
      defaultIdentityFile: group.defaultIdentityFile,
      defaultPreferredAuthentication: group.defaultPreferredAuthentication,
      snippets: Array.isArray(group.snippets) ? group.snippets : undefined,
      hosts: Array.isArray(group.hosts) ? group.hosts : [],
      groups: Array.isArray(group.groups) ? group.groups.map(this.validateAndNormalizeGroup) : undefined,
      remoteHosts: group.remoteHosts
    };
  };

  async saveConfig(config: SSHConfig): Promise<void> {
    try {
      const configData = JSON.stringify(config, null, 2);
      const targetPath = this.getSaveConfigPath();
      fs.writeFileSync(targetPath, configData, 'utf8');
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

      if (config.groups[groupPath[0]]) {
        config.groups.splice(groupPath[0], 1);
        await this.saveConfig(config);
      }
    } else {

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
    const paths = [];
    if (this.hasWorkspaceConfig()) {
      paths.push(`Workspace: ${this.workspaceConfigPath}`);
    }
    paths.push(`Global: ${this.globalConfigPath}`);
    return paths.join(' | ');
  }

  getConfigFilePathForEditing(): string {
    return this.getSaveConfigPath();
  }
}