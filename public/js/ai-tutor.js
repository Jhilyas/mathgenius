/* =====================================================
   MathGenius — AI Tutor Chat (Poe API / Gemini-3-Pro)
   ===================================================== */

const AITutor = {
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

    // Load chat history from localStorage
    this.loadHistory();
  },

  loadHistory() {
    // Try Supabase first, fallback to localStorage
    if (typeof SupabaseStorage !== 'undefined') {
      SupabaseStorage.loadChatHistory().then(data => {
        if (data && data.length > 0) {
          this.messages = data;
          const welcome = document.querySelector('.chat-welcome');
          if (welcome) welcome.style.display = 'none';
          this.messages.forEach(msg => this.appendMessage(msg.role, msg.content));
        } else {
          this._loadFromLocalStorage();
        }
      }).catch(() => this._loadFromLocalStorage());
    } else {
      this._loadFromLocalStorage();
    }
  },

  _loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('mathgenius_chat_history');
      if (saved) {
        this.messages = JSON.parse(saved);
        if (this.messages.length > 0) {
          const welcome = document.querySelector('.chat-welcome');
          if (welcome) welcome.style.display = 'none';
          this.messages.forEach(msg => this.appendMessage(msg.role, msg.content));
        }
      }
    } catch(e) { this.messages = []; }
  },

  saveHistory(role, content) {
    // Save to Supabase
    if (typeof SupabaseStorage !== 'undefined') SupabaseStorage.saveChatMessage(role, content);
    // Also save to localStorage as fallback
    try {
      const toSave = this.messages.slice(-50);
      localStorage.setItem('mathgenius_chat_history', JSON.stringify(toSave));
    } catch(e) {}
  },

  clearHistory() {
    this.messages = [];
    localStorage.removeItem('mathgenius_chat_history');
    if (typeof SupabaseStorage !== 'undefined') SupabaseStorage.clearChatHistory();
    const container = document.getElementById('chatMessages');
    if (container) container.innerHTML = '';
    const welcome = document.querySelector('.chat-welcome');
    if (welcome) welcome.style.display = 'flex';
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
        throw new Error(`API error: ${response.status}`);
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
                if (bubbleEl) bubbleEl.textContent = fullContent;
                this.scrollToBottom();
              }
            } catch (e) { /* skip partial JSON */ }
          }
        }
      }

      if (fullContent) {
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

  appendMessage(role, content) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.innerHTML = `
      <div class="msg-avatar">${role === 'user' ? '👤' : '🧠'}</div>
      <div class="msg-bubble">${this.escapeHtml(content)}</div>`;
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
