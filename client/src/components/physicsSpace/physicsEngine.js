/**
 * physicsEngine.js
 * High-Precision Physics Simulation Engine for Class XI & XII Physics
 * Numerical algorithms, analytical solvers, and dynamic state steppers.
 */

import { PHYSICAL_CONSTANTS } from './vectorConventions';

/**
 * 1. PROJECTILE MOTION & 2D KINEMATICS (Class XI, Chapter 3)
 */
export function createProjectileSimulation(params = {}) {
    const u = Math.max(0.1, Number(params.velocity || params.speed || 25)); // initial speed m/s
    const angleDeg = Math.min(89.9, Math.max(0.1, Number(params.angle !== undefined ? params.angle : 45))); // degrees
    const angleRad = (angleDeg * Math.PI) / 180;
    const g = Number(params.gravity || PHYSICAL_CONSTANTS.g.value); // m/s^2
    const h0 = Math.max(0, Number(params.height || 0)); // initial elevation m

    const ux = u * Math.cos(angleRad);
    const uy = u * Math.sin(angleRad);

    // Analytical metrics
    const timeToApex = uy / g;
    const maxApexHeight = h0 + (uy * uy) / (2 * g);
    // Quadratic formula for flight time to y = 0: h0 + uy*t - 0.5*g*t^2 = 0
    const timeOfFlight = (uy + Math.sqrt(uy * uy + 2 * g * h0)) / g;
    const horizontalRange = ux * timeOfFlight;

    return {
        type: 'projectile',
        u,
        angleDeg,
        g,
        h0,
        ux,
        uy,
        timeToApex,
        maxApexHeight,
        timeOfFlight,
        horizontalRange,
        // Evaluate state at time t (seconds)
        getStateAt: (t) => {
            const clampedT = Math.min(timeOfFlight, Math.max(0, t));
            const x = ux * clampedT;
            const y = Math.max(0, h0 + uy * clampedT - 0.5 * g * clampedT * clampedT);
            const vx = ux;
            const vy = uy - g * clampedT;
            const speed = Math.hypot(vx, vy);
            const currentAngleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;

            return {
                t: clampedT,
                x,
                y,
                vx,
                vy,
                speed,
                currentAngleDeg,
                isLanded: clampedT >= timeOfFlight
            };
        },
        // Sample complete trajectory points for vector rendering
        getTrajectoryPoints: (numSamples = 80) => {
            const pts = [];
            for (let i = 0; i <= numSamples; i++) {
                const t = (i / numSamples) * timeOfFlight;
                const x = ux * t;
                const y = Math.max(0, h0 + uy * t - 0.5 * g * t * t);
                pts.push({ x, y, t });
            }
            return pts;
        }
    };
}

/**
 * 2. INCLINED PLANE & FREE BODY DIAGRAM (FBD) (Class XI, Chapter 4)
 */
export function createInclinedPlaneSimulation(params = {}) {
    const mass = Math.max(0.1, Number(params.mass || 5)); // kg
    const angleDeg = Math.min(85, Math.max(1, Number(params.angle !== undefined ? params.angle : 30))); // degrees
    const angleRad = (angleDeg * Math.PI) / 180;
    const mu_s = Math.max(0, Number(params.staticFriction !== undefined ? params.staticFriction : 0.25));
    const mu_k = Math.max(0, Number(params.kineticFriction !== undefined ? params.kineticFriction : (mu_s * 0.85)));
    const g = Number(params.gravity || PHYSICAL_CONSTANTS.g.value);
    const planeLength = Math.max(1, Number(params.length || 10)); // meters

    const mg = mass * g;
    const normalForce = mg * Math.cos(angleRad); // N = mg cos(theta)
    const parallelGravity = mg * Math.sin(angleRad); // mg sin(theta) down plane
    const maxStaticFriction = mu_s * normalForce; // f_s,max = mu_s * N

    // Check if block moves down plane
    const willSlide = parallelGravity > maxStaticFriction;
    const frictionForce = willSlide ? (mu_k * normalForce) : parallelGravity;
    const netForceDownPlane = willSlide ? Math.max(0, parallelGravity - frictionForce) : 0;
    const acceleration = willSlide ? (netForceDownPlane / mass) : 0; // m/s^2

    // Time to reach bottom from top: s = 0.5 * a * t^2 -> t = sqrt(2s/a)
    const timeToBottom = acceleration > 0 ? Math.sqrt((2 * planeLength) / acceleration) : Infinity;
    const finalVelocity = acceleration > 0 ? Math.sqrt(2 * acceleration * planeLength) : 0;

    return {
        type: 'inclined_plane',
        mass,
        angleDeg,
        mu_s,
        mu_k,
        g,
        planeLength,
        mg,
        normalForce,
        parallelGravity,
        maxStaticFriction,
        frictionForce,
        netForceDownPlane,
        acceleration,
        willSlide,
        timeToBottom,
        finalVelocity,
        getStateAt: (t) => {
            const clampedT = Math.min(timeToBottom, Math.max(0, t));
            const distance = 0.5 * acceleration * clampedT * clampedT;
            const currentSpeed = acceleration * clampedT;
            return {
                t: clampedT,
                distance: Math.min(planeLength, distance),
                speed: currentSpeed,
                isAtBottom: clampedT >= timeToBottom
            };
        }
    };
}

