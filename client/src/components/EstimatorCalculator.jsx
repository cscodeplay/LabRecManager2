'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Calculator,
    X,
    Minus,
    Maximize2,
    Copy,
    Check,
    History,
    Delete,
    CornerDownLeft,
    Sparkles,
    Sun,
    Moon,
    Volume2,
    VolumeX,
    TrendingUp,
    Atom,
    Sliders,
    Binary,
    Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Converts a decimal number into an exact lowest-terms fraction p/q
 * using Farey sequences / continued fractions.
 */
function decimalToFraction(val, maxDenominator = 10000) {
    if (val === 0 || isNaN(val) || !isFinite(val)) return null;
    const sign = val < 0 ? -1 : 1;
    const x = Math.abs(val);
    const intPart = Math.floor(x);
    const fracPart = x - intPart;

    if (fracPart < 1e-9) {
        return { num: sign * intPart, den: 1, str: `${sign * intPart}` };
    }

    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;
    let b = fracPart;

    do {
        const a = Math.floor(b);
        let aux = h1;
        h1 = a * h1 + h2;
        h2 = aux;

        aux = k1;
        k1 = a * k1 + k2;
        k2 = aux;

        b = 1 / (b - a);
    } while (Math.abs(fracPart - h1 / k1) > fracPart * 1e-6 && k1 < maxDenominator);

    const totalNum = sign * (intPart * k1 + h1);
    const totalDen = k1;
    return {
        num: totalNum,
        den: totalDen,
        str: `${totalNum}/${totalDen}`
    };
}

/**
 * Factorial helper
 */
function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

/**
 * Engineering SI prefix helper for Fermi order-of-magnitude analysis
 */
function toEngineeringPrefix(val) {
    if (val === 0 || isNaN(val) || !isFinite(val)) return null;
    const absVal = Math.abs(val);
    if (absVal >= 1e-2 && absVal < 1e4) return null; // Standard human range

    const prefixes = [
        { exp: 12, symbol: 'T' },
        { exp: 9, symbol: 'G' },
        { exp: 6, symbol: 'M' },
        { exp: 3, symbol: 'k' },
        { exp: -3, symbol: 'm' },
        { exp: -6, symbol: 'µ' },
        { exp: -9, symbol: 'n' },
        { exp: -12, symbol: 'p' },
        { exp: -15, symbol: 'f' }
    ];

    for (const p of prefixes) {
        const unit = Math.pow(10, p.exp);
        if (absVal >= unit * 0.999) {
            const scaled = val / unit;
            return `${scaled.toFixed(scaled >= 100 ? 1 : 2)} ${p.symbol}`;
        }
    }
    return val.toExponential(2);
}

/**
 * Robust numerical formatter that cleanly handles floating point roundoffs,
 * huge numbers, and infinitesimal physics constants without truncating to 0.
 */
function formatMathNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return 'Error';
    if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
    if (num === 0) return '0';

    const abs = Math.abs(num);
    if (abs >= 1e12 || abs < 1e-6) {
        const expStr = num.toExponential(8);
        const [mantissa, exponent] = expStr.split('e');
        const trimmedMantissa = parseFloat(mantissa).toString();
        return `${trimmedMantissa}e${exponent}`;
    }

    return parseFloat(num.toPrecision(12)).toString();
}

/**
 * Programmer / Binary Mode Mask & Formatting Helpers
 */
function getProgMask(wordSize) {
    switch (wordSize) {
        case 8: return 0xFFn;
        case 16: return 0xFFFFn;
        case 64: return 0xFFFFFFFFFFFFFFFFn;
        case 32:
        default: return 0xFFFFFFFFn;
    }
}

function clampProgBigInt(val, wordSize) {
    const mask = getProgMask(wordSize);
    return BigInt(val) & mask;
}

function formatBinaryString(bigVal, wordSize = 32) {
    const mask = getProgMask(wordSize);
    const maskedVal = BigInt(bigVal) & mask;
    let binStr = maskedVal.toString(2).padStart(wordSize, '0');
    return binStr.match(/.{1,4}/g)?.join(' ') || binStr;
}

function formatHexString(bigVal, wordSize = 32) {
    const mask = getProgMask(wordSize);
    const maskedVal = BigInt(bigVal) & mask;
    const hexDigits = Math.max(2, wordSize / 4);
    let hexStr = maskedVal.toString(16).toUpperCase().padStart(hexDigits, '0');
    return hexStr.match(/.{1,4}/g)?.join(' ') || hexStr;
}

function formatOctalString(bigVal, wordSize = 32) {
    const mask = getProgMask(wordSize);
    const maskedVal = BigInt(bigVal) & mask;
    return maskedVal.toString(8);
}

function formatDecimalString(bigVal, wordSize = 32) {
    const mask = getProgMask(wordSize);
    const maskedVal = BigInt(bigVal) & mask;
    const signBit = 1n << BigInt(wordSize - 1);
    if (maskedVal & signBit) {
        const signedVal = maskedVal - (1n << BigInt(wordSize));
        return `${signedVal.toString(10)}`;
    }
    return maskedVal.toString(10);
}

/**
 * Universal STEM Physical and Chemical Constants
 */
const STEM_CONSTANTS = [
    { symbol: 'c', name: 'Speed of Light', val: '299792458', unit: 'm/s', category: 'Physics' },
    { symbol: 'h', name: 'Planck Constant', val: '6.62607015e-34', unit: 'J·s', category: 'Quantum' },
    { symbol: 'ℏ', name: 'Reduced Planck', val: '1.054571817e-34', unit: 'J·s', category: 'Quantum' },
    { symbol: 'G', name: 'Gravitational Const', val: '6.67430e-11', unit: 'm³/(kg·s²)', category: 'Astrophysics' },
    { symbol: 'kB', name: 'Boltzmann Const', val: '1.380649e-23', unit: 'J/K', category: 'Thermo' },
    { symbol: 'NA', name: 'Avogadro Number', val: '6.02214076e23', unit: 'mol⁻¹', category: 'Chemistry' },
    { symbol: 'e', name: 'Elementary Charge', val: '1.602176634e-19', unit: 'C', category: 'Electromagnetism' },
    { symbol: 'me', name: 'Electron Mass', val: '9.1093837e-31', unit: 'kg', category: 'Quantum' },
    { symbol: 'mp', name: 'Proton Mass', val: '1.6726219e-27', unit: 'kg', category: 'Nuclear' },
    { symbol: 'ε0', name: 'Vacuum Permittivity', val: '8.85418781e-12', unit: 'F/m', category: 'Electromagnetism' },
    { symbol: 'μ0', name: 'Vacuum Permeability', val: '1.25663706e-6', unit: 'N/A²', category: 'Electromagnetism' },
    { symbol: 'g', name: 'Standard Gravity', val: '9.80665', unit: 'm/s²', category: 'Physics' },
    { symbol: 'R', name: 'Molar Gas Const', val: '8.314462618', unit: 'J/(mol·K)', category: 'Chemistry' },
    { symbol: 'σ', name: 'Stefan-Boltzmann', val: '5.670374e-8', unit: 'W/(m²·K⁴)', category: 'Thermo' }
];

