const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const isValidUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

// ============================================================
// VENDOR MANAGEMENT
// ============================================================

/**
 * @route   GET /api/procurement/vendors
 * @desc    Get all vendors
 */
router.get('/vendors', authenticate, asyncHandler(async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'Your user profile is not associated with an institution. Please contact the administrator.'
            });
        }
        console.log('Fetching vendors for schoolId:', schoolId);
        const vendors = await prisma.vendor.findMany({
            where: { schoolId },
            include: {
                approvedItems: {
                    select: {
                        id: true,
                        quantity: true,
                        approvedUnitPrice: true,
                        requestId: true,
                        request: {
                            select: {
                                id: true,
                                title: true,
                                status: true
                            }
                        }
                    }
                },
                quotations: {
                    select: {
                        id: true,
                        totalAmount: true,
                        requestId: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Compute financial cost per vendor safely
        const vendorsWithFinancials = vendors.map(v => {
            const totalCost = (v.approvedItems || []).reduce((sum, item) => {
                const price = parseFloat(item.approvedUnitPrice || 0) || 0;
                const qty = parseInt(item.quantity || 1) || 1;
                return sum + (price * qty);
            }, 0);
            return {
                ...v,
                totalCost,
                approvedItemsCount: v.approvedItems?.length || 0,
                quotationsCount: v.quotations?.length || 0
            };
        });

        console.log('Found vendors:', vendors.length);
        res.json({ success: true, data: vendorsWithFinancials });
    } catch (error) {
        console.error('GET vendors error:', error);
        res.status(500).json({ success: false, message: 'Failed to load vendors: ' + error.message, error: error.message });
    }
}));

/**
 * @route   POST /api/procurement/vendors
 * @desc    Create a vendor
 */
router.post('/vendors', authenticate, authorize('admin', 'principal', 'lab_assistant'), asyncHandler(async (req, res) => {
    try {
        const { name, contactPerson, email, phone, address, gstin, isLocal } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }

        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'Your user account is not associated with an institution. Cannot create vendor without valid school.'
            });
        }

        console.log('Creating vendor for schoolId:', schoolId, { name: name.trim(), contactPerson, email, phone, address, gstin, isLocal });
        const vendor = await prisma.vendor.create({
            data: {
                name: name.trim(),
                contactPerson: contactPerson?.trim() || null,
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                gstin: gstin?.trim() || null,
                isLocal: Boolean(isLocal),
                schoolId
            }
        });
        res.status(201).json({ success: true, data: vendor, message: 'Vendor created successfully' });
    } catch (error) {
        console.error('Vendor create error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create vendor',
            error: error.message,
            code: error.code,
            meta: error.meta
        });
    }
}));

/**
 * @route   PUT /api/procurement/vendors/:id
 * @desc    Update a vendor
 */
router.put('/vendors/:id', authenticate, authorize('admin', 'principal', 'lab_assistant'), asyncHandler(async (req, res) => {
    try {
        const { name, contactPerson, email, phone, address, gstin, isLocal } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Vendor name is required' });
        }
        console.log('Updating vendor:', req.params.id, { name: name.trim(), contactPerson, email, phone, address, gstin, isLocal });
        const vendor = await prisma.vendor.update({
            where: { id: req.params.id },
            data: {
                name: name.trim(),
                contactPerson: contactPerson?.trim() || null,
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                gstin: gstin?.trim() || null,
                isLocal: Boolean(isLocal)
            }
        });
        res.json({ success: true, data: vendor, message: 'Vendor updated successfully' });
    } catch (error) {
        console.error('Vendor update error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update vendor',
            error: error.message,
            code: error.code,
            meta: error.meta
        });
    }
}));

/**
 * @route   DELETE /api/procurement/vendors/:id
 * @desc    Delete a vendor
 */
router.delete('/vendors/:id', authenticate, authorize('admin', 'principal', 'lab_assistant'), asyncHandler(async (req, res) => {
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Vendor deleted' });
}));

// ============================================================
// PROCUREMENT REQUESTS
// ============================================================

/**
 * @route   GET /api/procurement/requests
 * @desc    Get all procurement requests
 */
