/* =====================================================
   MathGenius — Formula Reference Sheets
   ===================================================== */

const FORMULAS = {
  primary: [
    {
      icon: '➕', titleKey: 'Arithmétique',
      items: [
        { name: 'Addition', expr: 'a + b = c' },
        { name: 'Soustraction', expr: 'a − b = c' },
        { name: 'Multiplication', expr: 'a × b = c' },
        { name: 'Division', expr: 'a ÷ b = c (b ≠ 0)' },
        { name: 'Tables', expr: '1×1=1, 2×2=4, ..., 12×12=144' }
      ]
    },
    {
      icon: '📐', titleKey: 'Géométrie de base',
      items: [
        { name: 'Périmètre carré', expr: 'P = 4 × côté' },
        { name: 'Aire carré', expr: 'A = côté²' },
        { name: 'Périmètre rectangle', expr: 'P = 2 × (L + l)' },
        { name: 'Aire rectangle', expr: 'A = L × l' },
        { name: 'Aire triangle', expr: 'A = (b × h) / 2' }
      ]
    },
    {
      icon: '🔢', titleKey: 'Fractions',
      items: [
        { name: 'Addition', expr: 'a/b + c/d = (ad + bc) / bd' },
        { name: 'Multiplication', expr: 'a/b × c/d = ac / bd' },
        { name: 'Division', expr: 'a/b ÷ c/d = a/b × d/c' }
      ]
    }
  ],
  college: [
    {
      icon: '📊', titleKey: 'Algèbre',
      items: [
        { name: 'Identité remarquable 1', expr: '(a + b)² = a² + 2ab + b²' },
        { name: 'Identité remarquable 2', expr: '(a − b)² = a² − 2ab + b²' },
        { name: 'Identité remarquable 3', expr: '(a+b)(a−b) = a² − b²' },
        { name: 'Équation linéaire', expr: 'ax + b = 0 → x = −b/a' },
        { name: 'Proportionnalité', expr: 'a/b = c/d ⟹ ad = bc' }
      ]
    },
    {
      icon: '📐', titleKey: 'Géométrie',
      items: [
        { name: 'Pythagore', expr: 'a² + b² = c²' },
        { name: 'Thalès', expr: 'AM/AB = AN/AC = MN/BC' },
        { name: 'Aire cercle', expr: 'A = πr²' },
        { name: 'Périmètre cercle', expr: 'P = 2πr' },
        { name: 'Volume sphère', expr: 'V = (4/3)πr³' },
        { name: 'Volume cylindre', expr: 'V = πr²h' }
      ]
    },
    {
      icon: '📈', titleKey: 'Statistiques',
      items: [
        { name: 'Moyenne', expr: 'x̄ = Σxᵢ / n' },
        { name: 'Médiane', expr: 'Valeur centrale ordonnée' },
        { name: 'Étendue', expr: 'E = max − min' },
        { name: 'Pourcentage', expr: 'p% de x = (p/100) × x' }
      ]
    }
  ],
  lycee: [
    {
      icon: '∑', titleKey: 'Analyse',
      items: [
        { name: 'Dérivée x^n', expr: 'f(x)=xⁿ → f\'(x)=nxⁿ⁻¹' },
        { name: 'Dérivée sin/cos', expr: '(sin x)\' = cos x, (cos x)\' = −sin x' },
        { name: 'Dérivée exp/ln', expr: '(eˣ)\' = eˣ, (ln x)\' = 1/x' },
        { name: 'Intégrale xⁿ', expr: '∫xⁿdx = xⁿ⁺¹/(n+1) + C' },
        { name: 'Limite', expr: 'lim(x→a) f(x) = L' }
      ]
    },
    {
      icon: '🔺', titleKey: 'Trigonométrie',
      items: [
        { name: 'Identité fondamentale', expr: 'cos²x + sin²x = 1' },
        { name: 'Formules addition', expr: 'cos(a±b) = cosacosb ∓ sinasinb' },
        { name: 'Formules addition', expr: 'sin(a±b) = sinacosb ± cosasinb' },
        { name: 'Angles remarquables', expr: 'sin(π/6)=1/2, sin(π/4)=√2/2, sin(π/3)=√3/2' }
      ]
    },
    {
      icon: '📊', titleKey: 'Probabilités & Suites',
      items: [
        { name: 'Suite arithmétique', expr: 'uₙ = u₀ + n×r, Sₙ = n(u₁+uₙ)/2' },
        { name: 'Suite géométrique', expr: 'uₙ = u₀ × qⁿ, Sₙ = u₁(1−qⁿ)/(1−q)' },
        { name: 'Combinaisons', expr: 'C(n,k) = n! / (k!(n−k)!)' },
        { name: 'Binomiale', expr: 'P(X=k) = C(n,k)pᵏ(1−p)ⁿ⁻ᵏ' }
      ]
    },
    {
      icon: '🔢', titleKey: 'Nombres complexes',
      items: [
        { name: 'Forme algébrique', expr: 'z = a + bi, i² = −1' },
        { name: 'Module', expr: '|z| = √(a² + b²)' },
        { name: 'Conjugué', expr: 'z̄ = a − bi' },
        { name: 'Euler', expr: 'eⁱθ = cosθ + i sinθ' }
      ]
    }
  ]
};

const Formulas = {
  init() {
    this.render();
  },
  render() {
    const container = document.getElementById('formulasContainer');
    if (!container) return;
    const level = window.currentLevel || 'college';
    const data = FORMULAS[level] || FORMULAS.college;
    container.innerHTML = '';
    data.forEach(category => {
      const card = document.createElement('div');
      card.className = 'formula-card';
      let itemsHtml = '';
      category.items.forEach(item => {
        itemsHtml += `<div class="formula-item"><span class="formula-name">${item.name}</span><span class="formula-expression">${item.expr}</span></div>`;
      });
      card.innerHTML = `
        <div class="formula-card-header">
          <span class="formula-card-icon">${category.icon}</span>
          <span class="formula-card-title">${category.titleKey}</span>
        </div>
        <div class="formula-card-body">${itemsHtml}</div>`;
      container.appendChild(card);
    });
  }
};
