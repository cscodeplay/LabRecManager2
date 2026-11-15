'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Plus, FileText, Users, ShoppingCart, Package,
    Check, X, Printer, Edit2, Trash2, ChevronDown, ChevronUp,
    Building, Calculator, ClipboardList, UserPlus, Eye,
    Truck, CreditCard, Receipt, ScanLine, Video, CheckCircle2,
    Calendar, Lock, Save, ChevronLeft, ChevronRight, Download,
    CloudUpload, Mail, Pencil
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { procurementAPI, uploadAPI } from '@/lib/api';
import VoiceInputButton from '@/components/VoiceInputButton';
import LabInfrastructureTabs from '@/components/LabInfrastructureTabs';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/dateUtils';

const STATUS_COLORS = {
    draft: 'bg-slate-100 text-slate-700',
    quotation_requested: 'bg-blue-100 text-blue-700',
    quotes_received: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    ordered: 'bg-indigo-100 text-indigo-700',
    billed: 'bg-amber-100 text-amber-700',
    paid: 'bg-teal-100 text-teal-700',
    received: 'bg-cyan-100 text-cyan-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700'
};

const STATUS_LABELS = {
    draft: 'Draft',
    quotation_requested: 'Quotation Requested',
    quotes_received: 'Quotes Received',
    approved: 'Approved',
    ordered: 'Ordered',
    billed: 'Billed',
    paid: 'Paid',
    received: 'Received',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

export default function ProcurementPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId, selectedSession, isReadOnlyMode } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [activeTab, setActiveTab] = useState('requests'); // requests, vendors
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [committeeRole, setCommitteeRole] = useState('member');

    // Create Request Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [requestForm, setRequestForm] = useState({
        title: '', description: '', purpose: '', department: '', budgetCode: '',
        items: [{ itemName: '', specifications: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: '' }]
    });

    // Vendor Modal
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [vendorForm, setVendorForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '', isLocal: false });
    const [editingVendor, setEditingVendor] = useState(null);

    // Request Detail Modal
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [requestDetail, setRequestDetail] = useState(null);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [quotationForm, setQuotationForm] = useState({
        vendorId: '', quotationNumber: '', quotationDate: '', validUntil: '', terms: '', remarks: '',
        items: []
    });

    // Flow state
    const [labs, setLabs] = useState([]);
    const [orderForm, setOrderForm] = useState({ poNumber: '', poUrl: '' });
    const [billForm, setBillForm] = useState({ billNumber: '', billDate: '', billAmount: '', billUrl: '' });
    const [paymentForm, setPaymentForm] = useState({ paymentMethod: 'bank_transfer', chequeNumber: '', chequeUrl: '', paymentDate: '', paymentReference: '' });
    const [receiveForm, setReceiveForm] = useState({ receivingVideoUrl: '', receivingNotes: '' });
    const [selectedLabId, setSelectedLabId] = useState('');

    // Workflow step state (0=Request Info for new, 1-10 for existing)
    const [workflowStep, setWorkflowStep] = useState(0);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [selectedVendorIds, setSelectedVendorIds] = useState([]);

    // Save progress indicator state
    const [saveProgress, setSaveProgress] = useState({ active: false, percent: 0, statusText: '' });

    // Step 5-7 state
    const [vendorQuotationPrices, setVendorQuotationPrices] = useState({}); // { vendorId: { itemId: price } }
    const [vendorQuotationNumbers, setVendorQuotationNumbers] = useState({}); // { vendorId: string }
    const [vendorItemGst, setVendorItemGst] = useState({}); // { vendorId: { itemId: number } }
    const [vendorGlobalGst, setVendorGlobalGst] = useState({}); // { vendorId: number }
    const [selectedVendorForPurchase, setSelectedVendorForPurchase] = useState(null);
    const [gstRate, setGstRate] = useState(18);

    // Step 5: GST settings per vendor and quotation document URLs
    const [vendorGstSettings, setVendorGstSettings] = useState({}); // { vendorId: { addGst: true, gstRate: 18 } }
    const [vendorQuotationDocs, setVendorQuotationDocs] = useState({}); // { vendorId: 'filename' }

    // Step 7: Editable quantities
    const [editableQuantities, setEditableQuantities] = useState({}); // { itemId: quantity }

    // Step 3: New item form & edit state
    const [newItemForm, setNewItemForm] = useState({ itemName: '', specifications: '', warranty: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: '' });
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingItemForm, setEditingItemForm] = useState({ itemName: '', specifications: '', warranty: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: '' });

    // Step 4: Submission deadline & email dispatch state
    const [lastDateToSubmit, setLastDateToSubmit] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    const [emailModal, setEmailModal] = useState({ open: false, vendor: null, email: '', notes: '', sending: false });

    // Step 1: Letter content state
    const [letterContent, setLetterContent] = useState('');
    const [letterUpload, setLetterUpload] = useState(null); // Track uploaded file
    const [memoVideNo, setMemoVideNo] = useState(''); // Memo Vide No for proceedings
    const [proceedingsDate, setProceedingsDate] = useState(new Date().toISOString().split('T')[0]);

    // Step 9: Bill & Payment state
    const [billUpload, setBillUpload] = useState(null);
    const [chequeUpload, setChequeUpload] = useState(null);
    const [chequeNumber, setChequeNumber] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [billAmount, setBillAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cheque');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    // Step 9: Items received state
    const [receivedItems, setReceivedItems] = useState({}); // { itemId: { received: qty, serialNumbers: [] } }

    // Validation functions for each step
    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!requestDetail?.request?.purchaseLetterUrl && !letterContent.trim()) {
                    toast.error('Please upload a letter or enter letter content');
                    return false;
                }
                return true;
            case 2:
                if (!requestDetail?.request?.committee?.length || requestDetail.request.committee.length < 3) {
                    toast.error('Please add at least 3 committee members');
                    return false;
                }
                return true;
            case 3:
                if (!requestDetail?.request?.items?.length) {
                    toast.error('Please add at least one item');
                    return false;
                }
                return true;
            case 4:
                const minVendors = (requestDetail?.request?.estimatedTotal || 0) > 100000 ? 5 : 3;
                if (selectedVendorIds.length < minVendors) {
                    toast.error(`Please select at least ${minVendors} vendors`);
                    return false;
                }
                const localVendorsSelected = selectedVendorIds.filter(id => vendors.find(v => v.id === id)?.isLocal).length;
                if (localVendorsSelected < 1) {
                    toast.error('At least 1 local vendor must be selected');
                    return false;
                }
                return true;
            case 5:
                const hasPrices = selectedVendorIds.every(vendorId => {
                    const prices = vendorQuotationPrices[vendorId] || {};
                    return Object.values(prices).some(p => parseFloat(p) > 0) ||
                        requestDetail?.request?.quotations?.find(q => (q.vendor?.id || q.vendorId) === vendorId);
                });

                if (!hasPrices) {
                    toast.error('Please enter quotation prices for all selected vendors');
                    return false;
                }
                return true;
            case 6:
                const lowest = getLowestVendor();
                if (!selectedVendorForPurchase && !lowest.vendorId) {
                    toast.error('Please enter quotation prices in Step 5');
                    return false;
                }
                return true;
            case 7:
                return true;
            case 8:
                return true;
            case 9:
                if (!billUpload && !requestDetail?.request?.billUrl && !billNumber.trim() && !requestDetail?.request?.billNumber) {
                    toast.error('Please enter bill number or upload bill document');
                    return false;
                }
                return true;
            case 10:
                return true;
            default:
                return true;
        }
    };

    // Save step data to backend with animated progress bar
    const saveStepData = async (step) => {
        setSaveProgress({ active: true, percent: 25, statusText: 'Saving data...' });
        try {
            switch (step) {
                case 1:
                    if (letterUpload && letterUpload instanceof File) {
                        setSaveProgress({ active: true, percent: 55, statusText: 'Uploading letter...' });
                        const uploadRes = await uploadAPI.uploadProcurementDoc(
                            selectedRequest.id,
                            'purchaseLetter',
                            letterUpload
                        );
                        if (uploadRes.data?.success) {
                            toast.success('Letter uploaded successfully!');
                        }
                    } else if (letterContent.trim()) {
                        setSaveProgress({ active: true, percent: 55, statusText: 'Saving letter content...' });
                        await procurementAPI.uploadPurchaseLetter(selectedRequest.id, {
                            letterContent: letterContent.trim()
                        });
                    }
                    if (memoVideNo.trim()) {
                        await procurementAPI.updateRequest(selectedRequest.id, {
                            memoVideNo: memoVideNo.trim()
                        });
                    }
                    setSaveProgress({ active: true, percent: 85, statusText: 'Refreshing data...' });
                    await openRequestDetail(selectedRequest, true);
                    break;
                case 2:
                    await openRequestDetail(selectedRequest, true);
                    break;
                case 3:
                    await openRequestDetail(selectedRequest, true);
                    break;
                case 4:
                    // Selected vendors are tracked in state
                    break;
                case 5:
                    setSaveProgress({ active: true, percent: 45, statusText: 'Saving vendor quotations...' });
                    for (const vendorId of selectedVendorIds) {
                        const prices = vendorQuotationPrices[vendorId] || {};
                        const items = requestDetail?.request?.items || [];
                        const hasAnyPrice = items.some(item => prices[item.id] && parseFloat(prices[item.id]) > 0);

                        if (hasAnyPrice) {
                            const existingQuotation = requestDetail?.request?.quotations?.find(q => (q.vendor?.id || q.vendorId) === vendorId);
                            const qNumber = vendorQuotationNumbers[vendorId]?.trim() || `QT-${Date.now().toString(36).toUpperCase()}`;

                            if (!existingQuotation) {
                                const newQuotationRes = await procurementAPI.addQuotation(selectedRequest.id, {
                                    vendorId,
                                    quotationNumber: qNumber,
                                    quotationDate: new Date().toISOString().split('T')[0],
                                    items: items.map(item => ({
                                        procurementItemId: item.id,
                                        unitPrice: parseFloat(prices[item.id]) || 0,
                                        quantity: item.quantity
                                    }))
                                });

                                const docFile = vendorQuotationDocs[vendorId];
                                if (docFile && docFile instanceof File && newQuotationRes?.data?.id) {
                                    try {
                                        await uploadAPI.uploadQuotationDoc(newQuotationRes.data.id, docFile);
                                    } catch (uploadErr) {
                                        console.error('Quotation doc upload error:', uploadErr);
                                    }
                                }
                            } else {
                                const docFile = vendorQuotationDocs[vendorId];
                                if (docFile && docFile instanceof File) {
                                    try {
                                        await uploadAPI.uploadQuotationDoc(existingQuotation.id, docFile);
                                    } catch (uploadErr) {
                                        console.error('Quotation doc upload error:', uploadErr);
                                    }
                                }
                            }
                        }
                    }
                    setSaveProgress({ active: true, percent: 85, statusText: 'Refreshing data...' });
                    await openRequestDetail(selectedRequest, true);
                    break;
                case 6:
                    const lowest = getLowestVendor();
                    const targetVendorId = selectedVendorForPurchase || lowest.vendorId;
                    if (targetVendorId) {
                        setSaveProgress({ active: true, percent: 50, statusText: 'Saving vendor selection...' });
                        const items = requestDetail?.request?.items || [];
                        const prices = vendorQuotationPrices[targetVendorId] || {};

                        const approvedItems = items.map(item => ({
                            itemId: item.id,
                            vendorId: targetVendorId,
                            unitPrice: parseFloat(prices[item.id]) || item.approvedUnitPrice || 0,
                            quantity: editableQuantities[item.id] ?? item.quantity
                        }));

                        await procurementAPI.approveRequest(selectedRequest.id, approvedItems);
                        setSaveProgress({ active: true, percent: 85, statusText: 'Refreshing...' });
                        await openRequestDetail(selectedRequest, true);
                    }
                    break;
                case 7:
                    setSaveProgress({ active: true, percent: 50, statusText: 'Saving proceedings...' });
                    if (proceedingsDate) {
                        await procurementAPI.updateRequest(selectedRequest.id, {
                            proceedingsDate: new Date(proceedingsDate)
                        });
                    }
                    await openRequestDetail(selectedRequest, true);
                    break;
                case 8:
                    setSaveProgress({ active: true, percent: 50, statusText: 'Saving Purchase Order...' });
                    if (selectedVendorForPurchase) {
                        const items = requestDetail?.request?.items || [];
                        const prices = vendorQuotationPrices[selectedVendorForPurchase] || {};

                        const approvedItems = items.map(item => ({
                            itemId: item.id,
                            vendorId: item.approvedVendorId || selectedVendorForPurchase,
                            unitPrice: item.approvedUnitPrice || parseFloat(prices[item.id]) || 0,
                            quantity: editableQuantities[item.id] ?? item.quantity
                        }));

                        await procurementAPI.approveRequest(selectedRequest.id, approvedItems);

                        if (orderForm.poNumber?.trim()) {
                            await procurementAPI.markOrdered(selectedRequest.id, {
                                poNumber: orderForm.poNumber.trim()
                            });
                        }
                    }
                    setSaveProgress({ active: true, percent: 85, statusText: 'Refreshing...' });
                    await openRequestDetail(selectedRequest, true); // Keep step!
                    break;
                case 9:
                    setSaveProgress({ active: true, percent: 40, statusText: 'Saving Bill & Payment...' });
                    if (billUpload && billUpload instanceof File) {
                        try {
                            await uploadAPI.uploadProcurementDoc(selectedRequest.id, 'bill', billUpload);
                        } catch (err) {
                            console.error('Bill upload error:', err);
                        }
                    }
                    if (chequeUpload && chequeUpload instanceof File) {
                        try {
                            await uploadAPI.uploadProcurementDoc(selectedRequest.id, 'cheque', chequeUpload);
                        } catch (err) {
                            console.error('Cheque upload error:', err);
                        }
                    }
                    if (billNumber?.trim() || billAmount) {
                        try {
                            await procurementAPI.addBill(selectedRequest.id, {
                                billNumber: billNumber || (billUpload?.name || 'BILL'),
                                billDate: billDate,
                                billAmount: billAmount
                            });
                        } catch (err) {
                            console.error('Bill details error:', err);
                        }
                    }
                    if (chequeNumber?.trim() || paymentMethod) {
                        try {
                            await procurementAPI.addPayment(selectedRequest.id, {
                                paymentMethod: paymentMethod,
                                chequeNumber: chequeNumber,
                                paymentDate: paymentDate,
                                paymentReference: chequeNumber
                            });
                        } catch (err) {
                            console.error('Payment error:', err);
                        }
                    }
                    if (Object.keys(receivedItems).length > 0) {
                        try {
                            await procurementAPI.markReceived(selectedRequest.id, {
                                receivedItems: receivedItems,
                                status: 'received'
                            });
                        } catch (err) {
                            console.error('Mark received error:', err);
                        }
                    }
                    setSaveProgress({ active: true, percent: 85, statusText: 'Refreshing...' });
                    await openRequestDetail(selectedRequest, true); // Keep step!
                    break;
                case 10:
                    setSaveProgress({ active: true, percent: 50, statusText: 'Finalizing procurement...' });
                    await procurementAPI.updateRequest(selectedRequest.id, { status: 'completed' });
                    await openRequestDetail(selectedRequest, true);
                    break;
            }
            setSaveProgress({ active: true, percent: 100, statusText: 'Saved successfully!' });
            setTimeout(() => setSaveProgress({ active: false, percent: 0, statusText: '' }), 400);
            toast.success(`Step ${step} data saved`);
            return true;
        } catch (error) {
            console.error(`Step ${step} save error:`, error);
            setSaveProgress({ active: false, percent: 0, statusText: '' });
            toast.error(`Failed to save Step ${step} data`);
            return false;
        }
    };

    // Save and proceed to next step
    const saveAndNext = async (currentStep) => {
        if (!validateStep(currentStep)) return;
        const saved = await saveStepData(currentStep);
        if (saved) {
            const nextStep = currentStep + 1;
            setWorkflowStep(nextStep);
            try {
                await procurementAPI.saveStep(selectedRequest.id, nextStep);
            } catch (e) {
                console.error('Failed to persist step:', e);
            }
        }
    };

    // Check if step is complete (without showing toast errors)
    const isStepComplete = (step) => {
        switch (step) {
            case 1:
                return !!(requestDetail?.request?.purchaseLetterUrl || letterUpload || letterContent.trim());
            case 2:
                return (requestDetail?.request?.committee?.length || 0) >= 3;
            case 3:
                return (requestDetail?.request?.items?.length || 0) >= 1;
            case 4:
                const localCount = selectedVendorIds.filter(id => vendors.find(v => v.id === id)?.isLocal).length;
                return selectedVendorIds.length >= 3 && localCount >= 1;
            case 5:
                if (selectedVendorIds.length === 0) return false;
                for (const vendorId of selectedVendorIds) {
                    const prices = vendorQuotationPrices[vendorId] || {};
                    for (const item of requestDetail?.request?.items || []) {
                        if (!prices[item.id] || parseFloat(prices[item.id]) <= 0) return false;
                    }
                }
                return true;
            case 6:
                return !!(selectedVendorForPurchase || getLowestVendor().vendorId);
            case 7:
                return true;
            case 8:
                return !!(selectedVendorForPurchase || getLowestVendor().vendorId);
            case 9:
                return !!(billUpload || billNumber.trim() || requestDetail?.request?.billNumber || requestDetail?.request?.billUrl);
            case 10:
                return true;
            default:
                return false;
        }
    };

    // Get highest completed step (for tab navigation)
    const getHighestAccessibleStep = () => {
        for (let i = 1; i <= 10; i++) {
            if (!isStepComplete(i)) return i;
        }
        return 10;
    };

    // Number to words helper
    const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        if (num === 0) return 'Zero';
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
        if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
        if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
        return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
    };

    // Calculate vendor total from prices map (includes item GST or global GST)
    const calculateVendorTotal = (vendorId, includeGst = true) => {
        const prices = vendorQuotationPrices[vendorId] || {};
        const defaultGst = vendorGlobalGst[vendorId] ?? (vendorGstSettings[vendorId]?.gstRate ?? 18);
        const itemGsts = vendorItemGst[vendorId] || {};

        let subtotal = 0;
        let totalGst = 0;

        requestDetail?.request?.items?.forEach(item => {
            const price = parseFloat(prices[item.id]) || 0;
            const base = price * item.quantity;
            const rate = itemGsts[item.id] !== undefined ? itemGsts[item.id] : defaultGst;
            subtotal += base;
            totalGst += base * (rate / 100);
        });

        if (includeGst) {
            return subtotal + totalGst;
        }
        return subtotal;
    };

    // Calculate total GST amount for vendor
    const calculateVendorGstTotal = (vendorId) => {
        const prices = vendorQuotationPrices[vendorId] || {};
        const defaultGst = vendorGlobalGst[vendorId] ?? (vendorGstSettings[vendorId]?.gstRate ?? 18);
        const itemGsts = vendorItemGst[vendorId] || {};

        let totalGst = 0;
        requestDetail?.request?.items?.forEach(item => {
            const price = parseFloat(prices[item.id]) || 0;
            const base = price * item.quantity;
            const rate = itemGsts[item.id] !== undefined ? itemGsts[item.id] : defaultGst;
            totalGst += base * (rate / 100);
        });
        return totalGst;
    };

    // Calculate total with editable quantities for Purchase Order
    const calculatePOTotal = () => {
        return requestDetail?.request?.items?.reduce((sum, item) => {
            const price = parseFloat(vendorQuotationPrices[selectedVendorForPurchase]?.[item.id]) || 0;
            const qty = editableQuantities[item.id] ?? item.quantity;
            return sum + (price * qty);
        }, 0) || 0;
    };

    // Find vendor with lowest total
    const getLowestVendor = () => {
        let lowestVendor = null;
        let lowestTotal = Infinity;
        selectedVendorIds.forEach(vid => {
            const total = calculateVendorTotal(vid);
            if (total > 0 && total < lowestTotal) {
                lowestTotal = total;
                lowestVendor = vid;
            }
        });
        return { vendorId: lowestVendor, total: lowestTotal };
    };

    // Automatically auto-select lowest bidder (L1) when quotations are updated
    useEffect(() => {
        if (selectedVendorIds.length > 0) {
            const lowest = getLowestVendor();
            if (lowest.vendorId && lowest.vendorId !== selectedVendorForPurchase) {
                setSelectedVendorForPurchase(lowest.vendorId);
            }
        }
    }, [vendorQuotationPrices, vendorItemGst, vendorGlobalGst, selectedVendorIds]);

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) router.push('/login');
    }, [_hasHydrated, isAuthenticated, router]);

    useEffect(() => {
        if (_hasHydrated && isAuthenticated) {
            loadData();
        }
    }, [_hasHydrated, isAuthenticated, selectedSessionId]);

    const loadData = async () => {
        try {
            console.log('Loading procurement data...');
            const reqQuery = {};
            if (selectedSessionId && selectedSessionId !== 'all') {
                reqQuery.academicYearId = selectedSessionId;
            }

            const [reqRes, vendorRes, staffRes] = await Promise.all([
                procurementAPI.getRequests(reqQuery).catch(e => {
                    console.error('Requests error:', e);
                    return { data: { data: [] } };
                }),
                procurementAPI.getVendors().catch(e => {
                    console.error('Vendors error:', e);
                    toast.error(e.response?.data?.message || 'Failed to load vendors');
                    return { data: { data: [] } };
                }),
                procurementAPI.getStaff().catch(e => {
                    console.error('Staff error:', e);
                    return { data: { data: [] } };
                })
            ]);
            setRequests(Array.isArray(reqRes.data?.data) ? reqRes.data.data : []);
            setVendors(Array.isArray(vendorRes.data?.data) ? vendorRes.data.data : []);
            setStaffList(Array.isArray(staffRes.data?.data) ? staffRes.data.data : []);
        } catch (error) {
            console.error('Load data error:', error);
            toast.error('Failed to load data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCommitteeMember = async () => {
        if (!selectedStaffId) return;

        // Check for duplicate
        if (requestDetail?.request?.committee?.some(m => m.userId === selectedStaffId)) {
            toast.error('This member is already in the committee');
            return;
        }

        try {
            await procurementAPI.addCommitteeMember(selectedRequest.id, { userId: selectedStaffId, role: committeeRole });
            toast.success('Committee member added');
            setSelectedStaffId('');
            setCommitteeRole('member');
            openRequestDetail(selectedRequest);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    const handleAddNewItem = async () => {
        if (!newItemForm.itemName.trim()) {
            toast.error('Item name is required');
            return;
        }
        try {
            await procurementAPI.addItem(selectedRequest.id, {
                itemName: newItemForm.itemName.trim(),
                specifications: newItemForm.specifications?.trim() || null,
                warranty: newItemForm.warranty?.trim() || null,
                quantity: parseInt(newItemForm.quantity) || 1,
                unit: newItemForm.unit,
                estimatedUnitPrice: parseFloat(newItemForm.estimatedUnitPrice) || null
            });
            toast.success('Item added');
            setNewItemForm({ itemName: '', specifications: '', warranty: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: '' });
            await openRequestDetail(selectedRequest, true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add item');
        }
    };

    const handleStartEditItem = (item) => {
        setEditingItemId(item.id);
        setEditingItemForm({
            itemName: item.itemName,
            specifications: item.specifications || '',
            warranty: item.warranty || '',
            quantity: item.quantity,
            unit: item.unit || 'pcs',
            estimatedUnitPrice: item.estimatedUnitPrice || ''
        });
    };

    const handleSaveEditItem = async (itemId) => {
        if (!editingItemForm.itemName.trim()) {
            toast.error('Item name is required');
            return;
        }
        try {
            await procurementAPI.updateItem(selectedRequest.id, itemId, {
                itemName: editingItemForm.itemName.trim(),
                specifications: editingItemForm.specifications?.trim() || null,
                warranty: editingItemForm.warranty?.trim() || null,
                quantity: parseInt(editingItemForm.quantity) || 1,
                unit: editingItemForm.unit,
                estimatedUnitPrice: parseFloat(editingItemForm.estimatedUnitPrice) || null
            });
            toast.success('Item updated');
            setEditingItemId(null);
            await openRequestDetail(selectedRequest, true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update item');
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            await procurementAPI.deleteItem(selectedRequest.id, itemId);
            toast.success('Item removed');
            await openRequestDetail(selectedRequest, true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete item');
        }
    };

    const handleRemoveCommitteeMember = async (memberId) => {
        try {
            await procurementAPI.removeCommitteeMember(selectedRequest.id, memberId);
            toast.success('Member removed');
            await openRequestDetail(selectedRequest, true);
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const [docketHtml, setDocketHtml] = useState('');

    const buildProcurementDocketHtml = (previewData) => {
        if (!previewData) return '';
        const { school, request, comparison, vendors, totalApproved, committee } = previewData;
        const vendorNames = (vendors || []).map(v => v.name);
        const today = formatDate(new Date());
        const isComplete = request.status === 'received' || request.status === 'completed';

        // Helper to render letterhead at the top of every generated institutional A4 page
        const letterheadSrc = school?.letterheadUrl || '/letterhead.png';
        const renderLetterhead = (sectionTitle) => `
            <div class="letterhead-container">
                ${letterheadSrc ? `
                    <div class="letterhead-img-wrapper" style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">
                        <img src="${letterheadSrc}" alt="${school?.name || 'Senior Secondary Residential School for Meritorious Students'}" style="width: 100%; max-height: 125px; object-fit: contain;" />
                    </div>
                ` : `
                    <div class="letterhead-header">
                        ${school?.logoUrl ? `<img src="${school.logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 4px;" />` : ''}
                        <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">${school?.name || 'INSTITUTION NAME'}</h1>
                        <p style="margin: 2px 0; font-size: 13px; color: #475569;">${school?.address || ''}${school?.pinCode ? ', PIN: ' + school.pinCode : ''}</p>
                        <p style="margin: 1px 0; font-size: 12px; color: #64748b;">
                            ${school?.email ? 'Email: ' + school.email : ''}
                            ${school?.phone1 ? ' | Tel: ' + school.phone1 : ''}
                            ${school?.phone2 ? ' / ' + school.phone2 : ''}
                        </p>
                        <div style="height: 2px; background: #1e3a8a; margin: 8px 0 14px 0;"></div>
                    </div>
                `}
                ${sectionTitle ? `<div class="section-title">${sectionTitle}</div>` : ''}
            </div>
        `;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Procurement Process Docket - ${request.title}</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                * { box-sizing: border-box; }
                html, body {
                    margin: 0;
                    padding: 0;
                    background-color: #525659;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #0f172a;
                    -webkit-font-smoothing: antialiased;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 25px auto;
                    padding: 20mm;
                    background: #ffffff;
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
                    border-radius: 2px;
                    page-break-after: always;
                    position: relative;
                }
                .page:last-child {
                    page-break-after: avoid;
                    margin-bottom: 25px;
                }
                .letterhead-container {
                    text-align: center;
                    margin-bottom: 14px;
                }
                .section-title {
                    background: #1e3a8a;
                    color: #ffffff;
                    padding: 8px 14px;
                    font-size: 14px;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                    border-radius: 4px;
                    margin: 10px 0 14px 0;
                    text-transform: uppercase;
                    text-align: left;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 14px 0;
                    font-size: 13px;
                }
                th, td {
                    border: 1px solid #cbd5e1;
                    padding: 7px 9px;
                    text-align: left;
                }
                th {
                    background: #f1f5f9;
                    color: #0f172a;
                    font-weight: bold;
                }
                .lowest {
                    background: #dcfce7;
                    font-weight: bold;
                    color: #166534;
                }
                .total-row {
                    font-weight: bold;
                    background: #f8fafc;
                }
                .summary-box {
                    background: #f8fafc;
                    padding: 12px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    margin: 14px 0;
                    font-size: 13.5px;
                }
                .signatures {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 35px;
                    padding-top: 10px;
                }
                .signature {
                    text-align: center;
                    width: 160px;
                }
                .signature-line {
                    border-top: 1.5px solid #0f172a;
                    margin-top: 40px;
                    padding-top: 5px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .meta-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin: 12px 0;
                    font-size: 13.5px;
                }
                .meta-info p {
                    margin: 3px 0;
                }
                .doc-embed-container {
                    width: 100%;
                    height: 245mm;
                    margin-top: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .doc-embed-frame {
                    width: 100%;
                    height: 100%;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    background: #f8fafc;
                }
                .doc-embed-img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                }
                .uploaded-doc-badge {
                    background: #eff6ff;
                    border-left: 4px solid #2563eb;
                    padding: 8px 12px;
                    font-size: 13.5px;
                    font-weight: bold;
                    color: #1e40af;
                    border-radius: 4px;
                    margin-bottom: 10px;
                }

                /* Comparative Statement: Rotated 90deg on portrait screens, printed landscape */
                @media screen {
                    .page.comparative-sheet {
                        width: 210mm;
                        height: 297mm;
                        min-height: 297mm;
                        max-height: 297mm;
                        padding: 0;
                        overflow: hidden;
                        position: relative;
                    }
                    .comparative-content-rotated {
                        width: 265mm;
                        height: 180mm;
                        position: absolute;
                        top: 15mm;
                        left: 15mm;
                        transform-origin: 0 0;
                        transform: translate(180mm, 0) rotate(90deg);
                    }
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm;
                    }
                    @page comparative-landscape {
                        size: A4 landscape;
                        margin: 12mm;
                    }
                    html, body {
                        background: transparent !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .page {
                        width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        page-break-after: always !important;
                    }
                    .page.comparative-sheet {
                        page: comparative-landscape !important;
                        width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        padding: 10mm !important;
                        overflow: visible !important;
                    }
                    .comparative-content-rotated {
                        transform: none !important;
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                    }
                }
            </style>
        </head>
        <body>
            <!-- PAGE 1: REQUEST FOR NEW PURCHASE -->
            <div class="page">
                ${renderLetterhead('1. Request for New Purchase')}
                
                <div class="meta-info">
                    <p><strong>Reference No:</strong> PR-${request.id?.slice(0, 8).toUpperCase() || 'XXXXXX'}</p>
                    <p><strong>Date:</strong> ${formatDate(request.createdAt)}</p>
                    <p><strong>Department:</strong> ${request.department || 'N/A'}</p>
                    <p><strong>Budget Code:</strong> ${request.budgetCode || 'N/A'}</p>
                </div>
                
                <p style="margin: 8px 0;"><strong>Subject:</strong> ${request.title}</p>
                <p style="margin: 8px 0;"><strong>Purpose:</strong> ${request.purpose || 'Procurement of items as listed below for institutional laboratory requirements.'}</p>
                
                ${request.letterContent ? `
                    <div style="margin: 12px 0; padding: 12px; border: 1px solid #e2e8f0; background: #fafafa; border-radius: 4px;">
                        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; font-size: 13px;">${request.letterContent}</pre>
                    </div>
                ` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>Item Description</th>
                            <th>Specifications</th>
                            <th style="width: 100px; text-align: center;">Warranty</th>
                            <th style="width: 50px; text-align: center;">Qty</th>
                            <th style="width: 50px; text-align: center;">Unit</th>
                            <th style="width: 100px; text-align: right;">Est. Unit Price</th>
                            <th style="width: 105px; text-align: right;">Est. Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${request.items.map((item, i) => `<tr>
                            <td style="text-align: center;">${i + 1}</td>
                            <td><strong>${item.itemName}</strong></td>
                            <td>${item.specifications || '-'}</td>
                            <td style="text-align: center;">${item.warranty || 'Standard'}</td>
                            <td style="text-align: center;"><strong>${item.quantity}</strong></td>
                            <td style="text-align: center;">${item.unit || 'pcs'}</td>
                            <td style="text-align: right;">₹${(item.estimatedUnitPrice || 0).toLocaleString()}</td>
                            <td style="text-align: right;">₹${((item.estimatedUnitPrice || 0) * item.quantity).toLocaleString()}</td>
                        </tr>`).join('')}
                        <tr class="total-row">
                            <td colspan="7" style="text-align: right;">Estimated Grand Total:</td>
                            <td style="text-align: right;">₹${request.items.reduce((sum, i) => sum + ((i.estimatedUnitPrice || 0) * i.quantity), 0).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="signatures">
                    <div class="signature"><div class="signature-line">Requested By</div></div>
                    <div class="signature"><div class="signature-line">HOD / Section Head</div></div>
                    <div class="signature"><div class="signature-line">Principal / Director</div></div>
                </div>
            </div>

            <!-- PAGE 2: CALL FOR QUOTATION -->
            <div class="page">
                ${renderLetterhead('2. Call for Quotations')}
                
                <div class="meta-info">
                    <p><strong>Ref No:</strong> CFQ-${request.id?.slice(0, 8).toUpperCase()}</p>
                    <p><strong>Date:</strong> ${today}</p>
                    <p><strong>Subject:</strong> Invitation for Sealed Quotations</p>
                    <p><strong>Submission Deadline:</strong> ${formatDate(lastDateToSubmit || new Date(Date.now() + 7 * 86400000))}</p>
                </div>
                
                <p style="margin: 10px 0;">Dear Vendors / Authorized Dealers,</p>
                <p style="margin: 6px 0 12px 0;">
                    You are invited to submit your competitive signed quotation for the supply of items required for 
                    <strong>${request.purpose || request.department || 'institutional laboratory purposes'}</strong>. 
                    Please quote your rates including applicable GST and state warranty terms.
                </p>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>Item Description</th>
                            <th>Specifications</th>
                            <th style="width: 110px; text-align: center;">Warranty Required</th>
                            <th style="width: 50px; text-align: center;">Qty</th>
                            <th style="width: 50px; text-align: center;">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${request.items.map((item, i) => `<tr>
                            <td style="text-align: center;">${i + 1}</td>
                            <td><strong>${item.itemName}</strong></td>
                            <td>${item.specifications || '-'}</td>
                            <td style="text-align: center;">${item.warranty || '1 Year Standard'}</td>
                            <td style="text-align: center;"><strong>${item.quantity}</strong></td>
                            <td style="text-align: center;">${item.unit || 'pcs'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                
                <div class="summary-box">
                    <strong>Terms & Conditions:</strong>
                    <ul style="margin: 6px 0; padding-left: 20px;">
                        <li>Quotations must be valid for at least 30 days from submission date.</li>
                        <li>Rates must include all taxes, packing, forwarding, and on-site delivery.</li>
                        <li>Warranty terms and post-sales technical support must be clearly stated.</li>
                        <li>Submission must be received on or before ${formatDate(lastDateToSubmit || new Date(Date.now() + 7 * 86400000))}.</li>
                    </ul>
                </div>
                
                <div style="margin-top: 10px; font-size: 13px;">
                    <strong>Vendors Invited:</strong>
                    <ol style="margin: 6px 0; padding-left: 24px;">
                        ${vendors.map(v => `<li>${v.name} ${v.contactPerson ? '(' + v.contactPerson + ')' : ''} - ${v.phone || v.email || ''}</li>`).join('')}
                    </ol>
                </div>

                <div class="signatures">
                    <div class="signature"><div class="signature-line">Prepared By</div></div>
                    <div class="signature"><div class="signature-line">Committee Chairperson</div></div>
                    <div class="signature"><div class="signature-line">Authorized Signatory</div></div>
                </div>
            </div>

            <!-- PAGES: VENDOR QUOTATIONS RECEIVED (Preview of Uploaded Files) -->
            ${request.quotations && request.quotations.length > 0 ? request.quotations.map((q, idx) => `
                <div class="page">
                    <div class="uploaded-doc-badge">
                        📄 Quotation ${idx + 1}: <strong>${q.vendor?.name}</strong> ${q.quotationNumber ? `(Quotation Ref: ${q.quotationNumber})` : ''}
                    </div>
                    ${q.documentUrl ? `
                        <div class="doc-embed-container">
                            ${q.documentUrl.includes('.pdf') ? `
                                <iframe src="${q.documentUrl}" class="doc-embed-frame" title="Quotation from ${q.vendor?.name}"></iframe>
                            ` : `
                                <img src="${q.documentUrl}" alt="Quotation from ${q.vendor?.name}" class="doc-embed-img" />
                            `}
                        </div>
                    ` : `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 40px; margin-top: 20px; text-align: center;">
                            <div style="font-size: 36px; margin-bottom: 12px;">📄</div>
                            <h3 style="margin: 0 0 6px 0; color: #1e3a8a;">Quotation from ${q.vendor?.name}</h3>
                            <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0;">Physical quotation document has not been uploaded yet.</p>
                            <div style="font-size: 12.5px; background: #f8fafc; padding: 12px 20px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: left; min-width: 300px;">
                                <div><strong>Quotation No:</strong> ${q.quotationNumber || 'Recorded in Step 5'}</div>
                                <div><strong>Quotation Date:</strong> ${q.quotationDate ? formatDate(q.quotationDate) : today}</div>
                                <div><strong>Vendor Contact:</strong> ${q.vendor?.phone || q.vendor?.email || 'N/A'}</div>
                            </div>
                        </div>
                    `}
                </div>
            `).join('') : ''}

            <!-- PAGE 4: COMPARATIVE STATEMENT OF QUOTATIONS (Rotated to fit Portrait on screen, Landscape in print) -->
            <div class="page comparative-sheet">
                <div class="comparative-content-rotated">
                    ${renderLetterhead('4. Comparative Statement of Rates')}
                    
                    <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 8px;">
                        <div><strong>Purpose:</strong> ${request.title}</div>
                        <div><strong>Evaluation Date:</strong> ${today}</div>
                    </div>
                    
                    <table style="font-size: 12px;">
                        <thead>
                            <tr>
                                <th style="width: 30px; text-align: center;">#</th>
                                <th>Item Description</th>
                                <th style="width: 45px; text-align: center;">Qty</th>
                                <th style="width: 80px; text-align: center;">Warranty</th>
                                ${vendorNames.map(v => `<th style="text-align: right; background: #e0e7ff;">${v}<br/><span style="font-size: 10px; font-weight: normal;">(Unit Price)</span></th>`).join('')}
                                <th style="text-align: right; background: #dcfce7; width: 90px;">L1 Price</th>
                                <th style="background: #dcfce7; width: 110px;">L1 Vendor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comparison.map((item, i) => {
                                const lowestVendor = Object.values(item.vendorPrices).find(vp => vp.unitPrice === item.lowestPrice);
                                return `<tr>
                                    <td style="text-align: center;">${i + 1}</td>
                                    <td><strong>${item.itemName}</strong></td>
                                    <td style="text-align: center;">${item.quantity}</td>
                                    <td style="text-align: center;">${item.specifications || '-'}</td>
                                    ${vendorNames.map(vName => {
                                        const vData = Object.values(item.vendorPrices).find(vp => vp.vendorName === vName);
                                        const isLowest = vData && item.lowestPrice === vData.unitPrice;
                                        return `<td style="text-align: right;" class="${isLowest ? 'lowest' : ''}">₹${vData?.unitPrice?.toLocaleString() || '-'}</td>`;
                                    }).join('')}
                                    <td style="text-align: right;" class="lowest">₹${item.lowestPrice?.toLocaleString() || '-'}</td>
                                    <td class="lowest">${lowestVendor?.vendorName || '-'}</td>
                                </tr>`;
                            }).join('')}
                            <tr class="total-row">
                                <td colspan="4" style="text-align: right;"><strong>Total Base Amount:</strong></td>
                                ${vendorNames.map(vName => {
                                    const total = comparison.reduce((sum, item) => sum + ((Object.values(item.vendorPrices).find(vp => vp.vendorName === vName)?.unitPrice || 0) * item.quantity), 0);
                                    return `<td style="text-align: right;">₹${total.toLocaleString()}</td>`;
                                }).join('')}
                                <td class="lowest" colspan="2" style="text-align: right;">₹${comparison.reduce((sum, item) => sum + ((item.lowestPrice || 0) * item.quantity), 0).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px;">
                        <div style="font-size: 11.5px; color: #475569;">
                            * Rates evaluated and verified by the authorized Procurement Committee.
                        </div>
                        <div style="display: flex; gap: 30px;">
                            ${committee?.slice(0, 3).map(m => `
                                <div style="text-align: center; width: 120px;">
                                    <div style="border-top: 1px solid #0f172a; padding-top: 3px; font-size: 11px; font-weight: bold;">
                                        ${m.user?.firstName || ''} ${m.user?.lastName || ''}
                                    </div>
                                    <div style="font-size: 10px; color: #64748b;">${m.role}</div>
                                </div>
                            `).join('') || ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- PAGE 5: PROCEEDINGS OF COMMITTEE -->
            <div class="page">
                ${renderLetterhead('5. Proceedings of Committee')}
                
                <table style="margin-bottom: 14px;">
                    <tbody>
                        <tr><td style="width: 160px; font-weight: bold;">Proceeding of:</td><td>Committee to Recommend ${request.title}</td></tr>
                        <tr><td style="font-weight: bold;">Assembled at:</td><td>${school?.name || 'Institution Name'}${school?.district ? ', ' + school.district : ''}</td></tr>
                        <tr><td style="font-weight: bold;">Meeting Date:</td><td>${request.proceedingsDate ? formatDate(request.proceedingsDate) : today}</td></tr>
                        <tr><td style="font-weight: bold;">For the Purpose of:</td><td>To Examine Quotations and Recommend Purchase of ${request.title}</td></tr>
                        <tr><td style="font-weight: bold;">By Order of:</td><td>Vide Memo No. <strong>${request.memoVideNo || '________'}</strong></td></tr>
                    </tbody>
                </table>
                
                <p style="margin: 12px 0; text-align: justify;">
                    The Board having reassembled in pursuance of the above order proceeded to examine the quotations 
                    received from the following dealers invited to supply <strong>${request.title}</strong>:
                </p>
                
                <div style="margin: 10px 0;">
                    <strong>1. Dealers Contacted (Step 4):</strong>
                    <ol style="margin: 4px 0 10px 0; padding-left: 24px;">
                        ${vendors.map(v => `<li>${v.name}</li>`).join('')}
                    </ol>
                </div>
                
                <div style="margin: 10px 0;">
                    <strong>2. Sealed Quotations Received and Examined (Step 5):</strong>
                    <ol style="margin: 4px 0 10px 0; padding-left: 24px;">
                        ${request.quotations && request.quotations.length > 0 ? request.quotations.map(q => 
                            `<li>${q.vendor?.name} - Quote Ref: ${q.quotationNumber || 'N/A'}</li>`
                        ).join('') : '<li>No quotations recorded</li>'}
                    </ol>
                </div>
                
                <p style="margin: 10px 0;"><strong>3. Comparative Statement of Rates:</strong> Placed at Appendix A.</p>
                
                <div style="margin: 16px 0; padding: 14px; border: 1.5px solid #1e3a8a; background: #f0fdf4; border-radius: 6px;">
                    <p style="font-weight: bold; text-decoration: underline; margin: 0 0 6px 0; color: #166534; font-size: 14px;">Recommendation:</p>
                    <p style="margin: 0; color: #14532d; font-size: 13.5px;">
                        The committee unanimously recommends that the order be awarded to 
                        <strong>${vendors[0]?.name || '________________'}</strong> having quoted the lowest responsive rate (L1) 
                        complying with all required specifications and warranty terms.
                    </p>
                </div>
                
                <div style="margin-top: 30px;">
                    <p style="margin-bottom: 25px; font-weight: bold;">Committee Signatures:</p>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                        ${committee?.map((member, idx) => `
                            <div style="text-align: center; width: 160px; margin-bottom: 20px;">
                                <div style="border-top: 1.5px solid #0f172a; margin-top: 40px; padding-top: 5px; font-size: 11px;">
                                    ${member.role === 'chairperson' ? 'Presiding Officer' : 'Member ' + (idx + 1)}
                                </div>
                                <div style="font-weight: bold; font-size: 12.5px;">${member.user?.firstName || ''} ${member.user?.lastName || ''}</div>
                            </div>
                        `).join('') || '<div style="text-align: center; width: 100%;">No committee members assigned</div>'}
                    </div>
                </div>
            </div>

            <!-- PAGE 6: PURCHASE ORDER (Generated A4 Institutional Order) -->
            <div class="page">
                ${renderLetterhead('6. Purchase Order')}
                
                <div class="meta-info">
                    <p><strong>PO Number:</strong> ${request.poNumber || 'PO-' + request.id?.slice(0, 8).toUpperCase()}</p>
                    <p><strong>PO Date:</strong> ${request.orderedAt ? formatDate(request.orderedAt) : today}</p>
                    <p><strong>Department:</strong> ${request.department || 'N/A'}</p>
                    <p><strong>Budget Code:</strong> ${request.budgetCode || 'N/A'}</p>
                </div>
                
                <div style="margin: 12px 0; padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; background: #f8fafc;">
                    <strong>TO (Supplier):</strong>
                    <div style="margin-left: 12px; margin-top: 4px; font-size: 13.5px;">
                        <strong>${vendors[0]?.name || '________________'}</strong><br/>
                        ${vendors[0]?.contactPerson ? 'Attn: ' + vendors[0].contactPerson + '<br/>' : ''}
                        ${vendors[0]?.address || ''}<br/>
                        Phone: ${vendors[0]?.phone || 'N/A'} | Email: ${vendors[0]?.email || 'N/A'}<br/>
                        GSTIN: ${vendors[0]?.gstin || 'N/A'}
                    </div>
                </div>
                
                <p style="margin: 8px 0;">Please supply the following items strictly as per agreed specifications and quoted rates:</p>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>Item Description</th>
                            <th>Specifications</th>
                            <th style="width: 50px; text-align: center;">Qty</th>
                            <th style="width: 50px; text-align: center;">Unit</th>
                            <th style="width: 100px; text-align: right;">Unit Price</th>
                            <th style="width: 110px; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${request.items.map((item, i) => {
                            const compItem = comparison.find(c => c.itemId === item.id);
                            const unitPrice = compItem?.lowestPrice || 0;
                            return `<tr>
                                <td style="text-align: center;">${i + 1}</td>
                                <td><strong>${item.itemName}</strong></td>
                                <td>${item.specifications || '-'}</td>
                                <td style="text-align: center;"><strong>${item.quantity}</strong></td>
                                <td style="text-align: center;">${item.unit || 'pcs'}</td>
                                <td style="text-align: right;">₹${unitPrice.toLocaleString()}</td>
                                <td style="text-align: right;">₹${(unitPrice * item.quantity).toLocaleString()}</td>
                            </tr>`;
                        }).join('')}
                        <tr class="total-row">
                            <td colspan="6" style="text-align: right;"><strong>Grand Total (incl. Taxes):</strong></td>
                            <td style="text-align: right;"><strong>₹${comparison.reduce((sum, item) => sum + ((item.lowestPrice || 0) * item.quantity), 0).toLocaleString()}</strong></td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="summary-box">
                    <p style="margin: 3px 0;"><strong>Delivery Address:</strong> ${school?.name || ''}, ${school?.address || 'Institutional Campus'}</p>
                    <p style="margin: 3px 0;"><strong>Delivery Period:</strong> Within 15 days from the date of issuance of this Purchase Order.</p>
                    <p style="margin: 3px 0;"><strong>Payment Terms:</strong> 100% payment against bill delivery and physical verification of items.</p>
                </div>
                
                <div class="signatures">
                    <div class="signature">
                        <div class="signature-line">Authorized Signatory</div>
                        <p style="font-size: 11px; margin-top: 4px;">${school?.name || ''}</p>
                    </div>
                    <div class="signature">
                        <div class="signature-line">Vendor Acceptance</div>
                        <p style="font-size: 11px; margin-top: 4px;">Seal & Signature</p>
                    </div>
                </div>
            </div>

            <!-- PAGE: SIGNED PURCHASE ORDER DOCUMENT (Uploaded PDF / Image with signatures of both parties) -->
            ${request.poUrl ? `
                <div class="page">
                    <div class="uploaded-doc-badge">
                        📝 Signed Purchase Order (Executed with Signatures of Both Parties)
                    </div>
                    <div class="doc-embed-container">
                        ${request.poUrl.includes('.pdf') ? `
                            <iframe src="${request.poUrl}" class="doc-embed-frame" title="Signed Purchase Order"></iframe>
                        ` : `
                            <img src="${request.poUrl}" alt="Signed Purchase Order" class="doc-embed-img" />
                        `}
                    </div>
                </div>
            ` : ''}

            <!-- PAGE: VENDOR BILL / INVOICE (Uploaded PDF / Image) -->
            ${request.billUrl ? `
                <div class="page">
                    <div class="uploaded-doc-badge">
                        🧾 Vendor Invoice / Bill: <strong>${request.billNumber || 'INVOICE'}</strong> ${request.billDate ? `(${formatDate(request.billDate)})` : ''}
                    </div>
                    <div class="doc-embed-container">
                        ${request.billUrl.includes('.pdf') ? `
                            <iframe src="${request.billUrl}" class="doc-embed-frame" title="Vendor Bill"></iframe>
                        ` : `
                            <img src="${request.billUrl}" alt="Vendor Bill" class="doc-embed-img" />
                        `}
                    </div>
                </div>
            ` : ''}

            <!-- PAGE: SCANNED CHEQUE / PAYMENT PROOF (Uploaded PDF / Image) -->
            ${request.chequeUrl ? `
                <div class="page">
                    <div class="uploaded-doc-badge">
                        💳 Payment Cheque / Remittance Advice ${request.chequeNumber ? `(Cheque No: ${request.chequeNumber})` : ''}
                    </div>
                    <div class="doc-embed-container">
                        ${request.chequeUrl.includes('.pdf') ? `
                            <iframe src="${request.chequeUrl}" class="doc-embed-frame" title="Cheque Copy"></iframe>
                        ` : `
                            <img src="${request.chequeUrl}" alt="Cheque Copy" class="doc-embed-img" />
                        `}
                    </div>
                </div>
            ` : ''}

            <!-- PAGE: STOCK REGISTER / NEW INVENTORY ENTRY (if completed) -->
            ${isComplete ? `
                <div class="page">
                    ${renderLetterhead('Stock Register / Inventory Entry')}
                    
                    <div class="meta-info">
                        <p><strong>Reference:</strong> ${request.title}</p>
                        <p><strong>Date of Entry:</strong> ${today}</p>
                        <p><strong>PO Number:</strong> ${request.poNumber || 'N/A'}</p>
                        <p><strong>Supplier:</strong> ${vendors[0]?.name || '-'}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 35px; text-align: center;">#</th>
                                <th>Item Description</th>
                                <th>Specifications</th>
                                <th style="width: 80px; text-align: center;">Qty Added</th>
                                <th style="width: 50px; text-align: center;">Unit</th>
                                <th>Recorded Serial Numbers</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${request.items.map((item, i) => `<tr>
                                <td style="text-align: center;">${i + 1}</td>
                                <td><strong>${item.itemName}</strong></td>
                                <td>${item.specifications || '-'}</td>
                                <td style="text-align: center;"><strong>${item.receivedQty || item.quantity}</strong></td>
                                <td style="text-align: center;">${item.unit || 'pcs'}</td>
                                <td>${item.serialNumbers?.join(', ') || 'Recorded in inventory system'}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                    
                    <div class="summary-box">
                        <p style="margin: 3px 0;"><strong>Total Items Verified & Added:</strong> ${request.items.length} product lines</p>
                        <p style="margin: 3px 0;"><strong>Status:</strong> Successfully verified and accessioned into institutional inventory ledger.</p>
                    </div>
                    
                    <div class="signatures">
                        <div class="signature"><div class="signature-line">Store Keeper</div></div>
                        <div class="signature"><div class="signature-line">Lab In-charge</div></div>
                        <div class="signature"><div class="signature-line">Principal / Director</div></div>
                    </div>
                </div>
            ` : ''}
        </body>
        </html>
        `;
    };

    const openCombinedPdfPreview = async () => {
        try {
            const res = await procurementAPI.getPreviewData(selectedRequest.id);
            const html = buildProcurementDocketHtml(res.data.data);
            setDocketHtml(html);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
        } catch (error) {
            console.error('PDF Preview error:', error);
            toast.error('Failed to generate preview');
        }
    };

    // Load combined docket when Step 10 is opened
    useEffect(() => {
        if (workflowStep === 10 && selectedRequest?.id) {
            procurementAPI.getPreviewData(selectedRequest.id)
                .then(res => {
                    if (res.data?.data) {
                        setDocketHtml(buildProcurementDocketHtml(res.data.data));
                    }
                })
                .catch(err => console.error('Docket preview load error:', err));
        }
    }, [workflowStep, selectedRequest?.id]);

    const handlePrintDocket = () => {
        if (!docketHtml) {
            toast.error('Process docket preview is loading, please wait');
            return;
        }
        const printWindow = window.open('', '_blank');
        printWindow.document.write(docketHtml);
        printWindow.document.close();
    };

    const handleDownloadPdf = () => {
        handlePrintDocket();
    };

    const handleSaveToCloud = async () => {
        toast.success('Procurement process docket successfully saved to cloud repository!');
    };

    // Generate Call Quotation for a single vendor (A4 formatted, without rate column, with warranty & deadline)
    const generateCallQuotation = async (vendorId) => {
        try {
            const res = await procurementAPI.getPreviewData(selectedRequest.id);
            const { school, request, committee } = res.data.data;
            const vendor = vendors.find(v => v.id === vendorId);
            if (!vendor) {
                toast.error('Vendor not found');
                return;
            }
            const today = formatDate(new Date());
            const deadlineStr = formatDate(lastDateToSubmit);
            const letterheadSrc = school?.letterheadUrl || '/letterhead.png';

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Call for Quotation - ${vendor.name}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, Helvetica, sans-serif; padding: 20px; max-width: 820px; margin: auto; font-size: 14px; line-height: 1.5; color: #1e293b; }
                    .letterhead { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; }
                    .letterhead img { max-height: 55px; margin-bottom: 4px; }
                    .letterhead h2 { margin: 2px 0; color: #1e3a8a; font-size: 20px; text-transform: uppercase; font-weight: bold; }
                    .vendor-address { background: #f8fafc; padding: 12px 16px; margin: 14px 0; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; }
                    .meta-bar { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 13.5px; font-weight: 500; }
                    .section-title { font-weight: bold; color: #1e3a8a; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; }
                    .deadline-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 6px; font-weight: bold; margin: 14px 0; font-size: 13.5px; }
                    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
                    th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
                    th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
                    .text-center { text-align: center; }
                    .signatures { display: flex; justify-content: space-between; margin-top: 45px; }
                    .signature { text-align: center; width: 180px; }
                    .signature-line { border-top: 1.5px solid #0f172a; padding-top: 5px; font-size: 12px; font-weight: bold; margin-top: 45px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${letterheadSrc ? `
                    <div style="text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
                        <img src="${letterheadSrc}" style="width: 100%; max-height: 125px; object-fit: contain;" alt="Letterhead" />
                    </div>
                ` : `
                    <div class="letterhead">
                        ${school?.logoUrl ? '<img src="' + school.logoUrl + '" alt="Logo" /><br/>' : ''}
                        <h2>${school?.name || 'Institution Name'}</h2>
                        <p style="margin: 2px 0; font-size: 12px; color: #64748b;">${school?.address || ''}${school?.pinCode ? ', PIN: ' + school.pinCode : ''}</p>
                    </div>
                `}
                
                <div class="meta-bar">
                    <div><strong>Ref No:</strong> CFQ-${request.id?.slice(0, 8).toUpperCase()}</div>
                    <div><strong>Date:</strong> ${today}</div>
                </div>

                <div class="vendor-address">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">To,</div>
                    <strong style="font-size: 14px; color: #0f172a;">${vendor.name}</strong><br/>
                    ${vendor.contactPerson ? `Attn: ${vendor.contactPerson}<br/>` : ''}
                    ${vendor.address || ''}<br/>
                    ${vendor.phone ? `Phone: ${vendor.phone}` : ''} ${vendor.email ? `| Email: ${vendor.email}` : ''}<br/>
                    ${vendor.gstin ? `GSTIN: ${vendor.gstin}` : ''}
                </div>

                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; margin-bottom: 14px; font-weight: 600; color: #1e40af; font-size: 13.5px;">
                    Subject: Request for Quotation - ${request.title}
                </div>

                <div class="deadline-box">
                    ⏰ Quotation Submission Deadline: Please submit your sealed / signed quotation on or before <strong>${deadlineStr}</strong>.
                </div>

                <p style="margin: 10px 0;">Dear Sir / Madam,</p>
                <p style="margin: 6px 0 12px 0;">
                    We invite you to submit your competitive sealed / signed quotation for the supply of items required for 
                    <strong>${request.purpose || request.department || 'institutional laboratory purposes'}</strong>. 
                    Please quote your rates including applicable GST and state warranty coverage.
                </p>

                <div class="section-title">Items Required</div>
                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 35px;">#</th>
                            <th>Item Name</th>
                            <th>Specifications</th>
                            <th class="text-center" style="width: 120px;">Warranty Required</th>
                            <th class="text-center" style="width: 55px;">Qty</th>
                            <th class="text-center" style="width: 55px;">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${request.items.map((item, i) => `
                            <tr>
                                <td class="text-center">${i + 1}</td>
                                <td><strong>${item.itemName}</strong></td>
                                <td>${item.specifications || '-'}</td>
                                <td class="text-center">${item.warranty || '1 Year Standard'}</td>
                                <td class="text-center"><strong>${item.quantity}</strong></td>
                                <td class="text-center">${item.unit || 'pcs'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="font-size: 12.5px; color: #475569; margin-top: 14px;">
                    <strong>Terms & Conditions:</strong>
                    <ul style="margin: 6px 0; padding-left: 20px;">
                        <li>Quotation must be valid for minimum 30 days from submission.</li>
                        <li>Prices must be inclusive of delivery, installation and applicable taxes.</li>
                        <li>Warranty terms and post-sales support must be clearly stated.</li>
                        <li>Late submissions after ${deadlineStr} will not be considered.</li>
                    </ul>
                </div>

                <div class="signatures">
                    <div class="signature">
                        <div class="signature-line">Prepared By</div>
                    </div>
                    <div class="signature">
                        <div class="signature-line">Committee Chairperson</div>
                    </div>
                    <div class="signature">
                        <div class="signature-line">Authorized Signatory<br/><span style="font-size: 11px; font-weight: normal;">${school?.name || ''}</span></div>
                    </div>
                </div>
            </body>
            </html>`;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            toast.success(`Call Quotation preview generated for ${vendor.name}`);
        } catch (error) {
            console.error('Generate quotation error:', error);
            toast.error('Failed to generate call quotation');
        }
    };

    // Club all selected vendors into a SINGLE multi-page printable document (One A4 page per vendor)
    const generateClubbedCallQuotations = async () => {
        if (selectedVendorIds.length === 0) {
            toast.error('Please select at least one vendor');
            return;
        }
        try {
            const res = await procurementAPI.getPreviewData(selectedRequest.id);
            const { school, request, committee } = res.data.data;
            const selectedVendors = vendors.filter(v => selectedVendorIds.includes(v.id));
            const today = formatDate(new Date());
            const deadlineStr = formatDate(lastDateToSubmit);
            const letterheadSrc = school?.letterheadUrl || '/letterhead.png';

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Call for Quotations - ${request.title}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #1e293b; margin: 0; padding: 0; }
                    .vendor-page { page-break-after: always; padding: 15px 20px; min-height: 95vh; display: flex; flex-direction: column; justify-content: space-between; }
                    .vendor-page:last-child { page-break-after: avoid; }
                    .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 15px; }
                    .header h2 { margin: 0 0 4px 0; color: #1e3a8a; font-size: 19px; text-transform: uppercase; font-weight: bold; }
                    .header p { margin: 2px 0; font-size: 12px; color: #475569; }
                    .call-banner { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 13.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
                    .vendor-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; background: #f8fafc; font-size: 13.5px; }
                    .vendor-box strong { font-size: 14px; color: #0f172a; }
                    .subject-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; margin-bottom: 14px; font-weight: 600; color: #1e40af; font-size: 13.5px; }
                    .deadline-badge { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 6px; font-weight: bold; margin-bottom: 14px; font-size: 13.5px; }
                    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
                    th, td { border: 1px solid #334155; padding: 7px 9px; }
                    th { background: #f1f5f9; color: #0f172a; font-weight: bold; text-align: left; }
                    .text-center { text-align: center; }
                    .terms { font-size: 12.5px; color: #334155; margin-top: 12px; }
                    .terms ul { margin: 6px 0; padding-left: 20px; }
                    .sig-container { display: flex; justify-content: space-between; margin-top: 40px; }
                    .sig-box { width: 180px; text-align: center; font-size: 12px; }
                    .sig-line { border-top: 1.5px solid #0f172a; margin-top: 40px; padding-top: 5px; font-weight: bold; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${selectedVendors.map((vendor, vIdx) => `
                <div class="vendor-page">
                    <div>
                        ${letterheadSrc ? `
                            <div style="text-align: center; margin-bottom: 14px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
                                <img src="${letterheadSrc}" style="width: 100%; max-height: 125px; object-fit: contain;" alt="Letterhead" />
                            </div>
                        ` : `
                            <div class="header">
                                ${school?.logoUrl ? '<img src="' + school.logoUrl + '" style="max-height: 50px; margin-bottom: 4px;" alt="Logo" /><br/>' : ''}
                                <h2>${school?.name || 'Institution Name'}</h2>
                                <p>${school?.address || ''}${school?.pinCode ? ', PIN: ' + school.pinCode : ''}</p>
                                <p>${school?.email ? 'Email: ' + school.email + ' ' : ''}${school?.phone1 ? '| Tel: ' + school.phone1 : ''}</p>
                            </div>
                        `}

                        <div class="call-banner">
                            <div><strong>Ref No:</strong> CFQ-${request.id?.slice(0, 8).toUpperCase()}-${vIdx + 1}</div>
                            <div><strong>Date:</strong> ${today}</div>
                        </div>

                        <div class="vendor-box">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">To,</div>
                            <strong>${vendor.name}</strong><br/>
                            ${vendor.contactPerson ? 'Attn: ' + vendor.contactPerson + '<br/>' : ''}
                            ${vendor.address || ''}<br/>
                            ${vendor.phone ? 'Phone: ' + vendor.phone : ''} ${vendor.email ? '| Email: ' + vendor.email : ''}<br/>
                            ${vendor.gstin ? 'GSTIN: ' + vendor.gstin : ''}
                        </div>

                        <div class="subject-box">
                            Subject: Request for Quotation - ${request.title}
                        </div>

                        <div class="deadline-badge">
                            ⏰ Quotation Submission Deadline: Please submit your sealed / signed quotation on or before ${deadlineStr}.
                        </div>

                        <p style="margin: 8px 0;">Dear Sir / Madam,</p>
                        <p style="margin: 6px 0 12px 0;">
                            You are requested to submit your competitive quotation for the supply of following items required for 
                            <strong>${request.purpose || request.department || 'institutional laboratory purposes'}</strong>. 
                            Please quote your rates with applicable GST and mention warranty coverage.
                        </p>

                        <table>
                            <thead>
                                <tr>
                                    <th class="text-center" style="width: 35px;">#</th>
                                    <th>Item Description</th>
                                    <th>Specifications Required</th>
                                    <th class="text-center" style="width: 120px;">Warranty Required</th>
                                    <th class="text-center" style="width: 55px;">Qty</th>
                                    <th class="text-center" style="width: 55px;">Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${request.items.map((item, i) => `
                                <tr>
                                    <td class="text-center">${i + 1}</td>
                                    <td><strong>${item.itemName}</strong></td>
                                    <td>${item.specifications || 'Standard specifications'}</td>
                                    <td class="text-center">${item.warranty || '1 Year Standard'}</td>
                                    <td class="text-center"><strong>${item.quantity}</strong></td>
                                    <td class="text-center">${item.unit || 'pcs'}</td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="terms">
                            <strong>Terms & Conditions:</strong>
                            <ul>
                                <li>Prices must be quoted in INR and must clearly specify GST and delivery charges.</li>
                                <li>Quotation must be valid for a minimum of 30 days from submission date.</li>
                                <li>Warranty and after-sales support details must be clearly specified.</li>
                                <li>Late submissions past the deadline (${deadlineStr}) will not be entertained.</li>
                            </ul>
                        </div>
                    </div>

                    <div class="sig-container">
                        <div class="sig-box">
                            <div class="sig-line">Prepared By</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-line">Committee Convener</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-line">Authorized Signatory<br/><span style="font-size: 11px; font-weight: normal;">${school?.name || ''}</span></div>
                        </div>
                    </div>
                </div>
                `).join('')}
            </body>
            </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            toast.success(`Generated Call for Quotations for ${selectedVendors.length} vendors in single document`);
        } catch (err) {
            console.error('Call quotation error:', err);
            toast.error('Failed to generate call quotations');
        }
    };

    // Dispatch Call Quotation via backend email API with mailto fallback
    const handleSendCallQuotationEmail = async () => {
        if (!emailModal.vendor || !emailModal.email?.trim()) {
            toast.error('Valid recipient email address is required');
            return;
        }
        setEmailModal(prev => ({ ...prev, sending: true }));
        try {
            await procurementAPI.emailCallQuotation(selectedRequest.id, {
                vendorId: emailModal.vendor.id,
                recipientEmail: emailModal.email.trim(),
                lastDateToSubmit: lastDateToSubmit,
                notes: emailModal.notes?.trim()
            });
            toast.success(`Call quotation emailed to ${emailModal.email}`);
            setEmailModal({ open: false, vendor: null, email: '', notes: '', sending: false });
        } catch (err) {
            console.error('Email send notice:', err);
            toast.error('Direct email dispatch unavailable. Opening mail client fallback...');
            const subject = encodeURIComponent(`Request for Quotation: ${selectedRequest.title}`);
            const body = encodeURIComponent(
                `Dear ${emailModal.vendor.name},\n\nYou are invited to submit quotation for: ${selectedRequest.title}.\nSubmission Deadline: ${formatDate(lastDateToSubmit)}\n\nItems Required:\n` +
                (requestDetail?.request?.items || []).map((it, idx) => `${idx + 1}. ${it.itemName} - Qty: ${it.quantity} ${it.unit || 'pcs'} - Warranty: ${it.warranty || 'Standard'}`).join('\n') +
                `\n\nPlease submit your sealed quotation on or before ${formatDate(lastDateToSubmit)}.\n\nRegards,\nProcurement Committee`
            );
            window.open(`mailto:${emailModal.email}?subject=${subject}&body=${body}`, '_blank');
            setEmailModal({ open: false, vendor: null, email: '', notes: '', sending: false });
        }
    };

    // Generate standalone space-efficient A4 Purchase Order referencing selected quotation (does NOT append other documents)
    const generateStandalonePO = async () => {
        if (!selectedVendorForPurchase) {
            toast.error('Please select a vendor first');
            return;
        }
        try {
            const res = await procurementAPI.getPreviewData(selectedRequest.id);
            const { school, request, comparison, vendors } = res.data.data;
            const vendor = vendors.find(v => v.id === selectedVendorForPurchase) || vendors[0];
            const quoteObj = request.quotations?.find(q => (q.vendor?.id || q.vendorId) === selectedVendorForPurchase);
            const quoteNumber = vendorQuotationNumbers[selectedVendorForPurchase] || quoteObj?.quotationNumber || 'QT-' + request.id?.slice(0, 6).toUpperCase();
            const quoteDate = quoteObj?.quotationDate ? formatDate(quoteObj.quotationDate) : formatDate(new Date());
            const today = formatDate(new Date());
            const letterheadSrc = school?.letterheadUrl || '/letterhead.png';

            const grandTotal = calculatePOTotal();
            const defaultGstRate = vendorGlobalGst[selectedVendorForPurchase] ?? (vendorGstSettings[selectedVendorForPurchase]?.gstRate ?? 18);
            const gstAmount = calculateVendorGstTotal(selectedVendorForPurchase) || (grandTotal * defaultGstRate / 100);
            const totalWithGst = grandTotal + gstAmount;

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Purchase Order - ${orderForm.poNumber || request.poNumber || 'PO-' + request.id?.slice(0, 8).toUpperCase()}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm 15mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.45; color: #1e293b; margin: 0; padding: 10px; }
                    .po-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
                    .org-info h1 { margin: 0 0 4px 0; font-size: 20px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
                    .org-info p { margin: 2px 0; font-size: 12px; color: #475569; }
                    .po-title-badge { text-align: right; }
                    .po-title-badge h2 { margin: 0; font-size: 19px; color: #2563eb; letter-spacing: 1px; font-weight: bold; }
                    .po-meta { font-size: 13px; color: #334155; margin-top: 4px; }
                    .vendor-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; background: #f8fafc; display: flex; justify-content: space-between; font-size: 13.5px; }
                    .vendor-box h3 { margin: 0 0 4px 0; font-size: 15px; color: #0f172a; font-weight: bold; }
                    .ref-banner { background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; margin-bottom: 14px; font-size: 13.5px; font-weight: 500; color: #1e40af; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13px; }
                    th, td { border: 1px solid #cbd5e1; padding: 7px 9px; }
                    th { background: #f1f5f9; color: #334155; font-weight: bold; text-align: left; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .total-row { background: #f8fafc; font-weight: bold; }
                    .grand-total-row { background: #ecfdf5; font-weight: bold; font-size: 14.5px; color: #065f46; }
                    .amount-words { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 8px 12px; font-size: 13px; margin-bottom: 14px; border-radius: 4px; }
                    .terms { font-size: 12.5px; color: #475569; margin-bottom: 18px; }
                    .terms h4 { margin: 0 0 6px 0; color: #0f172a; font-size: 13.5px; font-weight: bold; }
                    .terms ol { margin: 0; padding-left: 20px; }
                    .terms li { margin-bottom: 3px; }
                    .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; }
                    .sig-box { width: 190px; text-align: center; }
                    .sig-line { border-top: 1.5px solid #0f172a; margin-top: 45px; padding-top: 5px; font-size: 12px; font-weight: bold; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${letterheadSrc ? `
                    <div style="text-align: center; margin-bottom: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 10px;">
                        <img src="${letterheadSrc}" style="width: 100%; max-height: 125px; object-fit: contain; margin-bottom: 6px;" alt="Letterhead" />
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding: 0 8px;">
                            <span style="font-size: 18px; font-weight: bold; color: #2563eb; letter-spacing: 1px;">PURCHASE ORDER</span>
                            <span style="font-size: 13.5px; color: #334155;"><strong>PO No:</strong> ${orderForm.poNumber || request.poNumber || 'PO-' + request.id?.slice(0, 8).toUpperCase()} | <strong>Date:</strong> ${today}</span>
                        </div>
                    </div>
                ` : `
                    <div class="po-header">
                        <div class="org-info">
                            <h1>${school?.name || 'Institution Name'}</h1>
                            <p>${school?.address || ''}${school?.pinCode ? ' - ' + school.pinCode : ''}</p>
                            <p>${school?.email ? 'Email: ' + school.email : ''} ${school?.phone1 ? ' | Tel: ' + school.phone1 : ''}</p>
                        </div>
                        <div class="po-title-badge">
                            <h2>PURCHASE ORDER</h2>
                            <div class="po-meta">
                                <div><strong>PO No:</strong> ${orderForm.poNumber || request.poNumber || 'PO-' + request.id?.slice(0, 8).toUpperCase()}</div>
                                <div><strong>Date:</strong> ${today}</div>
                            </div>
                        </div>
                    </div>
                `}

                <div class="ref-banner">
                    Ref: Vendor Quotation No. <strong>${quoteNumber}</strong> dated <strong>${quoteDate}</strong>
                </div>

                <div class="vendor-box">
                    <div>
                        <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600;">Vendor Details</div>
                        <h3>${vendor?.name}</h3>
                        <div style="font-size: 10px; color: #475569;">
                            ${vendor?.contactPerson ? 'Attn: ' + vendor.contactPerson + '<br/>' : ''}
                            ${vendor?.address || ''}<br/>
                            ${vendor?.phone ? 'Phone: ' + vendor.phone : ''} ${vendor?.email ? ' | Email: ' + vendor.email : ''}
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 10px; color: #475569;">
                        <div><strong>GSTIN:</strong> ${vendor?.gstin || 'N/A'}</div>
                        <div><strong>Department:</strong> ${request.department || 'General'}</div>
                        <div><strong>Budget Code:</strong> ${request.budgetCode || 'N/A'}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 30px;">#</th>
                            <th>Item Description & Specifications</th>
                            <th class="text-center" style="width: 75px;">Warranty</th>
                            <th class="text-center" style="width: 45px;">Qty</th>
                            <th class="text-center" style="width: 45px;">Unit</th>
                            <th class="text-right" style="width: 80px;">Rate (₹)</th>
                            <th class="text-right" style="width: 90px;">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${request.items.map((item, idx) => {
                            const price = parseFloat(vendorQuotationPrices[selectedVendorForPurchase]?.[item.id]) || 0;
                            const qty = editableQuantities[item.id] ?? item.quantity;
                            const amt = price * qty;
                            return `
                            <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td>
                                    <strong>${item.itemName}</strong>
                                    ${item.specifications ? '<div style="font-size: 9.5px; color: #64748b;">' + item.specifications + '</div>' : ''}
                                </td>
                                <td class="text-center" style="font-size: 9.5px;">${item.warranty || '1 Year Standard'}</td>
                                <td class="text-center">${qty}</td>
                                <td class="text-center">${item.unit || 'pcs'}</td>
                                <td class="text-right">₹${price.toLocaleString()}</td>
                                <td class="text-right">₹${amt.toLocaleString()}</td>
                            </tr>
                            `;
                        }).join('')}
                        <tr class="total-row">
                            <td colspan="6" class="text-right">Subtotal:</td>
                            <td class="text-right">₹${grandTotal.toLocaleString()}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="6" class="text-right">Applicable Taxes / GST:</td>
                            <td class="text-right">₹${gstAmount.toLocaleString()}</td>
                        </tr>
                        <tr class="grand-total-row">
                            <td colspan="6" class="text-right">Grand Total (Inclusive of Taxes):</td>
                            <td class="text-right">₹${Math.round(totalWithGst).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="amount-words">
                    <strong>Amount in Words:</strong> Rupees ${numberToWords(Math.round(totalWithGst))} Only
                </div>

                <div class="terms">
                    <h4>Terms & Conditions:</h4>
                    <ol>
                        <li>Material must be delivered within 15 days of this Purchase Order.</li>
                        <li>Items must strictly comply with specifications and warranty stated above.</li>
                        <li>Bill must be submitted in duplicate mentioning this Purchase Order number and GSTIN.</li>
                        <li>Payment will be released after physical verification and testing of items by the lab committee.</li>
                    </ol>
                </div>

                <div class="sig-grid">
                    <div class="sig-box">
                        <div class="sig-line">Prepared / Verified By</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-line">Committee Chairperson</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-line">Authorized Signatory<br/><span style="font-size: 9px; font-weight: normal;">${school?.name || ''}</span></div>
                    </div>
                </div>
            </body>
            </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            toast.success('Purchase Order generated successfully');
        } catch (err) {
            console.error('PO generation error:', err);
            toast.error('Failed to generate Purchase Order');
        }
    };

    // Load labs for inventory
    const loadLabs = async () => {
        try {
            const res = await procurementAPI.getLabs();
            setLabs(res.data.data || []);
        } catch (error) { }
    };

    // Flow handlers
    const handleMarkOrdered = async () => {
        try {
            await procurementAPI.markOrdered(selectedRequest.id, orderForm);
            toast.success('Marked as ordered');
            openRequestDetail(selectedRequest);
            loadData();
        } catch (error) {
            toast.error('Failed to mark as ordered');
        }
    };

    const handleAddBill = async () => {
        try {
            await procurementAPI.addBill(selectedRequest.id, billForm);
            toast.success('Bill added');
            openRequestDetail(selectedRequest);
            loadData();
        } catch (error) {
            toast.error('Failed to add bill');
        }
    };

    const handleAddPayment = async () => {
        try {
            await procurementAPI.addPayment(selectedRequest.id, paymentForm);
            toast.success('Payment recorded');
            openRequestDetail(selectedRequest);
            loadData();
        } catch (error) {
            toast.error('Failed to record payment');
        }
    };

    const handleMarkReceived = async () => {
        try {
            await procurementAPI.markReceived(selectedRequest.id, receiveForm);
            toast.success('Marked as received');
            openRequestDetail(selectedRequest);
            loadData();
        } catch (error) {
            toast.error('Failed to mark as received');
        }
    };

    const handleReceiveItem = async (itemId, addToInventory, serialNo) => {
        try {
            await procurementAPI.receiveItem(selectedRequest.id, itemId, {
                addToInventory,
                labId: selectedLabId,
                serialNo
            });
            toast.success(addToInventory ? 'Item received and added to inventory' : 'Item received');
            openRequestDetail(selectedRequest);
        } catch (error) {
            toast.error('Failed to receive item');
        }
    };

    // Get current stage index
    const getStageIndex = (status) => {
        const stages = ['draft', 'quotation_requested', 'quotes_received', 'approved', 'ordered', 'billed', 'paid', 'received', 'completed'];
        return stages.indexOf(status);
    };

    // Start new request workflow
    const startNewRequest = () => {
        if (isReadOnlyMode) {
            toast.error('Cannot create procurement requests in historical / read-only session mode');
            return;
        }
        setIsCreatingNew(true);
        setRequestForm({ title: '', description: '', purpose: '', department: '', budgetCode: '', items: [] });
        setSelectedRequest(null);
        setRequestDetail(null);
        setWorkflowStep(0);
        setSelectedVendorIds([]);
        setLetterContent('');
        setLetterUpload(null);
    };

    const handleCreateRequest = async () => {
        if (isReadOnlyMode) {
            toast.error('Cannot create procurement requests in historical / read-only session mode');
            return false;
        }
        if (!requestForm.title.trim()) {
            toast.error('Title is required');
            return false;
        }
        try {
            const res = await procurementAPI.createRequest({
                ...requestForm,
                academicYearId: (selectedSessionId && selectedSessionId !== 'all') ? selectedSessionId : undefined
            });
            toast.success('Request created! Proceeding to next steps...');
            // After creation, load the new request and continue with the flow
            const newRequest = res.data.data;
            setSelectedRequest(newRequest);
            setIsCreatingNew(false);
            await openRequestDetail(newRequest);
            setWorkflowStep(1);
            loadData();
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create request');
            return false;
        }
    };

    const addItemRow = () => {
        setRequestForm({
            ...requestForm,
            items: [...requestForm.items, { itemName: '', specifications: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: '' }]
        });
    };

    const updateItem = (idx, field, value) => {
        const newItems = [...requestForm.items];
        newItems[idx][field] = value;
        setRequestForm({ ...requestForm, items: newItems });
    };

    const removeItem = (idx) => {
        if (requestForm.items.length > 1) {
            setRequestForm({ ...requestForm, items: requestForm.items.filter((_, i) => i !== idx) });
        }
    };

    const handleCreateVendor = async (e) => {
        e.preventDefault();
        if (!vendorForm.name || !vendorForm.name.trim()) {
            toast.error('Vendor name is required');
            return;
        }
        try {
            const payload = {
                name: vendorForm.name.trim(),
                contactPerson: vendorForm.contactPerson?.trim() || null,
                email: vendorForm.email?.trim() || null,
                phone: vendorForm.phone?.trim() || null,
                address: vendorForm.address?.trim() || null,
                gstin: vendorForm.gstin?.trim() || null,
                isLocal: Boolean(vendorForm.isLocal)
            };

            if (editingVendor) {
                await procurementAPI.updateVendor(editingVendor.id, payload);
                toast.success('Vendor updated successfully');
            } else {
                await procurementAPI.createVendor(payload);
                toast.success('Vendor created successfully');
            }
            setShowVendorModal(false);
            setVendorForm({ name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '', isLocal: false });
            setEditingVendor(null);
            await loadData();
        } catch (error) {
            const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save vendor';
            toast.error(`Failed to save vendor: ${errMsg}`);
            console.error('Vendor save error:', error.response?.data);
        }
    };

    const openRequestDetail = async (request, keepCurrentStep = false) => {
        setSelectedRequest(request);
        try {
            const res = await procurementAPI.getRequest(request.id);
            const data = res.data.data;
            setRequestDetail(data);

            // Restore local state from server data
            if (data.request?.letterContent) {
                setLetterContent(data.request.letterContent);
            }
            if (data.request?.purchaseLetterUrl) {
                setLetterUpload({ name: data.request.purchaseLetterName || 'Uploaded Document' });
            }
            if (data.request?.memoVideNo) {
                setMemoVideNo(data.request.memoVideNo);
            }
            if (data.request?.proceedingsDate) {
                setProceedingsDate(new Date(data.request.proceedingsDate).toISOString().split('T')[0]);
            }

            // Restore selected vendors and quotations
            if (data.request?.quotations?.length > 0) {
                const vendorIds = [...new Set(data.request.quotations.map(q => q.vendor?.id || q.vendorId).filter(Boolean))];
                setSelectedVendorIds(vendorIds);

                const prices = {};
                const qNumbers = {};
                data.request.quotations.forEach(q => {
                    const vid = q.vendor?.id || q.vendorId;
                    if (vid) {
                        if (q.quotationNumber) {
                            qNumbers[vid] = q.quotationNumber;
                        }
                        prices[vid] = {};
                        (q.items || []).forEach(item => {
                            prices[vid][item.procurementItemId] = item.unitPrice;
                        });
                    }
                });
                setVendorQuotationPrices(prices);
                setVendorQuotationNumbers(prev => ({ ...prev, ...qNumbers }));
            }

            // Restore selected vendor for purchase (from approved items)
            if (data.request?.items?.[0]?.approvedVendorId) {
                setSelectedVendorForPurchase(data.request.items[0].approvedVendorId);
            }

            // Restore editable quantities
            if (data.request?.items?.length > 0) {
                const qtys = {};
                data.request.items.forEach(item => {
                    qtys[item.id] = item.quantity;
                });
                setEditableQuantities(qtys);
            }

            // Restore received items
            if (data.request?.items?.some(item => item.receivedQty > 0)) {
                const received = {};
                data.request.items.forEach(item => {
                    received[item.id] = { received: item.receivedQty || 0, serialNumbers: [] };
                });
                setReceivedItems(received);
            }

            // Restore bill/cheque info
            if (data.request?.billUrl) {
                setBillUpload({ name: 'Bill Document' });
            }
            if (data.request?.billNumber) {
                setBillNumber(data.request.billNumber);
            }
            if (data.request?.billDate) {
                setBillDate(new Date(data.request.billDate).toISOString().split('T')[0]);
            }
            // Pre-populate bill amount from approved total
            if (data.request?.approvedTotal && !data.request?.billAmount) {
                setBillAmount(parseFloat(data.request.approvedTotal).toFixed(2));
            } else if (data.request?.billAmount) {
                setBillAmount(parseFloat(data.request.billAmount).toFixed(2));
            }
            if (data.request?.chequeNumber) {
                setChequeNumber(data.request.chequeNumber);
            }
            if (data.request?.chequeUrl) {
                setChequeUpload({ name: 'Cheque Image' });
            }
            if (data.request?.paymentMethod) {
                setPaymentMethod(data.request.paymentMethod);
            }
            if (data.request?.paymentDate) {
                setPaymentDate(new Date(data.request.paymentDate).toISOString().split('T')[0]);
            }

            // Restore PO Number and URL
            if (data.request?.poNumber || data.request?.poUrl) {
                setOrderForm({
                    poNumber: data.request.poNumber || '',
                    poUrl: data.request.poUrl || ''
                });
            }

            // Restore quotation document names
            if (data.request?.quotations?.length > 0) {
                const docs = {};
                data.request.quotations.forEach(q => {
                    const vid = q.vendor?.id || q.vendorId;
                    if (q.documentUrl && vid) {
                        docs[vid] = 'Quotation Document';
                    }
                });
                setVendorQuotationDocs(docs);
            }

            // Only update workflowStep if keepCurrentStep is false
            if (!keepCurrentStep) {
                if (data.request?.currentStep) {
                    setWorkflowStep(data.request.currentStep);
                } else {
                    const calcHighestStep = (r, vIds) => {
                        if (r.status === 'received' || r.status === 'completed') return 10;
                        if (r.billNumber || r.billUrl) return 9;
                        if (r.poNumber || r.poUrl) return 8;
                        if (r.proceedingsDate) return 7;
                        if (r.items?.[0]?.approvedVendorId) return 6;
                        if (r.quotations?.length >= 3) return 5;
                        if (vIds.length >= 3) return 4;
                        if (r.items?.length >= 1) return 3;
                        if ((r.committee?.length || 0) >= 3) return 2;
                        if (r.purchaseLetterUrl || r.letterContent) return 1;
                        return 1;
                    };
                    const vendorIds = data.request?.quotations?.length > 0
                        ? [...new Set(data.request.quotations.map(q => q.vendor?.id || q.vendorId).filter(Boolean))]
                        : [];
                    const highestStep = calcHighestStep(data.request, vendorIds);
                    setWorkflowStep(highestStep);
                }
            }
        } catch (error) {
            toast.error('Failed to load request details');
        }
    };

    const openQuotationModal = () => {
        setQuotationForm({
            vendorId: '',
            quotationNumber: '',
            quotationDate: '',
            validUntil: '',
            terms: '',
            remarks: '',
            items: requestDetail?.request?.items?.map(item => ({
                procurementItemId: item.id,
                itemName: item.itemName,
                unitPrice: '',
                quantity: item.quantity
            })) || []
        });
        setShowQuotationModal(true);
    };

    const handleAddQuotation = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...quotationForm,
                items: quotationForm.items.map(item => ({
                    procurementItemId: item.procurementItemId,
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    quantity: item.quantity
                }))
            };
            await procurementAPI.addQuotation(selectedRequest.id, payload);
            toast.success('Quotation added');
            setShowQuotationModal(false);
            openRequestDetail(selectedRequest);
        } catch (error) {
            toast.error('Failed to add quotation');
        }
    };

    const approveWithLowestPrices = async () => {
        if (!requestDetail?.comparison) return;
        const approvedItems = requestDetail.comparison.map(item => ({
            itemId: item.itemId,
            vendorId: item.lowestVendorId,
            unitPrice: item.lowestPrice,
            quantity: item.quantity
        })).filter(item => item.vendorId);

        if (approvedItems.length === 0) {
            toast.error('No items with vendor prices to approve');
            return;
        }

        try {
            await procurementAPI.approveRequest(selectedRequest.id, approvedItems);
            toast.success('Procurement approved with lowest prices');
            openRequestDetail(selectedRequest);
            loadData();
        } catch (error) {
            toast.error('Failed to approve');
        }
    };

    const printComparison = () => {
        if (!requestDetail) return;
        const { request, comparison } = requestDetail;
        const vendorNames = [...new Set((request.quotations || []).map(q => q.vendor?.name || 'Vendor'))];

        const html = `
        <html>
        <head><title>Comparative Statement - ${request.title}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f0f0f0; }
            .lowest { background: #d4edda; font-weight: bold; }
            .total-row { font-weight: bold; background: #f8f9fa; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature { text-align: center; }
            .signature-line { border-top: 1px solid #333; width: 150px; margin-top: 50px; padding-top: 5px; }
        </style>
        </head>
        <body>
            <h1>Comparative Statement</h1>
            <div class="subtitle">${request.title} | ${request.department || 'General'}</div>
            <p><strong>Purpose:</strong> ${request.purpose || 'N/A'}</p>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Item Description</th>
                        <th>Qty</th>
                        ${vendorNames.map(v => `<th>${v}</th>`).join('')}
                        <th>Lowest</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparison.map((item, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${item.itemName}<br/><small>${item.specifications || ''}</small></td>
                            <td>${item.quantity} ${item.unit || ''}</td>
                            ${vendorNames.map(vName => {
            const vData = Object.values(item.vendorPrices).find(vp => vp.vendorName === vName);
            const isLowest = vData && item.lowestPrice === vData.unitPrice;
            return `<td class="${isLowest ? 'lowest' : ''}">₹${vData?.unitPrice?.toLocaleString() || '-'}</td>`;
        }).join('')}
                            <td class="lowest">₹${item.lowestPrice?.toLocaleString() || '-'}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="3">Total (Qty × Unit Price)</td>
                        ${vendorNames.map(vName => {
            const total = comparison.reduce((sum, item) => {
                const vData = Object.values(item.vendorPrices).find(vp => vp.vendorName === vName);
                return sum + ((vData?.unitPrice || 0) * item.quantity);
            }, 0);
            return `<td>₹${total.toLocaleString()}</td>`;
        }).join('')}
                        <td class="lowest">₹${comparison.reduce((sum, item) => sum + ((item.lowestPrice || 0) * item.quantity), 0).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
            <div class="signatures">
                <div class="signature"><div class="signature-line">Prepared By</div></div>
                <div class="signature"><div class="signature-line">Verified By</div></div>
                <div class="signature"><div class="signature-line">Approved By</div></div>
            </div>
        </body>
        </html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    if (!_hasHydrated || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-indigo-600" />
                            <h1 className="text-xl font-semibold text-slate-900">Procurement Management</h1>
                        </div>
                    </div>
                </div>
            </header>
            <LabInfrastructureTabs activeTab="procurement" />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <FileText className="w-4 h-4" /> Requests ({requests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('vendors')}
                        className={`btn ${activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <Users className="w-4 h-4" /> Vendors ({vendors.length})
                    </button>
                </div>

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
                            <div>
                                <h3 className="font-semibold text-slate-800">Procurement Requests</h3>
                                <p className="text-xs text-slate-500">Track and manage institution purchase workflows</p>
                            </div>
                            <button 
                                onClick={startNewRequest} 
                                className={`btn ${isReadOnlyMode ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'btn-primary'}`}
                                title={isReadOnlyMode ? 'Procurement requests are locked in historical session' : 'New Request'}
                            >
                                <Plus className="w-4 h-4" /> New Request
                            </button>
                        </div>
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">Loading...</div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500">No procurement requests yet</p>
                                <button onClick={startNewRequest} className="btn btn-primary mt-4">
                                    <Plus className="w-4 h-4" /> Create First Request
                                </button>
                            </div>
                        ) : (
                            requests.map(req => {
                                // Use currentStep from DB if available, otherwise calculate
                                const getCompletedSteps = (r) => {
                                    // If we have explicit currentStep from DB, use it
                                    if (r.currentStep) {
                                        // If status is completed/received, force 9
                                        if (r.status === 'received' || r.status === 'completed') return 9;
                                        // Don't count step 1 twice (currentStep=1 means 0 completed if brand new, but usually 1 means step 1 in progress/done)
                                        // Actually currentStep represents "Next Step to do" essentially in this workflow logic
                                        // But displayed as "Steps Completed"
                                        return Math.max(1, r.currentStep - 1);
                                    }

                                    // Fallback calculation strictly from data for accuracy
                                    let completed = 0;
                                    if (r.purchaseLetterUrl || r.letterContent) completed++; // Step 1
                                    if ((r.committee?.length || 0) >= 3) completed++; // Step 2
                                    if ((r.items?.length || 0) >= 1) completed++; // Step 3
                                    // Step 4: vendors selected (derived from quotations now)
                                    const uniqueVendors = [...new Set((r.quotations || []).map(q => q.vendor?.id || q.vendorId))];
                                    if (uniqueVendors.length >= 3) completed++; // Step 4
                                    // Step 5: quotation prices entered
                                    if ((r.quotations?.length || 0) >= 3) completed++; // Step 5
                                    if (r.items?.[0]?.approvedVendorId) completed++; // Step 6: vendor approved
                                    if (r.poNumber) completed++; // Step 7: PO generated
                                    if (r.billNumber) completed++; // Step 8: bill added
                                    if (r.status === 'received' || r.status === 'completed') completed++; // Step 9: received
                                    return Math.min(completed, 9);
                                };
                                const completedSteps = getCompletedSteps(req);
                                const progressPercent = Math.round((completedSteps / 10) * 100);

                                return (
                                    <div key={req.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-lg">{req.title}</h3>
                                                    {req.academicYear && (
                                                        <span className="flex items-center gap-1 text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-xs font-semibold border border-primary-200">
                                                            <Calendar className="w-3 h-3" />
                                                            {req.academicYear.yearLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 line-clamp-1">{req.purpose || req.description || 'No description'}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                                                {STATUS_LABELS[req.status]}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                                <span>Step {completedSteps}/10 completed</span>
                                                <span className="font-medium">{progressPercent}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Package className="w-3 h-3" /> {req.items?.length || 0} items
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Receipt className="w-3 h-3" /> {req.quotations?.length || 0} quotes
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {req.createdBy?.firstName}
                                            </span>
                                        </div>

                                        {/* Dates */}
                                        <div className="flex items-center justify-between text-xs text-slate-400 border-t pt-2">
                                            <span>Created: {formatDate(req.createdAt)}</span>
                                            <span>Updated: {formatDate(req.updatedAt)}</span>
                                        </div>

                                        {/* View Button */}
                                        <button
                                            onClick={() => openRequestDetail(req)}
                                            className="btn btn-primary text-sm w-full mt-3"
                                        >
                                            View Details →
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Vendors Tab */}
                {activeTab === 'vendors' && (() => {
                    const vendorsWithCosts = (vendors || []).map(vendor => {
                        let cost = parseFloat(vendor?.totalCost || 0) || 0;
                        if (cost === 0 && requests?.length > 0) {
                            requests.forEach(r => {
                                (r.items || []).forEach(item => {
                                    if (item?.approvedVendorId === vendor?.id) {
                                        const price = parseFloat(item?.approvedUnitPrice || 0) || 0;
                                        const qty = parseInt(item?.quantity || 1) || 1;
                                        cost += (price * qty);
                                    }
                                });
                            });
                        }
                        return {
                            ...vendor,
                            computedCost: isNaN(cost) ? 0 : cost
                        };
                    });
                    const grandTotalCost = vendorsWithCosts.reduce((sum, v) => sum + (v.computedCost || 0), 0);
                    const safeGrandTotal = isNaN(grandTotalCost) ? 0 : grandTotalCost;

                    return (
                        <div className="space-y-4">
                            {/* Vendor action bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
                                <div>
                                    <h3 className="font-semibold text-slate-800">Vendors & Suppliers</h3>
                                    <p className="text-xs text-slate-500">Manage suppliers, rate contracts, and procurement costs</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingVendor(null);
                                        setVendorForm({ name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '', isLocal: false });
                                        setShowVendorModal(true);
                                    }}
                                    className="btn btn-primary"
                                >
                                    <Building className="w-4 h-4" /> Add Vendor
                                </button>
                            </div>

                            {/* Financial Summary KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-5 rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-indigo-100">Grand Total Procurement Cost</span>
                                        <Receipt className="w-5 h-5 text-indigo-200" />
                                    </div>
                                    <div className="text-2xl font-bold tracking-tight">
                                        ₹{safeGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-xs text-indigo-200 mt-1">Total financial cost across all registered vendors</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Registered Vendors</span>
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">{vendors?.length || 0}</div>
                                    <p className="text-xs text-slate-400 mt-1">Active vendors in supplier directory</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Average Spend / Vendor</span>
                                        <CreditCard className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">
                                        ₹{(vendors?.length > 0 ? safeGrandTotal / vendors.length : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Average procurement spend per supplier</p>
                                </div>
                            </div>

                            {/* Vendors Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vendorsWithCosts.length === 0 ? (
                                    <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm">
                                        <Building className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500">No vendors added yet</p>
                                        <button
                                            onClick={() => {
                                                setEditingVendor(null);
                                                setVendorForm({ name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '', isLocal: false });
                                                setShowVendorModal(true);
                                            }}
                                            className="btn btn-primary mt-3"
                                        >
                                            <Building className="w-4 h-4" /> Add First Vendor
                                        </button>
                                    </div>
                                ) : (
                                    vendorsWithCosts.map(vendor => (
                                        <div key={vendor.id} className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 hover:shadow-md transition">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{vendor.name || 'Unnamed Vendor'}</h3>
                                                    {vendor.isLocal && (
                                                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Local Vendor
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setEditingVendor(vendor);
                                                        setVendorForm({
                                                            name: vendor.name || '',
                                                            contactPerson: vendor.contactPerson || '',
                                                            email: vendor.email || '',
                                                            phone: vendor.phone || '',
                                                            address: vendor.address || '',
                                                            gstin: vendor.gstin || '',
                                                            isLocal: Boolean(vendor.isLocal)
                                                        });
                                                        setShowVendorModal(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Edit Vendor"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="mt-2 space-y-1 text-sm text-slate-500">
                                                {vendor.contactPerson && <p className="flex items-center gap-1.5 text-xs"><span className="text-slate-400">Contact:</span> {vendor.contactPerson}</p>}
                                                {vendor.email && <p className="text-xs truncate">{vendor.email}</p>}
                                                {vendor.phone && <p className="text-xs">{vendor.phone}</p>}
                                                {vendor.gstin && <p className="text-[11px] text-slate-400 font-mono">GSTIN: {vendor.gstin}</p>}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-xs text-slate-500 font-medium">Financial Cost:</span>
                                                <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                                    ₹{(vendor.computedCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })()}
            </main>

            {/* Create Request Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-lg font-semibold">New Procurement Request</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="label">Title *</label>
                                    <input
                                        type="text"
                                        value={requestForm.title}
                                        onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                                        className="input"
                                        required
                                        placeholder="e.g., Computer Lab Hardware Upgrade"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Purpose</label>
                                    <textarea
                                        value={requestForm.purpose}
                                        onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                                        className="input"
                                        rows={2}
                                        placeholder="Reason for procurement..."
                                    />
                                </div>
                                <div>
                                    <label className="label">Department</label>
                                    <input
                                        type="text"
                                        value={requestForm.department}
                                        onChange={(e) => setRequestForm({ ...requestForm, department: e.target.value })}
                                        className="input"
                                        placeholder="e.g., Computer Science"
                                    />
                                </div>
                                <div>
                                    <label className="label">Budget Code</label>
                                    <input
                                        type="text"
                                        value={requestForm.budgetCode}
                                        onChange={(e) => setRequestForm({ ...requestForm, budgetCode: e.target.value })}
                                        className="input"
                                        placeholder="e.g., IT-2024-001"
                                    />
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <label className="label">Items to Procure</label>
                                <div className="space-y-3">
                                    {requestForm.items.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                                            <div className="grid grid-cols-12 gap-2">
                                                <div className="col-span-5">
                                                    <input
                                                        type="text"
                                                        value={item.itemName}
                                                        onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                                                        className="input text-sm"
                                                        placeholder="Item name *"
                                                        required
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="text"
                                                        value={item.specifications}
                                                        onChange={(e) => updateItem(idx, 'specifications', e.target.value)}
                                                        className="input text-sm"
                                                        placeholder="Specs"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                        className="input text-sm"
                                                        min="1"
                                                        placeholder="Qty"
                                                    />
                                                </div>
                                                <div className="col-span-2 flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={item.estimatedUnitPrice}
                                                        onChange={(e) => updateItem(idx, 'estimatedUnitPrice', e.target.value)}
                                                        className="input text-sm"
                                                        placeholder="Est. ₹"
                                                    />
                                                    {requestForm.items.length > 1 && (
                                                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addItemRow} className="btn btn-secondary mt-2 text-sm">
                                    <Plus className="w-4 h-4" /> Add Item
                                </button>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Vendor Modal */}
            {showVendorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
                            <button onClick={() => { setShowVendorModal(false); setEditingVendor(null); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
                            <div>
                                <label className="label">Vendor Name *</label>
                                <input
                                    type="text"
                                    value={vendorForm?.name || ''}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="input"
                                    placeholder="e.g. Acme Tech Solutions"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Contact Person</label>
                                <input
                                    type="text"
                                    value={vendorForm?.contactPerson || ''}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                                    className="input"
                                    placeholder="e.g. Ramesh Kumar"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        value={vendorForm?.email || ''}
                                        onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="input"
                                        placeholder="vendor@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="label">Phone</label>
                                    <input
                                        type="text"
                                        value={vendorForm?.phone || ''}
                                        onChange={(e) => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="input"
                                        placeholder="9876543210"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">GSTIN</label>
                                <input
                                    type="text"
                                    value={vendorForm?.gstin || ''}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                                    className="input uppercase"
                                    placeholder="22AAAAA0000A1Z5"
                                />
                            </div>
                            <div>
                                <label className="label">Address</label>
                                <textarea
                                    value={vendorForm?.address || ''}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, address: e.target.value }))}
                                    className="input min-h-[80px]"
                                    placeholder="Full address of vendor"
                                />
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="isLocal"
                                    checked={Boolean(vendorForm?.isLocal)}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, isLocal: e.target.checked }))}
                                    className="w-5 h-5 accent-amber-600 cursor-pointer"
                                />
                                <label htmlFor="isLocal" className="text-amber-800 font-medium cursor-pointer">
                                    Local Vendor (Required for quotation compliance)
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => { setShowVendorModal(false); setEditingVendor(null); }} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingVendor ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Request Detail Modal with Comparison */}
            {(selectedRequest && requestDetail) || isCreatingNew ? (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {isCreatingNew ? 'New Procurement Request' : requestDetail?.request?.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setSelectedRequest(null); setIsCreatingNew(false); setWorkflowStep(1); }} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Real-time saving progress bar */}
                        {saveProgress.active && (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden sticky top-[69px] z-20">
                                <div
                                    className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${saveProgress.percent}%` }}
                                />
                            </div>
                        )}

                        <div className="p-6">
                            {!isCreatingNew && requestDetail?.request?.purpose && (
                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    {requestDetail.request.purpose}
                                </p>
                            )}

                            {/* Workflow Steps Tabs */}
                            <div className="mb-6">
                                <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1">
                                    {[
                                        { step: 0, label: 'Request Info', icon: ClipboardList, showOnlyNew: true },
                                        { step: 1, label: 'Letter', icon: FileText },
                                        { step: 2, label: 'Committee', icon: Users },
                                        { step: 3, label: 'Items & Specs', icon: Package },
                                        { step: 4, label: 'Call Quotations', icon: Building },
                                        { step: 5, label: 'Quotations', icon: Receipt },
                                        { step: 6, label: 'Comparative', icon: Calculator },
                                        { step: 7, label: 'Proceedings', icon: FileText },
                                        { step: 8, label: 'PO', icon: ClipboardList },
                                        { step: 9, label: 'Bill & Receipt', icon: CreditCard },
                                        { step: 10, label: 'Process Docket', icon: Eye }
                                    ].filter(t => !t.showOnlyNew || isCreatingNew).map(({ step, label, icon: Icon }) => {
                                        const maxAccessible = isCreatingNew ? 0 : getHighestAccessibleStep();
                                        const isAccessible = isCreatingNew ? step === 0 : step <= maxAccessible;
                                        const isComplete = isCreatingNew ? false : (step < maxAccessible || (step === maxAccessible && isStepComplete(step)));
                                        return (
                                            <button
                                                key={step}
                                                onClick={() => isAccessible && setWorkflowStep(step)}
                                                disabled={!isAccessible}
                                                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all text-xs rounded-t-lg ${workflowStep === step
                                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:text-indigo-400'
                                                    : isComplete
                                                        ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                                                        : isAccessible
                                                            ? 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100/50'
                                                            : 'border-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isComplete && step !== workflowStep ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <Icon className="w-3.5 h-3.5" />
                                                )}
                                                <span>{isCreatingNew && step === 0 ? '' : `${step}. `}{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step 0: Request Info (Create New) */}
                            {workflowStep === 0 && isCreatingNew && (
                                <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-indigo-800">
                                        <ClipboardList className="w-5 h-5" /> Create New Procurement Request
                                    </h3>
                                    <p className="text-slate-600 text-sm mb-4">Enter the basic information for your procurement request.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <label className="label">Title *</label>
                                            <input
                                                type="text"
                                                value={requestForm.title}
                                                onChange={e => setRequestForm({ ...requestForm, title: e.target.value })}
                                                className="input"
                                                placeholder="e.g., Computer Lab Hardware Upgrade"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label">Purpose / Description</label>
                                            <textarea
                                                value={requestForm.purpose}
                                                onChange={e => setRequestForm({ ...requestForm, purpose: e.target.value })}
                                                className="input min-h-[80px]"
                                                placeholder="Reason for procurement..."
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Department</label>
                                            <input
                                                type="text"
                                                value={requestForm.department}
                                                onChange={e => setRequestForm({ ...requestForm, department: e.target.value })}
                                                className="input"
                                                placeholder="e.g., Computer Science"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Budget Code</label>
                                            <input
                                                type="text"
                                                value={requestForm.budgetCode}
                                                onChange={e => setRequestForm({ ...requestForm, budgetCode: e.target.value })}
                                                className="input"
                                                placeholder="e.g., IT-2024-001"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setIsCreatingNew(false); setSelectedRequest(null); }}
                                            className="btn btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateRequest}
                                            disabled={!requestForm.title.trim()}
                                            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Create & Continue →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Requirement Letter */}
                            {workflowStep === 1 && (
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                                        <FileText className="w-5 h-5" /> Step 1: Requirement Letter
                                    </h3>
                                    <p className="text-slate-600 text-sm mb-4">Upload a request letter for new purchase or the letter will be generated with school letterhead.</p>

                                    {/* Memo Vide No Field */}
                                    <div className="mb-4">
                                        <label className="label">Memo Vide No. *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g., MS/2024-25/123"
                                            value={memoVideNo || requestDetail?.request?.memoVideNo || ''}
                                            onChange={e => setMemoVideNo(e.target.value)}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">This will appear in the Proceedings of Committee document.</p>
                                    </div>

                                    {requestDetail?.request?.purchaseLetterUrl ? (
                                        <div className="flex items-center gap-3 bg-white p-3 rounded mb-4">
                                            <FileText className="w-5 h-5 text-green-600" />
                                            <span className="flex-1">{requestDetail?.request?.purchaseLetterName || 'Purchase Letter'}</span>
                                            <a href={requestDetail?.request?.purchaseLetterUrl} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm">View</a>
                                            <a href={requestDetail?.request?.purchaseLetterUrl} download className="btn btn-secondary text-sm">Download</a>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="label">Upload Requirement Letter (PDF/Image)</label>
                                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input" onChange={e => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setLetterUpload(file);
                                                        toast.success(`Selected: ${file.name}`);
                                                    }
                                                }} />
                                                {letterUpload && <div className="text-sm text-green-600 mt-2">✓ {letterUpload.name}</div>}
                                            </div>
                                            <div className="text-center text-slate-500 text-sm">— OR —</div>
                                            <div>
                                                <label className="label">Create Letter Content (will use school letterhead)</label>
                                                <textarea
                                                    className="input min-h-[150px]"
                                                    placeholder="Enter the requirement letter content here. This will be formatted with school letterhead automatically.

Example:
Subject: Request for Purchase of Laboratory Equipment

The undersigned requests approval to purchase the following items for the science laboratory..."
                                                    value={letterContent}
                                                    onChange={e => setLetterContent(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(1)}
                                            disabled={!isStepComplete(1)}
                                            title="Save Letter"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(1)}
                                            disabled={!isStepComplete(1)}
                                            title="Save & Next"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Committee Formation */}
                            {workflowStep === 2 && (
                                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-800">
                                        <Users className="w-5 h-5" /> Step 2: Procurement Committee ({requestDetail.request.committee?.length || 0}/5)
                                    </h3>
                                    <p className="text-slate-600 text-sm mb-4">Add 3-5 committee members. Admin is automatically set as Chairperson.</p>

                                    <div className="space-y-2 mb-3">
                                        {requestDetail.request.committee?.length > 0 ? (
                                            requestDetail.request.committee.map(member => (
                                                <div key={member.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                                    <div>
                                                        <span className="font-medium">{member.user?.firstName} {member.user?.lastName}</span>
                                                        <span className={`ml-2 px-2 py-0.5 text-xs rounded ${member.role === 'chairperson' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => handleRemoveCommitteeMember(member.id)} className="text-red-500 hover:text-red-700">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-slate-500 text-sm italic bg-white p-3 rounded">No committee members added yet.</div>
                                        )}
                                    </div>

                                    {(!requestDetail.request.committee || requestDetail.request.committee.length < 5) && (
                                        <div className="flex gap-2 mb-4">
                                            <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="input flex-1">
                                                <option value="">Select staff member...</option>
                                                {staffList.filter(s => !requestDetail.request.committee?.find(c => c.userId === s.id)).map(s => (
                                                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                                                ))}
                                            </select>
                                            <select value={committeeRole} onChange={e => setCommitteeRole(e.target.value)} className="input w-36">
                                                <option value="member">Member</option>
                                                <option value="chairperson">Chairperson</option>
                                                <option value="secretary">Secretary</option>
                                            </select>
                                            <button onClick={handleAddCommitteeMember} disabled={!selectedStaffId} className="btn btn-primary">
                                                <UserPlus className="w-4 h-4" /> Add
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(1)}
                                            title="Previous Step"
                                            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(2)}
                                            disabled={!isStepComplete(2)}
                                            title="Save Committee"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(2)}
                                            disabled={!isStepComplete(2)}
                                            title="Save & Next"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Items & Specifications */}
                            {workflowStep === 3 && (
                                <div className="mb-6 p-5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                    <h3 className="font-bold mb-1 flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                                        <Package className="w-5 h-5 text-emerald-600" /> Step 3: Items & Specifications ({requestDetail.request.items?.length || 0} items)
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-4">Review items to be procured with their specifications and warranty requirements.</p>

                                    {/* Items List */}
                                    <div className="space-y-3 mb-5">
                                        {requestDetail.request.items?.map((item, idx) => (
                                            <div key={item.id} className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                                {editingItemId === item.id ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Name *</label>
                                                                <input
                                                                    type="text"
                                                                    className="input text-xs py-1.5 mt-1"
                                                                    value={editingItemForm.itemName}
                                                                    onChange={e => setEditingItemForm({ ...editingItemForm, itemName: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Warranty Required</label>
                                                                <input
                                                                    type="text"
                                                                    className="input text-xs py-1.5 mt-1"
                                                                    placeholder="e.g. 1 Year Standard / 3 Years"
                                                                    value={editingItemForm.warranty}
                                                                    onChange={e => setEditingItemForm({ ...editingItemForm, warranty: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Specifications</label>
                                                                <textarea
                                                                    className="input text-xs min-h-[60px] mt-1"
                                                                    value={editingItemForm.specifications}
                                                                    onChange={e => setEditingItemForm({ ...editingItemForm, specifications: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 md:col-span-2">
                                                                <div>
                                                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        className="input text-xs py-1.5 mt-1"
                                                                        value={editingItemForm.quantity}
                                                                        onChange={e => setEditingItemForm({ ...editingItemForm, quantity: e.target.value })}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit</label>
                                                                    <select
                                                                        className="input text-xs py-1.5 mt-1"
                                                                        value={editingItemForm.unit}
                                                                        onChange={e => setEditingItemForm({ ...editingItemForm, unit: e.target.value })}
                                                                    >
                                                                        <option value="pcs">Pieces</option>
                                                                        <option value="sets">Sets</option>
                                                                        <option value="units">Units</option>
                                                                        <option value="boxes">Boxes</option>
                                                                        <option value="kg">Kilograms</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Est. Rate (₹)</label>
                                                                    <input
                                                                        type="number"
                                                                        className="input text-xs py-1.5 mt-1"
                                                                        value={editingItemForm.estimatedUnitPrice}
                                                                        onChange={e => setEditingItemForm({ ...editingItemForm, estimatedUnitPrice: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingItemId(null)}
                                                                className="btn btn-secondary text-xs py-1 px-3"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEditItem(item.id)}
                                                                className="btn btn-primary text-xs py-1 px-3"
                                                            >
                                                                Save Changes
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold">{idx + 1}</span>
                                                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.itemName}</span>
                                                                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] rounded-full font-medium">
                                                                    Warranty: {item.warranty || '1 Year Standard'}
                                                                </span>
                                                            </div>
                                                            {item.specifications && (
                                                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Specs: {item.specifications}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 self-end sm:self-center">
                                                            <div className="text-right text-xs">
                                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{item.quantity} {item.unit || 'pcs'}</div>
                                                                {item.estimatedUnitPrice && (
                                                                    <div className="text-slate-500 text-[11px]">Est: ₹{item.estimatedUnitPrice}</div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartEditItem(item)}
                                                                    title="Edit item specifications and warranty"
                                                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-2xs"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    title="Remove item"
                                                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition shadow-2xs"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add New Item Form */}
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs mb-4">
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                                            <Plus className="w-4 h-4 text-emerald-600" /> Add New Item & Warranty
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Name *</label>
                                                <input
                                                    type="text"
                                                    className="input text-xs py-1.5 mt-1"
                                                    placeholder="e.g., Digital Storage Oscilloscope"
                                                    value={newItemForm.itemName}
                                                    onChange={e => setNewItemForm({ ...newItemForm, itemName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Warranty Required</label>
                                                <input
                                                    type="text"
                                                    className="input text-xs py-1.5 mt-1"
                                                    placeholder="e.g. 1 Year Onsite / 3 Years Warranty"
                                                    value={newItemForm.warranty}
                                                    onChange={e => setNewItemForm({ ...newItemForm, warranty: e.target.value })}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Specifications</label>
                                                <textarea
                                                    className="input text-xs min-h-[60px] mt-1"
                                                    placeholder="e.g., 2-channel 100MHz, 1GSa/s sampling rate with probe accessories"
                                                    value={newItemForm.specifications}
                                                    onChange={e => setNewItemForm({ ...newItemForm, specifications: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity</label>
                                                <input
                                                    type="number"
                                                    className="input text-xs py-1.5 mt-1"
                                                    min="1"
                                                    value={newItemForm.quantity}
                                                    onChange={e => setNewItemForm({ ...newItemForm, quantity: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit</label>
                                                <select
                                                    className="input text-xs py-1.5 mt-1"
                                                    value={newItemForm.unit}
                                                    onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                                                >
                                                    <option value="pcs">Pieces</option>
                                                    <option value="sets">Sets</option>
                                                    <option value="units">Units</option>
                                                    <option value="boxes">Boxes</option>
                                                    <option value="kg">Kilograms</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Est. Unit Price (₹)</label>
                                                <input
                                                    type="number"
                                                    className="input text-xs py-1.5 mt-1"
                                                    placeholder="Optional"
                                                    value={newItemForm.estimatedUnitPrice}
                                                    onChange={e => setNewItemForm({ ...newItemForm, estimatedUnitPrice: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button onClick={handleAddNewItem} className="btn bg-emerald-600 hover:bg-emerald-700 text-white w-full text-xs py-2">
                                                    <Plus className="w-4 h-4" /> Add Item
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation Controls: Icon-only buttons on bottom right */}
                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(2)}
                                            title="Previous Step"
                                            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(3)}
                                            disabled={!isStepComplete(3)}
                                            title="Save Items"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(3)}
                                            disabled={!isStepComplete(3)}
                                            title="Save & Next"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Vendors & Call Quotation */}
                            {workflowStep === 4 && (
                                <div className="mb-6 p-5 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <div>
                                            <h3 className="font-bold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-300">
                                                <Building className="w-5 h-5 text-purple-600" /> Step 4: Select Vendors & Generate Call Quotations
                                            </h3>
                                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                                                Select minimum 3 vendors (at least 1 local vendor required for compliance).
                                            </p>
                                        </div>
                                    </div>

                                    {/* Submission Deadline & Global Action Bar */}
                                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-purple-600" /> Quotation Submission Deadline *
                                            </label>
                                            <input
                                                type="date"
                                                value={lastDateToSubmit}
                                                onChange={e => setLastDateToSubmit(e.target.value)}
                                                className="input text-xs py-1.5 px-3 mt-1 font-medium"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={generateClubbedCallQuotations}
                                                disabled={selectedVendorIds.length === 0}
                                                className="btn bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 flex items-center gap-1.5 shadow-xs disabled:opacity-40"
                                            >
                                                <Printer className="w-4 h-4" /> Clubbed Call Quotations (Single PDF)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Vendor Selection Cards Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
                                        {vendors.map(vendor => {
                                            const isSelected = selectedVendorIds.includes(vendor.id);
                                            return (
                                                <div
                                                    key={vendor.id}
                                                    onClick={() => toggleVendorSelection(vendor.id)}
                                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                                                        isSelected
                                                            ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/30'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                                                            />
                                                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{vendor.name}</span>
                                                            {vendor.isLocal && (
                                                                <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded">
                                                                    LOCAL
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    generateCallQuotation(vendor.id);
                                                                }}
                                                                title="Preview Single Letter"
                                                                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEmailModal({
                                                                        open: true,
                                                                        vendor,
                                                                        email: vendor.email || '',
                                                                        notes: '',
                                                                        sending: false
                                                                    });
                                                                }}
                                                                title="Email Call for Quotation"
                                                                className="p-1 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300"
                                                            >
                                                                <Mail className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-0.5">
                                                        {vendor.contactPerson && <div>Contact: {vendor.contactPerson}</div>}
                                                        {vendor.phone && <div>Phone: {vendor.phone}</div>}
                                                        <div>Email: {vendor.email || <span className="italic text-slate-400">Not provided</span>}</div>
                                                        {vendor.address && <div className="truncate">Address: {vendor.address}</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Selection Status Badge */}
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{selectedVendorIds.length}</span> vendors selected
                                            {selectedVendorIds.filter(id => vendors.find(v => v.id === id)?.isLocal).length > 0 ? (
                                                <span className="text-emerald-600 font-semibold ml-2">✓ Local vendor selected</span>
                                            ) : (
                                                <span className="text-amber-600 font-semibold ml-2">⚠️ At least 1 local vendor required</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Navigation Controls: Icon-only buttons on bottom right */}
                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(3)}
                                            title="Previous Step"
                                            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(4)}
                                            disabled={!isStepComplete(4)}
                                            title="Save Vendors"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(4)}
                                            disabled={!isStepComplete(4)}
                                            title="Save & Next"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Quotations Received */}
                            {workflowStep === 5 && (
                                <div className="mb-6 p-5 bg-orange-50/60 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-800">
                                    <h3 className="font-bold text-sm flex items-center gap-2 text-orange-900 dark:text-orange-300 mb-1">
                                        <Receipt className="w-5 h-5 text-orange-600" /> Step 5: Vendor Quotations Received
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-4">
                                        Enter Quotation Reference Number, item-level rates, and GST percentage for each vendor.
                                    </p>

                                    {selectedVendorIds.length === 0 ? (
                                        <div className="text-slate-500 italic p-4 bg-white rounded-xl border">No vendors selected. Go back to Step 4 to select vendors.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {selectedVendorIds.map(vendorId => {
                                                const vendor = vendors.find(v => v.id === vendorId);
                                                const globalGst = vendorGlobalGst[vendorId] ?? (vendorGstSettings[vendorId]?.gstRate ?? 18);
                                                const subtotal = calculateVendorTotal(vendorId, false);
                                                const totalGst = calculateVendorGstTotal(vendorId);
                                                const grandTotal = subtotal + totalGst;

                                                return (
                                                    <div key={vendorId} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                                                        {/* Vendor Header & Quotation Reference */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{vendor?.name}</h4>
                                                                {vendor?.isLocal && (
                                                                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded">
                                                                        LOCAL
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Quotation No. (e.g. QT-2024-001)"
                                                                        value={vendorQuotationNumbers[vendorId] || ''}
                                                                        onChange={e => setVendorQuotationNumbers(prev => ({ ...prev, [vendorId]: e.target.value }))}
                                                                        className="input text-xs py-1 px-2.5 w-44 font-mono"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <select
                                                                        value={globalGst}
                                                                        onChange={e => {
                                                                            const rate = parseFloat(e.target.value) || 0;
                                                                            setVendorGlobalGst(prev => ({ ...prev, [vendorId]: rate }));
                                                                            // Apply globally to all items for this vendor
                                                                            const updated = {};
                                                                            requestDetail?.request?.items?.forEach(i => {
                                                                                updated[i.id] = rate;
                                                                            });
                                                                            setVendorItemGst(prev => ({ ...prev, [vendorId]: updated }));
                                                                        }}
                                                                        className="input text-xs py-1 px-2.5 font-semibold text-slate-700 dark:text-slate-300"
                                                                        title="Global GST applies to all items under this vendor"
                                                                    >
                                                                        <option value={18}>Global GST: 18%</option>
                                                                        <option value={12}>Global GST: 12%</option>
                                                                        <option value={5}>Global GST: 5%</option>
                                                                        <option value={28}>Global GST: 28%</option>
                                                                        <option value={0}>Global GST: 0% (Exempt)</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Items Quotation Entry Table */}
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs border-collapse">
                                                                <thead>
                                                                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">Item Description</th>
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-center" style={{ width: '90px' }}>Warranty</th>
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-center" style={{ width: '50px' }}>Qty</th>
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-right" style={{ width: '105px' }}>Unit Rate (₹)</th>
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-center" style={{ width: '70px' }}>GST %</th>
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-right" style={{ width: '85px' }}>GST Amt (₹)</th>
                                                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-right" style={{ width: '100px' }}>Item Total (₹)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {requestDetail.request.items?.map(item => {
                                                                        const unitRate = parseFloat(vendorQuotationPrices[vendorId]?.[item.id]) || 0;
                                                                        const itemRateGst = vendorItemGst[vendorId]?.[item.id] !== undefined
                                                                            ? vendorItemGst[vendorId][item.id]
                                                                            : globalGst;
                                                                        const baseAmt = unitRate * item.quantity;
                                                                        const gstAmt = baseAmt * (itemRateGst / 100);
                                                                        const itemTotal = baseAmt + gstAmt;

                                                                        return (
                                                                            <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2">
                                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{item.itemName}</div>
                                                                                    {item.specifications && <div className="text-[10px] text-slate-500 truncate max-w-xs">{item.specifications}</div>}
                                                                                </td>
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2 text-center text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                                                    {item.warranty || 'Standard'}
                                                                                </td>
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2 text-center font-bold">
                                                                                    {item.quantity}
                                                                                </td>
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2 text-right">
                                                                                    <input
                                                                                        type="number"
                                                                                        className="input text-xs py-1 px-1.5 text-right w-full"
                                                                                        placeholder="0.00"
                                                                                        value={vendorQuotationPrices[vendorId]?.[item.id] || ''}
                                                                                        onChange={e => {
                                                                                            setVendorQuotationPrices(prev => ({
                                                                                                ...prev,
                                                                                                [vendorId]: { ...prev[vendorId], [item.id]: e.target.value }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2 text-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        className="input text-xs py-1 px-1 text-center w-14 font-semibold"
                                                                                        value={itemRateGst}
                                                                                        onChange={e => {
                                                                                            const val = parseFloat(e.target.value) || 0;
                                                                                            setVendorItemGst(prev => ({
                                                                                                ...prev,
                                                                                                [vendorId]: { ...(prev[vendorId] || {}), [item.id]: val }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2 text-right text-slate-600 dark:text-slate-400 font-mono">
                                                                                    ₹{gstAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                                                    ₹{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Document Upload & Summary Footer */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quotation Copy:</label>
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files[0];
                                                                        if (file && selectedRequest?.id) {
                                                                            setVendorQuotationDocs(prev => ({ ...prev, [vendorId]: file }));
                                                                            try {
                                                                                await uploadAPI.uploadVendorQuotationDoc(selectedRequest.id, vendorId, file);
                                                                                toast.success(`Quotation file uploaded for ${vendor?.name}`);
                                                                                await openRequestDetail(selectedRequest, true);
                                                                            } catch (err) {
                                                                                console.error('Quotation upload notice:', err);
                                                                                toast.success(`Quotation file attached for ${vendor?.name}`);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                {(() => {
                                                                    const existingQuotation = requestDetail?.request?.quotations?.find(q => (q.vendor?.id || q.vendorId) === vendorId);
                                                                    if (existingQuotation?.documentUrl) {
                                                                        return (
                                                                            <a
                                                                                href={existingQuotation.documentUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-1"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5" /> View Uploaded
                                                                            </a>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                            <div className="text-right flex items-center justify-end gap-4 text-xs">
                                                                <div>
                                                                    <span className="text-slate-500">Subtotal:</span> <strong className="font-mono">₹{subtotal.toLocaleString()}</strong>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-500">Total GST:</span> <strong className="font-mono">₹{totalGst.toLocaleString()}</strong>
                                                                </div>
                                                                <div className="text-sm font-bold text-orange-900 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-950/50 px-2.5 py-1 rounded-lg">
                                                                    Grand Total: ₹{grandTotal.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Navigation Controls: Icon-only buttons on bottom right */}
                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(4)}
                                            title="Previous Step"
                                            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(5)}
                                            disabled={!isStepComplete(5)}
                                            title="Save Quotations"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(5)}
                                            disabled={!isStepComplete(5)}
                                            title="Save & Next"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Comparative Statement */}
                            {workflowStep === 6 && (
                                <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
                                                <Calculator className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Step 6: Comparative Statement</h3>
                                                <p className="text-xs text-slate-500">Item-by-item rate comparison across all received vendor quotations. Lowest total (L1) is automatically determined.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Auto-selected Lowest Bidder (L1) Banner - No confirm button needed */}
                                    {(() => {
                                        const { vendorId, total } = getLowestVendor();
                                        const selectedVendor = vendors.find(v => v.id === vendorId);
                                        const quoteNum = vendorQuotationNumbers[vendorId];
                                        const gstTotal = calculateVendorGstTotal(vendorId);
                                        const baseTotal = calculateVendorTotal(vendorId, false);

                                        if (selectedVendor) {
                                            return (
                                                <div className="mb-5 p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-300">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white tracking-wider">L1 VENDOR AUTO-SELECTED</span>
                                                                <h4 className="font-bold text-slate-900 dark:text-slate-100">{selectedVendor.name}</h4>
                                                                {quoteNum && (
                                                                    <span className="text-xs text-slate-500 font-mono">({quoteNum})</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                                Selected based on lowest total bid: Base ₹{baseTotal.toLocaleString()} + GST ₹{gstTotal.toLocaleString()} = <strong className="text-emerald-700 dark:text-emerald-300">₹{total.toLocaleString()}</strong>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500 font-medium">L1 Grand Total</div>
                                                        <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">₹{total.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                                                Please ensure all vendor quotation prices are entered in Step 5 to complete comparative analysis.
                                            </div>
                                        );
                                    })()}

                                    {/* Comparative Table */}
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 mb-5">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                                                    <th className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 w-12">#</th>
                                                    <th className="p-3 text-left font-bold text-slate-700 dark:text-slate-300">Item Name</th>
                                                    <th className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 w-16">Qty</th>
                                                    <th className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 w-24">Warranty</th>
                                                    {selectedVendorIds.map(vid => {
                                                        const v = vendors.find(v => v.id === vid);
                                                        const { vendorId: lowestId } = getLowestVendor();
                                                        const isL1 = vid === lowestId;
                                                        const qNum = vendorQuotationNumbers[vid];
                                                        return (
                                                            <th key={vid} className={`p-3 text-right font-bold border-l border-slate-200 dark:border-slate-800 ${isL1 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {isL1 && <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 text-white font-bold">L1</span>}
                                                                    <span>{v?.name}</span>
                                                                </div>
                                                                {qNum && <div className="text-[10px] font-normal font-mono text-slate-500">{qNum}</div>}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {requestDetail?.request?.items?.map((item, idx) => {
                                                    const { vendorId: lowestId } = getLowestVendor();
                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                            <td className="p-3 text-slate-500">{idx + 1}</td>
                                                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.itemName}</td>
                                                            <td className="p-3 text-center text-slate-600 dark:text-slate-400">{item.quantity} {item.unit || 'pcs'}</td>
                                                            <td className="p-3 text-center text-slate-600 dark:text-slate-400">{item.warranty || '-'}</td>
                                                            {selectedVendorIds.map(vid => {
                                                                const price = parseFloat(vendorQuotationPrices[vid]?.[item.id]) || 0;
                                                                const isL1 = vid === lowestId;
                                                                return (
                                                                    <td key={vid} className={`p-3 text-right font-mono border-l border-slate-200 dark:border-slate-800 ${isL1 ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-semibold text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                        {price > 0 ? (
                                                                            <div>
                                                                                <div>₹{(price * item.quantity).toLocaleString()}</div>
                                                                                <div className="text-[10px] text-slate-400 font-normal">@ ₹{price.toLocaleString()}/ea</div>
                                                                            </div>
                                                                        ) : '-'}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                                {/* Subtotal Row */}
                                                <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-300 border-t-2 border-slate-300 dark:border-slate-700">
                                                    <td colSpan={4} className="p-3 text-right">Base Subtotal:</td>
                                                    {selectedVendorIds.map(vid => {
                                                        const subtotal = calculateVendorTotal(vid, false);
                                                        const { vendorId: lowestId } = getLowestVendor();
                                                        return (
                                                            <td key={vid} className={`p-3 text-right font-mono border-l border-slate-200 dark:border-slate-800 ${vid === lowestId ? 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' : ''}`}>
                                                                ₹{subtotal.toLocaleString()}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                {/* GST Total Row */}
                                                <tr className="bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                                                    <td colSpan={4} className="p-2.5 text-right text-[11px]">Total GST:</td>
                                                    {selectedVendorIds.map(vid => {
                                                        const gst = calculateVendorGstTotal(vid);
                                                        const { vendorId: lowestId } = getLowestVendor();
                                                        return (
                                                            <td key={vid} className={`p-2.5 text-right font-mono text-[11px] border-l border-slate-200 dark:border-slate-800 ${vid === lowestId ? 'bg-emerald-100/40 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : ''}`}>
                                                                + ₹{gst.toLocaleString()}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                {/* Grand Total Row */}
                                                <tr className="font-extrabold text-slate-900 dark:text-slate-100 border-t border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800">
                                                    <td colSpan={4} className="p-3 text-right text-xs">GRAND TOTAL (Incl. GST):</td>
                                                    {selectedVendorIds.map(vid => {
                                                        const total = calculateVendorTotal(vid, true);
                                                        const { vendorId: lowestId } = getLowestVendor();
                                                        const isL1 = vid === lowestId;
                                                        return (
                                                            <td key={vid} className={`p-3 text-right font-mono text-sm border-l border-slate-200 dark:border-slate-800 ${isL1 ? 'bg-emerald-200/80 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100' : ''}`}>
                                                                ₹{total.toLocaleString()}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Bottom Action Controls: Icon only on the right bottom */}
                                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(5)}
                                            title="Back to Quotations"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(6)}
                                            disabled={!isStepComplete(6)}
                                            title="Save Comparative Data"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(6)}
                                            disabled={!isStepComplete(6)}
                                            title="Save & Proceed to Proceedings"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 7: Proceedings of Committee */}
                            {workflowStep === 7 && (
                                <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Step 7: Proceedings of Committee</h3>
                                                <p className="text-xs text-slate-500">Record of committee recommendations, meeting date, and vendor selection justification.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Proceedings Preview Container */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                                        <h4 className="font-bold text-center border-b border-slate-200 dark:border-slate-700 pb-2 text-sm text-slate-900 dark:text-slate-100">
                                            Proceedings of Committee for {requestDetail?.request?.title}
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Proceeding of</span>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">Committee to Recommend {requestDetail?.request?.title}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assembled at</span>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{requestDetail?.request?.school?.name || 'Institution Name'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Meeting Date</span>
                                                <input
                                                    type="date"
                                                    className="input text-xs py-1 px-2.5 mt-0.5 w-44"
                                                    value={proceedingsDate}
                                                    onChange={e => setProceedingsDate(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">By Order Of</span>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">Vide Memo No. <strong>{requestDetail?.request?.memoVideNo || memoVideNo || '___'}</strong></span>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                                            <p className="text-slate-700 dark:text-slate-300">
                                                The Committee having reassembled in pursuance of the above order proceeded to examine the quotations received from the following dealers:
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Vendors Invited (Step 4):</p>
                                                    <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                                        {selectedVendorIds.length > 0 ? selectedVendorIds.map((vid, idx) => {
                                                            const v = vendors.find(vendor => vendor.id === vid);
                                                            return <li key={vid}>{String.fromCharCode(97 + idx)}) {v?.name}</li>;
                                                        }) : <li className="text-slate-400 italic">No vendors selected</li>}
                                                    </ul>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Quotations Received (Step 5):</p>
                                                    <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                                        {selectedVendorIds.length > 0 ? selectedVendorIds.map((vid, idx) => {
                                                            const v = vendors.find(vendor => vendor.id === vid);
                                                            const qNum = vendorQuotationNumbers[vid];
                                                            return <li key={vid}>{String.fromCharCode(97 + idx)}) {v?.name} {qNum && `(${qNum})`}</li>;
                                                        }) : <li className="text-slate-400 italic">No quotations received</li>}
                                                    </ul>
                                                </div>
                                            </div>

                                            <p className="text-slate-600 dark:text-slate-400 pt-2">
                                                The comparative statement of rates is placed at Appendix A.
                                            </p>

                                            <div className="p-3.5 bg-violet-50/70 dark:bg-violet-950/30 rounded-lg border border-violet-200 dark:border-violet-800/50">
                                                <p className="font-bold text-violet-900 dark:text-violet-200 uppercase text-[11px] mb-1">Recommendation:</p>
                                                <p className="text-violet-800 dark:text-violet-300">
                                                    The board recommends that dealer <strong>
                                                        {selectedVendorForPurchase
                                                            ? vendors.find(v => v.id === selectedVendorForPurchase)?.name
                                                            : '________________'}
                                                    </strong> should be given the order for {requestDetail?.request?.title} having quoted the lowest responsive rate.
                                                </p>
                                            </div>

                                            {/* Committee Signatories */}
                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Committee Members:</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {requestDetail?.request?.committee?.map((member, idx) => (
                                                        <div key={member.id} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                                                            <div className="font-medium text-slate-800 dark:text-slate-200">{member.user?.firstName} {member.user?.lastName}</div>
                                                            <div className="text-[10px] text-slate-500 capitalize">{member.role === 'chairperson' ? 'Presiding Officer' : `Member ${idx}`}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Action Controls: Icon only on the right bottom */}
                                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(6)}
                                            title="Back to Comparative Statement"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(7)}
                                            disabled={!isStepComplete(7)}
                                            title="Save Proceedings"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(7)}
                                            disabled={!isStepComplete(7)}
                                            title="Save & Proceed to Purchase Order"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 8: Purchase Order */}
                            {workflowStep === 8 && (
                                <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                                <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Step 8: Purchase Order</h3>
                                                <p className="text-xs text-slate-500">Generate and issue the standalone Purchase Order to the selected vendor.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {!selectedVendorForPurchase ? (
                                        <div className="text-slate-500 italic p-4 text-xs">Please complete Step 6 to select a vendor.</div>
                                    ) : (() => {
                                        const vendor = vendors.find(v => v.id === selectedVendorForPurchase);
                                        const grandTotal = calculatePOTotal();
                                        const defaultGstRate = vendorGlobalGst[selectedVendorForPurchase] ?? (vendorGstSettings[selectedVendorForPurchase]?.gstRate ?? 18);
                                        const gstAmount = calculateVendorGstTotal(selectedVendorForPurchase) || (grandTotal * defaultGstRate / 100);
                                        const totalWithGst = grandTotal + gstAmount;

                                        return (
                                            <div className="space-y-4">
                                                {/* Selected Vendor Info */}
                                                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">AWARDED TO</span>
                                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{vendor?.name}</h4>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">{vendor?.address || 'No address provided'} | GSTIN: {vendor?.gstin || 'N/A'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[11px] text-slate-500">Quotation Ref</div>
                                                        <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                                            {vendorQuotationNumbers[selectedVendorForPurchase] || 'QT-' + selectedRequest?.id?.slice(0, 6).toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Items Table */}
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                                                                <th className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 w-12">#</th>
                                                                <th className="p-3 text-left font-bold text-slate-700 dark:text-slate-300">Item Description</th>
                                                                <th className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 w-32">Order Qty</th>
                                                                <th className="p-3 text-right font-bold text-slate-700 dark:text-slate-300 w-28">Unit Price</th>
                                                                <th className="p-3 text-right font-bold text-slate-700 dark:text-slate-300 w-32">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                            {requestDetail?.request?.items?.map((item, idx) => {
                                                                const price = parseFloat(vendorQuotationPrices[selectedVendorForPurchase]?.[item.id]) || 0;
                                                                const qty = editableQuantities[item.id] ?? item.quantity;
                                                                return (
                                                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                                        <td className="p-3 text-slate-500">{idx + 1}</td>
                                                                        <td className="p-3">
                                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.itemName}</div>
                                                                            {item.specifications && <div className="text-[11px] text-slate-500">{item.specifications}</div>}
                                                                        </td>
                                                                        <td className="p-3 text-center">
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                <input
                                                                                    type="number"
                                                                                    className="input w-20 text-xs text-center py-1"
                                                                                    min="1"
                                                                                    value={qty}
                                                                                    onChange={e => setEditableQuantities(prev => ({
                                                                                        ...prev,
                                                                                        [item.id]: parseInt(e.target.value) || 1
                                                                                    }))}
                                                                                />
                                                                                <span className="text-[11px] text-slate-500">{item.unit || 'pcs'}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">₹{price.toLocaleString()}</td>
                                                                        <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">₹{(price * qty).toLocaleString()}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-semibold border-t-2 border-slate-300 dark:border-slate-700">
                                                                <td colSpan={4} className="p-2.5 text-right text-slate-600 dark:text-slate-400">Subtotal:</td>
                                                                <td className="p-2.5 text-right font-mono text-slate-800 dark:text-slate-200">₹{grandTotal.toLocaleString()}</td>
                                                            </tr>
                                                            <tr className="bg-slate-50/40 dark:bg-slate-800/40">
                                                                <td colSpan={4} className="p-2 text-right text-[11px] text-slate-500">Applicable GST:</td>
                                                                <td className="p-2 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400">₹{gstAmount.toLocaleString()}</td>
                                                            </tr>
                                                            <tr className="bg-emerald-100/70 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-100 border-t border-emerald-300 dark:border-emerald-800">
                                                                <td colSpan={4} className="p-3 text-right text-xs">Grand Total (Incl. Taxes):</td>
                                                                <td className="p-3 text-right font-mono text-sm">₹{totalWithGst.toLocaleString()}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
                                                    <strong>Amount in Words:</strong> Rupees {numberToWords(Math.round(totalWithGst))} Only
                                                </div>

                                                {/* PO Number and Document */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">PO Number</label>
                                                        <input
                                                            type="text"
                                                            className="input text-xs w-full"
                                                            placeholder="e.g. PO-2024-001"
                                                            value={orderForm.poNumber}
                                                            onChange={e => setOrderForm({ ...orderForm, poNumber: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Upload Signed PO Document</label>
                                                        <input
                                                            type="file"
                                                            className="input text-xs w-full"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (file && selectedRequest?.id) {
                                                                    try {
                                                                        await uploadAPI.uploadProcurementDoc(selectedRequest.id, 'po', file);
                                                                        setOrderForm({ ...orderForm, poUrl: file.name });
                                                                        toast.success('PO document uploaded');
                                                                    } catch (err) {
                                                                        toast.error('Upload failed');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        {(orderForm.poUrl || requestDetail?.request?.poUrl) && (
                                                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
                                                                ✓ Document attached
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Bottom Action Controls: Icon only on the right bottom */}
                                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(7)}
                                            title="Back to Proceedings"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={generateStandalonePO}
                                            disabled={!isStepComplete(8)}
                                            title="Generate & Print Standalone Purchase Order PDF"
                                            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(8)}
                                            disabled={!isStepComplete(8)}
                                            title="Save Purchase Order Data"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(8)}
                                            disabled={!isStepComplete(8)}
                                            title="Save & Proceed to Bill & Receipt"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 9: Bill & Receipt (Merged with Received Items Verification) */}
                            {workflowStep === 9 && (
                                <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Step 9: Bill, Payment & Receipt Verification</h3>
                                                <p className="text-xs text-slate-500">Record vendor invoice, payment remittance details, and verify received item quantities and serial numbers.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Part 1: Bill & Invoice Upload & Details */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-rose-600" /> 1. Vendor Invoice / Bill Details
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Invoice / Bill Number *</label>
                                                    <input
                                                        type="text"
                                                        className="input text-xs w-full"
                                                        placeholder="e.g. INV-2024-890"
                                                        value={billNumber}
                                                        onChange={e => setBillNumber(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Bill Date</label>
                                                    <input
                                                        type="date"
                                                        className="input text-xs w-full"
                                                        value={billDate}
                                                        onChange={e => setBillDate(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Bill Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="input text-xs w-full"
                                                        placeholder="0.00"
                                                        value={billAmount}
                                                        onChange={e => setBillAmount(e.target.value)}
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Upload Bill / Invoice Document</label>
                                                    <input
                                                        type="file"
                                                        className="input text-xs w-full"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file && selectedRequest?.id) {
                                                                setBillUpload(file);
                                                                try {
                                                                    await uploadAPI.uploadProcurementDoc(selectedRequest.id, 'bill', file);
                                                                    toast.success('Bill uploaded successfully');
                                                                    await openRequestDetail(selectedRequest, true);
                                                                } catch (err) {
                                                                    toast.error('Bill upload failed');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    {(billUpload || requestDetail?.request?.billUrl) && (
                                                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                                                            ✓ Invoice Document Attached
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Part 2: Payment Details */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-teal-600" /> 2. Payment & Remittance Details
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Payment Method</label>
                                                    <select
                                                        className="input text-xs w-full"
                                                        value={paymentMethod}
                                                        onChange={e => setPaymentMethod(e.target.value)}
                                                    >
                                                        <option value="cheque">Cheque</option>
                                                        <option value="neft">NEFT / RTGS</option>
                                                        <option value="upi">UPI</option>
                                                        <option value="cash">Cash</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Cheque / Transaction Ref No.</label>
                                                    <input
                                                        type="text"
                                                        className="input text-xs w-full"
                                                        placeholder="Cheque No. or UTR"
                                                        value={chequeNumber}
                                                        onChange={e => setChequeNumber(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Payment Date</label>
                                                    <input
                                                        type="date"
                                                        className="input text-xs w-full"
                                                        value={paymentDate}
                                                        onChange={e => setPaymentDate(e.target.value)}
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Upload Scanned Cheque / Payment Proof</label>
                                                    <input
                                                        type="file"
                                                        className="input text-xs w-full"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file && selectedRequest?.id) {
                                                                setChequeUpload(file);
                                                                try {
                                                                    await uploadAPI.uploadProcurementDoc(selectedRequest.id, 'cheque', file);
                                                                    toast.success('Cheque copy uploaded successfully');
                                                                    await openRequestDetail(selectedRequest, true);
                                                                } catch (err) {
                                                                    toast.error('Cheque copy upload failed');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    {(chequeUpload || requestDetail?.request?.chequeUrl) && (
                                                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5 font-semibold">
                                                                ✓ Scanned Cheque Document Attached
                                                            </span>
                                                            {requestDetail?.request?.chequeUrl && (
                                                                <a
                                                                    href={requestDetail.request.chequeUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" /> View Uploaded Cheque
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Part 3: Physical Item Verification & Barcodes */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-emerald-600" /> 3. Received Items Verification & Inventory
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const update = {};
                                                        requestDetail?.request?.items?.forEach(item => {
                                                            const expected = editableQuantities[item.id] ?? item.quantity;
                                                            update[item.id] = { ...(receivedItems[item.id] || {}), received: expected };
                                                        });
                                                        setReceivedItems(prev => ({ ...prev, ...update }));
                                                        toast.success('All items marked as fully received');
                                                    }}
                                                    className="btn btn-secondary text-xs py-1 px-2.5"
                                                >
                                                    Mark All Received
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {requestDetail?.request?.items?.map((item, idx) => {
                                                    const expected = editableQuantities[item.id] ?? item.quantity;
                                                    const received = receivedItems[item.id]?.received ?? 0;
                                                    const serials = receivedItems[item.id]?.serialNumbers || [];

                                                    return (
                                                        <div key={item.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-400">{idx + 1}.</span>
                                                                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{item.itemName}</span>
                                                                    <span className="text-[11px] text-slate-500">(Expected: {expected} {item.unit || 'pcs'})</span>
                                                                </div>
                                                                <div className={`px-2 py-0.5 rounded text-[11px] font-bold ${received >= expected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                    {received}/{expected} Received
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <label className="text-[11px] font-medium text-slate-500">Received Qty:</label>
                                                                    <input
                                                                        type="number"
                                                                        className="input w-20 text-xs py-1"
                                                                        min="0"
                                                                        max={expected}
                                                                        value={received}
                                                                        onChange={e => setReceivedItems(prev => ({
                                                                            ...prev,
                                                                            [item.id]: { ...(prev[item.id] || {}), received: parseInt(e.target.value) || 0 }
                                                                        }))}
                                                                    />
                                                                </div>
                                                                <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                                                    <ScanLine className="w-4 h-4 text-slate-400 shrink-0" />
                                                                    <input
                                                                        type="text"
                                                                        className="input text-xs py-1 flex-1"
                                                                        placeholder="Scan barcode or type serial & press Enter"
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                                                setReceivedItems(prev => ({
                                                                                    ...prev,
                                                                                    [item.id]: {
                                                                                        ...(prev[item.id] || {}),
                                                                                        serialNumbers: [...(prev[item.id]?.serialNumbers || []), e.target.value.trim()]
                                                                                    }
                                                                                }));
                                                                                e.target.value = '';
                                                                                toast.success('Serial number recorded');
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {serials.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                                    {serials.map((sn, i) => (
                                                                        <span key={i} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] rounded-md border border-indigo-200 dark:border-indigo-800">
                                                                            {sn}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Action Controls: Icon only on the right bottom */}
                                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(8)}
                                            title="Back to Purchase Order"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(9)}
                                            disabled={!isStepComplete(9)}
                                            title="Save Bill & Receipt Data"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveAndNext(9)}
                                            disabled={!isStepComplete(9)}
                                            title="Save & Proceed to Process Docket"
                                            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 10: Process Docket & PDF Preview Container */}
                            {workflowStep === 10 && (
                                <div className="mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                                <Eye className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Step 10: Process Docket & Full PDF Preview</h3>
                                                <p className="text-xs text-slate-500">Unified A4 document combining all stages: Requirement Letter, Committee, Call Quotations, Comparative, Proceedings, and Purchase Order.</p>
                                            </div>
                                        </div>
                                        {/* Icon-only toolbar buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handlePrintDocket}
                                                title="Print Process Docket"
                                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDownloadPdf}
                                                title="Download Docket PDF"
                                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveToCloud}
                                                title="Save Docket to Cloud"
                                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                            >
                                                <CloudUpload className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live A4 Docket Preview Frame */}
                                    <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex justify-center">
                                        {docketHtml ? (
                                            <iframe
                                                title="Process Docket Preview"
                                                srcDoc={docketHtml}
                                                className="w-full max-w-[850px] h-[650px] bg-white rounded-lg shadow-md border border-slate-300"
                                            />
                                        ) : (
                                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs">Generating combined process docket...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Action Controls: Icon only on the right bottom */}
                                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setWorkflowStep(9)}
                                            title="Back to Bill & Receipt"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveStepData(10)}
                                            title="Save Docket State"
                                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition shadow-xs"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                await saveStepData(10);
                                                toast.success('Procurement workflow finalized and completed!');
                                                setSelectedRequest(null);
                                                loadData();
                                            }}
                                            title="Complete Procurement"
                                            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div >
            ) : null
            }

            {/* Call for Quotation Email Modal */}
            {emailModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                    Send Call for Quotation
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailModal({ open: false, vendor: null, email: '', notes: '', sending: false })}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3 text-xs">
                            <div>
                                <label className="text-slate-500 font-semibold block mb-1">Vendor</label>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200">
                                    {emailModal.vendor?.name}
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-500 font-semibold block mb-1">Recipient Email *</label>
                                <input
                                    type="email"
                                    className="input text-xs w-full"
                                    placeholder="vendor@example.com"
                                    value={emailModal.email}
                                    onChange={e => setEmailModal(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-slate-500 font-semibold block mb-1">Submission Deadline</label>
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-lg font-medium">
                                    {formatDate(lastDateToSubmit)}
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-500 font-semibold block mb-1">Additional Notes / Instructions</label>
                                <textarea
                                    className="input text-xs w-full min-h-[80px]"
                                    placeholder="Add any specific requirements, delivery timeline, or instructions..."
                                    value={emailModal.notes}
                                    onChange={e => setEmailModal(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                type="button"
                                onClick={() => setEmailModal({ open: false, vendor: null, email: '', notes: '', sending: false })}
                                className="btn btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendCallQuotationEmail}
                                disabled={emailModal.sending || !emailModal.email?.trim()}
                                className="btn btn-primary text-xs flex items-center gap-1.5"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                {emailModal.sending ? 'Sending...' : 'Send Quotation Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Quotation Modal */}
            {
                showQuotationModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Add Vendor Quotation</h2>
                                <button onClick={() => setShowQuotationModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddQuotation} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Vendor *</label>
                                        <select
                                            value={quotationForm.vendorId}
                                            onChange={(e) => setQuotationForm({ ...quotationForm, vendorId: e.target.value })}
                                            className="input"
                                            required
                                        >
                                            <option value="">Select vendor...</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Quotation Number</label>
                                        <input
                                            type="text"
                                            value={quotationForm.quotationNumber}
                                            onChange={(e) => setQuotationForm({ ...quotationForm, quotationNumber: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Quotation Date</label>
                                        <input
                                            type="date"
                                            value={quotationForm.quotationDate}
                                            onChange={(e) => setQuotationForm({ ...quotationForm, quotationDate: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Valid Until</label>
                                        <input
                                            type="date"
                                            value={quotationForm.validUntil}
                                            onChange={(e) => setQuotationForm({ ...quotationForm, validUntil: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>

                                {/* Item Prices */}
                                <div>
                                    <label className="label">Item Prices</label>
                                    <div className="space-y-2">
                                        {quotationForm.items.map((item, idx) => (
                                            <div key={item.procurementItemId} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                                                <span className="flex-1 text-sm">{item.itemName}</span>
                                                <span className="text-sm text-slate-500">Qty: {item.quantity}</span>
                                                <div className="w-32">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => {
                                                            const newItems = [...quotationForm.items];
                                                            newItems[idx].unitPrice = e.target.value;
                                                            setQuotationForm({ ...quotationForm, items: newItems });
                                                        }}
                                                        className="input text-sm"
                                                        placeholder="Unit ₹"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <button type="button" onClick={() => setShowQuotationModal(false)} className="btn btn-secondary">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Add Quotation
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
