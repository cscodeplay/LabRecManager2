import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { neon } from '@neondatabase/serverless';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sql = neon(process.env.MERIT_DATABASE_URL || process.env.MERIT_DIRECT_URL || '');

// GET: Return stored generated_pdf_url
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || !['admin', 'superadmin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const result = await sql`SELECT generated_pdf_url FROM exams WHERE id = ${id}`;
        if (result.length === 0) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            generatedPdfUrl: result[0].generated_pdf_url || null,
        });
    } catch (error: any) {
        console.error('Error fetching paper PDF:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Upload PDF blob to Cloudinary and save URL
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || !['admin', 'superadmin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert to base64 data URI
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Data = buffer.toString('base64');
        const dataUri = `data:application/pdf;base64,${base64Data}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'merit-entrance/exam-papers',
            resource_type: 'raw',
            public_id: `exam-${id}-${Date.now()}`,
            timeout: 120000,
        });

        // Store URL in exam record
        await sql`UPDATE exams SET generated_pdf_url = ${result.secure_url} WHERE id = ${id}`;

        return NextResponse.json({
            success: true,
            url: result.secure_url,
        });
    } catch (error: any) {
        console.error('Error uploading exam paper PDF:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Clear stored URL (force regeneration)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || !['admin', 'superadmin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        await sql`UPDATE exams SET generated_pdf_url = NULL WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error clearing paper PDF:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
