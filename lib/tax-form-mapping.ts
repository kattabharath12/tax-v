
import { ExtractedTaxData } from './tax-form-ocr';
import { IncomeType, DeductionType } from '@prisma/client';

export interface TaxFormMapping {
  incomeEntries: {
    incomeType: IncomeType;
    description: string;
    amount: number;
    payerName?: string;
    payerTIN?: string;
  }[];
  withheldTax: number;
  taxYear: number;
}

export function mapExtractedDataToIncomeEntries(extractedForms: ExtractedTaxData[]): TaxFormMapping {
  const incomeEntries: TaxFormMapping['incomeEntries'] = [];
  let totalWithheldTax = 0;
  let taxYear = new Date().getFullYear() - 1; // Default to previous year

  extractedForms.forEach(form => {
    if (form.taxYear) {
      taxYear = form.taxYear;
    }

    switch (form.formType) {
      case 'FORM_1099_NEC':
        if (form.amounts.nonemployeeCompensation && form.amounts.nonemployeeCompensation > 0) {
          incomeEntries.push({
            incomeType: IncomeType.BUSINESS_INCOME,
            description: `1099-NEC: Nonemployee Compensation${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: form.amounts.nonemployeeCompensation,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.federalIncomeTaxWithheld) {
          totalWithheldTax += form.amounts.federalIncomeTaxWithheld;
        }
        break;

      case 'FORM_1099_INT':
        if (form.amounts.interestIncome && form.amounts.interestIncome > 0) {
          incomeEntries.push({
            incomeType: IncomeType.INTEREST,
            description: `1099-INT: Interest Income${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: form.amounts.interestIncome,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.federalIncomeTaxWithheld) {
          totalWithheldTax += form.amounts.federalIncomeTaxWithheld;
        }
        break;

      case 'FORM_1099_DIV':
        if (form.amounts.ordinaryDividends && form.amounts.ordinaryDividends > 0) {
          incomeEntries.push({
            incomeType: IncomeType.DIVIDENDS,
            description: `1099-DIV: Ordinary Dividends${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: form.amounts.ordinaryDividends,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.qualifiedDividends && form.amounts.qualifiedDividends > 0) {
          incomeEntries.push({
            incomeType: IncomeType.DIVIDENDS,
            description: `1099-DIV: Qualified Dividends${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: form.amounts.qualifiedDividends,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.federalIncomeTaxWithheld) {
          totalWithheldTax += form.amounts.federalIncomeTaxWithheld;
        }
        break;

      case 'FORM_1099_MISC':
        if (form.amounts.rents && form.amounts.rents > 0) {
          incomeEntries.push({
            incomeType: IncomeType.OTHER_INCOME,
            description: `1099-MISC: Rent Income${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: form.amounts.rents,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.miscellaneousIncome && form.amounts.miscellaneousIncome > 0) {
          incomeEntries.push({
            incomeType: IncomeType.OTHER_INCOME,
            description: `1099-MISC: Miscellaneous Income${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: form.amounts.miscellaneousIncome,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.federalIncomeTaxWithheld) {
          totalWithheldTax += form.amounts.federalIncomeTaxWithheld;
        }
        break;

      case 'FORM_1099_R':
        const taxableAmount = form.amounts.taxableAmount || form.amounts.grossDistribution || 0;
        if (taxableAmount > 0) {
          incomeEntries.push({
            incomeType: IncomeType.RETIREMENT_DISTRIBUTIONS,
            description: `1099-R: Retirement Distribution${form.payerName ? ` from ${form.payerName}` : ''}`,
            amount: taxableAmount,
            payerName: form.payerName,
            payerTIN: form.payerTIN,
          });
        }
        if (form.amounts.federalIncomeTaxWithheld) {
          totalWithheldTax += form.amounts.federalIncomeTaxWithheld;
        }
        break;

      default:
        // Handle unknown form types by adding to other income if there are amounts
        Object.entries(form.amounts).forEach(([key, amount]) => {
          if (typeof amount === 'number' && amount > 0 && key !== 'federalIncomeTaxWithheld') {
            incomeEntries.push({
              incomeType: IncomeType.OTHER_INCOME,
              description: `Unknown Form: ${key}${form.payerName ? ` from ${form.payerName}` : ''}`,
              amount: amount,
              payerName: form.payerName,
              payerTIN: form.payerTIN,
            });
          }
        });
        if (form.amounts.federalIncomeTaxWithheld) {
          totalWithheldTax += form.amounts.federalIncomeTaxWithheld;
        }
        break;
    }
  });

  return {
    incomeEntries,
    withheldTax: totalWithheldTax,
    taxYear
  };
}

export function calculateTaxReturn(
  totalIncome: number,
  totalWithheldTax: number,
  filingStatus: 'SINGLE' | 'MARRIED_FILING_JOINTLY' | 'MARRIED_FILING_SEPARATELY' | 'HEAD_OF_HOUSEHOLD' = 'SINGLE'
) {
  // 2024 standard deductions
  const standardDeductions = {
    SINGLE: 14600,
    MARRIED_FILING_JOINTLY: 29200,
    MARRIED_FILING_SEPARATELY: 14600,
    HEAD_OF_HOUSEHOLD: 21900
  };

  const adjustedGrossIncome = totalIncome;
  const standardDeduction = standardDeductions[filingStatus];
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

  // 2024 tax brackets for single filers (simplified)
  let tax = 0;
  if (filingStatus === 'SINGLE') {
    if (taxableIncome <= 11600) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 47150) {
      tax = 1160 + (taxableIncome - 11600) * 0.12;
    } else if (taxableIncome <= 100525) {
      tax = 5426 + (taxableIncome - 47150) * 0.22;
    } else if (taxableIncome <= 191950) {
      tax = 17168.50 + (taxableIncome - 100525) * 0.24;
    } else if (taxableIncome <= 243725) {
      tax = 39110.50 + (taxableIncome - 191950) * 0.32;
    } else if (taxableIncome <= 609350) {
      tax = 55678.50 + (taxableIncome - 243725) * 0.35;
    } else {
      tax = 183647.25 + (taxableIncome - 609350) * 0.37;
    }
  }
  // Add other filing status calculations as needed...

  const totalPayments = totalWithheldTax;
  let refundAmount = 0;
  let amountOwed = 0;

  if (totalPayments > tax) {
    refundAmount = totalPayments - tax;
  } else if (tax > totalPayments) {
    amountOwed = tax - totalPayments;
  }

  return {
    totalIncome: adjustedGrossIncome,
    adjustedGrossIncome,
    standardDeduction,
    taxableIncome,
    taxLiability: tax,
    totalCredits: 0, // For now, can be expanded later
    refundAmount,
    amountOwed
  };
}
