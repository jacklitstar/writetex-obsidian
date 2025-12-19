import * as http from 'http';

export interface WriteTexSettings {
    apiEndpoint: string;
    apiModel: string;
    apiKey: string;
    customPrompt: string;
}

export interface ServerController {
    stop: () => Promise<void>;
}
