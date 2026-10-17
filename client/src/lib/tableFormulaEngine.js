/**
 * tableFormulaEngine.js
 * 
 * High-performance Excel-like formula parser and evaluation engine with cell addressing
 * and comprehensive STEM functions for Mathematics, Physics, Chemistry, and Biology.
 * 
 * Supports:
 * - Formulas starting with `=` (e.g. `=A1 + B1`, `=SUM(A1:A5) * 2`)
 * - Cell addressing (e.g. A1, B2, Z10, AA1) and cell ranges (e.g. A1:A5, B2:D4)
 * - Standard arithmetic operators: +, -, *, /, ^ (power), % (modulo), and parentheses
 * - Recursive resolution of dependent formulas with cycle detection (#CIRCULAR!)
 * - Rich STEM Function Library:
 *     📐 Mathematics (SUM, AVERAGE, MIN, MAX, PRODUCT, ABS, ROUND, SQRT, TRIG, LOG, etc.)
 *     ⚛️ Physics (Kinematics, Newton Force, Energy, Ohm's Law, Resistors, Waves, Constants)
 *     🧪 Chemistry (Molarity, Molality, pH, pOH, Dilution, Ideal Gas, Arrhenius, Half-life)
 *     🧬 Biology (BMI, BMR, Hardy-Weinberg, Michaelis-Menten, Q10, Mitotic Index, Shannon Index)
 */

