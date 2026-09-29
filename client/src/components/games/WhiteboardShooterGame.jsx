'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Heart, X, Play, RotateCcw, Trophy, Pause } from 'lucide-react';

// ─── Level Configuration ─────────────────────────────────────────────────────
const LEVELS = [
    { enemies: 3,  speed: 1.0, fireInterval: 99999, bosses: 0, bossHp: 3, label: 'Tutorial' },
    { enemies: 4,  speed: 1.2, fireInterval: 2000,  bosses: 0, bossHp: 3, label: '' },
    { enemies: 5,  speed: 1.4, fireInterval: 1500,  bosses: 0, bossHp: 3, label: '' },
    { enemies: 6,  speed: 1.6, fireInterval: 1500,  bosses: 0, bossHp: 3, label: '1 Fast Enemy' },
    { enemies: 7,  speed: 1.8, fireInterval: 1200,  bosses: 1, bossHp: 3, label: 'Boss!' },
    { enemies: 8,  speed: 2.0, fireInterval: 1000,  bosses: 0, bossHp: 3, label: '' },
    { enemies: 9,  speed: 2.2, fireInterval: 1000,  bosses: 0, bossHp: 3, label: '2 Fast' },
    { enemies: 10, speed: 2.4, fireInterval: 800,   bosses: 2, bossHp: 3, label: '2 Bosses' },
    { enemies: 12, speed: 2.6, fireInterval: 600,   bosses: 3, bossHp: 3, label: '3 Bosses' },
    { enemies: 15, speed: 3.0, fireInterval: 500,   bosses: 1, bossHp: 5, label: 'FINAL BOSS' },
];

const PLAYER_SIZE = 24;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 8;
const BULLET_R = 4;
const ENEMY_BULLET_SPEED = 4;
const ENEMY_BULLET_R = 3;
const GOAL_SIZE = 36;

