'use client';

import React, { useCallback } from 'react';

const SYMBOL_KEYS = [
    { id: 'tab', label: 'Tab', type: 'tab', color: 'default', tooltip: 'Insert Tab (Indent)' },
    { id: 'colon', label: ':', insert: ':', type: 'char', color: 'amber', tooltip: 'Colon' },
    { id: 'paren', label: '( )', insert: '()', type: 'pair', color: 'sky', tooltip: 'Parentheses' },
    { id: 'dquote', label: '" "', insert: '""', type: 'pair', color: 'purple', tooltip: 'Double Quotes' },
    { id: 'squote', label: "' '", insert: "''", type: 'pair', color: 'purple', tooltip: 'Single Quotes' },
    { id: 'equal', label: '=', insert: '=', type: 'char', color: 'emerald', tooltip: 'Assignment' },
    { id: 'underscore', label: '_', insert: '_', type: 'char', color: 'emerald', tooltip: 'Underscore' },
    { id: 'bracket', label: '[ ]', insert: '[]', type: 'pair', color: 'sky', tooltip: 'Square Brackets' },
    { id: 'brace', label: '{ }', insert: '{}', type: 'pair', color: 'sky', tooltip: 'Curly Braces' },
    { id: 'eqeq', label: '==', insert: '==', type: 'char', color: 'emerald', tooltip: 'Equals Comparison' },
    { id: 'noteq', label: '!=', insert: '!=', type: 'char', color: 'emerald', tooltip: 'Not Equals' },
    { id: 'plus', label: '+', insert: '+', type: 'char', color: 'default', tooltip: 'Plus' },
    { id: 'minus', label: '-', insert: '-', type: 'char', color: 'default', tooltip: 'Minus' },
    { id: 'star', label: '*', insert: '*', type: 'char', color: 'default', tooltip: 'Asterisk / Multiply' },
    { id: 'slash', label: '/', insert: '/', type: 'char', color: 'default', tooltip: 'Slash / Divide' },
    { id: 'lt', label: '<', insert: '<', type: 'char', color: 'default', tooltip: 'Less Than' },
    { id: 'gt', label: '>', insert: '>', type: 'char', color: 'default', tooltip: 'Greater Than' },
    { id: 'comma', label: ',', insert: ',', type: 'char', color: 'default', tooltip: 'Comma' },
    { id: 'dot', label: '.', insert: '.', type: 'char', color: 'default', tooltip: 'Dot' },
    { id: 'semicolon', label: ';', insert: ';', type: 'char', color: 'amber', tooltip: 'Semicolon' },
    { id: 'arrow_left', label: '←', type: 'arrow', direction: 'left', color: 'default', tooltip: 'Move Cursor Left' },
    { id: 'arrow_right', label: '→', type: 'arrow', direction: 'right', color: 'default', tooltip: 'Move Cursor Right' },
];

export default function MobileCodingAccessoryBar({ editorRef, isLightMode = false }) {
    const handleAction = useCallback((key) => {
        if (!editorRef?.current) return;
        const editor = editorRef.current;

        if (key.type === 'tab') {
            editor.trigger('mobile-coding-bar', 'tab', null);
            editor.focus();
            return;
        }

        if (key.type === 'arrow') {
            const pos = editor.getPosition();
            if (pos) {
                const newCol = key.direction === 'left' ? Math.max(1, pos.column - 1) : pos.column + 1;
                editor.setPosition({
                    lineNumber: pos.lineNumber,
                    column: newCol
                });
            }
            editor.focus();
            return;
        }

        if (key.type === 'pair') {
            const selection = editor.getSelection();
            if (selection) {
                editor.executeEdits('mobile-coding-bar', [{
                    range: selection,
                    text: key.insert,
                    forceMoveMarkers: true,
                }]);
                const pos = editor.getPosition();
                if (pos) {
                    editor.setPosition({
                        lineNumber: pos.lineNumber,
                        column: Math.max(1, pos.column - 1)
                    });
                }
            }
            editor.focus();
            return;
        }

        if (key.type === 'char') {
            const selection = editor.getSelection();
            if (selection) {
                editor.executeEdits('mobile-coding-bar', [{
                    range: selection,
                    text: key.insert,
                    forceMoveMarkers: true,
                }]);
            }
            editor.focus();
            return;
        }
    }, [editorRef]);

    const getColorClass = (color) => {
        if (isLightMode) {
            switch (color) {
                case 'amber':
                    return 'text-amber-600 font-bold';
                case 'sky':
                    return 'text-sky-600 font-bold';
                case 'purple':
                    return 'text-purple-600 font-bold';
                case 'emerald':
                    return 'text-emerald-600 font-bold';
                default:
                    return 'text-slate-800 font-semibold';
            }
        } else {
            switch (color) {
                case 'amber':
                    return 'text-amber-300 font-bold';
                case 'sky':
                    return 'text-sky-300 font-bold';
                case 'purple':
                    return 'text-purple-300 font-bold';
                case 'emerald':
                    return 'text-emerald-400 font-bold';
                default:
                    return 'text-slate-200 font-semibold';
            }
        }
    };

    return (
        <div
            className={`w-full flex items-center gap-1 px-2 py-1.5 overflow-x-auto select-none border-t transition-colors ${
                isLightMode
                    ? 'bg-slate-100 border-slate-200'
                    : 'bg-slate-900 border-slate-800'
            }`}
            style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}
            role="toolbar"
            aria-label="Coding Quick Delimiters & Operators"
        >
            {SYMBOL_KEYS.map((key) => {
                const colorCls = getColorClass(key.color);
                return (
                    <button
                        key={key.id}
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleAction(key);
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            handleAction(key);
                        }}
                        title={key.tooltip}
                        className={`key-press shrink-0 min-w-[34px] h-8 px-2 flex items-center justify-center font-mono text-xs rounded-md border transition-all active:scale-90 cursor-pointer ${
                            isLightMode
                                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-2xs'
                                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-100 shadow-xs'
                        } ${colorCls}`}
                    >
                        {key.label}
                    </button>
                );
            })}
        </div>
    );
}
