import React from 'react';
import { renderToString } from 'react-dom/server';
import Whiteboard from './.next/server/app/whiteboard/page.js';

console.log("Imports loaded");
try {
  // It's a server component output maybe? 
  // No, page is 'use client'
} catch (e) {
  console.error(e);
}
