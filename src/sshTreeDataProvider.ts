import * as vscode from 'vscode';
import { SSHConfigManager } from './sshConfigManager';
import { SSHConfig, SSHGroup, SSHHost, SSHTreeItem } from './types';

export class SSHTreeDataProvider implements vscode.TreeDataProvider<SSHTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SSHTreeItem | undefined | null | void> = new vscode.EventEmitter<SSHTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SSHTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private configManager: SSHConfigManager) {
    this.configManager.onDidChangeConfig(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SSHTreeItem): vscode.TreeItem {
    if (element.type === 'group') {
      const group = element.group!;
      const treeItem = new vscode.TreeItem(group.name, vscode.TreeItemCollapsibleState.Expanded);
      treeItem.contextValue = 'sshGroup';
      treeItem.iconPath = new vscode.ThemeIcon('server-environment');
      treeItem.tooltip = `Group: ${group.name}`;
      return treeItem;
    } else {
      const host = element.host!;
      const group = element.group!;
      const treeItem = new vscode.TreeItem(host.name, vscode.TreeItemCollapsibleState.None);
      treeItem.contextValue = 'sshServer';
      treeItem.iconPath = new vscode.ThemeIcon('server');
      
      const user = host.user || group.defaultUser || 'root';
      const port = host.port || group.defaultPort || 22;
      const preferredAuth = host.preferredAuthentication || group.defaultPreferredAuthentication;
      
      treeItem.description = `${user}@${host.hostName}:${port}`;
      treeItem.tooltip = `${host.name}\nHost: ${host.hostName}\nUser: ${user}\nPort: ${port}`;
      
      if (preferredAuth) {
        treeItem.tooltip += `\nAuth: ${preferredAuth}`;
      }
      
      return treeItem;
    }
  }

  async getChildren(element?: SSHTreeItem): Promise<SSHTreeItem[]> {
    if (!element) {
      // Root level - return groups
      const config = await this.configManager.loadConfig();
      return config.groups.map((group, index) => ({
        type: 'group',
        group,
        groupIndex: index
      }));
    } else if (element.type === 'group') {
      // Group level - return hosts
      const group = element.group!;
      return group.hosts.map((host, index) => ({
        type: 'host',
        group: element.group,
        host,
        groupIndex: element.groupIndex,
        hostIndex: index
      }));
    }
    
    return [];
  }
}