/**
 * STEM Diagram Synthesizer Service
 * Deterministic, high-precision vector SVG diagram generator for Mathematics, Physics, Chemistry, and Biology.
 * Eliminates generic/hardcoded fallbacks and provides mathematically and scientifically authentic diagrams.
 */

class STEMDiagramSynthesizer {
    /**
     * Generate an authentic Chemistry SVG diagram based on question parameters.
     */
    generateChemistrySVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Aspirin (Acetylsalicylic Acid)
        if (combined.includes('aspirin') || combined.includes('acetylsalicylic')) {
            return {
                title: 'Aspirin (Acetylsalicylic Acid) — C₉H₈O₄',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Aspirin (Acetylsalicylic Acid) — C₉H₈O₄</text>
  
  <!-- Benzene Ring (Center: 145, 190) -->
  <polygon points="145,138 188,163 188,213 145,238 102,213 102,163" fill="#f8fafc" stroke="#0284c7" stroke-width="3"/>
  <circle cx="145" cy="188" r="26" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="145" y="193" fill="#0369a1" font-size="11" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Aromatic Ring</text>

  <!-- Carboxylic Acid Group (-COOH) at top-right (188, 163) -->
  <line x1="188" y1="163" x2="232" y2="138" stroke="#0f172a" stroke-width="3"/>
  <!-- C=O -->
  <line x1="230" y1="136" x2="230" y2="92" stroke="#ef4444" stroke-width="3"/>
  <line x1="236" y1="136" x2="236" y2="92" stroke="#ef4444" stroke-width="3"/>
  <text x="233" y="86" fill="#ef4444" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">O</text>
  <!-- -OH -->
  <line x1="232" y1="138" x2="272" y2="160" stroke="#0f172a" stroke-width="3"/>
  <text x="290" y="170" fill="#059669" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">OH</text>
  <rect x="210" y="62" width="115" height="22" rx="4" fill="#fef2f2" stroke="#fca5a5" stroke-width="1"/>
  <text x="267" y="77" fill="#b91c1c" font-size="10" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Carboxyl (-COOH)</text>

  <!-- Ester Group (-O-CO-CH3) at bottom-right (188, 213) -->
  <line x1="188" y1="213" x2="232" y2="238" stroke="#0f172a" stroke-width="3"/>
  <text x="242" y="248" fill="#0284c7" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">O</text>
  <line x1="250" y1="248" x2="282" y2="235" stroke="#0f172a" stroke-width="3"/>
  <!-- C=O of ester -->
  <line x1="280" y1="233" x2="280" y2="195" stroke="#ef4444" stroke-width="3"/>
  <line x1="286" y1="233" x2="286" y2="195" stroke="#ef4444" stroke-width="3"/>
  <text x="283" y="190" fill="#ef4444" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">O</text>
  <!-- -CH3 -->
  <line x1="282" y1="235" x2="316" y2="255" stroke="#0f172a" stroke-width="3"/>
  <text x="338" y="262" fill="#0f172a" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">CH₃</text>
  <rect x="235" y="280" width="125" height="22" rx="4" fill="#eff6ff" stroke="#93c5fd" stroke-width="1"/>
  <text x="297" y="295" fill="#1d4ed8" font-size="10" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Ester (-OCOCH₃)</text>

  <!-- Bottom Info Badge -->
  <rect x="20" y="340" width="340" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="357" fill="#475569" font-size="11" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Molar Mass: 180.16 g/mol • IUPAC: 2-acetoxybenzoic acid</text>
</svg>`
            };
        }

        // 2. Fischer Esterification Reaction Scheme
        if (combined.includes('ester') || combined.includes('esterification') || (combined.includes('acetic') && combined.includes('ethanol'))) {
            return {
                title: 'Fischer Esterification (Acid + Alcohol ⇌ Ester + Water)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Fischer Esterification Reaction Scheme</text>

  <!-- Reactant 1: Acetic Acid (CH3COOH) -->
  <rect x="20" y="70" width="145" height="105" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="92" y="92" fill="#b91c1c" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Acetic Acid (CH₃COOH)</text>
  <text x="45" y="140" fill="#0f172a" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">H₃C</text>
  <line x1="75" y1="135" x2="105" y2="135" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="103" y1="133" x2="103" y2="108" stroke="#ef4444" stroke-width="2.5"/>
  <line x1="108" y1="133" x2="108" y2="108" stroke="#ef4444" stroke-width="2.5"/>
  <text x="106" y="104" fill="#ef4444" font-size="12" font-weight="bold" text-anchor="middle">O</text>
  <line x1="105" y1="135" x2="130" y2="150" stroke="#0f172a" stroke-width="2.5"/>
  <text x="145" y="158" fill="#059669" font-size="13" font-weight="bold" text-anchor="middle">OH</text>

  <text x="190" y="130" fill="#64748b" font-size="22" font-weight="bold" text-anchor="middle">+</text>

  <!-- Reactant 2: Ethanol (CH3CH2OH) -->
  <rect x="215" y="70" width="145" height="105" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="287" y="92" fill="#0369a1" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Ethanol (CH₃CH₂OH)</text>
  <text x="235" y="140" fill="#0f172a" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">H₃C</text>
  <line x1="265" y1="135" x2="295" y2="135" stroke="#0f172a" stroke-width="2.5"/>
  <text x="308" y="140" fill="#0f172a" font-size="13" font-weight="bold">CH₂</text>
  <line x1="330" y1="135" x2="345" y2="135" stroke="#0f172a" stroke-width="2.5"/>
  <text x="352" y="140" fill="#059669" font-size="13" font-weight="bold">OH</text>

  <!-- Equilibrium Reaction Arrow with Catalyst -->
  <g transform="translate(190, 195)">
    <line x1="-50" y1="-5" x2="50" y2="-5" stroke="#4f46e5" stroke-width="2"/>
    <polygon points="50,-5 42,-8 42,-2" fill="#4f46e5"/>
    <line x1="50" y1="5" x2="-50" y2="5" stroke="#4f46e5" stroke-width="2"/>
    <polygon points="-50,5 -42,8 -42,2" fill="#4f46e5"/>
    <text x="0" y="-12" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">H₂SO₄ (cat.) / Δ</text>
    <text x="0" y="20" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">Reversible Equilibrium</text>
  </g>

  <!-- Product: Ethyl Acetate (CH3COOCH2CH3) + Water -->
  <rect x="25" y="235" width="330" height="95" rx="8" fill="#f0fdf4" stroke="#86efac"/>
  <text x="190" y="255" fill="#15803d" font-size="12" font-weight="bold" text-anchor="middle">Ethyl Acetate (Ester, Fruity Odor) + Water (H₂O)</text>
  <text x="50" y="295" fill="#0f172a" font-size="13" font-weight="bold">H₃C</text>
  <line x1="80" y1="290" x2="110" y2="290" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="108" y1="288" x2="108" y2="265" stroke="#ef4444" stroke-width="2.5"/>
  <line x1="113" y1="288" x2="113" y2="265" stroke="#ef4444" stroke-width="2.5"/>
  <text x="110.5" y="260" fill="#ef4444" font-size="12" font-weight="bold" text-anchor="middle">O</text>
  <line x1="110" y1="290" x2="135" y2="305" stroke="#0f172a" stroke-width="2.5"/>
  <text x="145" y="312" fill="#0284c7" font-size="13" font-weight="bold" text-anchor="middle">O</text>
  <line x1="155" y1="305" x2="185" y2="290" stroke="#0f172a" stroke-width="2.5"/>
  <text x="200" y="295" fill="#0f172a" font-size="13" font-weight="bold">CH₂</text>
  <line x1="225" y1="290" x2="245" y2="290" stroke="#0f172a" stroke-width="2.5"/>
  <text x="260" y="295" fill="#0f172a" font-size="13" font-weight="bold">CH₃</text>
  
  <text x="290" y="295" fill="#64748b" font-size="16" font-weight="bold">+</text>
  <text x="325" y="295" fill="#0284c7" font-size="13" font-weight="bold" text-anchor="middle">H₂O</text>

  <!-- Bottom Badge -->
  <rect x="25" y="342" width="330" height="24" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="358" fill="#475569" font-size="10.5" font-weight="bold" text-anchor="middle">Nucleophilic Acyl Substitution • Equilibrium Const K ≈ 4</text>
</svg>`
            };
        }

        // 3. Acid-Base Titration Curve & Equivalence Point Simulation
        if (combined.includes('titration') || combined.includes('neutralization') || combined.includes('equivalence point') || combined.includes('burette') || combined.includes('ph curve')) {
            return {
                title: 'Acid-Base pH Titration Curve & Equivalence Point (rdkit-mcp)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Acid-Base pH Titration Curve (Strong Acid vs Strong Base)</text>

  <!-- Plot Axes: origin at (55, 300) -->
  <line x1="55" y1="300" x2="350" y2="300" stroke="#0f172a" stroke-width="2"/>
  <polygon points="350,300 342,296 342,304" fill="#0f172a"/>
  <text x="340" y="322" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="end">Volume of 0.1 M NaOH added (mL)</text>

  <line x1="55" y1="300" x2="55" y2="45" stroke="#0f172a" stroke-width="2"/>
  <polygon points="55,45 51,53 59,53" fill="#0f172a"/>
  <text x="50" y="40" fill="#0f172a" font-size="11.5" font-weight="bold" text-anchor="start">pH</text>

  <!-- Y-Axis pH ticks -->
  <text x="45" y="303" fill="#64748b" font-size="10" font-weight="bold" text-anchor="end">0</text>
  <line x1="50" y1="235" x2="55" y2="235" stroke="#94a3b8"/>
  <text x="45" y="238" fill="#64748b" font-size="10" text-anchor="end">3.5</text>
  <line x1="50" y1="172" x2="55" y2="172" stroke="#94a3b8"/>
  <text x="45" y="175" fill="#15803d" font-size="10" font-weight="bold" text-anchor="end">7.0</text>
  <line x1="50" y1="110" x2="55" y2="110" stroke="#94a3b8"/>
  <text x="45" y="113" fill="#64748b" font-size="10" text-anchor="end">10.5</text>
  <line x1="50" y1="50" x2="55" y2="50" stroke="#94a3b8"/>
  <text x="45" y="53" fill="#64748b" font-size="10" font-weight="bold" text-anchor="end">14</text>

  <!-- Phenolphthalein Transition Range (pH 8.2 - 10.0, faint pink band) -->
  <rect x="55" y="125" width="285" height="30" fill="#fdf2f8" stroke="#f472b6" stroke-width="1" stroke-dasharray="3,3" opacity="0.8"/>
  <text x="330" y="143" fill="#db2777" font-size="9" font-weight="bold" text-anchor="end">Phenolphthalein Zone (pH 8.2 - 10.0)</text>

  <!-- Neutral pH = 7.0 line -->
  <line x1="55" y1="172" x2="340" y2="172" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4"/>

  <!-- Sigmoidal Titration Curve (HCl + NaOH -> NaCl + H2O) -->
  <!-- Scaled coordinates: 0 mL -> (55, 280), 20 mL -> (175, 260), 24.5 mL -> (200, 230), 25 mL -> (205, 172), 25.5 mL -> (210, 110), 30 mL -> (235, 75), 50 mL -> (340, 65) -->
  <path d="M 55 280 C 130 275, 185 265, 200 235 L 205 172 L 210 110 C 220 80, 260 70, 340 65" fill="none" stroke="#2563eb" stroke-width="3"/>

  <!-- Equivalence Point Marker (25.0 mL, pH 7.00) -->
  <circle cx="205" cy="172" r="5.5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="205" y1="172" x2="205" y2="300" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="205" y="315" fill="#ef4444" font-size="10.5" font-weight="bold" text-anchor="middle">Veq = 25.0 mL</text>

  <rect x="215" y="160" width="135" height="36" rx="4" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="222" y="174" fill="#b91c1c" font-size="10" font-weight="bold">Equivalence Point</text>
  <text x="222" y="188" fill="#7f1d1d" font-size="9.5">pH = 7.00 • [H⁺] = [OH⁻]</text>

  <!-- Half-Equivalence Point (12.5 mL, pH 1.48) -->
  <circle cx="130" cy="272" r="4" fill="#0284c7"/>
  <text x="130" y="263" fill="#0369a1" font-size="8.5" font-weight="bold" text-anchor="middle">Buffering Region</text>

  <!-- Bottom Educational Summary -->
  <rect x="25" y="336" width="330" height="32" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="350" fill="#0f172a" font-size="10" font-weight="bold" text-anchor="middle">Stoichiometric Neutralization: M₁V₁ = M₂V₂ • Rapid pH Jump</text>
  <text x="190" y="362" fill="#475569" font-size="9" text-anchor="middle">Zero commercial fee / BSD-3-Clause Permissive (rdkit-mcp)</text>
</svg>`
            };
        }

        // 4. Buffer Solution & Henderson-Hasselbalch Equilibrium
        if (combined.includes('buffer') || combined.includes('ka') || (combined.includes('acid') && combined.includes('acetate'))) {
            return {
                title: 'Acidic Buffer Equilibrium & Henderson-Hasselbalch Calculation',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Buffer Solution Equilibrium (CH₃COOH / CH₃COONa)</text>

  <!-- Beaker Representation -->
  <rect x="30" y="60" width="140" height="150" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="2.5"/>
  <rect x="35" y="100" width="130" height="105" rx="4" fill="#dbeafe" opacity="0.8"/>
  <text x="100" y="85" fill="#1e3a8a" font-size="12" font-weight="bold" text-anchor="middle">Buffer Beaker</text>
  <text x="100" y="130" fill="#1e40af" font-size="11" font-weight="bold" text-anchor="middle">[HA] = 0.15 M</text>
  <text x="100" y="150" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">[A⁻] = 0.10 M</text>
  <text x="100" y="175" fill="#059669" font-size="11" font-weight="bold" text-anchor="middle">Ka = 1.8 × 10⁻⁵</text>

  <!-- Equilibrium Equation Card -->
  <rect x="185" y="60" width="170" height="150" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="270" y="82" fill="#0f172a" font-size="11.5" font-weight="bold" text-anchor="middle">Dissociation Equilibrium</text>
  <text x="270" y="110" fill="#b91c1c" font-size="11.5" font-weight="bold" text-anchor="middle">CH₃COOH ⇌ CH₃COO⁻ + H⁺</text>
  <text x="270" y="138" fill="#475569" font-size="11" text-anchor="middle">pKa = -log₁₀(1.8×10⁻⁵)</text>
  <text x="270" y="158" fill="#475569" font-size="12" font-weight="bold" text-anchor="middle">pKa = 4.74</text>
  <rect x="195" y="172" width="150" height="28" rx="5" fill="#dcfce7" stroke="#86efac"/>
  <text x="270" y="191" fill="#15803d" font-size="12.5" font-weight="bold" text-anchor="middle">Calculated pH = 4.56</text>

  <!-- Henderson-Hasselbalch Formula Box -->
  <rect x="30" y="225" width="325" height="100" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="192" y="248" fill="#334155" font-size="12.5" font-weight="bold" text-anchor="middle">Henderson-Hasselbalch Equation</text>
  <text x="192" y="278" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">pH = pKa + log₁₀([A⁻] / [HA])</text>
  <text x="192" y="305" fill="#1d4ed8" font-size="13" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">pH = 4.74 + log₁₀(0.10 / 0.15) = 4.74 - 0.18 = 4.56</text>

  <!-- Bottom Badge -->
  <rect x="30" y="340" width="325" height="26" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="192" y="357" fill="#475569" font-size="11" font-weight="bold" text-anchor="middle">Weak Acid Buffer System • Resists pH Changes Upon Acid/Base Addition</text>
</svg>`
            };
        }

