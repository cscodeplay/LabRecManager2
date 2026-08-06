const fs = require('fs');
const path = '/Users/charanpreetsingh/LabRecManagemer/client/src/components/Whiteboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isRemoteUpdateRef
content = content.replace(
    "const laserTimeoutRef = useRef(null);",
    "const laserTimeoutRef = useRef(null);\n    const isRemoteUpdateRef = useRef(false);"
);

// 2. Update handleObjectsUpdate
content = content.replace(
    /const handleObjectsUpdate = \(data\) => \{/,
    "const handleObjectsUpdate = (data) => {\n            isRemoteUpdateRef.current = true;"
);

// 3. Update handleCanvasState
content = content.replace(
    /const handleCanvasState = \(data\) => \{/,
    "const handleCanvasState = (data) => {\n            isRemoteUpdateRef.current = true;"
);

// 4. Update the useEffect for objects-update
const useEffectRegex = /useEffect\(\(\) => \{\s*if \(!socket \|\| !sessionId\) return;\s*socket\.emit\('whiteboard:objects-update', \{[\s\S]*?\}\);\s*\}, \[isSharing, socket, sessionId, imageObjects, textObjects, shapeObjects\]\);/;

content = content.replace(
    useEffectRegex,
    `useEffect(() => {
        if (isRemoteUpdateRef.current) {
            isRemoteUpdateRef.current = false;
            return;
        }
        if (!socket || !sessionId) return;
        socket.emit('whiteboard:objects-update', {
            sessionId,
            imageObjects,
            textObjects,
            shapeObjects
        });
    }, [isSharing, socket, sessionId, imageObjects, textObjects, shapeObjects]);`
);

// 5. Update handleStateRequest to use isSharing
content = content.replace(
    /const handleStateRequest = \(data\) => \{\s*if \(data\.sessionId === sessionId\) \{/,
    "const handleStateRequest = (data) => {\n            if (data.sessionId === sessionId && isSharing) {"
);

// 6. Restore drag select logic
const selectLogic = `
        } else if (tool === 'select') {
            if (selectMode === 'lasso') {
                if (lassoPath.length > 2) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (const p of lassoPath) {
                        if (p.x < minX) minX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y > maxY) maxY = p.y;
                    }
                    const selWidth = maxX - minX;
                    const selHeight = maxY - minY;
                    
                    if (selWidth > 5 && selHeight > 5) {
                        let selectedShapes = shapeObjects.filter(shape => 
                            !shape.isLocked &&
                            shape.x < minX + selWidth && 
                            shape.x + shape.width > minX && 
                            shape.y < minY + selHeight && 
                            shape.y + shape.height > minY
                        ).map(s => s.id);
                        
                        let selectedTexts = textObjects.filter(txt => 
                            !txt.isLocked &&
                            txt.x < minX + selWidth && 
                            txt.x + txt.width > minX && 
                            txt.y < minY + selHeight && 
                            txt.y + txt.height > minY
                        ).map(s => s.id);

                        let selectedImages = imageObjects.filter(img => 
                            !img.isLocked &&
                            img.x < minX + selWidth && 
                            img.x + img.width > minX && 
                            img.y < minY + selHeight && 
                            img.y + img.height > minY
                        ).map(s => s.id);

                        const groupIdsToSelect = new Set([
                            ...shapeObjects.filter(s => selectedShapes.includes(s.id) && s.groupId).map(s => s.groupId),
                            ...textObjects.filter(s => selectedTexts.includes(s.id) && s.groupId).map(s => s.groupId),
                            ...imageObjects.filter(s => selectedImages.includes(s.id) && s.groupId).map(s => s.groupId)
                        ]);

                        if (groupIdsToSelect.size > 0) {
                            const groupShapeIds = shapeObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.id);
                            const groupTextIds = textObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.id);
                            const groupImageIds = imageObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.id);
                            selectedShapes = Array.from(new Set([...selectedShapes, ...groupShapeIds]));
                            selectedTexts = Array.from(new Set([...selectedTexts, ...groupTextIds]));
                            selectedImages = Array.from(new Set([...selectedImages, ...groupImageIds]));
                        }

                        if (selectedShapes.length > 0) setSelectedShapeIds(selectedShapes);
                        else setSelectedShapeIds([]);
                        if (selectedTexts.length > 0) setSelectedTextIds(selectedTexts);
                        else setSelectedTextIds([]);
                        if (selectedImages.length > 0) setSelectedImageId(selectedImages[selectedImages.length - 1]);
                        else setSelectedImageId(null);
                        setSelection({ x: minX, y: minY, width: selWidth, height: selHeight, path: lassoPath });
                    }
                }
                setLassoPath([]);
            } else {
                const x = Math.min(startPos.x, pos.x);
                const y = Math.min(startPos.y, pos.y);
                const selWidth = Math.abs(pos.x - startPos.x);
                const selHeight = Math.abs(pos.y - startPos.y);

                if (selWidth > 5 && selHeight > 5) {
                    let selectedShapes = shapeObjects.filter(shape => 
                        !shape.isLocked &&
                        shape.x < x + selWidth && 
                        shape.x + shape.width > x && 
                        shape.y < y + selHeight && 
                        shape.y + shape.height > y
                    ).map(s => s.id);

                    let selectedTexts = textObjects.filter(txt => 
                        !txt.isLocked &&
                        txt.x < x + selWidth && 
                        txt.x + txt.width > x && 
                        txt.y < y + selHeight && 
                        txt.y + txt.height > y
                    ).map(s => s.id);

                    let selectedImages = imageObjects.filter(img => 
                        !img.isLocked &&
                        img.x < x + selWidth && 
                        img.x + img.width > x && 
                        img.y < y + selHeight && 
                        img.y + img.height > y
                    ).map(s => s.id);

                    const groupIdsToSelect = new Set([
                        ...shapeObjects.filter(s => selectedShapes.includes(s.id) && s.groupId).map(s => s.groupId),
                        ...textObjects.filter(s => selectedTexts.includes(s.id) && s.groupId).map(s => s.groupId),
                        ...imageObjects.filter(s => selectedImages.includes(s.id) && s.groupId).map(s => s.groupId)
                    ]);

                    if (groupIdsToSelect.size > 0) {
                        const groupShapeIds = shapeObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.id);
                        const groupTextIds = textObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.id);
                        const groupImageIds = imageObjects.filter(s => groupIdsToSelect.has(s.groupId)).map(s => s.id);
                        selectedShapes = Array.from(new Set([...selectedShapes, ...groupShapeIds]));
                        selectedTexts = Array.from(new Set([...selectedTexts, ...groupTextIds]));
                        selectedImages = Array.from(new Set([...selectedImages, ...groupImageIds]));
                    }

                    if (selectedShapes.length > 0) setSelectedShapeIds(selectedShapes);
                    else setSelectedShapeIds([]);
                    if (selectedTexts.length > 0) setSelectedTextIds(selectedTexts);
                    else setSelectedTextIds([]);
                    if (selectedImages.length > 0) setSelectedImageId(selectedImages[selectedImages.length - 1]);
                    else setSelectedImageId(null);
                    setSelection({ x, y, width: selWidth, height: selHeight });
                }
            }`;

content = content.replace(
    "} else if (tool === 'laser') {",
    selectLogic + "\n        } else if (tool === 'laser') {"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched Whiteboard.jsx for flickering and select tools.');
