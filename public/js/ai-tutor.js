/* =====================================================
   MathGenius — AI Tutor Chat (OpenRouter Streaming)
   ===================================================== */

const AITutor = {
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,

  init() {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('chatInput');

    sendBtn?.addEventListener('click', () => this.sendMessage());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });
    input?.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });

    document.querySelectorAll('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (input) input.value = prompt;
        this.sendMessage();
      });
    });

    this.loadSessions();
  },

  loadSessions() {
    try {
      const saved = localStorage.getItem('mathgenius_chat_sessions');
      if (saved) {
        this.sessions = JSON.parse(saved);
      } else {
        // Migration from old single history
        const oldHistory = localStorage.getItem('mathgenius_chat_history');
        if (oldHistory) {
          const msgs = JSON.parse(oldHistory);
          if (msgs.length > 0) {
            this.sessions = [{
              id: 'session_' + Date.now(),
              title: msgs[0].role === 'user' ? msgs[0].content.substring(0, 30) : 'Ancienne conversation',
              updatedAt: Date.now(),
              messages: msgs
            }];
          }
        }
      }
    } catch(e) { this.sessions = []; }
    
    this.updateHistoryUI();
    
    // Choose the first session or start a new one
    if (this.sessions.length > 0) {
      this.loadSession(this.sessions[0].id);
    } else {
      this.startNewSession();
    }
  },

  startNewSession() {
    this.currentSessionId = 'session_' + Date.now();
    this.messages = [];
    this.sessions.unshift({
      id: this.currentSessionId,
      title: 'Nouvelle conversation',
      updatedAt: Date.now(),
      messages: []
    });
    this.saveSessions();
    this.updateHistoryUI();
    this._renderCurrentMessages();
  },

  loadSession(id) {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      this.currentSessionId = id;
      this.messages = [...session.messages];
      this.updateHistoryUI();
      this._renderCurrentMessages();
    }
    document.getElementById('chatHistorySidebar')?.classList.remove('open');
  },

  saveHistory(role, content) {
    if (!this.currentSessionId) this.startNewSession();
    
    const session = this.sessions.find(s => s.id === this.currentSessionId);
    if (session) {
      // Update title on first user message if it's still 'Nouvelle conversation'
      if (role === 'user' && session.title === 'Nouvelle conversation') {
        session.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      }
      session.messages.push({ role, content });
      session.updatedAt = Date.now();
      
      // Move this session to top
      this.sessions = [session, ...this.sessions.filter(s => s.id !== this.currentSessionId)];
      
      this.saveSessions();
      this.updateHistoryUI();
    }
    
    if (typeof SupabaseStorage !== 'undefined') SupabaseStorage.saveChatMessage(role, content);
  },

  saveSessions() {
    try {
      localStorage.setItem('mathgenius_chat_sessions', JSON.stringify(this.sessions));
    } catch(e) {}
  },

  updateHistoryUI() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '';
    
    this.sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'history-item' + (session.id === this.currentSessionId ? ' active' : '');
      item.onclick = () => this.loadSession(session.id);
      
      const date = new Date(session.updatedAt).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
      });
      
      item.innerHTML = `
        <div class="history-title">${this._escapeHTML(session.title || 'Conversation')}</div>
        <div class="history-date">${date}</div>
      `;
      list.appendChild(item);
    });
  },

  _escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _renderCurrentMessages() {
    const container = document.getElementById('chatMessages');
    const welcome = document.querySelector('.chat-welcome');
    if (!container) return;
    
    // Optional: remove all existing message bubbles
    container.querySelectorAll('.chat-message').forEach(el => el.remove());
    
    if (welcome) {
      welcome.style.display = this.messages.length > 0 ? 'none' : 'flex';
    }
    
    this.messages.forEach(msg => this.appendMessage(msg.role, msg.content));
    this.scrollToBottom();
  },

  toggleHistoryPanel() {
    const sidebar = document.getElementById('chatHistorySidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  clearHistory() {
    if (this.currentSessionId) {
      this.sessions = this.sessions.filter(s => s.id !== this.currentSessionId);
      this.saveSessions();
      this.updateHistoryUI();
      if (this.sessions.length > 0) {
        this.loadSession(this.sessions[0].id);
        return;
      }
    }
    this.startNewSession();
  },

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value?.trim();
    if (!text || this.isStreaming) return;

    // Hide welcome
    const welcome = document.querySelector('.chat-welcome');
    if (welcome) welcome.style.display = 'none';

    // Add user message
    this.messages.push({ role: 'user', content: text });
    this.saveHistory('user', text);
    this.appendMessage('user', text);
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    this.isStreaming = true;
    const typingEl = this.showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages,
          level: window.currentLevel || 'college'
        })
      });

      if (!response.ok) {
        const errData = await response.text().catch(() => 'Unknown error');
        throw new Error(`API error ${response.status}: ${errData}`);
      }

      // Remove typing indicator
      typingEl?.remove();

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      const msgEl = this.appendMessage('assistant', '');
      const bubbleEl = msgEl.querySelector('.msg-bubble');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                if (bubbleEl) bubbleEl.innerHTML = this.renderMarkdown(fullContent);
                this.scrollToBottom();
              }
            } catch (e) { /* skip partial JSON */ }
          }
        }
      }

      if (fullContent) {
        // Final render with full content
        if (bubbleEl) bubbleEl.innerHTML = this.renderMarkdown(fullContent);
        this.messages.push({ role: 'assistant', content: fullContent });
        this.saveHistory('assistant', fullContent);
      } else {
        if (bubbleEl) bubbleEl.textContent = 'Je n\'ai pas pu générer de réponse. Réessayez.';
      }

    } catch (error) {
      typingEl?.remove();
      this.appendMessage('assistant', '⚠️ Erreur de connexion. Vérifiez votre connexion et réessayez.');
      console.error('AI Tutor error:', error);
    }

    this.isStreaming = false;
  },

  /**
   * Render markdown-like content to HTML
   * Supports: bold, italic, inline code, code blocks, LaTeX blocks, headers, lists
   */
  renderMarkdown(text) {
    if (!text) return '';

    // Escape HTML first
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks: ```lang\n...\n``` 
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
    });

    // LaTeX block equations: $$...$$ or \[...\]
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => {
      const tex = eq.trim();
      return `<div class="math-block">${window.katex ? window.katex.renderToString(tex, {displayMode: true, throwOnError: false}) : tex}</div>`;
    });
    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => {
      const tex = eq.trim();
      return `<div class="math-block">${window.katex ? window.katex.renderToString(tex, {displayMode: true, throwOnError: false}) : tex}</div>`;
    });

    // LaTeX inline: $...$ or \(...\)
    html = html.replace(/(?<!\$)\$(?!\$)(.+?)\$(?!\$)/g, (_, eq) => {
      const tex = eq.trim();
      return `<span class="math-inline">${window.katex ? window.katex.renderToString(tex, {displayMode: false, throwOnError: false}) : tex}</span>`;
    });
    html = html.replace(/\\\((.+?)\\\)/g, (_, eq) => {
      const tex = eq.trim();
      return `<span class="math-inline">${window.katex ? window.katex.renderToString(tex, {displayMode: false, throwOnError: false}) : tex}</span>`;
    });

    // Inline code: `...`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Bold: **...**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic: *...*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');

    // Headers: ### ... , ## ... , # ...
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Unordered lists: - item or * item
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Ordered lists: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Line breaks (double newline = paragraph break, single = <br>)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');

    return html;
  },

  appendMessage(role, content) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;

    const rendered = role === 'assistant' && content ? this.renderMarkdown(content) : this.escapeHtml(content);
    div.innerHTML = `
      <div class="msg-avatar">${role === 'user' ? '👤' : '🧠'}</div>
      <div class="msg-bubble">${rendered}</div>`;
    container.appendChild(div);
    this.scrollToBottom();
    return div;
  },

  showTyping() {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.id = 'typingIndicator';
    div.innerHTML = `
      <div class="msg-avatar">🧠</div>
      <div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    container.appendChild(div);
    this.scrollToBottom();
    return div;
  },

  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
