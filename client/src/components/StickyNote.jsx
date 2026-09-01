'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripVertical, Minimize2, Maximize2, Lock, Unlock, MessageCircle } from 'lucide-react';

/**
 * StickyNote — Draggable, resizable, rotatable colored note card for the whiteboard.
 * Collaborative with permission-based editing.
 * 
 * Stored in pageShapeObjects with shapeType: 'sticky_note'
 */

const STICKY_COLORS = [
    { id: 'yellow', bg: '#FEF08A', border: '#EAB308', text: '#713F12', label: 'Yellow' },
    { id: 'pink', bg: '#FBCFE8', border: '#EC4899', text: '#831843', label: 'Pink' },
    { id: 'green', bg: '#BBF7D0', border: '#22C55E', text: '#14532D', label: 'Green' },
    { id: 'blue', bg: '#BFDBFE', border: '#3B82F6', text: '#1E3A5F', label: 'Blue' },
    { id: 'purple', bg: '#E9D5FF', border: '#8B5CF6', text: '#3B0764', label: 'Purple' },
    { id: 'orange', bg: '#FED7AA', border: '#F97316', text: '#7C2D12', label: 'Orange' },
];

export { STICKY_COLORS };

/**
 * Creates a new sticky note shape object.
 * @param {number} x - X position on canvas
 * @param {number} y - Y position on canvas
 * @param {string} colorId - One of: yellow, pink, green, blue, purple, orange
 * @returns {object} Shape object compatible with pageShapeObjects
 */
export function createStickyNoteObject(x, y, colorId = 'yellow') {
    const stickyColor = STICKY_COLORS.find(c => c.id === colorId) || STICKY_COLORS[0];
    const jitter = (Math.random() - 0.5) * 4; // ±2° slight rotation randomness

    return {
        id: Date.now() + Math.random(),
        type: 'sticky_note',
        shapeType: 'sticky_note',
        x,
        y,
        width: 200,
        height: 200,
        color: stickyColor.border,
        fillColor: stickyColor.bg,
        textColor: stickyColor.text,
        strokeWidth: 1,
        rotation: jitter,
        text: '',
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: 'normal',
        stickyColorId: colorId,
        isCollapsed: false,
        isLocked: false,
        createdBy: null, // Set by whiteboard on creation
        createdAt: new Date().toISOString(),
    };
}

/**
 * StickyNoteRenderer — Renders a single sticky note as a DOM overlay on the whiteboard canvas.
 */
