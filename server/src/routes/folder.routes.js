const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/folders
 * @desc    Get all folders for current user (with optional parent filter)
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { parentId, search } = req.query;

    const where = {
        schoolId: req.user.schoolId,
        deletedAt: null
    };

    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
        // When searching, we ignore parentId to search globally
    } else {
        where.parentId = parentId || null;
    }

    const folders = await prisma.documentFolder.findMany({
        where,
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            _count: {
                select: {
                    documents: { where: { deletedAt: null } },
                    children: { where: { deletedAt: null } }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    // Helper function to recursively calculate folder size
    const calculateFolderSize = async (folderId) => {
        // Get direct documents size
        const directDocs = await prisma.document.aggregate({
            where: { folderId, deletedAt: null },
            _sum: { fileSize: true }
        });
        // Handle BigInt - convert to Number
        let totalSize = Number(directDocs._sum.fileSize || 0);

        // Get child folders and calculate their sizes recursively
        const childFolders = await prisma.documentFolder.findMany({
            where: { parentId: folderId, deletedAt: null },
            select: { id: true }
        });

        for (const child of childFolders) {
            totalSize += await calculateFolderSize(child.id);
        }

        return totalSize;
    };

    // Format file size helper
    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    // Calculate sizes for all folders
    const foldersWithSize = await Promise.all(folders.map(async (f) => {
        const totalSize = await calculateFolderSize(f.id);
        return {
            ...f,
            documentCount: f._count.documents,
            subfolderCount: f._count.children,
            totalSize,
            totalSizeFormatted: formatSize(totalSize)
        };
    }));

    res.json({
        success: true,
        data: {
            folders: foldersWithSize
        }
    });
}));

/**
 * @route   GET /api/folders/:id
 * @desc    Get folder details with contents
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const folder = await prisma.documentFolder.findFirst({
        where: {
            id: req.params.id,
            schoolId: req.user.schoolId,
            deletedAt: null
        },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            parent: { select: { id: true, name: true } }
        }
    });

    if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Get breadcrumb path
    const breadcrumbs = [];
    let currentFolder = folder;
    while (currentFolder) {
        breadcrumbs.unshift({ id: currentFolder.id, name: currentFolder.name });
        if (currentFolder.parent) {
            currentFolder = await prisma.documentFolder.findUnique({
                where: { id: currentFolder.parent.id },
                include: { parent: { select: { id: true, name: true } } }
            });
        } else {
            break;
        }
    }

    res.json({
        success: true,
        data: { folder, breadcrumbs }
    });
}));

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Private (Admin/Principal/Lab Assistant/Instructor)
 */
router.post('/', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    // Validate parent exists if provided
    if (parentId) {
        const parent = await prisma.documentFolder.findFirst({
            where: { id: parentId, schoolId: req.user.schoolId, deletedAt: null }
        });
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent folder not found' });
        }
    }

    const folder = await prisma.documentFolder.create({
        data: {
            schoolId: req.user.schoolId,
            createdById: req.user.id,
            name: name.trim(),
            parentId: parentId || null
        },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    res.status(201).json({
        success: true,
        message: 'Folder created',
        data: { folder }
    });
}));

/**
 * @route   PUT /api/folders/:id
 * @desc    Rename or move a folder
 * @access  Private (Admin/Principal/Lab Assistant/Instructor)
 */
router.put('/:id', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;

    const folder = await prisma.documentFolder.findFirst({
        where: { id: req.params.id, schoolId: req.user.schoolId, deletedAt: null }
    });

    if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Prevent moving folder into itself or its descendants
    if (parentId) {
        if (parentId === req.params.id) {
            return res.status(400).json({ success: false, message: 'Cannot move folder into itself' });
        }
        // Check for circular reference
        let checkId = parentId;
        while (checkId) {
            const checkFolder = await prisma.documentFolder.findUnique({
                where: { id: checkId },
                select: { parentId: true }
            });
            if (checkFolder?.parentId === req.params.id) {
                return res.status(400).json({ success: false, message: 'Cannot move folder into its own subfolder' });
            }
            checkId = checkFolder?.parentId;
        }
    }

    const updated = await prisma.documentFolder.update({
        where: { id: req.params.id },
        data: {
            name: name !== undefined ? name.trim() : folder.name,
            parentId: parentId !== undefined ? (parentId || null) : folder.parentId
        }
    });

    res.json({
        success: true,
        message: 'Folder updated',
        data: { folder: updated }
    });
}));

/**
 * @route   DELETE /api/folders/:id
 * @desc    Delete a folder (soft delete)
 * @access  Private (Admin/Principal)
 */
router.delete('/:id', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const folder = await prisma.documentFolder.findFirst({
        where: { id: req.params.id, schoolId: req.user.schoolId, deletedAt: null },
        include: { _count: { select: { documents: true, children: true } } }
    });

    if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Move contents to parent folder or root
    await prisma.$transaction([
        prisma.document.updateMany({
            where: { folderId: req.params.id, deletedAt: null },
            data: { folderId: folder.parentId }
        }),
        prisma.documentFolder.updateMany({
            where: { parentId: req.params.id, deletedAt: null },
            data: { parentId: folder.parentId }
        }),
        prisma.documentFolder.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        })
    ]);

    res.json({
        success: true,
        message: 'Folder deleted. Contents moved to parent folder.'
    });
}));

