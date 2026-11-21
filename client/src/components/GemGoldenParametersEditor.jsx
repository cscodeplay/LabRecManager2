'use client';

import React from 'react';
import { Sparkles, RefreshCw, FileText, Check, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const ITEM_TYPE_CONFIG = {
    pc: { label: 'Desktop Computer / All-in-One', icon: '🖥️' },
    laptop: { label: 'Laptop / Notebook', icon: '💻' },
    interactive_panel: { label: 'Interactive Flat Panel (Smart Board)', icon: '📺' },
    printer: { label: 'Printer / Multifunction Scanner', icon: '🖨️' },
    router: { label: 'Network Switch / WiFi Router', icon: '🌐' },
    projector: { label: 'Multimedia Projector', icon: '📽️' },
    tablet: { label: 'Tablet / Digital Slate', icon: '📱' },
    lab_equipment: { label: 'Lab Instrument / Equipment', icon: '🔬' },
    furniture: { label: 'Computer Table / Lab Furniture', icon: '🪑' },
    other: { label: 'Other Hardware / Supplies', icon: '📦' }
};

export const GEM_GOLDEN_PARAMETERS_CONFIG = {
    pc: [
        { key: 'processorMake', label: 'Processor Make / Gen', default: 'Intel Core i5 (13th Gen) / AMD Ryzen 5' },
        { key: 'ram', label: 'RAM Size & Speed', default: '16 GB DDR5 4800 MHz' },
        { key: 'storage', label: 'Primary Storage', default: '512 GB PCIe NVMe M.2 SSD' },
        { key: 'os', label: 'Operating System', default: 'Windows 11 Pro 64-bit Pre-activated' },
        { key: 'display', label: 'Monitor / Display', default: '23.8 inch Full HD (1920x1080) IPS Anti-glare' },
        { key: 'graphics', label: 'Graphics', default: 'Integrated Intel UHD / Iris Xe Graphics' },
        { key: 'connectivity', label: 'Ports & Networking', default: 'Gigabit Ethernet, Wi-Fi 6, BT 5.2, 4x USB 3.2, HDMI' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, Energy Star, RoHS, ISO 9001' },
        { key: 'warranty', label: 'OEM Warranty', default: '3 Years Comprehensive On-site OEM Warranty' }
    ],
    laptop: [
        { key: 'processorMake', label: 'Processor Make / Gen', default: 'Intel Core i5 (12th/13th Gen) / AMD Ryzen 5' },
        { key: 'ram', label: 'RAM Size', default: '16 GB DDR4/DDR5' },
        { key: 'storage', label: 'Storage', default: '512 GB NVMe SSD' },
        { key: 'display', label: 'Display Size & Panel', default: '15.6 inch Full HD (1920x1080) IPS Anti-Glare' },
        { key: 'battery', label: 'Battery Capacity', default: '3-Cell 45Wh+ (Minimum 6-8 Hours)' },
        { key: 'weight', label: 'Weight', default: '< 1.7 kg Slim & Lightweight' },
        { key: 'os', label: 'Operating System', default: 'Windows 11 Home/Pro 64-bit' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, Energy Star, EPEAT' },
        { key: 'warranty', label: 'Warranty', default: '1 to 3 Years Comprehensive On-site' }
    ],
    interactive_panel: [
        { key: 'screenSize', label: 'Display Size & Resolution', default: '75 inch (190.5 cm) 4K UHD 3840x2160 D-LED' },
        { key: 'touchTech', label: 'Touch Technology', default: 'Zero-Gap 20-Point Multi-touch Infrared Sensing' },
        { key: 'glassProtection', label: 'Surface Glass', default: '4mm Toughened Anti-Glare 7H Mohs Hardness' },
        { key: 'brightnessContrast', label: 'Brightness & Contrast', default: '400 cd/m², 4000:1 Static Contrast' },
        { key: 'builtinOS', label: 'Embedded Android OS', default: 'Android 13 / 14 with 8GB RAM + 128GB Internal Storage' },
        { key: 'opsPC', label: 'OPS PC Module', default: 'Intel Core i5, 16GB RAM, 256GB SSD, Windows 11 Pre-installed' },
        { key: 'audioMic', label: 'Audio & Mic Array', default: 'Dual 20W Front Speakers + 8-Array Beamforming Mic' },
        { key: 'connectivity', label: 'Ports & I/O', default: '3x HDMI 2.0 In, 1x HDMI Out, 2x USB-C (65W PD), 4x USB 3.0, Dual LAN RJ45, Wi-Fi 6' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, CE, FCC, RoHS, ISO 9001' },
        { key: 'warranty', label: 'Warranty', default: '3 Years Comprehensive Onsite Replacement' }
    ],
    printer: [
        { key: 'printTech', label: 'Printing Technology', default: 'Monochrome / Color Laser or High-yield Ink Tank' },
        { key: 'functionality', label: 'Functionality', default: 'Print, Scan, Copy (All-in-One)' },
        { key: 'printSpeed', label: 'Print Speed', default: '28–35 PPM (Pages Per Minute) A4' },
        { key: 'duplex', label: 'Duplex Printing', default: 'Automatic Two-Sided Printing (Auto Duplex)' },
        { key: 'connectivity', label: 'Interface', default: 'Hi-Speed USB 2.0, Ethernet 10/100, Wi-Fi Direct' },
        { key: 'dutyCycle', label: 'Monthly Duty Cycle', default: 'Up to 25,000 pages per month' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, Energy Star, RoHS' },
        { key: 'warranty', label: 'Warranty', default: '1 Year Onsite Manufacturer Warranty' }
    ],
    router: [
        { key: 'switchType', label: 'Device Category', default: 'Layer 2 Managed Gigabit PoE+ Switch / Dual-Band Wi-Fi 6 Router' },
        { key: 'ports', label: 'Port Configuration', default: '24x 10/100/1000 Mbps RJ45 + 4x 10G SFP+ Uplink Ports' },
        { key: 'poeBudget', label: 'PoE Power Budget', default: '370W PoE+ (IEEE 802.3at/af)' },
        { key: 'throughput', label: 'Switching Capacity', default: '128 Gbps non-blocking throughput' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, CE, FCC, RoHS' },
        { key: 'warranty', label: 'Warranty', default: 'Lifetime / 3 Years Advance Hardware Replacement' }
    ],
    projector: [
        { key: 'projectionTech', label: 'Projection Technology', default: 'DLP / 3LCD Laser Light Source' },
        { key: 'resolution', label: 'Native Resolution', default: 'Full HD 1080p (1920x1080) / WXGA' },
        { key: 'lumens', label: 'Brightness', default: '4,000 to 5,000 ANSI Lumens' },
        { key: 'lampLife', label: 'Light Source Life', default: '20,000+ Hours (Laser Eco Mode)' },
        { key: 'connectivity', label: 'Ports', default: '2x HDMI, VGA, Audio In/Out, USB-A, LAN' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, Energy Star, CE' },
        { key: 'warranty', label: 'Warranty', default: '3 Years on Projector, 3 Years / 10,000 Hrs on Light Source' }
    ],
    tablet: [
        { key: 'processorMake', label: 'Processor', default: 'Octa-core 2.4 GHz High Performance Processor' },
        { key: 'ramStorage', label: 'RAM & Storage', default: '6GB RAM + 128GB Storage (MicroSD expandable to 1TB)' },
        { key: 'screenSize', label: 'Display Size & Panel', default: '10.5 to 11.0 inch 2K WUXGA+ Display' },
        { key: 'battery', label: 'Battery Capacity', default: '7040 mAh+ with Fast Charging' },
        { key: 'stylus', label: 'Stylus / Pen Support', default: 'Active Stylus / S-Pen Included' },
        { key: 'connectivity', label: 'Connectivity', default: 'Wi-Fi 5/6 + 4G/5G LTE Optional' },
        { key: 'certifications', label: 'Certifications', default: 'BIS, CE, RoHS' },
        { key: 'warranty', label: 'Warranty', default: '1 Year Comprehensive Onsite Warranty' }
    ],
    lab_equipment: [
        { key: 'instrumentType', label: 'Instrument Classification', default: 'Digital Storage Oscilloscope / Function Generator' },
        { key: 'measRange', label: 'Bandwidth / Range', default: 'Dual Channel 100 MHz, 1 GSa/s Real-time Sampling' },
        { key: 'accuracy', label: 'Measurement Accuracy', default: '±1.5% to ±2% Reading Accuracy' },
        { key: 'display', label: 'Display Panel', default: '7 inch Color TFT LCD Display' },
        { key: 'calibration', label: 'Calibration & Standards', default: 'Factory Calibrated with NABL / ISO 17025 Traceable Certificate' },
        { key: 'certifications', label: 'Certifications', default: 'CE, ISO 9001, IEC 61010-1 Safety Compliant' },
        { key: 'warranty', label: 'Warranty', default: '3 Years Comprehensive Warranty' }
    ],
    furniture: [
        { key: 'material', label: 'Material & Construction', default: 'CRCA Steel Frame (18-20 Gauge) with Pre-laminated Particle Board (25mm)' },
        { key: 'dimensions', label: 'Dimensions (L x W x H)', default: '1200mm x 600mm x 750mm' },
        { key: 'features', label: 'Design Features', default: 'Integrated CPU Trolley, Keyboard Slider with Ball Bearings, Cable Raceway' },
        { key: 'certifications', label: 'Certifications', default: 'BIFMA Compliant, GreenGuard, ISO 9001' },
        { key: 'warranty', label: 'Warranty', default: '1 Year Comprehensive Warranty' }
    ],
    other: [
        { key: 'technicalStandard', label: 'Standard / Compliance', default: 'IS / BIS / ISO Standard Compliant' },
        { key: 'buildQuality', label: 'Build Quality / Grade', default: 'Commercial / Industrial Grade' },
        { key: 'certifications', label: 'Quality Certifications', default: 'OEM Manufacturer ISO 9001 / CE Certified' },
        { key: 'warranty', label: 'Warranty', default: '1 Year Replacement Warranty' }
    ]
};

export default function GemGoldenParametersEditor({
    itemType = 'pc',
    value = {},
    onChange,
    onSyncToSpecs
}) {
    const config = GEM_GOLDEN_PARAMETERS_CONFIG[itemType] || GEM_GOLDEN_PARAMETERS_CONFIG.other;

    const handleParamChange = (key, val) => {
        onChange({
            ...value,
            [key]: val
        });
    };

    const handleAutofillBenchmark = () => {
        const defaults = {};
        config.forEach(p => {
            defaults[p.key] = p.default;
        });
        onChange(defaults);
        toast.success(`Loaded GeM benchmark parameters for ${ITEM_TYPE_CONFIG[itemType]?.label || itemType}`);
    };

    const handleGenerateNarrative = () => {
        const lines = config
            .map(p => {
                const val = value[p.key] || p.default;
                return val ? `• ${p.label}: ${val}` : null;
            })
            .filter(Boolean);

        if (lines.length === 0) {
            toast.error('No parameters to sync');
            return;
        }

        const narrative = lines.join('\n');
        if (onSyncToSpecs) {
            onSyncToSpecs(narrative);
            toast.success('Synced Golden Parameters to Specifications');
        }
    };

    return (
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/80 dark:border-amber-800/60">
                <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                        <ShieldCheck className="w-4 h-4" />
                    </span>
                    <div>
                        <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            GeM Golden Parameters ({ITEM_TYPE_CONFIG[itemType]?.label || 'Category Standard'})
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                                GeM Marketplace
                            </span>
                        </div>
                        <div className="text-[11px] text-amber-700/80 dark:text-amber-400">
                            Key benchmark technical parameters for apples-to-apples vendor comparison
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={handleAutofillBenchmark}
                        title="Auto-fill government benchmark parameters"
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 transition shadow-2xs"
                    >
                        <Sparkles className="w-3 h-3" /> Auto-fill GeM Standards
                    </button>
                    {onSyncToSpecs && (
                        <button
                            type="button"
                            onClick={handleGenerateNarrative}
                            title="Generate bulleted technical specifications from these parameters"
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 flex items-center gap-1 transition shadow-2xs"
                        >
                            <FileText className="w-3 h-3 text-indigo-500" /> Sync to Specs
                        </button>
                    )}
                </div>
            </div>

            {/* Grid of Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {config.map(param => (
                    <div key={param.key} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200/60 dark:border-slate-800">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            {param.label}
                        </label>
                        <input
                            type="text"
                            placeholder={param.default}
                            value={value[param.key] ?? ''}
                            onChange={e => handleParamChange(param.key, e.target.value)}
                            className="input text-xs py-1 px-2 w-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
