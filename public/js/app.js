/* =====================================================
   MathGenius — Main Application Controller
   ===================================================== */

window.currentLevel = 'college';
window.currentLang = 'fr';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  Calculator.init();
  Geometry.init();
  Graphing.init();
  EquationSolver.init();
  Converter.init();
  Formulas.init();
  AITutor.init();
  setLanguage('fr');

  // --- Floating math symbols ---
  createFloatingSymbols();

  // --- Sidebar toggle (mobile) ---
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebarClose = document.getElementById('sidebarClose');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }

  hamburger?.addEventListener('click', openSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // --- Tool navigation ---
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      // Update sidebar
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update panels
      document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('panel-' + tool);
      if (panel) panel.classList.add('active');
      // Close sidebar on mobile
      closeSidebar();
      // Re-render canvases when switching to them
      if (tool === 'graphing') setTimeout(() => Graphing.resizeCanvas(), 100);
      if (tool === 'geometry') setTimeout(() => Geometry.resizeCanvas(), 100);
    });
  });

  // --- Level selector ---
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.currentLevel = btn.dataset.level;
      // Update header badge
      const badge = document.getElementById('headerLevelBadge');
      if (badge) badge.textContent = t('level' + btn.dataset.level.charAt(0).toUpperCase() + btn.dataset.level.slice(1));
      // Re-render formulas for new level
      Formulas.render();
    });
  });

  // --- Language selector ---
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      window.currentLang = btn.dataset.lang;
      // Re-render formulas
      Formulas.render();
    });
  });

  // --- Quiz ---
  initQuiz();
});

// ============================
// FLOATING MATH SYMBOLS
// ============================
function createFloatingSymbols() {
  const container = document.getElementById('floatingSymbols');
  if (!container) return;
  const symbols = ['π', '∑', '∫', '√', '∞', 'Δ', 'θ', 'λ', 'φ', 'α', 'β', 'γ', '±', '≈', '≠', '∂', 'ε', 'μ'];
  for (let i = 0; i < 20; i++) {
    const span = document.createElement('span');
    span.className = 'floating-symbol';
    span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    span.style.left = Math.random() * 100 + '%';
    span.style.fontSize = (0.8 + Math.random() * 1.5) + 'rem';
    span.style.animationDuration = (15 + Math.random() * 25) + 's';
    span.style.animationDelay = (Math.random() * 20) + 's';
    span.style.opacity = 0.05 + Math.random() * 0.12;
    container.appendChild(span);
  }
}

// ============================
// QUIZ MODULE
// ============================
function initQuiz() {
  let quizData = [];
  let currentQ = 0;
  let score = 0;

  const startBtn = document.getElementById('quizStartBtn');
  const nextBtn = document.getElementById('quizNextBtn');
  const retryBtn = document.getElementById('quizRetryBtn');

  startBtn?.addEventListener('click', async () => {
    const topic = document.getElementById('quizTopic')?.value || 'general';
    const count = parseInt(document.getElementById('quizCount')?.value) || 5;

    document.getElementById('quizSetup').style.display = 'none';
    document.getElementById('quizLoading').style.display = 'flex';
    document.getElementById('quizActive').style.display = 'none';
    document.getElementById('quizResults').style.display = 'none';

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: window.currentLevel,
          topic,
          language: window.currentLang || 'fr',
          count
        })
      });
      const data = await res.json();
      quizData = data.quiz || [];
      currentQ = 0;
      score = 0;

      if (quizData.length === 0) {
        alert('Failed to generate quiz. Please try again.');
        document.getElementById('quizSetup').style.display = 'block';
        document.getElementById('quizLoading').style.display = 'none';
        return;
      }

      document.getElementById('quizLoading').style.display = 'none';
      document.getElementById('quizActive').style.display = 'block';
      showQuestion();

    } catch (err) {
      console.error('Quiz error:', err);
      document.getElementById('quizSetup').style.display = 'block';
      document.getElementById('quizLoading').style.display = 'none';
    }
  });

  nextBtn?.addEventListener('click', () => {
    currentQ++;
    if (currentQ >= quizData.length) {
      showResults();
    } else {
      showQuestion();
    }
  });

  retryBtn?.addEventListener('click', () => {
    document.getElementById('quizResults').style.display = 'none';
    document.getElementById('quizSetup').style.display = 'block';
  });

  function showQuestion() {
    const q = quizData[currentQ];
    if (!q) return;

    document.getElementById('quizQuestionText').textContent = q.question;
    document.getElementById('quizProgressText').textContent = `${currentQ + 1}/${quizData.length}`;
    document.getElementById('quizProgressFill').style.width = ((currentQ + 1) / quizData.length * 100) + '%';
    document.getElementById('quizExplanation').style.display = 'none';
    document.getElementById('quizNextBtn').style.display = 'none';

    const optionsEl = document.getElementById('quizOptions');
    optionsEl.innerHTML = '';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectAnswer(i, q.correct, q.explanation));
      optionsEl.appendChild(btn);
    });
  }

  function selectAnswer(selected, correct, explanation) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((opt, i) => {
      opt.classList.add('disabled');
      if (i === correct) opt.classList.add('correct');
      if (i === selected && selected !== correct) opt.classList.add('wrong');
    });

    if (selected === correct) score++;

    const explEl = document.getElementById('quizExplanation');
    if (explanation) {
      explEl.textContent = explanation;
      explEl.style.display = 'block';
    }
    document.getElementById('quizNextBtn').style.display = 'inline-block';
  }

  function showResults() {
    document.getElementById('quizActive').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';
    document.getElementById('quizScoreValue').textContent = score;
    document.getElementById('quizScoreTotal').textContent = '/' + quizData.length;

    const pct = score / quizData.length;
    let msg;
    if (pct === 1) msg = t('quizResultPerfect');
    else if (pct >= 0.7) msg = t('quizResultGreat');
    else if (pct >= 0.4) msg = t('quizResultGood');
    else msg = t('quizResultTryAgain');

    document.getElementById('quizResultMessage').textContent = msg;
  }
}
