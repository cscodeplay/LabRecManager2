/**
 * vectorConventions.js
 * Physics Display Conventions, Vector Notation, and Physical Constants
 * Standardized for CBSE / NCERT / State Boards / JEE / NEET Class XI & XII Physics.
 */

// Standard Physical Constants (CODATA Recommended Values with SI Units)
export const PHYSICAL_CONSTANTS = {
    g: {
        symbol: 'g',
        name: 'Acceleration due to gravity (Earth surface)',
        value: 9.80665,
        displayValue: '9.8 \\text{ m/s}^2',
        latex: 'g = 9.8\\text{ m/s}^2',
        unit: '\\text{m/s}^2',
        dimension: '[M^0 L^1 T^{-2}]'
    },
    G: {
        symbol: 'G',
        name: 'Universal Gravitational Constant',
        value: 6.67430e-11,
        displayValue: '6.674 \\times 10^{-11} \\text{ N}\\cdot\\text{m}^2/\\text{kg}^2',
        latex: 'G = 6.674 \\times 10^{-11}\\text{ N}\\cdot\\text{m}^2/\\text{kg}^2',
        unit: '\\text{N}\\cdot\\text{m}^2/\\text{kg}^2',
        dimension: '[M^{-1} L^3 T^{-2}]'
    },
    c: {
        symbol: 'c',
        name: 'Speed of light in vacuum',
        value: 299792458,
        displayValue: '3.0 \\times 10^8 \\text{ m/s}',
        latex: 'c = 3.0 \\times 10^8\\text{ m/s}',
        unit: '\\text{m/s}',
        dimension: '[M^0 L^1 T^{-1}]'
    },
    e: {
        symbol: 'e',
        name: 'Elementary charge',
        value: 1.602176634e-19,
        displayValue: '1.602 \\times 10^{-19} \\text{ C}',
        latex: 'e = 1.602 \\times 10^{-19}\\text{ C}',
        unit: '\\text{C}',
        dimension: '[M^0 L^0 T^1 A^1]'
    },
    eps0: {
        symbol: '\\varepsilon_0',
        name: 'Permittivity of free space (Vacuum Permittivity)',
        value: 8.8541878128e-12,
        displayValue: '8.854 \\times 10^{-12} \\text{ F/m}',
        latex: '\\varepsilon_0 = 8.854 \\times 10^{-12}\\text{ F/m}',
        unit: '\\text{F/m}',
        dimension: '[M^{-1} L^{-3} T^4 A^2]'
    },
    k_e: {
        symbol: '\\frac{1}{4\\pi\\varepsilon_0}',
        name: 'Coulomb Constant',
        value: 8.9875517923e9,
        displayValue: '9.0 \\times 10^9 \\text{ N}\\cdot\\text{m}^2/\\text{C}^2',
        latex: '\\frac{1}{4\\pi\\varepsilon_0} = 9.0 \\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2',
        unit: '\\text{N}\\cdot\\text{m}^2/\\text{C}^2',
        dimension: '[M^1 L^3 T^{-4} A^{-2}]'
    },
    mu0: {
        symbol: '\\mu_0',
        name: 'Permeability of free space (Vacuum Permeability)',
        value: 1.25663706212e-6,
        displayValue: '4\\pi \\times 10^{-7} \\text{ T}\\cdot\\text{m/A}',
        latex: '\\mu_0 = 4\\pi \\times 10^{-7}\\text{ T}\\cdot\\text{m/A}',
        unit: '\\text{T}\\cdot\\text{m/A}',
        dimension: '[M^1 L^1 T^{-2} A^{-2}]'
    },
    h: {
        symbol: 'h',
        name: 'Planck Constant',
        value: 6.62607015e-34,
        displayValue: '6.626 \\times 10^{-34} \\text{ J}\\cdot\\text{s}',
        latex: 'h = 6.626 \\times 10^{-34}\\text{ J}\\cdot\\text{s}',
        unit: '\\text{J}\\cdot\\text{s}',
        dimension: '[M^1 L^2 T^{-1}]'
    },
    hbar: {
        symbol: '\\hbar',
        name: 'Reduced Planck Constant (h / 2pi)',
        value: 1.054571817e-34,
        displayValue: '1.055 \\times 10^{-34} \\text{ J}\\cdot\\text{s}',
        latex: '\\hbar = 1.055 \\times 10^{-34}\\text{ J}\\cdot\\text{s}',
        unit: '\\text{J}\\cdot\\text{s}',
        dimension: '[M^1 L^2 T^{-1}]'
    },
    kB: {
        symbol: 'k_B',
        name: 'Boltzmann Constant',
        value: 1.380649e-23,
        displayValue: '1.381 \\times 10^{-23} \\text{ J/K}',
        latex: 'k_B = 1.381 \\times 10^{-23}\\text{ J/K}',
        unit: '\\text{J/K}',
        dimension: '[M^1 L^2 T^{-2} K^{-1}]'
    },
    R: {
        symbol: 'R',
        name: 'Universal Gas Constant',
        value: 8.314462618,
        displayValue: '8.314 \\text{ J/(mol}\\cdot\\text{K)}',
        latex: 'R = 8.314\\text{ J/(mol}\\cdot\\text{K)}',
        unit: '\\text{J/(mol}\\cdot\\text{K)}',
        dimension: '[M^1 L^2 T^{-2} K^{-1} \\text{mol}^{-1}]'
    },
    NA: {
        symbol: 'N_A',
        name: 'Avogadro Constant',
        value: 6.02214076e23,
        displayValue: '6.022 \\times 10^{23} \\text{ mol}^{-1}',
        latex: 'N_A = 6.022 \\times 10^{23}\\text{ mol}^{-1}',
        unit: '\\text{mol}^{-1}',
        dimension: '[\\text{mol}^{-1}]'
    },
    sigma: {
        symbol: '\\sigma',
        name: 'Stefan-Boltzmann Constant',
        value: 5.670374419e-8,
        displayValue: '5.670 \\times 10^{-8} \\text{ W/(m}^2\\cdot\\text{K}^4\\text{)}',
        latex: '\\sigma = 5.670 \\times 10^{-8}\\text{ W/(m}^2\\cdot\\text{K}^4\\text{)}',
        unit: '\\text{W/(m}^2\\cdot\\text{K}^4\\text{)}',
        dimension: '[M^1 L^0 T^{-3} K^{-4}]'
    },
    me: {
        symbol: 'm_e',
        name: 'Electron Rest Mass',
        value: 9.1093837e-31,
        displayValue: '9.109 \\times 10^{-31} \\text{ kg}',
        latex: 'm_e = 9.109 \\times 10^{-31}\\text{ kg}',
        unit: '\\text{kg}',
        dimension: '[M^1]'
    },
    mp: {
        symbol: 'm_p',
        name: 'Proton Rest Mass',
        value: 1.67262192e-27,
        displayValue: '1.673 \\times 10^{-27} \\text{ kg}',
        latex: 'm_p = 1.673 \\times 10^{-27}\\text{ kg}',
        unit: '\\text{kg}',
        dimension: '[M^1]'
    },
    mn: {
        symbol: 'm_n',
        name: 'Neutron Rest Mass',
        value: 1.674927498e-27,
        displayValue: '1.675 \\times 10^{-27} \\text{ kg}',
        latex: 'm_n = 1.675 \\times 10^{-27}\\text{ kg}',
        unit: '\\text{kg}',
        dimension: '[M^1]'
    },
    R_H: {
        symbol: 'R_\\infty',
        name: 'Rydberg Constant',
        value: 1.0973731568e7,
        displayValue: '1.097 \\times 10^7 \\text{ m}^{-1}',
        latex: 'R_\\infty = 1.097 \\times 10^7\\text{ m}^{-1}',
        unit: '\\text{m}^{-1}',
        dimension: '[L^{-1}]'
    }
};