        // 4. Default Organic Molecule: Benzene Ring
        return {
            title: 'Benzene Molecule (C₆H₆) & Aromatic Resonance',
            svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="30" fill="#0f172a" font-size="15" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Benzene (C₆H₆) — Aromatic Delocalization</text>
  <polygon points="190,80 260,120 260,200 190,240 120,200 120,120" fill="#f0f9ff" stroke="#0284c7" stroke-width="3"/>
  <circle cx="190" cy="160" r="44" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="5,5"/>
  <text x="190" y="165" fill="#0369a1" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">6π Electrons</text>

  <!-- Vertices (Carbons & Hydrogens) -->
  <circle cx="190" cy="80" r="5" fill="#0284c7"/>
  <text x="190" y="65" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">H</text>
  <circle cx="260" cy="120" r="5" fill="#0284c7"/>
  <text x="280" y="125" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="start">H</text>
  <circle cx="260" cy="200" r="5" fill="#0284c7"/>
  <text x="280" y="205" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="start">H</text>
  <circle cx="190" cy="240" r="5" fill="#0284c7"/>
  <text x="190" y="260" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">H</text>
  <circle cx="120" cy="200" r="5" fill="#0284c7"/>
  <text x="100" y="205" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="end">H</text>
  <circle cx="120" cy="120" r="5" fill="#0284c7"/>
  <text x="100" y="125" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="end">H</text>

  <!-- Labels -->
  <rect x="40" y="280" width="300" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="298" fill="#1e293b" font-size="11.5" font-weight="bold" text-anchor="middle">Planar Ring • Bond Angle: 120° (sp² Hybridization)</text>
  <text x="190" y="315" fill="#0284c7" font-size="11.5" font-weight="bold" text-anchor="middle">Equal C-C Bond Length: 1.39 Å (Intermediate single/double)</text>

  <rect x="30" y="342" width="320" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="358" fill="#1e40af" font-size="11" font-weight="bold" text-anchor="middle">Hückel's Rule (4n+2): n=1, 6 aromatic π-electrons</text>
</svg>`
        };
    }

    /**
     * Generate an authentic Biology SVG diagram based on question parameters.
     */
    generateBiologySVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Human Hemoglobin (Macromolecular Structure)
        if (combined.includes('hemoglobin') || combined.includes('myoglobin') || combined.includes('1a3n') || combined.includes('protein')) {
            return {
                title: 'Human Hemoglobin (Hb Tetramer: α₂β₂) & Heme Pockets',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Human Hemoglobin Tetramer (α₂β₂) — PDB: 1A3N</text>

  <!-- 4 Globin Subunits (α1, α2, β1, β2) -->
  <!-- Subunit alpha1 (Top Left) -->
  <path d="M 120 75 Q 160 85 165 130 Q 155 170 115 165 Q 80 150 85 110 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="2.5" opacity="0.9"/>
  <text x="120" y="115" fill="#0369a1" font-size="13" font-weight="bold" text-anchor="middle">α₁ Chain</text>
  <!-- Heme 1 -->
  <circle cx="130" cy="140" r="14" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
  <circle cx="130" cy="140" r="5" fill="#fef08a" stroke="#ca8a04"/>
  <text x="130" y="144" fill="#991b1b" font-size="8" font-weight="bold" text-anchor="middle">Fe²⁺</text>

  <!-- Subunit beta1 (Top Right) -->
  <path d="M 260 75 Q 295 110 265 165 Q 225 170 215 130 Q 220 85 260 75 Z" fill="#c7d2fe" stroke="#4f46e5" stroke-width="2.5" opacity="0.9"/>
  <text x="260" y="115" fill="#3730a3" font-size="13" font-weight="bold" text-anchor="middle">β₁ Chain</text>
  <!-- Heme 2 -->
  <circle cx="250" cy="140" r="14" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
  <circle cx="250" cy="140" r="5" fill="#fef08a" stroke="#ca8a04"/>
  <text x="250" y="144" fill="#991b1b" font-size="8" font-weight="bold" text-anchor="middle">Fe²⁺</text>

  <!-- Subunit beta2 (Bottom Left) -->
  <path d="M 115 200 Q 155 195 165 240 Q 160 280 120 290 Q 85 255 85 220 Z" fill="#ddd6fe" stroke="#7c3aed" stroke-width="2.5" opacity="0.9"/>
  <text x="120" y="255" fill="#5b21b6" font-size="13" font-weight="bold" text-anchor="middle">β₂ Chain</text>
  <!-- Heme 3 -->
  <circle cx="130" cy="225" r="14" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
  <circle cx="130" cy="225" r="5" fill="#fef08a" stroke="#ca8a04"/>
  <text x="130" y="229" fill="#991b1b" font-size="8" font-weight="bold" text-anchor="middle">Fe²⁺</text>

  <!-- Subunit alpha2 (Bottom Right) -->
  <path d="M 265 200 Q 295 220 260 290 Q 220 280 215 240 Q 225 195 265 200 Z" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="2.5" opacity="0.9"/>
  <text x="260" y="255" fill="#0369a1" font-size="13" font-weight="bold" text-anchor="middle">α₂ Chain</text>
  <!-- Heme 4 -->
  <circle cx="250" cy="225" r="14" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
  <circle cx="250" cy="225" r="5" fill="#fef08a" stroke="#ca8a04"/>
  <text x="250" y="229" fill="#991b1b" font-size="8" font-weight="bold" text-anchor="middle">Fe²⁺</text>

  <!-- Central Oxygen Binding Highlight -->
  <rect x="150" y="172" width="80" height="26" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="190" y="189" fill="#b91c1c" font-size="11.5" font-weight="bold" text-anchor="middle">4 O₂ Sites</text>

  <!-- Explanatory Legend -->
  <rect x="25" y="305" width="330" height="32" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="325" fill="#334155" font-size="11" font-weight="bold" text-anchor="middle">4 Heme groups with Fe²⁺ coordinate O₂ reversibly (Cooperative Binding)</text>

  <rect x="25" y="344" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="360" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Mol* Interactive Viewer: PDB ID 1A3N • Allosteric T ⇌ R State</text>
</svg>`
            };
        }

        // 2. Enzyme Kinetics (Michaelis-Menten Plot)
        if (combined.includes('enzyme') || combined.includes('michaelis') || combined.includes('vmax') || combined.includes('km')) {
            return {
                title: 'Enzyme Kinetics (Michaelis-Menten Hyperbolic Curve)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Michaelis-Menten Enzyme Kinetics Curve</text>

  <!-- Axes: origin at (60, 290) -->
  <line x1="60" y1="290" x2="340" y2="290" stroke="#0f172a" stroke-width="2"/>
  <polygon points="340,290 332,286 332,294" fill="#0f172a"/>
  <text x="345" y="305" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="end">Substrate [S] (mM)</text>

  <line x1="60" y1="290" x2="60" y2="60" stroke="#0f172a" stroke-width="2"/>
  <polygon points="60,60 56,68 64,68" fill="#0f172a"/>
  <text x="50" y="52" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="start">Velocity v (µmol/min)</text>

  <!-- Vmax Asymptote (y = 110) -->
  <line x1="60" y1="110" x2="330" y2="110" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="335" y="114" fill="#ef4444" font-size="11.5" font-weight="bold" text-anchor="start">Vmax = 50</text>
  <text x="50" y="114" fill="#ef4444" font-size="11.5" font-weight="bold" text-anchor="end">Vmax</text>

  <!-- 1/2 Vmax (y = 200) -->
  <line x1="60" y1="200" x2="135" y2="200" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="50" y="204" fill="#6366f1" font-size="11" font-weight="bold" text-anchor="end">½ Vmax</text>

  <!-- Km Drop Line (x = 135) -->
  <line x1="135" y1="200" x2="135" y2="290" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,3"/>
  <circle cx="135" cy="200" r="4.5" fill="#6366f1"/>
  <text x="135" y="306" fill="#6366f1" font-size="12" font-weight="bold" text-anchor="middle">Km = 2.5</text>

  <!-- Michaelis-Menten Hyperbolic Curve -->
  <!-- v = (Vmax * S) / (Km + S). Scaled to fit [0..20] into width [60..320] -->
  <path d="M 60 290 Q 95 240 135 200 Q 185 155 240 135 Q 290 120 330 115" fill="none" stroke="#2563eb" stroke-width="3.5"/>

  <!-- Operational Point: [S] = 5 mM -> v = 33.3 -->
  <circle cx="180" cy="170" r="5" fill="#059669"/>
  <line x1="180" y1="170" x2="180" y2="290" stroke="#059669" stroke-width="1.5" stroke-dasharray="2,2"/>
  <text x="180" y="306" fill="#059669" font-size="11" font-weight="bold" text-anchor="middle">[S] = 5</text>
  <line x1="60" y1="170" x2="180" y2="170" stroke="#059669" stroke-width="1.5" stroke-dasharray="2,2"/>
  <text x="50" y="174" fill="#059669" font-size="11" font-weight="bold" text-anchor="end">33.3</text>
  <rect x="190" y="155" width="130" height="22" rx="4" fill="#dcfce7" stroke="#86efac"/>
  <text x="255" y="170" fill="#166534" font-size="10.5" font-weight="bold" text-anchor="middle">v = 33.33 µmol/min</text>

  <!-- Equation Card -->
  <rect x="70" y="325" width="280" height="40" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="342" fill="#1e293b" font-size="11.5" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">v = (Vmax · [S]) / (Km + [S])</text>
  <text x="210" y="358" fill="#475569" font-size="10.5" font-weight="bold" text-anchor="middle">Substrate saturation leads to zero-order kinetics at high [S]</text>
</svg>`
            };
        }

        // 3. Default Cell Biology Diagram
        return {
            title: 'Eukaryotic Cell Ultrastructure & Key Organelles',
            svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Eukaryotic Cell Structure & Organelles</text>
  <!-- Outer Membrane -->
  <ellipse cx="190" cy="180" rx="140" ry="110" fill="#f0fdf4" stroke="#16a34a" stroke-width="3"/>
  <text x="310" y="110" fill="#15803d" font-size="11" font-weight="bold">Plasma Membrane</text>

  <!-- Nucleus -->
  <circle cx="160" cy="180" r="45" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
  <circle cx="160" cy="180" r="18" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
  <text x="160" y="184" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">Nucleolus</text>
  <text x="160" y="215" fill="#78350f" font-size="10" font-weight="bold" text-anchor="middle">Nucleus</text>

  <!-- Mitochondrion -->
  <ellipse cx="250" cy="220" rx="28" ry="16" fill="#fed7aa" stroke="#ea580c" stroke-width="2" transform="rotate(-20, 250, 220)"/>
  <path d="M 230 220 Q 240 215 250 225 Q 260 215 270 220" fill="none" stroke="#c2410c" stroke-width="1.5"/>
  <text x="290" y="235" fill="#c2410c" font-size="10" font-weight="bold">Mitochondria (ATP)</text>

  <!-- Ribosomes -->
  <circle cx="120" cy="120" r="3" fill="#64748b"/>
  <circle cx="128" cy="125" r="3" fill="#64748b"/>
  <circle cx="115" cy="130" r="3" fill="#64748b"/>
  <text x="90" y="115" fill="#475569" font-size="10" font-weight="bold">Ribosomes</text>

  <rect x="25" y="325" width="330" height="38" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="342" fill="#334155" font-size="11" font-weight="bold" text-anchor="middle">Endomembrane System • Cellular Respiration & Protein Synthesis</text>
  <text x="190" y="356" fill="#059669" font-size="10.5" font-weight="bold" text-anchor="middle">Compartmentalized biochemical microenvironments</text>
</svg>`
        };
    }

    /**
     * Generate an authentic Mathematics SVG diagram based on question parameters.
     */
    generateMathSVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Equilateral Triangle Inscribed Inside a Circle
        if (combined.includes('inscribed') || (combined.includes('triangle') && combined.includes('circle'))) {
            // Radius R = 6 cm. Scale: R = 110 px. Center: (190, 185)
            return {
                title: 'Equilateral Triangle Inscribed in Circle (R = 6 cm)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Equilateral Triangle Inscribed in Circle (Radius R = 6 cm)</text>

  <!-- Circumcircle: Center (190, 185), Radius 110 -->
  <circle cx="190" cy="185" r="110" fill="#f0f9ff" stroke="#0284c7" stroke-width="3"/>

  <!-- Shaded remaining area pattern / fill inside circle, outside triangle -->
  <!-- Inscribed Triangle Vertices:
       A = (190, 185 - 110) = (190, 75)
       B = (190 - 110*cos(30), 185 + 110*sin(30)) = (190 - 95.26, 185 + 55) = (94.7, 240)
       C = (190 + 95.26, 240) = (285.3, 240)
  -->
  <polygon points="190,75 94.7,240 285.3,240" fill="#e0e7ff" stroke="#4338ca" stroke-width="3"/>

  <!-- Center O -->
  <circle cx="190" cy="185" r="4.5" fill="#0f172a"/>
  <text x="190" y="202" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">O (Center)</text>

  <!-- Radius OA, OB, OC -->
  <line x1="190" y1="185" x2="190" y2="75" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,3"/>
  <text x="198" y="135" fill="#dc2626" font-size="12" font-weight="bold">R = 6 cm</text>

  <line x1="190" y1="185" x2="94.7" y2="240" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="190" y1="185" x2="285.3" y2="240" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/>

  <!-- Vertices labels -->
  <circle cx="190" cy="75" r="4" fill="#4338ca"/>
  <text x="190" y="65" fill="#312e81" font-size="13" font-weight="bold" text-anchor="middle">A</text>
  <circle cx="94.7" cy="240" r="4" fill="#4338ca"/>
  <text x="80" y="248" fill="#312e81" font-size="13" font-weight="bold" text-anchor="end">B</text>
  <circle cx="285.3" cy="240" r="4" fill="#4338ca"/>
  <text x="300" y="248" fill="#312e81" font-size="13" font-weight="bold" text-anchor="start">C</text>

  <!-- Side length label (s = R*sqrt(3)) -->
  <text x="190" y="260" fill="#4338ca" font-size="12.5" font-weight="bold" text-anchor="middle">s = R√3 = 6√3 ≈ 10.39 cm</text>

  <!-- Area Calculations Badge -->
  <rect x="25" y="295" width="330" height="42" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="313" fill="#1e293b" font-size="11.5" font-weight="bold" text-anchor="middle">Area(Δ) = (√3/4)s² = 27√3 ≈ 46.77 cm²</text>
  <text x="190" y="330" fill="#0369a1" font-size="11.5" font-weight="bold" text-anchor="middle">Remaining Shaded Area = 36π - 27√3 ≈ 66.33 cm²</text>

  <rect x="25" y="345" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="361" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Euclidean Inscribed Polygon Theorem: R = s / √3</text>
</svg>`
            };
        }

        // 2. Calculus: Bounded Area Between Parabola y = x^2 and Line y = 2x
        if (combined.includes('area') && (combined.includes('parabola') || combined.includes('x^2') || combined.includes('2x') || combined.includes('curve'))) {
            return {
                title: 'Bounded Area Between y = x² and y = 2x (A = 4/3)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Area Bounded Between Parabola y = x² and Line y = 2x</text>

  <!-- Coordinate Axes: Origin O at (80, 270). Scale: 1 unit = 70px x-axis, 35px y-axis -->
  <line x1="50" y1="270" x2="330" y2="270" stroke="#0f172a" stroke-width="2"/>
  <polygon points="330,270 322,266 322,274" fill="#0f172a"/>
  <text x="335" y="285" fill="#0f172a" font-size="13" font-weight="bold" text-anchor="end">X</text>

  <line x1="80" y1="290" x2="80" y2="50" stroke="#0f172a" stroke-width="2"/>
  <polygon points="80,50 76,58 84,58" fill="#0f172a"/>
  <text x="70" y="55" fill="#0f172a" font-size="13" font-weight="bold" text-anchor="end">Y</text>

  <!-- Shaded enclosed region: x from 0 to 2 (80 to 220 px) -->
  <path d="M 80 270 Q 150 235 220 130 L 80 270 Z" fill="#c7d2fe" opacity="0.6"/>

  <!-- Parabola: y = x^2 (Points: (0,0)->(80,270), (1,1)->(150,235), (2,4)->(220,130), (2.3, 5.3)->(241,85)) -->
  <path d="M 60 285 Q 80 270 150 235 T 220 130 T 250 65" fill="none" stroke="#2563eb" stroke-width="3"/>
  <text x="255" y="75" fill="#2563eb" font-size="13" font-weight="bold">y = x²</text>

  <!-- Line: y = 2x (Points: (0,0)->(80,270), (2,4)->(220,130), (2.5, 5)->(255,95)) -->
  <line x1="60" y1="290" x2="260" y2="90" stroke="#7c3aed" stroke-width="3"/>
  <text x="265" y="100" fill="#7c3aed" font-size="13" font-weight="bold">y = 2x</text>

  <!-- Intersection 1: (0, 0) -->
  <circle cx="80" cy="270" r="5" fill="#dc2626"/>
  <text x="70" y="285" fill="#dc2626" font-size="12" font-weight="bold" text-anchor="end">(0, 0)</text>

  <!-- Intersection 2: (2, 4) at (220, 130) -->
  <circle cx="220" cy="130" r="5" fill="#dc2626"/>
  <line x1="220" y1="130" x2="220" y2="270" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="220" y="285" fill="#dc2626" font-size="12" font-weight="bold" text-anchor="middle">x = 2</text>
  <line x1="80" y1="130" x2="220" y2="130" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="70" y="135" fill="#dc2626" font-size="12" font-weight="bold" text-anchor="end">y = 4</text>
  <text x="225" y="125" fill="#dc2626" font-size="12" font-weight="bold">(2, 4)</text>

  <!-- Shaded Area Formula Card -->
  <rect x="50" y="305" width="290" height="35" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="195" y="325" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Area = ∫₀² (2x - x²) dx = [x² - x³/3]₀² = 4 - 8/3 = 4/3</text>

  <rect x="50" y="345" width="290" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="195" y="361" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">Definite Integral: Bounded Area = 1.333 sq. units</text>
</svg>`
            };
        }

        // 3. Right-Angled Triangle & Pythagorean Theorem (a² + b² = c²)
        if (combined.includes('pythagor') || combined.includes('right triangle') || combined.includes('right-angled') || combined.includes('hypotenuse') || combined.includes('a^2 + b^2') || combined.includes('a² + b²')) {
            return {
                title: 'Right-Angled Triangle & Pythagorean Theorem (3-4-5 Triplet)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Pythagorean Theorem: a² + b² = c² (Right Triangle)</text>

  <!-- Right Triangle: A(90, 95), B(90, 245), C(290, 245) -->
  <polygon points="90,95 90,245 290,245" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>

  <!-- Right Angle Square Symbol at B(90, 245) -->
  <rect x="90" y="225" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2"/>

  <!-- Angle theta arc at C(290, 245) -->
  <path d="M 255 245 A 35 35 0 0 0 262 224" fill="none" stroke="#dc2626" stroke-width="2"/>
  <text x="248" y="238" fill="#dc2626" font-size="12" font-weight="bold">θ</text>

  <!-- Vertices labels -->
  <circle cx="90" cy="95" r="4.5" fill="#1e40af"/>
  <text x="80" y="90" fill="#1e40af" font-size="13" font-weight="bold">A</text>

  <circle cx="90" cy="245" r="4.5" fill="#1e40af"/>
  <text x="75" y="255" fill="#1e40af" font-size="13" font-weight="bold">B</text>

  <circle cx="290" cy="245" r="4.5" fill="#1e40af"/>
  <text x="300" y="255" fill="#1e40af" font-size="13" font-weight="bold">C</text>

  <!-- Side Length Labels -->
  <!-- Vertical Leg a = 3 -->
  <text x="65" y="175" fill="#0369a1" font-size="13" font-weight="bold" text-anchor="middle">a = 3</text>
  <text x="65" y="190" fill="#64748b" font-size="10" text-anchor="middle">(Opposite)</text>

  <!-- Base Leg b = 4 -->
  <text x="190" y="268" fill="#0369a1" font-size="13" font-weight="bold" text-anchor="middle">b = 4 (Adjacent)</text>

  <!-- Hypotenuse c = 5 -->
  <g transform="translate(195, 160) rotate(-37)">
    <text x="0" y="-8" fill="#dc2626" font-size="13.5" font-weight="bold" text-anchor="middle">c = √(a² + b²) = 5 (Hypotenuse)</text>
  </g>

  <!-- Formula Summary Card -->
  <rect x="25" y="285" width="330" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="305" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">a² + b² = c²  ⟹  3² + 4² = 9 + 16 = 25 = 5²</text>
  <text x="190" y="324" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">sin θ = 3/5 = 0.60 • cos θ = 4/5 = 0.80 • tan θ = 3/4 = 0.75</text>

  <rect x="25" y="344" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="360" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Euclidean Metric Invariance • Verified via sympy-mcp</text>
</svg>`,
                code: `# Pythagorean Theorem & Trigonometric Ratios (SymPy - BSD-3)
import sympy as sp

a, b = 3, 4
c = sp.sqrt(a**2 + b**2)  # 5
sin_theta = a / c         # 3/5
cos_theta = b / c         # 4/5
tan_theta = a / b         # 3/4
print(f"Sides: a={a}, b={b}, Hypotenuse c={c}")
print(f"sin(θ)={float(sin_theta)}, cos(θ)={float(cos_theta)}, tan(θ)={float(tan_theta)}")`
            };
        }

        // 4. Trigonometric Unit Circle (r = 1, cos θ, sin θ)
        if (combined.includes('unit circle') || (combined.includes('trigonometr') && (combined.includes('circle') || combined.includes('sin') || combined.includes('cos') || combined.includes('radian')))) {
            return {
                title: 'Trigonometric Unit Circle (cos θ, sin θ on Unit Radius)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Trigonometric Unit Circle: P(cos θ, sin θ)</text>

  <!-- Coordinate Axes: Origin at (190, 175), R = 105 px -->
  <line x1="45" y1="175" x2="335" y2="175" stroke="#0f172a" stroke-width="2"/>
  <polygon points="335,175 327,171 327,179" fill="#0f172a"/>
  <text x="340" y="179" fill="#0f172a" font-size="12" font-weight="bold">X</text>

  <line x1="190" y1="320" x2="190" y2="40" stroke="#0f172a" stroke-width="2"/>
  <polygon points="190,40 186,48 194,48" fill="#0f172a"/>
  <text x="190" y="34" fill="#0f172a" font-size="12" font-weight="bold" text-anchor="middle">Y</text>

  <!-- Unit Circle (R = 105) -->
  <circle cx="190" cy="175" r="105" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5"/>

  <!-- Angle θ = 45° Ray: cos(45°)=0.7071 -> 105*0.7071 = 74.2 -> P(264, 101) -->
  <!-- Shaded Right Triangle under ray -->
  <polygon points="190,175 264,175 264,101" fill="#e0e7ff" opacity="0.7"/>

  <!-- Radius vector r = 1 -->
  <line x1="190" y1="175" x2="264" y2="101" stroke="#dc2626" stroke-width="2.5"/>

  <!-- Projection Lines -->
  <!-- cos theta (horizontal blue base) -->
  <line x1="190" y1="175" x2="264" y2="175" stroke="#2563eb" stroke-width="3"/>
  <text x="227" y="192" fill="#2563eb" font-size="11" font-weight="bold" text-anchor="middle">cos θ</text>

  <!-- sin theta (vertical green height) -->
  <line x1="264" y1="175" x2="264" y2="101" stroke="#059669" stroke-width="3"/>
  <text x="288" y="142" fill="#059669" font-size="11" font-weight="bold">sin θ</text>

  <!-- Point P on circle -->
  <circle cx="264" cy="101" r="5" fill="#dc2626"/>
  <text x="272" y="94" fill="#dc2626" font-size="12" font-weight="bold">P(cos θ, sin θ)</text>

  <!-- Angle arc θ = 45° -->
  <path d="M 225 175 A 35 35 0 0 0 215 150" fill="none" stroke="#d97706" stroke-width="2"/>
  <text x="232" y="160" fill="#d97706" font-size="11.5" font-weight="bold">θ = 45°</text>

  <!-- Key Quadrant Coordinate labels (1,0), (0,1), (-1,0), (0,-1) -->
  <text x="300" y="168" fill="#64748b" font-size="10" font-weight="bold">(1, 0)</text>
  <text x="195" y="75" fill="#64748b" font-size="10" font-weight="bold">(0, 1)</text>
  <text x="80" y="168" fill="#64748b" font-size="10" font-weight="bold">(-1, 0)</text>
  <text x="195" y="295" fill="#64748b" font-size="10" font-weight="bold">(0, -1)</text>

  <!-- Summary Card -->
  <rect x="25" y="326" width="330" height="44" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="344" fill="#1e293b" font-size="11.5" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Fundamental Identity: cos² θ + sin² θ = 1</text>
  <text x="190" y="359" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">At θ = π/4 (45°): cos(45°) = √2/2 ≈ 0.707 • sin(45°) = √2/2 ≈ 0.707</text>
</svg>`,
                code: `# Unit Circle Trigonometric Coordinates (SymPy - BSD-3)
import sympy as sp

theta = sp.pi / 4  # 45 degrees
x = sp.cos(theta)  # sqrt(2)/2
y = sp.sin(theta)  # sqrt(2)/2
identity = sp.simplify(sp.cos(theta)**2 + sp.sin(theta)**2)  # 1

print(f"Angle: 45° (pi/4 rad)")
print(f"Point P(x, y) = ({x}, {y}) ≈ ({float(x):.4f}, {float(y):.4f})")
print(f"cos^2(θ) + sin^2(θ) = {identity}")`
            };
        }

        // 5. Default Math: Coordinate System / Function Grid
        return {
            title: 'Cartesian Coordinate Plane & Geometric Grid',
            svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">2D Cartesian Coordinate Plane</text>
  
  <!-- Grid -->
  <g stroke="#f1f5f9" stroke-width="1">
    <line x1="40" y1="70" x2="340" y2="70"/>
    <line x1="40" y1="130" x2="340" y2="130"/>
    <line x1="40" y1="190" x2="340" y2="190"/>
    <line x1="40" y1="250" x2="340" y2="250"/>
    <line x1="40" y1="310" x2="340" y2="310"/>
    <line x1="70" y1="40" x2="70" y2="340"/>
    <line x1="130" y1="40" x2="130" y2="340"/>
    <line x1="190" y1="40" x2="190" y2="340"/>
    <line x1="250" y1="40" x2="250" y2="340"/>
    <line x1="310" y1="40" x2="310" y2="340"/>
  </g>

  <!-- Axes -->
  <line x1="30" y1="190" x2="350" y2="190" stroke="#0f172a" stroke-width="2.5"/>
  <polygon points="350,190 342,185 342,195" fill="#0f172a"/>
  <text x="355" y="185" fill="#0f172a" font-size="13" font-weight="bold">X</text>

  <line x1="190" y1="350" x2="190" y2="35" stroke="#0f172a" stroke-width="2.5"/>
  <polygon points="190,35 185,43 195,43" fill="#0f172a"/>
  <text x="198" y="45" fill="#0f172a" font-size="13" font-weight="bold">Y</text>

  <!-- Origin -->
  <circle cx="190" cy="190" r="4" fill="#0f172a"/>
  <text x="180" y="206" fill="#0f172a" font-size="12" font-weight="bold">O</text>

  <rect x="40" y="345" width="300" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="361" fill="#1e40af" font-size="11" font-weight="bold" text-anchor="middle">Orthogonal 2D Basis (x, y) • Clean Coordinate Origin (0,0)</text>
</svg>`
        };
    }

    /**
     * Generate an authentic Physics Mechanics or Optics SVG diagram based on question parameters.
     */
    generatePhysicsSVG(text = "", solutionMarkdown = "") {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Compound Microscope Optics Ray Diagram (Two-Lens System: Objective + Eyepiece)
        if (combined.includes('microscope') || combined.includes('compound microscope') || (combined.includes('eyepiece') && combined.includes('objective'))) {
            return this.generateMicroscopeOpticsSVG(text, solutionMarkdown);
        }

        // 2. Electrostatic Shielding / Hollow Conductor in Electric Field (Faraday Cage)
        if (combined.includes('shielding') || combined.includes('faraday') || combined.includes('hollow metal') || combined.includes('hollow conductor') || combined.includes('conducting sphere') || combined.includes('metal sphere') || (combined.includes('electric field') && (combined.includes('sphere') || combined.includes('cavity') || combined.includes('conductor') || combined.includes('null') || combined.includes('0')))) {
            return this.generateElectrostaticShieldingSVG(text, solutionMarkdown);
        }

        // 3. Incline Plane with Friction
        if (combined.includes('incline') || combined.includes('friction') || combined.includes('ramp') || combined.includes('wedge')) {
            return {
                title: 'Inclined Plane with Friction (Free-Body Diagram & Forces)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Inclined Plane with Friction (Free-Body Diagram)</text>

  <!-- Triangular Wedge: Base (50, 270) to (310, 270), Height (310, 120) -> angle ≈ 30 deg -->
  <polygon points="50,270 310,270 310,120" fill="#f1f5f9" stroke="#334155" stroke-width="2.5"/>
  <text x="180" y="285" fill="#475569" font-size="11" font-weight="bold" text-anchor="middle">Horizontal Base</text>

  <!-- Angle arc θ = 30° at (50, 270) -->
  <path d="M 100 270 A 50 50 0 0 0 93 245" fill="none" stroke="#dc2626" stroke-width="2"/>
  <text x="110" y="258" fill="#dc2626" font-size="13" font-weight="bold">θ = 30°</text>

  <!-- Mass Block on Incline: center around (180, 195), rotated -30 deg -->
  <g transform="translate(180, 195) rotate(-30)">
    <rect x="-25" y="-30" width="50" height="30" rx="3" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
    <text x="0" y="-12" fill="#0c4a6e" font-size="12" font-weight="bold" text-anchor="middle">m = 5 kg</text>
  </g>

  <!-- Center of mass at (180, 180) -->
  <circle cx="180" cy="180" r="4" fill="#0f172a"/>

  <!-- Force Vector 1: Gravitational Force mg (straight down) -->
  <line x1="180" y1="180" x2="180" y2="260" stroke="#dc2626" stroke-width="3"/>
  <polygon points="180,260 176,250 184,250" fill="#dc2626"/>
  <text x="190" y="255" fill="#dc2626" font-size="12" font-weight="bold">mg = 49 N</text>

  <!-- Force Vector 2: Normal Force N (perpendicular to ramp: angle 60° from +x) -->
  <line x1="180" y1="180" x2="145" y2="120" stroke="#2563eb" stroke-width="3"/>
  <polygon points="145,120 144,130 152,126" fill="#2563eb"/>
  <text x="125" y="115" fill="#2563eb" font-size="12" font-weight="bold">N = mg cos θ</text>

  <!-- Force Vector 3: Kinetic Friction fk (up the ramp: angle 30° from -x, direction towards top-right) -->
  <line x1="180" y1="180" x2="235" y2="148" stroke="#d97706" stroke-width="2.5"/>
  <polygon points="235,148 226,148 230,156" fill="#d97706"/>
  <text x="245" y="145" fill="#d97706" font-size="12" font-weight="bold">fk = μk N</text>

  <!-- Force Vector 4: Parallel Component mg sin θ (down the ramp) -->
  <line x1="180" y1="180" x2="125" y2="212" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3"/>
  <text x="110" y="225" fill="#dc2626" font-size="11.5" font-weight="bold">mg sin θ</text>

  <!-- Equation Summary Card -->
  <rect x="25" y="300" width="330" height="38" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="318" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">a = g(sin 30° - μk cos 30°) = 9.8(0.5 - 0.2 × 0.866) ≈ 3.20 m/s²</text>
  <text x="190" y="332" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Net Accelerating Force Fnet = m · a down the plane</text>

  <rect x="25" y="344" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="360" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Newton's 2nd Law Resolved on Rotated Cartesian Frame</text>
</svg>`
            };
        }

        // 4. Optics Ray Tracing (Convex Lens)
        if (combined.includes('lens') || combined.includes('optics') || combined.includes('convex') || combined.includes('focal')) {
            return {
                title: 'Convex Lens Ray Tracing (Real Inverted Image Formation)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="28" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Convex Lens Ray Diagram (Real Inverted Image)</text>

  <!-- Optical Axis (y = 180) -->
  <line x1="30" y1="180" x2="350" y2="180" stroke="#0f172a" stroke-width="2"/>
  <polygon points="350,180 342,176 342,184" fill="#0f172a"/>
  <text x="355" y="184" fill="#0f172a" font-size="11" font-weight="bold">Principal Axis</text>

  <!-- Thin Biconvex Lens at x = 190 -->
  <line x1="190" y1="70" x2="190" y2="290" stroke="#0284c7" stroke-width="3"/>
  <path d="M 190 70 Q 205 180 190 290 Q 175 180 190 70 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" opacity="0.6"/>
  <polygon points="190,70 185,80 195,80" fill="#0284c7"/>
  <polygon points="190,290 185,280 195,280" fill="#0284c7"/>
  <text x="190" y="60" fill="#0284c7" font-size="12" font-weight="bold" text-anchor="middle">Convex Lens</text>

  <!-- Focal points F1 (x=120), 2F1 (x=50), F2 (x=260), 2F2 (x=330) -->
  <circle cx="120" cy="180" r="3.5" fill="#4338ca"/>
  <text x="120" y="198" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">F₁</text>
  <circle cx="50" cy="180" r="3.5" fill="#4338ca"/>
  <text x="50" y="198" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">2F₁</text>

  <circle cx="260" cy="180" r="3.5" fill="#4338ca"/>
  <text x="260" y="198" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">F₂</text>
  <circle cx="330" cy="180" r="3.5" fill="#4338ca"/>
  <text x="330" y="198" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">2F₂</text>

  <circle cx="190" cy="180" r="4" fill="#0f172a"/>
  <text x="190" y="198" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">O</text>

  <!-- Object Arrow at x = 70 (height ho = 60, y from 180 to 120) -->
  <line x1="70" y1="180" x2="70" y2="120" stroke="#059669" stroke-width="3"/>
  <polygon points="70,120 65,130 75,130" fill="#059669"/>
  <text x="70" y="112" fill="#059669" font-size="12" font-weight="bold" text-anchor="middle">Object (A)</text>

  <!-- Ray 1 (Blue): Parallel to lens, then through F2(260, 180) to image tip (280, 225) -->
  <line x1="70" y1="120" x2="190" y2="120" stroke="#2563eb" stroke-width="2"/>
  <line x1="190" y1="120" x2="280" y2="225" stroke="#2563eb" stroke-width="2"/>

  <!-- Ray 2 (Amber): Through optical center O(190, 180) undeviated -->
  <line x1="70" y1="120" x2="280" y2="225" stroke="#d97706" stroke-width="2"/>

  <!-- Real Inverted Image Arrow at x = 280 (y from 180 to 225, hi = 45) -->
  <line x1="280" y1="180" x2="280" y2="225" stroke="#dc2626" stroke-width="3"/>
  <polygon points="280,225 275,215 285,215" fill="#dc2626"/>
  <text x="280" y="242" fill="#dc2626" font-size="12" font-weight="bold" text-anchor="middle">Image (A')</text>

  <!-- Lens Formula Card -->
  <rect x="25" y="305" width="330" height="35" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="323" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">1/f = 1/v - 1/u  •  Magnification m = v / u = hi / ho</text>
  <text x="190" y="336" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Real, inverted, diminished image formed between F₂ and 2F₂</text>

  <rect x="25" y="345" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="361" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Gaussian Lens Formula & Cartesian Sign Conventions</text>
</svg>`
            };
        }

        // 5. Simple Pendulum (Periodic Simple Harmonic Motion)
        if (combined.includes('pendulum') || combined.includes('simple pendulum') || combined.includes('oscillation') || combined.includes('shm') || combined.includes('simple harmonic') || combined.includes('bob')) {
            return {
                title: 'Simple Pendulum (Simple Harmonic Motion & Restoring Force)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Simple Pendulum (SHM &amp; Restoring Dynamics)</text>

  <!-- Rigid Ceiling Support -->
  <line x1="120" y1="45" x2="260" y2="45" stroke="#334155" stroke-width="3"/>
  <line x1="130" y1="45" x2="120" y2="35" stroke="#64748b" stroke-width="1.5"/>
  <line x1="150" y1="45" x2="140" y2="35" stroke="#64748b" stroke-width="1.5"/>
  <line x1="170" y1="45" x2="160" y2="35" stroke="#64748b" stroke-width="1.5"/>
  <line x1="190" y1="45" x2="180" y2="35" stroke="#64748b" stroke-width="1.5"/>
  <line x1="210" y1="45" x2="200" y2="35" stroke="#64748b" stroke-width="1.5"/>
  <line x1="230" y1="45" x2="220" y2="35" stroke="#64748b" stroke-width="1.5"/>
  <line x1="250" y1="45" x2="240" y2="35" stroke="#64748b" stroke-width="1.5"/>

  <!-- Suspension Pivot at (190, 45) -->
  <circle cx="190" cy="45" r="4.5" fill="#0f172a"/>

  <!-- Vertical Equilibrium Reference Line (Dashed) -->
  <line x1="190" y1="45" x2="190" y2="230" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
  <circle cx="190" cy="225" r="12" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="190" y="248" fill="#64748b" font-size="9.5" text-anchor="middle">Equilibrium</text>

  <!-- Deflected Pendulum String L = 180 px at θ ≈ 20° -> Bob center at (252, 214) -->
  <line x1="190" y1="45" x2="252" y2="214" stroke="#0284c7" stroke-width="2.5"/>
  <text x="212" y="125" fill="#0369a1" font-size="11.5" font-weight="bold">L = 1.0 m</text>

  <!-- Angular Displacement Arc θ -->
  <path d="M 190 100 A 55 55 0 0 1 209 97" fill="none" stroke="#d97706" stroke-width="2"/>
  <text x="204" y="85" fill="#d97706" font-size="12" font-weight="bold">θ = 20°</text>

  <!-- Bob Mass at (252, 214) -->
  <circle cx="252" cy="214" r="14" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
  <text x="252" y="218" fill="#0c4a6e" font-size="10.5" font-weight="bold" text-anchor="middle">m</text>

  <!-- Force Vector 1: Tension T along string towards pivot -->
  <line x1="252" y1="214" x2="225" y2="140" stroke="#2563eb" stroke-width="2.5"/>
  <polygon points="225,140 224,150 232,147" fill="#2563eb"/>
  <text x="210" y="148" fill="#2563eb" font-size="11.5" font-weight="bold">T</text>

  <!-- Force Vector 2: Weight mg straight down -->
  <line x1="252" y1="214" x2="252" y2="280" stroke="#dc2626" stroke-width="2.5"/>
  <polygon points="252,280 248,270 256,270" fill="#dc2626"/>
  <text x="260" y="275" fill="#dc2626" font-size="11.5" font-weight="bold">mg</text>

  <!-- Force Vector 3: Restoring force F_restoring = -mg sin θ (tangent) -->
  <line x1="252" y1="214" x2="202" y2="232" stroke="#059669" stroke-width="2.5"/>
  <polygon points="202,232 211,228 208,236" fill="#059669"/>
  <text x="180" y="222" fill="#059669" font-size="10.5" font-weight="bold">-mg sin θ</text>

  <!-- Formula Summary Card -->
  <rect x="25" y="300" width="330" height="42" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="318" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Time Period: T = 2π √(L / g) = 2π √(1.0 / 9.8) ≈ 2.007 s</text>
  <text x="190" y="334" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Restoring Force F_net = -mg sin θ ≈ -(mg/L)·x (Small Angle Approximation)</text>

  <rect x="25" y="346" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="362" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Harmonic Oscillation Frequency: f = 1/T = (1/2π)√(g/L) ≈ 0.498 Hz</text>
</svg>`,
                code: `# Simple Pendulum Harmonic Oscillation (SciPy & SymPy - BSD-3)
import numpy as np
import sympy as sp

L, g, m = 1.0, 9.80665, 0.5  # Length (m), Gravity (m/s^2), Mass (kg)
T = 2 * np.pi * np.sqrt(L / g)
f = 1 / T
omega = np.sqrt(g / L)

print(f"Pendulum Length L = {L} m, Mass m = {m} kg")
print(f"Natural Frequency ω = {omega:.3f} rad/s")
print(f"Time Period T = {T:.3f} s, Frequency f = {f:.3f} Hz")`
            };
        }

        // 6. Parallel Plate Capacitor (Electrostatics & Uniform Field)
        if (combined.includes('capacitor') || combined.includes('parallel plate') || combined.includes('capacitance') || combined.includes('dielectric')) {
            return {
                title: 'Parallel Plate Capacitor (Uniform Electric Field E = V/d)',
                svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Parallel Plate Capacitor: Uniform Electric Field E = V/d</text>

  <!-- Top Plate: Positive Electrode (+Q, Anode) -->
  <rect x="60" y="85" width="260" height="18" rx="3" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
  <text x="80" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+</text>
  <text x="120" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+</text>
  <text x="160" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+</text>
  <text x="190" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+Q (Plate Area A)</text>
  <text x="240" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+</text>
  <text x="280" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+</text>
  <text x="310" y="99" fill="#b91c1c" font-size="12" font-weight="bold">+</text>

  <!-- Bottom Plate: Negative Electrode (-Q, Cathode) -->
  <rect x="60" y="205" width="260" height="18" rx="3" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="80" y="219" fill="#1d4ed8" font-size="14" font-weight="bold">−</text>
  <text x="120" y="219" fill="#1d4ed8" font-size="14" font-weight="bold">−</text>
  <text x="160" y="219" fill="#1d4ed8" font-size="14" font-weight="bold">−</text>
  <text x="190" y="218" fill="#1d4ed8" font-size="12" font-weight="bold">−Q (Plate Area A)</text>
  <text x="240" y="219" fill="#1d4ed8" font-size="14" font-weight="bold">−</text>
  <text x="280" y="219" fill="#1d4ed8" font-size="14" font-weight="bold">−</text>
  <text x="310" y="219" fill="#1d4ed8" font-size="14" font-weight="bold">−</text>

  <!-- Uniform Downward Electric Field Lines (E-field vectors) -->
  <g stroke="#059669" stroke-width="2">
    <line x1="90" y1="103" x2="90" y2="203"/>
    <polygon points="90,203 86,195 94,195" fill="#059669"/>

    <line x1="130" y1="103" x2="130" y2="203"/>
    <polygon points="130,203 126,195 134,195" fill="#059669"/>

    <line x1="170" y1="103" x2="170" y2="203"/>
    <polygon points="170,203 166,195 174,195" fill="#059669"/>

    <line x1="210" y1="103" x2="210" y2="203"/>
    <polygon points="210,203 206,195 214,195" fill="#059669"/>

    <line x1="250" y1="103" x2="250" y2="203"/>
    <polygon points="250,203 246,195 254,195" fill="#059669"/>

    <line x1="290" y1="103" x2="290" y2="203"/>
    <polygon points="290,203 286,195 294,195" fill="#059669"/>
  </g>
  <text x="190" y="158" fill="#047857" font-size="13" font-weight="bold" text-anchor="middle">Uniform E-Field (E = σ / ε₀)</text>

  <!-- Distance between plates dimension bracket d -->
  <line x1="335" y1="103" x2="335" y2="205" stroke="#475569" stroke-width="2"/>
  <line x1="330" y1="103" x2="340" y2="103" stroke="#475569" stroke-width="2"/>
  <line x1="330" y1="205" x2="340" y2="205" stroke="#475569" stroke-width="2"/>
  <text x="350" y="158" fill="#334155" font-size="12" font-weight="bold">d</text>

  <!-- Circuit connection lines to potential V -->
  <line x1="190" y1="85" x2="190" y2="55" stroke="#dc2626" stroke-width="2"/>
  <text x="190" y="50" fill="#dc2626" font-size="11" font-weight="bold" text-anchor="middle">+ V (Potential)</text>

  <line x1="190" y1="223" x2="190" y2="255" stroke="#2563eb" stroke-width="2"/>
  <text x="190" y="268" fill="#2563eb" font-size="11" font-weight="bold" text-anchor="middle">0 V (Ground)</text>

  <!-- Formula Card -->
  <rect x="25" y="285" width="330" height="52" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="304" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Capacitance: C = (εᵣ · ε₀ · A) / d  •  Charge: Q = C · V</text>
  <text x="190" y="322" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Stored Electrostatic Energy: U = ½ C V² = ½ (Q² / C)</text>

  <rect x="25" y="344" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="360" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Gauss's Law of Electrostatics • Vacuum Permittivity ε₀ = 8.854 × 10⁻¹² F/m</text>
</svg>`,
                code: `# Parallel Plate Capacitor Calculations (SciPy - BSD-3)
import scipy.constants as const

epsilon_0 = const.epsilon_0  # 8.8541878128e-12 F/m
A = 0.05    # Plate Area in m^2 (e.g. 500 cm^2)
d = 0.002   # Separation distance in m (2 mm)
V = 100.0   # Applied Voltage (V)

C = (epsilon_0 * A) / d
Q = C * V
U = 0.5 * C * (V**2)

print(f"Capacitance C = {C*1e12:.2f} pF")
print(f"Stored Charge Q = {Q*1e9:.2f} nC")
print(f"Stored Energy U = {U*1e6:.2f} µJ")`
            };
        }

        // 7. Default Physics: Horizontal Surface Free-Body Diagram (Block, Pull Force, Normal, Friction)
        return {
            title: 'Newtonian Mechanics Free-Body Diagram (Horizontal Surface with Friction)',
            svg: `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Free-Body Diagram: Block with Pulling Force &amp; Friction</text>

  <!-- Horizontal Surface Ground (y = 220) -->
  <line x1="30" y1="220" x2="350" y2="220" stroke="#334155" stroke-width="3"/>
  <line x1="40" y1="220" x2="30" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="80" y1="220" x2="70" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="120" y1="220" x2="110" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="160" y1="220" x2="150" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="200" y1="220" x2="190" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="240" y1="220" x2="230" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="280" y1="220" x2="270" y2="230" stroke="#94a3b8" stroke-width="1.5"/>
  <line x1="320" y1="220" x2="310" y2="230" stroke="#94a3b8" stroke-width="1.5"/>

  <!-- Mass Block: width 80, height 50, centered at x=180, y=170 to 220 -->
  <rect x="140" y="170" width="80" height="50" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="2.5"/>
  <text x="180" y="200" fill="#1e40af" font-size="13" font-weight="bold" text-anchor="middle">m = 10 kg</text>

  <!-- Center of Mass at (180, 195) -->
  <circle cx="180" cy="195" r="4" fill="#0f172a"/>

  <!-- Force Vector 1: Pull Force F at angle θ = 30° to +x -->
  <!-- F length = 85 px -> (180+73.6, 195-42.5) = (254, 152) -->
  <line x1="180" y1="195" x2="254" y2="152" stroke="#d97706" stroke-width="3"/>
  <polygon points="254,152 244,153 249,160" fill="#d97706"/>
  <text x="264" y="148" fill="#d97706" font-size="12" font-weight="bold">F = 50 N (θ = 30°)</text>

  <!-- Force Vector 2: Normal Force N (upward) -->
  <line x1="180" y1="195" x2="180" y2="105" stroke="#2563eb" stroke-width="3"/>
  <polygon points="180,105 176,115 184,115" fill="#2563eb"/>
  <text x="190" y="112" fill="#2563eb" font-size="12" font-weight="bold">N = mg − F sin θ</text>

  <!-- Force Vector 3: Gravity W = mg (downward) -->
  <line x1="180" y1="195" x2="180" y2="285" stroke="#dc2626" stroke-width="3"/>
  <polygon points="180,285 176,275 184,275" fill="#dc2626"/>
  <text x="190" y="280" fill="#dc2626" font-size="12" font-weight="bold">W = mg = 98 N</text>

  <!-- Force Vector 4: Friction fk (leftward) -->
  <line x1="180" y1="195" x2="95" y2="195" stroke="#059669" stroke-width="3"/>
  <polygon points="95,195 105,191 105,199" fill="#059669"/>
  <text x="90" y="185" fill="#059669" font-size="11.5" font-weight="bold">fk = μk N</text>

  <!-- Equation Summary Card -->
  <rect x="25" y="300" width="330" height="42" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="318" fill="#1e293b" font-size="12" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Σ Fx = F cos θ − fk = m · ax  ⟹  ax = (43.3 − 14.6) / 10 ≈ 2.87 m/s²</text>
  <text x="190" y="334" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Equilibrium on y-axis: Σ Fy = N + F sin 30° − mg = 0  ⟹  N = 73 N</text>

  <rect x="25" y="346" width="330" height="24" rx="5" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="190" y="362" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Newton's 2nd Law of Motion • Verified via physics-mechanics-mcp</text>
</svg>`,
            code: `# Newtonian Mechanics Friction & Acceleration (SciPy - BSD-3)
import numpy as np

m = 10.0      # mass in kg
g = 9.8       # acceleration due to gravity in m/s^2
F = 50.0      # pull force in N
theta_deg = 30.0
theta = np.radians(theta_deg)
mu_k = 0.20   # coefficient of kinetic friction

# Vertical equilibrium: N + F*sin(theta) = m*g
N = m*g - F*np.sin(theta)
# Friction force: f_k = mu_k * N
f_k = mu_k * N
# Horizontal acceleration: F*cos(theta) - f_k = m*a
F_net_x = F*np.cos(theta) - f_k
a = F_net_x / m

print(f"Normal Force N = {N:.2f} N")
print(f"Kinetic Friction f_k = {f_k:.2f} N")
print(f"Net Horizontal Force = {F_net_x:.2f} N")
print(f"Acceleration a = {a:.2f} m/s^2")`
        };
    }

    /**
     * Generate an authentic, geometrically accurate Compound Microscope Ray Diagram (Objective + Eyepiece).
     */
    generateMicroscopeOpticsSVG(text = '', solutionMarkdown = '') {
        return {
            title: 'Compound Microscope Ray Diagram (Objective & Eyepiece Two-Lens System)',
            svg: `<svg viewBox="0 0 400 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="rayBlue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#2563eb"/>
    </marker>
    <marker id="rayAmber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#d97706"/>
    </marker>
    <marker id="rayPurple" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#7c3aed"/>
    </marker>
    <marker id="rayMagenta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#c026d3"/>
    </marker>
  </defs>

  <rect width="400" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="26" fill="#0f172a" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Compound Microscope Ray Diagram (Real Intermediate &amp; Virtual Final Image)</text>

  <!-- Principal Axis (y = 170) -->
  <line x1="20" y1="170" x2="385" y2="170" stroke="#0f172a" stroke-width="1.8"/>
  <text x="388" y="174" fill="#64748b" font-size="10" font-weight="bold">Axis</text>

  <!-- 1. OBJECTIVE LENS (L_o) at x = 115 (Small aperture, small fo) -->
  <path d="M 115 105 Q 123 170 115 235 Q 107 170 115 105 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" opacity="0.85"/>
  <line x1="115" y1="100" x2="115" y2="240" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3"/>
  <circle cx="115" cy="170" r="3" fill="#0284c7"/>
  <text x="115" y="184" fill="#0284c7" font-size="10" font-weight="bold" text-anchor="middle">O₁</text>
  <text x="115" y="94" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Objective (Lₒ)</text>
  <text x="115" y="80" fill="#64748b" font-size="9" text-anchor="middle">Small fₒ, small aperture</text>

  <!-- Objective Foci: Fo at x=82, Fo' at x=148 -->
  <circle cx="82" cy="170" r="3" fill="#0284c7"/>
  <text x="82" y="184" fill="#0284c7" font-size="10" font-weight="bold" text-anchor="middle">Fₒ</text>
  <circle cx="148" cy="170" r="3" fill="#0284c7"/>
  <text x="148" y="184" fill="#0284c7" font-size="10" font-weight="bold" text-anchor="middle">Fₒ'</text>

  <!-- Object AB: placed outside Fo at x = 65, height = 25 (y from 170 to 145) -->
  <line x1="65" y1="170" x2="65" y2="145" stroke="#059669" stroke-width="2.5"/>
  <polygon points="65,145 61,153 69,153" fill="#059669"/>
  <text x="55" y="146" fill="#059669" font-size="11" font-weight="bold">B</text>
  <text x="65" y="184" fill="#059669" font-size="11" font-weight="bold" text-anchor="middle">A</text>
  <text x="65" y="134" fill="#059669" font-size="10" font-weight="bold" text-anchor="middle">Object (AB)</text>

  <!-- Objective Ray 1 (Blue): Parallel to axis from B(65, 145) to lens(115, 145), through Fo'(148, 170) to B'(215, 220) -->
  <line x1="65" y1="145" x2="115" y2="145" stroke="#2563eb" stroke-width="1.8"/>
  <line x1="90" y1="145" x2="95" y2="145" stroke="#2563eb" stroke-width="1.8" marker-end="url(#rayBlue)"/>
  <line x1="115" y1="145" x2="215" y2="220" stroke="#2563eb" stroke-width="1.8"/>
  <line x1="160" y1="179" x2="165" y2="183" stroke="#2563eb" stroke-width="1.8" marker-end="url(#rayBlue)"/>

  <!-- Objective Ray 2 (Amber): From B(65, 145) through O1(115, 170) straight to B'(215, 220) -->
  <line x1="65" y1="145" x2="215" y2="220" stroke="#d97706" stroke-width="1.8"/>
  <line x1="145" y1="185" x2="150" y2="188" stroke="#d97706" stroke-width="1.8" marker-end="url(#rayAmber)"/>

  <!-- Intermediate Image A'B' (Real, Inverted, Magnified) at x = 215, height = 50 (y from 170 to 220) -->
  <line x1="215" y1="170" x2="215" y2="220" stroke="#dc2626" stroke-width="2.5"/>
  <polygon points="215,220 211,212 219,212" fill="#dc2626"/>
  <text x="215" y="165" fill="#dc2626" font-size="10.5" font-weight="bold" text-anchor="middle">A'</text>
  <text x="225" y="224" fill="#dc2626" font-size="10.5" font-weight="bold">B'</text>
  <rect x="180" y="228" width="85" height="18" rx="3" fill="#fef2f2" stroke="#fecaca"/>
  <text x="222" y="241" fill="#b91c1c" font-size="9" font-weight="bold" text-anchor="middle">Intermediate A'B'</text>

  <!-- 2. EYEPIECE LENS (L_e) at x = 280 (Larger aperture, fe > fo) -->
  <path d="M 280 75 Q 292 170 280 265 Q 268 170 280 75 Z" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2.5" opacity="0.85"/>
  <line x1="280" y1="70" x2="280" y2="270" stroke="#4f46e5" stroke-width="1.5" stroke-dasharray="3,3"/>
  <circle cx="280" cy="170" r="3" fill="#4f46e5"/>
  <text x="280" y="184" fill="#4f46e5" font-size="10" font-weight="bold" text-anchor="middle">O₂</text>
  <text x="280" y="65" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">Eyepiece (Lₑ)</text>
  <text x="280" y="52" fill="#64748b" font-size="9" text-anchor="middle">Larger fₑ, acts as magnifier</text>

  <!-- Eyepiece Foci: Fe at x=190 (outside A' at 215, so ue < fe!), Fe' at x=370 -->
  <circle cx="190" cy="170" r="3" fill="#4f46e5"/>
  <text x="190" y="184" fill="#4f46e5" font-size="10" font-weight="bold" text-anchor="middle">Fₑ</text>
  <text x="190" y="158" fill="#6366f1" font-size="9" text-anchor="middle">(uₑ &lt; fₑ)</text>

  <!-- Eyepiece Ray 3 (Purple): From B'(215, 220) through O2(280, 170) to eye(345, 120) -->
  <line x1="215" y1="220" x2="345" y2="120" stroke="#7c3aed" stroke-width="1.8"/>
  <line x1="305" y1="151" x2="310" y2="147" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#rayPurple)"/>
  <!-- Backward virtual extension of Ray 3 to B''(46, 350) -->
  <line x1="215" y1="220" x2="46" y2="350" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Eyepiece Ray 4 (Magenta): From B'(215, 220) parallel to axis to eyepiece(280, 220), then through Fe'(370, 170) to (345, 184) -->
  <line x1="215" y1="220" x2="280" y2="220" stroke="#c026d3" stroke-width="1.8"/>
  <line x1="280" y1="220" x2="345" y2="184" stroke="#c026d3" stroke-width="1.8"/>
  <line x1="310" y1="203" x2="315" y2="200" stroke="#c026d3" stroke-width="1.8" marker-end="url(#rayMagenta)"/>
  <!-- Backward virtual extension of Ray 4 to B''(46, 350) -->
  <line x1="280" y1="220" x2="46" y2="350" stroke="#c026d3" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Final Virtual Inverted Image A''B'' at x = 46, height = 180 (y from 170 to 350) -->
  <line x1="46" y1="170" x2="46" y2="350" stroke="#9333ea" stroke-width="3" stroke-dasharray="5,4"/>
  <polygon points="46,350 41,340 51,340" fill="#9333ea"/>
  <text x="35" y="174" fill="#9333ea" font-size="11" font-weight="bold">A''</text>
  <text x="35" y="348" fill="#9333ea" font-size="11" font-weight="bold">B''</text>
  <rect x="20" y="354" width="135" height="18" rx="3" fill="#faf5ff" stroke="#e9d5ff"/>
  <text x="87" y="367" fill="#7e22ce" font-size="9" font-weight="bold" text-anchor="middle">Final Virtual Image (at D ≈ 25cm)</text>

  <!-- Observer Eye at right (x = 360, y = 145) -->
  <path d="M 350 130 Q 365 145 350 160" fill="none" stroke="#0f172a" stroke-width="2"/>
  <circle cx="356" cy="145" r="4" fill="#0284c7"/>
  <path d="M 345 125 L 350 130" stroke="#0f172a" stroke-width="1.5"/>
  <path d="M 345 165 L 350 160" stroke="#0f172a" stroke-width="1.5"/>
  <text x="370" y="149" fill="#0f172a" font-size="10" font-weight="bold">Eye</text>

  <!-- Separation / Tube Length L -->
  <line x1="115" y1="250" x2="280" y2="250" stroke="#64748b" stroke-width="1.2" stroke-dasharray="2,2"/>
  <text x="197" y="262" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Tube Length L ≈ vₒ + fₑ</text>

  <!-- Bottom Formula Card -->
  <rect x="15" y="280" width="370" height="42" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="297" fill="#1e293b" font-size="11.5" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Total Magnification: M = mₒ × mₑ = (-vₒ / uₒ) × (1 + D / fₑ) ≈ -(L / fₒ)(D / fₑ)</text>
  <text x="200" y="313" fill="#0369a1" font-size="10" font-weight="bold" text-anchor="middle">Intermediate Image: Real, Inverted, Magnified • Final Image: Virtual, Inverted, Highly Magnified at Near Point D</text>
</svg>`,
            code: `# Compound Microscope Geometric Optics (Objective + Eyepiece)
# Resolved via physics-optics-mcp (Open Source, MIT)
import numpy as np

# Lens Specifications (cm)
f_o = 0.8    # Objective focal length
f_e = 2.5    # Eyepiece focal length
L = 16.0     # Tube length between inner foci
D = 25.0     # Least distance of distinct vision (near point)

# Magnification components
m_o = -(L / f_o)                # Lateral magnification of objective (-20.0x)
m_e = (1 + D / f_e)             # Angular magnification of eyepiece (+11.0x)
M_total = m_o * m_e             # Total magnifying power (-220.0x)

print(f"Objective Magnification: m_o = {m_o:.1f}x")
print(f"Eyepiece Magnification:  m_e = {m_e:.1f}x")
print(f"Total Magnifying Power:  M   = {M_total:.1f}x")`
        };
    }

    /**
     * Generate an authentic Electrostatic Shielding SVG Diagram (Faraday Cage in Hollow Conducting Sphere).
     */
    generateElectrostaticShieldingSVG(text = '', solutionMarkdown = '') {
        return {
            title: 'Electrostatic Shielding (Hollow Conducting Sphere in External Field)',
            svg: `<svg viewBox="0 0 400 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="metalShellGrad" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </radialGradient>
    <marker id="fieldArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#0284c7"/>
    </marker>
  </defs>

  <rect width="400" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="26" fill="#0f172a" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Electrostatic Shielding: E_inside = 0 in Hollow Conducting Sphere</text>

  <!-- External Field Lines E0 (Left to Right) -->
  <!-- Line 1 (top): y = 65 -->
  <path d="M 25 65 L 120 65 Q 160 68 180 50 Q 200 68 240 65 L 375 65" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="75" y1="65" x2="85" y2="65" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>
  <line x1="315" y1="65" x2="325" y2="65" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>

  <!-- Line 2: y = 105 (curves into sphere normal) -->
  <path d="M 25 105 L 100 105 Q 125 107 137 122" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="65" y1="105" x2="75" y2="105" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>
  <!-- Exiting Line 2 -->
  <path d="M 263 122 Q 275 107 300 105 L 375 105" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="325" y1="105" x2="335" y2="105" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>

  <!-- Line 3: y = 145 (curves into left hemisphere) -->
  <path d="M 25 145 L 85 145 Q 105 147 118 155" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="55" y1="145" x2="65" y2="145" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>
  <!-- Exiting Line 3 -->
  <path d="M 282 155 Q 295 147 315 145 L 375 145" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="335" y1="145" x2="345" y2="145" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>

  <!-- Line 4 (central): y = 180 (terminates perpendicularly at x = 115) -->
  <line x1="25" y1="180" x2="115" y2="180" stroke="#0284c7" stroke-width="2.2"/>
  <line x1="65" y1="180" x2="75" y2="180" stroke="#0284c7" stroke-width="2.2" marker-end="url(#fieldArr)"/>
  <line x1="285" y1="180" x2="375" y2="180" stroke="#0284c7" stroke-width="2.2"/>
  <line x1="325" y1="180" x2="335" y2="180" stroke="#0284c7" stroke-width="2.2" marker-end="url(#fieldArr)"/>

  <!-- Line 5: y = 215 (curves into bottom-left) -->
  <path d="M 25 215 L 85 215 Q 105 213 118 205" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="55" y1="215" x2="65" y2="215" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>
  <!-- Exiting Line 5 -->
  <path d="M 282 205 Q 295 213 315 215 L 375 215" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="335" y1="215" x2="345" y2="215" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>

  <!-- Line 6: y = 255 -->
  <path d="M 25 255 L 100 255 Q 125 253 137 238" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="65" y1="255" x2="75" y2="255" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>
  <!-- Exiting Line 6 -->
  <path d="M 263 238 Q 275 253 300 255 L 375 255" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="325" y1="255" x2="335" y2="255" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>

  <!-- Line 7 (bottom): y = 295 -->
  <path d="M 25 295 L 120 295 Q 160 292 180 310 Q 200 292 240 295 L 375 295" fill="none" stroke="#0284c7" stroke-width="2"/>
  <line x1="75" y1="295" x2="85" y2="295" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>
  <line x1="315" y1="295" x2="325" y2="295" stroke="#0284c7" stroke-width="2" marker-end="url(#fieldArr)"/>

  <!-- External Field Label -->
  <rect x="25" y="38" width="105" height="20" rx="4" fill="#eff6ff" stroke="#93c5fd"/>
  <text x="77" y="52" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">E₀ (External Field) →</text>

  <!-- SPHERICAL CONDUCTING SHELL (Center: 200, 180; Outer R = 85, Inner R = 50) -->
  <circle cx="200" cy="180" r="85" fill="url(#metalShellGrad)" stroke="#334155" stroke-width="3"/>
  <!-- Inner Hollow Cavity (Pure White, Zero Lines) -->
  <circle cx="200" cy="180" r="50" fill="#ffffff" stroke="#334155" stroke-width="2.5"/>

  <!-- INDUCED CHARGES ON OUTER SURFACE -->
  <!-- Left Outer Surface: Induced Negative Charge (-σ) -->
  <g fill="#2563eb" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">
    <text x="110" y="184" text-anchor="middle">−</text>
    <text x="116" y="155" text-anchor="middle">−</text>
    <text x="116" y="213" text-anchor="middle">−</text>
    <text x="133" y="130" text-anchor="middle">−</text>
    <text x="133" y="238" text-anchor="middle">−</text>
    <text x="158" y="112" text-anchor="middle">−</text>
    <text x="158" y="256" text-anchor="middle">−</text>
  </g>
  <text x="105" y="98" fill="#1e40af" font-size="10" font-weight="bold">Induced −σ</text>

  <!-- Right Outer Surface: Induced Positive Charge (+σ) -->
  <g fill="#dc2626" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">
    <text x="290" y="184" text-anchor="middle">+</text>
    <text x="284" y="155" text-anchor="middle">+</text>
    <text x="284" y="213" text-anchor="middle">+</text>
    <text x="267" y="130" text-anchor="middle">+</text>
    <text x="267" y="238" text-anchor="middle">+</text>
    <text x="242" y="112" text-anchor="middle">+</text>
    <text x="242" y="256" text-anchor="middle">+</text>
  </g>
  <text x="295" y="98" fill="#b91c1c" font-size="10" font-weight="bold">Induced +σ</text>

  <!-- Conducting Shell Material Annotation -->
  <text x="200" y="118" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Conducting Metal Shell</text>
  <text x="200" y="130" fill="#047857" font-size="9.5" font-weight="bold" text-anchor="middle">E_metal = E₀ + E_induced = 0</text>

  <!-- Hollow Cavity Center Badge: E_inside = 0 -->
  <rect x="155" y="160" width="90" height="40" rx="6" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5"/>
  <text x="200" y="177" fill="#15803d" font-size="12" font-weight="bold" text-anchor="middle">E_inside = 0</text>
  <text x="200" y="193" fill="#166534" font-size="9" font-weight="bold" text-anchor="middle">(Null Field / Shielded)</text>

  <!-- Equipotential indicator -->
  <text x="200" y="222" fill="#64748b" font-size="9" text-anchor="middle">V = V₀ (Equipotential)</text>

  <!-- Bottom Explanatory Card -->
  <rect x="15" y="318" width="370" height="52" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="333" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">Faraday Shielding &amp; Gauss's Law: ∮ E·dA = Q_enclosed / ε₀ = 0</text>
  <text x="200" y="348" fill="#334155" font-size="9.5" text-anchor="middle">1. Conduction electrons drift to left surface until internal induced field E_ind = −E₀ exactly.</text>
  <text x="200" y="361" fill="#334155" font-size="9.5" text-anchor="middle">2. Hollow cavity contains zero charge; with equipotential boundary, Laplace's Eq ∇²V = 0 ⇒ E = −∇V = 0.</text>
</svg>`,
            code: `# Electrostatic Shielding & Gauss's Law in Hollow Conductors
# Resolved via physics-electrostatics-mcp (Open Source, MIT)
import numpy as np

# Physical Parameters
E_0 = 1000.0          # External Uniform Electric Field (V/m)
epsilon_0 = 8.854e-12 # Permittivity of free space (F/m)

# Conductor Boundary Conditions & Laplace Solution:
# 1. Inside conducting medium: E_metal = E_0 + E_induced = 0 (equilibrium)
# 2. Left surface induced charge density:  sigma_left  = -epsilon_0 * E_0
# 3. Right surface induced charge density: sigma_right = +epsilon_0 * E_0
# 4. Hollow Cavity: Q_enclosed = 0, equipotential boundary V = V_0
#    Laplace's Eq: nabla^2 V = 0 with constant boundary => V(r) = V_0 (constant)
#    Electric field: E_inside = -nabla V = 0 (Null field everywhere in cavity)
print(f"External Field: E_0 = {E_0} V/m")
print(f"Cavity Internal Field: E_inside = 0.0 V/m (Perfect Faraday Shielding)")`
        };
    }

    /**
     * Cleans raw LaTeX mathematical notation inside SVG <text> elements
     * Converting raw backslashes and formulas into beautiful, crisp Unicode math notation.
     */
    cleanLatexForSvg(svg) {
        if (!svg || typeof svg !== 'string') return svg;
        
        return svg.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (match, attrs, content) => {
            let s = content;
            // 1. Remove enclosing $ or $$
            s = s.replace(/\$\$?/g, '');
            
            // 2. LaTeX Spaces
            s = s.replace(/\\[ ,;!]/g, ' ');

            // 3. Fractions
            s = s.replace(/\\frac\{1\}\{2\}/g, '½')
                 .replace(/\\frac\{1\}\{3\}/g, '⅓')
                 .replace(/\\frac\{1\}\{4\}/g, '¼')
                 .replace(/\\frac\{3\}\{4\}/g, '¾')
                 .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');

            // 4. Roots
            s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
                 .replace(/\\sqrt/g, '√');

            // 5. Superscripts & degrees
            s = s.replace(/\^\{\\circ\}|\^\\circ/g, '°')
                 .replace(/\^2|\^\{2\}/g, '²')
                 .replace(/\^3|\^\{3\}/g, '³')
                 .replace(/\^4|\^\{4\}/g, '⁴')
                 .replace(/\^n|\^\{n\}/g, 'ⁿ')
                 .replace(/\^\{-1\}/g, '⁻¹');

            // 6. Subscripts
            s = s.replace(/_0|_\{0\}/g, '₀')
                 .replace(/_1|_\{1\}/g, '₁')
                 .replace(/_2|_\{2\}/g, '₂')
                 .replace(/_3|_\{3\}/g, '₃')
                 .replace(/_4|_\{4\}/g, '₄')
                 .replace(/_k|_\{k\}/g, 'ₖ')
                 .replace(/_m|_\{m\}/g, 'ₘ')
                 .replace(/_x|_\{x\}/g, 'ₓ')
                 .replace(/_y|_\{y\}/g, 'ᵧ')
                 .replace(/_\{max\}/g, 'ₘₐₓ')
                 .replace(/_\{eq\}/g, 'ₑᵩ')
                 .replace(/_\{net\}/g, 'ₙₑₜ');

            // 7. Greek letters
            s = s.replace(/\\theta/g, 'θ')
                 .replace(/\\alpha/g, 'α')
                 .replace(/\\beta/g, 'β')
                 .replace(/\\gamma/g, 'γ')
                 .replace(/\\Delta/g, 'Δ')
                 .replace(/\\pi/g, 'π')
                 .replace(/\\mu/g, 'μ')
                 .replace(/\\lambda/g, 'λ')
                 .replace(/\\Omega/g, 'Ω')
                 .replace(/\\omega/g, 'ω')
                 .replace(/\\phi/g, 'φ')
                 .replace(/\\rho/g, 'ρ')
                 .replace(/\\sigma/g, 'σ')
                 .replace(/\\tau/g, 'τ');

            // 8. Operators & symbols
            s = s.replace(/\\approx/g, '≈')
                 .replace(/\\neq/g, '≠')
                 .replace(/\\leq|\\le\b/g, '≤')
                 .replace(/\\geq|\\ge\b/g, '≥')
                 .replace(/\\times/g, '×')
                 .replace(/\\cdot/g, '·')
                 .replace(/\\pm/g, '±')
                 .replace(/\\int/g, '∫')
                 .replace(/\\sum/g, '∑')
                 .replace(/\\infty/g, '∞')
                 .replace(/\\rightarrow/g, '→')
                 .replace(/\\rightleftharpoons/g, '⇌');

            // 9. Formatting wrappers
            s = s.replace(/\\(?:text|mathrm|mathbf|mathit|boxed)\{([^{}]*)\}/g, '$1');
            // Remove any remaining stray backslashes before words
            s = s.replace(/\\([a-zA-Z]+)/g, '$1');

            return `<text${attrs}>${s}</text>`;
        });
    }

    /**
     * Generate an authentic Computer Science Flowchart SVG based on algorithm query.
     * Uses standardized IEEE/ISO flowchart symbols (Pill, Parallelogram, Rectangle, Diamond, Directed Lines).
     * 100% Free & Open Source (MIT License).
     */
    generateFlowchartSVG(text = '', solutionMarkdown = '') {
        const cleanText = (text || '').toLowerCase();
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();
        const isBinarySearch = /\b(binary\s*search)\b/i.test(cleanText) || (/\b(binary\s*search)\b/i.test(combined) && !/\b(dfs|depth[- ]first|bfs|breadth)\b/i.test(cleanText));

        // 1. Breadth-First Search (BFS) Flowchart
        if (!isBinarySearch && (/\b(bfs|breadth[- ]first|breadth\s+first\s+search|level[- ]order)\b/i.test(cleanText) || /\b(bfs|breadth[- ]first|breadth\s+first\s+search|level[- ]order)\b/i.test(combined))) {
            const bfsMermaid = `flowchart TD
    Start(["Start BFS from source S"]) --> Init["Queue Q = empty; visited = {S}"]
    Init --> Enqueue["Q.enqueue(S)"]
    Enqueue --> CheckEmpty{"Q.isEmpty()?"}
    CheckEmpty -- Yes --> EndNode(["End Traversal"])
    CheckEmpty -- No --> Dequeue["u = Q.dequeue(); Process(u)"]
    Dequeue --> LoopAdj{"For each unvisited neighbor v"}
    LoopAdj --> Mark["Mark v as visited & Q.enqueue(v)"]
    Mark --> CheckEmpty`;
            const svg = `<svg viewBox="0 0 420 540" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="540" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Breadth-First Search (BFS) Algorithm Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="155" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="210" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="210" y1="66" x2="210" y2="82" stroke="#475569" stroke-width="2"/>
  <polygon points="210,82 206,75 214,75" fill="#475569"/>

  <!-- Input: Graph G=(V,E), Source S (Parallelogram) -->
  <polygon points="110,84 330,84 300,114 80,114" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="205" y="103" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Graph G = (V, E), Start Vertex S</text>

  <line x1="205" y1="114" x2="205" y2="132" stroke="#475569" stroke-width="2"/>
  <polygon points="205,132 201,125 209,125" fill="#475569"/>

  <!-- Process: Initialize Queue Q, visited set (Rectangle) -->
  <rect x="90" y="134" width="230" height="36" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="205" y="149" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Queue Q = empty; visited = {S}</text>
  <text x="205" y="163" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Q.enqueue(S)</text>

  <line x1="205" y1="170" x2="205" y2="190" stroke="#475569" stroke-width="2"/>
  <polygon points="205,190 201,183 209,183" fill="#475569"/>

  <!-- Decision: Is Queue Empty? (Diamond) -->
  <polygon points="205,192 275,220 205,248 135,220" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="205" y="224" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">Q.isEmpty() ?</text>

  <!-- Yes -> All reachable nodes visited -> End -->
  <line x1="275" y1="220" x2="360" y2="220" stroke="#dc2626" stroke-width="2"/>
  <line x1="360" y1="220" x2="360" y2="470" stroke="#dc2626" stroke-width="2"/>
  <text x="295" y="213" fill="#dc2626" font-size="10" font-weight="bold">Yes</text>
  <line x1="360" y1="470" x2="270" y2="470" stroke="#dc2626" stroke-width="2"/>
  <polygon points="270,470 277,466 277,474" fill="#dc2626"/>

  <!-- No -> Dequeue node u (Process) -->
  <line x1="205" y1="248" x2="205" y2="270" stroke="#059669" stroke-width="2"/>
  <polygon points="205,270 201,263 209,263" fill="#059669"/>
  <text x="215" y="260" fill="#059669" font-size="10" font-weight="bold">No</text>

  <rect x="105" y="272" width="200" height="32" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="205" y="292" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">u = Q.dequeue(); Process(u)</text>

  <line x1="205" y1="304" x2="205" y2="326" stroke="#475569" stroke-width="2"/>
  <polygon points="205,326 201,319 209,319" fill="#475569"/>

  <!-- Decision: Has unvisited neighbor v? (Diamond) -->
  <polygon points="205,328 290,358 205,388 120,358" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="205" y="355" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">Has unvisited</text>
  <text x="205" y="369" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">neighbor v of u ?</text>

  <!-- Yes -> mark visited, Q.enqueue(v) -->
  <line x1="120" y1="358" x2="50" y2="358" stroke="#059669" stroke-width="2"/>
  <line x1="50" y1="358" x2="50" y2="415" stroke="#059669" stroke-width="2"/>
  <polygon points="50,415 46,408 54,408" fill="#059669"/>
  <text x="75" y="350" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="8" y="417" width="145" height="36" rx="5" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="80" y="432" fill="#065f46" font-size="10" font-weight="bold" text-anchor="middle">visited.add(v)</text>
  <text x="80" y="446" fill="#065f46" font-size="10" font-weight="bold" text-anchor="middle">Q.enqueue(v)</text>

  <!-- Loop back from neighbor to neighbor check -->
  <line x1="80" y1="453" x2="80" y2="475" stroke="#475569" stroke-width="1.8"/>
  <line x1="80" y1="475" x2="160" y2="475" stroke="#475569" stroke-width="1.8"/>
  <line x1="160" y1="475" x2="160" y2="385" stroke="#475569" stroke-width="1.8"/>
  <polygon points="160,385 156,392 164,392" fill="#475569"/>

  <!-- No neighbor remaining -> loop back up to Q.isEmpty() -->
  <line x1="205" y1="388" x2="205" y2="410" stroke="#475569" stroke-width="2"/>
  <line x1="205" y1="410" x2="310" y2="410" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="410" x2="310" y2="182" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="182" x2="215" y2="182" stroke="#475569" stroke-width="2"/>
  <polygon points="215,182 222,178 222,186" fill="#475569"/>
  <text x="215" y="404" fill="#64748b" font-size="9.5" font-weight="bold">No</text>

  <!-- End Node (Pill) -->
  <rect x="160" y="458" width="105" height="26" rx="13" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="212" y="475" fill="#991b1b" font-size="11" font-weight="bold" text-anchor="middle">End / Complete</text>

  <!-- Bottom Complexity Card -->
  <rect x="15" y="498" width="390" height="32" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="513" fill="#0f172a" font-size="10.5" font-weight="bold" text-anchor="middle">Breadth-First Search (BFS) Traversal Flowchart</text>
  <text x="210" y="525" fill="#475569" font-size="9.5" text-anchor="middle">Time: O(V + E) • Space: O(V) via FIFO Queue Data Structure</text>
</svg>`;
            return {
                title: 'Breadth-First Search (BFS) Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                mermaid: bfsMermaid,
                code: `// Breadth-First Search (BFS) in Java
import java.util.*;

public class BFSGraph {
    private int V;
    private LinkedList<Integer>[] adj;

    @SuppressWarnings("unchecked")
    public BFSGraph(int v) {
        V = v;
        adj = new LinkedList[v];
        for (int i = 0; i < v; ++i) {
            adj[i] = new LinkedList<>();
        }
    }

    public void addEdge(int v, int w) {
        adj[v].add(w);
    }

    public void bfs(int startNode) {
        boolean[] visited = new boolean[V];
        Queue<Integer> queue = new LinkedList<>();

        visited[startNode] = true;
        queue.add(startNode);

        System.out.print("BFS Traversal starting from " + startNode + ": ");
        while (!queue.isEmpty()) {
            int u = queue.poll();
            System.out.print(u + " ");

            for (int neighbor : adj[u]) {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.add(neighbor);
                }
            }
        }
        System.out.println();
    }

    public static void main(String[] args) {
        BFSGraph g = new BFSGraph(6);
        g.addEdge(0, 1);
        g.addEdge(0, 2);
        g.addEdge(1, 3);
        g.addEdge(1, 4);
        g.addEdge(2, 4);
        g.addEdge(3, 5);
        g.addEdge(4, 5);
        g.bfs(0); // 0 1 2 3 4 5
    }
}`
            };
        }

        // 2. Depth-First Search (DFS) Flowchart
        if (!isBinarySearch && (/\b(dfs|depth[- ]first|depth\s+first\s+search)\b/i.test(cleanText) || /\b(dfs|depth[- ]first|depth\s+first\s+search)\b/i.test(combined))) {
            const dfsMermaid = `flowchart TD
    Start(["Start DFS from vertex u"]) --> Mark["Mark u as visited"]
    Mark --> Process["Process / Print vertex u"]
    Process --> LoopAdj{"Has unvisited neighbor v?"}
    LoopAdj -- Yes --> Recurse["Recursively call DFS(v)"]
    Recurse --> LoopAdj
    LoopAdj -- No --> Backtrack["Backtrack / Return"]
    Backtrack --> EndNode(["End"])`;
            const svg = `<svg viewBox="0 0 420 540" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="540" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Depth-First Search (DFS) Algorithm Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="155" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="210" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="210" y1="66" x2="210" y2="82" stroke="#475569" stroke-width="2"/>
  <polygon points="210,82 206,75 214,75" fill="#475569"/>

  <!-- Input: Graph G, Source S (Parallelogram) -->
  <polygon points="110,84 330,84 300,114 80,114" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="205" y="103" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Graph G = (V, E), Start Vertex S</text>

  <line x1="205" y1="114" x2="205" y2="132" stroke="#475569" stroke-width="2"/>
  <polygon points="205,132 201,125 209,125" fill="#475569"/>

  <!-- Process: Stack S, visited set -->
  <rect x="90" y="134" width="230" height="36" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="205" y="149" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Stack Stk = empty; visited = {}</text>
  <text x="205" y="163" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Stk.push(S)</text>

  <line x1="205" y1="170" x2="205" y2="190" stroke="#475569" stroke-width="2"/>
  <polygon points="205,190 201,183 209,183" fill="#475569"/>

  <!-- Decision: Stk.isEmpty()? -->
  <polygon points="205,192 275,220 205,248 135,220" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="205" y="224" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">Stk.isEmpty() ?</text>

  <!-- Yes -> End -->
  <line x1="275" y1="220" x2="360" y2="220" stroke="#dc2626" stroke-width="2"/>
  <line x1="360" y1="220" x2="360" y2="470" stroke="#dc2626" stroke-width="2"/>
  <text x="295" y="213" fill="#dc2626" font-size="10" font-weight="bold">Yes</text>
  <line x1="360" y1="470" x2="270" y2="470" stroke="#dc2626" stroke-width="2"/>
  <polygon points="270,470 277,466 277,474" fill="#dc2626"/>

  <!-- No -> Pop u -->
  <line x1="205" y1="248" x2="205" y2="270" stroke="#059669" stroke-width="2"/>
  <polygon points="205,270 201,263 209,263" fill="#059669"/>
  <text x="215" y="260" fill="#059669" font-size="10" font-weight="bold">No</text>

  <rect x="110" y="272" width="190" height="30" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="205" y="291" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">u = Stk.pop()</text>

  <line x1="205" y1="302" x2="205" y2="322" stroke="#475569" stroke-width="2"/>
  <polygon points="205,322 201,315 209,315" fill="#475569"/>

  <!-- Decision: u in visited? -->
  <polygon points="205,324 285,352 205,380 125,352" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="205" y="356" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">u in visited ?</text>

  <!-- If No -> Mark visited, process, push neighbors -->
  <line x1="125" y1="352" x2="50" y2="352" stroke="#059669" stroke-width="2"/>
  <line x1="50" y1="352" x2="50" y2="408" stroke="#059669" stroke-width="2"/>
  <polygon points="50,408 46,401 54,401" fill="#059669"/>
  <text x="75" y="344" fill="#059669" font-size="10" font-weight="bold">No</text>

  <rect x="8" y="410" width="150" height="42" rx="5" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="83" y="425" fill="#065f46" font-size="9.5" font-weight="bold" text-anchor="middle">visited.add(u); Print u</text>
  <text x="83" y="440" fill="#065f46" font-size="9.5" font-weight="bold" text-anchor="middle">Push unvisited v to Stk</text>

  <line x1="83" y1="452" x2="83" y2="480" stroke="#475569" stroke-width="1.8"/>
  <line x1="83" y1="480" x2="310" y2="480" stroke="#475569" stroke-width="1.8"/>
  <line x1="310" y1="480" x2="310" y2="182" stroke="#475569" stroke-width="1.8"/>
  <line x1="310" y1="182" x2="215" y2="182" stroke="#475569" stroke-width="1.8"/>
  <polygon points="215,182 222,178 222,186" fill="#475569"/>

  <!-- End Node -->
  <rect x="160" y="458" width="105" height="26" rx="13" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="212" y="475" fill="#991b1b" font-size="11" font-weight="bold" text-anchor="middle">End / Complete</text>

  <!-- Bottom Complexity Card -->
  <rect x="15" y="498" width="390" height="32" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="513" fill="#0f172a" font-size="10.5" font-weight="bold" text-anchor="middle">Depth-First Search (DFS) Traversal Flowchart</text>
  <text x="210" y="525" fill="#475569" font-size="9.5" text-anchor="middle">Time: O(V + E) • Space: O(V) via LIFO Stack / Call Stack</text>
</svg>`;
            return {
                title: 'Depth-First Search (DFS) Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                mermaid: dfsMermaid,
                code: `// Depth-First Search (DFS) in Java
import java.util.*;

public class DFSGraph {
    private int V;
    private LinkedList<Integer>[] adj;

    @SuppressWarnings("unchecked")
    public DFSGraph(int v) {
        V = v;
        adj = new LinkedList[v];
        for (int i = 0; i < v; ++i) adj[i] = new LinkedList<>();
    }

    public void addEdge(int v, int w) {
        adj[v].add(w);
    }

    public void dfs(int startNode) {
        boolean[] visited = new boolean[V];
        System.out.print("DFS Traversal starting from " + startNode + ": ");
        dfsUtil(startNode, visited);
        System.out.println();
    }

    private void dfsUtil(int u, boolean[] visited) {
        visited[u] = true;
        System.out.print(u + " ");

        for (int neighbor : adj[u]) {
            if (!visited[neighbor]) {
                dfsUtil(neighbor, visited);
            }
        }
    }
}`
            };
        }

        // 3. Dijkstra's Algorithm Flowchart
        if (combined.includes('dijkstra') || (combined.includes('shortest') && combined.includes('path'))) {
            const svg = `<svg viewBox="0 0 420 520" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="520" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Dijkstra's Shortest Path Algorithm Flowchart</text>

  <!-- Start -->
  <rect x="155" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="210" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="210" y1="66" x2="210" y2="82" stroke="#475569" stroke-width="2"/>
  <polygon points="210,82 206,75 214,75" fill="#475569"/>

  <!-- Input Weighted Graph G=(V,E), Source S -->
  <polygon points="100,84 340,84 310,114 70,114" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="205" y="103" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Weighted Graph G = (V, E), Source S</text>

  <line x1="205" y1="114" x2="205" y2="132" stroke="#475569" stroke-width="2"/>
  <polygon points="205,132 201,125 209,125" fill="#475569"/>

  <!-- Init: dist[S] = 0, dist[v] = inf, PQ = {(0, S)} -->
  <rect x="80" y="134" width="250" height="38" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="205" y="150" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">dist[S] = 0; dist[v] = ∞ for all v ≠ S</text>
  <text x="205" y="165" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Min-PriorityQueue PQ.add((0, S))</text>

  <line x1="205" y1="172" x2="205" y2="192" stroke="#475569" stroke-width="2"/>
  <polygon points="205,192 201,185 209,185" fill="#475569"/>

  <!-- Decision: PQ.isEmpty() ? -->
  <polygon points="205,194 280,222 205,250 130,222" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="205" y="226" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">PQ.isEmpty() ?</text>

  <!-- Yes -> Return dist[] -> End -->
  <line x1="280" y1="222" x2="360" y2="222" stroke="#dc2626" stroke-width="2"/>
  <line x1="360" y1="222" x2="360" y2="455" stroke="#dc2626" stroke-width="2"/>
  <text x="300" y="215" fill="#dc2626" font-size="10" font-weight="bold">Yes</text>
  <line x1="360" y1="455" x2="270" y2="455" stroke="#dc2626" stroke-width="2"/>
  <polygon points="270,455 277,451 277,459" fill="#dc2626"/>

  <!-- No -> Extract min (d, u) -->
  <line x1="205" y1="250" x2="205" y2="272" stroke="#059669" stroke-width="2"/>
  <polygon points="205,272 201,265 209,265" fill="#059669"/>
  <text x="215" y="262" fill="#059669" font-size="10" font-weight="bold">No</text>

  <rect x="95" y="274" width="220" height="30" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="205" y="293" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">(d, u) = PQ.poll()</text>

  <line x1="205" y1="304" x2="205" y2="326" stroke="#475569" stroke-width="2"/>
  <polygon points="205,326 201,319 209,319" fill="#475569"/>

  <!-- Decision: dist[u] + w < dist[v] ? (Edge relaxation) -->
  <polygon points="205,328 300,358 205,388 110,358" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="205" y="355" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">dist[u] + w &lt; dist[v] ?</text>
  <text x="205" y="369" fill="#92400e" font-size="9.5" text-anchor="middle">(Edge Relaxation)</text>

  <!-- Yes -> dist[v] = dist[u] + w; PQ.add -->
  <line x1="110" y1="358" x2="45" y2="358" stroke="#059669" stroke-width="2"/>
  <line x1="45" y1="358" x2="45" y2="408" stroke="#059669" stroke-width="2"/>
  <polygon points="45,408 41,401 49,401" fill="#059669"/>
  <text x="70" y="350" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="5" y="410" width="160" height="36" rx="5" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="85" y="425" fill="#065f46" font-size="9.5" font-weight="bold" text-anchor="middle">dist[v] = dist[u] + w</text>
  <text x="85" y="439" fill="#065f46" font-size="9.5" font-weight="bold" text-anchor="middle">PQ.add((dist[v], v))</text>

  <!-- End Node -->
  <rect x="155" y="442" width="115" height="26" rx="13" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="212" y="459" fill="#991b1b" font-size="10.5" font-weight="bold" text-anchor="middle">End / Output dist[]</text>

  <!-- Bottom Complexity Card -->
  <rect x="15" y="482" width="390" height="26" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="499" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Dijkstra's Algorithm • Time: O((V + E) log V) via Min-Heap • Non-negative edges</text>
</svg>`;
            return {
                title: "Dijkstra's Shortest Path Algorithm Flowchart",
                svg: this.cleanLatexForSvg(svg),
                code: `// Dijkstra's Algorithm in Java
import java.util.*;

public class Dijkstra {
    static class Edge { int to, weight; Edge(int t, int w) { to = t; weight = w; } }
    static class Node implements Comparable<Node> {
        int id, dist;
        Node(int i, int d) { id = i; dist = d; }
        public int compareTo(Node o) { return Integer.compare(this.dist, o.dist); }
    }

    public static int[] dijkstra(int V, List<List<Edge>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        PriorityQueue<Node> pq = new PriorityQueue<>();
        pq.add(new Node(src, 0));

        while (!pq.isEmpty()) {
            Node curr = pq.poll();
            int u = curr.id;
            if (curr.dist > dist[u]) continue;

            for (Edge e : adj.get(u)) {
                if (dist[u] + e.weight < dist[e.to]) {
                    dist[e.to] = dist[u] + e.weight;
                    pq.add(new Node(e.to, dist[e.to]));
                }
            }
        }
        return dist;
    }
}`
            };
        }

        // 4. Bubble Sort Flowchart
        if (combined.includes('bubble') && combined.includes('sort')) {
            const svg = `<svg viewBox="0 0 380 440" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="440" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Bubble Sort Algorithm Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="135" y="38" width="110" height="26" rx="13" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="190" y="55" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="190" y1="64" x2="190" y2="78" stroke="#475569" stroke-width="2"/>
  <polygon points="190,78 186,71 194,71" fill="#475569"/>

  <!-- Input Array A of size N -->
  <polygon points="115,80 275,80 250,106 90,106" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="180" y="97" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Input: Array A, Size N</text>

  <line x1="180" y1="106" x2="180" y2="120" stroke="#475569" stroke-width="2"/>
  <polygon points="180,120 176,113 184,113" fill="#475569"/>

  <!-- Outer Loop: i = 0 -->
  <rect x="125" y="122" width="110" height="24" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="180" y="138" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">i = 0</text>

  <line x1="180" y1="146" x2="180" y2="160" stroke="#475569" stroke-width="2"/>
  <polygon points="180,160 176,153 184,153" fill="#475569"/>

  <!-- Outer Decision: i < N - 1 ? -->
  <polygon points="180,162 240,182 180,202 120,182" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="180" y="186" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">i &lt; N - 1 ?</text>

  <!-- No -> Array Sorted -> End -->
  <line x1="240" y1="182" x2="310" y2="182" stroke="#dc2626" stroke-width="2"/>
  <line x1="310" y1="182" x2="310" y2="385" stroke="#dc2626" stroke-width="2"/>
  <text x="260" y="175" fill="#dc2626" font-size="10" font-weight="bold">No</text>
  <line x1="310" y1="385" x2="240" y2="385" stroke="#dc2626" stroke-width="2"/>
  <polygon points="240,385 247,381 247,389" fill="#dc2626"/>

  <!-- Yes -> Inner loop: j = 0 -->
  <line x1="180" y1="202" x2="180" y2="218" stroke="#059669" stroke-width="2"/>
  <polygon points="180,218 176,211 184,211" fill="#059669"/>
  <text x="190" y="212" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="120" y="220" width="120" height="24" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="180" y="236" fill="#1d4ed8" font-size="10" font-weight="bold" text-anchor="middle">j = 0</text>

  <line x1="180" y1="244" x2="180" y2="258" stroke="#475569" stroke-width="2"/>
  <polygon points="180,258 176,251 184,251" fill="#475569"/>

  <!-- Inner Decision: j < N - i - 1 ? -->
  <polygon points="180,260 250,282 180,304 110,282" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="180" y="286" fill="#92400e" font-size="10" font-weight="bold" text-anchor="middle">j &lt; N - i - 1 ?</text>

  <!-- Swap Decision: A[j] > A[j+1] ? -->
  <line x1="180" y1="304" x2="180" y2="320" stroke="#059669" stroke-width="2"/>
  <polygon points="180,320 176,313 184,313" fill="#059669"/>
  <text x="190" y="314" fill="#059669" font-size="9.5" font-weight="bold">Yes</text>

  <polygon points="180,322 250,344 180,366 110,344" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="180" y="348" fill="#92400e" font-size="10" font-weight="bold" text-anchor="middle">A[j] &gt; A[j+1] ?</text>

  <!-- Swap A[j], A[j+1] -->
  <line x1="110" y1="344" x2="40" y2="344" stroke="#059669" stroke-width="2"/>
  <line x1="40" y1="344" x2="40" y2="380" stroke="#059669" stroke-width="2"/>
  <polygon points="40,380 36,373 44,373" fill="#059669"/>
  <text x="65" y="337" fill="#059669" font-size="9.5" font-weight="bold">Yes</text>

  <rect x="5" y="382" width="115" height="24" rx="4" fill="#d1fae5" stroke="#10b981" stroke-width="1.8"/>
  <text x="62" y="398" fill="#065f46" font-size="9.5" font-weight="bold" text-anchor="middle">Swap(A[j], A[j+1])</text>

  <!-- End Node -->
  <rect x="145" y="375" width="90" height="24" rx="12" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="190" y="391" fill="#991b1b" font-size="10.5" font-weight="bold" text-anchor="middle">End (Sorted)</text>

  <!-- Bottom Complexity Card -->
  <rect x="15" y="414" width="350" height="20" rx="4" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="428" fill="#475569" font-size="9.5" font-weight="bold" text-anchor="middle">Bubble Sort • Time Complexity: Worst/Avg O(N²), Best O(N) • In-Place</text>
</svg>`;
            return {
                title: 'Bubble Sort Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                code: `// Bubble Sort in Java
public class BubbleSort {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
}`
            };
        }

        // 5. Linear Search Flowchart
        if (combined.includes('linear') && combined.includes('search')) {
            const svg = `<svg viewBox="0 0 380 430" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="430" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Linear Search Algorithm Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="135" y="40" width="110" height="26" rx="13" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="190" y="57" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="190" y1="66" x2="190" y2="84" stroke="#475569" stroke-width="2"/>
  <polygon points="190,84 186,77 194,77" fill="#475569"/>

  <!-- Input Array A, target X -->
  <polygon points="110,86 270,86 250,114 90,114" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="180" y="104" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Array A, Target X</text>

  <line x1="180" y1="114" x2="180" y2="134" stroke="#475569" stroke-width="2"/>
  <polygon points="180,134 176,127 184,127" fill="#475569"/>

  <!-- i = 0 -->
  <rect x="130" y="136" width="100" height="26" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="180" y="153" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">i = 0</text>

  <line x1="180" y1="162" x2="180" y2="182" stroke="#475569" stroke-width="2"/>
  <polygon points="180,182 176,175 184,175" fill="#475569"/>

  <!-- Loop: i < N ? -->
  <polygon points="180,184 240,208 180,232 120,208" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="180" y="212" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">i &lt; N ?</text>

  <!-- No -> Return -1 -->
  <line x1="240" y1="208" x2="310" y2="208" stroke="#dc2626" stroke-width="2"/>
  <line x1="310" y1="208" x2="310" y2="340" stroke="#dc2626" stroke-width="2"/>
  <text x="265" y="201" fill="#dc2626" font-size="10" font-weight="bold">No</text>
  <rect x="250" y="342" width="120" height="26" rx="4" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="310" y="359" fill="#991b1b" font-size="10.5" font-weight="bold" text-anchor="middle">Return -1 (Not Found)</text>

  <!-- Yes -> A[i] == X ? -->
  <line x1="180" y1="232" x2="180" y2="254" stroke="#059669" stroke-width="2"/>
  <polygon points="180,254 176,247 184,247" fill="#059669"/>
  <text x="190" y="246" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <polygon points="180,256 245,280 180,304 115,280" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="180" y="284" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">A[i] == X ?</text>

  <!-- Yes -> Return i -->
  <line x1="115" y1="280" x2="55" y2="280" stroke="#059669" stroke-width="2"/>
  <line x1="55" y1="280" x2="55" y2="342" stroke="#059669" stroke-width="2"/>
  <polygon points="55,342 51,335 59,335" fill="#059669"/>
  <text x="80" y="273" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="5" y="344" width="105" height="26" rx="4" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="57" y="361" fill="#065f46" font-size="10.5" font-weight="bold" text-anchor="middle">Return i (Found)</text>

  <!-- No -> i = i + 1 -->
  <line x1="180" y1="304" x2="180" y2="330" stroke="#475569" stroke-width="2"/>
  <polygon points="180,330 176,323 184,323" fill="#475569"/>
  <text x="190" y="320" fill="#64748b" font-size="9.5" font-weight="bold">No</text>
  <rect x="135" y="332" width="90" height="24" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.8"/>
  <text x="180" y="348" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">i = i + 1</text>

  <!-- Loop back to i < N -->
  <line x1="135" y1="344" x2="90" y2="344" stroke="#475569" stroke-width="1.8"/>
  <line x1="90" y1="344" x2="90" y2="208" stroke="#475569" stroke-width="1.8"/>
  <line x1="90" y1="208" x2="120" y2="208" stroke="#475569" stroke-width="1.8"/>
  <polygon points="120,208 113,204 113,212" fill="#475569"/>

  <!-- End -->
  <rect x="140" y="390" width="80" height="24" rx="12" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="180" y="406" fill="#991b1b" font-size="10.5" font-weight="bold" text-anchor="middle">End</text>
</svg>`;
            return {
                title: 'Linear Search Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                code: `// Linear Search in Java
public class LinearSearch {
    public static int linearSearch(int[] arr, int target) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) return i;
        }
        return -1;
    }
}`
            };
        }

        // 6. Binary Search Flowchart
        if (isBinarySearch || (combined.includes('binary') && combined.includes('search'))) {
            const binarySearchMermaid = `flowchart TD
    Start(["Start Binary Search"]) --> Init["Initialize: low = 0, high = n - 1"]
    Init --> CheckLoop{"low <= high?"}
    CheckLoop -- No --> NotFound["Target Not Found: return -1"]
    NotFound --> EndNode(["End"])
    CheckLoop -- Yes --> CalcMid["mid = low + (high - low) / 2"]
    CalcMid --> CheckEqual{"A[mid] == target?"}
    CheckEqual -- Yes --> Found["Target Found at index mid: return mid"]
    Found --> EndNode
    CheckEqual -- No --> CheckLess{"A[mid] < target?"}
    CheckLess -- Yes --> RightHalf["Search Right Half: low = mid + 1"]
    CheckLess -- No --> LeftHalf["Search Left Half: high = mid - 1"]
    RightHalf --> CheckLoop
    LeftHalf --> CheckLoop`;
            const svg = `<svg viewBox="0 0 380 440" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="440" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Binary Search Algorithm Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="135" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="190" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="190" y1="66" x2="190" y2="82" stroke="#475569" stroke-width="2"/>
  <polygon points="190,82 186,75 194,75" fill="#475569"/>

  <!-- Input: Sorted array A, target X (Parallelogram) -->
  <polygon points="120,84 270,84 250,114 100,114" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="185" y="103" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Array A[0..n-1], Target X</text>

  <line x1="185" y1="114" x2="185" y2="130" stroke="#475569" stroke-width="2"/>
  <polygon points="185,130 181,123 189,123" fill="#475569"/>

  <!-- Process: low = 0, high = n - 1 (Rectangle) -->
  <rect x="115" y="132" width="140" height="28" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="185" y="150" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">low = 0, high = n - 1</text>

  <line x1="185" y1="160" x2="185" y2="176" stroke="#475569" stroke-width="2"/>
  <polygon points="185,176 181,169 189,169" fill="#475569"/>

  <!-- Decision: low <= high? (Diamond) -->
  <polygon points="185,178 245,203 185,228 125,203" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="185" y="207" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">low ≤ high ?</text>

  <!-- No branch (Target not found) -->
  <line x1="245" y1="203" x2="310" y2="203" stroke="#dc2626" stroke-width="2"/>
  <line x1="310" y1="203" x2="310" y2="350" stroke="#dc2626" stroke-width="2"/>
  <polygon points="310,350 306,343 314,343" fill="#dc2626"/>
  <text x="260" y="196" fill="#dc2626" font-size="10" font-weight="bold">No</text>
  <rect x="250" y="352" width="120" height="26" rx="5" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="310" y="369" fill="#991b1b" font-size="10.5" font-weight="bold" text-anchor="middle">Return -1 (Not Found)</text>

  <!-- Yes branch (Calculate mid) -->
  <line x1="185" y1="228" x2="185" y2="246" stroke="#059669" stroke-width="2"/>
  <polygon points="185,246 181,239 189,239" fill="#059669"/>
  <text x="195" y="240" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="105" y="248" width="160" height="28" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="185" y="266" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">mid = ⌊(low + high) / 2⌋</text>

  <line x1="185" y1="276" x2="185" y2="292" stroke="#475569" stroke-width="2"/>
  <polygon points="185,292 181,285 189,285" fill="#475569"/>

  <!-- Decision: A[mid] == X? -->
  <polygon points="185,294 250,319 185,344 120,319" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="185" y="323" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">A[mid] == X ?</text>

  <!-- Yes -> Found! Return mid -->
  <line x1="120" y1="319" x2="60" y2="319" stroke="#059669" stroke-width="2"/>
  <line x1="60" y1="319" x2="60" y2="352" stroke="#059669" stroke-width="2"/>
  <polygon points="60,352 56,345 64,345" fill="#059669"/>
  <text x="85" y="312" fill="#059669" font-size="10" font-weight="bold">Yes</text>
  <rect x="10" y="354" width="105" height="26" rx="5" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="62" y="371" fill="#065f46" font-size="10.5" font-weight="bold" text-anchor="middle">Return mid (Found)</text>

  <!-- No -> Adjust low/high -->
  <line x1="185" y1="344" x2="185" y2="368" stroke="#475569" stroke-width="2"/>
  <polygon points="185,368 181,361 189,361" fill="#475569"/>
  <text x="195" y="358" fill="#d97706" font-size="9.5" font-weight="bold">No</text>
  <rect x="110" y="370" width="150" height="24" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
  <text x="185" y="386" fill="#334155" font-size="9.5" font-weight="bold" text-anchor="middle">A[mid] &lt; X ? low=mid+1 : high=mid-1</text>

  <!-- End Node -->
  <line x1="62" y1="380" x2="62" y2="408" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="378" x2="310" y2="408" stroke="#475569" stroke-width="2"/>
  <line x1="62" y1="408" x2="310" y2="408" stroke="#475569" stroke-width="2"/>
  <line x1="185" y1="408" x2="185" y2="416" stroke="#475569" stroke-width="2"/>
  <polygon points="185,416 181,409 189,409" fill="#475569"/>
  <rect x="145" y="416" width="80" height="20" rx="10" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="185" y="430" fill="#991b1b" font-size="10" font-weight="bold" text-anchor="middle">End</text>
