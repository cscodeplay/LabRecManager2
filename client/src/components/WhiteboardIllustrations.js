/**
 * Whiteboard Vector Illustration Library
 * Provides high-quality scalable vector SVG illustrations for AI whiteboard drawing commands
 * (e.g. "draw a cat", "draw a dog", "draw a car", "draw a house", "draw an apple", etc.)
 */

export const ILLUSTRATIONS = {
    cat: {
        title: 'Cat',
        keywords: ['cat', 'kitten', 'kitty', 'feline', 'pussycat', 'meow'],
        width: 280,
        height: 280,
        svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="catGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
    <radialGradient id="catEye" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </radialGradient>
  </defs>
  <!-- Tail -->
  <path d="M 210,230 Q 270,220 265,160 Q 260,110 235,115 Q 230,135 245,155 Q 248,190 205,210" fill="#f59e0b" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
  <!-- Body -->
  <path d="M 95,200 C 70,250 85,275 150,275 C 215,275 230,250 205,200 C 190,165 110,165 95,200 Z" fill="url(#catGrad)" stroke="#b45309" stroke-width="4.5"/>
  <!-- Belly -->
  <ellipse cx="150" cy="235" rx="38" ry="32" fill="#fffbeb" opacity="0.9"/>
  <!-- Left Ear -->
  <polygon points="80,120 70,45 125,85" fill="#f59e0b" stroke="#b45309" stroke-width="4.5" stroke-linejoin="round"/>
  <polygon points="85,110 78,58 118,84" fill="#fda4af"/>
  <!-- Right Ear -->
  <polygon points="220,120 230,45 175,85" fill="#f59e0b" stroke="#b45309" stroke-width="4.5" stroke-linejoin="round"/>
  <polygon points="215,110 222,58 182,84" fill="#fda4af"/>
  <!-- Head -->
  <ellipse cx="150" cy="130" rx="72" ry="58" fill="url(#catGrad)" stroke="#b45309" stroke-width="4.5"/>
  <!-- Cheeks / Blush -->
  <ellipse cx="102" cy="148" rx="14" ry="8" fill="#f43f5e" opacity="0.35"/>
  <ellipse cx="198" cy="148" rx="14" ry="8" fill="#f43f5e" opacity="0.35"/>
  <!-- Eyes -->
  <ellipse cx="118" cy="125" rx="14" ry="17" fill="url(#catEye)" stroke="#064e3b" stroke-width="2"/>
  <ellipse cx="118" cy="125" rx="6" ry="14" fill="#0f172a"/>
  <circle cx="114" cy="119" r="4.5" fill="#ffffff"/>
  <circle cx="122" cy="129" r="2" fill="#ffffff"/>
  <ellipse cx="182" cy="125" rx="14" ry="17" fill="url(#catEye)" stroke="#064e3b" stroke-width="2"/>
  <ellipse cx="182" cy="125" rx="6" ry="14" fill="#0f172a"/>
  <circle cx="178" cy="119" r="4.5" fill="#ffffff"/>
  <circle cx="186" cy="129" r="2" fill="#ffffff"/>
  <!-- Nose -->
  <polygon points="150,140 142,148 158,148" fill="#f43f5e" stroke="#e11d48" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- Mouth -->
  <path d="M 142,148 Q 150,158 150,150 Q 150,158 158,148" fill="none" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
  <!-- Whiskers -->
  <line x1="60" y1="138" x2="120" y2="144" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="55" y1="150" x2="118" y2="150" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="60" y1="162" x2="120" y2="156" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="240" y1="138" x2="180" y2="144" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="245" y1="150" x2="182" y2="150" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="240" y1="162" x2="180" y2="156" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Paws -->
  <ellipse cx="120" cy="272" rx="16" ry="10" fill="#fed7aa" stroke="#b45309" stroke-width="3"/>
  <ellipse cx="180" cy="272" rx="16" ry="10" fill="#fed7aa" stroke="#b45309" stroke-width="3"/>
  <line x1="115" y1="268" x2="115" y2="276" stroke="#b45309" stroke-width="2"/>
  <line x1="125" y1="268" x2="125" y2="276" stroke="#b45309" stroke-width="2"/>
  <line x1="175" y1="268" x2="175" y2="276" stroke="#b45309" stroke-width="2"/>
  <line x1="185" y1="268" x2="185" y2="276" stroke="#b45309" stroke-width="2"/>
</svg>`
    },
    dog: {
        title: 'Dog',
        keywords: ['dog', 'puppy', 'pup', 'canine', 'hound'],
        width: 280,
        height: 280,
        svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dogBody" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </radialGradient>
  </defs>
  <!-- Tail -->
  <path d="M 215,220 Q 275,200 270,140 Q 255,145 250,170 Q 240,200 205,215" fill="#ea580c" stroke="#9a3412" stroke-width="4" stroke-linecap="round"/>
  <!-- Body -->
  <ellipse cx="150" cy="225" rx="65" ry="50" fill="url(#dogBody)" stroke="#9a3412" stroke-width="4"/>
  <ellipse cx="150" cy="235" rx="40" ry="32" fill="#fff7ed"/>
  <!-- Ears -->
  <path d="M 90,95 Q 60,110 65,175 Q 85,190 98,150 Z" fill="#c2410c" stroke="#9a3412" stroke-width="4"/>
  <path d="M 210,95 Q 240,110 235,175 Q 215,190 202,150 Z" fill="#c2410c" stroke="#9a3412" stroke-width="4"/>
  <!-- Head -->
  <ellipse cx="150" cy="120" rx="65" ry="55" fill="url(#dogBody)" stroke="#9a3412" stroke-width="4"/>
  <!-- Eyes -->
  <ellipse cx="125" cy="110" rx="9" ry="12" fill="#0f172a"/>
  <circle cx="122" cy="106" r="3.5" fill="#ffffff"/>
  <ellipse cx="175" cy="110" rx="9" ry="12" fill="#0f172a"/>
  <circle cx="172" cy="106" r="3.5" fill="#ffffff"/>
  <!-- Muzzle -->
  <ellipse cx="150" cy="142" rx="28" ry="20" fill="#fff7ed" stroke="#9a3412" stroke-width="2.5"/>
  <ellipse cx="150" cy="132" rx="14" ry="10" fill="#0f172a"/>
  <circle cx="147" cy="130" r="2.5" fill="#ffffff"/>
  <!-- Mouth and Tongue -->
  <path d="M 142,142 Q 150,148 150,142 Q 150,148 158,142" fill="none" stroke="#7c2d12" stroke-width="2.5"/>
  <path d="M 145,145 C 145,165 155,165 155,145" fill="#f43f5e" stroke="#be123c" stroke-width="2"/>
  <!-- Paws -->
  <ellipse cx="115" cy="265" rx="18" ry="12" fill="#ffedd5" stroke="#9a3412" stroke-width="3"/>
  <ellipse cx="185" cy="265" rx="18" ry="12" fill="#ffedd5" stroke="#9a3412" stroke-width="3"/>
</svg>`
    },
    car: {
        title: 'Sports Car',
        keywords: ['car', 'automobile', 'vehicle', 'motorcar', 'racing car', 'sedan'],
        width: 320,
        height: 200,
        svg: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="carPaint" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bae6fd"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <!-- Car Cabin / Roof -->
  <path d="M 85,115 L 120,65 L 210,65 L 245,115 Z" fill="url(#glass)" stroke="#0f172a" stroke-width="4"/>
  <line x1="165" y1="65" x2="165" y2="115" stroke="#0f172a" stroke-width="3.5"/>
  <!-- Car Body Chassis -->
  <path d="M 30,140 Q 30,115 65,115 L 260,115 Q 295,115 295,145 L 290,160 L 25,160 Z" fill="url(#carPaint)" stroke="#991b1b" stroke-width="4.5" stroke-linejoin="round"/>
  <!-- Headlight & Taillight -->
  <polygon points="285,125 295,125 295,138 285,135" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>
  <rect x="25" y="125" width="10" height="12" rx="2" fill="#ef4444" stroke="#991b1b" stroke-width="1.5"/>
  <!-- Door Line & Handle -->
  <path d="M 125,115 L 125,155 L 205,155 L 205,115" fill="none" stroke="#7f1d1d" stroke-width="2"/>
  <rect x="135" y="125" width="18" height="5" rx="2" fill="#0f172a"/>
  <!-- Wheel Cutouts & Wheels -->
  <circle cx="85" cy="160" r="28" fill="#1e293b" stroke="#0f172a" stroke-width="4"/>
  <circle cx="85" cy="160" r="15" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
  <circle cx="85" cy="160" r="5" fill="#0f172a"/>
  <circle cx="235" cy="160" r="28" fill="#1e293b" stroke="#0f172a" stroke-width="4"/>
  <circle cx="235" cy="160" r="15" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
  <circle cx="235" cy="160" r="5" fill="#0f172a"/>
  <!-- Ground Shadow -->
  <ellipse cx="160" cy="190" rx="140" ry="6" fill="#0f172a" opacity="0.25"/>
</svg>`
    },
    tree: {
        title: 'Tree',
        keywords: ['tree', 'forest', 'wood', 'plant', 'oak', 'nature'],
        width: 260,
        height: 300,
        svg: `<svg viewBox="0 0 260 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="foliage" cx="40%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#15803d"/>
    </radialGradient>
    <linearGradient id="trunk" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#92400e"/>
      <stop offset="50%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
  </defs>
  <!-- Trunk and Roots -->
  <path d="M 110,160 L 110,270 Q 90,285 75,290 L 185,290 Q 170,285 150,270 L 150,160 Z" fill="url(#trunk)" stroke="#451a03" stroke-width="4"/>
  <!-- Branches -->
  <path d="M 115,180 Q 90,140 70,150 M 145,180 Q 170,140 190,150" fill="none" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>
  <!-- Leafy Canopy -->
  <circle cx="130" cy="90" r="65" fill="url(#foliage)" stroke="#166534" stroke-width="4"/>
  <circle cx="75" cy="130" r="50" fill="url(#foliage)" stroke="#166534" stroke-width="4"/>
  <circle cx="185" cy="130" r="50" fill="url(#foliage)" stroke="#166534" stroke-width="4"/>
  <circle cx="130" cy="140" r="55" fill="url(#foliage)" stroke="#166534" stroke-width="3"/>
  <!-- Red Apples in Tree -->
  <circle cx="90" cy="110" r="8" fill="#ef4444"/>
  <circle cx="155" cy="80" r="8" fill="#ef4444"/>
  <circle cx="170" cy="125" r="8" fill="#ef4444"/>
  <circle cx="115" cy="145" r="8" fill="#ef4444"/>
</svg>`
    },
    house: {
        title: 'House',
        keywords: ['house', 'home', 'building', 'cottage', 'cabin'],
        width: 280,
        height: 280,
        svg: `<svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Chimney with Smoke -->
  <path d="M 195,60 Q 200,45 190,30 Q 210,20 200,10" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
  <rect x="180" y="60" width="30" height="50" fill="#991b1b" stroke="#7f1d1d" stroke-width="3"/>
  <!-- Walls -->
  <rect x="40" y="130" width="200" height="130" rx="4" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
  <!-- Roof -->
  <polygon points="140,40 20,135 260,135" fill="#dc2626" stroke="#991b1b" stroke-width="4.5" stroke-linejoin="round"/>
  <!-- Front Door -->
  <rect x="115" y="180" width="50" height="80" rx="3" fill="#92400e" stroke="#78350f" stroke-width="3"/>
  <circle cx="155" cy="220" r="4" fill="#fde047"/>
  <!-- Left Window -->
  <rect x="60" y="160" width="40" height="40" rx="2" fill="#38bdf8" stroke="#0284c7" stroke-width="3"/>
  <line x1="80" y1="160" x2="80" y2="200" stroke="#0284c7" stroke-width="2"/>
  <line x1="60" y1="180" x2="100" y2="180" stroke="#0284c7" stroke-width="2"/>
  <!-- Right Window -->
  <rect x="180" y="160" width="40" height="40" rx="2" fill="#38bdf8" stroke="#0284c7" stroke-width="3"/>
  <line x1="200" y1="160" x2="200" y2="200" stroke="#0284c7" stroke-width="2"/>
  <line x1="180" y1="180" x2="220" y2="180" stroke="#0284c7" stroke-width="2"/>
  <!-- Attic Window -->
  <circle cx="140" cy="100" r="16" fill="#38bdf8" stroke="#991b1b" stroke-width="3"/>
  <line x1="140" y1="84" x2="140" y2="116" stroke="#991b1b" stroke-width="2"/>
  <line x1="124" y1="100" x2="156" y2="100" stroke="#991b1b" stroke-width="2"/>
</svg>`
    },
    apple: {
        title: 'Apple',
        keywords: ['apple', 'fruit', 'red apple'],
        width: 240,
        height: 250,
        svg: `<svg viewBox="0 0 240 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="appleGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="40%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </radialGradient>
  </defs>
  <!-- Stem -->
  <path d="M 120,70 Q 125,30 145,20" fill="none" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>
  <!-- Green Leaf -->
  <path d="M 125,50 Q 165,35 175,55 Q 150,75 125,50 Z" fill="#22c55e" stroke="#15803d" stroke-width="2.5"/>
  <!-- Apple Body -->
  <path d="M 120,80 C 80,60 30,85 30,145 C 30,205 75,235 120,230 C 165,235 210,205 210,145 C 210,85 160,60 120,80 Z" fill="url(#appleGrad)" stroke="#7f1d1d" stroke-width="4.5"/>
  <!-- Light Highlight -->
  <ellipse cx="75" cy="115" rx="15" ry="25" fill="#ffffff" opacity="0.35" transform="rotate(-25, 75, 115)"/>
</svg>`
    },
    flower: {
        title: 'Flower',
        keywords: ['flower', 'rose', 'sunflower', 'daisy', 'blossom', 'tulip'],
        width: 250,
        height: 290,
        svg: `<svg viewBox="0 0 250 290" xmlns="http://www.w3.org/2000/svg">
  <!-- Stem & Leaves -->
  <path d="M 125,140 Q 120,220 125,280" fill="none" stroke="#16a34a" stroke-width="6" stroke-linecap="round"/>
  <path d="M 122,210 Q 80,190 70,215 Q 100,230 122,215 Z" fill="#22c55e" stroke="#15803d" stroke-width="2.5"/>
  <path d="M 125,180 Q 170,160 180,185 Q 150,200 125,185 Z" fill="#22c55e" stroke="#15803d" stroke-width="2.5"/>
  <!-- Petals -->
  <g transform="translate(125, 125)">
    <circle cx="0" cy="-45" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="32" cy="-32" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="45" cy="0" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="32" cy="32" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="0" cy="45" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="-32" cy="32" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="-45" cy="0" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <circle cx="-32" cy="-32" r="22" fill="#fde047" stroke="#eab308" stroke-width="2"/>
    <!-- Flower Center -->
    <circle cx="0" cy="0" r="26" fill="#ea580c" stroke="#9a3412" stroke-width="3"/>
  </g>
</svg>`
    },
    fish: {
        title: 'Fish',
        keywords: ['fish', 'aquarium', 'sea', 'ocean', 'trout', 'shark', 'goldfish'],
        width: 290,
        height: 220,
        svg: `<svg viewBox="0 0 290 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fishGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="60%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <!-- Tail Fin -->
  <polygon points="210,110 275,50 255,110 275,170" fill="#f97316" stroke="#c2410c" stroke-width="3.5" stroke-linejoin="round"/>
  <!-- Dorsal & Ventral Fins -->
  <path d="M 120,65 Q 150,25 180,65 Z" fill="#f97316" stroke="#c2410c" stroke-width="3"/>
  <path d="M 130,155 Q 155,190 175,155 Z" fill="#f97316" stroke="#c2410c" stroke-width="3"/>
  <!-- Body -->
  <ellipse cx="140" cy="110" rx="85" ry="50" fill="url(#fishGrad)" stroke="#0c4a6e" stroke-width="4"/>
  <!-- Stripes -->
  <path d="M 130,62 Q 145,110 130,158" fill="none" stroke="#fed7aa" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 165,65 Q 180,110 165,155" fill="none" stroke="#fed7aa" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Eye -->
  <circle cx="85" cy="100" r="10" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <circle cx="82" cy="100" r="5" fill="#0f172a"/>
  <circle cx="80" cy="98" r="2" fill="#ffffff"/>
  <!-- Mouth -->
  <path d="M 55,115 Q 65,112 60,118" fill="none" stroke="#0c4a6e" stroke-width="3" stroke-linecap="round"/>
  <!-- Bubbles -->
  <circle cx="40" cy="90" r="5" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.5" opacity="0.8"/>
  <circle cx="28" cy="70" r="7" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.5" opacity="0.8"/>
</svg>`
    },
    rocket: {
        title: 'Rocket',
        keywords: ['rocket', 'spaceship', 'spacecraft', 'shuttle'],
        width: 250,
        height: 310,
        svg: `<svg viewBox="0 0 250 310" xmlns="http://www.w3.org/2000/svg">
  <!-- Thrust Flame -->
  <path d="M 105,240 Q 125,305 145,240 Z" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
  <path d="M 113,240 Q 125,280 137,240 Z" fill="#fef08a"/>
  <!-- Fins -->
  <polygon points="90,190 45,245 95,235" fill="#dc2626" stroke="#991b1b" stroke-width="3.5" stroke-linejoin="round"/>
  <polygon points="160,190 205,245 155,235" fill="#dc2626" stroke="#991b1b" stroke-width="3.5" stroke-linejoin="round"/>
  <!-- Fuselage Body -->
  <path d="M 125,30 C 85,90 85,200 95,240 L 155,240 C 165,200 165,90 125,30 Z" fill="#f8fafc" stroke="#334155" stroke-width="4.5"/>
  <!-- Red Nose Cone -->
  <path d="M 125,30 C 105,65 100,90 100,90 L 150,90 C 150,90 145,65 125,30 Z" fill="#dc2626" stroke="#991b1b" stroke-width="3"/>
  <!-- Porthole Window -->
  <circle cx="125" cy="135" r="22" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
  <circle cx="125" cy="135" r="16" fill="#0ea5e9"/>
  <ellipse cx="120" cy="130" rx="4" ry="7" fill="#ffffff" opacity="0.6" transform="rotate(-30, 120, 130)"/>
</svg>`
    },
    robot: {
        title: 'Robot',
        keywords: ['robot', 'bot', 'android', 'cyborg', 'machine'],
        width: 260,
        height: 300,
        svg: `<svg viewBox="0 0 260 300" xmlns="http://www.w3.org/2000/svg">
  <!-- Antenna -->
  <line x1="130" y1="30" x2="130" y2="60" stroke="#475569" stroke-width="4"/>
  <circle cx="130" cy="25" r="8" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
  <!-- Head -->
  <rect x="80" y="60" width="100" height="70" rx="10" fill="#94a3b8" stroke="#334155" stroke-width="4"/>
  <!-- Eyes Screen -->
  <rect x="95" y="75" width="70" height="30" rx="5" fill="#0f172a"/>
  <circle cx="112" cy="90" r="7" fill="#22c55e"/>
  <circle cx="148" cy="90" r="7" fill="#22c55e"/>
  <!-- Neck -->
  <rect x="115" y="130" width="30" height="15" fill="#64748b" stroke="#334155" stroke-width="2"/>
  <!-- Body -->
  <rect x="70" y="145" width="120" height="100" rx="12" fill="#cbd5e1" stroke="#334155" stroke-width="4"/>
  <!-- Chest Meters & Buttons -->
  <rect x="85" y="160" width="90" height="40" rx="4" fill="#1e293b"/>
  <circle cx="102" cy="180" r="5" fill="#ef4444"/>
  <circle cx="120" cy="180" r="5" fill="#f59e0b"/>
  <circle cx="138" cy="180" r="5" fill="#3b82f6"/>
  <circle cx="156" cy="180" r="5" fill="#10b981"/>
  <!-- Arms & Claws -->
  <path d="M 70,165 L 45,190 L 45,215" fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
  <path d="M 40,215 Q 35,230 45,230 Q 55,230 50,215" fill="none" stroke="#334155" stroke-width="3"/>
  <path d="M 190,165 L 215,190 L 215,215" fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
  <path d="M 210,215 Q 205,230 215,230 Q 225,230 220,215" fill="none" stroke="#334155" stroke-width="3"/>
  <!-- Legs -->
  <rect x="95" y="245" width="25" height="40" fill="#64748b" stroke="#334155" stroke-width="3"/>
  <rect x="140" y="245" width="25" height="40" fill="#64748b" stroke="#334155" stroke-width="3"/>
  <ellipse cx="107" cy="285" rx="18" ry="8" fill="#1e293b"/>
  <ellipse cx="152" cy="285" rx="18" ry="8" fill="#1e293b"/>
</svg>`
    },
    circle: {
        title: 'Circle',
        keywords: ['circle', 'round', 'disc', 'ring', 'circular', 'draw circle', 'a circle'],
        width: 260,
        height: 260,
        svg: `<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <circle cx="130" cy="130" r="96" fill="#e0e7ff" fill-opacity="0.2" stroke="#3b82f6" stroke-width="3.5"/>
  <circle cx="130" cy="130" r="4.5" fill="#1e40af"/>
  <line x1="130" y1="130" x2="226" y2="130" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,3"/>
  <text x="120" y="124" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#1e293b">O</text>
  <text x="178" y="122" font-family="system-ui, sans-serif" font-size="13" font-style="italic" font-weight="bold" fill="#2563eb">r</text>
</svg>`
    },
    concentric_circles: {
        title: 'Concentric Circles',
        keywords: ['concentric', 'concentric circle', 'concentric circles', 'nested circles', 'concentric rings', 'bullseye', 'draw concentric circles'],
        width: 280,
        height: 280,
        svg: `<svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Concentric Outer Ring -->
  <circle cx="140" cy="140" r="110" fill="#f8fafc" stroke="#3b82f6" stroke-width="3"/>
  <!-- Concentric Middle Ring -->
  <circle cx="140" cy="140" r="75" fill="#e0e7ff" fill-opacity="0.25" stroke="#3b82f6" stroke-width="3"/>
  <!-- Concentric Inner Ring -->
  <circle cx="140" cy="140" r="40" fill="#e0e7ff" fill-opacity="0.5" stroke="#3b82f6" stroke-width="3"/>
  <!-- Common Center O -->
  <circle cx="140" cy="140" r="4.5" fill="#1d4ed8"/>
  <text x="128" y="134" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#1e293b">O</text>
  <!-- Radius 1 (inner) -->
  <line x1="140" y1="140" x2="180" y2="140" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="3,2"/>
  <text x="156" y="134" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#2563eb">r₁</text>
  <!-- Radius 2 (middle at 35 degrees) -->
  <line x1="140" y1="140" x2="201.4" y2="97" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="3,2"/>
  <text x="176" y="112" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#2563eb">r₂</text>
  <!-- Radius 3 (outer at 65 degrees) -->
  <line x1="140" y1="140" x2="186.5" y2="40.3" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="3,2"/>
  <text x="167" y="74" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#2563eb">r₃</text>
</svg>`
    },
    rectangle: {
        title: 'Rectangle',
        keywords: ['rectangle', 'rect', 'box', 'quadrilateral', 'oblong'],
        width: 280,
        height: 200,
        svg: `<svg viewBox="0 0 280 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rectFill" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </radialGradient>
  </defs>
  <!-- Main Rectangle Body -->
  <rect x="25" y="30" width="230" height="135" rx="3" fill="url(#rectFill)" fill-opacity="0.3" stroke="#3b82f6" stroke-width="3"/>
  <!-- Right Angle Indicator at bottom-left -->
  <path d="M 25,145 L 43,145 L 43,165" fill="none" stroke="#3b82f6" stroke-width="1.8"/>
  <!-- Right Angle Indicator at top-left -->
  <path d="M 25,50 L 43,50 L 43,30" fill="none" stroke="#3b82f6" stroke-width="1.8"/>
  <!-- Vertex Labels A, B, C, D -->
  <circle cx="25" cy="30" r="3.5" fill="#3b82f6"/>
  <text x="14" y="24" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">A</text>
  <circle cx="255" cy="30" r="3.5" fill="#3b82f6"/>
  <text x="264" y="24" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">B</text>
  <circle cx="255" cy="165" r="3.5" fill="#3b82f6"/>
  <text x="264" y="177" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">C</text>
  <circle cx="25" cy="165" r="3.5" fill="#3b82f6"/>
  <text x="14" y="177" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">D</text>
  <!-- Dimension Labels -->
  <text x="140" y="20" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">length (l)</text>
  <text x="140" y="186" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b">width (w)</text>
</svg>`
    },
    square: {
        title: 'Square',
        keywords: ['square', 'regular quadrilateral'],
        width: 240,
        height: 240,
        svg: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sqFill" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </radialGradient>
  </defs>
  <rect x="25" y="25" width="190" height="190" rx="2" fill="url(#sqFill)" fill-opacity="0.3" stroke="#3b82f6" stroke-width="3"/>
  <!-- Right Angle Square at corner -->
  <path d="M 25,190 L 45,190 L 45,215" fill="none" stroke="#3b82f6" stroke-width="1.8"/>
  <circle cx="25" cy="25" r="3.5" fill="#3b82f6"/>
  <text x="14" y="20" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">A</text>
  <circle cx="215" cy="25" r="3.5" fill="#3b82f6"/>
  <text x="224" y="20" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">B</text>
  <circle cx="215" cy="215" r="3.5" fill="#3b82f6"/>
  <text x="224" y="228" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">C</text>
  <circle cx="25" cy="215" r="3.5" fill="#3b82f6"/>
  <text x="14" y="228" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">D</text>
  <text x="120" y="16" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">side (s)</text>
</svg>`
    },
    triangle: {
        title: 'Triangle',
        keywords: ['triangle', 'right triangle', 'equilateral triangle', 'isosceles triangle', 'trigon'],
        width: 260,
        height: 220,
        svg: `<svg viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="triFill" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </radialGradient>
  </defs>
  <!-- Triangle Polygon -->
  <polygon points="130,25 25,185 235,185" fill="url(#triFill)" fill-opacity="0.3" stroke="#3b82f6" stroke-width="3" stroke-linejoin="round"/>
  <!-- Altitude Line (dashed) -->
  <line x1="130" y1="25" x2="130" y2="185" stroke="#3b82f6" stroke-width="1.8" stroke-dasharray="4,3"/>
  <path d="M 130,172 L 143,172 L 143,185" fill="none" stroke="#3b82f6" stroke-width="1.6"/>
  <text x="136" y="115" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">h</text>
  <!-- Vertex Labels A, B, C -->
  <circle cx="130" cy="25" r="3.5" fill="#3b82f6"/>
  <text x="130" y="15" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">A</text>
  <circle cx="25" cy="185" r="3.5" fill="#3b82f6"/>
  <text x="15" y="198" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">B</text>
  <circle cx="235" cy="185" r="3.5" fill="#3b82f6"/>
  <text x="245" y="198" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="bold" fill="#1e40af">C</text>
  <text x="130" y="206" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">base (b)</text>
</svg>`
    },
    cone: {
        title: '3D Cone',
        keywords: ['cone', 'circular cone', 'right cone'],
        width: 220,
        height: 240,
        svg: `<svg viewBox="0 0 220 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="coneGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </radialGradient>
  </defs>
  <path d="M 110,25 L 30,190 A 80 25 0 0 0 190,190 Z" fill="url(#coneGrad)" fill-opacity="0.35" stroke="#3b82f6" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="110" cy="190" rx="80" ry="25" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5,4"/>
  <line x1="110" y1="25" x2="110" y2="190" stroke="#3b82f6" stroke-width="1.8" stroke-dasharray="4,3"/>
  <line x1="110" y1="190" x2="190" y2="190" stroke="#3b82f6" stroke-width="2"/>
  <circle cx="110" cy="190" r="3" fill="#3b82f6"/>
  <text x="145" y="184" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">r</text>
  <text x="118" y="115" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">h</text>
  <text x="165" y="105" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">l</text>
</svg>`
    },
    cylinder: {
        title: '3D Cylinder',
        keywords: ['cylinder', 'circular cylinder', 'can'],
        width: 200,
        height: 240,
        svg: `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cylGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </radialGradient>
  </defs>
  <path d="M 30,60 L 30,180 A 70 24 0 0 0 170,180 L 170,60 Z" fill="url(#cylGrad)" fill-opacity="0.35" stroke="#3b82f6" stroke-width="3"/>
  <ellipse cx="100" cy="180" rx="70" ry="24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5,4"/>
  <ellipse cx="100" cy="60" rx="70" ry="24" fill="#dbeafe" fill-opacity="0.5" stroke="#3b82f6" stroke-width="3"/>
  <line x1="100" y1="60" x2="170" y2="60" stroke="#3b82f6" stroke-width="1.8"/>
  <circle cx="100" cy="60" r="3" fill="#3b82f6"/>
  <text x="135" y="54" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">r</text>
  <text x="182" y="125" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">h</text>
</svg>`
    },
    incline_plane: {
        title: 'Inclined Plane',
        keywords: ['incline', 'inclined plane', 'ramp', 'wedge'],
        width: 260,
        height: 180,
        svg: `<svg viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg">
  <polygon points="30,150 230,150 230,30" fill="#eff6ff" fill-opacity="0.4" stroke="#3b82f6" stroke-width="3" stroke-linejoin="round"/>
  <rect x="110" y="80" width="36" height="24" rx="3" transform="rotate(-31 110 80)" fill="#3b82f6" fill-opacity="0.75" stroke="#1d4ed8" stroke-width="2"/>
  <text x="126" y="92" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">m</text>
  <path d="M 65,150 A 35 35 0 0 0 60,132" fill="none" stroke="#2563eb" stroke-width="2"/>
  <text x="72" y="142" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="#1e40af">θ</text>
</svg>`
    }
};

