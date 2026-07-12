import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { formatCents } from './money';

/**
 * Factuur-PDF (16_Facturatie.md § 5) — verplichte velden: factuurnummer,
 * datum, bedrijf KVK/BTW-nr, klantnaam, regeltabel (dienst/bedrag/BTW/totaal),
 * betaaltermijn, IBAN/BIC. Geen logo/huisstijl-upload (instellingen-UI is geen
 * Sprint 5-scope) — platte, compliant lay-out.
 */
export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatRate: number;
  vatAmountCents: number;
  totalAmountCents: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  companyName: string;
  companyCode: string;
  kvkNumber: string;
  vatNumber: string;
  iban: string;
  bic: string;
  customerName: string;
  customerAddress?: string;
  lines: InvoicePdfLine[];
  totalAmountCents: number;
  totalTaxCents: number;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const black = rgb(0, 0, 0);

  const draw = (text: string, options: { x?: number; size?: number; bold?: boolean } = {}) => {
    page.drawText(text, {
      x: options.x ?? left,
      y,
      size: options.size ?? 10,
      font: options.bold ? bold : font,
      color: black,
    });
  };

  draw(data.companyName, { size: 16, bold: true });
  y -= 16;
  draw(`KVK ${data.kvkNumber} · BTW ${data.vatNumber}`, { size: 9 });
  y -= 30;

  draw(`Factuur ${data.invoiceNumber}`, { size: 14, bold: true });
  y -= 18;
  draw(`Factuurdatum: ${data.invoiceDate}`, { size: 10 });
  y -= 14;
  draw(`Vervaldatum: ${data.dueDate}`, { size: 10 });
  y -= 30;

  draw('Aan:', { size: 9, bold: true });
  y -= 12;
  draw(data.customerName, { size: 10 });
  y -= 12;
  if (data.customerAddress) {
    draw(data.customerAddress, { size: 10 });
    y -= 12;
  }
  y -= 20;

  const col = { desc: left, qty: 330, price: 380, vat: 450, total: 500 };
  draw('Omschrijving', { x: col.desc, size: 9, bold: true });
  draw('Aantal', { x: col.qty, size: 9, bold: true });
  draw('Prijs', { x: col.price, size: 9, bold: true });
  draw('BTW', { x: col.vat, size: 9, bold: true });
  draw('Totaal', { x: col.total, size: 9, bold: true });
  y -= 6;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: black });
  y -= 14;

  for (const line of data.lines) {
    draw(line.description, { x: col.desc, size: 9 });
    draw(String(line.quantity), { x: col.qty, size: 9 });
    draw(formatCents(line.unitPriceCents), { x: col.price, size: 9 });
    draw(`${line.vatRate}%`, { x: col.vat, size: 9 });
    draw(formatCents(line.totalAmountCents), { x: col.total, size: 9 });
    y -= 16;
  }

  y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 0.5, color: black });
  y -= 16;
  draw('Subtotaal (excl. BTW)', { x: col.price, size: 9 });
  draw(formatCents(data.totalAmountCents - data.totalTaxCents), { x: col.total, size: 9 });
  y -= 14;
  draw('BTW', { x: col.price, size: 9 });
  draw(formatCents(data.totalTaxCents), { x: col.total, size: 9 });
  y -= 14;
  draw('Totaal', { x: col.price, size: 10, bold: true });
  draw(formatCents(data.totalAmountCents), { x: col.total, size: 10, bold: true });

  y -= 40;
  draw(`Gelieve te betalen vóór ${data.dueDate} op IBAN ${data.iban} (BIC ${data.bic}).`, {
    size: 9,
  });

  return doc.save();
}
