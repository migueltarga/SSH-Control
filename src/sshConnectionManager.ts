import * as vscode from 'vscode';
import { SSHHost, SSHGroup } from './types';
import { resolveHostSettings } from './inheritance';

export class SSHConnectionManager {
  private activeConnections: Map<string, vscode.Terminal> = new Map();
  private activeTerminalNumbers: Map<string, Set<number>> = new Map(); 
  private terminalToKey: Map<vscode.Terminal, string> = new Map();

  constructor() {
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      this.handleTerminalClose(closedTerminal);
    });
  }

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

    const groupHierarchy = groupChain.length > 0 
      ? groupChain.map(g => g.name).join(' | ') + ' | '
      : '';

    const baseTerminalName = `SSH: ${groupHierarchy}${host.name}`;
    
    if (!this.activeTerminalNumbers.has(baseTerminalName)) {
      this.activeTerminalNumbers.set(baseTerminalName, new Set<number>());
    }
    const activeNumbers = this.activeTerminalNumbers.get(baseTerminalName)!;
    
    const maxExistingNumber = activeNumbers.size > 0 ? Math.max(...Array.from(activeNumbers)) : 0;
    const nextNumber = maxExistingNumber + 1;
    
    activeNumbers.add(nextNumber);
    
    const terminalName = (nextNumber === 1 && activeNumbers.size === 1)
      ? baseTerminalName 
      : `${baseTerminalName} (${nextNumber})`;
    
    const terminalKey = `${baseTerminalName}|||${nextNumber}`;

    // Create terminal in editor tab area (not in terminal panel)
    const terminal = vscode.window.createTerminal({
      name: terminalName,
      iconPath: new vscode.ThemeIcon('server'),
      location: vscode.TerminalLocation.Editor
    });

    terminal.show();
    terminal.sendText(sshCommand);

    // Store connection for management
    this.activeConnections.set(terminalKey, terminal);
    this.terminalToKey.set(terminal, terminalKey);
  }

  private handleTerminalClose(closedTerminal: vscode.Terminal): void {
    const terminalKey = this.terminalToKey.get(closedTerminal);
    if (!terminalKey) {
      return; 
    }

    this.activeConnections.delete(terminalKey);
    this.terminalToKey.delete(closedTerminal);
    
    const parts = terminalKey.split('|||');
    const baseName = parts[0];
    const numberStr = parts[1];
    const number = parseInt(numberStr);
    
    const activeNumbers = this.activeTerminalNumbers.get(baseName);
    if (activeNumbers) {
      activeNumbers.delete(number);
      
      if (activeNumbers.size === 0) {
        this.activeTerminalNumbers.delete(baseName);
      }
    }
  }

  getActiveConnections(): Map<string, vscode.Terminal> {
    return this.activeConnections;
  }

  async disconnectAll(): Promise<void> {
    for (const terminal of this.activeConnections.values()) {
      terminal.dispose();
    }
    this.activeConnections.clear();
    this.activeTerminalNumbers.clear();
    this.terminalToKey.clear();
  }
}