
---

# PROMPTS.md

This file documents the AI-assisted prompts used while building **cf_ai_cloudflare_voice_assistant**.

## 1. Initial Worker + KV + AI integration

**Date:** 2025-11-17  
**Tool:** ChatGPT (OpenAI)  

**Prompt (excerpt):**

> "I want to build an AI-powered chat app on Cloudflare using only the dashboard. Use Workers AI (Llama 3.x), KV for memory, and a Worker endpoint `/api/chat` that returns JSON."

**How I used the response:**

- Adapted the suggested `env.AI.run()` call for Workers AI.
- Implemented `/api/chat` with request/response JSON and KV memory.

---

## 2. UI design and animations

**Prompt (excerpt):**

> "Give me a modern, minimal chat UI with glassmorphism, message bubbles, and a typing indicator, using plain HTML/CSS/JS (no frameworks)."

**Usage:**

- Used CSS structure for `.chat-card`, `.message-row`, `.typing-dots`.
- Adjusted colors, spacing, and fonts to match my personal style.

---

## 3. Voice input + voice output

**Prompt (excerpt):**

> "Add speech-to-text and text-to-speech to this chat UI using the Web Speech API. I want a mic button to capture the question and an option to have the AI reply spoken aloud."

**Usage:**

- Implemented `SpeechRecognition` for STT.
- Implemented `speechSynthesis` for TTS with a toggle in the header.

---

## 4. Durable Object analytics

**Prompt (excerpt):**

> "Show me a simple Durable Object that tracks per-session stats like message count, total characters, and models used, and can be called from a Worker."

**Usage:**

- Based on the suggestion, created `SessionLogger` DO with `storage.get/put`.
- Worker calls it on each `/api/chat` request via `ctx.waitUntil()`.

---

## 5. Documentation

**Prompt (excerpt):**

> "Help me write a professional README for this Cloudflare AI application that explains features, architecture, and how to run it."

**Usage:**

- Used the generated README as a starting point.
- Edited sections to accurately reflect the final implementation and naming.

---

All code in this repository has been implemented and verified by me. AI assistance was used only as a coding assistant and documentation helper, not as a source of other students’ submissions.
