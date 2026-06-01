// ===== STUDYMIND FRONTEND =====

let history = [];
let msgCount = 0;
let searchCount = 0;
let isSearchActive = false;
let currentModel = "llama3.2";
let isGenerating = false;

// Marked config
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// ===== INIT =====
async function init() {
  try {
    const resp = await fetch("/api/status");
    const data = await resp.json();

    const dot = document.getElementById("statusDot");
    const txt = document.getElementById("statusText");
    const sel = document.getElementById("modelSelect");

    if (data.ollama) {
      dot.classList.add("online");
      txt.textContent = `Ollama online · ${data.models.length} model(s)`;

      // Populate model selector
      if (data.models.length > 0) {
        sel.innerHTML = "";
        data.models.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          if (m === data.default_model || m.includes(data.default_model)) opt.selected = true;
          sel.appendChild(opt);
        });
        currentModel = sel.value;
      }
    } else {
      dot.classList.add("offline");
      txt.textContent = "Ollama offline!";
      showOllamaWarning();
    }

    sel.addEventListener("change", () => { currentModel = sel.value; });
  } catch (e) {
    console.error("Status check failed", e);
  }
}

function showOllamaWarning() {
  const msgs = document.getElementById("messages");
  const welcome = document.getElementById("welcome");
  welcome.style.display = "none";
  msgs.innerHTML = `
    <div class="message ai">
      <div class="avatar ai">⚠️</div>
      <div class="bubble">
        <strong>Ollama is not running.</strong><br><br>
        To use StudyMind, please:<br>
        1. Install Ollama from <strong>https://ollama.com</strong><br>
        2. Open a terminal and run: <code>ollama serve</code><br>
        3. Pull a model: <code>ollama pull llama3.2</code><br>
        4. Refresh this page<br><br>
        Once Ollama is running, you're good to go! 🚀
      </div>
    </div>`;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
  const input = document.getElementById("userInput");
  const msg = input.value.trim();
  if (!msg || isGenerating) return;

  // Hide welcome
  document.getElementById("welcome").style.display = "none";

  // Add user message
  appendMessage("user", msg);
  history.push({ role: "user", content: msg });
  input.value = "";
  autoResize(input);
  msgCount++;
  document.getElementById("msgCount").textContent = msgCount;

  // Lock input
  isGenerating = true;
  document.getElementById("sendBtn").disabled = true;

  // Create AI bubble
  const aiDiv = appendMessage("ai", "", true);
  const bubble = aiDiv.querySelector(".bubble");

  // Streaming
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: msg,
        history: history.slice(-10),
        model: currentModel,
        search: isSearchActive
      })
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === "search_results" && data.results.length > 0) {
            showSearchResults(data.results);
            searchCount++;
            document.getElementById("searchCount").textContent = searchCount;

            // Add badge
            const badge = document.createElement("div");
            badge.className = "search-badge";
            badge.innerHTML = `🔍 Used web search · ${data.results.length} results`;
            bubble.insertBefore(badge, bubble.firstChild);
          }

          if (data.type === "chunk") {
            fullText += data.content;
            bubble.innerHTML = marked.parse(fullText) + '<span class="typing-cursor"></span>';
            hljs.highlightAll();
            scrollToBottom();
          }

          if (data.type === "done") {
            bubble.innerHTML = marked.parse(fullText || "*(no response)*");
            hljs.highlightAll();
            history.push({ role: "assistant", content: fullText });
            msgCount++;
            document.getElementById("msgCount").textContent = msgCount;
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    bubble.innerHTML = `<span style="color:var(--danger)">❌ Error: ${e.message}. Is Ollama running?</span>`;
  }

  isGenerating = false;
  document.getElementById("sendBtn").disabled = false;
  scrollToBottom();
}

// ===== APPEND MESSAGE =====
function appendMessage(role, content, isLoading = false) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatarContent = role === "ai" ? "🧠" : "👤";
  const bubbleContent = isLoading
    ? '<span class="typing-cursor"></span>'
    : (role === "ai" ? marked.parse(content) : escapeHtml(content));

  div.innerHTML = `
    <div class="avatar ${role}">${avatarContent}</div>
    <div class="bubble">${bubbleContent}</div>`;

  messages.appendChild(div);
  scrollToBottom();
  return div;
}

function escapeHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function scrollToBottom() {
  const ca = document.getElementById("chatArea");
  ca.scrollTop = ca.scrollHeight;
}

// ===== SEARCH TOGGLE =====
function toggleSearch() {
  isSearchActive = !isSearchActive;
  const btn = document.getElementById("searchBtn");
  const toggle = document.getElementById("searchToggle");
  btn.classList.toggle("active", isSearchActive);
  toggle.checked = isSearchActive;
  document.getElementById("userInput").placeholder = isSearchActive
    ? "Ask with web search enabled..."
    : "Ask anything — chemistry, history, math, coding...";
}

document.getElementById("searchToggle").addEventListener("change", (e) => {
  isSearchActive = e.target.checked;
  document.getElementById("searchBtn").classList.toggle("active", isSearchActive);
});

// ===== SEARCH RESULTS PANEL =====
function showSearchResults(results) {
  const panel = document.getElementById("searchPanel");
  const container = document.getElementById("searchResults");
  panel.style.display = "block";
  container.innerHTML = results.map(r => `
    <div class="search-result">
      <div class="search-result-title">${escapeHtml(r.title || "Result")}</div>
      <div class="search-result-snippet">${escapeHtml(r.snippet)}</div>
      ${r.url ? `<div class="search-result-url"><a href="${r.url}" target="_blank" style="color:var(--accent3)">${r.url}</a></div>` : ""}
    </div>`).join("");
}

