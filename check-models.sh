#!/bin/bash
API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2 | tr -d ' ')
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$API_KEY" | grep -o '"name":"[^"]*"' | grep gemini
