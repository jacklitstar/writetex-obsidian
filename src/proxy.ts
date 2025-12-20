import { WriteTexSettings } from './types';
import { ContextSummary } from './context';
import { OpenAIMessage, OpenAIRequest } from './openai';

export interface ProxyRequest {
    model: string;
    messages: OpenAIMessage[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    [key: string]: unknown; // Allow other OpenAI parameters
}

/**
 * Injects editor context into OpenAI messages for vision requests
 */
export function injectContext(messages: OpenAIMessage[], context: ContextSummary | null, customPrompt?: string): OpenAIMessage[] {
    if (!context) {
        return messages; // No active editor context, pass through unchanged
    }

    // Check if this is a vision request (contains images)
    const hasImages = messages.some(msg =>
        Array.isArray(msg.content) &&
        msg.content.some(part => part.type === 'image_url')
    );

    if (!hasImages) {
        return messages; // Not a vision request, pass through
    }

    // Build context instruction
    let contextInstruction = `You are an OCR expert for Markdown. The user is working in their code editor with file: ${context.file}. Your ouput will be placed at the user's cursor. When extracting content from images, return ONLY the exact code necessary. Prefer formatting consistent with the provided editor context. Do not include preamble/packages. If a variable is ambiguous, match the sorrounding context. \n Surrounding Context:---------------\n
${context.surroundingText};\n---------------No commentary, no explanations, no prose, no code blocks. If the context is not relevant to the image, perform a simple OCR. `;

    if (customPrompt) {
        contextInstruction += `\n\nCustom User Instructions:\n${customPrompt}`;
    }

    // Inject context as the first system message
    const contextMessage: OpenAIMessage = {
        role: 'system',
        content: contextInstruction
    };

    // Filter out text from user messages if they contain images
    const processedMessages = messages.map(msg => {
        if (msg.role === 'user' && Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url')) {
            return {
                ...msg,
                content: msg.content.filter(part => part.type === 'image_url')
            };
        }
        return msg;
    });

    return [contextMessage, ...processedMessages];
}

/**
 * Transforms a proxy request into an OpenAI request with context
 */
export function transformRequest(proxyReq: ProxyRequest, settings: WriteTexSettings, context: ContextSummary | null): OpenAIRequest {
    const messagesWithContext = injectContext(proxyReq.messages, context, settings.customPrompt);

    return {
        model: settings.apiModel, // Use configured model
        messages: messagesWithContext,
        stream: proxyReq.stream !== false, // Default to streaming
        max_tokens: proxyReq.max_tokens || 10000
    };
}