/**
 * 3. ATWOOD MACHINE & PULLEYS (Class XI, Chapter 4)
 */
export function createAtwoodSimulation(params = {}) {
    const m1 = Math.max(0.1, Number(params.m1 || 3)); // kg
    const m2 = Math.max(0.1, Number(params.m2 || 5)); // kg
    const g = Number(params.gravity || PHYSICAL_CONSTANTS.g.value);
    const totalMass = m1 + m2;

    const acceleration = (Math.abs(m2 - m1) / totalMass) * g;
    const tension = (2 * m1 * m2 * g) / totalMass;

    return {
        type: 'atwood_pulley',
        m1,
        m2,
        g,
        acceleration,
        tension,
        heavier: m2 >= m1 ? 'm2' : 'm1',
        getStateAt: (t, strokeLimit = 4) => {
            const disp = 0.5 * acceleration * t * t;
            const currentDisp = Math.min(strokeLimit, disp);
            const speed = acceleration * t;
            return {
                t,
                displacement: currentDisp,
                speed,
                isLimited: disp >= strokeLimit
            };
        }
    };
}

/**
 * 4. SIMPLE HARMONIC MOTION (SHM) (Class XI, Chapter 13)
 * Spring-Mass Oscillator & Simple Pendulum
 */
export function createSHMSimulation(params = {}) {
    const mode = params.mode === 'pendulum' ? 'pendulum' : 'spring';
    const mass = Math.max(0.05, Number(params.mass || 1.5)); // kg
    const k = Math.max(0.5, Number(params.springConstant || params.k || 30)); // N/m
    const length = Math.max(0.1, Number(params.length || params.L || 1.2)); // meters for pendulum
    const g = Number(params.gravity || PHYSICAL_CONSTANTS.g.value);
    const amplitude = Math.max(0.01, Number(params.amplitude || (mode === 'pendulum' ? 0.35 : 0.8))); // meters or rad

    // Angular frequency & Time Period
    const omega = mode === 'spring' ? Math.sqrt(k / mass) : Math.sqrt(g / length);
    const period = (2 * Math.PI) / omega;
    const frequency = 1 / period;

    return {
        type: 'shm',
        mode,
        mass,
        k,
        length,
        amplitude,
        omega,
        period,
        frequency,
        getStateAt: (t) => {
            const x = amplitude * Math.cos(omega * t);
            const v = -amplitude * omega * Math.sin(omega * t);
            const a = -amplitude * omega * omega * Math.cos(omega * t);

            // Energy accounting
            const effectiveK = mode === 'spring' ? k : (mass * g / length);
            const kineticEnergy = 0.5 * mass * v * v;
            const potentialEnergy = 0.5 * effectiveK * x * x;
            const totalEnergy = kineticEnergy + potentialEnergy;

            return {
                t,
                displacement: x,
                velocity: v,
                acceleration: a,
                kineticEnergy,
                potentialEnergy,
                totalEnergy,
                phase: (omega * t) % (2 * Math.PI)
            };
        }
    };
}

/**
 * 5. GRAVITATION & KEPLERIAN SATELLITE ORBIT (Class XI, Chapter 7)
 */