router.get('/requests', authenticate, asyncHandler(async (req, res) => {
    const { status, academicYearId, all } = req.query;
    const rawSessionId = (all === 'true' || req.isAllSessions) ? null : (academicYearId || req.headers['x-academic-session']);
    const sessionId = isValidUuid(rawSessionId) ? rawSessionId : null;
    const where = { schoolId: req.user.schoolId };
    if (status) where.status = status;
    if (sessionId) where.academicYearId = sessionId;

    try {
        console.log('Fetching requests for schoolId:', req.user.schoolId, 'sessionId:', sessionId);
        const requests = await prisma.procurementRequest.findMany({
            where,
            include: {
                createdBy: { select: { firstName: true, lastName: true } },
                approvedBy: { select: { firstName: true, lastName: true } },
                items: { select: { id: true, itemName: true, quantity: true, estimatedUnitPrice: true, approvedUnitPrice: true, approvedVendorId: true } },
                quotations: { select: { id: true, vendorId: true, quotationNumber: true, totalAmount: true } },
                academicYear: { select: { id: true, yearLabel: true, isCurrent: true } },
                committee: { select: { id: true, userId: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Found requests:', requests.length);
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('GET requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to load requests', error: error.message });
    }
}));

/**
 * @route   GET /api/procurement/requests/:id
 * @desc    Get procurement request with full details and comparison
 */
router.get('/requests/:id', authenticate, asyncHandler(async (req, res) => {
    const request = await prisma.procurementRequest.findFirst({
        where: { id: req.params.id, schoolId: req.user.schoolId },
        include: {
            createdBy: { select: { firstName: true, lastName: true, email: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
            committee: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } }
                }
            },
            items: {
                include: {
                    approvedVendor: { select: { name: true } },
                    quotationItems: {
                        include: {
                            quotation: {
                                include: { vendor: { select: { id: true, name: true } } }
                            }
                        }
                    }
                }
            },
            quotations: {
                include: {
                    vendor: { select: { id: true, name: true, email: true, phone: true, isLocal: true } },
                    items: true
                }
            },
            school: { select: { name: true, nameHindi: true, address: true, district: true } },
            academicYear: { select: { id: true, yearLabel: true, isCurrent: true, startDate: true, endDate: true } }
        }
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Build comparison matrix
    const comparison = request.items.map(item => {
        const vendorPrices = {};
        let lowestPrice = Infinity;
        let lowestVendorId = null;

        item.quotationItems.forEach(qi => {
            const vendorId = qi.quotation.vendor.id;
            const vendorName = qi.quotation.vendor.name;
            const price = parseFloat(qi.unitPrice);
            vendorPrices[vendorId] = { vendorName, unitPrice: price, quotationItemId: qi.id };
            if (price < lowestPrice) {
                lowestPrice = price;
                lowestVendorId = vendorId;
            }
        });

        return {
            itemId: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
            vendorPrices,
            lowestVendorId,
            lowestPrice: lowestPrice === Infinity ? null : lowestPrice,
            approvedVendorId: item.approvedVendorId,
            approvedUnitPrice: item.approvedUnitPrice
        };
    });

    res.json({ success: true, data: { request, comparison } });
}));

/**
 * @route   POST /api/procurement/requests
 * @desc    Create procurement request with items
 */
router.post('/requests', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    try {
        const { title, description, purpose, department, budgetCode, memoVideNo, items, academicYearId } = req.body;

        // Resolve academic year: explicit body param > X-Academic-Session header > school's current active session
        let resolvedYearId = academicYearId || req.headers['x-academic-session'] || null;
        if (!isValidUuid(resolvedYearId)) {
            resolvedYearId = null;
        }
        if (!resolvedYearId && req.user?.schoolId) {
            const currentYear = await prisma.academicYear.findFirst({
                where: { schoolId: req.user.schoolId, isCurrent: true }
            });
            if (currentYear) resolvedYearId = currentYear.id;
        }

        console.log('Creating request:', { title, purpose, department, itemCount: items?.length, schoolId: req.user.schoolId, academicYearId: resolvedYearId });

        const request = await prisma.procurementRequest.create({
            data: {
                title,
                description,
                purpose,
                department,
                budgetCode,
                memoVideNo,
                status: 'draft',
                createdById: req.user.id,
                schoolId: req.user.schoolId,
                academicYearId: resolvedYearId || null,
                items: {
                    create: items?.map(item => ({
                        itemName: item.itemName,
                        description: item.description,
                        specifications: item.specifications,
                        quantity: item.quantity || 1,
                        unit: item.unit || 'pcs',
                        estimatedUnitPrice: item.estimatedUnitPrice ? parseFloat(item.estimatedUnitPrice) : null
                    })) || []
                }
            },
            include: { items: true, academicYear: { select: { id: true, yearLabel: true } } }
        });

        console.log('Created request:', request.id);
        res.status(201).json({ success: true, data: request, message: 'Procurement request created' });
    } catch (error) {
        console.error('POST /requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to create request', error: error.message, meta: error.meta });
    }
}));

/**
 * @route   PUT /api/procurement/requests/:id
 * @desc    Update procurement request
 */
router.put('/requests/:id', authenticate, asyncHandler(async (req, res) => {
    const { title, description, purpose, department, budgetCode, memoVideNo, proceedingsDate, status } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (purpose !== undefined) updateData.purpose = purpose;
    if (department !== undefined) updateData.department = department;
    if (budgetCode !== undefined) updateData.budgetCode = budgetCode;
    if (memoVideNo !== undefined) updateData.memoVideNo = memoVideNo;
    if (proceedingsDate !== undefined) updateData.proceedingsDate = new Date(proceedingsDate);
    if (status !== undefined) updateData.status = status;


    const request = await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: updateData
    });

    res.json({ success: true, data: request, message: 'Request updated' });
}));