// 1. Coordinate & Cell Address Helpers
export const colLetterToIndex = (colStr) => {
    if (!colStr) return 0;
    const clean = colStr.toUpperCase().trim();
    let index = 0;
    for (let i = 0; i < clean.length; i++) {
        index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
};

export const indexToColLetter = (index) => {
    let label = '';
    let num = index;
    while (num >= 0) {
        label = String.fromCharCode((num % 26) + 65) + label;
        num = Math.floor(num / 26) - 1;
    }
    return label;
};

export const parseCellAddress = (addr) => {
    const match = addr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const col = colLetterToIndex(match[1]);
    const row = parseInt(match[2], 10) - 1; // 1-indexed to 0-indexed
    return { col, row, key: `${row}-${col}` };
};

// 2. STEM Function Definitions Catalog (with metadata for Autocomplete)
export const STEM_FUNCTIONS_CATALOG = [
    // --- 📐 MATHEMATICS ---
    {
        name: 'SUM',
        signature: 'SUM(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Sum of all numbers or ranges (e.g. SUM(A1:A5))',
        example: '=SUM(A1:A5)'
    },
    {
        name: 'AVERAGE',
        signature: 'AVERAGE(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Arithmetic mean of numbers or ranges',
        example: '=AVERAGE(A1:A10)'
    },
    {
        name: 'COUNT',
        signature: 'COUNT(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Counts the number of numeric values in range',
        example: '=COUNT(A1:B10)'
    },
    {
        name: 'MIN',
        signature: 'MIN(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Returns the minimum value in list or range',
        example: '=MIN(A1:A5)'
    },
    {
        name: 'MAX',
        signature: 'MAX(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Returns the maximum value in list or range',
        example: '=MAX(A1:A5)'
    },
    {
        name: 'PRODUCT',
        signature: 'PRODUCT(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Multiplies all given numbers or ranges',
        example: '=PRODUCT(A1:A4)'
    },
    {
        name: 'ABS',
        signature: 'ABS(number)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Absolute value |x| of a number',
        example: '=ABS(A1)'
    },
    {
        name: 'ROUND',
        signature: 'ROUND(number, [decimals])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Rounds number to specified decimal places (default 0)',
        example: '=ROUND(A1, 2)'
    },
    {
        name: 'CEIL',
        signature: 'CEIL(number)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Rounds number up to nearest integer (ceiling)',
        example: '=CEIL(A1)'
    },
    {
        name: 'FLOOR',
        signature: 'FLOOR(number)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Rounds number down to nearest integer (floor)',
        example: '=FLOOR(A1)'
    },
    {
        name: 'SQRT',
        signature: 'SQRT(number)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Square root of a non-negative number',
        example: '=SQRT(A1)'
    },
    {
        name: 'POWER',
        signature: 'POWER(base, exponent)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Raises base to the specified exponent (base^exp)',
        example: '=POWER(A1, 3)'
    },
    {
        name: 'LOG',
        signature: 'LOG(number, [base])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Logarithm of number to given base (default 10)',
        example: '=LOG(A1, 10)'
    },
    {
        name: 'LN',
        signature: 'LN(number)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Natural logarithm (base e) of a positive number',
        example: '=LN(A1)'
    },
    {
        name: 'EXP',
        signature: 'EXP(number)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'e raised to the power of number (e^x)',
        example: '=EXP(A1)'
    },
    {
        name: 'SIN',
        signature: 'SIN(radians)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Sine of angle in radians',
        example: '=SIN(RADIANS(30))'
    },
    {
        name: 'COS',
        signature: 'COS(radians)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Cosine of angle in radians',
        example: '=COS(RADIANS(60))'
    },
    {
        name: 'TAN',
        signature: 'TAN(radians)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Tangent of angle in radians',
        example: '=TAN(RADIANS(45))'
    },
    {
        name: 'ASIN',
        signature: 'ASIN(x)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Inverse sine (arcsin) in radians [-pi/2, pi/2]',
        example: '=ASIN(0.5)'
    },
    {
        name: 'ACOS',
        signature: 'ACOS(x)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Inverse cosine (arccos) in radians [0, pi]',
        example: '=ACOS(0.5)'
    },
    {
        name: 'ATAN',
        signature: 'ATAN(x)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Inverse tangent (arctan) in radians',
        example: '=ATAN(1)'
    },
    {
        name: 'DEGREES',
        signature: 'DEGREES(radians)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Converts radians to degrees',
        example: '=DEGREES(PI()/2)'
    },
    {
        name: 'RADIANS',
        signature: 'RADIANS(degrees)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Converts degrees to radians',
        example: '=RADIANS(180)'
    },
    {
        name: 'MOD',
        signature: 'MOD(dividend, divisor)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Remainder after dividing dividend by divisor',
        example: '=MOD(10, 3)'
    },
    {
        name: 'PI',
        signature: 'PI()',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Mathematical constant pi (approx 3.14159265)',
        example: '=PI()'
    },
    {
        name: 'E',
        signature: 'E()',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Euler constant e (approx 2.71828182)',
        example: '=E()'
    },
    {
        name: 'FACTORIAL',
        signature: 'FACTORIAL(n)',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Factorial n! = 1 * 2 * ... * n',
        example: '=FACTORIAL(5)'
    },
    {
        name: 'MEDIAN',
        signature: 'MEDIAN(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Median value of a dataset or range',
        example: '=MEDIAN(A1:A10)'
    },
    {
        name: 'STDEV',
        signature: 'STDEV(val1, [val2, ...])',
        category: 'Mathematics',
        icon: '📐',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'Sample standard deviation s = sqrt(sum((x-m)^2)/(n-1))',
        example: '=STDEV(A1:A10)'
    },

    // --- ⚛️ PHYSICS ---
    {
        name: 'KINEMATICS_V',
        signature: 'KINEMATICS_V(u, a, t)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Final velocity: v = u + at',
        example: '=KINEMATICS_V(0, 9.8, 3)'
    },
    {
        name: 'KINEMATICS_S',
        signature: 'KINEMATICS_S(u, a, t)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Displacement: s = ut + 0.5 * a * t^2',
        example: '=KINEMATICS_S(0, 9.8, 2)'
    },
    {
        name: 'KINEMATICS_V2',
        signature: 'KINEMATICS_V2(u, a, s)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Velocity from distance: v = sqrt(u^2 + 2as)',
        example: '=KINEMATICS_V2(0, 9.8, 20)'
    },
    {
        name: 'NEWTON_F',
        signature: 'NEWTON_F(m, a)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: "Newton's 2nd Law Force: F = m * a (Newtons)",
        example: '=NEWTON_F(10, 9.8)'
    },
    {
        name: 'WEIGHT',
        signature: 'WEIGHT(m, [g])',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Gravitational weight W = m * g (default g = 9.80665)',
        example: '=WEIGHT(70)'
    },
    {
        name: 'MOMENTUM',
        signature: 'MOMENTUM(m, v)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Linear momentum: p = m * v (kg m/s)',
        example: '=MOMENTUM(5, 12)'
    },
    {
        name: 'KINETIC_E',
        signature: 'KINETIC_E(m, v)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Kinetic energy: KE = 0.5 * m * v^2 (Joules)',
        example: '=KINETIC_E(2, 10)'
    },
    {
        name: 'POTENTIAL_E',
        signature: 'POTENTIAL_E(m, h, [g])',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Gravitational potential energy: PE = m * g * h',
        example: '=POTENTIAL_E(5, 10)'
    },
    {
        name: 'WORK',
        signature: 'WORK(f, d, [theta_deg])',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Mechanical work: W = F * d * cos(theta)',
        example: '=WORK(100, 5, 0)'
    },
    {
        name: 'POWER_P',
        signature: 'POWER_P(w, t)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Power: P = Work / time (Watts)',
        example: '=POWER_P(500, 10)'
    },
    {
        name: 'TORQUE',
        signature: 'TORQUE(f, r, [theta_deg])',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Rotational torque: tau = r * F * sin(theta) (N m)',
        example: '=TORQUE(50, 0.3)'
    },
    {
        name: 'CENTRIPETAL_A',
        signature: 'CENTRIPETAL_A(v, r)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Centripetal acceleration: a = v^2 / r',
        example: '=CENTRIPETAL_A(15, 20)'
    },
    {
        name: 'CENTRIPETAL_F',
        signature: 'CENTRIPETAL_F(m, v, r)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Centripetal force: Fc = m * v^2 / r',
        example: '=CENTRIPETAL_F(1000, 20, 50)'
    },
    {
        name: 'GRAVITY_F',
        signature: 'GRAVITY_F(m1, m2, r)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Universal gravity: F = G * m1 * m2 / r^2',
        example: '=GRAVITY_F(5.972e24, 70, 6.371e6)'
    },
    {
        name: 'SPRING_F',
        signature: 'SPRING_F(k, x)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: "Hooke's law spring force: F = k * x",
        example: '=SPRING_F(200, 0.05)'
    },
    {
        name: 'SPRING_PE',
        signature: 'SPRING_PE(k, x)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Elastic potential energy: PE = 0.5 * k * x^2',
        example: '=SPRING_PE(200, 0.05)'
    },
    {
        name: 'OHM_V',
        signature: 'OHM_V(i, r)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: "Ohm's Law Voltage: V = I * R (Volts)",
        example: '=OHM_V(2, 50)'
    },
    {
        name: 'OHM_I',
        signature: 'OHM_I(v, r)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: "Ohm's Law Current: I = V / R (Amperes)",
        example: '=OHM_I(12, 4)'
    },
    {
        name: 'OHM_R',
        signature: 'OHM_R(v, i)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: "Ohm's Law Resistance: R = V / I (Ohms)",
        example: '=OHM_R(120, 2)'
    },
    {
        name: 'ELEC_POWER',
        signature: 'ELEC_POWER(v, i)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Electrical power: P = V * I (Watts)',
        example: '=ELEC_POWER(120, 5)'
    },
    {
        name: 'RESISTORS_SERIES',
        signature: 'RESISTORS_SERIES(r1, r2, ...)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Total series resistance: R1 + R2 + ...',
        example: '=RESISTORS_SERIES(100, 220, 470)'
    },
    {
        name: 'RESISTORS_PARALLEL',
        signature: 'RESISTORS_PARALLEL(r1, r2, ...)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Total parallel resistance: 1 / (1/R1 + 1/R2 + ...)',
        example: '=RESISTORS_PARALLEL(100, 100)'
    },
    {
        name: 'CAPACITORS_SERIES',
        signature: 'CAPACITORS_SERIES(c1, c2, ...)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Total series capacitance: 1 / (1/C1 + 1/C2 + ...)',
        example: '=CAPACITORS_SERIES(10e-6, 10e-6)'
    },
    {
        name: 'CAPACITORS_PARALLEL',
        signature: 'CAPACITORS_PARALLEL(c1, c2, ...)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Total parallel capacitance: C1 + C2 + ...',
        example: '=CAPACITORS_PARALLEL(10e-6, 22e-6)'
    },
    {
        name: 'WAVELENGTH',
        signature: 'WAVELENGTH(v, f)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Wave equation: lambda = v / f (meters)',
        example: '=WAVELENGTH(343, 440)'
    },
    {
        name: 'FREQUENCY',
        signature: 'FREQUENCY(v, lambda)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Wave frequency: f = v / lambda (Hz)',
        example: '=FREQUENCY(3e8, 500e-9)'
    },
    {
        name: 'PERIOD',
        signature: 'PERIOD(f)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Wave period: T = 1 / f (seconds)',
        example: '=PERIOD(60)'
    },
    {
        name: 'DE_BROGLIE',
        signature: 'DE_BROGLIE(m, v)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'de Broglie wavelength: lambda = h / (m * v)',
        example: '=DE_BROGLIE(9.109e-31, 1e6)'
    },
    {
        name: 'PHOTON_E',
        signature: 'PHOTON_E(f)',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Photon energy: E = h * f (Joules)',
        example: '=PHOTON_E(5e14)'
    },
    {
        name: 'CONST_C',
        signature: 'CONST_C()',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Speed of light in vacuum c = 299,792,458 m/s',
        example: '=CONST_C()'
    },
    {
        name: 'CONST_G',
        signature: 'CONST_G()',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Newton gravitational constant G = 6.6743e-11',
        example: '=CONST_G()'
    },
    {
        name: 'CONST_H',
        signature: 'CONST_H()',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Planck constant h = 6.62607015e-34 J s',
        example: '=CONST_H()'
    },
    {
        name: 'CONST_KB',
        signature: 'CONST_KB()',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Boltzmann constant kB = 1.380649e-23 J/K',
        example: '=CONST_KB()'
    },
    {
        name: 'CONST_NA',
        signature: 'CONST_NA()',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Avogadro constant NA = 6.02214076e23 mol^-1',
        example: '=CONST_NA()'
    },
    {
        name: 'CONST_QE',
        signature: 'CONST_QE()',
        category: 'Physics',
        icon: '⚛️',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        description: 'Elementary charge e = 1.602176634e-19 C',
        example: '=CONST_QE()'
    },

    // --- 🧪 CHEMISTRY ---
    {
        name: 'MOLARITY',
        signature: 'MOLARITY(moles, liters)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Molar concentration: M = moles / liters (mol/L)',
        example: '=MOLARITY(0.5, 2)'
    },
    {
        name: 'MOLALITY',
        signature: 'MOLALITY(moles, kg_solvent)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Molal concentration: m = moles / kg_solvent',
        example: '=MOLALITY(0.2, 0.5)'
    },
    {
        name: 'MOLES',
        signature: 'MOLES(mass_g, molar_mass)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Chemical amount in moles: n = mass / molar_mass',
        example: '=MOLES(18, 18.015)'
    },
    {
        name: 'MASS_FROM_MOLES',
        signature: 'MASS_FROM_MOLES(moles, molar_mass)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Mass in grams: mass = moles * molar_mass',
        example: '=MASS_FROM_MOLES(2, 58.44)'
    },
    {
        name: 'DILUTION_C2',
        signature: 'DILUTION_C2(c1, v1, v2)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Final dilution concentration: C2 = (C1 * V1) / V2',
        example: '=DILUTION_C2(12, 0.05, 1)'
    },
    {
        name: 'DILUTION_V2',
        signature: 'DILUTION_V2(c1, v1, c2)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Required dilution volume: V2 = (C1 * V1) / C2',
        example: '=DILUTION_V2(6, 0.1, 1)'
    },
    {
        name: 'MASS_PERCENT',
        signature: 'MASS_PERCENT(solute_g, solution_g)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Mass percentage: (solute / solution) * 100%',
        example: '=MASS_PERCENT(5, 100)'
    },
    {
        name: 'PH',
        signature: 'PH(conc_h)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'pH value: pH = -log10([H+])',
        example: '=PH(1e-7)'
    },
    {
        name: 'POH',
        signature: 'POH(conc_oh)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'pOH value: pOH = -log10([OH-])',
        example: '=POH(1e-4)'
    },
    {
        name: 'H_FROM_PH',
        signature: 'H_FROM_PH(ph)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Hydrogen ion concentration: [H+] = 10^(-pH)',
        example: '=H_FROM_PH(7)'
    },
    {
        name: 'OH_FROM_POH',
        signature: 'OH_FROM_POH(poh)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Hydroxide concentration: [OH-] = 10^(-pOH)',
        example: '=OH_FROM_POH(4)'
    },
    {
        name: 'HENDERSON_HASSELBALCH',
        signature: 'HENDERSON_HASSELBALCH(pKa, base_conc, acid_conc)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Buffer equation: pH = pKa + log10([A-] / [HA])',
        example: '=HENDERSON_HASSELBALCH(4.76, 0.1, 0.1)'
    },
    {
        name: 'IDEAL_GAS_P',
        signature: 'IDEAL_GAS_P(n, t_kelvin, v_liters)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Ideal gas pressure: P = (n * R * T) / V (atm, R=0.08206)',
        example: '=IDEAL_GAS_P(1, 298.15, 22.4)'
    },
    {
        name: 'IDEAL_GAS_V',
        signature: 'IDEAL_GAS_V(n, t_kelvin, p_atm)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Ideal gas volume: V = (n * R * T) / P (Liters)',
        example: '=IDEAL_GAS_V(1, 273.15, 1)'
    },
    {
        name: 'IDEAL_GAS_N',
        signature: 'IDEAL_GAS_N(p_atm, v_liters, t_kelvin)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Ideal gas moles: n = (P * V) / (R * T)',
        example: '=IDEAL_GAS_N(1, 22.414, 273.15)'
    },
    {
        name: 'CELSIUS_TO_KELVIN',
        signature: 'CELSIUS_TO_KELVIN(c)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Converts temperature Celsius to Kelvin: K = C + 273.15',
        example: '=CELSIUS_TO_KELVIN(25)'
    },
    {
        name: 'KELVIN_TO_CELSIUS',
        signature: 'KELVIN_TO_CELSIUS(k)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Converts Kelvin to Celsius: C = K - 273.15',
        example: '=KELVIN_TO_CELSIUS(298.15)'
    },
    {
        name: 'ARRHENIUS',
        signature: 'ARRHENIUS(a, ea_joules, t_kelvin)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Rate constant: k = A * exp(-Ea / (R * T))',
        example: '=ARRHENIUS(1e13, 50000, 300)'
    },
    {
        name: 'HALF_LIFE',
        signature: 'HALF_LIFE(n0, t, t_half)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Radioactive/kinetic decay: N(t) = N0 * 0.5^(t / t_half)',
        example: '=HALF_LIFE(100, 5, 2.5)'
    },
    {
        name: 'BEER_LAMBERT_A',
        signature: 'BEER_LAMBERT_A(epsilon, c, l_cm)',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Absorbance: A = epsilon * c * l',
        example: '=BEER_LAMBERT_A(10000, 1e-4, 1)'
    },
    {
        name: 'CONST_R_GAS',
        signature: 'CONST_R_GAS()',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Gas constant R = 8.314462618 J/(mol K)',
        example: '=CONST_R_GAS()'
    },
    {
        name: 'CONST_R_ATM',
        signature: 'CONST_R_ATM()',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Gas constant R = 0.082057366 L atm / (mol K)',
        example: '=CONST_R_ATM()'
    },
    {
        name: 'CONST_FARADAY',
        signature: 'CONST_FARADAY()',
        category: 'Chemistry',
        icon: '🧪',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Faraday constant F = 96,485.33212 C/mol',
        example: '=CONST_FARADAY()'
    },

    // --- 🧬 BIOLOGY ---
    {
        name: 'BMI',
        signature: 'BMI(weight_kg, height_m)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Body Mass Index: weight / (height^2)',
        example: '=BMI(70, 1.75)'
    },
    {
        name: 'BMR_MALE',
        signature: 'BMR_MALE(weight_kg, height_cm, age_yrs)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Male Basal Metabolic Rate (Mifflin-St Jeor equation)',
        example: '=BMR_MALE(75, 180, 25)'
    },
    {
        name: 'BMR_FEMALE',
        signature: 'BMR_FEMALE(weight_kg, height_cm, age_yrs)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Female Basal Metabolic Rate (Mifflin-St Jeor equation)',
        example: '=BMR_FEMALE(65, 165, 25)'
    },
    {
        name: 'HARDY_WEINBERG_2PQ',
        signature: 'HARDY_WEINBERG_2PQ(p)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Heterozygous frequency: 2 * p * (1 - p)',
        example: '=HARDY_WEINBERG_2PQ(0.7)'
    },
    {
        name: 'HARDY_WEINBERG_Q2',
        signature: 'HARDY_WEINBERG_Q2(q)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Homozygous recessive frequency: q^2',
        example: '=HARDY_WEINBERG_Q2(0.3)'
    },
    {
        name: 'MICHAELIS_MENTEN',
        signature: 'MICHAELIS_MENTEN(vmax, substrate, km)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Enzyme kinetics: v = (Vmax * [S]) / (Km + [S])',
        example: '=MICHAELIS_MENTEN(100, 5, 2)'
    },
    {
        name: 'Q10',
        signature: 'Q10(r1, r2, t1, t2)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Temperature coefficient: Q10 = (R2 / R1)^(10 / (T2 - T1))',
        example: '=Q10(10, 20, 20, 30)'
    },
    {
        name: 'SURFACE_TO_VOLUME_CUBE',
        signature: 'SURFACE_TO_VOLUME_CUBE(side)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Surface-to-volume ratio of cubical cell: 6 / side',
        example: '=SURFACE_TO_VOLUME_CUBE(2)'
    },
    {
        name: 'SURFACE_TO_VOLUME_SPHERE',
        signature: 'SURFACE_TO_VOLUME_SPHERE(radius)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Surface-to-volume ratio of spherical cell: 3 / radius',
        example: '=SURFACE_TO_VOLUME_SPHERE(5)'
    },
    {
        name: 'MITOTIC_INDEX',
        signature: 'MITOTIC_INDEX(dividing_cells, total_cells)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Percentage of cells undergoing mitosis: (N_div / N_tot) * 100',
        example: '=MITOTIC_INDEX(15, 300)'
    },
    {
        name: 'DOUBLING_TIME',
        signature: 'DOUBLING_TIME(initial_n, final_n, hours)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Cell population doubling time: t * ln(2) / ln(Nf / Ni)',
        example: '=DOUBLING_TIME(1000, 8000, 6)'
    },
    {
        name: 'SERIAL_DILUTION',
        signature: 'SERIAL_DILUTION(start_conc, factor, steps)',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'Concentration after n serial dilutions: C0 * (1/factor)^steps',
        example: '=SERIAL_DILUTION(100, 10, 4)'
    },
    {
        name: 'SHANNON_WIENER',
        signature: 'SHANNON_WIENER(p1, [p2, ...])',
        category: 'Biology',
        icon: '🧬',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: "Shannon-Wiener biodiversity index H' = -sum(pi * ln(pi))",
        example: '=SHANNON_WIENER(0.4, 0.3, 0.2, 0.1)'
    }
];

// Helper to flatten array arguments (ranges, sub-arrays) and filter numeric values
const flattenNumbers = (args) => {
    const list = [];
    const walk = (item) => {
        if (Array.isArray(item)) {
            item.forEach(walk);
        } else if (item !== null && item !== undefined && item !== '') {
            const num = typeof item === 'number' ? item : parseFloat(item);
            if (!Number.isNaN(num)) list.push(num);
        }
    };
    args.forEach(walk);
    return list;
};

// 3. STEM Function Implementations
const STEM_FUNCTIONS = {
    // Math
    SUM: (...args) => {
        const nums = flattenNumbers(args);
        return nums.reduce((a, b) => a + b, 0);
    },
    AVERAGE: (...args) => {
        const nums = flattenNumbers(args);
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    },
    AVG: (...args) => STEM_FUNCTIONS.AVERAGE(...args),
    COUNT: (...args) => flattenNumbers(args).length,
    MIN: (...args) => {
        const nums = flattenNumbers(args);
        return nums.length ? Math.min(...nums) : 0;
    },
    MAX: (...args) => {
        const nums = flattenNumbers(args);
        return nums.length ? Math.max(...nums) : 0;
    },
    PRODUCT: (...args) => {
        const nums = flattenNumbers(args);
        return nums.length ? nums.reduce((a, b) => a * b, 1) : 0;
    },
    ABS: (x) => Math.abs(parseFloat(x) || 0),
    ROUND: (x, d = 0) => {
        const val = parseFloat(x) || 0;
        const decimals = parseInt(d, 10) || 0;
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
    },
    CEIL: (x) => Math.ceil(parseFloat(x) || 0),
    ROUNDUP: (x) => Math.ceil(parseFloat(x) || 0),
    FLOOR: (x) => Math.floor(parseFloat(x) || 0),
    ROUNDDOWN: (x) => Math.floor(parseFloat(x) || 0),
    SQRT: (x) => {
        const v = parseFloat(x) || 0;
        if (v < 0) throw new Error('#NUM!');
        return Math.sqrt(v);
    },
    POWER: (b, e) => Math.pow(parseFloat(b) || 0, parseFloat(e) || 0),
    POW: (b, e) => Math.pow(parseFloat(b) || 0, parseFloat(e) || 0),
    LOG: (x, b = 10) => {
        const val = parseFloat(x) || 0;
        const base = parseFloat(b) || 10;
        if (val <= 0 || base <= 0 || base === 1) throw new Error('#NUM!');
        return Math.log(val) / Math.log(base);
    },
    LN: (x) => {
        const val = parseFloat(x) || 0;
        if (val <= 0) throw new Error('#NUM!');
        return Math.log(val);
    },
    EXP: (x) => Math.exp(parseFloat(x) || 0),
    SIN: (x) => Math.sin(parseFloat(x) || 0),
    COS: (x) => Math.cos(parseFloat(x) || 0),
    TAN: (x) => Math.tan(parseFloat(x) || 0),
    ASIN: (x) => {
        const v = parseFloat(x) || 0;
        if (v < -1 || v > 1) throw new Error('#NUM!');
        return Math.asin(v);
    },
    ACOS: (x) => {
        const v = parseFloat(x) || 0;
        if (v < -1 || v > 1) throw new Error('#NUM!');
        return Math.acos(v);
    },
    ATAN: (x) => Math.atan(parseFloat(x) || 0),
    ATAN2: (y, x) => Math.atan2(parseFloat(y) || 0, parseFloat(x) || 0),
    DEGREES: (rad) => (parseFloat(rad) || 0) * (180 / Math.PI),
    RADIANS: (deg) => (parseFloat(deg) || 0) * (Math.PI / 180),
    MOD: (n, d) => {
        const div = parseFloat(d) || 0;
        if (div === 0) throw new Error('#DIV/0!');
        return (parseFloat(n) || 0) % div;
    },
    PI: () => Math.PI,
    E: () => Math.E,
    FACTORIAL: (n) => {
        const num = Math.floor(parseFloat(n) || 0);
        if (num < 0 || num > 170) throw new Error('#NUM!');
        let res = 1;
        for (let i = 2; i <= num; i++) res *= i;
        return res;
    },
    FACT: (n) => STEM_FUNCTIONS.FACTORIAL(n),
    MEDIAN: (...args) => {
        const nums = flattenNumbers(args).sort((a, b) => a - b);
        if (!nums.length) return 0;
        const mid = Math.floor(nums.length / 2);
        return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    },
    STDEV: (...args) => {
        const nums = flattenNumbers(args);
        if (nums.length < 2) return 0;
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length - 1);
        return Math.sqrt(variance);
    },

    // Physics
    KINEMATICS_V: (u, a, t) => (parseFloat(u) || 0) + (parseFloat(a) || 0) * (parseFloat(t) || 0),
    KINEMATICS_S: (u, a, t) => {
        const uVal = parseFloat(u) || 0;
        const aVal = parseFloat(a) || 0;
        const tVal = parseFloat(t) || 0;
        return uVal * tVal + 0.5 * aVal * Math.pow(tVal, 2);
    },
    KINEMATICS_V2: (u, a, s) => {
        const val = Math.pow(parseFloat(u) || 0, 2) + 2 * (parseFloat(a) || 0) * (parseFloat(s) || 0);
        if (val < 0) throw new Error('#NUM!');
        return Math.sqrt(val);
    },
    NEWTON_F: (m, a) => (parseFloat(m) || 0) * (parseFloat(a) || 0),
    WEIGHT: (m, g = 9.80665) => (parseFloat(m) || 0) * (parseFloat(g) || 9.80665),
    MOMENTUM: (m, v) => (parseFloat(m) || 0) * (parseFloat(v) || 0),
    KINETIC_E: (m, v) => 0.5 * (parseFloat(m) || 0) * Math.pow(parseFloat(v) || 0, 2),
    POTENTIAL_E: (m, h, g = 9.80665) => (parseFloat(m) || 0) * (parseFloat(g) || 9.80665) * (parseFloat(h) || 0),
    WORK: (f, d, thetaDeg = 0) => {
        const rad = (parseFloat(thetaDeg) || 0) * (Math.PI / 180);
        return (parseFloat(f) || 0) * (parseFloat(d) || 0) * Math.cos(rad);
    },
    POWER_P: (w, t) => {
        const tVal = parseFloat(t) || 0;
        if (tVal === 0) throw new Error('#DIV/0!');
        return (parseFloat(w) || 0) / tVal;
    },
    TORQUE: (f, r, thetaDeg = 90) => {
        const rad = (parseFloat(thetaDeg) || 90) * (Math.PI / 180);
        return (parseFloat(r) || 0) * (parseFloat(f) || 0) * Math.sin(rad);
    },
    CENTRIPETAL_A: (v, r) => {
        const rVal = parseFloat(r) || 0;
        if (rVal === 0) throw new Error('#DIV/0!');
        return Math.pow(parseFloat(v) || 0, 2) / rVal;
    },
    CENTRIPETAL_F: (m, v, r) => {
        const rVal = parseFloat(r) || 0;
        if (rVal === 0) throw new Error('#DIV/0!');
        return (parseFloat(m) || 0) * Math.pow(parseFloat(v) || 0, 2) / rVal;
    },
    GRAVITY_F: (m1, m2, r) => {
        const rVal = parseFloat(r) || 0;
        if (rVal === 0) throw new Error('#DIV/0!');
        const G = 6.67430e-11;
        return (G * (parseFloat(m1) || 0) * (parseFloat(m2) || 0)) / Math.pow(rVal, 2);
    },
    SPRING_F: (k, x) => (parseFloat(k) || 0) * (parseFloat(x) || 0),
    SPRING_PE: (k, x) => 0.5 * (parseFloat(k) || 0) * Math.pow(parseFloat(x) || 0, 2),
    OHM_V: (i, r) => (parseFloat(i) || 0) * (parseFloat(r) || 0),
    OHM_I: (v, r) => {
        const rVal = parseFloat(r) || 0;
        if (rVal === 0) throw new Error('#DIV/0!');
        return (parseFloat(v) || 0) / rVal;
    },
    OHM_R: (v, i) => {
        const iVal = parseFloat(i) || 0;
        if (iVal === 0) throw new Error('#DIV/0!');
        return (parseFloat(v) || 0) / iVal;
    },
    ELEC_POWER: (v, i) => (parseFloat(v) || 0) * (parseFloat(i) || 0),
    RESISTORS_SERIES: (...args) => STEM_FUNCTIONS.SUM(...args),
    RESISTORS_PARALLEL: (...args) => {
        const nums = flattenNumbers(args);
        if (!nums.length) return 0;
        let invSum = 0;
        for (const n of nums) {
            if (n === 0) throw new Error('#DIV/0!');
            invSum += 1 / n;
        }
        return invSum === 0 ? 0 : 1 / invSum;
    },
    CAPACITORS_SERIES: (...args) => STEM_FUNCTIONS.RESISTORS_PARALLEL(...args),
    CAPACITORS_PARALLEL: (...args) => STEM_FUNCTIONS.SUM(...args),
    WAVELENGTH: (v, f) => {
        const fVal = parseFloat(f) || 0;
        if (fVal === 0) throw new Error('#DIV/0!');
        return (parseFloat(v) || 0) / fVal;
    },
    FREQUENCY: (v, lambda) => {
        const lVal = parseFloat(lambda) || 0;
        if (lVal === 0) throw new Error('#DIV/0!');
        return (parseFloat(v) || 0) / lVal;
    },
    PERIOD: (f) => {
        const fVal = parseFloat(f) || 0;
        if (fVal === 0) throw new Error('#DIV/0!');
        return 1 / fVal;
    },
    DE_BROGLIE: (m, v) => {
        const denom = (parseFloat(m) || 0) * (parseFloat(v) || 0);
        if (denom === 0) throw new Error('#DIV/0!');
        return 6.62607015e-34 / denom;
    },
    PHOTON_E: (f) => 6.62607015e-34 * (parseFloat(f) || 0),
    CONST_C: () => 299792458,
    CONST_G: () => 6.67430e-11,
    CONST_H: () => 6.62607015e-34,
    CONST_KB: () => 1.380649e-23,
    CONST_NA: () => 6.02214076e23,
    CONST_QE: () => 1.602176634e-19,

    // Chemistry
    MOLARITY: (moles, liters) => {
        const l = parseFloat(liters) || 0;
        if (l === 0) throw new Error('#DIV/0!');
        return (parseFloat(moles) || 0) / l;
    },
    MOLALITY: (moles, kgSolvent) => {
        const kg = parseFloat(kgSolvent) || 0;
        if (kg === 0) throw new Error('#DIV/0!');
        return (parseFloat(moles) || 0) / kg;
    },
    MOLES: (massG, molarMass) => {
        const mm = parseFloat(molarMass) || 0;
        if (mm === 0) throw new Error('#DIV/0!');
        return (parseFloat(massG) || 0) / mm;
    },
    MASS_FROM_MOLES: (moles, molarMass) => (parseFloat(moles) || 0) * (parseFloat(molarMass) || 0),
    DILUTION_C2: (c1, v1, v2) => {
        const v2Val = parseFloat(v2) || 0;
        if (v2Val === 0) throw new Error('#DIV/0!');
        return ((parseFloat(c1) || 0) * (parseFloat(v1) || 0)) / v2Val;
    },
    DILUTION_V2: (c1, v1, c2) => {
        const c2Val = parseFloat(c2) || 0;
        if (c2Val === 0) throw new Error('#DIV/0!');
        return ((parseFloat(c1) || 0) * (parseFloat(v1) || 0)) / c2Val;
    },
    MASS_PERCENT: (solute, solution) => {
        const sol = parseFloat(solution) || 0;
        if (sol === 0) throw new Error('#DIV/0!');
        return ((parseFloat(solute) || 0) / sol) * 100;
    },
    PH: (concH) => {
        const h = parseFloat(concH) || 0;
        if (h <= 0) throw new Error('#NUM!');
        return -Math.log10(h);
    },
    POH: (concOH) => {
        const oh = parseFloat(concOH) || 0;
        if (oh <= 0) throw new Error('#NUM!');
        return -Math.log10(oh);
    },
    H_FROM_PH: (ph) => Math.pow(10, -(parseFloat(ph) || 0)),
    OH_FROM_POH: (poh) => Math.pow(10, -(parseFloat(poh) || 0)),
    HENDERSON_HASSELBALCH: (pKa, baseConc, acidConc) => {
        const acid = parseFloat(acidConc) || 0;
        const base = parseFloat(baseConc) || 0;
        if (acid <= 0 || base <= 0) throw new Error('#NUM!');
        return (parseFloat(pKa) || 0) + Math.log10(base / acid);
    },
    IDEAL_GAS_P: (n, tKelvin, vLiters) => {
        const v = parseFloat(vLiters) || 0;
        if (v === 0) throw new Error('#DIV/0!');
        const R = 0.082057366;
        return ((parseFloat(n) || 0) * R * (parseFloat(tKelvin) || 0)) / v;
    },
    IDEAL_GAS_V: (n, tKelvin, pAtm) => {
        const p = parseFloat(pAtm) || 0;
        if (p === 0) throw new Error('#DIV/0!');
        const R = 0.082057366;
        return ((parseFloat(n) || 0) * R * (parseFloat(tKelvin) || 0)) / p;
    },
    IDEAL_GAS_N: (pAtm, vLiters, tKelvin) => {
        const denom = 0.082057366 * (parseFloat(tKelvin) || 0);
        if (denom === 0) throw new Error('#DIV/0!');
        return ((parseFloat(pAtm) || 0) * (parseFloat(vLiters) || 0)) / denom;
    },
    CELSIUS_TO_KELVIN: (c) => (parseFloat(c) || 0) + 273.15,
    KELVIN_TO_CELSIUS: (k) => (parseFloat(k) || 0) - 273.15,
    ARRHENIUS: (a, eaJoules, tKelvin) => {
        const t = parseFloat(tKelvin) || 0;
        if (t === 0) throw new Error('#DIV/0!');
        const R = 8.314462618;
        return (parseFloat(a) || 0) * Math.exp(-(parseFloat(eaJoules) || 0) / (R * t));
    },
    HALF_LIFE: (n0, t, tHalf) => {
        const th = parseFloat(tHalf) || 0;
        if (th === 0) throw new Error('#DIV/0!');
        return (parseFloat(n0) || 0) * Math.pow(0.5, (parseFloat(t) || 0) / th);
    },
    BEER_LAMBERT_A: (epsilon, c, lCm) => (parseFloat(epsilon) || 0) * (parseFloat(c) || 0) * (parseFloat(lCm) || 0),
    CONST_R_GAS: () => 8.314462618,
    CONST_R_ATM: () => 0.082057366,
    CONST_FARADAY: () => 96485.33212,

    // Biology
    BMI: (weightKg, heightM) => {
        const h = parseFloat(heightM) || 0;
        if (h === 0) throw new Error('#DIV/0!');
        return (parseFloat(weightKg) || 0) / Math.pow(h, 2);
    },
    BMR_MALE: (weightKg, heightCm, ageYrs) => {
        const w = parseFloat(weightKg) || 0;
        const h = parseFloat(heightCm) || 0;
        const a = parseFloat(ageYrs) || 0;
        return 10 * w + 6.25 * h - 5 * a + 5;
    },
    BMR_FEMALE: (weightKg, heightCm, ageYrs) => {
        const w = parseFloat(weightKg) || 0;
        const h = parseFloat(heightCm) || 0;
        const a = parseFloat(ageYrs) || 0;
        return 10 * w + 6.25 * h - 5 * a - 161;
    },
    HARDY_WEINBERG_2PQ: (p) => {
        const pVal = parseFloat(p) || 0;
        return 2 * pVal * (1 - pVal);
    },
    HARDY_WEINBERG_Q2: (q) => Math.pow(parseFloat(q) || 0, 2),
    MICHAELIS_MENTEN: (vmax, substrate, km) => {
        const s = parseFloat(substrate) || 0;
        const denom = (parseFloat(km) || 0) + s;
        if (denom === 0) throw new Error('#DIV/0!');
        return ((parseFloat(vmax) || 0) * s) / denom;
    },
    Q10: (r1, r2, t1, t2) => {
        const r1Val = parseFloat(r1) || 0;
        const dt = (parseFloat(t2) || 0) - (parseFloat(t1) || 0);
        if (r1Val === 0 || dt === 0) throw new Error('#DIV/0!');
        return Math.pow((parseFloat(r2) || 0) / r1Val, 10 / dt);
    },
    SURFACE_TO_VOLUME_CUBE: (side) => {
        const s = parseFloat(side) || 0;
        if (s === 0) throw new Error('#DIV/0!');
        return 6 / s;
    },
    SURFACE_TO_VOLUME_SPHERE: (radius) => {
        const r = parseFloat(radius) || 0;
        if (r === 0) throw new Error('#DIV/0!');
        return 3 / r;
    },
    MITOTIC_INDEX: (dividingCells, totalCells) => {
        const tot = parseFloat(totalCells) || 0;
        if (tot === 0) throw new Error('#DIV/0!');
        return ((parseFloat(dividingCells) || 0) / tot) * 100;
    },
    DOUBLING_TIME: (initN, finalN, hours) => {
        const ni = parseFloat(initN) || 0;
        const nf = parseFloat(finalN) || 0;
        if (ni <= 0 || nf <= 0) throw new Error('#NUM!');
        const denom = Math.log(nf / ni);
        if (denom === 0) throw new Error('#DIV/0!');
        return ((parseFloat(hours) || 0) * Math.log(2)) / denom;
    },
    SERIAL_DILUTION: (startConc, factor, steps) => {
        const f = parseFloat(factor) || 0;
        if (f === 0) throw new Error('#DIV/0!');
        return (parseFloat(startConc) || 0) * Math.pow(1 / f, parseFloat(steps) || 0);
    },
    SHANNON_WIENER: (...args) => {
        const nums = flattenNumbers(args);
        if (!nums.length) return 0;
        const sum = nums.reduce((a, b) => a + b, 0);
        if (sum === 0) return 0;
        let h = 0;
        for (const n of nums) {
            const p = n / sum;
            if (p > 0) h -= p * Math.log(p);
        }
        return h;
    }
};

