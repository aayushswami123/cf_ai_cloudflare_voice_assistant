// --- CONFIG: your Worker URL ---
const workerUrl =
  "https://bold-sun-0a63.aayushswami8.workers.dev/api";

const form = document.getElementById("chat-form");
const input = document.getElementById("input");
const messagesDiv = document.getElementById("messages");
const sendBtn = document.getElementById("send-btn");
const sendText = document.getElementById("send-text");
const sendLoading = document.getElementById("send-loading");
const statusDot = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");
const resetBtn = document.getElementById("reset-btn");
const micBtn = document.getElementById("mic-btn");
const ttsToggle = document.getElementById("tts-toggle");
const modelSelect = document.getElementById("model-select");
const summaryBtn = document.getElementById("summary-btn");
const downloadBtn = document.getElementById("download-btn");

// Session id used by KV + Durable Object
let sessionId = "session-" + Math.random().toString(36).slice(2);

// Local transcript (for download)
const transcript = []; // { role, content, ts }

// Typing indicator
let typingRow = null;

// Speech recognition + TTS
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsSTT = !!SpeechRecognition;
let recognition = null;
let isListening = false;

// ---------- UI helpers ----------
function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  if (isLoading) {
    sendText.classList.add("hidden");
    sendLoading.classList.remove("hidden");
    showTypingIndicator();
  } else {
    sendText.classList.remove("hidden");
    sendLoading.classList.add("hidden");
    hideTypingIndicator();
  }
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = role === "user" ? "You" : "AI Assistant";

  const content = document.createElement("div");
  content.textContent = text;

  bubble.appendChild(meta);
  bubble.appendChild(content);
  row.appendChild(bubble);
  messagesDiv.appendChild(row);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  transcript.push({
    role,
    content: text,
    ts: new Date().toISOString(),
  });

  if (role === "assistant" && ttsToggle.checked) {
    speak(text);
  }
}

function setStatus(ok, text) {
  statusText.textContent = text;
  statusDot.classList.toggle("status-ok", ok);
  statusDot.classList.toggle("status-error", !ok);
}

// Typing indicator
function showTypingIndicator() {
  if (typingRow) return;
  typingRow = document.createElement("div");
  typingRow.className = "message-row assistant typing";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = "AI Assistant";

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  bubble.appendChild(meta);
  bubble.appendChild(dots);
  typingRow.appendChild(bubble);
  messagesDiv.appendChild(typingRow);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideTypingIndicator() {
  if (typingRow && typingRow.parentNode) {
    typingRow.parentNode.removeChild(typingRow);
  }
  typingRow = null;
}

// TTS
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ---------- Network ----------
async function sendMessage(message) {
  setLoading(true);
  setStatus(true, "Sending to Worker…");
  try {
    const res = await fetch(`${workerUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        sessionId,
        model: modelSelect.value,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json().catch(() => ({}));
    const reply = data.reply || "No response received";
    addMessage("assistant", reply);
    setStatus(true, "Response received");
  } catch (err) {
    console.error(err);
    setStatus(false, "Error talking to Worker");
    addMessage(
      "assistant",
      "Oops, I couldn't reach the AI worker. Check the Worker URL and bindings."
    );
  } finally {
    setLoading(false);
  }
}

async function summarizeConversation() {
  setStatus(true, "Requesting summary…");
  showTypingIndicator();
  try {
    const res = await fetch(`${workerUrl}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    const summary = data.summary || "No summary available.";
    addMessage("assistant", "Summary of this session:\n\n" + summary);
    setStatus(true, "Summary received");
  } catch (err) {
    console.error(err);
    setStatus(false, "Summary request failed");
  } finally {
    hideTypingIndicator();
  }
}

// Download transcript as .txt
function downloadTranscript() {
  if (!transcript.length) {
    alert("No messages yet.");
    return;
  }
  const lines = transcript.map(
    (m) => `[${m.ts}] ${m.role.toUpperCase()}: ${m.content}`
  );
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cloudflare_chat_${sessionId}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Events ----------

// greeting
addMessage(
  "assistant",
  "Hi Aayush 👋 I'm your Cloudflare AI assistant demo. Ask me anything!"
);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addMessage("user", text);
  sendMessage(text);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
});

resetBtn.addEventListener("click", () => {
  sessionId = "session-" + Math.random().toString(36).slice(2);
  messagesDiv.innerHTML = "";
  transcript.length = 0;
  addMessage(
    "assistant",
    "New session started. I'm ready for more questions!"
  );
  setStatus(true, "New session started");
});

summaryBtn.addEventListener("click", summarizeConversation);
downloadBtn.addEventListener("click", downloadTranscript);

// ---------- Voice input ----------
const SpeechRec = SpeechRecognition;
if (SpeechRec) {
  recognition = new SpeechRec();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("start", () => {
    isListening = true;
    micBtn.classList.add("listening");
    setStatus(true, "Listening…");
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    micBtn.classList.remove("listening");
    setStatus(true, "Ready");
  });

  recognition.addEventListener("result", (event) => {
    const transcriptText = event.results[0][0].transcript;
    addMessage("user", transcriptText);
    sendMessage(transcriptText);
  });

  recognition.addEventListener("error", (event) => {
    console.error(event);
    setStatus(false, "Voice input error");
    isListening = false;
    micBtn.classList.remove("listening");
  });
} else {
  micBtn.title = "Voice input not supported in this browser";
}

micBtn.addEventListener("click", () => {
  if (!recognition) {
    alert("Your browser does not support speech recognition.");
    return;
  }
  if (isListening) recognition.stop();
  else recognition.start();
});
