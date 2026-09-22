'use client';

import React, { useState } from 'react';
import { 
    X, Search, Grid, Layers, Brain, Code, BookOpen, 
    ArrowRight, Network, Database, GitBranch, BarChart3, Workflow,
    Users, GitFork, Building2, RefreshCw, Triangle, CircleDot, Filter, Milestone, LayoutGrid, Award,
    Target, Sliders, CheckSquare, Boxes, Activity, TrendingUp, GitMerge
} from 'lucide-react';

const uuid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

/**
 * Miniature SVG Vector Preview component for Template Gallery cards
 * Renders actual template shapes, connectors, and text in scaled vector form.
 */
function TemplateMiniPreview({ data }) {
    if (!data || !data.shapes || data.shapes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No Preview Available
            </div>
        );
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (data.shapes || []).forEach(s => {
        const sx = s.x ?? 0;
        const sy = s.y ?? 0;
        const sw = Math.max(10, s.width ?? 100);
        const sh = Math.max(10, s.height ?? 60);
        minX = Math.min(minX, sx);
        minY = Math.min(minY, sy);
        maxX = Math.max(maxX, sx + sw);
        maxY = Math.max(maxY, sy + sh);
    });

    (data.texts || []).forEach(t => {
        const tx = t.x ?? 0;
        const ty = t.y ?? 0;
        const tw = Math.max(20, t.width ?? 120);
        const th = Math.max(20, t.height ?? 30);
        minX = Math.min(minX, tx);
        minY = Math.min(minY, sy);
        maxX = Math.max(maxX, tx + tw);
        maxY = Math.max(maxY, ty + th);
    });

    if (minX === Infinity || maxX === -Infinity) {
        minX = 0; minY = 0; maxX = 1000; maxY = 650;
    }

    const pad = 35;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = Math.max(120, (maxX - minX) + pad * 2);
    const vbH = Math.max(90, (maxY - minY) + pad * 2);

    return (
        <svg 
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} 
            className="w-full h-full object-contain pointer-events-none select-none p-1.5 transition-transform duration-300 group-hover:scale-[1.03]"
        >
            <defs>
                <marker id="preview-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#64748b" />
                </marker>
            </defs>

            {/* Connecting lines and arrows first */}
            {(data.shapes || []).filter(s => s.type === 'line' || s.type === 'arrow' || s.type === 'connector').map(s => {
                const stroke = s.color || '#64748b';
                const sw = Math.max(2, s.strokeWidth || 2);
                const x1 = s.sourcePoint ? s.sourcePoint.x : s.x;
                const y1 = s.sourcePoint ? s.sourcePoint.y : s.y;
                const x2 = s.targetPoint ? s.targetPoint.x : (s.x + (s.width || 0));
                const y2 = s.targetPoint ? s.targetPoint.y : (s.y + (s.height || 0));
                return (
                    <g key={s.id}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" markerEnd={(s.type === 'arrow' || s.arrowEnd === 'arrow') ? 'url(#preview-arrow-head)' : undefined} />
                    </g>
                );
            })}

            {/* Solid Shapes */}
            {(data.shapes || []).filter(s => s.type !== 'line' && s.type !== 'arrow' && s.type !== 'connector').map(s => {
                const fill = s.fillColor && s.fillColor !== 'transparent' ? s.fillColor : '#f8fafc';
                const stroke = s.color || '#475569';
                const sw = Math.max(1.5, s.strokeWidth || 2);
                const isCircle = s.type === 'circle';
                const isDiamond = s.type === 'diamond';
                const rx = s.type === 'rounded_rect' ? Math.min(14, s.width / 4, s.height / 4) : (s.radius || 4);
                const label = s.text ? s.text.split('\n')[0].trim().slice(0, 18) : '';

                return (
                    <g key={s.id}>
                        {isCircle ? (
                            <ellipse 
                                cx={s.x + s.width / 2} 
                                cy={s.y + s.height / 2} 
                                rx={s.width / 2} 
                                ry={s.height / 2} 
                                fill={fill} 
                                stroke={stroke} 
                                strokeWidth={sw} 
                            />
                        ) : isDiamond ? (
                            <polygon 
                                points={`${s.x + s.width / 2},${s.y} ${s.x + s.width},${s.y + s.height / 2} ${s.x + s.width / 2},${s.y + s.height} ${s.x},${s.y + s.height / 2}`}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={sw}
                            />
                        ) : (
                            <rect 
                                x={s.x} 
                                y={s.y} 
                                width={s.width} 
                                height={s.height} 
                                rx={rx} 
                                fill={fill} 
                                stroke={stroke} 
                                strokeWidth={sw} 
                            />
                        )}
                        {label && (
                            <text 
                                x={s.x + s.width / 2} 
                                y={s.y + s.height / 2} 
                                fill={s.textColor || stroke} 
                                fontSize={Math.max(10, Math.min(14, (s.fontSize || 14) * 0.85))} 
                                fontWeight="bold" 
                                textAnchor="middle" 
                                dominantBaseline="central"
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Primary Heading Text */}
            {(data.texts || []).slice(0, 2).map(t => (
                <text 
                    key={t.id} 
                    x={t.x + (t.width || 200) / 2} 
                    y={t.y + 20} 
                    fill={t.color || '#0f172a'} 
                    fontSize={Math.max(14, (t.fontSize || 20) * 0.85)} 
                    fontWeight={t.fontWeight || 'bold'} 
                    textAnchor="middle"
                >
                    {t.text}
                </text>
            ))}
        </svg>
    );
}

const templates = [
    {
        id: 'algo-flowchart',
        title: 'Algorithm Flowchart',
        category: 'CS Fundamentals',
        description: 'Standard flowchart for algorithm design.',
        icon: <Workflow className="w-6 h-6" />,
        previewColors: ['#22c55e', '#3b82f6', '#eab308', '#ef4444'],
        data: {
            title: 'Algorithm Flowchart',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 400, y: 100, width: 200, height: 60, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'Start', textColor: '#166534', fontSize: 16, radius: 30 },
                { id: uuid(), type: 'arrow', x: 500, y: 160, width: 0, height: 90, color: '#475569', strokeWidth: 2 },
                { id: uuid(), type: 'rectangle', x: 400, y: 250, width: 200, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Input', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'arrow', x: 500, y: 310, width: 0, height: 90, color: '#475569', strokeWidth: 2 },
                { id: uuid(), type: 'rectangle', x: 400, y: 400, width: 200, height: 60, color: '#ca8a04', fillColor: '#fef08a', strokeWidth: 2, rotation: 45, text: 'Decision?', textColor: '#854d0e', fontSize: 16 },
                { id: uuid(), type: 'arrow', x: 500, y: 460, width: 0, height: 90, color: '#475569', strokeWidth: 2 },
                { id: uuid(), type: 'rectangle', x: 400, y: 550, width: 200, height: 60, color: '#ea580c', fillColor: '#ffedd5', strokeWidth: 2, rotation: 0, text: 'Output', textColor: '#9a3412', fontSize: 16, skewX: 10 },
                { id: uuid(), type: 'arrow', x: 500, y: 610, width: 0, height: 90, color: '#475569', strokeWidth: 2 },
                { id: uuid(), type: 'rectangle', x: 400, y: 700, width: 200, height: 60, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'End', textColor: '#991b1b', fontSize: 16, radius: 30 },
            ],
            texts: [
                { id: uuid(), x: 400, y: 50, width: 300, height: 40, text: 'Algorithm Flowchart', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'neural-net',
        title: 'Neural Network Diagram',
        category: 'AI & ML',
        description: 'Multi-layer perceptron architecture visualization.',
        icon: <Network className="w-6 h-6" />,
        previewColors: ['#3b82f6', '#8b5cf6', '#ec4899'],
        data: {
            title: 'Neural Network Diagram',
            background: { pattern: 'grid', color: '#f8fafc' },
            shapes: [
                // Input Layer
                { id: uuid(), type: 'circle', x: 200, y: 200, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x1', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 200, y: 300, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x2', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 200, y: 400, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x3', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 200, y: 500, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x4', textColor: '#1e40af', fontSize: 16 },

                // Interconnect Lines: Input to Hidden Layer
                { id: uuid(), type: 'line', x: 260, y: 230, width: 240, height: -50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 230, width: 240, height: 50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 330, width: 240, height: -50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 330, width: 240, height: 50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 430, width: 240, height: -50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 430, width: 240, height: 50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 530, width: 240, height: -50, color: '#93c5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 260, y: 530, width: 240, height: 50, color: '#93c5fd', strokeWidth: 1.5 },
                
                // Hidden Layer
                { id: uuid(), type: 'circle', x: 500, y: 150, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h1', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 250, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h2', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 350, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h3', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 450, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h4', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 550, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h5', textColor: '#5b21b6', fontSize: 16 },

                // Interconnect Lines: Hidden to Output Layer
                { id: uuid(), type: 'line', x: 560, y: 180, width: 240, height: 100, color: '#c4b5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 560, y: 280, width: 240, height: 0, color: '#c4b5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 560, y: 380, width: 240, height: 0, color: '#c4b5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 560, y: 480, width: 240, height: 0, color: '#c4b5fd', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 560, y: 580, width: 240, height: -100, color: '#c4b5fd', strokeWidth: 1.5 },
                
                // Output Layer
                { id: uuid(), type: 'circle', x: 800, y: 250, width: 60, height: 60, color: '#db2777', fillColor: '#fce7f3', strokeWidth: 2, rotation: 0, text: 'y1', textColor: '#9d174d', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 800, y: 350, width: 60, height: 60, color: '#db2777', fillColor: '#fce7f3', strokeWidth: 2, rotation: 0, text: 'y2', textColor: '#9d174d', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 800, y: 450, width: 60, height: 60, color: '#db2777', fillColor: '#fce7f3', strokeWidth: 2, rotation: 0, text: 'y3', textColor: '#9d174d', fontSize: 16 },
            ],
            texts: [
                { id: uuid(), x: 200, y: 100, width: 150, height: 30, text: 'Input Layer', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#1e40af', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 80, width: 150, height: 30, text: 'Hidden Layer', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#5b21b6', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 800, y: 150, width: 150, height: 30, text: 'Output Layer', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#9d174d', bgColor: 'transparent', rotation: 0 },
            ]
        }
    },
    {
        id: 'uml-class',
        title: 'UML Class Diagram',
        category: 'CS Fundamentals',
        description: 'Object-oriented software structure.',
        icon: <Code className="w-6 h-6" />,
        previewColors: ['#0f172a', '#475569'],
        data: {
            title: 'UML Class Diagram',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 300, y: 200, width: 250, height: 200, color: '#0f172a', fillColor: '#f8fafc', strokeWidth: 2, rotation: 0, text: '', textColor: '#0f172a', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 700, y: 200, width: 250, height: 200, color: '#0f172a', fillColor: '#f8fafc', strokeWidth: 2, rotation: 0, text: '', textColor: '#0f172a', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 500, y: 500, width: 250, height: 200, color: '#0f172a', fillColor: '#f8fafc', strokeWidth: 2, rotation: 0, text: '', textColor: '#0f172a', fontSize: 14 },
                
                // Connecting Relationship Edges
                { id: uuid(), type: 'arrow', x: 550, y: 300, width: 150, height: 0, color: '#475569', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 425, y: 400, width: 75, height: 100, color: '#475569', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 825, y: 400, width: -75, height: 100, color: '#475569', strokeWidth: 2 },
            ],
            texts: [
                { id: uuid(), x: 300, y: 120, width: 250, height: 30, text: 'User', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 300, y: 160, width: 250, height: 100, text: '- id: UUID\n- name: String\n- email: String', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 700, y: 120, width: 250, height: 30, text: 'Database', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 420, width: 250, height: 30, text: 'API', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 50, width: 300, height: 40, text: 'UML Class Diagram', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'er-diagram',
        title: 'ER Diagram',
        category: 'CS Fundamentals',
        description: 'Entity-Relationship model for databases.',
        icon: <Database className="w-6 h-6" />,
        previewColors: ['#0369a1', '#be123c'],
        data: {
            title: 'Entity-Relationship Diagram',
            background: { pattern: 'grid', color: '#fafafa' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 200, y: 300, width: 160, height: 80, color: '#0369a1', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Student', textColor: '#075985', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 800, y: 300, width: 160, height: 80, color: '#0369a1', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Course', textColor: '#075985', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 500, y: 300, width: 160, height: 160, color: '#be123c', fillColor: '#ffe4e6', strokeWidth: 2, rotation: 45, text: 'Enrollment', textColor: '#881337', fontSize: 16 },
                
                { id: uuid(), type: 'circle', x: 100, y: 200, width: 100, height: 60, color: '#475569', fillColor: '#f1f5f9', strokeWidth: 2, rotation: 0, text: 'StudentID', textColor: '#334155', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 250, y: 150, width: 100, height: 60, color: '#475569', fillColor: '#f1f5f9', strokeWidth: 2, rotation: 0, text: 'Name', textColor: '#334155', fontSize: 14 },

                // Relationship & attribute connectors
                { id: uuid(), type: 'line', x: 360, y: 340, width: 140, height: 0, color: '#64748b', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 660, y: 340, width: 140, height: 0, color: '#64748b', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 150, y: 260, width: 90, height: 40, color: '#94a3b8', strokeWidth: 1.5 },
                { id: uuid(), type: 'line', x: 280, y: 210, width: 0, height: 90, color: '#94a3b8', strokeWidth: 1.5 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 100, width: 400, height: 40, text: 'Entity-Relationship Diagram', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'dfd',
        title: 'Data Flow Diagram',
        category: 'CS Fundamentals',
        description: 'System process and data flows.',
        icon: <ArrowRight className="w-6 h-6" />,
        previewColors: ['#0f766e', '#b45309'],
        data: {
            title: 'Data Flow Diagram - Level 0',
            background: { pattern: 'dots', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 200, y: 300, width: 140, height: 80, color: '#0f766e', fillColor: '#ccfbf1', strokeWidth: 2, rotation: 0, text: 'Customer', textColor: '#115e59', fontSize: 16 },
                { id: uuid(), type: 'arrow', x: 340, y: 340, width: 160, height: 0, color: '#0f766e', strokeWidth: 2.5 },
                { id: uuid(), type: 'circle', x: 500, y: 270, width: 140, height: 140, color: '#b45309', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: '0.1\nOrder\nSystem', textColor: '#92400e', fontSize: 16 },
                { id: uuid(), type: 'arrow', x: 640, y: 340, width: 160, height: 0, color: '#4338ca', strokeWidth: 2.5 },
                { id: uuid(), type: 'rectangle', x: 800, y: 300, width: 140, height: 80, color: '#4338ca', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'D1: Orders', textColor: '#3730a3', fontSize: 16 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 100, width: 400, height: 40, text: 'Data Flow Diagram - Level 0', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'decision-tree',
        title: 'Decision Tree (ML)',
        category: 'AI & ML',
        description: 'Machine learning classification tree.',
        icon: <GitBranch className="w-6 h-6" />,
        previewColors: ['#1d4ed8', '#047857', '#b91c1c'],
        data: {
            title: 'Decision Tree Classifier',
            background: { pattern: 'none', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 500, y: 150, width: 220, height: 80, color: '#1d4ed8', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Feature X > 0.5?', textColor: '#1e3a8a', fontSize: 16 },
                
                // Branch lines
                { id: uuid(), type: 'arrow', x: 550, y: 230, width: -150, height: 120, color: '#047857', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 670, y: 230, width: 130, height: 120, color: '#b91c1c', strokeWidth: 2 },

                { id: uuid(), type: 'rectangle', x: 300, y: 350, width: 200, height: 80, color: '#047857', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Class A (Yes)', textColor: '#064e3b', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 700, y: 350, width: 200, height: 80, color: '#b91c1c', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'Feature Y > 1.2?', textColor: '#7f1d1d', fontSize: 16 },
                
                // Sub-branch lines
                { id: uuid(), type: 'arrow', x: 750, y: 430, width: -70, height: 120, color: '#047857', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 850, y: 430, width: 30, height: 120, color: '#047857', strokeWidth: 2 },

                { id: uuid(), type: 'rectangle', x: 600, y: 550, width: 160, height: 80, color: '#047857', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Class B', textColor: '#064e3b', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 800, y: 550, width: 160, height: 80, color: '#047857', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Class C', textColor: '#064e3b', fontSize: 16 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 50, width: 400, height: 40, text: 'Decision Tree Classifier', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'confusion-matrix',
        title: 'Confusion Matrix',
        category: 'AI & ML',
        description: 'Performance evaluation matrix for classification.',
        icon: <Grid className="w-6 h-6" />,
        previewColors: ['#22c55e', '#ef4444', '#f97316', '#3b82f6'],
        data: {
            title: 'Confusion Matrix',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 400, y: 300, width: 200, height: 200, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'True Positive (TP)', textColor: '#14532d', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 600, y: 300, width: 200, height: 200, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'False Negative (FN)', textColor: '#7f1d1d', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 400, y: 500, width: 200, height: 200, color: '#ea580c', fillColor: '#ffedd5', strokeWidth: 2, rotation: 0, text: 'False Positive (FP)', textColor: '#7c2d12', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 600, y: 500, width: 200, height: 200, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'True Negative (TN)', textColor: '#1e3a8a', fontSize: 18 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 100, width: 300, height: 40, text: 'Confusion Matrix', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 180, width: 400, height: 30, text: 'Predicted Values', fontSize: 20, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 400, y: 220, width: 200, height: 30, text: 'Positive', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#475569', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 600, y: 220, width: 200, height: 30, text: 'Negative', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#475569', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 180, y: 400, width: 200, height: 30, text: 'Actual Values', fontSize: 20, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: -90 },
            ]
        }
    },
    {
        id: 'ml-pipeline',
        title: 'ML Pipeline Architecture',
        category: 'AI & ML',
        description: 'End-to-end machine learning lifecycle.',
        icon: <BarChart3 className="w-6 h-6" />,
        previewColors: ['#6366f1'],
        data: {
            title: 'Machine Learning Pipeline',
            background: { pattern: 'grid', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 200, y: 300, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Data Collection', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'arrow', x: 380, y: 340, width: 70, height: 0, color: '#4f46e5', strokeWidth: 2.5 },
                { id: uuid(), type: 'rectangle', x: 450, y: 300, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Preprocessing', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'arrow', x: 630, y: 340, width: 70, height: 0, color: '#4f46e5', strokeWidth: 2.5 },
                { id: uuid(), type: 'rectangle', x: 700, y: 300, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Feature Eng', textColor: '#312e81', fontSize: 16, radius: 10 },
                
                // Pipeline Downward Sequence to Training
                { id: uuid(), type: 'arrow', x: 790, y: 380, width: -480, height: 70, color: '#6366f1', strokeWidth: 2 },
                
                { id: uuid(), type: 'rectangle', x: 200, y: 450, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Model Training', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'arrow', x: 380, y: 490, width: 70, height: 0, color: '#4f46e5', strokeWidth: 2.5 },
                { id: uuid(), type: 'rectangle', x: 450, y: 450, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Evaluation', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'arrow', x: 630, y: 490, width: 70, height: 0, color: '#4f46e5', strokeWidth: 2.5 },
                { id: uuid(), type: 'rectangle', x: 700, y: 450, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Deployment', textColor: '#312e81', fontSize: 16, radius: 10 },
            ],
            texts: [
                { id: uuid(), x: 450, y: 150, width: 400, height: 40, text: 'Machine Learning Pipeline', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'cornell-notes',
        title: 'Cornell Notes',
        category: 'General',
        description: 'Structured note-taking method.',
        icon: <BookOpen className="w-6 h-6" />,
        previewColors: ['#94a3b8'],
        data: {
            title: 'Cornell Notes',
            background: { pattern: 'lines', color: '#fdfbf7' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 250, y: 400, width: 300, height: 600, color: '#cbd5e1', fillColor: 'transparent', strokeWidth: 2, rotation: 0, text: '', textColor: '#000000', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 750, y: 400, width: 700, height: 600, color: '#cbd5e1', fillColor: 'transparent', strokeWidth: 2, rotation: 0, text: '', textColor: '#000000', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 500, y: 800, width: 1000, height: 200, color: '#cbd5e1', fillColor: 'transparent', strokeWidth: 2, rotation: 0, text: '', textColor: '#000000', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 50, width: 300, height: 40, text: 'Cornell Notes', fontSize: 28, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 250, y: 120, width: 200, height: 30, text: 'Key Points / Cues', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 750, y: 120, width: 200, height: 30, text: 'Notes', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 720, width: 200, height: 30, text: 'Summary', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
            ]
        }
    },
    {
        id: 'mind-map',
        title: 'Mind Map',
        category: 'General',
        description: 'Brainstorming and conceptual mapping.',
        icon: <Brain className="w-6 h-6" />,
        previewColors: ['#a855f7', '#f43f5e', '#3b82f6', '#10b981'],
        data: {
            title: 'Mind Map',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'circle', x: 500, y: 400, width: 140, height: 140, color: '#a855f7', fillColor: '#f3e8ff', strokeWidth: 3, rotation: 0, text: 'Main Topic', textColor: '#7e22ce', fontSize: 18 },
                
                // Connecting radial lines from Main Topic to Subtopics
                { id: uuid(), type: 'line', x: 500, y: 420, width: -150, height: -140, color: '#93c5fd', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 640, y: 420, width: 110, height: -140, color: '#fda4af', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 500, y: 470, width: -250, height: -20, color: '#6ee7b7', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 640, y: 470, width: 210, height: -20, color: '#fcd34d', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 500, y: 520, width: -150, height: 100, color: '#c4b5fd', strokeWidth: 2 },
                { id: uuid(), type: 'line', x: 640, y: 520, width: 110, height: 100, color: '#5eead4', strokeWidth: 2 },

                { id: uuid(), type: 'circle', x: 250, y: 200, width: 100, height: 100, color: '#3b82f6', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Subtopic 1', textColor: '#1e40af', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 750, y: 200, width: 100, height: 100, color: '#f43f5e', fillColor: '#ffe4e6', strokeWidth: 2, rotation: 0, text: 'Subtopic 2', textColor: '#be123c', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 150, y: 400, width: 100, height: 100, color: '#10b981', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Subtopic 3', textColor: '#047857', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 850, y: 400, width: 100, height: 100, color: '#f59e0b', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'Subtopic 4', textColor: '#b45309', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 250, y: 600, width: 100, height: 100, color: '#8b5cf6', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'Subtopic 5', textColor: '#6d28d9', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 750, y: 600, width: 100, height: 100, color: '#14b8a6', fillColor: '#ccfbf1', strokeWidth: 2, rotation: 0, text: 'Subtopic 6', textColor: '#0f766e', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 50, width: 300, height: 40, text: 'Mind Map', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ezwrite-hierarchical-org',
        title: 'Hierarchical Org Chart (EZWrite)',
        category: 'Org Charts',
        description: 'Multi-tiered corporate or academic organizational hierarchy with leadership, departments, and teams.',
        icon: <Users className="w-6 h-6" />,
        previewColors: ['#4f46e5', '#0284c7', '#059669', '#d97706'],
        data: {
            title: 'Organizational Hierarchy Chart',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                // Level 1: Leadership / Executive
                { id: uuid(), type: 'rounded_rect', x: 420, y: 120, width: 240, height: 75, color: '#4338ca', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Chief Executive Officer\n(Leadership)', textColor: '#312e81', fontSize: 15 },
                
                // Vertical trunk from CEO
                { id: uuid(), type: 'line', x: 540, y: 195, width: 0, height: 45, color: '#64748b', strokeWidth: 2 },
                // Horizontal distribution branch
                { id: uuid(), type: 'line', x: 230, y: 240, width: 620, height: 0, color: '#64748b', strokeWidth: 2 },
                // Drops to Level 2
                { id: uuid(), type: 'arrow', x: 230, y: 240, width: 0, height: 40, color: '#64748b', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 540, y: 240, width: 0, height: 40, color: '#64748b', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 850, y: 240, width: 0, height: 40, color: '#64748b', strokeWidth: 2 },

                // Level 2: Functional VPs / Heads
                { id: uuid(), type: 'rounded_rect', x: 120, y: 280, width: 220, height: 65, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'VP of Engineering\nTechnology Lead', textColor: '#0369a1', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 430, y: 280, width: 220, height: 65, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'VP of Product\nStrategy & UX', textColor: '#047857', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 740, y: 280, width: 220, height: 65, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'VP of Operations\nLab & Research Mgmt', textColor: '#b45309', fontSize: 14 },

                // Level 2 to Level 3 connectors
                { id: uuid(), type: 'arrow', x: 160, y: 345, width: -35, height: 85, color: '#94a3b8', strokeWidth: 1.5 },
                { id: uuid(), type: 'arrow', x: 280, y: 345, width: 35, height: 85, color: '#94a3b8', strokeWidth: 1.5 },
                { id: uuid(), type: 'arrow', x: 540, y: 345, width: 0, height: 85, color: '#94a3b8', strokeWidth: 1.5 },
                { id: uuid(), type: 'arrow', x: 780, y: 345, width: -15, height: 85, color: '#94a3b8', strokeWidth: 1.5 },
                { id: uuid(), type: 'arrow', x: 920, y: 345, width: 35, height: 85, color: '#94a3b8', strokeWidth: 1.5 },

                // Level 3: Department Leads & Teams
                { id: uuid(), type: 'rounded_rect', x: 40, y: 430, width: 170, height: 55, color: '#6366f1', fillColor: '#eef2ff', strokeWidth: 1.5, rotation: 0, text: 'Core Platform\nLead Engineer', textColor: '#4338ca', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 230, y: 430, width: 170, height: 55, color: '#6366f1', fillColor: '#eef2ff', strokeWidth: 1.5, rotation: 0, text: 'Cloud & DevOps\nInfrastructure', textColor: '#4338ca', fontSize: 13 },

                { id: uuid(), type: 'rounded_rect', x: 430, y: 430, width: 220, height: 55, color: '#10b981', fillColor: '#ecfdf5', strokeWidth: 1.5, rotation: 0, text: 'Design & Analytics\nProduct Squads', textColor: '#065f46', fontSize: 13 },

                { id: uuid(), type: 'rounded_rect', x: 680, y: 430, width: 170, height: 55, color: '#f59e0b', fillColor: '#fffbeb', strokeWidth: 1.5, rotation: 0, text: 'Lab Supervisors\nOperations', textColor: '#92400e', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 870, y: 430, width: 170, height: 55, color: '#f59e0b', fillColor: '#fffbeb', strokeWidth: 1.5, rotation: 0, text: 'Compliance & Safety\nAudit Officer', textColor: '#92400e', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 380, y: 45, width: 350, height: 40, text: 'Organizational Hierarchy Chart', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ezwrite-matrix-org',
        title: 'Team Matrix Org Chart (EZWrite)',
        category: 'Org Charts',
        description: 'Cross-functional matrix structure aligning technical discipline chapters with product squads.',
        icon: <GitFork className="w-6 h-6" />,
        previewColors: ['#6366f1', '#8b5cf6', '#ec4899'],
        data: {
            title: 'Cross-Functional Team Matrix',
            background: { pattern: 'grid', color: '#fcfcfd' },
            shapes: [
                // Functional Chapters (Vertical Columns Header)
                { id: uuid(), type: 'rounded_rect', x: 220, y: 120, width: 200, height: 50, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Frontend Chapter', textColor: '#3730a3', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 460, y: 120, width: 200, height: 50, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Backend & Cloud', textColor: '#0369a1', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 700, y: 120, width: 200, height: 50, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'AI & Data Science', textColor: '#5b21b6', fontSize: 14 },

                // Product Squads (Horizontal Row Labels)
                { id: uuid(), type: 'rounded_rect', x: 40, y: 210, width: 150, height: 70, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'Squad Alpha\nWhiteboard & Realtime', textColor: '#92400e', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 40, y: 320, width: 150, height: 70, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Squad Beta\nLab Records & Docs', textColor: '#065f46', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 40, y: 430, width: 150, height: 70, color: '#e11d48', fillColor: '#ffe4e6', strokeWidth: 2, rotation: 0, text: 'Squad Gamma\nAI Analytics & Reports', textColor: '#9f1239', fontSize: 13 },

                // Matrix Intersections (Staff Cards)
                { id: uuid(), type: 'rectangle', x: 220, y: 210, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Canvas Engineers\n(2 Full-Time)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 460, y: 210, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'WebSocket / Socket.io\n(1 Senior Eng)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 700, y: 210, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Gesture Recognition\n(1 ML Specialist)', textColor: '#334155', fontSize: 12 },

                { id: uuid(), type: 'rectangle', x: 220, y: 320, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Next.js UI Leads\n(2 Developers)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 460, y: 320, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'PostgreSQL & Drive\n(2 Backend Eng)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 700, y: 320, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Document OCR / NLP\n(1 Data Eng)', textColor: '#334155', fontSize: 12 },

                { id: uuid(), type: 'rectangle', x: 220, y: 430, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Chart & Dashboard\n(1 UI Eng)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 460, y: 430, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Analytics APIs\n(1 Backend Eng)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 700, y: 430, width: 200, height: 70, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: 'Predictive Insights\n(2 AI Researchers)', textColor: '#334155', fontSize: 12 },
            ],
            texts: [
                { id: uuid(), x: 340, y: 45, width: 400, height: 40, text: 'Cross-Functional Team Matrix', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ezwrite-process-hierarchy',
        title: 'Process Hierarchy Flow (EZWrite)',
        category: 'Org Charts',
        description: 'Structured stage-gate decision hierarchy for corporate initiatives and laboratory approvals.',
        icon: <Building2 className="w-6 h-6" />,
        previewColors: ['#2563eb', '#16a34a', '#ca8a04', '#9333ea'],
        data: {
            title: 'Stage-Gate Process Hierarchy',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                // Phase 1: Intake & Assessment
                { id: uuid(), type: 'rounded_rect', x: 80, y: 150, width: 180, height: 70, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Phase 1: Proposal\nLab Project Intake', textColor: '#1e40af', fontSize: 14 },
                { id: uuid(), type: 'arrow', x: 170, y: 220, width: 0, height: 60, color: '#2563eb', strokeWidth: 2 },
                { id: uuid(), type: 'diamond', x: 120, y: 280, width: 100, height: 100, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Gate 1:\nFeasibility', textColor: '#0369a1', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 220, y: 330, width: 100, height: -145, color: '#0284c7', strokeWidth: 2 },

                // Phase 2: Design & Review
                { id: uuid(), type: 'rounded_rect', x: 320, y: 150, width: 180, height: 70, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'Phase 2: Planning\nMethodology & Risk', textColor: '#5b21b6', fontSize: 14 },
                { id: uuid(), type: 'arrow', x: 410, y: 220, width: 0, height: 60, color: '#7c3aed', strokeWidth: 2 },
                { id: uuid(), type: 'diamond', x: 360, y: 280, width: 100, height: 100, color: '#6d28d9', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'Gate 2:\nSafety Review', textColor: '#4c1d95', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 460, y: 330, width: 100, height: -145, color: '#6d28d9', strokeWidth: 2 },

                // Phase 3: Execution & Testing
                { id: uuid(), type: 'rounded_rect', x: 560, y: 150, width: 180, height: 70, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'Phase 3: Execution\nLive Testing & Logs', textColor: '#b45309', fontSize: 14 },
                { id: uuid(), type: 'arrow', x: 650, y: 220, width: 0, height: 60, color: '#d97706', strokeWidth: 2 },
                { id: uuid(), type: 'diamond', x: 600, y: 280, width: 100, height: 100, color: '#b45309', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'Gate 3:\nQuality Audit', textColor: '#78350f', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 700, y: 330, width: 100, height: -145, color: '#b45309', strokeWidth: 2 },

                // Phase 4: Signoff & Delivery
                { id: uuid(), type: 'rounded_rect', x: 800, y: 150, width: 180, height: 70, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'Phase 4: Closure\nFinal Report & Archival', textColor: '#166534', fontSize: 14 },
                { id: uuid(), type: 'arrow', x: 890, y: 220, width: 0, height: 80, color: '#16a34a', strokeWidth: 2.5 },
                { id: uuid(), type: 'circle', x: 850, y: 300, width: 80, height: 80, color: '#16a34a', fillColor: '#bbf7d0', strokeWidth: 3, rotation: 0, text: 'Approved\nComplete', textColor: '#14532d', fontSize: 12 },
            ],
            texts: [
                { id: uuid(), x: 350, y: 50, width: 400, height: 40, text: 'Stage-Gate Process Hierarchy', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-pdca-cycle',
        title: 'Continuous PDCA Cycle (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Iconic 4-stage circular continuous improvement cycle (Plan, Do, Check, Act) surrounding a central core.',
        icon: <RefreshCw className="w-6 h-6" />,
        previewColors: ['#2563eb', '#16a34a', '#d97706', '#9333ea'],
        data: {
            title: 'Continuous PDCA Process Cycle',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'circle', x: 440, y: 300, width: 140, height: 140, color: '#1e293b', fillColor: '#f1f5f9', strokeWidth: 2.5, rotation: 0, text: 'PDCA\nContinuous\nImprovement', textColor: '#0f172a', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 410, y: 130, width: 200, height: 75, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: '1. PLAN\nGoals & Hypotheses', textColor: '#1e40af', fontSize: 14 },
                
                // Connecting arrows Plan -> Do -> Check -> Act -> Plan
                { id: uuid(), type: 'arrow', x: 610, y: 170, width: 90, height: 130, color: '#2563eb', strokeWidth: 2.5 },
                
                { id: uuid(), type: 'rounded_rect', x: 670, y: 300, width: 200, height: 75, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: '2. DO\nImplement & Pilot', textColor: '#166534', fontSize: 14 },
                
                { id: uuid(), type: 'arrow', x: 740, y: 375, width: -130, height: 95, color: '#16a34a', strokeWidth: 2.5 },
                
                { id: uuid(), type: 'rounded_rect', x: 410, y: 470, width: 200, height: 75, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: '3. CHECK\nMetrics & Analyze', textColor: '#92400e', fontSize: 14 },
                
                { id: uuid(), type: 'arrow', x: 410, y: 505, width: -130, height: -130, color: '#d97706', strokeWidth: 2.5 },
                
                { id: uuid(), type: 'rounded_rect', x: 150, y: 300, width: 200, height: 75, color: '#9333ea', fillColor: '#f3e8ff', strokeWidth: 2, rotation: 0, text: '4. ACT\nStandardize & Scale', textColor: '#6b21a8', fontSize: 14 },
                
                { id: uuid(), type: 'arrow', x: 280, y: 300, width: 130, height: -130, color: '#9333ea', strokeWidth: 2.5 },
            ],
            texts: [
                { id: uuid(), x: 340, y: 45, width: 420, height: 40, text: 'Continuous PDCA Process Cycle', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-pyramid-hierarchy',
        title: 'Strategic Pyramid (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Classic 3-tier organizational & strategic pyramid (Strategic, Tactical, Operational).',
        icon: <Triangle className="w-6 h-6" />,
        previewColors: ['#4f46e5', '#0284c7', '#059669'],
        data: {
            title: 'Strategic Pyramid Hierarchy',
            background: { pattern: 'grid', color: '#fcfcfd' },
            shapes: [
                { id: uuid(), type: 'rounded_rect', x: 370, y: 150, width: 280, height: 80, color: '#4338ca', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'TOP: STRATEGIC TIER\nExecutive Vision, Mission & Goals', textColor: '#312e81', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 270, y: 270, width: 480, height: 85, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'MIDDLE: TACTICAL TIER\nDepartment Priorities, Milestones & Resources', textColor: '#0369a1', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 170, y: 395, width: 680, height: 95, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'BASE: OPERATIONAL TIER\nDaily Lab Protocols, Experiments, Execution & Documentation', textColor: '#047857', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 350, y: 45, width: 380, height: 40, text: 'Strategic Pyramid Hierarchy', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-venn-diagram',
        title: '3-Circle Venn Synergy (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Overlapping Venn diagram illustrating synergy between People, Process, and Technology.',
        icon: <CircleDot className="w-6 h-6" />,
        previewColors: ['#ef4444', '#3b82f6', '#10b981'],
        data: {
            title: 'People, Process & Technology Venn',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'circle', x: 390, y: 140, width: 220, height: 220, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'PEOPLE\nSkills & Culture', textColor: '#991b1b', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 270, y: 300, width: 220, height: 220, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'PROCESS\nGovernance & QA', textColor: '#1e40af', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 510, y: 300, width: 220, height: 220, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'TECHNOLOGY\nTools & Infra', textColor: '#166534', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 430, y: 280, width: 140, height: 140, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'OPTIMAL\nSYNERGY', textColor: '#312e81', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 45, width: 440, height: 40, text: 'Organizational Synergy Venn Diagram', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-sales-funnel',
        title: 'Conversion Pipeline Funnel (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Multi-stage conversion funnel from Awareness to Enrolled Completion.',
        icon: <Filter className="w-6 h-6" />,
        previewColors: ['#6366f1', '#0284c7', '#0e7490', '#15803d'],
        data: {
            title: 'Conversion & Engagement Funnel',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rounded_rect', x: 170, y: 140, width: 680, height: 65, color: '#4338ca', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: '1. AWARENESS (1,000 Inquiries / Course Visitors)', textColor: '#312e81', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 230, y: 230, width: 560, height: 65, color: '#1d4ed8', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: '2. INTEREST & ENGAGEMENT (450 Active Students / Users)', textColor: '#1e40af', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 290, y: 320, width: 440, height: 65, color: '#0e7490', fillColor: '#cffafe', strokeWidth: 2, rotation: 0, text: '3. EVALUATION & TRIALS (180 Qualified Proposals)', textColor: '#155e75', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 360, y: 410, width: 300, height: 75, color: '#15803d', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: '4. APPROVED & ENROLLED\n(75 Verified Completions)', textColor: '#14532d', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 45, width: 420, height: 40, text: 'Conversion & Engagement Funnel', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-milestone-roadmap',
        title: 'Chevron Milestone Roadmap (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Quarterly chevron roadmap (Q1–Q4) with deliverables and achievement cards.',
        icon: <Milestone className="w-6 h-6" />,
        previewColors: ['#0284c7', '#2563eb', '#7c3aed', '#059669'],
        data: {
            title: 'Quarterly Milestone Roadmap (Q1–Q4)',
            background: { pattern: 'grid', color: '#fcfcfd' },
            shapes: [
                { id: uuid(), type: 'rounded_rect', x: 30, y: 150, width: 220, height: 80, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'PHASE 1: Q1\nRequirements & Setup', textColor: '#0369a1', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 270, y: 150, width: 220, height: 80, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'PHASE 2: Q2\nAlpha Build & Integration', textColor: '#1e40af', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 510, y: 150, width: 220, height: 80, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'PHASE 3: Q3\nSecurity Audit & Pilot', textColor: '#5b21b6', fontSize: 14 },
                { id: uuid(), type: 'rounded_rect', x: 750, y: 150, width: 220, height: 80, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'PHASE 4: Q4\nCampus-wide Rollout', textColor: '#047857', fontSize: 14 },

                { id: uuid(), type: 'rectangle', x: 30, y: 260, width: 220, height: 180, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Schema Migrations\n• Multi-cloud Auth\n• Device inventory', textColor: '#334155', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 270, y: 260, width: 220, height: 180, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Whiteboard Tools\n• SmartArt Templates\n• Live sockets sync', textColor: '#334155', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 510, y: 260, width: 220, height: 180, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• End-to-end testing\n• 32 Jest unit suites\n• Performance tune', textColor: '#334155', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 750, y: 260, width: 220, height: 180, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Admin dashboards\n• Cron automated digests\n• User documentation', textColor: '#334155', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 45, width: 440, height: 40, text: 'Quarterly Milestone Roadmap (Q1–Q4)', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-swot-matrix',
        title: 'SWOT Analysis Matrix (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Classic 2x2 grid for Strengths, Weaknesses, Opportunities, and Threats.',
        icon: <LayoutGrid className="w-6 h-6" />,
        previewColors: ['#16a34a', '#dc2626', '#0284c7', '#d97706'],
        data: {
            title: 'Strategic SWOT Analysis Matrix',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 100, y: 140, width: 390, height: 200, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'STRENGTHS (Internal)\n\n• High performance canvas engine\n• Real-time multi-user socket sync\n• Automated Excel/PDF reports\n• Built-in AI assistant bot', textColor: '#14532d', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 510, y: 140, width: 390, height: 200, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'WEAKNESSES (Internal)\n\n• Legacy database compute limits\n• Offline storage sync bounds\n• Mobile touch gestures ongoing', textColor: '#7f1d1d', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 100, y: 360, width: 390, height: 200, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'OPPORTUNITIES (External)\n\n• Multi-cloud storage federation\n• Smart panel IFP integration\n• Automated grade evaluations\n• Inter-school competitions', textColor: '#0369a1', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 510, y: 360, width: 390, height: 200, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'THREATS (External)\n\n• Network latency in remote labs\n• Google API quota rate limits\n• Security & credential breaches', textColor: '#78350f', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 350, y: 45, width: 400, height: 40, text: 'Strategic SWOT Analysis Matrix', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-swimlane-workflow',
        title: 'Swimlane Process Flow (MS Visio)',
        category: 'MS Office & SmartArt',
        description: 'Cross-functional swimlanes showing handoffs between Instructor, Students, and System.',
        icon: <Layers className="w-6 h-6" />,
        previewColors: ['#4f46e5', '#0284c7', '#059669'],
        data: {
            title: 'Cross-Functional Swimlane Workflow',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 30, y: 130, width: 150, height: 100, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Lab Instructor\n(Curriculum)', textColor: '#3730a3', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 210, y: 145, width: 220, height: 70, color: '#4f46e5', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '1. Create Lab Exercise\n& Whiteboard Template', textColor: '#3730a3', fontSize: 12 },
                
                // Handoff to student group
                { id: uuid(), type: 'arrow', x: 430, y: 180, width: 40, height: 120, color: '#4f46e5', strokeWidth: 2.5 },

                { id: uuid(), type: 'rectangle', x: 30, y: 250, width: 150, height: 100, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Student Group\n(Execution)', textColor: '#0369a1', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 470, y: 265, width: 220, height: 70, color: '#0284c7', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '2. Perform Experiment\n& Record Telemetry', textColor: '#0369a1', fontSize: 12 },
                
                // Handoff to auto-evaluator
                { id: uuid(), type: 'arrow', x: 690, y: 300, width: 40, height: 120, color: '#0284c7', strokeWidth: 2.5 },

                { id: uuid(), type: 'rectangle', x: 30, y: 370, width: 150, height: 100, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Auto-Evaluator\n& Storage', textColor: '#065f46', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 730, y: 385, width: 220, height: 70, color: '#059669', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '3. Verify Code / Output\n& Generate Grade PDF', textColor: '#065f46', fontSize: 12 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 45, width: 440, height: 40, text: 'Cross-Functional Swimlane Workflow', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-chevron-process',
        title: '5-Stage Chevron Process (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Standard 5-stage sequential arrow progression flow (Initiate → Analyze → Design → Validate → Deploy) with deliverables.',
        icon: <ArrowRight className="w-6 h-6" />,
        previewColors: ['#0284c7', '#2563eb', '#6366f1', '#7c3aed', '#059669'],
        data: {
            title: 'Sequential 5-Stage Process Flow',
            background: { pattern: 'grid', color: '#fcfcfd' },
            shapes: [
                { id: uuid(), type: 'rounded_rect', x: 20, y: 140, width: 180, height: 75, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: '1. INITIATION\nScope & Goals', textColor: '#0369a1', fontSize: 13 },
                { id: uuid(), type: 'arrow', x: 200, y: 177, width: 15, height: 0, color: '#0284c7', strokeWidth: 3 },
                { id: uuid(), type: 'rounded_rect', x: 215, y: 140, width: 180, height: 75, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: '2. ANALYSIS\nData & Needs', textColor: '#1e40af', fontSize: 13 },
                { id: uuid(), type: 'arrow', x: 395, y: 177, width: 15, height: 0, color: '#2563eb', strokeWidth: 3 },
                { id: uuid(), type: 'rounded_rect', x: 410, y: 140, width: 180, height: 75, color: '#6366f1', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: '3. DESIGN\nArchitecture & UI', textColor: '#312e81', fontSize: 13 },
                { id: uuid(), type: 'arrow', x: 590, y: 177, width: 15, height: 0, color: '#6366f1', strokeWidth: 3 },
                { id: uuid(), type: 'rounded_rect', x: 605, y: 140, width: 180, height: 75, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: '4. VALIDATE\nTesting & Pilots', textColor: '#5b21b6', fontSize: 13 },
                { id: uuid(), type: 'arrow', x: 785, y: 177, width: 15, height: 0, color: '#7c3aed', strokeWidth: 3 },
                { id: uuid(), type: 'rounded_rect', x: 800, y: 140, width: 180, height: 75, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: '5. DEPLOY\nRelease & Scale', textColor: '#047857', fontSize: 13 },

                { id: uuid(), type: 'rectangle', x: 20, y: 235, width: 180, height: 170, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Stakeholder kickoff\n• Success metrics\n• Budget approval\n• Resource plan', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 215, y: 235, width: 180, height: 170, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• User interviews\n• Tech constraints\n• Legacy DB audit\n• Risk analysis', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 410, y: 235, width: 180, height: 170, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Schema models\n• Component library\n• API contracts\n• Wireframes', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 605, y: 235, width: 180, height: 170, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Unit & E2E tests\n• Load benchmarking\n• Security audit\n• User sign-off', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 800, y: 235, width: 180, height: 170, color: '#cbd5e1', fillColor: '#ffffff', strokeWidth: 1.5, rotation: 0, text: '• Production rollout\n• Live monitoring\n• SLA governance\n• Knowledge base', textColor: '#334155', fontSize: 12 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 45, width: 440, height: 40, text: 'Sequential 5-Stage Process Flow', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-radial-cluster',
        title: 'Radial Cluster Matrix (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Central organizational nucleus branching outward to 4 key satellite capability pillars.',
        icon: <Network className="w-6 h-6" />,
        previewColors: ['#4f46e5', '#0284c7', '#16a34a', '#d97706'],
        data: {
            title: 'Radial Capability Cluster',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'circle', x: 400, y: 270, width: 190, height: 190, color: '#1e293b', fillColor: '#f1f5f9', strokeWidth: 3, rotation: 0, text: 'CORE PLATFORM\nLab Management\n& AI Suite', textColor: '#0f172a', fontSize: 14 },
                
                // Connecting lines to satellite pods
                { id: uuid(), type: 'arrow', x: 495, y: 270, width: 0, height: -100, color: '#0284c7', strokeWidth: 2.5 },
                { id: uuid(), type: 'arrow', x: 590, y: 365, width: 90, height: 0, color: '#d97706', strokeWidth: 2.5 },
                { id: uuid(), type: 'arrow', x: 495, y: 460, width: 0, height: 70, color: '#16a34a', strokeWidth: 2.5 },
                { id: uuid(), type: 'arrow', x: 400, y: 365, width: -90, height: 0, color: '#7c3aed', strokeWidth: 2.5 },

                { id: uuid(), type: 'rounded_rect', x: 395, y: 90, width: 200, height: 80, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: '1. CURRICULUM\nSyllabus & Blueprints', textColor: '#0369a1', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 395, y: 530, width: 200, height: 80, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: '3. ASSESSMENTS\nRubrics & Grade Sync', textColor: '#166534', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 110, y: 325, width: 200, height: 80, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: '4. CLOUD STORAGE\n5TB Drive & OneDrive', textColor: '#5b21b6', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 680, y: 325, width: 200, height: 80, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: '2. WHITEBOARD\nRealtime IFP Tools', textColor: '#92400e', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 30, width: 440, height: 40, text: 'Radial Capability Cluster', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-interlocking-gears',
        title: 'Interlocking Systems Triad (MS Visio)',
        category: 'MS Office & SmartArt',
        description: 'Tri-system alignment showing the continuous synergy of People, Process, and Technology engines.',
        icon: <Boxes className="w-6 h-6" />,
        previewColors: ['#2563eb', '#059669', '#d97706'],
        data: {
            title: 'Tri-System Operational Engine',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'circle', x: 250, y: 140, width: 230, height: 230, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 3, rotation: 0, text: 'ENGINE 1\nPEOPLE & CULTURE\n\n• Trained Faculty\n• Student Agility\n• Continuous Upskilling', textColor: '#1e40af', fontSize: 13 },
                { id: uuid(), type: 'circle', x: 510, y: 140, width: 230, height: 230, color: '#059669', fillColor: '#d1fae5', strokeWidth: 3, rotation: 0, text: 'ENGINE 2\nPROCESS & RIGOR\n\n• Standard SOPs\n• Quality Gates\n• Automated Rubrics', textColor: '#047857', fontSize: 13 },
                { id: uuid(), type: 'circle', x: 380, y: 340, width: 230, height: 230, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 3, rotation: 0, text: 'ENGINE 3\nPLATFORM & AI\n\n• Cloud Sockets\n• Smart IFP Tools\n• Real-Time Sync', textColor: '#92400e', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 420, y: 275, width: 150, height: 45, color: '#1e293b', fillColor: '#ffffff', strokeWidth: 2, rotation: 0, text: 'SYNCHRONIZED', textColor: '#0f172a', fontSize: 12 },
            ],
            texts: [
                { id: uuid(), x: 320, y: 45, width: 440, height: 40, text: 'Tri-System Operational Engine', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-concentric-target',
        title: 'Concentric Target Rings (MS Office)',
        category: 'MS Office & SmartArt',
        description: '3-tiered bullseye model: Outer Macro Ecosystem → Mid Program Strategy → Inner Bullseye Target.',
        icon: <Target className="w-6 h-6" />,
        previewColors: ['#93c5fd', '#3b82f6', '#1d4ed8'],
        data: {
            title: 'Strategic Target & Bullseye Model',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'circle', x: 230, y: 100, width: 540, height: 540, color: '#93c5fd', fillColor: '#eff6ff', strokeWidth: 2, rotation: 0, text: 'OUTER TIER: MACRO ECOSYSTEM\nRegulatory Standards (CBSE / State Boards), Cloud Partners & Community Engagement', textColor: '#1e40af', fontSize: 13 },
                { id: uuid(), type: 'circle', x: 315, y: 185, width: 370, height: 370, color: '#3b82f6', fillColor: '#dbeafe', strokeWidth: 2.5, rotation: 0, text: 'MIDDLE TIER: PROGRAM STRATEGY\nStandardized Lab Curriculum, Rubrics & Real-Time Telemetry', textColor: '#1d4ed8', fontSize: 13 },
                { id: uuid(), type: 'circle', x: 400, y: 270, width: 200, height: 200, color: '#1d4ed8', fillColor: '#1e40af', strokeWidth: 3, rotation: 0, text: 'BULLSEYE\n100% Student\nMastery & Placement', textColor: '#ffffff', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 310, y: 35, width: 460, height: 40, text: 'Strategic Target & Bullseye Model', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-ishikawa-fishbone',
        title: 'Ishikawa Fishbone Diagram (MS Visio)',
        category: 'MS Office & SmartArt',
        description: 'Classic Cause-and-Effect root cause analysis mapping People, Methods, Machines, and Materials to a problem.',
        icon: <GitFork className="w-6 h-6" />,
        previewColors: ['#dc2626', '#4338ca', '#0284c7', '#059669'],
        data: {
            title: 'Ishikawa Cause & Effect Analysis',
            background: { pattern: 'grid', color: '#fcfcfd' },
            shapes: [
                { id: uuid(), type: 'rounded_rect', x: 800, y: 270, width: 170, height: 100, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2.5, rotation: 0, text: 'PROBLEM:\nLab Session\nLatency / Drop', textColor: '#991b1b', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 40, y: 315, width: 760, height: 10, color: '#334155', fillColor: '#334155', strokeWidth: 1, rotation: 0, text: '' },
                
                // Rib arrows pointing to central spine
                { id: uuid(), type: 'arrow', x: 195, y: 220, width: 85, height: 95, color: '#4338ca', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 575, y: 220, width: 85, height: 95, color: '#0284c7', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 195, y: 430, width: 85, height: -105, color: '#059669', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 575, y: 430, width: 85, height: -105, color: '#d97706', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 740, y: 320, width: 60, height: 0, color: '#dc2626', strokeWidth: 3 },
                
                { id: uuid(), type: 'rounded_rect', x: 80, y: 140, width: 230, height: 80, color: '#4338ca', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: '1. PEOPLE (Faculty/Students)\n• Inadequate training\n• Missing credentials', textColor: '#312e81', fontSize: 12 },
                { id: uuid(), type: 'rounded_rect', x: 460, y: 140, width: 230, height: 80, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: '2. METHODS (Curriculum)\n• Outdated lab manuals\n• Unstructured timing', textColor: '#0369a1', fontSize: 12 },
                { id: uuid(), type: 'rounded_rect', x: 80, y: 430, width: 230, height: 80, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: '3. MACHINES (Hardware)\n• High RAM utilization\n• Legacy OS builds', textColor: '#047857', fontSize: 12 },
                { id: uuid(), type: 'rounded_rect', x: 460, y: 430, width: 230, height: 80, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: '4. ENVIRONMENT (Network)\n• Wi-Fi packet drops\n• Bandwidth congestion', textColor: '#92400e', fontSize: 12 },
            ],
            texts: [
                { id: uuid(), x: 310, y: 40, width: 460, height: 40, text: 'Ishikawa Cause & Effect Analysis', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-priority-matrix',
        title: 'Action Priority Matrix (MS Excel / PPT)',
        category: 'MS Office & SmartArt',
        description: '2x2 Impact vs Effort prioritization grid categorizing Quick Wins, Major Projects, Fill-ins, and Thankless Tasks.',
        icon: <Grid className="w-6 h-6" />,
        previewColors: ['#16a34a', '#2563eb', '#ca8a04', '#dc2626'],
        data: {
            title: 'Action Priority Matrix (Impact vs Effort)',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 120, y: 140, width: 390, height: 210, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'QUICK WINS (High Impact, Low Effort)\n\n• Automated attendance QR code\n• 1-Click Excel report export\n• Whiteboard timer widget\n• Serial ID plan deep linking', textColor: '#14532d', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 530, y: 140, width: 390, height: 210, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'MAJOR PROJECTS (High Impact, High Effort)\n\n• Socratic AI Copilot curriculum\n• Multi-cloud storage federation\n• Smart panel IFPD presentation mode\n• End-to-end exam blueprint matrix', textColor: '#1e40af', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 120, y: 370, width: 390, height: 210, color: '#ca8a04', fillColor: '#fef9c3', strokeWidth: 2, rotation: 0, text: 'FILL-INS (Low Impact, Low Effort)\n\n• Color swatch updates\n• Card badge hover effects\n• Minor typo adjustments\n• Tooltip styling polish', textColor: '#713f12', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 530, y: 370, width: 390, height: 210, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'THANKLESS TASKS (Low Impact, High Effort)\n\n• Legacy database sync migrations\n• Manual CSV reformatting\n• Deprecated library wrappers\n• Redundant telemetry logging', textColor: '#7f1d1d', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 40, width: 440, height: 40, text: 'Action Priority Matrix (Impact vs Effort)', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-bcg-matrix',
        title: 'BCG Growth-Share Matrix (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Classic 2x2 portfolio matrix featuring Stars, Question Marks, Cash Cows, and Dogs.',
        icon: <TrendingUp className="w-6 h-6" />,
        previewColors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
        data: {
            title: 'BCG Portfolio Growth-Share Matrix',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rounded_rect', x: 120, y: 140, width: 390, height: 210, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: '★ STARS (High Growth, High Share)\n\n• Market leaders in fast-growing lab sectors\n• High investment required for expansion\n• Future primary earnings engines', textColor: '#1e40af', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 530, y: 140, width: 390, height: 210, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: '? QUESTION MARKS (High Growth, Low Share)\n\n• High cash demands with uncertain return\n• Requires targeted focus or divestment\n• Potential future Stars or Dogs', textColor: '#5b21b6', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 120, y: 370, width: 390, height: 210, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: '$ CASH COWS (Low Growth, High Share)\n\n• Established foundation cash generators\n• Low investment needed to maintain\n• Funds R&D and Stars expansion', textColor: '#047857', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 530, y: 370, width: 390, height: 210, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: '✕ DOGS (Low Growth, Low Share)\n\n• Low profitability / stagnant growth\n• Candidates for liquidation or pivot\n• Minimal resource allocation', textColor: '#7f1d1d', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 40, width: 440, height: 40, text: 'BCG Portfolio Growth-Share Matrix', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-strategy-map',
        title: 'Strategy Map / Balanced Scorecard (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Multi-tiered cause-and-effect strategy map linking Financial, Customer, Process, and Learning & Growth.',
        icon: <Target className="w-6 h-6" />,
        previewColors: ['#0284c7', '#2563eb', '#16a34a', '#d97706'],
        data: {
            title: 'Kaplan & Norton Balanced Scorecard Strategy Map',
            background: { pattern: 'grid', color: '#fcfcfd' },
            shapes: [
                // Tier 1: Financial
                { id: uuid(), type: 'rounded_rect', x: 100, y: 120, width: 380, height: 65, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'FINANCIAL: Revenue Diversification\nGrants & Enterprise Lab Licensing', textColor: '#0369a1', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 520, y: 120, width: 380, height: 65, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'FINANCIAL: Cost Optimization\nAutomated Hardware & Cloud Efficiency', textColor: '#0369a1', fontSize: 13 },

                // Upward Causal Arrows from Customer to Financial
                { id: uuid(), type: 'arrow', x: 290, y: 235, width: 0, height: -50, color: '#0284c7', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 710, y: 235, width: 0, height: -50, color: '#0284c7', strokeWidth: 2 },

                // Tier 2: Customer / Student
                { id: uuid(), type: 'rounded_rect', x: 100, y: 235, width: 380, height: 65, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'CUSTOMER: Student Engagement & Mastery\nInteractive IFP & AI Copilot Feedback', textColor: '#1e40af', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 520, y: 235, width: 380, height: 65, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'CUSTOMER: Institutional Excellence\nAccreditation Compliance & Fast Gradings', textColor: '#1e40af', fontSize: 13 },

                // Upward Causal Arrows from Internal to Customer
                { id: uuid(), type: 'arrow', x: 290, y: 350, width: 0, height: -50, color: '#2563eb', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 710, y: 350, width: 0, height: -50, color: '#2563eb', strokeWidth: 2 },

                // Tier 3: Internal Processes
                { id: uuid(), type: 'rounded_rect', x: 100, y: 350, width: 380, height: 65, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'INTERNAL: Standard Lab SOP Protocols\nRubric Digitalization & Equipment Telemetry', textColor: '#166534', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 520, y: 350, width: 380, height: 65, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'INTERNAL: Real-time Multi-user Collaboration\nLow-latency WebSocket Socket.io Mesh', textColor: '#166534', fontSize: 13 },

                // Upward Causal Arrows from Learning to Internal
                { id: uuid(), type: 'arrow', x: 290, y: 465, width: 0, height: -50, color: '#16a34a', strokeWidth: 2 },
                { id: uuid(), type: 'arrow', x: 710, y: 465, width: 0, height: -50, color: '#16a34a', strokeWidth: 2 },

                // Tier 4: Learning & Growth
                { id: uuid(), type: 'rounded_rect', x: 100, y: 465, width: 380, height: 65, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'LEARNING: Faculty Upskilling & Training\nModern Digital Classroom Pedagogies', textColor: '#92400e', fontSize: 13 },
                { id: uuid(), type: 'rounded_rect', x: 520, y: 465, width: 380, height: 65, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'LEARNING: Continuous Innovation Culture\nAI Experimentation & Rapid Prototyping', textColor: '#92400e', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 300, y: 40, width: 500, height: 40, text: 'Balanced Scorecard Strategy Map', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-value-chain',
        title: "Porter's Value Chain Model (MS Visio)",
        category: 'MS Office & SmartArt',
        description: 'Industry-standard Value Chain dividing Primary Activities and Support Activities creating competitive Margin.',
        icon: <Boxes className="w-6 h-6" />,
        previewColors: ['#0284c7', '#2563eb', '#16a34a', '#ca8a04'],
        data: {
            title: "Porter's Value Chain Model",
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                // Support Activities (Top Layer)
                { id: uuid(), type: 'rectangle', x: 40, y: 120, width: 750, height: 40, color: '#94a3b8', fillColor: '#f8fafc', strokeWidth: 1.5, rotation: 0, text: 'FIRM INFRASTRUCTURE (Institutional Leadership, Governance & Compliance)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 40, y: 165, width: 750, height: 40, color: '#94a3b8', fillColor: '#f8fafc', strokeWidth: 1.5, rotation: 0, text: 'HUMAN RESOURCE MANAGEMENT (Faculty Hiring, TA Allocation, Training)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 40, y: 210, width: 750, height: 40, color: '#94a3b8', fillColor: '#f8fafc', strokeWidth: 1.5, rotation: 0, text: 'TECHNOLOGY DEVELOPMENT (Interactive Canvas, WebSocket Sync, AI Engine)', textColor: '#334155', fontSize: 12 },
                { id: uuid(), type: 'rectangle', x: 40, y: 255, width: 750, height: 40, color: '#94a3b8', fillColor: '#f8fafc', strokeWidth: 1.5, rotation: 0, text: 'PROCUREMENT (Hardware IFP Panels, Cloud Storage Quotas & Sensor Kits)', textColor: '#334155', fontSize: 12 },

                // Primary Activities (Bottom Horizontal Sequence)
                { id: uuid(), type: 'rounded_rect', x: 40, y: 315, width: 140, height: 170, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'INBOUND\nLOGISTICS\n\n• Syllabus\n• Hardware kits\n• Student roster', textColor: '#0369a1', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 180, y: 400, width: 12, height: 0, color: '#0284c7', strokeWidth: 2.5 },
                
                { id: uuid(), type: 'rounded_rect', x: 192, y: 315, width: 140, height: 170, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'OPERATIONS\n\n• Live Experiments\n• Code Execution\n• Realtime Logs', textColor: '#1e40af', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 332, y: 400, width: 12, height: 0, color: '#2563eb', strokeWidth: 2.5 },

                { id: uuid(), type: 'rounded_rect', x: 344, y: 315, width: 140, height: 170, color: '#6366f1', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'OUTBOUND\nLOGISTICS\n\n• Lab Submissions\n• Gradebook Export\n• PDF Reports', textColor: '#312e81', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 484, y: 400, width: 12, height: 0, color: '#6366f1', strokeWidth: 2.5 },

                { id: uuid(), type: 'rounded_rect', x: 496, y: 315, width: 140, height: 170, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'MARKETING\n& ENROLL\n\n• Lab Portfolios\n• Student Badges\n• Showcase Demos', textColor: '#5b21b6', fontSize: 12 },
                { id: uuid(), type: 'arrow', x: 636, y: 400, width: 12, height: 0, color: '#7c3aed', strokeWidth: 2.5 },

                { id: uuid(), type: 'rounded_rect', x: 648, y: 315, width: 142, height: 170, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'SERVICE\n& SUPPORT\n\n• Doubt Resolution\n• TA Mentorship\n• Device Maintenance', textColor: '#047857', fontSize: 12 },

                // Margin Triangle / Chevron wedge on right
                { id: uuid(), type: 'rounded_rect', x: 805, y: 120, width: 155, height: 365, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2.5, rotation: 0, text: 'VALUE MARGIN\n\n\n• Higher Placement\n• Better Research\n• Accreditation\n• Lower Lab Costs', textColor: '#92400e', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 320, y: 40, width: 440, height: 40, text: "Porter's Value Chain Model", fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'ms-ansoff-matrix',
        title: 'Ansoff Growth Matrix (MS Office)',
        category: 'MS Office & SmartArt',
        description: 'Strategic market expansion framework: Market Penetration, Product Development, Market Development, and Diversification.',
        icon: <LayoutGrid className="w-6 h-6" />,
        previewColors: ['#0284c7', '#059669', '#d97706', '#dc2626'],
        data: {
            title: 'Ansoff Market Expansion Grid',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 120, y: 140, width: 390, height: 210, color: '#0284c7', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'MARKET PENETRATION\n(Existing Products × Existing Markets)\n\n• Increase lab hours & IFP panel usage\n• Deepen student course engagement\n• Lowest risk strategy', textColor: '#0369a1', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 530, y: 140, width: 390, height: 210, color: '#059669', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'PRODUCT DEVELOPMENT\n(New Products × Existing Markets)\n\n• Introduce AI Copilot automated grading\n• Add 3D molecular/circuit simulators\n• Moderate risk strategy', textColor: '#047857', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 120, y: 370, width: 390, height: 210, color: '#d97706', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'MARKET DEVELOPMENT\n(Existing Products × New Markets)\n\n• License LabRecManager to sister colleges\n• Introduce distance learning IFP streaming\n• Moderate risk strategy', textColor: '#92400e', fontSize: 13 },
                { id: uuid(), type: 'rectangle', x: 530, y: 370, width: 390, height: 210, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'DIVERSIFICATION\n(New Products × New Markets)\n\n• Corporate enterprise training simulations\n• Commercial hardware IoT integration\n• Highest risk & return potential', textColor: '#7f1d1d', fontSize: 13 },
            ],
            texts: [
                { id: uuid(), x: 330, y: 40, width: 440, height: 40, text: 'Ansoff Market Expansion Grid', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    }
];

const categories = ['All', 'MS Office & SmartArt', 'Org Charts', 'CS Fundamentals', 'AI & ML', 'General'];

export default function TemplateGallery({ 
    isOpen, 
    onClose, 
    onApplyTemplate, 
    canvasWidth = 1920, 
    canvasHeight = 1080 
}) {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = activeTab === 'All' || template.category === activeTab;
        const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              template.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleApply = (template) => {
        // Deep clone the template data to avoid reference issues
        const templateData = JSON.parse(JSON.stringify(template.data));
        
        // Ensure new IDs for all objects so they don't clash
        if (templateData.shapes) {
            templateData.shapes = templateData.shapes.map(s => ({ ...s, id: uuid() }));
        }
        if (templateData.texts) {
            templateData.texts = templateData.texts.map(t => ({ ...t, id: uuid() }));
        }
        
        onApplyTemplate(templateData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="max-w-6xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Template Gallery</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative hidden sm:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs & Search Mobile */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="relative sm:hidden">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveTab(category)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    activeTab === category 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                    {filteredTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTemplates.map((template) => (
                                <div 
                                    key={template.id}
                                    className="group flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                >
                                    {/* Thumbnail Preview Area */}
                                    <div className="h-44 bg-slate-100 dark:bg-slate-950 relative flex items-center justify-center p-3 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
                                        <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/50" />
                                        
                                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                                            <TemplateMiniPreview data={template.data} />
                                        </div>
                                        
                                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm border border-slate-200/60 dark:border-slate-700/60 z-20">
                                            {template.icon}
                                            {template.category}
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                                            {template.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
                                            {template.description}
                                        </p>
                                        
                                        <button 
                                            onClick={() => handleApply(template)}
                                            className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-blue-600 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 group/btn"
                                        >
                                            Use Template
                                            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">No templates found</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                                We couldn't find any templates matching "{searchQuery}" in this category.
                            </p>
                            <button 
                                onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
                                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
