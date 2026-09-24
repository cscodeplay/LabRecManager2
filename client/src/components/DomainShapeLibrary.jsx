'use client';

import React, { useState } from 'react';
import { 
    X, Search, Laptop, Dna, Zap, FlaskConical, 
    Binary, Compass, MessageSquare, Plus, Check
} from 'lucide-react';

/**
 * Domain-Specific Shape Library for Education & Technical Diagrams
 * Each shape defines:
 * - id: unique key
 * - name: user-visible label
 * - category: 'cs' | 'biology' | 'physics' | 'chemistry' | 'math' | 'general'
 * - defaultWidth, defaultHeight: recommended initial size
 * - renderSVG(width, height, strokeColor, strokeWidth, fillColor): returns SVG elements
 */
export const DOMAIN_SHAPES = {
    // ═══════════════════════════════════════════════════════════════════
    // 1. COMPUTER SCIENCE / IT
    // ═══════════════════════════════════════════════════════════════════
    cs_server: {
        id: 'cs_server',
        name: 'Server Rack',
        category: 'cs',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={w*0.05} y={h*0.05} width={w*0.9} height={h*0.9} rx={6} />
                <line x1={w*0.05} y1={h*0.35} x2={w*0.95} y2={h*0.35} />
                <line x1={w*0.05} y1={h*0.65} x2={w*0.95} y2={h*0.65} />
                <circle cx={w*0.2} cy={h*0.2} r={w*0.04} fill={stroke} />
                <circle cx={w*0.32} cy={h*0.2} r={w*0.04} fill={stroke} />
                <line x1={w*0.6} y1={h*0.2} x2={w*0.85} y2={h*0.2} strokeWidth={sw*1.2} />
                <circle cx={w*0.2} cy={h*0.5} r={w*0.04} fill={stroke} />
                <circle cx={w*0.32} cy={h*0.5} r={w*0.04} fill={stroke} />
                <line x1={w*0.6} y1={h*0.5} x2={w*0.85} y2={h*0.5} strokeWidth={sw*1.2} />
                <circle cx={w*0.2} cy={h*0.8} r={w*0.04} fill={stroke} />
                <circle cx={w*0.32} cy={h*0.8} r={w*0.04} fill={stroke} />
                <line x1={w*0.6} y1={h*0.8} x2={w*0.85} y2={h*0.8} strokeWidth={sw*1.2} />
            </g>
        )
    },
    cs_database: {
        id: 'cs_database',
        name: 'Database / Storage',
        category: 'cs',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <ellipse cx={w/2} cy={h*0.2} rx={w*0.45} ry={h*0.14} />
                <path d={`M ${w*0.05} ${h*0.2} v ${h*0.6} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0 v -${h*0.6}`} />
                <path d={`M ${w*0.05} ${h*0.5} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0`} fill="none" />
                <path d={`M ${w*0.05} ${h*0.75} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0`} fill="none" />
            </g>
        )
    },
    cs_cloud: {
        id: 'cs_cloud',
        name: 'Cloud Infrastructure',
        category: 'cs',
        defaultWidth: 120,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <path
                d={`M ${w*0.25} ${h*0.75} 
                    C ${w*0.05} ${h*0.75} ${w*0.02} ${h*0.45} ${w*0.22} ${h*0.42} 
                    C ${w*0.18} ${h*0.15} ${w*0.52} ${h*0.08} ${w*0.58} ${h*0.3} 
                    C ${w*0.68} ${h*0.15} ${w*0.92} ${h*0.22} ${w*0.9} ${h*0.45} 
                    C ${w*1.02} ${h*0.52} ${w*1.02} ${h*0.75} ${w*0.82} ${h*0.75} Z`}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                strokeLinejoin="round"
            />
        )
    },
    cs_router: {
        id: 'cs_router',
        name: 'Network Router',
        category: 'cs',
        defaultWidth: 100,
        defaultHeight: 70,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                {/* Antennas */}
                <line x1={w*0.2} y1={h*0.3} x2={w*0.1} y2={h*0.05} strokeLinecap="round" />
                <line x1={w*0.8} y1={h*0.3} x2={w*0.9} y2={h*0.05} strokeLinecap="round" />
                {/* Main Body */}
                <rect x={w*0.05} y={h*0.3} width={w*0.9} height={h*0.55} rx={8} />
                {/* Router arrows cross */}
                <line x1={w*0.25} y1={h*0.58} x2={w*0.45} y2={h*0.58} strokeWidth={sw*1.2} />
                <line x1={w*0.55} y1={h*0.58} x2={w*0.75} y2={h*0.58} strokeWidth={sw*1.2} />
                <line x1={w*0.5} y1={h*0.42} x2={w*0.5} y2={h*0.72} strokeWidth={sw*1.2} />
                <circle cx={w*0.85} cy={h*0.45} r={w*0.025} fill="#22c55e" stroke="none" />
                <circle cx={w*0.85} cy={h*0.6} r={w*0.025} fill="#22c55e" stroke="none" />
            </g>
        )
    },
    cs_firewall: {
        id: 'cs_firewall',
        name: 'Firewall Security',
        category: 'cs',
        defaultWidth: 90,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={w*0.05} y={h*0.08} width={w*0.9} height={h*0.84} rx={4} />
                {/* Brick Pattern */}
                <line x1={w*0.05} y1={h*0.36} x2={w*0.95} y2={h*0.36} />
                <line x1={w*0.05} y1={h*0.64} x2={w*0.95} y2={h*0.64} />
                <line x1={w*0.35} y1={h*0.08} x2={w*0.35} y2={h*0.36} />
                <line x1={w*0.65} y1={h*0.08} x2={w*0.65} y2={h*0.36} />
                <line x1={w*0.5} y1={h*0.36} x2={w*0.5} y2={h*0.64} />
                <line x1={w*0.2} y1={h*0.64} x2={w*0.2} y2={h*0.92} />
                <line x1={w*0.8} y1={h*0.64} x2={w*0.8} y2={h*0.92} />
            </g>
        )
    },
    cs_laptop: {
        id: 'cs_laptop',
        name: 'Client Laptop',
        category: 'cs',
        defaultWidth: 100,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={w*0.15} y={h*0.1} width={w*0.7} height={h*0.58} rx={4} />
                <rect x={w*0.22} y={h*0.17} width={w*0.56} height={h*0.44} fill={stroke} fillOpacity={0.15} />
                <path d={`M ${w*0.05} ${h*0.75} L ${w*0.95} ${h*0.75} L ${w*0.85} ${h*0.88} L ${w*0.15} ${h*0.88} Z`} />
                <line x1={w*0.42} y1={h*0.78} x2={w*0.58} y2={h*0.78} strokeWidth={sw*1.2} />
            </g>
        )
    },
    cs_uml_class: {
        id: 'cs_uml_class',
        name: 'UML Class Box',
        category: 'cs',
        defaultWidth: 120,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={0} y={0} width={w} height={h} rx={4} />
                <line x1={0} y1={h*0.32} x2={w} y2={h*0.32} />
                <line x1={0} y1={h*0.65} x2={w} y2={h*0.65} />
                <line x1={w*0.1} y1={h*0.48} x2={w*0.6} y2={h*0.48} strokeDasharray="3 3" />
                <line x1={w*0.1} y1={h*0.82} x2={w*0.75} y2={h*0.82} strokeDasharray="3 3" />
            </g>
        )
    },
    cs_flow_decision: {
        id: 'cs_flow_decision',
        name: 'Decision Diamond',
        category: 'cs',
        defaultWidth: 100,
        defaultHeight: 70,
        renderSVG: (w, h, stroke, sw, fill) => (
            <polygon 
                points={`${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`} 
                stroke={stroke} 
                strokeWidth={sw} 
                fill={fill} 
                strokeLinejoin="round" 
            />
        )
    },
    cs_flow_data: {
        id: 'cs_flow_data',
        name: 'Input / Output Parallelogram',
        category: 'cs',
        defaultWidth: 110,
        defaultHeight: 60,
        renderSVG: (w, h, stroke, sw, fill) => (
            <polygon 
                points={`${w*0.2},0 ${w},0 ${w*0.8},${h} 0,${h}`} 
                stroke={stroke} 
                strokeWidth={sw} 
                fill={fill} 
                strokeLinejoin="round" 
            />
        )
    },
    cs_data_structure_stack: {
        id: 'cs_data_structure_stack',
        name: 'Stack / Array Buffer',
        category: 'cs',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={w*0.1} y={h*0.05} width={w*0.8} height={h*0.9} rx={4} />
                <line x1={w*0.1} y1={h*0.28} x2={w*0.9} y2={h*0.28} />
                <line x1={w*0.1} y1={h*0.5} x2={w*0.9} y2={h*0.5} />
                <line x1={w*0.1} y1={h*0.72} x2={w*0.9} y2={h*0.72} />
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 2. BIOLOGY
    // ═══════════════════════════════════════════════════════════════════
    bio_dna: {
        id: 'bio_dna',
        name: 'DNA Double Helix',
        category: 'biology',
        defaultWidth: 110,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                {/* Two intertwining sine waves */}
                <path d={`M 0 ${h*0.2} Q ${w*0.25} ${h*0.8} ${w*0.5} ${h*0.2} T ${w} ${h*0.2}`} strokeLinecap="round" />
                <path d={`M 0 ${h*0.8} Q ${w*0.25} ${h*0.2} ${w*0.5} ${h*0.8} T ${w} ${h*0.8}`} strokeLinecap="round" />
                {/* Base Pair Rungs */}
                <line x1={w*0.15} y1={h*0.4} x2={w*0.15} y2={h*0.6} />
                <line x1={w*0.25} y1={h*0.25} x2={w*0.25} y2={h*0.75} strokeWidth={sw*1.1} />
                <line x1={w*0.35} y1={h*0.4} x2={w*0.35} y2={h*0.6} />
                <line x1={w*0.65} y1={h*0.4} x2={w*0.65} y2={h*0.6} />
                <line x1={w*0.75} y1={h*0.25} x2={w*0.75} y2={h*0.75} strokeWidth={sw*1.1} />
                <line x1={w*0.85} y1={h*0.4} x2={w*0.85} y2={h*0.6} />
            </g>
        )
    },
    bio_cell: {
        id: 'bio_cell',
        name: 'Animal Cell & Nucleus',
        category: 'biology',
        defaultWidth: 100,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <ellipse cx={w/2} cy={h/2} rx={w*0.46} ry={h*0.44} />
                {/* Nucleus */}
                <ellipse cx={w*0.45} cy={h*0.45} rx={w*0.2} ry={h*0.18} fill={stroke} fillOpacity={0.2} />
                <circle cx={w*0.42} cy={h*0.42} r={w*0.07} fill={stroke} />
                {/* Mitochondria / Organelles */}
                <ellipse cx={w*0.75} cy={h*0.35} rx={w*0.1} ry={h*0.05} transform={`rotate(35 ${w*0.75} ${h*0.35})`} />
                <ellipse cx={w*0.3} cy={h*0.78} rx={w*0.1} ry={h*0.05} transform={`rotate(-25 ${w*0.3} ${h*0.78})`} />
                <circle cx={w*0.7} cy={h*0.7} r={w*0.04} fill={stroke} />
            </g>
        )
    },
    bio_chromosome: {
        id: 'bio_chromosome',
        name: 'Chromosome (X)',
        category: 'biology',
        defaultWidth: 90,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                {/* Chromatid 1 */}
                <path d={`M ${w*0.2} ${h*0.1} C ${w*0.35} ${h*0.3} ${w*0.45} ${h*0.45} ${w*0.5} ${h*0.5} C ${w*0.55} ${h*0.55} ${w*0.65} ${h*0.7} ${w*0.8} ${h*0.9} C ${w*0.9} ${h*0.85} ${w*0.75} ${h*0.65} ${w*0.55} ${h*0.5} C ${w*0.75} ${h*0.35} ${w*0.9} ${h*0.15} ${w*0.8} ${h*0.1} Z`} />
                {/* Chromatid 2 */}
                <path d={`M ${w*0.8} ${h*0.1} C ${w*0.65} ${h*0.3} ${w*0.55} ${h*0.45} ${w*0.5} ${h*0.5} C ${w*0.45} ${h*0.55} ${w*0.35} ${h*0.7} ${w*0.2} ${h*0.9} C ${w*0.1} ${h*0.85} ${w*0.25} ${h*0.65} ${w*0.45} ${h*0.5} C ${w*0.25} ${h*0.35} ${w*0.1} ${h*0.15} ${w*0.2} ${h*0.1} Z`} />
                <circle cx={w/2} cy={h/2} r={w*0.08} fill={stroke} />
            </g>
        )
    },
    bio_heart: {
        id: 'bio_heart',
        name: 'Heart / Circulatory System',
        category: 'biology',
        defaultWidth: 90,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <path
                d={`M ${w/2} ${h*0.85} 
                    C ${w*0.1} ${h*0.55} 0 ${h*0.25} ${w*0.28} ${h*0.1} 
                    C ${w*0.42} ${h*0.02} ${w/2} ${h*0.2} ${w/2} ${h*0.28} 
                    C ${w/2} ${h*0.2} ${w*0.58} ${h*0.02} ${w*0.72} ${h*0.1} 
                    C ${w} ${h*0.25} ${w*0.9} ${h*0.55} ${w/2} ${h*0.85} Z`}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                strokeLinejoin="round"
            />
        )
    },
    bio_microscope: {
        id: 'bio_microscope',
        name: 'Microscope',
        category: 'biology',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={w*0.1} y={h*0.88} width={w*0.8} height={h*0.08} rx={2} />
                <path d={`M ${w*0.65} ${h*0.88} C ${w*0.85} ${h*0.6} ${w*0.85} ${h*0.3} ${w*0.55} ${h*0.25}`} fill="none" strokeWidth={sw*1.5} />
                <rect x={w*0.25} y={h*0.15} width={w*0.25} height={h*0.45} rx={3} transform={`rotate(-25 ${w*0.37} ${h*0.37})`} />
                <line x1={w*0.2} y1={h*0.62} x2={w*0.58} y2={h*0.62} strokeWidth={sw*1.3} />
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 3. PHYSICS
    // ═══════════════════════════════════════════════════════════════════
    phys_resistor: {
        id: 'phys_resistor',
        name: 'Resistor (Zigzag)',
        category: 'physics',
        defaultWidth: 120,
        defaultHeight: 50,
        renderSVG: (w, h, stroke, sw, fill) => (
            <path
                d={`M 0 ${h/2} 
                    L ${w*0.2} ${h/2} 
                    L ${w*0.28} ${h*0.15} 
                    L ${w*0.4} ${h*0.85} 
                    L ${w*0.52} ${h*0.15} 
                    L ${w*0.64} ${h*0.85} 
                    L ${w*0.72} ${h*0.15} 
                    L ${w*0.8} ${h/2} 
                    L ${w} ${h/2}`}
                stroke={stroke}
                strokeWidth={sw}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        )
    },
    phys_capacitor: {
        id: 'phys_capacitor',
        name: 'Capacitor',
        category: 'physics',
        defaultWidth: 100,
        defaultHeight: 60,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                <line x1={0} y1={h/2} x2={w*0.42} y2={h/2} />
                <line x1={w*0.42} y1={h*0.1} x2={w*0.42} y2={h*0.9} strokeWidth={sw*1.3} />
                <line x1={w*0.58} y1={h*0.1} x2={w*0.58} y2={h*0.9} strokeWidth={sw*1.3} />
                <line x1={w*0.58} y1={h/2} x2={w} y2={h/2} />
            </g>
        )
    },
    phys_battery: {
        id: 'phys_battery',
        name: 'DC Battery',
        category: 'physics',
        defaultWidth: 100,
        defaultHeight: 60,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                <line x1={0} y1={h/2} x2={w*0.4} y2={h/2} />
                {/* Long + plate */}
                <line x1={w*0.4} y1={h*0.05} x2={w*0.4} y2={h*0.95} strokeWidth={sw*1.2} />
                {/* Short - plate */}
                <line x1={w*0.6} y1={h*0.25} x2={w*0.6} y2={h*0.75} strokeWidth={sw*2} />
                <line x1={w*0.6} y1={h/2} x2={w} y2={h/2} />
            </g>
        )
    },
    phys_switch_open: {
        id: 'phys_switch_open',
        name: 'Open Switch',
        category: 'physics',
        defaultWidth: 100,
        defaultHeight: 60,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                <line x1={0} y1={h*0.65} x2={w*0.3} y2={h*0.65} />
                <circle cx={w*0.3} cy={h*0.65} r={w*0.04} fill={stroke} />
                <circle cx={w*0.7} cy={h*0.65} r={w*0.04} fill={stroke} />
                <line x1={w*0.3} y1={h*0.65} x2={w*0.68} y2={h*0.25} strokeWidth={sw*1.3} strokeLinecap="round" />
                <line x1={w*0.7} y1={h*0.65} x2={w} y2={h*0.65} />
            </g>
        )
    },
    phys_ground: {
        id: 'phys_ground',
        name: 'Earth Ground',
        category: 'physics',
        defaultWidth: 70,
        defaultHeight: 70,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                <line x1={w/2} y1={0} x2={w/2} y2={h*0.45} />
                <line x1={w*0.1} y1={h*0.45} x2={w*0.9} y2={h*0.45} strokeWidth={sw*1.2} />
                <line x1={w*0.25} y1={h*0.65} x2={w*0.75} y2={h*0.65} strokeWidth={sw*1.2} />
                <line x1={w*0.4} y1={h*0.85} x2={w*0.6} y2={h*0.85} strokeWidth={sw*1.2} />
            </g>
        )
    },
    phys_ammeter: {
        id: 'phys_ammeter',
        name: 'Ammeter (Current)',
        category: 'physics',
        defaultWidth: 80,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <line x1={0} y1={h/2} x2={w*0.15} y2={h/2} />
                <circle cx={w/2} cy={h/2} r={w*0.35} />
                <line x1={w*0.85} y1={h/2} x2={w} y2={h/2} />
                <text x={w/2} y={h*0.62} textAnchor="middle" fontSize={w*0.38} fontWeight="bold" fill={stroke} stroke="none" fontFamily="sans-serif">A</text>
            </g>
        )
    },
    phys_voltmeter: {
        id: 'phys_voltmeter',
        name: 'Voltmeter (Voltage)',
        category: 'physics',
        defaultWidth: 80,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <line x1={0} y1={h/2} x2={w*0.15} y2={h/2} />
                <circle cx={w/2} cy={h/2} r={w*0.35} />
                <line x1={w*0.85} y1={h/2} x2={w} y2={h/2} />
                <text x={w/2} y={h*0.62} textAnchor="middle" fontSize={w*0.38} fontWeight="bold" fill={stroke} stroke="none" fontFamily="sans-serif">V</text>
            </g>
        )
    },
    phys_wave: {
        id: 'phys_wave',
        name: 'Sine Wave (Oscillation)',
        category: 'physics',
        defaultWidth: 120,
        defaultHeight: 70,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                <line x1={0} y1={h/2} x2={w} y2={h/2} strokeDasharray="4 4" strokeOpacity={0.6} />
                <path d={`M 0 ${h/2} Q ${w*0.25} 0 ${w*0.5} ${h/2} T ${w} ${h/2}`} strokeLinecap="round" strokeWidth={sw*1.3} />
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 4. CHEMISTRY
    // ═══════════════════════════════════════════════════════════════════
    chem_beaker: {
        id: 'chem_beaker',
        name: 'Graduated Beaker',
        category: 'chemistry',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                {/* Spout & Body */}
                <path d={`M ${w*0.1} ${h*0.15} L ${w*0.05} ${h*0.1} L ${w*0.2} ${h*0.1} L ${w*0.8} ${h*0.1} L ${w*0.9} ${h*0.1} L ${w*0.85} ${h*0.88} C ${w*0.85} ${h*0.95} ${w*0.15} ${h*0.95} ${w*0.15} ${h*0.88} Z`} />
                {/* Liquid Level */}
                <path d={`M ${w*0.18} ${h*0.55} C ${w*0.4} ${h*0.5} ${w*0.6} ${h*0.6} ${w*0.82} ${h*0.55} L ${w*0.8} ${h*0.88} C ${w*0.8} ${h*0.93} ${w*0.2} ${h*0.93} ${w*0.2} ${h*0.88} Z`} fill={stroke} fillOpacity={0.2} stroke="none" />
                {/* Graduations */}
                <line x1={w*0.2} y1={h*0.3} x2={w*0.38} y2={h*0.3} />
                <line x1={w*0.2} y1={h*0.45} x2={w*0.45} y2={h*0.45} strokeWidth={sw*1.2} />
                <line x1={w*0.2} y1={h*0.6} x2={w*0.38} y2={h*0.6} />
                <line x1={w*0.2} y1={h*0.75} x2={w*0.45} y2={h*0.75} strokeWidth={sw*1.2} />
            </g>
        )
    },
    chem_flask: {
        id: 'chem_flask',
        name: 'Erlenmeyer Flask',
        category: 'chemistry',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <path d={`M ${w*0.38} ${h*0.08} L ${w*0.62} ${h*0.08} M ${w*0.4} ${h*0.08} L ${w*0.4} ${h*0.35} L ${w*0.08} ${h*0.88} C ${w*0.08} ${h*0.95} ${w*0.92} ${h*0.95} ${w*0.92} ${h*0.88} L ${w*0.6} ${h*0.35} L ${w*0.6} ${h*0.08}`} strokeLinejoin="round" />
                {/* Liquid Fill */}
                <path d={`M ${w*0.2} ${h*0.68} Q ${w/2} ${h*0.64} ${w*0.8} ${h*0.68} L ${w*0.88} ${h*0.88} C ${w*0.88} ${h*0.93} ${w*0.12} ${h*0.93} ${w*0.12} ${h*0.88} Z`} fill={stroke} fillOpacity={0.2} stroke="none" />
                <circle cx={w*0.42} cy={h*0.78} r={w*0.03} fill={stroke} />
                <circle cx={w*0.58} cy={h*0.72} r={w*0.04} fill={stroke} />
            </g>
        )
    },
    chem_test_tube: {
        id: 'chem_test_tube',
        name: 'Test Tube',
        category: 'chemistry',
        defaultWidth: 50,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <line x1={w*0.1} y1={h*0.08} x2={w*0.9} y2={h*0.08} strokeWidth={sw*1.3} />
                <path d={`M ${w*0.2} ${h*0.08} L ${w*0.2} ${h*0.82} C ${w*0.2} ${h*0.98} ${w*0.8} ${h*0.98} ${w*0.8} ${h*0.82} L ${w*0.8} ${h*0.08}`} />
                {/* Liquid */}
                <path d={`M ${w*0.2} ${h*0.45} Q ${w/2} ${h*0.42} ${w*0.8} ${h*0.45} L ${w*0.8} ${h*0.82} C ${w*0.8} ${h*0.95} ${w*0.2} ${h*0.95} ${w*0.2} ${h*0.82} Z`} fill={stroke} fillOpacity={0.25} stroke="none" />
            </g>
        )
    },
    chem_benzene: {
        id: 'chem_benzene',
        name: 'Benzene Aromatic Ring',
        category: 'chemistry',
        defaultWidth: 100,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <polygon 
                    points={`${w/2},${h*0.05} ${w*0.9},${h*0.28} ${w*0.9},${h*0.72} ${w/2},${h*0.95} ${w*0.1},${h*0.72} ${w*0.1},${h*0.28}`} 
                    strokeLinejoin="round" 
                />
                {/* Delocalized Pi Ring */}
                <circle cx={w/2} cy={h/2} r={w*0.25} fill="none" strokeWidth={sw*1.1} />
            </g>
        )
    },
    chem_bunsen_burner: {
        id: 'chem_bunsen_burner',
        name: 'Bunsen Burner',
        category: 'chemistry',
        defaultWidth: 80,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                {/* Flame */}
                <path d={`M ${w/2} ${h*0.1} C ${w*0.35} ${h*0.25} ${w*0.38} ${h*0.4} ${w/2} ${h*0.45} C ${w*0.62} ${h*0.4} ${w*0.65} ${h*0.25} ${w/2} ${h*0.1} Z`} fill="#f59e0b" stroke="#ea580c" />
                {/* Chimney */}
                <rect x={w*0.42} y={h*0.45} width={w*0.16} height={h*0.35} />
                <ellipse cx={w/2} cy={h*0.75} rx={w*0.15} ry={h*0.04} />
                {/* Heavy Stand */}
                <path d={`M ${w*0.15} ${h*0.92} L ${w*0.85} ${h*0.92} L ${w*0.75} ${h*0.82} L ${w*0.25} ${h*0.82} Z`} />
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 5. MATHEMATICS
    // ═══════════════════════════════════════════════════════════════════
    math_cartesian_axes: {
        id: 'math_cartesian_axes',
        name: '2D Coordinate Axes (X-Y)',
        category: 'math',
        defaultWidth: 110,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                {/* X Axis */}
                <line x1={w*0.05} y1={h/2} x2={w*0.95} y2={h/2} strokeWidth={sw*1.2} />
                <polygon points={`${w*0.98},${h/2} ${w*0.9},${h/2 - 4} ${w*0.9},${h/2 + 4}`} fill={stroke} />
                {/* Y Axis */}
                <line x1={w/2} y1={h*0.95} x2={w/2} y2={h*0.05} strokeWidth={sw*1.2} />
                <polygon points={`${w/2},${h*0.02} ${w/2 - 4},${h*0.1} ${w/2 + 4},${h*0.1}`} fill={stroke} />
                {/* Ticks */}
                <line x1={w*0.25} y1={h/2 - 3} x2={w*0.25} y2={h/2 + 3} />
                <line x1={w*0.75} y1={h/2 - 3} x2={w*0.75} y2={h/2 + 3} />
                <line x1={w/2 - 3} y1={h*0.25} x2={w/2 + 3} y2={h*0.25} />
                <line x1={w/2 - 3} y1={h*0.75} x2={w/2 + 3} y2={h*0.75} />
            </g>
        )
    },
    math_cylinder: {
        id: 'math_cylinder',
        name: '3D Cylinder',
        category: 'math',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <ellipse cx={w/2} cy={h*0.2} rx={w*0.45} ry={h*0.15} />
                <path d={`M ${w*0.05} ${h*0.2} v ${h*0.6} c 0 ${h*0.18} ${w*0.9} ${h*0.18} ${w*0.9} 0 v -${h*0.6}`} />
            </g>
        )
    },
    math_cone: {
        id: 'math_cone',
        name: '3D Cone',
        category: 'math',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <ellipse cx={w/2} cy={h*0.82} rx={w*0.45} ry={h*0.15} />
                <line x1={w*0.05} y1={h*0.82} x2={w/2} y2={h*0.05} />
                <line x1={w*0.95} y1={h*0.82} x2={w/2} y2={h*0.05} />
            </g>
        )
    },
    math_cube: {
        id: 'math_cube',
        name: 'Isometric 3D Cube',
        category: 'math',
        defaultWidth: 100,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill} strokeLinejoin="round">
                {/* Top Face */}
                <polygon points={`${w/2},${h*0.05} ${w*0.95},${h*0.28} ${w/2},${h*0.5} ${w*0.05},${h*0.28}`} />
                {/* Left Face */}
                <polygon points={`${w*0.05},${h*0.28} ${w/2},${h*0.5} ${w/2},${h*0.95} ${w*0.05},${h*0.72}`} fillOpacity={0.8} />
                {/* Right Face */}
                <polygon points={`${w/2},${h*0.5} ${w*0.95},${h*0.28} ${w*0.95},${h*0.72} ${w/2},${h*0.95}`} fillOpacity={0.6} />
            </g>
        )
    },
    math_angle: {
        id: 'math_angle',
        name: 'Angle with Arc (Theta)',
        category: 'math',
        defaultWidth: 100,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill="none">
                <line x1={w*0.1} y1={h*0.85} x2={w*0.95} y2={h*0.85} strokeWidth={sw*1.2} />
                <line x1={w*0.1} y1={h*0.85} x2={w*0.75} y2={h*0.15} strokeWidth={sw*1.2} />
                <path d={`M ${w*0.4} ${h*0.85} A ${w*0.3} ${w*0.3} 0 0 0 ${w*0.34} ${h*0.59}`} />
                <text x={w*0.45} y={h*0.72} fill={stroke} fontSize={w*0.18} fontFamily="serif" stroke="none">θ</text>
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 6. GENERAL EDUCATION & DIAGRAMMING
    // ═══════════════════════════════════════════════════════════════════
    edu_speech_bubble: {
        id: 'edu_speech_bubble',
        name: 'Speech Bubble Callout',
        category: 'general',
        defaultWidth: 110,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <path
                d={`M ${w*0.15} 0 
                    L ${w*0.85} 0 
                    C ${w} 0 ${w} ${h*0.1} ${w} ${h*0.2} 
                    L ${w} ${h*0.55} 
                    C ${w} ${h*0.7} ${w*0.9} ${h*0.7} ${w*0.8} ${h*0.7} 
                    L ${w*0.45} ${h*0.7} 
                    L ${w*0.2} ${h*0.98} 
                    L ${w*0.25} ${h*0.7} 
                    L ${w*0.15} ${h*0.7} 
                    C 0 ${h*0.7} 0 ${h*0.6} 0 ${h*0.5} 
                    L 0 ${h*0.2} 
                    C 0 ${h*0.05} ${w*0.05} 0 ${w*0.15} 0 Z`}
                stroke={stroke}
                strokeWidth={sw}
                fill={fill}
                strokeLinejoin="round"
            />
        )
    },
    edu_thought_bubble: {
        id: 'edu_thought_bubble',
        name: 'Thought Cloud Callout',
        category: 'general',
        defaultWidth: 120,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <path
                    d={`M ${w*0.25} ${h*0.65} 
                        C ${w*0.05} ${h*0.65} ${w*0.02} ${h*0.4} ${w*0.22} ${h*0.35} 
                        C ${w*0.18} ${h*0.1} ${w*0.52} ${h*0.05} ${w*0.58} ${h*0.22} 
                        C ${w*0.68} ${h*0.1} ${w*0.95} ${h*0.15} ${w*0.92} ${h*0.38} 
                        C ${w*1.02} ${h*0.45} ${w*1.02} ${h*0.65} ${w*0.82} ${h*0.65} Z`}
                    strokeLinejoin="round"
                />
                <circle cx={w*0.22} cy={h*0.78} r={w*0.045} />
                <circle cx={w*0.14} cy={h*0.88} r={w*0.03} />
            </g>
        )
    },
    edu_ribbon_banner: {
        id: 'edu_ribbon_banner',
        name: 'Banner Ribbon',
        category: 'general',
        defaultWidth: 130,
        defaultHeight: 60,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill} strokeLinejoin="round">
                {/* Left tail */}
                <polygon points={`0,${h*0.3} ${w*0.18},${h*0.3} ${w*0.18},${h*0.85} 0,${h*0.85} ${w*0.08},${h*0.58}`} />
                {/* Right tail */}
                <polygon points={`${w},${h*0.3} ${w*0.82},${h*0.3} ${w*0.82},${h*0.85} ${w},${h*0.85} ${w*0.92},${h*0.58}`} />
                {/* Main banner body */}
                <rect x={w*0.12} y={h*0.15} width={w*0.76} height={h*0.65} rx={3} />
            </g>
        )
    },
    edu_timeline_node: {
        id: 'edu_timeline_node',
        name: 'Timeline Milestone',
        category: 'general',
        defaultWidth: 120,
        defaultHeight: 60,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <line x1={0} y1={h/2} x2={w} y2={h/2} strokeWidth={sw*1.5} />
                <circle cx={w/2} cy={h/2} r={w*0.12} />
                <circle cx={w/2} cy={h/2} r={w*0.06} fill={stroke} />
            </g>
        )
    },
    edu_table_grid: {
        id: 'edu_table_grid',
        name: 'Matrix / Table Grid',
        category: 'general',
        defaultWidth: 110,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g stroke={stroke} strokeWidth={sw} fill={fill}>
                <rect x={0} y={0} width={w} height={h} rx={4} />
                <line x1={0} y1={h*0.33} x2={w} y2={h*0.33} strokeWidth={sw*1.2} />
                <line x1={0} y1={h*0.66} x2={w} y2={h*0.66} strokeWidth={sw*1.2} />
                <line x1={w*0.5} y1={0} x2={w*0.5} y2={h} strokeWidth={sw*1.2} />
            </g>
        )
    }
};