export function createGravitationOrbitSimulation(params = {}) {
    const G = PHYSICAL_CONSTANTS.G.value;
    const M_central = Number(params.centralMass || 5.972e24); // Earth mass kg
    const R_planet = Number(params.planetRadius || 6.371e6); // Earth radius m
    const altitude = Number(params.altitude || 1000e3); // Altitude above surface m
    const r = R_planet + altitude; // Orbital radius m
    const m_satellite = Number(params.satelliteMass || 1000); // kg

    const orbitalSpeed = Math.sqrt((G * M_central) / r); // v = sqrt(GM/r)
    const escapeSpeed = Math.sqrt((2 * G * M_central) / r); // v_e = sqrt(2GM/r)
    const period = 2 * Math.PI * Math.sqrt((r * r * r) / (G * M_central)); // T = 2pi sqrt(r^3/GM)
    const centripetalForce = (m_satellite * orbitalSpeed * orbitalSpeed) / r;
    const g_at_altitude = (G * M_central) / (r * r);

    return {
        type: 'orbit',
        M_central,
        R_planet,
        r,
        altitude,
        m_satellite,
        orbitalSpeed,
        escapeSpeed,
        period,
        centripetalForce,
        g_at_altitude,
        getStateAt: (t) => {
            const meanAnomaly = (2 * Math.PI * t) / period;
            const x = r * Math.cos(meanAnomaly);
            const y = r * Math.sin(meanAnomaly);
            const vx = -orbitalSpeed * Math.sin(meanAnomaly);
            const vy = orbitalSpeed * Math.cos(meanAnomaly);

            return {
                t,
                x,
                y,
                vx,
                vy,
                angleDeg: ((meanAnomaly * 180) / Math.PI) % 360
            };
        }
    };
}

/**
 * 6. THERMODYNAMICS & CARNOT CYCLE (Class XI, Chapter 11)
 */
export function createCarnotCycleSimulation(params = {}) {
    const TH = Math.max(300, Number(params.TH || 600)); // Source temp Kelvin
    const TC = Math.min(TH - 10, Math.max(100, Number(params.TC || 300))); // Sink temp Kelvin
    const n = Number(params.moles || 1); // moles
    const R = PHYSICAL_CONSTANTS.R.value;
    const gamma = 1.4; // Diatomic gas (air / N2)

    const efficiency = 1 - (TC / TH);
    const efficiencyPercent = (efficiency * 100).toFixed(1);

    // Coordinate cycle points on P-V diagram
    const V1 = 1.0;
    const P1 = (n * R * TH) / V1;

    const V2 = 2.2;
    const P2 = (n * R * TH) / V2; // Isothermal expansion

    // Adiabatic expansion: P2 * V2^gamma = P3 * V3^gamma, and T2*V2^(gamma-1) = T3*V3^(gamma-1)
    const V3 = V2 * Math.pow(TH / TC, 1 / (gamma - 1));
    const P3 = (n * R * TC) / V3;

    // Adiabatic compression back to state 1: T4*V4^(gamma-1) = T1*V1^(gamma-1) -> V4 = V1 * (TH/TC)^(1/(gamma-1))
    const V4 = V1 * Math.pow(TH / TC, 1 / (gamma - 1));
    const P4 = (n * R * TC) / V4;

    const QH = n * R * TH * Math.log(V2 / V1);
    const QC = n * R * TC * Math.log(V3 / V4);
    const workDone = QH - QC;

    return {
        type: 'carnot_cycle',
        TH,
        TC,
        efficiency,
        efficiencyPercent,
        workDone,
        QH,
        QC,
        states: [
            { id: '1', name: 'State 1', P: P1, V: V1, T: TH, label: '(P₁, V₁, T_H)' },
            { id: '2', name: 'State 2', P: P2, V: V2, T: TH, label: '(P₂, V₂, T_H)' },
            { id: '3', name: 'State 3', P: P3, V: V3, T: TC, label: '(P₃, V₃, T_C)' },
            { id: '4', name: 'State 4', P: P4, V: V4, T: TC, label: '(P₄, V₄, T_C)' }
        ],
        processes: [
            { from: '1', to: '2', type: 'Isothermal Expansion', equation: 'PV = nRT_H', heat: 'Q_H absorbed' },
            { from: '2', to: '3', type: 'Adiabatic Expansion', equation: 'PV^\\gamma = \\text{const}', heat: 'Q = 0' },
            { from: '3', to: '4', type: 'Isothermal Compression', equation: 'PV = nRT_C', heat: 'Q_C rejected' },
            { from: '4', to: '1', type: 'Adiabatic Compression', equation: 'PV^\\gamma = \\text{const}', heat: 'Q = 0' }
        ]
    };
}

