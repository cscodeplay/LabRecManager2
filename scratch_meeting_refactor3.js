const fs = require('fs');
const path = require('path');

const meetingPagePath = path.join(__dirname, 'client/src/app/meeting/[code]/page.jsx');
let content = fs.readFileSync(meetingPagePath, 'utf8');

// 1. Fix screen share
// When screen sharing starts, it should ensure isVideoEnabled is true
content = content.replace(
    /setIsScreenSharing\(true\);/g,
    `setIsVideoEnabled(true);\n                setIsScreenSharing(true);`
);

// We need to also ensure that if they stop screen share, it reverts to the actual camera state
// but `switchCamera` already handles `isVideoEnabled` internally if the user had it on.
// Let's just make sure when starting screen share, the hidden class doesn't hide it.

// 2. Ensure the "Ensure all features like zoom only" layout is respected:
// We made chat pointer-events-auto but wait, "chat should display floated above whiteboard and share screen".
// Let's check how chat is displayed. If showWhiteboard is true, chat should be absolutely positioned.
content = content.replace(
    /\{showChat && \(\s*<div className="w-full md:w-80 bg-slate-800 rounded-2xl flex flex-col border border-slate-700 shadow-2xl h-\[300px\] md:h-auto pointer-events-auto relative z-20">/g,
    `{showChat && (
    <div className={showWhiteboard ? "absolute bottom-24 right-4 w-80 bg-slate-800 rounded-2xl flex flex-col border border-slate-700 shadow-2xl h-[400px] pointer-events-auto z-30" : "w-full md:w-80 bg-slate-800 rounded-2xl flex flex-col border border-slate-700 shadow-2xl h-[300px] md:h-auto pointer-events-auto relative z-20"}>`
);

// We should also make sure controls are properly docked and everything feels right.
// Let's adjust the controls when whiteboard is shown to float at the bottom (Zoom style).
// In my previous script, I put controls at top: `absolute top-0 left-0 w-full`
// But Zoom controls are usually at the bottom.
// Let's change controls to absolute bottom-0 left-0 w-full
content = content.replace(
    /absolute top-0 left-0 w-full z-20 pointer-events-auto bg-slate-900\/50 backdrop-blur-md/g,
    `absolute bottom-0 left-0 w-full z-20 pointer-events-auto bg-slate-900/80 backdrop-blur-md pb-4 pt-2`
);

// Also we need to make sure the main video layout handles "Screen Share" and "Whiteboard" the same way.
// The user says "above whiteboard and share screen"
// So if someone shares screen, does it show as remote video? Yes, it's just video track.
// So if isScreenSharing is true on the remote side, or whiteboard is shown.
// Actually, they mean local screen share too? Local screen share shows in localVideoRef.

// 3. Fix the layout of the Remote Video and Local Video when Whiteboard is ON.
content = content.replace(
    /absolute top-4 right-4 w-64 md:w-80 h-48 md:h-60 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 z-10 pointer-events-auto/g,
    `absolute top-4 right-4 w-48 md:w-64 h-36 md:h-48 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 z-10 pointer-events-auto`
);

// 4. Ensure `hasVoted` and `MeetingPollManager` is NOT breaking anything since I haven't added it to this file, it shouldn't be here. 

fs.writeFileSync(meetingPagePath, content, 'utf8');
console.log('Fixes applied.');
