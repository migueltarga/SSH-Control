import * as vscode from 'vscode';
import { SSHConfigManager } from './sshConfigManager';
import { SSHConfig, SSHGroup, SSHHost, SSHTreeItem } from './types';
import { resolveHostSettings, getGroupChain } from './inheritance';
import { RemoteHostsService } from './remoteHostsService';

export class SSHTreeDataProvider implements vscode.TreeDataProvider<SSHTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SSHTreeItem | undefined | null | void> = new vscode.EventEmitter<SSHTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SSHTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private configManager: SSHConfigManager, private remoteHostsService: RemoteHostsService) {
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
      
      treeItem.iconPath = new vscode.ThemeIcon('folder-opened', new vscode.ThemeColor('charts.purple'));
      treeItem.tooltip = `Group: ${group.name}`;
      
      const hostCount = group.hosts?.length || 0;
      const groupCount = group.groups?.length || 0;
      if (hostCount > 0 || groupCount > 0) {
        treeItem.description = `${hostCount} hosts${groupCount > 0 ? `, ${groupCount} groups` : ''}`;
      }
      
      return treeItem;
    } else {
      const host = element.host!;

      return this.configManager.loadConfig().then(config => {
        const treeItem = new vscode.TreeItem(host.name, vscode.TreeItemCollapsibleState.None);
        treeItem.contextValue = 'sshServer';

        const groupChain = getGroupChain(config, element.groupPath || []);
        const resolvedSettings = resolveHostSettings(host, groupChain);
        
        let iconColor = 'charts.green';
        
        if (resolvedSettings.preferredAuthentication === 'publickey') {
          iconColor = 'charts.blue';
        } else if (resolvedSettings.preferredAuthentication === 'password') {
          iconColor = 'charts.orange';
        }
        
        let iconName = 'server';
        if (resolvedSettings.port !== 22) {
          iconName = 'server-process';
          iconColor = 'charts.yellow';
        }
        
        treeItem.iconPath = new vscode.ThemeIcon(iconName, new vscode.ThemeColor(iconColor));
        
        treeItem.description = `${resolvedSettings.user}@${host.hostName}:${resolvedSettings.port}`;
        
        treeItem.tooltip = `${host.name}\n` +
                          `Host: ${host.hostName}\n` +
                          `User: ${resolvedSettings.user}\n` +
                          `Port: ${resolvedSettings.port}`;
        
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

      const config = await this.configManager.loadConfig();
      if (!config || !config.groups || !Array.isArray(config.groups)) {
        return [];
      }
      return config.groups.map((group, index) => ({
        type: 'group',
        group,
        groupIndex: index,
        groupPath: [index]
      }));
    } else if (element.type === 'group') {
      const group = element.group!;
      const items: SSHTreeItem[] = [];

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

      if (group.remoteHosts) {
        try {
          const remoteData = await this.remoteHostsService.fetchRemoteData(group.remoteHosts);
          
          if (remoteData.hosts) {
            remoteData.hosts.forEach((host, index) => {
              items.push({
                type: 'host',
                group: element.group,
                host: host,
                groupIndex: element.groupIndex,
                hostIndex: group.hosts.length + index,
                groupPath: element.groupPath
              });
            });
          }

          if (remoteData.groups) {
            const localGroupsCount = group.groups?.length || 0;
            remoteData.groups.forEach((remoteGroup, index) => {
              items.push({
                type: 'group',
                group: remoteGroup,
                parentGroup: group,
                groupIndex: localGroupsCount + index,
                groupPath: [...(element.groupPath || []), localGroupsCount + index]
              });
            });
          }
        } catch (error) {

          items.push({
            type: 'host',
            group: element.group,
            host: {
              hostName: 'error',
              name: `Failed to load remote data: ${error}`
            },
            groupIndex: element.groupIndex,
            hostIndex: -1,
            groupPath: element.groupPath
          });
        }
      }
      
      return items;
    }
    
    return [];
  }
}