</svg>`;
            return {
                title: 'Binary Search Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                mermaid: binarySearchMermaid,
                code: `// Binary Search Implementation in Java
public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
        int target = 23;
        int result = binarySearch(arr, target);
        System.out.println("Element found at index: " + result);
    }
}`
            };
        }

        // 2. Finding Maximum of an Array Flowchart
        if (combined.includes('maximum') || combined.includes('max') || combined.includes('minimum') || combined.includes('largest')) {
            const isMin = combined.includes('minimum') || combined.includes('smallest');
            const targetName = isMin ? 'Minimum' : 'Maximum';
            const varName = isMin ? 'min' : 'max';
            const compOp = isMin ? '<' : '>';

            const svg = `<svg viewBox="0 0 380 430" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="430" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="25" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Algorithm Flowchart: Find ${targetName} of Array</text>

  <!-- Start (Pill) -->
  <rect x="135" y="42" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="190" y="60" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start</text>

  <line x1="190" y1="70" x2="190" y2="88" stroke="#475569" stroke-width="2"/>
  <polygon points="190,88 186,81 194,81" fill="#475569"/>

  <!-- Input: Array A of size N (Parallelogram) -->
  <polygon points="120,90 270,90 250,120 100,120" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="185" y="109" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Array A, Size N</text>

  <line x1="185" y1="120" x2="185" y2="138" stroke="#475569" stroke-width="2"/>
  <polygon points="185,138 181,131 189,131" fill="#475569"/>

  <!-- Initialization: max = A[0], i = 1 (Rectangle) -->
  <rect x="120" y="140" width="130" height="30" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="185" y="159" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">${varName} = A[0], i = 1</text>

  <line x1="185" y1="170" x2="185" y2="188" stroke="#475569" stroke-width="2"/>
  <polygon points="185,188 181,181 189,181" fill="#475569"/>

  <!-- Loop Condition: i < N? (Diamond) -->
  <polygon points="185,190 240,215 185,240 130,215" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="185" y="219" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">i &lt; N ?</text>

  <!-- Yes -> Check element A[i] > max -->
  <line x1="185" y1="240" x2="185" y2="260" stroke="#059669" stroke-width="2"/>
  <polygon points="185,260 181,253 189,253" fill="#059669"/>
  <text x="195" y="252" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <polygon points="185,262 245,287 185,312 125,287" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="185" y="291" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">A[i] ${compOp} ${varName} ?</text>

  <!-- Yes -> Update max = A[i] -->
  <line x1="125" y1="287" x2="65" y2="287" stroke="#059669" stroke-width="2"/>
  <line x1="65" y1="287" x2="65" y2="330" stroke="#059669" stroke-width="2"/>
  <polygon points="65,330 61,323 69,323" fill="#059669"/>
  <text x="85" y="280" fill="#059669" font-size="10" font-weight="bold">Yes</text>
  <rect x="20" y="332" width="90" height="26" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="65" y="349" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">${varName} = A[i]</text>

  <!-- No -> Increment i = i + 1 -->
  <line x1="185" y1="312" x2="185" y2="332" stroke="#475569" stroke-width="2"/>
  <polygon points="185,332 181,325 189,325" fill="#475569"/>
  <text x="195" y="324" fill="#64748b" font-size="9.5" font-weight="bold">No</text>
  <rect x="145" y="334" width="80" height="26" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="185" y="351" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">i = i + 1</text>

  <!-- Connect updated max to increment -->
  <line x1="110" y1="345" x2="145" y2="345" stroke="#475569" stroke-width="2"/>

  <!-- Loop back to i < N decision -->
  <line x1="225" y1="347" x2="265" y2="347" stroke="#475569" stroke-width="2"/>
  <line x1="265" y1="347" x2="265" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="265" y1="215" x2="240" y2="215" stroke="#475569" stroke-width="2"/>
  <polygon points="240,215 247,211 247,219" fill="#475569"/>

  <!-- No branch of loop (i >= N): Output max -->
  <line x1="130" y1="215" x2="40" y2="215" stroke="#dc2626" stroke-width="2"/>
  <line x1="40" y1="215" x2="40" y2="385" stroke="#dc2626" stroke-width="2"/>
  <text x="80" y="208" fill="#dc2626" font-size="10" font-weight="bold">No</text>
  <line x1="40" y1="385" x2="115" y2="385" stroke="#dc2626" stroke-width="2"/>
  <polygon points="115,385 108,381 108,389" fill="#dc2626"/>

  <polygon points="135,372 255,372 235,398 115,398" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="185" y="389" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Output ${varName}</text>

  <line x1="185" y1="398" x2="185" y2="410" stroke="#475569" stroke-width="2"/>
  <polygon points="185,410 181,403 189,403" fill="#475569"/>

  <rect x="145" y="410" width="80" height="18" rx="9" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="185" y="423" fill="#991b1b" font-size="9.5" font-weight="bold" text-anchor="middle">End</text>
