import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { generateDocxFromText } from './docxUtils';

/**
 * Generate a realistic sample Business Agreement PDF ArrayBuffer
 */
export async function createSamplePdf(): Promise<{ arrayBuffer: ArrayBuffer; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const page2 = pdfDoc.addPage([595.28, 841.89]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // --- Page 1 ---
  page1.drawText('SERVICE AGREEMENT / 業務服務協議書', {
    x: 50,
    y: 770,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.18, 0.35),
  });

  page1.drawText('Document Reference: AG-2026-08942 | Date: September 2026', {
    x: 50,
    y: 745,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  page1.drawLine({
    start: { x: 50, y: 735 },
    end: { x: 545, y: 735 },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Section 1
  page1.drawText('1. PARTIES & SCOPE OF SERVICES (協議雙方與服務範圍)', {
    x: 50,
    y: 700,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  const bodyText1 = [
    'This Agreement is entered into between DocuMaster Enterprise Solutions ("Party A")',
    'and Acme Global Innovations Limited ("Party B") for the provision of professional digital',
    'document management, automated conversion, and secure electronic signing services.',
    '',
    'Party A agrees to deliver full-stack enterprise cloud workflow tools adhering to high standards',
    'of data encryption, ISO compliance, and seamless cross-platform PDF manipulation.',
  ];

  let textY = 675;
  for (const line of bodyText1) {
    if (line) {
      page1.drawText(line, {
        x: 50,
        y: textY,
        size: 10,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.3),
      });
    }
    textY -= 16;
  }

  // Section 2 - Terms
  textY -= 10;
  page1.drawText('2. SERVICE DELIVERABLES & MILESTONES (交付成果與進度)', {
    x: 50,
    y: textY,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });
  textY -= 25;

  const deliverables = [
    '• Phase 1: High-fidelity PDF to Word (.docx) layout and structural converter.',
    '• Phase 2: Interactive multi-layer PDF annotation, redaction, and markup editor.',
    '• Phase 3: Legally binding electronic signature canvas with timestamp and metadata.',
    '• Phase 4: Batch image scanner processing with optical document contrast filters.',
  ];

  for (const item of deliverables) {
    page1.drawText(item, {
      x: 60,
      y: textY,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.3),
    });
    textY -= 18;
  }

  // Signature Section Page 1 Bottom
  page1.drawRectangle({
    x: 50,
    y: 120,
    width: 495,
    height: 120,
    borderColor: rgb(0.7, 0.75, 0.85),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1.0),
  });

  page1.drawText('SIGNATURE & AUTHORIZATION / 授權簽署區', {
    x: 65,
    y: 215,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });

  page1.drawText('Party A Authorized Signatory: ________________________', {
    x: 65,
    y: 175,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4),
  });

  page1.drawText('Party B Authorized Signatory: [ Please sign here / 請於此處簽署 ]', {
    x: 65,
    y: 145,
    size: 9.5,
    font: fontBold,
    color: rgb(0.15, 0.35, 0.8),
  });

  page1.drawText('Page 1 of 2', {
    x: 270,
    y: 30,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // --- Page 2 ---
  page2.drawText('3. TERMS, CONDITIONS & CONFIDENTIALITY (保密條款與協議條約)', {
    x: 50,
    y: 770,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  const bodyText2 = [
    'Both parties acknowledge that all proprietary materials, source algorithms, and document assets',
    'exchanged shall remain strictly confidential. No data shall be disclosed without prior written approval.',
    '',
    'This contract is valid for a period of twelve (12) calendar months starting from the effective date,',
    'with automatic renewal unless 30 days prior written notice is provided by either entity.',
  ];

  let textY2 = 740;
  for (const line of bodyText2) {
    if (line) {
      page2.drawText(line, {
        x: 50,
        y: textY2,
        size: 10,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.3),
      });
    }
    textY2 -= 16;
  }

  page2.drawText('Page 2 of 2', {
    x: 270,
    y: 30,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return {
    arrayBuffer: pdfBytes.buffer as ArrayBuffer,
    filename: 'Sample_Service_Agreement.pdf',
  };
}

/**
 * Generate a realistic sample Word DOCX file
 */
export async function createSampleDocx(): Promise<{ file: File; arrayBuffer: ArrayBuffer }> {
  const sampleTexts = [
    `ANNUAL PROJECT STATUS REPORT (2026 Q3)
項目年度進度與技術評估報告

1. EXECUTIVE SUMMARY (執行摘要)
The digital transformation program has successfully modernized document handling across all departments. All key milestones have been completed on schedule, resulting in an estimated 65% efficiency gain in cross-departmental contract turnaround times.

2. KEY DELIVERABLES COMPLETED (已完成之關鍵交付項目)
• Automated Document Converter: High-speed bi-directional transformation between PDF and Microsoft Word DOCX formats.
• Online Canvas Annotation Engine: Support for vector shapes, highlighting, sticky notes, and redaction boxes.
• E-Signature Certification Module: Cross-platform digital signing supporting stylus drawing, calligraphy typography, and transparent watermark stamps.
• Multi-Image Scan Processor: Batch photo ingestion with dynamic contrast adjustment, thresholding, and A4 pagination.

3. FINANCIAL ALLOCATION & NEXT QUARTER OBJECTIVES (資源分配與下季目標)
The project remains within the allocated budget envelope with an overall variance of less than 2.5%. Next quarter priorities include expanded AI OCR multilingual models and enterprise cloud backup connector integrations.

Prepared by: Enterprise Document Operations Team
Status: Approved for Distribution`,
  ];

  const blob = await generateDocxFromText(sampleTexts, 'Sample_Project_Report');
  const file = new File([blob], 'Sample_Project_Report.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const arrayBuffer = await file.arrayBuffer();

  return { file, arrayBuffer };
}

/**
 * Generate sample receipt / document photos for Image to PDF tool
 */
export async function createSampleImages(): Promise<File[]> {
  // Generate 2 canvas images (a simulated receipt and a simulated document scan)
  const makeSampleCanvas = (title: string, lines: string[], bg: string, accent: string): File => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative top header
    ctx.fillStyle = accent;
    ctx.fillRect(40, 40, canvas.width - 80, 8);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(title, 40, 90);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Receipt #${Math.floor(100000 + Math.random() * 900000)} | Date: 2026-09-01`, 40, 120);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 140);
    ctx.lineTo(canvas.width - 40, 140);
    ctx.stroke();

    // Body items
    let y = 180;
    ctx.font = '16px monospace';
    ctx.fillStyle = '#1e293b';

    lines.forEach((line) => {
      ctx.fillText(line, 50, y);
      y += 36;
    });

    // Stamp mark
    ctx.save();
    ctx.translate(canvas.width - 150, canvas.height - 120);
    ctx.rotate(-0.2);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.strokeRect(-60, -25, 120, 50);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAID / 已付訖', 0, 5);
    ctx.restore();

    // Convert to blob
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], `${title.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
  };

  const file1 = makeSampleCanvas(
    'OFFICIAL EXPENSE RECEIPT',
    [
      'Item 1: Enterprise Cloud Hosting       $ 120.00',
      'Item 2: SSL Certification Pack         $  45.00',
      'Item 3: PDF Processing Engine License   $ 280.00',
      'Item 4: Domain Renewal (3 Years)        $  75.00',
      '------------------------------------------------',
      'Subtotal:                               $ 520.00',
      'Tax (8.5%):                             $  44.20',
      'TOTAL AMOUNT:                           $ 564.20',
    ],
    '#fdfbf7',
    '#2563eb'
  );

  const file2 = makeSampleCanvas(
    'CONSULTING SERVICES INVOICE',
    [
      'Client: Acme Global Innovations Inc.',
      'Consultant: Senior Architect Joe Law',
      '------------------------------------------------',
      'Task 1: System Architecture Audit      20 hrs',
      'Task 2: API Security Implementation     15 hrs',
      'Task 3: E-Signature Integration         10 hrs',
      '------------------------------------------------',
      'Hourly Rate:                            $ 150/hr',
      'TOTAL INVOICE AMOUNT:                 $ 6,750.00',
    ],
    '#f8fafc',
    '#059669'
  );

  return [file1, file2];
}
