'use client';

/**
 * Network3DTextures.js
 * High-definition vector graphics and authentic photorealistic image textures for Computer Science & Network 3D models:
 * - Optical Fiber (Single-mode/multimode cable, glowing silica glass core, buffer, cladding, Kevlar, duplex LC connector)
 * - Twisted Cables (Cat6 UTP 4-pair cable with spline, industry T568B color coding, and RJ-45 modular plug)
 * - Multi-WAN Router (Enterprise dual/quad WAN router, OLED telemetry screen, Gigabit WAN/LAN ports, quad antennas)
 * - Network Switch (24-port Gigabit managed L2/L3 switch, dual 10G SFP+ fiber ports, LED status array, 19" rack ears)
 * - CS Workstation Laptop (Anodized aluminum clamshell, backlit keyboard, network diagnostic terminal displaying ping/traceroute/ip)
 * - IP Patch Panel (24-port 1U Category 6 patch panel, color-coded keystone jacks, IP/VLAN label strips, rackmount ears)
 */

export const NETWORK_3D_TEXTURES = {
    optical_fiber: {
        id: 'optical_fiber',
        name: 'Optical Fiber Cable & LC Duplex Connector',
        category: 'networking',
        defaultWidth: 260,
        defaultHeight: 180,
        description: 'Single-mode OS2 9/125µm optical fiber cable with exposed buffer, silica cladding, glowing laser core, and duplex LC connector.',
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="100%" height="100%">
    <defs>
        <linearGradient id="of_jacket" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="25%" stop-color="#eab308" />
            <stop offset="75%" stop-color="#ca8a04" />
            <stop offset="100%" stop-color="#854d0e" />
        </linearGradient>
        <linearGradient id="of_buffer" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#f1f5f9" />
            <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
        <linearGradient id="of_cladding" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.9" />
            <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient id="of_core_beam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00f5ff" />
            <stop offset="50%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>
        <radialGradient id="of_glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#00f5ff" stop-opacity="1" />
            <stop offset="40%" stop-color="#0ea5e9" stop-opacity="0.8" />
            <stop offset="80%" stop-color="#0284c7" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="of_lc_body" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1d4ed8" />
            <stop offset="50%" stop-color="#3b82f6" />
            <stop offset="100%" stop-color="#1e40af" />
        </linearGradient>
        <filter id="of_core_blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
    </defs>

    <!-- Background Tech Substrate -->
    <rect width="400" height="280" rx="16" fill="#090d16" stroke="#1e293b" stroke-width="2" />
    <pattern id="of_grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <rect width="400" height="280" fill="url(#of_grid)" />

    <!-- Title Badge -->
    <g transform="translate(18, 16)">
        <rect width="180" height="22" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
        <circle cx="12" cy="11" r="4" fill="#00f5ff" filter="url(#of_core_blur)" />
        <text x="24" y="15" fill="#e0f2fe" font-size="10.5" font-family="monospace" font-weight="bold">FIBER OPTIC (OS2 9/125µm)</text>
    </g>

    <!-- 1. Main Outer Yellow Cable Jacket -->
    <path d="M 30 115 L 140 115 C 146 115 150 118 150 125 L 150 155 C 150 162 146 165 140 165 L 30 165 Z" fill="url(#of_jacket)" stroke="#ca8a04" stroke-width="1.5" />
    <path d="M 30 118 L 138 118" stroke="#fef9c3" stroke-width="1.8" opacity="0.8" />
    <text x="40" y="143" fill="#713f12" font-size="8.5" font-family="monospace" font-weight="bold" letter-spacing="1">OPTICAL FIBER CABLE 9/125 G.652.D</text>

    <!-- 2. Kevlar Aramid Strength Filaments -->
    <g stroke="#fef08a" stroke-width="1" opacity="0.85">
        <path d="M 150 120 Q 165 110 180 112" fill="none" />
        <path d="M 150 125 Q 168 118 185 120" fill="none" />
        <path d="M 150 155 Q 168 162 185 160" fill="none" />
        <path d="M 150 160 Q 165 170 180 168" fill="none" />
    </g>

    <!-- 3. White Buffer Tube -->
    <rect x="150" y="127" width="55" height="26" rx="3" fill="url(#of_buffer)" stroke="#cbd5e1" stroke-width="1" />
    <line x1="150" y1="130" x2="205" y2="130" stroke="#ffffff" stroke-width="1.5" />

    <!-- 4. Silica Glass Cladding Layer (125µm) -->
    <rect x="205" y="132" width="50" height="16" rx="2" fill="url(#of_cladding)" stroke="#38bdf8" stroke-width="1" />

    <!-- 5. Glowing Optical Glass Core (Laser Pulse) -->
    <g filter="url(#of_core_blur)">
        <rect x="205" y="138" width="80" height="4" rx="2" fill="url(#of_core_beam)" />
        <!-- Core Laser Light Cone Emitting Forward -->
        <polygon points="285,140 370,110 370,170" fill="url(#of_glow)" opacity="0.75" />
        <ellipse cx="285" cy="140" rx="8" ry="8" fill="#00f5ff" />
        <ellipse cx="285" cy="140" rx="3" ry="3" fill="#ffffff" />
    </g>

    <!-- Core Ray Internal Reflection Diagram -->
    <path d="M 210 139 L 225 141 L 240 139 L 255 141 L 270 139 L 285 140" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.9" />

    <!-- 6. Duplex LC Optical Connector Assembly (Top Right) -->
    <g transform="translate(195, 20)">
        <!-- Dual Ceramic Ferrules -->
        <rect x="155" y="44" width="28" height="10" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="0.8" />
        <rect x="155" y="66" width="28" height="10" rx="2" fill="#ffffff" stroke="#94a3b8" stroke-width="0.8" />
        <circle cx="181" cy="49" r="2.2" fill="#00f5ff" />
        <circle cx="181" cy="71" r="2.2" fill="#00f5ff" />

        <!-- Dual Blue LC Outer Shells -->
        <rect x="75" y="38" width="80" height="22" rx="3" fill="url(#of_lc_body)" stroke="#1e3a8a" stroke-width="1.2" />
        <rect x="75" y="60" width="80" height="22" rx="3" fill="url(#of_lc_body)" stroke="#1e3a8a" stroke-width="1.2" />

        <!-- Latch Clips -->
        <path d="M 85 38 L 115 28 L 135 28 L 125 38 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1" />
        <path d="M 85 60 L 115 50 L 135 50 L 125 60 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1" />

        <!-- Rubber Strain Relief Boots -->
        <path d="M 35 42 L 75 39 L 75 59 L 35 56 Z" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <path d="M 35 64 L 75 61 L 75 81 L 35 78 Z" fill="#1e293b" stroke="#334155" stroke-width="1" />

        <!-- Polarity Channel Indicators -->
        <rect x="110" y="43" width="12" height="12" rx="2" fill="#ffffff" />
        <text x="113" y="52" fill="#1e3a8a" font-size="8" font-family="sans-serif" font-weight="bold">A</text>
        <rect x="110" y="65" width="12" height="12" rx="2" fill="#ffffff" />
        <text x="113" y="74" fill="#1e3a8a" font-size="8" font-family="sans-serif" font-weight="bold">B</text>
    </g>

    <!-- Optical Specifications Label Block -->
    <g transform="translate(24, 195)">
        <rect width="352" height="65" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="1.2" />
        <text x="16" y="22" fill="#38bdf8" font-size="11" font-family="sans-serif" font-weight="bold">Single-Mode Fiber Optics (OS2)</text>
        <text x="16" y="40" fill="#94a3b8" font-size="9" font-family="monospace">• Core/Cladding: 9/125 µm • Laser: 1310/1550 nm • Total Internal Reflection</text>
        <text x="16" y="54" fill="#94a3b8" font-size="9" font-family="monospace">• Insertion Loss &lt; 0.2dB • Speed: 10Gbps - 400Gbps Enterprise Backhaul</text>
        <circle cx="330" cy="32" r="14" fill="#0284c7" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1" />
        <text x="330" y="36" fill="#38bdf8" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">LC</text>
    </g>
</svg>
        `
    },

    twisted_cables: {
        id: 'twisted_cables',
        name: 'Twisted Pair Cables (Cat6 UTP & RJ-45)',
        category: 'networking',
        defaultWidth: 260,
        defaultHeight: 180,
        description: 'Category 6 Unshielded Twisted Pair (UTP) cable with 4 color-coded twisted pairs (T568B standard), center spline, and clear RJ-45 modular plug.',
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="100%" height="100%">
    <defs>
        <linearGradient id="tp_jacket" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#3b82f6" />
            <stop offset="40%" stop-color="#1d4ed8" />
            <stop offset="100%" stop-color="#172554" />
        </linearGradient>
        <linearGradient id="tp_rj45_body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.9" />
            <stop offset="50%" stop-color="#cbd5e1" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#64748b" stop-opacity="0.85" />
        </linearGradient>
        <linearGradient id="tp_gold_pin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="50%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#b45309" />
        </linearGradient>
    </defs>

    <!-- Background Frame -->
    <rect width="400" height="280" rx="16" fill="#090d16" stroke="#1e293b" stroke-width="2" />
    <pattern id="tp_grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <rect width="400" height="280" fill="url(#tp_grid)" />

    <!-- Badge -->
    <g transform="translate(18, 16)">
        <rect width="180" height="22" rx="4" fill="#0f172a" stroke="#3b82f6" stroke-width="1" />
        <circle cx="12" cy="11" r="4" fill="#3b82f6" />
        <text x="24" y="15" fill="#e0f2fe" font-size="10.5" font-family="monospace" font-weight="bold">CAT6 UTP (TIA/EIA-568-B)</text>
    </g>

    <!-- 1. Outer Blue PVC Jacket -->
    <path d="M 25 110 L 125 110 C 132 110 136 114 136 122 L 136 158 C 136 166 132 170 125 170 L 25 170 Z" fill="url(#tp_jacket)" stroke="#2563eb" stroke-width="1.8" />
    <path d="M 25 114 L 122 114" stroke="#93c5fd" stroke-width="2" opacity="0.7" />
    <text x="32" y="144" fill="#dbeafe" font-size="8" font-family="monospace" font-weight="bold">CAT.6 UTP 4-PAIR 23AWG 550MHz</text>

    <!-- Central Cross Spline Separator -->
    <polygon points="136,134 148,131 156,137 148,143" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />

    <!-- 2. 4 Twisted Pairs (8 Color-Coded Conductors) -->
    <!-- Pair 1: Orange & White-Orange -->
    <g transform="translate(136, 108)">
        <path d="M 0 6 Q 16 -4 32 6 T 64 6 T 96 6" fill="none" stroke="#ea580c" stroke-width="3" stroke-linecap="round" />
        <path d="M 0 10 Q 16 18 32 10 T 64 10 T 96 10" fill="none" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" />
        <circle cx="96" cy="8" r="2.5" fill="#ea580c" />
    </g>

    <!-- Pair 2: Green & White-Green -->
    <g transform="translate(136, 126)">
        <path d="M 0 4 Q 16 -6 32 4 T 64 4 T 96 4" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" />
        <path d="M 0 8 Q 16 16 32 8 T 64 8 T 96 8" fill="none" stroke="#bbf7d0" stroke-width="3" stroke-linecap="round" />
        <circle cx="96" cy="6" r="2.5" fill="#16a34a" />
    </g>

    <!-- Pair 3: Blue & White-Blue -->
    <g transform="translate(136, 144)">
        <path d="M 0 5 Q 16 -5 32 5 T 64 5 T 96 5" fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
        <path d="M 0 9 Q 16 17 32 9 T 64 9 T 96 9" fill="none" stroke="#bfdbfe" stroke-width="3" stroke-linecap="round" />
        <circle cx="96" cy="7" r="2.5" fill="#0284c7" />
    </g>

    <!-- Pair 4: Brown & White-Brown -->
    <g transform="translate(136, 162)">
        <path d="M 0 4 Q 16 -6 32 4 T 64 4 T 96 4" fill="none" stroke="#92400e" stroke-width="3" stroke-linecap="round" />
        <path d="M 0 8 Q 16 16 32 8 T 64 8 T 96 8" fill="none" stroke="#fef3c7" stroke-width="3" stroke-linecap="round" />
        <circle cx="96" cy="6" r="2.5" fill="#92400e" />
    </g>

    <!-- 3. Transparent RJ-45 Modular Connector (Right Side) -->
    <g transform="translate(245, 100)">
        <!-- Boot -->
        <path d="M 0 15 L 20 10 L 20 60 L 0 55 Z" fill="#1e40af" stroke="#1e3a8a" stroke-width="1.2" />

        <!-- Clear Crystal Body -->
        <rect x="20" y="8" width="95" height="54" rx="4" fill="url(#tp_rj45_body)" stroke="#94a3b8" stroke-width="1.5" />
        <line x1="20" y1="12" x2="110" y2="12" stroke="#ffffff" stroke-width="1.5" />

        <!-- Keyway Notch -->
        <rect x="65" y="48" width="50" height="14" fill="#090d16" stroke="#64748b" stroke-width="1" />

        <!-- Locking Clip (Flexible Latch) -->
        <path d="M 35 8 L 75 -6 L 90 -6 L 70 8 Z" fill="#93c5fd" stroke="#3b82f6" stroke-width="1.2" opacity="0.9" />

        <!-- 8 Gold Contact Pins (8P8C) -->
        <rect x="88" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="91" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="94" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="97" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="100" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="103" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="106" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />
        <rect x="109" y="14" width="2" height="16" rx="0.5" fill="url(#tp_gold_pin)" stroke="#b45309" stroke-width="0.3" />

        <!-- Internal Wire Parallel Track Alignments -->
        <g stroke-width="1.8" opacity="0.9">
            <line x1="22" y1="18" x2="88" y2="15" stroke="#fed7aa" />
            <line x1="22" y1="22" x2="88" y2="18" stroke="#ea580c" />
            <line x1="22" y1="26" x2="88" y2="21" stroke="#bbf7d0" />
            <line x1="22" y1="30" x2="88" y2="24" stroke="#0284c7" />
            <line x1="22" y1="34" x2="88" y2="27" stroke="#bfdbfe" />
            <line x1="22" y1="38" x2="88" y2="30" stroke="#16a34a" />
            <line x1="22" y1="42" x2="88" y2="33" stroke="#fef3c7" />
            <line x1="22" y1="46" x2="88" y2="36" stroke="#92400e" />
        </g>
    </g>

    <!-- Wiring Pinout Table Bar -->
    <g transform="translate(24, 205)">
        <rect width="352" height="58" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="1.2" />
        <text x="14" y="18" fill="#3b82f6" font-size="10.5" font-family="sans-serif" font-weight="bold">TIA/EIA-568-B RJ45 Pinout Specification</text>
        <g transform="translate(14, 26)">
            <g transform="translate(0, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#93c5fd" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">1:W-O</text>
            </g>
            <g transform="translate(41, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#f8fafc" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">2:O</text>
            </g>
            <g transform="translate(82, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#93c5fd" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">3:W-G</text>
            </g>
            <g transform="translate(123, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#f8fafc" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">4:BL</text>
            </g>
            <g transform="translate(164, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#93c5fd" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">5:W-BL</text>
            </g>
            <g transform="translate(205, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#f8fafc" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">6:G</text>
            </g>
            <g transform="translate(246, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#93c5fd" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">7:W-BR</text>
            </g>
            <g transform="translate(287, 0)">
                <rect width="37" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
                <text x="18.5" y="12" fill="#f8fafc" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">8:BR</text>
            </g>
        </g>
    </g>
</svg>
        `
    },

    multwan_router: {
        id: 'multwan_router',
        name: 'Enterprise Multi-WAN Router',
        category: 'networking',
        defaultWidth: 280,
        defaultHeight: 180,
        description: 'Multi-WAN Gigabit Enterprise Router with Dual WAN failover/load balancing, 4 high-gain antennas, and real-time OLED diagnostic telemetry display.',
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="100%" height="100%">
    <defs>
        <linearGradient id="mr_chassis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="50%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <linearGradient id="mr_metal_top" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="50%" stop-color="#475569" />
            <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <linearGradient id="mr_oled" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#022c22" />
            <stop offset="100%" stop-color="#041f1a" />
        </linearGradient>
        <linearGradient id="mr_ant" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="50%" stop-color="#64748b" />
            <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
    </defs>

    <!-- Background Housing -->
    <rect width="400" height="280" rx="16" fill="#090d16" stroke="#1e293b" stroke-width="2" />
    <pattern id="mr_grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <rect width="400" height="280" fill="url(#mr_grid)" />

    <!-- 4 High-Gain 3D Antennas -->
    <!-- Left Antennas -->
    <path d="M 60 110 L 25 25" stroke="url(#mr_ant)" stroke-width="7" stroke-linecap="round" />
    <circle cx="60" cy="110" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" />
    <path d="M 100 110 L 80 18" stroke="url(#mr_ant)" stroke-width="7" stroke-linecap="round" />
    <circle cx="100" cy="110" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" />

    <!-- Right Antennas -->
    <path d="M 300 110 L 320 18" stroke="url(#mr_ant)" stroke-width="7" stroke-linecap="round" />
    <circle cx="300" cy="110" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" />
    <path d="M 340 110 L 375 25" stroke="url(#mr_ant)" stroke-width="7" stroke-linecap="round" />
    <circle cx="340" cy="110" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" />

    <!-- Main Router Chassis -->
    <rect x="40" y="105" width="320" height="110" rx="10" fill="url(#mr_chassis)" stroke="#475569" stroke-width="2" />
    <!-- Top Metallic Bevel Lid -->
    <path d="M 40 120 L 52 108 L 348 108 L 360 120 Z" fill="url(#mr_metal_top)" stroke="#64748b" stroke-width="1" />

    <!-- Honeycomb Side Ventilation -->
    <g fill="#020617">
        <circle cx="48" cy="140" r="2.5" /><circle cx="48" cy="155" r="2.5" /><circle cx="48" cy="170" r="2.5" />
        <circle cx="352" cy="140" r="2.5" /><circle cx="352" cy="155" r="2.5" /><circle cx="352" cy="170" r="2.5" />
    </g>

    <!-- Front OLED Diagnostic Screen -->
    <rect x="60" y="130" width="135" height="68" rx="6" fill="url(#mr_oled)" stroke="#059669" stroke-width="1.5" />
    <text x="68" y="146" fill="#10b981" font-size="9" font-family="monospace" font-weight="bold">MULTI-WAN ACTIVE</text>
    <text x="68" y="159" fill="#34d399" font-size="7.5" font-family="monospace">WAN1: 940M [FIBER] OK</text>
    <text x="68" y="170" fill="#34d399" font-size="7.5" font-family="monospace">WAN2: 880M [CAT6]  OK</text>
    <text x="68" y="181" fill="#38bdf8" font-size="7.5" font-family="monospace">BALANCING: 50% / 50%</text>
    <text x="68" y="192" fill="#94a3b8" font-size="7" font-family="monospace">GW: 192.168.1.1 (UP)</text>

    <!-- Dual WAN Ports (WAN 1 / WAN 2) with Distinct Yellow/Orange Framing -->
    <g transform="translate(208, 130)">
        <!-- WAN 1 Port -->
        <rect x="0" y="0" width="34" height="30" rx="3" fill="#0f172a" stroke="#f59e0b" stroke-width="1.8" />
        <rect x="4" y="8" width="26" height="18" fill="#1e293b" />
        <circle cx="17" cy="4" r="2" fill="#22c55e" />
        <text x="17" y="38" fill="#f59e0b" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">WAN 1</text>

        <!-- WAN 2 Port -->
        <rect x="40" y="0" width="34" height="30" rx="3" fill="#0f172a" stroke="#f59e0b" stroke-width="1.8" />
        <rect x="44" y="8" width="26" height="18" fill="#1e293b" />
        <circle cx="57" cy="4" r="2" fill="#22c55e" />
        <text x="57" y="38" fill="#f59e0b" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">WAN 2</text>

        <!-- LAN 1 & LAN 2 Ports -->
        <rect x="80" y="0" width="30" height="30" rx="3" fill="#0f172a" stroke="#3b82f6" stroke-width="1.2" />
        <rect x="83" y="8" width="24" height="18" fill="#1e293b" />
        <circle cx="95" cy="4" r="2" fill="#3b82f6" />
        <text x="95" y="38" fill="#93c5fd" font-size="7.5" font-family="monospace" text-anchor="middle">LAN 1</text>

        <rect x="114" y="0" width="30" height="30" rx="3" fill="#0f172a" stroke="#3b82f6" stroke-width="1.2" />
        <rect x="117" y="8" width="24" height="18" fill="#1e293b" />
        <circle cx="129" cy="4" r="2" fill="#3b82f6" />
        <text x="129" y="38" fill="#93c5fd" font-size="7.5" font-family="monospace" text-anchor="middle">LAN 2</text>
    </g>

    <!-- USB 3.0 5G/LTE Failover Port & Reset Switch -->
    <g transform="translate(208, 178)">
        <rect x="0" y="0" width="26" height="14" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1" />
        <text x="13" y="10" fill="#ffffff" font-size="6" font-family="monospace" font-weight="bold" text-anchor="middle">USB</text>
        <circle cx="40" cy="7" r="2" fill="#dc2626" />
        <text x="48" y="10" fill="#94a3b8" font-size="6.5" font-family="sans-serif">RESET</text>
    </g>

    <!-- Hardware Feature Description -->
    <g transform="translate(40, 226)">
        <rect width="320" height="42" rx="6" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
        <text x="12" y="16" fill="#f59e0b" font-size="9.5" font-family="sans-serif" font-weight="bold">Enterprise Dual-WAN Load Balancing Router</text>
        <text x="12" y="30" fill="#94a3b8" font-size="8" font-family="monospace">• Auto-Failover &amp; Session Balancing • Multi-ISP Redundancy • VLAN 802.1Q</text>
    </g>
</svg>
        `
    },

    network_switch: {
        id: 'network_switch',
        name: '24-Port Managed Network Switch (1U with SFP)',
        category: 'networking',
        defaultWidth: 300,
        defaultHeight: 160,
        description: 'Enterprise 1U 19-inch Managed L2/L3 Network Switch with 24 Gigabit Ethernet RJ-45 ports, dual 10G SFP+ optical fiber cages, and mounting rack ears.',
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240" width="100%" height="100%">
    <defs>
        <linearGradient id="sw_chassis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="10%" stop-color="#1e293b" />
            <stop offset="90%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <linearGradient id="sw_ear" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#64748b" />
            <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <linearGradient id="sw_sfp" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e2e8f0" />
            <stop offset="50%" stop-color="#94a3b8" />
            <stop offset="100%" stop-color="#475569" />
        </linearGradient>
    </defs>

    <!-- Background Substrate -->
    <rect width="420" height="240" rx="16" fill="#090d16" stroke="#1e293b" stroke-width="2" />
    <pattern id="sw_grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <rect width="420" height="240" fill="url(#sw_grid)" />

    <!-- Title Header -->
    <g transform="translate(20, 16)">
        <rect width="240" height="22" rx="4" fill="#0f172a" stroke="#0ea5e9" stroke-width="1" />
        <circle cx="12" cy="11" r="4" fill="#22c55e" />
        <text x="24" y="15" fill="#e0f2fe" font-size="10" font-family="monospace" font-weight="bold">ENTERPRISE 24-PORT SWITCH (1U)</text>
    </g>

    <!-- 19" Rack Mounting Ears -->
    <!-- Left Ear -->
    <polygon points="12,70 30,70 30,150 12,150" fill="url(#sw_ear)" stroke="#475569" stroke-width="1.2" />
    <rect x="15" y="80" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />
    <rect x="15" y="126" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />

    <!-- Right Ear -->
    <polygon points="390,70 408,70 408,150 390,150" fill="url(#sw_ear)" stroke="#475569" stroke-width="1.2" />
    <rect x="397" y="80" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />
    <rect x="397" y="126" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />

    <!-- Main Switch 1U Chassis Body -->
    <rect x="30" y="65" width="360" height="90" rx="5" fill="url(#sw_chassis)" stroke="#475569" stroke-width="2" />
    <line x1="30" y1="72" x2="390" y2="72" stroke="#64748b" stroke-width="1" opacity="0.6" />

    <!-- Status LED Cluster (PWR, SYS, PoE, Alarm) -->
    <g transform="translate(42, 85)">
        <circle cx="6" cy="6" r="3" fill="#22c55e" />
        <text x="14" y="9" fill="#94a3b8" font-size="7" font-family="monospace">PWR</text>
        <circle cx="6" cy="22" r="3" fill="#22c55e" />
        <text x="14" y="25" fill="#94a3b8" font-size="7" font-family="monospace">SYS</text>
        <circle cx="6" cy="38" r="3" fill="#3b82f6" />
        <text x="14" y="41" fill="#94a3b8" font-size="7" font-family="monospace">PoE</text>
    </g>

    <!-- Console RJ45 Port -->
    <g transform="translate(82, 85)">
        <rect x="0" y="5" width="22" height="26" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1" />
        <rect x="3" y="12" width="16" height="16" fill="#090d16" />
        <text x="11" y="42" fill="#38bdf8" font-size="6.5" font-family="monospace" text-anchor="middle">MGMT</text>
    </g>

    <!-- 24-Port RJ-45 Matrix (2 Rows of 12 Ports) -->
    <g transform="translate(118, 80)">
        <g transform="translate(0.0, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#eab308" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">1</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#eab308" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">2</text>
        </g>
        <g transform="translate(18.5, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">3</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">4</text>
        </g>
        <g transform="translate(37.0, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">5</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">6</text>
        </g>
        <g transform="translate(55.5, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#eab308" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">7</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">8</text>
        </g>
        <g transform="translate(74.0, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">9</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#eab308" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">10</text>
        </g>
        <g transform="translate(92.5, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">11</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">12</text>
        </g>
        <g transform="translate(111.0, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#eab308" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">13</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">14</text>
        </g>
        <g transform="translate(129.5, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">15</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">16</text>
        </g>
        <g transform="translate(148.0, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">17</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#eab308" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">18</text>
        </g>
        <g transform="translate(166.5, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#eab308" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">19</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">20</text>
        </g>
        <g transform="translate(185.0, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">21</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">22</text>
        </g>
        <g transform="translate(203.5, 0)">
            <circle cx="7" cy="2" r="1.5" fill="#22c55e" />
            <rect x="1" y="6" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="11" width="10" height="11" fill="#020617" />
            <text x="8" y="29" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">23</text>
            <rect x="1" y="34" width="14" height="18" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
            <rect x="3" y="39" width="10" height="11" fill="#020617" />
            <circle cx="7" cy="56" r="1.5" fill="#22c55e" />
            <text x="8" y="33" fill="#94a3b8" font-size="5.5" font-family="monospace" text-anchor="middle">24</text>
        </g>
    </g>

    <!-- Dual 10G SFP+ Optical Fiber Transceiver Slots -->
    <g transform="translate(348, 86)">
        <!-- SFP+ Port 25 -->
        <rect x="0" y="0" width="16" height="38" rx="2" fill="url(#sw_sfp)" stroke="#cbd5e1" stroke-width="1" />
        <rect x="3" y="6" width="10" height="26" fill="#020617" />
        <circle cx="8" cy="44" r="2" fill="#00f5ff" />
        <text x="8" y="54" fill="#38bdf8" font-size="6" font-family="monospace" text-anchor="middle">25F</text>

        <!-- SFP+ Port 26 -->
        <rect x="20" y="0" width="16" height="38" rx="2" fill="url(#sw_sfp)" stroke="#cbd5e1" stroke-width="1" />
        <rect x="23" y="6" width="10" height="26" fill="#020617" />
        <circle cx="28" cy="44" r="2" fill="#00f5ff" />
        <text x="28" y="54" fill="#38bdf8" font-size="6" font-family="monospace" text-anchor="middle">26F</text>
    </g>

    <!-- Specifications Footer Block -->
    <g transform="translate(30, 168)">
        <rect width="360" height="52" rx="6" fill="#0f172a" stroke="#1e293b" stroke-width="1.2" />
        <text x="14" y="18" fill="#38bdf8" font-size="10" font-family="sans-serif" font-weight="bold">Layer 2+ / Layer 3 Gigabit Managed Switch</text>
        <text x="14" y="32" fill="#94a3b8" font-size="8.5" font-family="monospace">• 24x 10/100/1000Base-T RJ45 • 2x 10G SFP+ Uplinks • 128Gbps Fabric</text>
        <text x="14" y="44" fill="#94a3b8" font-size="8.5" font-family="monospace">• 802.1Q VLAN Tagging • LACP Trunking • IGMP Snooping • SNMP v3</text>
    </g>
</svg>
        `
    },

    laptop: {
        id: 'laptop',
        name: 'CS Workstation Laptop (Interactive Terminal)',
        category: 'cs',
        defaultWidth: 260,
        defaultHeight: 180,
        description: 'Computer Science Workstation Notebook with angled clamshell display running live network terminal (ping, ifconfig, traceroute, nmap).',
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="100%" height="100%">
    <defs>
        <linearGradient id="lp_metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#475569" />
            <stop offset="50%" stop-color="#334155" />
            <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <linearGradient id="lp_screen_border" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#020617" />
        </linearGradient>
    </defs>

    <!-- Background Frame -->
    <rect width="400" height="280" rx="16" fill="#090d16" stroke="#1e293b" stroke-width="2" />
    <pattern id="lp_grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <rect width="400" height="280" fill="url(#lp_grid)" />

    <!-- Badge -->
    <g transform="translate(18, 16)">
        <rect width="180" height="22" rx="4" fill="#0f172a" stroke="#10b981" stroke-width="1" />
        <circle cx="12" cy="11" r="4" fill="#10b981" />
        <text x="24" y="15" fill="#e0f2fe" font-size="10.5" font-family="monospace" font-weight="bold">CS NETWORK WORKSTATION</text>
    </g>

    <!-- 1. Open Angled Display Lid -->
    <g transform="translate(60, 42)">
        <!-- Lid Bezel -->
        <rect x="0" y="0" width="280" height="140" rx="8" fill="url(#lp_screen_border)" stroke="#475569" stroke-width="2" />
        <!-- Web Camera & Indicator LED -->
        <circle cx="140" cy="6" r="2.5" fill="#1e293b" stroke="#334155" stroke-width="0.8" />
        <circle cx="148" cy="6" r="1.2" fill="#22c55e" />

        <!-- Glowing Terminal Screen -->
        <rect x="10" y="14" width="260" height="116" rx="4" fill="#030712" stroke="#1e293b" stroke-width="1" />

        <!-- Terminal Header Bar -->
        <rect x="10" y="14" width="260" height="16" rx="4" fill="#0f172a" />
        <circle cx="20" cy="22" r="3" fill="#ef4444" />
        <circle cx="28" cy="22" r="3" fill="#f59e0b" />
        <circle cx="36" cy="22" r="3" fill="#22c55e" />
        <text x="140" y="25" fill="#94a3b8" font-size="7.5" font-family="monospace" font-weight="bold" text-anchor="middle">terminal ~ cs-lab-diagnostic</text>

        <!-- Command Line Session Output -->
        <g font-family="monospace" font-size="7.5">
            <text x="18" y="42" fill="#38bdf8" font-weight="bold">cs-admin@station:~$</text>
            <text x="110" y="42" fill="#f8fafc">ip addr show eth0</text>
            <text x="18" y="53" fill="#94a3b8">inet 192.168.1.105/24 brd 192.168.1.255</text>

            <text x="18" y="66" fill="#38bdf8" font-weight="bold">cs-admin@station:~$</text>
            <text x="110" y="66" fill="#f8fafc">ping -c 2 192.168.1.1</text>
            <text x="18" y="77" fill="#22c55e">64 bytes from 192.168.1.1: icmp_seq=1 time=0.45 ms</text>
            <text x="18" y="87" fill="#22c55e">64 bytes from 192.168.1.1: icmp_seq=2 time=0.42 ms</text>

            <text x="18" y="100" fill="#38bdf8" font-weight="bold">cs-admin@station:~$</text>
            <text x="110" y="100" fill="#f8fafc">traceroute -n 8.8.8.8</text>
            <text x="18" y="111" fill="#facc15">1  192.168.1.1 (Multi-WAN Gateway) 0.38 ms</text>
            <text x="18" y="121" fill="#34d399">2  10.200.0.1  (ISP Optical Node)   1.84 ms</text>
        </g>
    </g>

    <!-- 2. Lower Base Chassis (Keyboard & Palmrest Deck) -->
    <g transform="translate(35, 178)">
        <polygon points="25,0 305,0 330,80 0,80" fill="url(#lp_metal)" stroke="#475569" stroke-width="1.8" />
        
        <!-- Recessed Keyboard Well -->
        <polygon points="40,8 290,8 305,52 25,52" fill="#0f172a" stroke="#334155" stroke-width="1" />

        <!-- Keyboard Key Rows -->
        <line x1="38" y1="16" x2="292" y2="16" stroke="#334155" stroke-width="1" stroke-dasharray="8 3" />
        <line x1="35" y1="25" x2="295" y2="25" stroke="#334155" stroke-width="1" stroke-dasharray="8 3" />
        <line x1="32" y1="34" x2="298" y2="34" stroke="#334155" stroke-width="1" stroke-dasharray="8 3" />
        <line x1="29" y1="43" x2="301" y2="43" stroke="#334155" stroke-width="1" stroke-dasharray="8 3" />

        <!-- Spacebar -->
        <rect x="120" y="44" width="90" height="6" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.8" />

        <!-- Multi-Touch Glass Trackpad -->
        <rect x="135" y="56" width="60" height="20" rx="3" fill="#334155" stroke="#64748b" stroke-width="1" />

        <!-- Front Edge Bevel -->
        <line x1="0" y1="80" x2="330" y2="80" stroke="#94a3b8" stroke-width="2" />
        <rect x="150" y="77" width="30" height="3" rx="1.5" fill="#64748b" />
    </g>
</svg>
        `
    },

    ip_panel: {
        id: 'ip_panel',
        name: '24-Port Category 6 IP Patch Panel (1U)',
        category: 'networking',
        defaultWidth: 300,
        defaultHeight: 160,
        description: '19-inch 1U Steel IP Patch Distribution Panel with 24 numbered RJ-45 keystone jacks, IP subnet label strips, and cable management.',
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240" width="100%" height="100%">
    <defs>
        <linearGradient id="ip_steel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="40%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <linearGradient id="ip_rackear" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#475569" />
            <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
    </defs>

    <!-- Background Frame -->
    <rect width="420" height="240" rx="16" fill="#090d16" stroke="#1e293b" stroke-width="2" />
    <pattern id="ip_grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <rect width="420" height="240" fill="url(#ip_grid)" />

    <!-- Title Header -->
    <g transform="translate(20, 16)">
        <rect width="250" height="22" rx="4" fill="#0f172a" stroke="#6366f1" stroke-width="1" />
        <circle cx="12" cy="11" r="4" fill="#6366f1" />
        <text x="24" y="15" fill="#e0f2fe" font-size="10" font-family="monospace" font-weight="bold">IP DISTRIBUTION PATCH PANEL (1U)</text>
    </g>

    <!-- Left 19" Rack Mounting Ear -->
    <polygon points="12,70 30,70 30,150 12,150" fill="url(#ip_rackear)" stroke="#475569" stroke-width="1.2" />
    <rect x="15" y="80" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />
    <rect x="15" y="126" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />

    <!-- Right 19" Rack Mounting Ear -->
    <polygon points="390,70 408,70 408,150 390,150" fill="url(#ip_rackear)" stroke="#475569" stroke-width="1.2" />
    <rect x="397" y="80" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />
    <rect x="397" y="126" width="8" height="14" rx="3" fill="#090d16" stroke="#64748b" stroke-width="1" />

    <!-- 1U Heavy-Gauge Steel Chassis Faceplate -->
    <rect x="30" y="68" width="360" height="84" rx="4" fill="url(#ip_steel)" stroke="#475569" stroke-width="2" />

    <!-- 4 Color-Coded Modular Groups (6 Ports Each = 24 Ports Total) -->
    <!-- Group 1: Ports 01-06 (Blue: Servers / Core) -->
    <g transform="translate(42, 76)">
        <!-- Label Strip -->
        <rect x="0" y="0" width="80" height="14" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
        <text x="40" y="10" fill="#0369a1" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">192.168.10.x [SRV]</text>
        <!-- 6 Ports -->
        <g transform="translate(0.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">01</text>
        </g>
        <g transform="translate(13.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">02</text>
        </g>
        <g transform="translate(27.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">03</text>
        </g>
        <g transform="translate(40.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">04</text>
        </g>
        <g transform="translate(54.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">05</text>
        </g>
        <g transform="translate(67.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#0284c7" stroke="#38bdf8" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">06</text>
        </g>
    </g>

    <!-- Group 2: Ports 07-12 (Green: Lab Workstations) -->
    <g transform="translate(130, 76)">
        <rect x="0" y="0" width="80" height="14" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
        <text x="40" y="10" fill="#15803d" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">192.168.20.x [LAB]</text>
        <g transform="translate(0.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#16a34a" stroke="#4ade80" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">07</text>
        </g>
        <g transform="translate(13.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#16a34a" stroke="#4ade80" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">08</text>
        </g>
        <g transform="translate(27.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#16a34a" stroke="#4ade80" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">09</text>
        </g>
        <g transform="translate(40.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#16a34a" stroke="#4ade80" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">10</text>
        </g>
        <g transform="translate(54.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#16a34a" stroke="#4ade80" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">11</text>
        </g>
        <g transform="translate(67.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#16a34a" stroke="#4ade80" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">12</text>
        </g>
    </g>

    <!-- Group 3: Ports 13-18 (Purple: Wi-Fi Access Points) -->
    <g transform="translate(218, 76)">
        <rect x="0" y="0" width="80" height="14" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
        <text x="40" y="10" fill="#7e22ce" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">192.168.30.x [WIFI]</text>
        <g transform="translate(0.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#9333ea" stroke="#c084fc" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">13</text>
        </g>
        <g transform="translate(13.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#9333ea" stroke="#c084fc" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">14</text>
        </g>
        <g transform="translate(27.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#9333ea" stroke="#c084fc" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">15</text>
        </g>
        <g transform="translate(40.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#9333ea" stroke="#c084fc" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">16</text>
        </g>
        <g transform="translate(54.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#9333ea" stroke="#c084fc" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">17</text>
        </g>
        <g transform="translate(67.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#9333ea" stroke="#c084fc" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">18</text>
        </g>
    </g>

    <!-- Group 4: Ports 19-24 (Amber: VoIP & Management) -->
    <g transform="translate(306, 76)">
        <rect x="0" y="0" width="80" height="14" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
        <text x="40" y="10" fill="#c2410c" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">192.168.40.x [MGMT]</text>
        <g transform="translate(0.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#ea580c" stroke="#fb923c" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">19</text>
        </g>
        <g transform="translate(13.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#ea580c" stroke="#fb923c" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">20</text>
        </g>
        <g transform="translate(27.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#ea580c" stroke="#fb923c" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">21</text>
        </g>
        <g transform="translate(40.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#ea580c" stroke="#fb923c" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">22</text>
        </g>
        <g transform="translate(54.0, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#ea580c" stroke="#fb923c" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">23</text>
        </g>
        <g transform="translate(67.5, 20)">
            <rect x="0" y="0" width="11.5" height="34" rx="1.5" fill="#ea580c" stroke="#fb923c" stroke-width="0.8" />
            <rect x="1.5" y="8" width="8.5" height="18" fill="#0f172a" />
            <text x="5.7" y="6" fill="#f8fafc" font-size="5" font-family="monospace" text-anchor="middle">24</text>
        </g>
    </g>

    <!-- Specification Footer -->
    <g transform="translate(30, 168)">
        <rect width="360" height="52" rx="6" fill="#0f172a" stroke="#1e293b" stroke-width="1.2" />
        <text x="14" y="18" fill="#6366f1" font-size="10" font-family="sans-serif" font-weight="bold">24-Port Category 6 IP Keystone Patch Panel</text>
        <text x="14" y="32" fill="#94a3b8" font-size="8.5" font-family="monospace">• 19" 1U EIA Standard • 110 Dual-Type IDC Terminals • T568A/T568B</text>
        <text x="14" y="44" fill="#94a3b8" font-size="8.5" font-family="monospace">• Subnet &amp; VLAN ID Labeling • Rear Cable Strain Relief Management</text>
    </g>
</svg>
        `
    }
};

/**
 * Helper to convert clean SVG string to an embeddable data URI
 */
export function getTextureSVGDataUri(svgString) {
    if (!svgString) return null;
    const cleanSvg = svgString.trim().replace(/\s+/g, ' ');
    return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
}

/**
 * Get texture definition for a given model type
 */
export function getNetworkTexture(modelType) {
    if (!modelType) return null;
    const m = modelType.toLowerCase().replace(/_3d$/, '');
    if (m === 'optical_fiber' || m === 'fiber' || m === 'fiber_optic') {
        return NETWORK_3D_TEXTURES.optical_fiber;
    }
    if (m === 'twisted_cables' || m === 'twisted_pair' || m === 'utp' || m === 'ethernet_cable') {
        return NETWORK_3D_TEXTURES.twisted_cables;
    }
    if (m === 'multwan_router' || m === 'multi_wan_router' || m === 'multiwan' || m === 'wan_router') {
        return NETWORK_3D_TEXTURES.multwan_router;
    }
    if (m === 'network_switch' || m === 'switch' || m === 'managed_switch') {
        return NETWORK_3D_TEXTURES.network_switch;
    }
    if (m === 'laptop' || m === 'cs_laptop' || m === 'workstation_laptop') {
        return NETWORK_3D_TEXTURES.laptop;
    }
    if (m === 'ip_panel' || m === 'patch_panel' || m === 'ip_patch_panel') {
        return NETWORK_3D_TEXTURES.ip_panel;
    }
    return null;
}
