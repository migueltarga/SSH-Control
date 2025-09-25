import * as vscode from 'vscode';
import { SSHHost, SSHGroup } from './types';
import { resolveHostSettings } from './inheritance';

export class SSHConnectionManager {
  private activeConnections: Map<string, vscode.Terminal> = new Map();

  async connectToHost(host: SSHHost, groupChain: SSHGroup[]): Promise<void> {
    const resolvedSettings = resolveHostSettings(host, groupChain);
    const { user, port, identityFile } = resolvedSettings;

    // Build SSH command
    let sshCommand = `ssh ${user}@${host.hostName} -p ${port}`;
    
    if (identityFile && identityFile.trim()) {
      const expandedPath = identityFile.startsWith('~') 
        ? identityFile.replace('~', require('os').homedir())
        : identityFile;
      sshCommand += ` -i "${expandedPath}"`;
    }

    // Create unique terminal name with timestamp for multiple sessions
    const timestamp = new Date().toLocaleTimeString();
    const terminalName = `SSH: ${host.name} (${timestamp})`;

    // Create terminal in editor tab area (not in terminal panel)
    const terminal = vscode.window.createTerminal({
      name: terminalName,
      iconPath: new vscode.ThemeIcon('server'),
      location: vscode.TerminalLocation.Editor
    });

    terminal.show();
    terminal.sendText(sshCommand);

    // Store connection for management
    const connectionKey = `${host.hostName}:${port}:${user}:${Date.now()}`;
    this.activeConnections.set(connectionKey, terminal);

    // Clean up when terminal is closed
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      for (const [key, terminal] of this.activeConnections.entries()) {
        if (terminal === closedTerminal) {
          this.activeConnections.delete(key);
          break;
        }
      }
    });
  }

  getActiveConnections(): Map<string, vscode.Terminal> {
    return this.activeConnections;
  }

  async disconnectAll(): Promise<void> {
    for (const terminal of this.activeConnections.values()) {
      terminal.dispose();
    }
    this.activeConnections.clear();
  }
}