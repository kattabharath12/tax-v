
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { extractedEntryIds, edits } = await req.json();

    if (!extractedEntryIds || !Array.isArray(extractedEntryIds)) {
      return NextResponse.json(
        { message: 'extractedEntryIds array is required' },
        { status: 400 }
      );
    }

    // Verify ownership of all extracted entries
    const extractedEntries = await prisma.documentExtractedEntry.findMany({
      where: {
        id: { in: extractedEntryIds },
        document: {
          taxReturn: {
            userId: session.user.id
          }
        }
      },
      include: {
        document: {
          include: {
            taxReturn: true
          }
        }
      }
    });

    if (extractedEntries.length !== extractedEntryIds.length) {
      return NextResponse.json(
        { message: 'Some entries not found or access denied' },
        { status: 404 }
      );
    }

    const createdEntries = [];

    // Process each extracted entry
    for (const extractedEntry of extractedEntries) {
      const taxReturnId = extractedEntry.document.taxReturnId;
      let finalData = extractedEntry.extractedData as any;
      let isEdited = false;

      // Apply edits if provided
      if (edits && edits[extractedEntry.id]) {
        finalData = { ...finalData, ...edits[extractedEntry.id] };
        isEdited = true;
      }

      if (extractedEntry.entryType === 'INCOME') {
        // Create income entry
        const incomeEntry = await prisma.incomeEntry.create({
          data: {
            taxReturnId: taxReturnId,
            incomeType: finalData.incomeType,
            description: finalData.description,
            amount: finalData.amount,
            payerName: finalData.payerName,
            payerTIN: finalData.payerTIN,
          }
        });

        // Link the extracted entry to the created income entry
        await prisma.documentExtractedEntry.update({
          where: { id: extractedEntry.id },
          data: {
            incomeEntryId: incomeEntry.id,
            isAccepted: true,
            isEdited: isEdited
          }
        });

        createdEntries.push({ type: 'income', entry: incomeEntry });

      } else if (extractedEntry.entryType === 'DEDUCTION') {
        // Create deduction entry
        const deductionEntry = await prisma.deductionEntry.create({
          data: {
            taxReturnId: taxReturnId,
            deductionType: finalData.deductionType,
            description: finalData.description,
            amount: finalData.amount,
          }
        });

        // Link the extracted entry to the created deduction entry
        await prisma.documentExtractedEntry.update({
          where: { id: extractedEntry.id },
          data: {
            deductionEntryId: deductionEntry.id,
            isAccepted: true,
            isEdited: isEdited
          }
        });

        createdEntries.push({ type: 'deduction', entry: deductionEntry });
      }
    }

    // Recalculate tax return totals
    const taxReturnId = extractedEntries[0].document.taxReturnId;
    await recalculateTaxReturn(taxReturnId);

    return NextResponse.json({
      message: 'Entries accepted and created successfully',
      createdEntries: createdEntries
    });

  } catch (error) {
    console.error('Error accepting extracted entries:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to recalculate tax return totals
async function recalculateTaxReturn(taxReturnId: string) {
  // Get all income entries for this tax return
  const incomeEntries = await prisma.incomeEntry.findMany({
    where: { taxReturnId }
  });

  const deductionEntries = await prisma.deductionEntry.findMany({
    where: { taxReturnId }
  });

  // Calculate totals
  const totalIncome = incomeEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const totalDeductions = deductionEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

  // Get current tax return
  const taxReturn = await prisma.taxReturn.findUnique({
    where: { id: taxReturnId }
  });

  if (!taxReturn) return;

  // Calculate tax using the same logic from tax-form-mapping
  const standardDeductions = {
    SINGLE: 14600,
    MARRIED_FILING_JOINTLY: 29200,
    MARRIED_FILING_SEPARATELY: 14600,
    HEAD_OF_HOUSEHOLD: 21900
  };

  const adjustedGrossIncome = totalIncome;
  const standardDeduction = standardDeductions[taxReturn.filingStatus] || 14600;
  const itemizedDeduction = totalDeductions;
  const deduction = Math.max(standardDeduction, itemizedDeduction);
  const taxableIncome = Math.max(0, adjustedGrossIncome - deduction);

  // Simple tax calculation (2024 brackets for single)
  let taxLiability = 0;
  if (taxReturn.filingStatus === 'SINGLE') {
    if (taxableIncome <= 11600) {
      taxLiability = taxableIncome * 0.10;
    } else if (taxableIncome <= 47150) {
      taxLiability = 1160 + (taxableIncome - 11600) * 0.12;
    } else if (taxableIncome <= 100525) {
      taxLiability = 5426 + (taxableIncome - 47150) * 0.22;
    } else if (taxableIncome <= 191950) {
      taxLiability = 17168.50 + (taxableIncome - 100525) * 0.24;
    } else if (taxableIncome <= 243725) {
      taxLiability = 39110.50 + (taxableIncome - 191950) * 0.32;
    } else if (taxableIncome <= 609350) {
      taxLiability = 55678.50 + (taxableIncome - 243725) * 0.35;
    } else {
      taxLiability = 183647.25 + (taxableIncome - 609350) * 0.37;
    }
  }

  // Determine refund or amount owed (simplified - no withholding calculation for now)
  const refundAmount = taxLiability <= 0 ? Math.abs(taxLiability) : 0;
  const amountOwed = taxLiability > 0 ? taxLiability : 0;

  // Update tax return
  await prisma.taxReturn.update({
    where: { id: taxReturnId },
    data: {
      totalIncome: totalIncome,
      adjustedGrossIncome: adjustedGrossIncome,
      standardDeduction: standardDeduction,
      itemizedDeduction: itemizedDeduction,
      taxableIncome: taxableIncome,
      taxLiability: taxLiability,
      refundAmount: refundAmount,
      amountOwed: amountOwed,
      lastSavedAt: new Date()
    }
  });
}
