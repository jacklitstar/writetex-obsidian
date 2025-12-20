import { Notice, Plugin } from 'obsidian';
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
        await this.startServer();

		// Status bar
		this.statusBarItem = this.addStatusBarItem();
        this.updateStatusBar();

		// Commands
		this.addCommand({
            id: 'start-server',
            name: 'Start server',
            callback: () => {
				// Explicitly ignore the promise
				void this.startServer();
			}
        });

        this.addCommand({
            id: 'stop-server',
            name: 'Stop server',
            callback: () => {
				// Explicitly ignore the promise
				void this.stopServer();
			}
        });

		// Settings tab
		this.addSettingTab(new WriteTexSettingTab(this.app, this));
	}

	onunload() {
        void this.stopServer();
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
                console.debug('[WriteTex] mDNS advertisement started');
            } catch (err) {
                console.error('[WriteTex] Failed to start mDNS:', err);
                // Non-fatal, don't stop server
            }

			// Add a small delay or await something if we want to keep async, 
			// but better to just return Promise.resolve() explicitly if we want to keep it async for future proofing
			// or just let it be async without await. 
			// The linter error "Async method 'startServer' has no 'await' expression" suggests we should either await something or remove async.
			// However, since it's called with await in onload, and might be async in future, let's just await Promise.resolve().
			await Promise.resolve();

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`Failed to start WriteTex server: ${message}`);
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
            new Notice('Writetex server stopped');
        }
    }

    updateStatusBar() {
        if (this.statusBarItem) {
            if (this.serverController) {
                this.statusBarItem.setText('Writetex: on');
                this.statusBarItem.setAttr('title', 'Server running on port 50905');
            } else {
                this.statusBarItem.setText('Writetex: off');
            }
        }
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<WriteTexSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
