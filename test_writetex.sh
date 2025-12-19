#!/bin/bash

# Configuration
PORT=50905
BASE_URL="http://localhost:$PORT"

echo "Testing WriteTex Obsidian Plugin Server..."
echo "----------------------------------------"

# 1. Test Health Endpoint
echo "1. Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
echo "Response: $HEALTH_RESPONSE"

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
  echo "✅ Health check passed!"
else
  echo "❌ Health check failed. Is the plugin running in Obsidian?"
  exit 1
fi

echo ""

# 2. Test Chat Completion (Mock)
echo "2. Testing /v1/chat/completions endpoint (requires API Key configured in Obsidian)..."
echo "Sending 'Hello'..."

# Note: We use a small max_tokens to keep it quick.
# We also need to send the 'Authorization: Bearer writetex' header as per the server implementation.

curl -N -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer writetex" \
  -d '{
    "model": "qwen3-vl-plus",
    "messages": [
      {"role": "user", "content": "Say hello back in one word."}
    ],
    "stream": true
  }'

echo ""
echo "----------------------------------------"
echo "Test complete."
