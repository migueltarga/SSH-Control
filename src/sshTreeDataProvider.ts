import * as vscode from 'vscode';
import { SSHConfigManager } from './sshConfigManager';
import { SSHConfig, SSHGroup, SSHHost, SSHTreeItem } from './types';
import { resolveHostSettings, getGroupChain } from './inheritance';

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

  getTreeItem(element: SSHTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element.type === 'group') {
      const group = element.group!;
      const treeItem = new vscode.TreeItem(group.name, vscode.TreeItemCollapsibleState.Expanded);
      treeItem.contextValue = 'sshGroup';
      treeItem.iconPath = new vscode.ThemeIcon('server-environment');
      treeItem.tooltip = `Group: ${group.name}`;
      return treeItem;
    } else {
      const host = element.host!;
      
      // Return a promise for async processing
      return this.configManager.loadConfig().then(config => {
        const treeItem = new vscode.TreeItem(host.name, vscode.TreeItemCollapsibleState.None);
        treeItem.contextValue = 'sshServer';
        treeItem.iconPath = new vscode.ThemeIcon('server');
        
        // Get the full group chain for inheritance
        const groupChain = getGroupChain(config, element.groupPath || []);
        const resolvedSettings = resolveHostSettings(host, groupChain);
        
        treeItem.description = `${resolvedSettings.user}@${host.hostName}:${resolvedSettings.port}`;
        treeItem.tooltip = `${host.name}\nHost: ${host.hostName}\nUser: ${resolvedSettings.user}\nPort: ${resolvedSettings.port}`;
        
        if (resolvedSettings.preferredAuthentication) {
          treeItem.tooltip += `\nAuth: ${resolvedSettings.preferredAuthentication}`;
        }
        
        if (resolvedSettings.identityFile) {
          treeItem.tooltip += `\nKey: ${resolvedSettings.identityFile}`;
        }
        
        return treeItem;
      });
    }
  }

  async getChildren(element?: SSHTreeItem): Promise<SSHTreeItem[]> {
    if (!element) {
      // Root level - return top-level groups
      const config = await this.configManager.loadConfig();
      return config.groups.map((group, index) => ({
        type: 'group',
        group,
        groupIndex: index,
        groupPath: [index]
      }));
    } else if (element.type === 'group') {
      const group = element.group!;
      const items: SSHTreeItem[] = [];
      
      // Add nested groups first
      if (group.groups) {
        group.groups.forEach((nestedGroup, index) => {
          items.push({
            type: 'group',
            group: nestedGroup,
            parentGroup: group,
            groupIndex: index,
            groupPath: [...(element.groupPath || []), index]
          });
        });
      }
      
      // Then add hosts
      group.hosts.forEach((host, index) => {
        items.push({
          type: 'host',
          group: element.group,
          host,
          groupIndex: element.groupIndex,
          hostIndex: index,
          groupPath: element.groupPath
        });
      });
      
      return items;
    }
    
    return [];
  }
}