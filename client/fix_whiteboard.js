const fs = require('fs');

let code = fs.readFileSync('src/components/Whiteboard.jsx', 'utf8');

// The start of the old toolbar
const oldToolbarStart = code.indexOf('{/* Toolbar */}');
// The start of the sleek toolbar
const sleekToolbarStart = code.indexOf('{/* Floating Sleek Toolbar (Zoom-style) */}');

if (oldToolbarStart > -1 && sleekToolbarStart > -1) {
    // Read the custom picker from file
    let customPicker = fs.readFileSync('custom_picker.txt', 'utf8');
    
    // In custom picker, change top-full to bottom-full and mt-1 to mb-2 to open upwards
    customPicker = customPicker.replace('top-full left-0 mt-1', 'bottom-full left-0 mb-2');

    // Remove the old toolbar by slicing it out
    code = code.substring(0, oldToolbarStart) + code.substring(sleekToolbarStart);
    
    // Now we must also remove the closing </div> of the old toolbar.
    code = code.replace(
        /                <\/div>\n            <\/div>\n\n            \{\/\* Canvas \*\/\}/g,
        '                </div>\n\n            {/* Canvas */}'
    );

    // Now modify the sleek toolbar wrapper
    code = code.replace(
        /absolute top-4 left-1\/2 transform -translate-x-1\/2 bg-slate-900\/95 backdrop-blur-md shadow-2xl border border-slate-700\/50 px-2 py-1 flex items-center gap-0.5 rounded-full z-40 max-w-\[95%\] overflow-x-auto whitespace-nowrap hide-scrollbar transition-all/g,
        'absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50 px-2 py-1 flex items-center gap-0.5 rounded-full z-40 max-w-[95%] overflow-visible whitespace-nowrap hide-scrollbar transition-all'
    );

    // Now insert the custom color picker into the new toolbar
    const colorsPopupEnd = code.indexOf(')}', code.indexOf('{showColorPicker && (')) + 2;
    if (colorsPopupEnd > 2) {
        // Insert custom picker right after the colors popup
        code = code.substring(0, colorsPopupEnd) + '\n\n' + customPicker + code.substring(colorsPopupEnd);
    }

    // Now replace all top-full with bottom-full for all dropdowns in sleek toolbar
    code = code.replace(/absolute top-full left-0 mt-2/g, 'absolute bottom-full left-0 mb-2');

    // Also change the canvas style to fix the full screen expansion
    code = code.replace(
        /maxWidth: isFullscreen \? '95vw' : '100%',\s*maxHeight: isFullscreen \? 'calc\(100vh - 200px\)' : '100%',\s*width: isFullscreen \? 'auto' : undefined,\s*height: isFullscreen \? 'auto' : undefined,/g,
        "width: isFullscreen ? '100%' : undefined,\n                            height: isFullscreen ? 'auto' : undefined,\n                            maxHeight: isFullscreen ? '100%' : '100%',"
    );
    
    code = code.replace(
        /className=\{\`bg-white rounded-xl shadow-2xl flex flex-col \$\{isFullscreen \? 'fixed inset-4 z-50' : ''\n                \}\`\}/g,
        "className={`bg-white rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'h-full w-full border-0 rounded-none' : ''}`}"
    );

    fs.writeFileSync('src/components/Whiteboard.jsx', code);
    console.log('Fixed Whiteboard.jsx');
} else {
    console.log('Failed to find markers.');
}
