'use client';

import React from 'react';

/**
 * Custom SVG Torch / Flashlight Icon
 * Demonstrates full feasibility of custom vector SVG icons independent of icon libraries.
 * Features a flashlight body with an active angled light beam.
 */
export default function TorchIcon({ className = "w-5 h-5", size, color = "currentColor", ...props }) {
    const width = size || undefined;
    const height = size || undefined;

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            width={width}
            height={height}
            {...props}
        >
            {/* Flashlight Head */}
            <path d="M15 4l5 5-2 2-5-5 2-2z" fill={color} fillOpacity="0.15" />
            <line x1="13" y1="2" x2="22" y2="11" strokeWidth="2.5" />
            
            {/* Flashlight Handle Body */}
            <path d="M13 6l-8 8a2 2 0 0 0 0 2.83l1.17 1.17a2 2 0 0 0 2.83 0l8-8" fill={color} fillOpacity="0.25" />
            
            {/* Textured Grip Lines */}
            <line x1="8" y1="13" x2="11" y2="10" />
            <line x1="6.5" y1="14.5" x2="9.5" y2="11.5" />
            
            {/* Power Switch on Handle */}
            <circle cx="11.5" cy="9.5" r="0.75" fill={color} stroke="none" />
            
            {/* Dynamic Spotlight Light Beams */}
            <line x1="17.5" y1="2.5" x2="20" y2="0.5" stroke="#f59e0b" strokeWidth="1.75" />
            <line x1="20" y1="4.5" x2="23" y2="3" stroke="#f59e0b" strokeWidth="1.75" />
            <line x1="22" y1="7.5" x2="24" y2="7" stroke="#f59e0b" strokeWidth="1.75" />
        </svg>
    );
}
