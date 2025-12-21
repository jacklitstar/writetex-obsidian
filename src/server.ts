import * as http from 'http';
import * as https from 'https';
import { App, Notice } from 'obsidian';
import { Buffer } from 'buffer';
import { ServerController, WriteTexSettings } from './types';
import { transformRequest, ProxyRequest } from './proxy';
import { callOpenAI, OpenAIStreamChunk } from './openai';
import { insertOrClipboard } from './insert';
import { getContextSummary } from './context';

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * Handles OpenAI-compatible chat completions requests
 */
async function handleChatCompletion(
  app: App,
  settings: WriteTexSettings,
  proxyReq: ProxyRequest,
  res: http.ServerResponse
): Promise<void> {
  // Get context
  const context = getContextSummary(app);
  
  // Transform request with context injection
  const openaiReq = transformRequest(proxyReq, settings, context);

  // Stream the response
  if (openaiReq.stream) {
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    let accumulated = '';
    let buffer = ''; // Buffer for handling split chunks

    try {
      // Call OpenAI with custom streaming handler
      const baseUrl = settings.apiEndpoint.endsWith('/') ? settings.apiEndpoint : settings.apiEndpoint + '/';
      const url = new URL('chat/completions', baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      console.debug('[WriteTex] OpenAI Stream Request:', JSON.stringify(openaiReq.messages, null, 2));
      const postData = JSON.stringify(openaiReq);
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${settings.apiKey}`
        }
      };

      const proxyReq = httpModule.request(options, (apiRes: http.IncomingMessage) => {
        if (apiRes.statusCode !== 200) {
          let errorBody = '';
          apiRes.on('data', chunk => { errorBody += chunk; });
          apiRes.on('end', () => {
            res.write(`data: ${JSON.stringify({ error: { message: `API Error ${apiRes.statusCode}`, details: errorBody } })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          });
          return;
        }

        // Forward streaming response to client and accumulate
        apiRes.on('data', (chunk: Buffer) => {
          const chunkStr = chunk.toString();
          res.write(chunk); // Pass through to client

          buffer += chunkStr;
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                      // More robust parsing: find the first brace
                      const jsonStartIndex = line.indexOf('{');
                      if (jsonStartIndex !== -1) {
                          const jsonStr = line.slice(jsonStartIndex);
                          const json = JSON.parse(jsonStr) as OpenAIStreamChunk;
                           
                          const content = json.choices?.[0]?.delta?.content;
                          if (content) {
                              accumulated += content;
                          }
                      }
                  } catch (e) {
                      console.warn('[WriteTex] Failed to parse chunk:', line, e);
                  }
              }
          }
        });

        apiRes.on('end', () => {
          res.end();

          console.debug(`[WriteTex] Stream ended. Accumulated length: ${accumulated.length}`);
          if (accumulated.trim()) {
            console.debug('[WriteTex] Attempting to insert text...');
            new Notice('Writetex: inserting generated text...');
            insertOrClipboard(accumulated.trim(), app).catch(err => {
              console.error('[WriteTex] Failed to insert text:', err);
              new Notice('Writetex: failed to insert text. Check console.');
            });
          } else {
            console.debug('[WriteTex] Nothing to insert (empty content).');
          }
        });
      });

      proxyReq.on('error', (err: Error) => {
        res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      });

      proxyReq.write(postData);
      proxyReq.end();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Non-streaming response
    try {
      const text = await callOpenAI(settings.apiEndpoint, settings.apiKey, openaiReq);

      // Insert at cursor
      if (text.trim()) {
        await insertOrClipboard(text.trim(), app);
      }

      // Return OpenAI-compatible response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: openaiReq.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        error: {
          message,
          type: 'server_error',
          code: 'internal_error'
        }
      }));
    }
  }
}

export function startServer(app: App, getSettings: () => WriteTexSettings, port: number): { server: http.Server, controller: ServerController } {
  const maxSize = 10 * 1024 * 1024; // 10MB limit

   
  const server = http.createServer((req, res) => {
    // Wrap logic in IIFE to handle void return expectation
    void (() => {
      try {
        // Health check
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'WriteTex OpenAI Proxy', port }));
          return;
        }

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.writeHead(204);
          res.end();
          return;
        }

        // OpenAI-compatible endpoint
        if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
          let raw = '';
          let size = 0;

          req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxSize) {
              req.destroy();
            } else {
              raw += chunk.toString();
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Node.js event handlers don't officially support async, but it works
          req.on('end', async () => {
            const json = parseJson(raw) as Partial<ProxyRequest> | null;
            if (!json || !json.messages) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: { message: 'Invalid request: messages required' } }));
              return;
            }

            // Token authentication (hard-coded check matching VS Code extension)
            const authHeader = req.headers.authorization;
            const token = authHeader?.replace(/^Bearer\s+/i, '');
            if (!token || token !== 'writetex') {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
              return;
            }

            const settings = getSettings();
            if (!settings.apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'API key not configured in Obsidian settings' } }));
                return;
            }

            await handleChatCompletion(app, settings, json as ProxyRequest, res);
          });
          return;
        }

        // 404 for unknown routes
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Not found' } }));
      } catch (err: unknown) {
        console.error('[WriteTex] Server request error:', err);
        if (!res.headersSent) {
           res.writeHead(500, { 'Content-Type': 'application/json' });
           res.end(JSON.stringify({ error: { 
             message: 'Internal Server Error' 
           } }));
        }
      }
    })();
  });

  server.listen(port, '0.0.0.0', () => {
    console.debug(`[WriteTex] HTTP server listening on 0.0.0.0:${port}`);
    new Notice(`WriteTex server started on port ${port}`);
  });

  server.on('error', (err: unknown) => {
      console.error('[WriteTex] Server error:', err);
      const error = err as { code?: string, message: string };
      if (error.code === 'EADDRINUSE') {
          new Notice(`WriteTex: port ${port} is already in use.`);
      } else {
          new Notice(`WriteTex: server failed to start: ${error.message}`);
      }
  });

  const controller: ServerController = {
    stop: () => new Promise(resolve => server.close(() => resolve()))
  };

  return { server, controller };
}