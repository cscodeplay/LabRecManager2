'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Save, X, Users, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

export default function CreateClassPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        nameHindi: '',
        gradeLevel: '',
        section: '',
        stream: '',
        academicYearId: '',
        classTeacherId: '',
        maxStudents: 50
    });

    const getCurrentAcademicYearLabel = () => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        if (month >= 4) {
            return `${year}-${year + 1}`;
        } else {
            return `${year - 1}-${year}`;
        }
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'admin' && user?.role !== 'principal') {
            router.push('/classes');
            toast.error(t('common.noData'));
            return;
        }
        loadFormData();
    }, [isAuthenticated, user, _hasHydrated]);

    const loadFormData = async () => {
        try {
            const [yearsRes, usersRes] = await Promise.all([
                api.get('/academic-years'),
                api.get('/users?role=instructor&limit=100')
            ]);

            const years = yearsRes.data.data.academicYears || [];
            setAcademicYears(years);
            setInstructors(usersRes.data.data.users || []);

            const currentLabel = getCurrentAcademicYearLabel();
            const matchingYear = years.find(y => y.yearLabel === currentLabel || y.yearLabel === currentLabel.replace('-', '-20'));
            const currentYear = matchingYear || years.find(y => y.isCurrent);

            if (currentYear) {
                setFormData(prev => ({ ...prev, academicYearId: currentYear.id }));
            }
        } catch (error) {
            console.error('Failed to load form data:', error);
            toast.error(t('common.noData'));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.gradeLevel || !formData.academicYearId) {
            toast.error(t('common.noData'));
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/classes', {
                ...formData,
                gradeLevel: parseInt(formData.gradeLevel),
                maxStudents: parseInt(formData.maxStudents)
            });

            toast.success(t('common.save'));
            router.push(`/classes/${response.data.data.class.id}`);
        } catch (error) {
            console.error('Failed to create class:', error);
            toast.error(error.response?.data?.message || t('common.noData'));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateClassName = () => {
        const grade = formData.gradeLevel;
        if (!grade) return '';

        const section = formData.section;
        const stream = formData.stream;

        let name = `Class ${grade}`;
        if (section) name += `-${section}`;
        if (stream) name += ` (${stream})`;

        return name;
    };

    useEffect(() => {
        if (formData.gradeLevel) {
            const generatedName = generateClassName();
            setFormData(prev => ({ ...prev, name: generatedName }));
        }
    }, [formData.gradeLevel, formData.section, formData.stream]);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title={t('classes.createClass')} titleHindi="नई कक्षा बनाएं" backLink="/classes" />

            <main className="max-w-3xl mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900">{t('common.description')}</h2>
                                <p className="text-sm text-slate-500">{t('classes.className')}</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('classes.gradeLevel')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="gradeLevel"
                                    value={formData.gradeLevel}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    <option value="">{t('classes.gradeLevel')}</option>
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            Grade {i + 1} (Class {i + 1})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('classes.section')}
                                </label>
                                <select
                                    name="section"
                                    value={formData.section}
                                    onChange={handleChange}
                                    className="input"
                                >
                                    <option value="">{t('classes.section')}</option>
                                    {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('classes.className')}
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    readOnly
                                    className="input bg-slate-100 cursor-not-allowed"
                                    placeholder={t('classes.gradeLevel')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('classes.classNameHindi')}
                                </label>
                                <input
                                    type="text"
                                    name="nameHindi"
                                    value={formData.nameHindi}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="e.g., कक्षा 10-अ"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('classes.stream')}
                                </label>
                                <select
                                    name="stream"
                                    value={formData.stream}
                                    onChange={handleChange}
                                    className="input"
                                >
                                    <option value="">{t('classes.general')}</option>
                                    <option value="Commerce">Commerce (वाणिज्य)</option>
                                    <option value="NonMedical">Non-Medical / PCM (नॉन-मेडिकल)</option>
                                    <option value="Medical">Medical / PCB (मेडिकल)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Max {t('classes.students')}
                                </label>
                                <input
                                    type="number"
                                    name="maxStudents"
                                    value={formData.maxStudents}
                                    onChange={handleChange}
                                    className="input"
                                    min="10"
                                    max="100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Year & Instructor */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900">{t('auth.academicSession')}</h2>
                                <p className="text-sm text-slate-500">{t('classes.classTeacher')}</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('auth.academicSession')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="academicYearId"
                                    value={formData.academicYearId}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    <option value="">{t('auth.academicSession')}</option>
                                    {academicYears.map(year => (
                                        <option key={year.id} value={year.id}>
                                            {year.yearLabel} {year.isCurrent ? `(${t('auth.current')})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('classes.classTeacher')}
                                </label>
                                <select
                                    name="classTeacherId"
                                    value={formData.classTeacherId}
                                    onChange={handleChange}
                                    className="input"
                                >
                                    <option value="">{t('classes.selectTeacher')}</option>
                                    {instructors.map(instructor => (
                                        <option key={instructor.id} value={instructor.id}>
                                            {instructor.firstName} {instructor.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {formData.gradeLevel && (
                        <div className="card p-6 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
                            <h3 className="text-sm font-medium text-primary-800 mb-3">{t('common.view')}</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold text-primary-600 shadow-sm">
                                    {formData.gradeLevel}
                                    {formData.section && <span className="text-lg">{formData.section}</span>}
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-primary-900">{formData.name || t('classes.className')}</h4>
                                    {formData.nameHindi && (
                                        <p className="text-primary-700">{formData.nameHindi}</p>
                                    )}
                                    <p className="text-sm text-primary-600">
                                        {formData.stream || t('classes.general')} • Max {formData.maxStudents} {t('classes.students')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Link href="/classes" className="p-3 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition" title={t('common.cancel')}>
                            <X className="w-5 h-5" />
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:hover:bg-primary-600"
                            title={t('classes.createClass')}
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