/**
 * @route   PUT /api/procurement/requests/:id/purchase-letter
 * @desc    Upload purchase request letter for Step 1
 */
router.put('/requests/:id/purchase-letter', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { purchaseLetterUrl, purchaseLetterName, letterContent, letterFileName, memoVideNo } = req.body;

    const updateData = {};
    if (purchaseLetterUrl) updateData.purchaseLetterUrl = purchaseLetterUrl;
    if (purchaseLetterName) updateData.purchaseLetterName = purchaseLetterName;
    if (letterContent !== undefined) updateData.letterContent = letterContent;
    if (letterFileName) updateData.purchaseLetterName = letterFileName;
    if (memoVideNo !== undefined) updateData.memoVideNo = memoVideNo;

    const request = await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: updateData
    });

    res.json({ success: true, data: request, message: 'Purchase letter saved' });
}));

/**
 * @route   PUT /api/procurement/requests/:id/save-step
 * @desc    Save current workflow step
 */
router.put('/requests/:id/save-step', authenticate, asyncHandler(async (req, res) => {
    const { currentStep } = req.body;

    const request = await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: { currentStep: parseInt(currentStep) || 1 }
    });

    res.json({ success: true, data: request, message: 'Step saved' });
}));

/**
 * @route   GET /api/procurement/requests/:id/vendor-requirements
 * @desc    Check vendor requirements based on estimated total
 */
router.get('/requests/:id/vendor-requirements', authenticate, asyncHandler(async (req, res) => {
    const request = await prisma.procurementRequest.findFirst({
        where: { id: req.params.id, schoolId: req.user.schoolId },
        include: {
            quotations: {
                include: { vendor: { select: { id: true, name: true, isLocal: true } } }
            }
        }
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const estimatedTotal = parseFloat(request.estimatedTotal) || 0;

    // Determine minimum vendors required
    let minVendors = 3;
    let minLocalVendors = 1;
    if (estimatedTotal >= 100000 && estimatedTotal < 250000) {
        minVendors = 5;
    } else if (estimatedTotal >= 250000) {
        minVendors = 5; // Tender required above 2.5L
    }

    // Get unique vendors with quotations
    const vendorsWithQuotes = [...new Map(request.quotations.map(q => [q.vendor.id, q.vendor])).values()];
    const totalVendors = vendorsWithQuotes.length;
    const localVendors = vendorsWithQuotes.filter(v => v.isLocal).length;

    const meetsRequirements = totalVendors >= minVendors && localVendors >= minLocalVendors;

    res.json({
        success: true,
        data: {
            estimatedTotal,
            minVendors,
            minLocalVendors,
            totalVendors,
            localVendors,
            meetsRequirements,
            message: meetsRequirements
                ? 'Vendor requirements met'
                : `Need ${minVendors} vendors (${minLocalVendors} local). Currently: ${totalVendors} vendors (${localVendors} local)`
        }
    });
}));

/**
 * @route   POST /api/procurement/requests/:id/items
 * @desc    Add item to procurement request
 */
router.post('/requests/:id/items', authenticate, asyncHandler(async (req, res) => {
    const { itemName, description, specifications, warranty, quantity, unit, estimatedUnitPrice } = req.body;

    const item = await prisma.procurementItem.create({
        data: {
            requestId: req.params.id,
            itemName,
            description,
            specifications,
            warranty: warranty || null,
            quantity: quantity ? parseInt(quantity) : 1,
            unit: unit || 'pcs',
            estimatedUnitPrice: estimatedUnitPrice ? parseFloat(estimatedUnitPrice) : null
        }
    });

    res.status(201).json({ success: true, data: item, message: 'Item added' });
}));

/**
 * @route   PUT /api/procurement/requests/:id/items/:itemId
 * @desc    Update item in procurement request
 */
router.put('/requests/:id/items/:itemId', authenticate, asyncHandler(async (req, res) => {
    const { itemName, description, specifications, warranty, quantity, unit, estimatedUnitPrice } = req.body;

    const item = await prisma.procurementItem.update({
        where: { id: req.params.itemId },
        data: {
            itemName,
            description,
            specifications,
            warranty: warranty || null,
            quantity: quantity ? parseInt(quantity) : 1,
            unit: unit || 'pcs',
            estimatedUnitPrice: estimatedUnitPrice ? parseFloat(estimatedUnitPrice) : null
        }
    });

    res.json({ success: true, data: item, message: 'Item updated' });
}));

/**
 * @route   DELETE /api/procurement/requests/:id/items/:itemId
 * @desc    Remove item from procurement request
 */
router.delete('/requests/:id/items/:itemId', authenticate, asyncHandler(async (req, res) => {
    await prisma.procurementItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true, message: 'Item removed' });
}));

// ============================================================
// VENDOR QUOTATIONS
// ============================================================

/**
 * @route   POST /api/procurement/requests/:id/quotations
 * @desc    Add vendor quotation with item prices
 */
