import { App, MarkdownView } from 'obsidian';

export interface ContextSummary {
    file: string;
    surroundingText: string;
}

export function getContextSummary(app: App): ContextSummary | null {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
        return null;
    }

    const editor = view.editor;
    const file = view.file?.path || 'Untitled';
    
    // Get surrounding text
    const cursor = editor.getCursor();
    const doc = editor.getDoc();
    const lineCount = doc.lineCount();
    
    // Grab ~50 lines before and after
    const startLine = Math.max(0, cursor.line - 50);
    const endLine = Math.min(lineCount - 1, cursor.line + 50);
    
    const surroundingText = doc.getRange(
        { line: startLine, ch: 0 },
        { line: endLine, ch: doc.getLine(endLine).length }
    );

    return {
        file,
        surroundingText
    };
}
