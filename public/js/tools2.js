/* =====================================================
   MathGenius — Equation Solver & Unit Converter
   ===================================================== */

// ============================
// EQUATION SOLVER
// ============================
const EquationSolver = {
  currentType: 'linear',
  init() {
    document.querySelectorAll('.eq-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.eq-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentType = btn.dataset.type;
        document.querySelectorAll('.eq-form').forEach(f => f.classList.remove('active'));
        const id = 'eqForm' + btn.dataset.type.charAt(0).toUpperCase() + btn.dataset.type.slice(1);
        document.getElementById(id)?.classList.add('active');
        document.getElementById('eqSteps').innerHTML = '';
      });
    });
    document.getElementById('eqSolveBtn')?.addEventListener('click', () => this.solve());
  },
  solve() {
    const stepsEl = document.getElementById('eqSteps');
    if (!stepsEl) return;
    stepsEl.innerHTML = '';
    const steps = [];
    if (this.currentType === 'linear') {
      const a = parseFloat(document.getElementById('linA').value) || 0;
      const b = parseFloat(document.getElementById('linB').value) || 0;
      steps.push({ text: `${t('eqStepGiven')}: ${a}x + (${b}) = 0` });
      if (a === 0) {
        steps.push({ text: b === 0 ? '0 = 0 → ∞ solutions' : `${b} ≠ 0 → ∅`, r: true });
      } else {
        steps.push({ text: `${t('eqStepIsolate')}: ${a}x = ${-b}` });
        steps.push({ text: `${t('eqStepDivide')} ${a}` });
        steps.push({ text: `${t('eqStepResult')}: x = ${Math.round(-b/a*1e8)/1e8}`, r: true });
      }
    } else if (this.currentType === 'quadratic') {
      const a = parseFloat(document.getElementById('quadA').value) || 0;
      const b = parseFloat(document.getElementById('quadB').value) || 0;
      const c = parseFloat(document.getElementById('quadC').value) || 0;
      steps.push({ text: `${t('eqStepGiven')}: ${a}x² + (${b})x + (${c}) = 0` });
      if (a === 0) { steps.push({ text: 'a = 0 → not quadratic', r: true }); }
      else {
        const delta = b*b - 4*a*c;
        steps.push({ text: `${t('eqStepDiscriminant')}: Δ = ${b}² − 4(${a})(${c}) = ${Math.round(delta*1e8)/1e8}` });
        if (delta < 0) { steps.push({ text: t('eqStepNoReal'), r: true }); }
        else if (delta === 0) {
          steps.push({ text: t('eqStepOneRoot') });
          steps.push({ text: `${t('eqStepResult')}: x = ${Math.round(-b/(2*a)*1e8)/1e8}`, r: true });
        } else {
          steps.push({ text: t('eqStepTwoRoots') });
          const sq = Math.sqrt(delta);
          steps.push({ text: `√Δ = ${(Math.round(sq*1e6)/1e6)}` });
          steps.push({ text: `${t('eqStepResult')}: x₁ = ${Math.round((-b+sq)/(2*a)*1e8)/1e8}`, r: true });
          steps.push({ text: `${t('eqStepResult')}: x₂ = ${Math.round((-b-sq)/(2*a)*1e8)/1e8}`, r: true });
        }
      }
    } else {
      const a1=parseFloat(document.getElementById('sysA1').value)||0, b1=parseFloat(document.getElementById('sysB1').value)||0, c1=parseFloat(document.getElementById('sysC1').value)||0;
      const a2=parseFloat(document.getElementById('sysA2').value)||0, b2=parseFloat(document.getElementById('sysB2').value)||0, c2=parseFloat(document.getElementById('sysC2').value)||0;
      steps.push({ text: `${a1}x + ${b1}y = ${c1}` });
      steps.push({ text: `${a2}x + ${b2}y = ${c2}` });
      const D = a1*b2 - a2*b1;
      steps.push({ text: `${t('eqStepDeterminant')}: D = ${a1}×${b2} − ${a2}×${b1} = ${D}` });
      if (D === 0) { steps.push({ text: t('eqStepNoSolution'), r: true }); }
      else {
        const Dx=c1*b2-c2*b1, Dy=a1*c2-a2*c1;
        steps.push({ text: `Dx = ${Dx}, Dy = ${Dy}` });
        steps.push({ text: `${t('eqStepResult')}: x = ${Math.round(Dx/D*1e8)/1e8}`, r: true });
        steps.push({ text: `${t('eqStepResult')}: y = ${Math.round(Dy/D*1e8)/1e8}`, r: true });
      }
    }
    steps.forEach((step, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'eq-step' + (step.r ? ' result' : '');
        div.textContent = step.text;
        stepsEl.appendChild(div);
      }, i * 150);
    });
  }
};

// ============================
// UNIT CONVERTER
// ============================
const Converter = {
  currentCategory: 'length',
  units: {
    length: { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 },
    mass: { mg:0.001, g:1, kg:1000, t:1e6, oz:28.3495, lb:453.592 },
    temperature: { '°C':'c', '°F':'f', 'K':'k' },
    area: { 'mm²':1e-6, 'cm²':1e-4, 'm²':1, 'km²':1e6, 'ha':1e4, 'ft²':0.0929, 'ac':4046.86 },
    volume: { mL:0.001, cL:0.01, L:1, 'm³':1000, gal:3.78541, 'fl oz':0.0295735 }
  },
  init() {
    document.querySelectorAll('.conv-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.conv-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.dataset.cat;
        this.populateUnits();
      });
    });
    document.getElementById('convFromValue')?.addEventListener('input', () => this.convert());
    document.getElementById('convFromUnit')?.addEventListener('change', () => this.convert());
    document.getElementById('convToUnit')?.addEventListener('change', () => this.convert());
    document.getElementById('convSwapBtn')?.addEventListener('click', () => {
      const f = document.getElementById('convFromUnit'), t2 = document.getElementById('convToUnit');
      const tmp = f.value; f.value = t2.value; t2.value = tmp; this.convert();
    });
    this.populateUnits();
  },
  populateUnits() {
    const from = document.getElementById('convFromUnit'), to = document.getElementById('convToUnit');
    if (!from||!to) return;
    const keys = Object.keys(this.units[this.currentCategory]);
    from.innerHTML = ''; to.innerHTML = '';
    keys.forEach((u,i) => { from.add(new Option(u,u,i===0,i===0)); to.add(new Option(u,u,i===1,i===1)); });
    this.convert();
  },
  convert() {
    const val = parseFloat(document.getElementById('convFromValue')?.value) || 0;
    const fromU = document.getElementById('convFromUnit')?.value;
    const toU = document.getElementById('convToUnit')?.value;
    const res = document.getElementById('convToValue');
    if (!res) return;
    if (this.currentCategory === 'temperature') {
      let c; if(fromU==='°C')c=val; else if(fromU==='°F')c=(val-32)*5/9; else c=val-273.15;
      let out; if(toU==='°C')out=c; else if(toU==='°F')out=c*9/5+32; else out=c+273.15;
      res.value = out.toFixed(4);
    } else {
      const m = this.units[this.currentCategory];
      res.value = (val * m[fromU] / m[toU]).toFixed(6).replace(/\.?0+$/,'');
    }
  }
};
