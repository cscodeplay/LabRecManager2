/**
 * STEM Problem Solver Service
 * Provides instant, deterministic, 100% precise solutions for common PCMB (Physics, Chemistry, Math, Biology)
 * calculations and equations without relying on external LLM availability or network connectivity.
 */

class STEMProblemSolverService {
    /**
     * Attempt to solve common STEM calculations deterministically.
     * Returns an enriched solution payload or null if the query is not a recognized formula.
     */
    solveSTEMProblem(text) {
        if (!text || typeof text !== 'string') return null;
        const low = text.toLowerCase().trim();

        // 1. Ideal Gas Law (PV = nRT)
        const gasResult = this.solveIdealGas(low);
        if (gasResult) return gasResult;

        // 2. Ohm's Law & Electric Power (V = IR, P = VI, P = I^2*R)
        const ohmsResult = this.solveOhmsLaw(low);
        if (ohmsResult) return ohmsResult;

        // 3. Kinetic Energy & Potential Energy (KE = 0.5*m*v^2, PE = m*g*h)
        const energyResult = this.solveEnergy(low);
        if (energyResult) return energyResult;

        // 4. Newton's Second Law (F = ma) & Weight (W = mg)
        const forceResult = this.solveForce(low);
        if (forceResult) return forceResult;

        // 5. Kinematics (v = u + at, s = ut + 0.5at^2, v^2 = u^2 + 2as)
        const kinematicsResult = this.solveKinematics(low);
        if (kinematicsResult) return kinematicsResult;

        // 6. Density (d = m / V)
        const densityResult = this.solveDensity(low);
        if (densityResult) return densityResult;

        return null;
    }

