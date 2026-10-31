'use client';

import React, { useState, useEffect } from 'react';
import {
    Database,
    CheckCircle2,
    AlertCircle,
    X,
    RefreshCw,
    Server,
    Shield,
    HardDrive,
    Save,
    Zap,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compilerAPI } from '@/lib/api';

export default function DatabaseEngineModal({
    isOpen,
    onClose,
    isDarkMode = true,
    onEngineChanged
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [engineConfig, setEngineConfig] = useState({
        activeEngine: 'mysql',
        fallbackToSqlite: true,
        mysql: { host: '127.0.0.1', port: 3306, user: 'root', password: '' },
        isMysqlOnline: false,
        mysqlVersion: null,
        mysqlError: null
    });
    const [selectedEngine, setSelectedEngine] = useState('mysql');
    const [fallback, setFallback] = useState(true);
    const [mysqlParams, setMysqlParams] = useState({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: ''
    });
    const [testStatus, setTestStatus] = useState(null); // { testing: false, success: null, message: '' }

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await compilerAPI.getEngineConfig();
            if (res.data?.success && res.data?.data) {
                const data = res.data.data;
                setEngineConfig(data);
                setSelectedEngine(data.activeEngine || 'mysql');
                setFallback(data.fallbackToSqlite !== false);
                setMysqlParams({
                    host: data.mysql?.host || '127.0.0.1',
                    port: data.mysql?.port || 3306,
                    user: data.mysql?.user || 'root',
                    password: ''
                });
            }
        } catch (err) {
            toast.error('Failed to load database engine configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                activeEngine: selectedEngine,
                fallbackToSqlite: fallback,
                mysql: {
                    host: mysqlParams.host,
                    port: parseInt(mysqlParams.port, 10) || 3306,
                    user: mysqlParams.user,
                    ...(mysqlParams.password ? { password: mysqlParams.password } : {})
                }
            };
            const res = await compilerAPI.updateEngineConfig(payload);
            if (res.data?.success) {
                toast.success(`Active Practice SQL Engine set to ${selectedEngine.toUpperCase()} globally!`);
                if (onEngineChanged) onEngineChanged(res.data.data);
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update database engine configuration');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const modalBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
    const subCardBg = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
    const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-primary-500' : 'bg-white border-slate-300 text-slate-800 focus:border-primary-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${modalBg}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold">SQL Database Engine Preselection</h2>
                            <p className="text-xs text-slate-400">
                                Preselect the practice SQL database engine globally for all students across the school.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                            <span className="text-sm">Inspecting Database Engine Status...</span>
                        </div>
                    ) : (
                        <>
                            {/* Engine Selection Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Option 1: MySQL */}
                                <div
                                    onClick={() => setSelectedEngine('mysql')}
                                    className={`relative p-4 rounded-xl border-2 transition cursor-pointer ${
                                        selectedEngine === 'mysql'
                                            ? 'border-primary-500 bg-primary-500/5 shadow-md'
                                            : `${subCardBg} hover:border-slate-600`
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl">🐬</span>
                                            <div>
                                                <h3 className="font-bold text-sm flex items-center gap-2">
                                                    MySQL 9.3 / 8.0+
                                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                        Recommended
                                                    </span>
                                                </h3>
                                                <span className="text-xs text-slate-400">Multi-User Isolated Schemas</span>
                                            </div>
                                        </div>
                                        <input
                                            type="radio"
                                            name="engine"
                                            checked={selectedEngine === 'mysql'}
                                            onChange={() => setSelectedEngine('mysql')}
                                            className="w-4 h-4 text-primary-600 cursor-pointer"
                                        />
                                    </div>
                                    <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                                        Each student gets a private, auto-provisioned schema (<code className="text-primary-400 text-[11px]">practice_stu_id</code>). 100% free for commercial SaaS/web use under GPLv2 via network socket.
                                    </p>
                                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">Service Status:</span>
                                        {engineConfig.isMysqlOnline ? (
                                            <span className="flex items-center gap-1 font-semibold text-emerald-400">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Online ({engineConfig.mysqlVersion || '9.3.0'})
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 font-semibold text-amber-400">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Offline (Will Fallback)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Option 2: SQLite */}
                                <div
                                    onClick={() => setSelectedEngine('sqlite')}
                                    className={`relative p-4 rounded-xl border-2 transition cursor-pointer ${
                                        selectedEngine === 'sqlite'
                                            ? 'border-primary-500 bg-primary-500/5 shadow-md'
                                            : `${subCardBg} hover:border-slate-600`
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl">🗄️</span>
                                            <div>
                                                <h3 className="font-bold text-sm">SQLite 3</h3>
                                                <span className="text-xs text-slate-400">Zero-Config File Engine</span>
                                            </div>
                                        </div>
                                        <input
                                            type="radio"
                                            name="engine"
                                            checked={selectedEngine === 'sqlite'}
                                            onChange={() => setSelectedEngine('sqlite')}
                                            className="w-4 h-4 text-primary-600 cursor-pointer"
                                        />
                                    </div>
                                    <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                                        Stores queries in private per-student SQLite files (<code className="text-primary-400 text-[11px]">practice.sqlite</code>). Works out of the box with zero external database daemons.
                                    </p>
                                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">Engine Type:</span>
                                        <span className="font-semibold text-emerald-400">
                                            Embedded / Always Available
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* MySQL Configuration Fields */}
                            {selectedEngine === 'mysql' && (
                                <div className={`p-4 rounded-xl border ${subCardBg} space-y-3`}>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                            <Server className="w-3.5 h-3.5 text-primary-400" />
                                            MySQL Server Parameters
                                        </h4>
                                        <span className="text-[11px] text-slate-400">Connected via MIT mysql2 driver</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">Host</label>
                                            <input
                                                type="text"
                                                value={mysqlParams.host}
                                                onChange={(e) => setMysqlParams({ ...mysqlParams, host: e.target.value })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                                                placeholder="127.0.0.1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">Port</label>
                                            <input
                                                type="number"
                                                value={mysqlParams.port}
                                                onChange={(e) => setMysqlParams({ ...mysqlParams, port: e.target.value })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                                                placeholder="3306"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">Root User</label>
                                            <input
                                                type="text"
                                                value={mysqlParams.user}
                                                onChange={(e) => setMysqlParams({ ...mysqlParams, user: e.target.value })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                                                placeholder="root"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1">Password</label>
                                            <input
                                                type="password"
                                                value={mysqlParams.password}
                                                onChange={(e) => setMysqlParams({ ...mysqlParams, password: e.target.value })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                                                placeholder="(blank if none)"
                                            />
                                        </div>
                                    </div>

                                    {/* Automatic Fallback Toggle */}
                                    <div className="pt-2 flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={fallback}
                                                onChange={(e) => setFallback(e.target.checked)}
                                                className="rounded text-primary-600 cursor-pointer"
                                            />
                                            <span>Seamless SQLite fallback if MySQL is offline or restarting</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Licensing & Commercial SaaS Notice */}
                            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/90 leading-relaxed space-y-1">
                                <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-blue-400" />
                                    Commercial SaaS & Institutional Licensing Transparency
                                </div>
                                <p className="text-[11px] text-blue-200/80">
                                    MySQL Community Edition is GPLv2 licensed. In web applications, running MySQL as a network-isolated service accessed over TCP via the MIT-licensed <code className="text-white font-mono">mysql2</code> client driver is completely free for commercial and institutional use without requiring a commercial OEM license.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between px-6 py-3.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="text-xs text-slate-400">
                        Current: <strong className="text-white uppercase">{engineConfig.activeEngine}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/25 transition cursor-pointer disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Apply Globally Across App</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
