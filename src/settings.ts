import { App, PluginSettingTab, Setting } from "obsidian";
import WriteTexPlugin from "./main";
import { WriteTexSettings } from "./types";

export const DEFAULT_SETTINGS: WriteTexSettings = {
    apiEndpoint: 'https://api.openai.com/v1',
    apiModel: 'gpt-4o',
    apiKey: '',
    customPrompt: ''
}

export class WriteTexSettingTab extends PluginSettingTab {
    plugin: WriteTexPlugin;

    constructor(app: App, plugin: WriteTexPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('API Endpoint')
            .setDesc('OpenAI-compatible API endpoint (e.g. https://api.openai.com/v1)')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.apiEndpoint)
                .onChange(async (value) => {
                    this.plugin.settings.apiEndpoint = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your OpenAI API Key')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Model ID (e.g. gpt-4o)')
            .addText(text => text
                .setPlaceholder('gpt-4o')
                .setValue(this.plugin.settings.apiModel)
                .onChange(async (value) => {
                    this.plugin.settings.apiModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Custom Prompt')
            .setDesc('Custom instructions to append to the system prompt')
            .addTextArea(text => text
                .setPlaceholder('Enter custom instructions...')
                .setValue(this.plugin.settings.customPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.customPrompt = value;
                    await this.plugin.saveSettings();
                }));
    }
}
