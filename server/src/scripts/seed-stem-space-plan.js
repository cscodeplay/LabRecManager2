/**
 * Seed Phase 1 STEM Simulation Space Implementation Plan (PLAN-010)
 * Class XI & XII Physics & Chemistry Interactive Environments, Apparatus & Mathematical Laws
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.ACTIVE_DB === 'old' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ep-dawn-math-aznkmg6c'))
    ? (process.env.DATABASE_URL_OLD || "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require")
    : (process.env.DATABASE_URL || "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require");

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function seedPlan() {
    console.log('[Seed STEM Space Plan] Connecting to PostgreSQL database...');
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'admin', isActive: true },
            select: { id: true, schoolId: true }
        });
        const adminId = adminUser?.id || null;
        const schoolId = adminUser?.schoolId || null;

        const planTitle = 'Phase 1 STEM Simulation Space: Class XI & XII Physics & Chemistry Interactive Environments';

        const tasks = JSON.stringify([
            { id: 'stem-1', title: 'Context-Aware Question Topic Classifier: Differentiates theoretical questions from simulation/graphing requests to prevent unwanted modal popups', completed: true, duration_minutes: 30 },
            { id: 'stem-2', title: 'Whiteboard Floating Selection Action Bar & Canvas Right-Click Context Menu with Cut, Copy, Paste, Duplicate, Bring to Front, Send to Back, and Delete', completed: true, duration_minutes: 35 },
            { id: 'stem-3', title: 'Web Research Browser Image Card Copy Button with Direct Whiteboard Clipboard Integration and Multi-Stage CORS Proxy Fallback', completed: true, duration_minutes: 25 },
            { id: 'stem-4', title: 'Mathematical Edge & Arc Constraint Engine for Ruler and Protractor with Zero-Stroke Penetration Snapping', completed: true, duration_minutes: 30 },
            { id: 'stem-5', title: 'Dual Vector Shape and Freehand Pixel Bucket Fill Engine with Open-Boundary Leakage Detection and Pattern/Gradient Support', completed: true, duration_minutes: 35 },
            { id: 'stem-6', title: 'Unified AI Solution Pane with Top-Level Initial Answer Callout and Non-Destructive Step Narration Pause/Resume Controls', completed: true, duration_minutes: 25 },
            { id: 'stem-7', title: 'MechanicsLabSpace (Class XI): Projectile Motion, Incline Planes, Atwood Machine, Elastic/Inelastic Collisions, Angular Momentum, and Keplerian Orbits with Symplectic Verlet Integration', completed: true, duration_minutes: 45 },
            { id: 'stem-8', title: 'Electrostatic & Circuits Space (Class XII): Coulomb Point Charges, Equipotential Surfaces, Gauss Surfaces, RC Charging/Discharging, and Kirchhoff Circuit Solver', completed: true, duration_minutes: 40 },
            { id: 'stem-9', title: 'Electromagnetism & Induction Space (Class XII): Biot-Savart Solenoid Flux, Lorentz Force v x B Helical Trajectories, and LCR Series/Parallel Resonance', completed: true, duration_minutes: 40 },
            { id: 'stem-10', title: 'Optics & Wave Nature of Light Space (Class XII): Snell Ray Tracing, Lens-Maker Equation, Triangular Prism Dispersion, and Young\'s Double-Slit Interference', completed: true, duration_minutes: 45 },
            { id: 'stem-11', title: 'Modern Physics & Duality Space (Class XII): Photoelectric Effect Stopping Potential, Bohr Hydrogen Orbit Quantization, de Broglie Matter Waves, and Radioactive Decay', completed: true, duration_minutes: 40 },
            { id: 'stem-12', title: 'Molecular3D & Structure Space (Class XI): 3D VSEPR Molecular Geometry (Linear to Octahedral), Bond Dipole Moments, and Radial Electron Density Probability ψ²(r)', completed: true, duration_minutes: 35 },
            { id: 'stem-13', title: 'Physical Chemistry & Thermodynamics Space (Class XI): Variable Piston-Cylinder PVT Ideal/Real Gas Cycles, Carnot Engine, and Calorimetric Hess Enthalpy Cycles', completed: true, duration_minutes: 40 },
            { id: 'stem-14', title: 'Ionic Equilibrium & Electrochemistry Space (Class XII): Le Chatelier Stress Shifts, Acid-Base Titration Curves, Galvanic Daniell Cell, and Nernst Potential Solver', completed: true, duration_minutes: 40 },
            { id: 'stem-15', title: 'Reaction Mechanism & Kinetics Space (Class XII): Arrhenius Rate Activation Energy, Integrated Rate Laws, and SN1/SN2 Curved Arrow Electron-Pushing with Stereochemical Inversion', completed: true, duration_minutes: 45 }
        ]);

        const metadata = JSON.stringify({
            category: 'STEM Simulation Space',
            serial_id: 'PLAN-010',
            physics_spaces: [
                {
                    name: 'MechanicsLabSpace',
                    chapters: ['Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Gravitation', 'Oscillations'],
                    apparatus: ['Incline Plane', 'Atwood Pulley Machine', 'Coupled Spring-Mass', 'Simple & Physical Pendulum', 'Ballistic Pendulum', 'Planetary Orbit Sandbox'],
                    rules: ['Symplectic Verlet Integration', 'Newton-Euler Dynamics (F = ma, τ = Iα)', 'Conservation of Momentum & Kinetic Energy', 'Kepler\'s Laws of Planetary Motion']
                },
                {
                    name: 'ElectrostaticSpace',
                    chapters: ['Electric Charges & Fields', 'Electrostatic Potential & Capacitance'],
                    apparatus: ['Point Charges (+q, -q)', 'Continuous Line/Ring Charges', 'Gaussian Spheres/Cylinders', 'Parallel Plate Capacitor with Dielectric Slabs'],
                    rules: ['Coulomb\'s Inverse-Square Law', 'Gauss\'s Flux Theorem (∮E·dA = Q/ε₀)', 'Laplace & Poisson Potential Equations (∇²V = -ρ/ε₀)', 'Capacitance C = κε₀A/d']
                },
                {
                    name: 'CircuitsLabSpace',
                    chapters: ['Current Electricity', 'AC Circuits'],
                    apparatus: ['Breadboard', 'DC Battery & AC Voltage Sources', 'Resistors, Inductors, Capacitors', 'Wheatstone Bridge', 'Potentiometer', 'Dual-Trace Oscilloscope'],
                    rules: ['Kirchhoff\'s Current Law (KCL)', 'Kirchhoff\'s Voltage Law (KVL)', 'RC/RL/LCR Differential Solvers', 'Resonance Frequency ω₀ = 1/√(LC)']
                },
                {
                    name: 'ElectromagneticSpace',
                    chapters: ['Moving Charges & Magnetism', 'Magnetism & Matter', 'Electromagnetic Induction'],
                    apparatus: ['Helmholtz Coils', 'Current-Carrying Wires & Loops', 'Solenoid Core', 'Charged Particle Gun', 'Faraday Induction Ring & Falling Magnet'],
                    rules: ['Lorentz Force Law (F = q(E + v × B))', 'Biot-Savart Law (dB = (μ₀I/4π) dl × r / r³)', 'Faraday-Lenz Law (ℰ = -dΦ_B/dt)', 'Cyclotron Frequency f_c = qB / 2πm']
                },
                {
                    name: 'OpticsBenchSpace',
                    chapters: ['Ray Optics & Optical Instruments', 'Wave Optics'],
                    apparatus: ['Optical Rail Bench', 'Collimated Ray Box', 'Convex/Concave Thin Lenses', 'Equilateral Triangular Prism', 'Young\'s Double Slit Screen', 'Polarizer & Analyzer Filters'],
                    rules: ['Snell-Descartes Refraction (n₁ sin θ₁ = n₂ sin θ₂)', 'Lens-Maker Equation (1/f = (n-1)(1/R₁ - 1/R₂))', 'Prism Minimum Deviation Formula', 'Huygens-Fresnel Wave Interference (β = λD/d)', 'Malus\' Law (I = I₀ cos²θ)']
                },
                {
                    name: 'ModernPhysicsSpace',
                    chapters: ['Dual Nature of Radiation & Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'],
                    apparatus: ['Photoelectric Phototube with Monochromatic Light Sources', 'Bohr Hydrogen Orbital Shells', 'Cloud Chamber & Radioactive Alpha/Beta Decay Tank', 'PN Junction Diode Circuit & Logic Gates Array'],
                    rules: ['Einstein\'s Photoelectric Equation (eV₀ = hν - Φ)', 'Bohr Orbital Angular Momentum Quantization (L = nh/2π)', 'de Broglie Wavelength (λ = h/p)', 'Radioactive Decay Law (N(t) = N₀ e^(-λt))', 'Shockley Diode Equation']
                }
            ],
            chemistry_spaces: [
                {
                    name: 'Molecular3DSpace',
                    chapters: ['Structure of Atom', 'Chemical Bonding & Molecular Structure'],
                    apparatus: ['3D Ball-and-Stick / Space-Filling Molecular Canvas', 'Orbital Hybridization Overlay (sp, sp², sp³, sp³d, sp³d²)', 'Radial Probability Density Plotter (ψ² vs r)'],
                    rules: ['VSEPR Valence Shell Electron Pair Repulsion Theory', 'Pauli Exclusion & Hund\'s Multiplicity Rule', 'Schrödinger Radial Distribution Function']
                },
                {
                    name: 'PhysicalChemistrySpace',
                    chapters: ['Thermodynamics', 'Equilibrium', 'Chemical Kinetics'],
                    apparatus: ['Insulated Piston-Cylinder Gas Chamber', 'Bomb Calorimeter', 'Equilibrium Reaction Vessel with Pressure/Temp Controls', 'Spectrophotometer for Reaction Rate Tracking'],
                    rules: ['Van der Waals Real Gas Equation ((P + an²/V²)(V - nb) = nRT)', 'First & Second Laws of Thermodynamics (ΔU = q + w, ΔG = ΔH - TΔS)', 'Le Chatelier Dynamic Shift Matrix', 'Arrhenius Rate Law (k = A e^(-E_a/RT))']
                },
                {
                    name: 'ElectrochemistryLabSpace',
                    chapters: ['Electrochemistry', 'Solutions'],
                    apparatus: ['Dual Beaker Daniell Galvanic Cell', 'Salt Bridge (KCl in Agar)', 'Metal Electrodes (Zn, Cu, Ag, Fe)', 'Digital Voltmeter', 'Electrolytic Decomposition Cell'],
                    rules: ['Nernst Electrode Potential Equation (E_cell = E° - (RT/nF) ln Q)', 'Faraday\'s Laws of Electrolysis (m = ZIt)', 'Kohlrausch\'s Law of Independent Ionic Migration']
                },
                {
                    name: 'ReactionMechanismSpace',
                    chapters: ['Haloalkanes & Haloarenes', 'Alcohols, Phenols & Ethers', 'Aldehydes, Ketones & Carboxylic Acids', 'Amines'],
                    apparatus: ['Curved Arrow Electron-Pushing Board', 'Carbocation Intermediate Viewer', 'Chirality & Walden Inversion Mirror', 'Reaction Coordinate Free Energy Landscape'],
                    rules: ['SN1 (Two-step via planar carbocation) vs SN2 (Concerted backside attack with inversion)', 'Markovnikov Addition Stability (Tertiary > Secondary > Primary)', 'Nucleophilic Acyl Addition & Elimination']
                }
            ]
        });

        const outcomesText = `
### Phase 1 STEM Simulation Space Architecture: Class XI & XII Physics & Chemistry

#### 1. Context-Aware Simulation & Graphing Gating
* **Selective Invocation Engine**: Prevents disruptive auto-launching of simulation lab or 2D/3D graph plotters on theoretical or qualitative questions.
* **Deterministic Keyword & Intent Analysis**: Simulation spaces are only launched when students or instructors explicitly request interactive experiments, parameter variations, or laboratory simulations.
* **Header Quick-Action Pills**: When problems have associated physics simulations or mathematical curves, non-intrusive action buttons (\`⚛️ Simulate [Topic]\` and \`📈 Plot Graph\`) appear in the AI Solution Pane header for one-click launching.

#### 2. Whiteboard Selection Context Menu & Web Asset Clipper
* **Select Tool Context Toolbar**: Floating edit bar appearing upon item selection with Cut, Copy, Paste, Duplicate, Bring to Front, Send to Back, and Delete.
* **Right-Click Canvas Context Menu**: Glassmorphism popover accessible anywhere on the whiteboard canvas with keyboard shortcut hints.
* **Image Card Direct Copying**: Added clipboard copy button on every Google Images card in the Web Sideroll with multi-stage CORS proxy fallback (/api/browser/proxy-image).

#### 3. Precision Geometry & Bucket Fill Engines
* **Physical Edge Snapping**: Ruler measuring edge (y = 0) and protractor circular arc / base diameter mathematically constrain pen input, eliminating stroke penetration underneath instruments.
* **Dual-Mode Bucket Fill**:
  * Vector Shapes: Direct hit-testing updating stroke, fill color, pattern (dots, lines, grid), or gradient without raster pixel artifacts.
  * Freehand Closed Loops: High-performance flood fill with 4-border leakage detection, aborting and warning the user if the drawn boundary is open.

#### 4. Unified AI Solution Pane & Voice Narration
* **Integrated Initial Response**: Combined green introductory summary directly into the top of the solution pane as an Initial Answer & Summary card.
* **Non-Destructive Speech Synthesis**: Muting and unmuting pauses and resumes speech narration from the active step rather than resetting to step 0.

#### 5. Class XI & XII Physics Spaces & Mathematical Laws
* **MechanicsLabSpace (XI)**:
  * *Apparatus*: Incline planes, Atwood machines, ballistic pendulums, coupled oscillators, orbital sandbox.
  * *Mathematical Laws*: Symplectic Verlet integration, Newton's 2nd Law (F = ma, τ = Iα), conservation of linear and angular momentum.
* **ElectrostaticSpace (XII)**:
  * *Apparatus*: Interactive point charges, continuous charge distributions, equipotential contour lines, capacitor plates with dielectrics.
  * *Mathematical Laws*: Coulomb's Law, Gauss's Theorem (∮E·dA = Q/ε₀), Poisson-Laplace solvers.
* **CircuitsLabSpace (XII)**:
  * *Apparatus*: Breadboard, DC/AC supplies, Wheatstone bridge, potentiometer, LCR components, oscilloscopes.
  * *Mathematical Laws*: Kirchhoff's laws (KVL/KCL), transient differential equations (RC, RL, LCR resonance).
* **ElectromagneticSpace (XII)**:
  * *Apparatus*: Solenoids, current loops, charged particle emitters, uniform and cross-field chambers.
  * *Mathematical Laws*: Biot-Savart law, Lorentz force (F = q(E + v × B)), Faraday-Lenz induction.
* **OpticsBenchSpace (XII)**:
  * *Apparatus*: Laser ray box, thin spherical lenses, prisms, Young's double slits, polarizers.
  * *Mathematical Laws*: Snell's law, Lens-maker formula, prism minimum deviation, wave interference & diffraction.
* **ModernPhysicsSpace (XII)**:
  * *Apparatus*: Photoelectric phototubes, Bohr hydrogen atom shells, alpha/beta decay chambers.
  * *Mathematical Laws*: Einstein's photoelectric equation (eV₀ = hν - Φ), Bohr quantization (L = nh/2π), de Broglie matter waves (λ = h/p), radioactive decay law.

#### 6. Class XI & XII Chemistry Spaces & Chemical Rules
* **Molecular3DSpace (XI)**:
  * *Apparatus*: Interactive 3D VSEPR ball-and-stick models, orbital hybrid overlays (sp to sp³d²), electron density clouds.
  * *Governing Rules*: VSEPR repulsion minimization, Pauli exclusion, Hund's rule, radial probability distributions.
* **PhysicalChemistrySpace (XI)**:
  * *Apparatus*: Variable-volume piston cylinders, bomb calorimeters, equilibrium reaction chambers.
  * *Governing Rules*: Van der Waals equation, Gibbs free energy spontaneity (ΔG = ΔH - TΔS), Le Chatelier stress-response matrix.
* **ElectrochemistryLabSpace (XII)**:
  * *Apparatus*: Daniell galvanic cells, salt bridges, standard electrodes, digital voltmeters, electrolytic tanks.
  * *Governing Rules*: Nernst equation (E = E° - (RT/nF) ln Q), Faraday's laws of electrolysis, Kohlrausch's law.
* **ReactionMechanismSpace (XII)**:
  * *Apparatus*: Curved-arrow electron flow canvas, reaction coordinate energy diagram, stereochemical Walden inversion viewer.
  * *Governing Rules*: SN1 vs SN2 kinetics and stereochemistry, Markovnikov carbocation stability, electrophilic aromatic substitution.
        `.trim();

        const existing = await prisma.$queryRawUnsafe(`
            SELECT id FROM "implementation_plans" WHERE title = $1 LIMIT 1
        `, planTitle);

        if (!existing || existing.length === 0) {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "implementation_plans" (
                    "school_id", "created_by_id", "title", "description", "category", "status",
                    "started_at", "ended_at", "tasks", "outcomes", "metadata", "created_at", "updated_at"
                ) VALUES (
                    $1::uuid, $2::uuid, $3, $4, $5, 'completed',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6::jsonb, $7, $8::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            `,
                schoolId, adminId, planTitle,
                'Comprehensive architectural plan and physical simulation framework for Class XI & XII CBSE/JEE/NEET Physics and Chemistry interactive environments, including context-aware topic routing, selection context menu, ruler/protractor edge clamping, leak-proof shape fill engine, unified AI solution pane, and rigorous mathematical law solvers.',
                'STEM Simulation Space',
                tasks,
                outcomesText,
                metadata
            );
            console.log('✅ Phase 1 STEM Simulation Space plan inserted into database.');
        } else {
            await prisma.$executeRawUnsafe(`
                UPDATE "implementation_plans"
                SET "status" = 'completed', "tasks" = $1::jsonb, "outcomes" = $2, "metadata" = $3::jsonb, "ended_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP
                WHERE "title" = $4
            `, tasks, outcomesText, metadata, planTitle);
            console.log('✅ Phase 1 STEM Simulation Space plan updated in database.');
        }

        console.log('✅ Plan PLAN-010 is now live on /admin/implementation-plans page.');
    } catch (err) {
        console.error('❌ Error seeding STEM space plan:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedPlan();
