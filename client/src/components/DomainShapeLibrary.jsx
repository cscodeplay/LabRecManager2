'use client';

import React, { useState } from 'react';
import { 
    X, Search, Laptop, Dna, Zap, FlaskConical, 
    Binary, Compass, MessageSquare, Plus, Check,
    Sparkles, Wand2, Network, Server, Wifi
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
    // 1. COMPUTER SCIENCE / IT & NETWORKING
    // ═══════════════════════════════════════════════════════════════════
    net_switch: {
        id: 'net_switch',
        name: 'Network Switch (L2/L3)',
        category: 'cs',
        defaultWidth: 120,
        defaultHeight: 55,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Metal Chassis */}
                <rect x={w*0.02} y={h*0.15} width={w*0.96} height={h*0.7} rx={5} fill="#1e293b" stroke="#475569" strokeWidth={sw || 2} />
                <rect x={w*0.05} y={h*0.22} width={w*0.9} height={h*0.56} rx={3} fill="#0f172a" />
                {/* Status Indicator LEDs */}
                <circle cx={w*0.1} cy={h*0.38} r={2.5} fill="#22c55e" />
                <circle cx={w*0.1} cy={h*0.62} r={2.5} fill="#3b82f6" />
                {/* Dual Crossover Directional Data Arrows */}
                <path d={`M ${w*0.18} ${h*0.4} L ${w*0.36} ${h*0.4} M ${w*0.32} ${h*0.32} L ${w*0.37} ${h*0.4} L ${w*0.32} ${h*0.48}`} stroke="#38bdf8" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d={`M ${w*0.36} ${h*0.6} L ${w*0.18} ${h*0.6} M ${w*0.22} ${h*0.52} L ${w*0.17} ${h*0.6} L ${w*0.22} ${h*0.68}`} stroke="#38bdf8" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {/* RJ-45 Ethernet Ports (8 GigE ports) with activity LEDs */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <g key={i}>
                        <rect x={w*0.42 + i * (w*0.068)} y={h*0.32} width={w*0.054} height={h*0.36} rx={1.5} fill="#334155" stroke="#64748b" strokeWidth={0.8} />
                        <rect x={w*0.428 + i * (w*0.068)} y={h*0.45} width={w*0.038} height={h*0.2} fill="#0f172a" />
                        <circle cx={w*0.447 + i * (w*0.068)} cy={h*0.26} r={1.5} fill={i % 3 === 0 ? '#eab308' : '#22c55e'} />
                    </g>
                ))}
            </g>
        )
    },
    net_server_rack: {
        id: 'net_server_rack',
        name: 'Enterprise 42U Server Rack',
        category: 'cs',
        defaultWidth: 95,
        defaultHeight: 125,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Rack Frame Cabinet */}
                <rect x={w*0.05} y={h*0.04} width={w*0.9} height={h*0.92} rx={6} fill="#0f172a" stroke="#475569" strokeWidth={sw || 2} />
                <rect x={w*0.1} y={h*0.08} width={w*0.8} height={h*0.84} fill="#1e293b" rx={3} />
                {/* Vertical mounting rails */}
                <line x1={w*0.16} y1={h*0.08} x2={w*0.16} y2={h*0.92} stroke="#334155" strokeWidth={1} strokeDasharray="2 3" />
                <line x1={w*0.84} y1={h*0.08} x2={w*0.84} y2={h*0.92} stroke="#334155" strokeWidth={1} strokeDasharray="2 3" />
                {/* 4 Rack Unit Blade Trays */}
                {[0.12, 0.32, 0.52, 0.72].map((topY, idx) => (
                    <g key={idx}>
                        <rect x={w*0.18} y={h*topY} width={w*0.64} height={h*0.16} rx={2} fill="#090d16" stroke="#334155" strokeWidth={1} />
                        {/* Server Drive Bays / Grill */}
                        <line x1={w*0.22} y1={h*(topY+0.05)} x2={w*0.5} y2={h*(topY+0.05)} stroke="#475569" strokeWidth={1.2} />
                        <line x1={w*0.22} y1={h*(topY+0.11)} x2={w*0.5} y2={h*(topY+0.11)} stroke="#475569" strokeWidth={1.2} />
                        {/* Status Lights */}
                        <circle cx={w*0.62} cy={h*(topY+0.08)} r={2} fill="#22c55e" />
                        <circle cx={w*0.7} cy={h*(topY+0.08)} r={2} fill="#3b82f6" />
                        <circle cx={w*0.76} cy={h*(topY+0.08)} r={2} fill={idx === 1 ? '#f59e0b' : '#22c55e'} />
                    </g>
                ))}
            </g>
        )
    },
    net_access_point: {
        id: 'net_access_point',
        name: 'Wireless Access Point (AP)',
        category: 'cs',
        defaultWidth: 90,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* AP Ceiling Dome / Puck */}
                <ellipse cx={w/2} cy={h*0.65} rx={w*0.42} ry={h*0.22} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={sw || 2} />
                <ellipse cx={w/2} cy={h*0.62} rx={w*0.3} ry={h*0.15} fill="#0ea5e9" fillOpacity={0.15} stroke="#38bdf8" strokeWidth={1.5} />
                <circle cx={w/2} cy={h*0.62} r={w*0.06} fill="#0284c7" />
                {/* Radiating Wi-Fi RF Wave Arcs */}
                <path d={`M ${w*0.35} ${h*0.38} A ${w*0.25} ${h*0.25} 0 0 1 ${w*0.65} ${h*0.38}`} fill="none" stroke="#0ea5e9" strokeWidth={2.2} strokeLinecap="round" />
                <path d={`M ${w*0.22} ${h*0.24} A ${w*0.42} ${h*0.42} 0 0 1 ${w*0.78} ${h*0.24}`} fill="none" stroke="#38bdf8" strokeWidth={2.4} strokeLinecap="round" />
                <path d={`M ${w*0.1} ${h*0.1} A ${w*0.6} ${h*0.6} 0 0 1 ${w*0.9} ${h*0.1}`} fill="none" stroke="#60a5fa" strokeWidth={2.6} strokeLinecap="round" />
            </g>
        )
    },
    net_modem: {
        id: 'net_modem',
        name: 'Broadband ONT / Modem',
        category: 'cs',
        defaultWidth: 85,
        defaultHeight: 95,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Dual Antennas */}
                <line x1={w*0.22} y1={h*0.35} x2={w*0.12} y2={h*0.06} stroke="#475569" strokeWidth={3} strokeLinecap="round" />
                <line x1={w*0.78} y1={h*0.35} x2={w*0.88} y2={h*0.06} stroke="#475569" strokeWidth={3} strokeLinecap="round" />
                {/* Upright Modem Body */}
                <rect x={w*0.15} y={h*0.35} width={w*0.7} height={h*0.56} rx={6} fill="#1e293b" stroke="#475569" strokeWidth={sw || 2} />
                <rect x={w*0.22} y={h*0.42} width={w*0.56} height={h*0.42} rx={3} fill="#0f172a" />
                {/* Vertical LED Column */}
                {['#22c55e', '#22c55e', '#38bdf8', '#22c55e'].map((col, i) => (
                    <g key={i}>
                        <circle cx={w*0.32} cy={h*(0.48 + i * 0.09)} r={2} fill={col} />
                        <line x1={w*0.42} y1={h*(0.48 + i * 0.09)} x2={w*0.68} y2={h*(0.48 + i * 0.09)} stroke="#334155" strokeWidth={1} />
                    </g>
                ))}
            </g>
        )
    },
    net_firewall_utm: {
        id: 'net_firewall_utm',
        name: 'Hardware UTM Firewall',
        category: 'cs',
        defaultWidth: 100,
        defaultHeight: 85,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Metal Appliance Base */}
                <rect x={w*0.06} y={h*0.25} width={w*0.88} height={h*0.65} rx={6} fill="#1e293b" stroke="#dc2626" strokeWidth={sw || 2} />
                {/* Brick Pattern Texture */}
                <line x1={w*0.06} y1={h*0.48} x2={w*0.94} y2={h*0.48} stroke="#ef4444" strokeWidth={1} opacity={0.6} />
                <line x1={w*0.06} y1={h*0.7} x2={w*0.94} y2={h*0.7} stroke="#ef4444" strokeWidth={1} opacity={0.6} />
                <line x1={w*0.32} y1={h*0.25} x2={w*0.32} y2={h*0.48} stroke="#ef4444" strokeWidth={1} opacity={0.6} />
                <line x1={w*0.68} y1={h*0.25} x2={w*0.68} y2={h*0.48} stroke="#ef4444" strokeWidth={1} opacity={0.6} />
                <line x1={w*0.5} y1={h*0.48} x2={w*0.5} y2={h*0.7} stroke="#ef4444" strokeWidth={1} opacity={0.6} />
                {/* Security Shield Crest with Lock in Center */}
                <path d={`M ${w/2} ${h*0.06} L ${w*0.7} ${h*0.18} V ${h*0.45} C ${w*0.7} ${h*0.65} ${w/2} ${h*0.76} ${w/2} ${h*0.76} C ${w/2} ${h*0.76} ${w*0.3} ${h*0.65} ${w*0.3} ${h*0.45} V ${h*0.18} Z`} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                <circle cx={w/2} cy={h*0.34} r={w*0.06} fill="#ffffff" />
                <rect x={w*0.45} y={h*0.35} width={w*0.1} height={h*0.12} rx={1} fill="#ffffff" />
            </g>
        )
    },
    net_cloud_wan: {
        id: 'net_cloud_wan',
        name: 'WAN / Internet Cloud',
        category: 'cs',
        defaultWidth: 120,
        defaultHeight: 80,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                <path
                    d={`M ${w*0.25} ${h*0.75} 
                        C ${w*0.05} ${h*0.75} ${w*0.02} ${h*0.45} ${w*0.22} ${h*0.42} 
                        C ${w*0.18} ${h*0.15} ${w*0.52} ${h*0.08} ${w*0.58} ${h*0.3} 
                        C ${w*0.68} ${h*0.15} ${w*0.92} ${h*0.22} ${w*0.9} ${h*0.45} 
                        C ${w*1.02} ${h*0.52} ${w*1.02} ${h*0.75} ${w*0.82} ${h*0.75} Z`}
                    fill="#0284c7"
                    fillOpacity={0.15}
                    stroke="#0284c7"
                    strokeWidth={sw || 2}
                    strokeLinejoin="round"
                />
                {/* WAN Core Topology Mesh */}
                <line x1={w*0.32} y1={h*0.55} x2={w*0.5} y2={h*0.35} stroke="#38bdf8" strokeWidth={1.2} />
                <line x1={w*0.5} y1={h*0.35} x2={w*0.68} y2={h*0.52} stroke="#38bdf8" strokeWidth={1.2} />
                <line x1={w*0.32} y1={h*0.55} x2={w*0.52} y2={h*0.62} stroke="#38bdf8" strokeWidth={1.2} />
                <line x1={w*0.52} y1={h*0.62} x2={w*0.68} y2={h*0.52} stroke="#38bdf8" strokeWidth={1.2} />
                <circle cx={w*0.32} cy={h*0.55} r={3} fill="#0284c7" stroke="#ffffff" strokeWidth={1} />
                <circle cx={w*0.5} cy={h*0.35} r={3.5} fill="#0284c7" stroke="#ffffff" strokeWidth={1} />
                <circle cx={w*0.68} cy={h*0.52} r={3} fill="#0284c7" stroke="#ffffff" strokeWidth={1} />
                <circle cx={w*0.52} cy={h*0.62} r={3} fill="#0284c7" stroke="#ffffff" strokeWidth={1} />
                <text x={w*0.5} y={h*0.52} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#0369a1" stroke="none">WAN</text>
            </g>
        )
    },
    net_database_cluster: {
        id: 'net_database_cluster',
        name: 'Database Cluster (HA)',
        category: 'cs',
        defaultWidth: 100,
        defaultHeight: 95,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Primary DB Node */}
                <g transform={`translate(${w*0.05}, ${h*0.05}) scale(0.65)`}>
                    <ellipse cx={w/2} cy={h*0.2} rx={w*0.45} ry={h*0.14} fill="#4338ca" stroke="#6366f1" strokeWidth={2} />
                    <path d={`M ${w*0.05} ${h*0.2} v ${h*0.55} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0 v -${h*0.55}`} fill="#312e81" stroke="#6366f1" strokeWidth={2} />
                    <path d={`M ${w*0.05} ${h*0.48} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0`} fill="none" stroke="#6366f1" strokeWidth={1.5} />
                </g>
                {/* Secondary Replica DB Node */}
                <g transform={`translate(${w*0.35}, ${h*0.28}) scale(0.65)`}>
                    <ellipse cx={w/2} cy={h*0.2} rx={w*0.45} ry={h*0.14} fill="#0369a1" stroke="#38bdf8" strokeWidth={2} />
                    <path d={`M ${w*0.05} ${h*0.2} v ${h*0.55} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0 v -${h*0.55}`} fill="#0c4a6e" stroke="#38bdf8" strokeWidth={2} />
                    <path d={`M ${w*0.05} ${h*0.48} c 0 ${h*0.15} ${w*0.9} ${h*0.15} ${w*0.9} 0`} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
                </g>
                {/* Replication Sync Arrows */}
                <path d={`M ${w*0.42} ${h*0.38} Q ${w*0.52} ${h*0.3} ${w*0.58} ${h*0.38}`} fill="none" stroke="#22c55e" strokeWidth={1.8} strokeDasharray="2 2" />
                <path d={`M ${w*0.58} ${h*0.46} Q ${w*0.52} ${h*0.54} ${w*0.42} ${h*0.46}`} fill="none" stroke="#22c55e" strokeWidth={1.8} strokeDasharray="2 2" />
            </g>
        )
    },
    net_patch_panel: {
        id: 'net_patch_panel',
        name: 'RJ45 Patch Panel',
        category: 'cs',
        defaultWidth: 120,
        defaultHeight: 45,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                <rect x={w*0.02} y={h*0.15} width={w*0.96} height={h*0.7} rx={3} fill="#0f172a" stroke="#475569" strokeWidth={sw || 2} />
                <line x1={w*0.08} y1={h*0.15} x2={w*0.08} y2={h*0.85} stroke="#334155" strokeWidth={1} />
                <line x1={w*0.92} y1={h*0.15} x2={w*0.92} y2={h*0.85} stroke="#334155" strokeWidth={1} />
                {Array.from({ length: 12 }).map((_, i) => (
                    <g key={i}>
                        <rect x={w*0.11 + i * (w*0.065)} y={h*0.3} width={w*0.048} height={h*0.4} rx={1} fill="#1e293b" stroke="#64748b" strokeWidth={0.8} />
                        <rect x={w*0.116 + i * (w*0.065)} y={h*0.42} width={w*0.036} height={h*0.22} fill="#0f172a" />
                    </g>
                ))}
            </g>
        )
    },
    cs_server: {
        id: 'cs_server',
        name: 'Tower Server',
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
    // 2. BIOLOGY (FULL-COLOR EDUCATIONAL ILLUSTRATIONS)
    // ═══════════════════════════════════════════════════════════════════
    bio_dna: {
        id: 'bio_dna',
        name: 'DNA Double Helix',
        category: 'biology',
        defaultWidth: 120,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Colored Base Pair Rungs */}
                {/* Adenine (Green) - Thymine (Red) */}
                <line x1={w*0.15} y1={h*0.38} x2={w*0.15} y2={h*0.5} stroke="#16a34a" strokeWidth={3} strokeLinecap="round" />
                <line x1={w*0.15} y1={h*0.5} x2={w*0.15} y2={h*0.62} stroke="#dc2626" strokeWidth={3} strokeLinecap="round" />
                <circle cx={w*0.15} cy={h*0.5} r={1.5} fill="#ffffff" />

                {/* Cytosine (Blue) - Guanine (Amber) */}
                <line x1={w*0.25} y1={h*0.2} x2={w*0.25} y2={h*0.5} stroke="#0284c7" strokeWidth={3.5} strokeLinecap="round" />
                <line x1={w*0.25} y1={h*0.5} x2={w*0.25} y2={h*0.8} stroke="#d97706" strokeWidth={3.5} strokeLinecap="round" />
                <circle cx={w*0.25} cy={h*0.5} r={1.5} fill="#ffffff" />

                {/* Thymine (Red) - Adenine (Green) */}
                <line x1={w*0.35} y1={h*0.38} x2={w*0.35} y2={h*0.5} stroke="#dc2626" strokeWidth={3} strokeLinecap="round" />
                <line x1={w*0.35} y1={h*0.5} x2={w*0.35} y2={h*0.62} stroke="#16a34a" strokeWidth={3} strokeLinecap="round" />
                <circle cx={w*0.35} cy={h*0.5} r={1.5} fill="#ffffff" />

                {/* Guanine (Amber) - Cytosine (Blue) */}
                <line x1={w*0.65} y1={h*0.38} x2={w*0.65} y2={h*0.5} stroke="#d97706" strokeWidth={3} strokeLinecap="round" />
                <line x1={w*0.65} y1={h*0.5} x2={w*0.65} y2={h*0.62} stroke="#0284c7" strokeWidth={3} strokeLinecap="round" />
                <circle cx={w*0.65} cy={h*0.5} r={1.5} fill="#ffffff" />

                {/* Adenine (Green) - Thymine (Red) */}
                <line x1={w*0.75} y1={h*0.2} x2={w*0.75} y2={h*0.5} stroke="#16a34a" strokeWidth={3.5} strokeLinecap="round" />
                <line x1={w*0.75} y1={h*0.5} x2={w*0.75} y2={h*0.8} stroke="#dc2626" strokeWidth={3.5} strokeLinecap="round" />
                <circle cx={w*0.75} cy={h*0.5} r={1.5} fill="#ffffff" />

                {/* Cytosine (Blue) - Guanine (Amber) */}
                <line x1={w*0.85} y1={h*0.38} x2={w*0.85} y2={h*0.5} stroke="#0284c7" strokeWidth={3} strokeLinecap="round" />
                <line x1={w*0.85} y1={h*0.5} x2={w*0.85} y2={h*0.62} stroke="#d97706" strokeWidth={3} strokeLinecap="round" />
                <circle cx={w*0.85} cy={h*0.5} r={1.5} fill="#ffffff" />

                {/* Two intertwining sugar-phosphate backbone strands */}
                <path d={`M 0 ${h*0.2} Q ${w*0.25} ${h*0.8} ${w*0.5} ${h*0.2} T ${w} ${h*0.2}`} stroke="#2563eb" strokeWidth={3.5} fill="none" strokeLinecap="round" />
                <path d={`M 0 ${h*0.8} Q ${w*0.25} ${h*0.2} ${w*0.5} ${h*0.8} T ${w} ${h*0.8}`} stroke="#ec4899" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            </g>
        )
    },
    bio_cell: {
        id: 'bio_cell',
        name: 'Animal Cell & Organelles',
        category: 'biology',
        defaultWidth: 105,
        defaultHeight: 105,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Plasma Membrane & Cytoplasm */}
                <ellipse cx={w/2} cy={h/2} rx={w*0.46} ry={h*0.44} fill="#e0f2fe" stroke="#38bdf8" strokeWidth={2.5} />
                {/* Endoplasmic Reticulum folds */}
                <path d={`M ${w*0.28} ${h*0.3} Q ${w*0.22} ${h*0.45} ${w*0.32} ${h*0.55} T ${w*0.28} ${h*0.7}`} fill="none" stroke="#f472b6" strokeWidth={2} strokeLinecap="round" />
                {/* Nucleus */}
                <ellipse cx={w*0.5} cy={h*0.46} rx={w*0.2} ry={h*0.19} fill="#c084fc" fillOpacity={0.4} stroke="#7c3aed" strokeWidth={2} />
                {/* Nucleolus */}
                <circle cx={w*0.48} cy={h*0.44} r={w*0.075} fill="#581c87" />
                {/* Mitochondria 1 with inner cristae */}
                <g transform={`rotate(35 ${w*0.74} ${h*0.35})`}>
                    <ellipse cx={w*0.74} cy={h*0.35} rx={w*0.11} ry={h*0.06} fill="#fed7aa" stroke="#ea580c" strokeWidth={1.8} />
                    <path d={`M ${w*0.67} ${h*0.35} Q ${w*0.74} ${h*0.32} ${w*0.81} ${h*0.35}`} fill="none" stroke="#c2410c" strokeWidth={1.2} />
                </g>
                {/* Mitochondria 2 */}
                <g transform={`rotate(-25 ${w*0.35} ${h*0.76})`}>
                    <ellipse cx={w*0.35} cy={h*0.76} rx={w*0.1} ry={h*0.055} fill="#fed7aa" stroke="#ea580c" strokeWidth={1.8} />
                    <path d={`M ${w*0.28} ${h*0.76} Q ${w*0.35} ${h*0.73} ${w*0.42} ${h*0.76}`} fill="none" stroke="#c2410c" strokeWidth={1.2} />
                </g>
                {/* Ribosomes / Lysosomes */}
                <circle cx={w*0.72} cy={h*0.68} r={w*0.045} fill="#10b981" stroke="#047857" strokeWidth={1} />
                <circle cx={w*0.8} cy={h*0.55} r={w*0.03} fill="#06b6d4" />
                <circle cx={w*0.42} cy={h*0.24} r={w*0.025} fill="#eab308" />
            </g>
        )
    },
    bio_plant_cell: {
        id: 'bio_plant_cell',
        name: 'Plant Cell (Cell Wall & Vacuole)',
        category: 'biology',
        defaultWidth: 110,
        defaultHeight: 95,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Cellulose Cell Wall */}
                <rect x={w*0.05} y={h*0.06} width={w*0.9} height={h*0.88} rx={10} fill="#dcfce7" stroke="#15803d" strokeWidth={3.5} />
                <rect x={w*0.1} y={h*0.11} width={w*0.8} height={h*0.78} rx={6} fill="#f0fdf4" stroke="#22c55e" strokeWidth={1.5} />
                {/* Large Central Vacuole */}
                <path d={`M ${w*0.28} ${h*0.25} C ${w*0.5} ${h*0.18} ${w*0.72} ${h*0.25} ${w*0.76} ${h*0.5} C ${w*0.78} ${h*0.72} ${w*0.45} ${h*0.78} ${w*0.26} ${h*0.68} Z`} fill="#bae6fd" stroke="#0284c7" strokeWidth={1.8} fillOpacity={0.6} />
                {/* Chloroplasts with Thylakoid Grana */}
                <ellipse cx={w*0.2} cy={h*0.28} rx={w*0.07} ry={h*0.045} fill="#4ade80" stroke="#15803d" strokeWidth={1.2} />
                <ellipse cx={w*0.82} cy={h*0.35} rx={w*0.07} ry={h*0.045} fill="#4ade80" stroke="#15803d" strokeWidth={1.2} />
                <ellipse cx={w*0.76} cy={h*0.76} rx={w*0.07} ry={h*0.045} fill="#4ade80" stroke="#15803d" strokeWidth={1.2} />
                {/* Nucleus */}
                <circle cx={w*0.24} cy={h*0.7} r={w*0.09} fill="#c084fc" stroke="#7c3aed" strokeWidth={1.5} />
                <circle cx={w*0.23} cy={h*0.69} r={w*0.035} fill="#581c87" />
            </g>
        )
    },
    bio_neuron: {
        id: 'bio_neuron',
        name: 'Neuron (Nerve Cell)',
        category: 'biology',
        defaultWidth: 125,
        defaultHeight: 85,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Branching Dendrites */}
                <path d={`M ${w*0.2} ${h*0.35} L ${w*0.06} ${h*0.15} M ${w*0.2} ${h*0.48} L ${w*0.04} ${h*0.48} M ${w*0.2} ${h*0.62} L ${w*0.06} ${h*0.82} M ${w*0.25} ${h*0.3} L ${w*0.18} ${h*0.1} M ${w*0.25} ${h*0.68} L ${w*0.18} ${h*0.88}`} stroke="#8b5cf6" strokeWidth={1.8} strokeLinecap="round" />
                {/* Soma (Cell Body) */}
                <circle cx={w*0.26} cy={h*0.48} r={w*0.11} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2.2} />
                <circle cx={w*0.26} cy={h*0.48} r={w*0.04} fill="#b45309" />
                {/* Axon Fiber */}
                <line x1={w*0.37} y1={h*0.48} x2={w*0.88} y2={h*0.48} stroke="#f97316" strokeWidth={2.5} />
                {/* Myelin Sheath segments */}
                {[0.42, 0.56, 0.70].map((mx, idx) => (
                    <rect key={idx} x={w*mx} y={h*0.35} width={w*0.11} height={h*0.26} rx={4} fill="#fed7aa" stroke="#ea580c" strokeWidth={1.5} />
                ))}
                {/* Synaptic Terminal Buttons */}
                <path d={`M ${w*0.88} ${h*0.48} L ${w*0.96} ${h*0.3} M ${w*0.88} ${h*0.48} L ${w*0.98} ${h*0.48} M ${w*0.88} ${h*0.48} L ${w*0.96} ${h*0.66}`} stroke="#06b6d4" strokeWidth={1.8} strokeLinecap="round" />
                <circle cx={w*0.96} cy={h*0.3} r={2.5} fill="#0891b2" />
                <circle cx={w*0.98} cy={h*0.48} r={2.5} fill="#0891b2" />
                <circle cx={w*0.96} cy={h*0.66} r={2.5} fill="#0891b2" />
            </g>
        )
    },
    bio_bacteria: {
        id: 'bio_bacteria',
        name: 'Bacterium (Prokaryote)',
        category: 'biology',
        defaultWidth: 110,
        defaultHeight: 70,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Capsule Body */}
                <rect x={w*0.12} y={h*0.2} width={w*0.62} height={h*0.6} rx={h*0.3} fill="#d1fae5" stroke="#10b981" strokeWidth={2.5} />
                {/* Coiled Nucleoid DNA */}
                <path d={`M ${w*0.22} ${h*0.5} Q ${w*0.32} ${h*0.3} ${w*0.42} ${h*0.5} T ${w*0.62} ${h*0.5}`} fill="none" stroke="#a855f7" strokeWidth={2.2} strokeLinecap="round" />
                {/* Plasmids */}
                <circle cx={w*0.3} cy={h*0.35} r={3} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
                <circle cx={w*0.55} cy={h*0.65} r={2.5} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
                {/* Flagellum Tail */}
                <path d={`M ${w*0.74} ${h*0.5} Q ${w*0.84} ${h*0.25} ${w*0.9} ${h*0.5} T ${w*0.98} ${h*0.35}`} fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" />
            </g>
        )
    },
    bio_virus: {
        id: 'bio_virus',
        name: 'Bacteriophage / Virus',
        category: 'biology',
        defaultWidth: 80,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Icosahedral Capsid Head */}
                <polygon points={`${w/2},${h*0.05} ${w*0.82},${h*0.22} ${w*0.72},${h*0.45} ${w*0.28},${h*0.45} ${w*0.18},${h*0.22}`} fill="#bae6fd" stroke="#0284c7" strokeWidth={2} strokeLinejoin="round" />
                <line x1={w/2} y1={h*0.05} x2={w*0.28} y2={h*0.45} stroke="#38bdf8" strokeWidth={1} />
                <line x1={w/2} y1={h*0.05} x2={w*0.72} y2={h*0.45} stroke="#38bdf8" strokeWidth={1} />
                {/* Collar & Sheath Neck */}
                <rect x={w*0.42} y={h*0.45} width={w*0.16} height={h*0.05} fill="#f59e0b" rx={1} />
                <rect x={w*0.45} y={h*0.5} width={w*0.1} height={h*0.25} fill="#fed7aa" stroke="#ea580c" strokeWidth={1.5} />
                {/* Tail Fibers (Spider Legs) */}
                <path d={`M ${w*0.45} ${h*0.75} L ${w*0.2} ${h*0.88} L ${w*0.05} ${h*0.96}`} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                <path d={`M ${w*0.55} ${h*0.75} L ${w*0.8} ${h*0.88} L ${w*0.95} ${h*0.96}`} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
            </g>
        )
    },
    bio_chromosome: {
        id: 'bio_chromosome',
        name: 'Chromosome (Sister Chromatids)',
        category: 'biology',
        defaultWidth: 90,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Sister Chromatid 1 (Blue) */}
                <path d={`M ${w*0.2} ${h*0.1} C ${w*0.35} ${h*0.3} ${w*0.45} ${h*0.45} ${w*0.5} ${h*0.5} C ${w*0.55} ${h*0.55} ${w*0.65} ${h*0.7} ${w*0.8} ${h*0.9} C ${w*0.9} ${h*0.85} ${w*0.75} ${h*0.65} ${w*0.55} ${h*0.5} C ${w*0.75} ${h*0.35} ${w*0.9} ${h*0.15} ${w*0.8} ${h*0.1} Z`} fill="#93c5fd" stroke="#2563eb" strokeWidth={1.8} />
                {/* Sister Chromatid 2 (Coral Red) */}
                <path d={`M ${w*0.8} ${h*0.1} C ${w*0.65} ${h*0.3} ${w*0.55} ${h*0.45} ${w*0.5} ${h*0.5} C ${w*0.45} ${h*0.55} ${w*0.35} ${h*0.7} ${w*0.2} ${h*0.9} C ${w*0.1} ${h*0.85} ${w*0.25} ${h*0.65} ${w*0.45} ${h*0.5} C ${w*0.25} ${h*0.35} ${w*0.1} ${h*0.15} ${w*0.2} ${h*0.1} Z`} fill="#fca5a5" stroke="#dc2626" strokeWidth={1.8} />
                {/* Centromere (Yellow) */}
                <circle cx={w/2} cy={h/2} r={w*0.09} fill="#fde047" stroke="#ca8a04" strokeWidth={2} />
            </g>
        )
    },
    bio_heart: {
        id: 'bio_heart',
        name: 'Heart & Vascular Anatomy',
        category: 'biology',
        defaultWidth: 95,
        defaultHeight: 95,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Superior Vena Cava (Blue) */}
                <path d={`M ${w*0.3} ${h*0.05} L ${w*0.3} ${h*0.3} L ${w*0.42} ${h*0.3} L ${w*0.42} ${h*0.05} Z`} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1.2} />
                {/* Aortic Arch (Bright Red) */}
                <path d={`M ${w*0.45} ${h*0.28} C ${w*0.45} ${h*0.08} ${w*0.75} ${h*0.08} ${w*0.75} ${h*0.28}`} fill="none" stroke="#ef4444" strokeWidth={7} strokeLinecap="round" />
                {/* Cardiac Ventricles Body (Crimson Red) */}
                <path
                    d={`M ${w/2} ${h*0.88} 
                        C ${w*0.1} ${h*0.62} ${w*0.04} ${h*0.36} ${w*0.28} ${h*0.26} 
                        C ${w*0.42} ${h*0.2} ${w/2} ${h*0.36} ${w/2} ${h*0.42} 
                        C ${w/2} ${h*0.36} ${w*0.58} ${h*0.2} ${w*0.72} ${h*0.26} 
                        C ${w*0.96} ${h*0.36} ${w*0.9} ${h*0.62} ${w/2} ${h*0.88} Z`}
                    fill="#dc2626"
                    stroke="#991b1b"
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                />
            </g>
        )
    },
    bio_microscope: {
        id: 'bio_microscope',
        name: 'Laboratory Microscope',
        category: 'biology',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Heavy Stand Base */}
                <rect x={w*0.1} y={h*0.88} width={w*0.8} height={h*0.08} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1.5} />
                {/* Curved Chrome Arm */}
                <path d={`M ${w*0.65} ${h*0.88} C ${w*0.88} ${h*0.6} ${w*0.88} ${h*0.3} ${w*0.55} ${h*0.25}`} fill="none" stroke="#64748b" strokeWidth={sw*1.8 || 3.5} />
                {/* Specimen Stage with blue condenser light */}
                <line x1={w*0.18} y1={h*0.62} x2={w*0.6} y2={h*0.62} stroke="#334155" strokeWidth={3.5} strokeLinecap="round" />
                <circle cx={w*0.38} cy={h*0.62} r={3} fill="#38bdf8" />
                {/* Ocular Eyepiece Tube & Brass Objective Lens */}
                <rect x={w*0.25} y={h*0.15} width={w*0.24} height={h*0.44} rx={3} fill="#334155" stroke="#475569" strokeWidth={1.5} transform={`rotate(-25 ${w*0.37} ${h*0.37})`} />
                <rect x={w*0.3} y={h*0.48} width={w*0.12} height={h*0.12} rx={1} fill="#eab308" stroke="#ca8a04" strokeWidth={1.2} transform={`rotate(-25 ${w*0.36} ${h*0.54})`} />
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 3. PHYSICS
    // ═══════════════════════════════════════════════════════════════════
    phys_magnet: {
        id: 'phys_magnet',
        name: 'Horseshoe Magnet (N/S Poles)',
        category: 'physics',
        defaultWidth: 95,
        defaultHeight: 95,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Curved Magnet Arch */}
                <path
                    d={`M ${w*0.18} ${h*0.5} 
                        C ${w*0.18} ${h*0.1} ${w*0.82} ${h*0.1} ${w*0.82} ${h*0.5} 
                        L ${w*0.64} ${h*0.5} 
                        C ${w*0.64} ${h*0.28} ${w*0.36} ${h*0.28} ${w*0.36} ${h*0.5} Z`}
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth={1.5}
                />
                {/* North Pole (Red) */}
                <rect x={w*0.18} y={h*0.5} width={w*0.18} height={h*0.35} rx={2} fill="#ef4444" stroke="#b91c1c" strokeWidth={1.5} />
                <rect x={w*0.18} y={h*0.85} width={w*0.18} height={h*0.1} rx={1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                <text x={w*0.27} y={h*0.72} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#ffffff" stroke="none">N</text>
                {/* South Pole (Blue) */}
                <rect x={w*0.64} y={h*0.5} width={w*0.18} height={h*0.35} rx={2} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1.5} />
                <rect x={w*0.64} y={h*0.85} width={w*0.18} height={h*0.1} rx={1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                <text x={w*0.73} y={h*0.72} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#ffffff" stroke="none">S</text>
                {/* Magnetic Flux Lines */}
                <path d={`M ${w*0.27} ${h*0.95} C ${w*0.27} ${h*1.12} ${w*0.73} ${h*1.12} ${w*0.73} ${h*0.95}`} fill="none" stroke="#a855f7" strokeWidth={1.4} strokeDasharray="3 3" />
                <path d={`M ${w*0.2} ${h*0.95} C ${w*0.2} ${h*1.22} ${w*0.8} ${h*1.22} ${w*0.8} ${h*0.95}`} fill="none" stroke="#a855f7" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} />
            </g>
        )
    },
    phys_prism: {
        id: 'phys_prism',
        name: 'Optical Prism & Rainbow Spectrum',
        category: 'physics',
        defaultWidth: 120,
        defaultHeight: 90,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Incoming White Light Beam */}
                <line x1={w*0.05} y1={h*0.6} x2={w*0.38} y2={h*0.48} stroke="#ffffff" strokeWidth={2.8} strokeLinecap="round" />
                {/* Glass Prism Body */}
                <polygon points={`${w*0.5},${h*0.12} ${w*0.26},${h*0.82} ${w*0.74},${h*0.82}`} fill="#bae6fd" fillOpacity={0.4} stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" />
                {/* Internal refraction rays */}
                <line x1={w*0.38} y1={h*0.48} x2={w*0.56} y2={h*0.52} stroke="#fde047" strokeWidth={2} />
                {/* Dispersed Rainbow Spectrum Beams */}
                <line x1={w*0.56} y1={h*0.5} x2={w*0.95} y2={h*0.28} stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={w*0.56} y1={h*0.51} x2={w*0.95} y2={h*0.36} stroke="#f97316" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={w*0.56} y1={h*0.52} x2={w*0.95} y2={h*0.44} stroke="#eab308" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={w*0.56} y1={h*0.53} x2={w*0.95} y2={h*0.52} stroke="#22c55e" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={w*0.56} y1={h*0.54} x2={w*0.95} y2={h*0.60} stroke="#3b82f6" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={w*0.56} y1={h*0.55} x2={w*0.95} y2={h*0.68} stroke="#a855f7" strokeWidth={2.2} strokeLinecap="round" />
            </g>
        )
    },
    phys_lightbulb: {
        id: 'phys_lightbulb',
        name: 'Glowing Light Bulb',
        category: 'physics',
        defaultWidth: 85,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Bulb Glow Ambient Circle */}
                <circle cx={w/2} cy={h*0.42} r={w*0.4} fill="#fef08a" fillOpacity={0.35} />
                {/* Radiating Ray Accents */}
                <line x1={w*0.1} y1={h*0.2} x2={w*0.2} y2={h*0.28} stroke="#eab308" strokeWidth={1.8} strokeLinecap="round" />
                <line x1={w*0.9} y1={h*0.2} x2={w*0.8} y2={h*0.28} stroke="#eab308" strokeWidth={1.8} strokeLinecap="round" />
                <line x1={w/2} y1={h*0.04} x2={w/2} y2={h*0.14} stroke="#eab308" strokeWidth={1.8} strokeLinecap="round" />
                {/* Glass Envelope */}
                <path
                    d={`M ${w*0.34} ${h*0.7} 
                        C ${w*0.18} ${h*0.58} ${w*0.18} ${h*0.28} ${w/2} ${h*0.18} 
                        C ${w*0.82} ${h*0.28} ${w*0.82} ${h*0.58} ${w*0.66} ${h*0.7} Z`}
                    fill="#fef9c3"
                    stroke="#eab308"
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                />
                {/* Tungsten Coiled Filament */}
                <path d={`M ${w*0.4} ${h*0.6} L ${w*0.44} ${h*0.42} L ${w*0.48} ${h*0.38} L ${w*0.52} ${h*0.42} L ${w*0.56} ${h*0.38} L ${w*0.6} ${h*0.6}`} fill="none" stroke="#ea580c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                {/* Threaded Screw Base & Contact Point */}
                <rect x={w*0.36} y={h*0.72} width={w*0.28} height={h*0.06} rx={2} fill="#94a3b8" stroke="#475569" strokeWidth={1.2} />
                <rect x={w*0.38} y={h*0.79} width={w*0.24} height={h*0.06} rx={2} fill="#94a3b8" stroke="#475569" strokeWidth={1.2} />
                <ellipse cx={w/2} cy={h*0.88} rx={w*0.08} ry={h*0.03} fill="#334155" />
            </g>
        )
    },
    phys_battery: {
        id: 'phys_battery',
        name: 'Chemical DC Battery (Cell)',
        category: 'physics',
        defaultWidth: 105,
        defaultHeight: 65,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Main Battery Cylinder Body */}
                <rect x={w*0.15} y={h*0.2} width={w*0.7} height={h*0.6} rx={6} fill="#0f172a" stroke="#334155" strokeWidth={2} />
                {/* Positive End Gold Band */}
                <path d={`M ${w*0.65} ${h*0.2} h ${w*0.2} a 6 6 0 0 1 6 6 v ${h*0.6 - 12} a 6 6 0 0 1 -6 6 h -${w*0.2} Z`} fill="#f59e0b" />
                {/* Positive Nub Cap */}
                <rect x={w*0.86} y={h*0.36} width={w*0.06} height={h*0.28} rx={2} fill="#d97706" />
                {/* Negative Anode Cap */}
                <line x1={w*0.15} y1={h*0.2} x2={w*0.15} y2={h*0.8} stroke="#64748b" strokeWidth={3} strokeLinecap="round" />
                {/* Charge Polarities */}
                <text x={w*0.78} y={h*0.56} fontSize={16} fontWeight="bold" fill="#ffffff" textAnchor="middle" stroke="none">+</text>
                <text x={w*0.28} y={h*0.56} fontSize={18} fontWeight="bold" fill="#94a3b8" textAnchor="middle" stroke="none">−</text>
                <text x={w*0.48} y={h*0.54} fontSize={10} fontWeight="bold" fill="#38bdf8" textAnchor="middle" stroke="none">1.5V</text>
            </g>
        )
    },
    phys_resistor: {
        id: 'phys_resistor',
        name: 'Resistor (Color Coded)',
        category: 'physics',
        defaultWidth: 120,
        defaultHeight: 50,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Lead Wires */}
                <line x1={0} y1={h/2} x2={w*0.25} y2={h/2} stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
                <line x1={w*0.75} y1={h/2} x2={w} y2={h/2} stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
                {/* Resistor Ceramic Body */}
                <rect x={w*0.25} y={h*0.22} width={w*0.5} height={h*0.56} rx={8} fill="#fef3c7" stroke="#d97706" strokeWidth={1.8} />
                {/* Color Bands (Brown, Black, Red, Gold = 1kΩ 5%) */}
                <rect x={w*0.33} y={h*0.22} width={w*0.05} height={h*0.56} fill="#78350f" />
                <rect x={w*0.42} y={h*0.22} width={w*0.05} height={h*0.56} fill="#0f172a" />
                <rect x={w*0.51} y={h*0.22} width={w*0.05} height={h*0.56} fill="#dc2626" />
                <rect x={w*0.63} y={h*0.22} width={w*0.05} height={h*0.56} fill="#eab308" />
            </g>
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
                <line x1={w*0.42} y1={h*0.1} x2={w*0.42} y2={h*0.9} strokeWidth={sw*1.3} stroke="#3b82f6" />
                <line x1={w*0.58} y1={h*0.1} x2={w*0.58} y2={h*0.9} strokeWidth={sw*1.3} stroke="#ef4444" />
                <line x1={w*0.58} y1={h/2} x2={w} y2={h/2} />
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
                <circle cx={w*0.3} cy={h*0.65} r={w*0.04} fill="#22c55e" stroke="#16a34a" />
                <circle cx={w*0.7} cy={h*0.65} r={w*0.04} fill="#22c55e" stroke="#16a34a" />
                <line x1={w*0.3} y1={h*0.65} x2={w*0.68} y2={h*0.25} strokeWidth={sw*1.3} stroke="#ef4444" strokeLinecap="round" />
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
                <line x1={w/2} y1={0} x2={w/2} y2={h*0.45} stroke="#10b981" />
                <line x1={w*0.1} y1={h*0.45} x2={w*0.9} y2={h*0.45} strokeWidth={sw*1.2} stroke="#10b981" />
                <line x1={w*0.25} y1={h*0.65} x2={w*0.75} y2={h*0.65} strokeWidth={sw*1.2} stroke="#10b981" />
                <line x1={w*0.4} y1={h*0.85} x2={w*0.6} y2={h*0.85} strokeWidth={sw*1.2} stroke="#10b981" />
            </g>
        )
    },
    phys_ammeter: {
        id: 'phys_ammeter',
        name: 'Ammeter (Current Gauge)',
        category: 'physics',
        defaultWidth: 85,
        defaultHeight: 85,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                <line x1={0} y1={h/2} x2={w*0.15} y2={h/2} stroke="#64748b" strokeWidth={2.5} />
                <circle cx={w/2} cy={h/2} r={w*0.36} fill="#f0fdf4" stroke="#16a34a" strokeWidth={2.5} />
                <line x1={w*0.85} y1={h/2} x2={w} y2={h/2} stroke="#64748b" strokeWidth={2.5} />
                <text x={w/2} y={h*0.64} textAnchor="middle" fontSize={w*0.4} fontWeight="bold" fill="#15803d" stroke="none" fontFamily="sans-serif">A</text>
            </g>
        )
    },
    phys_voltmeter: {
        id: 'phys_voltmeter',
        name: 'Voltmeter (Voltage Gauge)',
        category: 'physics',
        defaultWidth: 85,
        defaultHeight: 85,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                <line x1={0} y1={h/2} x2={w*0.15} y2={h/2} stroke="#64748b" strokeWidth={2.5} />
                <circle cx={w/2} cy={h/2} r={w*0.36} fill="#eff6ff" stroke="#2563eb" strokeWidth={2.5} />
                <line x1={w*0.85} y1={h/2} x2={w} y2={h/2} stroke="#64748b" strokeWidth={2.5} />
                <text x={w/2} y={h*0.64} textAnchor="middle" fontSize={w*0.4} fontWeight="bold" fill="#1d4ed8" stroke="none" fontFamily="sans-serif">V</text>
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
                <line x1={0} y1={h/2} x2={w} y2={h/2} strokeDasharray="4 4" stroke="#94a3b8" />
                <path d={`M 0 ${h/2} Q ${w*0.25} 0 ${w*0.5} ${h/2} T ${w} ${h/2}`} strokeLinecap="round" strokeWidth={2.5} stroke="#06b6d4" />
            </g>
        )
    },

    // ═══════════════════════════════════════════════════════════════════
    // 4. CHEMISTRY
    // ═══════════════════════════════════════════════════════════════════
    chem_atom: {
        id: 'chem_atom',
        name: 'Atom (Bohr Model & Nucleus)',
        category: 'chemistry',
        defaultWidth: 100,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* 3 Electron Orbit Rings */}
                <ellipse cx={w/2} cy={h/2} rx={w*0.45} ry={h*0.16} fill="none" stroke="#38bdf8" strokeWidth={1.4} opacity={0.8} />
                <ellipse cx={w/2} cy={h/2} rx={w*0.45} ry={h*0.16} fill="none" stroke="#38bdf8" strokeWidth={1.4} transform={`rotate(60 ${w/2} ${h/2})`} opacity={0.8} />
                <ellipse cx={w/2} cy={h/2} rx={w*0.45} ry={h*0.16} fill="none" stroke="#38bdf8" strokeWidth={1.4} transform={`rotate(-60 ${w/2} ${h/2})`} opacity={0.8} />
                {/* Orbiting Electrons */}
                <circle cx={w*0.12} cy={h*0.5} r={3.5} fill="#06b6d4" stroke="#ffffff" strokeWidth={1} />
                <circle cx={w*0.68} cy={h*0.18} r={3.5} fill="#06b6d4" stroke="#ffffff" strokeWidth={1} />
                <circle cx={w*0.76} cy={h*0.74} r={3.5} fill="#06b6d4" stroke="#ffffff" strokeWidth={1} />
                {/* Nucleus Protons and Neutrons */}
                <circle cx={w/2 - 4} cy={h/2 - 4} r={6} fill="#ef4444" />
                <circle cx={w/2 + 4} cy={h/2 - 2} r={6} fill="#f59e0b" />
                <circle cx={w/2 - 2} cy={h/2 + 4} r={6} fill="#ef4444" />
                <circle cx={w/2 + 5} cy={h/2 + 4} r={5.5} fill="#f59e0b" />
            </g>
        )
    },
    chem_beaker: {
        id: 'chem_beaker',
        name: 'Graduated Beaker (Bubbling Solution)',
        category: 'chemistry',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Glass Beaker Body */}
                <path d={`M ${w*0.12} ${h*0.18} L ${w*0.06} ${h*0.12} L ${w*0.2} ${h*0.12} L ${w*0.8} ${h*0.12} L ${w*0.88} ${h*0.12} L ${w*0.85} ${h*0.88} C ${w*0.85} ${h*0.96} ${w*0.15} ${h*0.96} ${w*0.15} ${h*0.88} Z`} fill="#f0f9ff" fillOpacity={0.2} stroke="#38bdf8" strokeWidth={2.2} />
                {/* Cyan/Teal Liquid Fill */}
                <path d={`M ${w*0.16} ${h*0.5} C ${w*0.35} ${h*0.47} ${w*0.65} ${h*0.53} ${w*0.84} ${h*0.5} L ${w*0.82} ${h*0.88} C ${w*0.82} ${h*0.94} ${w*0.18} ${h*0.94} ${w*0.18} ${h*0.88} Z`} fill="#06b6d4" fillOpacity={0.65} />
                {/* Meniscus Line */}
                <path d={`M ${w*0.16} ${h*0.5} Q ${w*0.5} ${h*0.53} ${w*0.84} ${h*0.5}`} fill="none" stroke="#22d3ee" strokeWidth={2} />
                {/* Floating Bubbles */}
                <circle cx={w*0.35} cy={h*0.68} r={3} fill="#ffffff" fillOpacity={0.7} />
                <circle cx={w*0.62} cy={h*0.6} r={4} fill="#ffffff" fillOpacity={0.7} />
                <circle cx={w*0.48} cy={h*0.78} r={2.5} fill="#ffffff" fillOpacity={0.7} />
                {/* Measurement Graduations */}
                <line x1={w*0.2} y1={h*0.35} x2={w*0.35} y2={h*0.35} stroke="#ffffff" strokeWidth={1.5} />
                <line x1={w*0.2} y1={h*0.5} x2={w*0.45} y2={h*0.5} stroke="#ffffff" strokeWidth={1.8} />
                <line x1={w*0.2} y1={h*0.65} x2={w*0.35} y2={h*0.65} stroke="#ffffff" strokeWidth={1.5} />
                <line x1={w*0.2} y1={h*0.8} x2={w*0.45} y2={h*0.8} stroke="#ffffff" strokeWidth={1.8} />
            </g>
        )
    },
    chem_flask: {
        id: 'chem_flask',
        name: 'Erlenmeyer Flask (Vivid Solution)',
        category: 'chemistry',
        defaultWidth: 90,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Glass Flask Outline */}
                <path d={`M ${w*0.36} ${h*0.08} L ${w*0.64} ${h*0.08} M ${w*0.38} ${h*0.08} L ${w*0.38} ${h*0.36} L ${w*0.08} ${h*0.88} C ${w*0.08} ${h*0.96} ${w*0.92} ${h*0.96} ${w*0.92} ${h*0.88} L ${w*0.62} ${h*0.36} L ${w*0.62} ${h*0.08}`} fill="#fdf4ff" fillOpacity={0.2} stroke="#c084fc" strokeWidth={2.2} strokeLinejoin="round" />
                {/* Glowing Magenta Solution */}
                <path d={`M ${w*0.2} ${h*0.68} Q ${w/2} ${h*0.64} ${w*0.8} ${h*0.68} L ${w*0.88} ${h*0.88} C ${w*0.88} ${h*0.94} ${w*0.12} ${h*0.94} ${w*0.12} ${h*0.88} Z`} fill="#d946ef" fillOpacity={0.65} />
                {/* Bubbles and Effervescence */}
                <circle cx={w*0.42} cy={h*0.78} r={3.5} fill="#ffffff" fillOpacity={0.8} />
                <circle cx={w*0.58} cy={h*0.72} r={4.5} fill="#ffffff" fillOpacity={0.8} />
                <circle cx={w*0.48} cy={h*0.48} r={2} fill="#e879f9" opacity={0.6} />
            </g>
        )
    },
    chem_test_tube: {
        id: 'chem_test_tube',
        name: 'Test Tube (Ruby Solution)',
        category: 'chemistry',
        defaultWidth: 55,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                <line x1={w*0.12} y1={h*0.08} x2={w*0.88} y2={h*0.08} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />
                {/* Glass Tube Contour */}
                <path d={`M ${w*0.22} ${h*0.08} L ${w*0.22} ${h*0.82} C ${w*0.22} ${h*0.98} ${w*0.78} ${h*0.98} ${w*0.78} ${h*0.82} L ${w*0.78} ${h*0.08}`} fill="#fff1f2" fillOpacity={0.3} stroke="#cbd5e1" strokeWidth={2} />
                {/* Ruby Red Liquid */}
                <path d={`M ${w*0.22} ${h*0.45} Q ${w/2} ${h*0.42} ${w*0.78} ${h*0.45} L ${w*0.78} ${h*0.82} C ${w*0.78} ${h*0.95} ${w*0.22} ${h*0.95} ${w*0.22} ${h*0.82} Z`} fill="#ef4444" fillOpacity={0.75} />
                {/* Reflection Highlight */}
                <line x1={w*0.3} y1={h*0.15} x2={w*0.3} y2={h*0.8} stroke="#ffffff" strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
            </g>
        )
    },
    chem_benzene: {
        id: 'chem_benzene',
        name: 'Benzene Aromatic Ring (Organic)',
        category: 'chemistry',
        defaultWidth: 100,
        defaultHeight: 100,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                <polygon 
                    points={`${w/2},${h*0.06} ${w*0.92},${h*0.28} ${w*0.92},${h*0.72} ${w/2},${h*0.94} ${w*0.08},${h*0.72} ${w*0.08},${h*0.28}`} 
                    fill="#ecfdf5" 
                    fillOpacity={0.3}
                    stroke="#10b981" 
                    strokeWidth={2.8} 
                    strokeLinejoin="round" 
                />
                {/* Delocalized Aromatic Pi Ring */}
                <circle cx={w/2} cy={h/2} r={w*0.25} fill="none" stroke="#059669" strokeWidth={2} strokeDasharray="5 3" />
                {/* Carbon Vertex Nodes */}
                {[[w/2, h*0.06], [w*0.92, h*0.28], [w*0.92, h*0.72], [w/2, h*0.94], [w*0.08, h*0.72], [w*0.08, h*0.28]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r={3} fill="#047857" />
                ))}
            </g>
        )
    },
    chem_bunsen_burner: {
        id: 'chem_bunsen_burner',
        name: 'Bunsen Burner (Dual Flame)',
        category: 'chemistry',
        defaultWidth: 85,
        defaultHeight: 110,
        renderSVG: (w, h, stroke, sw, fill) => (
            <g>
                {/* Outer Orange Flame Envelope */}
                <path d={`M ${w/2} ${h*0.06} C ${w*0.3} ${h*0.22} ${w*0.35} ${h*0.38} ${w/2} ${h*0.44} C ${w*0.65} ${h*0.38} ${w*0.7} ${h*0.22} ${w/2} ${h*0.06} Z`} fill="#f97316" fillOpacity={0.8} />
                {/* Inner Intense Cyan/Blue Flame Cone */}
                <path d={`M ${w/2} ${h*0.18} C ${w*0.4} ${h*0.28} ${w*0.42} ${h*0.38} ${w/2} ${h*0.44} C ${w*0.58} ${h*0.38} ${w*0.6} ${h*0.28} ${w/2} ${h*0.18} Z`} fill="#38bdf8" />
                {/* Metallic Chimney Barrel */}
                <rect x={w*0.41} y={h*0.44} width={w*0.18} height={h*0.36} fill="#64748b" stroke="#334155" strokeWidth={1.5} />
                {/* Air Hole Collar */}
                <ellipse cx={w/2} cy={h*0.74} rx={w*0.13} ry={h*0.035} fill="#cbd5e1" stroke="#475569" strokeWidth={1} />
                {/* Heavy Cast Iron Base */}
                <path d={`M ${w*0.15} ${h*0.92} L ${w*0.85} ${h*0.92} L ${w*0.75} ${h*0.82} L ${w*0.25} ${h*0.82} Z`} fill="#1e293b" stroke="#0f172a" strokeWidth={1.5} />
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

// Ensure every shape has both renderSVG and render methods for seamless compatibility
Object.values(DOMAIN_SHAPES).forEach(shape => {
    if (!shape.render && shape.renderSVG) {
        shape.render = (w, h, fill, stroke, sw) => shape.renderSVG(w, h, stroke, sw, fill);
    }
});


export const DOMAIN_CATEGORIES = [
    { id: 'all', label: 'All Shapes', icon: Compass },
    { id: 'networking', label: 'Networking', icon: Network },
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
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    if (!isOpen) return null;

    const shapesList = Object.values(DOMAIN_SHAPES).filter(s => {
        let matchesCategory = selectedCategory === 'all';
        if (selectedCategory === 'networking') {
            matchesCategory = s.category === 'networking' || s.id.startsWith('net_');
        } else if (selectedCategory === 'cs') {
            matchesCategory = s.category === 'cs' || s.id.startsWith('cs_') || s.id.startsWith('net_');
        } else if (selectedCategory !== 'all') {
            matchesCategory = s.category === selectedCategory;
        }
        const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             s.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    const handleGenerateAiShape = (customPrompt) => {
        const query = (customPrompt || aiPrompt).trim();
        if (!query) return;

        setIsGeneratingAi(true);
        setTimeout(() => {
            setIsGeneratingAi(false);
            const shapeId = `ai_shape_${Date.now()}`;
            const cleanName = query.charAt(0).toUpperCase() + query.slice(1);
            
            // Generate a smart, theme-matching SVG based on keyword heuristic
            const q = query.toLowerCase();
            let generatedSVG;

            if (q.includes('qubit') || q.includes('quantum')) {
                generatedSVG = (w, h) => (
                    <g>
                        <circle cx={w/2} cy={h/2} r={w*0.38} fill="#312e81" fillOpacity={0.3} stroke="#6366f1" strokeWidth={2} />
                        <ellipse cx={w/2} cy={h/2} rx={w*0.38} ry={h*0.14} fill="none" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="3 3" />
                        <line x1={w/2} y1={h*0.08} x2={w/2} y2={h*0.92} stroke="#c084fc" strokeWidth={1.8} />
                        <circle cx={w/2} cy={h*0.08} r={3} fill="#a855f7" />
                        <path d={`M ${w/2} ${h/2} L ${w*0.75} ${h*0.28}`} stroke="#38bdf8" strokeWidth={2.5} strokeLinecap="round" />
                        <circle cx={w*0.75} cy={h*0.28} r={4.5} fill="#06b6d4" stroke="#ffffff" strokeWidth={1} />
                        <text x={w*0.78} y={h*0.24} fontSize={10} fontWeight="bold" fill="#38bdf8">|ψ⟩</text>
                    </g>
                );
            } else if (q.includes('fiber') || q.includes('transceiver') || q.includes('sfp')) {
                generatedSVG = (w, h) => (
                    <g>
                        <rect x={w*0.1} y={h*0.2} width={w*0.8} height={h*0.6} rx={4} fill="#0f172a" stroke="#0284c7" strokeWidth={2} />
                        <rect x={w*0.7} y={h*0.3} width={w*0.15} height={h*0.4} fill="#eab308" rx={1} />
                        <circle cx={w*0.25} cy={h*0.5} r={w*0.08} fill="#0369a1" stroke="#38bdf8" strokeWidth={1.5} />
                        <circle cx={w*0.45} cy={h*0.5} r={w*0.08} fill="#0369a1" stroke="#38bdf8" strokeWidth={1.5} />
                        <circle cx={w*0.25} cy={h*0.5} r={2} fill="#22c55e" />
                        <circle cx={w*0.45} cy={h*0.5} r={2} fill="#ef4444" />
                        <text x={w*0.35} y={h*0.72} fontSize={7} fill="#94a3b8" textAnchor="middle">10G SFP+</text>
                    </g>
                );
            } else if (q.includes('ai') || q.includes('transformer') || q.includes('attention') || q.includes('neural')) {
                generatedSVG = (w, h) => (
                    <g>
                        <rect x={w*0.08} y={h*0.1} width={w*0.84} height={h*0.8} rx={8} fill="#1e1b4b" stroke="#8b5cf6" strokeWidth={2} />
                        <rect x={w*0.16} y={h*0.2} width={w*0.68} height={h*0.18} rx={3} fill="#4338ca" />
                        <text x={w/2} y={h*0.33} fontSize={9} fontWeight="bold" fill="#ffffff" textAnchor="middle">Multi-Head Attention</text>
                        <rect x={w*0.16} y={h*0.45} width={w*0.68} height={h*0.18} rx={3} fill="#7c3aed" />
                        <text x={w/2} y={h*0.58} fontSize={9} fontWeight="bold" fill="#ffffff" textAnchor="middle">Feed Forward</text>
                        <path d={`M ${w*0.5} ${h*0.65} L ${w*0.5} ${h*0.8}`} stroke="#38bdf8" strokeWidth={2} strokeLinecap="round" />
                    </g>
                );
            } else {
                generatedSVG = (w, h) => (
                    <g>
                        <rect x={w*0.08} y={h*0.12} width={w*0.84} height={h*0.76} rx={10} fill="#0f172a" stroke="#818cf8" strokeWidth={2} />
                        <circle cx={w*0.28} cy={h*0.5} r={w*0.14} fill="#4338ca" stroke="#6366f1" strokeWidth={1.5} />
                        <circle cx={w*0.72} cy={h*0.5} r={w*0.14} fill="#0369a1" stroke="#38bdf8" strokeWidth={1.5} />
                        <path d={`M ${w*0.28} ${h*0.5} L ${w*0.72} ${h*0.5}`} stroke="#ec4899" strokeWidth={2} strokeDasharray="3 3" />
                        <text x={w/2} y={h*0.32} fontSize={9} fontWeight="bold" fill="#e0e7ff" textAnchor="middle">{cleanName}</text>
                    </g>
                );
            }

            const newShape = {
                id: shapeId,
                name: `AI: ${cleanName}`,
                category: selectedCategory !== 'all' ? selectedCategory : 'cs',
                defaultWidth: 110,
                defaultHeight: 85,
                renderSVG: generatedSVG,
                render: (w, h, fill, stroke, sw) => generatedSVG(w, h, fill, stroke, sw)
            };

            DOMAIN_SHAPES[shapeId] = newShape;
            onSelectShape(newShape);
            onClose();
        }, 600);
    };

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
                            <p className="text-xs text-slate-400">Technical diagrams for Computer Science, Networking, STEM, Biology, Physics, and Math</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* AI Shape Generator Bar */}
                <div className="px-6 py-3 border-b border-indigo-900/40 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="✨ Generate technical symbol with AI (e.g. quantum qubit, sfp transceiver, neural transformer)..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleGenerateAiShape();
                                }}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-indigo-500/40 focus:border-indigo-400 rounded-lg text-xs text-white placeholder-slate-400 outline-none"
                            />
                        </div>
                        <button
                            onClick={() => handleGenerateAiShape()}
                            disabled={isGeneratingAi || !aiPrompt.trim()}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition shrink-0"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>{isGeneratingAi ? 'Generating...' : 'Generate Shape'}</span>
                        </button>
                    </div>
                    {/* Quick Suggestions */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] text-slate-400 pb-0.5 scrollbar-none">
                        <span className="font-semibold text-indigo-300">Quick AI Prompts:</span>
                        {['Quantum Qubit', 'SFP Transceiver', 'Transformer AI', 'Neural Synapse', 'Optocoupler IC'].map((qp) => (
                            <button
                                key={qp}
                                onClick={() => {
                                    setAiPrompt(qp);
                                    handleGenerateAiShape(qp);
                                }}
                                className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/40 transition whitespace-nowrap"
                            >
                                + {qp}
                            </button>
                        ))}
                    </div>
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