export default function WhiteboardShooterGame({ obstacles: initObstacles, collectibles, canvasWidth, canvasHeight, onExit }) {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);     // mutable game state
    const rafRef = useRef(null);
    const keysRef = useRef(new Set());
    const mouseRef = useRef({ x: 0, y: 0, down: false });
    const lastShotRef = useRef(0);
    const shakeRef = useRef({ x: 0, y: 0, t: 0 });

    const [gameState, setGameState] = useState('ready');  // ready, playing, paused, levelComplete, gameOver, victory
    const [displayScore, setDisplayScore] = useState(0);
    const [displayLevel, setDisplayLevel] = useState(1);
    const [displayHP, setDisplayHP] = useState(3);
    const [displayEnemiesLeft, setDisplayEnemiesLeft] = useState(0);
    const [levelScoreBreakdown, setLevelScoreBreakdown] = useState(null);

    // ─── Scale game world to viewport ────────────────────────────────────
    const getScale = useCallback(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        return Math.min(vw / canvasWidth, vh / canvasHeight);
    }, [canvasWidth, canvasHeight]);

    // ─── Initialize / Reset Game State ───────────────────────────────────
    const initGame = useCallback((level = 1, score = 0) => {
        const cfg = LEVELS[level - 1];
        const enemies = [];
        const margin = 60;

        // Spawn regular enemies in top half
        for (let i = 0; i < cfg.enemies - cfg.bosses; i++) {
            let ex, ey, attempts = 0;
            do {
                ex = margin + Math.random() * (canvasWidth - margin * 2);
                ey = margin + Math.random() * (canvasHeight / 2 - margin);
                attempts++;
            } while (attempts < 50 && initObstacles.some(o => rectsOverlap(ex - 14, ey - 14, 28, 28, o.x, o.y, o.w, o.h)));

            const isFast = (level === 4 && i === 0) || (level === 7 && i < 2);
            enemies.push({
                id: `e_${i}`,
                x: ex, y: ey, r: 14,
                hp: 1, maxHp: 1,
                speed: cfg.speed * (isFast ? 1.8 : 1),
                fireInterval: cfg.fireInterval,
                lastShot: Date.now(),
                dx: (Math.random() - 0.5) * 2,
                dy: (Math.random() - 0.5) * 2,
                dirChangeTime: Date.now() + 1000 + Math.random() * 2000,
                color: isFast ? '#f97316' : '#ef4444',
                isBoss: false,
            });
        }

        // Spawn bosses in center
        for (let i = 0; i < cfg.bosses; i++) {
            const bx = canvasWidth / 2 + (i - cfg.bosses / 2) * 80;
            const by = canvasHeight * 0.3 + Math.random() * 100;
            enemies.push({
                id: `boss_${i}`,
                x: bx, y: by, r: 20,
                hp: cfg.bossHp, maxHp: cfg.bossHp,
                speed: cfg.speed * 0.7,
                fireInterval: cfg.fireInterval * 0.8,
                lastShot: Date.now(),
                dx: (Math.random() - 0.5) * 2,
                dy: (Math.random() - 0.5) * 2,
                dirChangeTime: Date.now() + 1500 + Math.random() * 2000,
                color: '#f59e0b',
                isBoss: true,
            });
        }

        // Clone obstacles with HP
        const obs = initObstacles.map(o => ({ ...o, hp: o.hp === Infinity ? Infinity : o.hp }));

        gameRef.current = {
            player: { x: 80, y: canvasHeight - 80, hp: 3, maxHp: 3 },
            enemies,
            playerBullets: [],
            enemyBullets: [],
            particles: [],
            obstacles: obs,
            goal: { x: canvasWidth - 100, y: 80, size: GOAL_SIZE, pulse: 0 },
            level,
            score,
            levelKills: 0,
            levelObsDestroyed: 0,
            allEnemiesKilled: false,
            flashTimer: 0,
        };

        setDisplayScore(score);
        setDisplayLevel(level);
        setDisplayHP(3);
        setDisplayEnemiesLeft(enemies.length);
    }, [canvasWidth, canvasHeight, initObstacles]);

    // ─── Collision Helpers ────────────────────────────────────────────────
    function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - closestX;
        const dy = cy - closestY;
        return (dx * dx + dy * dy) < (cr * cr);
    }

    function canMove(x, y, w, h, obs) {
        if (x < 0 || y < 0 || x + w > canvasWidth || y + h > canvasHeight) return false;
        for (const o of obs) {
            if (o.hp <= 0) continue;
            if (rectsOverlap(x, y, w, h, o.x, o.y, o.w, o.h)) return false;
        }
        return true;
    }

    // ─── Particles ───────────────────────────────────────────────────────
    function spawnParticles(g, x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            g.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color,
                life: 30 + Math.random() * 15,
                maxLife: 45,
            });
        }
    }

    // ─── Game Loop ───────────────────────────────────────────────────────
    const gameLoop = useCallback(() => {
        const g = gameRef.current;
        if (!g) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scale = getScale();
        const now = Date.now();

        // ─── Update ──────────────────────────────────────────────
        const keys = keysRef.current;
        const p = g.player;

        // Player movement
        let dx = 0, dy = 0;
        if (keys.has('w') || keys.has('arrowup'))    dy -= PLAYER_SPEED;
        if (keys.has('s') || keys.has('arrowdown'))  dy += PLAYER_SPEED;
        if (keys.has('a') || keys.has('arrowleft'))  dx -= PLAYER_SPEED;
        if (keys.has('d') || keys.has('arrowright')) dx += PLAYER_SPEED;
        if (dx && dy) { dx *= 0.707; dy *= 0.707; }

        if (dx && canMove(p.x + dx, p.y, PLAYER_SIZE, PLAYER_SIZE, g.obstacles)) p.x += dx;
        if (dy && canMove(p.x, p.y + dy, PLAYER_SIZE, PLAYER_SIZE, g.obstacles)) p.y += dy;

        // Player shooting
        if ((mouseRef.current.down || keys.has(' ')) && now - lastShotRef.current > 200) {
            lastShotRef.current = now;
            const mx = mouseRef.current.x / scale;
            const my = mouseRef.current.y / scale;
            const pcx = p.x + PLAYER_SIZE / 2;
            const pcy = p.y + PLAYER_SIZE / 2;
            const angle = Math.atan2(my - pcy, mx - pcx);
            g.playerBullets.push({
                x: pcx, y: pcy,
                vx: Math.cos(angle) * BULLET_SPEED,
                vy: Math.sin(angle) * BULLET_SPEED,
            });
        }

        // Update player bullets
        for (let i = g.playerBullets.length - 1; i >= 0; i--) {
            const b = g.playerBullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // Out of bounds
            if (b.x < -10 || b.x > canvasWidth + 10 || b.y < -10 || b.y > canvasHeight + 10) {
                g.playerBullets.splice(i, 1);
                continue;
            }

            // Hit obstacles
            let hitObs = false;
            for (const o of g.obstacles) {
                if (o.hp <= 0) continue;
                if (circleRectOverlap(b.x, b.y, BULLET_R, o.x, o.y, o.w, o.h)) {
                    g.playerBullets.splice(i, 1);
                    hitObs = true;
                    if (o.type !== 'wall') {
                        o.hp--;
                        g.score += o.type === 'partial' ? 25 : 0;
                        if (o.hp <= 0) {
                            spawnParticles(g, o.x + o.w / 2, o.y + o.h / 2, o.color, 10);
                            g.score += 50;
                            g.levelObsDestroyed++;
                        }
                    }
                    break;
                }
            }
            if (hitObs) continue;

            // Hit enemies
            for (let j = g.enemies.length - 1; j >= 0; j--) {
                const e = g.enemies[j];
                const edx = b.x - e.x;
                const edy = b.y - e.y;
                if (edx * edx + edy * edy < (BULLET_R + e.r) * (BULLET_R + e.r)) {
                    g.playerBullets.splice(i, 1);
                    e.hp--;
                    if (e.hp <= 0) {
                        spawnParticles(g, e.x, e.y, e.color, 12);
                        g.enemies.splice(j, 1);
                        g.score += 100;
                        g.levelKills++;
                    } else {
                        g.flashTimer = 5;
                    }
                    break;
                }
            }
        }

        // Update enemies
        for (const e of g.enemies) {
            const distToPlayer = Math.hypot(e.x - (p.x + PLAYER_SIZE / 2), e.y - (p.y + PLAYER_SIZE / 2));

            // AI: chase player if close, otherwise wander
            if (distToPlayer < 300) {
                const angle = Math.atan2(p.y + PLAYER_SIZE / 2 - e.y, p.x + PLAYER_SIZE / 2 - e.x);
                e.dx = Math.cos(angle);
                e.dy = Math.sin(angle);
            } else if (now > e.dirChangeTime) {
                e.dx = (Math.random() - 0.5) * 2;
                e.dy = (Math.random() - 0.5) * 2;
                e.dirChangeTime = now + 1000 + Math.random() * 2000;
            }

            const newX = e.x + e.dx * e.speed;
            const newY = e.y + e.dy * e.speed;
            const er = e.r;

            // Bounds check
            if (newX - er >= 0 && newX + er <= canvasWidth &&
                !g.obstacles.some(o => o.hp > 0 && circleRectOverlap(newX, e.y, er, o.x, o.y, o.w, o.h))) {
                e.x = newX;
            } else {
                e.dx = -e.dx;
            }
            if (newY - er >= 0 && newY + er <= canvasHeight &&
                !g.obstacles.some(o => o.hp > 0 && circleRectOverlap(e.x, newY, er, o.x, o.y, o.w, o.h))) {
                e.y = newY;
            } else {
                e.dy = -e.dy;
            }

            // Enemy shooting
            if (now - e.lastShot > e.fireInterval) {
                e.lastShot = now;
                const angle = Math.atan2(p.y + PLAYER_SIZE / 2 - e.y, p.x + PLAYER_SIZE / 2 - e.x);

                if (e.isBoss && e.maxHp >= 5) {
                    // Spread shot
                    for (let s = -1; s <= 1; s++) {
                        const a = angle + s * 0.3;
                        g.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * ENEMY_BULLET_SPEED, vy: Math.sin(a) * ENEMY_BULLET_SPEED });
                    }
                } else {
                    g.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED });
                }
            }

            // Enemy-player collision
            if (circleRectOverlap(e.x, e.y, er, p.x, p.y, PLAYER_SIZE, PLAYER_SIZE)) {
                p.hp--;
                shakeRef.current = { x: 0, y: 0, t: 10 };
                // Push player away
                const pushAngle = Math.atan2(p.y - e.y, p.x - e.x);
                p.x += Math.cos(pushAngle) * 30;
                p.y += Math.sin(pushAngle) * 30;
                p.x = Math.max(0, Math.min(canvasWidth - PLAYER_SIZE, p.x));
                p.y = Math.max(0, Math.min(canvasHeight - PLAYER_SIZE, p.y));
            }
        }

        // Update enemy bullets
        for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
            const b = g.enemyBullets[i];
            b.x += b.vx;
            b.y += b.vy;

            if (b.x < -10 || b.x > canvasWidth + 10 || b.y < -10 || b.y > canvasHeight + 10) {
                g.enemyBullets.splice(i, 1);
                continue;
            }

            // Hit obstacle
            if (g.obstacles.some(o => o.hp > 0 && circleRectOverlap(b.x, b.y, ENEMY_BULLET_R, o.x, o.y, o.w, o.h))) {
                g.enemyBullets.splice(i, 1);
                continue;
            }

            // Hit player
            if (circleRectOverlap(b.x, b.y, ENEMY_BULLET_R, p.x, p.y, PLAYER_SIZE, PLAYER_SIZE)) {
                g.enemyBullets.splice(i, 1);
                p.hp--;
                shakeRef.current = { x: 0, y: 0, t: 8 };
            }
        }

        // Collectibles (health pickups)
        if (g.collectiblesList === undefined) {
            g.collectiblesList = (collectibles || []).map(c => ({ ...c, alive: true }));
        }
        for (const c of g.collectiblesList) {
            if (!c.alive) continue;
            const pcx = p.x + PLAYER_SIZE / 2;
            const pcy = p.y + PLAYER_SIZE / 2;
            if (Math.hypot(pcx - c.x, pcy - c.y) < c.r + PLAYER_SIZE / 2) {
                c.alive = false;
                g.score += 20;
                if (p.hp < p.maxHp) p.hp++;
            }
        }

        // Update particles
        for (let i = g.particles.length - 1; i >= 0; i--) {
            const pt = g.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vx *= 0.96;
            pt.vy *= 0.96;
            pt.life--;
            if (pt.life <= 0) g.particles.splice(i, 1);
        }

        // Goal check
        g.allEnemiesKilled = g.enemies.length === 0;
        const goal = g.goal;
        goal.pulse = (goal.pulse + 0.05) % (Math.PI * 2);
        const pcx = p.x + PLAYER_SIZE / 2;
        const pcy = p.y + PLAYER_SIZE / 2;
        if (g.allEnemiesKilled && Math.hypot(pcx - goal.x, pcy - goal.y) < goal.size) {
            // Level complete
            const bonus = 500;
            const finalScore = g.score + bonus;
            setLevelScoreBreakdown({
                kills: g.levelKills,
                killScore: g.levelKills * 100,
                obsDestroyed: g.levelObsDestroyed,
                obsScore: g.levelObsDestroyed * 50,
                bonus,
                total: finalScore,
            });
            g.score = finalScore;
            setDisplayScore(finalScore);
            if (g.level >= 10) {
                setGameState('victory');
            } else {
                setGameState('levelComplete');
            }
            return;
        }

        // Shake decay
        if (shakeRef.current.t > 0) {
            shakeRef.current.t--;
            shakeRef.current.x = (Math.random() - 0.5) * shakeRef.current.t * 2;
            shakeRef.current.y = (Math.random() - 0.5) * shakeRef.current.t * 2;
        } else {
            shakeRef.current.x = 0;
            shakeRef.current.y = 0;
        }

        if (g.flashTimer > 0) g.flashTimer--;

        // Player death
        if (p.hp <= 0) {
            spawnParticles(g, p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2, '#06b6d4', 15);
            setDisplayScore(g.score);
            setGameState('gameOver');
            return;
        }

        // UI state sync
        setDisplayScore(g.score);
        setDisplayHP(p.hp);
        setDisplayEnemiesLeft(g.enemies.length);

        // ─── Draw ────────────────────────────────────────────────
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        canvas.width = vw;
        canvas.height = vh;

        ctx.save();
        ctx.translate(shakeRef.current.x, shakeRef.current.y);

        // Offset to center
        const drawScale = scale;
        const offsetX = (vw - canvasWidth * drawScale) / 2;
        const offsetY = (vh - canvasHeight * drawScale) / 2;
        ctx.translate(offsetX, offsetY);
        ctx.scale(drawScale, drawScale);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvasWidth; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
        }
        for (let y = 0; y < canvasHeight; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
        }

        // Obstacles
        for (const o of g.obstacles) {
            if (o.hp <= 0) continue;
            ctx.fillStyle = o.color;
            if (o.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(o.x + o.w / 2, o.y + o.h / 2, Math.min(o.w, o.h) / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = o.type === 'wall' ? '#475569' : '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else {
                ctx.fillRect(o.x, o.y, o.w, o.h);
                ctx.strokeStyle = o.type === 'wall' ? '#475569' : '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(o.x, o.y, o.w, o.h);
            }
            // Crack overlay for partial
            if (o.type === 'partial' && o.hp < o.maxHp) {
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 2;
                const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
                ctx.beginPath();
                ctx.moveTo(cx - o.w * 0.3, cy - o.h * 0.3);
                ctx.lineTo(cx + o.w * 0.2, cy + o.h * 0.1);
                ctx.lineTo(cx + o.w * 0.3, cy + o.h * 0.3);
                ctx.stroke();
                if (o.hp <= 1) {
                    ctx.beginPath();
                    ctx.moveTo(cx + o.w * 0.2, cy - o.h * 0.2);
                    ctx.lineTo(cx - o.w * 0.1, cy + o.h * 0.3);
                    ctx.stroke();
                }
            }
        }

        // Collectibles
        if (g.collectiblesList) {
            for (const c of g.collectiblesList) {
                if (!c.alive) continue;
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = `${Math.max(10, c.r)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('+', c.x, c.y);
            }
        }

        // Goal post
        if (g.allEnemiesKilled) {
            const gs = goal.size + Math.sin(goal.pulse) * 6;
            // Glow
            ctx.fillStyle = 'rgba(34,197,94,0.15)';
            ctx.beginPath();
            ctx.arc(goal.x, goal.y, gs * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Diamond
            ctx.fillStyle = '#22c55e';
            ctx.save();
            ctx.translate(goal.x, goal.y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-gs / 2, -gs / 2, gs, gs);
            ctx.restore();
            ctx.fillStyle = '#fff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL', goal.x, goal.y + goal.size + 20);
        } else {
            // Dim goal
            ctx.fillStyle = 'rgba(34,197,94,0.2)';
            ctx.save();
            ctx.translate(goal.x, goal.y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-goal.size / 3, -goal.size / 3, goal.size * 0.66, goal.size * 0.66);
            ctx.restore();
        }

        // Enemies
        for (const e of g.enemies) {
            // Boss glow
            if (e.isBoss) {
                ctx.fillStyle = 'rgba(245,158,11,0.15)';
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.r * 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = e.isBoss ? '#92400e' : '#991b1b';
            ctx.lineWidth = 2;
            ctx.stroke();
            // HP bar for bosses
            if (e.isBoss && e.hp < e.maxHp) {
                const barW = e.r * 2;
                const barH = 4;
                const barX = e.x - barW / 2;
                const barY = e.y - e.r - 10;
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
            }
        }

        // Player bullets
        ctx.fillStyle = '#fbbf24';
        for (const b of g.playerBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enemy bullets
        ctx.fillStyle = '#ef4444';
        for (const b of g.enemyBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, ENEMY_BULLET_R, 0, Math.PI * 2);
            ctx.fill();
        }

        // Player
        if (p.hp > 0) {
            ctx.fillStyle = g.flashTimer > 0 ? '#fff' : '#06b6d4';
            ctx.fillRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE);
            // Aim line
            const mx = mouseRef.current.x / drawScale - offsetX / drawScale;
            const my = mouseRef.current.y / drawScale - offsetY / drawScale;
            const aimAngle = Math.atan2(my - (p.y + PLAYER_SIZE / 2), mx - (p.x + PLAYER_SIZE / 2));
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2);
            ctx.lineTo(
                p.x + PLAYER_SIZE / 2 + Math.cos(aimAngle) * 30,
                p.y + PLAYER_SIZE / 2 + Math.sin(aimAngle) * 30
            );
            ctx.stroke();
        }

        // Particles
        for (const pt of g.particles) {
            const alpha = pt.life / pt.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        rafRef.current = requestAnimationFrame(gameLoop);
    }, [canvasWidth, canvasHeight, getScale, collectibles]);

    // ─── Start / Pause / Resume ──────────────────────────────────────────
    const startPlaying = useCallback(() => {
        if (!gameRef.current) initGame(1, 0);
        setGameState('playing');
    }, [initGame]);

    const nextLevel = useCallback(() => {
        const g = gameRef.current;
        initGame(g.level + 1, g.score);
        setGameState('playing');
    }, [initGame]);

    const restartGame = useCallback(() => {
        initGame(1, 0);
        setGameState('playing');
    }, [initGame]);

    // ─── Effects ─────────────────────────────────────────────────────────
    useEffect(() => {
        initGame(1, 0);
    }, [initGame]);

    useEffect(() => {
        if (gameState !== 'playing') {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }
        rafRef.current = requestAnimationFrame(gameLoop);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [gameState, gameLoop]);

    // Keyboard
    useEffect(() => {
        const onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
                e.preventDefault();
            }
            keysRef.current.add(key);
            if (key === 'escape') {
                setGameState(prev => prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev);
            }
            if (key === ' ' && gameState === 'ready') {
                startPlaying();
            }
        };
        const onKeyUp = (e) => {
            keysRef.current.delete(e.key.toLowerCase());
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [gameState, startPlaying]);

    // Mouse
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onMove = (e) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; };
        const onDown = (e) => {
            mouseRef.current.down = true;
            if (gameState === 'ready') startPlaying();
        };
        const onUp = () => { mouseRef.current.down = false; };
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mouseup', onUp);
        return () => {
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mousedown', onDown);
            canvas.removeEventListener('mouseup', onUp);
        };
    }, [gameState, startPlaying]);

    // ─── Render ──────────────────────────────────────────────────────────
    const hearts = [];
    for (let i = 0; i < 3; i++) {
        hearts.push(
            <Heart key={i} className={`w-5 h-5 ${i < displayHP ? 'text-red-500 fill-red-500' : 'text-slate-600'}`} />
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

            {/* HUD */}
            {gameState === 'playing' && (
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 pointer-events-none">
                    <div className="text-white font-bold text-lg">Score: {displayScore}</div>
                    <div className="text-center">
                        <div className="text-white font-bold">Level {displayLevel}</div>
                        <div className="text-slate-400 text-xs">{displayEnemiesLeft} enemies left</div>
                    </div>
                    <div className="flex items-center gap-1">{hearts}</div>
                </div>
            )}

            {/* Pause button */}
            {gameState === 'playing' && (
                <button
                    onClick={() => setGameState('paused')}
                    className="absolute top-3 right-3 p-2 bg-slate-800/80 rounded-full text-white hover:bg-slate-700 pointer-events-auto z-10"
                >
                    <Pause className="w-4 h-4" />
                </button>
            )}

            {/* Ready Screen */}
            {gameState === 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                    <div className="text-6xl mb-4">🔫</div>
                    <h1 className="text-4xl font-black text-white mb-2">Level {displayLevel}</h1>
                    <p className="text-slate-400 mb-1">{LEVELS[displayLevel - 1]?.label || ''}</p>
                    <p className="text-slate-500 text-sm mb-8">
                        {LEVELS[displayLevel - 1]?.enemies} enemies · {LEVELS[displayLevel - 1]?.bosses} boss(es)
                    </p>
                    <button onClick={startPlaying} className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition text-lg">
                        <Play className="w-5 h-5" /> Start
                    </button>
                    <p className="text-slate-600 text-xs mt-4">WASD/Arrows to move · Click/Space to shoot · Esc to pause</p>
                    <button onClick={onExit} className="mt-6 text-slate-500 hover:text-white text-sm transition">← Back to Whiteboard</button>
                </div>
            )}

            {/* Paused */}
            {gameState === 'paused' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                    <h1 className="text-4xl font-black text-white mb-8">PAUSED</h1>
                    <div className="flex gap-4">
                        <button onClick={() => setGameState('playing')} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition">
                            <Play className="w-5 h-5" /> Resume
                        </button>
                        <button onClick={onExit} className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition">
                            <X className="w-5 h-5" /> Exit
                        </button>
                    </div>
                </div>
            )}

            {/* Level Complete */}
            {gameState === 'levelComplete' && levelScoreBreakdown && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                    <div className="text-5xl mb-3">🎯</div>
                    <h1 className="text-3xl font-black text-green-400 mb-6">Level {displayLevel} Complete!</h1>
                    <div className="bg-slate-800 rounded-xl p-6 mb-6 min-w-[280px]">
                        <div className="flex justify-between text-slate-300 mb-2">
                            <span>Enemies Killed ({levelScoreBreakdown.kills})</span>
                            <span className="text-white font-bold">+{levelScoreBreakdown.killScore}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 mb-2">
                            <span>Obstacles Destroyed ({levelScoreBreakdown.obsDestroyed})</span>
                            <span className="text-white font-bold">+{levelScoreBreakdown.obsScore}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 mb-2">
                            <span>Level Bonus</span>
                            <span className="text-yellow-400 font-bold">+{levelScoreBreakdown.bonus}</span>
                        </div>
                        <hr className="border-slate-700 my-3" />
                        <div className="flex justify-between text-white font-black text-lg">
                            <span>Total Score</span>
                            <span>{levelScoreBreakdown.total}</span>
                        </div>
                    </div>
                    <button onClick={nextLevel} className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition text-lg">
                        Next Level →
                    </button>
                </div>
            )}

            {/* Game Over */}
            {gameState === 'gameOver' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                    <div className="text-5xl mb-3">💀</div>
                    <h1 className="text-4xl font-black text-red-500 mb-4">GAME OVER</h1>
                    <p className="text-slate-400 mb-6 text-lg">Score: <span className="text-white font-bold">{displayScore}</span></p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition">
                            <RotateCcw className="w-5 h-5" /> Try Again
                        </button>
                        <button onClick={onExit} className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition">
                            <X className="w-5 h-5" /> Exit
                        </button>
                    </div>
                </div>
            )}

            {/* Victory */}
            {gameState === 'victory' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                    <div className="text-6xl mb-3">🏆</div>
                    <h1 className="text-4xl font-black text-yellow-400 mb-4">VICTORY!</h1>
                    <p className="text-slate-300 mb-1 text-lg">All 10 levels cleared!</p>
                    <p className="text-white font-bold text-2xl mb-8">Final Score: {displayScore}</p>
                    <div className="flex gap-4">
                        <button onClick={restartGame} className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl transition">
                            <RotateCcw className="w-5 h-5" /> Play Again
                        </button>
                        <button onClick={onExit} className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition">
                            <X className="w-5 h-5" /> Exit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