/**
 * @route   POST /api/folders/:id/move-documents
 * @desc    Move documents into a folder
 * @access  Private (Admin/Principal/Lab Assistant/Instructor)
 */
router.post('/:id/move-documents', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    const { documentIds } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Document IDs required' });
    }

    // Validate target folder (null = root)
    const targetFolderId = req.params.id === 'root' ? null : req.params.id;
    if (targetFolderId) {
        const folder = await prisma.documentFolder.findFirst({
            where: { id: targetFolderId, schoolId: req.user.schoolId, deletedAt: null }
        });
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Target folder not found' });
        }
    }

    const result = await prisma.document.updateMany({
        where: {
            id: { in: documentIds },
            schoolId: req.user.schoolId,
            deletedAt: null
        },
        data: { folderId: targetFolderId }
    });

    res.json({
        success: true,
        message: `Moved ${result.count} document(s)`,
        data: { movedCount: result.count }
    });
}));

/**
 * @route   POST /api/folders/:id/copy
 * @desc    Copy a folder and its contents to a target folder
 * @access  Private (Admin/Principal/Lab Assistant/Instructor)
 */
router.post('/:id/copy', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    const { targetFolderId } = req.body;
    const sourceFolderId = req.params.id;

    // Get source folder
    const sourceFolder = await prisma.documentFolder.findFirst({
        where: { id: sourceFolderId, schoolId: req.user.schoolId, deletedAt: null }
    });

    if (!sourceFolder) {
        return res.status(404).json({ success: false, message: 'Source folder not found' });
    }

    // Validate target (null = root)
    const targetId = targetFolderId === 'root' ? null : targetFolderId;
    if (targetId) {
        const targetFolder = await prisma.documentFolder.findFirst({
            where: { id: targetId, schoolId: req.user.schoolId, deletedAt: null }
        });
        if (!targetFolder) {
            return res.status(404).json({ success: false, message: 'Target folder not found' });
        }
        // Prevent copying into itself or its descendants
        if (targetId === sourceFolderId) {
            return res.status(400).json({ success: false, message: 'Cannot copy folder into itself' });
        }
    }

    // Recursive copy function
    const copyFolder = async (folderId, newParentId) => {
        const folder = await prisma.documentFolder.findUnique({ where: { id: folderId } });
        if (!folder) return null;

        // Create new folder
        const newFolder = await prisma.documentFolder.create({
            data: {
                schoolId: req.user.schoolId,
                createdById: req.user.id,
                name: `${folder.name} (Copy)`,
                parentId: newParentId
            }
        });

        // Copy documents in this folder
        const documents = await prisma.document.findMany({
            where: { folderId: folder.id, deletedAt: null }
        });

        for (const doc of documents) {
            await prisma.document.create({
                data: {
                    schoolId: req.user.schoolId,
                    folderId: newFolder.id,
                    name: doc.name,
                    description: doc.description,
                    fileType: doc.fileType,
                    fileSize: doc.fileSize,
                    url: doc.url,
                    publicId: doc.publicId,
                    category: doc.category,
                    isPublic: doc.isPublic,
                    uploadedById: req.user.id
                }
            });
        }

        // Recursively copy child folders
        const childFolders = await prisma.documentFolder.findMany({
            where: { parentId: folder.id, deletedAt: null }
        });

        for (const child of childFolders) {
            await copyFolder(child.id, newFolder.id);
        }

        return newFolder;
    };

    const copiedFolder = await copyFolder(sourceFolderId, targetId);

    res.json({
        success: true,
        message: 'Folder copied successfully',
        data: { folder: copiedFolder }
    });
}));

/**
 * @route   POST /api/folders/bulk-move
 * @desc    Move multiple folders to a target folder
 * @access  Private (Admin/Principal/Lab Assistant/Instructor)
 */
router.post('/bulk-move', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    const { folderIds, targetFolderId } = req.body;

    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Folder IDs required' });
    }

    const targetId = targetFolderId === 'root' ? null : targetFolderId;

    // Validate target folder
    if (targetId) {
        const targetFolder = await prisma.documentFolder.findFirst({
            where: { id: targetId, schoolId: req.user.schoolId, deletedAt: null }
        });
        if (!targetFolder) {
            return res.status(404).json({ success: false, message: 'Target folder not found' });
        }
    }

    // Move each folder (skip if trying to move into itself or its descendants)
    let movedCount = 0;
    for (const folderId of folderIds) {
        // Skip if trying to move to itself
        if (folderId === targetId) continue;

        // Check for circular reference
        let isDescendant = false;
        let checkId = targetId;
        while (checkId) {
            const checkFolder = await prisma.documentFolder.findUnique({
                where: { id: checkId },
                select: { parentId: true }
            });
            if (checkFolder?.parentId === folderId) {
                isDescendant = true;
                break;
            }
            checkId = checkFolder?.parentId;
        }

        if (isDescendant) continue;

        await prisma.documentFolder.update({
            where: { id: folderId },
            data: { parentId: targetId }
        });
        movedCount++;
    }

    res.json({
        success: true,
        message: `Moved ${movedCount} folder(s)`,
        data: { movedCount }
    });
}));

module.exports = router;