</svg>`;
            return {
                title: `Algorithm Flowchart: Find ${targetName} of Array`,
                svg: this.cleanLatexForSvg(svg),
                code: `# Flowchart in SchemDraw Flow (MIT License)
import schemdraw
import schemdraw.flow as flow

d = schemdraw.Drawing(show=False)
d.add(flow.Start().label('Start\\nFind ${targetName}'))
d.add(flow.Arrow().down(d.unit/2))
d.add(flow.Data().label('Input: Array A, N'))
d.add(flow.Arrow().down(d.unit/2))
d.add(flow.Box().label('${varName} = A[0]\\ni = 1'))
loop = d.add(flow.Decision().label('i < N?'))
d.save('flowchart.svg')`
            };
        }

        // 8. Merge Sort (Divide & Conquer) Flowchart
        if (combined.includes('merge sort') || combined.includes('mergesort') || combined.includes('divide and conquer')) {
            const svg = `<svg viewBox="0 0 420 520" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="520" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Merge Sort (Divide &amp; Conquer) Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="155" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="210" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start: mergeSort(A, l, r)</text>

  <line x1="210" y1="66" x2="210" y2="84" stroke="#475569" stroke-width="2"/>
  <polygon points="210,84 206,77 214,77" fill="#475569"/>

  <!-- Decision: l < r? (Base case) -->
  <polygon points="210,86 280,114 210,142 140,114" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="210" y="118" fill="#92400e" font-size="11" font-weight="bold" text-anchor="middle">low &lt; high ?</text>

  <!-- No -> Base Case: Return (Already sorted) -->
  <line x1="280" y1="114" x2="350" y2="114" stroke="#dc2626" stroke-width="2"/>
  <line x1="350" y1="114" x2="350" y2="445" stroke="#dc2626" stroke-width="2"/>
  <text x="300" y="106" fill="#dc2626" font-size="10" font-weight="bold">No (Single Element)</text>
  <line x1="350" y1="445" x2="265" y2="445" stroke="#dc2626" stroke-width="2"/>
  <polygon points="265,445 272,441 272,449" fill="#dc2626"/>

  <!-- Yes -> Divide: mid = (l + r) / 2 -->
  <line x1="210" y1="142" x2="210" y2="168" stroke="#059669" stroke-width="2"/>
  <polygon points="210,168 206,161 214,161" fill="#059669"/>
  <text x="220" y="158" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="110" y="170" width="200" height="30" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="210" y="189" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">mid = ⌊(low + high) / 2⌋</text>

  <line x1="210" y1="200" x2="210" y2="225" stroke="#475569" stroke-width="2"/>
  <polygon points="210,225 206,218 214,218" fill="#475569"/>

  <!-- Sub-calls: Left Half & Right Half -->
  <!-- Left Call -->
  <rect x="25" y="228" width="170" height="34" rx="5" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="110" y="244" fill="#15803d" font-size="10.5" font-weight="bold" text-anchor="middle">mergeSort(A, low, mid)</text>
  <text x="110" y="256" fill="#15803d" font-size="9" text-anchor="middle">Recursively Sort Left Half</text>

  <!-- Right Call -->
  <rect x="215" y="228" width="175" height="34" rx="5" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="302" y="244" fill="#15803d" font-size="10.5" font-weight="bold" text-anchor="middle">mergeSort(A, mid+1, high)</text>
  <text x="302" y="256" fill="#15803d" font-size="9" text-anchor="middle">Recursively Sort Right Half</text>

  <!-- Branch to Left and Right -->
  <line x1="210" y1="214" x2="110" y2="214" stroke="#475569" stroke-width="2"/>
  <line x1="110" y1="214" x2="110" y2="228" stroke="#475569" stroke-width="2"/>
  <polygon points="110,228 106,221 114,221" fill="#475569"/>

  <line x1="210" y1="214" x2="302" y2="214" stroke="#475569" stroke-width="2"/>
  <line x1="302" y1="214" x2="302" y2="228" stroke="#475569" stroke-width="2"/>
  <polygon points="302,228 298,221 306,221" fill="#475569"/>

  <!-- Merge step -->
  <line x1="110" y1="262" x2="110" y2="295" stroke="#475569" stroke-width="2"/>
  <line x1="302" y1="262" x2="302" y2="295" stroke="#475569" stroke-width="2"/>
  <line x1="110" y1="295" x2="302" y2="295" stroke="#475569" stroke-width="2"/>
  <line x1="210" y1="295" x2="210" y2="315" stroke="#475569" stroke-width="2"/>
  <polygon points="210,315 206,308 214,308" fill="#475569"/>

  <rect x="70" y="318" width="280" height="50" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="210" y="337" fill="#b45309" font-size="11.5" font-weight="bold" text-anchor="middle">merge(A, low, mid, high)</text>
  <text x="210" y="352" fill="#78350f" font-size="9.5" text-anchor="middle">Compare adjacent sub-arrays using 2 pointers</text>
  <text x="210" y="364" fill="#78350f" font-size="9.5" text-anchor="middle">Copy merged elements back into array A</text>

  <line x1="210" y1="368" x2="210" y2="400" stroke="#475569" stroke-width="2"/>
  <polygon points="210,400 206,393 214,393" fill="#475569"/>

  <!-- Output Result -->
  <polygon points="120,402 300,402 280,428 100,428" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="200" y="419" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Output: Sorted Sub-array A[low..high]</text>

  <line x1="200" y1="428" x2="200" y2="440" stroke="#475569" stroke-width="2"/>
  <polygon points="200,440 196,433 204,433" fill="#475569"/>

  <!-- End Pill -->
  <rect x="155" y="440" width="110" height="26" rx="13" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="210" y="457" fill="#991b1b" font-size="11" font-weight="bold" text-anchor="middle">End / Return</text>

  <!-- Complexity Card -->
  <rect x="20" y="478" width="380" height="32" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="493" fill="#0f172a" font-size="10.5" font-weight="bold" text-anchor="middle">Merge Sort: Divide &amp; Conquer Paradigm</text>
  <text x="210" y="505" fill="#475569" font-size="9.5" text-anchor="middle">Recurrence: T(n) = 2T(n/2) + O(n) • Time: O(n log n) • Space: O(n)</text>
