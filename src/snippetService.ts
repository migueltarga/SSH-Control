import * as vscode from 'vscode';
import { CommandSnippet, SSHHost, SSHGroup } from './types';
import { aggregateSnippets, getGroupChain } from './inheritance';
import { SSHConfigManager } from './sshConfigManager';
import { SSHHostHistoryProvider } from './sshHostHistoryProvider';

export class SnippetService {
    constructor(
        private configManager: SSHConfigManager,
        private hostHistoryProvider: SSHHostHistoryProvider
    ) {}

    async showSnippetPicker(): Promise<void> {
        const activeTerminal = vscode.window.activeTerminal;
        
        if (!activeTerminal) {
            vscode.window.showWarningMessage('No active terminal found');
            return;
        }

        const snippets = await this.getSnippetsForActiveTerminal();
        
        if (snippets.length === 0) {
            vscode.window.showInformationMessage('No snippets available for this terminal.');
            return;
        }

        const quickPickItems = snippets.map((snippet, index) => ({
            label: `$(play) ${snippet.name}`,
            detail: snippet.command,
            description: `Snippet ${index + 1}`,
            snippet: snippet
        }));

        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: `Select a snippet to run (${snippets.length} available)`,
            matchOnDetail: true,
            matchOnDescription: false
        });

        if (selected) {
            activeTerminal.sendText(selected.snippet.command);
            activeTerminal.show();
        }
    }

    public async getSnippetsForActiveTerminal(): Promise<CommandSnippet[]> {
        const activeTerminal = vscode.window.activeTerminal;
        
        if (!activeTerminal) {
            return [];
        }

        const hostName = this.extractHostFromTerminal(activeTerminal);
        
        if (!hostName) {
            return [];
        }

        try {
            const config = await this.configManager.loadConfig();
            const { host, groupChain } = this.findHostAndGroupChain(config, hostName);
            
            if (!host) {
                return [];
            }

            return aggregateSnippets(host, groupChain);
        } catch (error) {
            console.error('SSH Control: Error loading snippets:', error);
            return [];
        }
    }

    private extractHostFromTerminal(terminal: vscode.Terminal): string | null {
        const sshInfo = SSHHostHistoryProvider.getTerminalSSHInfo(terminal.name);
        if (sshInfo) {
            return sshInfo.hostName;
        }

        if (terminal.name.includes('SSH:')) {
            const sshPart = terminal.name.split('SSH:')[1].trim();
            if (sshPart.includes('|')) {
                const parts = sshPart.split('|');
                return parts[parts.length - 1].trim();
            }
            return sshPart;
        }

        return null;
    }

    private findHostAndGroupChain(config: { groups: SSHGroup[] }, hostName: string): {
        host: SSHHost | null;
        groupChain: SSHGroup[];
    } {
        const result = this.searchHostInGroups(config.groups, hostName, [], config);
        return result || { host: null, groupChain: [] };
    }

    private searchHostInGroups(groups: SSHGroup[], hostName: string, currentPath: number[], rootConfig?: { groups: SSHGroup[] }): {
        host: SSHHost;
        groupChain: SSHGroup[];
    } | null {
        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            const group = groups[groupIndex];
            const groupPath = [...currentPath, groupIndex];

            for (const host of group.hosts) {
                if (host.hostName === hostName || host.name === hostName) {
                    if (rootConfig) {
                        const groupChain = getGroupChain(rootConfig, groupPath);
                        return { host, groupChain };
                    } else {
                        return { host, groupChain: [group] };
                    }
                }
            }

            if (group.groups) {
                const result = this.searchHostInGroups(group.groups, hostName, groupPath, rootConfig);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }
}