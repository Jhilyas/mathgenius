/* =====================================================
   MathGenius — Math Tools
   Calculator, Geometry, Graphing, Equations, Converter
   ===================================================== */

// ============================
// SCIENTIFIC CALCULATOR
// ============================
const Calculator = {
  expression: '',
  history: '',
  historyList: [],
  init() {
    // Load history from localStorage
    try {
      const saved = localStorage.getItem('mathgenius_calc_history');
      if (saved) this.historyList = JSON.parse(saved);
    } catch(e) { this.historyList = []; }

    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleButton(btn.dataset.action));
    });
    this.updateDisplay();
    this.renderHistory();
  },
  handleButton(action) {
    switch (action) {
      case 'clear': this.expression = ''; this.history = ''; break;
      case 'backspace': this.expression = this.expression.slice(0, -1); break;
      case '=': this.calculate(); return;
      case 'sin': this.expression += 'Math.sin('; break;
      case 'cos': this.expression += 'Math.cos('; break;
      case 'tan': this.expression += 'Math.tan('; break;
      case 'sqrt': this.expression += 'Math.sqrt('; break;
      case 'pow': this.expression += '**2'; break;
      case 'log': this.expression += 'Math.log10('; break;
      case 'ln': this.expression += 'Math.log('; break;
      case 'pi': this.expression += 'Math.PI'; break;
      case 'e': this.expression += 'Math.E'; break;
      case 'abs': this.expression += 'Math.abs('; break;
      case 'percent': this.expression += '/100'; break;
      default: this.expression += action;
    }
    this.updateDisplay();
  },
  calculate() {
    try {
      const displayExpr = this.getDisplayExpression();
      const result = Function('"use strict"; return (' + this.expression + ')')();
      const resultStr = String(Math.round(result * 1e10) / 1e10);
      this.history = displayExpr + ' =';
      
      // Save to history list
      this.historyList.unshift({ expr: displayExpr, result: resultStr, time: Date.now() });
      if (this.historyList.length > 20) this.historyList.pop(); // Keep max 20
      localStorage.setItem('mathgenius_calc_history', JSON.stringify(this.historyList));
      
      this.expression = resultStr;
    } catch { this.history = 'Erreur'; this.expression = ''; }
    this.updateDisplay();
    this.renderHistory();
  },
  getDisplayExpression() {
    return this.expression
      .replace(/Math\.sin\(/g, 'sin(').replace(/Math\.cos\(/g, 'cos(')
      .replace(/Math\.tan\(/g, 'tan(').replace(/Math\.sqrt\(/g, '√(')
      .replace(/Math\.log10\(/g, 'log(').replace(/Math\.log\(/g, 'ln(')
      .replace(/Math\.abs\(/g, '|').replace(/Math\.PI/g, 'π')
      .replace(/Math\.E/g, 'e').replace(/\*\*2/g, '²')
      .replace(/\*/g, '×').replace(/\//g, '÷');
  },
  updateDisplay() {
    const exprEl = document.getElementById('calcExpression');
    const histEl = document.getElementById('calcHistory');
    const displayText = this.getDisplayExpression() || '0';
    if (exprEl) {
      exprEl.textContent = displayText;
      // Auto-shrink font when text is long
      const len = displayText.length;
      if (len <= 8) exprEl.style.fontSize = '2.2rem';
      else if (len <= 12) exprEl.style.fontSize = '1.7rem';
      else if (len <= 16) exprEl.style.fontSize = '1.3rem';
      else if (len <= 22) exprEl.style.fontSize = '1.1rem';
      else exprEl.style.fontSize = '0.9rem';
    }
    if (histEl) histEl.textContent = this.history;
  },
  renderHistory() {
    let container = document.getElementById('calcHistoryList');
    if (!container) {
      // Create history panel below display
      container = document.createElement('div');
      container.id = 'calcHistoryList';
      container.className = 'calc-history-list';
      const calcContainer = document.querySelector('.calculator-container');
      const buttonsEl = document.querySelector('.calc-buttons');
      if (calcContainer && buttonsEl) calcContainer.insertBefore(container, buttonsEl);
    }
    if (this.historyList.length === 0) {
      container.innerHTML = '<p class="calc-history-empty">Pas encore d\'historique</p>';
      return;
    }
    container.innerHTML = '<div class="calc-history-header"><span>Historique</span><button class="calc-history-clear" onclick="Calculator.clearHistory()">Effacer</button></div>' +
      this.historyList.map(h => 
        `<div class="calc-history-item"><span class="calc-hist-expr">${h.expr} =</span><span class="calc-hist-result">${h.result}</span></div>`
      ).join('');
  },
  clearHistory() {
    this.historyList = [];
    localStorage.removeItem('mathgenius_calc_history');
    this.renderHistory();
  }
};

// ============================
// GEOMETRY CANVAS
// ============================
const Geometry = {
  canvas: null, ctx: null, shapes: [], currentShape: 'rectangle',
  isDrawing: false, startX: 0, startY: 0,
  init() {
    this.canvas = document.getElementById('geoCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.canvas.addEventListener('mousedown', e => this.startDraw(e));
    this.canvas.addEventListener('mousemove', e => this.drawing(e));
    this.canvas.addEventListener('mouseup', e => this.endDraw(e));
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this.startDraw(e.touches[0]); });
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); this.drawing(e.touches[0]); });
    this.canvas.addEventListener('touchend', e => { e.preventDefault(); this.endDraw(e.changedTouches[0]); });
    document.querySelectorAll('.geo-tool-btn[data-shape]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.geo-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentShape = btn.dataset.shape;
      });
    });
    document.getElementById('geoClearBtn')?.addEventListener('click', () => {
      this.shapes = []; this.redraw(); this.updateMeasurements(null);
    });
  },
  resizeCanvas() {
    if (!this.canvas) return;
    const w = this.canvas.parentElement.clientWidth;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = w * ratio; this.canvas.height = 500 * ratio;
    this.canvas.style.height = '500px';
    this.ctx.scale(ratio, ratio); this.redraw();
  },
  getPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  },
  startDraw(e) { this.isDrawing = true; const p = this.getPos(e); this.startX = p.x; this.startY = p.y; },
  drawing(e) { if (!this.isDrawing) return; const p = this.getPos(e); this.redraw(); this.drawShape(this.startX, this.startY, p.x, p.y, true); },
  endDraw(e) {
    if (!this.isDrawing) return; this.isDrawing = false;
    const p = this.getPos(e);
    const shape = { type: this.currentShape, x1: this.startX, y1: this.startY, x2: p.x, y2: p.y };
    this.shapes.push(shape); this.redraw(); this.updateMeasurements(shape);
  },
  drawShape(x1, y1, x2, y2, preview = false) {
    const ctx = this.ctx;
    ctx.strokeStyle = preview ? '#5A9E32' : '#2D5016';
    ctx.lineWidth = 2;
    ctx.fillStyle = preview ? 'rgba(90,158,50,0.1)' : 'rgba(45,80,22,0.06)';
    switch (this.currentShape) {
      case 'rectangle': ctx.beginPath(); ctx.rect(x1, y1, x2-x1, y2-y1); ctx.fill(); ctx.stroke(); break;
      case 'circle': { const r = Math.hypot(x2-x1, y2-y1); ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI*2); ctx.fill(); ctx.stroke(); break; }
      case 'triangle': { const mx = (x1+x2)/2; ctx.beginPath(); ctx.moveTo(mx,y1); ctx.lineTo(x1,y2); ctx.lineTo(x2,y2); ctx.closePath(); ctx.fill(); ctx.stroke(); break; }
      case 'line': ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); break;
    }
  },
  redraw() {
    if (!this.ctx) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.strokeStyle = 'rgba(45,80,22,0.06)'; this.ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,h); this.ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(w,y); this.ctx.stroke(); }
    this.shapes.forEach(s => this.drawShape(s.x1, s.y1, s.x2, s.y2));
  },
  updateMeasurements(shape) {
    const el = document.getElementById('geoMeasurements');
    if (!el) return;
    if (!shape) { el.innerHTML = `<p class="geo-placeholder">${t('geoPlaceholder')}</p>`; return; }
    let html = ''; const dx = shape.x2-shape.x1, dy = shape.y2-shape.y1;
    switch (shape.type) {
      case 'rectangle': html = `<p><strong>${t('geoWidth')}:</strong> ${Math.abs(dx).toFixed(1)}px</p><p><strong>${t('geoHeight')}:</strong> ${Math.abs(dy).toFixed(1)}px</p><p><strong>${t('geoArea')}:</strong> ${(Math.abs(dx)*Math.abs(dy)).toFixed(1)}px²</p><p><strong>${t('geoPerimeter')}:</strong> ${(2*(Math.abs(dx)+Math.abs(dy))).toFixed(1)}px</p>`; break;
      case 'circle': { const r = Math.hypot(dx,dy); html = `<p><strong>${t('geoRadius')}:</strong> ${r.toFixed(1)}px</p><p><strong>${t('geoArea')}:</strong> ${(Math.PI*r*r).toFixed(1)}px²</p><p><strong>${t('geoCircumference')}:</strong> ${(2*Math.PI*r).toFixed(1)}px</p>`; break; }
      case 'triangle': html = `<p><strong>${t('geoBase')}:</strong> ${Math.abs(dx).toFixed(1)}px</p><p><strong>${t('geoHeight')}:</strong> ${Math.abs(dy).toFixed(1)}px</p><p><strong>${t('geoArea')}:</strong> ${(0.5*Math.abs(dx)*Math.abs(dy)).toFixed(1)}px²</p>`; break;
      case 'line': html = `<p><strong>${t('geoLineLength')}:</strong> ${Math.hypot(dx,dy).toFixed(1)}px</p>`; break;
    }
    el.innerHTML = html;
  }
};

