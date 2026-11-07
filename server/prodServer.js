/**
 * BrandGuard AI - Production Node.js Server
 * Serves the compiled production frontend from `dist/` and hosts the secure backend API.
 * Designed for single-command production deployment on Render, Railway, Fly.io, Heroku, or Docker.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { analyzeComplianceWithGemini } from './geminiComplianceService.js';
import { extractDocumentRules } from './ruleExtractorService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

function sendJson(res, statusCode, data) {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA client-side routing
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found - Please run "npm run build" to generate the frontend dist bundle.');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImmutable = ext !== '.html' && filePath.includes('assets');

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': isImmutable ? 'public, max-age=31536000, immutable' : 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // API Route 1: Health & Gemini Status
  if (pathname === '/api/health' && req.method === 'GET') {
    const keyPresent = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
    return sendJson(res, 200, {
      status: keyPresent ? 'Connected' : 'Missing API Key',
      model: 'gemini-3.5-flash',
      hasValidKey: keyPresent,
      environment: 'production',
      timestamp: new Date().toISOString()
    });
  }

  // API Route 2: Rule Extraction
  if (pathname === '/api/extract-guideline-rules' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { text, filename, organisation: reqOrg } = data;
        const result = extractDocumentRules(text, filename, reqOrg);
        return sendJson(res, 200, {
          success: true,
          organisation: result.organisation,
          rules: result.rules
        });
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          error: err.message || 'Failed to extract guideline rules.'
        });
      }
    });
    return;
  }

  // API Route 3: Content Compliance Analysis with Gemini
  if (pathname === '/api/analyze-compliance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await analyzeComplianceWithGemini({
          content: payload.content,
          title: payload.title,
          contentType: payload.contentType,
          guidelines: payload.guidelines,
          sensitivityThreshold: payload.sensitivityThreshold
        });
        return sendJson(res, 200, {
          success: true,
          ...result
        });
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          error: err.message || 'Gemini analysis encountered an internal error.'
        });
      }
    });
    return;
  }

  // Frontend Static File Serving & SPA Fallback
  if (req.method === 'GET' || req.method === 'HEAD') {
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '') safePath = 'index.html';
    const filePath = path.join(DIST_DIR, safePath);
    return serveStaticFile(req, res, filePath);
  }

  // Method not allowed
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, HOST, () => {
  console.log(`[BrandGuard AI] Production Server running at http://${HOST}:${PORT}`);
  console.log(`[BrandGuard AI] Serving static frontend from: ${DIST_DIR}`);
});