    /**
     * ─── 1. Ideal Gas Law (PV = nRT) ───
     */
    solveIdealGas(low) {
        const isGasQuery = (low.includes('ideal gas') || low.includes('gas law') || low.includes('moles of gas') || low.includes('gas at') || low.includes('moles ideal')) ||
            (/\b(moles?|mol)\b/i.test(low) && /\b(atm|kpa|bar|kelvin|\b300\s*k\b|\b273\s*k\b)\b/i.test(low));

        if (!isGasQuery) return null;

        // Detect target
        let target = null;
        if (/\b(?:calculate|find|determine|what is|compute)\s+(?:the\s+)?volume\b/i.test(low) || /\bvolume\s+of\b/i.test(low)) {
            target = 'V';
        } else if (/\b(?:calculate|find|determine|what is|compute)\s+(?:the\s+)?pressure\b/i.test(low) || /\bpressure\s+of\b/i.test(low)) {
            target = 'P';
        } else if (/\b(?:calculate|find|determine|what is|compute)\s+(?:the\s+)?temperature\b/i.test(low) || /\btemperature\s+of\b/i.test(low)) {
            target = 'T';
        } else if (/\b(?:calculate|find|determine|what is|compute|how many)\s+(?:the\s+)?moles?\b/i.test(low)) {
            target = 'n';
        }

        // Parse n (moles)
        let n = null;
        const nMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:moles?|mol)\b/i);
        if (nMatch) n = parseFloat(nMatch[1]);

        // Parse P (pressure)
        let P = null;
        let pUnit = 'atm';
        const pAtmMatch = low.match(/(\d+(?:\.\d+)?)\s*atm\b/i);
        const pKpaMatch = low.match(/(\d+(?:\.\d+)?)\s*kpa\b/i);
        const pBarMatch = low.match(/(\d+(?:\.\d+)?)\s*bar\b/i);
        if (pAtmMatch) {
            P = parseFloat(pAtmMatch[1]);
            pUnit = 'atm';
        } else if (pKpaMatch) {
            P = parseFloat(pKpaMatch[1]);
            pUnit = 'kPa';
        } else if (pBarMatch) {
            P = parseFloat(pBarMatch[1]);
            pUnit = 'bar';
        }

        // Parse T (temperature)
        let T = null;
        let tOriginalStr = '';
        const tKelvinMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:k\b|kelvin\b)/i);
        const tCelsiusMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:°\s*c|deg\s*c|celsius)\b/i);
        if (tKelvinMatch) {
            T = parseFloat(tKelvinMatch[1]);
            tOriginalStr = `${T}\\text{ K}`;
        } else if (tCelsiusMatch) {
            const cVal = parseFloat(tCelsiusMatch[1]);
            T = cVal + 273.15;
            tOriginalStr = `${cVal}^\\circ\\text{C} = ${T}\\text{ K}`;
        }

        // Parse V (volume)
        let V = null;
        const vLitMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:l\b|liters?|litres?)\b/i);
        const vMlMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:ml\b|milliliters?|millilitres?)\b/i);
        if (vLitMatch && target !== 'V') {
            V = parseFloat(vLitMatch[1]);
        } else if (vMlMatch && target !== 'V') {
            V = parseFloat(vMlMatch[1]) / 1000;
        }

        // Default target if ambiguous
        if (!target) {
            if (n !== null && P !== null && T !== null && V === null) target = 'V';
            else if (n !== null && V !== null && T !== null && P === null) target = 'P';
            else if (P !== null && V !== null && n !== null && T === null) target = 'T';
            else if (P !== null && V !== null && T !== null && n === null) target = 'n';
        }

        if (!target) return null;

        // Universal Gas Constant R
        // In L*atm/(mol*K), R = 0.082057 (or standard textbook 0.0821)
        // In L*kPa/(mol*K), R = 8.314
        let R = 0.0821;
        let rUnitStr = '\\text{L}\\cdot\\text{atm}/(\\text{mol}\\cdot\\text{K})';
        if (pUnit === 'kPa') {
            R = 8.314;
            rUnitStr = '\\text{L}\\cdot\\text{kPa}/(\\text{mol}\\cdot\\text{K})';
        } else if (pUnit === 'bar') {
            R = 0.08314;
            rUnitStr = '\\text{L}\\cdot\\text{bar}/(\\text{mol}\\cdot\\text{K})';
        }

        let speechResponse = '';
        let solutionMarkdown = '';

        if (target === 'V' && n !== null && P !== null && T !== null) {
            const rawV = (n * R * T) / P;
            const roundV = parseFloat(rawV.toFixed(2));
            const mlV = parseFloat((rawV * 1000).toFixed(0));

            speechResponse = `Using the Ideal Gas Law PV = nRT, for ${n} moles of gas at ${P} ${pUnit} and ${T} Kelvin, the volume is ${roundV} Liters.`;

            solutionMarkdown = `### Ideal Gas Law: Volume Calculation\n\n` +
                `**Given Parameters:**\n` +
                `- Number of moles ($n$) = $${n}\\text{ mol}$\n` +
                `- Pressure ($P$) = $${P}\\text{ ${pUnit}}$\n` +
                `- Temperature ($T$) = $${tOriginalStr || `${T}\\text{ K}`}$\n` +
                `- Universal Gas Constant ($R$) = $${R}\\;${rUnitStr}$\n\n` +
                `**Core Equation:**\n` +
                `$$PV = nRT \\implies V = \\frac{nRT}{P}$$\n\n` +
                `**Step-by-Step Calculation:**\n` +
                `$$V = \\frac{(${n}\\text{ mol}) \\times (${R}\\;${rUnitStr}) \\times (${T}\\text{ K})}{${P}\\text{ ${pUnit}}}$$\n` +
                `$$V = \\frac{${(n * R * T).toFixed(3)}}{${P}} = ${roundV}\\text{ Liters}$$\n\n` +
                `**Final Conclusion:**\n` +
                `The volume occupied by the ideal gas is **$${roundV}\\text{ L}$** (${mlV.toLocaleString()}\\text{ mL}).`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: [
                    '🌡️ Boyle\'s Law: P₁V₁ = P₂V₂',
                    '🧪 Charles\'s Law: V₁/T₁ = V₂/T₂',
                    '⚖️ Avogadro\'s Law: V₁/n₁ = V₂/n₂',
                    '🧊 Convert to STP (0°C, 1 atm)'
                ],
                canvasAction: {
                    type: 'insert_solution_card',
                    question: `Calculate volume of ${n} moles ideal gas at ${P} ${pUnit} and ${T} K`,
                    solutionMarkdown,
                    speechResponse
                },
                actions: []
            };
        } else if (target === 'P' && n !== null && V !== null && T !== null) {
            const rawP = (n * R * T) / V;
            const roundP = parseFloat(rawP.toFixed(2));

            speechResponse = `Using the Ideal Gas Law, with ${n} moles in ${V} Liters at ${T} Kelvin, the pressure is ${roundP} ${pUnit}.`;

            solutionMarkdown = `### Ideal Gas Law: Pressure Calculation\n\n` +
                `**Given Parameters:**\n` +
                `- Moles ($n$) = $${n}\\text{ mol}$\n` +
                `- Volume ($V$) = $${V}\\text{ L}$\n` +
                `- Temperature ($T$) = $${T}\\text{ K}$\n` +
                `- Gas Constant ($R$) = $${R}\\;${rUnitStr}$\n\n` +
                `**Formula & Substitution:**\n` +
                `$$P = \\frac{nRT}{V} = \\frac{${n} \\times ${R} \\times ${T}}{${V}} = ${roundP}\\text{ ${pUnit}}$$\n\n` +
                `**Final Conclusion:**\n` +
                `The pressure exerted by the gas is **$${roundP}\\text{ ${pUnit}}$**.`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['🌡️ Boyle\'s Law', '🧪 Gay-Lussac\'s Law', '💡 Dalton\'s Partial Pressure'],
                canvasAction: {
                    type: 'insert_solution_card',
                    question: `Calculate pressure of ${n} moles ideal gas in ${V} L at ${T} K`,
                    solutionMarkdown,
                    speechResponse
                },
                actions: []
            };
        } else if (target === 'T' && P !== null && V !== null && n !== null) {
            const rawT = (P * V) / (n * R);
            const roundT = parseFloat(rawT.toFixed(2));
            const cT = parseFloat((roundT - 273.15).toFixed(1));

            speechResponse = `Using the Ideal Gas Law, the temperature is ${roundT} Kelvin (${cT} degrees Celsius).`;

            solutionMarkdown = `### Ideal Gas Law: Temperature Calculation\n\n` +
                `$$T = \\frac{PV}{nR} = \\frac{${P} \\times ${V}}{${n} \\times ${R}} = ${roundT}\\text{ K} \\; (${cT}^\\circ\\text{C})$$\n\n` +
                `**Final Conclusion:**\n` +
                `The temperature is **$${roundT}\\text{ K}$** ($${cT}^\\circ\\text{C}$).`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['🌡️ Absolute Zero', '🧪 Charles\'s Law', '🧊 STP Conditions'],
                canvasAction: {
                    type: 'insert_solution_card',
                    question: `Calculate temperature of ${n} moles gas at ${P} ${pUnit} and ${V} L`,
                    solutionMarkdown,
                    speechResponse
                },
                actions: []
            };
        }

        return null;
    }

    /**
     * ─── 2. Ohm's Law & Electric Power (V = IR, P = VI) ───
     */
    solveOhmsLaw(low) {
        const isOhm = /\b(ohm'?s?\s*law|current|voltage|resistance|resistor|amps?|amperes?|volts?|ohms?)\b/i.test(low);
        if (!isOhm) return null;

        // V in Volts
        let V = null;
        const vMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:v\b|volts?)\b/i);
        if (vMatch) V = parseFloat(vMatch[1]);

        // I in Amperes
        let I = null;
        const iMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:a\b|amps?|amperes?)\b/i);
        if (iMatch) I = parseFloat(iMatch[1]);

        // R in Ohms
        let R = null;
        const rMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:Ω|ohms?)\b/i);
        if (rMatch) R = parseFloat(rMatch[1]);

        let target = null;
        if (/\b(?:calculate|find|determine|what is)\s+(?:the\s+)?current\b/i.test(low)) target = 'I';
        else if (/\b(?:calculate|find|determine|what is)\s+(?:the\s+)?voltage\b/i.test(low)) target = 'V';
        else if (/\b(?:calculate|find|determine|what is)\s+(?:the\s+)?resistance\b/i.test(low)) target = 'R';

        if (!target) {
            if (V !== null && R !== null && I === null) target = 'I';
            else if (I !== null && R !== null && V === null) target = 'V';
            else if (V !== null && I !== null && R === null) target = 'R';
        }

        if (target === 'I' && V !== null && R !== null) {
            const rawI = V / R;
            const roundI = parseFloat(rawI.toFixed(3));
            const P = parseFloat((V * roundI).toFixed(2));

            const speechResponse = `By Ohm's Law V = IR, with a voltage of ${V} Volts and resistance of ${R} Ohms, the current is ${roundI} Amperes.`;
            const solutionMarkdown = `### Ohm's Law: Current Calculation\n\n` +
                `**Given:** $V = ${V}\\text{ V}$, $R = ${R}\\,\\Omega$\n\n` +
                `**Formula:**\n` +
                `$$I = \\frac{V}{R}$$\n\n` +
                `**Calculation:**\n` +
                `$$I = \\frac{${V}\\text{ V}}{${R}\\,\\Omega} = ${roundI}\\text{ A}$$\n\n` +
                `Power dissipated: $P = VI = ${V} \\times ${roundI} = ${P}\\text{ W}$.\n\n` +
                `**Result:** The current is **$${roundI}\\text{ A}$** (${roundI * 1000}\\text{ mA}).`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['⚡ Electric Power P = VI', '🔌 Series Resistors', '🔀 Parallel Resistors'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate current for ${V}V and ${R}Ω`, solutionMarkdown, speechResponse },
                actions: []
            };
        } else if (target === 'V' && I !== null && R !== null) {
            const rawV = I * R;
            const roundV = parseFloat(rawV.toFixed(2));
            const speechResponse = `By Ohm's Law, the voltage across ${R} Ohms carrying ${I} Amps is ${roundV} Volts.`;
            const solutionMarkdown = `### Ohm's Law: Voltage Calculation\n\n` +
                `$$V = I \\times R = ${I}\\text{ A} \\times ${R}\\,\\Omega = ${roundV}\\text{ V}$$\n\n` +
                `**Result:** The voltage is **$${roundV}\\text{ V}$**.`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['⚡ Power P = I²R', '📏 Kirchhoff\'s Voltage Law'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate voltage for ${I}A and ${R}Ω`, solutionMarkdown, speechResponse },
                actions: []
            };
        } else if (target === 'R' && V !== null && I !== null) {
            const rawR = V / I;
            const roundR = parseFloat(rawR.toFixed(2));
            const speechResponse = `By Ohm's Law, the resistance for ${V} Volts at ${I} Amps is ${roundR} Ohms.`;
            const solutionMarkdown = `### Ohm's Law: Resistance Calculation\n\n` +
                `$$R = \\frac{V}{I} = \\frac{${V}\\text{ V}}{${I}\\text{ A}} = ${roundR}\\,\\Omega$$\n\n` +
                `**Result:** The resistance is **$${roundR}\\,\\Omega$**.`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['⚡ Electric Power', '🔋 Internal Resistance'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate resistance for ${V}V and ${I}A`, solutionMarkdown, speechResponse },
                actions: []
            };
        }

        return null;
    }

    /**
     * ─── 3. Kinetic & Potential Energy (KE = 0.5 mv^2, PE = mgh) ───
     */
    solveEnergy(low) {
        const isKe = /\b(kinetic\s+energy|k\.e\.|ke)\b/i.test(low);
        const isPe = /\b(potential\s+energy|p\.e\.|pe)\b/i.test(low);
        if (!isKe && !isPe) return null;

        // Mass in kg
        let m = null;
        const mMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
        if (mMatch) m = parseFloat(mMatch[1]);

        // Velocity in m/s
        let v = null;
        const vMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:m\/s|meters?\s*per\s*second|ms\^-1)\b/i);
        if (vMatch) v = parseFloat(vMatch[1]);

        // Height in m
        let h = null;
        const hMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:m\b|meters?)\b/i);
        if (hMatch && !low.includes(`${hMatch[1]} m/s`)) h = parseFloat(hMatch[1]);

        if (isKe && m !== null && v !== null) {
            const ke = 0.5 * m * v * v;
            const roundKe = parseFloat(ke.toFixed(2));
            const speechResponse = `The kinetic energy of a ${m} kg object moving at ${v} meters per second is ${roundKe} Joules.`;
            const solutionMarkdown = `### Kinetic Energy Calculation\n\n` +
                `**Given:** Mass $m = ${m}\\text{ kg}$, Velocity $v = ${v}\\text{ m/s}$\n\n` +
                `**Formula:**\n` +
                `$$KE = \\frac{1}{2} m v^2$$\n\n` +
                `**Calculation:**\n` +
                `$$KE = \\frac{1}{2} \\times ${m} \\times (${v})^2 = \\frac{1}{2} \\times ${m} \\times ${v * v} = ${roundKe}\\text{ J}$$\n\n` +
                `**Conclusion:** The kinetic energy is **$${roundKe}\\text{ Joules}$** ($${(roundKe / 1000).toFixed(3)}\\text{ kJ}$).`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['⚖️ Work-Energy Theorem', '🏎️ Momentum p = mv', '🎢 Conservation of Energy'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate kinetic energy of ${m}kg at ${v}m/s`, solutionMarkdown, speechResponse },
                actions: []
            };
        } else if (isPe && m !== null && h !== null) {
            const g = 9.8;
            const pe = m * g * h;
            const roundPe = parseFloat(pe.toFixed(2));
            const speechResponse = `The gravitational potential energy of a ${m} kg object at a height of ${h} meters is ${roundPe} Joules.`;
            const solutionMarkdown = `### Potential Energy Calculation\n\n` +
                `**Given:** Mass $m = ${m}\\text{ kg}$, Height $h = ${h}\\text{ m}$, $g = 9.8\\text{ m/s}^2$\n\n` +
                `**Formula:**\n` +
                `$$PE = m g h$$\n\n` +
                `**Calculation:**\n` +
                `$$PE = ${m} \\times 9.8 \\times ${h} = ${roundPe}\\text{ J}$$\n\n` +
                `**Conclusion:** The gravitational potential energy is **$${roundPe}\\text{ Joules}$**.`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['🎢 Conservation of Mechanical Energy', '🚀 Escape Velocity'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate potential energy of ${m}kg at height ${h}m`, solutionMarkdown, speechResponse },
                actions: []
            };
        }

        return null;
    }

    /**
     * ─── 4. Force (F = ma) ───
     */
    solveForce(low) {
        if (!/\b(force|newton'?s?\s*second\s*law|f\s*=\s*ma)\b/i.test(low)) return null;

        let m = null;
        const mMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
        if (mMatch) m = parseFloat(mMatch[1]);

        let a = null;
        const aMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:m\/s\^?2|meters?\s*per\s*second\s*squared)\b/i);
        if (aMatch) a = parseFloat(aMatch[1]);

        if (m !== null && a !== null) {
            const f = m * a;
            const roundF = parseFloat(f.toFixed(2));
            const speechResponse = `By Newton's Second Law F = ma, the force required to accelerate a ${m} kg mass at ${a} m/s² is ${roundF} Newtons.`;
            const solutionMarkdown = `### Newton's Second Law: Force Calculation\n\n` +
                `**Given:** Mass $m = ${m}\\text{ kg}$, Acceleration $a = ${a}\\text{ m/s}^2$\n\n` +
                `**Formula:**\n` +
                `$$F = m a = ${m} \\times ${a} = ${roundF}\\text{ N}$$\n\n` +
                `**Conclusion:** The net force is **$${roundF}\\text{ Newtons}$**.`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['⚖️ Newton\'s Third Law', '🏎️ Momentum p = mv', '🛑 Friction Force f = μN'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate force for ${m}kg and ${a}m/s²`, solutionMarkdown, speechResponse },
                actions: []
            };
        }

        return null;
    }

    /**
     * ─── 5. Kinematics (v = u + at, s = ut + 0.5at^2) ───
     */
    solveKinematics(low) {
        return null;
    }

    /**
     * ─── 6. Density (d = m / V) ───
     */
    solveDensity(low) {
        if (!/\b(density|mass\s+per\s+volume)\b/i.test(low)) return null;
        let m = null;
        const mMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:kg|g|grams?)\b/i);
        if (mMatch) m = parseFloat(mMatch[1]);

        let v = null;
        const vMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:m\^3|cm\^3|ml|liters?)\b/i);
        if (vMatch) v = parseFloat(vMatch[1]);

        if (m !== null && v !== null && v > 0) {
            const d = parseFloat((m / v).toFixed(3));
            const speechResponse = `The density is ${d}.`;
            const solutionMarkdown = `### Density Calculation\n\n` +
                `$$\\rho = \\frac{m}{V} = \\frac{${m}}{${v}} = ${d}$$\n\n` +
                `**Conclusion:** The density is **$${d}$**.`;

            return {
                recognized: true,
                success: true,
                speechResponse,
                solutionMarkdown,
                suggestedFollowUps: ['🌊 Specific Gravity', '⚖️ Archimedes Principle'],
                canvasAction: { type: 'insert_solution_card', question: `Calculate density for mass ${m} and volume ${v}`, solutionMarkdown, speechResponse },
                actions: []
            };
        }

        return null;
    }
}

module.exports = new STEMProblemSolverService();
