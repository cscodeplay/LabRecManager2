'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Play, RotateCcw, Trophy, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Level Configuration ─────────────────────────────────────────────────────
const LEVELS = [
    { fruitsNeeded: 5,  tickMs: 150, movingObs: 0, golden: false, label: '' },
    { fruitsNeeded: 7,  tickMs: 140, movingObs: 0, golden: false, label: '' },
    { fruitsNeeded: 8,  tickMs: 130, movingObs: 2, golden: false, label: 'Moving Obstacles!' },
    { fruitsNeeded: 10, tickMs: 120, movingObs: 2, golden: false, label: '' },
    { fruitsNeeded: 12, tickMs: 110, movingObs: 3, golden: false, label: '' },
    { fruitsNeeded: 14, tickMs: 100, movingObs: 3, golden: true,  label: 'Golden Fruit!' },
    { fruitsNeeded: 16, tickMs: 95,  movingObs: 4, golden: true,  label: '' },
    { fruitsNeeded: 18, tickMs: 90,  movingObs: 4, golden: true,  label: '' },
    { fruitsNeeded: 20, tickMs: 85,  movingObs: 5, golden: true,  label: '' },
    { fruitsNeeded: 25, tickMs: 80,  movingObs: 6, golden: true,  label: 'FINAL LEVEL' },
];

const CELL = 20;

