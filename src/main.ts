import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { WriteTexSettingTab, DEFAULT_SETTINGS } from './settings';
import { startServer } from './server';
import { ServerController, WriteTexSettings } from './types';
import { advertise, MdnsHandle } from './mdns';

export default class WriteTexPlugin extends Plugin {
	settings: WriteTexSettings;
	serverController: ServerController | null = null;
    mdnsHandle: MdnsHandle | null = null;
    statusBarItem: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

        // Start server
        this.startServer();

		// Status bar
		this.statusBarItem = this.addStatusBarItem();
        this.updateStatusBar();

		// Commands
        this.addCommand({
            id: 'writetex-start-server',
            name: 'Start Server',
            callback: () => this.startServer()
        });

        this.addCommand({
            id: 'writetex-stop-server',
            name: 'Stop Server',
            callback: () => this.stopServer()
        });

		// Settings tab
		this.addSettingTab(new WriteTexSettingTab(this.app, this));
	}

	onunload() {
        this.stopServer();
	}

    async startServer() {
        if (this.serverController) {
            return;
        }

        const port = 50905;

        try {
            const { controller } = startServer(this.app, () => this.settings, port);
            this.serverController = controller;
            this.updateStatusBar();

            // Start mDNS
            try {
                this.mdnsHandle = advertise(port);
                console.log('[WriteTex] mDNS advertisement started');
            } catch (err) {
                console.error('[WriteTex] Failed to start mDNS:', err);
                // Non-fatal, don't stop server
            }

        } catch (error: any) {
            new Notice(`Failed to start WriteTex server: ${error.message}`);
            console.error(error);
        }
    }

    async stopServer() {
        if (this.mdnsHandle) {
            await this.mdnsHandle.stop();
            this.mdnsHandle = null;
        }

        if (this.serverController) {
            await this.serverController.stop();
            this.serverController = null;
            this.updateStatusBar();
            new Notice('WriteTex Server stopped');
        }
    }

    updateStatusBar() {
        if (this.statusBarItem) {
            if (this.serverController) {
                this.statusBarItem.setText('WriteTex: On');
                this.statusBarItem.setAttr('title', 'Server running on port 50905');
            } else {
                this.statusBarItem.setText('WriteTex: Off');
            }
        }
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
