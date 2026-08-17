'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Search, Eye, Edit2, Trash2, X, Share2, Download, File, QrCode, ExternalLink, Clock, User, Copy, Check, Grid3X3, List, Calendar, Users, UsersRound, Inbox, GraduationCap, ChevronUp, ChevronDown, RotateCcw, Trash, HardDrive, Folder, FolderPlus, ChevronRight, FolderInput, CornerUpLeft, Clipboard, ClipboardCopy, Scissors, Wand2, Plus, BarChart2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { documentsAPI, classesAPI, storageAPI, foldersAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ConfirmDialog, { useConfirm } from '@/components/ConfirmDialog';
import { formatDateTime } from '@/lib/dateUtils';
import FileViewer from '@/components/FileViewer';
import HtmlPreview from '@/components/HtmlPreview';
import QRCode from 'qrcode';

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'manual', label: 'Manuals' },
    { value: 'agreement', label: 'Agreements' },
    { value: 'report', label: 'Reports' },
    { value: 'policy', label: 'Policies' },
    { value: 'other', label: 'Other' }
];

const FILE_ICONS = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    csv: '📊',
    txt: '📝',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
    file: '📁'
};

export default function DocumentsPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [documents, setDocuments] = useState([]);
    const [sharedDocuments, setSharedDocuments] = useState([]);
    const [trashDocuments, setTrashDocuments] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null); // null = root
    const [folderBreadcrumbs, setFolderBreadcrumbs] = useState([]);
    const [storageInfo, setStorageInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list' - default to list
    const [activeTab, setActiveTab] = useState('my'); // 'my', 'shared', or 'trash'
    const [sortField, setSortField] = useState('createdAt'); // 'name', 'fileType', 'fileSize', 'createdAt'
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

    // Upload modal state
    const [showUpload, setShowUpload] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadFiles, setUploadFiles] = useState([]); // For folder upload (multiple files)
    const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'folder'
    const [uploadData, setUploadData] = useState({ name: '', description: '', category: '', isPublic: false });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStartTime, setUploadStartTime] = useState(null);
    const [uploadCurrentFile, setUploadCurrentFile] = useState('');

    // Create Folder modal
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Move Document modal
    const [moveDialog, setMoveDialog] = useState({ open: false, doc: null, folder: null });
    const [moveCurrentFolder, setMoveCurrentFolder] = useState(null); // navigation inside modal
    const [moveFolders, setMoveFolders] = useState([]); // list of folders in modal

    // View/Preview modal
    const [viewingDoc, setViewingDoc] = useState(null);

    // Edit modal
    const [editingDoc, setEditingDoc] = useState(null);
    const [editData, setEditData] = useState({ name: '', description: '', category: '', isPublic: false });
    const [editFile, setEditFile] = useState(null); // New file for replacing document

    // Share info popup for list view
    const [shareInfoModal, setShareInfoModal] = useState(null); // { doc, anchorEl }

    // Share modal - advanced
    const [sharingDoc, setSharingDoc] = useState(null);
    const [sharingFolder, setSharingFolder] = useState(null); // For folder sharing
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [shareMode, setShareMode] = useState('link'); // 'link' or 'target'
    const [shareTargetType, setShareTargetType] = useState(''); // 'class', 'group', 'instructor', 'student'
    const [shareTargets, setShareTargets] = useState([]);
    const [shareMessage, setShareMessage] = useState('');
    const [shareExpiresAt, setShareExpiresAt] = useState('');
    const [sharePermission, setSharePermission] = useState('download');
    const [shareSearch, setShareSearch] = useState('');
    const [availableClasses, setAvailableClasses] = useState([]);
    const [availableGroups, setAvailableGroups] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [sharingLoading, setSharingLoading] = useState(false);

    // Delete dialog
    const [deleteDialog, setDeleteDialog] = useState({ open: false, doc: null });

    // Bulk Actions & Clipboard
    const [selectedDocs, setSelectedDocs] = useState(new Set());
    const [selectedFolders, setSelectedFolders] = useState(new Set());
    const [clipboard, setClipboard] = useState(null); // { mode: 'copy' | 'cut', documents: [], folders: [] }

    // Folder Preview Modal
    const [folderPreview, setFolderPreview] = useState(null); // { folder, documents: [], subfolders: [] }

    // AI Extraction Modal
    const [aiExtracting, setAiExtracting] = useState(false);
    const [aiExtractDoc, setAiExtractDoc] = useState(null);
    const [aiExtractData, setAiExtractData] = useState(null);
    const [aiEngine, setAiEngine] = useState('gemini');

    // Analytics
    const [analyticsDoc, setAnalyticsDoc] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        loadDocuments();
        loadSharedDocuments();
        loadTrash();
        loadShareOptions();
        loadStorage();
    }, [_hasHydrated, isAuthenticated]);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (categoryFilter) params.category = categoryFilter;
            if (activeTab === 'my') {
                params.folderId = currentFolder ? currentFolder.id : 'root';
            }

            const res = await documentsAPI.getAll(params);
            setDocuments(res.data.data.documents || []);
        } catch (err) {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (_hasHydrated && isAuthenticated) {
            if (activeTab === 'my') {
                loadDocuments();
                loadFolders();
            } else {
                loadSharedDocuments();
            }
        }
    }, [searchQuery, categoryFilter, dateFrom, dateTo, activeTab, currentFolder]);

    const loadFolders = async () => {
        try {
            const params = {};
            if (searchQuery) {
                params.search = searchQuery;
            } else {
                params.parentId = currentFolder ? currentFolder.id : null;
            }
            const res = await foldersAPI.getAll(params);
            setFolders(res.data.data.folders || []);
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await foldersAPI.create({
                name: newFolderName,
                parentId: currentFolder ? currentFolder.id : null
            });
            toast.success('Folder created successfully');
            setNewFolderName('');
            setShowCreateFolder(false);
            loadFolders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create folder');
        }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolder(folder);
        if (folder) {
            loadFolderDetails(folder.id);
        } else {
            setFolderBreadcrumbs([]);
        }
        setSearchQuery('');
        setSelectedDocs(new Set());
        setSelectedFolders(new Set());
    };

    const loadFolderDetails = async (folderId) => {
        try {
            const res = await foldersAPI.getById(folderId);
            setFolderBreadcrumbs(res.data.data.breadcrumbs || []);
        } catch (err) {
            console.error('Failed to load folder details:', err);
        }
    };

    const handleNavigateBreadcrumb = (folder) => {
        setCurrentFolder(folder);
        if (!folder) {
            setFolderBreadcrumbs([]);
        } else {
            const index = folderBreadcrumbs.findIndex(b => b.id === folder.id);
            if (index !== -1) {
                setFolderBreadcrumbs(folderBreadcrumbs.slice(0, index + 1));
            }
        }
    };

    const loadSharedDocuments = async () => {
        try {
            const res = await documentsAPI.getShared();
            setSharedDocuments(res.data.data.documents || []);
        } catch (err) {
            console.error('Failed to load shared documents:', err);
        }
    };

    const loadTrash = async () => {
        try {
            const res = await documentsAPI.getTrash();
            setTrashDocuments(res.data.data.documents || []);
        } catch (err) {
            console.error('Failed to load trash:', err);
        }
    };

    const handleRestore = async (doc) => {
        try {
            await documentsAPI.restore(doc.id);
            toast.success('Document restored successfully');
            loadTrash();
            loadDocuments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to restore document');
        }
    };

    const handlePermanentDelete = async (doc) => {
        const ok = await confirm({
            title: `Permanently Delete "${doc.name}"?`,
            message: 'This document will be permanently destroyed. This action cannot be undone.',
            confirmText: 'Delete Permanently',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await documentsAPI.permanentDelete(doc.id);
            toast.success('Document permanently deleted');
            loadTrash();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete document');
        }
    };

    const loadStorage = async () => {
        try {
            const res = await storageAPI.getUsage();
            setStorageInfo(res.data.data);
        } catch (err) {
            console.error('Failed to load storage info:', err);
        }
    };

    const loadShareOptions = async () => {
        try {
            const classRes = await api.get('/classes', { params: { all: true } });
            const classes = classRes.data.data.classes || [];
            setAvailableClasses(classes);

            const allGroups = [];
            const seenGroupIds = new Set();
            for (const cls of classes) {
                try {
                    const groupRes = await api.get(`/classes/${cls.id}/groups`);
                    const groups = groupRes.data.data.groups || [];
                    groups.forEach(g => {
                        if (!seenGroupIds.has(g.id)) {
                            seenGroupIds.add(g.id);
                            allGroups.push({ ...g, className: cls.name || `Grade ${cls.gradeLevel}-${cls.section}` });
                        }
                    });
                } catch (e) { }
            }
            setAvailableGroups(allGroups);

            const userRes = await api.get('/users', { params: { role: 'instructor', limit: 500 } });
            const adminRes = await api.get('/users', { params: { role: 'admin', limit: 100 } });
            const principalRes = await api.get('/users', { params: { role: 'principal', limit: 20 } });
            const allInstructors = [
                ...(userRes.data.data.users || []),
                ...(adminRes.data.data.users || []),
                ...(principalRes.data.data.users || [])
            ];
            setAvailableInstructors(allInstructors);

            const studentRes = await api.get('/users', { params: { role: 'student', limit: 1000 } });
            setAvailableStudents(studentRes.data.data.users || []);
        } catch (err) {
            console.error('Failed to load share options:', err);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadFile(file);
            setUploadData(prev => ({ ...prev, name: file.name.replace(/\.[^.]+$/, '') }));
        }
    };

    const handleUpload = async () => {
        if (uploadMode === 'file') {
            if (!uploadFile) { toast.error('Select a file'); return; }
            if (!uploadData.name) { toast.error('Name is required'); return; }

            setUploading(true);
            setUploadProgress(0);
            setUploadStartTime(Date.now());

            try {
                const dataWithFolder = {
                    ...uploadData,
                    folderId: currentFolder ? currentFolder.id : null
                };

                await documentsAPI.upload(uploadFile, dataWithFolder, (percent) => {
                    setUploadProgress(percent);
                });

                toast.success('Document uploaded!');
                setShowUpload(false);
                setUploadFile(null);
                setUploadData({ name: '', description: '', category: '', isPublic: false });
                setUploadProgress(0);
                setUploadStartTime(null);
                loadDocuments();
                loadStorage();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Upload failed');
            } finally {
                setUploading(false);
                setUploadProgress(0);
                setUploadStartTime(null);
            }
        } else {
            if (uploadFiles.length === 0) { toast.error('Select a folder'); return; }

            setUploading(true);
            setUploadProgress(0);
            setUploadStartTime(Date.now());

            try {
                const firstPath = uploadFiles[0].webkitRelativePath || uploadFiles[0].name;
                const folderName = firstPath.split('/')[0];

                const createRes = await foldersAPI.create({
                    name: folderName,
                    parentId: currentFolder ? currentFolder.id : null
                });
                const rootFolderId = createRes.data.data.folder.id;

                const createdFolders = { '': rootFolderId };

                for (let i = 0; i < uploadFiles.length; i++) {
                    const file = uploadFiles[i];
                    const relativePath = file.webkitRelativePath || file.name;
                    const pathParts = relativePath.split('/');
                    const fileName = pathParts.pop();
                    pathParts.shift();

                    let parentFolderId = rootFolderId;
                    let currentPath = '';

                    for (const part of pathParts) {
                        currentPath = currentPath ? `${currentPath}/${part}` : part;
                        if (!createdFolders[currentPath]) {
                            const subRes = await foldersAPI.create({
                                name: part,
                                parentId: parentFolderId
                            });
                            createdFolders[currentPath] = subRes.data.data.folder.id;
                        }
                        parentFolderId = createdFolders[currentPath];
                    }

                    setUploadCurrentFile(fileName);
                    setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));

                    const fileData = {
                        name: fileName.replace(/\.[^.]+$/, ''),
                        folderId: parentFolderId,
                        category: uploadData.category || null,
                        isPublic: uploadData.isPublic
                    };

                    await documentsAPI.upload(file, fileData);
                }

                toast.success(`Uploaded ${uploadFiles.length} files!`);
                setShowUpload(false);
                setUploadFiles([]);
                setUploadMode('file');
                setUploadData({ name: '', description: '', category: '', isPublic: false });
                setUploadCurrentFile('');
                loadDocuments();
                loadFolders();
                loadStorage();
            } catch (err) {
                console.error(err);
                toast.error(err.response?.data?.message || 'Folder upload failed');
            } finally {
                setUploading(false);
                setUploadProgress(0);
                setUploadStartTime(null);
                setUploadCurrentFile('');
            }
        }
    };

    const getUploadTimeRemaining = () => {
        if (!uploadStartTime || uploadProgress === 0) return '';
        const elapsed = Date.now() - uploadStartTime;
        const totalEstimated = (elapsed / uploadProgress) * 100;
        const remaining = totalEstimated - elapsed;
        if (remaining < 1000) return 'Almost done...';
        if (remaining < 60000) return `${Math.ceil(remaining / 1000)}s remaining`;
        return `${Math.ceil(remaining / 60000)}m remaining`;
    };

    const handleFolderSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setUploadFiles(files);
            setUploadMode('folder');
        }
    };

    const handleEdit = (doc) => {
        setEditingDoc(doc);
        setEditData({ name: doc.name, description: doc.description || '', category: doc.category || '', isPublic: doc.isPublic });
        setEditFile(null);
    };

    const handleSaveEdit = async () => {
        try {
            if (editFile) {
                const formData = new FormData();
                formData.append('file', editFile);
                formData.append('name', editData.name);
                formData.append('description', editData.description);
                formData.append('category', editData.category);
                formData.append('isPublic', editData.isPublic);

                await documentsAPI.delete(editingDoc.id);
                await documentsAPI.upload(formData);
                toast.success('Document replaced successfully');
            } else {
                await documentsAPI.update(editingDoc.id, editData);
                toast.success('Document updated');
            }
            setEditingDoc(null);
            setEditFile(null);
            loadDocuments();
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleDelete = async () => {
        try {
            await documentsAPI.delete(deleteDialog.doc.id);
            toast.success('Document deleted');
            setDeleteDialog({ open: false, doc: null });
            loadDocuments();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleRemoveShare = async (share, item) => {
        try {
            if (item.documentCount !== undefined || item.subfolderCount !== undefined) {
                await foldersAPI.removeShare(item.id, share.id);
            } else {
                await documentsAPI.removeShare(share.id);
            }
            toast.success('Access revoked successfully');
            
            setShareInfoModal(prev => ({
                ...prev,
                shareInfo: prev.shareInfo.filter(s => s.id !== share.id),
                shareCount: Math.max(0, (prev.shareCount || 1) - 1)
            }));
            
            loadDocuments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to revoke access');
        }
    };

    const handleShare = async (doc) => {
        setSharingDoc(doc);
        setSharingFolder(null);
        setShareMode('target');
        setShareTargetType('');
        setShareMessage('');
        setShareExpiresAt('');
        setSharePermission('download');
        setQrCodeUrl('');
        setShareTargets([]);

        const existingTargets = (doc.shareInfo || []).map(share => ({
            type: share.type,
            id: share.targetId
        })).filter(t => t.id);

        setShareTargets(existingTargets);

        const shareUrl = `${window.location.origin}/view-document/${doc.id}`;
        try {
            const qr = await QRCode.toDataURL(shareUrl, { width: 200 });
            setQrCodeUrl(qr);
        } catch { }
    };

    const handleShareFolder = async (folder) => {
        setSharingFolder(folder);
        setSharingDoc(null);
        setShareMode('target');
        setShareTargetType('');
        setShareMessage('');
        setShareExpiresAt('');
        setSharePermission('download');
        setShareTargets([]);
        setQrCodeUrl('');

        try {
            const sharesRes = await foldersAPI.getShares(folder.id);
            const existingShares = (sharesRes.data.data.shares || []).map(share => {
                if (share.targetClassId) {
                    return { type: 'class', id: share.targetClassId };
                } else if (share.targetGroupId) {
                    return { type: 'group', id: share.targetGroupId };
                } else if (share.targetUserId) {
                    const userType = share.targetUser?.role || share.targetType;
                    return { type: userType, id: share.targetUserId };
                }
                return null;
            }).filter(t => t && t.id);
            setShareTargets(existingShares);
        } catch (err) {
            console.error('Failed to load folder shares:', err);
            setShareTargets([]);
        }
    };

    const handleShareSubmit = async () => {
        if (shareTargets.length === 0) {
            toast.error('Select at least one target');
            return;
        }
        setSharingLoading(true);
        try {
            if (sharingDoc) {
                await documentsAPI.share(sharingDoc.id, {
                    targets: shareTargets,
                    message: shareMessage,
                    expiresAt: shareExpiresAt || null,
                    permission: sharePermission
                });
                toast.success('Document shared successfully!');
                setSharingDoc(null);
            } else if (sharingFolder) {
                await foldersAPI.share(sharingFolder.id, shareTargets, shareMessage, shareExpiresAt || null, sharePermission);
                toast.success('Folder shared successfully!');
                setSharingFolder(null);
            }
            setShareTargets([]);
            setShareMessage('');
            setShareExpiresAt('');
            setSharePermission('download');
            loadDocuments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to share');
        } finally {
            setSharingLoading(false);
        }
    };

    const toggleShareTarget = (type, id) => {
        const exists = shareTargets.find(t => t.type === type && t.id === id);
        if (exists) {
            setShareTargets(shareTargets.filter(t => !(t.type === type && t.id === id)));
        } else {
            setShareTargets([...shareTargets, { type, id }]);
        }
    };

    const copyShareLink = () => {
        const shareUrl = `${window.location.origin}/view-document/${sharingDoc.id}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Link copied!');
    };

    const handleOpenMoveDialog = (doc) => {
        setMoveDialog({ open: true, doc });
        setMoveCurrentFolder(null);
        loadMoveFolders(null);
    };

    const loadMoveFolders = async (parentId) => {
        try {
            const res = await foldersAPI.getAll(parentId);
            setMoveFolders(res.data.data.folders || []);
        } catch (err) {
            console.error('Failed to load move folders:', err);
        }
    };

    const handleMoveNavigate = (folder) => {
        setMoveCurrentFolder(folder);
        loadMoveFolders(folder ? folder.id : null);
    };

    const handleMoveUp = async () => {
        if (!moveCurrentFolder) return;
        if (!moveCurrentFolder.parentId) {
            handleMoveNavigate(null);
        } else {
            try {
                const res = await foldersAPI.getById(moveCurrentFolder.id);
                const parent = res.data.data.folder.parent;
                handleMoveNavigate(parent || null);
            } catch (err) {
                handleMoveNavigate(null);
            }
        }
    };

    const handleMoveSubmit = async () => {
        if (!moveDialog.doc && !moveDialog.folder) return;
        try {
            if (moveDialog.doc) {
                await foldersAPI.moveDocuments(moveCurrentFolder ? moveCurrentFolder.id : 'root', [moveDialog.doc.id]);
                toast.success('Document moved successfully');
            } else if (moveDialog.folder) {
                const targetId = moveCurrentFolder ? moveCurrentFolder.id : null;
                if (moveDialog.folder.id === targetId) {
                    toast.error("Cannot move folder into itself");
                    return;
                }
                await foldersAPI.update(moveDialog.folder.id, { parentId: targetId });
                toast.success('Folder moved successfully');
            }
            setMoveDialog({ open: false, doc: null, folder: null });
            loadDocuments();
            loadFolders();
        } catch (err) {
            toast.error('Failed to move item');
        }
    };

    const handleOpenFolderMoveDialog = (folder) => {
        setMoveDialog({ open: true, doc: null, folder });
        setMoveCurrentFolder(null);
        loadMoveFolders(null);
    };

    const handleDeleteFolder = async (folder) => {
        const ok = await confirm({
            title: `Delete Folder "${folder.name}"?`,
            message: `Are you sure you want to delete folder "${folder.name}" and all documents inside it?`,
            confirmText: 'Delete Folder',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await foldersAPI.delete(folder.id);
            toast.success('Folder deleted');
            loadFolders();
            loadDocuments();
        } catch (err) {
            toast.error('Failed to delete folder');
        }
    };

    const handlePreviewFolder = async (folder) => {
        try {
            const docsRes = await documentsAPI.getAll({ folderId: folder.id });
            const docs = docsRes.data.data.documents || [];
            const foldersRes = await foldersAPI.getAll(folder.id);
            const subfolders = foldersRes.data.data.folders || [];
            setFolderPreview({ folder, documents: docs, subfolders });
        } catch (err) {
            console.error('Failed to load folder contents:', err);
            toast.error('Failed to load folder contents');
        }
    };

    const toggleDocSelection = (id) => {
        const newSet = new Set(selectedDocs);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedDocs(newSet);
    };

    const toggleFolderSelection = (id) => {
        const newSet = new Set(selectedFolders);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedFolders(newSet);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allDocIds = sortedDocuments.map(d => activeTab === 'my' ? d.id : d.document?.id).filter(Boolean);
            setSelectedDocs(new Set(allDocIds));
            setSelectedFolders(new Set(folders.map(f => f.id)));
        } else {
            setSelectedDocs(new Set());
            setSelectedFolders(new Set());
        }
    };

    const isAllSelected = () => {
        const totalDocs = sortedDocuments.length;
        const totalFolders = folders.length;
        if (totalDocs + totalFolders === 0) return false;
        return selectedDocs.size === totalDocs && selectedFolders.size === totalFolders;
    };

    const handleBulkCopy = (mode) => {
        setClipboard({
            mode,
            documents: Array.from(selectedDocs),
            folders: Array.from(selectedFolders)
        });
        toast.success(`${selectedDocs.size + selectedFolders.size} items ${mode === 'copy' ? 'copied' : 'cut'} to clipboard`);
        setSelectedDocs(new Set());
        setSelectedFolders(new Set());
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        const targetFolderId = currentFolder ? currentFolder.id : 'root';
        const { mode, documents: docIds, folders: folderIds } = clipboard;

        try {
            if (docIds.length > 0) {
                if (mode === 'copy') {
                    await documentsAPI.bulkCopy(docIds, targetFolderId);
                } else {
                    await foldersAPI.moveDocuments(targetFolderId, docIds);
                }
            }

            if (folderIds.length > 0) {
                if (mode === 'copy') {
                    for (const fid of folderIds) {
                        if (fid === targetFolderId) continue;
                        await foldersAPI.copy(fid, targetFolderId);
                    }
                } else {
                    await foldersAPI.bulkMove(folderIds, targetFolderId);
                }
            }

            toast.success(`Items ${mode === 'copy' ? 'copied' : 'moved'} successfully`);
            setClipboard(null);
            loadDocuments();
            loadFolders();
            loadStorage();
        } catch (err) {
            console.error(err);
            toast.error('Failed to paste items');
        }
    };

    const handleBulkDelete = async () => {
        const ok = await confirm({
            title: `Delete Selected Items?`,
            message: `Are you sure you want to delete ${selectedDocs.size} documents and ${selectedFolders.size} folders?`,
            confirmText: 'Delete All Selected',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            if (selectedDocs.size > 0) {
                await documentsAPI.bulkDelete(Array.from(selectedDocs));
            }
            if (selectedFolders.size > 0) {
                for (const fid of selectedFolders) {
                    await foldersAPI.delete(fid);
                }
            }
            toast.success('Items deleted');
            setSelectedDocs(new Set());
            setSelectedFolders(new Set());
            loadDocuments();
            loadFolders();
        } catch (err) {
            toast.error('Failed to delete items');
        }
    };

    const handleExtractAI = async (doc) => {
        setAiExtractDoc(doc);
        setAiExtracting(true);
        setAiExtractData(null);
        try {
            const res = await api.post(`/documents/${doc.id}/extract-ai-inventory?engine=${aiEngine}`);
            setAiExtractData(res.data.data.items);
        } catch (err) {
            toast.error(err.response?.data?.message || 'AI Extraction failed');
        } finally {
            setAiExtracting(false);
        }
    };

    const handleOpenAnalytics = async (doc) => {
        setAnalyticsDoc(doc);
        setAnalyticsLoading(true);
        try {
            const res = await documentsAPI.getAnalytics(doc.id);
            setAnalyticsData(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load analytics');
            setAnalyticsDoc(null);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleReExtractAI = async () => {
        if (!aiExtractDoc) return;
        setAiExtracting(true);
        setAiExtractData(null);
        try {
            const res = await api.post(`/documents/${aiExtractDoc.id}/extract-ai-inventory?engine=${aiEngine}`);
            setAiExtractData(res.data.data.items);
        } catch (err) {
            toast.error(err.response?.data?.message || 'AI Extraction failed');
        } finally {
            setAiExtracting(false);
        }
    };

    const handleSaveAIExtraction = async () => {
        if (!aiExtractData || aiExtractData.length === 0) return;
        try {
            const res = await api.post('/labs/inventory/bulk-create', { items: aiExtractData });
            toast.success(res.data.message || 'Items saved successfully');
            setAiExtractDoc(null);
            setAiExtractData(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save items');
        }
    };

    const formatDate = (date) => formatDateTime(date);

    const filteredDocuments = (activeTab === 'my' ? documents : sharedDocuments).filter(item => {
        const doc = activeTab === 'my' ? item : item.document;
        if (!doc) return false;
        if (dateFrom && new Date(doc.createdAt) < new Date(dateFrom)) return false;
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (new Date(doc.createdAt) > toDate) return false;
        }
        return true;
    });

    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
        const docA = activeTab === 'my' ? a : a.document;
        const docB = activeTab === 'my' ? b : b.document;
        if (!docA || !docB) return 0;

        let valueA, valueB;
        switch (sortField) {
            case 'name':
                valueA = docA.name?.toLowerCase() || '';
                valueB = docB.name?.toLowerCase() || '';
                break;
            case 'fileType':
                valueA = docA.fileType?.toLowerCase() || '';
                valueB = docB.fileType?.toLowerCase() || '';
                break;
            case 'fileSize':
                valueA = docA.fileSize || 0;
                valueB = docB.fileSize || 0;
                break;
            case 'createdAt':
            default:
                valueA = new Date(activeTab === 'shared' ? a.sharedAt : docA.createdAt).getTime();
                valueB = new Date(activeTab === 'shared' ? b.sharedAt : docB.createdAt).getTime();
                break;
        }

        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIndicator = ({ field }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4 inline ml-1" />
            : <ChevronDown className="w-4 h-4 inline ml-1" />;
    };

    const canUpload = ['admin', 'principal', 'lab_assistant', 'instructor'].includes(user?.role);

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24 relative">
            {(selectedDocs.size > 0 || selectedFolders.size > 0) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 border border-slate-200 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <span className="font-semibold text-slate-700 whitespace-nowrap">
                        {selectedDocs.size + selectedFolders.size} selected
                    </span>
                    <div className="h-6 w-px bg-slate-200" />
                    <button onClick={() => handleBulkCopy('copy')} title="Copy" className="flex items-center justify-center text-slate-600 hover:text-primary-600 p-2 rounded hover:bg-slate-50 transition-colors">
                        <ClipboardCopy className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleBulkCopy('cut')} title="Cut" className="flex items-center justify-center text-slate-600 hover:text-orange-600 p-2 rounded hover:bg-slate-50 transition-colors">
                        <Scissors className="w-5 h-5" />
                    </button>
                    <button onClick={handleBulkDelete} title="Delete" className="flex items-center justify-center text-slate-600 hover:text-red-600 p-2 rounded hover:bg-slate-50 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <button onClick={() => { setSelectedDocs(new Set()); setSelectedFolders(new Set()); }} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
                    <p className="text-slate-500">Upload and manage PDFs, documents, and spreadsheets</p>
                </div>
                <div className="flex items-center gap-4">
                    {storageInfo && canUpload && (
                        <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                            <HardDrive className="w-4 h-4 text-slate-500" />
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-600">
                                    {storageInfo.usedFormatted} / {storageInfo.quotaFormatted}
                                </span>
                                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${storageInfo.percentUsed >= 90 ? 'bg-red-500' :
                                            storageInfo.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${Math.min(100, storageInfo.percentUsed)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    {canUpload && (
                        <div className="flex gap-2">
                            <button onClick={() => setShowCreateFolder(true)} className="btn bg-slate-100 text-slate-700 hover:bg-slate-200">
                                <FolderPlus className="w-4 h-4" /> New Folder
                            </button>
                            <button onClick={() => setShowUpload(true)} className="btn btn-primary">
                                <Upload className="w-4 h-4" /> Upload Document
                            </button>
                        </div>
                    )}
                    {clipboard && canUpload && (
                        <button onClick={handlePaste} className="btn bg-blue-100 text-blue-700 hover:bg-blue-200" title="Paste items here">
                            <Clipboard className="w-4 h-4 mr-2" /> Paste ({clipboard.documents.length + clipboard.folders.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                <button
                    onClick={() => setActiveTab('my')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'my'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    My Documents
                </button>
                <button
                    onClick={() => setActiveTab('shared')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'shared'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <Inbox className="w-4 h-4" />
                    Shared with Me
                    {sharedDocuments.length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {sharedDocuments.length}
                        </span>
                    )}
                </button>
                {
                    canUpload && (
                        <button
                            onClick={() => setActiveTab('trash')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'trash'
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Trash className="w-4 h-4" />
                            Trash
                            {trashDocuments.length > 0 && (
                                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {trashDocuments.length}
                                </span>
                            )}
                        </button>
                    )
                }
            </div >

            < div className="flex flex-col gap-3 mb-6" >
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10 w-full"
                            placeholder="Search documents..."
                        />
                    </div>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input w-full sm:w-48">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-500">From:</span>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input py-1.5 text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">To:</span>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input py-1.5 text-sm" />
                        </div>
                        {(dateFrom || dateTo) && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-sm text-red-500 hover:underline">Clear</button>
                        )}
                    </div>

                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                            title="Grid View"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div >

            {
                activeTab === 'my' && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-slate-600 overflow-x-auto pb-2">
                        <button
                            onClick={() => handleFolderClick(null)}
                            className={`flex items-center gap-1 hover:text-primary-600 ${!currentFolder ? 'font-bold text-slate-900' : ''}`}
                        >
                            <HardDrive className="w-4 h-4" />
                            My Documents
                        </button>
                        {folderBreadcrumbs.map((crumb, index) => (
                            <div key={crumb.id} className="flex items-center gap-2 shrink-0">
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                <button
                                    onClick={() => handleNavigateBreadcrumb(crumb)}
                                    className={`hover:text-primary-600 ${index === folderBreadcrumbs.length - 1 ? 'font-bold text-slate-900' : ''}`}
                                >
                                    {crumb.name}
                                </button>
                            </div>
                        ))}
                        {currentFolder && !folderBreadcrumbs.find(b => b.id === currentFolder.id) && (
                            <div className="flex items-center gap-2 shrink-0">
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                <span className="font-bold text-slate-900">{currentFolder.name}</span>
                            </div>
                        )}
                    </div>
                )
            }

            {
                loading ? (
                    <div className="text-center py-12 text-slate-500">Loading...</div>
                ) : activeTab === 'trash' ? (
                    trashDocuments.length === 0 ? (
                        <div className="text-center py-12">
                            <Trash className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500">Trash is empty</p>
                            <p className="text-sm text-slate-400 mt-2">Deleted documents will appear here for 30 days</p>
                        </div>
                    ) : (
                        <div className="card overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-red-50 border-b border-red-200">
                                    <tr>
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Name</th>
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Type</th>
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Size</th>
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Deleted</th>
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Deleted By</th>
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trashDocuments.map(doc => (
                                        <tr key={doc.id} className={`border-b border-slate-100 hover:bg-slate-50 group ${selectedDocs.has(doc.id) ? 'bg-primary-50' : ''}`}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl opacity-50">{FILE_ICONS[doc.fileType] || FILE_ICONS.file}</span>
                                                    <div>
                                                        <p className="font-medium text-slate-700">{doc.name}</p>
                                                        {doc.description && <p className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{doc.fileType?.toUpperCase()}</td>
                                            <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{doc.fileSizeFormatted || ''}</td>
                                            <td className="p-3 text-sm text-slate-500 hidden lg:table-cell">{formatDate(doc.deletedAt)}</td>
                                            <td className="p-3 text-sm text-slate-600 hidden lg:table-cell">
                                                {doc.deletedBy ? `${doc.deletedBy.firstName} ${doc.deletedBy.lastName}` : '-'}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleRestore(doc)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePermanentDelete(doc)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : filteredDocuments.length === 0 && (activeTab !== 'my' || folders.length === 0) ? (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500">{activeTab === 'shared' ? 'No documents shared with you' : 'No documents found'}</p>
                        {activeTab === 'my' && canUpload && (
                            <button onClick={() => setShowUpload(true)} className="btn btn-primary mt-4">Upload your first document</button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeTab === 'my' && folders.map(folder => (
                            <div
                                key={folder.id}
                                className={`card p-4 hover:shadow-md transition-all border border-slate-100 bg-slate-50/50 relative ${selectedFolders.has(folder.id) ? 'ring-2 ring-primary-500' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFolders.has(folder.id)}
                                    onChange={() => toggleFolderSelection(folder.id)}
                                    className="absolute top-3 right-3 z-10 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex items-start justify-between cursor-pointer" onClick={() => handleFolderClick(folder)}>
                                    <div className="flex items-center gap-3">
                                        <Folder className="w-10 h-10 text-yellow-400 fill-yellow-100" />
                                        <div className="overflow-hidden">
                                            <h3 className="font-semibold text-slate-800 truncate" title={folder.name}>{folder.name}</h3>
                                            <p className="text-xs text-slate-500">
                                                {folder.documentCount || 0} files • {folder.subfolderCount || 0} folders
                                                {folder.totalSizeFormatted && folder.totalSizeFormatted !== '-' && ` • ${folder.totalSizeFormatted}`}
                                            </p>
                                            {folder.shareInfo && folder.shareInfo.length > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShareInfoModal(folder); }}
                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition"
                                                >
                                                    <Users className="w-3 h-3" />
                                                    Shared with {folder.shareInfo.length}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePreviewFolder(folder); }}
                                        className="flex-1 p-1.5 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded flex items-center justify-center gap-1"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleShareFolder(folder); }}
                                        className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded flex items-center justify-center"
                                        title="Share"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenFolderMoveDialog(folder); }}
                                        className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded flex items-center justify-center"
                                        title="Move"
                                    >
                                        <FolderInput className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded flex items-center justify-center"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {sortedDocuments.map(item => {
                            const doc = activeTab === 'my' ? item : item.document;
                            const shareInfo = activeTab === 'shared' ? item : null;
                            if (!doc) return null;
                            return (
                                <div key={doc.id + (shareInfo?.shareId || '')} className={`card p-4 hover:shadow-lg transition-shadow relative ${selectedDocs.has(doc.id) ? 'ring-2 ring-primary-500' : ''}`}>
                                    {activeTab === 'my' && (
                                        <input
                                            type="checkbox"
                                            checked={selectedDocs.has(doc.id)}
                                            onChange={() => toggleDocSelection(doc.id)}
                                            className="absolute top-3 right-3 z-10 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                    )}
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                                            {FILE_ICONS[doc.fileType] || FILE_ICONS.file}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{doc.name}</h3>
                                            <p className="text-sm text-slate-500">{doc.fileType?.toUpperCase()} • {doc.fileSizeFormatted || ''}</p>
                                            {doc.category && (
                                                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 capitalize">{doc.category}</span>
                                            )}
                                        </div>
                                    </div>

                                    {doc.description && (
                                        <p className="text-sm text-slate-600 mt-3 line-clamp-2">{doc.description}</p>
                                    )}

                                    {activeTab === 'my' && doc.shareCount > 0 && (
                                        <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-xs">
                                            <div className="flex items-center gap-1 text-emerald-700 font-medium">
                                                <Share2 className="w-3 h-3" />
                                                Shared with {doc.shareCount} recipient{doc.shareCount > 1 ? 's' : ''}
                                            </div>
                                            <div className="mt-1 text-emerald-600 flex flex-wrap gap-1">
                                                {doc.shareInfo?.slice(0, 3).map((share, i) => (
                                                    <span key={share.id} className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 rounded text-emerald-700">
                                                        {share.type === 'class' ? '📚' : share.type === 'group' ? '👥' : '👤'} {share.targetName}
                                                    </span>
                                                ))}
                                                {doc.shareInfo?.length > 3 && (
                                                    <span className="text-emerald-500">+{doc.shareInfo.length - 3} more</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {shareInfo && (
                                        <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                Shared by {shareInfo.sharedBy?.firstName} {shareInfo.sharedBy?.lastName}
                                            </div>
                                            {shareInfo.message && (
                                                <p className="mt-1 text-blue-600 italic">"{shareInfo.message}"</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(shareInfo ? shareInfo.sharedAt : doc.createdAt)}
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                        <button title="View" onClick={() => setViewingDoc(shareInfo ? { ...doc, sharePermission: shareInfo.permission } : doc)} className="btn btn-secondary text-xs py-1.5">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {activeTab === 'my' && canUpload && (
                                            <>
                                                <button onClick={() => handleEdit(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleOpenMoveDialog(doc)} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Move">
                                                    <FolderInput className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleShare(doc)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded">
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteDialog({ open: true, doc })} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(doc.fileType?.toLowerCase()) && (
                                                    <button onClick={() => handleExtractAI(doc)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Extract AI Inventory">
                                                        <Wand2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleOpenAnalytics(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Analytics">
                                                    <BarChart2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {activeTab === 'my' && (
                                        <th className="w-10 p-3">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={isAllSelected()}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </th>
                                    )}
                                    <th
                                        onClick={() => handleSort('name')}
                                        className="text-left p-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                                    >
                                        Name<SortIndicator field="name" />
                                    </th>
                                    <th
                                        onClick={() => handleSort('fileType')}
                                        className="text-left p-3 text-sm font-semibold text-slate-700 hidden md:table-cell cursor-pointer hover:bg-slate-100 select-none"
                                    >
                                        Type<SortIndicator field="fileType" />
                                    </th>
                                    <th
                                        onClick={() => handleSort('fileSize')}
                                        className="text-left p-3 text-sm font-semibold text-slate-700 hidden md:table-cell cursor-pointer hover:bg-slate-100 select-none"
                                    >
                                        Size<SortIndicator field="fileSize" />
                                    </th>
                                    {activeTab === 'my' ? (
                                        <>
                                            <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Category</th>
                                            <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Shared With</th>
                                        </>
                                    ) : (
                                        <th className="text-left p-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Shared By</th>
                                    )}
                                    <th
                                        onClick={() => handleSort('createdAt')}
                                        className="text-left p-3 text-sm font-semibold text-slate-700 hidden lg:table-cell cursor-pointer hover:bg-slate-100 select-none"
                                    >
                                        {activeTab === 'my' ? 'Uploaded' : 'Shared On'}<SortIndicator field="createdAt" />
                                    </th>
                                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === 'my' && folders.map(folder => (
                                    <tr key={folder.id}
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer group ${selectedFolders.has(folder.id) ? 'bg-primary-50' : ''}`}
                                    >
                                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedFolders.has(folder.id)}
                                                onChange={() => toggleFolderSelection(folder.id)}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </td>
                                        <td className="p-3" onClick={() => handleFolderClick(folder)}>
                                            <div className="flex items-center gap-3">
                                                <Folder className="w-6 h-6 text-yellow-400 fill-yellow-100" />
                                                <div>
                                                    <p className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">{folder.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-slate-600 hidden md:table-cell">Folder</td>
                                        <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{folder.totalSizeFormatted || '-'}</td>
                                        {activeTab === 'my' && (
                                            <>
                                                <td className="p-3 hidden lg:table-cell">
                                                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                                                        Folder
                                                    </span>
                                                </td>
                                                <td className="p-3 hidden lg:table-cell">
                                                    {folder.shareInfo && folder.shareInfo.length > 0 ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShareInfoModal(folder); }}
                                                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition"
                                                        >
                                                            <Users className="w-3 h-3" />
                                                            {folder.shareInfo.length}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        <td className="p-3 text-sm text-slate-600 hidden lg:table-cell">{formatDate(folder.createdAt)}</td>
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePreviewFolder(folder); }}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                                    title="View Contents"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleShareFolder(folder); }}
                                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                                    title="Share"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenFolderMoveDialog(folder); }}
                                                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                                                    title="Move"
                                                >
                                                    <FolderInput className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {sortedDocuments.map(item => {
                                    const doc = activeTab === 'my' ? item : item.document;
                                    const shareInfo = activeTab === 'shared' ? item : null;
                                    if (!doc) return null;
                                    return (
                                        <tr key={doc.id + (shareInfo?.shareId || '')} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedDocs.has(doc.id) ? 'bg-primary-50' : ''}`}>
                                            {activeTab === 'my' && (
                                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDocs.has(doc.id)}
                                                        onChange={() => toggleDocSelection(doc.id)}
                                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                </td>
                                            )}
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{FILE_ICONS[doc.fileType] || FILE_ICONS.file}</span>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{doc.name}</p>
                                                        {doc.description && <p className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{doc.fileType?.toUpperCase()}</td>
                                            <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{doc.fileSizeFormatted || ''}</td>
                                            {activeTab === 'my' ? (
                                                <>
                                                    <td className="p-3 hidden lg:table-cell">
                                                        {doc.category && <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 capitalize">{doc.category}</span>}
                                                    </td>
                                                    <td className="p-3 hidden lg:table-cell">
                                                        {doc.shareCount > 0 ? (
                                                            <button
                                                                onClick={() => setShareInfoModal(doc)}
                                                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition"
                                                            >
                                                                <Users className="w-3 h-3" />
                                                                {doc.shareCount}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="p-3 text-sm text-slate-600 hidden lg:table-cell">
                                                    {shareInfo?.sharedBy?.firstName} {shareInfo?.sharedBy?.lastName}
                                                </td>
                                            )}
                                            <td className="p-3 text-sm text-slate-500 hidden lg:table-cell">{formatDate(shareInfo ? shareInfo.sharedAt : doc.createdAt)}</td>
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    <button onClick={() => setViewingDoc(shareInfo ? { ...doc, sharePermission: shareInfo.permission } : doc)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="View">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {activeTab === 'my' && canUpload && (
                                                        <>
                                                            <button onClick={() => handleEdit(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleOpenMoveDialog(doc)} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Move">
                                                                <FolderInput className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleShare(doc)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" title="Share">
                                                                <Share2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setDeleteDialog({ open: true, doc })} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            {['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(doc.fileType?.toLowerCase()) && (
                                                                <button onClick={() => handleExtractAI(doc)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Extract AI Inventory">
                                                                    <Wand2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleOpenAnalytics(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Analytics">
                                                                <BarChart2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {activeTab === 'shared' && shareInfo?.permission !== 'view' && (
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="Download">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            }

            {showUpload && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-xl font-semibold">Upload {uploadMode === 'folder' ? 'Folder' : 'Document'}</h3>
                            <button onClick={() => { setShowUpload(false); setUploadMode('file'); setUploadFiles([]); setUploadFile(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                <button
                                    onClick={() => { setUploadMode('file'); setUploadFiles([]); }}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${uploadMode === 'file' ? 'bg-white shadow text-primary-600' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    <FileText className="w-4 h-4 inline mr-1" /> File
                                </button>
                                <button
                                    onClick={() => { setUploadMode('folder'); setUploadFile(null); }}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${uploadMode === 'folder' ? 'bg-white shadow text-primary-600' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    <Folder className="w-4 h-4 inline mr-1" /> Folder
                                </button>
                            </div>

                            {uploadMode === 'file' ? (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center ${uploadFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300'}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => { e.preventDefault(); handleFileSelect({ target: { files: e.dataTransfer.files } }); }}
                                >
                                    {uploadFile ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{FILE_ICONS[uploadFile.name.split('.').pop()] || FILE_ICONS.file}</span>
                                            <div className="text-left flex-1">
                                                <p className="font-medium truncate">{uploadFile.name}</p>
                                                <p className="text-sm text-slate-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                            <button onClick={() => setUploadFile(null)} className="text-red-500"><X className="w-5 h-5" /></button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                            <p className="text-slate-600">Drag & drop or click to select</p>
                                            <p className="text-xs text-slate-400 mt-1">PDF, DOC, XLS, CSV, TXT, Images • Max 100MB</p>
                                            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileSelect} />
                                        </label>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center ${uploadFiles.length > 0 ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300'}`}
                                >
                                    {uploadFiles.length > 0 ? (
                                        <div className="flex items-center gap-3">
                                            <Folder className="w-10 h-10 text-yellow-500 fill-yellow-100" />
                                            <div className="text-left flex-1">
                                                <p className="font-medium truncate">{(uploadFiles[0].webkitRelativePath || '').split('/')[0] || 'Folder'}</p>
                                                <p className="text-sm text-slate-500">{uploadFiles.length} files</p>
                                            </div>
                                            <button onClick={() => setUploadFiles([])} className="text-red-500"><X className="w-5 h-5" /></button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <FolderPlus className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                            <p className="text-slate-600">Click to select a folder</p>
                                            <p className="text-xs text-slate-400 mt-1">All files in the folder will be uploaded</p>
                                            <input
                                                type="file"
                                                className="hidden"
                                                webkitdirectory=""
                                                directory=""
                                                multiple
                                                onChange={handleFolderSelect}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}

                                {/* Form fields - only show name for file mode */}
                                {uploadMode === 'file' && (
                                    <div>
                                        <label className="label">Name</label>
                                        <input type="text" value={uploadData.name} onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })} className="input" placeholder="Document name" />
                                    </div>
                                )}
                                {uploadMode === 'file' && (
                                    <div>
                                        <label className="label">Description</label>
                                        <textarea value={uploadData.description} onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })} className="input" rows={2} placeholder="Optional description" />
                                    </div>
                                )}
                                <div>
                                    <label className="label">Category</label>
                                    <select value={uploadData.category} onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })} className="input">
                                        <option value="">Select category</option>
                                        {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={uploadData.isPublic} onChange={(e) => setUploadData({ ...uploadData, isPublic: e.target.checked })} className="rounded" />
                                    <span className="text-sm text-slate-700">Make publicly shareable</span>
                                </label>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => { setShowUpload(false); setUploadMode('file'); setUploadFiles([]); setUploadFile(null); }} disabled={uploading} className="btn btn-secondary flex-1">Cancel</button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading || (uploadMode === 'file' ? !uploadFile : uploadFiles.length === 0)}
                                        className="btn btn-primary flex-1 relative overflow-hidden"
                                    >
                                        {uploading ? (
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Circular Progress */}
                                                <div className="relative w-5 h-5">
                                                    <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 20 20">
                                                        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                                                        <circle
                                                            cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                                                            strokeDasharray={`${uploadProgress * 0.5} 50`}
                                                            className="transition-all duration-300"
                                                        />
                                                    </svg>
                                                </div>
                                                <span>{uploadProgress}%</span>
                                                {getUploadTimeRemaining() && (
                                                    <span className="text-xs opacity-75">• {getUploadTimeRemaining()}</span>
                                                )}
                                            </div>
                                        ) : 'Upload'}
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                {uploading && (
                                    <div className="mt-2">
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-600 transition-all duration-300 ease-out"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 text-center">
                                            {uploadMode === 'folder' && uploadCurrentFile ? `Uploading: ${uploadCurrentFile}` : 'Uploading...'} {uploadProgress}% {getUploadTimeRemaining()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View/Preview Modal */}
            {
                viewingDoc && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h3 className="text-lg font-semibold">{viewingDoc.name}</h3>
                                    <p className="text-sm text-slate-500">{viewingDoc.fileType.toUpperCase()} • {viewingDoc.fileSizeFormatted}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a title="Download" href={viewingDoc.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">
                                        <Download className="w-5 h-5" />
                                    </a>
                                    <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto bg-slate-100 p-4">
                                {(() => {
                                    const ext = viewingDoc.url.split('.').pop().toLowerCase();
                                    const type = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odp', 'mp4', 'mpeg', 'ogg', 'webm', 'avi', 'mov', 'mp3', 'wav', 'm4a', 'aac', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'html', 'csv'].includes(ext) ? ext : viewingDoc.fileType;
                                    
                                    if (['docx', 'xlsx', 'xls', 'csv'].includes(type)) {
                                        return <FileViewer url={viewingDoc.url} fileType={type} name={viewingDoc.name} />;
                                    } else if (['pdf', 'doc', 'ppt', 'pptx', 'odp'].includes(type)) {
                                        return (
                                            <iframe
                                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDoc.url)}&embedded=true`}
                                                className="w-full h-full min-h-[500px] rounded-lg border border-slate-200 bg-white"
                                                title="Document Preview"
                                            />
                                        );
                                    } else if (['mp4', 'mpeg', 'ogg', 'webm', 'avi', 'mov'].includes(type)) {
                                        return (
                                            <div className="flex items-center justify-center h-full min-h-[500px] bg-black rounded-lg">
                                                <video controls src={viewingDoc.url} className="max-w-full max-h-[500px]" title="Video Preview" />
                                            </div>
                                        );
                                    } else if (['mp3', 'wav', 'm4a', 'aac'].includes(type)) {
                                        return (
                                            <div className="flex items-center justify-center h-full min-h-[200px] bg-slate-900 rounded-lg">
                                                <audio controls src={viewingDoc.url} className="w-3/4 max-w-md" title="Audio Preview" />
                                            </div>
                                        );
                                    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
                                        return (
                                            <div className="flex items-center justify-center h-full min-h-[400px] bg-white rounded-lg border border-slate-200">
                                                <img
                                                    src={viewingDoc.url}
                                                    alt={viewingDoc.name}
                                                    className="max-w-full max-h-[500px] object-contain"
                                                />
                                            </div>
                                        );
                                    } else if (['txt', 'html'].includes(type)) {
                                        return <HtmlPreview url={viewingDoc.url} />;
                                    } else {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
                                                <span className="text-6xl mb-4">{FILE_ICONS[viewingDoc.fileType] || FILE_ICONS.file}</span>
                                                <p className="mb-4">Preview not available for {viewingDoc.fileType.toUpperCase()} files</p>
                                                <a href={viewingDoc.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                                    <ExternalLink className="w-4 h-4" /> Open in New Tab
                                                </a>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                            {viewingDoc.description && (
                                <div className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                                    <p className="text-sm text-slate-600">{viewingDoc.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                editingDoc && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full">
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">Edit Document</h3>
                                <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="label">Name</label>
                                    <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="input" />
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="input" rows={3} />
                                </div>
                                <div>
                                    <label className="label">Category</label>
                                    <select value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })} className="input">
                                        <option value="">No category</option>
                                        {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>

                                {/* File replacement */}
                                <div>
                                    <label className="label">Replace File (optional)</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center">
                                        {editFile ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700">{editFile.name}</span>
                                                <button onClick={() => setEditFile(null)} className="text-red-500 hover:text-red-700">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => setEditFile(e.target.files[0])}
                                                />
                                                <div className="text-slate-500 text-sm">
                                                    <Upload className="w-5 h-5 mx-auto mb-1" />
                                                    Click to select new file
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Current: {editingDoc?.fileName}</p>
                                </div>

                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={editData.isPublic} onChange={(e) => setEditData({ ...editData, isPublic: e.target.checked })} className="rounded" />
                                    <span className="text-sm text-slate-700">Make publicly shareable</span>
                                </label>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setEditingDoc(null)} className="btn btn-secondary flex-1">Cancel</button>
                                    <button onClick={handleSaveEdit} className="btn btn-primary flex-1">{editFile ? 'Replace & Save' : 'Save Changes'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Share Info Popup Modal */}
            {
                shareInfoModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShareInfoModal(null)}>
                        <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Shared With</h3>
                                <button onClick={() => setShareInfoModal(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 min-h-0">
                                <p className="text-sm text-slate-600 mb-3">"{shareInfoModal.name}" is shared with:</p>
                                <div className="space-y-2">
                                    {shareInfoModal.shareInfo?.map((share, i) => (
                                        <div key={share.id || i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                            <span className="text-lg">
                                                {share.type === 'class' ? '📚' : share.type === 'group' ? '👥' : '👤'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-900">{share.name || share.targetName}</p>
                                                <p className="text-xs text-slate-500 capitalize">{share.type}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveShare(share, shareInfoModal)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Revoke Access"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!shareInfoModal.shareInfo || shareInfoModal.shareInfo.length === 0) && (
                                        <p className="text-sm text-slate-400 text-center py-4">No shares found</p>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50">
                                <button title="Edit Sharing" onClick={() => {
                                    setShareInfoModal(null);
                                    // Check if this is a folder (has shareInfo array directly from folder query) or document
                                    if (shareInfoModal.documentCount !== undefined || shareInfoModal.subfolderCount !== undefined) {
                                        handleShareFolder(shareInfoModal);
                                    } else {
                                        handleShare(shareInfoModal);
                                    }
                                }} className="btn btn-primary w-full text-sm">
                                    <Share2 className="w-4 h-4" /> Edit Sharing
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Folder Preview Modal */}
            {
                folderPreview && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setFolderPreview(null)}>
                        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <Folder className="w-6 h-6 text-yellow-400 fill-yellow-100" />
                                    <div>
                                        <h3 className="text-lg font-semibold">{folderPreview.folder.name}</h3>
                                        <p className="text-xs text-slate-500">
                                            {folderPreview.documents.length} files • {folderPreview.subfolders.length} folders
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setFolderPreview(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[calc(70vh-140px)]">
                                {/* Subfolders */}
                                {folderPreview.subfolders.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Folders</p>
                                        <div className="space-y-1">
                                            {folderPreview.subfolders.map(subfolder => (
                                                <div key={subfolder.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                                                    onClick={() => { setFolderPreview(null); handleFolderClick(subfolder); }}
                                                >
                                                    <Folder className="w-5 h-5 text-yellow-400 fill-yellow-100" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{subfolder.name}</p>
                                                        <p className="text-xs text-slate-500">{subfolder.documentCount || 0} files</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Documents */}
                                {folderPreview.documents.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Files</p>
                                        <div className="space-y-1">
                                            {folderPreview.documents.map(doc => (
                                                <div key={doc.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                                                    onClick={() => { setFolderPreview(null); setViewingDoc(doc); }}
                                                >
                                                    <span className="text-xl">{FILE_ICONS[doc.fileType] || FILE_ICONS.file}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                                                        <p className="text-xs text-slate-500">{doc.fileType?.toUpperCase()} • {doc.fileSizeFormatted || ''}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Empty state */}
                                {folderPreview.subfolders.length === 0 && folderPreview.documents.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-8">This folder is empty</p>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50">
                                <button onClick={() => { setFolderPreview(null); handleFolderClick(folderPreview.folder); }} className="btn btn-primary w-full text-sm">
                                    <Folder className="w-4 h-4" /> Open Folder
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Folder Modal */}
            {
                showCreateFolder && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg">Create New Folder</h3>
                                <button onClick={() => setShowCreateFolder(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateFolder} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Folder Name *</label>
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        className="input w-full"
                                        placeholder="e.g. Project Docs"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateFolder(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                                        disabled={!newFolderName.trim()}
                                    >
                                        Create Folder
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }



            {/* Move Modal */}
            {
                moveDialog.open && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg">Move {moveDialog.folder ? 'Folder' : 'Document'}</h3>
                                <button onClick={() => setMoveDialog({ open: false, doc: null, folder: null })} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                    <Folder className="w-4 h-4" />
                                    {moveCurrentFolder ? moveCurrentFolder.name : 'My Documents'}
                                </div>
                                {moveCurrentFolder && (
                                    <button title="Up" onClick={handleMoveUp} className="text-sm bg-white border px-2 py-1 rounded hover:bg-slate-50 flex items-center justify-center gap-1">
                                        <CornerUpLeft className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {moveFolders.filter(f => f.id !== moveDialog.folder?.id).length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-sm">No folders here</div>
                                ) : (
                                    <div className="space-y-1">
                                        {moveFolders.filter(f => f.id !== moveDialog.folder?.id).map(folder => (
                                            <div
                                                key={folder.id}
                                                onClick={() => handleMoveNavigate(folder)}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer"
                                            >
                                                <Folder className="w-5 h-5 text-yellow-500 fill-yellow-100" />
                                                <span className="text-sm font-medium text-slate-700">{folder.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setMoveDialog({ open: false, doc: null, folder: null })}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMoveSubmit}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
                                    disabled={
                                        (moveDialog.doc && moveDialog.doc.folderId === (moveCurrentFolder ? moveCurrentFolder.id : null)) ||
                                        (moveDialog.folder && moveDialog.folder.parentId === (moveCurrentFolder ? moveCurrentFolder.id : null))
                                    }
                                >
                                    Move Here
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, doc: null })}
                onConfirm={handleDelete}
                title="Delete Document"
                message={`Are you sure you want to delete "${deleteDialog.doc?.name}"? This cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
            {/* AI Extraction Modal */}
            {aiExtractDoc && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <Wand2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold">AI Inventory Extraction</h3>
                                    <p className="text-sm text-slate-500">Extracting from: {aiExtractDoc.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setAiExtractDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Extraction Engine:</label>
                                <select 
                                    value={aiEngine} 
                                    onChange={(e) => setAiEngine(e.target.value)}
                                    disabled={aiExtracting}
                                    className="input text-sm py-1.5"
                                >
                                    <option value="gemini">Gemini 2.0 Flash (Recommended)</option>
                                    <option value="ocr">OCR.space (Text Parser)</option>
                                    <option value="groq">Groq (Llama 3.2 Vision)</option>
                                </select>
                            </div>
                            {aiExtractData && !aiExtracting && (
                                <button title="Re-extract" onClick={handleReExtractAI} className="btn btn-secondary text-sm py-1.5 flex items-center justify-center gap-2">
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="p-6 overflow-auto flex-1 bg-slate-50">
                            {aiExtracting ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                    <h4 className="text-lg font-medium text-slate-800">Extracting Data...</h4>
                                    <p className="text-slate-500 mt-2 max-w-sm">Gemini AI is analyzing the document to extract computer systems, monitors, and UPS serial numbers.</p>
                                </div>
                            ) : aiExtractData ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                                        <p className="text-slate-700">Successfully extracted <span className="font-bold text-primary-600">{aiExtractData.length}</span> items.</p>
                                        <p className="text-sm text-slate-500">Please review the extracted items before saving.</p>
                                    </div>
                                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3 text-sm font-semibold text-slate-700">Serial No. (System)</th>
                                                    <th className="p-3 text-sm font-semibold text-slate-700">Monitor Serial</th>
                                                    <th className="p-3 text-sm font-semibold text-slate-700">UPS Serial</th>
                                                    <th className="p-3 text-sm font-semibold text-slate-700">Lab</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {aiExtractData.map((item, index) => (
                                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="p-3 text-slate-800 font-medium">{item.serialNumber || '-'}</td>
                                                        <td className="p-3 text-slate-600">{item.monitorSerial || '-'}</td>
                                                        <td className="p-3 text-slate-600">{item.upsSerial || '-'}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                                                                {item.labName || 'Unknown'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {aiExtractData.length === 0 && (
                                            <div className="p-8 text-center text-slate-500">No items could be extracted from this document.</div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {!aiExtracting && aiExtractData && (
                            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 flex-shrink-0">
                                <button onClick={() => setAiExtractDoc(null)} className="btn btn-secondary">Cancel</button>
                                <button title="Save Inventory" onClick={handleSaveAIExtraction} className="btn btn-primary bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Analytics Modal */}
            {
                analyticsDoc && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAnalyticsDoc(null)}>
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold">Document Analytics</h3>
                                    <p className="text-sm text-slate-500">Analytics for: {analyticsDoc.name}</p>
                                </div>
                                <button onClick={() => setAnalyticsDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                                {analyticsLoading ? (
                                    <div className="text-center py-12 text-slate-500">Loading analytics...</div>
                                ) : analyticsData ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <p className="text-sm text-slate-500 mb-1">Total Views</p>
                                                <p className="text-3xl font-bold text-slate-900">{analyticsData.totalViews}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <p className="text-sm text-slate-500 mb-1">Unique Viewers</p>
                                                <p className="text-3xl font-bold text-slate-900">{analyticsData.uniqueViewers}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                <p className="text-sm text-slate-500 mb-1">Avg Watch Time</p>
                                                <p className="text-3xl font-bold text-slate-900">{Math.round(analyticsData.averageWatchTime || 0)}s</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="p-4 border-b border-slate-200 font-semibold">Recent Views</div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-50 text-slate-500">
                                                        <tr>
                                                            <th className="p-3">Viewer</th>
                                                            <th className="p-3">Viewed At</th>
                                                            <th className="p-3">IP Address</th>
                                                            <th className="p-3">Device</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {analyticsData.recentViews?.length > 0 ? (
                                                            analyticsData.recentViews.map(view => (
                                                                <tr key={view.id} className="border-b border-slate-100 last:border-0">
                                                                    <td className="p-3">
                                                                        {view.user ? `${view.user.firstName} ${view.user.lastName}` : 'Anonymous'}
                                                                    </td>
                                                                    <td className="p-3">{formatDate(view.viewedAt)}</td>
                                                                    <td className="p-3 font-mono text-xs">{view.ipAddress || '-'}</td>
                                                                    <td className="p-3">{view.userAgent ? view.userAgent.split(' ')[0] : '-'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="4" className="p-4 text-center text-slate-500">No views recorded yet</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-500">Failed to load data</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

        </div>
    );
}
