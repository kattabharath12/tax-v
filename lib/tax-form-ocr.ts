
import Tesseract from 'tesseract.js';
import fs from 'fs';

export interface ExtractedTaxData {
  formType: string;
  taxYear?: number;
  payerName?: string;
  payerTIN?: string;
  recipientName?: string;
  recipientTIN?: string;
  amounts: {
    [key: string]: number;
  };
  rawText?: string;
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid build-time issues with pdf-parse
    const pdf = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextFromImage(filePath: string): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: m => console.log(m)
    });
    return text;
  } catch (error) {
    console.error('OCR failed:', error);
    throw new Error('Failed to extract text from image');
  }
}

export function parse1099NEC(text: string): ExtractedTaxData {
  const data: ExtractedTaxData = {
    formType: 'FORM_1099_NEC',
    amounts: {},
    rawText: text
  };

  // Extract tax year
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    data.taxYear = parseInt(yearMatch[0]);
  }

  // Extract payer information
  const payerNameMatch = text.match(/PAYER'S name[,\s]*(.+?)(?:\n|TIN)/i);
  if (payerNameMatch) {
    data.payerName = payerNameMatch[1].trim();
  }

  const payerTINMatch = text.match(/PAYER'S TIN[:\s]*(\d{2}-\d{7})/i);
  if (payerTINMatch) {
    data.payerTIN = payerTINMatch[1];
  }

  // Extract recipient information
  const recipientNameMatch = text.match(/RECIPIENT'S name[,\s]*(.+?)(?:\n|SSN)/i);
  if (recipientNameMatch) {
    data.recipientName = recipientNameMatch[1].trim();
  }

  // Extract nonemployee compensation (Box 1)
  const necMatch = text.match(/Nonemployee compensation[\s\$]*([\d,]+\.?\d*)/i);
  if (necMatch) {
    data.amounts.nonemployeeCompensation = parseFloat(necMatch[1].replace(/,/g, ''));
  }

  // Extract federal income tax withheld (Box 4)
  const federalTaxMatch = text.match(/Federal income tax withheld[\s\$]*([\d,]+\.?\d*)/i);
  if (federalTaxMatch) {
    data.amounts.federalIncomeTaxWithheld = parseFloat(federalTaxMatch[1].replace(/,/g, ''));
  }

  return data;
}

export function parse1099INT(text: string): ExtractedTaxData {
  const data: ExtractedTaxData = {
    formType: 'FORM_1099_INT',
    amounts: {},
    rawText: text
  };

  // Extract tax year
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    data.taxYear = parseInt(yearMatch[0]);
  }

  // Extract payer information
  const payerNameMatch = text.match(/PAYER'S name[,\s]*(.+?)(?:\n|TIN)/i);
  if (payerNameMatch) {
    data.payerName = payerNameMatch[1].trim();
  }

  const payerTINMatch = text.match(/PAYER'S TIN[:\s]*(\d{2}-\d{7})/i);
  if (payerTINMatch) {
    data.payerTIN = payerTINMatch[1];
  }

  // Extract interest income (Box 1)
  const interestMatch = text.match(/Interest income[\s\$]*([\d,]+\.?\d*)/i);
  if (interestMatch) {
    data.amounts.interestIncome = parseFloat(interestMatch[1].replace(/,/g, ''));
  }

  // Extract federal income tax withheld (Box 4)
  const federalTaxMatch = text.match(/Federal income tax withheld[\s\$]*([\d,]+\.?\d*)/i);
  if (federalTaxMatch) {
    data.amounts.federalIncomeTaxWithheld = parseFloat(federalTaxMatch[1].replace(/,/g, ''));
  }

  return data;
}

export function parse1099DIV(text: string): ExtractedTaxData {
  const data: ExtractedTaxData = {
    formType: 'FORM_1099_DIV',
    amounts: {},
    rawText: text
  };

  // Extract tax year
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    data.taxYear = parseInt(yearMatch[0]);
  }

  // Extract payer information
  const payerNameMatch = text.match(/PAYER'S name[,\s]*(.+?)(?:\n|TIN)/i);
  if (payerNameMatch) {
    data.payerName = payerNameMatch[1].trim();
  }

  const payerTINMatch = text.match(/PAYER'S TIN[:\s]*(\d{2}-\d{7})/i);
  if (payerTINMatch) {
    data.payerTIN = payerTINMatch[1];
  }

  // Extract ordinary dividends (Box 1a)
  const ordinaryDivMatch = text.match(/(?:Total )?ordinary dividends[\s\$]*([\d,]+\.?\d*)/i);
  if (ordinaryDivMatch) {
    data.amounts.ordinaryDividends = parseFloat(ordinaryDivMatch[1].replace(/,/g, ''));
  }

  // Extract qualified dividends (Box 1b)
  const qualifiedDivMatch = text.match(/Qualified dividends[\s\$]*([\d,]+\.?\d*)/i);
  if (qualifiedDivMatch) {
    data.amounts.qualifiedDividends = parseFloat(qualifiedDivMatch[1].replace(/,/g, ''));
  }

  // Extract federal income tax withheld (Box 4)
  const federalTaxMatch = text.match(/Federal income tax withheld[\s\$]*([\d,]+\.?\d*)/i);
  if (federalTaxMatch) {
    data.amounts.federalIncomeTaxWithheld = parseFloat(federalTaxMatch[1].replace(/,/g, ''));
  }

  return data;
}

export function parse1099MISC(text: string): ExtractedTaxData {
  const data: ExtractedTaxData = {
    formType: 'FORM_1099_MISC',
    amounts: {},
    rawText: text
  };

  // Extract tax year
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    data.taxYear = parseInt(yearMatch[0]);
  }

  // Extract miscellaneous income - could be in various boxes
  const miscIncomeMatch = text.match(/Miscellaneous income[\s\$]*([\d,]+\.?\d*)/i);
  if (miscIncomeMatch) {
    data.amounts.miscellaneousIncome = parseFloat(miscIncomeMatch[1].replace(/,/g, ''));
  }

  // Extract rent (Box 1)
  const rentMatch = text.match(/Rents[\s\$]*([\d,]+\.?\d*)/i);
  if (rentMatch) {
    data.amounts.rents = parseFloat(rentMatch[1].replace(/,/g, ''));
  }

  // Extract federal income tax withheld (Box 4)
  const federalTaxMatch = text.match(/Federal income tax withheld[\s\$]*([\d,]+\.?\d*)/i);
  if (federalTaxMatch) {
    data.amounts.federalIncomeTaxWithheld = parseFloat(federalTaxMatch[1].replace(/,/g, ''));
  }

  return data;
}

export function parse1099R(text: string): ExtractedTaxData {
  const data: ExtractedTaxData = {
    formType: 'FORM_1099_R',
    amounts: {},
    rawText: text
  };

  // Extract tax year
  const yearMatch = text.match(/20\d{2}/);
  if (yearMatch) {
    data.taxYear = parseInt(yearMatch[0]);
  }

  // Extract gross distribution (Box 1)
  const grossDistMatch = text.match(/Gross distribution[\s\$]*([\d,]+\.?\d*)/i);
  if (grossDistMatch) {
    data.amounts.grossDistribution = parseFloat(grossDistMatch[1].replace(/,/g, ''));
  }

  // Extract taxable amount (Box 2a)
  const taxableAmountMatch = text.match(/Taxable amount[\s\$]*([\d,]+\.?\d*)/i);
  if (taxableAmountMatch) {
    data.amounts.taxableAmount = parseFloat(taxableAmountMatch[1].replace(/,/g, ''));
  }

  // Extract federal income tax withheld (Box 4)
  const federalTaxMatch = text.match(/Federal income tax withheld[\s\$]*([\d,]+\.?\d*)/i);
  if (federalTaxMatch) {
    data.amounts.federalIncomeTaxWithheld = parseFloat(federalTaxMatch[1].replace(/,/g, ''));
  }

  return data;
}

export async function extractDataFromTaxForm(filePath: string, fileType: string): Promise<ExtractedTaxData> {
  let text: string;

  if (fileType === 'application/pdf') {
    text = await extractTextFromPDF(filePath);
  } else {
    text = await extractTextFromImage(filePath);
  }

  // Determine form type based on content and call appropriate parser
  if (text.includes('1099-NEC') || text.includes('Nonemployee compensation')) {
    return parse1099NEC(text);
  } else if (text.includes('1099-INT') || text.includes('Interest income')) {
    return parse1099INT(text);
  } else if (text.includes('1099-DIV') || text.includes('dividends')) {
    return parse1099DIV(text);
  } else if (text.includes('1099-MISC') || text.includes('Miscellaneous income')) {
    return parse1099MISC(text);
  } else if (text.includes('1099-R') || text.includes('distribution')) {
    return parse1099R(text);
  } else {
    // Default parsing for unknown forms
    return {
      formType: 'UNKNOWN',
      amounts: {},
      rawText: text
    };
  }
}
