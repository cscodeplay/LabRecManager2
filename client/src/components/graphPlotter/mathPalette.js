// Mathematical Symbol and Operator Palette for Graph Plotter

export const PALETTE_CATEGORIES = [
    {
        id: 'algebra',
        label: 'Basic & Powers',
        items: [
            { label: 'x', insert: 'x', title: 'Variable x' },
            { label: 'y', insert: 'y', title: 'Variable y' },
            { label: '+', insert: ' + ', title: 'Addition' },
            { label: '−', insert: ' - ', title: 'Subtraction' },
            { label: '×', insert: ' * ', title: 'Multiplication' },
            { label: '÷', insert: ' / ', title: 'Division' },
            { label: 'x²', insert: '^2', title: 'Squared (Power 2)' },
            { label: 'x³', insert: '^3', title: 'Cubed (Power 3)' },
            { label: 'xⁿ', insert: '^', title: 'Power (Exponent)' },
            { label: '√x', insert: 'sqrt(', title: 'Square Root' },
            { label: '|x|', insert: 'abs(', title: 'Absolute Value' },
            { label: '( )', insert: '()', cursorOffset: -1, title: 'Parentheses' },
        ]
    },
    {
        id: 'trig',
        label: 'Trigonometry',
        items: [
            { label: 'sin', insert: 'sin(', title: 'Sine' },
            { label: 'cos', insert: 'cos(', title: 'Cosine' },
            { label: 'tan', insert: 'tan(', title: 'Tangent' },
            { label: 'cot', insert: 'cot(', title: 'Cotangent' },
            { label: 'sec', insert: 'sec(', title: 'Secant' },
            { label: 'csc', insert: 'csc(', title: 'Cosecant' },
            { label: 'arcsin', insert: 'asin(', title: 'Inverse Sine' },
            { label: 'arccos', insert: 'acos(', title: 'Inverse Cosine' },
            { label: 'arctan', insert: 'atan(', title: 'Inverse Tangent' },
        ]
    },
    {
        id: 'exp_log',
        label: 'Exp & Logs',
        items: [
            { label: 'eˣ', insert: 'exp(', title: 'Natural Exponential e^x' },
            { label: 'ln', insert: 'ln(', title: 'Natural Logarithm ln(x)' },
            { label: 'log', insert: 'log(', title: 'Common Logarithm log10(x)' },
            { label: 'log₂', insert: 'log2(', title: 'Base 2 Logarithm' },
            { label: '10ˣ', insert: '10^', title: 'Power of 10' },
        ]
    },
    {
        id: 'constants',
        label: 'Constants & Greek',
        items: [
            { label: 'π', insert: 'pi', title: 'Pi Constant (≈ 3.14159)' },
            { label: 'e', insert: 'e', title: 'Euler Constant (≈ 2.71828)' },
            { label: 'θ', insert: 'theta', title: 'Polar Theta Angle' },
            { label: 't', insert: 't', title: 'Parametric Variable t' },
            { label: 'r', insert: 'r', title: 'Polar Radius' },
            { label: 'τ', insert: 'tau', title: 'Tau Constant (2π)' },
        ]
    },
    {
        id: 'inequalities',
        label: 'Relations & Sets',
        items: [
            { label: '=', insert: ' = ', title: 'Equals' },
            { label: '<', insert: ' < ', title: 'Less Than' },
            { label: '>', insert: ' > ', title: 'Greater Than' },
            { label: '≤', insert: ' <= ', title: 'Less Than or Equal' },
            { label: '≥', insert: ' >= ', title: 'Greater Than or Equal' },
            { label: '≠', insert: ' != ', title: 'Not Equal' },
            { label: '{ }', insert: '{}', cursorOffset: -1, title: 'Domain Restriction Braces' },
            { label: ':', insert: ': ', title: 'Piecewise Colon' },
            { label: ',', insert: ', ', title: 'Comma Separator' },
        ]
    }
];