/**
 * Find matching vector illustration SVG by text query or subject name
 */
export function getBuiltinIllustration(query) {
    if (!query || typeof query !== 'string') return null;
    const q = query.toLowerCase().trim();

    // Check exact keys first
    if (ILLUSTRATIONS[q]) return ILLUSTRATIONS[q];

    // Direct check for geometric primitives
    if (q.includes('concentric')) return ILLUSTRATIONS.concentric_circles;
    if (q.includes('circle') || q.includes('round') || q.includes('disc') || q.includes('ring')) return ILLUSTRATIONS.circle;
    if (q.includes('rectangle') || q.includes('box') || q.includes('quadrilateral') || q.includes('rect') || q.includes('oblong')) return ILLUSTRATIONS.rectangle;
    if (q.includes('square')) return ILLUSTRATIONS.square;
    if (q.includes('triangle') || q.includes('trigon')) return ILLUSTRATIONS.triangle;
    if (q.includes('cone')) return ILLUSTRATIONS.cone;
    if (q.includes('cylinder')) return ILLUSTRATIONS.cylinder;
    if (q.includes('incline') || q.includes('ramp') || q.includes('wedge')) return ILLUSTRATIONS.incline_plane;

    // Check keywords
    for (const item of Object.values(ILLUSTRATIONS)) {
        if (item.keywords && item.keywords.some(kw => q.includes(kw) || kw.includes(q))) {
            return item;
        }
    }

    return null;
}

