import * as vscode from 'vscode';
import * as cp from 'child_process';

export interface HistoryCommand {
    command: string;
    lineNumber: number;
    timestamp?: Date;
    host?: string;
}

export class HostHistoryTreeItem extends vscode.TreeItem {
    constructor(
        public readonly historyCommand: HistoryCommand,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(historyCommand.command, collapsibleState);
        
        this.tooltip = this.createTooltip();
        this.description = this.createDescription();
        this.contextValue = 'historyCommand';
        this.iconPath = new vscode.ThemeIcon('terminal', new vscode.ThemeColor('terminal.ansiCyan'));
    }

    private createTooltip(): string {
        return `${this.historyCommand.command} (Line #${this.historyCommand.lineNumber})`;
    }

    private createDescription(): string {
        return `#${this.historyCommand.lineNumber}`;
    }
}

export class SSHHostHistoryProvider implements vscode.TreeDataProvider<HostHistoryTreeItem | vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HostHistoryTreeItem | undefined | null | void> = new vscode.EventEmitter<HostHistoryTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HostHistoryTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private history: HistoryCommand[] = [];
    private filteredHistory: HistoryCommand[] = [];
    private currentHost: string | null = null;
    private isLoading: boolean = false;
    private searchFilter: string = '';
    private historyCache = new Map<string, HistoryCommand[]>();
    private loadingHosts = new Set<string>();

    constructor(private context: vscode.ExtensionContext) {
        vscode.window.onDidChangeActiveTerminal((terminal) => {
            if (terminal) {
                this.handleActiveTerminalChange(terminal);
            }
        });
        vscode.window.onDidCloseTerminal((closedTerminal) => {
            this.handleTerminalClose(closedTerminal);
        });
    }

    setCurrentHost(host: string): void {
        this.currentHost = host;
        this.refresh();
    }

    getCurrentHost(): string | null {
        return this.currentHost;
    }

    private handleActiveTerminalChange(terminal: vscode.Terminal): void {
        const sshInfo = SSHHostHistoryProvider.getTerminalSSHInfo(terminal.name);
        
        if (sshInfo) {
            const hostName = this.extractFriendlyHostNameFromTerminal(terminal.name);
            
            if (hostName && hostName !== this.currentHost) {
                this.currentHost = hostName;
                this.switchToHostHistory(hostName);
            }
        } else {
            const activeSSHTerminals = SSHHostHistoryProvider.getActiveSSHTerminals();
            if (activeSSHTerminals.length === 0) {
                this.currentHost = null;
                this.history = [];
                this.filteredHistory = [];
                this.searchFilter = '';
                this.historyCache.clear();
                this.loadingHosts.clear();
                vscode.commands.executeCommand('setContext', 'sshControl.hostConnected', false);
                this._onDidChangeTreeData.fire();
            }
        }
    }

    private extractFriendlyHostNameFromTerminal(terminalName: string): string {
        if (terminalName.includes('SSH:')) {
            const sshPart = terminalName.split('SSH:')[1].trim();
            
            if (sshPart.includes('|')) {
                const parts = sshPart.split('|');
                return parts[parts.length - 1].trim();
            } else {
                return sshPart;
            }
        }
        
        return terminalName;
    }

    private handleTerminalClose(closedTerminal: vscode.Terminal): void {
        const friendlyName = this.extractFriendlyHostNameFromTerminal(closedTerminal.name);
        
        SSHHostHistoryProvider.cleanupClosedTerminal(closedTerminal.name);
        
        if (friendlyName) {
            this.historyCache.delete(friendlyName);
            this.loadingHosts.delete(friendlyName);
        }
        
        if (friendlyName === this.currentHost) {
            const remainingSSHTerminals = SSHHostHistoryProvider.getActiveSSHTerminals();
            
            if (remainingSSHTerminals.length > 0) {
                const newTerminalName = remainingSSHTerminals[0];
                const newHostName = this.extractFriendlyHostNameFromTerminal(newTerminalName);
                this.currentHost = newHostName;
                this.switchToHostHistory(newHostName);
            } else {
                this.currentHost = null;
                this.history = [];
                this.filteredHistory = [];
                this.searchFilter = '';
                this.historyCache.clear();
                this.loadingHosts.clear();
                vscode.commands.executeCommand('setContext', 'sshControl.hostConnected', false);
                this._onDidChangeTreeData.fire();
            }
        }
    }

    private switchToHostHistory(hostName: string): void {
        if (this.historyCache.has(hostName)) {
            this.history = this.historyCache.get(hostName)!;
            this.updateFilteredHistory();
            this._onDidChangeTreeData.fire();
        } else if (!this.loadingHosts.has(hostName)) {
            this.loadHistoryForHost(hostName);
        }
    }

    private async loadHistoryForHost(hostName: string): Promise<void> {
        this.loadingHosts.add(hostName);
        this.isLoading = true;
        this._onDidChangeTreeData.fire();

        try {
            const activeTerminals = SSHHostHistoryProvider.getActiveSSHTerminals();
            const terminalName = activeTerminals.find(name => 
                this.extractFriendlyHostNameFromTerminal(name) === hostName
            );

            if (terminalName) {
                await this.fetchHistoryForTerminal(terminalName, hostName);
            } else {
                this.showHistoryFetchError();
            }
        } catch (error) {
            this.showHistoryFetchError();
        } finally {
            this.loadingHosts.delete(hostName);
            this.isLoading = false;
            this._onDidChangeTreeData.fire();
        }
    }

    refresh(): void {
        if (this.currentHost) {
            this.historyCache.delete(this.currentHost);
            this.loadHistoryForHost(this.currentHost);
        }
    }

    async showSearchInput(): Promise<void> {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Search command history',
            placeHolder: 'Enter search term (supports partial matches)',
            value: this.searchFilter
        });

        if (searchTerm !== undefined) {
            this.setSearchFilter(searchTerm);
        }
    }

    setSearchFilter(filter: string): void {
        this.searchFilter = filter.toLowerCase();
        this.updateFilteredHistory();
        this._onDidChangeTreeData.fire();
    }

    clearFilter(): void {
        this.searchFilter = '';
        this.filteredHistory = [];
        this._onDidChangeTreeData.fire();
    }

    private updateFilteredHistory(): void {
        if (!this.searchFilter) {
            this.filteredHistory = [];
            return;
        }

        this.filteredHistory = this.history.filter(cmd => 
            cmd.command.toLowerCase().includes(this.searchFilter)
        );
    }

    getTreeItem(element: HostHistoryTreeItem | vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HostHistoryTreeItem): Thenable<(HostHistoryTreeItem | vscode.TreeItem)[]> {
        if (!element) {
            if (!this.currentHost) {
                const noHostItem = new vscode.TreeItem('No SSH host connected', vscode.TreeItemCollapsibleState.None);
                noHostItem.iconPath = new vscode.ThemeIcon('info');
                noHostItem.tooltip = 'Connect to an SSH server to view its command history';
                return Promise.resolve([noHostItem]);
            }

            if (this.isLoading) {
                const loadingItem = new vscode.TreeItem('Loading history...', vscode.TreeItemCollapsibleState.None);
                loadingItem.iconPath = new vscode.ThemeIcon('loading~spin');
                return Promise.resolve([loadingItem]);
            }

            const items: (HostHistoryTreeItem | vscode.TreeItem)[] = [];

            const searchItem = new vscode.TreeItem('Search History', vscode.TreeItemCollapsibleState.None);
            searchItem.iconPath = new vscode.ThemeIcon('search');
            searchItem.tooltip = 'Click to search/filter command history';
            searchItem.contextValue = 'searchInput';
            searchItem.command = {
                command: 'sshHostHistory.showSearchInput',
                title: 'Search History'
            };
            items.push(searchItem);

            if (this.searchFilter) {
                const filterItem = new vscode.TreeItem(`Filter: "${this.searchFilter}"`, vscode.TreeItemCollapsibleState.None);
                filterItem.iconPath = new vscode.ThemeIcon('filter');
                filterItem.tooltip = 'Click to clear filter';
                filterItem.contextValue = 'activeFilter';
                filterItem.command = {
                    command: 'sshHostHistory.clearFilter',
                    title: 'Clear Filter'
                };
                items.push(filterItem);
            }

            const hostInfoItem = new vscode.TreeItem(`Connected to: ${this.currentHost}`, vscode.TreeItemCollapsibleState.None);
            hostInfoItem.iconPath = new vscode.ThemeIcon('server');
            hostInfoItem.tooltip = `SSH connection to ${this.currentHost}`;
            hostInfoItem.contextValue = 'hostInfo';
            items.push(hostInfoItem);

            const historyToShow = this.searchFilter ? this.filteredHistory : this.history;

            if (historyToShow.length === 0) {
                const emptyMessage = this.searchFilter ? 
                    `No commands match "${this.searchFilter}"` : 
                    'No history found';
                const emptyItem = new vscode.TreeItem(emptyMessage, vscode.TreeItemCollapsibleState.None);
                emptyItem.iconPath = new vscode.ThemeIcon('info');
                emptyItem.tooltip = this.searchFilter ? 
                    'Try a different search term or clear the filter' : 
                    'Run some commands in the terminal to see history';
                items.push(emptyItem);
            } else {

                const historyItems = historyToShow
                    .sort((a, b) => b.lineNumber - a.lineNumber)
                    .map(cmd => new HostHistoryTreeItem(cmd, vscode.TreeItemCollapsibleState.None));
                items.push(...historyItems);
            }

            return Promise.resolve(items);
        }
        return Promise.resolve([]);
    }

    private async fetchHistoryForTerminal(terminalName: string, hostName: string): Promise<void> {
        const sshConnectionString = this.extractSSHConnectionFromTerminalByName(terminalName);
        
        if (sshConnectionString) {
            await this.fetchHistoryViaSeparateSSH(sshConnectionString, hostName);
        } else {
            this.showHistoryFetchError();
        }
    }

    private extractSSHConnectionFromTerminalByName(terminalName: string): string | null {

        const sshInfo = SSHHostHistoryProvider.getTerminalSSHInfo(terminalName);
        if (sshInfo) {
            return sshInfo.connectionString;
        }

        if (terminalName.includes('SSH:')) {
            const sshPart = terminalName.split('SSH:')[1].trim();
            
            if (sshPart.includes('|')) {
                const parts = sshPart.split('|');
                return parts[parts.length - 1].trim();
            } else if (sshPart.includes('@')) {
                return sshPart;
            } else {
                return sshPart;
            }
        }
        return null;
    }

    private static terminalSSHConnections = new Map<string, {
        hostName: string;
        user: string;
        port: number;
        keyPath?: string;
        connectionString: string;
    }>();

    public static setTerminalSSHInfo(terminalName: string, hostInfo: {
        hostName: string;
        user: string;
        port: number;
        keyPath?: string;
    }): void {
        const connectionString = this.buildConnectionString(hostInfo);

        this.terminalSSHConnections.set(terminalName, {
            ...hostInfo,
            connectionString
        });
    }

    public static getTerminalSSHInfo(terminalName: string): {
        hostName: string;
        user: string;
        port: number;
        keyPath?: string;
        connectionString: string;
    } | null {
        return this.terminalSSHConnections.get(terminalName) || null;
    }

    public static cleanupClosedTerminal(terminalName: string): void {
        this.terminalSSHConnections.delete(terminalName);
    }

    public static getActiveSSHTerminals(): string[] {
        return Array.from(this.terminalSSHConnections.keys());
    }

    private static buildConnectionString(hostInfo: {
        hostName: string;
        user: string;
        port: number;
        keyPath?: string;
    }): string {
        let connectionString = `${hostInfo.user}@${hostInfo.hostName}`;
        
        if (hostInfo.port && hostInfo.port !== 22) {
            connectionString += ` -p ${hostInfo.port}`;
        }

        if (hostInfo.keyPath) {
            connectionString += ` -i ${hostInfo.keyPath}`;
        }
        
        return connectionString;
    }

    private async fetchHistoryViaSeparateSSH(connectionString: string, hostName: string): Promise<void> {
        return new Promise((resolve) => {
            if (!connectionString) {
                this.showHistoryFetchError();
                resolve();
                return;
            }

            const sshCommand = `ssh ${connectionString} "cat ~/.bash_history ~/.zsh_history ~/.history 2>/dev/null || echo 'No history files found'"`;
            
            cp.exec(sshCommand, { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) {
                    const errorHistory = [{
                        command: `❌ SSH connection failed: ${error.message}`,
                        lineNumber: 0,
                        timestamp: new Date(),
                        host: hostName
                    }, {
                        command: '💡 Please ensure SSH connection is active and try again',
                        lineNumber: 0,
                        timestamp: new Date(),
                        host: hostName
                    }];
                    
                    this.historyCache.set(hostName, errorHistory);
                    
                    if (hostName === this.currentHost) {
                        this.history = errorHistory;
                        this.updateFilteredHistory();
                    }
                } else {
                    const historyCommands = this.parseHistoryOutput(stdout, hostName);
                    this.historyCache.set(hostName, historyCommands);
                    
                    if (hostName === this.currentHost) {
                        this.history = historyCommands;
                        this.updateFilteredHistory();
                    }
                }
                resolve();
            });
        });
    }

    private showHistoryFetchError(): void {
        this.history = [
            {
                command: '❌ Failed to fetch history',
                lineNumber: 0,
                timestamp: new Date(),
                host: this.currentHost || ''
            },
            {
                command: '💡 Check SSH connection and try refresh',
                lineNumber: 0,
                timestamp: new Date(),
                host: this.currentHost || ''
            }
        ];
    }

    private parseHistoryOutput(output: string, hostName?: string): HistoryCommand[] {
        const lines = output.trim().split('\n');
        const commandCounts = new Map<string, { count: number, lastLineNumber: number }>();
        
        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            const match = line.match(/^\s*(\d+)\s+(.+)$/) || line.match(/^(.+)$/);
            
            if (match) {
                const lineNumber = match[1] && !isNaN(parseInt(match[1])) ? parseInt(match[1]) : 0;
                const command = match[2] || match[1];

                if (command && 
                    !command.includes('HISTORY_CAPTURED_') && 
                    !command.includes('HISTORY_FAILED_') &&
                    !command.startsWith('history >')) {
                    
                    const cleanCommand = command.trim();

                    const filteredCommands = [
                        'ls', 'll', 'cd ..', 'htop',
                        'ls -la', 'ls -l', 'pwd', 'clear',
                        'exit', 'logout', 'whoami', 'date'
                    ];
                    
                    if (filteredCommands.includes(cleanCommand)) {
                        continue;
                    }

                    if (commandCounts.has(cleanCommand)) {
                        const existing = commandCounts.get(cleanCommand)!;
                        commandCounts.set(cleanCommand, {
                            count: existing.count + 1,
                            lastLineNumber: Math.max(existing.lastLineNumber, lineNumber)
                        });
                    } else {
                        commandCounts.set(cleanCommand, {
                            count: 1,
                            lastLineNumber: lineNumber
                        });
                    }
                }
            }
        }

        return Array.from(commandCounts.entries())
            .sort((a, b) => {

                if (b[1].count !== a[1].count) {
                    return b[1].count - a[1].count;
                }

                return b[1].lastLineNumber - a[1].lastLineNumber;
            })
            .slice(0, 50)
            .map((entry, index) => ({
                command: `${entry[1].count > 1 ? `(${entry[1].count}x) ` : ''}${entry[0]}`,
                lineNumber: entry[1].lastLineNumber,
                timestamp: new Date(),
                host: hostName || this.currentHost || ''
            }));
    }

    runCommand(command: string): void {
        const activeTerminal = vscode.window.activeTerminal;
        if (activeTerminal) {
            activeTerminal.sendText(command);
            activeTerminal.show();
            vscode.window.showInformationMessage(`Executed: ${command}`);
        } else {
            vscode.window.showErrorMessage('No active terminal found');
        }
    }

    copyCommand(command: string): void {
        vscode.env.clipboard.writeText(command);
        vscode.window.showInformationMessage('Command copied to clipboard');
    }

    async runCustomCommand(): Promise<void> {
        const command = await vscode.window.showInputBox({
            prompt: 'Enter command to execute on SSH host',
            placeHolder: 'e.g., grep "error" /var/log/nginx/error.log'
        });

        if (command) {
            this.runCommand(command);
        }
    }

    async runGrepSearch(): Promise<void> {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Search logs with grep',
            placeHolder: 'Enter search term'
        });

        if (searchTerm) {
            this.runCommand(`grep -r "${searchTerm}" /var/log/* | head -20`);
        }
    }
}