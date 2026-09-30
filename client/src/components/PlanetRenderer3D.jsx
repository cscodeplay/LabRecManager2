'use client';

import React, { useRef, useEffect, useCallback } from 'react';

/**
 * High-Detail Real 3D Planet Renderer
 * Renders photorealistic rotating celestial bodies (Sun, Earth, Moon, Mars, Jupiter, Saturn, Neptune)
 * with authentic surface geography, atmospheric glow, specular reflection, and 3D ring systems.
 */
export default function PlanetRenderer3D({
    modelType = 'earth',
    width = 220,
    height = 220,
    rotX = -25,
    rotY = 45,
    rotZ = 0,
    lightPreset = 'default'
}) {
    const canvasRef = useRef(null);

    // Procedural surface generator cache to prevent re-generating texture maps on every frame
    const textureCacheRef = useRef({});

    // Generate high-resolution equirectangular planetary texture map (512x256)
    const getPlanetTexture = useCallback((type) => {
        if (textureCacheRef.current[type]) {
            return textureCacheRef.current[type];
        }

        const texW = 512;
        const texH = 256;
        const canvas = document.createElement('canvas');
        canvas.width = texW;
        canvas.height = texH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.createImageData(texW, texH);
        const data = imgData.data;

        // Simple smooth noise helper
        const pseudoNoise = (x, y) => {
            const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            return n - Math.floor(n);
        };

        const smoothNoise = (x, y) => {
            const i = Math.floor(x);
            const j = Math.floor(y);
            const fx = x - i;
            const fy = y - j;
            const sx = fx * fx * (3 - 2 * fx);
            const sy = fy * fy * (3 - 2 * fy);

            const n00 = pseudoNoise(i, j);
            const n10 = pseudoNoise(i + 1, j);
            const n01 = pseudoNoise(i, j + 1);
            const n11 = pseudoNoise(i + 1, j + 1);

            const nx0 = n00 * (1 - sx) + n10 * sx;
            const nx1 = n01 * (1 - sx) + n11 * sx;
            return nx0 * (1 - sy) + nx1 * sy;
        };

        const fbm = (x, y, octaves = 5) => {
            let val = 0;
            let amp = 0.5;
            let freq = 1;
            for (let o = 0; o < octaves; o++) {
                val += smoothNoise(x * freq, y * freq) * amp;
                freq *= 2.05;
                amp *= 0.5;
            }
            return val;
        };

        for (let py = 0; py < texH; py++) {
            const lat = (py / texH - 0.5) * Math.PI; // -pi/2 to pi/2
            const normY = py / texH; // 0 (north) to 1 (south)

            for (let px = 0; px < texW; px++) {
                const lon = (px / texW) * 2 * Math.PI; // 0 to 2pi
                const normX = px / texW; // 0 to 1
                const idx = (py * texW + px) * 4;

                let r = 0, g = 0, b = 0;

                switch (type) {
                    case 'sun': {
                        // Solar surface: turbulent granulation, flare filaments, sunspots
                        const n = fbm(normX * 18, normY * 18, 4);
                        const gran = fbm(normX * 45, normY * 45, 3);
                        // Sunspots
                        const spotNoise = fbm(normX * 8 + 3.2, normY * 8 + 1.7, 3);
                        const isSpot = spotNoise < 0.22 && Math.abs(lat) < 0.6;

                        if (isSpot) {
                            r = 140; g = 40; b = 10; // Dark umbra
                        } else {
                            const val = n * 0.7 + gran * 0.3;
                            r = Math.min(255, 230 + Math.floor(val * 45));
                            g = Math.min(255, 140 + Math.floor(val * 90));
                            b = Math.min(255, 20 + Math.floor(val * 50));
                        }
                        break;
                    }
                    case 'earth': {
                        // Earth: continents, oceans, polar ice caps, swirling white clouds
                        const isPolar = normY < 0.08 || normY > 0.92;
                        if (isPolar) {
                            r = 240; g = 248; b = 255; // Polar Ice Sheet
                        } else {
                            // Continental landmass definition using layered noise
                            const continent = fbm(normX * 5.5, normY * 5.5, 5);
                            // Mountain ridges & deserts
                            const terrain = fbm(normX * 14 + 1.2, normY * 14 + 0.8, 4);

                            if (continent > 0.48) {
                                // Landmass
                                if (terrain > 0.65 || (normY > 0.25 && normY < 0.45 && normX > 0.45 && normX < 0.65)) {
                                    // Arid desert / mountain (Sahara, Himalayas, Rockies)
                                    r = 194; g = 154; b = 108;
                                } else if (terrain > 0.52) {
                                    // Savanna / hills
                                    r = 107; g = 142; b = 35;
                                } else {
                                    // Lush forest / plains
                                    r = 34; g = 120; b = 45;
                                }
                            } else {
                                // Ocean: shallow coastal shelf vs deep abyss
                                const depth = (0.48 - continent) / 0.48;
                                r = Math.floor(10 + (1 - depth) * 15);
                                g = Math.floor(60 + (1 - depth) * 60);
                                b = Math.floor(140 + (1 - depth) * 80);
                            }

                            // Dynamic cloud swirls overlay
                            const cloud = fbm(normX * 8 + 4.5, normY * 8 + 2.1, 4);
                            if (cloud > 0.58) {
                                const cloudAlpha = (cloud - 0.58) / 0.42;
                                r = Math.floor(r * (1 - cloudAlpha) + 250 * cloudAlpha);
                                g = Math.floor(g * (1 - cloudAlpha) + 252 * cloudAlpha);
                                b = Math.floor(b * (1 - cloudAlpha) + 255 * cloudAlpha);
                            }
                        }
                        break;
                    }
                    case 'moon': {
                        // Lunar mare (dark basalt plains) vs bright cratered highlands
                        const mare = fbm(normX * 4.2, normY * 4.2, 4);
                        const crater = fbm(normX * 22, normY * 22, 3);
                        let base = mare > 0.5 ? 90 + Math.floor(crater * 40) : 175 + Math.floor(crater * 55);
                        // Tycho crater rays
                        const ray = Math.sin(normX * 36) * Math.cos(normY * 36);
                        if (ray > 0.8) base = Math.min(240, base + 45);
                        r = base; g = base; b = base + 5;
                        break;
                    }
                    case 'mars': {
                        // Rust-red terrain, dark volcanic provinces, bright polar caps
                        if (normY < 0.09) {
                            r = 245; g = 245; b = 250; // North Polar Ice Cap
                        } else {
                            const rock = fbm(normX * 6, normY * 6, 5);
                            const darkShield = fbm(normX * 3.5 + 2.0, normY * 3.5 + 1.0, 3);
                            if (darkShield > 0.58) {
                                // Dark volcanic regions (Syrtis Major, Acidalia)
                                r = 110; g = 55; b = 35;
                            } else {
                                // Iron-oxide dust deserts (Tharsis, Elysium)
                                const varC = Math.floor(rock * 45);
                                r = Math.min(255, 195 + varC);
                                g = Math.min(255, 80 + Math.floor(varC * 0.6));
                                b = Math.min(255, 45 + Math.floor(varC * 0.3));
                            }
                        }
                        break;
                    }
                    case 'jupiter': {
                        // 10+ distinct horizontal banded jet streams and the Great Red Spot
                        const bandNoise = fbm(normX * 20, normY * 3, 3) * 0.08;
                        const bandY = normY + bandNoise;
                        const bandIdx = Math.floor(bandY * 14) % 14;

                        // Great Red Spot located around normY = 0.62, normX = 0.55
                        const dx = (normX - 0.55) * 4.0;
                        const dy = (normY - 0.62) * 8.0;
                        const distToSpot = Math.sqrt(dx * dx + dy * dy);

                        if (distToSpot < 0.28) {
                            // Great Red Spot swirling storm
                            const spotSwirl = Math.sin(distToSpot * 22);
                            r = 210 + Math.floor(spotSwirl * 25);
                            g = 65 + Math.floor(spotSwirl * 20);
                            b = 40 + Math.floor(spotSwirl * 15);
                        } else {
                            const eddy = fbm(normX * 16, normY * 16, 3);
                            const isDarkBelt = [1, 3, 5, 8, 10, 12].includes(bandIdx);
                            if (isDarkBelt) {
                                // Reddish-brown belts
                                r = 175 + Math.floor(eddy * 30);
                                g = 95 + Math.floor(eddy * 20);
                                b = 55 + Math.floor(eddy * 15);
                            } else {
                                // Warm creamy white/amber zones
                                r = 240 + Math.floor(eddy * 15);
                                g = 215 + Math.floor(eddy * 20);
                                b = 175 + Math.floor(eddy * 20);
                            }
                        }
                        break;
                    }
                    case 'saturn': {
                        // Soft golden-butterscotch banded clouds
                        const bandNoise = fbm(normX * 12, normY * 2, 2) * 0.04;
                        const bandY = normY + bandNoise;
                        const bandIdx = Math.floor(bandY * 16) % 16;
                        const eddy = fbm(normX * 8, normY * 8, 2);

                        const isDark = [2, 4, 7, 11, 14].includes(bandIdx);
                        if (isDark) {
                            r = 205 + Math.floor(eddy * 20);
                            g = 165 + Math.floor(eddy * 15);
                            b = 95 + Math.floor(eddy * 15);
                        } else {
                            r = 240 + Math.floor(eddy * 15);
                            g = 210 + Math.floor(eddy * 15);
                            b = 135 + Math.floor(eddy * 20);
                        }
                        break;
                    }
                    case 'neptune': {
                        // Deep azure blue ice giant with methane cirrus clouds and Great Dark Spot
                        const bandNoise = fbm(normX * 10, normY * 2.5, 3) * 0.05;
                        const bandY = normY + bandNoise;
                        const eddy = fbm(normX * 12, normY * 12, 3);

                        // Great Dark Spot
                        const ddx = (normX - 0.4) * 4.5;
                        const ddy = (normY - 0.48) * 8.0;
                        const isDarkSpot = Math.sqrt(ddx * ddx + ddy * ddy) < 0.22;

                        if (isDarkSpot) {
                            r = 20; g = 50; b = 140;
                        } else {
                            r = 35 + Math.floor(eddy * 25);
                            g = 95 + Math.floor(eddy * 35);
                            b = 215 + Math.floor(eddy * 35);

                            // White methane cloud streaks
                            if (fbm(normX * 20, normY * 20, 2) > 0.72) {
                                r = Math.min(255, r + 130);
                                g = Math.min(255, g + 120);
                                b = Math.min(255, b + 50);
                            }
                        }
                        break;
                    }
                    default: {
                        r = 60; g = 130; b = 240;
                    }
                }

                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        textureCacheRef.current[type] = canvas;
        return canvas;
    }, []);

    // Render the 3D sphere with spherical ray projection, atmosphere, and lighting
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        const renderW = Math.round(width * dpr);
        const renderH = Math.round(height * dpr);

        if (canvas.width !== renderW || canvas.height !== renderH) {
            canvas.width = renderW;
            canvas.height = renderH;
        }

        ctx.clearRect(0, 0, renderW, renderH);

        const cx = renderW / 2;
        const cy = renderH / 2;
        const sphereR = (Math.min(renderW, renderH) / 2) * 0.76;

        const mType = modelType.toLowerCase();
        const textureCanvas = getPlanetTexture(mType);
        const texW = textureCanvas.width;
        const texH = textureCanvas.height;
        const texCtx = textureCanvas.getContext('2d');
        const texData = texCtx.getImageData(0, 0, texW, texH).data;

        // 3D rotation angles in radians
        const radX = (rotX * Math.PI) / 180;
        const radY = (rotY * Math.PI) / 180;
        const radZ = (rotZ * Math.PI) / 180;

        const cosX = Math.cos(radX), sinX = Math.sin(radX);
        const cosY = Math.cos(radY), sinY = Math.sin(radY);
        const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);

        // Light direction vector
        let lx = 0.55, ly = -0.65, lz = 0.52;
        if (lightPreset === 'top') { lx = 0.1; ly = -0.95; lz = 0.3; }
        else if (lightPreset === 'flat') { lx = 0.0; ly = 0.0; lz = 1.0; }
        const lightLen = Math.hypot(lx, ly, lz) || 1;
        lx /= lightLen; ly /= lightLen; lz /= lightLen;

        // 1. Atmosphere / Celestial Outer Glow
        const atmosphereGrad = ctx.createRadialGradient(cx, cy, sphereR * 0.85, cx, cy, sphereR * 1.25);
        if (mType === 'earth') {
            atmosphereGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
            atmosphereGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.18)');
            atmosphereGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        } else if (mType === 'sun') {
            atmosphereGrad.addColorStop(0, 'rgba(251, 191, 36, 0.65)');
            atmosphereGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)');
            atmosphereGrad.addColorStop(0.8, 'rgba(234, 88, 12, 0.15)');
            atmosphereGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');
        } else if (mType === 'neptune') {
            atmosphereGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
            atmosphereGrad.addColorStop(0.7, 'rgba(14, 165, 233, 0.12)');
            atmosphereGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        } else if (mType === 'saturn') {
            atmosphereGrad.addColorStop(0, 'rgba(253, 224, 71, 0.25)');
            atmosphereGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.08)');
            atmosphereGrad.addColorStop(1, 'rgba(202, 138, 4, 0)');
        } else if (mType === 'mars') {
            atmosphereGrad.addColorStop(0, 'rgba(249, 115, 22, 0.3)');
            atmosphereGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.1)');
            atmosphereGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');
        } else {
            atmosphereGrad.addColorStop(0, 'rgba(148, 163, 184, 0.15)');
            atmosphereGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
        }

        ctx.fillStyle = atmosphereGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, sphereR * 1.25, 0, Math.PI * 2);
        ctx.fill();

        // 2. Render Saturn's Back Rings (Behind Planet)
        if (mType === 'saturn') {
            renderSaturnRings(ctx, cx, cy, sphereR, radX, radY, true);
        }

        // 3. Render 3D Sphere Surface with Pixel Raycasting
        const sphereImgData = ctx.createImageData(renderW, renderH);
        const pixels = sphereImgData.data;

        const minPx = Math.max(0, Math.floor(cx - sphereR));
        const maxPx = Math.min(renderW - 1, Math.ceil(cx + sphereR));
        const minPy = Math.max(0, Math.floor(cy - sphereR));
        const maxPy = Math.min(renderH - 1, Math.ceil(cy + sphereR));

        const rSq = sphereR * sphereR;

        for (let py = minPy; py <= maxPy; py++) {
            const dy = py - cy;
            const dySq = dy * dy;
            const pRow = py * renderW;

            for (let px = minPx; px <= maxPx; px++) {
                const dx = px - cx;
                const distSq = dx * dx + dySq;
                if (distSq > rSq) continue;

                const dz = Math.sqrt(rSq - distSq);

                // Normal on unit sphere
                const nx = dx / sphereR;
                const ny = dy / sphereR;
                const nz = dz / sphereR;

                // Rotate normal by 3D trackball rotation (rotX, rotY, rotZ)
                // 1. Z rotation
                const x1 = nx * cosZ - ny * sinZ;
                const y1 = nx * sinZ + ny * cosZ;
                const z1 = nz;

                // 2. X rotation
                const x2 = x1;
                const y2 = y1 * cosX - z1 * sinX;
                const z2 = y1 * sinX + z1 * cosX;

                // 3. Y rotation
                const wx = x2 * cosY + z2 * sinY;
                const wy = y2;
                const wz = -x2 * sinY + z2 * cosY;

                // Spherical coordinates -> texture UV
                const phi = Math.atan2(wx, wz); // -PI to PI
                const theta = Math.asin(Math.max(-1, Math.min(1, -wy))); // -PI/2 to PI/2

                let u = (phi / (2 * Math.PI) + 0.5) % 1.0;
                if (u < 0) u += 1.0;
                let v = (theta / Math.PI + 0.5);
                v = Math.max(0, Math.min(0.999, v));

                const tx = Math.floor(u * texW);
                const ty = Math.floor(v * texH);
                const tIdx = (ty * texW + tx) * 4;

                let pr = texData[tIdx];
                let pg = texData[tIdx + 1];
                let pb = texData[tIdx + 2];

                // Diffuse Lighting Intensity
                const dot = nx * lx + ny * ly + nz * lz;
                const isSun = mType === 'sun';
                const diffuse = isSun ? 1.0 : Math.max(0.12, dot);

                // Limb Darkening / Fresnel Rim Atmosphere
                const limb = 1.0 - nz; // 0 at center, 1 at edge
                const fresnel = Math.pow(limb, 3.2);

                let fr = pr * diffuse;
                let fg = pg * diffuse;
                let fb = pb * diffuse;

                // Atmospheric rim scattering
                if (mType === 'earth') {
                    fr = fr * (1 - fresnel * 0.6) + 56 * fresnel;
                    fg = fg * (1 - fresnel * 0.6) + 189 * fresnel;
                    fb = fb * (1 - fresnel * 0.6) + 248 * fresnel;
                } else if (mType === 'sun') {
                    // Corona edge brightening
                    fr = Math.min(255, fr + fresnel * 70);
                    fg = Math.min(255, fg + fresnel * 50);
                    fb = Math.min(255, fb + fresnel * 20);
                } else if (mType === 'neptune') {
                    fr = fr * (1 - fresnel * 0.5) + 38 * fresnel;
                    fg = fg * (1 - fresnel * 0.5) + 180 * fresnel;
                    fb = fb * (1 - fresnel * 0.5) + 250 * fresnel;
                }

                // Specular sunglint on Earth oceans
                if (mType === 'earth' && dot > 0.45 && pb > pr + 40) {
                    const hx = lx, hy = ly, hz = lz + 1.0;
                    const hLen = Math.hypot(hx, hy, hz) || 1;
                    const specDot = Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen);
                    const spec = Math.pow(specDot, 24) * 160;
                    fr = Math.min(255, fr + spec);
                    fg = Math.min(255, fg + spec);
                    fb = Math.min(255, fb + spec);
                }

                const pIdx = (pRow + px) * 4;
                pixels[pIdx] = Math.min(255, Math.round(fr));
                pixels[pIdx + 1] = Math.min(255, Math.round(fg));
                pixels[pIdx + 2] = Math.min(255, Math.round(fb));
                pixels[pIdx + 3] = 255;
            }
        }

        ctx.putImageData(sphereImgData, 0, 0);

        // 4. Render Saturn's Front Rings (In front of Planet)
        if (mType === 'saturn') {
            renderSaturnRings(ctx, cx, cy, sphereR, radX, radY, false);
        }

        // 5. Sun Coronal Solar Prominences & Flare Rays
        if (mType === 'sun') {
            renderSunCoronaFlares(ctx, cx, cy, sphereR, rotY);
        }

    }, [modelType, width, height, rotX, rotY, rotZ, lightPreset, getPlanetTexture]);

    // Renders Saturn's 3D Concentric Rings with Cassini Division and perspective
    const renderSaturnRings = (ctx, cx, cy, r, radX, radY, isBack) => {
        ctx.save();
        ctx.translate(cx, cy);

        // Ring tilt perspective
        const ringTilt = Math.sin(radX) * 0.38 + 0.22;
        const rInner = r * 1.25;
        const rCassiniInner = r * 1.55;
        const rCassiniOuter = r * 1.62;
        const rOuter = r * 2.05;

        // Clip to render only back or only front half of rings
        ctx.beginPath();
        if (isBack) {
            ctx.rect(-rOuter * 1.2, -rOuter * 1.2, rOuter * 2.4, rOuter * 1.2);
        } else {
            ctx.rect(-rOuter * 1.2, 0, rOuter * 2.4, rOuter * 1.2);
        }
        ctx.clip();

        // Inner C Ring / Crepe Ring
        ctx.beginPath();
        ctx.ellipse(0, 0, rCassiniInner, rCassiniInner * Math.abs(ringTilt), 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0, rInner, rInner * Math.abs(ringTilt), 0, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.45)';
        ctx.fill();

        // Bright B Ring (Inner to Cassini)
        ctx.beginPath();
        ctx.ellipse(0, 0, rCassiniInner, rCassiniInner * Math.abs(ringTilt), 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0, rInner * 1.08, rInner * 1.08 * Math.abs(ringTilt), 0, 0, Math.PI * 2, true);
        const bRingGrad = ctx.createRadialGradient(0, 0, rInner * 1.1, 0, 0, rCassiniInner);
        bRingGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        bRingGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.9)');
        bRingGrad.addColorStop(1, 'rgba(234, 179, 8, 0.8)');
        ctx.fillStyle = bRingGrad;
        ctx.fill();

        // Outer A Ring (Outside Cassini gap)
        ctx.beginPath();
        ctx.ellipse(0, 0, rOuter, rOuter * Math.abs(ringTilt), 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0, rCassiniOuter, rCassiniOuter * Math.abs(ringTilt), 0, 0, Math.PI * 2, true);
        const aRingGrad = ctx.createRadialGradient(0, 0, rCassiniOuter, 0, 0, rOuter);
        aRingGrad.addColorStop(0, 'rgba(250, 204, 21, 0.75)');
        aRingGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.65)');
        aRingGrad.addColorStop(1, 'rgba(202, 138, 4, 0.3)');
        ctx.fillStyle = aRingGrad;
        ctx.fill();

        // Dark Cassini Division stroke
        ctx.beginPath();
        ctx.ellipse(0, 0, (rCassiniInner + rCassiniOuter) / 2, ((rCassiniInner + rCassiniOuter) / 2) * Math.abs(ringTilt), 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = Math.max(1.5, r * 0.035);
        ctx.stroke();

        ctx.restore();
    };

    // Renders radiant Sun coronal flares and loops
    const renderSunCoronaFlares = (ctx, cx, cy, r, rotY) => {
        ctx.save();
        ctx.translate(cx, cy);

        const flareCount = 12;
        const spinOffset = (rotY * Math.PI) / 180;

        for (let i = 0; i < flareCount; i++) {
            const angle = (i / flareCount) * Math.PI * 2 + spinOffset * 0.2;
            const flareLen = r * (0.15 + (i % 3 === 0 ? 0.25 : (i % 2 === 0 ? 0.18 : 0.1)));

            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            const xStart = cosA * (r * 0.98);
            const yStart = sinA * (r * 0.98);
            const xEnd = cosA * (r + flareLen);
            const yEnd = sinA * (r + flareLen);

            const grad = ctx.createLinearGradient(xStart, yStart, xEnd, yEnd);
            grad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
            grad.addColorStop(0.4, 'rgba(249, 115, 22, 0.7)');
            grad.addColorStop(1, 'rgba(234, 88, 12, 0)');

            ctx.beginPath();
            ctx.moveTo(xStart, yStart);
            ctx.lineTo(xEnd, yEnd);
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(2, r * 0.05);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.restore();
    };

    return (
        <canvas
            ref={canvasRef}
            style={{ width: `${width}px`, height: `${height}px` }}
            className="w-full h-full pointer-events-none drop-shadow-2xl"
        />
    );
}
