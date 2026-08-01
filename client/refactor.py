import sys

def refactor_whiteboard():
    with open('src/components/Whiteboard.jsx', 'r') as f:
        code = f.read()

    # 1. Extract Custom Color Picker Modal
    custom_picker_start = code.find('{/* Custom Color Picker Modal */}')
    custom_picker_end = code.find('</button>\n                        </div>\n                    )}', custom_picker_start)
    if custom_picker_start == -1 or custom_picker_end == -1:
        print("Could not find Custom Color Picker Modal")
        return
    custom_picker_code = code[custom_picker_start:custom_picker_end + len('</button>\n                        </div>\n                    )}')]

    # 2. Find toolbars
    old_toolbar_start = code.find('{/* Toolbar */}')
    sleek_toolbar_start = code.find('{/* Floating Sleek Toolbar (Zoom-style) */}')
    
    if old_toolbar_start == -1 or sleek_toolbar_start == -1:
        print("Could not find toolbars")
        return

    # Delete the old toolbar
    code = code[:old_toolbar_start] + code[sleek_toolbar_start:]

    # Remove the closing </div> of the old toolbar
    # Right before {/* Canvas */}
    code = code.replace(
        '                </div>\n            </div>\n\n            {/* Canvas */}',
        '                </div>\n\n            {/* Canvas */}'
    )

    # 3. Position Sleek Toolbar at bottom and fix overflow
    old_sleek_class = 'className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50 px-2 py-1 flex items-center gap-0.5 rounded-full z-40 max-w-[95%] overflow-x-auto whitespace-nowrap hide-scrollbar transition-all"'
    new_sleek_class = 'className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50 px-2 py-1 flex items-center gap-0.5 rounded-full z-40 max-w-[95%] overflow-visible whitespace-nowrap hide-scrollbar transition-all"'
    code = code.replace(old_sleek_class, new_sleek_class)

    # 4. Insert custom picker back into sleek toolbar
    # Find where the color popup ends in the sleek toolbar
    colors_popup_str = '{showColorPicker && ('
    colors_popup_start = code.find(colors_popup_str)
    colors_popup_end = code.find(')}', colors_popup_start) + 2

    # Change top-full to bottom-full in custom picker
    custom_picker_code = custom_picker_code.replace('top-full left-0 mt-1', 'bottom-full left-0 mb-2')
    
    code = code[:colors_popup_end] + '\n\n                        ' + custom_picker_code + code[colors_popup_end:]

    # 5. Make all popups go upwards
    code = code.replace('absolute top-full left-0 mt-2', 'absolute bottom-full left-0 mb-2')

    # 6. Fix Canvas Fullscreen Expanding
    # Replace the inline style width/height logic
    old_canvas_style = "maxWidth: isFullscreen ? '95vw' : '100%',\n                            maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '100%',\n                            width: isFullscreen ? 'auto' : undefined,\n                            height: isFullscreen ? 'auto' : undefined,"
    new_canvas_style = "width: isFullscreen ? '100%' : undefined,\n                            height: isFullscreen ? 'auto' : undefined,\n                            maxHeight: isFullscreen ? '100%' : '100%',"
    code = code.replace(old_canvas_style, new_canvas_style)

    # Replace the container wrapper class
    old_container_class = "className={`bg-white rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'fixed inset-4 z-50' : ''\n                }`}"
    new_container_class = "className={`bg-white rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'h-full w-full border-0 rounded-none' : ''}`}"
    code = code.replace(old_container_class, new_container_class)

    with open('src/components/Whiteboard.jsx', 'w') as f:
        f.write(code)
    print("Refactor complete")

if __name__ == '__main__':
    refactor_whiteboard()