/**
 * Format a 2D or 3D vector into standard LaTeX notation with unit vectors (\hat{i}, \hat{j}, \hat{k})
 * @param {Array<number>} components - [x, y, z] or [x, y]
 * @param {string} vectorName - Name of the vector (e.g. 'F', 'v', 'a', 'p', 'E', 'B', 'r')
 * @returns {string} LaTeX string, e.g. "\vec{v} = 10\hat{i} - 5\hat{j} + 2\hat{k}"
 */
export function formatVectorLatex(components, vectorName = 'A') {
    if (!Array.isArray(components) || components.length === 0) return `\\vec{${vectorName}} = \\vec{0}`;

    const [x = 0, y = 0, z = 0] = components;
    const roundComp = (val) => {
        const num = Number(val);
        if (isNaN(num)) return '0';
        return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
    };

    const parts = [];

    // X Component (\hat{i})
    if (Math.abs(x) > 1e-6 || (Math.abs(y) <= 1e-6 && Math.abs(z) <= 1e-6)) {
        const xStr = roundComp(x);
        if (xStr === '1') parts.push('\\hat{i}');
        else if (xStr === '-1') parts.push('-\\hat{i}');
        else parts.push(`${xStr}\\hat{i}`);
    }

    // Y Component (\hat{j})
    if (Math.abs(y) > 1e-6) {
        const yStr = roundComp(Math.abs(y));
        const sign = y >= 0 ? (parts.length > 0 ? '+ ' : '') : '- ';
        if (yStr === '1') parts.push(`${sign}\\hat{j}`);
        else parts.push(`${sign}${yStr}\\hat{j}`);
    }

    // Z Component (\hat{k})
    if (components.length > 2 && Math.abs(z) > 1e-6) {
        const zStr = roundComp(Math.abs(z));
        const sign = z >= 0 ? (parts.length > 0 ? '+ ' : '') : '- ';
        if (zStr === '1') parts.push(`${sign}\\hat{k}`);
        else parts.push(`${sign}${zStr}\\hat{k}`);
    }

    const compExpr = parts.join(' ') || '\\vec{0}';
    return `\\vec{${vectorName}} = ${compExpr}`;
}

