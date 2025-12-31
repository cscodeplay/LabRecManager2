'use client';

import { useState, useEffect } from 'react';
import { Building, Upload, Save, Image, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { schoolAPI } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

export default function SchoolProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        nameHindi: '',
        nameRegional: '',
        address: '',
        state: '',
        district: '',
        pinCode: '',
        email: '',
        phone1: '',
        phone2: '',
        logoUrl: '',
        letterheadUrl: '',
        boardAffiliation: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const res = await schoolAPI.getProfile();
            if (res.data.success) {
                setProfile({
                    name: res.data.data.name || '',
                    nameHindi: res.data.data.nameHindi || '',
                    nameRegional: res.data.data.nameRegional || '',
                    address: res.data.data.address || '',
                    state: res.data.data.state || '',
                    district: res.data.data.district || '',
                    pinCode: res.data.data.pinCode || '',
                    email: res.data.data.email || '',
                    phone1: res.data.data.phone1 || '',
                    phone2: res.data.data.phone2 || '',
                    logoUrl: res.data.data.logoUrl || '',
                    letterheadUrl: res.data.data.letterheadUrl || '',
                    boardAffiliation: res.data.data.boardAffiliation || ''
                });
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast.error('Failed to load school profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await schoolAPI.updateProfile(profile);
            if (res.data.success) {
                toast.success('School profile saved successfully');
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast.error('Failed to save school profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.loading('Uploading logo...', { id: 'logo-upload' });
            const res = await schoolAPI.uploadLogo(file);
            if (res.data.success) {
                setProfile(prev => ({ ...prev, logoUrl: res.data.data.url }));
                toast.success('Logo uploaded', { id: 'logo-upload' });
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            toast.error('Failed to upload logo', { id: 'logo-upload' });
        }
    };

    const handleLetterheadUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.loading('Uploading letterhead...', { id: 'letterhead-upload' });
            const res = await schoolAPI.uploadLetterhead(file);
            if (res.data.success) {
                setProfile(prev => ({ ...prev, letterheadUrl: res.data.data.url }));
                toast.success('Letterhead uploaded', { id: 'letterhead-upload' });
            }
        } catch (error) {
            console.error('Letterhead upload error:', error);
            toast.error('Failed to upload letterhead', { id: 'letterhead-upload' });
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <PageHeader
                title="School Profile"
                subtitle="Manage your institution's details for letterheads and documents"
                icon={Building}
            />

            <div className="card mt-6">
                <div className="card-body space-y-6">
                    {/* Logo and Letterhead Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo */}
                        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center">
                            <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
                                <Image className="w-4 h-4" /> School Logo
                            </h3>
                            {profile.logoUrl ? (
                                <div className="mb-3">
                                    <img src={profile.logoUrl} alt="School Logo" className="max-h-24 mx-auto rounded" />
                                </div>
                            ) : (
                                <div className="mb-3 p-6 bg-slate-100 rounded">
                                    <Image className="w-12 h-12 mx-auto text-slate-400" />
                                </div>
                            )}
                            <label className="btn btn-secondary text-sm cursor-pointer">
                                <Upload className="w-4 h-4" /> Upload Logo
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                        </div>

                        {/* Letterhead */}
                        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center">
                            <h3 className="font-semibold mb-2 flex items-center justify-center gap-2">
                                <Image className="w-4 h-4" /> Letterhead Image
                            </h3>
                            {profile.letterheadUrl ? (
                                <div className="mb-3">
                                    <img src={profile.letterheadUrl} alt="Letterhead" className="max-h-24 mx-auto rounded" />
                                </div>
                            ) : (
                                <div className="mb-3 p-6 bg-slate-100 rounded">
                                    <Image className="w-12 h-12 mx-auto text-slate-400" />
                                </div>
                            )}
                            <label className="btn btn-secondary text-sm cursor-pointer">
                                <Upload className="w-4 h-4" /> Upload Letterhead
                                <input type="file" accept="image/*" className="hidden" onChange={handleLetterheadUpload} />
                            </label>
                        </div>
                    </div>

                    {/* School Name */}
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2">School Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="label">School Name (English) *</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="input"
                                    placeholder="School Name"
                                />
                            </div>
                            <div>
                                <label className="label">School Name (Hindi)</label>
                                <input
                                    type="text"
                                    value={profile.nameHindi}
                                    onChange={(e) => setProfile({ ...profile, nameHindi: e.target.value })}
                                    className="input"
                                    placeholder="विद्यालय का नाम"
                                />
                            </div>
                            <div>
                                <label className="label">Board Affiliation</label>
                                <input
                                    type="text"
                                    value={profile.boardAffiliation}
                                    onChange={(e) => setProfile({ ...profile, boardAffiliation: e.target.value })}
                                    className="input"
                                    placeholder="e.g., CBSE, ICSE, State Board"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Address Details
                        </h3>
                        <div>
                            <label className="label">Full Address</label>
                            <textarea
                                value={profile.address}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                className="input min-h-[80px]"
                                placeholder="Complete address including building, street, area..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="label">District</label>
                                <input
                                    type="text"
                                    value={profile.district}
                                    onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                                    className="input"
                                    placeholder="District"
                                />
                            </div>
                            <div>
                                <label className="label">State</label>
                                <input
                                    type="text"
                                    value={profile.state}
                                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                    className="input"
                                    placeholder="State"
                                />
                            </div>
                            <div>
                                <label className="label">PIN Code</label>
                                <input
                                    type="text"
                                    value={profile.pinCode}
                                    onChange={(e) => setProfile({ ...profile, pinCode: e.target.value })}
                                    className="input"
                                    placeholder="123456"
                                    maxLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-4">
                        <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Contact Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="label flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Email Address
                                </label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="input"
                                    placeholder="school@example.com"
                                />
                            </div>
                            <div>
                                <label className="label flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Contact Number 1
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone1}
                                    onChange={(e) => setProfile({ ...profile, phone1: e.target.value })}
                                    className="input"
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                            <div>
                                <label className="label flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Contact Number 2
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone2}
                                    onChange={(e) => setProfile({ ...profile, phone2: e.target.value })}
                                    className="input"
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 border-t flex justify-end">
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Save Profile
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
