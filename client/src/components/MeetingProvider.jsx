'use client';

import React from 'react';
import { useGlobalMeeting } from './GlobalMeetingContext';
import GlobalMeetingRoom from './GlobalMeetingRoom';
import { usePathname } from 'next/navigation';

export default function MeetingProvider({ children }) {
    const { activeMeeting } = useGlobalMeeting();
    const pathname = usePathname();

    const isMeetingRoute = pathname?.startsWith('/meeting/');
    const isMeetingActive = activeMeeting || isMeetingRoute;

    return (
        <>
            {children}
            {isMeetingActive && <GlobalMeetingRoom />}
        </>
    );
}