export const DOMAIN_CATEGORIES = [
    { id: 'all', label: 'All Shapes', icon: Compass },
    { id: 'cs', label: 'Computer Science', icon: Laptop },
    { id: 'biology', label: 'Biology', icon: Dna },
    { id: 'physics', label: 'Physics', icon: Zap },
    { id: 'chemistry', label: 'Chemistry', icon: FlaskConical },
    { id: 'math', label: 'Mathematics', icon: Binary },
    { id: 'general', label: 'General Education', icon: MessageSquare }
];

/**
 * Domain Shape Library Modal / Picker Dialog
 */
export default function DomainShapeLibraryModal({
    isOpen,
    onClose,
    onSelectShape
}) {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const shapesList = Object.values(DOMAIN_SHAPES).filter(s => {
        const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
        const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Compass className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">Domain-Specific Shape Library</h2>
                            <p className="text-xs text-slate-400">Technical diagrams for Computer Science, STEM, Biology, Physics, and Math</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    {/* Category Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                        {DOMAIN_CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-60">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search symbols..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Shape Grid Content */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {shapesList.map(shape => (
                        <div
                            key={shape.id}
                            onClick={() => {
                                onSelectShape(shape);
                                onClose();
                            }}
                            className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/80 flex flex-col items-center justify-between gap-3 text-center transition cursor-pointer group hover:scale-[1.02] shadow-sm"
                        >
                            {/* Shape Preview SVG */}
                            <div className="w-20 h-20 flex items-center justify-center p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 group-hover:border-indigo-500/30 transition">
                                <svg 
                                    viewBox={`0 0 ${shape.defaultWidth} ${shape.defaultHeight}`} 
                                    className="max-w-full max-h-full transition-transform group-hover:scale-105"
                                >
                                    {shape.renderSVG(shape.defaultWidth, shape.defaultHeight, '#818cf8', 2, 'rgba(129, 140, 248, 0.15)')}
                                </svg>
                            </div>
                            
                            <div className="w-full">
                                <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition line-clamp-1">
                                    {shape.name}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                                    {shape.category}
                                </span>
                            </div>
                        </div>
                    ))}

                    {shapesList.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Compass className="w-8 h-8 opacity-40" />
                            <p className="text-sm">No shapes found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                        Click any educational symbol to insert it onto the whiteboard canvas
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
