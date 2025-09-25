import * as vscode from 'vscode';
import { SSHConfigManager } from './sshConfigManager';
import { SSHTreeDataProvider } from './sshTreeDataProvider';
import { SSHConnectionManager } from './sshConnectionManager';
import { SSHTreeItem } from './types';
import { showAddGroupDialog, showAddHostDialog, showEditHostDialog } from './dialogs';
import { getGroupChain } from './inheritance';

export function activate(context: vscode.ExtensionContext) {
	console.log('SSH Control extension is now active!');

	// Initialize managers
	const configManager = new SSHConfigManager();
	const treeDataProvider = new SSHTreeDataProvider(configManager);
	const connectionManager = new SSHConnectionManager();

	// Register tree view
	const treeView = vscode.window.createTreeView('sshServers', {
		treeDataProvider: treeDataProvider
	});

	// Handle double-click to connect
	treeView.onDidChangeSelection(async (event) => {
		if (event.selection.length > 0) {
			const item = event.selection[0];
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

	// Register commands
	const refreshCommand = vscode.commands.registerCommand('sshServers.refresh', () => {
		treeDataProvider.refresh();
	});

	const connectCommand = vscode.commands.registerCommand('sshServers.connect', async (item: SSHTreeItem) => {
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

	// Add all commands to subscriptions
	context.subscriptions.push(
		treeView,
		refreshCommand,
		connectCommand,
		addGroupCommand,
		addServerCommand,
		editServerCommand,
		deleteServerCommand,
		deleteGroupCommand,
		openConfigCommand
	);

	// Show initial configuration file location
	vscode.window.showInformationMessage(`SSH Control loaded. Config file: ${configManager.getConfigFilePath()}`);
}

export function deactivate() {}
