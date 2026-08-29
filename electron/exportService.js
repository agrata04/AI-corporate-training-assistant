import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, shell } from 'electron';
import sanitize from 'sanitize-filename';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

export async function exportContent({ title, content, format }) {
  const exportsDir = join(app.getPath('userData'), 'exports');
  mkdirSync(exportsDir, { recursive: true });
  const safeTitle = sanitize(title || 'training-output') || 'training-output';
  const filePath = join(exportsDir, `${safeTitle}-${Date.now()}.${format}`);

  if (format === 'md' || format === 'txt') {
    writeFileSync(filePath, content, 'utf8');
  } else if (format === 'docx') {
    const buffer = await createDocx(title, content);
    writeFileSync(filePath, buffer);
  } else if (format === 'pdf') {
    const buffer = await createPdf(title, content);
    writeFileSync(filePath, buffer);
  } else {
    throw new Error(`Unsupported export format: ${format}`);
  }

  await shell.showItemInFolder(filePath);
  return filePath;
}

async function createDocx(title, markdown) {
  const children = [
    new Paragraph({ text: title || 'Training Output', heading: HeadingLevel.TITLE })
  ];

  for (const line of markdown.split('\n')) {
    if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.replace(/^# /, ''), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.replace(/^## /, ''), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith('- ')) {
      children.push(new Paragraph({ text: line.replace(/^- /, ''), bullet: { level: 0 } }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(line || ' ')] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

function createPdf(title, markdown) {
  const docDefinition = {
    content: [
      { text: title || 'Training Output', style: 'title' },
      ...markdown.split('\n').map((line) => {
        if (line.startsWith('# ')) return { text: line.replace(/^# /, ''), style: 'h1' };
        if (line.startsWith('## ')) return { text: line.replace(/^## /, ''), style: 'h2' };
        return { text: line, margin: [0, 2, 0, 2] };
      })
    ],
    styles: {
      title: { fontSize: 22, bold: true, margin: [0, 0, 0, 12] },
      h1: { fontSize: 18, bold: true, margin: [0, 12, 0, 6] },
      h2: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] }
    },
    defaultStyle: { fontSize: 10 }
  };

  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      if (!buffer) reject(new Error('PDF generation failed'));
      else resolve(Buffer.from(buffer));
    });
  });
}
