
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractDataFromTaxForm } from '@/lib/tax-form-ocr';
import { mapExtractedDataToIncomeEntries } from '@/lib/tax-form-mapping';
import { ProcessingStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = params;

    // Find the document and verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        taxReturn: {
          userId: session.user.id
        }
      },
      include: {
        taxReturn: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Update processing status to PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: ProcessingStatus.PROCESSING }
    });

    try {
      // Extract data from the tax form
      const extractedData = await extractDataFromTaxForm(document.filePath, document.fileType);
      
      // Update document with extracted data and OCR text
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ocrText: extractedData.rawText,
          extractedData: extractedData as any,
          processingStatus: ProcessingStatus.COMPLETED
        }
      });

      // Map extracted data to income entries format
      const mappedData = mapExtractedDataToIncomeEntries([extractedData]);

      // Create DocumentExtractedEntry records for each income entry
      const extractedEntries = await Promise.all(
        mappedData.incomeEntries.map(entry => 
          prisma.documentExtractedEntry.create({
            data: {
              documentId: documentId,
              entryType: 'INCOME',
              extractedData: {
                incomeType: entry.incomeType,
                description: entry.description,
                amount: entry.amount,
                payerName: entry.payerName,
                payerTIN: entry.payerTIN,
              },
              isAccepted: false,
              isEdited: false
            }
          })
        )
      );

      // If there's withheld tax, create an entry for that too
      if (mappedData.withheldTax > 0) {
        await prisma.documentExtractedEntry.create({
          data: {
            documentId: documentId,
            entryType: 'WITHHOLDING',
            extractedData: {
              description: 'Federal Income Tax Withheld',
              amount: mappedData.withheldTax,
            },
            isAccepted: false,
            isEdited: false
          }
        });
      }

      return NextResponse.json({
        message: 'Document processed successfully',
        extractedData: extractedData,
        extractedEntries: extractedEntries,
        withheldTax: mappedData.withheldTax
      });

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update processing status to FAILED
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          processingStatus: ProcessingStatus.FAILED,
          ocrText: `Processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
        }
      });

      return NextResponse.json(
        { message: 'Failed to process document', error: processingError instanceof Error ? processingError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Tax form processing error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = params;

    // Get document with extracted entries
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        taxReturn: {
          userId: session.user.id
        }
      },
      include: {
        extractedEntries: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      document,
      extractedEntries: document.extractedEntries
    });

  } catch (error) {
    console.error('Error fetching document processing status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
