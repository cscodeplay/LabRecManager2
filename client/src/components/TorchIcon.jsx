'use client';

import React from 'react';
import { Icon } from '@iconify/react/offline';
import './geometryTools/fluentIconData';

/**
 * Spotlight / Flashlight Icon powered by official Microsoft Fluent System Icons (MIT License).
 */
export default function TorchIcon({ className = 'w-5 h-5', size, color, ...props }) {
    const dimStyle = size ? { width: size, height: size, ...(color ? { color } : {}) } : (color ? { color } : undefined);
    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 leading-none ${size ? '' : className}`}
            style={dimStyle}
            {...props}
        >
            <Icon
                icon="fluent:flashlight-24-filled"
                width="100%"
                height="100%"
                className={className}
                aria-hidden="true"
            />
        </span>
    );
}