/**
 * Compute vector magnitude and its LaTeX representation
 */
export function formatVectorMagnitudeLatex(components, vectorName = 'A') {
    const x = Number(components[0]) || 0;
    const y = Number(components[1]) || 0;
    const z = Number(components[2]) || 0;
    const mag = Math.hypot(x, y, z);
    const roundMag = Number.isInteger(mag) ? String(mag) : mag.toFixed(2).replace(/\.?0+$/, '');

    return `|\\vec{${vectorName}}| = ${roundMag}`;
}

/**
 * Format Dot Product \vec{A} \cdot \vec{B} = AB \cos\theta
 */
export function formatDotProductLatex(vecA, vecB, nameA = 'A', nameB = 'B') {
    const ax = Number(vecA[0]) || 0, ay = Number(vecA[1]) || 0, az = Number(vecA[2]) || 0;
    const bx = Number(vecB[0]) || 0, by = Number(vecB[1]) || 0, bz = Number(vecB[2]) || 0;
    const dot = ax * bx + ay * by + az * bz;
    const magA = Math.hypot(ax, ay, az);
    const magB = Math.hypot(bx, by, bz);
    const cosTheta = (magA * magB > 1e-7) ? (dot / (magA * magB)) : 0;
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
    const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);

    const roundDot = Number.isInteger(dot) ? String(dot) : dot.toFixed(2).replace(/\.?0+$/, '');

    return {
        formula: `\\vec{${nameA}} \\cdot \\vec{${nameB}} = ${roundDot}`,
        angle: `\\theta = ${angleDeg}^\\circ`,
        dotValue: dot,
        angleDeg: Number(angleDeg)
    };
}

