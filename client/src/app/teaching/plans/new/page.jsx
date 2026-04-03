'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import api, { teachingAPI, timetableAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Calendar, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateLecturePlan() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    
    const [loading, setLoading] = useState(false);
    const [fetchingFormData, setFetchingFormData] = useState(true);
    
    // Form data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    
    const [formData, setFormData] = useState({
        classId: '',
        subjectId: '',
        title: '',
        titleHindi: '',
        description: '',
        lectureNumber: 1,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledDuration: 40,
        lectureType: 'theory',
        notes: '',
        homeworkDescription: ''
    });

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        
        const loadFormData = async () => {
            try {
                // Fetch classes and subjects for this instructor
                const [classesRes, subjectsRes] = await Promise.all([
                    api.get('/classes'),
                    api.get('/subjects')
                ]);
                
                setClasses(classesRes.data.data.classes || []);
                setSubjects(subjectsRes.data.data.subjects || []);
            } catch (err) {
                toast.error('Failed to load form data');
            } finally {
                setFetchingFormData(false);
            }
        };
        
        loadFormData();
    }, [_hasHydrated, isAuthenticated, selectedSessionId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.classId || !formData.subjectId || !formData.scheduledDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await teachingAPI.createPlan(formData);
            toast.success('Lecture plan created successfully!');
            router.push('/teaching/plans');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create lecture plan');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!_hasHydrated || fetchingFormData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <PageHeader 
                title="Create Lecture Plan"
                backLink="/teaching/plans"
            />

            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="card p-6 md:p-8 bg-white dark:bg-slate-800 border">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Course selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <label className="label">Class <span className="text-red-500">*</span></label>
                                <select 
                                    name="classId" 
                                    value={formData.classId} 
                                    onChange={handleChange}
                                    className="input" 
                                    required
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Subject <span className="text-red-500">*</span></label>
                                <select 
                                    name="subjectId" 
                                    value={formData.subjectId} 
                                    onChange={handleChange}
                                    className="input" 
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.nameHindi ? `(${s.nameHindi})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Timing and settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <label className="label">Scheduled Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    name="scheduledDate" 
                                    value={formData.scheduledDate} 
                                    onChange={handleChange}
                                    className="input" 
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Duration (min)</label>
                                <input 
                                    type="number" 
                                    name="scheduledDuration" 
                                    value={formData.scheduledDuration} 
                                    onChange={handleChange}
                                    min="15"
                                    step="5"
                                    className="input" 
                                />
                            </div>
                            <div>
                                <label className="label">Lecture Type</label>
                                <select 
                                    name="lectureType" 
                                    value={formData.lectureType} 
                                    onChange={handleChange}
                                    className="input"
                                >
                                    <option value="theory">Theory</option>
                                    <option value="practical">Practical / Lab</option>
                                    <option value="demo">Demonstration</option>
                                    <option value="revision">Revision</option>
                                    <option value="assessment">Assessment</option>
                                </select>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-4 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="label">Lecture #</label>
                                    <input 
                                        type="number" 
                                        name="lectureNumber" 
                                        value={formData.lectureNumber} 
                                        onChange={handleChange}
                                        min="1"
                                        className="input" 
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="label">Title (English) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="title" 
                                        value={formData.title} 
                                        onChange={handleChange}
                                        placeholder="e.g. Introduction to Physics"
                                        className="input" 
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Title (Hindi) - Optional</label>
                                <input 
                                    type="text" 
                                    name="titleHindi" 
                                    value={formData.titleHindi} 
                                    onChange={handleChange}
                                    placeholder="e.g. भौतिकी का परिचय"
                                    className="input" 
                                    lang="hi"
                                />
                            </div>

                            <div>
                                <label className="label">Overview / Description</label>
                                <textarea 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleChange}
                                    placeholder="Brief overview of what will be covered..."
                                    className="input resize-none h-24"
                                />
                            </div>
                        </div>

                        {/* Additional info */}
                        <div className="space-y-4">
                            <div>
                                <label className="label">Homework / Assignments</label>
                                <textarea 
                                    name="homeworkDescription" 
                                    value={formData.homeworkDescription} 
                                    onChange={handleChange}
                                    placeholder="Any tasks for students..."
                                    className="input resize-none h-20"
                                />
                            </div>
                            
                            <div>
                                <label className="label">Instructor Private Notes</label>
                                <textarea 
                                    name="notes" 
                                    value={formData.notes} 
                                    onChange={handleChange}
                                    placeholder="Notes only visible to you..."
                                    className="input bg-amber-50 dark:bg-amber-900/10 resize-none h-20"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 flex items-center justify-end gap-3">
                            <Link href="/teaching/plans" className="btn btn-ghost">
                                Cancel
                            </Link>
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="btn btn-primary"
                            >
                                {loading ? 'Saving...' : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Save Lecture Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
