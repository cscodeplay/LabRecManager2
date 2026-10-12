'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, Compass, Triangle, Hexagon, TrendingUp, Type, 
    Check, Sparkles, Sliders, RefreshCw, Layers, Plus,
    PieChart, Orbit, Box, Circle, Disc
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ParametricShapeModal({
    isOpen,
    onClose,
    onInsertShapeToCanvas
}) {
    const [activeTab, setActiveTab] = useState('partial2d'); // 'partial2d' | 'vector3d' | 'solids3d' | 'triangle' | 'polygon' | 'curve' | 'points' | 'textPath'

    // 2D Partial shapes parameters
    const [partialType, setPartialType] = useState('sector'); // 'sector' | 'segment' | 'annulus_sector' | 'parabolic_arch'
    const [sectorRadius, setSectorRadius] = useState(120);
    const [sectorAngle, setSectorAngle] = useState(60);
    const [sectorStartAngle, setSectorStartAngle] = useState(0);
    const [annulusInnerR, setAnnulusInnerR] = useState(50);
    const [annulusOuterR, setAnnulusOuterR] = useState(110);
    const [annulusStartAngle, setAnnulusStartAngle] = useState(0);
    const [annulusEndAngle, setAnnulusEndAngle] = useState(90);
    const [archSpan, setArchSpan] = useState(180);
    const [archHeight, setArchHeight] = useState(100);

    // 3D Vectors parameters
    const [vectorAx, setVectorAx] = useState(3);
    const [vectorAy, setVectorAy] = useState(4);
    const [vectorAz, setVectorAz] = useState(0);
    const [vectorBx, setVectorBx] = useState(0);
    const [vectorBy, setVectorBy] = useState(2);
    const [vectorBz, setVectorBz] = useState(5);
    const [showCross, setShowCross] = useState(true);
    const [showAngle, setShowAngle] = useState(true);

    // 3D Solids parameters
    const [solidType, setSolidType] = useState('cylinder'); // 'cylinder' | 'cone' | 'sphere' | 'frustum' | 'hemisphere' | 'capsule'
    const [solidRadius, setSolidRadius] = useState(60);
    const [solidRadiusTop, setSolidRadiusTop] = useState(40);
    const [solidHeight, setSolidHeight] = useState(120);

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

            if (activeTab === 'partial2d') {
                if (partialType === 'sector') {
                    payload = {
                        shapeType: 'sector',
                        radius: Number(sectorRadius),
                        centralAngleDeg: Number(sectorAngle),
                        startAngleDeg: Number(sectorStartAngle),
                        originX: 180,
                        originY: 180
                    };
                } else if (partialType === 'segment') {
                    payload = {
                        shapeType: 'segment',
                        radius: Number(sectorRadius),
                        centralAngleDeg: Number(sectorAngle),
                        startAngleDeg: Number(sectorStartAngle),
                        originX: 180,
                        originY: 180
                    };
                } else if (partialType === 'annulus_sector') {
                    payload = {
                        shapeType: 'annulus_sector',
                        innerRadius: Number(annulusInnerR),
                        outerRadius: Number(annulusOuterR),
                        startAngleDeg: Number(annulusStartAngle),
                        endAngleDeg: Number(annulusEndAngle),
                        originX: 180,
                        originY: 180
                    };
                } else if (partialType === 'parabolic_arch') {
                    payload = {
                        shapeType: 'parabolic_arch',
                        spanWidth: Number(archSpan),
                        archHeight: Number(archHeight),
                        originX: 180,
                        originY: 180
                    };
                }
            } else if (activeTab === 'vector3d') {
                payload = {
                    shapeType: 'vectors_3d',
                    a: [Number(vectorAx), Number(vectorAy), Number(vectorAz)],
                    b: [Number(vectorBx), Number(vectorBy), Number(vectorBz)]
                };
            } else if (activeTab === 'solids3d') {
                payload = {
                    shapeType: 'solid_measurements',
                    solidType,
                    radius: Number(solidRadius),
                    r1: Number(solidRadius),
                    r2: Number(solidRadiusTop),
                    height: Number(solidHeight),
                    h: Number(solidHeight)
                };
            } else if (activeTab === 'triangle') {
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
    }, [
        isOpen, activeTab, partialType, sectorRadius, sectorAngle, sectorStartAngle,
        annulusInnerR, annulusOuterR, annulusStartAngle, annulusEndAngle, archSpan, archHeight,
        vectorAx, vectorAy, vectorAz, vectorBx, vectorBy, vectorBz, showCross, showAngle,
        solidType, solidRadius, solidRadiusTop, solidHeight,
        triType, sideA, sideB, sideC, angleA, polySides, polyRadius, polyRotation, expression, pathShape
    ]);

    const handleInsert = () => {
        if (activeTab === 'partial2d') {
            onInsertShapeToCanvas?.({
                type: partialType,
                radius: Number(sectorRadius),
                centralAngle: Number(sectorAngle),
                startAngle: Number(sectorStartAngle),
                endAngle: Number(sectorStartAngle) + Number(sectorAngle),
                innerRadius: Number(annulusInnerR),
                outerRadius: Number(annulusOuterR),
                spanWidth: Number(archSpan),
                archHeight: Number(archHeight),
                strokeColor,
                strokeWidth,
                fillColor,
                width: 320,
                height: 300,
                ...previewData
            });
            toast.success(`Inserted 2D ${partialType.replace('_', ' ')}!`, { icon: '📐' });
            onClose();
            return;
        }

        if (activeTab === 'vector3d') {
            onInsertShapeToCanvas?.({
                is3D: true,
                modelType: 'vector_space_3d',
                dimensions: {
                    ax: Number(vectorAx),
                    ay: Number(vectorAy),
                    az: Number(vectorAz),
                    bx: Number(vectorBx),
                    by: Number(vectorBy),
                    bz: Number(vectorBz),
                    showCrossProduct: showCross,
                    showAngle: showAngle
                },
                color: strokeColor,
                title: '3D Vector Space',
                width: 280,
                height: 280
            });
            toast.success('Inserted 3D Vector Space onto whiteboard!', { icon: '🪐' });
            onClose();
            return;
        }

        if (activeTab === 'solids3d') {
            onInsertShapeToCanvas?.({
                is3D: true,
                modelType: solidType,
                dimensions: {
                    radius: Number(solidRadius),
                    r1: Number(solidRadius),
                    r2: Number(solidRadiusTop),
                    height: Number(solidHeight)
                },
                color: strokeColor,
                title: `3D ${solidType}`,
                width: 260,
                height: 260
            });
            toast.success(`Inserted 3D ${solidType} onto whiteboard!`, { icon: '📦' });
            onClose();
            return;
        }

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
                        { id: 'partial2d', label: '2D Partial Shapes', icon: PieChart },
                        { id: 'vector3d', label: '3D Vector Space', icon: Orbit },
                        { id: 'solids3d', label: '3D Solid Shapes', icon: Box },
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
                        {/* Tab: 2D Partial Shapes */}
                        {activeTab === 'partial2d' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Shape Variant</label>
                                    <select
                                        value={partialType}
                                        onChange={(e) => setPartialType(e.target.value)}
                                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                                    >
                                        <option value="sector">Circle Sector (Radius & Central Angle θ)</option>
                                        <option value="segment">Circular Segment (Chord & Arc)</option>
                                        <option value="annulus_sector">Annulus Sector (Ring Wedge r to R)</option>
                                        <option value="parabolic_arch">Parabolic Arch (Span & Height)</option>
                                    </select>
                                </div>

                                {partialType === 'sector' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400">Radius (px)</label>
                                                <input
                                                    type="number"
                                                    value={sectorRadius}
                                                    onChange={(e) => setSectorRadius(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Central Angle θ (°)</label>
                                                <input
                                                    type="number"
                                                    value={sectorAngle}
                                                    onChange={(e) => setSectorAngle(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Start Angle (°)</label>
                                            <input
                                                type="number"
                                                value={sectorStartAngle}
                                                onChange={(e) => setSectorStartAngle(e.target.value)}
                                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                            />
                                        </div>
                                    </>
                                )}

                                {partialType === 'segment' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400">Radius (px)</label>
                                                <input
                                                    type="number"
                                                    value={sectorRadius}
                                                    onChange={(e) => setSectorRadius(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Central Angle θ (°)</label>
                                                <input
                                                    type="number"
                                                    value={sectorAngle}
                                                    onChange={(e) => setSectorAngle(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {partialType === 'annulus_sector' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400">Inner Radius r (px)</label>
                                                <input
                                                    type="number"
                                                    value={annulusInnerR}
                                                    onChange={(e) => setAnnulusInnerR(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Outer Radius R (px)</label>
                                                <input
                                                    type="number"
                                                    value={annulusOuterR}
                                                    onChange={(e) => setAnnulusOuterR(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400">Start Angle (°)</label>
                                                <input
                                                    type="number"
                                                    value={annulusStartAngle}
                                                    onChange={(e) => setAnnulusStartAngle(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">End Angle (°)</label>
                                                <input
                                                    type="number"
                                                    value={annulusEndAngle}
                                                    onChange={(e) => setAnnulusEndAngle(e.target.value)}
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {partialType === 'parabolic_arch' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-400">Span Width (px)</label>
                                            <input
                                                type="number"
                                                value={archSpan}
                                                onChange={(e) => setArchSpan(e.target.value)}
                                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Arch Height (px)</label>
                                            <input
                                                type="number"
                                                value={archHeight}
                                                onChange={(e) => setArchHeight(e.target.value)}
                                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab: 3D Vector Space */}
                        {activeTab === 'vector3d' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-cyan-400">Vector a = [ax, ay, az]</label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                        <input
                                            type="number"
                                            value={vectorAx}
                                            onChange={(e) => setVectorAx(e.target.value)}
                                            placeholder="ax"
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
                                        />
                                        <input
                                            type="number"
                                            value={vectorAy}
                                            onChange={(e) => setVectorAy(e.target.value)}
                                            placeholder="ay"
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
                                        />
                                        <input
                                            type="number"
                                            value={vectorAz}
                                            onChange={(e) => setVectorAz(e.target.value)}
                                            placeholder="az"
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-purple-400">Vector b = [bx, by, bz]</label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                        <input
                                            type="number"
                                            value={vectorBx}
                                            onChange={(e) => setVectorBx(e.target.value)}
                                            placeholder="bx"
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
                                        />
                                        <input
                                            type="number"
                                            value={vectorBy}
                                            onChange={(e) => setVectorBy(e.target.value)}
                                            placeholder="by"
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
                                        />
                                        <input
                                            type="number"
                                            value={vectorBz}
                                            onChange={(e) => setVectorBz(e.target.value)}
                                            placeholder="bz"
                                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-1">
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showCross}
                                            onChange={(e) => setShowCross(e.target.checked)}
                                            className="rounded border-slate-700 text-amber-500 focus:ring-0"
                                        />
                                        Show a × b Cross Product
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showAngle}
                                            onChange={(e) => setShowAngle(e.target.checked)}
                                            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                                        />
                                        Show Angle θ
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Tab: 3D Solids & Volumes */}
                        {activeTab === 'solids3d' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400">Solid Geometry Type</label>
                                    <select
                                        value={solidType}
                                        onChange={(e) => setSolidType(e.target.value)}
                                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                                    >
                                        <option value="cylinder">Cylinder (V = πr²h)</option>
                                        <option value="cone">Cone (V = ⅓πr²h)</option>
                                        <option value="sphere">Sphere (V = ⁴⁄₃πr³)</option>
                                        <option value="frustum">Frustum of Cone (r₁, r₂, h)</option>
                                        <option value="hemisphere">Hemisphere (V = ⅔πr³)</option>
                                        <option value="capsule">Capsule (Cylinder + 2 Hemispheres)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400">
                                            {solidType === 'frustum' ? 'Base Radius r₁ (px)' : 'Radius r (px)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={solidRadius}
                                            onChange={(e) => setSolidRadius(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                    {solidType !== 'sphere' && solidType !== 'hemisphere' && (
                                        <div>
                                            <label className="text-xs text-slate-400">Height h (px)</label>
                                            <input
                                                type="number"
                                                value={solidHeight}
                                                onChange={(e) => setSolidHeight(e.target.value)}
                                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                            />
                                        </div>
                                    )}
                                </div>

                                {solidType === 'frustum' && (
                                    <div>
                                        <label className="text-xs text-slate-400">Top Radius r₂ (px)</label>
                                        <input
                                            type="number"
                                            value={solidRadiusTop}
                                            onChange={(e) => setSolidRadiusTop(e.target.value)}
                                            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

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

                        {activeTab === 'vector3d' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <svg viewBox="0 0 360 280" className="w-full h-56">
                                    {/* 3D Coordinate Axes Orthogonal Projection */}
                                    <line x1="180" y1="180" x2="300" y2="180" stroke="#ef4444" strokeWidth="2.5" />
                                    <polygon points="300,180 292,176 292,184" fill="#ef4444" />
                                    <text x="306" y="184" fill="#ef4444" fontSize="12" fontWeight="bold">X (i^)</text>

                                    <line x1="180" y1="180" x2="180" y2="40" stroke="#22c55e" strokeWidth="2.5" />
                                    <polygon points="180,40 176,48 184,48" fill="#22c55e" />
                                    <text x="180" y="30" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">Y (j^)</text>

                                    <line x1="180" y1="180" x2="90" y2="250" stroke="#3b82f6" strokeWidth="2.5" />
                                    <polygon points="90,250 96,242 102,246" fill="#3b82f6" />
                                    <text x="76" y="260" fill="#3b82f6" fontSize="12" fontWeight="bold">Z (k^)</text>

                                    {/* Origin */}
                                    <circle cx="180" cy="180" r="4" fill="#f8fafc" />

                                    {/* Vector a: cyan arrow */}
                                    {(() => {
                                        const scale = 16;
                                        const pX = 180 + vectorAx * scale - vectorAz * scale * 0.7;
                                        const pY = 180 - vectorAy * scale + vectorAz * scale * 0.55;
                                        return (
                                            <g>
                                                <line x1="180" y1="180" x2={pX} y2={pY} stroke="#06b6d4" strokeWidth="3" />
                                                <circle cx={pX} cy={pY} r="4" fill="#06b6d4" />
                                                <text x={pX + 8} y={pY - 4} fill="#06b6d4" fontSize="12" fontWeight="bold">a</text>
                                            </g>
                                        );
                                    })()}

                                    {/* Vector b: purple arrow */}
                                    {(() => {
                                        const scale = 16;
                                        const pX = 180 + vectorBx * scale - vectorBz * scale * 0.7;
                                        const pY = 180 - vectorBy * scale + vectorBz * scale * 0.55;
                                        return (
                                            <g>
                                                <line x1="180" y1="180" x2={pX} y2={pY} stroke="#a855f7" strokeWidth="3" />
                                                <circle cx={pX} cy={pY} r="4" fill="#a855f7" />
                                                <text x={pX + 8} y={pY - 4} fill="#a855f7" fontSize="12" fontWeight="bold">b</text>
                                            </g>
                                        );
                                    })()}

                                    {/* Cross product a x b: amber arrow */}
                                    {showCross && previewData?.crossProduct && (() => {
                                        const [cxVal, cyVal, czVal] = previewData.crossProduct;
                                        const mag = previewData.magCross || 1;
                                        const normScale = Math.min(60, mag * 2.5);
                                        const pX = 180 + (cxVal / mag) * normScale - (czVal / mag) * normScale * 0.7;
                                        const pY = 180 - (cyVal / mag) * normScale + (czVal / mag) * normScale * 0.55;
                                        return (
                                            <g>
                                                <line x1="180" y1="180" x2={pX} y2={pY} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" />
                                                <circle cx={pX} cy={pY} r="4" fill="#f59e0b" />
                                                <text x={pX + 8} y={pY - 4} fill="#f59e0b" fontSize="11" fontWeight="bold">a × b</text>
                                            </g>
                                        );
                                    })()}
                                </svg>

                                {previewData?.dotProduct !== undefined && (
                                    <div className="mt-2 text-[11px] text-slate-300 font-mono grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 w-full">
                                        <span>|a| = <strong className="text-cyan-400">{previewData.magA}</strong></span>
                                        <span>|b| = <strong className="text-purple-400">{previewData.magB}</strong></span>
                                        <span>a · b = <strong className="text-emerald-400">{previewData.dotProduct}</strong></span>
                                        <span>Angle θ = <strong className="text-cyan-300">{previewData.angleDeg}°</strong></span>
                                        <span className="col-span-2 text-amber-400">
                                            a × b = [{previewData.crossProduct ? previewData.crossProduct.join(', ') : '0, 0, 0'}]
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'solids3d' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center w-full">
                                    <Box className="w-20 h-20 text-cyan-400 mb-2 animate-pulse" />
                                    <h4 className="text-sm font-bold text-slate-100 capitalize">3D {solidType.replace('_', ' ')}</h4>
                                    <p className="text-[11px] text-slate-400">Interactive 3D model with orbital camera & shaded surface</p>
                                </div>
                                {previewData?.volume !== undefined && (
                                    <div className="mt-3 text-[11px] text-slate-300 font-mono grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 w-full">
                                        <span>Volume V = <strong className="text-cyan-400">{previewData.volume} px³</strong></span>
                                        <span>Total Area A = <strong className="text-emerald-400">{previewData.surfaceArea} px²</strong></span>
                                        {previewData.lateralArea && (
                                            <span className="col-span-2 text-indigo-300">Lateral Area = {previewData.lateralArea} px²</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
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
                                {(previewData?.area || previewData?.arcLength) && (
                                    <div className="mt-2 text-xs text-slate-400 font-mono flex flex-wrap gap-3">
                                        {previewData?.area && (
                                            <span>Area: <strong className="text-cyan-400">{previewData.area} px²</strong></span>
                                        )}
                                        {previewData?.perimeter && (
                                            <span>Perimeter: <strong className="text-cyan-400">{previewData.perimeter} px</strong></span>
                                        )}
                                        {previewData?.arcLength && (
                                            <span>Arc Length s: <strong className="text-amber-400">{previewData.arcLength} px</strong></span>
                                        )}
                                    </div>
                                )}
                            </>
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