/**
 * Format Cross Product \vec{A} \times \vec{B}
 */
export function formatCrossProductLatex(vecA, vecB, nameA = 'A', nameB = 'B') {
    const ax = Number(vecA[0]) || 0, ay = Number(vecA[1]) || 0, az = Number(vecA[2]) || 0;
    const bx = Number(vecB[0]) || 0, by = Number(vecB[1]) || 0, bz = Number(vecB[2]) || 0;

    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    const crossComp = [cx, cy, cz];
    const crossLatex = formatVectorLatex(crossComp, `${nameA} \\times \\vec{${nameB}}`);
    const magC = Math.hypot(cx, cy, cz);

    return {
        components: crossComp,
        latex: crossLatex,
        magnitude: Number(magC.toFixed(2))
    };
}

/**
 * Standard Physics Chapters Directory for Class XI & XII
 */
export const PHYSICS_CHAPTERS = [
    // ─── CLASS XI ───────────────────────────────────────────
    {
        id: 'xi_units',
        class: 11,
        title: 'Units & Measurements',
        icon: 'Ruler',
        simType: 'dimensions_error',
        description: 'Dimensional analysis, SI base units, and error propagation.'
    },
    {
        id: 'xi_kinematics_1d',
        class: 11,
        title: 'Motion in a Straight Line',
        icon: 'MoveHorizontal',
        simType: 'kinematics_1d',
        description: '1D kinematics equations, velocity-time and displacement-time curves.'
    },
    {
        id: 'xi_projectile',
        class: 11,
        title: 'Motion in a Plane (Projectiles & Vectors)',
        icon: 'TrendingUp',
        simType: 'projectile',
        description: '2D parabolic trajectories, velocity resolution, range, max height, and vector addition.'
    },
    {
        id: 'xi_laws_of_motion',
        class: 11,
        title: 'Laws of Motion & Friction',
        icon: 'Layers',
        simType: 'inclined_plane',
        description: "Newton's laws, Free Body Diagrams (FBD), inclined planes with friction, and pulleys."
    },
    {
        id: 'xi_work_energy',
        class: 11,
        title: 'Work, Energy, Power & Collisions',
        icon: 'Zap',
        simType: 'collisions_energy',
        description: 'Work-energy theorem, spring potential energy, and 1D/2D elastic collisions.'
    },
    {
        id: 'xi_rotational',
        class: 11,
        title: 'System of Particles & Rotational Motion',
        icon: 'RotateCw',
        simType: 'rotational_motion',
        description: 'Torque tau = r x F, angular momentum L, moment of inertia, and rolling without slipping.'
    },
    {
        id: 'xi_gravitation',
        class: 11,
        title: 'Gravitation & Satellite Orbits',
        icon: 'Globe',
        simType: 'orbit',
        description: "Newton's universal law of gravitation, Kepler's laws, orbital and escape velocity."
    },
    {
        id: 'xi_fluids',
        class: 11,
        title: 'Mechanical Properties of Fluids',
        icon: 'Droplets',
        simType: 'bernoulli_fluids',
        description: "Bernoulli's principle, Pascal's law, buoyancy, and terminal velocity (Stokes law)."
    },
    {
        id: 'xi_thermodynamics',
        class: 11,
        title: 'Thermodynamics & Carnot Engine',
        icon: 'Flame',
        simType: 'carnot_cycle',
        description: 'P-V indicator diagrams, isothermal and adiabatic processes, Carnot engine efficiency.'
    },
    {
        id: 'xi_oscillations',
        class: 11,
        title: 'Oscillations (Simple Harmonic Motion)',
        icon: 'Activity',
        simType: 'shm_spring_pendulum',
        description: 'Spring-mass oscillators, simple pendulums, and dynamic kinetic/potential energy exchange.'
    },
    {
        id: 'xi_waves',
        class: 11,
        title: 'Waves & Sound (Doppler Effect)',
        icon: 'Waves',
        simType: 'wave_superposition',
        description: 'Transverse and longitudinal waves, standing wave resonance, and Doppler frequency shift.'
    },

    // ─── CLASS XII ───────────────────────────────────────────
    {
        id: 'xii_electrostatics',
        class: 12,
        title: 'Electric Charges & Fields',
        icon: 'Sparkles',
        simType: 'coulomb_field',
        description: "Coulomb's law, electric field vectors E, field lines, and Gauss's law flux."
    },
    {
        id: 'xii_potential_capacitance',
        class: 12,
        title: 'Electrostatic Potential & Capacitance',
        icon: 'BatteryMedium',
        simType: 'capacitor_circuit',
        description: 'Equipotential surfaces, parallel plate capacitors, dielectric constants, and stored energy.'
    },
    {
        id: 'xii_current_electricity',
        class: 12,
        title: 'Current Electricity & Circuits',
        icon: 'Cable',
        simType: 'dc_circuit',
        description: "Ohm's law V = IR, series/parallel resistor networks, Kirchhoff rules, and Wheatstone bridge."
    },
    {
        id: 'xii_magnetism_charges',
        class: 12,
        title: 'Moving Charges & Magnetism (Lorentz Force)',
        icon: 'Compass',
        simType: 'lorentz_force',
        description: 'Magnetic force F = q(v x B), cyclotron helical paths, and Biot-Savart law for wires.'
    },
    {
        id: 'xii_emi',
        class: 12,
        title: 'Electromagnetic Induction & Lenz Law',
        icon: 'RefreshCw',
        simType: 'faraday_induction',
        description: "Faraday's law of induction, Lenz's law, magnetic flux change, and motional EMF."
    },
    {
        id: 'xii_ac',
        class: 12,
        title: 'Alternating Current (Series LCR)',
        icon: 'Radio',
        simType: 'lcr_circuit',
        description: 'Phasor diagrams, AC impedance Z, LCR resonance frequency, and power factor cos phi.'
    },
    {
        id: 'xii_em_waves',
        class: 12,
        title: 'Electromagnetic Waves',
        icon: 'Wifi',
        simType: 'em_wave',
        description: 'Transverse orthogonal E and B wave propagation, Maxwell equations, and EM spectrum.'
    },
    {
        id: 'xii_ray_optics',
        class: 12,
        title: 'Ray Optics & Optical Instruments',
        icon: 'Eye',
        simType: 'ray_optics',
        description: 'Convex/concave lenses and spherical mirrors, 3 principal rays, magnification, and prisms.'
    },
    {
        id: 'xii_wave_optics',
        class: 12,
        title: 'Wave Optics (YDSE & Interference)',
        icon: 'Sun',
        simType: 'ydse',
        description: "Young's Double Slit Experiment (YDSE), fringe width beta, intensity distribution, and diffraction."
    },
    {
        id: 'xii_dual_nature',
        class: 12,
        title: 'Dual Nature of Radiation & Matter',
        icon: 'Lightbulb',
        simType: 'photoelectric_effect',
        description: "Einstein's photoelectric equation, threshold frequency, stopping potential, and de Broglie waves."
    },
    {
        id: 'xii_atoms_nuclei',
        class: 12,
        title: 'Atoms & Nuclei (Bohr Model)',
        icon: 'Atom',
        simType: 'bohr_atom',
        description: 'Bohr hydrogen energy levels, spectral transitions (Lyman, Balmer), and radioactive decay.'
    },
    {
        id: 'xii_semiconductors',
        class: 12,
        title: 'Semiconductors & Digital Logic Gates',
        icon: 'Cpu',
        simType: 'logic_gates',
        description: 'P-N junction diode characteristics, rectifiers, and truth tables for AND, OR, NOT, NAND, NOR.'
    }
];
