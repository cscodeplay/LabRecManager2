// Mathematical Function Presets for Classroom and Scientific Exploration

export const MATH_PRESETS = [
    {
        category: 'Algebra & Polynomials',
        items: [
            {
                name: 'Linear',
                formula: 'y = 2x + 1',
                description: 'First-degree polynomial with slope 2 and y-intercept 1',
                badge: 'Degree 1',
            },
            {
                name: 'Quadratic (Parabola)',
                formula: 'y = x^2 - 4',
                description: 'U-shaped parabola with roots at x = ±2 and minimum at (0, -4)',
                badge: 'Degree 2',
            },
            {
                name: 'Cubic with Extrema',
                formula: 'y = x^3 - 3x',
                description: 'Third-degree polynomial with local maximum and minimum',
                badge: 'Degree 3',
            },
            {
                name: 'Quartic Polynomial',
                formula: 'y = 0.1x^4 - 2x^2 + 3',
                description: 'W-shaped polynomial exhibiting symmetric double wells',
                badge: 'Degree 4',
            },
            {
                name: 'Absolute Value (V-Shape)',
                formula: 'y = abs(x - 2) - 3',
                description: 'Corner discontinuity with vertex at (2, -3)',
                badge: 'Abs',
            },
            {
                name: 'Square Root',
                formula: 'y = sqrt(x + 4)',
                description: 'Radical function defined for x >= -4',
                badge: 'Radical',
            },
            {
                name: 'Reciprocal / Rational',
                formula: 'y = 1 / x',
                description: 'Hyperbolic curve with vertical asymptote at x = 0',
                badge: 'Asymptote',
            },
            {
                name: 'Shifted Rational',
                formula: 'y = 1 / (x - 2) + 1',
                description: 'Rational function with asymptote at x = 2 and y = 1',
                badge: 'Asymptote',
            },
        ]
    },
    {
        category: 'Trigonometry & Waves',
        items: [
            {
                name: 'Sine Wave',
                formula: 'y = 2*sin(x)',
                description: 'Periodic sinusoidal wave with amplitude 2 and period 2π',
                badge: 'Wave',
            },
            {
                name: 'Cosine Wave',
                formula: 'y = cos(2x)',
                description: 'Oscillating wave with doubled frequency (period π)',
                badge: 'Wave',
            },
            {
                name: 'Tangent',
                formula: 'y = tan(x)',
                description: 'Trigonometric tangent with vertical asymptotes at (2k+1)π/2',
                badge: 'Periodic',
            },
            {
                name: 'Damped Oscillation',
                formula: 'y = exp(-0.2*x) * sin(3*x)',
                description: 'Harmonic oscillator exhibiting exponential decay',
                badge: 'Physics',
            },
            {
                name: 'Beats Phenomenon',
                formula: 'y = sin(3*x) + sin(3.4*x)',
                description: 'Acoustic / wave interference beat pattern',
                badge: 'Interference',
            },
        ]
    },
    {
        category: 'Exponentials & Logarithms',
        items: [
            {
                name: 'Natural Exponential',
                formula: 'y = exp(x)',
                description: 'Standard exponential growth e^x with base e ≈ 2.718',
                badge: 'Growth',
            },
            {
                name: 'Base 2 Growth',
                formula: 'y = 2^x',
                description: 'Classic doubling sequence exponential curve',
                badge: 'Binary',
            },
            {
                name: 'Natural Logarithm',
                formula: 'y = ln(x)',
                description: 'Inverse of exponential growth, defined strictly for x > 0',
                badge: 'Log',
            },
            {
                name: 'Logistic Sigmoid',
                formula: 'y = 1 / (1 + exp(-x))',
                description: 'S-shaped cumulative distribution curve bounded in (0, 1)',
                badge: 'Sigmoid',
            },
            {
                name: 'Gaussian / Normal Bell Curve',
                formula: 'y = 3 * exp(-x^2 / 2)',
                description: 'Gaussian probability distribution bell curve centered at origin',
                badge: 'Statistics',
            },
        ]
    },
    {
        category: 'Conics & Implicit Relations',
        items: [
            {
                name: 'Circle',
                formula: 'x^2 + y^2 = 25',
                description: 'Geometric circle centered at origin with radius R = 5',
                badge: 'Conic',
            },
            {
                name: 'Ellipse',
                formula: 'x^2 / 16 + y^2 / 9 = 1',
                description: 'Cartesian ellipse with semi-major a=4 and semi-minor b=3',
                badge: 'Conic',
            },
            {
                name: 'Hyperbola',
                formula: 'x^2 / 9 - y^2 / 4 = 1',
                description: 'Two-branch conic section opening horizontally',
                badge: 'Conic',
            },
        ]
    },
    {
        category: 'Polar Coordinates',
        items: [
            {
                name: '4-Petal Polar Rose',
                formula: 'r = 3*sin(2*theta)',
                description: 'Symmetric four-petal flower in polar space',
                badge: 'Rose',
            },
            {
                name: '8-Petal Polar Rose',
                formula: 'r = 3*cos(4*theta)',
                description: 'Eight-petal flower in polar coordinate system',
                badge: 'Rose',
            },
            {
                name: 'Cardioid (Heart Curve)',
                formula: 'r = 2 * (1 - cos(theta))',
                description: 'Heart-shaped cardioid trace around pole',
                badge: 'Cardioid',
            },
            {
                name: 'Archimedean Spiral',
                formula: 'r = 0.5 * theta',
                description: 'Spiral where distance from origin is directly proportional to angle',
                badge: 'Spiral',
            },
        ]
    },
    {
        category: 'Inequalities & Shading',
        items: [
            {
                name: 'Upper Half Parabola',
                formula: 'y >= x^2 - 3',
                description: 'Region enclosed within and above the parabola',
                badge: 'Shaded',
            },
            {
                name: 'Strict Linear Inequality',
                formula: 'y < 2x + 1',
                description: 'Half-plane below line 2x + 1 with dashed boundary line',
                badge: 'Dashed',
            },
            {
                name: 'Oscillating Bound',
                formula: 'y <= 2*sin(x)',
                description: 'Region underneath continuous sinusoidal wave',
                badge: 'Shaded',
            },
        ]
    }
];
