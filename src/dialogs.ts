import * as vscode from 'vscode';
import { SSHHost, SSHGroup } from './types';

export async function showAddGroupDialog(): Promise<SSHGroup | undefined> {
  const name = await vscode.window.showInputBox({
    prompt: 'Enter group name',
    placeHolder: 'e.g., Development, Production'
  });

  if (!name) {
    return undefined;
  }

  const defaultUser = await vscode.window.showInputBox({
    prompt: 'Enter default user (optional)',
    placeHolder: 'e.g., root, ubuntu',
    value: 'root'
  });

  const defaultPortStr = await vscode.window.showInputBox({
    prompt: 'Enter default port (optional)',
    placeHolder: '22',
    value: '22'
  });

  const defaultIdentityFile = await vscode.window.showInputBox({
    prompt: 'Enter default identity file path (optional)',
    placeHolder: 'e.g., ~/.ssh/id_rsa'
  });

  const defaultPreferredAuth = await vscode.window.showQuickPick(
    [
      { label: 'publickey', description: 'Use SSH key authentication by default' },
      { label: 'password', description: 'Use password authentication by default' }
    ],
    {
      placeHolder: 'Choose default authentication method (optional)'
    }
  );

  const defaultPort = defaultPortStr ? parseInt(defaultPortStr) : 22;

  return {
    name,
    defaultUser: defaultUser || undefined,
    defaultPort: defaultPort || undefined,
    defaultIdentityFile: defaultIdentityFile || undefined,
    defaultPreferredAuthentication: defaultPreferredAuth?.label as 'publickey' | 'password' | undefined,
    hosts: []
  };
}

export async function showAddHostDialog(group?: SSHGroup): Promise<SSHHost | undefined> {
  const name = await vscode.window.showInputBox({
    prompt: 'Enter server name',
    placeHolder: 'e.g., Production Server 1'
  });

  if (!name) {
    return undefined;
  }

  const hostName = await vscode.window.showInputBox({
    prompt: 'Enter hostname or IP address',
    placeHolder: 'e.g., example.com, 192.168.1.100'
  });

  if (!hostName) {
    return undefined;
  }

  const user = await vscode.window.showInputBox({
    prompt: 'Enter username (optional, uses group default if empty)',
    placeHolder: group?.defaultUser || 'root'
  });

  const portStr = await vscode.window.showInputBox({
    prompt: 'Enter port (optional, uses group default if empty)',
    placeHolder: group?.defaultPort?.toString() || '22'
  });

  const preferredAuth = await vscode.window.showQuickPick(
    [
      { label: 'publickey', description: 'Use SSH key authentication' },
      { label: 'password', description: 'Use password authentication' }
    ],
    {
      placeHolder: 'Choose authentication method (optional)'
    }
  );

  let identityFile: string | undefined;
  if (preferredAuth?.label === 'publickey') {
    identityFile = await vscode.window.showInputBox({
      prompt: 'Enter SSH key file path',
      placeHolder: group?.defaultIdentityFile || '~/.ssh/id_rsa'
    });
  }

  const port = portStr ? parseInt(portStr) : undefined;

  return {
    name,
    hostName,
    user: user || undefined,
    port: port || undefined,
    identityFile: identityFile || undefined,
    preferredAuthentication: preferredAuth?.label as 'publickey' | 'password' | undefined
  };
}

export async function showEditHostDialog(existingHost: SSHHost, group?: SSHGroup): Promise<SSHHost | undefined> {
  const name = await vscode.window.showInputBox({
    prompt: 'Enter server name',
    value: existingHost.name
  });

  if (!name) {
    return undefined;
  }

  const hostName = await vscode.window.showInputBox({
    prompt: 'Enter hostname or IP address',
    value: existingHost.hostName
  });

  if (!hostName) {
    return undefined;
  }

  const user = await vscode.window.showInputBox({
    prompt: 'Enter username (optional, uses group default if empty)',
    value: existingHost.user,
    placeHolder: group?.defaultUser || 'root'
  });

  const portStr = await vscode.window.showInputBox({
    prompt: 'Enter port (optional, uses group default if empty)',
    value: existingHost.port?.toString(),
    placeHolder: group?.defaultPort?.toString() || '22'
  });

  const preferredAuth = await vscode.window.showQuickPick(
    [
      { label: 'publickey', description: 'Use SSH key authentication' },
      { label: 'password', description: 'Use password authentication' }
    ],
    {
      placeHolder: 'Choose authentication method (optional)'
    }
  );

  let identityFile: string | undefined;
  if (preferredAuth?.label === 'publickey') {
    identityFile = await vscode.window.showInputBox({
      prompt: 'Enter SSH key file path',
      value: existingHost.identityFile,
      placeHolder: group?.defaultIdentityFile || '~/.ssh/id_rsa'
    });
  } else if (existingHost.preferredAuthentication === 'publickey' && !preferredAuth) {
    // Keep existing identity file if user didn't change auth method but had publickey before
    identityFile = existingHost.identityFile;
  }

  const port = portStr ? parseInt(portStr) : undefined;

  return {
    name,
    hostName,
    user: user || undefined,
    port: port || undefined,
    identityFile: identityFile || undefined,
    preferredAuthentication: preferredAuth?.label as 'publickey' | 'password' | undefined || existingHost.preferredAuthentication
  };
}