/**
 * 7. COULOMB'S LAW & ELECTRIC FIELD (Class XII, Chapter 1)
 */
export function createCoulombFieldSimulation(params = {}) {
    const k_e = PHYSICAL_CONSTANTS.k_e.value;
    const charges = Array.isArray(params.charges) && params.charges.length > 0
        ? params.charges
        : [
            { id: 'q1', q: 2e-6, x: -1.2, y: 0, label: '+2 µC' },
            { id: 'q2', q: -2e-6, x: 1.2, y: 0, label: '-2 µC' }
        ];

    return {
        type: 'coulomb_field',
        charges,
        getElectricFieldAt: (x, y) => {
            let Ex = 0;
            let Ey = 0;
            let V = 0;

            for (const chg of charges) {
                const dx = x - chg.x;
                const dy = y - chg.y;
                const r2 = dx * dx + dy * dy;
                const r = Math.sqrt(r2);
                if (r < 0.08) continue; // avoid singularity at point charge

                const E_mag = (k_e * chg.q) / r2;
                Ex += E_mag * (dx / r);
                Ey += E_mag * (dy / r);
                V += (k_e * chg.q) / r;
            }

            return {
                Ex,
                Ey,
                Emag: Math.hypot(Ex, Ey),
                potential: V
            };
        }
    };
}

/**
 * 8. CURRENT ELECTRICITY & DC CIRCUITS (Class XII, Chapter 3)
 */
export function createDCCircuitSimulation(params = {}) {
    const V = Math.max(0.1, Number(params.voltage || 12)); // Volts
    const R1 = Math.max(0.1, Number(params.R1 || 10)); // Ohms
    const R2 = Math.max(0.1, Number(params.R2 || 20)); // Ohms
    const config = params.config === 'parallel' ? 'parallel' : 'series';

    let Req = 0;
    let totalCurrent = 0;
    let I1 = 0, I2 = 0;
    let V1 = 0, V2 = 0;

    if (config === 'series') {
        Req = R1 + R2;
        totalCurrent = V / Req;
        I1 = totalCurrent;
        I2 = totalCurrent;
        V1 = I1 * R1;
        V2 = I2 * R2;
    } else {
        Req = (R1 * R2) / (R1 + R2);
        totalCurrent = V / Req;
        V1 = V;
        V2 = V;
        I1 = V1 / R1;
        I2 = V2 / R2;
    }

    const totalPower = totalCurrent * V;

    return {
        type: 'dc_circuit',
        config,
        voltage: V,
        R1,
        R2,
        Req: Number(Req.toFixed(2)),
        totalCurrent: Number(totalCurrent.toFixed(3)),
        I1: Number(I1.toFixed(3)),
        I2: Number(I2.toFixed(3)),
        V1: Number(V1.toFixed(2)),
        V2: Number(V2.toFixed(2)),
        totalPower: Number(totalPower.toFixed(2))
    };
}

/**
 * 9. LORENTZ FORCE & CYCLOTRON HELICAL MOTION (Class XII, Chapter 4)
 */
export function createLorentzForceSimulation(params = {}) {
    const q = Number(params.charge || 1.6e-19); // Coulombs (default proton)
    const m = Number(params.mass || 1.67e-27); // kg
    const v = Math.max(1e3, Number(params.velocity || 3e5)); // m/s
    const B = Math.max(0.01, Number(params.magneticField || 0.5)); // Tesla
    const pitchAngleDeg = Math.min(80, Math.max(0, Number(params.pitchAngle || 0)));
    const pitchRad = (pitchAngleDeg * Math.PI) / 180;

    const v_perp = v * Math.cos(pitchRad);
    const v_parallel = v * Math.sin(pitchRad);

    const radius = (m * v_perp) / (Math.abs(q) * B); // r = mv_perp / (qB)
    const timePeriod = (2 * Math.PI * m) / (Math.abs(q) * B);
    const cyclotronFrequency = 1 / timePeriod;
    const pitch = v_parallel * timePeriod;
    const forceMag = Math.abs(q) * v_perp * B;

    return {
        type: 'lorentz_force',
        q,
        m,
        v,
        B,
        v_perp,
        v_parallel,
        radius,
        timePeriod,
        cyclotronFrequency,
        pitch,
        forceMag,
        getStateAt: (t) => {
            const omega = (q * B) / m;
            const x = radius * Math.cos(omega * t);
            const y = radius * Math.sin(omega * t);
            const z = v_parallel * t;

            return { t, x, y, z, omega };
        }
    };
}

