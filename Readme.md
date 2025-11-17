# cf_ai_cloudflare_voice_assistant

AI-powered **voice + chat assistant** built on **Cloudflare Workers AI, KV, Durable Objects, and Pages** for the Cloudflare optional AI assignment.

## 🚀 Overview

This project is an end-to-end AI application that runs entirely on Cloudflare:

- **LLM**: Llama 3.1 (8B + 70B) on Workers AI  
- **Workflow / Coordination**: Cloudflare Worker + Durable Object  
- **User Input**: Rich chat UI with message animations, voice input (speech-to-text) and optional spoken replies (text-to-speech)  
- **Memory / State**: KV-based per-session chat history + Durable Object analytics

The goal is to demonstrate how to orchestrate Workers AI with stateful components and a modern UI suitable for fast-track review.

---

## ✨ Features

- 🧠 **LLM integration** with Workers AI (Llama 3.1 8B & 70B)
- 🔀 **Model switcher** (Fast vs Quality)
- 💬 **Modern chat UI** with animated message bubbles and typing indicator
- 🎙️ **Voice input** (Web Speech API)  
- 🔊 **Voice replies** using browser text-to-speech (toggleable)
- 💾 **Persistent memory** via Cloudflare KV (per-session history)
- 📊 **Session analytics** using a Durable Object (message counts, chars, models used)
- 🧾 **Conversation summary** endpoint (LLM-generated summary)
- 📥 **Download transcript** as `.txt`


---

## 🏗 Architecture

```text
Browser (Pages) ──► Worker (HTTP API)
   │                   │
   │ chat / summary    ├──► Workers AI (Llama models)
   │                   │
   │                   ├──► KV (CHAT_MEMORY)  – per-session history
   
# cf_ai_cloudflare_voice_assistant
