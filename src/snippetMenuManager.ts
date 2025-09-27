import * as vscode from 'vscode';
import { SnippetService } from './snippetService';

export class SnippetMenuManager {
    constructor(
        private context: vscode.ExtensionContext,
        private snippetService: SnippetService
    ) {
        this.setupTerminalChangeListener();
        this.updateContextFlags();
    }

    private setupTerminalChangeListener(): void {
        const activeTerminalListener = vscode.window.onDidChangeActiveTerminal(() => {
            this.updateContextFlags();
        });
        this.context.subscriptions.push(activeTerminalListener);

        const openTerminalListener = vscode.window.onDidOpenTerminal(() => {
            setTimeout(() => this.updateContextFlags(), 500);
        });
        this.context.subscriptions.push(openTerminalListener);

        const closeTerminalListener = vscode.window.onDidCloseTerminal(() => {
            setTimeout(() => this.updateContextFlags(), 500);
        });
        this.context.subscriptions.push(closeTerminalListener);
    }

    private async updateContextFlags(): Promise<void> {
        try {
            const snippets = await this.snippetService.getSnippetsForActiveTerminal();
            const hasSnippets = snippets.length > 0;
            vscode.commands.executeCommand('setContext', 'sshControl.hasSnippets', hasSnippets);
        } catch (error) {
            console.error('SSH Control: Error updating snippet context:', error);
            vscode.commands.executeCommand('setContext', 'sshControl.hasSnippets', false);
        }
    }

    dispose(): void {
        // Commands are disposed automatically with context.subscriptions
    }
}