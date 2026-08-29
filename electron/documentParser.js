import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { app } from 'electron';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import sanitize from 'sanitize-filename';
import { randomUUID } from 'node:crypto';

export const supportedExtensions = ['.pdf', '.ppt', '.pptx', '.docx', '.txt'];

export async function importDocument(projectId, sourcePath) {
  const extension = extname(sourcePath).toLowerCase();
  if (!supportedExtensions.includes(extension)) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  const fileId = randomUUID();
  const uploadsDir = join(app.getPath('userData'), 'uploads', projectId);
  mkdirSync(uploadsDir, { recursive: true });
  const fileName = sanitize(sourcePath.split(/[\\/]/).pop());
  const storedPath = join(uploadsDir, `${fileId}-${fileName}`);
  copyFileSync(sourcePath, storedPath);

  const parsed = await extractText(storedPath, extension);
  return {
    id: fileId,
    fileName,
    filePath: storedPath,
    fileSize: statSync(storedPath).size,
    fileType: extension.replace('.', '').toUpperCase(),
    pages: parsed.pages,
    extractedText: parsed.text.trim()
  };
}

export async function extractText(filePath, extension = extname(filePath).toLowerCase()) {
  if (extension === '.txt') {
    return { text: readFileSync(filePath, 'utf8'), pages: 1 };
  }

  if (extension === '.pdf') {
    const data = await pdfParse(readFileSync(filePath));
    return { text: data.text || '', pages: data.numpages || 0 };
  }

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return { text: result.value || '', pages: 0 };
  }

  if (extension === '.pptx') {
    return extractPptxText(filePath);
  }

  if (extension === '.ppt') {
    return {
      text: 'Legacy .ppt file imported. Convert to .pptx for richer local text extraction.',
      pages: 0
    };
  }

  return { text: '', pages: 0 };
}

async function extractPptxText(filePath) {
  const zip = await JSZip.loadAsync(readFileSync(filePath));
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const slideTexts = [];
  for (const slide of slideFiles) {
    const xml = await zip.file(slide).async('string');
    const text = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)]
      .map((match) => decodeXml(match[1]))
      .join(' ');
    slideTexts.push(`Slide ${slideTexts.length + 1}: ${text}`);
  }

  return { text: slideTexts.join('\n\n'), pages: slideFiles.length };
}

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}