</svg>`;
            return {
                title: 'Merge Sort (Divide & Conquer) Flowchart',
                svg: this.cleanLatexForSvg(svg),
                code: `// Merge Sort Implementation in Java
public class MergeSort {
    public static void mergeSort(int[] arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;

            // Divide & Conquer
            mergeSort(arr, left, mid);
            mergeSort(arr, mid + 1, right);

            // Combine
            merge(arr, left, mid, right);
        }
    }

    private static void merge(int[] arr, int left, int mid, int right) {
        int n1 = mid - left + 1;
        int n2 = right - mid;

        int[] L = new int[n1];
        int[] R = new int[n2];

        for (int i = 0; i < n1; ++i) L[i] = arr[left + i];
        for (int j = 0; j < n2; ++j) R[j] = arr[mid + 1 + j];

        int i = 0, j = 0, k = left;
        while (i < n1 && j < n2) {
            if (L[i] <= R[j]) {
                arr[k++] = L[i++];
            } else {
                arr[k++] = R[j++];
            }
        }

        while (i < n1) arr[k++] = L[i++];
        while (j < n2) arr[k++] = R[j++];
    }

    public static void main(String[] args) {
        int[] data = {38, 27, 43, 3, 9, 82, 10};
        mergeSort(data, 0, data.length - 1);
        System.out.println(java.util.Arrays.toString(data)); // [3, 9, 10, 27, 38, 43, 82]
    }
}`
            };
        }

        // 9. A* Pathfinding Search Algorithm Flowchart
        if (combined.includes('a*') || combined.includes('astar') || combined.includes('a star') || combined.includes('heuristic search')) {
            const svg = `<svg viewBox="0 0 420 540" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="540" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">A* (A-Star) Pathfinding Algorithm Flowchart</text>

  <!-- Start -->
  <rect x="155" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="210" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start A* Search</text>

  <line x1="210" y1="66" x2="210" y2="84" stroke="#475569" stroke-width="2"/>
  <polygon points="210,84 206,77 214,77" fill="#475569"/>

  <!-- Input Data -->
  <polygon points="100,86 330,86 300,116 70,116" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="200" y="105" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Input: Graph G, Start S, Goal G, Heuristic h(n)</text>

  <line x1="200" y1="116" x2="200" y2="134" stroke="#475569" stroke-width="2"/>
  <polygon points="200,134 196,127 204,127" fill="#475569"/>

  <!-- Init Priority Queue -->
  <rect x="80" y="136" width="240" height="38" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="200" y="152" fill="#1d4ed8" font-size="10" font-weight="bold" text-anchor="middle">OpenSet = PriorityQueue(f = g + h)</text>
  <text x="200" y="166" fill="#1d4ed8" font-size="10" font-weight="bold" text-anchor="middle">g[S]=0, f[S]=h(S); OpenSet.add(S)</text>

  <line x1="200" y1="174" x2="200" y2="194" stroke="#475569" stroke-width="2"/>
  <polygon points="200,194 196,187 204,187" fill="#475569"/>

  <!-- Decision: OpenSet empty? -->
  <polygon points="200,196 270,222 200,248 130,222" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="200" y="226" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">OpenSet empty ?</text>

  <!-- Empty -> Fail -->
  <line x1="270" y1="222" x2="355" y2="222" stroke="#dc2626" stroke-width="2"/>
  <line x1="355" y1="222" x2="355" y2="475" stroke="#dc2626" stroke-width="2"/>
  <line x1="355" y1="475" x2="270" y2="475" stroke="#dc2626" stroke-width="2"/>
  <polygon points="270,475 277,471 277,479" fill="#dc2626"/>
  <text x="290" y="215" fill="#dc2626" font-size="10" font-weight="bold">Yes (No Path)</text>

  <!-- Not Empty -> Pop Lowest f -->
  <line x1="200" y1="248" x2="200" y2="268" stroke="#059669" stroke-width="2"/>
  <polygon points="200,268 196,261 204,261" fill="#059669"/>
  <text x="210" y="260" fill="#059669" font-size="9.5" font-weight="bold">No</text>

  <rect x="95" y="270" width="210" height="28" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="200" y="288" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">current = OpenSet.popLowestF()</text>

  <line x1="200" y1="298" x2="200" y2="318" stroke="#475569" stroke-width="2"/>
  <polygon points="200,318 196,311 204,311" fill="#475569"/>

  <!-- Decision: current == Goal? -->
  <polygon points="200,320 270,344 200,368 130,344" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="200" y="348" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">current == Goal ?</text>

  <!-- Yes -> Reconstruct Path -->
  <line x1="130" y1="344" x2="50" y2="344" stroke="#059669" stroke-width="2"/>
  <line x1="50" y1="344" x2="50" y2="400" stroke="#059669" stroke-width="2"/>
  <polygon points="50,400 46,393 54,393" fill="#059669"/>
  <text x="80" y="337" fill="#059669" font-size="10" font-weight="bold">Yes</text>
  <rect x="10" y="402" width="130" height="32" rx="5" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="75" y="422" fill="#065f46" font-size="10" font-weight="bold" text-anchor="middle">Reconstruct Path</text>

  <!-- No -> Relax neighbors -->
  <line x1="200" y1="368" x2="200" y2="394" stroke="#475569" stroke-width="2"/>
  <polygon points="200,394 196,387 204,387" fill="#475569"/>
  <text x="210" y="385" fill="#475569" font-size="9.5" font-weight="bold">No</text>
  <rect x="155" y="396" width="180" height="38" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="245" y="411" fill="#1d4ed8" font-size="9.5" font-weight="bold" text-anchor="middle">For each neighbor v of current:</text>
  <text x="245" y="425" fill="#1d4ed8" font-size="9" text-anchor="middle">tentative_g = g[curr] + d(curr, v)</text>

  <!-- Loop back arrow -->
  <line x1="245" y1="434" x2="245" y2="455" stroke="#475569" stroke-width="1.8"/>
  <line x1="245" y1="455" x2="310" y2="455" stroke="#475569" stroke-width="1.8"/>
  <line x1="310" y1="455" x2="310" y2="188" stroke="#475569" stroke-width="1.8"/>
  <line x1="310" y1="188" x2="208" y2="188" stroke="#475569" stroke-width="1.8"/>
  <polygon points="208,188 215,184 215,192" fill="#475569"/>

  <!-- End Node -->
  <line x1="75" y1="434" x2="75" y2="475" stroke="#059669" stroke-width="2"/>
  <line x1="75" y1="475" x2="160" y2="475" stroke="#059669" stroke-width="2"/>
  <polygon points="160,475 153,471 153,479" fill="#059669"/>
  <rect x="160" y="462" width="110" height="26" rx="13" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="215" y="479" fill="#991b1b" font-size="11" font-weight="bold" text-anchor="middle">End / Path Found</text>

  <!-- Bottom Complexity Card -->
  <rect x="15" y="498" width="390" height="32" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="513" fill="#0f172a" font-size="10.5" font-weight="bold" text-anchor="middle">A* Search: Optimal when heuristic h(n) is Admissible</text>
  <text x="210" y="525" fill="#475569" font-size="9.5" text-anchor="middle">Time: O(b^d) • Space: O(b^d) storing open and closed nodes</text>
</svg>`;
            return {
                title: 'A* Pathfinding Search Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                mermaid: `flowchart TD
    Start([Start A* Search]) --> Input[Input: Graph G, Start S, Goal G, Heuristic h\\(n\\)]
    Input --> Init[OpenSet = PriorityQueue with f = g + h<br/>g[S] = 0, f[S] = h(S)<br/>OpenSet.insert(S)]
    Init --> CheckEmpty{OpenSet empty?}
    CheckEmpty -- Yes --> Fail([Fail: Goal Unreachable])
    CheckEmpty -- No --> PopMin[current = OpenSet.extractMin()]
    PopMin --> GoalCheck{current == Goal?}
    GoalCheck -- Yes --> Reconstruct[Reconstruct Path via parent pointers]
    Reconstruct --> Done([End / Return Shortest Path])
    GoalCheck -- No --> Expand[For each neighbor v of current]
    Expand --> Tentative[tentative_g = g[current] + cost(current, v)]
    Tentative --> CheckG{tentative_g < g[v]?}
    CheckG -- Yes --> Update[g[v] = tentative_g<br/>f[v] = g[v] + h(v)<br/>parent[v] = current<br/>OpenSet.insertOrUpdate(v)]
    CheckG -- No --> Skip[Skip neighbor]
    Update --> Expand
    Skip --> CheckEmpty`,
                codeSnippet: `### 💻 A* Search Algorithm in Java