export default function WhiteboardSnakeGame({ obstacles: initObstacles, collectibles, canvasWidth, canvasHeight, onExit }) {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const tickRef = useRef(null);
    const dirBufferRef = useRef(null); // buffered next direction
    const keysRef = useRef(new Set());
    const goldenTimerRef = useRef(null);
    const touchStartRef = useRef(null);

    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [gameState, setGameState] = useState('ready');
    const [displayScore, setDisplayScore] = useState(0);
    const [displayLevel, setDisplayLevel] = useState(1);
    const [displayLength, setDisplayLength] = useState(3);
    const [displayFruitsCollected, setDisplayFruitsCollected] = useState(0);
    const [displayFruitsNeeded, setDisplayFruitsNeeded] = useState(5);
    const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
    const [deathCause, setDeathCause] = useState('');
    const [levelScoreBreakdown, setLevelScoreBreakdown] = useState(null);

    const cols = Math.floor(canvasWidth / CELL);
    const rows = Math.floor(canvasHeight / CELL);

    // ─── Scale to viewport ───────────────────────────────────────────────
    const getScale = useCallback(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const gw = cols * CELL;
        const gh = rows * CELL;
        return Math.min(vw / gw, vh / gh);
    }, [cols, rows]);

    // ─── Build blocked grid ──────────────────────────────────────────────
    const buildBlockedSet = useCallback(() => {
        const blocked = new Set();
        for (const o of initObstacles) {
            if (o.hp <= 0) continue;
            const startCol = Math.floor(o.x / CELL);
            const endCol = Math.ceil((o.x + o.w) / CELL);
            const startRow = Math.floor(o.y / CELL);
            const endRow = Math.ceil((o.y + o.h) / CELL);
            for (let c = startCol; c < endCol; c++) {
                for (let r = startRow; r < endRow; r++) {
                    if (c >= 0 && c < cols && r >= 0 && r < rows) {
                        blocked.add(`${c},${r}`);
                    }
                }
            }
        }
        return blocked;
    }, [initObstacles, cols, rows]);

    // ─── Find free cell ──────────────────────────────────────────────────
    function findFreeCell(blocked, snakeCells, maxAttempts = 200) {
        for (let i = 0; i < maxAttempts; i++) {
            const c = Math.floor(Math.random() * (cols - 2)) + 1;
            const r = Math.floor(Math.random() * (rows - 2)) + 1;
            const key = `${c},${r}`;
            if (!blocked.has(key) && !snakeCells.has(key)) return { col: c, row: r };
        }
        return { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
    }

    // ─── Initialize Game ─────────────────────────────────────────────────
    const initGame = useCallback((level = 1, score = 0, multiplier = 1.0) => {
        const cfg = LEVELS[level - 1];
        const blocked = buildBlockedSet();

        // Snake starts at left-center
        const startCol = 5;
        const startRow = Math.floor(rows / 2);
        const snake = [
            { col: startCol, row: startRow },
            { col: startCol - 1, row: startRow },
            { col: startCol - 2, row: startRow },
        ];
        const snakeCells = new Set(snake.map(s => `${s.col},${s.row}`));

        // First fruit
        const fruit = findFreeCell(blocked, snakeCells);

        // Moving obstacles
        const movingObs = [];
        for (let i = 0; i < cfg.movingObs; i++) {
            const pos = findFreeCell(blocked, snakeCells);
            const dirs = [{ dc: 1, dr: 0 }, { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 }];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            movingObs.push({ col: pos.col, row: pos.row, dc: dir.dc, dr: dir.dr, tickCounter: 0 });
        }

        gameRef.current = {
            snake,
            direction: { dc: 1, dr: 0 }, // moving right
            fruit,
            goldenFruit: null,
            goldenTimer: 0,
            movingObs,
            blocked,
            level,
            score,
            multiplier,
            fruitsCollected: 0,
            goldenFruitsCollected: 0,
            fruitsNeeded: cfg.fruitsNeeded,
            tickCount: 0,
            deathScatter: null,
            maxLength: 3,
        };

        dirBufferRef.current = null;
        setDisplayScore(score);
        setDisplayLevel(level);
        setDisplayLength(3);
        setDisplayFruitsCollected(0);
        setDisplayFruitsNeeded(cfg.fruitsNeeded);
        setDisplayMultiplier(multiplier);
    }, [buildBlockedSet, cols, rows]);

    // ─── Game Tick ───────────────────────────────────────────────────────
    const gameTick = useCallback(() => {
        const g = gameRef.current;
        if (!g) return;

        // Apply buffered direction
        if (dirBufferRef.current) {
            const bd = dirBufferRef.current;
            // Prevent reversal
            if (!(bd.dc === -g.direction.dc && bd.dr === -g.direction.dr)) {
                g.direction = bd;
            }
            dirBufferRef.current = null;
        }

        g.tickCount++;

        // Move snake
        const head = g.snake[0];
        let newCol = head.col + g.direction.dc;
        let newRow = head.row + g.direction.dr;

        // Wrap around
        if (newCol < 0) newCol = cols - 1;
        if (newCol >= cols) newCol = 0;
        if (newRow < 0) newRow = rows - 1;
        if (newRow >= rows) newRow = 0;

        const newKey = `${newCol},${newRow}`;

        // Check wall collision
        if (g.blocked.has(newKey)) {
            setDeathCause('Hit a wall!');
            g.deathScatter = g.snake.map(s => ({
                col: s.col, row: s.row,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
            }));
            setDisplayScore(g.score);
            setGameState('gameOver');
            return;
        }

        // Check self collision
        if (g.snake.some(s => s.col === newCol && s.row === newRow)) {
            setDeathCause('Ate yourself!');
            g.deathScatter = g.snake.map(s => ({
                col: s.col, row: s.row,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
            }));
            setDisplayScore(g.score);
            setGameState('gameOver');
            return;
        }

        // Check moving obstacle collision
        if (g.movingObs.some(m => m.col === newCol && m.row === newRow)) {
            setDeathCause('Hit a moving obstacle!');
            g.deathScatter = g.snake.map(s => ({
                col: s.col, row: s.row,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
            }));
            setDisplayScore(g.score);
            setGameState('gameOver');
            return;
        }

        // Move: add new head
        g.snake.unshift({ col: newCol, row: newRow });

        // Check fruit
        let ate = false;
        if (newCol === g.fruit.col && newRow === g.fruit.row) {
            ate = true;
            const pts = Math.round(10 * g.multiplier);
            g.score += pts;
            g.fruitsCollected++;
            g.multiplier = Math.round((g.multiplier + 0.1) * 10) / 10;

            // New fruit
            const snakeCells = new Set(g.snake.map(s => `${s.col},${s.row}`));
            g.fruit = findFreeCell(g.blocked, snakeCells);
        }

        // Check golden fruit
        if (g.goldenFruit && newCol === g.goldenFruit.col && newRow === g.goldenFruit.row) {
            ate = true;
            const pts = Math.round(30 * g.multiplier);
            g.score += pts;
            g.goldenFruitsCollected++;
            g.multiplier = Math.round((g.multiplier + 0.1) * 10) / 10;
            g.goldenFruit = null;
            g.goldenTimer = 0;
        }

        // Remove tail if didn't eat
        if (!ate) {
            g.snake.pop();
        }

        if (g.snake.length > g.maxLength) g.maxLength = g.snake.length;

        // Golden fruit timer
        const cfg = LEVELS[g.level - 1];
        if (cfg.golden) {
            if (!g.goldenFruit && g.goldenTimer <= 0) {
                g.goldenTimer = 80 + Math.floor(Math.random() * 60); // 80-140 ticks
            }
            if (!g.goldenFruit) {
                g.goldenTimer--;
                if (g.goldenTimer <= 0) {
                    const snakeCells = new Set(g.snake.map(s => `${s.col},${s.row}`));
                    g.goldenFruit = { ...findFreeCell(g.blocked, snakeCells), life: 35 }; // ~5s at 100ms tick
                }
            } else {
                g.goldenFruit.life--;
                if (g.goldenFruit.life <= 0) {
                    g.goldenFruit = null;
                    g.goldenTimer = 60 + Math.floor(Math.random() * 40);
                }
            }
        }

        // Moving obstacles
        for (const m of g.movingObs) {
            m.tickCounter++;
            if (m.tickCounter >= 2) { // move every 2 ticks
                m.tickCounter = 0;
                const nc = m.col + m.dc;
                const nr = m.row + m.dr;
                const nk = `${nc},${nr}`;
                if (nc < 0 || nc >= cols || nr < 0 || nr >= rows || g.blocked.has(nk)) {
                    // Bounce
                    m.dc = -m.dc;
                    m.dr = -m.dr;
                } else {
                    m.col = nc;
                    m.row = nr;
                }

                // Check if moving obs hit snake head
                if (m.col === g.snake[0].col && m.row === g.snake[0].row) {
                    setDeathCause('Hit a moving obstacle!');
                    g.deathScatter = g.snake.map(s => ({
                        col: s.col, row: s.row,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 30,
                    }));
                    setDisplayScore(g.score);
                    setGameState('gameOver');
                    return;
                }
            }
        }

        // Level complete check
        if (g.fruitsCollected >= g.fruitsNeeded) {
            const bonus = 200;
            const finalScore = g.score + bonus;
            g.score = finalScore;
            setLevelScoreBreakdown({
                fruitsCollected: g.fruitsCollected,
                fruitScore: g.fruitsCollected * 10,
                goldenCollected: g.goldenFruitsCollected,
                goldenScore: g.goldenFruitsCollected * 30,
                bonus,
                multiplier: g.multiplier,
                total: finalScore,
            });
            setDisplayScore(finalScore);
            if (g.level >= 10) {
                setGameState('victory');
            } else {
                setGameState('levelComplete');
            }
            return;
        }

        // Sync UI
        setDisplayScore(g.score);
        setDisplayLength(g.snake.length);
        setDisplayFruitsCollected(g.fruitsCollected);
        setDisplayMultiplier(g.multiplier);
    }, [cols, rows]);

    // ─── Render (separate from tick, runs at 60fps) ──────────────────────
    const drawGame = useCallback(() => {
        const g = gameRef.current;
        const canvas = canvasRef.current;
        if (!g || !canvas) return;
        const ctx = canvas.getContext('2d');
        const scale = getScale();
        const gw = cols * CELL;
        const gh = rows * CELL;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        canvas.width = vw;
        canvas.height = vh;

        ctx.save();
        const offsetX = (vw - gw * scale) / 2;
        const offsetY = (vh - gh * scale) / 2;
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, gw, gh);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, gh); ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(gw, r * CELL); ctx.stroke();
        }

        // Obstacles (walls)
        for (const o of initObstacles) {
            if (o.hp <= 0) continue;
            ctx.fillStyle = o.color || '#1e293b';
            ctx.fillRect(o.x, o.y, o.w, o.h);
            // Brick pattern for walls
            if (o.type === 'wall') {
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 0.5;
                const midY = o.y + o.h / 2;
                ctx.beginPath(); ctx.moveTo(o.x, midY); ctx.lineTo(o.x + o.w, midY); ctx.stroke();
                const midX = o.x + o.w / 2;
                ctx.beginPath(); ctx.moveTo(midX, o.y); ctx.lineTo(midX, midY); ctx.stroke();
            }
            // Stripe pattern for breakable
            if (o.type === 'breakable' || o.type === 'partial') {
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(o.x, o.y + o.h);
                ctx.lineTo(o.x + o.w, o.y);
                ctx.stroke();
            }
        }

        // Moving obstacles
        for (const m of g.movingObs) {
            ctx.fillStyle = '#ef4444';
            const mx = m.col * CELL + 2;
            const my = m.row * CELL + 2;
            const ms = CELL - 4;
            ctx.fillRect(mx, my, ms, ms);
            // Direction arrow
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const arrow = m.dc > 0 ? '→' : m.dc < 0 ? '←' : m.dr > 0 ? '↓' : '↑';
            ctx.fillText(arrow, mx + ms / 2, my + ms / 2);
        }

        // Fruit
        if (g.fruit) {
            const fx = g.fruit.col * CELL + CELL / 2;
            const fy = g.fruit.row * CELL + CELL / 2;
            const pulseR = CELL / 2 - 3 + Math.sin(g.tickCount * 0.15) * 1;
            // Apple body
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(fx, fy, pulseR, 0, Math.PI * 2);
            ctx.fill();
            // Leaf
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.moveTo(fx, fy - pulseR);
            ctx.lineTo(fx + 4, fy - pulseR - 5);
            ctx.lineTo(fx - 1, fy - pulseR - 2);
            ctx.closePath();
            ctx.fill();
        }

        // Golden fruit
        if (g.goldenFruit) {
            const gx = g.goldenFruit.col * CELL + CELL / 2;
            const gy = g.goldenFruit.row * CELL + CELL / 2;
            const gr = CELL / 2 - 2;
            // Glow
            ctx.fillStyle = 'rgba(251,191,36,0.2)';
            ctx.beginPath();
            ctx.arc(gx, gy, gr * 1.6, 0, Math.PI * 2);
            ctx.fill();
            // Gold circle
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fill();
            // Sparkles
            const sparkleAngle = g.tickCount * 0.1;
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 4; i++) {
                const a = sparkleAngle + (Math.PI / 2) * i;
                const sx = gx + Math.cos(a) * (gr + 4);
                const sy = gy + Math.sin(a) * (gr + 4);
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            // Timer bar
            if (g.goldenFruit.life < 20) {
                ctx.fillStyle = 'rgba(251,191,36,0.5)';
                const barW = CELL * (g.goldenFruit.life / 35);
                ctx.fillRect(gx - CELL / 2, gy + gr + 3, barW, 2);
            }
        }

        // Snake body (draw body first, then head)
        for (let i = g.snake.length - 1; i >= 1; i--) {
            const s = g.snake[i];
            const sx = s.col * CELL + 2;
            const sy = s.row * CELL + 2;
            const ss = CELL - 4;
            ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#16a34a';
            ctx.beginPath();
            ctx.roundRect(sx, sy, ss, ss, 3);
            ctx.fill();
        }

        // Snake head
        if (g.snake.length > 0) {
            const h = g.snake[0];
            const hx = h.col * CELL + 1;
            const hy = h.row * CELL + 1;
            const hs = CELL - 2;
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.roundRect(hx, hy, hs, hs, 4);
            ctx.fill();

            // Eyes
            const cx = h.col * CELL + CELL / 2;
            const cy = h.row * CELL + CELL / 2;
            const d = g.direction;
            const eyeOffset = 4;
            let e1x, e1y, e2x, e2y;
            if (d.dc === 1) { // right
                e1x = cx + 3; e1y = cy - eyeOffset;
                e2x = cx + 3; e2y = cy + eyeOffset;
            } else if (d.dc === -1) { // left
                e1x = cx - 3; e1y = cy - eyeOffset;
                e2x = cx - 3; e2y = cy + eyeOffset;
            } else if (d.dr === -1) { // up
                e1x = cx - eyeOffset; e1y = cy - 3;
                e2x = cx + eyeOffset; e2y = cy - 3;
            } else { // down
                e1x = cx - eyeOffset; e1y = cy + 3;
                e2x = cx + eyeOffset; e2y = cy + 3;
            }
            // White
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(e1x, e1y, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(e2x, e2y, 2.5, 0, Math.PI * 2); ctx.fill();
            // Pupils
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(e1x + d.dc * 0.8, e1y + d.dr * 0.8, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(e2x + d.dc * 0.8, e2y + d.dr * 0.8, 1.2, 0, Math.PI * 2); ctx.fill();
        }

        // Death scatter animation
        if (g.deathScatter) {
            for (const s of g.deathScatter) {
                if (s.life <= 0) continue;
                const alpha = s.life / 30;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#22c55e';
                const px = s.col * CELL + s.vx * (30 - s.life);
                const py = s.row * CELL + s.vy * (30 - s.life);
                ctx.fillRect(px, py, CELL - 4, CELL - 4);
                s.life--;
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }, [cols, rows, getScale, initObstacles]);

    // ─── Render loop (60fps) ─────────────────────────────────────────────
    const rafRef2 = useRef(null);
    useEffect(() => {
        if (gameState !== 'playing' && gameState !== 'gameOver') return;
        const loop = () => {
            drawGame();
            rafRef2.current = requestAnimationFrame(loop);
        };
        rafRef2.current = requestAnimationFrame(loop);
        return () => { if (rafRef2.current) cancelAnimationFrame(rafRef2.current); };
    }, [gameState, drawGame]);

    // ─── Start / Pause / Resume ──────────────────────────────────────────
    const startPlaying = useCallback(() => {
        if (!gameRef.current) initGame(1, 0);
        setGameState('playing');
    }, [initGame]);

    const nextLevel = useCallback(() => {
        const g = gameRef.current;
        initGame(g.level + 1, g.score, g.multiplier);
        setGameState('playing');
    }, [initGame]);

    const restartLevel = useCallback(() => {
        const g = gameRef.current;
        initGame(g.level, 0, 1.0);
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

    // Game tick interval
    useEffect(() => {
        if (gameState !== 'playing') {
            if (tickRef.current) clearInterval(tickRef.current);
            return;
        }
        const cfg = LEVELS[(gameRef.current?.level || 1) - 1];
        tickRef.current = setInterval(gameTick, cfg.tickMs);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [gameState, gameTick, displayLevel]);

    // Keyboard
    useEffect(() => {
        const onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
                e.preventDefault();
            }

            if (gameState === 'playing') {
                if (key === 'arrowup' || key === 'w') dirBufferRef.current = { dc: 0, dr: -1 };
                if (key === 'arrowdown' || key === 's') dirBufferRef.current = { dc: 0, dr: 1 };
                if (key === 'arrowleft' || key === 'a') dirBufferRef.current = { dc: -1, dr: 0 };
                if (key === 'arrowright' || key === 'd') dirBufferRef.current = { dc: 1, dr: 0 };
            }

            if (key === 'escape') {
                setGameState(prev => prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev);
            }
            if (key === ' ' && gameState === 'ready') {
                startPlaying();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [gameState, startPlaying]);

    // Detect Touch Capability
    useEffect(() => {
        if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            setIsTouchDevice(true);
        }
    }, []);

    // Swipe controls on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onTouchStart = (e) => {
            setIsTouchDevice(true);
            if (gameState === 'ready') {
                startPlaying();
                return;
            }
            if (e.touches.length > 0) {
                touchStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                };
            }
        };

        const onTouchMove = (e) => {
            if (!touchStartRef.current || e.touches.length === 0 || gameState !== 'playing') return;
            const curX = e.touches[0].clientX;
            const curY = e.touches[0].clientY;
            const diffX = curX - touchStartRef.current.x;
            const diffY = curY - touchStartRef.current.y;
            const threshold = 20;

            if (Math.abs(diffX) > threshold || Math.abs(diffY) > threshold) {
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    // Horizontal swipe
                    if (diffX > 0) {
                        dirBufferRef.current = { dc: 1, dr: 0 };
                    } else {
                        dirBufferRef.current = { dc: -1, dr: 0 };
                    }
                } else {
                    // Vertical swipe
                    if (diffY > 0) {
                        dirBufferRef.current = { dc: 0, dr: 1 };
                    } else {
                        dirBufferRef.current = { dc: 0, dr: -1 };
                    }
                }
                // Continuous fluid steering
                touchStartRef.current = { x: curX, y: curY };
            }
        };

        const onTouchEnd = () => {
            touchStartRef.current = null;
        };

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        canvas.addEventListener('touchcancel', onTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            canvas.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [gameState, startPlaying]);

    // D-Pad direction changer
    const setDirection = useCallback((dc, dr) => {
        setIsTouchDevice(true);
        if (gameState === 'ready') {
            startPlaying();
            return;
        }
        if (gameState === 'playing') {
            dirBufferRef.current = { dc, dr };
        }
    }, [gameState, startPlaying]);

    // ─── Draw initial frame for non-playing states ───────────────────────
    useEffect(() => {
        if (gameState === 'ready') drawGame();
    }, [gameState, drawGame]);

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <canvas ref={canvasRef} className="w-full h-full" />

            {/* HUD */}
            {gameState === 'playing' && (
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 pointer-events-none">
                    <div>
                        <div className="text-white font-bold text-lg">Score: {displayScore}</div>
                        {displayMultiplier > 1.0 && (
                            <div className="text-amber-400 text-xs font-semibold">×{displayMultiplier.toFixed(1)} multiplier</div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-white font-bold">Level {displayLevel}</div>
                        <div className="text-slate-400 text-xs">
                            🍎 {displayFruitsCollected}/{displayFruitsNeeded}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-green-400 font-bold">Length: {displayLength}</div>
                    </div>
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

            {/* On-screen D-Pad for Touch/Mobile */}
            {gameState === 'playing' && (
                <div
                    className={`fixed bottom-6 right-6 z-30 select-none touch-none ${!isTouchDevice ? 'hidden pointer-events-none' : 'flex'} flex-col items-center gap-1.5`}
                >
                    <div className="relative w-36 h-36 bg-slate-900/80 backdrop-blur-md rounded-2xl border-2 border-green-500/40 p-2 shadow-2xl shadow-green-950/60 flex items-center justify-center">
                        {/* Up */}
                        <button
                            type="button"
                            onClick={() => setDirection(0, -1)}
                            className="absolute top-1.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-green-600 text-green-400 active:text-white flex items-center justify-center shadow-md border border-green-500/30 active:scale-95 transition"
                        >
                            <ChevronUp className="w-7 h-7" />
                        </button>
                        {/* Down */}
                        <button
                            type="button"
                            onClick={() => setDirection(0, 1)}
                            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-green-600 text-green-400 active:text-white flex items-center justify-center shadow-md border border-green-500/30 active:scale-95 transition"
                        >
                            <ChevronDown className="w-7 h-7" />
                        </button>
                        {/* Left */}
                        <button
                            type="button"
                            onClick={() => setDirection(-1, 0)}
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-green-600 text-green-400 active:text-white flex items-center justify-center shadow-md border border-green-500/30 active:scale-95 transition"
                        >
                            <ChevronLeft className="w-7 h-7" />
                        </button>
                        {/* Right */}
                        <button
                            type="button"
                            onClick={() => setDirection(1, 0)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-slate-800/90 active:bg-green-600 text-green-400 active:text-white flex items-center justify-center shadow-md border border-green-500/30 active:scale-95 transition"
                        >
                            <ChevronRight className="w-7 h-7" />
                        </button>
                        {/* Center Indicator */}
                        <div className="w-4 h-4 rounded-full bg-green-500/30 border border-green-400/50" />
                    </div>
                    <span className="text-[11px] text-green-400 font-bold tracking-wider uppercase opacity-80 drop-shadow">D-Pad / Swipe</span>
                </div>
            )}

            {/* Ready Screen */}
            {gameState === 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                    <div className="text-6xl mb-4">🐍</div>
                    <h1 className="text-4xl font-black text-white mb-2">Level {displayLevel}</h1>
                    <p className="text-slate-400 mb-1">{LEVELS[displayLevel - 1]?.label || ''}</p>
                    <p className="text-slate-500 text-sm mb-8">
                        Collect {displayFruitsNeeded} fruits · Speed: {LEVELS[displayLevel - 1]?.tickMs}ms
                    </p>
                    <button onClick={startPlaying} className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition text-lg">
                        <Play className="w-5 h-5" /> Start
                    </button>
                    <p className="text-slate-500 text-xs mt-4">
                        {isTouchDevice ? 'Swipe anywhere on screen or use D-Pad · Tap anywhere to start' : 'Arrow keys / WASD to steer · Esc to pause'}
                    </p>
                    <button onClick={onExit} className="mt-6 text-slate-500 hover:text-white text-sm transition">← Back to Whiteboard</button>
                </div>
            )}

            {/* Paused */}
            {gameState === 'paused' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                    <h1 className="text-4xl font-black text-white mb-8">PAUSED</h1>
                    <div className="flex gap-4">
                        <button onClick={() => setGameState('playing')} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition">
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
                    <div className="text-5xl mb-3">🍎</div>
                    <h1 className="text-3xl font-black text-green-400 mb-6">Level {displayLevel} Complete!</h1>
                    <div className="bg-slate-800 rounded-xl p-6 mb-6 min-w-[280px]">
                        <div className="flex justify-between text-slate-300 mb-2">
                            <span>Fruits ({levelScoreBreakdown.fruitsCollected})</span>
                            <span className="text-white font-bold">+{levelScoreBreakdown.fruitScore}</span>
                        </div>
                        {levelScoreBreakdown.goldenCollected > 0 && (
                            <div className="flex justify-between text-slate-300 mb-2">
                                <span>Golden Fruits ({levelScoreBreakdown.goldenCollected})</span>
                                <span className="text-yellow-400 font-bold">+{levelScoreBreakdown.goldenScore}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-slate-300 mb-2">
                            <span>Level Bonus</span>
                            <span className="text-cyan-400 font-bold">+{levelScoreBreakdown.bonus}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 mb-2">
                            <span>Multiplier</span>
                            <span className="text-amber-400 font-bold">×{levelScoreBreakdown.multiplier.toFixed(1)}</span>
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
                    <h1 className="text-4xl font-black text-red-500 mb-2">GAME OVER</h1>
                    <p className="text-red-300 text-sm mb-4">{deathCause}</p>
                    <p className="text-slate-400 mb-6 text-lg">Score: <span className="text-white font-bold">{displayScore}</span></p>
                    <div className="flex gap-4">
                        <button onClick={restartLevel} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition">
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
                    <p className="text-green-400 text-sm mb-1">Max Snake Length: {gameRef.current?.maxLength || displayLength}</p>
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
