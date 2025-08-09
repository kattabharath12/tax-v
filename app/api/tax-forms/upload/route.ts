
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { DocumentType, ProcessingStatus } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

function detectDocumentType(fileName: string, fileContent?: string): DocumentType {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('1099-nec') || lowerName.includes('1099nec')) {
    return 'FORM_1099_NEC';
  } else if (lowerName.includes('1099-int') || lowerName.includes('1099int')) {
    return 'FORM_1099_INT';
  } else if (lowerName.includes('1099-div') || lowerName.includes('1099div')) {
    return 'FORM_1099_DIV';
  } else if (lowerName.includes('1099-misc') || lowerName.includes('1099misc')) {
    return 'FORM_1099_MISC';
  } else if (lowerName.includes('1099-r') || lowerName.includes('1099r')) {
    return 'FORM_1099_R';
  } else if (lowerName.includes('1099-g') || lowerName.includes('1099g')) {
    return 'FORM_1099_G';
  } else if (lowerName.includes('w2') || lowerName.includes('w-2')) {
    return 'W2';
  }
  
  return 'OTHER_TAX_DOCUMENT';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const taxReturnId = formData.get('taxReturnId') as string;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    if (!taxReturnId) {
      return NextResponse.json({ message: 'Tax return ID is required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size exceeds maximum limit of 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.' },
        { status: 400 }
      );
    }

    // Verify tax return belongs to user
    const taxReturn = await prisma.taxReturn.findFirst({
      where: {
        id: taxReturnId,
        userId: session.user.id
      }
    });

    if (!taxReturn) {
      return NextResponse.json(
        { message: 'Tax return not found or access denied' },
        { status: 404 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'tax-forms');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `${session.user.id}_${timestamp}_${file.name}`;
    const filePath = join(uploadsDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Detect document type
    const documentType = detectDocumentType(file.name);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        taxReturnId: taxReturnId,
        fileName: filename,
        fileType: file.type,
        fileSize: file.size,
        filePath: filePath,
        documentType: documentType,
        processingStatus: ProcessingStatus.PENDING
      }
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      documentId: document.id,
      documentType: documentType
    });

  } catch (error) {
    console.error('Tax form upload error:', error);
    return NextResponse.json(
      { message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
