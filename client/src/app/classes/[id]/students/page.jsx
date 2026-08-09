'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Search, UserPlus, RefreshCw, GraduationCap, Mail } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ClassStudentsPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [classData, setClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadData();
    }, [isAuthenticated, _hasHydrated, params.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [classRes, studentsRes] = await Promise.all([
                classesAPI.getById(params.id),
                classesAPI.getStudents(params.id)
            ]);
            setClassData(classRes.data.data.class);
            setStudents(studentsRes.data.data.students || []);
        } catch (error) {
            toast.error('Failed to load class data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const className = classData?.name || `Class ${classData?.gradeLevel}-${classData?.section}`;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/classes/${params.id}`} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Back to Class">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary-600" />
                                    {className} - Students
                                </h1>
                                <p className="text-sm text-slate-500">{students.length} students enrolled</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                            <button onClick={loadData} className="p-2 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition" title="Refresh Roster">
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <Link href={`/classes/${params.id}`} className="p-2 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition" title="Open Class Management">
                                <UserPlus className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Search */}
                <div className="card p-4 mb-6">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                </div>

                {/* Students Grid */}
                {filteredStudents.length === 0 ? (
                    <div className="card p-12 text-center">
                        <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">No students found</h3>
                        <p className="text-slate-500">
                            {searchQuery ? 'Try a different search' : 'No students are enrolled in this class yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStudents.map(student => (
                            <div key={student.id} className="card hover:shadow-md hover:border-slate-300 transition group flex flex-col overflow-hidden">
                                <div className="p-5 flex-1">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0">
                                            <span className="text-primary-700 font-semibold text-lg">
                                                {student.firstName?.[0]}{student.lastName?.[0]}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900 truncate">
                                                        {student.firstName} {student.lastName}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 truncate mb-1">{student.email}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                                    <span className="font-medium text-slate-500">ID:</span> {student.studentId || student.admissionNumber || '-'}
                                                </p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.isActive
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {student.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-500">
                                    <Link href={`mailto:${student.email}`} className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors" title="Email Student">
                                        <Mail className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