export default function StickyNoteRenderer({
    note,
    isSelected,
    isEditing,
    canEdit = true,
    onSelect,
    onUpdate,
    onDelete,
    onStartDrag,
    onStartResize,
    onStartRotate,
    onDoubleClick,
    scale = 1,
}) {
    const textareaRef = useRef(null);
    const [localText, setLocalText] = useState(note.text || '');
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        setLocalText(note.text || '');
    }, [note.text]);

    // Auto-focus textarea on edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Place cursor at end
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, [isEditing]);

    const handleTextChange = useCallback((e) => {
        const newText = e.target.value;
        setLocalText(newText);
        onUpdate?.(note.id, { text: newText });
    }, [note.id, onUpdate]);

    const handleTextBlur = useCallback(() => {
        onUpdate?.(note.id, { text: localText });
    }, [note.id, localText, onUpdate]);

    const handleColorChange = useCallback((colorId) => {
        const stickyColor = STICKY_COLORS.find(c => c.id === colorId) || STICKY_COLORS[0];
        onUpdate?.(note.id, {
            stickyColorId: colorId,
            fillColor: stickyColor.bg,
            color: stickyColor.border,
            textColor: stickyColor.text,
        });
        setShowColorPicker(false);
    }, [note.id, onUpdate]);

    const handleToggleCollapse = useCallback(() => {
        onUpdate?.(note.id, { isCollapsed: !note.isCollapsed });
    }, [note.id, note.isCollapsed, onUpdate]);

    const handleToggleLock = useCallback(() => {
        onUpdate?.(note.id, { isLocked: !note.isLocked });
    }, [note.id, note.isLocked, onUpdate]);

    const stickyColor = STICKY_COLORS.find(c => c.id === note.stickyColorId) || STICKY_COLORS[0];
    const isCollapsed = note.isCollapsed;

    // Auto-fit font size based on text length and note size
    const autoFontSize = Math.max(11, Math.min(18, note.fontSize || 14));

    return (
        <div
            className="absolute select-none"
            style={{
                left: note.x,
                top: note.y,
                width: note.width,
                height: isCollapsed ? 36 : note.height,
                transform: `rotate(${note.rotation || 0}deg)`,
                transformOrigin: 'center center',
                zIndex: isSelected ? 100 : 50,
                pointerEvents: 'auto',
            }}
            onPointerDown={(e) => {
                e.stopPropagation();
                if (note.isLocked) return;
                onSelect?.(note.id);
                if (!isEditing) {
                    onStartDrag?.(e, note.id);
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (note.isLocked || !canEdit) return;
                onDoubleClick?.(note.id);
            }}
        >
            {/* Sticky Note Body */}
            <div
                className="relative w-full h-full rounded-lg overflow-hidden transition-shadow duration-200"
                style={{
                    backgroundColor: stickyColor.bg,
                    borderLeft: `4px solid ${stickyColor.border}`,
                    boxShadow: isSelected
                        ? `0 8px 32px rgba(0,0,0,0.18), 0 0 0 2px ${stickyColor.border}`
                        : '0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
                }}
            >
                {/* Header Bar */}
                <div
                    className="flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing"
                    style={{ borderBottom: `1px solid ${stickyColor.border}40` }}
                >
                    <div className="flex items-center gap-1">
                        <GripVertical className="w-3.5 h-3.5 opacity-40" style={{ color: stickyColor.text }} />
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ color: stickyColor.text }}>
                            Note
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                        {/* Color picker trigger */}
                        {isSelected && canEdit && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPicker(!showColorPicker);
                                }}
                                className="w-4 h-4 rounded-full border border-black/20 hover:scale-125 transition"
                                style={{ backgroundColor: stickyColor.border }}
                                title="Change Color"
                            />
                        )}

                        {isSelected && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleLock();
                                    }}
                                    className="p-0.5 rounded hover:bg-black/10 transition"
                                    title={note.isLocked ? 'Unlock' : 'Lock'}
                                >
                                    {note.isLocked
                                        ? <Lock className="w-3 h-3" style={{ color: stickyColor.text }} />
                                        : <Unlock className="w-3 h-3 opacity-40" style={{ color: stickyColor.text }} />
                                    }
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleCollapse();
                                    }}
                                    className="p-0.5 rounded hover:bg-black/10 transition"
                                    title={isCollapsed ? 'Expand' : 'Collapse'}
                                >
                                    {isCollapsed
                                        ? <Maximize2 className="w-3 h-3" style={{ color: stickyColor.text }} />
                                        : <Minimize2 className="w-3 h-3" style={{ color: stickyColor.text }} />
                                    }
                                </button>

                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete?.(note.id);
                                        }}
                                        className="p-0.5 rounded hover:bg-red-500/20 transition"
                                        title="Delete Note"
                                    >
                                        <X className="w-3 h-3 text-red-600" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Text Area (hidden when collapsed) */}
                {!isCollapsed && (
                    <div className="p-2 h-[calc(100%-28px)]">
                        {isEditing && canEdit ? (
                            <textarea
                                ref={textareaRef}
                                value={localText}
                                onChange={handleTextChange}
                                onBlur={handleTextBlur}
                                placeholder="Type your note..."
                                className="w-full h-full resize-none border-none outline-none bg-transparent leading-snug"
                                style={{
                                    color: stickyColor.text,
                                    fontSize: autoFontSize,
                                    fontFamily: 'inherit',
                                    fontWeight: note.fontWeight || 'normal',
                                    fontStyle: note.fontStyle || 'normal',
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div
                                className="w-full h-full overflow-hidden leading-snug whitespace-pre-wrap break-words"
                                style={{
                                    color: stickyColor.text,
                                    fontSize: autoFontSize,
                                    fontWeight: note.fontWeight || 'normal',
                                    fontStyle: note.fontStyle || 'normal',
                                }}
                            >
                                {note.text || (
                                    <span className="opacity-40 italic">Double-click to edit...</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Collapsed preview text */}
                {isCollapsed && (
                    <div
                        className="px-2 truncate text-[11px] leading-[28px]"
                        style={{ color: stickyColor.text }}
                    >
                        {note.text || 'Empty note'}
                    </div>
                )}
            </div>

            {/* Color Picker Popover */}
            {showColorPicker && isSelected && (
                <div
                    className="absolute -top-10 left-0 flex gap-1 bg-white rounded-full px-2 py-1.5 shadow-xl border border-slate-200 z-[110]"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {STICKY_COLORS.map(sc => (
                        <button
                            key={sc.id}
                            type="button"
                            onClick={() => handleColorChange(sc.id)}
                            className={`w-6 h-6 rounded-full border-2 transition hover:scale-125 ${
                                note.stickyColorId === sc.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                            }`}
                            style={{
                                backgroundColor: sc.bg,
                                borderColor: sc.border,
                            }}
                            title={sc.label}
                        />
                    ))}
                </div>
            )}

            {/* Resize Handle (bottom-right) */}
            {isSelected && canEdit && !note.isLocked && !isCollapsed && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                    style={{
                        background: `linear-gradient(135deg, transparent 50%, ${stickyColor.border} 50%)`,
                        borderBottomRightRadius: '0.5rem',
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onStartResize?.(e, note.id, 'se');
                    }}
                />
            )}
        </div>
    );
}