router.post('/requests/:id/quotations', authenticate, asyncHandler(async (req, res) => {
    const { vendorId, quotationNumber, quotationDate, validUntil, documentUrl, terms, remarks, items } = req.body;

    // Calculate total
    let totalAmount = 0;
    if (items) {
        items.forEach(item => {
            totalAmount += (parseFloat(item.unitPrice) || 0) * (item.quantity || 1);
        });
    }

    // Check if quotation for this vendor already exists
    const existing = await prisma.vendorQuotation.findFirst({
        where: { requestId: req.params.id, vendorId }
    });

    if (existing) {
        const quotation = await prisma.vendorQuotation.update({
            where: { id: existing.id },
            data: {
                quotationNumber: quotationNumber || existing.quotationNumber,
                quotationDate: quotationDate ? new Date(quotationDate) : existing.quotationDate,
                validUntil: validUntil ? new Date(validUntil) : existing.validUntil,
                documentUrl: documentUrl || existing.documentUrl,
                totalAmount: totalAmount || existing.totalAmount,
                terms: terms !== undefined ? terms : existing.terms,
                remarks: remarks !== undefined ? remarks : existing.remarks,
                ...(items && items.length > 0 ? {
                    items: {
                        deleteMany: {},
                        create: items.map(item => ({
                            procurementItemId: item.procurementItemId,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            totalPrice: (parseFloat(item.unitPrice) || 0) * (item.quantity || 1),
                            remarks: item.remarks
                        }))
                    }
                } : {})
            },
            include: { vendor: { select: { name: true } }, items: true }
        });
        return res.json({ success: true, data: quotation, message: 'Quotation updated' });
    }

    const quotation = await prisma.vendorQuotation.create({
        data: {
            requestId: req.params.id,
            vendorId,
            quotationNumber,
            quotationDate: quotationDate ? new Date(quotationDate) : null,
            validUntil: validUntil ? new Date(validUntil) : null,
            documentUrl,
            totalAmount,
            terms,
            remarks,
            items: {
                create: items?.map(item => ({
                    procurementItemId: item.procurementItemId,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    totalPrice: (parseFloat(item.unitPrice) || 0) * (item.quantity || 1),
                    remarks: item.remarks
                })) || []
            }
        },
        include: { vendor: { select: { name: true } }, items: true }
    });

    // Update request status
    await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: { status: 'quotes_received' }
    });

    res.status(201).json({ success: true, data: quotation, message: 'Quotation added' });
}));

/**
 * @route   PUT /api/procurement/requests/:id/quotations/:quotationId
 * @desc    Update quotation details, quotation number, and item prices
 */
router.put('/requests/:id/quotations/:quotationId', authenticate, asyncHandler(async (req, res) => {
    const { quotationNumber, quotationDate, validUntil, documentUrl, terms, remarks, items } = req.body;

    let totalAmount = undefined;
    if (items) {
        totalAmount = 0;
        items.forEach(item => {
            totalAmount += (parseFloat(item.unitPrice) || 0) * (item.quantity || 1);
        });
    }

    const updateData = {};
    if (quotationNumber !== undefined) updateData.quotationNumber = quotationNumber;
    if (quotationDate !== undefined) updateData.quotationDate = quotationDate ? new Date(quotationDate) : null;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
    if (documentUrl !== undefined) updateData.documentUrl = documentUrl;
    if (terms !== undefined) updateData.terms = terms;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;

    if (items && Array.isArray(items)) {
        updateData.items = {
            deleteMany: {},
            create: items.map(item => ({
                procurementItemId: item.procurementItemId,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                totalPrice: (parseFloat(item.unitPrice) || 0) * (item.quantity || 1),
                remarks: item.remarks
            }))
        };
    }

    const quotation = await prisma.vendorQuotation.update({
        where: { id: req.params.quotationId },
        data: updateData,
        include: { vendor: { select: { name: true } }, items: true }
    });

    res.json({ success: true, data: quotation, message: 'Quotation updated successfully' });
}));

/**
 * @route   POST /api/procurement/requests/:id/approve
 * @desc    Approve procurement with selected vendors and quantities
 */
router.post('/requests/:id/approve', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { approvedItems, approvedTotal: customApprovedTotal } = req.body; // [{itemId, vendorId, unitPrice, quantity}]

    for (const item of approvedItems) {
        await prisma.procurementItem.update({
            where: { id: item.itemId },
            data: {
                approvedVendorId: item.vendorId,
                approvedUnitPrice: item.unitPrice,
                quantity: item.quantity
            }
        });
    }

    const updateData = {
        status: 'approved',
        approvedById: req.user.id,
        approvedAt: new Date()
    };

    if (customApprovedTotal !== undefined && customApprovedTotal !== null) {
        const parsedCustomTotal = parseFloat(customApprovedTotal);
        if (!isNaN(parsedCustomTotal)) {
            updateData.approvedTotal = parsedCustomTotal;
        }
    }

    const request = await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: updateData
    });

    res.json({ success: true, data: request, message: 'Procurement approved' });
}));

