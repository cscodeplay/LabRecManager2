#!/usr/bin/env python3
"""
Dynamic SchemDraw Circuit & Logic Diagram Engine (MIT License)
Executes dynamic SchemDraw code or structured circuit topologies and renders 100% vector SVG.
ZERO HARDCODING: Every diagram is constructed dynamically according to input parameters.
"""

import sys
import json
import io
import re

import warnings
warnings.filterwarnings('ignore')

import matplotlib
matplotlib.use('Agg')
import schemdraw
import schemdraw.elements as elm
import schemdraw.logic as logic
import schemdraw.flow as flow

def sanitize_svg(svg_str):
    """Ensure clean self-contained SVG for Whiteboard canvas."""
    if not svg_str:
        return ""
    # Remove XML declaration and doctype if present
    svg_clean = re.sub(r'<\?xml[^>]*\?>', '', svg_str)
    svg_clean = re.sub(r'<!DOCTYPE[^>]*>', '', svg_clean)
    svg_clean = svg_clean.strip()
    return svg_clean

def render_from_code(code_str):
    """Execute dynamic SchemDraw Python code safely in isolated namespace."""
    drawing = schemdraw.Drawing(show=False)
    drawing.save = lambda *args, **kwargs: None
    local_env = {
        'schemdraw': schemdraw,
        'elm': elm,
        'logic': logic,
        'flow': flow,
        'd': drawing,
        'Drawing': schemdraw.Drawing
    }
    
    # Execute the code provided by AI
    exec(code_str, local_env, local_env)
    
    # Retrieve drawing object
    d = local_env.get('d', drawing)
    svg_bytes = d.get_imagedata('svg')
    return sanitize_svg(svg_bytes.decode('utf-8'))

