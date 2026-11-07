/**
 * Vite Dev Server API Plugin for BrandGuard AI
 * Provides secure backend endpoints directly within the local dev and preview environment.
 * Protects GEMINI_API_KEY from exposure to the frontend client.
 */

import { analyzeComplianceWithGemini } from './geminiComplianceService.js';
import { extractDocumentRules } from './ruleExtractorService.js';

export function createApiMiddleware() {
  return async (req, res, next) => {
    const url = req.url?.split('?')[0];

    // 1. Health & Gemini Connection Status Check
    if (url === '/api/health' && req.method === 'GET') {
      const keyPresent = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: keyPresent ? 'Connected' : 'Missing API Key',
        model: 'gemini-3.5-flash',
        hasValidKey: keyPresent,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // 2. Guideline Rule Extraction
    if (url === '/api/extract-guideline-rules' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const { text, filename, organisation: reqOrg } = data;
          const result = extractDocumentRules(text, filename, reqOrg);
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              organisation: result.organisation,
              rules: result.rules
            }));
          }
        } catch (err) {
          console.error('API Error in /api/extract-guideline-rules:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: err.message || 'Failed to extract guideline rules.'
            }));
          }
        }
      });
      return;
    }

    // 3. Content Compliance Analysis with Gemini
    if (url === '/api/analyze-compliance' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          console.log(`[BrandGuard API] Received compliance analysis request for "${payload.title || 'Untitled Asset'}" (${payload.contentType || 'General'}) with ${payload.guidelines?.length || 0} guidelines.`);
          
          const result = await analyzeComplianceWithGemini({
            content: payload.content,
            title: payload.title,
            contentType: payload.contentType,
            guidelines: payload.guidelines,
            sensitivityThreshold: payload.sensitivityThreshold
          });

          console.log(`[BrandGuard API] Analysis completed via Gemini (${result.modelUsed}). Score: ${result.score}%, Status: ${result.status}, Findings: ${result.findings.length}`);
          
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              ...result
            }));
          }
        } catch (err) {
          console.error('[BrandGuard API] Error in compliance analysis:', err.message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: err.message || 'Gemini analysis encountered an internal error.'
            }));
          }
        }
      });
      return;
    }

    // Fall through to next middleware if not an API route
    next();
  };
}

export function brandGuardApiPlugin() {
  const middleware = createApiMiddleware();
  return {
    name: 'brandguard-backend-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}