/**
 * @route   GET /api/procurement/requests/:id/print
 * @desc    Get data for printable comparative statement
 */
router.get('/requests/:id/print', authenticate, asyncHandler(async (req, res) => {
    const request = await prisma.procurementRequest.findFirst({
        where: { id: req.params.id, schoolId: req.user.schoolId },
        include: {
            createdBy: { select: { firstName: true, lastName: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
            items: {
                include: {
                    approvedVendor: true,
                    quotationItems: {
                        include: {
                            quotation: { include: { vendor: true } }
                        }
                    }
                }
            },
            quotations: { include: { vendor: true } }
        }
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Get unique vendors
    const vendors = request.quotations.map(q => q.vendor);

    res.json({ success: true, data: { request, vendors } });
}));

// ============================================================
// COMMITTEE MANAGEMENT
// ============================================================

/**
 * @route   GET /api/procurement/staff
 * @desc    Get staff members for committee selection
 */
router.get('/staff', authenticate, asyncHandler(async (req, res) => {
    try {
        console.log('Fetching staff for schoolId:', req.user.schoolId);
        const staff = await prisma.user.findMany({
            where: {
                schoolId: req.user.schoolId,
                role: { in: ['admin', 'principal', 'instructor', 'lab_assistant'] }
            },
            select: { id: true, firstName: true, lastName: true, role: true, email: true }
        });
        console.log('Found staff:', staff.length);
        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('GET /staff error:', error);
        res.status(500).json({ success: false, message: 'Failed to load staff', error: error.message });
    }
}));

/**
 * @route   POST /api/procurement/requests/:id/committee
 * @desc    Add committee member to procurement
 */
router.post('/requests/:id/committee', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { userId, role, designation } = req.body;

    // Check committee size (max 5)
    const existingCount = await prisma.procurementCommittee.count({
        where: { requestId: req.params.id }
    });
    if (existingCount >= 5) {
        return res.status(400).json({ success: false, message: 'Maximum 5 committee members allowed' });
    }

    const member = await prisma.procurementCommittee.create({
        data: {
            requestId: req.params.id,
            userId,
            role: role || 'member',
            designation
        },
        include: { user: { select: { firstName: true, lastName: true, role: true } } }
    });

    res.status(201).json({ success: true, data: member, message: 'Committee member added' });
}));

/**
 * @route   DELETE /api/procurement/requests/:id/committee/:memberId
 * @desc    Remove committee member
 */
router.delete('/requests/:id/committee/:memberId', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    await prisma.procurementCommittee.delete({ where: { id: req.params.memberId } });
    res.json({ success: true, message: 'Committee member removed' });
}));

// ============================================================
// COMBINED PDF PREVIEW DATA
// ============================================================

/**
 * @route   GET /api/procurement/requests/:id/preview
 * @desc    Get all data for combined PDF preview
 */
router.get('/requests/:id/preview', authenticate, asyncHandler(async (req, res) => {
    // Get school with letterhead and contact details
    let school = req.user?.schoolId ? await prisma.school.findFirst({
        where: { id: req.user.schoolId },
        select: {
            name: true,
            address: true,
            letterheadUrl: true,
            logoUrl: true,
            pinCode: true,
            email: true,
            phone1: true,
            phone2: true
        }
    }) : null;

    if (!school) {
        school = await prisma.school.findFirst({
            select: {
                name: true,
                address: true,
                letterheadUrl: true,
                logoUrl: true,
                pinCode: true,
                email: true,
                phone1: true,
                phone2: true
            }
        });
    }

    // Get request with all details
    const request = await prisma.procurementRequest.findFirst({
        where: { id: req.params.id, ...(req.user?.schoolId ? { schoolId: req.user.schoolId } : {}) },
        include: {
            createdBy: { select: { firstName: true, lastName: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
            committee: {
                include: { user: { select: { firstName: true, lastName: true, role: true } } }
            },
            items: {
                include: {
                    approvedVendor: { select: { name: true } },
                    quotationItems: {
                        include: {
                            quotation: { include: { vendor: { select: { id: true, name: true } } } }
                        }
                    }
                }
            },
            quotations: {
                include: {
                    vendor: { select: { id: true, name: true, contactPerson: true, email: true, phone: true, address: true, gstin: true } }
                }
            }
        }
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Build comparison matrix
    const comparison = request.items.map(item => {
        const vendorPrices = {};
        let lowestPrice = Infinity;
        let lowestVendorId = null;

        item.quotationItems.forEach(qi => {
            const vendorId = qi.quotation.vendor.id;
            const vendorName = qi.quotation.vendor.name;
            const price = parseFloat(qi.unitPrice);
            vendorPrices[vendorId] = { vendorName, unitPrice: price };
            if (price < lowestPrice) {
                lowestPrice = price;
                lowestVendorId = vendorId;
            }
        });

        return {
            itemId: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
            vendorPrices,
            lowestVendorId,
            lowestPrice: lowestPrice === Infinity ? null : lowestPrice,
            approvedVendorId: item.approvedVendorId,
            approvedUnitPrice: parseFloat(item.approvedUnitPrice) || null
        };
    });

    // Calculate totals
    const totalApproved = request.items.reduce((sum, item) => {
        return sum + ((parseFloat(item.approvedUnitPrice) || 0) * item.quantity);
    }, 0);

    const vendors = request.quotations.map(q => q.vendor);

    // Fetch loan vouchers generated for this procurement request
    const voucherNotes = await prisma.adminNote.findMany({
        where: {
            category: 'classroom_loan_voucher',
            content: { contains: req.params.id }
        },
        orderBy: { createdAt: 'asc' }
    });

    const vouchers = voucherNotes.map(n => {
        try {
            return { id: n.id, ...JSON.parse(n.content) };
        } catch {
            return null;
        }
    }).filter(Boolean);

    res.json({
        success: true,
        data: {
            school,
            request,
            comparison,
            vendors,
            totalApproved,
            committee: request.committee,
            vouchers
        }
    });
}));

// ============================================================
// PROCUREMENT FLOW STAGES
// ============================================================

/**
 * @route   PUT /api/procurement/requests/:id/order
 * @desc    Mark as ordered with PO details
 */
router.put('/requests/:id/order', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { poNumber, poUrl } = req.body;

    const request = await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: {
            status: 'ordered',
            orderedAt: new Date(),
            poNumber,
            poUrl
        }
    });

    res.json({ success: true, data: request, message: 'Marked as ordered' });
}));

