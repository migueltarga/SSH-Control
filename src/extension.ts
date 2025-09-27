import * as vscode from 'vscode';
import { SSHConfigManager } from './sshConfigManager';
import { SSHTreeDataProvider } from './sshTreeDataProvider';
import { SSHConnectionManager } from './sshConnectionManager';
import { RemoteHostsService } from './remoteHostsService';
import { SSHHostHistoryProvider, HostHistoryTreeItem } from './sshHostHistoryProvider';
import { SSHTreeItem } from './types';
import { showAddGroupDialog, showAddHostDialog, showEditHostDialog } from './dialogs';
import { getGroupChain } from './inheritance';
import { SnippetService } from './snippetService';
import { SnippetMenuManager } from './snippetMenuManager';

export function activate(context: vscode.ExtensionContext) {
	const configManager = new SSHConfigManager();
	const remoteHostsService = new RemoteHostsService();
	const treeDataProvider = new SSHTreeDataProvider(configManager, remoteHostsService);
	const connectionManager = new SSHConnectionManager();
	const hostHistoryProvider = new SSHHostHistoryProvider(context);
	const snippetService = new SnippetService(configManager, hostHistoryProvider);
	const snippetMenuManager = new SnippetMenuManager(context, snippetService);

	const treeView = vscode.window.createTreeView('sshServers', {
		treeDataProvider: treeDataProvider
	});

	const hostHistoryView = vscode.window.createTreeView('sshHostHistory', {
		treeDataProvider: hostHistoryProvider
	});

	const refreshCommand = vscode.commands.registerCommand('sshServers.refresh', () => {
		remoteHostsService.clearCache();
		treeDataProvider.refresh();
	});

	const connectSelectedCommand = vscode.commands.registerCommand('sshServers.connectSelected', async () => {
		const selection = treeView.selection;
		if (selection.length > 0) {
			const item = selection[0];
			if (item.type === 'host' && item.host && item.groupPath) {
				try {
					const config = await configManager.loadConfig();
					const groupChain = getGroupChain(config, item.groupPath);
					await connectionManager.connectToHost(item.host, groupChain);
					vscode.window.showInformationMessage(`Connecting to ${item.host.name}...`);
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to connect to ${item.host.name}: ${error}`);
				}
			}
		}
	});

	const cacheInfoCommand = vscode.commands.registerCommand('sshServers.cacheInfo', async () => {
		const cacheInfo = remoteHostsService.getCacheInfo();
		if (cacheInfo.length === 0) {
			vscode.window.showInformationMessage('No remote data cached.');
		} else {
			const infoMessage = cacheInfo.map(info => 
				`URL: ${info.url}\nHosts: ${info.hostsCount}\nGroups: ${info.groupsCount}\nAge: ${info.age}s`
			).join('\n\n');
			vscode.window.showInformationMessage(`Remote Data Cache:\n\n${infoMessage}`);
		}
	});

	const connectCommand = vscode.commands.registerCommand('sshServers.connect', async (item: SSHTreeItem) => {
		if (item.type === 'host' && item.host && item.groupPath) {
			try {
				const config = await configManager.loadConfig();
				const groupChain = getGroupChain(config, item.groupPath);
				await connectionManager.connectToHost(item.host, groupChain);
				vscode.window.showInformationMessage(`Connecting to ${item.host.name}...`);

				hostHistoryProvider.setCurrentHost(item.host.name);
				await vscode.commands.executeCommand('setContext', 'sshControl.hostConnected', true);
				
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to connect to ${item.host.name}: ${error}`);
			}
		}
	});

	const addGroupCommand = vscode.commands.registerCommand('sshServers.addGroup', async () => {
		const group = await showAddGroupDialog();
		if (group) {
			try {
				await configManager.addGroup(group);
				vscode.window.showInformationMessage(`Group "${group.name}" added successfully!`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to add group: ${error}`);
			}
		}
	});

	const addChildGroupCommand = vscode.commands.registerCommand('sshServers.addChildGroup', async (item: SSHTreeItem) => {
		if (item && item.type === 'group' && item.groupPath) {
			const group = await showAddGroupDialog();
			if (group) {
				try {
					await configManager.addGroup(group, item.groupPath);
					vscode.window.showInformationMessage(`Child group "${group.name}" added successfully!`);
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to add child group: ${error}`);
				}
			}
		}
	});

	const addServerCommand = vscode.commands.registerCommand('sshServers.addServer', async (item: SSHTreeItem) => {
		if (item && item.type === 'group' && item.groupPath) {
			const config = await configManager.loadConfig();
			const groupChain = getGroupChain(config, item.groupPath);
			const group = item.group;

			const host = await showAddHostDialog(group);
			if (host) {
				try {
					await configManager.addHost(item.groupPath, host);
					vscode.window.showInformationMessage(`Server "${host.name}" added successfully!`);
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to add server: ${error}`);
				}
			}
		}
	});

	const editServerCommand = vscode.commands.registerCommand('sshServers.editServer', async (item: SSHTreeItem) => {
		if (item.type === 'host' && item.host && item.groupPath && item.hostIndex !== undefined) {
			const updatedHost = await showEditHostDialog(item.host, item.group);
			if (updatedHost) {
				try {
					await configManager.updateHost(item.groupPath, item.hostIndex, updatedHost);
					vscode.window.showInformationMessage(`Server "${updatedHost.name}" updated successfully!`);
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to update server: ${error}`);
				}
			}
		}
	});

	const deleteServerCommand = vscode.commands.registerCommand('sshServers.deleteServer', async (item: SSHTreeItem) => {
		if (item.type === 'host' && item.host && item.groupPath && item.hostIndex !== undefined) {
			const result = await vscode.window.showWarningMessage(
				`Are you sure you want to delete "${item.host.name}"?`,
				{ modal: true },
				'Delete'
			);
			
			if (result === 'Delete') {
				try {
					await configManager.deleteHost(item.groupPath, item.hostIndex);
					vscode.window.showInformationMessage(`Server "${item.host.name}" deleted successfully!`);
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to delete server: ${error}`);
				}
			}
		}
	});

	const deleteGroupCommand = vscode.commands.registerCommand('sshServers.deleteGroup', async (item: SSHTreeItem) => {
		if (item.type === 'group' && item.group && item.groupPath) {
			const result = await vscode.window.showWarningMessage(
				`Are you sure you want to delete group "${item.group.name}" and all its servers?`,
				{ modal: true },
				'Delete'
			);
			
			if (result === 'Delete') {
				try {
					await configManager.deleteGroup(item.groupPath);
					vscode.window.showInformationMessage(`Group "${item.group.name}" deleted successfully!`);
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to delete group: ${error}`);
				}
			}
		}
	});

	const openConfigCommand = vscode.commands.registerCommand('sshServers.openConfig', async () => {
		const configPath = configManager.getConfigFilePath();
		try {
			const document = await vscode.workspace.openTextDocument(configPath);
			await vscode.window.showTextDocument(document);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open config file: ${error}`);
		}
	});

	const hostHistoryRefreshCommand = vscode.commands.registerCommand('sshHostHistory.refresh', () => {
		hostHistoryProvider.refresh();
	});

	const hostHistoryRunCommandCommand = vscode.commands.registerCommand('sshHostHistory.runCommand', async () => {
		await hostHistoryProvider.runCustomCommand();
	});

	const hostHistoryGrepCommand = vscode.commands.registerCommand('sshHostHistory.grep', async () => {
		await hostHistoryProvider.runGrepSearch();
	});

	const hostHistoryCopyCommand = vscode.commands.registerCommand('sshHostHistory.copyCommand', (item: HostHistoryTreeItem) => {
		if (item.historyCommand) {
			hostHistoryProvider.copyCommand(item.historyCommand.command);
		}
	});

	const hostHistoryRunHistoryCommand = vscode.commands.registerCommand('sshHostHistory.runHistoryCommand', (item: HostHistoryTreeItem) => {
		if (item.historyCommand) {
			hostHistoryProvider.runCommand(item.historyCommand.command);
		}
	});

	const hostHistorySearchCommand = vscode.commands.registerCommand('sshHostHistory.showSearchInput', async () => {
		await hostHistoryProvider.showSearchInput();
	});

	const hostHistoryClearFilterCommand = vscode.commands.registerCommand('sshHostHistory.clearFilter', () => {
		hostHistoryProvider.clearFilter();
	});

	const runSnippetCommand = vscode.commands.registerCommand('sshControl.runSnippet', async () => {
		try {
			await snippetService.showSnippetPicker();
		} catch (error) {
			console.error('SSH Control: Error in runSnippet:', error);
			vscode.window.showErrorMessage(`Snippet error: ${error}`);
		}
	});

	context.subscriptions.push(
		treeView,
		hostHistoryView,
		refreshCommand,
		connectSelectedCommand,
		cacheInfoCommand,
		connectCommand,
		addGroupCommand,
		addChildGroupCommand,
		addServerCommand,
		editServerCommand,
		deleteServerCommand,
		deleteGroupCommand,
		openConfigCommand,
		hostHistoryRefreshCommand,
		hostHistoryRunCommandCommand,
		hostHistoryGrepCommand,
		hostHistoryCopyCommand,
		hostHistoryRunHistoryCommand,
		hostHistorySearchCommand,
		hostHistoryClearFilterCommand,
		runSnippetCommand
	);
	vscode.window.showInformationMessage(`SSH Control loaded. Config file: ${configManager.getConfigFilePath()}`);
}

export function deactivate() {}
