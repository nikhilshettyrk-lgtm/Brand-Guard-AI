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
import {
  getWebhookConfig,
  saveWebhookConfig,
  sendTestWebhook,
  dispatchWebhook
} from './webhookService.js';
import {
  getWordPressConfig,
  connectWordPress,
  disconnectWordPress,
  publishToWordPress
} from './wordpressService.js';
import {
  getSlackConfig,
  saveSlackConfig,
  disconnectSlack,
  sendSlackTestNotification,
  dispatchSlackNotification
} from './slackService.js';

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
      if (body.length > 25 * 1024 * 1024) { // 25MB limit for high-res images
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large (exceeds 25MB limit)' }));
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
          sensitivityThreshold: payload.sensitivityThreshold,
          imageData: payload.imageData,
          colorTokens: payload.colorTokens,
          approvedLogoData: payload.approvedLogoData
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

  // API Route 4: Role-based Governance Action Authorization Check
  if (pathname === '/api/governance/validate-action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) { // 1MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const action = (payload.action || '').trim();

        // Permissions Matrix:
        // Creator: create/submit content, re-analyse working copy, inspect feedback
        // Reviewer: view/inspect assignments, approve, reject, request revisions
        // Manager: view all, assign/reassign reviewers, batch approve, final production clearance, approve, reject, request revisions
        const PERMISSIONS = {
          Creator: ['submit_content', 'reanalyze_content', 'inspect_submission'],
          Reviewer: ['submit_content', 'reanalyze_content', 'inspect_submission', 'approve_content', 'reject_content', 'request_revisions'],
          Manager: [
            'submit_content',
            'reanalyze_content',
            'inspect_submission',
            'approve_content',
            'reject_content',
            'request_revisions',
            'assign_reviewer',
            'batch_approve',
            'final_clearance',
            'configure_integrations',
            'publish_content'
          ]
        };

        if (!role || !PERMISSIONS[role]) {
          return sendJson(res, 401, {
            success: false,
            authorized: false,
            error: `Unauthorized: Unknown or missing role credential "${role || 'None'}".`,
            role: role || null,
            action
          });
        }

        const isAllowed = PERMISSIONS[role].includes(action);

        if (!isAllowed) {
          return sendJson(res, 403, {
            success: false,
            authorized: false,
            error: `Forbidden: The "${role}" role is unauthorized to perform "${action}".`,
            role,
            action,
            requiredRoles: Object.keys(PERMISSIONS).filter(r => PERMISSIONS[r].includes(action))
          });
        }

        return sendJson(res, 200, {
          success: true,
          authorized: true,
          role,
          action,
          message: `Action "${action}" validated and authorized for role "${role}".`
        });
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          error: err.message || 'Governance authorization service error.'
        });
      }
    });
    return;
  }

  // API Route 5: Webhook Configuration (GET & POST)
  if (pathname === '/api/webhooks/config') {
    const organisationId = parsedUrl.searchParams.get('organisationId') || 'Salesforce';

    if (req.method === 'GET') {
      const config = getWebhookConfig(organisationId);
      return sendJson(res, 200, { success: true, config });
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
          req.destroy();
        }
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || organisationId;

          if (role !== 'Manager') {
            return sendJson(res, 403, {
              success: false,
              error: 'Forbidden: Configuring webhooks requires Manager credentials.'
            });
          }

          const updatedConfig = await saveWebhookConfig(targetOrg, payload, role);
          return sendJson(res, 200, {
            success: true,
            message: 'Webhook configuration saved successfully with SSRF protection active.',
            config: updatedConfig
          });
        } catch (err) {
          return sendJson(res, 400, {
            success: false,
            error: err.message || 'Failed to save webhook configuration.'
          });
        }
      });
      return;
    }
  }

  // API Route 6: Test Webhook Connectivity
  if (pathname === '/api/webhooks/test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const targetOrg = payload.organisationId || 'Salesforce';

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Dispatching test webhooks requires Manager credentials.'
          });
        }

        const result = await sendTestWebhook(targetOrg, role);
        return sendJson(res, 200, {
          success: result.success,
          delivery: result.delivery,
          message: result.success
            ? 'Test webhook delivered successfully!'
            : `Webhook test completed with response status ${result.delivery?.statusCode || 'Error'}.`
        });
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          error: err.message || 'Failed to dispatch test webhook.'
        });
      }
    });
    return;
  }

  // API Route 7: Dispatch Webhook Event (Internal / Automated Workflows)
  if (pathname === '/api/webhooks/dispatch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const targetOrg = payload.organisationId || 'Salesforce';
        const eventType = payload.eventType || 'content.submitted';
        const eventData = payload.data || {};

        const outcome = await dispatchWebhook(targetOrg, eventType, eventData);
        return sendJson(res, 200, {
          success: outcome.success !== false,
          ...outcome
        });
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          error: err.message || 'Webhook dispatch error.'
        });
      }
    });
    return;
  }

  // API Route 8: WordPress Configuration (GET)
  if (pathname === '/api/wordpress/config' && req.method === 'GET') {
    const organisationId = parsedUrl.searchParams.get('organisationId') || 'Salesforce';
    const config = getWordPressConfig(organisationId);
    return sendJson(res, 200, { success: true, config });
  }

  // API Route 9: WordPress Connection & Authentication Verification (POST)
  if (pathname === '/api/wordpress/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const targetOrg = payload.organisationId || 'Salesforce';

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Connecting WordPress requires Manager credentials.'
          });
        }

        const result = await connectWordPress(targetOrg, payload, role);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          status: 'Authentication Failed',
          error: err.message || 'WordPress connection error.'
        });
      }
    });
    return;
  }

  // API Route 10: WordPress Disconnect (POST)
  if (pathname === '/api/wordpress/disconnect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const targetOrg = payload.organisationId || 'Salesforce';

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Disconnecting WordPress requires Manager credentials.'
          });
        }

        const result = disconnectWordPress(targetOrg, role);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          error: err.message || 'WordPress disconnect error.'
        });
      }
    });
    return;
  }

  // API Route 11: Real WordPress Content Publishing (POST)
  if (pathname === '/api/wordpress/publish' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Publishing to WordPress requires Manager credentials.'
          });
        }

        if (!payload.isProductionCleared) {
          return sendJson(res, 403, {
            success: false,
            error: 'Production Clearance Required: Content must receive final Manager clearance before external WordPress publishing.'
          });
        }

        const result = await publishToWordPress({
          ...payload,
          role
        });

        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          error: err.message || 'Failed to publish to WordPress.'
        });
      }
    });
    return;
  }

  // API Route 12: Slack Configuration Query (GET)
  if (pathname === '/api/slack/config' && req.method === 'GET') {
    const org = parsedUrl.searchParams.get('organisation') || 'Salesforce';
    const config = getSlackConfig(org);
    return sendJson(res, 200, { success: true, config });
  }

  // API Route 13: Slack Connection & Configuration Save (POST)
  if (pathname === '/api/slack/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const targetOrg = payload.organisationId || 'Salesforce';

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Configuring Slack Incoming Webhooks requires Manager credentials.'
          });
        }

        const savedConfig = await saveSlackConfig(targetOrg, payload, role);
        return sendJson(res, 200, {
          success: true,
          message: 'Slack configuration saved. Run a test notification to verify connection.',
          config: savedConfig
        });
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          error: err.message || 'Slack configuration error.'
        });
      }
    });
    return;
  }

  // API Route 14: Slack Test Notification (POST)
  if (pathname === '/api/slack/test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const targetOrg = payload.organisationId || 'Salesforce';

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Sending Slack test notifications requires Manager credentials.'
          });
        }

        const result = await sendSlackTestNotification(targetOrg, role);
        const statusCode = result.success ? 200 : 400;
        return sendJson(res, statusCode, {
          ...result,
          config: getSlackConfig(targetOrg)
        });
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          error: err.message || 'Failed to dispatch Slack test event.'
        });
      }
    });
    return;
  }

  // API Route 15: Slack Disconnect (POST)
  if (pathname === '/api/slack/disconnect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const headerRole = req.headers['x-brandguard-role'];
        const role = (headerRole || payload.role || '').trim();
        const targetOrg = payload.organisationId || 'Salesforce';

        if (role !== 'Manager') {
          return sendJson(res, 403, {
            success: false,
            error: 'Forbidden: Disconnecting Slack requires Manager credentials.'
          });
        }

        const result = disconnectSlack(targetOrg, role);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 500, {
          success: false,
          error: err.message || 'Slack disconnect error.'
        });
      }
    });
    return;
  }

  // API Route 16: Slack Governance Event Dispatch (POST)
  if (pathname === '/api/slack/dispatch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { organisationId, eventType, data = {} } = payload;
        const targetOrg = organisationId || 'Salesforce';

        const result = await dispatchSlackNotification({
          organisationId: targetOrg,
          eventType,
          submissionId: data.submissionId,
          title: data.title,
          actor: data.actor || data.reviewer || data.manager || 'Compliance Officer',
          role: data.role || 'Manager',
          status: data.status,
          score: data.score,
          riskLevel: data.riskLevel,
          reviewLink: data.reviewLink,
          notes: data.notes || data.clearanceNotes
        });

        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          error: err.message || 'Slack dispatch error.'
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
