I have updated the plan to explicitly include the `/health` endpoint and confirm the exclusion of mDNS for now.

## 1. Create Core Logic Modules
*   **`src/types.ts`**: Define `WriteTexSettings` and shared interfaces.
*   **`src/openai.ts`**: Port OpenAI API interaction logic (streaming support).
*   **`src/proxy.ts`**: Port request transformation logic with context injection.
*   **`src/context.ts`**: Implement `getContextSummary` using Obsidian API to get the active file path and surrounding text from the editor.
*   **`src/insert.ts`**: Implement `insertOrClipboard` using Obsidian's `editor.replaceSelection()` to insert text at the cursor.
*   **`src/server.ts`**: Port the HTTP server logic.
    *   **Health Check**: Implement `GET /health` endpoint returning `{ ok: true, service: 'WriteTex OpenAI Proxy', port }`.
    *   **Chat Completions**: Implement `POST /v1/chat/completions` to handle the proxy logic.
    *   **CORS**: Handle OPTIONS requests.
    *   It will run on port `50905`.

## 2. Update Settings
*   **`src/settings.ts`**: Add settings for `apiEndpoint`, `apiKey`, `apiModel`, and `customPrompt`.

## 3. Main Plugin Entry Point
*   **`src/main.ts`**:
    *   Manage server lifecycle (Start on load, Stop on unload).
    *   Add "Start Server" and "Stop Server" commands.
    *   Add status bar indicator.

I will now proceed with the implementation.