// ============================
// GRAPH PLOTTER
// ============================
const Graphing = {
  canvas: null, ctx: null, currentFn: 'sin(x)', scale: 50,
  init() {
    this.canvas = document.getElementById('graphCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    document.getElementById('graphPlotBtn')?.addEventListener('click', () => {
      this.currentFn = document.getElementById('graphFunctionInput').value; this.plot();
    });
    document.querySelectorAll('.graph-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('graphFunctionInput').value = btn.dataset.fn;
        this.currentFn = btn.dataset.fn; this.plot();
      });
    });
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      const cx = this.canvas.clientWidth/2, cy = this.canvas.clientHeight/2;
      const mx = (e.clientX-r.left-cx)/this.scale, my = -(e.clientY-r.top-cy)/this.scale;
      const el = document.getElementById('graphCoords');
      if (el) el.textContent = `x: ${mx.toFixed(2)}, y: ${my.toFixed(2)}`;
    });
    document.getElementById('graphFunctionInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { this.currentFn = e.target.value; this.plot(); }
    });
    this.plot();
  },
  resizeCanvas() {
    if (!this.canvas) return;
    const w = this.canvas.parentElement.clientWidth;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = w * ratio; this.canvas.height = 500 * ratio;
    this.canvas.style.height = '500px'; this.ctx.scale(ratio, ratio); this.plot();
  },
  evalFn(expr, x) {
    try {
      const s = expr.replace(/\^/g,'**').replace(/sin/g,'Math.sin').replace(/cos/g,'Math.cos')
        .replace(/tan/g,'Math.tan').replace(/log/g,'Math.log10').replace(/ln/g,'Math.log')
        .replace(/sqrt/g,'Math.sqrt').replace(/abs/g,'Math.abs').replace(/pi/g,'Math.PI')
        .replace(/e(?!x|[a-zA-Z])/g,'Math.E');
      return Function('x','"use strict"; return '+s)(x);
    } catch { return NaN; }
  },
  plot() {
    if (!this.ctx) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const ctx = this.ctx, cx = w/2, cy = h/2, sc = this.scale;
    ctx.clearRect(0,0,w,h); ctx.fillStyle='#FFFDF7'; ctx.fillRect(0,0,w,h);
    // Grid
    ctx.strokeStyle='rgba(45,80,22,0.08)'; ctx.lineWidth=1;
    for(let x=cx%sc;x<w;x+=sc){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=cy%sc;y<h;y+=sc){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    // Axes
    ctx.strokeStyle='rgba(45,80,22,0.35)'; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();
    // Labels
    ctx.fillStyle='rgba(45,80,22,0.5)'; ctx.font='11px "JetBrains Mono",monospace'; ctx.textAlign='center';
    for(let i=-Math.ceil(cx/sc);i<=Math.ceil(cx/sc);i++){if(i===0)continue;ctx.fillText(i,cx+i*sc,cy+16);}
    ctx.textAlign='right';
    for(let i=-Math.ceil(cy/sc);i<=Math.ceil(cy/sc);i++){if(i===0)continue;ctx.fillText(i,cx-8,cy-i*sc+4);}
    // Plot
    ctx.strokeStyle='#4A8528'; ctx.lineWidth=2.5; ctx.beginPath(); let started=false;
    for(let px=0;px<w;px++){
      const x=(px-cx)/sc, y=this.evalFn(this.currentFn,x);
      if(isNaN(y)||!isFinite(y)){started=false;continue;}
      const py=cy-y*sc;
      if(py<-1000||py>h+1000){started=false;continue;}
      if(!started){ctx.moveTo(px,py);started=true;}else{ctx.lineTo(px,py);}
    }
    ctx.stroke();
    ctx.fillStyle='#2D5016'; ctx.font='bold 14px "JetBrains Mono",monospace'; ctx.textAlign='left';
    ctx.fillText('f(x) = '+this.currentFn,12,24);
  }
};