/**
 * 10. ALTERNATING CURRENT & SERIES LCR RESONANCE (Class XII, Chapter 7)
 */
export function createLCRCircuitSimulation(params = {}) {
    const R = Math.max(1, Number(params.resistance || 50)); // Ohms
    const L = Math.max(1e-4, Number(params.inductance || 0.15)); // Henry (e.g. 150 mH)
    const C = Math.max(1e-8, Number(params.capacitance || 40e-6)); // Farads (e.g. 40 uF)
    const V0 = Math.max(1, Number(params.voltagePeak || 220 * Math.SQRT2)); // Volts peak

    // Resonance frequency
    const omega0 = 1 / Math.sqrt(L * C); // rad/s
    const f0 = omega0 / (2 * Math.PI); // Hz

    const currentF = Number(params.frequency || f0);
    const omega = 2 * Math.PI * currentF;

    const XL = omega * L;
    const XC = 1 / (omega * C);
    const Z = Math.sqrt(R * R + (XL - XC) * (XL - XC));
    const phaseRad = Math.atan2(XL - XC, R);
    const phaseDeg = (phaseRad * 180) / Math.PI;

    const I0 = V0 / Z;
    const powerFactor = Math.cos(phaseRad);
    const QFactor = (1 / R) * Math.sqrt(L / C);

    return {
        type: 'lcr_circuit',
        R,
        L,
        C,
        V0,
        f0: Number(f0.toFixed(1)),
        omega0: Number(omega0.toFixed(1)),
        currentF: Number(currentF.toFixed(1)),
        XL: Number(XL.toFixed(2)),
        XC: Number(XC.toFixed(2)),
        Z: Number(Z.toFixed(2)),
        I0: Number(I0.toFixed(3)),
        phaseDeg: Number(phaseDeg.toFixed(1)),
        powerFactor: Number(powerFactor.toFixed(3)),
        QFactor: Number(QFactor.toFixed(2)),
        isAtResonance: Math.abs(currentF - f0) < 0.5
    };
}

/**
 * 11. RAY OPTICS: LENSES & SPHERICAL MIRRORS (Class XII, Chapter 9)
 */
export function createRayOpticsSimulation(params = {}) {
    const element = params.element === 'mirror' ? 'mirror' : 'lens'; // 'lens' | 'mirror'
    const lensType = params.lensType === 'concave' ? 'concave' : 'convex'; // 'convex' | 'concave'
    const f = lensType === 'convex' ? Math.abs(Number(params.focalLength || 10)) : -Math.abs(Number(params.focalLength || 10)); // cm
    const u = -Math.abs(Number(params.objectDistance || 25)); // cm (Cartesian sign convention: object on left is -ve)
    const ho = Math.max(0.5, Number(params.objectHeight || 4)); // cm

    let v = 0; // image distance
    let m = 0; // magnification

    if (element === 'lens') {
        // Lens formula: 1/v - 1/u = 1/f -> 1/v = 1/f + 1/u = (u + f)/(u*f) -> v = (u*f)/(u + f)
        if (Math.abs(u + f) < 1e-4) {
            v = Infinity;
            m = Infinity;
        } else {
            v = (u * f) / (u + f);
            m = v / u;
        }
    } else {
        // Mirror formula: 1/v + 1/u = 1/f -> 1/v = 1/f - 1/u = (u - f)/(u*f) -> v = (u*f)/(u - f)
        if (Math.abs(u - f) < 1e-4) {
            v = Infinity;
            m = Infinity;
        } else {
            v = (u * f) / (u - f);
            m = -v / u;
        }
    }

    const hi = isFinite(m) ? ho * m : Infinity;
    const isReal = element === 'lens' ? v > 0 : v < 0;
    const isInverted = isFinite(m) && m < 0;

    return {
        type: 'ray_optics',
        element,
        lensType,
        f,
        u,
        ho,
        v: isFinite(v) ? Number(v.toFixed(2)) : 'Infinity (at focus)',
        m: isFinite(m) ? Number(m.toFixed(2)) : 'Infinity',
        hi: isFinite(hi) ? Number(hi.toFixed(2)) : 'Infinity',
        isReal,
        isInverted,
        nature: isFinite(v) ? `${isReal ? 'Real' : 'Virtual'} & ${isInverted ? 'Inverted' : 'Erect'}` : 'Image at Infinity'
    };
}

