# WriteTex for Obsidian - Usage Guide

This plugin allows you to use the **WriteTex** app with Obsidian. WriteTex is an AI-powered OCR app (available on iOS) that converts images of math and diagrams into LaTeX, TikZ, or Markdown. This plugin acts as a bridge, enabling the WriteTex app to insert the recognized code directly into your Obsidian notes.

## Features

*   **Companion for WriteTex App**: Seamlessly connects the WriteTex mobile app to your desktop Obsidian editor.
*   **Local Proxy Server**: Runs a lightweight server inside Obsidian (Port 50905) to receive data from the app.
*   **Context Awareness**: Automatically sends the text surrounding your cursor to the AI, improving accuracy by understanding your current document's style and variables.
*   **Automatic Discovery**: Uses mDNS (Bonjour) so the WriteTex iOS app can find your computer automatically.
*   **Direct Insertion**: Generated code is inserted immediately at your cursor.
*   **Streaming**: Watch the text appear in real-time.

## Installation

1.  Download the latest release.
2.  Extract the `writetex-obsidian` folder into your vault's plugins directory: `.obsidian/plugins/`.
3.  Open Obsidian Settings > **Community Plugins** and enable **WriteTex for Obsidian**.

## Configuration

1.  Go to **Settings** > **WriteTex**.
2.  **API Endpoint**: Default is `https://api.openai.com/v1`. Change this if you use a compatible provider (e.g., OpenRouter, LocalAI).
3.  **API Key**: Enter your OpenAI API key (sk-...).
4.  **Model**: Default is `gpt-4o`. You can change this to `gpt-4-turbo` or other vision-capable models.
5.  **Custom Prompt**: (Optional) Add specific instructions, e.g., "Always use `\bm` for bold math symbols."

## Usage

1.  **Start the Server**:
    *   The server starts automatically when Obsidian loads.
    *   Check the status bar in the bottom right: it should say **"WriteTex: On"**.
    *   If it says "Off", open the Command Palette (`Cmd/Ctrl + P`) and run **"WriteTex: Start Server"**.

2.  **Connect Client (e.g., iOS App)**:
    *   Open the WriteTex app on your phone.
    *   Ensure your phone and computer are on the **same Wi-Fi network**.
    *   The app should automatically discover "WriteTex Obsidian @ [YourHostname]".
    *   If automatic discovery fails, manually enter your computer's IP address and port `50905`.

3.  **Scan and Insert**:
    *   Place your cursor in an Obsidian note where you want the code to appear.
    *   Take a picture of a math formula or diagram using the mobile app.
    *   The plugin will receive the image, analyze it with the context of your current note, and stream the LaTeX/Markdown result directly into your editor.

## Troubleshooting

*   **Server won't start**: Check if port `50905` is being used by another application.
*   **Mobile app can't connect**:
    *   Ensure both devices are on the same Wi-Fi.
    *   Check your computer's firewall settings to allow incoming connections on port `50905`.
*   **"Unauthorized" error**: Ensure the client app sends the Authorization header `Bearer writetex`.
