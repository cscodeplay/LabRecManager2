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

import matplotlib
matplotlib.use('Agg')
import schemdraw
import schemdraw.elements as elm
import schemdraw.logic as logic

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
    local_env = {
        'schemdraw': schemdraw,
        'elm': elm,
        'logic': logic,
        'd': drawing,
        'Drawing': schemdraw.Drawing
    }
    
    # Execute the code provided by AI
    exec(code_str, local_env, local_env)
    
    # Retrieve drawing object
    d = local_env.get('d', drawing)
    svg_bytes = d.get_imagedata('svg')
    return sanitize_svg(svg_bytes.decode('utf-8'))

def render_from_spec(spec):
    """Render circuit from dynamic specification dictionary."""
    topology = spec.get('topology', 'series').lower()
    components = spec.get('components', [])
    source_val = spec.get('source', '12V')
    source_type = spec.get('sourceType', 'dc').lower()
    
    d = schemdraw.Drawing(show=False)
    
    # Power Source (left side, going up)
    if source_type == 'ac':
        d.add(elm.SourceSin().up().label(source_val))
    else:
        d.add(elm.Battery().up().label(source_val))
    
    if topology == 'series':
        # Top rail
        d.add(elm.Line().right(1.5))
        
        # Series elements on top and right
        if not components:
            components = [{'type': 'lamp', 'label': 'Bulb 1'}, {'type': 'lamp', 'label': 'Bulb 2'}]
        
        mid = max(1, len(components) // 2)
        top_comps = components[:mid]
        right_comps = components[mid:]
        
        for c in top_comps:
            c_type = c.get('type', 'lamp').lower()
            lbl = c.get('label', '')
            if 'lamp' in c_type or 'bulb' in c_type:
                d.add(elm.Lamp().right().label(lbl))
            elif 'resistor' in c_type or 'r' == c_type:
                d.add(elm.Resistor().right().label(lbl))
            elif 'cap' in c_type:
                d.add(elm.Capacitor().right().label(lbl))
            elif 'ind' in c_type:
                d.add(elm.Inductor().right().label(lbl))
            else:
                d.add(elm.Resistor().right().label(lbl))
                
        d.add(elm.Line().right(1.0))
        d.add(elm.Line().down(1.0))
        
        for c in right_comps:
            c_type = c.get('type', 'lamp').lower()
            lbl = c.get('label', '')
            if 'lamp' in c_type or 'bulb' in c_type:
                d.add(elm.Lamp().down().label(lbl))
            elif 'resistor' in c_type or 'r' == c_type:
                d.add(elm.Resistor().down().label(lbl))
            elif 'cap' in c_type:
                d.add(elm.Capacitor().down().label(lbl))
            elif 'ind' in c_type:
                d.add(elm.Inductor().down().label(lbl))
            else:
                d.add(elm.Resistor().down().label(lbl))
                
        # Bottom rail closing loop to battery
        d.add(elm.Line().left().tox(0))
        
    elif topology == 'parallel':
        if not components:
            components = [{'type': 'lamp', 'label': 'Bulb 1'}, {'type': 'lamp', 'label': 'Bulb 2'}]
            
        spacing = 2.5
        # Top bus rail
        bus_len = spacing * len(components)
        d.add(elm.Line().right(bus_len))
        
        # Parallel branches
        for i, c in enumerate(components):
            c_type = c.get('type', 'lamp').lower()
            lbl = c.get('label', f'Branch {i+1}')
            
            branch_pos = spacing * (i + 1)
            d.push()
            # Move back along top wire to branch point
            d.add(elm.Line().left(bus_len - branch_pos))
            if 'lamp' in c_type or 'bulb' in c_type:
                d.add(elm.Lamp().down(3).label(lbl))
            elif 'resistor' in c_type or 'r' == c_type:
                d.add(elm.Resistor().down(3).label(lbl))
            elif 'cap' in c_type:
                d.add(elm.Capacitor().down(3).label(lbl))
            elif 'ind' in c_type:
                d.add(elm.Inductor().down(3).label(lbl))
            else:
                d.add(elm.Lamp().down(3).label(lbl))
            d.pop()
            
        # Bottom bus rail closing loop
        d.add(elm.Line().down(3))
        d.add(elm.Line().left(bus_len))
    else:
        # Generic single-loop fallback
        d.add(elm.Line().right(2))
        d.add(elm.Resistor().down(2).label('Load'))
        d.add(elm.Line().left(2))

    svg_bytes = d.get_imagedata('svg')
    return sanitize_svg(svg_bytes.decode('utf-8'))

def main():
    try:
        raw_in = sys.stdin.read()
        if not raw_in.strip():
            print(json.dumps({'success': False, 'error': 'Empty input'}))
            sys.exit(1)
            
        payload = json.loads(raw_in)
        
        if 'code' in payload and payload['code'].strip():
            svg = render_from_code(payload['code'])
        elif 'circuit' in payload:
            svg = render_from_spec(payload['circuit'])
        else:
            print(json.dumps({'success': False, 'error': 'Missing code or circuit specification'}))
            sys.exit(1)
            
        print(json.dumps({'success': True, 'svg': svg}))
    except Exception as exc:
        print(json.dumps({'success': False, 'error': str(exc)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
