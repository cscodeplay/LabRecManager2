'use client';

import React, { useState } from 'react';
import { 
    X, Search, Grid, Layers, Brain, Code, BookOpen, 
    ArrowRight, Network, Database, GitBranch, BarChart3, Workflow 
} from 'lucide-react';

const uuid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const templates = [
    {
        id: 'algo-flowchart',
        title: 'Algorithm Flowchart',
        category: 'CS Fundamentals',
        description: 'Standard flowchart for algorithm design.',
        icon: <Workflow className="w-6 h-6" />,
        previewColors: ['#22c55e', '#3b82f6', '#eab308', '#ef4444'],
        data: {
            title: 'Algorithm Flowchart',
            background: { pattern: 'dots', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 400, y: 100, width: 200, height: 60, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'Start', textColor: '#166534', fontSize: 16, radius: 30 },
                { id: uuid(), type: 'rectangle', x: 400, y: 250, width: 200, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Input', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 400, y: 400, width: 200, height: 60, color: '#ca8a04', fillColor: '#fef08a', strokeWidth: 2, rotation: 45, text: 'Decision?', textColor: '#854d0e', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 400, y: 550, width: 200, height: 60, color: '#ea580c', fillColor: '#ffedd5', strokeWidth: 2, rotation: 0, text: 'Output', textColor: '#9a3412', fontSize: 16, skewX: 10 },
                { id: uuid(), type: 'rectangle', x: 400, y: 700, width: 200, height: 60, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'End', textColor: '#991b1b', fontSize: 16, radius: 30 },
            ],
            texts: [
                { id: uuid(), x: 400, y: 50, width: 300, height: 40, text: 'Algorithm Flowchart', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'neural-net',
        title: 'Neural Network Diagram',
        category: 'AI & ML',
        description: 'Multi-layer perceptron architecture visualization.',
        icon: <Network className="w-6 h-6" />,
        previewColors: ['#3b82f6', '#8b5cf6', '#ec4899'],
        data: {
            title: 'Neural Network Diagram',
            background: { pattern: 'grid', color: '#f8fafc' },
            shapes: [
                // Input Layer
                { id: uuid(), type: 'circle', x: 200, y: 200, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x1', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 200, y: 300, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x2', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 200, y: 400, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x3', textColor: '#1e40af', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 200, y: 500, width: 60, height: 60, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'x4', textColor: '#1e40af', fontSize: 16 },
                
                // Hidden Layer
                { id: uuid(), type: 'circle', x: 500, y: 150, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h1', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 250, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h2', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 350, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h3', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 450, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h4', textColor: '#5b21b6', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 550, width: 60, height: 60, color: '#7c3aed', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'h5', textColor: '#5b21b6', fontSize: 16 },
                
                // Output Layer
                { id: uuid(), type: 'circle', x: 800, y: 250, width: 60, height: 60, color: '#db2777', fillColor: '#fce7f3', strokeWidth: 2, rotation: 0, text: 'y1', textColor: '#9d174d', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 800, y: 350, width: 60, height: 60, color: '#db2777', fillColor: '#fce7f3', strokeWidth: 2, rotation: 0, text: 'y2', textColor: '#9d174d', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 800, y: 450, width: 60, height: 60, color: '#db2777', fillColor: '#fce7f3', strokeWidth: 2, rotation: 0, text: 'y3', textColor: '#9d174d', fontSize: 16 },
            ],
            texts: [
                { id: uuid(), x: 200, y: 100, width: 150, height: 30, text: 'Input Layer', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#1e40af', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 80, width: 150, height: 30, text: 'Hidden Layer', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#5b21b6', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 800, y: 150, width: 150, height: 30, text: 'Output Layer', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#9d174d', bgColor: 'transparent', rotation: 0 },
            ]
        }
    },
    {
        id: 'uml-class',
        title: 'UML Class Diagram',
        category: 'CS Fundamentals',
        description: 'Object-oriented software structure.',
        icon: <Code className="w-6 h-6" />,
        previewColors: ['#0f172a', '#475569'],
        data: {
            title: 'UML Class Diagram',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 300, y: 200, width: 250, height: 200, color: '#0f172a', fillColor: '#f8fafc', strokeWidth: 2, rotation: 0, text: '', textColor: '#0f172a', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 700, y: 200, width: 250, height: 200, color: '#0f172a', fillColor: '#f8fafc', strokeWidth: 2, rotation: 0, text: '', textColor: '#0f172a', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 500, y: 500, width: 250, height: 200, color: '#0f172a', fillColor: '#f8fafc', strokeWidth: 2, rotation: 0, text: '', textColor: '#0f172a', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 300, y: 120, width: 250, height: 30, text: 'User', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 300, y: 160, width: 250, height: 100, text: '- id: UUID\n- name: String\n- email: String', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 700, y: 120, width: 250, height: 30, text: 'Database', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 420, width: 250, height: 30, text: 'API', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 50, width: 300, height: 40, text: 'UML Class Diagram', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'er-diagram',
        title: 'ER Diagram',
        category: 'CS Fundamentals',
        description: 'Entity-Relationship model for databases.',
        icon: <Database className="w-6 h-6" />,
        previewColors: ['#0369a1', '#be123c'],
        data: {
            title: 'Entity-Relationship Diagram',
            background: { pattern: 'grid', color: '#fafafa' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 200, y: 300, width: 160, height: 80, color: '#0369a1', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Student', textColor: '#075985', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 800, y: 300, width: 160, height: 80, color: '#0369a1', fillColor: '#e0f2fe', strokeWidth: 2, rotation: 0, text: 'Course', textColor: '#075985', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 500, y: 300, width: 160, height: 160, color: '#be123c', fillColor: '#ffe4e6', strokeWidth: 2, rotation: 45, text: 'Enrollment', textColor: '#881337', fontSize: 16 },
                
                { id: uuid(), type: 'circle', x: 100, y: 200, width: 100, height: 60, color: '#475569', fillColor: '#f1f5f9', strokeWidth: 2, rotation: 0, text: 'StudentID', textColor: '#334155', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 250, y: 150, width: 100, height: 60, color: '#475569', fillColor: '#f1f5f9', strokeWidth: 2, rotation: 0, text: 'Name', textColor: '#334155', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 100, width: 400, height: 40, text: 'Entity-Relationship Diagram', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'dfd',
        title: 'Data Flow Diagram',
        category: 'CS Fundamentals',
        description: 'System process and data flows.',
        icon: <ArrowRight className="w-6 h-6" />,
        previewColors: ['#0f766e', '#b45309'],
        data: {
            title: 'Data Flow Diagram - Level 0',
            background: { pattern: 'dots', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 200, y: 300, width: 140, height: 80, color: '#0f766e', fillColor: '#ccfbf1', strokeWidth: 2, rotation: 0, text: 'Customer', textColor: '#115e59', fontSize: 16 },
                { id: uuid(), type: 'circle', x: 500, y: 300, width: 140, height: 140, color: '#b45309', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: '0.1\nOrder\nSystem', textColor: '#92400e', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 800, y: 300, width: 140, height: 80, color: '#4338ca', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'D1: Orders', textColor: '#3730a3', fontSize: 16 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 100, width: 400, height: 40, text: 'Data Flow Diagram - Level 0', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'decision-tree',
        title: 'Decision Tree (ML)',
        category: 'AI & ML',
        description: 'Machine learning classification tree.',
        icon: <GitBranch className="w-6 h-6" />,
        previewColors: ['#1d4ed8', '#047857', '#b91c1c'],
        data: {
            title: 'Decision Tree Classifier',
            background: { pattern: 'none', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 500, y: 150, width: 220, height: 80, color: '#1d4ed8', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Feature X > 0.5?', textColor: '#1e3a8a', fontSize: 16 },
                
                { id: uuid(), type: 'rectangle', x: 300, y: 350, width: 200, height: 80, color: '#047857', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Class A (Yes)', textColor: '#064e3b', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 700, y: 350, width: 200, height: 80, color: '#b91c1c', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'Feature Y > 1.2?', textColor: '#7f1d1d', fontSize: 16 },
                
                { id: uuid(), type: 'rectangle', x: 600, y: 550, width: 160, height: 80, color: '#047857', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Class B', textColor: '#064e3b', fontSize: 16 },
                { id: uuid(), type: 'rectangle', x: 800, y: 550, width: 160, height: 80, color: '#047857', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Class C', textColor: '#064e3b', fontSize: 16 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 50, width: 400, height: 40, text: 'Decision Tree Classifier', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'confusion-matrix',
        title: 'Confusion Matrix',
        category: 'AI & ML',
        description: 'Performance evaluation matrix for classification.',
        icon: <Grid className="w-6 h-6" />,
        previewColors: ['#22c55e', '#ef4444', '#f97316', '#3b82f6'],
        data: {
            title: 'Confusion Matrix',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 400, y: 300, width: 200, height: 200, color: '#16a34a', fillColor: '#dcfce7', strokeWidth: 2, rotation: 0, text: 'True Positive (TP)', textColor: '#14532d', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 600, y: 300, width: 200, height: 200, color: '#dc2626', fillColor: '#fee2e2', strokeWidth: 2, rotation: 0, text: 'False Negative (FN)', textColor: '#7f1d1d', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 400, y: 500, width: 200, height: 200, color: '#ea580c', fillColor: '#ffedd5', strokeWidth: 2, rotation: 0, text: 'False Positive (FP)', textColor: '#7c2d12', fontSize: 18 },
                { id: uuid(), type: 'rectangle', x: 600, y: 500, width: 200, height: 200, color: '#2563eb', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'True Negative (TN)', textColor: '#1e3a8a', fontSize: 18 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 100, width: 300, height: 40, text: 'Confusion Matrix', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 180, width: 400, height: 30, text: 'Predicted Values', fontSize: 20, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 400, y: 220, width: 200, height: 30, text: 'Positive', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#475569', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 600, y: 220, width: 200, height: 30, text: 'Negative', fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#475569', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 180, y: 400, width: 200, height: 30, text: 'Actual Values', fontSize: 20, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: -90 },
            ]
        }
    },
    {
        id: 'ml-pipeline',
        title: 'ML Pipeline Architecture',
        category: 'AI & ML',
        description: 'End-to-end machine learning lifecycle.',
        icon: <BarChart3 className="w-6 h-6" />,
        previewColors: ['#6366f1'],
        data: {
            title: 'Machine Learning Pipeline',
            background: { pattern: 'grid', color: '#f8fafc' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 200, y: 300, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Data Collection', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'rectangle', x: 450, y: 300, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Preprocessing', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'rectangle', x: 700, y: 300, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Feature Eng', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'rectangle', x: 200, y: 450, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Model Training', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'rectangle', x: 450, y: 450, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Evaluation', textColor: '#312e81', fontSize: 16, radius: 10 },
                { id: uuid(), type: 'rectangle', x: 700, y: 450, width: 180, height: 80, color: '#4f46e5', fillColor: '#e0e7ff', strokeWidth: 2, rotation: 0, text: 'Deployment', textColor: '#312e81', fontSize: 16, radius: 10 },
            ],
            texts: [
                { id: uuid(), x: 450, y: 150, width: 400, height: 40, text: 'Machine Learning Pipeline', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    },
    {
        id: 'cornell-notes',
        title: 'Cornell Notes',
        category: 'General',
        description: 'Structured note-taking method.',
        icon: <BookOpen className="w-6 h-6" />,
        previewColors: ['#94a3b8'],
        data: {
            title: 'Cornell Notes',
            background: { pattern: 'lines', color: '#fdfbf7' },
            shapes: [
                { id: uuid(), type: 'rectangle', x: 250, y: 400, width: 300, height: 600, color: '#cbd5e1', fillColor: 'transparent', strokeWidth: 2, rotation: 0, text: '', textColor: '#000000', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 750, y: 400, width: 700, height: 600, color: '#cbd5e1', fillColor: 'transparent', strokeWidth: 2, rotation: 0, text: '', textColor: '#000000', fontSize: 14 },
                { id: uuid(), type: 'rectangle', x: 500, y: 800, width: 1000, height: 200, color: '#cbd5e1', fillColor: 'transparent', strokeWidth: 2, rotation: 0, text: '', textColor: '#000000', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 50, width: 300, height: 40, text: 'Cornell Notes', fontSize: 28, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 250, y: 120, width: 200, height: 30, text: 'Key Points / Cues', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 750, y: 120, width: 200, height: 30, text: 'Notes', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
                { id: uuid(), x: 500, y: 720, width: 200, height: 30, text: 'Summary', fontSize: 18, fontWeight: 'bold', fontStyle: 'normal', color: '#334155', bgColor: 'transparent', rotation: 0 },
            ]
        }
    },
    {
        id: 'mind-map',
        title: 'Mind Map',
        category: 'General',
        description: 'Brainstorming and conceptual mapping.',
        icon: <Brain className="w-6 h-6" />,
        previewColors: ['#a855f7', '#f43f5e', '#3b82f6', '#10b981'],
        data: {
            title: 'Mind Map',
            background: { pattern: 'none', color: '#ffffff' },
            shapes: [
                { id: uuid(), type: 'circle', x: 500, y: 400, width: 140, height: 140, color: '#a855f7', fillColor: '#f3e8ff', strokeWidth: 3, rotation: 0, text: 'Main Topic', textColor: '#7e22ce', fontSize: 18 },
                
                { id: uuid(), type: 'circle', x: 250, y: 200, width: 100, height: 100, color: '#3b82f6', fillColor: '#dbeafe', strokeWidth: 2, rotation: 0, text: 'Subtopic 1', textColor: '#1e40af', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 750, y: 200, width: 100, height: 100, color: '#f43f5e', fillColor: '#ffe4e6', strokeWidth: 2, rotation: 0, text: 'Subtopic 2', textColor: '#be123c', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 150, y: 400, width: 100, height: 100, color: '#10b981', fillColor: '#d1fae5', strokeWidth: 2, rotation: 0, text: 'Subtopic 3', textColor: '#047857', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 850, y: 400, width: 100, height: 100, color: '#f59e0b', fillColor: '#fef3c7', strokeWidth: 2, rotation: 0, text: 'Subtopic 4', textColor: '#b45309', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 250, y: 600, width: 100, height: 100, color: '#8b5cf6', fillColor: '#ede9fe', strokeWidth: 2, rotation: 0, text: 'Subtopic 5', textColor: '#6d28d9', fontSize: 14 },
                { id: uuid(), type: 'circle', x: 750, y: 600, width: 100, height: 100, color: '#14b8a6', fillColor: '#ccfbf1', strokeWidth: 2, rotation: 0, text: 'Subtopic 6', textColor: '#0f766e', fontSize: 14 },
            ],
            texts: [
                { id: uuid(), x: 500, y: 50, width: 300, height: 40, text: 'Mind Map', fontSize: 24, fontWeight: 'bold', fontStyle: 'normal', color: '#0f172a', bgColor: 'transparent', rotation: 0 }
            ]
        }
    }
];

const categories = ['All', 'CS Fundamentals', 'AI & ML', 'General'];

export default function TemplateGallery({ 
    isOpen, 
    onClose, 
    onApplyTemplate, 
    canvasWidth = 1920, 
    canvasHeight = 1080 
}) {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = activeTab === 'All' || template.category === activeTab;
        const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              template.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleApply = (template) => {
        // Deep clone the template data to avoid reference issues
        const templateData = JSON.parse(JSON.stringify(template.data));
        
        // Ensure new IDs for all objects so they don't clash
        if (templateData.shapes) {
            templateData.shapes = templateData.shapes.map(s => ({ ...s, id: uuid() }));
        }
        if (templateData.texts) {
            templateData.texts = templateData.texts.map(t => ({ ...t, id: uuid() }));
        }
        
        onApplyTemplate(templateData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="max-w-6xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Template Gallery</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative hidden sm:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs & Search Mobile */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="relative sm:hidden">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveTab(category)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    activeTab === category 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                    {filteredTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTemplates.map((template) => (
                                <div 
                                    key={template.id}
                                    className="group flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                >
                                    {/* Thumbnail Preview Area */}
                                    <div className="h-40 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center p-4 border-b border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {/* Abstract representation of template */}
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-300 to-transparent dark:from-slate-700"></div>
                                        
                                        <div className="relative z-10 flex gap-2 sm:gap-3 flex-wrap justify-center items-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                                            {template.previewColors.map((color, i) => (
                                                <div 
                                                    key={i} 
                                                    className="w-10 h-10 rounded-md shadow-sm border border-black/10"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        
                                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shadow-sm">
                                            {template.icon}
                                            {template.category}
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                                            {template.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
                                            {template.description}
                                        </p>
                                        
                                        <button 
                                            onClick={() => handleApply(template)}
                                            className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-blue-600 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 group/btn"
                                        >
                                            Use Template
                                            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">No templates found</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                                We couldn't find any templates matching "{searchQuery}" in this category.
                            </p>
                            <button 
                                onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
                                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
