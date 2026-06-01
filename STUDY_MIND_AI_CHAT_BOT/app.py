from flask import Flask, render_template, request, jsonify, Response
import requests
import json
from datetime import datetime
import urllib.parse
import re

app = Flask(__name__, static_folder='.', static_url_path='', template_folder='.')

# --- Ollama config ---
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
DEFAULT_MODEL = "llama3.2"  # change to any model you have pulled

# --- System prompt for study assistant ---
STUDY_SYSTEM_PROMPT = """You are StudyMind, an expert AI study assistant. You help students learn, understand, and master any subject.

Your personality:
- Patient, encouraging, and supportive
- Clear and structured in explanations
- Use analogies and examples to simplify complex topics
- Break down hard concepts step by step
- Suggest study strategies, mnemonics, and memory techniques
- Quiz students when they want to test knowledge
- Summarize topics clearly

Formatting rules:
- Use markdown: **bold**, *italic*, bullet points, numbered lists
- Use headers (##) to organize long answers
- Keep answers focused and educational
- If web search results are provided, incorporate them naturally into your answer
- Always cite if you used web data

Be concise but thorough. Encourage the student. You are their personal tutor."""


def search_web(query, max_results=5):
    """Search using DuckDuckGo (no API key needed)"""
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_redirect=1&no_html=1&skip_disambig=1"
        resp = requests.get(url, timeout=8, headers={"User-Agent": "StudyBot/1.0"})
        data = resp.json()

        results = []
        # Abstract (main answer)
        if data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", "Overview"),
                "snippet": data["AbstractText"],
                "url": data.get("AbstractURL", "")
            })

        # Related topics
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("Text", "")[:60],
                    "snippet": topic.get("Text", ""),
                    "url": topic.get("FirstURL", "")
                })

        return results[:max_results]
    except Exception as e:
        return []


def get_available_models():
    """Get list of models installed in Ollama"""
    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=5)
        data = resp.json()
        return [m["name"] for m in data.get("models", [])]
    except:
        return []


def check_ollama():
    """Check if Ollama is running"""
    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=3)
        return resp.status_code == 200
    except:
        return False


def ask_ollama_stream(messages, model=DEFAULT_MODEL):
    """Stream response from Ollama"""
    payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }
    try:
        resp = requests.post(
            OLLAMA_CHAT_URL,
            json=payload,
            stream=True,
            timeout=120
        )
        for line in resp.iter_lines():
            if line:
                try:
                    chunk = json.loads(line)
                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if chunk.get("done"):
                        break
                except:
                    continue
    except Exception as e:
        yield f"\n\n❌ Ollama error: {str(e)}"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def status():
    ollama_ok = check_ollama()
    models = get_available_models() if ollama_ok else []
    return jsonify({
        "ollama": ollama_ok,
        "models": models,
        "default_model": DEFAULT_MODEL
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "").strip()
    history = data.get("history", [])
    model = data.get("model", DEFAULT_MODEL)
    use_search = data.get("search", False)

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    search_results = []
    search_context = ""

    if use_search:
        search_results = search_web(user_message)
        if search_results:
            search_context = "\n\n[WEB SEARCH RESULTS]\n"
            for i, r in enumerate(search_results, 1):
                search_context += f"{i}. {r['title']}\n   {r['snippet']}\n"
            search_context += "[END OF SEARCH RESULTS]\n"

    # Build messages for Ollama
    messages = [{"role": "system", "content": STUDY_SYSTEM_PROMPT}]
    for msg in history[-10:]:  # keep last 10 turns for context
        messages.append({"role": msg["role"], "content": msg["content"]})

    user_content = user_message
    if search_context:
        user_content = user_message + search_context

    messages.append({"role": "user", "content": user_content})

    def generate():
        yield f"data: {json.dumps({'type': 'search_results', 'results': search_results})}\n\n"
        full_text = ""
        for chunk in ask_ollama_stream(messages, model):
            full_text += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'full': full_text})}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/search", methods=["POST"])
def search_only():
    data = request.json
    query = data.get("query", "")
    results = search_web(query)
    return jsonify({"results": results})


@app.route("/api/quiz", methods=["POST"])
def generate_quiz():
    data = request.json
    topic = data.get("topic", "")
    model = data.get("model", DEFAULT_MODEL)

    prompt = f"""Generate a 5-question quiz on the topic: "{topic}"
    
Format each question like this:
Q1. [Question]
a) [option]
b) [option]  
c) [option]
d) [option]
Answer: [correct letter]
Explanation: [brief explanation]

Make questions progressively harder. Be educational."""

    messages = [
        {"role": "system", "content": STUDY_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]

    def generate():
        for chunk in ask_ollama_stream(messages, model):
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/summarize", methods=["POST"])
def summarize():
    data = request.json
    topic = data.get("topic", "")
    model = data.get("model", DEFAULT_MODEL)

    prompt = f"""Create a comprehensive study summary for: "{topic}"

Include:
## 📌 Key Concepts
## 🔑 Important Terms & Definitions  
## 💡 Core Principles
## 📊 Examples
## 🧠 Memory Tips / Mnemonics
## ❓ Common Exam Questions

Make it a perfect study guide."""

    messages = [
        {"role": "system", "content": STUDY_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]

    def generate():
        for chunk in ask_ollama_stream(messages, model):
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


if __name__ == "__main__":
    print("\nStudyMind AI - Starting up...")
    print("Checking Ollama connection...")
    if check_ollama():
        models = get_available_models()
        print(f"[OK] Ollama is running! Models: {', '.join(models) if models else 'none pulled yet'}")
        print(f"Default model: {DEFAULT_MODEL}")
    else:
        print("[!] Ollama not detected. Start it with: ollama serve")
        print("    Then pull a model: ollama pull llama3.2")
    print("\nOpen in browser: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
    app.run(debug=False, host="0.0.0.0", port=5000)