function closeSearchPanel() {
  document.getElementById("searchPanel").style.display = "none";
}

// ===== KEYBOARD =====
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function usePrompt(text) {
  document.getElementById("userInput").value = text;
  autoResize(document.getElementById("userInput"));
  document.getElementById("userInput").focus();
}

function clearChat() {
  history = [];
  msgCount = 0;
  searchCount = 0;
  document.getElementById("messages").innerHTML = "";
  document.getElementById("welcome").style.display = "flex";
  document.getElementById("msgCount").textContent = "0";
  document.getElementById("searchCount").textContent = "0";
  closeSearchPanel();
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("sidebarToggle");
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle("mobile-open");
  } else {
    sidebar.classList.toggle("collapsed");
    toggle.textContent = sidebar.classList.contains("collapsed") ? "›" : "‹";
  }
}

// ===== MODAL TOOLS =====
function openTool(type) {
  const overlay = document.getElementById("modalOverlay");
  const modal = document.getElementById("modal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");

  overlay.classList.add("open");
  modal.classList.add("open");

  if (type === "quiz") {
    title.textContent = "📝 Quiz Generator";
    body.innerHTML = `
      <label>Enter a topic to be quizzed on:</label>
      <input type="text" id="quizTopic" placeholder="e.g. The Water Cycle, World War 2, Calculus..." />
      <button class="modal-run-btn" id="quizRunBtn" onclick="runQuiz()">Generate Quiz</button>
      <div class="modal-output" id="quizOutput">Your quiz will appear here...</div>`;
    document.getElementById("quizTopic").addEventListener("keydown", e => {
      if (e.key === "Enter") runQuiz();
    });
  }

  if (type === "summarize") {
    title.textContent = "📖 Topic Summarizer";
    body.innerHTML = `
      <label>Enter a topic to summarize:</label>
      <input type="text" id="sumTopic" placeholder="e.g. Photosynthesis, The Roman Empire..." />
      <button class="modal-run-btn" id="sumRunBtn" onclick="runSummary()">Create Study Summary</button>
      <div class="modal-output" id="sumOutput">Your study summary will appear here...</div>`;
    document.getElementById("sumTopic").addEventListener("keydown", e => {
      if (e.key === "Enter") runSummary();
    });
  }

  if (type === "search") {
    title.textContent = "🔎 Web Search";
    body.innerHTML = `
      <label>Search the web for study material:</label>
      <div class="search-input-row">
        <input type="text" id="searchQuery" placeholder="e.g. latest research on black holes..." />
        <button class="search-go-btn" onclick="runModalSearch()">🔍</button>
      </div>
      <div id="modalSearchResults" style="display:flex;flex-direction:column;gap:8px;"></div>`;
    document.getElementById("searchQuery").addEventListener("keydown", e => {
      if (e.key === "Enter") runModalSearch();
    });
  }
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
}

async function runQuiz() {
  const topic = document.getElementById("quizTopic").value.trim();
  if (!topic) return;
  const btn = document.getElementById("quizRunBtn");
  const out = document.getElementById("quizOutput");
  btn.disabled = true;
  btn.textContent = "Generating...";
  out.classList.add("active");
  out.innerHTML = '<span class="typing-cursor"></span>';

  let text = "";
  const resp = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, model: currentModel })
  });

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "chunk") {
          text += data.content;
          out.innerHTML = marked.parse(text) + '<span class="typing-cursor"></span>';
        }
        if (data.type === "done") {
          out.innerHTML = marked.parse(text);
          hljs.highlightAll();
        }
      } catch {}
    }
  }
  btn.disabled = false;
  btn.textContent = "Generate Quiz";
}

async function runSummary() {
  const topic = document.getElementById("sumTopic").value.trim();
  if (!topic) return;
  const btn = document.getElementById("sumRunBtn");
  const out = document.getElementById("sumOutput");
  btn.disabled = true;
  btn.textContent = "Summarizing...";
  out.classList.add("active");
  out.innerHTML = '<span class="typing-cursor"></span>';

  let text = "";
  const resp = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, model: currentModel })
  });

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "chunk") {
          text += data.content;
          out.innerHTML = marked.parse(text) + '<span class="typing-cursor"></span>';
        }
        if (data.type === "done") {
          out.innerHTML = marked.parse(text);
          hljs.highlightAll();
        }
      } catch {}
    }
  }
  btn.disabled = false;
  btn.textContent = "Create Study Summary";
}

async function runModalSearch() {
  const query = document.getElementById("searchQuery").value.trim();
  if (!query) return;
  const container = document.getElementById("modalSearchResults");
  container.innerHTML = "<p style='color:var(--text3);font-size:13px'>Searching...</p>";

  const resp = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const data = await resp.json();
  const results = data.results || [];

  if (results.length === 0) {
    container.innerHTML = "<p style='color:var(--text3);font-size:13px'>No results found.</p>";
    return;
  }

  container.innerHTML = results.map(r => `
    <div class="search-result">
      <div class="search-result-title">${escapeHtml(r.title || "Result")}</div>
      <div class="search-result-snippet">${escapeHtml(r.snippet)}</div>
      ${r.url ? `<div class="search-result-url"><a href="${r.url}" target="_blank" style="color:var(--accent3)">${r.url}</a></div>` : ""}
    </div>`).join("");
}

// ===== STARTUP =====
init();
document.getElementById("userInput").focus();
