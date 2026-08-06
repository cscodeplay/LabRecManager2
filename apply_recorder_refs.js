const fs = require('fs');
const path = '/Users/charanpreetsingh/LabRecManagemer/client/src/components/WhiteboardRecorder.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add refs to store latest objects
content = content.replace(
    "const imageCacheRef = useRef({});",
    `const imageCacheRef = useRef({});
    
    // Refs to hold the latest objects so the recording loop always has access to the most recent state
    const shapeObjectsRef = useRef(shapeObjects);
    const textObjectsRef = useRef(textObjects);
    const imageObjectsRef = useRef(imageObjects);

    useEffect(() => {
        shapeObjectsRef.current = shapeObjects;
    }, [shapeObjects]);

    useEffect(() => {
        textObjectsRef.current = textObjects;
    }, [textObjects]);

    useEffect(() => {
        imageObjectsRef.current = imageObjects;
    }, [imageObjects]);`
);

// 2. Update drawComposite to use refs
content = content.replace(
    /imageObjects\.forEach\(imgObj => \{/g,
    "imageObjectsRef.current.forEach(imgObj => {"
);

content = content.replace(
    /shapeObjects\.forEach\(shpObj => \{/g,
    "shapeObjectsRef.current.forEach(shpObj => {"
);

content = content.replace(
    /textObjects\.forEach\(txtObj => \{/g,
    "textObjectsRef.current.forEach(txtObj => {"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched WhiteboardRecorder.jsx for recording live objects.');