export default function EstimatorCalculator({
    isOpen = true,
    onClose,
    onInsertToBoard, // ({ latex, text, expression, result })
    initialPosition = { x: 120, y: 120 }
}) {
    // Draggable position
    const [pos, setPos] = useState(initialPosition);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSecondMode, setIsSecondMode] = useState(false);
    const [angleMode, setAngleMode] = useState('DEG'); // 'DEG' | 'RAD'

    // Dark Mode Toggle
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Collapsible Right-Side History Panel State
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([
        { expr: 'sin(30°) + √(16)', result: '4.5', fraction: '9/2', mode: 'DEG', timestamp: '12:00 PM' }
    ]);

    // Active Tab in Calculator: 'keypad' | 'binary' | 'constants' | 'plot'
    const [activeTab, setActiveTab] = useState('keypad');

    // Input expression, result evaluation and chaining state
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('0');
    const [fractionResult, setFractionResult] = useState('');
    const [isResultEvaluated, setIsResultEvaluated] = useState(false);
    const [memory, setMemory] = useState(0);
    const [hasCopied, setHasCopied] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Programmer / Binary Mode State
    const [progValue, setProgValue] = useState(0n);
    const [progBase, setProgBase] = useState('DEC'); // 'HEX' | 'DEC' | 'OCT' | 'BIN'
    const [progWordSize, setProgWordSize] = useState(32); // 8 | 16 | 32 | 64
    const [progOp, setProgOp] = useState(null); // 'AND' | 'OR' | 'XOR' | 'LSH' | 'RSH' | 'MOD' | '+' | '-' | '*' | '/'
    const [progPrevValue, setProgPrevValue] = useState(null);
    const [isProgInputFresh, setIsProgInputFresh] = useState(false);

    // Function Plotter State (f(x) Dynamic Visualizer)
    const [plotFunction, setPlotFunction] = useState('sin(x)');
    const [scrubberX, setScrubberX] = useState(1.5);

    const inputRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

    // Drag handle logic
    const handlePointerDownHeader = (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            startPosX: pos.x,
            startPosY: pos.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingRef.current) return;
            const dx = moveEvt.clientX - dragStartRef.current.x;
            const dy = moveEvt.clientY - dragStartRef.current.y;
            setPos({
                x: Math.max(10, Math.min(window.innerWidth - 380, dragStartRef.current.startPosX + dx)),
                y: Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.startPosY + dy))
            });
        };

        const onPointerUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    /**
     * Mathematical evaluator that respects DEG/RAD and standard math constants
     */
    const evaluateExpression = useCallback((rawExpr) => {
        if (!rawExpr || !rawExpr.trim()) return { val: 0, str: '0' };

        try {
            let sanitized = rawExpr
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-')
                .replace(/π/g, `${Math.PI}`)
                .replace(/\bpi\b/gi, `${Math.PI}`);

            // Replace STEM physical constants symbols
            STEM_CONSTANTS.forEach(c => {
                const sym = c.symbol;
                if (/^[a-zA-Z0-9]+$/.test(sym)) {
                    sanitized = sanitized.replace(new RegExp(`\\b${sym}\\b`, 'g'), `(${c.val})`);
                } else {
                    const escaped = sym.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
                    sanitized = sanitized.replace(new RegExp(escaped, 'g'), `(${c.val})`);
                }
            });

            // Replace Euler constant e ONLY when not part of scientific notation like 1e-10 or 6.626e-34
            sanitized = sanitized.replace(/(?<!\d|\.)e(?![+\-]?\d)/gi, `${Math.E}`);

            // Replace square root & cube root
            sanitized = sanitized.replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)');
            sanitized = sanitized.replace(/∛\(([^)]+)\)/g, 'Math.cbrt($1)');
            sanitized = sanitized.replace(/sqrt\(/g, 'Math.sqrt(');
            sanitized = sanitized.replace(/cbrt\(/g, 'Math.cbrt(');

            // Replace power operator
            sanitized = sanitized.replace(/\^/g, '**');

            // Replace abs
            sanitized = sanitized.replace(/abs\(/g, 'Math.abs(');

            // Replace logs
            sanitized = sanitized.replace(/ln\(/g, 'Math.log(');
            sanitized = sanitized.replace(/log10\(/g, 'Math.log10(');
            sanitized = sanitized.replace(/exp\(/g, 'Math.exp(');

            // Handle Factorials: e.g. 5! -> factorial(5)
            sanitized = sanitized.replace(/(\d+)!/g, (_, num) => `${factorial(parseInt(num, 10))}`);

            // Trigonometry DEG/RAD transforms
            const degToRad = (rad) => `((${rad}) * Math.PI / 180)`;
            const radToDeg = (val) => `((${val}) * 180 / Math.PI)`;

            if (angleMode === 'DEG') {
                sanitized = sanitized.replace(/asin\(([^)]+)\)/g, (_, arg) => `${radToDeg(`Math.asin(${arg})`)}`);
                sanitized = sanitized.replace(/acos\(([^)]+)\)/g, (_, arg) => `${radToDeg(`Math.acos(${arg})`)}`);
                sanitized = sanitized.replace(/atan\(([^)]+)\)/g, (_, arg) => `${radToDeg(`Math.atan(${arg})`)}`);

                sanitized = sanitized.replace(/sin\(([^)]+)\)/g, (_, arg) => `Math.sin(${degToRad(arg)})`);
                sanitized = sanitized.replace(/cos\(([^)]+)\)/g, (_, arg) => `Math.cos(${degToRad(arg)})`);
                sanitized = sanitized.replace(/tan\(([^)]+)\)/g, (_, arg) => `Math.tan(${degToRad(arg)})`);
            } else {
                sanitized = sanitized.replace(/asin\(/g, 'Math.asin(');
                sanitized = sanitized.replace(/acos\(/g, 'Math.acos(');
                sanitized = sanitized.replace(/atan\(/g, 'Math.atan(');

                sanitized = sanitized.replace(/sin\(/g, 'Math.sin(');
                sanitized = sanitized.replace(/cos\(/g, 'Math.cos(');
                sanitized = sanitized.replace(/tan\(/g, 'Math.tan(');
            }

            // Safe mathematical evaluation
            // eslint-disable-next-line no-new-func
            const evaluator = new Function(`'use strict'; return (${sanitized});`);
            const num = evaluator();

            if (typeof num !== 'number' || isNaN(num)) {
                return { val: NaN, str: 'Error' };
            }

            if (!isFinite(num)) {
                return { val: num, str: num > 0 ? 'Infinity' : '-Infinity' };
            }

            // Clean roundoff and format scientific numbers safely
            const formatted = formatMathNumber(num);
            return { val: num, str: formatted };
        } catch {
            return { val: NaN, str: 'Error' };
        }
    }, [angleMode]);

    // Live evaluate as user types
    useEffect(() => {
        if (!expression.trim()) {
            setResult('0');
            setFractionResult('');
            return;
        }

        // If expression has open parentheses or trailing operator, evaluate safely without error spam
        const trailingOp = /[+\-×÷*/^]$/.test(expression.trim());
        if (trailingOp) return;

        const evalRes = evaluateExpression(expression);
        if (!isNaN(evalRes.val) && evalRes.str !== 'Error') {
            setResult(evalRes.str);
            const frac = decimalToFraction(evalRes.val);
            if (frac && frac.den > 1 && frac.den <= 1000) {
                setFractionResult(frac.str);
            } else {
                setFractionResult('');
            }
        }
    }, [expression, evaluateExpression]);

    const isOperatorToken = (token) => ['+', '−', '×', '÷', '^', '%', '^2'].includes(token);

    // Append token to expression (combines with previous result if evaluated)
    const handleInsert = (token) => {
        if (isResultEvaluated) {
            setIsResultEvaluated(false);
            if (isOperatorToken(token)) {
                const baseVal = (result && result !== 'Error' && result !== 'Infinity' && result !== '-Infinity') ? result : '0';
                setExpression(`${baseVal}${token}`);
                if (inputRef.current) inputRef.current.focus();
                return;
            } else {
                setExpression(token);
                if (inputRef.current) inputRef.current.focus();
                return;
            }
        }

        setExpression(prev => prev + token);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Insert STEM Constant safely with precedence
    const handleInsertConstant = (c) => {
        const token = `(${c.val})`;
        if (isResultEvaluated) {
            setIsResultEvaluated(false);
            setExpression(token);
            if (inputRef.current) inputRef.current.focus();
            return;
        }

        setExpression(prev => {
            if (!prev) return token;
            if (/[\d).]$/.test(prev.trim())) {
                return `${prev}×${token}`;
            }
            return `${prev}${token}`;
        });
        if (inputRef.current) inputRef.current.focus();
    };

    // Calculate Equals & save to History Tape
    const handleEquals = useCallback(() => {
        if (!expression.trim()) return;
        const evalRes = evaluateExpression(expression);
        setResult(evalRes.str);
        setIsResultEvaluated(true);

        if (!isNaN(evalRes.val) && evalRes.str !== 'Error') {
            const frac = decimalToFraction(evalRes.val);
            const fracStr = frac && frac.den > 1 && frac.den <= 1000 ? frac.str : '';
            setFractionResult(fracStr);

            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setHistory(prev => [
                {
                    expr: expression,
                    result: evalRes.str,
                    fraction: fracStr,
                    mode: angleMode,
                    timestamp
                },
                ...prev.slice(0, 39) // keep up to 40 items
            ]);
        } else {
            setFractionResult('');
        }
    }, [expression, evaluateExpression, angleMode]);

    // Clear all
    const handleClear = useCallback(() => {
        setExpression('');
        setResult('0');
        setFractionResult('');
        setIsResultEvaluated(false);
    }, []);

    // Backspace
    const handleBackspace = useCallback(() => {
        setExpression(prev => prev.slice(0, -1));
        setIsResultEvaluated(false);
    }, []);

    // Programmer Mode Handlers
    const computeProgOp = (a, b, op, wordSize) => {
        const mask = getProgMask(wordSize);
        let res = 0n;
        switch (op) {
            case 'AND': res = a & b; break;
            case 'OR': res = a | b; break;
            case 'XOR': res = a ^ b; break;
            case 'MOD': res = b !== 0n ? a % b : 0n; break;
            case '+': res = a + b; break;
            case '-': res = a - b; break;
            case '*': res = a * b; break;
            case '/': res = b !== 0n ? a / b : 0n; break;
            case 'LSH': res = a << (b & 63n); break;
            case 'RSH': res = a >> (b & 63n); break;
            default: res = b;
        }
        return res & mask;
    };

    const handleToggleBit = (bitIndex) => {
        const bit = 1n << BigInt(bitIndex);
        setProgValue(prev => clampProgBigInt(prev ^ bit, progWordSize));
        setIsProgInputFresh(false);
    };

    const handleProgDigit = (digit) => {
        const radix = progBase === 'HEX' ? 16n : progBase === 'DEC' ? 10n : progBase === 'OCT' ? 8n : 2n;
        const digitVal = BigInt(parseInt(digit, Number(radix)));

        if (isProgInputFresh) {
            setProgValue(clampProgBigInt(digitVal, progWordSize));
            setIsProgInputFresh(false);
            return;
        }

        setProgValue(prev => {
            const nextVal = (prev * radix) + digitVal;
            return clampProgBigInt(nextVal, progWordSize);
        });
    };

    const handleProgOp = (op) => {
        if (progPrevValue !== null && progOp !== null && !isProgInputFresh) {
            const computed = computeProgOp(progPrevValue, progValue, progOp, progWordSize);
            setProgValue(computed);
            setProgPrevValue(computed);
        } else {
            setProgPrevValue(progValue);
        }
        setProgOp(op);
        setIsProgInputFresh(true);
    };

    const handleProgUnary = (op) => {
        if (op === 'NOT') {
            const mask = getProgMask(progWordSize);
            setProgValue(prev => (~prev) & mask);
        } else if (op === 'LSH1') {
            setProgValue(prev => clampProgBigInt(prev << 1n, progWordSize));
        } else if (op === 'RSH1') {
            setProgValue(prev => clampProgBigInt(prev >> 1n, progWordSize));
        }
    };

    const handleProgEquals = useCallback(() => {
        if (progPrevValue !== null && progOp !== null) {
            const computed = computeProgOp(progPrevValue, progValue, progOp, progWordSize);
            setProgValue(computed);
            setProgPrevValue(null);
            setProgOp(null);
            setIsProgInputFresh(true);
        }
    }, [progPrevValue, progOp, progValue, progWordSize]);

    const handleProgClear = useCallback(() => {
        setProgValue(0n);
        setProgPrevValue(null);
        setProgOp(null);
        setIsProgInputFresh(false);
    }, []);

    const handleProgBackspace = useCallback(() => {
        const radix = progBase === 'HEX' ? 16n : progBase === 'DEC' ? 10n : progBase === 'OCT' ? 8n : 2n;
        setProgValue(prev => prev / radix);
    }, [progBase]);

    const handleInsertProgToWhiteboard = useCallback(() => {
        if (!onInsertToBoard) {
            toast.error('Whiteboard insertion unavailable');
            return;
        }

        const hexStr = formatHexString(progValue, progWordSize);
        const decStr = formatDecimalString(progValue, progWordSize);
        const binStr = formatBinaryString(progValue, progWordSize);
        const octStr = formatOctalString(progValue, progWordSize);

        const latex = `\\text{HEX: 0x}${hexStr} \\;=\\; \\text{DEC: }${decStr} \\;=\\; \\text{BIN: }${binStr.replace(/\s+/g, '\\;')}`;
        const text = `HEX: 0x${hexStr} | DEC: ${decStr} | BIN: ${binStr} | OCT: 0o${octStr}`;

        onInsertToBoard({
            latex,
            text,
            expression: `HEX: 0x${hexStr}`,
            result: decStr
        });

        toast.success('Inserted programmer conversion to whiteboard!', { icon: '💻' });
    }, [progValue, progWordSize, onInsertToBoard]);

    // Global Keyboard Enter key evaluation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            const activeEl = document.activeElement;
            const isInsideCalc = activeEl && activeEl.closest && activeEl.closest('[data-calculator="estimator"]');
            const isGlobalInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !isInsideCalc;
            if (isGlobalInput) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (activeTab === 'binary') {
                    handleProgEquals();
                } else {
                    handleEquals();
                }
            } else if (e.key === 'Escape') {
                if (activeTab === 'binary') {
                    handleProgClear();
                } else {
                    handleClear();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeTab, handleEquals, handleProgEquals, handleClear, handleProgClear]);

    // Copy result to clipboard
    const handleCopy = () => {
        const text = result !== '0' && result !== 'Error' ? `${expression} = ${result}` : result;
        navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 1500);
        toast.success('Copied calculation to clipboard!', { icon: '📋' });
    };

    // Audio Voice Pronouncer (Web Speech API)
    const handleSpeakFormula = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            toast.error('Voice synthesizer is not supported by your browser');
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const textToPhonetic = (expression || '0')
            .replace(/×/g, ' times ')
            .replace(/÷/g, ' divided by ')
            .replace(/−/g, ' minus ')
            .replace(/\+/g, ' plus ')
            .replace(/π/g, ' pi ')
            .replace(/\^2/g, ' squared ')
            .replace(/\^3/g, ' cubed ')
            .replace(/\^/g, ' to the power of ')
            .replace(/sin\(/g, ' sine of ')
            .replace(/cos\(/g, ' cosine of ')
            .replace(/tan\(/g, ' tangent of ')
            .replace(/asin\(/g, ' arc sine of ')
            .replace(/acos\(/g, ' arc cosine of ')
            .replace(/atan\(/g, ' arc tangent of ')
            .replace(/√\(/g, ' square root of ')
            .replace(/ln\(/g, ' natural log of ')
            .replace(/log10\(/g, ' log base 10 of ');

        const spokenSentence = `${textToPhonetic} equals ${result}`;
        const utterance = new SpeechSynthesisUtterance(spokenSentence);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Insert as LaTeX equation onto whiteboard
    const handleInsertToWhiteboard = (customExpr = null, customRes = null) => {
        if (!onInsertToBoard) {
            toast.error('Whiteboard insertion unavailable');
            return;
        }

        const exprToUse = customExpr || expression.trim() || '0';
        const resToUse = customRes || (result !== 'Error' ? result : '');

        // Generate clean KaTeX LaTeX
        let latex = exprToUse
            .replace(/×/g, '\\times ')
            .replace(/÷/g, '\\div ')
            .replace(/π/g, '\\pi ')
            .replace(/sin\(/g, '\\sin(')
            .replace(/cos\(/g, '\\cos(')
            .replace(/tan\(/g, '\\tan(')
            .replace(/asin\(/g, '\\sin^{-1}(')
            .replace(/acos\(/g, '\\cos^{-1}(')
            .replace(/atan\(/g, '\\tan^{-1}(')
            .replace(/ln\(/g, '\\ln(')
            .replace(/log10\(/g, '\\log_{10}(')
            .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
            .replace(/∛\(([^)]+)\)/g, '\\sqrt[3]{$1}');

        if (resToUse) {
            if (fractionResult && !customExpr) {
                latex = `${latex} = ${resToUse} \\;\\left(\\frac{${fractionResult.replace('/', '}{')}}\\right)`;
            } else {
                latex = `${latex} = ${resToUse}`;
            }
        }

        onInsertToBoard({
            latex,
            text: `${exprToUse} = ${resToUse}`,
            expression: exprToUse,
            result: resToUse
        });

        toast.success('Inserted equation to whiteboard!', { icon: '📐' });
    };

    // Calculate curve points for the dynamic SVG f(x) visualizer
    const curvePlotData = useMemo(() => {
        const points = [];
        const xMin = -8;
        const xMax = 8;
        const steps = 100;
        const dx = (xMax - xMin) / steps;

        const evalFx = (valX) => {
            try {
                let code = plotFunction
                    .replace(/\bx\b/g, `(${valX})`)
                    .replace(/sin\(/g, 'Math.sin(')
                    .replace(/cos\(/g, 'Math.cos(')
                    .replace(/tan\(/g, 'Math.tan(')
                    .replace(/exp\(/g, 'Math.exp(')
                    .replace(/sqrt\(/g, 'Math.sqrt(')
                    .replace(/abs\(/g, 'Math.abs(')
                    .replace(/\^/g, '**');
                // eslint-disable-next-line no-new-func
                const fn = new Function(`return (${code});`);
                const y = fn();
                return isFinite(y) ? y : null;
            } catch {
                return null;
            }
        };

        let currentScrubberY = evalFx(scrubberX);

        for (let i = 0; i <= steps; i++) {
            const curX = xMin + i * dx;
            const curY = evalFx(curX);
            points.push({ x: curX, y: curY });
        }

        // SVG Canvas bounds: 260 width, 140 height. Centered at (130, 70).
        // Scale: 12px per mathematical unit
        const scale = 12;
        const cx = 130;
        const cy = 70;

        let pathD = '';
        points.forEach((p, idx) => {
            if (p.y === null || Math.abs(p.y) > 10) return;
            const svgX = cx + p.x * scale;
            const svgY = cy - p.y * scale;
            if (idx === 0 || !pathD) {
                pathD += `M ${svgX.toFixed(1)} ${svgY.toFixed(1)}`;
            } else {
                pathD += ` L ${svgX.toFixed(1)} ${svgY.toFixed(1)}`;
            }
        });

        const scrubberSvgX = cx + scrubberX * scale;
        const scrubberSvgY = currentScrubberY !== null ? cy - currentScrubberY * scale : null;

        return {
            pathD,
            scrubberSvgX,
            scrubberSvgY,
            currentScrubberY
        };
    }, [plotFunction, scrubberX]);

    // Engineering prefix
    const engPrefix = useMemo(() => {
        const num = parseFloat(result);
        return toEngineeringPrefix(num);
    }, [result]);

    if (!isOpen) return null;

    // Theme classes based on isDarkMode
    const theme = {
        container: isDarkMode
            ? 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.7)]'
            : 'bg-white/95 text-slate-800 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.18)]',
        header: isDarkMode
            ? 'bg-slate-800/80 border-slate-700/70 text-slate-200'
            : 'bg-slate-100 border-slate-200 text-slate-700',
        displayTape: isDarkMode
            ? 'bg-slate-950/80 border-slate-800 text-slate-100'
            : 'bg-slate-50 border-slate-200 text-slate-900',
        inputText: isDarkMode ? 'text-slate-300 placeholder:text-slate-600' : 'text-slate-700 placeholder:text-slate-400',
        resultText: isDarkMode ? 'text-cyan-400' : 'text-cyan-600',
        keypadBg: isDarkMode ? 'bg-slate-900/70' : 'bg-slate-100/50',
        numKey: isDarkMode
            ? 'bg-slate-700/80 text-white hover:bg-slate-600 active:bg-slate-500'
            : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 shadow-xs',
        opKey: isDarkMode
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-xs',
        fnKey: isDarkMode
            ? 'bg-slate-800/90 text-cyan-200 hover:bg-slate-700'
            : 'bg-slate-200/80 text-cyan-800 hover:bg-slate-300 border border-slate-200',
        historyPanel: isDarkMode
            ? 'bg-slate-950/95 border-l border-slate-800 text-slate-200'
            : 'bg-slate-50/98 border-l border-slate-200 text-slate-800'
    };

    return (
        <div
            data-calculator="estimator"
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                zIndex: 90
            }}
            className={`select-none rounded-2xl border backdrop-blur-2xl flex flex-row items-stretch overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150 ${theme.container}`}
        >
            {/* Main Calculator Body */}
            <div className="w-[390px] flex flex-col shrink-0">
                {/* Header with Drag Handle */}
                <div
                    onPointerDown={handlePointerDownHeader}
                    className={`px-3.5 py-2.5 border-b flex items-center justify-between cursor-move ${theme.header}`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-xs">
                            <Calculator className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold tracking-wide">
                            Estimator
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono font-semibold">
                            {activeTab === 'binary' ? 'Programmer' : 'Sci-Math'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Dark Mode Toggle */}
                        <button
                            type="button"
                            onClick={() => setIsDarkMode(d => !d)}
                            className={`p-1.5 rounded-lg transition ${
                                isDarkMode ? 'text-amber-300 hover:bg-slate-700/60' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </button>

                        {/* Collapsible History Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowHistory(h => !h)}
                            className={`p-1.5 rounded-lg transition ${
                                showHistory
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                    : isDarkMode
                                        ? 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                                        : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Toggle Right-Side Calculation History Panel"
                        >
                            <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Minimize / Expand */}
                        <button
                            type="button"
                            onClick={() => setIsMinimized(m => !m)}
                            className={`p-1.5 rounded-lg transition ${
                                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isMinimized ? 'Expand' : 'Minimize'}
                        >
                            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>

                        {/* Close */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Close Estimator"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Display Tape */}
                {activeTab === 'binary' ? (
                    /* Programmer Multi-Base Display & Word Size Bar */
                    <div className={`p-2.5 border-b flex flex-col gap-1.5 ${theme.displayTape}`}>
                        {/* Word Size & Active Operation Indicator */}
                        <div className="flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400 font-bold uppercase mr-0.5">Word:</span>
                                {[
                                    { size: 64, label: 'QWORD' },
                                    { size: 32, label: 'DWORD' },
                                    { size: 16, label: 'WORD' },
                                    { size: 8, label: 'BYTE' }
                                ].map(w => (
                                    <button
                                        key={w.size}
                                        type="button"
                                        onClick={() => {
                                            setProgWordSize(w.size);
                                            setProgValue(prev => clampProgBigInt(prev, w.size));
                                        }}
                                        className={`px-1.5 py-0.5 rounded transition font-bold ${
                                            progWordSize === w.size
                                                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                                                : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        }`}
                                    >
                                        {w.label}
                                    </button>
                                ))}
                            </div>

                            {progOp && (
                                <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                                    {formatDecimalString(progPrevValue || 0n, progWordSize)} {progOp}
                                </div>
                            )}
                        </div>

                        {/* 4 Radix Rows: Clickable to select active input base */}
                        <div className="flex flex-col gap-0.5 text-xs font-mono">
                            {[
                                { base: 'HEX', prefix: '0x', val: formatHexString(progValue, progWordSize) },
                                { base: 'DEC', prefix: '', val: formatDecimalString(progValue, progWordSize) },
                                { base: 'OCT', prefix: '0o', val: formatOctalString(progValue, progWordSize) },
                                { base: 'BIN', prefix: '', val: formatBinaryString(progValue, Math.min(32, progWordSize)) }
                            ].map(r => (
                                <button
                                    key={r.base}
                                    type="button"
                                    onClick={() => {
                                        setProgBase(r.base);
                                        setIsProgInputFresh(false);
                                    }}
                                    className={`px-2 py-1 rounded-lg flex items-center justify-between text-left transition ${
                                        progBase === r.base
                                            ? isDarkMode
                                                ? 'bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 font-bold shadow-xs'
                                                : 'bg-cyan-50 border border-cyan-400 text-cyan-800 font-bold'
                                            : isDarkMode
                                                ? 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
                                                : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                                    }`}
                                >
                                    <span className="w-8 font-bold text-[10px] text-slate-400">{r.base}</span>
                                    <span className="truncate tracking-wider text-right flex-1">{r.prefix}{r.val}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Scientific Expression + Result Display Tape */
                    <div className={`p-3 border-b flex flex-col gap-1 text-right ${theme.displayTape}`}>
                        {/* Secondary status row: angle mode, memory status, fraction, engineering prefix, speech */}
                        <div className="flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${angleMode === 'DEG' ? 'text-amber-400 bg-amber-400/15' : 'text-cyan-400 bg-cyan-400/15'}`}>
                                    {angleMode}
                                </span>
                                {memory !== 0 && (
                                    <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                                        M = {memory}
                                    </span>
                                )}
                                {fractionResult && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold flex items-center gap-0.5">
                                        <span>≈</span> {fractionResult}
                                    </span>
                                )}
                                {engPrefix && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold" title="Engineering SI notation">
                                        {engPrefix}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Speech Equation Pronouncer */}
                                <button
                                    type="button"
                                    onClick={handleSpeakFormula}
                                    className={`p-1 rounded transition ${
                                        isSpeaking ? 'bg-cyan-500 text-slate-950 animate-pulse' : isDarkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                                    title="Pronounce formula aloud (Speech Synthesizer)"
                                >
                                    {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                </button>

                                {/* Copy Result */}
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className={`p-1 rounded transition ${
                                        isDarkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                                    title="Copy Calculation"
                                >
                                    {hasCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>

                        {/* Expression Input Area */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={expression}
                            onChange={(e) => {
                                setExpression(e.target.value);
                                setIsResultEvaluated(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleEquals();
                                }
                            }}
                            placeholder="0"
                            className={`w-full bg-transparent text-right text-sm font-mono outline-none tracking-wide selection:bg-cyan-500/30 ${theme.inputText}`}
                        />

                        {/* Primary Computed Result */}
                        <div className={`text-2xl font-mono font-bold tracking-tight overflow-x-auto custom-scrollbar ${theme.resultText}`}>
                            {result}
                        </div>
                    </div>
                )}

                {/* Sub-Feature Tabs: Keypad | Binary | STEM Constants | f(x) Plot */}
                {!isMinimized && (
                    <div className="flex items-center border-b border-slate-700/50 bg-slate-800/40 p-1 text-[11px] font-semibold gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('keypad')}
                            className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                activeTab === 'keypad'
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Calculator className="w-3 h-3" />
                            <span>Keypad</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('binary')}
                            className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                activeTab === 'binary'
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Binary className="w-3 h-3" />
                            <span>Binary</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('constants')}
                            className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                activeTab === 'constants'
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Atom className="w-3 h-3" />
                            <span>Constants</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('plot')}
                            className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                activeTab === 'plot'
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <TrendingUp className="w-3 h-3" />
                            <span>f(x) Plot</span>
                        </button>
                    </div>
                )}

                {/* Keypad Grid (Tab 1) */}
                {!isMinimized && activeTab === 'keypad' && (
                    <div className={`p-2.5 flex flex-col gap-1.5 ${theme.keypadBg}`}>
                        {/* Row 1: Mode Switches & Memory Functions */}
                        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setIsSecondMode(s => !s)}
                                className={`py-1.5 rounded-lg transition ${
                                    isSecondMode ? 'bg-amber-400 text-slate-950 font-bold ring-1 ring-amber-300' : isDarkMode ? 'bg-slate-800 text-amber-300 hover:bg-slate-700' : 'bg-slate-200 text-amber-700 hover:bg-slate-300'
                                }`}
                                title="Second Function (Inv / Arc)"
                            >
                                2nd
                            </button>
                            <button
                                type="button"
                                onClick={() => setAngleMode(m => (m === 'DEG' ? 'RAD' : 'DEG'))}
                                className={`py-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700' : 'bg-slate-200 text-cyan-700 hover:bg-slate-300'
                                }`}
                                title="Toggle Degree / Radian"
                            >
                                {angleMode}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMemory(0)}
                                className={`py-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Memory Clear"
                            >
                                MC
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert(String(memory))}
                                className={`py-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Memory Recall"
                            >
                                MR
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const num = evaluateExpression(expression).val;
                                    if (!isNaN(num)) setMemory(m => m + num);
                                }}
                                className={`py-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Memory Add"
                            >
                                M+
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition font-bold"
                                title="Clear All"
                            >
                                C
                            </button>
                            <button
                                type="button"
                                onClick={handleBackspace}
                                className={`py-1.5 rounded-lg flex items-center justify-center transition ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Backspace / Delete"
                            >
                                <Delete className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Row 2: Trig Functions */}
                        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => handleInsert(isSecondMode ? 'asin(' : 'sin(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title={isSecondMode ? 'Inverse Sine' : 'Sine'}
                            >
                                {isSecondMode ? 'sin⁻¹' : 'sin'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert(isSecondMode ? 'acos(' : 'cos(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title={isSecondMode ? 'Inverse Cosine' : 'Cosine'}
                            >
                                {isSecondMode ? 'cos⁻¹' : 'cos'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert(isSecondMode ? 'atan(' : 'tan(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title={isSecondMode ? 'Inverse Tangent' : 'Tangent'}
                            >
                                {isSecondMode ? 'tan⁻¹' : 'tan'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('π')}
                                className={`py-1.5 rounded-lg transition font-serif ${
                                    isDarkMode ? 'bg-slate-800/70 text-amber-300 hover:bg-slate-700' : 'bg-slate-200 text-amber-700 hover:bg-slate-300'
                                }`}
                                title="Pi (3.14159...)"
                            >
                                π
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('e')}
                                className={`py-1.5 rounded-lg transition font-serif ${
                                    isDarkMode ? 'bg-slate-800/70 text-amber-300 hover:bg-slate-700' : 'bg-slate-200 text-amber-700 hover:bg-slate-300'
                                }`}
                                title="Euler Constant e (2.71828...)"
                            >
                                e
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('(')}
                                className={`py-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Left Parenthesis"
                            >
                                (
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert(')')}
                                className={`py-1.5 rounded-lg transition ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Right Parenthesis"
                            >
                                )
                            </button>
                        </div>

                        {/* Row 3: Exponents, Roots, Logs & Numbers 7, 8, 9, ÷ */}
                        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => handleInsert(isSecondMode ? 'cbrt(' : 'sqrt(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title={isSecondMode ? 'Cube Root' : 'Square Root'}
                            >
                                {isSecondMode ? '∛x' : '√x'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('^2')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title="Square (x²)"
                            >
                                x²
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('^')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title="Power (xʸ)"
                            >
                                xʸ
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('7')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                7
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('8')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                8
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('9')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                9
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('÷')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.opKey}`}
                                title="Divide"
                            >
                                ÷
                            </button>
                        </div>

                        {/* Row 4: Logs, Hyperbolic & Numbers 4, 5, 6, × */}
                        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => handleInsert(isSecondMode ? 'exp(' : 'ln(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title={isSecondMode ? 'Exponential eˣ' : 'Natural Logarithm ln'}
                            >
                                {isSecondMode ? 'eˣ' : 'ln'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert(isSecondMode ? '10^' : 'log10(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title={isSecondMode ? '10ˣ' : 'Base-10 Logarithm'}
                            >
                                {isSecondMode ? '10ˣ' : 'log₁₀'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('!')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title="Factorial (n!)"
                            >
                                n!
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('4')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                4
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('5')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                5
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('6')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                6
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('×')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.opKey}`}
                                title="Multiply"
                            >
                                ×
                            </button>
                        </div>

                        {/* Row 5: Inverses, Abs & Numbers 1, 2, 3, − */}
                        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => handleInsert('1/(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title="Reciprocal 1/x"
                            >
                                1/x
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('abs(')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title="Absolute Value |x|"
                            >
                                |x|
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('%')}
                                className={`py-1.5 rounded-lg transition font-mono ${theme.fnKey}`}
                                title="Percentage (%)"
                            >
                                %
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('1')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                1
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('2')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                2
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('3')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                3
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('−')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.opKey}`}
                                title="Subtract"
                            >
                                −
                            </button>
                        </div>

                        {/* Row 6: Fractions, 0, Decimal, Equals, Add */}
                        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold">
                            {/* Fraction ↔ Decimal Converter */}
                            <button
                                type="button"
                                onClick={() => {
                                    const num = evaluateExpression(expression).val;
                                    if (!isNaN(num) && isFinite(num)) {
                                        const frac = decimalToFraction(num);
                                        if (frac && frac.den > 1) {
                                            toast(`Fraction: ${frac.str}`, { icon: '🔢' });
                                            setFractionResult(frac.str);
                                        } else {
                                            toast('Already an integer / irreducible', { icon: 'ℹ️' });
                                        }
                                    }
                                }}
                                className={`py-1.5 rounded-lg transition font-mono ${
                                    isDarkMode ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                }`}
                                title="Fraction ↔ Decimal Converter (Farey Algorithm)"
                            >
                                a/b
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setExpression(prev => (prev.startsWith('-') ? prev.slice(1) : '-' + prev));
                                }}
                                className={`py-1.5 rounded-lg transition font-mono ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Negate (±)"
                            >
                                ±
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('0')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('.')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.numKey}`}
                            >
                                .
                            </button>
                            <button
                                type="button"
                                onClick={handleEquals}
                                className="col-span-2 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-sm font-mono shadow-md flex items-center justify-center gap-1 active:scale-95"
                                title="Evaluate Expression"
                            >
                                <span>=</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsert('+')}
                                className={`py-1.5 rounded-lg transition text-sm font-mono ${theme.opKey}`}
                                title="Add"
                            >
                                +
                            </button>
                        </div>
                    </div>
                )}

                {/* Binary / Programmer Mode (Tab 2) */}
                {!isMinimized && activeTab === 'binary' && (
                    <div className={`p-2.5 flex flex-col gap-2 ${theme.keypadBg}`}>
                        {/* Interactive 32-Bit Bit Matrix */}
                        <div className={`p-2 rounded-xl border flex flex-col gap-1 ${
                            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-0.5">
                                <span>BIT MATRIX ({progWordSize}-BIT)</span>
                                <span className="text-cyan-400">Click bit to toggle</span>
                            </div>

                            {/* Render rows of 8 bits each (31-24, 23-16, 15-8, 7-0) */}
                            {[
                                { start: 31, end: 24, label: '31-24' },
                                { start: 23, end: 16, label: '23-16' },
                                { start: 15, end: 8, label: '15-8' },
                                { start: 7, end: 0, label: '7-0' }
                            ].map(group => (
                                <div key={group.label} className="flex items-center justify-between gap-1">
                                    <span className="text-[9px] font-mono text-slate-500 w-8">{group.label}</span>
                                    <div className="flex-1 grid grid-cols-8 gap-0.5">
                                        {Array.from({ length: 8 }).map((_, idx) => {
                                            const bitIdx = group.start - idx;
                                            const isSet = (progValue & (1n << BigInt(bitIdx))) !== 0n;
                                            const isAboveWordSize = bitIdx >= progWordSize;

                                            return (
                                                <button
                                                    key={bitIdx}
                                                    type="button"
                                                    disabled={isAboveWordSize}
                                                    onClick={() => handleToggleBit(bitIdx)}
                                                    className={`py-1 rounded text-center font-mono text-[11px] font-bold transition ${
                                                        isAboveWordSize
                                                            ? 'opacity-20 bg-transparent text-slate-600 cursor-not-allowed'
                                                            : isSet
                                                                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                                                                : isDarkMode
                                                                    ? 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                    title={`Bit ${bitIdx} (2^${bitIdx}) = ${isSet ? '1' : '0'}`}
                                                >
                                                    {isSet ? '1' : '0'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Programmer Keypad */}
                        <div className="flex flex-col gap-1 text-[11px] font-semibold">
                            {/* Bitwise Operation Row */}
                            <div className="grid grid-cols-7 gap-1">
                                {[
                                    { op: 'AND', label: 'AND' },
                                    { op: 'OR', label: 'OR' },
                                    { op: 'XOR', label: 'XOR' },
                                    { op: 'NOT', label: 'NOT', unary: true },
                                    { op: 'LSH', label: '<<' },
                                    { op: 'RSH', label: '>>' },
                                    { op: 'MOD', label: 'MOD' }
                                ].map(b => (
                                    <button
                                        key={b.op}
                                        type="button"
                                        onClick={() => {
                                            if (b.unary) handleProgUnary(b.op);
                                            else handleProgOp(b.op);
                                        }}
                                        className={`py-1.5 rounded-lg font-mono text-[10px] transition ${
                                            progOp === b.op
                                                ? 'bg-amber-400 text-slate-950 font-bold'
                                                : theme.fnKey
                                        }`}
                                    >
                                        {b.label}
                                    </button>
                                ))}
                            </div>

                            {/* Row 1: A, B, 7, 8, 9, ÷, C */}
                            <div className="grid grid-cols-7 gap-1">
                                <button
                                    type="button"
                                    disabled={progBase !== 'HEX'}
                                    onClick={() => handleProgDigit('A')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase === 'HEX' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    A
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase !== 'HEX'}
                                    onClick={() => handleProgDigit('B')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase === 'HEX' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN'}
                                    onClick={() => handleProgDigit('7')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    7
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN' || progBase === 'OCT'}
                                    onClick={() => handleProgDigit('8')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' && progBase !== 'OCT' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    8
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN' || progBase === 'OCT'}
                                    onClick={() => handleProgDigit('9')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' && progBase !== 'OCT' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    9
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgOp('/')}
                                    className={`py-1.5 rounded-lg font-mono transition ${theme.opKey}`}
                                >
                                    ÷
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProgClear}
                                    className="py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold transition"
                                >
                                    C
                                </button>
                            </div>

                            {/* Row 2: C, D, 4, 5, 6, ×, DEL */}
                            <div className="grid grid-cols-7 gap-1">
                                <button
                                    type="button"
                                    disabled={progBase !== 'HEX'}
                                    onClick={() => handleProgDigit('C')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase === 'HEX' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    C
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase !== 'HEX'}
                                    onClick={() => handleProgDigit('D')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase === 'HEX' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    D
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN'}
                                    onClick={() => handleProgDigit('4')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    4
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN'}
                                    onClick={() => handleProgDigit('5')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    5
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN'}
                                    onClick={() => handleProgDigit('6')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    6
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgOp('*')}
                                    className={`py-1.5 rounded-lg font-mono transition ${theme.opKey}`}
                                >
                                    ×
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProgBackspace}
                                    className={`py-1.5 rounded-lg flex items-center justify-center transition ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700'}`}
                                >
                                    <Delete className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Row 3: E, F, 1, 2, 3, −, ± */}
                            <div className="grid grid-cols-7 gap-1">
                                <button
                                    type="button"
                                    disabled={progBase !== 'HEX'}
                                    onClick={() => handleProgDigit('E')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase === 'HEX' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    E
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase !== 'HEX'}
                                    onClick={() => handleProgDigit('F')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase === 'HEX' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    F
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgDigit('1')}
                                    className={`py-1.5 rounded-lg font-mono transition ${theme.numKey}`}
                                >
                                    1
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN'}
                                    onClick={() => handleProgDigit('2')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    2
                                </button>
                                <button
                                    type="button"
                                    disabled={progBase === 'BIN'}
                                    onClick={() => handleProgDigit('3')}
                                    className={`py-1.5 rounded-lg font-mono transition ${progBase !== 'BIN' ? theme.numKey : 'opacity-25 pointer-events-none'}`}
                                >
                                    3
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgOp('-')}
                                    className={`py-1.5 rounded-lg font-mono transition ${theme.opKey}`}
                                >
                                    −
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProgValue(prev => clampProgBigInt(-prev, progWordSize));
                                    }}
                                    className={`py-1.5 rounded-lg font-mono transition ${theme.fnKey}`}
                                    title="Two's Complement Negate (±)"
                                >
                                    ±
                                </button>
                            </div>

                            {/* Row 4: <<1, >>1, 0, =, + */}
                            <div className="grid grid-cols-7 gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleProgUnary('LSH1')}
                                    className={`py-1.5 rounded-lg font-mono text-[10px] transition ${theme.fnKey}`}
                                    title="Shift Left 1 bit"
                                >
                                    &lt;&lt;1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgUnary('RSH1')}
                                    className={`py-1.5 rounded-lg font-mono text-[10px] transition ${theme.fnKey}`}
                                    title="Shift Right 1 bit"
                                >
                                    &gt;&gt;1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgDigit('0')}
                                    className={`col-span-2 py-1.5 rounded-lg font-mono transition ${theme.numKey}`}
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProgEquals}
                                    className="col-span-2 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition font-mono shadow-md flex items-center justify-center gap-1 active:scale-95"
                                >
                                    =
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleProgOp('+')}
                                    className={`py-1.5 rounded-lg font-mono transition ${theme.opKey}`}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEM Physical & Chemical Constants (Tab 3) */}
                {!isMinimized && activeTab === 'constants' && (
                    <div className={`p-2.5 flex flex-col gap-2 max-h-[260px] overflow-y-auto custom-scrollbar ${theme.keypadBg}`}>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Universal Physical Constants</span>
                            <span className="text-[9px] text-cyan-400">Click to insert</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {STEM_CONSTANTS.map((c) => (
                                <button
                                    key={c.symbol}
                                    type="button"
                                    onClick={() => handleInsertConstant(c)}
                                    className={`p-2 rounded-xl text-left border transition flex flex-col gap-0.5 ${
                                        isDarkMode
                                            ? 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-700/90 text-slate-200'
                                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-serif font-bold text-amber-400 text-sm">{c.symbol}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                                            {c.category}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold truncate">{c.name}</span>
                                    <div className="text-[10px] font-mono text-slate-400 truncate">
                                        {c.val} <span className="text-slate-500">{c.unit}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Dynamic Function Curve Visualizer f(x) (Tab 3) */}
                {!isMinimized && activeTab === 'plot' && (
                    <div className={`p-2.5 flex flex-col gap-2 ${theme.keypadBg}`}>
                        {/* Function formula bar */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-cyan-400">f(x) =</span>
                            <input
                                type="text"
                                value={plotFunction}
                                onChange={(e) => setPlotFunction(e.target.value)}
                                placeholder="sin(x)"
                                className={`flex-1 px-2 py-1 rounded-lg text-xs font-mono border outline-none ${
                                    isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                            />
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 text-[10px] overflow-x-auto pb-0.5 custom-scrollbar">
                            {['sin(x)', 'cos(x)', 'x^2 - 4', '1/x', 'sqrt(abs(x))', 'exp(-0.2*x)*sin(2*x)'].map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setPlotFunction(preset)}
                                    className={`px-1.5 py-0.5 rounded font-mono shrink-0 transition ${
                                        plotFunction === preset
                                            ? 'bg-cyan-500 text-slate-950 font-bold'
                                            : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Dynamic SVG Coordinate Canvas */}
                        <div className={`relative h-[130px] rounded-xl border overflow-hidden flex items-center justify-center ${
                            isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                            <svg className="w-full h-full" viewBox="0 0 260 140">
                                {/* Grid lines */}
                                <g stroke={isDarkMode ? '#334155' : '#cbd5e1'} strokeWidth="0.5" strokeDasharray="2,2">
                                    <line x1="10" y1="70" x2="250" y2="70" stroke={isDarkMode ? '#64748b' : '#94a3b8'} strokeWidth="1" strokeDasharray="none" />
                                    <line x1="130" y1="10" x2="130" y2="130" stroke={isDarkMode ? '#64748b' : '#94a3b8'} strokeWidth="1" strokeDasharray="none" />
                                    {/* Horizontal reference steps */}
                                    <line x1="10" y1="34" x2="250" y2="34" />
                                    <line x1="10" y1="106" x2="250" y2="106" />
                                    {/* Vertical reference steps */}
                                    <line x1="82" y1="10" x2="82" y2="130" />
                                    <line x1="178" y1="10" x2="178" y2="130" />
                                </g>

                                {/* Origin label */}
                                <text x="133" y="82" fontSize="9" fill={isDarkMode ? '#64748b' : '#94a3b8'} fontFamily="monospace">0</text>
                                <text x="240" y="82" fontSize="9" fill={isDarkMode ? '#64748b' : '#94a3b8'} fontFamily="monospace">+x</text>
                                <text x="133" y="20" fontSize="9" fill={isDarkMode ? '#64748b' : '#94a3b8'} fontFamily="monospace">+y</text>

                                {/* Continuous plotted function path */}
                                {curvePlotData.pathD && (
                                    <path
                                        d={curvePlotData.pathD}
                                        fill="none"
                                        stroke="#06b6d4"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}

                                {/* Scrubber cursor dot tracking (x, f(x)) */}
                                {curvePlotData.scrubberSvgY !== null && (
                                    <g>
                                        <line
                                            x1={curvePlotData.scrubberSvgX}
                                            y1="10"
                                            x2={curvePlotData.scrubberSvgX}
                                            y2="130"
                                            stroke="#f59e0b"
                                            strokeWidth="1"
                                            strokeDasharray="2,2"
                                        />
                                        <circle
                                            cx={curvePlotData.scrubberSvgX}
                                            cy={curvePlotData.scrubberSvgY}
                                            r="4.5"
                                            fill="#f59e0b"
                                            stroke="#fff"
                                            strokeWidth="1.5"
                                        />
                                    </g>
                                )}
                            </svg>

                            {/* Scrubber readout overlay */}
                            <div className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-amber-300">
                                x = {scrubberX.toFixed(2)}, f(x) = {curvePlotData.currentScrubberY !== null ? curvePlotData.currentScrubberY.toFixed(2) : 'undef'}
                            </div>
                        </div>

                        {/* Scrubber Slider */}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <Sliders className="w-3 h-3 text-cyan-400" />
                            <span>Scan x:</span>
                            <input
                                type="range"
                                min="-8"
                                max="8"
                                step="0.1"
                                value={scrubberX}
                                onChange={(e) => setScrubberX(parseFloat(e.target.value))}
                                className="flex-1 accent-cyan-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                            />
                            <span className="text-cyan-300 font-bold w-9 text-right">{scrubberX.toFixed(1)}</span>
                        </div>
                    </div>
                )}

                {/* Bottom Action Bar: Whiteboard Insertion */}
                {!isMinimized && (
                    <div className="p-2 border-t border-slate-700/60 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                if (activeTab === 'binary') {
                                    handleInsertProgToWhiteboard();
                                } else if (activeTab === 'plot') {
                                    handleInsertToWhiteboard(`f(x) = ${plotFunction}`, `f(${scrubberX.toFixed(1)}) = ${curvePlotData.currentScrubberY !== null ? curvePlotData.currentScrubberY.toFixed(2) : ''}`);
                                } else {
                                    handleInsertToWhiteboard();
                                }
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
                            title="Insert this evaluated formula onto Whiteboard Canvas as interactive KaTeX equation"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>
                                {activeTab === 'binary'
                                    ? 'Insert Binary Equation to Whiteboard'
                                    : activeTab === 'plot'
                                        ? 'Insert Function Graph to Whiteboard'
                                        : 'Insert Equation to Whiteboard'}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Right-Side Attached Collapsible History Panel */}
            {showHistory && (
                <div className={`w-[280px] flex flex-col shrink-0 animate-in slide-in-from-left-4 duration-200 ${theme.historyPanel}`}>
                    {/* History Header */}
                    <div className={`px-3 py-2.5 border-b flex items-center justify-between ${theme.header}`}>
                        <div className="flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs font-bold">Calculation Tape</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-semibold">
                                {history.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setHistory([]);
                                    toast.success('History tape cleared');
                                }}
                                className="text-[10px] text-slate-400 hover:text-rose-400 px-1 py-0.5 rounded transition"
                                title="Clear History"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowHistory(false)}
                                className="p-1 text-slate-400 hover:text-white rounded transition"
                                title="Close History Panel"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* History Items Scroll Area */}
                    <div className="flex-1 max-h-[380px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5 text-xs">
                        {history.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-[11px] italic flex flex-col items-center gap-1">
                                <History className="w-5 h-5 opacity-40" />
                                <span>No calculations recorded yet</span>
                            </div>
                        ) : (
                            history.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`p-2 rounded-xl border transition flex flex-col gap-1 group ${
                                        isDarkMode
                                            ? 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                                        <span className={`px-1 py-0.2 rounded font-bold ${item.mode === 'DEG' ? 'text-amber-400 bg-amber-400/10' : 'text-cyan-400 bg-cyan-400/10'}`}>
                                            {item.mode || 'DEG'}
                                        </span>
                                        <span>{item.timestamp}</span>
                                    </div>

                                    {/* Expression - clickable to restore */}
                                    <div
                                        onClick={() => {
                                            setExpression(item.expr);
                                            setResult(item.result);
                                            setFractionResult(item.fraction || '');
                                            toast.success('Restored to calculator', { icon: '↩️' });
                                        }}
                                        className="font-mono text-slate-300 text-[11px] truncate cursor-pointer hover:text-cyan-400 transition"
                                        title={`Click to restore: ${item.expr}`}
                                    >
                                        {item.expr}
                                    </div>

                                    {/* Result row & action buttons */}
                                    <div className="flex items-center justify-between font-mono font-bold text-cyan-400 text-xs">
                                        <div className="flex items-center gap-1">
                                            <span>= {item.result}</span>
                                            {item.fraction && (
                                                <span className="text-[10px] text-emerald-400">({item.fraction})</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${item.expr} = ${item.result}`);
                                                    toast.success('Copied equation!', { icon: '📋' });
                                                }}
                                                className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-300 transition"
                                                title="Copy calculation"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleInsertToWhiteboard(item.expr, item.result)}
                                                className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 transition"
                                                title="Place this past calculation on Whiteboard"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* History Tape Footer */}
                    {history.length > 0 && (
                        <div className="p-2 border-t border-slate-800/80 bg-slate-900/40">
                            <button
                                type="button"
                                onClick={() => {
                                    const tape = history.map(h => `${h.expr} = ${h.result}`).join('\n');
                                    navigator.clipboard.writeText(tape);
                                    toast.success('Copied entire calculation tape!', { icon: '📜' });
                                }}
                                className="w-full py-1 px-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                            >
                                <Copy className="w-3 h-3" />
                                <span>Copy All History</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
