# 🧠 StudyMind AI — Your Personal AI Tutor

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0%2B-black?style=flat-square&logo=flask)
![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

> **StudyMind AI** is a fully local, privacy-first AI study assistant powered by [Ollama](https://ollama.com). It helps students learn, understand, and master any subject — running entirely on your own machine with no data sent to the cloud.

---

## ✨ Features

- 💬 **Conversational AI Tutor** — Chat with StudyMind like a personal tutor. Ask questions, get step-by-step explanations, and explore any topic.
- 🔍 **Web Search Integration** — Toggle live DuckDuckGo web search to enrich AI answers with up-to-date information.
- 📝 **Quiz Generator** — Generate a 5-question progressive quiz on any topic instantly.
- 📖 **Topic Summarizer** — Get a structured study guide with key concepts, definitions, mnemonics, and exam questions.
- 🤖 **Multi-Model Support** — Automatically detects all locally installed Ollama models and lets you switch between them.
- 🔒 **100% Local & Private** — Your data never leaves your computer. No API keys required.
- 🎨 **Modern UI** — Clean, responsive interface with markdown rendering, syntax highlighting, and streaming responses.

---

## 🖼️ Project Structure

```
studymind-ai/
├── app.py            # Flask backend — API routes, Ollama integration, web search
├── app.js            # Frontend JavaScript — chat logic, streaming, UI interactions
├── index.html        # Main HTML page — layout, sidebar, modals
├── style.css         # Styling — dark theme, animations, responsive design
├── requirements.txt  # Python dependencies
└── run.ps1           # PowerShell launch script (Windows)
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+**
- **Ollama** installed and running — [Download here](https://ollama.com)
- At least one Ollama model pulled (e.g., `llama3.2`)

### 1. Install Ollama & Pull a Model

```bash
# Install Ollama (visit https://ollama.com for your OS)

# Start the Ollama server
ollama serve

# Pull a model (in a new terminal)
ollama pull llama3.2
```

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/studymind-ai.git
cd studymind-ai
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the App

**On Linux / macOS:**
```bash
python app.py
```

**On Windows (PowerShell):**
```powershell
.\run.ps1
```

### 5. Open in Browser

Navigate to **[http://localhost:5000](http://localhost:5000)**

---

## 🪟 Windows Quick Start (`run.ps1`)

The included `run.ps1` script handles startup automatically on Windows. It checks for Ollama, installs dependencies if needed, and launches the Flask server. Simply right-click and select **"Run with PowerShell"**, or execute:

```powershell
powershell -ExecutionPolicy Bypass -File run.ps1
```

---

## 🔧 Configuration

Open `app.py` to customize the following:

| Variable | Default | Description |
|---|---|---|
| `DEFAULT_MODEL` | `llama3.2` | The Ollama model used by default |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama generate endpoint |
| `OLLAMA_CHAT_URL` | `http://localhost:11434/api/chat` | Ollama chat endpoint |

To use a different model by default, change:
```python
DEFAULT_MODEL = "mistral"  # or any model you've pulled
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the main UI |
| `GET` | `/api/status` | Returns Ollama status and available models |
| `POST` | `/api/chat` | Streams a chat response from the AI |
| `POST` | `/api/quiz` | Streams a 5-question quiz on a given topic |
| `POST` | `/api/summarize` | Streams a structured study summary |
| `POST` | `/api/search` | Returns DuckDuckGo web search results |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, Flask |
| **AI Runtime** | Ollama (local LLMs) |
| **Web Search** | DuckDuckGo API (no key required) |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Markdown** | [Marked.js](https://marked.js.org/) |
| **Syntax Highlighting** | [Highlight.js](https://highlightjs.org/) |
| **Fonts** | Sora, JetBrains Mono, Playfair Display (Google Fonts) |

---

## 💡 Usage Tips

- **Toggle Web Search** using the 🔍 button in the sidebar or the input bar to get real-time information alongside AI answers.
- **Switch Models** from the sidebar dropdown to use different Ollama models (e.g., `mistral`, `gemma`, `phi3`).
- Use **Quick Tools** in the sidebar for one-click access to Quiz Generator, Topic Summarizer, and Web Search.
- Press **Enter** to send a message; **Shift+Enter** for a new line.
- Click **Suggested Prompts** to quickly explore popular study topics.

---

## 📦 Requirements

```
flask>=3.0.0
requests>=2.31.0
```

No external AI API keys are needed. All AI inference is performed locally via Ollama.

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "Add: your feature description"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Banda Pranay Kumar Yadav**

---

*Built with ❤️ for students everywhere. Study smarter, not harder.*
