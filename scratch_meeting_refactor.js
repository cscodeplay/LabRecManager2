const fs = require('fs');
const path = require('path');

const meetingPagePath = path.join(__dirname, 'client/src/app/meeting/[code]/page.jsx');
let content = fs.readFileSync(meetingPagePath, 'utf8');

// 1. Remove Session time expired toast
content = content.replace(
    /toast\.error\('Session time expired\. Please complete the evaluation\.'\);/g,
    "// toast.error('Session time expired');"
);

// 2. Fix the End Session Dialog
// Search for handleEndSession logic and replace the button click handler.
content = content.replace(
    /<button\s+onClick=\{\(\) => setShowGradingPanel\(true\)\}\s+className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"\s+title="End Session"\s+>/g,
    `<button
        onClick={() => {
            if(window.confirm('Are you sure you want to end this meeting?')) {
                handleEndSession();
            }
        }}
        className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
        title="End Session"
    >`
);

// Also we need to replace the "Complete Session" button inside the grading panel so it doesn't show up. 
// Actually, if we never set showGradingPanel to true, the dialog never appears! 
// Let's also remove the whole showGradingPanel rendering block just to be safe and clean.
content = content.replace(
    /\{showGradingPanel && \([\s\S]*?\}\)/,
    "{/* Grading panel removed */}"
);

// 3. Fix the Whiteboard Layout
// Find the whiteboard rendering and move it out of the modal.
// We need to replace the whiteboard rendering block.
content = content.replace(
    /\{\/\* Whiteboard Modal \*\/\}\s*<WhiteboardModal\s*isOpen=\{showWhiteboard\}\s*onClose=\{\(\) => \{\s*setShowWhiteboard\(false\);\s*if \(!isFullscreen\) \{\s*document\.exitFullscreen\(\)\.catch\(\(\) => \{\} \);\s*\}\s*\}\}\s*>\s*<Whiteboard\s*width=\{typeof window !== 'undefined' \? window\.innerWidth \* 0\.9 : 800\}\s*height=\{typeof window !== 'undefined' \? window\.innerHeight \* 0\.8 : 500\}\s*isFullscreen=\{whiteboardFullscreen\}\s*onToggleFullscreen=\{\(\) => setWhiteboardFullscreen\(!whiteboardFullscreen\)\}\s*isInstructor=\{isInstructor\}\s*onShare=\{(?:\{\s*setShowShareModal\(true\);\s*\})?\}\s*\/>\s*<\/WhiteboardModal>/g,
    `{/* Whiteboard Background */}
    {showWhiteboard && (
        <div className="absolute inset-0 z-0 bg-slate-900">
            <Whiteboard
                width={typeof window !== 'undefined' ? window.innerWidth : 800}
                height={typeof window !== 'undefined' ? window.innerHeight - 80 : 500}
                isFullscreen={true}
                onToggleFullscreen={() => setWhiteboardFullscreen(!whiteboardFullscreen)}
                onClose={() => setShowWhiteboard(false)}
                isInstructor={isInstructor}
            />
        </div>
    )}`
);

// 4. Update the layout of video elements
// They need to be floating when whiteboard is shown
content = content.replace(
    /<div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-4 h-full p-4">/g,
    `<div className={\`w-full mx-auto flex flex-col md:flex-row gap-4 h-full p-4 \${showWhiteboard ? 'pointer-events-none' : 'max-w-6xl'}\`}>`
);

content = content.replace(
    /\{\/\* Main Video Area \*\/\}\s*<div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800">/g,
    `{/* Main Video Area */}
    <div className={showWhiteboard ? "absolute top-4 right-4 w-64 md:w-80 h-48 md:h-60 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 z-10 pointer-events-auto" : "flex-1 bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800"}>`
);

content = content.replace(
    /\{\/\* Local video \(small, floating\) \*\/\}\s*<div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700">/g,
    `{/* Local video (small, floating) */}
    <div className={showWhiteboard ? "relative w-full aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700" : "absolute bottom-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 pointer-events-auto"}>`
);

// 5. Fix the local video hidden bug
// Find localVideoRef rendering
content = content.replace(
    /<video\s*ref=\{localVideoRef\}\s*autoPlay\s*muted\s*playsInline\s*className="w-full h-full object-cover"\s*\/>/g,
    `<video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className={\`w-full h-full object-cover \${!isVideoEnabled && 'hidden'}\`}
    />`
);

// And we also need to replace the `{isVideoEnabled ? ... : <div ...>}` conditional rendering
content = content.replace(
    /\{isVideoEnabled \? \([\s\S]*?\) : \(\s*<div className="w-full h-full flex items-center justify-center">\s*<VideoOff className="w-6 md:w-8 h-6 md:h-8 text-slate-500" \/>\s*<\/div>\s*\)\}/g,
    `<video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className={\`w-full h-full object-cover \${!isVideoEnabled && 'hidden'}\`}
    />
    {!isVideoEnabled && (
        <div className="w-full h-full flex items-center justify-center">
            <VideoOff className="w-6 md:w-8 h-6 md:h-8 text-slate-500" />
        </div>
    )}`
);

// Same for remoteVideoRef if needed, though remote doesn't have a button to toggle local hidden state.
// But we should make sure remote video tag is always mounted:
content = content.replace(
    /\{isRemoteConnected \? \([\s\S]*?\) : \(\s*<div className="text-center text-slate-400">\s*<User className="w-16 md:w-20 h-16 md:h-20 mx-auto mb-4 opacity-50" \/>\s*<p className="text-sm md:text-base">Waiting for \{isInstructor \? 'student' : 'instructor'\} to join\.\.\.<\/p>\s*<\/div>\s*\)\}/g,
    `<video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={\`w-full h-full object-cover \${!isRemoteConnected && 'hidden'}\`}
    />
    {!isRemoteConnected && (
        <div className="text-center text-slate-400 h-full flex flex-col items-center justify-center">
            <User className="w-16 md:w-20 h-16 md:h-20 mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">Waiting for {isInstructor ? 'student' : 'instructor'} to join...</p>
        </div>
    )}`
);

// 6. Fix controls header placement (floating on top)
content = content.replace(
    /<div className="w-full max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">/g,
    `<div className={\`w-full px-4 py-3 flex items-center justify-between \${showWhiteboard ? 'absolute top-0 left-0 w-full z-20 pointer-events-auto bg-slate-900/50 backdrop-blur-md' : 'max-w-6xl mx-auto'}\`}>`
);

// 7. Make chat pointer-events-auto
content = content.replace(
    /\{showChat && \(\s*<div className="w-full md:w-80 bg-slate-800 rounded-2xl flex flex-col border border-slate-700 shadow-2xl h-\[300px\] md:h-auto">/g,
    `{showChat && (
    <div className="w-full md:w-80 bg-slate-800 rounded-2xl flex flex-col border border-slate-700 shadow-2xl h-[300px] md:h-auto pointer-events-auto relative z-20">`
);

fs.writeFileSync(meetingPagePath, content, 'utf8');
console.log('Refactor complete.');