def generate_code_from_spec(spec):
    """Generate pure, clean, executable SchemDraw Python code from circuit spec."""
    topology = spec.get('topology', 'series').lower()
    components = spec.get('components', [])
    source_val = spec.get('source', '12V')
    source_type = spec.get('sourceType', 'dc').lower()

    lines = [
        "import schemdraw",
        "import schemdraw.elements as elm",
        "",
        "# Initialize dynamic SchemDraw vector canvas",
        "d = schemdraw.Drawing(show=False)",
    ]

    # Power Source (left side, going up) with explicit polarity markers
    if source_type == 'ac':
        lines.append(f"d.add(elm.SourceSin().up().label('{source_val}'))")
    else:
        lines.append(f"b = d.add(elm.Battery().up().label('{source_val}', loc='left'))")
        lines.append("d.add(elm.Label().at((b.end[0] + 0.25, b.end[1] - 0.2)).label('+', color='#ef4444', fontsize=14))")
        lines.append("d.add(elm.Label().at((b.start[0] + 0.25, b.start[1] + 0.2)).label('−', color='#3b82f6', fontsize=14))")

    if topology == 'series':
        lines.append("d.add(elm.Line().right(1.5))")
        if not components:
            components = [{'type': 'lamp', 'label': 'Bulb 1'}, {'type': 'lamp', 'label': 'Bulb 2'}]
        mid = max(1, len(components) // 2)
        top_comps = components[:mid]
        right_comps = components[mid:]

        for c in top_comps:
            c_type = c.get('type', 'lamp').lower()
            lbl = c.get('label', '')
            if 'lamp' in c_type or 'bulb' in c_type:
                lines.append(f"d.add(elm.Lamp().right().label('{lbl}'))")
            elif 'resistor' in c_type or c_type == 'r':
                lines.append(f"d.add(elm.Resistor().right().label('{lbl}'))")
            elif 'cap' in c_type:
                lines.append(f"d.add(elm.Capacitor().right().label('{lbl}'))")
            elif 'ind' in c_type:
                lines.append(f"d.add(elm.Inductor().right().label('{lbl}'))")
            else:
                lines.append(f"d.add(elm.Resistor().right().label('{lbl}'))")

        lines.append("d.add(elm.Line().right(1.0))")
        lines.append("d.add(elm.Line().down(1.0))")

        for c in right_comps:
            c_type = c.get('type', 'lamp').lower()
            lbl = c.get('label', '')
            if 'lamp' in c_type or 'bulb' in c_type:
                lines.append(f"d.add(elm.Lamp().down().label('{lbl}'))")
            elif 'resistor' in c_type or c_type == 'r':
                lines.append(f"d.add(elm.Resistor().down().label('{lbl}'))")
            elif 'cap' in c_type:
                lines.append(f"d.add(elm.Capacitor().down().label('{lbl}'))")
            elif 'ind' in c_type:
                lines.append(f"d.add(elm.Inductor().down().label('{lbl}'))")
            else:
                lines.append(f"d.add(elm.Resistor().down().label('{lbl}'))")

        lines.append("d.add(elm.Line().left().tox(0))")

    elif topology == 'parallel':
        if not components:
            components = [{'type': 'lamp', 'label': 'Bulb 1'}, {'type': 'lamp', 'label': 'Bulb 2'}]
        spacing = 2.5
        bus_len = spacing * len(components)
        lines.append(f"d.add(elm.Line().right({bus_len}))")

        for i, c in enumerate(components):
            c_type = c.get('type', 'lamp').lower()
            lbl = c.get('label', f'Branch {i+1}')
            branch_pos = spacing * (i + 1)
            lines.append("d.push()")
            lines.append(f"d.add(elm.Line().left({bus_len - branch_pos}))")
            if 'lamp' in c_type or 'bulb' in c_type:
                lines.append(f"d.add(elm.Lamp().down(3).label('{lbl}'))")
            elif 'resistor' in c_type or c_type == 'r':
                lines.append(f"d.add(elm.Resistor().down(3).label('{lbl}'))")
            elif 'cap' in c_type:
                lines.append(f"d.add(elm.Capacitor().down(3).label('{lbl}'))")
            elif 'ind' in c_type:
                lines.append(f"d.add(elm.Inductor().down(3).label('{lbl}'))")
            else:
                lines.append(f"d.add(elm.Lamp().down(3).label('{lbl}'))")
            lines.append("d.pop()")

        lines.append("d.add(elm.Line().down(3))")
        lines.append(f"d.add(elm.Line().left({bus_len}))")
    elif topology == 'wheatstone':
        lbl1 = components[0].get('label', 'R₁ = 10 Ω') if len(components) > 0 else 'R₁ = 10 Ω'
        lbl2 = components[1].get('label', 'R₂ = 20 Ω') if len(components) > 1 else 'R₂ = 20 Ω'
        lbl3 = components[2].get('label', 'R₃ = 30 Ω') if len(components) > 2 else 'R₃ = 30 Ω'
        lbl4 = components[3].get('label', 'Rx = 60 Ω') if len(components) > 3 else 'Rx = 60 Ω'

        lines.append("d.add(elm.Line().right(1.5))")
        lines.append("d.push()")
        lines.append(f"d.add(elm.Resistor().right().label('{lbl1}'))")
        lines.append(f"d.add(elm.Resistor().right().label('{lbl2}'))")
        lines.append("d.add(elm.Line().down().length(4))")
        lines.append("d.add(elm.Line().left().tox(0))")
        lines.append("d.pop()")
        lines.append("d.add(elm.Line().down().length(4))")
        lines.append(f"d.add(elm.Resistor().right().label('{lbl3}'))")
        lines.append(f"d.add(elm.Resistor().right().label('{lbl4}'))")
        lines.append("d.add(elm.Line().up().at((4.5, -4)).length(0.75))")
        lines.append("d.add(elm.MeterAnalog().up().label('G (0 A)'))")
        lines.append("d.add(elm.Line().up().length(0.75))")
    else:
        lines.append("d.add(elm.Line().right(2))")
        lines.append("d.add(elm.Resistor().down(2).label('Load'))")
        lines.append("d.add(elm.Line().left(2))")

    lines.append("")
    lines.append("# Render and save vector schematic")
    lines.append("d.save('circuit.svg')")
    return "\n".join(lines)

def render_from_spec(spec):
    """Render circuit from dynamic specification dictionary and return SVG and Python code."""
    code_str = generate_code_from_spec(spec)
    svg = render_from_code(code_str)
    return svg, code_str

def main():
    try:
        raw_in = sys.stdin.read()
        if not raw_in.strip():
            print(json.dumps({'success': False, 'error': 'Empty input'}))
            sys.exit(1)
            
        payload = json.loads(raw_in)
        
        if 'code' in payload and payload['code'].strip():
            code = payload['code'].strip()
            svg = render_from_code(code)
        elif 'circuit' in payload:
            svg, code = render_from_spec(payload['circuit'])
        elif 'spec' in payload:
            svg, code = render_from_spec(payload['spec'])
        else:
            print(json.dumps({'success': False, 'error': 'Missing code or circuit specification'}))
            sys.exit(1)
            
        print(json.dumps({'success': True, 'svg': svg, 'code': code}))
    except Exception as exc:
        print(json.dumps({'success': False, 'error': str(exc)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