// 4. Recursive Formula Expression Parser
export class FormulaEvaluator {
    constructor(cells = {}, rows = 100, cols = 50, visited = new Set()) {
        this.cells = cells;
        this.rows = rows;
        this.cols = cols;
        this.visited = visited;
    }

    getCellValue(r, c) {
        const key = `${r}-${c}`;
        if (this.visited.has(key)) {
            throw new Error('#CIRCULAR!');
        }
        const cell = this.cells[key];
        if (!cell || cell.text === undefined || cell.text === null) return 0;
        const rawText = String(cell.text).trim();
        if (!rawText) return 0;

        if (rawText.startsWith('=')) {
            const nextVisited = new Set(this.visited);
            nextVisited.add(key);
            const nestedEvaluator = new FormulaEvaluator(this.cells, this.rows, this.cols, nextVisited);
            return nestedEvaluator.evaluate(rawText);
        }

        const num = parseFloat(rawText.replace(/,/g, ''));
        return Number.isNaN(num) ? rawText : num;
    }

    expandRange(startAddr, endAddr) {
        const start = parseCellAddress(startAddr);
        const end = parseCellAddress(endAddr);
        if (!start || !end) return [];

        const minR = Math.min(start.row, end.row);
        const maxR = Math.max(start.row, end.row);
        const minC = Math.min(start.col, end.col);
        const maxC = Math.max(start.col, end.col);

        const values = [];
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                values.push(this.getCellValue(r, c));
            }
        }
        return values;
    }

    tokenize(formulaStr) {
        let text = formulaStr.trim();
        if (text.startsWith('=')) text = text.substring(1).trim();

        const tokens = [];
        let i = 0;
        while (i < text.length) {
            const ch = text[i];
            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            // Cell Range: A1:B10
            const rangeMatch = text.slice(i).match(/^([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)/);
            if (rangeMatch) {
                tokens.push({ type: 'RANGE', start: rangeMatch[1].toUpperCase(), end: rangeMatch[2].toUpperCase() });
                i += rangeMatch[0].length;
                continue;
            }

            // Function call or cell reference
            const identMatch = text.slice(i).match(/^([A-Za-z_][A-Za-z0-9_]*)/);
            if (identMatch) {
                const ident = identMatch[1];
                i += ident.length;
                // Peek ahead for opening parenthesis -> Function call
                let j = i;
                while (j < text.length && /\s/.test(text[j])) j++;
                if (j < text.length && text[j] === '(') {
                    tokens.push({ type: 'FUNC', name: ident.toUpperCase() });
                } else {
                    // Check if identifier is a single cell reference (e.g. A1, B2)
                    const cellAddr = parseCellAddress(ident);
                    if (cellAddr) {
                        tokens.push({ type: 'CELL', col: cellAddr.col, row: cellAddr.row });
                    } else if (STEM_FUNCTIONS[ident.toUpperCase()]) {
                        // Parameter-less constant function called without () (e.g. =PI or =CONST_C)
                        tokens.push({ type: 'FUNC', name: ident.toUpperCase() });
                    } else {
                        tokens.push({ type: 'IDENT', name: ident.toUpperCase() });
                    }
                }
                continue;
            }

            // Number (including scientific notation like 1.5e-3)
            const numMatch = text.slice(i).match(/^(\d+(\.\d+)?([eE][+-]?\d+)?)/);
            if (numMatch) {
                tokens.push({ type: 'NUMBER', value: parseFloat(numMatch[0]) });
                i += numMatch[0].length;
                continue;
            }

            // String in quotes "hello" or 'hello'
            if (ch === '"' || ch === "'") {
                const quote = ch;
                let str = '';
                i++;
                while (i < text.length && text[i] !== quote) {
                    str += text[i];
                    i++;
                }
                i++; // skip closing quote
                tokens.push({ type: 'STRING', value: str });
                continue;
            }

            // Operators & Parentheses
            if ('+-*/^%,()'.includes(ch)) {
                tokens.push({ type: 'OP', value: ch });
                i++;
                continue;
            }

            // Unknown character, skip
            i++;
        }
        return tokens;
    }

    evaluate(formulaStr) {
        if (!formulaStr || !String(formulaStr).startsWith('=')) {
            return formulaStr;
        }

        try {
            const tokens = this.tokenize(formulaStr);
            if (!tokens.length) return '';
            let cursor = 0;

            const peek = () => tokens[cursor];
            const consume = (expectedVal = null) => {
                const tok = tokens[cursor];
                if (!tok) return null;
                if (expectedVal !== null && tok.value !== expectedVal && tok.type !== expectedVal) {
                    throw new Error('#SYNTAX!');
                }
                cursor++;
                return tok;
            };

            const isError = (v) => typeof v === 'string' && v.startsWith('#');

            // Expression -> Term ((+ | -) Term)*
            const parseExpression = () => {
                let left = parseTerm();
                if (isError(left)) return left;
                while (cursor < tokens.length) {
                    const tok = peek();
                    if (tok?.type === 'OP' && (tok.value === '+' || tok.value === '-')) {
                        consume();
                        const right = parseTerm();
                        if (isError(right)) return right;
                        left = tok.value === '+' 
                            ? (parseFloat(left) || 0) + (parseFloat(right) || 0)
                            : (parseFloat(left) || 0) - (parseFloat(right) || 0);
                    } else {
                        break;
                    }
                }
                return left;
            };

            // Term -> Power ((* | / | %) Power)*
            const parseTerm = () => {
                let left = parsePower();
                if (isError(left)) return left;
                while (cursor < tokens.length) {
                    const tok = peek();
                    if (tok?.type === 'OP' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
                        consume();
                        const right = parsePower();
                        if (isError(right)) return right;
                        if (tok.value === '*') {
                            left = (parseFloat(left) || 0) * (parseFloat(right) || 0);
                        } else if (tok.value === '/') {
                            const rVal = parseFloat(right) || 0;
                            if (rVal === 0) throw new Error('#DIV/0!');
                            left = (parseFloat(left) || 0) / rVal;
                        } else if (tok.value === '%') {
                            const rVal = parseFloat(right) || 0;
                            if (rVal === 0) throw new Error('#DIV/0!');
                            left = (parseFloat(left) || 0) % rVal;
                        }
                    } else {
                        break;
                    }
                }
                return left;
            };

            // Power -> Unary (^ Unary)*
            const parsePower = () => {
                let left = parseUnary();
                if (isError(left)) return left;
                while (cursor < tokens.length) {
                    const tok = peek();
                    if (tok?.type === 'OP' && tok.value === '^') {
                        consume();
                        const right = parseUnary();
                        if (isError(right)) return right;
                        left = Math.pow(parseFloat(left) || 0, parseFloat(right) || 0);
                    } else {
                        break;
                    }
                }
                return left;
            };

            // Unary -> (+ | -) Unary | Primary
            const parseUnary = () => {
                const tok = peek();
                if (tok?.type === 'OP' && (tok.value === '+' || tok.value === '-')) {
                    consume();
                    const val = parseUnary();
                    if (isError(val)) return val;
                    return tok.value === '-' ? -(parseFloat(val) || 0) : +(parseFloat(val) || 0);
                }
                return parsePrimary();
            };

            // Primary -> NUMBER | STRING | CELL | RANGE | FUNC(...) | (Expr)
            const parsePrimary = () => {
                const tok = peek();
                if (!tok) throw new Error('#VALUE!');

                if (tok.type === 'NUMBER') {
                    consume();
                    return tok.value;
                }

                if (tok.type === 'STRING') {
                    consume();
                    return tok.value;
                }

                if (tok.type === 'CELL') {
                    consume();
                    return this.getCellValue(tok.row, tok.col);
                }

                if (tok.type === 'RANGE') {
                    consume();
                    return this.expandRange(tok.start, tok.end);
                }

                if (tok.type === 'FUNC') {
                    const funcName = tok.name;
                    consume();
                    const args = [];
                    if (peek()?.type === 'OP' && peek()?.value === '(') {
                        consume('(');
                        if (!(peek()?.type === 'OP' && peek()?.value === ')')) {
                            while (cursor < tokens.length) {
                                args.push(parseExpression());
                                const nextTok = peek();
                                if (nextTok?.type === 'OP' && nextTok.value === ',') {
                                    consume(',');
                                } else if (nextTok?.type === 'OP' && nextTok.value === ')') {
                                    break;
                                } else {
                                    break;
                                }
                            }
                        }
                        consume(')');
                    }

                    const fn = STEM_FUNCTIONS[funcName];
                    if (!fn) throw new Error('#NAME?');
                    return fn(...args);
                }

                if (tok.type === 'OP' && tok.value === '(') {
                    consume('(');
                    const exprVal = parseExpression();
                    consume(')');
                    return exprVal;
                }

                throw new Error('#SYNTAX!');
            };

            const result = parseExpression();

            // Format numeric results neatly
            if (typeof result === 'number') {
                if (Number.isNaN(result)) return '#NUM!';
                if (!Number.isFinite(result)) return result > 0 ? '#INF!' : '#-INF!';
                // Round to at most 6 decimal places to avoid floating point noise (e.g. 0.30000000000000004)
                const rounded = Math.round(result * 1e8) / 1e8;
                return rounded;
            }

            return result;
        } catch (err) {
            return err?.message || '#ERROR!';
        }
    }
}

