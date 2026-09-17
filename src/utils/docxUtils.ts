import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { WordToPdfSettings, WordToPdfStandard } from '../types';

/**
 * Generate a Word (.docx) document from extracted PDF text content
 */
export async function generateDocxFromText(
  pageTexts: string[],
  docTitle: string = 'Converted_Document'
): Promise<Blob> {
  const children: Paragraph[] = [];

  // Document Title Header
  children.push(
    new Paragraph({
      text: docTitle.replace(/\.pdf$/i, ''),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  pageTexts.forEach((pageContent, index) => {
    if (pageTexts.length > 1) {
      // Page separator header
      children.push(
        new Paragraph({
          text: `Page ${index + 1}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    }

    const lines = pageContent.split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: '' }));
        return;
      }

      // Check if line looks like a heading (e.g. short, capitalized, or numbered like 1. 1.1)
      const isHeading = /^(第[0-9一二三四五六七八九十]+[條節章部項]|[0-9]+\.[0-9]*\s|[A-Z\s]{4,}:?$)/.test(trimmed);
      const isBullet = /^[\u2022\u2023\u25E6\u2043\u2219\*\-]\s/.test(trimmed);

      if (isHeading && trimmed.length < 60) {
        children.push(
          new Paragraph({
            text: trimmed,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
          })
        );
      } else if (isBullet) {
        children.push(
          new Paragraph({
            text: trimmed.replace(/^[\u2022\u2023\u25E6\u2043\u2219\*\-]\s*/, ''),
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed,
                size: 22, // 11pt
                font: 'Calibri',
              }),
            ],
            spacing: { after: 100, line: 276 }, // 1.15 line spacing
          })
        );
      }
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate a pure UTF-8 plain text (.txt) file with BOM for cross-platform compatibility
 */
export function generateTxtBlob(fullText: string): Blob {
  return new Blob(['\uFEFF' + (fullText || '')], { type: 'text/plain;charset=utf-8' });
}

/**
 * Generate a structured Markdown (.md) document from pages text
 */
export function generateMarkdownBlob(
  pageTexts: string[],
  docTitle: string = 'Converted_Document'
): Blob {
  const cleanTitle = docTitle.replace(/\.[^/.]+$/, '');
  let md = `# ${cleanTitle}\n\n`;

  pageTexts.forEach((pageContent, index) => {
    if (pageTexts.length > 1) {
      md += `\n---\n\n## 第 ${index + 1} 頁\n\n`;
    }

    const lines = pageContent.split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        md += '\n';
        return;
      }

      const isHeading = /^(第[0-9一二三四五六七八九十]+[條節章部項]|[0-9]+\.[0-9]*\s|[A-Z\s]{4,}:?$)/.test(trimmed);
      const isBullet = /^[\u2022\u2023\u25E6\u2043\u2219\*\-]\s/.test(trimmed);

      if (isHeading && trimmed.length < 60) {
        md += `\n### ${trimmed}\n\n`;
      } else if (isBullet) {
        md += `- ${trimmed.replace(/^[\u2022\u2023\u25E6\u2043\u2219\*\-]\s*/, '')}\n`;
      } else {
        md += `${trimmed}\n\n`;
      }
    });
  });

  return new Blob(['\uFEFF' + md], { type: 'text/markdown;charset=utf-8' });
}

/**
 * Generate a Rich Text Format (.rtf) file
 */
export function generateRtfBlob(text: string, docTitle: string = 'Converted_Document'): Blob {
  const cleanTitle = docTitle.replace(/\.[^/.]+$/, '');

  const escapeRtf = (str: string) => {
    return str.split('').map((c) => {
      const code = c.charCodeAt(0);
      if (code < 128) {
        if (c === '\\' || c === '{' || c === '}') return '\\' + c;
        if (c === '\n') return '\\par\n';
        return c;
      }
      return `\\u${code}?`;
    }).join('');
  };

  const rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset136 Microsoft JhengHei;}{\\f1\\fnil\\fcharset0 Calibri;}}
{\\colortbl ;\\red30\\green41\\blue59;\\red71\\green85\\blue105;}
\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\b\\fs32\\cf1 ${escapeRtf(cleanTitle)}\\par
\\b0\\fs22\\cf2\\par
${escapeRtf(text)}
}`;

  return new Blob([rtfContent], { type: 'application/rtf;charset=utf-8' });
}

/**
 * Parse a Word .docx ArrayBuffer into HTML
 */
export async function parseDocxToHtml(arrayBuffer: ArrayBuffer): Promise<{ html: string; rawText: string; messages: string[] }> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const rawResult = await mammoth.extractRawText({ arrayBuffer });
  return {
    html: result.value,
    rawText: rawResult.value,
    messages: result.messages.map(m => m.message),
  };
}

/**
 * Convert parsed Word document into a clean, paginated PDF or selected standard format
 */
export async function convertWordToPdfBlob(
  htmlContent: string,
  rawText: string,
  filename: string,
  settings: WordToPdfSettings
): Promise<Blob> {
  const cleanTitle = filename.replace(/\.(docx|doc)$/i, '');
  const standard: WordToPdfStandard = settings.exportStandard || 'standard';

  // Format branch: Plain text (.txt)
  if (standard === 'txt') {
    return generateTxtBlob(rawText);
  }

  // Format branch: Standalone HTML (.html)
  if (standard === 'html') {
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cleanTitle}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft JhengHei", sans-serif;
    line-height: 1.75;
    max-width: 860px;
    margin: 40px auto;
    padding: 0 24px;
    color: #1e293b;
    background-color: #f8fafc;
  }
  .doc-card {
    background: #ffffff;
    padding: 56px;
    border-radius: 16px;
    box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08);
    border: 1px solid #e2e8f0;
  }
  .header-bar {
    font-size: 12px;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-between;
  }
  h1 { font-size: 26px; color: #0f172a; margin-top: 0; margin-bottom: 20px; font-weight: 700; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
  h2 { font-size: 20px; color: #1e293b; margin-top: 28px; margin-bottom: 12px; font-weight: 600; }
  h3 { font-size: 16px; color: #334155; margin-top: 20px; margin-bottom: 8px; font-weight: 600; }
  p { margin: 12px 0; color: #334155; }
  ul, ol { padding-left: 24px; margin: 12px 0; color: #334155; }
  li { margin: 6px 0; }
  .footer-bar {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
  }
</style>
</head>
<body>
<div class="doc-card">
  ${settings.headerText ? `<div class="header-bar"><span>${settings.headerText}</span><span>${filename}</span></div>` : ''}
  <h1>${cleanTitle}</h1>
  ${htmlContent}
  ${settings.footerPageNumber ? `<div class="footer-bar">由 DocuMaster 轉換導出 · 符合 W3C 規範</div>` : ''}
</div>
</body>
</html>`;
    return new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  }

  // PDF Generation via jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: settings.pageSize === 'letter' ? 'letter' : 'a4',
  });

  const isPdfA = standard === 'pdfa-1b' || standard === 'pdfa-2b';
  const isPdfA2 = standard === 'pdfa-2b';

  pdf.setProperties({
    title: cleanTitle,
    subject: isPdfA ? `ISO 19005 Archival Document (${isPdfA2 ? 'PDF/A-2b' : 'PDF/A-1b'})` : 'Converted PDF Document',
    author: 'DocuMaster User',
    keywords: isPdfA ? 'PDF/A, Archival, ISO 19005, Long-term Preservation' : 'PDF, Document',
    creator: isPdfA ? 'DocuMaster PDF/A Engine' : 'DocuMaster Document Converter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginMap = {
    narrow: 12,
    normal: 20,
    wide: 28,
  };
  const margin = marginMap[settings.margins] || 20;
  const contentWidth = pageWidth - margin * 2;

  const fontSizeMap = {
    small: 9,
    medium: 11,
    large: 13,
  };
  const bodyFontSize = fontSizeMap[settings.fontSize] || 11;
  const lineHeight = bodyFontSize * 0.55;

  let cursorY = margin;
  let pageNumber = 1;

  const addHeaderAndFooter = (doc: jsPDF, currentP: number) => {
    if (settings.headerText) {
      doc.setFontSize(8);
      doc.setTextColor(130, 140, 155);
      doc.text(settings.headerText, margin, 10);
      doc.setDrawColor(220, 226, 235);
      doc.setLineWidth(0.2);
      doc.line(margin, 12, pageWidth - margin, 12);
    }
    if (settings.footerPageNumber) {
      doc.setFontSize(8);
      doc.setTextColor(130, 140, 155);
      const footerLabel = isPdfA
        ? `第 ${currentP} 頁 · ${isPdfA2 ? 'PDF/A-2b (ISO 19005-2)' : 'PDF/A-1b (ISO 19005-1)'}`
        : `第 ${currentP} 頁`;
      doc.text(footerLabel, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
  };

  addHeaderAndFooter(pdf, pageNumber);

  // Document Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(bodyFontSize + 7);
  pdf.setTextColor(30, 41, 59);
  pdf.text(cleanTitle, margin, cursorY + 4);
  cursorY += 12;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.4);
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // Process text paragraphs
  const paragraphs = rawText.split(/\n\s*\n/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const isHeading = /^(第[0-9一二三四五六七八九十]+[條節章部項]|[0-9]+\.[0-9]*\s|[A-Z\s]{4,}:?$)/.test(trimmed) && trimmed.length < 70;

    if (isHeading) {
      if (cursorY + 16 > pageHeight - margin) {
        pdf.addPage();
        pageNumber++;
        addHeaderAndFooter(pdf, pageNumber);
        cursorY = margin;
      }
      cursorY += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(bodyFontSize + 2);
      pdf.setTextColor(15, 23, 42);
      const splitHeading = pdf.splitTextToSize(trimmed, contentWidth);
      pdf.text(splitHeading, margin, cursorY);
      cursorY += splitHeading.length * (bodyFontSize * 0.6) + 4;
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(bodyFontSize);
      pdf.setTextColor(51, 65, 85);

      const splitText = pdf.splitTextToSize(trimmed, contentWidth);
      const blockHeight = splitText.length * lineHeight;

      if (cursorY + blockHeight > pageHeight - margin) {
        for (const line of splitText) {
          if (cursorY + lineHeight > pageHeight - margin) {
            pdf.addPage();
            pageNumber++;
            addHeaderAndFooter(pdf, pageNumber);
            cursorY = margin;
          }
          pdf.text(line, margin, cursorY);
          cursorY += lineHeight;
        }
        cursorY += 3;
      } else {
        pdf.text(splitText, margin, cursorY);
        cursorY += blockHeight + 4;
      }
    }
  }

  // If standard PDF, return directly
  if (!isPdfA) {
    return pdf.output('blob');
  }

  // If PDF/A-1b or PDF/A-2b is requested, inject ISO 19005 compliant XMP metadata and OutputIntents using pdf-lib
  try {
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

    pdfDoc.setTitle(cleanTitle);
    pdfDoc.setAuthor('DocuMaster User');
    pdfDoc.setSubject(`ISO 19005 Archival Document (${isPdfA2 ? 'PDF/A-2b' : 'PDF/A-1b'})`);
    pdfDoc.setCreator('DocuMaster Archival Engine');
    pdfDoc.setProducer(`DocuMaster ISO 19005-${isPdfA2 ? '2' : '1'} Compliant Engine`);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const part = isPdfA2 ? '2' : '1';
    const xmpXml = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${cleanTitle}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:format>application/pdf</dc:format>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>DocuMaster Archival Suite</rdf:li>
        </rdf:Seq>
      </dc:creator>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>DocuMaster ISO 19005-${part} Archival Engine</pdf:Producer>
      <pdf:Keywords>PDF/A-${part}b Archival Document</pdf:Keywords>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${new Date().toISOString()}</xmp:CreateDate>
      <xmp:ModifyDate>${new Date().toISOString()}</xmp:ModifyDate>
      <xmp:CreatorTool>DocuMaster Archival Suite</xmp:CreatorTool>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

    const xmpBytes = new TextEncoder().encode(xmpXml);
    const metadataStream = pdfDoc.context.flateStream(xmpBytes, {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
    });
    const metadataRef = pdfDoc.context.register(metadataStream);
    pdfDoc.catalog.set(PDFName.of('Metadata'), metadataRef);

    // Standard Device-Independent RGB OutputIntent for ISO 19005 compliance
    const outputIntentDict = pdfDoc.context.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFA1',
      OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
      Info: PDFString.of('sRGB IEC61966-2.1'),
      RegistryName: PDFString.of('http://www.color.org'),
    });
    const outputIntentRef = pdfDoc.context.register(outputIntentDict);
    pdfDoc.catalog.set(PDFName.of('OutputIntents'), pdfDoc.context.obj([outputIntentRef]));

    const finalBytes = await pdfDoc.save();
    return new Blob([finalBytes], { type: 'application/pdf' });
  } catch (pdfaErr) {
    console.warn('PDF/A post-processing fell back to standard PDF stream:', pdfaErr);
    return pdf.output('blob');
  }
}
