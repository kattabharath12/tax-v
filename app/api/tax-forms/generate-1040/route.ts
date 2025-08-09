
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { taxReturnId } = await req.json();

    if (!taxReturnId) {
      return NextResponse.json(
        { message: 'Tax return ID is required' },
        { status: 400 }
      );
    }

    // Get tax return with all related data
    const taxReturn = await prisma.taxReturn.findFirst({
      where: {
        id: taxReturnId,
        userId: session.user.id
      },
      include: {
        incomeEntries: true,
        deductionEntries: true,
        dependents: true
      }
    });

    if (!taxReturn) {
      return NextResponse.json(
        { message: 'Tax return not found or access denied' },
        { status: 404 }
      );
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();

    // Set up fonts and styling
    const fontSize = 12;
    const titleFontSize = 16;
    const font = pdfDoc.embedFont('Helvetica');

    // Title
    page.drawText('Form 1040 - U.S. Individual Income Tax Return', {
      x: 50,
      y: height - 50,
      size: titleFontSize,
      color: rgb(0, 0, 0),
    });

    // Tax year
    page.drawText(`Tax Year: ${taxReturn.taxYear}`, {
      x: 50,
      y: height - 80,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    let yPosition = height - 120;

    // Personal Information
    page.drawText('PERSONAL INFORMATION', {
      x: 50,
      y: yPosition,
      size: fontSize + 2,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    page.drawText(`Name: ${taxReturn.firstName || ''} ${taxReturn.lastName || ''}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`SSN: ${taxReturn.ssn || 'Not provided'}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Filing Status: ${taxReturn.filingStatus.replace(/_/g, ' ')}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Income Section
    page.drawText('INCOME', {
      x: 50,
      y: yPosition,
      size: fontSize + 2,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    taxReturn.incomeEntries.forEach((income, index) => {
      page.drawText(`${income.incomeType.replace(/_/g, ' ')}: $${Number(income.amount).toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      page.drawText(income.description || '', {
        x: 300,
        y: yPosition,
        size: fontSize - 2,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 20;
    });

    page.drawText(`Total Income: $${Number(taxReturn.totalIncome).toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Deductions Section
    if (taxReturn.deductionEntries.length > 0) {
      page.drawText('DEDUCTIONS', {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      taxReturn.deductionEntries.forEach((deduction, index) => {
        page.drawText(`${deduction.deductionType.replace(/_/g, ' ')}: $${Number(deduction.amount).toLocaleString()}`, {
          x: 70,
          y: yPosition,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      });

      page.drawText(`Total Itemized Deductions: $${Number(taxReturn.itemizedDeduction).toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }

    page.drawText(`Standard Deduction: $${Number(taxReturn.standardDeduction).toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Tax Calculation
    page.drawText('TAX CALCULATION', {
      x: 50,
      y: yPosition,
      size: fontSize + 2,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    page.drawText(`Adjusted Gross Income: $${Number(taxReturn.adjustedGrossIncome).toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Taxable Income: $${Number(taxReturn.taxableIncome).toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Tax Liability: $${Number(taxReturn.taxLiability).toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Result
    page.drawText('RESULT', {
      x: 50,
      y: yPosition,
      size: fontSize + 2,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    if (Number(taxReturn.refundAmount) > 0) {
      page.drawText(`REFUND: $${Number(taxReturn.refundAmount).toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: fontSize + 2,
        color: rgb(0, 0.5, 0),
      });
    } else if (Number(taxReturn.amountOwed) > 0) {
      page.drawText(`AMOUNT OWED: $${Number(taxReturn.amountOwed).toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: fontSize + 2,
        color: rgb(0.5, 0, 0),
      });
    } else {
      page.drawText('No refund or amount owed', {
        x: 70,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    }

    // Generate and save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create directory if it doesn't exist
    const outputDir = `${process.cwd()}/uploads/tax-returns`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `form_1040_${taxReturn.taxYear}_${session.user.id}_${Date.now()}.pdf`;
    const filePath = `${outputDir}/${fileName}`;
    
    fs.writeFileSync(filePath, pdfBytes);

    return NextResponse.json({
      message: 'Form 1040 generated successfully',
      fileName: fileName,
      downloadUrl: `/api/tax-forms/download/${fileName}`
    });

  } catch (error) {
    console.error('Error generating Form 1040:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