/**
 * @route   PUT /api/procurement/requests/:id/bill
 * @desc    Add bill details from vendor
 */
router.put('/requests/:id/bill', authenticate, asyncHandler(async (req, res) => {
    console.log('=== BILL SAVE REQUEST ===');
    console.log('RequestId:', req.params.id);
    console.log('Body:', JSON.stringify(req.body));

    try {
        const { billNumber, billDate, billAmount } = req.body;

        const updateData = {
            status: 'billed',
            billNumber: billNumber || null,
            billDate: billDate ? new Date(billDate) : null
            // Note: billUrl is set separately via upload endpoint
        };

        // Only add billAmount if it's a valid number
        if (billAmount !== undefined && billAmount !== null) {
            updateData.billAmount = parseFloat(billAmount) || null;
        }

        console.log('UpdateData:', JSON.stringify(updateData));

        const request = await prisma.procurementRequest.update({
            where: { id: req.params.id },
            data: updateData
        });

        console.log('Bill saved successfully');
        res.json({ success: true, data: request, message: 'Bill added' });
    } catch (error) {
        console.error('=== BILL SAVE ERROR ===');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('Stack:', error.stack);
        console.error('========================');
        throw error;
    }
}));

/**
 * @route   PUT /api/procurement/requests/:id/payment
 * @desc    Add payment details
 */
/**
 * @route   PUT /api/procurement/requests/:id/payment
 * @desc    Add payment details
 */
router.put('/requests/:id/payment', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    console.log('=== PAYMENT SAVE REQUEST ===');
    console.log('RequestId:', req.params.id);
    console.log('Body:', JSON.stringify(req.body));

    try {
        const { paymentMethod, chequeNumber, paymentDate, paymentReference } = req.body;

        const updateData = {
            status: 'paid',
            paymentMethod: paymentMethod || null,
            chequeNumber: chequeNumber || null,
            // Note: chequeUrl is set separately via upload endpoint
            paymentDate: paymentDate ? new Date(paymentDate) : null,
            paymentReference: paymentReference || null
        };

        console.log('UpdateData:', JSON.stringify(updateData));

        const request = await prisma.procurementRequest.update({
            where: { id: req.params.id },
            data: updateData
        });

        console.log('Payment recorded successfully');
        res.json({ success: true, data: request, message: 'Payment recorded' });
    } catch (error) {
        console.error('=== PAYMENT SAVE ERROR ===');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('Stack:', error.stack);
        console.error('==========================');
        throw error;
    }
}));

/**
 * @route   PUT /api/procurement/requests/:id/receive
 * @desc    Mark items as received with optional video
 */
router.put('/requests/:id/receive', authenticate, asyncHandler(async (req, res) => {
    const { receivedItems, receivingVideoUrl, receivingNotes } = req.body;

    console.log('=== RECEIVE ITEMS REQUEST ===');
    console.log('RequestId:', req.params.id);
    console.log('ReceivedItems:', JSON.stringify(receivedItems));
    console.log('Available Statuses:', JSON.stringify(prisma.ProcurementStatus)); // DEBUG LOG
    console.log('==============================');

    // Update each item's received quantity and serial numbers
    if (receivedItems && typeof receivedItems === 'object') {
        for (const [itemId, data] of Object.entries(receivedItems)) {
            try {
                await prisma.procurementItem.update({
                    where: { id: itemId },
                    data: {
                        receivedQty: data.received || 0,
                        isReceived: (data.received || 0) > 0,
                        serialNumbers: data.serialNumbers || [],
                        receivedAt: new Date(),
                        receivedById: req.user.id
                    }
                });
            } catch (itemErr) {
                console.error(`Failed to update item ${itemId}:`, itemErr.message);
            }
        }
    }

    const request = await prisma.procurementRequest.update({
        where: { id: req.params.id },
        data: {
            status: 'received',
            receivedAt: new Date(),
            receivedById: req.user.id,
            receivingVideoUrl,
            receivingNotes
        }
    });

    res.json({ success: true, data: request, message: 'Marked as received' });
}));