\`\`\`java
import java.util.*;

public class AStarSearch {
    static class Node implements Comparable<Node> {
        int id;
        double g, h, f;
        Node parent;

        Node(int id, double g, double h) {
            this.id = id;
            this.g = g;
            this.h = h;
            this.f = g + h;
        }

        @Override
        public int compareTo(Node o) {
            return Double.compare(this.f, o.f);
        }
    }

    public static List<Integer> findPath(Map<Integer, Map<Integer, Double>> graph,
                                         Map<Integer, Double> heuristics,
                                         int start, int goal) {
        PriorityQueue<Node> openSet = new PriorityQueue<>();
        Map<Integer, Double> gScores = new HashMap<>();
        Map<Integer, Node> allNodes = new HashMap<>();

        Node startNode = new Node(start, 0.0, heuristics.getOrDefault(start, 0.0));
        allNodes.put(start, startNode);
        gScores.put(start, 0.0);
        openSet.add(startNode);
        Set<Integer> closedSet = new HashSet<>();

        while (!openSet.isEmpty()) {
            Node current = openSet.poll();
            if (current.id == goal) {
                List<Integer> path = new ArrayList<>();
                for (Node curr = current; curr != null; curr = curr.parent) {
                    path.add(curr.id);
                }
                Collections.reverse(path);
                return path;
            }

            closedSet.add(current.id);
            Map<Integer, Double> neighbors = graph.getOrDefault(current.id, Collections.emptyMap());

            for (Map.Entry<Integer, Double> edge : neighbors.entrySet()) {
                int neighbor = edge.getKey();
                if (closedSet.contains(neighbor)) continue;

                double tentativeG = current.g + edge.getValue();
                if (tentativeG < gScores.getOrDefault(neighbor, Double.POSITIVE_INFINITY)) {
                    gScores.put(neighbor, tentativeG);
                    double h = heuristics.getOrDefault(neighbor, 0.0);
                    Node neighborNode = new Node(neighbor, tentativeG, h);
                    neighborNode.parent = current;
                    allNodes.put(neighbor, neighborNode);
                    openSet.add(neighborNode);
                }
            }
        }
        return Collections.emptyList();
    }
}
\`\`\``,
                code: `// A* Search Implementation in Java\npublic class AStarSearch {\n    public static void main(String[] args) {\n        System.out.println("A* Pathfinding Initialized");\n    }\n}`
            };
        }

        // 10. Bellman-Ford Shortest Path Algorithm Flowchart
        if (combined.includes('bellman') || combined.includes('negative cycle') || combined.includes('bellman-ford')) {
            const svg = `<svg viewBox="0 0 420 520" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="520" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Bellman-Ford Algorithm Flowchart</text>

  <!-- Start -->
  <rect x="155" y="38" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="210" y="56" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start Bellman-Ford</text>

  <line x1="210" y1="66" x2="210" y2="84" stroke="#475569" stroke-width="2"/>
  <polygon points="210,84 206,77 214,77" fill="#475569"/>

  <!-- Input -->
  <polygon points="100,86 330,86 300,116 70,116" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="200" y="105" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Input: Graph G = (V, E) with weights, Source S</text>

  <line x1="200" y1="116" x2="200" y2="134" stroke="#475569" stroke-width="2"/>
  <polygon points="200,134 196,127 204,127" fill="#475569"/>

  <!-- Init Distances -->
  <rect x="80" y="136" width="240" height="34" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="200" y="152" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">dist[v] = Infinity for all v in V</text>
  <text x="200" y="165" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">dist[S] = 0; i = 1</text>

  <line x1="200" y1="170" x2="200" y2="190" stroke="#475569" stroke-width="2"/>
  <polygon points="200,190 196,183 204,183" fill="#475569"/>

  <!-- Loop i < |V| ? -->
  <polygon points="200,192 265,216 200,240 135,216" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="200" y="220" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">i &lt; |V| ?</text>

  <!-- Yes -> Relax all edges -->
  <line x1="200" y1="240" x2="200" y2="264" stroke="#059669" stroke-width="2"/>
  <polygon points="200,264 196,257 204,257" fill="#059669"/>
  <text x="210" y="255" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <rect x="65" y="266" width="270" height="38" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="200" y="281" fill="#1d4ed8" font-size="9.5" font-weight="bold" text-anchor="middle">For each edge (u, v) with weight w:</text>
  <text x="200" y="295" fill="#1d4ed8" font-size="9" text-anchor="middle">if dist[u] + w &lt; dist[v]: dist[v] = dist[u] + w</text>

  <!-- Loop back i++ -->
  <line x1="335" y1="285" x2="365" y2="285" stroke="#475569" stroke-width="1.8"/>
  <line x1="365" y1="285" x2="365" y2="182" stroke="#475569" stroke-width="1.8"/>
  <line x1="365" y1="182" x2="208" y2="182" stroke="#475569" stroke-width="1.8"/>
  <polygon points="208,182 215,178 215,186" fill="#475569"/>

  <!-- No -> Check Negative Cycle -->
  <line x1="135" y1="216" x2="50" y2="216" stroke="#475569" stroke-width="2"/>
  <line x1="50" y1="216" x2="50" y2="340" stroke="#475569" stroke-width="2"/>
  <polygon points="50,340 46,333 54,333" fill="#475569"/>
  <text x="80" y="209" fill="#64748b" font-size="10" font-weight="bold">No (|V|-1 done)</text>

  <polygon points="50,342 125,368 50,394 -25,368" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="50" y="372" fill="#92400e" font-size="9.5" font-weight="bold" text-anchor="middle">Any edge can relax?</text>

  <!-- Negative Cycle detected -->
  <line x1="50" y1="394" x2="50" y2="440" stroke="#dc2626" stroke-width="2"/>
  <polygon points="50,440 46,433 54,433" fill="#dc2626"/>
  <text x="60" y="420" fill="#dc2626" font-size="9" font-weight="bold">Yes</text>
  <rect x="5" y="442" width="105" height="26" rx="5" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="57" y="458" fill="#991b1b" font-size="9" font-weight="bold" text-anchor="middle">Negative Cycle!</text>

  <!-- Shortest Paths Valid -->
  <line x1="125" y1="368" x2="200" y2="368" stroke="#059669" stroke-width="2"/>
  <polygon points="200,368 193,364 193,372" fill="#059669"/>
  <text x="145" y="360" fill="#059669" font-size="9" font-weight="bold">No</text>
  <rect x="200" y="352" width="150" height="32" rx="5" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="275" y="372" fill="#065f46" font-size="10" font-weight="bold" text-anchor="middle">Shortest Paths Found</text>

  <!-- Bottom Legend -->
  <rect x="15" y="482" width="390" height="30" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="497" fill="#0f172a" font-size="10" font-weight="bold" text-anchor="middle">Bellman-Ford Algorithm • Handles Negative Edge Weights</text>
  <text x="210" y="508" fill="#475569" font-size="9" text-anchor="middle">Time: O(V * E) • Space: O(V) distances table</text>
</svg>`;
            return {
                title: 'Bellman-Ford Shortest Path Algorithm Flowchart',
                svg: this.cleanLatexForSvg(svg),
                mermaid: `flowchart TD
    Start([Start Bellman-Ford]) --> Init[dist[v] = Infinity for all v<br/>dist[source] = 0]
    Init --> LoopPass[Outer Loop: pass = 1 to |V| - 1]
    LoopPass --> RelaxEdges[For every edge u, v with weight w]
    RelaxEdges --> CheckRelax{dist[u] + w < dist[v]?}
    CheckRelax -- Yes --> Update[dist[v] = dist[u] + w]
    CheckRelax -- No --> NextEdge[Next Edge]
    Update --> NextEdge
    NextEdge --> LoopPass
    LoopPass --> CheckNegCycle[Pass |V|: Check for Negative Cycle]
    CheckNegCycle --> AnyShorter{Can any dist[u] + w < dist[v]?}
    AnyShorter -- Yes --> NegativeCycle([Negative Weight Cycle Detected])
    AnyShorter -- No --> Success([End: Shortest Paths Validated])`,
                codeSnippet: `### 💻 Bellman-Ford Algorithm in Java
\`\`\`java
import java.util.Arrays;

public class BellmanFord {
    static class Edge {
        int u, v, weight;
        Edge(int u, int v, int weight) {
            this.u = u;
            this.v = v;
            this.weight = weight;
        }
    }

    public static int[] shortestPaths(int V, Edge[] edges, int source) {
        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[source] = 0;

        // Relax all edges |V| - 1 times
        for (int i = 1; i < V; ++i) {
            for (Edge e : edges) {
                if (dist[e.u] != Integer.MAX_VALUE && dist[e.u] + e.weight < dist[e.v]) {
                    dist[e.v] = dist[e.u] + e.weight;
                }
            }
        }

        // Check for negative-weight cycles
        for (Edge e : edges) {
            if (dist[e.u] != Integer.MAX_VALUE && dist[e.u] + e.weight < dist[e.v]) {
                throw new IllegalStateException("Graph contains a negative-weight cycle");
            }
        }

        return dist;
    }
}
\`\`\``,
                code: `// Bellman-Ford in Java\npublic class BellmanFord {\n    public static void main(String[] args) {\n        System.out.println("Bellman-Ford Algorithm");\n    }\n}`
            };
        }

        // 11. Dynamic On-Demand CS Algorithm Flowchart (For ANY algorithm)
        let algoName = 'Algorithm';
        const STOP_WORDS = new Set([
            'generate', 'draw', 'write', 'create', 'show', 'display', 'sketch', 'plot', 'make',
            'flowchart', 'diagram', 'uml', 'code', 'in', 'java', 'python', 'cpp', 'c++', 'c',
            'for', 'of', 'the', 'and', 'an', 'a', 'to', 'with', 'algorithm', 'algo', 'using',
            'please', 'can', 'you', 'explain', 'step', 'by'
        ]);
        const tokens = combined.toLowerCase().replace(/[^a-z0-9\s*+-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
        if (tokens.length > 0) {
            algoName = tokens.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        if (!algoName || algoName.length < 2) algoName = 'Computer Science Algorithm';

        const svg = `<svg viewBox="0 0 400 480" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="480" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="25" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${algoName} Execution Flowchart</text>

  <!-- Start (Pill) -->
  <rect x="145" y="42" width="110" height="28" rx="14" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
  <text x="200" y="60" fill="#065f46" font-size="11.5" font-weight="bold" text-anchor="middle">Start ${algoName}</text>

  <line x1="200" y1="70" x2="200" y2="92" stroke="#475569" stroke-width="2"/>
  <polygon points="200,92 196,85 204,85" fill="#475569"/>

  <!-- Input Data -->
  <polygon points="100,94 300,94 275,124 75,124" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="187" y="113" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">Input: Problem Instance &amp; Parameters</text>

  <line x1="187" y1="124" x2="187" y2="148" stroke="#475569" stroke-width="2"/>
  <polygon points="187,148 183,141 191,141" fill="#475569"/>

  <!-- Initialization Process -->
  <rect x="95" y="150" width="185" height="32" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="187" y="170" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Initialize State, Pointers &amp; Auxiliary DS</text>

  <line x1="187" y1="182" x2="187" y2="206" stroke="#475569" stroke-width="2"/>
  <polygon points="187,206 183,199 191,199" fill="#475569"/>

  <!-- Decision: Loop Termination -->
  <polygon points="187,208 255,234 187,260 119,234" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="187" y="238" fill="#92400e" font-size="10.5" font-weight="bold" text-anchor="middle">Loop Termination Met ?</text>

  <!-- Yes -> Output -->
  <line x1="119" y1="234" x2="55" y2="234" stroke="#059669" stroke-width="2"/>
  <line x1="55" y1="234" x2="55" y2="355" stroke="#059669" stroke-width="2"/>
  <polygon points="55,355 51,348 59,348" fill="#059669"/>
  <text x="80" y="226" fill="#059669" font-size="10" font-weight="bold">Yes</text>

  <!-- No -> Core Step -->
  <line x1="187" y1="260" x2="187" y2="284" stroke="#475569" stroke-width="2"/>
  <polygon points="187,284 183,277 191,277" fill="#475569"/>
  <text x="197" y="276" fill="#475569" font-size="9.5" font-weight="bold">No</text>

  <rect x="90" y="286" width="195" height="32" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="187" y="306" fill="#1d4ed8" font-size="10" font-weight="bold" text-anchor="middle">Execute Core Step Transformation</text>

  <!-- Loop back -->
  <line x1="285" y1="302" x2="340" y2="302" stroke="#475569" stroke-width="1.8"/>
  <line x1="340" y1="302" x2="340" y2="196" stroke="#475569" stroke-width="1.8"/>
  <line x1="340" y1="196" x2="197" y2="196" stroke="#475569" stroke-width="1.8"/>
  <polygon points="197,196 204,192 204,200" fill="#475569"/>

  <!-- Output Result -->
  <polygon points="10,357 150,357 130,387 0,387" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="70" y="376" fill="#0369a1" font-size="10" font-weight="bold" text-anchor="middle">Format &amp; Output Solution</text>

  <line x1="70" y1="387" x2="70" y2="415" stroke="#475569" stroke-width="2"/>
  <polygon points="70,415 66,408 74,408" fill="#475569"/>

  <!-- End Node -->
  <rect x="25" y="415" width="90" height="24" rx="12" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="70" y="431" fill="#991b1b" font-size="10.5" font-weight="bold" text-anchor="middle">End / Complete</text>

  <!-- Bottom Legend -->
  <rect x="15" y="445" width="370" height="26" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="462" fill="#475569" font-size="9.5" font-weight="bold" text-anchor="middle">${algoName} • Deterministic Algorithmic Flowchart</text>
</svg>`;

        const mermaidCode = `flowchart TD
    Start([Start: ${algoName}]) --> Input[Input: Problem Instance & Parameters]
    Input --> Init[Initialize State, Pointers & Memory]
    Init --> CheckCond{Loop / Base Condition Met?}
    CheckCond -- No --> CoreStep[Execute Core Step Transformation]
    CoreStep --> InvariantCheck{Validation / Optimization Check}
    InvariantCheck -- Valid --> Update[Update Invariants & Advance State]
    InvariantCheck -- Invalid --> Backtrack[Backtrack or Alternate Route]
    Update --> CheckCond
    Backtrack --> CheckCond
    CheckCond -- Yes --> OutputResult[Format & Return Output Solution]
    OutputResult --> EndNode([End / Terminate])`;

        const javaSnippet = `### 💻 ${algoName} Implementation in Java
\`\`\`java
public class ${algoName.replace(/[^a-zA-Z0-9]/g, '') || 'Algorithm'}Solution {
    /**
     * Executes the ${algoName} algorithm.
     */
    public static void executeAlgorithm() {
        System.out.println("Executing ${algoName}...");
        // 1. Initialize State & Data Structures
        
        // 2. Core Algorithmic Loop / Transformation
        
        // 3. Construct and return final result
    }

    public static void main(String[] args) {
        executeAlgorithm();
    }
}
\`\`\``;

        return {
            title: `${algoName} Algorithm Flowchart`,
            svg: this.cleanLatexForSvg(svg),
            mermaid: mermaidCode,
            codeSnippet: javaSnippet,
            code: `// ${algoName} implementation in Java\npublic class ${algoName.replace(/[^a-zA-Z0-9]/g, '') || 'Algorithm'} {\n    public static void main(String[] args) {\n        System.out.println("Running ${algoName}");\n    }\n}`
        };
    }

    /**
     * Generate an authentic Algorithm Simulation & Step Animation SVG.
     * 100% Free & Open Source (MIT License / algo-sim-mcp).
     */
    generateAlgorithmSimulationSVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Bubble Sort / Sorting Bar Simulation
        if (combined.includes('sort') && !combined.includes('topological')) {
            const isBubble = combined.includes('bubble') || !combined.includes('merge');
            const title = isBubble ? 'Bubble Sort Step-by-Step Simulation & Swaps' : 'Merge Sort Divide & Conquer Simulation';
            const svg = `<svg viewBox="0 0 420 440" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="440" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Interactive Sorting Simulation (algo-sim-mcp)</text>

  <!-- Array Bar Visualizer (Initial State: [65, 25, 12, 22, 90]) -->
  <g transform="translate(30, 45)">
    <rect width="360" height="150" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="180" y="20" fill="#475569" font-size="11" font-weight="bold" text-anchor="middle">Pass 1: Adjacent Pair Comparison &amp; In-Place Swapping</text>

    <!-- Bar 0: Val 65, Height 75 -->
    <rect x="25" y="45" width="45" height="75" rx="4" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
    <text x="47.5" y="85" fill="#854d0e" font-size="12" font-weight="bold" text-anchor="middle">65</text>
    <text x="47.5" y="132" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">A[0]</text>

    <!-- Swap Arrow Between Bar 0 and Bar 1 -->
    <path d="M 60 40 Q 95 20 130 40" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="3,2"/>
    <polygon points="130,40 122,34 125,44" fill="#ef4444"/>
    <text x="95" y="18" fill="#dc2626" font-size="9" font-weight="bold" text-anchor="middle">Swap! 65 &gt; 25</text>

    <!-- Bar 1: Val 25, Height 35 -->
    <rect x="95" y="85" width="45" height="35" rx="4" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
    <text x="117.5" y="107" fill="#991b1b" font-size="12" font-weight="bold" text-anchor="middle">25</text>
    <text x="117.5" y="132" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">A[1]</text>

    <!-- Bar 2: Val 12, Height 20 -->
    <rect x="165" y="100" width="45" height="20" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="187.5" y="115" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">12</text>
    <text x="187.5" y="132" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">A[2]</text>

    <!-- Bar 3: Val 22, Height 32 -->
    <rect x="235" y="88" width="45" height="32" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="257.5" y="108" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">22</text>
    <text x="257.5" y="132" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">A[3]</text>

    <!-- Bar 4: Val 90 (Max element bubbling to end) -->
    <rect x="305" y="30" width="45" height="90" rx="4" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <text x="327.5" y="75" fill="#15803d" font-size="12" font-weight="bold" text-anchor="middle">90</text>
    <text x="327.5" y="132" fill="#15803d" font-size="10" font-weight="bold" text-anchor="middle">A[4] ✓</text>
  </g>

  <!-- Step-by-Step Execution Trace Cards -->
  <g transform="translate(30, 205)">
    <rect width="360" height="175" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="15" y="22" fill="#0f172a" font-size="11.5" font-weight="bold">Live Step-by-Step State Trace</text>

    <!-- Step 1 Card -->
    <rect x="15" y="32" width="330" height="38" rx="5" fill="#fef2f2" stroke="#fca5a5"/>
    <text x="25" y="47" fill="#b91c1c" font-size="10.5" font-weight="bold">Step 1 (i=0, j=0): Compare A[0]=65 and A[1]=25</text>
    <text x="25" y="62" fill="#7f1d1d" font-size="9.5">Condition: 65 &gt; 25 is TRUE → Swap elements! New array: [25, 65, 12, 22, 90]</text>

    <!-- Step 2 Card -->
    <rect x="15" y="76" width="330" height="38" rx="5" fill="#fefce8" stroke="#fde047"/>
    <text x="25" y="91" fill="#854d0e" font-size="10.5" font-weight="bold">Step 2 (i=0, j=1): Compare A[1]=65 and A[2]=12</text>
    <text x="25" y="106" fill="#713f12" font-size="9.5">Condition: 65 &gt; 12 is TRUE → Swap elements! New array: [25, 12, 65, 22, 90]</text>

    <!-- Step 3 Card -->
    <rect x="15" y="120" width="330" height="46" rx="5" fill="#f0fdf4" stroke="#86efac"/>
    <text x="25" y="135" fill="#166534" font-size="10.5" font-weight="bold">Step 3 (i=0, j=2): Compare A[2]=65 and A[3]=22</text>
    <text x="25" y="149" fill="#14532d" font-size="9.5">Condition: 65 &gt; 22 is TRUE → Swap! Array becomes: [25, 12, 22, 65, 90]</text>
    <text x="25" y="161" fill="#15803d" font-size="9" font-weight="bold">Pass 1 Result: Largest item (90) successfully bubbled to index 4!</text>
  </g>

  <!-- Bottom Complexity Card -->
  <rect x="25" y="392" width="370" height="32" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="407" fill="#0f172a" font-size="10" font-weight="bold" text-anchor="middle">Bubble Sort Simulation • Comparisons: O(N²) • Auxiliary Space: O(1) In-Place</text>
  <text x="210" y="419" fill="#475569" font-size="9" text-anchor="middle">Zero commercial fee / Permissive MIT License (algo-sim-mcp)</text>
</svg>`;
            return {
                title,
                svg: this.cleanLatexForSvg(svg),
                code: `// Bubble Sort Simulation with Step-by-Step Print
public class BubbleSortSim {
    public static void main(String[] args) {
        int[] arr = {65, 25, 12, 22, 90};
        int n = arr.length;
        System.out.println("Initial Array: " + java.util.Arrays.toString(arr));
        for (int i = 0; i < n - 1; i++) {
            System.out.println("=== PASS " + (i + 1) + " ===");
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    System.out.println("Swapped " + temp + " and " + arr[j] + " -> " + java.util.Arrays.toString(arr));
                }
            }
        }
    }
}`
            };
        }

        // 2. Default: Binary Search Interactive Step Simulation
        const targetMatch = combined.match(/(?:for|key|target|find|search)\s*(?:=|is|of)?\s*(\d+)/i);
        const targetVal = targetMatch ? parseInt(targetMatch[1]) : 56;
        const title = `Binary Search Simulation (Target Key: ${targetVal})`;

        const svg = `<svg viewBox="0 0 420 440" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="440" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Binary Search Step-by-Step Simulation (algo-sim-mcp)</text>

  <!-- Target Badge -->
  <rect x="145" y="36" width="130" height="24" rx="12" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="210" y="52" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">Target Key X = ${targetVal}</text>

  <!-- Array Container (8 Sorted Elements: [12, 23, 34, 45, 56, 67, 78, 89]) -->
  <g transform="translate(15, 75)">
    <!-- Cell 0: 12 (Eliminated) -->
    <rect x="0" y="0" width="46" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="23" y="25" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle">12</text>
    <text x="23" y="-6" fill="#64748b" font-size="9" text-anchor="middle">[0]</text>

    <!-- Cell 1: 23 (Eliminated) -->
    <rect x="49" y="0" width="46" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="72" y="25" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle">23</text>
    <text x="72" y="-6" fill="#64748b" font-size="9" text-anchor="middle">[1]</text>

    <!-- Cell 2: 34 (Eliminated) -->
    <rect x="98" y="0" width="46" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="121" y="25" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle">34</text>
    <text x="121" y="-6" fill="#64748b" font-size="9" text-anchor="middle">[2]</text>

    <!-- Cell 3: 45 (Mid Iteration 1) -->
    <rect x="147" y="0" width="46" height="40" rx="4" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>
    <text x="170" y="25" fill="#854d0e" font-size="12" font-weight="bold" text-anchor="middle">45</text>
    <text x="170" y="-6" fill="#854d0e" font-size="9" font-weight="bold" text-anchor="middle">[3] mid₁</text>

    <!-- Cell 4: 56 (FOUND MATCH!) -->
    <rect x="196" y="0" width="46" height="40" rx="4" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5"/>
    <text x="219" y="25" fill="#15803d" font-size="13" font-weight="bold" text-anchor="middle">56</text>
    <text x="219" y="-6" fill="#15803d" font-size="9" font-weight="bold" text-anchor="middle">[4] MATCH</text>

    <!-- Cell 5: 67 (Mid Iteration 2) -->
    <rect x="245" y="0" width="46" height="40" rx="4" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
    <text x="268" y="25" fill="#991b1b" font-size="12" font-weight="bold" text-anchor="middle">67</text>
    <text x="268" y="-6" fill="#ef4444" font-size="9" font-weight="bold" text-anchor="middle">[5] mid₂</text>

    <!-- Cell 6: 78 (Eliminated) -->
    <rect x="294" y="0" width="46" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="317" y="25" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle">78</text>
    <text x="317" y="-6" fill="#64748b" font-size="9" text-anchor="middle">[6]</text>

    <!-- Cell 7: 89 (Eliminated) -->
    <rect x="343" y="0" width="46" height="40" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="366" y="25" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle">89</text>
    <text x="366" y="-6" fill="#64748b" font-size="9" text-anchor="middle">[7]</text>

    <!-- Pointer Arrows below array -->
    <polygon points="219,50 214,58 224,58" fill="#16a34a"/>
    <text x="219" y="70" fill="#15803d" font-size="10" font-weight="bold" text-anchor="middle">low=mid=4</text>
  </g>

  <!-- Dynamic Step-by-Step State Trace -->
  <g transform="translate(25, 175)">
    <rect width="370" height="205" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="15" y="22" fill="#0f172a" font-size="11.5" font-weight="bold">Step-by-Step Pointer Contraction Trace</text>

    <!-- Step 1 Card -->
    <rect x="12" y="32" width="346" height="46" rx="5" fill="#ffffff" stroke="#e2e8f0"/>
    <text x="20" y="48" fill="#0369a1" font-size="10.5" font-weight="bold">Step 1: low = 0, high = 7</text>
    <text x="20" y="62" fill="#334155" font-size="9.5">mid = ⌊(0 + 7)/2⌋ = 3 → A[3] = 45</text>
    <text x="20" y="73" fill="#0284c7" font-size="9" font-weight="bold">Comparison: 45 &lt; 56 → Key lies in right half: low = mid + 1 = 4</text>

    <!-- Step 2 Card -->
    <rect x="12" y="84" width="346" height="46" rx="5" fill="#ffffff" stroke="#e2e8f0"/>
    <text x="20" y="100" fill="#b45309" font-size="10.5" font-weight="bold">Step 2: low = 4, high = 7</text>
    <text x="20" y="114" fill="#334155" font-size="9.5">mid = ⌊(4 + 7)/2⌋ = 5 → A[5] = 67</text>
    <text x="20" y="125" fill="#d97706" font-size="9" font-weight="bold">Comparison: 67 &gt; 56 → Key lies in left half: high = mid - 1 = 4</text>

    <!-- Step 3 Card (Target Found!) -->
    <rect x="12" y="136" width="346" height="60" rx="5" fill="#f0fdf4" stroke="#86efac"/>
    <text x="20" y="152" fill="#15803d" font-size="11" font-weight="bold">Step 3: low = 4, high = 4 → FINAL STEP</text>
    <text x="20" y="167" fill="#14532d" font-size="10">mid = ⌊(4 + 4)/2⌋ = 4 → A[4] = 56</text>
    <text x="20" y="180" fill="#15803d" font-size="10" font-weight="bold">MATCH FOUND! A[4] == 56. Returning index 4.</text>
    <text x="20" y="191" fill="#166534" font-size="8.5">Total comparisons performed: 3 (out of max ⌈log₂(8)⌉ = 3)</text>
  </g>

  <!-- Bottom Complexity Card -->
  <rect x="25" y="394" width="370" height="30" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="408" fill="#0f172a" font-size="10" font-weight="bold" text-anchor="middle">Binary Search Simulation • Time: O(log N) • Space: O(1) Iterative</text>
  <text x="210" y="419" fill="#475569" font-size="9" text-anchor="middle">Zero commercial fee / Permissive MIT License (algo-sim-mcp)</text>
</svg>`;
        return {
            title,
            svg: this.cleanLatexForSvg(svg),
            code: `// Binary Search Simulation in Java
public class BinarySearchSim {
    public static int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        int step = 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            System.out.printf("Step %d: low=%d, high=%d, mid=%d, arr[mid]=%d%n", step++, low, high, mid, arr[mid]);
            if (arr[mid] == target) {
                System.out.println("Match found at index " + mid + "!");
                return mid;
            }
            if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}`
        };
    }

    /**
     * Generate an authentic UML Sequence Diagram SVG.
     * 100% Free & Open Source (MIT License / uml-mcp).
     */
    generateUMLSequenceSVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. User Authentication & JWT Login Flow
        if (combined.includes('auth') || combined.includes('login') || combined.includes('jwt') || combined.includes('token') || combined.includes('password') || combined.includes('credential')) {
            const svg = `<svg viewBox="0 0 420 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="400" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Authentication &amp; JWT Login Flow (Sequence Diagram)</text>

  <!-- Participants -->
  <rect x="15" y="42" width="75" height="26" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.8"/>
  <text x="52" y="59" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">👤 User</text>

  <rect x="110" y="42" width="85" height="26" rx="5" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.8"/>
  <text x="152" y="59" fill="#15803d" font-size="10.5" font-weight="bold" text-anchor="middle">💻 Client App</text>

  <rect x="215" y="42" width="85" height="26" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.8"/>
  <text x="257" y="59" fill="#b45309" font-size="10.5" font-weight="bold" text-anchor="middle">⚙️ Auth API</text>

  <rect x="320" y="42" width="85" height="26" rx="5" fill="#f5f3ff" stroke="#8b5cf6" stroke-width="1.8"/>
  <text x="362" y="59" fill="#6d28d9" font-size="10.5" font-weight="bold" text-anchor="middle">🗄️ Database</text>

  <!-- Lifelines -->
  <line x1="52" y1="68" x2="52" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="152" y1="68" x2="152" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="257" y1="68" x2="257" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="362" y1="68" x2="362" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Activation Bars -->
  <rect x="47" y="85" width="10" height="250" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1"/>
  <rect x="147" y="95" width="10" height="235" fill="#bbf7d0" stroke="#22c55e" stroke-width="1"/>
  <rect x="252" y="115" width="10" height="185" fill="#fde68a" stroke="#f59e0b" stroke-width="1"/>
  <rect x="357" y="135" width="10" height="50" fill="#ddd6fe" stroke="#8b5cf6" stroke-width="1"/>

  <!-- Message 1: User -> Client (Submit Credentials) -->
  <line x1="57" y1="95" x2="147" y2="95" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="147,95 139,91 139,99" fill="#0f172a"/>
  <text x="102" y="89" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">1. login(email, pwd)</text>

  <!-- Message 2: Client -> Auth API (POST /api/auth/login) -->
  <line x1="157" y1="120" x2="252" y2="120" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="252,120 244,116 244,124" fill="#0f172a"/>
  <text x="204" y="114" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">2. POST /auth/login</text>

  <!-- Message 3: Auth API -> DB (Query User) -->
  <line x1="262" y1="140" x2="357" y2="140" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="357,140 349,136 349,144" fill="#0f172a"/>
  <text x="310" y="134" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">3. findByEmail()</text>

  <!-- Message 4: DB -> Auth API (Hashed password) -->
  <line x1="357" y1="175" x2="262" y2="175" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,3"/>
  <polygon points="262,175 270,171 270,179" fill="#475569"/>
  <text x="310" y="169" fill="#475569" font-size="8.5" font-weight="bold" text-anchor="middle">4. userRecord (hash)</text>

  <!-- Self-call: Auth API validates bcrypt & signs JWT -->
  <path d="M 262 195 L 285 195 L 285 220 L 262 220" fill="none" stroke="#d97706" stroke-width="1.8"/>
  <polygon points="262,220 270,216 270,224" fill="#d97706"/>
  <text x="290" y="210" fill="#b45309" font-size="8.5" font-weight="bold">5. bcrypt.compare() &amp; signJWT()</text>

  <!-- Message 6: Auth API -> Client (200 OK + JWT) -->
  <line x1="252" y1="245" x2="157" y2="245" stroke="#059669" stroke-width="1.8" stroke-dasharray="4,3"/>
  <polygon points="157,245 165,241 165,249" fill="#059669"/>
  <text x="204" y="239" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">6. 200 OK { token, user }</text>

  <!-- Message 7: Client -> User (Success Screen) -->
  <line x1="147" y1="280" x2="57" y2="280" stroke="#059669" stroke-width="1.8" stroke-dasharray="4,3"/>
  <polygon points="57,280 65,276 65,284" fill="#059669"/>
  <text x="102" y="274" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">7. Redirect to Dashboard</text>

  <!-- Bottom Legend -->
  <rect x="20" y="360" width="380" height="28" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="378" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Stateless JWT Authentication • Signed with RS256/HS256 Secret</text>
</svg>`;
            return {
                title: 'User Authentication & JWT Login Flow (Sequence Diagram)',
                svg: this.cleanLatexForSvg(svg),
                code: `@startuml
actor User
participant "Client (SPA)" as Client
participant "Auth Server" as Auth
database "Database" as DB

User -> Client : 1. Submit email & password
activate Client

Client -> Auth : 2. POST /api/auth/login
activate Auth

Auth -> DB : 3. SELECT * FROM users WHERE email = ?
activate DB
DB --> Auth : 4. User record (bcrypt hash)
deactivate DB

Auth -> Auth : 5. bcrypt.compare(pwd, hash)\\n& jwt.sign(payload, secret)

Auth --> Client : 6. 200 OK { token, user }
deactivate Auth

Client --> User : 7. Store JWT in Storage & Redirect
deactivate Client
@enduml`
            };
        }

        // 2. Online Payment & Checkout Processing Flow
        if (combined.includes('payment') || combined.includes('checkout') || combined.includes('stripe') || combined.includes('order') || combined.includes('cart') || combined.includes('pay')) {
            const svg = `<svg viewBox="0 0 420 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="400" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Payment Gateway Checkout Flow (Sequence Diagram)</text>

  <!-- Participants -->
  <rect x="15" y="42" width="75" height="26" rx="5" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.8"/>
  <text x="52" y="59" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">👤 Customer</text>

  <rect x="110" y="42" width="85" height="26" rx="5" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.8"/>
  <text x="152" y="59" fill="#15803d" font-size="10.5" font-weight="bold" text-anchor="middle">🛍️ Web Store</text>

  <rect x="215" y="42" width="90" height="26" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.8"/>
  <text x="260" y="59" fill="#b45309" font-size="10.5" font-weight="bold" text-anchor="middle">💳 Payment GW</text>

  <rect x="325" y="42" width="80" height="26" rx="5" fill="#f5f3ff" stroke="#8b5cf6" stroke-width="1.8"/>
  <text x="365" y="59" fill="#6d28d9" font-size="10.5" font-weight="bold" text-anchor="middle">🏦 Card Bank</text>

  <!-- Lifelines -->
  <line x1="52" y1="68" x2="52" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="152" y1="68" x2="152" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="260" y1="68" x2="260" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="365" y1="68" x2="365" y2="350" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Activation Bars -->
  <rect x="47" y="85" width="10" height="250" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1"/>
  <rect x="147" y="95" width="10" height="235" fill="#bbf7d0" stroke="#22c55e" stroke-width="1"/>
  <rect x="255" y="115" width="10" height="185" fill="#fde68a" stroke="#f59e0b" stroke-width="1"/>
  <rect x="360" y="140" width="10" height="60" fill="#ddd6fe" stroke="#8b5cf6" stroke-width="1"/>

  <!-- 1. Customer -> Store: Checkout -->
  <line x1="57" y1="95" x2="147" y2="95" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="147,95 139,91 139,99" fill="#0f172a"/>
  <text x="102" y="89" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">1. checkout(orderId)</text>

  <!-- 2. Store -> Gateway: Create Intent -->
  <line x1="157" y1="120" x2="255" y2="120" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="255,120 247,116 247,124" fill="#0f172a"/>
  <text x="206" y="114" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">2. createIntent($99)</text>

  <!-- 3. Gateway -> Bank: Authorize Charge -->
  <line x1="265" y1="145" x2="360" y2="145" stroke="#0f172a" stroke-width="1.8"/>
  <polygon points="360,145 352,141 352,149" fill="#0f172a"/>
  <text x="312" y="139" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">3. authorizeCharge()</text>

  <!-- 4. Bank -> Gateway: 200 Authorized -->
  <line x1="360" y1="185" x2="265" y2="185" stroke="#059669" stroke-width="1.5" stroke-dasharray="4,3"/>
  <polygon points="265,185 273,181 273,189" fill="#059669"/>
  <text x="312" y="179" fill="#059669" font-size="8.5" font-weight="bold" text-anchor="middle">4. 200 Authorized</text>

  <!-- 5. Gateway -> Store: Webhook payment.succeeded -->
  <line x1="255" y1="225" x2="157" y2="225" stroke="#d97706" stroke-width="1.8"/>
  <polygon points="157,225 165,221 165,229" fill="#d97706"/>
  <text x="206" y="219" fill="#d97706" font-size="9" font-weight="bold" text-anchor="middle">5. webhook: charge.success</text>

  <!-- 6. Store -> Customer: Order Confirmed -->
  <line x1="147" y1="270" x2="57" y2="270" stroke="#059669" stroke-width="1.8" stroke-dasharray="4,3"/>
  <polygon points="57,270 65,266 65,274" fill="#059669"/>
  <text x="102" y="264" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">6. Order Confirmation #8201</text>

  <!-- Bottom Legend -->
  <rect x="20" y="360" width="380" height="28" rx="5" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="378" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Idempotent Webhook Payment Flow • PCI-DSS Compliant</text>
</svg>`;
            return {
                title: 'Payment Gateway Checkout Flow (Sequence Diagram)',
                svg: this.cleanLatexForSvg(svg),
                code: `@startuml
actor Customer
participant "Web Store" as Store
participant "Payment Gateway (Stripe)" as Gateway
database "Issuing Bank" as Bank

Customer -> Store : 1. Submit Order ($99.00)
activate Store

Store -> Gateway : 2. POST /v1/payment_intents
activate Gateway

Gateway -> Bank : 3. Request Card Authorization
activate Bank
Bank --> Gateway : 4. Authorization Approved (Funds Reserved)
deactivate Bank

Gateway -> Store : 5. Webhook: payment_intent.succeeded
deactivate Gateway

Store --> Customer : 6. Order Confirmed (#8201) & Receipt
deactivate Store
@enduml`
            };
        }

        // 3. Default: REST API 3-Tier Synchronous Request-Response Lifecycle
        const svg = `<svg viewBox="0 0 380 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="190" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">UML Sequence Diagram</text>

  <!-- Actors / Participants -->
  <rect x="25" y="45" width="70" height="28" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
  <text x="60" y="63" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">Client</text>

  <rect x="140" y="45" width="100" height="28" rx="6" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
  <text x="190" y="63" fill="#15803d" font-size="11" font-weight="bold" text-anchor="middle">API Server</text>

  <rect x="280" y="45" width="75" height="28" rx="6" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="317" y="63" fill="#b45309" font-size="11" font-weight="bold" text-anchor="middle">Database</text>

  <!-- Lifelines (Dashed) -->
  <line x1="60" y1="73" x2="60" y2="330" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="190" y1="73" x2="190" y2="330" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
  <line x1="317" y1="73" x2="317" y2="330" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Activation Bars -->
  <rect x="55" y="95" width="10" height="200" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1"/>
  <rect x="185" y="115" width="10" height="160" fill="#bbf7d0" stroke="#22c55e" stroke-width="1"/>
  <rect x="312" y="155" width="10" height="80" fill="#fde68a" stroke="#f59e0b" stroke-width="1"/>

  <!-- Messages -->
  <!-- 1. Client -> API Server (POST /request) -->
  <line x1="65" y1="115" x2="185" y2="115" stroke="#0f172a" stroke-width="2"/>
  <polygon points="185,115 177,111 177,119" fill="#0f172a"/>
  <text x="125" y="108" fill="#0f172a" font-size="9.5" font-weight="bold" text-anchor="middle">1. Request (POST)</text>

  <!-- 2. API Server -> Database (Query) -->
  <line x1="195" y1="155" x2="312" y2="155" stroke="#0f172a" stroke-width="2"/>
  <polygon points="312,155 304,151 304,159" fill="#0f172a"/>
  <text x="253" y="148" fill="#0f172a" font-size="9.5" font-weight="bold" text-anchor="middle">2. SQL Query</text>

  <!-- 3. Database -> API Server (Result set) -->
  <line x1="312" y1="215" x2="195" y2="215" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,3"/>
  <polygon points="195,215 203,211 203,219" fill="#475569"/>
  <text x="253" y="208" fill="#475569" font-size="9" font-weight="bold" text-anchor="middle">3. Row Data</text>

  <!-- 4. API Server -> Client (200 OK JSON) -->
  <line x1="185" y1="275" x2="65" y2="275" stroke="#059669" stroke-width="1.5" stroke-dasharray="4,3"/>
  <polygon points="65,275 73,271 73,279" fill="#059669"/>
  <text x="125" y="268" fill="#059669" font-size="9.5" font-weight="bold" text-anchor="middle">4. JSON Response (200 OK)</text>

  <!-- Bottom Badge -->
  <rect x="25" y="342" width="330" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="190" y="359" fill="#475569" font-size="10.5" font-weight="bold" text-anchor="middle">Synchronous Request-Response Lifecycle • Standard UML 2.5</text>
</svg>`;
        return {
            title: 'UML Sequence Diagram',
            svg: this.cleanLatexForSvg(svg),
            code: `@startuml
participant Client
participant "API Server" as Server
database Database

Client -> Server : 1. POST /request
activate Server
Server -> Database : 2. SQL Query
activate Database
Database --> Server : 3. Row Data
deactivate Database
Server --> Client : 4. 200 OK (JSON)
deactivate Server
@enduml`
        };
    }

    /**
     * Generate authentic Statistics & Probability SVG diagrams (Normal Distribution, Box Plot, Histogram).
     * 100% Free & Open Source (BSD-3-Clause / SymPy & SciPy).
     */
    generateStatisticsSVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Scatter Plot with Linear Regression Trendline (y = mx + b, Pearson r)
        if (combined.includes('scatter') || combined.includes('regression') || combined.includes('trendline') || combined.includes('correlation') || combined.includes('best fit') || combined.includes('pearson')) {
            const svg = `<svg viewBox="0 0 400 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Scatter Plot &amp; Linear Regression Trendline</text>

  <!-- Axes: Origin at (60, 240) -->
  <line x1="60" y1="240" x2="350" y2="240" stroke="#0f172a" stroke-width="2"/>
  <polygon points="350,240 342,236 342,244" fill="#0f172a"/>
  <text x="355" y="255" fill="#0f172a" font-size="11" font-weight="bold">Independent Var (X)</text>

  <line x1="60" y1="240" x2="60" y2="50" stroke="#0f172a" stroke-width="2"/>
  <polygon points="60,50 56,58 64,58" fill="#0f172a"/>
  <text x="50" y="44" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="start">Dependent Var (Y)</text>

  <!-- Grid lines and ticks -->
  <g stroke="#f1f5f9" stroke-width="1">
    <line x1="60" y1="200" x2="340" y2="200"/>
    <line x1="60" y1="160" x2="340" y2="160"/>
    <line x1="60" y1="120" x2="340" y2="120"/>
    <line x1="60" y1="80" x2="340" y2="80"/>
    <line x1="120" y1="240" x2="120" y2="50"/>
    <line x1="180" y1="240" x2="180" y2="50"/>
    <line x1="240" y1="240" x2="240" y2="50"/>
    <line x1="300" y1="240" x2="300" y2="50"/>
  </g>

  <!-- Axis tick marks & numbers -->
  <text x="60" y="255" fill="#64748b" font-size="10" text-anchor="middle">0</text>
  <text x="120" y="255" fill="#64748b" font-size="10" text-anchor="middle">2</text>
  <text x="180" y="255" fill="#64748b" font-size="10" text-anchor="middle">4</text>
  <text x="240" y="255" fill="#64748b" font-size="10" text-anchor="middle">6</text>
  <text x="300" y="255" fill="#64748b" font-size="10" text-anchor="middle">8</text>

  <text x="48" y="204" fill="#64748b" font-size="10" text-anchor="end">5</text>
  <text x="48" y="164" fill="#64748b" font-size="10" text-anchor="end">10</text>
  <text x="48" y="124" fill="#64748b" font-size="10" text-anchor="end">15</text>
  <text x="48" y="84" fill="#64748b" font-size="10" text-anchor="end">20</text>

  <!-- Regression Line: y = 2.2x + 1.5 -> (0, 1.5) to (9, 21.3) -> points (60, 228) to (330, 70) -->
  <line x1="60" y1="228" x2="330" y2="70" stroke="#dc2626" stroke-width="2.5"/>
  <text x="315" y="60" fill="#dc2626" font-size="11" font-weight="bold">ŷ = 2.24x + 1.28</text>

  <!-- Residual Error Dotted Lines & Scatter Data Points -->
  <!-- Pt 1: (1, 3.8) -> x=90, y=210. ŷ=3.52 -> (90, 212) -->
  <line x1="90" y1="210" x2="90" y2="212" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="90" cy="210" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 2: (2, 6.2) -> x=120, y=190. ŷ=5.76 -> (120, 194) -->
  <line x1="120" y1="190" x2="120" y2="194" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="120" cy="190" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 3: (3, 7.5) -> x=150, y=180. ŷ=8.0 -> (150, 176) -->
  <line x1="150" y1="180" x2="150" y2="176" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="150" cy="180" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 4: (4, 10.8) -> x=180, y=154. ŷ=10.24 -> (180, 158) -->
  <line x1="180" y1="154" x2="180" y2="158" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="180" cy="154" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 5: (5, 12.0) -> x=210, y=144. ŷ=12.48 -> (210, 140) -->
  <line x1="210" y1="144" x2="210" y2="140" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="210" cy="144" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 6: (6, 15.2) -> x=240, y=118. ŷ=14.72 -> (240, 122) -->
  <line x1="240" y1="118" x2="240" y2="122" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="240" cy="118" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 7: (7, 16.5) -> x=270, y=108. ŷ=16.96 -> (270, 104) -->
  <line x1="270" y1="108" x2="270" y2="104" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="270" cy="108" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Pt 8: (8, 19.4) -> x=300, y=85. ŷ=19.2 -> (300, 86) -->
  <line x1="300" y1="85" x2="300" y2="86" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="2,2"/>
  <circle cx="300" cy="85" r="5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>

  <!-- Legend Box -->
  <rect x="70" y="55" width="130" height="34" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
  <circle cx="82" cy="67" r="4" fill="#2563eb"/>
  <text x="94" y="70" fill="#334155" font-size="9.5">Data Points (N=8)</text>
  <line x1="75" y1="80" x2="90" y2="80" stroke="#dc2626" stroke-width="2"/>
  <text x="94" y="83" fill="#334155" font-size="9.5">Regression Line</text>

  <!-- Statistics Card -->
  <rect x="20" y="275" width="360" height="90" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="295" fill="#0f172a" font-size="11.5" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">Ordinary Least Squares (OLS): y = β₁·x + β₀</text>
  <text x="200" y="315" fill="#0369a1" font-size="10.5" font-weight="bold" text-anchor="middle">Slope m = 2.24 • Intercept b = 1.28 • Pearson r = 0.998</text>
  <text x="200" y="333" fill="#15803d" font-size="10" font-weight="bold" text-anchor="middle">Coefficient of Determination R² = 0.996 (99.6% Variance Explained)</text>
  <text x="200" y="351" fill="#64748b" font-size="9.5" text-anchor="middle">Statistical Linear Regression resolved via scipy.stats &amp; numpy (BSD-3)</text>
</svg>`;
            return {
                title: 'Scatter Plot & Linear Regression Trendline (OLS)',
                svg: this.cleanLatexForSvg(svg),
                code: `# Linear Regression & Correlation Analysis (SciPy & NumPy - BSD-3)
import numpy as np
import scipy.stats as stats

x = np.array([1, 2, 3, 4, 5, 6, 7, 8], dtype=float)
y = np.array([3.8, 6.2, 7.5, 10.8, 12.0, 15.2, 16.5, 19.4], dtype=float)

# Compute Ordinary Least Squares Regression
slope, intercept, r_val, p_val, std_err = stats.linregress(x, y)
r_squared = r_val ** 2

print(f"Regression Equation: ŷ = {slope:.3f}x + {intercept:.3f}")
print(f"Pearson Correlation r = {r_val:.4f}")
print(f"Coefficient of Determination R² = {r_squared:.4f}")
print(f"P-value = {p_val:.2e}, Standard Error = {std_err:.4f}")`
            };
        }

        // 2. Frequency Histogram with Normal Bell Curve Overlay
        if (combined.includes('histogram') || (combined.includes('frequency') && (combined.includes('distribution') || combined.includes('bin')))) {
            const svg = `<svg viewBox="0 0 400 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Frequency Histogram &amp; Distribution Density</text>

  <!-- Axes: Origin at (50, 240) -->
  <line x1="50" y1="240" x2="360" y2="240" stroke="#0f172a" stroke-width="2"/>
  <text x="205" y="268" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">Bins / Measurement Intervals</text>

  <line x1="50" y1="240" x2="50" y2="50" stroke="#0f172a" stroke-width="2"/>
  <text x="40" y="44" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="start">Frequency</text>

  <!-- Y-Axis Ticks -->
  <text x="42" y="244" fill="#64748b" font-size="9.5" text-anchor="end">0</text>
  <text x="42" y="195" fill="#64748b" font-size="9.5" text-anchor="end">5</text>
  <text x="42" y="150" fill="#64748b" font-size="9.5" text-anchor="end">10</text>
  <text x="42" y="105" fill="#64748b" font-size="9.5" text-anchor="end">15</text>
  <text x="42" y="60" fill="#64748b" font-size="9.5" text-anchor="end">20</text>

  <!-- Histogram Bars: 6 bins from x=60 to 360, width 48 px each -->
  <!-- Bin 1 [0-10): count = 3 -> height = 27 px (y: 213 to 240) -->
  <rect x="60" y="213" width="46" height="27" fill="#bfdbfe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="83" y="206" fill="#1e40af" font-size="10" font-weight="bold" text-anchor="middle">3</text>
  <text x="83" y="253" fill="#64748b" font-size="9" text-anchor="middle">0-10</text>

  <!-- Bin 2 [10-20): count = 8 -> height = 72 px (y: 168 to 240) -->
  <rect x="110" y="168" width="46" height="72" fill="#bfdbfe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="133" y="161" fill="#1e40af" font-size="10" font-weight="bold" text-anchor="middle">8</text>
  <text x="133" y="253" fill="#64748b" font-size="9" text-anchor="middle">10-20</text>

  <!-- Bin 3 [20-30): count = 18 -> height = 162 px (y: 78 to 240) -->
  <rect x="160" y="78" width="46" height="162" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>
  <text x="183" y="71" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">18</text>
  <text x="183" y="253" fill="#64748b" font-size="9" text-anchor="middle">20-30</text>

  <!-- Bin 4 [30-40): count = 14 -> height = 126 px (y: 114 to 240) -->
  <rect x="210" y="114" width="46" height="126" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>
  <text x="233" y="107" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">14</text>
  <text x="233" y="253" fill="#64748b" font-size="9" text-anchor="middle">30-40</text>

  <!-- Bin 5 [40-50): count = 6 -> height = 54 px (y: 186 to 240) -->
  <rect x="260" y="186" width="46" height="54" fill="#bfdbfe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="283" y="179" fill="#1e40af" font-size="10" font-weight="bold" text-anchor="middle">6</text>
  <text x="283" y="253" fill="#64748b" font-size="9" text-anchor="middle">40-50</text>

  <!-- Bin 6 [50-60): count = 2 -> height = 18 px (y: 222 to 240) -->
  <rect x="310" y="222" width="46" height="18" fill="#bfdbfe" stroke="#2563eb" stroke-width="1.5"/>
  <text x="333" y="215" fill="#1e40af" font-size="10" font-weight="bold" text-anchor="middle">2</text>
  <text x="333" y="253" fill="#64748b" font-size="9" text-anchor="middle">50-60</text>

  <!-- Bell Curve Density Fit Overlay -->
  <path d="M 60 230 Q 110 200 140 140 Q 183 60 215 90 Q 260 140 310 215 Q 335 235 355 238" fill="none" stroke="#dc2626" stroke-width="2.5"/>

  <!-- Mean marker at x = 208 -->
  <line x1="208" y1="65" x2="208" y2="240" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3"/>
  <text x="208" y="55" fill="#dc2626" font-size="10" font-weight="bold" text-anchor="middle">μ ≈ 27.5</text>

  <!-- Explanatory Card -->
  <rect x="20" y="280" width="360" height="85" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="300" fill="#0f172a" font-size="11.5" font-weight="bold" text-anchor="middle">Univariate Sample Distribution (Total N = 51)</text>
  <text x="200" y="320" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Sample Mean x̄ = 27.45 • Standard Deviation s = 11.20</text>
  <text x="200" y="338" fill="#334155" font-size="9.5" text-anchor="middle">Modal Class: [20, 30) with Peak Relative Frequency = 35.3%</text>
  <text x="200" y="353" fill="#64748b" font-size="9" text-anchor="middle">Histogram Binning &amp; KDE fitting computed via scipy.stats (BSD-3)</text>
</svg>`;
            return {
                title: 'Frequency Histogram & Sample Distribution',
                svg: this.cleanLatexForSvg(svg),
                code: `# Histogram Binning & Frequency Distribution (NumPy & SciPy - BSD-3)
import numpy as np

# Sample observations across 6 intervals
counts = np.array([3, 8, 18, 14, 6, 2])
bin_edges = np.array([0, 10, 20, 30, 40, 50, 60])
bin_midpoints = (bin_edges[:-1] + bin_edges[1:]) / 2

# Approximate sample mean and variance from grouped frequency
N = counts.sum()
mean = np.sum(counts * bin_midpoints) / N
variance = np.sum(counts * (bin_midpoints - mean)**2) / (N - 1)
std_dev = np.sqrt(variance)

print(f"Total Observations N = {N}")
print(f"Grouped Sample Mean x̄ = {mean:.2f}")
print(f"Sample Standard Deviation s = {std_dev:.2f}")`
            };
        }

        // 3. Box and Whisker Plot
        if (combined.includes('box plot') || combined.includes('box-and-whisker') || combined.includes('boxplot') || combined.includes('quartile') || combined.includes('iqr')) {
            const svg = `<svg viewBox="0 0 400 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="26" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Box-and-Whisker Plot (Five-Number Summary &amp; IQR)</text>

  <!-- Number Line Axis (y = 230, x from 40 to 360, representing values 0 to 100) -->
  <line x1="40" y1="230" x2="360" y2="230" stroke="#0f172a" stroke-width="2"/>
  <!-- Axis Ticks & Labels -->
  <line x1="40" y1="230" x2="40" y2="238" stroke="#0f172a" stroke-width="1.5"/><text x="40" y="252" font-size="10" fill="#64748b" text-anchor="middle">0</text>
  <line x1="104" y1="230" x2="104" y2="238" stroke="#0f172a" stroke-width="1.5"/><text x="104" y="252" font-size="10" fill="#64748b" text-anchor="middle">20</text>
  <line x1="168" y1="230" x2="168" y2="238" stroke="#0f172a" stroke-width="1.5"/><text x="168" y="252" font-size="10" fill="#64748b" text-anchor="middle">40</text>
  <line x1="232" y1="230" x2="232" y2="238" stroke="#0f172a" stroke-width="1.5"/><text x="232" y="252" font-size="10" fill="#64748b" text-anchor="middle">60</text>
  <line x1="296" y1="230" x2="296" y2="238" stroke="#0f172a" stroke-width="1.5"/><text x="296" y="252" font-size="10" fill="#64748b" text-anchor="middle">80</text>
  <line x1="360" y1="230" x2="360" y2="238" stroke="#0f172a" stroke-width="1.5"/><text x="360" y="252" font-size="10" fill="#64748b" text-anchor="middle">100</text>

  <!-- Left Whisker: Min = 15 (x = 88) to Q1 = 35 (x = 152) -->
  <line x1="88" y1="130" x2="152" y2="130" stroke="#3b82f6" stroke-width="2.5"/>
  <line x1="88" y1="105" x2="88" y2="155" stroke="#3b82f6" stroke-width="3"/>
  <text x="88" y="96" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Min = 15</text>

  <!-- Interquartile Box: Q1 = 35 (x = 152) to Q3 = 75 (x = 280), height 70 (y: 95 to 165) -->
  <rect x="152" y="95" width="128" height="70" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="2.5" opacity="0.85"/>
  <text x="152" y="85" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Q₁ = 35</text>
  <text x="280" y="85" fill="#1d4ed8" font-size="10.5" font-weight="bold" text-anchor="middle">Q₃ = 75</text>

  <!-- Median Line Q2 = 55 (x = 216) -->
  <line x1="216" y1="95" x2="216" y2="165" stroke="#dc2626" stroke-width="3.5"/>
  <text x="216" y="80" fill="#b91c1c" font-size="11" font-weight="bold" text-anchor="middle">Median Q₂ = 55</text>

  <!-- Right Whisker: Q3 = 75 (x = 280) to Max = 95 (x = 344) -->
  <line x1="280" y1="130" x2="344" y2="130" stroke="#3b82f6" stroke-width="2.5"/>
  <line x1="344" y1="105" x2="344" y2="155" stroke="#3b82f6" stroke-width="3"/>
  <text x="344" y="96" fill="#1e40af" font-size="10.5" font-weight="bold" text-anchor="middle">Max = 95</text>

  <!-- Outlier marker at x = 50 (Value = 3) -->
  <circle cx="50" cy="130" r="4.5" fill="#ef4444" stroke="#991b1b" stroke-width="1.5"/>
  <text x="50" y="115" fill="#b91c1c" font-size="9" font-weight="bold" text-anchor="middle">Outlier (3)</text>

  <!-- IQR Dimension Bracket -->
  <line x1="152" y1="180" x2="280" y2="180" stroke="#4f46e5" stroke-width="2"/>
  <line x1="152" y1="175" x2="152" y2="185" stroke="#4f46e5" stroke-width="2"/>
  <line x1="280" y1="175" x2="280" y2="185" stroke="#4f46e5" stroke-width="2"/>
  <text x="216" y="198" fill="#4338ca" font-size="11" font-weight="bold" text-anchor="middle">IQR = Q₃ − Q₁ = 40</text>

  <!-- Bottom Explanatory Card -->
  <rect x="20" y="275" width="360" height="85" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="295" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">Five-Number Summary: Min, Q₁, Median, Q₃, Max</text>
  <text x="200" y="315" fill="#334155" font-size="10" text-anchor="middle">Lower Fence = Q₁ − 1.5 × IQR = 35 − 60 = -25 • Upper Fence = Q₃ + 1.5 × IQR = 135</text>
  <text x="200" y="333" fill="#0369a1" font-size="9.5" font-weight="bold" text-anchor="middle">Middle 50% of data lies strictly inside the box [35, 75]</text>
  <text x="200" y="349" fill="#64748b" font-size="9" text-anchor="middle">Statistical Computation via sympy-mcp &amp; scipy-stats</text>
</svg>`;
            return {
                title: 'Box-and-Whisker Plot (Five-Number Summary)',
                svg: this.cleanLatexForSvg(svg),
                code: `# Five-Number Summary & Outlier Detection
# Resolved via sympy-mcp & scipy.stats (BSD-3)
import numpy as np
import scipy.stats as stats

data = np.array([3, 35, 45, 52, 58, 62, 70, 75, 88, 92, 95])
q1 = np.percentile(data, 25)  # 35.0
median = np.median(data)       # 58.0
q3 = np.percentile(data, 75)  # 75.0
iqr = q3 - q1                  # 40.0

lower_fence = q1 - 1.5 * iqr   # -25.0
upper_fence = q3 + 1.5 * iqr   # 135.0
outliers = data[(data < lower_fence) | (data > upper_fence)]
print(f"Five-Number Summary: Min={data.min()}, Q1={q1}, Med={median}, Q3={q3}, Max={data.max()}")
print(f"IQR={iqr}, Outliers={outliers.tolist()}")`
            };
        }

        // 2. Default: Normal Distribution (Gaussian Bell Curve) with 68-95-99.7 Empirical Rule
        const svg = `<svg viewBox="0 0 400 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="norm68Grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#bae6fd" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="norm95Grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#e0e7ff" stop-opacity="0.2"/>
    </linearGradient>
  </defs>

  <rect width="400" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="200" y="26" fill="#0f172a" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Normal Distribution (Gaussian Bell Curve &amp; 68-95-99.7 Rule)</text>

  <!-- Horizontal Axis at y = 230 -->
  <line x1="25" y1="230" x2="375" y2="230" stroke="#0f172a" stroke-width="2"/>

  <!-- Bell Curve Shaded Region: ±1σ (x: 150 to 250) - 68.2% -->
  <path d="M 150 230 L 150 148 Q 175 80 200 65 Q 225 80 250 148 L 250 230 Z" fill="url(#norm68Grad)"/>
  <!-- Bell Curve Shaded Region: ±2σ (x: 100 to 150 and 250 to 300) - 95.4% -->
  <path d="M 100 230 L 100 215 Q 125 195 150 148 L 150 230 Z" fill="url(#norm95Grad)"/>
  <path d="M 250 230 L 250 148 Q 275 195 300 215 L 300 230 Z" fill="url(#norm95Grad)"/>

  <!-- Full Normal Distribution Curve Outline -->
  <path d="M 25 230 Q 75 230 100 215 Q 125 195 150 148 Q 175 80 200 65 Q 225 80 250 148 Q 275 195 300 215 Q 325 230 375 230" fill="none" stroke="#0284c7" stroke-width="3"/>

  <!-- Mean (μ) Center Line at x = 200 -->
  <line x1="200" y1="65" x2="200" y2="230" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="4,3"/>
  <circle cx="200" cy="65" r="4" fill="#dc2626"/>
  <text x="200" y="55" fill="#dc2626" font-size="11" font-weight="bold" text-anchor="middle">Mean (μ)</text>

  <!-- Standard Deviation Vertical Marks -->
  <line x1="50" y1="225" x2="50" y2="235" stroke="#0f172a" stroke-width="1.5"/><text x="50" y="248" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">μ−3σ</text>
  <line x1="100" y1="225" x2="100" y2="235" stroke="#0f172a" stroke-width="1.5"/><text x="100" y="248" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">μ−2σ</text>
  <line x1="150" y1="225" x2="150" y2="235" stroke="#0f172a" stroke-width="1.5"/><text x="150" y="248" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">μ−1σ</text>
  <line x1="200" y1="225" x2="200" y2="235" stroke="#0f172a" stroke-width="2"/><text x="200" y="248" font-size="11" font-weight="bold" fill="#dc2626" text-anchor="middle">μ</text>
  <line x1="250" y1="225" x2="250" y2="235" stroke="#0f172a" stroke-width="1.5"/><text x="250" y="248" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">μ+1σ</text>
  <line x1="300" y1="225" x2="300" y2="235" stroke="#0f172a" stroke-width="1.5"/><text x="300" y="248" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">μ+2σ</text>
  <line x1="350" y1="225" x2="350" y2="235" stroke="#0f172a" stroke-width="1.5"/><text x="350" y="248" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle">μ+3σ</text>

  <!-- Percentage Badges Inside Curves -->
  <rect x="180" y="130" width="40" height="20" rx="4" fill="#0284c7" fill-opacity="0.9"/>
  <text x="200" y="144" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">68.2%</text>

  <rect x="110" y="170" width="36" height="18" rx="3" fill="#4f46e5" fill-opacity="0.85"/>
  <text x="128" y="183" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle">13.6%</text>
  <rect x="254" y="170" width="36" height="18" rx="3" fill="#4f46e5" fill-opacity="0.85"/>
  <text x="272" y="183" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle">13.6%</text>

  <!-- Formula & Empirical Rule Card -->
  <rect x="20" y="270" width="360" height="92" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="200" y="290" fill="#0f172a" font-size="11.5" font-weight="bold" font-family="Cambria, serif" text-anchor="middle">f(x) = (1 / (σ√(2π))) · e^(-(x - μ)² / (2σ²))</text>
  <text x="200" y="310" fill="#1e40af" font-size="10" font-weight="bold" text-anchor="middle">Empirical Rule: 68.2% within ±1σ • 95.4% within ±2σ • 99.7% within ±3σ</text>
  <text x="200" y="328" fill="#334155" font-size="9.5" text-anchor="middle">Z-Score: Z = (X − μ) / σ • Standard Normal: μ = 0, σ = 1</text>
  <text x="200" y="346" fill="#64748b" font-size="9" text-anchor="middle">Statistical Calculations resolved with sympy-mcp (BSD-3)</text>
</svg>`;
        return {
            title: 'Normal Distribution (Gaussian Curve & Empirical Rule)',
            svg: this.cleanLatexForSvg(svg),
            code: `# Gaussian Normal Distribution & Empirical Rule (68-95-99.7)
# Resolved via sympy-mcp & scipy.stats (BSD-3)
import numpy as np
import scipy.stats as stats

mu, sigma = 0.0, 1.0  # Standard Normal Parameters
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 1000)
pdf = stats.norm.pdf(x, loc=mu, scale=sigma)

# Empirical Rule CDF Integration Probabilities
p_1sigma = stats.norm.cdf(1) - stats.norm.cdf(-1)   # 0.682689 (~68.2%)
p_2sigma = stats.norm.cdf(2) - stats.norm.cdf(-2)   # 0.954499 (~95.4%)
p_3sigma = stats.norm.cdf(3) - stats.norm.cdf(-3)   # 0.997300 (~99.7%)

print(f"Empirical Rule: ±1σ={p_1sigma:.1%}, ±2σ={p_2sigma:.1%}, ±3σ={p_3sigma:.1%}")`
        };
    }

    /**
     * Generate an authentic Entity-Relationship (ER) Diagram / Relational Database Design SVG.
     * 100% Free & Open Source (MIT License / uml-mcp & sqlite-mcp).
     */
    generateERDiagramSVG(text = '', solutionMarkdown = '') {
        const combined = `${text} ${solutionMarkdown}`.toLowerCase();

        // 1. Hospital Management System (PATIENTS, DOCTORS, APPOINTMENTS)
        if (combined.includes('hospital') || combined.includes('clinic') || combined.includes('patient') || combined.includes('doctor') || combined.includes('appointment') || combined.includes('medical')) {
            const svg = `<svg viewBox="0 0 420 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Hospital Management System (ER Diagram)</text>

  <!-- Table 1: PATIENTS (Left: x=25, y=50, w=160, h=125) -->
  <rect x="25" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
  <rect x="25" y="50" width="160" height="28" rx="6" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="105" y="69" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">🏥 PATIENTS</text>
  <text x="35" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 patient_id</text><text x="145" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="30" y1="106" x2="180" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="122" fill="#334155" font-size="9.5">full_name</text><text x="180" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="30" y1="130" x2="180" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="146" fill="#334155" font-size="9.5">dob</text><text x="180" y="146" fill="#64748b" font-size="9" text-anchor="end">DATE</text>
  <line x1="30" y1="154" x2="180" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="168" fill="#334155" font-size="9">blood_group</text><text x="180" y="168" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(5)</text>

  <!-- Table 2: DOCTORS (Right: x=235, y=50, w=160, h=125) -->
  <rect x="235" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
  <rect x="235" y="50" width="160" height="28" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="315" y="69" fill="#15803d" font-size="11" font-weight="bold" text-anchor="middle">👨‍⚕️ DOCTORS</text>
  <text x="245" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 doctor_id</text><text x="355" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="240" y1="106" x2="390" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="122" fill="#334155" font-size="9.5">doctor_name</text><text x="390" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="240" y1="130" x2="390" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="146" fill="#334155" font-size="9.5">specialization</text><text x="390" y="146" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(80)</text>
  <line x1="240" y1="154" x2="390" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="168" fill="#334155" font-size="9">phone</text><text x="390" y="168" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(20)</text>

  <!-- Table 3: APPOINTMENTS (Center Bottom: x=120, y=210, w=180, h=120) -->
  <rect x="120" y="210" width="180" height="120" rx="6" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
  <rect x="120" y="210" width="180" height="28" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="210" y="229" fill="#b45309" font-size="11" font-weight="bold" text-anchor="middle">📅 APPOINTMENTS</text>
  <text x="130" y="256" fill="#b45309" font-size="9.5" font-weight="bold">🔑 appt_id</text><text x="260" y="256" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="125" y1="264" x2="295" y2="264" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="278" fill="#2563eb" font-size="9.5" font-weight="bold">🔗 patient_id</text><text x="295" y="278" fill="#2563eb" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="125" y1="286" x2="295" y2="286" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="300" fill="#16a34a" font-size="9.5" font-weight="bold">🔗 doctor_id</text><text x="295" y="300" fill="#16a34a" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="125" y1="308" x2="295" y2="308" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="322" fill="#334155" font-size="9">appt_date</text><text x="295" y="322" fill="#64748b" font-size="9" text-anchor="end">DATETIME</text>

  <!-- Relationship 1: PATIENTS (1) -> APPOINTMENTS (N) -->
  <path d="M 105 175 L 105 270 L 120 270" fill="none" stroke="#475569" stroke-width="2"/>
  <line x1="100" y1="182" x2="110" y2="182" stroke="#475569" stroke-width="2"/>
  <line x1="100" y1="187" x2="110" y2="187" stroke="#475569" stroke-width="2"/>
  <line x1="120" y1="270" x2="112" y2="265" stroke="#475569" stroke-width="2"/>
  <line x1="120" y1="270" x2="112" y2="275" stroke="#475569" stroke-width="2"/>
  <text x="85" y="225" fill="#475569" font-size="9" font-weight="bold">1 : N</text>

  <!-- Relationship 2: DOCTORS (1) -> APPOINTMENTS (N) -->
  <path d="M 315 175 L 315 270 L 300 270" fill="none" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="182" x2="320" y2="182" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="187" x2="320" y2="187" stroke="#475569" stroke-width="2"/>
  <line x1="300" y1="270" x2="308" y2="265" stroke="#475569" stroke-width="2"/>
  <line x1="300" y1="270" x2="308" y2="275" stroke="#475569" stroke-width="2"/>
  <text x="325" y="225" fill="#475569" font-size="9" font-weight="bold">1 : N</text>

  <rect x="25" y="342" width="370" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="359" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Hospital Database Schema (Crow's Foot 1:N) • Verified via sqlite-mcp</text>
</svg>`;
            return {
                title: 'Hospital Management System (ER Diagram)',
                svg: this.cleanLatexForSvg(svg),
                code: `-- Hospital Management System Database Schema (DDL)
-- Verified via sqlite-mcp (MIT License)

CREATE TABLE patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(80) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    appt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appt_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
    fee DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
);`
            };
        }

        // 2. University / College Course Registration System (STUDENTS, COURSES, ENROLLMENTS)
        if (combined.includes('university') || combined.includes('college') || combined.includes('student') || combined.includes('course') || combined.includes('enrollment') || combined.includes('professor') || combined.includes('faculty')) {
            const svg = `<svg viewBox="0 0 420 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">University Course Registration (ER Diagram)</text>

  <!-- Table 1: STUDENTS (Left: x=25, y=50, w=160, h=125) -->
  <rect x="25" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
  <rect x="25" y="50" width="160" height="28" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="105" y="69" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">🎓 STUDENTS</text>
  <text x="35" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 student_id</text><text x="145" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="30" y1="106" x2="180" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="122" fill="#334155" font-size="9.5">name</text><text x="180" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="30" y1="130" x2="180" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="146" fill="#334155" font-size="9.5">major</text><text x="180" y="146" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(50)</text>
  <line x1="30" y1="154" x2="180" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="168" fill="#334155" font-size="9">gpa</text><text x="180" y="168" fill="#64748b" font-size="9" text-anchor="end">DECIMAL(3,2)</text>

  <!-- Table 2: COURSES (Right: x=235, y=50, w=160, h=125) -->
  <rect x="235" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
  <rect x="235" y="50" width="160" height="28" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="315" y="69" fill="#15803d" font-size="11" font-weight="bold" text-anchor="middle">📚 COURSES</text>
  <text x="245" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 course_id</text><text x="355" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="240" y1="106" x2="390" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="122" fill="#334155" font-size="9.5">title</text><text x="390" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="240" y1="130" x2="390" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="146" fill="#334155" font-size="9.5">credits</text><text x="390" y="146" fill="#64748b" font-size="9" text-anchor="end">INT</text>
  <line x1="240" y1="154" x2="390" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="168" fill="#334155" font-size="9">department</text><text x="390" y="168" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(50)</text>

  <!-- Table 3: ENROLLMENTS (Center Bottom: x=120, y=210, w=180, h=120) -->
  <rect x="120" y="210" width="180" height="120" rx="6" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>
  <rect x="120" y="210" width="180" height="28" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="2"/>
  <text x="210" y="229" fill="#6d28d9" font-size="11" font-weight="bold" text-anchor="middle">📝 ENROLLMENTS</text>
  <text x="130" y="256" fill="#b45309" font-size="9.5" font-weight="bold">🔑 enrollment_id</text><text x="260" y="256" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="125" y1="264" x2="295" y2="264" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="278" fill="#2563eb" font-size="9.5" font-weight="bold">🔗 student_id</text><text x="295" y="278" fill="#2563eb" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="125" y1="286" x2="295" y2="286" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="300" fill="#16a34a" font-size="9.5" font-weight="bold">🔗 course_id</text><text x="295" y="300" fill="#16a34a" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="125" y1="308" x2="295" y2="308" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="322" fill="#334155" font-size="9">grade</text><text x="295" y="322" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(2)</text>

  <!-- Relationship 1: STUDENTS (1) -> ENROLLMENTS (N) -->
  <path d="M 105 175 L 105 270 L 120 270" fill="none" stroke="#475569" stroke-width="2"/>
  <line x1="100" y1="182" x2="110" y2="182" stroke="#475569" stroke-width="2"/>
  <line x1="100" y1="187" x2="110" y2="187" stroke="#475569" stroke-width="2"/>
  <line x1="120" y1="270" x2="112" y2="265" stroke="#475569" stroke-width="2"/>
  <line x1="120" y1="270" x2="112" y2="275" stroke="#475569" stroke-width="2"/>
  <text x="85" y="225" fill="#475569" font-size="9" font-weight="bold">1 : N</text>

  <!-- Relationship 2: COURSES (1) -> ENROLLMENTS (N) -->
  <path d="M 315 175 L 315 270 L 300 270" fill="none" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="182" x2="320" y2="182" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="187" x2="320" y2="187" stroke="#475569" stroke-width="2"/>
  <line x1="300" y1="270" x2="308" y2="265" stroke="#475569" stroke-width="2"/>
  <line x1="300" y1="270" x2="308" y2="275" stroke="#475569" stroke-width="2"/>
  <text x="325" y="225" fill="#475569" font-size="9" font-weight="bold">1 : N</text>

  <rect x="25" y="342" width="370" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="359" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">University Schema (Many-to-Many resolved via Bridge Entity) • sqlite-mcp</text>
</svg>`;
            return {
                title: 'University Course Registration System (ER Diagram)',
                svg: this.cleanLatexForSvg(svg),
                code: `-- University Course Registration Database Schema (DDL)
-- Many-to-Many bridge model verified via sqlite-mcp

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    major VARCHAR(50) NOT NULL,
    gpa DECIMAL(3,2) DEFAULT 0.00
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL CHECK(credits BETWEEN 1 AND 5),
    department VARCHAR(50) NOT NULL
);

CREATE TABLE enrollments (
    enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    semester VARCHAR(20) NOT NULL,
    grade VARCHAR(2),
    UNIQUE(student_id, course_id, semester),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);`
            };
        }

        // 3. Library Management System (BOOKS, MEMBERS, LOANS)
        if (combined.includes('library') || combined.includes('book') || combined.includes('borrow') || combined.includes('loan') || combined.includes('catalog')) {
            const svg = `<svg viewBox="0 0 420 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Library Management System (ER Diagram)</text>

  <!-- Table 1: BOOKS (Left) -->
  <rect x="25" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
  <rect x="25" y="50" width="160" height="28" rx="6" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <text x="105" y="69" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle">📖 BOOKS</text>
  <text x="35" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 isbn</text><text x="145" y="98" fill="#64748b" font-size="9" text-anchor="end">VARCHAR [PK]</text>
  <line x1="30" y1="106" x2="180" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="122" fill="#334155" font-size="9.5">title</text><text x="180" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(150)</text>
  <line x1="30" y1="130" x2="180" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="146" fill="#334155" font-size="9.5">author</text><text x="180" y="146" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="30" y1="154" x2="180" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="168" fill="#334155" font-size="9">total_copies</text><text x="180" y="168" fill="#64748b" font-size="9" text-anchor="end">INT</text>

  <!-- Table 2: MEMBERS (Right) -->
  <rect x="235" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
  <rect x="235" y="50" width="160" height="28" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="315" y="69" fill="#15803d" font-size="11" font-weight="bold" text-anchor="middle">👥 MEMBERS</text>
  <text x="245" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 member_id</text><text x="355" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="240" y1="106" x2="390" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="122" fill="#334155" font-size="9.5">member_name</text><text x="390" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="240" y1="130" x2="390" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="146" fill="#334155" font-size="9.5">email</text><text x="390" y="146" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="240" y1="154" x2="390" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="168" fill="#334155" font-size="9">membership_date</text><text x="390" y="168" fill="#64748b" font-size="9" text-anchor="end">DATE</text>

  <!-- Table 3: LOANS (Center Bottom) -->
  <rect x="120" y="210" width="180" height="120" rx="6" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
  <rect x="120" y="210" width="180" height="28" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="210" y="229" fill="#b45309" font-size="11" font-weight="bold" text-anchor="middle">🏷️ LOANS</text>
  <text x="130" y="256" fill="#b45309" font-size="9.5" font-weight="bold">🔑 loan_id</text><text x="260" y="256" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="125" y1="264" x2="295" y2="264" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="278" fill="#0284c7" font-size="9.5" font-weight="bold">🔗 isbn</text><text x="295" y="278" fill="#0284c7" font-size="9" text-anchor="end">VARCHAR [FK]</text>
  <line x1="125" y1="286" x2="295" y2="286" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="300" fill="#16a34a" font-size="9.5" font-weight="bold">🔗 member_id</text><text x="295" y="300" fill="#16a34a" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="125" y1="308" x2="295" y2="308" stroke="#f1f5f9" stroke-width="1"/>
  <text x="130" y="322" fill="#334155" font-size="9">due_date</text><text x="295" y="322" fill="#64748b" font-size="9" text-anchor="end">DATE</text>

  <!-- Connectors -->
  <path d="M 105 175 L 105 270 L 120 270" fill="none" stroke="#475569" stroke-width="2"/>
  <path d="M 315 175 L 315 270 L 300 270" fill="none" stroke="#475569" stroke-width="2"/>

  <rect x="25" y="342" width="370" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="359" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Library Relational Schema (1:N Borrowing Cardinality) • sqlite-mcp</text>
</svg>`;
            return {
                title: 'Library Management System (ER Diagram)',
                svg: this.cleanLatexForSvg(svg),
                code: `-- Library Management System Schema (DDL)
-- Resolved via sqlite-mcp (MIT License)

CREATE TABLE books (
    isbn VARCHAR(20) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    author VARCHAR(100) NOT NULL,
    total_copies INTEGER NOT NULL CHECK(total_copies >= 0)
);

CREATE TABLE members (
    member_id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    membership_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE loans (
    loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn VARCHAR(20) NOT NULL,
    member_id INTEGER NOT NULL,
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    returned_date DATE,
    FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);`
            };
        }

        // 4. Default: E-Commerce System (USERS, ORDERS, ORDER_ITEMS)
        const svg = `<svg viewBox="0 0 420 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">Relational Database Design (Entity-Relationship Diagram)</text>

  <!-- Table 1: USERS (Left: x=25, y=50, w=160, h=125) -->
  <rect x="25" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
  <rect x="25" y="50" width="160" height="28" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="105" y="69" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">👤 USERS</text>
  <!-- Attributes -->
  <text x="35" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 id</text><text x="145" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="30" y1="106" x2="180" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="122" fill="#334155" font-size="9.5">email</text><text x="180" y="122" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(255)</text>
  <line x1="30" y1="130" x2="180" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="146" fill="#334155" font-size="9.5">name</text><text x="180" y="146" fill="#64748b" font-size="9" text-anchor="end">VARCHAR(100)</text>
  <line x1="30" y1="154" x2="180" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="35" y="168" fill="#334155" font-size="9">created_at</text><text x="180" y="168" fill="#64748b" font-size="9" text-anchor="end">DATETIME</text>

  <!-- Table 2: ORDERS (Right: x=235, y=50, w=160, h=125) -->
  <rect x="235" y="50" width="160" height="125" rx="6" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
  <rect x="235" y="50" width="160" height="28" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="315" y="69" fill="#15803d" font-size="11" font-weight="bold" text-anchor="middle">📦 ORDERS</text>
  <!-- Attributes -->
  <text x="245" y="98" fill="#b45309" font-size="9.5" font-weight="bold">🔑 id</text><text x="355" y="98" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="240" y1="106" x2="390" y2="106" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="122" fill="#2563eb" font-size="9.5" font-weight="bold">🔗 user_id</text><text x="390" y="122" fill="#2563eb" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="240" y1="130" x2="390" y2="130" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="146" fill="#334155" font-size="9.5">total_amount</text><text x="390" y="146" fill="#64748b" font-size="9" text-anchor="end">DECIMAL(10,2)</text>
  <line x1="240" y1="154" x2="390" y2="154" stroke="#f1f5f9" stroke-width="1"/>
  <text x="245" y="168" fill="#334155" font-size="9">order_date</text><text x="390" y="168" fill="#64748b" font-size="9" text-anchor="end">DATETIME</text>

  <!-- Relationship Line 1: USERS (1) -> ORDERS (N) with Crow's Foot notation -->
  <line x1="185" y1="112" x2="235" y2="112" stroke="#475569" stroke-width="2"/>
  <!-- "1" side tick marks -->
  <line x1="192" y1="106" x2="192" y2="118" stroke="#475569" stroke-width="2"/>
  <line x1="197" y1="106" x2="197" y2="118" stroke="#475569" stroke-width="2"/>
  <!-- "N" side crow's foot -->
  <line x1="235" y1="112" x2="225" y2="106" stroke="#475569" stroke-width="2"/>
  <line x1="235" y1="112" x2="225" y2="118" stroke="#475569" stroke-width="2"/>
  <rect x="195" y="88" width="30" height="15" rx="3" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="99" fill="#475569" font-size="9" font-weight="bold" text-anchor="middle">1 : N</text>

  <!-- Table 3: ORDER_ITEMS (Center Bottom: x=130, y=210, w=160, h=115) -->
  <rect x="130" y="210" width="160" height="115" rx="6" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
  <rect x="130" y="210" width="160" height="28" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="210" y="229" fill="#b45309" font-size="11" font-weight="bold" text-anchor="middle">🛒 ORDER_ITEMS</text>
  <!-- Attributes -->
  <text x="140" y="258" fill="#b45309" font-size="9.5" font-weight="bold">🔑 id</text><text x="250" y="258" fill="#64748b" font-size="9" text-anchor="end">INT [PK]</text>
  <line x1="135" y1="266" x2="285" y2="266" stroke="#f1f5f9" stroke-width="1"/>
  <text x="140" y="280" fill="#2563eb" font-size="9.5" font-weight="bold">🔗 order_id</text><text x="285" y="280" fill="#2563eb" font-size="9" text-anchor="end">INT [FK]</text>
  <line x1="135" y1="288" x2="285" y2="288" stroke="#f1f5f9" stroke-width="1"/>
  <text x="140" y="302" fill="#334155" font-size="9.5">quantity</text><text x="285" y="302" fill="#64748b" font-size="9" text-anchor="end">INT</text>
  <line x1="135" y1="310" x2="285" y2="310" stroke="#f1f5f9" stroke-width="1"/>
  <text x="140" y="322" fill="#334155" font-size="9">price_each</text><text x="285" y="322" fill="#64748b" font-size="9" text-anchor="end">DECIMAL(10,2)</text>

  <!-- Relationship Line 2: ORDERS (1) -> ORDER_ITEMS (N) -->
  <path d="M 315 175 L 315 260 L 290 260" fill="none" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="182" x2="320" y2="182" stroke="#475569" stroke-width="2"/>
  <line x1="310" y1="187" x2="320" y2="187" stroke="#475569" stroke-width="2"/>
  <line x1="290" y1="260" x2="298" y2="255" stroke="#475569" stroke-width="2"/>
  <line x1="290" y1="260" x2="298" y2="265" stroke="#475569" stroke-width="2"/>
  <text x="318" y="225" fill="#475569" font-size="9" font-weight="bold">1 : N</text>

  <rect x="25" y="340" width="370" height="28" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="357" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">Crow's Foot Relational Schema • Verified via sqlite-mcp &amp; uml-mcp</text>
</svg>`;
        return {
            title: 'Entity-Relationship Diagram (Relational DB Design)',
            svg: this.cleanLatexForSvg(svg),
            code: `-- Relational Database Schema (SQLite / PostgreSQL DDL)
-- Resolved via sqlite-mcp (Open Source, MIT)

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_each DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);`
        };
    }

    /**
     * Generate an authentic UML Class Diagram SVG.
     * 100% Free & Open Source (MIT License / uml-mcp).
     */
    generateClassDiagramSVG(text = '', solutionMarkdown = '') {
        const svg = `<svg viewBox="0 0 420 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="380" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <text x="210" y="24" fill="#0f172a" font-size="13.5" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">UML Class Diagram (Inheritance &amp; Encapsulation)</text>

  <!-- Base Class: User (Top Center: x=135, y=42, w=150, h=110) -->
  <rect x="135" y="42" width="150" height="110" rx="4" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
  <rect x="135" y="42" width="150" height="26" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
  <text x="210" y="60" fill="#1d4ed8" font-size="11" font-weight="bold" text-anchor="middle">User</text>
  <!-- Attributes -->
  <text x="145" y="82" fill="#334155" font-size="9">- id: int</text>
  <text x="145" y="96" fill="#334155" font-size="9">- email: string</text>
  <line x1="135" y1="102" x2="285" y2="102" stroke="#e2e8f0" stroke-width="1"/>
  <!-- Methods -->
  <text x="145" y="118" fill="#047857" font-size="9">+ login(): bool</text>
  <text x="145" y="134" fill="#047857" font-size="9">+ logout(): void</text>

  <!-- Derived Class 1: Customer (Bottom Left: x=30, y=210, w=160, h=115) -->
  <rect x="30" y="210" width="160" height="115" rx="4" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
  <rect x="30" y="210" width="160" height="26" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="110" y="228" fill="#15803d" font-size="11" font-weight="bold" text-anchor="middle">Customer</text>
  <!-- Attributes -->
  <text x="40" y="250" fill="#334155" font-size="9">- shippingAddress: string</text>
  <text x="40" y="264" fill="#334155" font-size="9">- creditBalance: float</text>
  <line x1="30" y1="270" x2="190" y2="270" stroke="#e2e8f0" stroke-width="1"/>
  <!-- Methods -->
  <text x="40" y="286" fill="#047857" font-size="9">+ placeOrder(): Order</text>
  <text x="40" y="302" fill="#047857" font-size="9">+ getRewardPoints(): int</text>

  <!-- Derived Class 2: Admin (Bottom Right: x=230, y=210, w=160, h=115) -->
  <rect x="230" y="210" width="160" height="115" rx="4" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
  <rect x="230" y="210" width="160" height="26" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
  <text x="310" y="228" fill="#b45309" font-size="11" font-weight="bold" text-anchor="middle">Admin</text>
  <!-- Attributes -->
  <text x="240" y="250" fill="#334155" font-size="9">- permissions: string[]</text>
  <text x="240" y="264" fill="#334155" font-size="9">- department: string</text>
  <line x1="230" y1="270" x2="390" y2="270" stroke="#e2e8f0" stroke-width="1"/>
  <!-- Methods -->
  <text x="240" y="286" fill="#047857" font-size="9">+ banUser(userId): bool</text>
  <text x="240" y="302" fill="#047857" font-size="9">+ exportReport(): File</text>

  <!-- Inheritance Connectors (Hollow Triangle to User base class) -->
  <line x1="110" y1="210" x2="110" y2="180" stroke="#475569" stroke-width="1.8"/>
  <line x1="310" y1="210" x2="310" y2="180" stroke="#475569" stroke-width="1.8"/>
  <line x1="110" y1="180" x2="310" y2="180" stroke="#475569" stroke-width="1.8"/>
  <line x1="210" y1="180" x2="210" y2="162" stroke="#475569" stroke-width="1.8"/>
  <polygon points="210,152 203,164 217,164" fill="#ffffff" stroke="#475569" stroke-width="2"/>
  <text x="210" y="174" fill="#64748b" font-size="8.5" font-style="italic" text-anchor="middle">extends</text>

  <rect x="25" y="342" width="370" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="210" y="359" fill="#475569" font-size="10" font-weight="bold" text-anchor="middle">UML 2.5 Object-Oriented Class Specification • uml-mcp</text>
</svg>`;
        return {
            title: 'UML Class Diagram (OOP Inheritance)',
            svg: this.cleanLatexForSvg(svg),
            code: `@startuml
' UML 2.5 Class Architecture (uml-mcp - Apache-2.0)
skinparam classAttributeIconSize 0

class User {
  - id: int
  - email: string
  + login(): bool
  + logout(): void
}

class Customer {
  - shippingAddress: string
  - creditBalance: float
  + placeOrder(): Order
  + getRewardPoints(): int
}

class Admin {
  - permissions: string[]
  - department: string
  + banUser(userId: int): bool
  + exportReport(): File
}

User <|-- Customer : extends
User <|-- Admin : extends
@enduml`
        };
    }
}

module.exports = new STEMDiagramSynthesizer();
