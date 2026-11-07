import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

// Setup local PDF.js worker via standard ES new URL
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
  } catch (err) {
    console.warn('Local PDF.js worker initialization warning, using CDN fallback:', err);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
}

/**
 * Extract text from a TXT file
 */
export async function extractTextFromTxt(file) {
  if (file.size === 0) {
    throw new Error('The TXT file is completely empty (0 bytes). Please provide a file with content.');
  }
  if (typeof file.text === 'function') {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error('The TXT file contains only whitespace. Please provide a document with text content.');
    }
    return text.trim();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result || '';
      if (!text.trim()) {
        return reject(new Error('The TXT file contains only whitespace. Please provide a document with text content.'));
      }
      resolve(text.trim());
    };
    reader.onerror = () => reject(new Error('Failed to read the text file. The file may be corrupt or inaccessible.'));
    reader.readAsText(file);
  });
}

/**
 * Extract text from a DOCX file using Mammoth
 */
export async function extractTextFromDocx(file) {
  if (file.size === 0) {
    throw new Error('The DOCX file is empty (0 bytes).');
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const options = typeof Buffer !== 'undefined'
      ? { buffer: Buffer.from(arrayBuffer), arrayBuffer }
      : { arrayBuffer };
    const result = await mammoth.extractRawText(options);
    const text = (result && result.value) ? result.value.trim() : '';
    if (!text) {
      throw new Error('Could not extract readable text from this DOCX file. The document may be blank or contain only non-text shapes.');
    }
    return text;
  } catch (err) {
    if (err.message && err.message.includes('Could not extract readable text')) {
      throw err;
    }
    throw new Error(`DOCX parsing failed: ${err.message || 'Unable to parse document structure. File may be corrupted.'}`);
  }
}

/**
 * Extract text from a PDF file using PDF.js with password protection & corruption handling
 */
export async function extractTextFromPdf(file) {
  if (file.size === 0) {
    throw new Error('The PDF file is empty (0 bytes).');
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      stopAtErrors: false
    });

    // Handle password-protected PDFs explicitly
    loadingTask.onPassword = (callback, reason) => {
      throw new Error('This PDF is password-protected. Please remove the password protection before uploading for review.');
    };

    const pdfDoc = await loadingTask.promise;

    if (!pdfDoc || pdfDoc.numPages === 0) {
      throw new Error('The PDF file contains no pages.');
    }

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map(item => item.str)
        .filter(Boolean);
      fullText += pageStrings.join(' ') + '\n';
    }

    const trimmed = fullText.trim();
    if (!trimmed) {
      throw new Error('The PDF document contains no selectable text (it may be a scanned or flattened raster image without an OCR layer).');
    }
    return trimmed;
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    const name = (err.name || '').toLowerCase();

    if (name.includes('password') || msg.includes('password')) {
      throw new Error('This PDF is password-protected. Please remove the password protection before uploading.');
    }
    if (name.includes('invalid') || msg.includes('corrupted') || msg.includes('invalid pdf') || msg.includes('bad xref')) {
      throw new Error('This PDF file is corrupted or contains an invalid structure.');
    }
    if (err.message && (err.message.includes('password') || err.message.includes('no selectable text') || err.message.includes('contains no pages'))) {
      throw err;
    }
    throw new Error(`PDF parsing failed: ${err.message || 'Could not parse PDF content'}`);
  }
}

/**
 * Extract text from an Image (PNG, JPG, JPEG) using Tesseract.js OCR
 */
export async function extractTextFromImage(file, onProgress) {
  if (file.size === 0) {
    throw new Error('The image file is empty (0 bytes).');
  }
  let worker = null;
  try {
    if (onProgress) onProgress(15, 'Initializing optical character recognition (OCR) engine...');
    worker = await createWorker('eng');

    if (onProgress) onProgress(50, 'Analyzing image pixels and reading text characters...');
    const ret = await worker.recognize(file);
    const text = ret.data && ret.data.text ? ret.data.text.trim() : '';

    await worker.terminate();

    if (!text || text.length === 0) {
      throw new Error('OCR completed, but no legible text was detected in this image. You can type or paste the copy in the editor.');
    }

    return text;
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (e) {}
    }
    if (err.message && err.message.includes('OCR completed, but no legible text')) {
      throw err;
    }
    throw new Error(`Image OCR extraction failed: ${err.message || 'Could not recognize text from this image'}`);
  }
}

/**
 * Main Universal File Text Extractor
 */
export async function extractTextFromFile(file, onProgress) {
  if (!file) throw new Error('No file provided for text extraction');

  const name = file.name.toLowerCase();
  const extension = name.substring(name.lastIndexOf('.'));

  if (extension === '.txt') {
    if (onProgress) onProgress(40, 'Reading TXT document directly...');
    const text = await extractTextFromTxt(file);
    return { text, method: 'Native TXT Parser', fileType: 'TXT' };
  }

  if (extension === '.docx') {
    if (onProgress) onProgress(35, 'Extracting text from DOCX structure...');
    const text = await extractTextFromDocx(file);
    return { text, method: 'DOCX Parser', fileType: 'DOCX' };
  }

  if (extension === '.pdf') {
    if (onProgress) onProgress(30, 'Parsing PDF document pages...');
    const text = await extractTextFromPdf(file);
    return { text, method: 'PDF Parser', fileType: 'PDF' };
  }

  if (['.png', '.jpg', '.jpeg'].includes(extension)) {
    if (onProgress) onProgress(20, 'Starting optical character recognition (OCR)...');
    const text = await extractTextFromImage(file, onProgress);
    return { text, method: 'Tesseract OCR', fileType: extension.replace('.', '').toUpperCase() };
  }

  throw new Error(`Unsupported file type: "${extension}". Allowed formats: PDF, DOCX, TXT, PNG, JPG/JPEG.`);
}