/**
 * @route   POST /api/procurement/requests/:id/items/:itemId/receive
 * @desc    Receive individual item and optionally create inventory entry
 */
router.post('/requests/:id/items/:itemId/receive', authenticate, asyncHandler(async (req, res) => {
    const { receivedQty, addToInventory, labId, serialNo, barcode } = req.body;

    let inventoryItemId = null;

    // Get the procurement item
    const procItem = await prisma.procurementItem.findFirst({
        where: { id: req.params.itemId, requestId: req.params.id },
        include: { request: true }
    });

    if (!procItem) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Create inventory item if requested
    if (addToInventory && labId) {
        const itemType = procItem.itemName.toLowerCase().includes('chair') ? 'chair' :
            procItem.itemName.toLowerCase().includes('table') ? 'table' :
                procItem.itemName.toLowerCase().includes('pc') ? 'pc' : 'other';
        const itemNumber = barcode || serialNo || `PROC-${procItem.id.substring(0, 8)}`;

        const inventoryItem = await prisma.labItem.create({
            data: {
                labId,
                schoolId: procItem.request.schoolId,
                itemType,
                itemNumber,
                serialNo: serialNo || barcode,
                brand: procItem.specifications?.split(' ')[0] || null,
                status: 'active',
                notes: `Added from procurement: ${procItem.request.title}`,
                purchaseDate: new Date(),
                quantity: receivedQty || procItem.quantity
            }
        });
        inventoryItemId = inventoryItem.id;

        // Log procurement item addition to lab event history
        await prisma.labEventHistory.create({
            data: {
                labId,
                eventType: 'procurement_received',
                description: `Received from procurement: ${procItem.itemName} (Qty: ${receivedQty || procItem.quantity})`,
                itemId: inventoryItem.id,
                itemDetails: {
                    itemType,
                    itemNumber,
                    brand: procItem.specifications?.split(' ')[0] || null,
                    serialNo: serialNo || barcode,
                    quantity: receivedQty || procItem.quantity,
                    procurementItemName: procItem.itemName
                },
                procurementRequestId: req.params.id,
                procurementItemId: req.params.itemId,
                performedById: req.user.id
            }
        });
        console.log(`[Procurement] Logged item addition to lab: ${itemNumber}`);
    }

    // Update procurement item
    const item = await prisma.procurementItem.update({
        where: { id: req.params.itemId },
        data: {
            isReceived: true,
            receivedQty: receivedQty || procItem.quantity,
            inventoryItemId
        }
    });

    // Check if all items received
    const allItems = await prisma.procurementItem.findMany({
        where: { requestId: req.params.id }
    });
    const allReceived = allItems.every(i => i.isReceived);

    if (allReceived) {
        await prisma.procurementRequest.update({
            where: { id: req.params.id },
            data: { status: 'completed' }
        });
    }

    res.json({
        success: true,
        data: { item, inventoryItemId },
        message: addToInventory ? 'Item received and added to inventory' : 'Item received'
    });
}));

/**
 * @route   GET /api/procurement/labs
 * @desc    Get labs for inventory destination selection
 */
router.get('/labs', authenticate, asyncHandler(async (req, res) => {
    const labs = await prisma.lab.findMany({
        where: { schoolId: req.user.schoolId },
        select: { id: true, name: true, roomNumber: true }
    });
    res.json({ success: true, data: labs });
}));

/**
 * @route   POST /api/procurement/requests/:id/email-call-quotation
 * @desc    Send Call for Quotation email to a vendor
 */
