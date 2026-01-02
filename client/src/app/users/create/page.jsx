'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, X, Save, User, Mail, Phone, GraduationCap, Briefcase, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api, { usersAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

export default function CreateUserPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        firstNameHindi: '',
        lastNameHindi: '',
        email: '',
        phone: '',
        role: 'student',
        studentId: '',
        admissionNumber: '',
        employeeId: '',
        classId: '',
        password: ''
    });

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!['admin', 'principal'].includes(user?.role)) {
            router.push('/dashboard');
            toast.error('Only admins can create users');
            return;
        }
        loadClasses();
    }, [isAuthenticated, user, _hasHydrated]);

    const loadClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data.data.classes || []);
        } catch (error) {
            console.error('Failed to load classes:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (!formData.email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                firstNameHindi: formData.firstNameHindi.trim() || undefined,
                lastNameHindi: formData.lastNameHindi.trim() || undefined,
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim() || undefined,
                role: formData.role,
                password: formData.password || 'password123',
                ...(formData.role === 'student' && {
                    studentId: formData.studentId.trim() || undefined,
                    admissionNumber: formData.admissionNumber.trim() || formData.studentId.trim() || undefined,
                    classId: formData.classId || undefined
                }),
                ...(['instructor', 'lab_assistant', 'admin', 'principal'].includes(formData.role) && {
                    employeeId: formData.employeeId.trim() || undefined
                })
            };

            const res = await usersAPI.create(payload);

            if (res.data.success) {
                toast.success(res.data.message || 'User created successfully');

                // Show PIN if generated for student
                if (res.data.data.loginPin) {
                    toast.success(`Login PIN: ${res.data.data.loginPin} (expires in ${res.data.data.pinExpiresIn})`, {
                        duration: 10000
                    });
                }

                router.push('/users');
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            toast.error(error.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const roleOptions = [
        { value: 'student', label: 'Student', icon: GraduationCap },
        { value: 'instructor', label: 'Instructor', icon: User },
        { value: 'lab_assistant', label: 'Lab Assistant', icon: Briefcase },
        { value: 'admin', label: 'Admin', icon: KeyRound },
        { value: 'principal', label: 'Principal', icon: KeyRound }
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title="Create User" titleHindi="उपयोगकर्ता बनाएं">
                <Link href="/users" className="btn btn-ghost">
                    <X className="w-4 h-4" />
                    Cancel
                </Link>
            </PageHeader>

            <main className="max-w-2xl mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">New User</h2>
                            <p className="text-sm text-slate-500">Fill in the details to create a new user account</p>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {roleOptions.map(opt => {
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, role: opt.value }))}
                                        className={`p-3 rounded-xl border-2 text-center transition ${formData.role === opt.value
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-slate-200 hover:border-primary-300'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 mx-auto mb-1" />
                                        <span className="text-xs font-medium">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="Enter first name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="Enter last name"
                                required
                            />
                        </div>
                    </div>

                    {/* Hindi Name Fields (Optional) */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name (Hindi)</label>
                            <input
                                type="text"
                                name="firstNameHindi"
                                value={formData.firstNameHindi}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="पहला नाम"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name (Hindi)</label>
                            <input
                                type="text"
                                name="lastNameHindi"
                                value={formData.lastNameHindi}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="अंतिम नाम"
                            />
                        </div>
                    </div>

                    {/* Contact Fields */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="9876543210"
                            />
                        </div>
                    </div>

                    {/* Student-specific fields */}
                    {formData.role === 'student' && (
                        <>
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                                    <input
                                        type="text"
                                        name="studentId"
                                        value={formData.studentId}
                                        onChange={handleChange}
                                        className="input w-full"
                                        placeholder="STU-2024-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number</label>
                                    <input
                                        type="text"
                                        name="admissionNumber"
                                        value={formData.admissionNumber}
                                        onChange={handleChange}
                                        className="input w-full"
                                        placeholder="ADM-2024-001"
                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Enroll in Class (Optional)</label>
                                <select
                                    name="classId"
                                    value={formData.classId}
                                    onChange={handleChange}
                                    className="input w-full"
                                >
                                    <option value="">-- No Class --</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name} ({cls.gradeLevel}{cls.section || ''})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Staff-specific fields */}
                    {['instructor', 'lab_assistant', 'admin', 'principal'].includes(formData.role) && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                            <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="EMP-001"
                            />
                        </div>
                    )}

                    {/* Password */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            <KeyRound className="w-4 h-4 inline mr-1" />
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input w-full"
                            placeholder="Leave empty for default: password123"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {formData.role === 'student'
                                ? 'A login PIN will be auto-generated for the student.'
                                : 'Default password is "password123" if left empty.'}
                        </p>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <Link href="/users" className="btn btn-ghost">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Create User
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
