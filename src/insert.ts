import { App, MarkdownView, Notice } from 'obsidian';
import { ContextSummary } from './context';

export interface InsertResult {
    inserted: boolean;
    location?: { file: string; line: number; column: number };
}

export async function insertOrClipboard(resultText: string, app: App): Promise<InsertResult> {
    console.debug('[WriteTex] insertOrClipboard called with text length:', resultText.length);
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
        console.debug('[WriteTex] No active MarkdownView found. Copying to clipboard.');
        // Fallback to clipboard
        await navigator.clipboard.writeText(resultText);
        new Notice('Copied to clipboard (no active editor)');
        return { inserted: false };
    }

    console.debug('[WriteTex] Active view found:', view.file?.path);
    const editor = view.editor;
    const pos = editor.getCursor();
    editor.replaceSelection(resultText);
    
    return {
        inserted: true,
        location: {
            file: view.file?.path || 'Untitled',
            line: pos.line,
            column: pos.ch
        }
    };
}