/**
 * Convenience evaluator for a cell's formula in the context of table cells
 */
export const evaluateCellFormula = (formulaText, cells = {}, rows = 100, cols = 50, currentCellKey = null) => {
    if (!formulaText || !String(formulaText).startsWith('=')) {
        return formulaText;
    }
    const initialVisited = new Set();
    if (currentCellKey) initialVisited.add(currentCellKey);
    const evaluator = new FormulaEvaluator(cells, rows, cols, initialVisited);
    return evaluator.evaluate(formulaText);
};

/**
 * Searches the STEM function catalog based on cell input text
 */
export const searchStemFunctions = (input = '', category = null, limit = 8) => {
    let clean = (input || '').trim();
    if (clean.startsWith('=')) clean = clean.substring(1).trim();

    // Extract the active word / function token being typed
    const lastTokenMatch = clean.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
    const token = lastTokenMatch ? lastTokenMatch[1].toUpperCase() : '';

    let items = STEM_FUNCTIONS_CATALOG;
    if (category) {
        items = items.filter(fn => fn.category.toLowerCase() === category.toLowerCase());
    }

    if (!token) {
        // Return top curated STEM functions
        return items.slice(0, limit);
    }

    const startsWith = [];
    const includes = [];
    const descMatches = [];

    for (const fn of items) {
        const nameUpper = fn.name.toUpperCase();
        if (nameUpper === token) {
            startsWith.unshift(fn);
        } else if (nameUpper.startsWith(token)) {
            startsWith.push(fn);
        } else if (nameUpper.includes(token)) {
            includes.push(fn);
        } else if (fn.description.toLowerCase().includes(token.toLowerCase())) {
            descMatches.push(fn);
        }
    }

    return [...startsWith, ...includes, ...descMatches].slice(0, limit);
};