/**
 * 12. WAVE OPTICS & YOUNG'S DOUBLE SLIT EXPERIMENT (YDSE) (Class XII, Chapter 10)
 */
export function createYDSESimulation(params = {}) {
    const lambda = Number(params.wavelength || 600e-9); // 600 nm yellow-orange
    const d = Math.max(1e-5, Number(params.slitDistance || 0.25e-3)); // 0.25 mm
    const D = Math.max(0.1, Number(params.screenDistance || 1.2)); // 1.2 m
    const I0 = Math.max(1, Number(params.peakIntensity || 100)); // arbitrary units

    // Fringe width beta = lambda * D / d
    const fringeWidth = (lambda * D) / d; // meters

    return {
        type: 'ydse',
        lambda,
        d,
        D,
        fringeWidth,
        fringeWidthMm: Number((fringeWidth * 1000).toFixed(3)),
        getIntensityAtY: (y) => {
            // Phase difference delta = (2pi / lambda) * (d * y / D)
            const phase = (2 * Math.PI * d * y) / (lambda * D);
            // Intensity I = I0 * cos^2(phase / 2)
            const cosHalf = Math.cos(phase / 2);
            return I0 * cosHalf * cosHalf;
        }
    };
}

/**
 * 13. MODERN PHYSICS & BOHR ATOM TRANSITIONS (Class XII, Chapter 12)
 */
export function createBohrAtomSimulation(params = {}) {
    const n_initial = Math.max(2, Math.min(6, parseInt(params.n_initial || params.ni || 3, 10)));
    const n_final = Math.max(1, Math.min(n_initial - 1, parseInt(params.n_final || params.nf || 2, 10)));

    // Energy levels En = -13.6 / n^2 eV
    const Ei = -13.6 / (n_initial * n_initial);
    const Ef = -13.6 / (n_final * n_final);
    const deltaE_eV = Ei - Ef; // positive emitted energy

    // Wavelength lambda = hc / deltaE
    const hc_eV_nm = 1240; // eV * nm
    const wavelength_nm = deltaE_eV > 0 ? (hc_eV_nm / deltaE_eV) : 0;

    let seriesName = 'Lyman Series (UV)';
    if (n_final === 2) seriesName = 'Balmer Series (Visible Spectrum)';
    else if (n_final === 3) seriesName = 'Paschen Series (Infrared)';
    else if (n_final === 4) seriesName = 'Brackett Series (Infrared)';
    else if (n_final === 5) seriesName = 'Pfund Series (Far-IR)';

    return {
        type: 'bohr_atom',
        n_initial,
        n_final,
        Ei: Number(Ei.toFixed(2)),
        Ef: Number(Ef.toFixed(2)),
        deltaE_eV: Number(deltaE_eV.toFixed(2)),
        wavelength_nm: Number(wavelength_nm.toFixed(1)),
        seriesName,
        radius_initial_A: Number((0.529 * n_initial * n_initial).toFixed(2)),
        radius_final_A: Number((0.529 * n_final * n_final).toFixed(2))
    };
}

/**
 * 14. SEMICONDUCTOR LOGIC GATES (Class XII, Chapter 14)
 */
export function evaluateLogicGate(gateType, a, b = 0) {
    const A = Boolean(Number(a));
    const B = Boolean(Number(b));
    let out = false;

    switch (String(gateType).toUpperCase()) {
        case 'AND': out = A && B; break;
        case 'OR': out = A || B; break;
        case 'NOT': out = !A; break;
        case 'NAND': out = !(A && B); break;
        case 'NOR': out = !(A || B); break;
        case 'XOR': out = A !== B; break;
        case 'XNOR': out = A === B; break;
        default: out = A && B;
    }

    return out ? 1 : 0;
}
