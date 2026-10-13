'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    createProjectileSimulation,
    createInclinedPlaneSimulation,
    createSHMSimulation,
    createGravitationOrbitSimulation,
    createCarnotCycleSimulation,
    createCoulombFieldSimulation,
    createDCCircuitSimulation,
    createLorentzForceSimulation,
    createLCRCircuitSimulation,
    createRayOpticsSimulation,
    createYDSESimulation,
    createBohrAtomSimulation,
    evaluateLogicGate
} from './physicsEngine';

/**
 * Helper to draw a crisp vector arrow with label on Canvas
 */
function drawVectorArrow(ctx, fromX, fromY, toX, toY, color = '#38bdf8', label = '', labelSub = '') {
    const headLen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const len = Math.hypot(dx, dy);

    if (len < 3) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';

    // Shaft
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Vector Label
    if (label) {
        ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
        const midX = (fromX + toX) / 2 + 10 * Math.sin(angle);
        const midY = (fromY + toY) / 2 - 10 * Math.cos(angle);
        ctx.fillText(label, midX, midY);

        if (labelSub) {
            ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
            ctx.fillText(labelSub, midX + ctx.measureText(label).width + 2, midY + 3);
        }
    }
    ctx.restore();
}

export default function PhysicsCanvas({
    simType = 'projectile',
    simParams = {},
    isPlaying = true,
    timeScale = 1.0,
    onSimUpdate = null,
    className = ''
}) {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const timeRef = useRef(0);
    const lastTimestampRef = useRef(null);

    // Interactive Dragging State
    const isDraggingRef = useRef(false);
    const dragTargetRef = useRef(null);

    // Keep active instance in sync
    const simInstanceRef = useRef(null);

    // Initialize or re-create simulation instance
    useEffect(() => {
        timeRef.current = 0;
        switch (simType) {
            case 'projectile':
                simInstanceRef.current = createProjectileSimulation(simParams);
                break;
            case 'inclined_plane':
            case 'laws_of_motion':
                simInstanceRef.current = createInclinedPlaneSimulation(simParams);
                break;
            case 'shm_spring_pendulum':
            case 'oscillations':
                simInstanceRef.current = createSHMSimulation(simParams);
                break;
            case 'orbit':
            case 'gravitation':
                simInstanceRef.current = createGravitationOrbitSimulation(simParams);
                break;
            case 'carnot_cycle':
            case 'thermodynamics':
                simInstanceRef.current = createCarnotCycleSimulation(simParams);
                break;
            case 'coulomb_field':
            case 'electrostatics':
                simInstanceRef.current = createCoulombFieldSimulation(simParams);
                break;
            case 'dc_circuit':
            case 'current_electricity':
                simInstanceRef.current = createDCCircuitSimulation(simParams);
                break;
            case 'lorentz_force':
            case 'magnetism':
                simInstanceRef.current = createLorentzForceSimulation(simParams);
                break;
            case 'lcr_circuit':
            case 'ac':
                simInstanceRef.current = createLCRCircuitSimulation(simParams);
                break;
            case 'ray_optics':
            case 'optics':
                simInstanceRef.current = createRayOpticsSimulation(simParams);
                break;
            case 'ydse':
            case 'wave_optics':
                simInstanceRef.current = createYDSESimulation(simParams);
                break;
            case 'bohr_atom':
            case 'modern_physics':
                simInstanceRef.current = createBohrAtomSimulation(simParams);
                break;
            default:
                simInstanceRef.current = createProjectileSimulation(simParams);
        }

        if (onSimUpdate && simInstanceRef.current) {
            onSimUpdate(simInstanceRef.current);
        }
    }, [simType, simParams, onSimUpdate]);

    // Canvas render and animation loop
    const renderSimulation = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Dark Canvas Background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        // Grid lines (subtle blueprint grid)
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const sim = simInstanceRef.current;
        const t = timeRef.current;

        if (!sim) return;

        // ─── 1. PROJECTILE MOTION RENDER ─────────────────────────
        if (sim.type === 'projectile') {
            const originX = 50;
            const originY = h - 60;
            const scaleX = Math.min((w - 100) / Math.max(10, sim.horizontalRange * 1.15), 18);
            const scaleY = Math.min((h - 120) / Math.max(10, sim.maxApexHeight * 1.3), 18);
            const scale = Math.min(scaleX, scaleY);

            // Ground line
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(20, originY);
            ctx.lineTo(w - 20, originY);
            ctx.stroke();

            // Parabolic Trajectory dotted path
            const trajPoints = sim.getTrajectoryPoints(100);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            trajPoints.forEach((pt, i) => {
                const px = originX + pt.x * scale;
                const py = originY - pt.y * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
            ctx.setLineDash([]);

            // Current Projectile Position & State
            const state = sim.getStateAt(t % (sim.timeOfFlight + 1.5));
            const ballX = originX + state.x * scale;
            const ballY = originY - state.y * scale;

            // Velocity Vector v (Blue #38bdf8)
            const vVectorLen = 40;
            const vAngleRad = (state.currentAngleDeg * Math.PI) / 180;
            const toVx = ballX + vVectorLen * Math.cos(vAngleRad);
            const toVy = ballY - vVectorLen * Math.sin(vAngleRad);
            drawVectorArrow(ctx, ballX, ballY, toVx, toVy, '#38bdf8', 'v', `(${state.speed.toFixed(1)} m/s)`);

            // Velocity Components: vx (horizontal Cyan), vy (vertical Emerald)
            const toCompX = ballX + (state.vx / sim.u) * 35;
            const toCompY = ballY - (state.vy / sim.u) * 35;
            drawVectorArrow(ctx, ballX, ballY, toCompX, ballY, 'rgba(6, 182, 212, 0.8)', 'v_x');
            drawVectorArrow(ctx, ballX, ballY, ballX, toCompY, 'rgba(16, 185, 129, 0.8)', 'v_y');

            // Gravity vector g (Red #ef4444)
            drawVectorArrow(ctx, ballX, ballY, ballX, ballY + 28, '#ef4444', 'g', '9.8 m/s²');

            // Projectile Ball Glow & Body
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#818cf8';
            ctx.beginPath();
            ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Range & Apex Markers
            const rangeX = originX + sim.horizontalRange * scale;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px ui-sans-serif, system-ui';
            ctx.fillText(`R = ${sim.horizontalRange.toFixed(1)} m`, rangeX - 25, originY + 18);
            ctx.fillText(`H_max = ${sim.maxApexHeight.toFixed(1)} m`, originX + (sim.horizontalRange * scale) / 2 - 25, originY - sim.maxApexHeight * scale - 8);
        }

        // ─── 2. INCLINED PLANE & FBD RENDER ───────────────────────
        else if (sim.type === 'inclined_plane') {
            const rad = (sim.angleDeg * Math.PI) / 180;
            const baseLen = Math.min(w * 0.75, 420);
            const wedgeH = baseLen * Math.tan(rad);
            const startX = 60;
            const startY = h - 60;

            // Incline Wedge
            ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + baseLen, startY);
            ctx.lineTo(startX + baseLen, startY - wedgeH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Angle arc
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(startX, startY, 40, -rad, 0);
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 12px ui-sans-serif';
            ctx.fillText(`θ = ${sim.angleDeg}°`, startX + 46, startY - 12);

            // Block position along hypotenuse
            const hypLen = baseLen / Math.cos(rad);
            const state = sim.getStateAt(t % (sim.timeToBottom + 2));
            const frac = sim.timeToBottom > 0 ? (state.distance / sim.planeLength) : 0;
            const blockHypDist = (1 - frac) * hypLen * 0.85 + hypLen * 0.08;

            const blockCx = startX + blockHypDist * Math.cos(rad);
            const blockCy = startY - blockHypDist * Math.sin(rad);

            // Draw Block rotated along incline
            ctx.save();
            ctx.translate(blockCx, blockCy);
            ctx.rotate(-rad);
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            const bw = 45, bh = 30;
            ctx.fillRect(-bw / 2, -bh, bw, bh);
            ctx.strokeRect(-bw / 2, -bh, bw, bh);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 11px ui-sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`m=${sim.mass}kg`, 0, -bh / 2 + 4);
            ctx.restore();

            // Vector Force Arrows on Free Body Diagram:
            // 1. Gravity mg (straight down)
            drawVectorArrow(ctx, blockCx, blockCy, blockCx, blockCy + 55, '#ef4444', 'mg', `(${(sim.mg).toFixed(0)} N)`);
            // 2. Normal force N (perpendicular to surface, away from plane)
            const nx = blockCx - 45 * Math.sin(rad);
            const ny = blockCy - 45 * Math.cos(rad);
            drawVectorArrow(ctx, blockCx, blockCy, nx, ny, '#10b981', 'N', `(${(sim.normalForce).toFixed(0)} N)`);
            // 3. Friction force f (up the plane)
            const fx = blockCx + 35 * Math.cos(rad);
            const fy = blockCy - 35 * Math.sin(rad);
            drawVectorArrow(ctx, blockCx, blockCy, fx, fy, '#a855f7', 'f_r', `(${(sim.frictionForce).toFixed(1)} N)`);

            // Acceleration arrow if sliding
            if (sim.acceleration > 0) {
                const ax = blockCx - 35 * Math.cos(rad);
                const ay = blockCy + 35 * Math.sin(rad);
                drawVectorArrow(ctx, blockCx - 30 * Math.sin(rad), blockCy - 30 * Math.cos(rad), ax - 30 * Math.sin(rad), ay - 30 * Math.cos(rad), '#38bdf8', 'a', `${sim.acceleration.toFixed(2)} m/s²`);
            }
        }

        // ─── 3. SIMPLE HARMONIC MOTION (SHM) ──────────────────────
        else if (sim.type === 'shm') {
            const state = sim.getStateAt(t);

            if (sim.mode === 'spring') {
                // Horizontal Spring-Mass
                const wallX = 60;
                const groundY = h / 2 + 50;
                const eqX = w / 2;
                const massX = eqX + state.displacement * 120;

                // Wall & Ground
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(wallX, groundY - 80);
                ctx.lineTo(wallX, groundY);
                ctx.lineTo(w - 40, groundY);
                ctx.stroke();

                // Spring Coils (Zig-zag)
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(wallX, groundY - 25);
                const coils = 12;
                const springLen = massX - wallX - 30;
                for (let i = 0; i <= coils; i++) {
                    const cx = wallX + (i / coils) * springLen;
                    const cy = groundY - 25 + (i % 2 === 0 ? -12 : 12);
                    ctx.lineTo(cx, cy);
                }
                ctx.lineTo(massX - 25, groundY - 25);
                ctx.stroke();

                // Mass Block
                const bw = 50, bh = 50;
                ctx.fillStyle = '#06b6d4';
                ctx.strokeStyle = '#0891b2';
                ctx.lineWidth = 2;
                ctx.fillRect(massX - bw / 2, groundY - bh, bw, bh);
                ctx.strokeRect(massX - bw / 2, groundY - bh, bw, bh);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px ui-sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${sim.mass} kg`, massX, groundY - bh / 2 + 4);

                // Velocity vector
                drawVectorArrow(ctx, massX, groundY - bh - 8, massX + state.velocity * 18, groundY - bh - 8, '#38bdf8', 'v');
                // Restoring force vector F = -kx
                drawVectorArrow(ctx, massX, groundY - bh - 26, massX - state.displacement * 35, groundY - bh - 26, '#ef4444', 'F = -kx');

                // Energy Bar Graph (Kinetic vs Potential)
                const barW = 120, barH = 12;
                const barX = w - barW - 40;
                const barY = 40;
                const kRatio = sim.amplitude > 0 ? (state.kineticEnergy / (state.totalEnergy || 1)) : 0;
                ctx.fillStyle = '#334155';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = '#38bdf8'; // Kinetic
                ctx.fillRect(barX, barY, barW * kRatio, barH);
                ctx.fillStyle = '#ef4444'; // Potential
                ctx.fillRect(barX + barW * kRatio, barY, barW * (1 - kRatio), barH);
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px ui-sans-serif';
                ctx.fillText(`E_k (Blue) / E_p (Red)`, barX, barY + barH + 14);
            } else {
                // Simple Pendulum
                const pivotX = w / 2;
                const pivotY = 50;
                const pLen = Math.min(h * 0.6, 200);
                const bobX = pivotX + pLen * Math.sin(state.displacement);
                const bobY = pivotY + pLen * Math.cos(state.displacement);

                // Ceiling support
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(pivotX - 40, pivotY);
                ctx.lineTo(pivotX + 40, pivotY);
                ctx.stroke();

                // String
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(pivotX, pivotY);
                ctx.lineTo(bobX, bobY);
                ctx.stroke();

                // Bob
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(bobX, bobY, 14, 0, Math.PI * 2);
                ctx.fill();

                // Tension vector T along string
                const tx = bobX - 35 * Math.sin(state.displacement);
                const ty = bobY - 35 * Math.cos(state.displacement);
                drawVectorArrow(ctx, bobX, bobY, tx, ty, '#10b981', 'T');
                // Gravity vector mg
                drawVectorArrow(ctx, bobX, bobY, bobX, bobY + 38, '#ef4444', 'mg');
            }
        }

        // ─── 4. RAY OPTICS (CONVEX & CONCAVE LENS/MIRROR) ──────────
        else if (sim.type === 'ray_optics') {
            const optY = h / 2;
            const lensX = w / 2;
            const scale = 5.5; // pixels per cm

            // Principal Optical Axis
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(20, optY);
            ctx.lineTo(w - 20, optY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Lens / Mirror vertical plane
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(lensX, optY - 90);
            ctx.lineTo(lensX, optY + 90);
            ctx.stroke();

            // Lens shape arrowheads (Double arrow for convex, inverted for concave)
            if (sim.lensType === 'convex') {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(lensX, optY - 95);
                ctx.lineTo(lensX - 6, optY - 82);
                ctx.lineTo(lensX + 6, optY - 82);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(lensX, optY + 95);
                ctx.lineTo(lensX - 6, optY + 82);
                ctx.lineTo(lensX + 6, optY + 82);
                ctx.closePath();
                ctx.fill();
            }

            // Focal Points F1 & F2
            const fDist = Math.abs(sim.f) * scale;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(lensX - fDist, optY, 3.5, 0, Math.PI * 2);
            ctx.arc(lensX + fDist, optY, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 11px ui-sans-serif';
            ctx.fillText('F₁', lensX - fDist - 5, optY + 16);
            ctx.fillText('F₂', lensX + fDist - 5, optY + 16);

            // Object Arrow (Left of lens)
            const objX = lensX + sim.u * scale; // u is negative
            const objTopY = optY - sim.ho * scale;
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(objX, optY);
            ctx.lineTo(objX, objTopY);
            ctx.stroke();
            // Arrowhead on Object
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.moveTo(objX, objTopY);
            ctx.lineTo(objX - 4, objTopY + 8);
            ctx.lineTo(objX + 4, objTopY + 8);
            ctx.closePath();
            ctx.fill();
            ctx.fillText(`Object (h=${sim.ho}cm)`, objX - 30, objTopY - 10);

            // Image Arrow (if real/virtual formed)
            if (isFinite(sim.v)) {
                const imgX = lensX + sim.v * scale;
                const imgTopY = optY - sim.hi * scale;
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(imgX, optY);
                ctx.lineTo(imgX, imgTopY);
                ctx.stroke();
                // Arrowhead on Image
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(imgX, imgTopY);
                const dir = sim.hi >= 0 ? 1 : -1;
                ctx.lineTo(imgX - 4, imgTopY + 8 * dir);
                ctx.lineTo(imgX + 4, imgTopY + 8 * dir);
                ctx.closePath();
                ctx.fill();
                ctx.fillText(`Image (v=${sim.v}cm)`, imgX - 25, optY + (sim.hi >= 0 ? -sim.hi * scale - 10 : -sim.hi * scale + 15));

                // 3 Principal Light Rays:
                // Ray 1: Parallel to axis, refracts through F2
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(objX, objTopY);
                ctx.lineTo(lensX, objTopY);
                ctx.lineTo(imgX, imgTopY);
                ctx.stroke();

                // Ray 2: Passes straight through optical center O
                ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(objX, objTopY);
                ctx.lineTo(lensX, optY);
                ctx.lineTo(imgX, imgTopY);
                ctx.stroke();
            }
        }

        // ─── 5. GRAVITATION ORBIT ──────────────────────────────────
        else if (sim.type === 'orbit') {
            const cx = w / 2;
            const cy = h / 2;
            const orbitR = Math.min(w, h) * 0.35;

            // Orbit path
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Central Planet (Earth Blue)
            ctx.fillStyle = '#2563eb';
            ctx.beginPath();
            ctx.arc(cx, cy, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#93c5fd';
            ctx.font = 'bold 11px ui-sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('M_Earth', cx, cy + 4);

            // Satellite Position
            const state = sim.getStateAt(t);
            const satAngle = (state.angleDeg * Math.PI) / 180;
            const satX = cx + orbitR * Math.cos(satAngle);
            const satY = cy - orbitR * Math.sin(satAngle);

            // Velocity vector (tangential)
            const vx = satX - 35 * Math.sin(satAngle);
            const vy = satY - 35 * Math.cos(satAngle);
            drawVectorArrow(ctx, satX, satY, vx, vy, '#38bdf8', 'v', `${(sim.orbitalSpeed / 1000).toFixed(1)} km/s`);

            // Centripetal gravitational force vector (towards center)
            const fx = satX - 35 * Math.cos(satAngle);
            const fy = satY + 35 * Math.sin(satAngle);
            drawVectorArrow(ctx, satX, satY, fx, fy, '#ef4444', 'F_g');

            // Satellite body
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(satX, satY, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // ─── 6. LCR SERIES CIRCUIT & PHASOR DIAGRAM ───────────────
        else if (sim.type === 'lcr_circuit') {
            const phasorCx = w * 0.35;
            const phasorCy = h / 2;
            const radius = 80;

            // Phasor Axes
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(phasorCx - 100, phasorCy);
            ctx.lineTo(phasorCx + 100, phasorCy);
            ctx.moveTo(phasorCx, phasorCy - 100);
            ctx.lineTo(phasorCx, phasorCy + 100);
            ctx.stroke();

            // Phasor Vectors:
            // VR along +X (Current direction)
            drawVectorArrow(ctx, phasorCx, phasorCy, phasorCx + radius * 0.7, phasorCy, '#10b981', 'V_R', 'IR');
            // VL along +Y (leads by 90 deg)
            const vlLen = Math.min(90, (sim.XL / (sim.Z || 1)) * radius);
            drawVectorArrow(ctx, phasorCx, phasorCy, phasorCx, phasorCy - vlLen, '#ef4444', 'V_L', 'IX_L');
            // VC along -Y (lags by 90 deg)
            const vcLen = Math.min(90, (sim.XC / (sim.Z || 1)) * radius);
            drawVectorArrow(ctx, phasorCx, phasorCy, phasorCx, phasorCy + vcLen, '#06b6d4', 'V_C', 'IX_C');

            // Resultant Voltage V0
            const phaseRad = (sim.phaseDeg * Math.PI) / 180;
            const v0x = phasorCx + radius * Math.cos(phaseRad);
            const v0y = phasorCy - radius * Math.sin(phaseRad);
            drawVectorArrow(ctx, phasorCx, phasorCy, v0x, v0y, '#f59e0b', 'V_0', `${sim.phaseDeg}°`);

            // Frequency resonance curve on right
            const curveX = w * 0.62;
            const curveY = h - 60;
            const curveW = w * 0.32;
            const curveH = 120;

            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(curveX, curveY);
            ctx.lineTo(curveX + curveW, curveY);
            ctx.moveTo(curveX, curveY);
            ctx.lineTo(curveX, curveY - curveH);
            ctx.stroke();

            // Resonance curve (Lorentzian peak at f0)
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let px = 0; px <= curveW; px += 2) {
                const freq = sim.f0 * (0.2 + (px / curveW) * 1.6);
                const delta = (freq - sim.f0);
                const iPeak = 1 / Math.sqrt(1 + delta * delta * 0.05);
                const py = curveY - iPeak * (curveH - 15);
                if (px === 0) ctx.moveTo(curveX + px, py);
                else ctx.lineTo(curveX + px, py);
            }
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '10px ui-sans-serif';
            ctx.fillText(`f_0 = ${sim.f0} Hz (Peak Resonance)`, curveX + curveW / 2 - 40, curveY + 16);
        }

        // ─── 7. BOHR ATOM TRANSITIONS ──────────────────────────────
        else if (sim.type === 'bohr_atom') {
            const cx = w / 2;
            const cy = h / 2;

            // Nucleus (Positive Proton)
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px ui-sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('+Ze', cx, cy + 4);

            // Electron Energy Level Shells
            const maxN = 5;
            const baseR = 30;
            for (let n = 1; n <= maxN; n++) {
                const rShell = baseR + n * 24;
                const isInitial = n === sim.n_initial;
                const isFinal = n === sim.n_final;

                ctx.strokeStyle = isInitial ? '#38bdf8' : isFinal ? '#10b981' : 'rgba(71, 85, 105, 0.4)';
                ctx.lineWidth = isInitial || isFinal ? 2.5 : 1;
                ctx.setLineDash(isInitial || isFinal ? [4, 2] : [2, 2]);
                ctx.beginPath();
                ctx.arc(cx, cy, rShell, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px ui-sans-serif';
                ctx.fillText(`n=${n}`, cx + rShell + 8, cy);
            }

            // Emitted Photon Wave Transition
            const rInit = baseR + sim.n_initial * 24;
            const rFin = baseR + sim.n_final * 24;
            drawVectorArrow(ctx, cx, cy - rInit, cx, cy - rFin, '#f59e0b', `hν (λ=${sim.wavelength_nm} nm)`);
        }

        // Generic Heads-Up Display (HUD)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(14, 14, 180, 56, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px ui-sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`⚛️ Physics Space 60 FPS`, 24, 32);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-sans-serif';
        ctx.fillText(`Time t = ${t.toFixed(2)}s | Speed: ${timeScale}x`, 24, 52);

    }, [timeScale]);

    // Animation Ticker
    useEffect(() => {
        let isActive = true;

        const loop = (timestamp) => {
            if (!isActive) return;

            if (lastTimestampRef.current !== null && isPlaying) {
                const dt = (timestamp - lastTimestampRef.current) / 1000;
                timeRef.current += dt * timeScale;
            }
            lastTimestampRef.current = timestamp;

            renderSimulation();
            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            isActive = false;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isPlaying, timeScale, renderSimulation]);

    return (
        <div className={`relative w-full h-full min-h-[360px] select-none ${className}`}>
            <canvas
                ref={canvasRef}
                width={640}
                height={420}
                className="w-full h-full rounded-2xl border border-slate-800 shadow-2xl bg-slate-950 block"
            />
        </div>
    );
}