export function getBuiltinIllustrationSvg(query, strokeColor = '#3b82f6') {
    const item = getBuiltinIllustration(query);
    if (item) {
        return item.svg.replace(/#3b82f6/g, strokeColor);
    }

    const q = (query || '').toLowerCase().trim();
    if (q.includes('concentric')) {
        return ILLUSTRATIONS.concentric_circles.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('circle') || q.includes('ring') || q.includes('disc') || q.includes('round')) {
        return ILLUSTRATIONS.circle.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('rectangle') || q.includes('box') || q.includes('quadrilateral') || q.includes('rect')) {
        return ILLUSTRATIONS.rectangle.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('square')) {
        return ILLUSTRATIONS.square.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('triangle')) {
        return ILLUSTRATIONS.triangle.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('cone')) {
        return ILLUSTRATIONS.cone.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('cylinder')) {
        return ILLUSTRATIONS.cylinder.svg.replace(/#3b82f6/g, strokeColor);
    }
    if (q.includes('incline') || q.includes('ramp') || q.includes('wedge')) {
        return ILLUSTRATIONS.incline_plane.svg.replace(/#3b82f6/g, strokeColor);
    }

    // Creative vector illustration fallback
    const title = (query || 'Drawing').replace(/^(draw\s+a\s+|draw\s+an\s+|draw\s+the\s+|draw\s+)/i, '').trim();
    return `<svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="paletteGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </radialGradient>
  </defs>
  <!-- Paint Palette Vector Sketch -->
  <path d="M 60,140 C 40,80 120,40 180,50 C 230,60 250,110 240,160 C 230,210 180,240 130,230 C 105,225 100,205 85,205 C 70,205 60,180 60,140 Z" fill="url(#paletteGrad)" stroke="${strokeColor}" stroke-width="3"/>
  <circle cx="105" cy="210" r="14" fill="#ffffff" stroke="${strokeColor}" stroke-width="2"/>
  <!-- Paint Blobs -->
  <circle cx="120" cy="85" r="10" fill="#ef4444"/>
  <circle cx="165" cy="85" r="10" fill="#f59e0b"/>
  <circle cx="205" cy="115" r="10" fill="#10b981"/>
  <circle cx="210" cy="165" r="10" fill="#3b82f6"/>
  <circle cx="170" cy="195" r="10" fill="#8b5cf6"/>
  <!-- Label -->
  <text x="140" y="260" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="bold" fill="#334155">${title}</text>
</svg>`;
}
