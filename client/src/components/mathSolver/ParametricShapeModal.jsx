'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, Compass, Triangle, Hexagon, TrendingUp, Type, 
    Check, Sparkles, Sliders, RefreshCw, Layers, Plus
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ParametricShapeModal({
    isOpen,
    onClose,
    onInsertShapeToCanvas
}) {
    const [activeTab, setActiveTab] = useState('triangle'); // 'triangle' | 'polygon' | 'curve' | 'points' | 'textPath'

    // Triangle parameters
    const [triType, setTriType] = useState('SAS');
    const [sideA, setSideA] = useState(120);
    const [sideB, setSideB] = useState(140);
    const [sideC, setSideC] = useState(100);
    const [angleA, setAngleA] = useState(60);

    // Regular polygon parameters
    const [polySides, setPolySides] = useState(6);
    const [polyRadius, setPolyRadius] = useState(80);
    const [polyRotation, setPolyRotation] = useState(-90);

    // Function curve parameters
    const [expression, setExpression] = useState('sin(x)*40');
    const [xMin, setXMin] = useState(-6.28);
    const [xMax, setXMax] = useState(6.28);
    const [curveScaleX, setCurveScaleX] = useState(20);
    const [curveScaleY, setCurveScaleY] = useState(1);

    // Corner points parameters
    const [pointsRaw, setPointsRaw] = useState('0,0\n140,20\n100,120\n-20,90');

    // Text on path
    const [pathText, setPathText] = useState('Mathematical Curve Typography');
    const [pathShape, setPathShape] = useState('wave'); // 'wave' | 'arc' | 'circle'

    // Styling
    const [strokeColor, setStrokeColor] = useState('#38bdf8');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [fillColor, setFillColor] = useState('rgba(56, 189, 248, 0.15)');

    // Result & Preview
    const [previewData, setPreviewData] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Calculate geometry
    const calculateGeometry = async () => {
        setIsCalculating(true);
        try {
            let payload = { shapeType: activeTab };

            if (activeTab === 'triangle') {
                payload = {
                    shapeType: 'triangle',
                    type: triType,
                    sideA: Number(sideA),
                    sideB: Number(sideB),
                    sideC: Number(sideC),
                    angleA: Number(angleA),
                    originX: 180,
                    originY: 180
                };
            } else if (activeTab === 'polygon') {
                payload = {
                    shapeType: 'regular_polygon',
                    sides: Number(polySides),
                    radius: Number(polyRadius),
                    rotationDeg: Number(polyRotation),
                    centerX: 180,
                    centerY: 180
                };
            } else if (activeTab === 'curve') {
                payload = {
                    shapeType: 'function_curve',
                    expression,
                    xMin: Number(xMin),
                    xMax: Number(xMax),
                    scaleX: Number(curveScaleX),
                    scaleY: Number(curveScaleY),
                    centerX: 180,
                    centerY: 180
                };
            } else if (activeTab === 'points') {
                // Parse points locally
                const lines = pointsRaw.trim().split('\n');
                const parsedPoints = lines.map((l) => {
                    const parts = l.split(',').map((p) => Number(p.trim()));
                    return { x: 180 + (parts[0] || 0), y: 180 + (parts[1] || 0) };
                }).filter((p) => !isNaN(p.x) && !isNaN(p.y));

                const svgPath = parsedPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
                setPreviewData({ points: parsedPoints, svgPath });
                setIsCalculating(false);
                return;
            } else if (activeTab === 'textPath') {
                // Generate curve first
                let curvePayload = {
                    shapeType: 'function_curve',
                    expression: pathShape === 'wave' ? 'sin(x)*30' : pathShape === 'arc' ? '-0.02*x^2 + 50' : 'x',
                    xMin: -10,
                    xMax: 10,
                    scaleX: 16,
                    scaleY: 1,
                    centerX: 180,
                    centerY: 180
                };
                const curveRes = await api.post('/whiteboard/math-solver/geometry', curvePayload);
                const curvePoints = curveRes.data?.data?.points || [];

                const textRes = await api.post('/whiteboard/math-solver/geometry', {
                    shapeType: 'text_on_path',
                    text: pathText,
                    curvePoints,
                    spacing: 16
                });

                setPreviewData({
                    svgPath: curveRes.data?.data?.svgPath,
                    textChars: textRes.data?.data || []
                });
                setIsCalculating(false);
                return;
            }

            const res = await api.post('/whiteboard/math-solver/geometry', payload);
            if (res.data?.success) {
                setPreviewData(res.data.data);
            }
        } catch (err) {
            console.error('Geometry calculation error:', err);
            toast.error(err.response?.data?.message || 'Error computing geometry');
        } finally {
            setIsCalculating(false);
        }
    };

    // Auto-calculate on tab or key param change
    useEffect(() => {
        if (isOpen) {
            calculateGeometry();
        }
    }, [isOpen, activeTab, triType, sideA, sideB, sideC, angleA, polySides, polyRadius, polyRotation, expression, pathShape]);

    const handleInsert = () => {
        if (!previewData?.svgPath && !previewData?.textChars) {
            toast.error('No shape to insert');
            return;
        }

        onInsertShapeToCanvas?.({
            category: activeTab,
            svgPath: previewData.svgPath,
            points: previewData.points || [],
            labels: previewData.labels || [],
            textChars: previewData.textChars || [],
            strokeColor,
            strokeWidth,
            fillColor,
            metadata: {
                tab: activeTab,
                details: previewData
            }
        });

        toast.success('Parametric shape inserted onto canvas!');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                            <Compass className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Parametric Geometry Creator
                            </h2>
                            <p className="text-xs text-slate-400">
                                Specify exact shapes via side lengths, angles, equations, or corner coordinates
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-3 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto">
                    {[
                        { id: 'triangle', label: 'Triangles & Angles', icon: Triangle },
                        { id: 'polygon', label: 'Regular Polygon', icon: Hexagon },
                        { id: 'curve', label: 'Function Curve y=f(x)', icon: TrendingUp },
                        { id: 'points', label: 'Corner Coordinates', icon: Compass },
                        { id: 'textPath', label: 'Text Along Curve', icon: Type }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold transition border-b-2 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Body: Inputs + Live Preview */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controls Column */}
                    <div className="space-y-4">
                        {/* Tab: Triangle */}
                        {activeTab === 'triangle' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Construction Method</label>
                                    <select
                                        value={triType}
                                        onChange={(e) => setTriType(e.target.value)}
                                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                                    >
                                        <option value="SAS">SAS (Side A, Included Angle, Side B)</option>
                                        <option value="SSS">SSS (Three Side Lengths A, B, C)</option>
                                        <option value="ASA">ASA (Angle A, Base Side, Angle B)</option>
                                        <option value="RIGHT">Right-Angled (Base, Height)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400">Side A (px)</label>
                                        <input
                                            type="number"
                                            value={sideA}
                                            onChange={(e) => setSideA(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Side B (px)</label>
                                        <input
                                            type="number"
                                            value={sideB}
                                            onChange={(e) => setSideB(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                </div>
                                {triType === 'SAS' && (
                                    <div>
                                        <label className="text-xs text-slate-400">Included Angle A (°)</label>
                                        <input
                                            type="number"
                                            value={angleA}
                                            onChange={(e) => setAngleA(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                )}
                                {triType === 'SSS' && (
                                    <div>
                                        <label className="text-xs text-slate-400">Side C (px)</label>
                                        <input
                                            type="number"
                                            value={sideC}
                                            onChange={(e) => setSideC(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab: Regular Polygon */}
                        {activeTab === 'polygon' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Number of Sides ({polySides})</label>
                                    <input
                                        type="range"
                                        min="3"
                                        max="12"
                                        value={polySides}
                                        onChange={(e) => setPolySides(e.target.value)}
                                        className="w-full mt-1 accent-cyan-400"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>3 (Triangle)</span>
                                        <span>5 (Pentagon)</span>
                                        <span>6 (Hexagon)</span>
                                        <span>8 (Octagon)</span>
                                        <span>12</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Radius ({polyRadius} px)</label>
                                    <input
                                        type="range"
                                        min="30"
                                        max="160"
                                        value={polyRadius}
                                        onChange={(e) => setPolyRadius(e.target.value)}
                                        className="w-full mt-1 accent-cyan-400"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab: Function Curve */}
                        {activeTab === 'curve' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Function Expression y = f(x)</label>
                                    <input
                                        type="text"
                                        value={expression}
                                        onChange={(e) => setExpression(e.target.value)}
                                        placeholder="e.g. sin(x)*40 or 0.1*x^2 - 30"
                                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400">x Min</label>
                                        <input
                                            type="number"
                                            value={xMin}
                                            onChange={(e) => setXMin(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">x Max</label>
                                        <input
                                            type="number"
                                            value={xMax}
                                            onChange={(e) => setXMax(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Corner Coordinates */}
                        {activeTab === 'points' && (
                            <div className="space-y-3">
                                <label className="text-xs text-slate-400">Corner Points (dx, dy per line)</label>
                                <textarea
                                    value={pointsRaw}
                                    onChange={(e) => setPointsRaw(e.target.value)}
                                    rows={5}
                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300"
                                />
                            </div>
                        )}

                        {/* Tab: Text Along Curve */}
                        {activeTab === 'textPath' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Text to Follow Equation</label>
                                    <input
                                        type="text"
                                        value={pathText}
                                        onChange={(e) => setPathText(e.target.value)}
                                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Curve Trajectory</label>
                                    <select
                                        value={pathShape}
                                        onChange={(e) => setPathShape(e.target.value)}
                                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                                    >
                                        <option value="wave">Sinusoidal Wave (y = sin(x))</option>
                                        <option value="arc">Parabolic Arch (y = -ax²)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Stroke & Fill Styling */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Stroke Color</span>
                                <input
                                    type="color"
                                    value={strokeColor}
                                    onChange={(e) => setStrokeColor(e.target.value)}
                                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Fill Color</span>
                                <input
                                    type="color"
                                    value="#38bdf8"
                                    onChange={(e) => setFillColor(e.target.value + '26')}
                                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Live Preview Column */}
                    <div className="flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl border border-slate-800 p-4 relative min-h-[260px]">
                        <span className="absolute top-3 left-3 text-[10px] font-mono uppercase text-slate-500">
                            Live Vector Preview
                        </span>

                        <svg viewBox="0 0 360 360" className="w-full h-64 overflow-visible">
                            {/* Grid marks */}
                            <line x1="180" y1="20" x2="180" y2="340" stroke="#334155" strokeDasharray="3 3" />
                            <line x1="20" y1="180" x2="340" y2="180" stroke="#334155" strokeDasharray="3 3" />

                            {/* Main shape path */}
                            {previewData?.svgPath && (
                                <path
                                    d={previewData.svgPath}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    fill={activeTab === 'curve' ? 'none' : fillColor}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}

                            {/* Labels for triangle/polygon */}
                            {previewData?.labels?.map((lbl, idx) => (
                                <text
                                    key={idx}
                                    x={lbl.x}
                                    y={lbl.y}
                                    fill="#f8fafc"
                                    fontSize="12"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    {lbl.text}
                                </text>
                            ))}

                            {/* Placed characters for text along path */}
                            {previewData?.textChars?.map((tc, idx) => (
                                <text
                                    key={idx}
                                    x={tc.x}
                                    y={tc.y}
                                    transform={`rotate(${tc.rotation}, ${tc.x}, ${tc.y})`}
                                    fill={strokeColor}
                                    fontSize="15"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="font-caveat"
                                >
                                    {tc.char}
                                </text>
                            ))}
                        </svg>

                        {/* Calculated specs badge */}
                        {previewData?.area && (
                            <div className="mt-2 text-xs text-slate-400 font-mono flex gap-3">
                                <span>Area: <strong className="text-cyan-400">{previewData.area} px²</strong></span>
                                <span>Perimeter: <strong className="text-cyan-400">{previewData.perimeter} px</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-t border-slate-800">
                    <button
                        onClick={calculateGeometry}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} /> Recalculate
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleInsert}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" /> Insert to Whiteboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