router.post('/requests/:id/email-call-quotation', authenticate, asyncHandler(async (req, res) => {
    const { vendorId, recipientEmail, deadlineDate, customNotes } = req.body;
    const emailService = require('../services/email.service');

    const request = await prisma.procurementRequest.findUnique({
        where: { id: req.params.id },
        include: {
            items: true,
            school: true,
            committee: { include: { user: true } }
        }
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Procurement request not found' });
    }

    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId }
    });

    if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const toEmail = recipientEmail || vendor.email;
    if (!toEmail) {
        return res.status(400).json({ success: false, message: 'Vendor email address is required' });
    }

    const formattedDeadline = deadlineDate ? new Date(deadlineDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 days from today';

    const itemsHtml = request.items.map((item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px; font-weight: 600;">${item.itemName}</td>
            <td style="padding: 8px;">${item.specifications || '-'}</td>
            <td style="padding: 8px;">${item.warranty || 'Standard'}</td>
            <td style="padding: 8px; text-align: center;">${item.quantity} ${item.unit || 'pcs'}</td>
        </tr>
    `).join('');

    const emailSubject = `Call for Quotation: ${request.title} - ${request.school.name}`;
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; margin: 0 0 6px 0;">${request.school.name}</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">${request.school.address || ''}</p>
        </div>

        <p style="font-size: 14px; color: #334155;"><strong>To:</strong> ${vendor.name}</p>
        <p style="font-size: 14px; color: #334155;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        <p style="font-size: 14px; color: #334155;"><strong>Subject:</strong> Invitation for Quotation — ${request.title}</p>

        <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Dear Sir/Madam,<br/><br/>
            You are cordially invited to submit your competitive quotation for the institutional procurement requirement detailed below:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <thead>
                <tr style="background: #f1f5f9; color: #1e293b; text-align: left;">
                    <th style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">#</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1;">Item Name</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1;">Specifications</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1;">Warranty</th>
                    <th style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">Qty</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; margin: 16px 0; font-size: 13px; color: #334155;">
            <p style="margin: 0 0 6px 0;"><strong>Last Date for Submission of Quotation:</strong> <span style="color: #b91c1c; font-weight: bold;">${formattedDeadline}</span></p>
            ${customNotes ? `<p style="margin: 6px 0 0 0;"><strong>Additional Note:</strong> ${customNotes}</p>` : ''}
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin-top: 24px;">
            Please ensure the quotation includes GST rates, warranty terms, and estimated delivery timeline. Quotations may be mailed to ${request.school.email || 'the institution'} or submitted in a sealed envelope.
        </p>

        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: right;">
            <p style="font-size: 13px; font-weight: bold; color: #1e293b; margin: 0;">Authorized Signatory</p>
            <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">${request.school.name}</p>
        </div>
    </div>
    `;

    const result = await emailService.sendGenericEmail({
        to: toEmail,
        subject: emailSubject,
        html: emailHtml
    });

    res.json({
        success: true,
        data: result,
        message: `Call for Quotation sent to ${toEmail}`
    });
}));

/**
 * @route   POST /api/procurement/requests/:id/classroom-issuance
 * @desc    Enter procured hardware to respective classrooms/labs and generate loan vouchers
 * @access  Private (Admin/Principal/Lab Assistant)
 */
router.post('/requests/:id/classroom-issuance', authenticate, authorize('admin', 'principal', 'lab_assistant'), asyncHandler(async (req, res) => {
    const { issuances } = req.body;
    const requestId = req.params.id;

    const request = await prisma.procurementRequest.findUnique({
        where: { id: requestId },
        include: { academicYear: { select: { yearLabel: true } } }
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Procurement request not found' });
    }

    const sessionLabel = request.academicYear?.yearLabel || '2026-27';
    const createdVouchers = [];

    if (Array.isArray(issuances) && issuances.length > 0) {
        for (const iss of issuances) {
            if (!iss.roomNumber) continue;

            const voucherData = {
                roomNumber: String(iss.roomNumber),
                classSection: iss.classSection || `Room ${iss.roomNumber}`,
                staffName: iss.staffName || 'Class Incharge',
                staffDesignation: iss.staffDesignation || 'Class Incharge / PGT',
                academicSession: sessionLabel,
                dateStr: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
                items: (iss.items || []).map((it, idx) => ({
                    sNo: idx + 1,
                    nomenclature: it.nomenclature || it.itemName || 'Hardware Equipment',
                    serialNo: it.serialNo || '-',
                    quantity: it.quantity || 1,
                    remarks: it.remarks || `Procured via ${request.title}`
                })),
                issuerSign: 'Lab Incharge',
                headOfSchoolSign: 'Principal',
                receiverSign: iss.staffName || 'Class Incharge',
                procurementRequestId: requestId,
                conditions: [
                    'The Receiver is fully responsible for the physical safety and proper operation of the issued hardware.',
                    'Any loss, damage, or technical fault must be reported to the issuing authority immediately.',
                    'The hardware must be used solely for the official or stated purpose of this loan.',
                    'The item must be returned on the due date or upon immediate demand by the issuing authority.'
                ]
            };

            const note = await prisma.adminNote.create({
                data: {
                    authorId: req.user.id,
                    title: `Classroom Loan Voucher - Room ${iss.roomNumber} (${iss.classSection || ''})`,
                    category: 'classroom_loan_voucher',
                    content: JSON.stringify(voucherData),
                    isPinned: false
                }
            });

            createdVouchers.push({ id: note.id, ...voucherData });
        }
    }

    // Mark request as completed
    await prisma.procurementRequest.update({
        where: { id: requestId },
        data: {
            status: 'completed',
            currentStep: 12
        }
    });

    res.json({
        success: true,
        data: { vouchers: createdVouchers },
        message: `Successfully issued hardware to ${createdVouchers.length} classroom(s)`
    });
}));

module.exports = router;

