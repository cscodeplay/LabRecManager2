'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, BarChart3, Monitor, Printer, Wifi, Speaker, Armchair, Table, Projector, Package,
    AlertTriangle, Clock, Shield, Download, FileText, Wrench, CheckCircle, XCircle
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { labsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const ITEM_TYPE_ICONS = {
    pc: { icon: Monitor, label: 'Computers', color: 'blue' },
    printer: { icon: Printer, label: 'Printers', color: 'purple' },
    router: { icon: Wifi, label: 'Routers', color: 'green' },
    speaker: { icon: Speaker, label: 'Speakers', color: 'amber' },
    projector: { icon: Projector, label: 'Projectors', color: 'red' },
    chair: { icon: Armchair, label: 'Chairs', color: 'slate' },
    table: { icon: Table, label: 'Tables', color: 'emerald' },
    other: { icon: Package, label: 'Other', color: 'gray' }
};

export default function InventoryReportsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!['admin', 'principal', 'lab_assistant'].includes(user?.role)) {
            router.push('/dashboard'); return;
        }
        loadData();
    }, [isAuthenticated, _hasHydrated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await labsAPI.getInventoryReports();
            setData(res.data.data);
        } catch (error) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = () => {
        // Create a printable version
        const printContent = document.getElementById('report-content');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Inventory Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1, h2, h3 { color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                    th { background: #f1f5f9; }
                    .alert { padding: 10px; margin: 5px 0; border-radius: 5px; }
                    .alert-red { background: #fef2f2; border: 1px solid #fecaca; }
                    .alert-amber { background: #fffbeb; border: 1px solid #fde68a; }
                    .alert-blue { background: #eff6ff; border: 1px solid #bfdbfe; }
                    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
                    .stat-card { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>Inventory Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/labs" className="text-slate-500 hover:text-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-primary-500" />
                            <h1 className="text-xl font-semibold text-slate-900">Inventory Reports</h1>
                        </div>
                    </div>
                    <button onClick={exportToPDF} className="btn btn-primary">
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6" id="report-content">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-6 text-center">
                        <Package className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                        <p className="text-3xl font-bold text-slate-900">{data?.totalItems || 0}</p>
                        <p className="text-sm text-slate-500">Total Items</p>
                    </div>
                    <div className="card p-6 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-3xl font-bold text-emerald-600">{data?.statsByStatus?.active || 0}</p>
                        <p className="text-sm text-slate-500">Active</p>
                    </div>
                    <div className="card p-6 text-center">
                        <Wrench className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                        <p className="text-3xl font-bold text-amber-600">{data?.statsByStatus?.maintenance || 0}</p>
                        <p className="text-sm text-slate-500">Maintenance</p>
                    </div>
                    <div className="card p-6 text-center">
                        <XCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-3xl font-bold text-slate-500">{data?.statsByStatus?.retired || 0}</p>
                        <p className="text-sm text-slate-500">Retired</p>
                    </div>
                </div>

                {/* Items by Type */}
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Items by Type</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        {Object.entries(ITEM_TYPE_ICONS).map(([type, { icon: Icon, label, color }]) => {
                            const count = data?.statsByType?.[type] || 0;
                            return (
                                <div key={type} className={`p-4 rounded-xl bg-${color}-50 text-center`}>
                                    <Icon className={`w-6 h-6 mx-auto mb-2 text-${color}-500`} />
                                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                                    <p className="text-xs text-slate-500">{label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Alerts Section */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Maintenance Alerts */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Wrench className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-slate-900">Maintenance Alerts</h2>
                            <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-sm rounded-full">
                                {data?.maintenanceAlerts?.length || 0}
                            </span>
                        </div>
                        {data?.maintenanceAlerts?.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {data.maintenanceAlerts.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900">{item.itemNumber}</p>
                                            <p className="text-xs text-slate-500">{item.lab?.name} • {item.brand || 'N/A'}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">Maintenance</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-4">No items in maintenance</p>
                        )}
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h2>
                            <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-sm rounded-full">
                                {data?.lowStockAlerts?.length || 0}
                            </span>
                        </div>
                        {data?.lowStockAlerts?.length > 0 ? (
                            <div className="space-y-2">
                                {data.lowStockAlerts.map(alert => (
                                    <div key={alert.type} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const Icon = ITEM_TYPE_ICONS[alert.type]?.icon || Package;
                                                return <Icon className="w-5 h-5 text-slate-500" />;
                                            })()}
                                            <span className="font-medium text-slate-900">{alert.label}</span>
                                        </div>
                                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                            Only {alert.count} item{alert.count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-4">All stock levels OK</p>
                        )}
                    </div>
                </div>

                {/* Warranty Alerts */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-slate-900">Warranty Expiration Alerts</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* Expired or Expiring in 30 days */}
                        <div className="p-4 bg-red-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-red-700">Expired / Next 30 Days</span>
                            </div>
                            <p className="text-3xl font-bold text-red-600 mb-2">{data?.warrantyAlerts?.expiredOrExpiring30?.length || 0}</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {data?.warrantyAlerts?.expiredOrExpiring30?.slice(0, 5).map(item => (
                                    <p key={item.id} className="text-xs text-red-700">{item.itemNumber}</p>
                                ))}
                            </div>
                        </div>
                        {/* Expiring in 60 days */}
                        <div className="p-4 bg-amber-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="font-medium text-amber-700">30-60 Days</span>
                            </div>
                            <p className="text-3xl font-bold text-amber-600 mb-2">{data?.warrantyAlerts?.expiring60?.length || 0}</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {data?.warrantyAlerts?.expiring60?.slice(0, 5).map(item => (
                                    <p key={item.id} className="text-xs text-amber-700">{item.itemNumber}</p>
                                ))}
                            </div>
                        </div>
                        {/* Expiring in 90 days */}
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-blue-700">60-90 Days</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-600 mb-2">{data?.warrantyAlerts?.expiring90?.length || 0}</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {data?.warrantyAlerts?.expiring90?.slice(0, 5).map(item => (
                                    <p key={item.id} className="text-xs text-blue-700">{item.itemNumber}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Labs Summary */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Labs Summary</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Lab Name</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Room</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Total Items</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data?.labs?.map(lab => (
                                    <tr key={lab.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{lab.name}</td>
                                        <td className="px-4 py-3 text-slate-600">{lab.roomNumber || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600">{lab._count?.items || 0}</td>
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/labs/${lab.id}/pcs`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                                View Inventory →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
