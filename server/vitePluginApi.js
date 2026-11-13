/**
 * Vite Dev Server API Plugin for BrandGuard AI
 * Provides secure backend endpoints directly within the local dev and preview environment.
 * Protects GEMINI_API_KEY from exposure to the frontend client.
 */

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
            sensitivityThreshold: payload.sensitivityThreshold,
            imageData: payload.imageData,
            colorTokens: payload.colorTokens,
            approvedLogoData: payload.approvedLogoData
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

    // 4. Role-based Governance Action Authorization Check
    if (url === '/api/governance/validate-action' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
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
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              authorized: false,
              error: `Unauthorized: Unknown or missing role credential "${role || 'None'}".`,
              role: role || null,
              action
            }));
            return;
          }

          const isAllowed = PERMISSIONS[role].includes(action);

          if (!isAllowed) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              authorized: false,
              error: `Forbidden: The "${role}" role is unauthorized to perform "${action}".`,
              role,
              action,
              requiredRoles: Object.keys(PERMISSIONS).filter(r => PERMISSIONS[r].includes(action))
            }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            authorized: true,
            role,
            action,
            message: `Action "${action}" validated and authorized for role "${role}".`
          }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Governance authorization service error.'
          }));
        }
      });
      return;
    }

    // 5. Webhook Configuration (GET & POST)
    if (url === '/api/webhooks/config') {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const organisationId = parsedUrl.searchParams.get('organisationId') || 'Salesforce';

      if (req.method === 'GET') {
        const config = getWebhookConfig(organisationId);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, config }));
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const headerRole = req.headers['x-brandguard-role'];
            const role = (headerRole || payload.role || '').trim();
            const targetOrg = payload.organisationId || organisationId;

            if (role !== 'Manager') {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: 'Forbidden: Configuring webhooks requires Manager credentials.'
              }));
              return;
            }

            const updatedConfig = await saveWebhookConfig(targetOrg, payload, role);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              message: 'Webhook configuration saved successfully with SSRF protection active.',
              config: updatedConfig
            }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: err.message || 'Failed to save webhook configuration.'
            }));
          }
        });
        return;
      }
    }

    // 6. Test Webhook Connectivity
    if (url === '/api/webhooks/test' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || 'Salesforce';

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Dispatching test webhooks requires Manager credentials.'
            }));
            return;
          }

          const result = await sendTestWebhook(targetOrg, role);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: result.success,
            delivery: result.delivery,
            message: result.success
              ? 'Test webhook delivered successfully!'
              : `Webhook test completed with response status ${result.delivery?.statusCode || 'Error'}.`
          }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Failed to dispatch test webhook.'
          }));
        }
      });
      return;
    }

    // 7. Dispatch Webhook Event (Internal / Automated Workflows)
    if (url === '/api/webhooks/dispatch' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const targetOrg = payload.organisationId || 'Salesforce';
          const eventType = payload.eventType || 'content.submitted';
          const eventData = payload.data || {};

          const outcome = await dispatchWebhook(targetOrg, eventType, eventData);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: outcome.success !== false,
            ...outcome
          }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Webhook dispatch error.'
          }));
        }
      });
      return;
    }

    // 8. WordPress Configuration (GET)
    if (url === '/api/wordpress/config' && req.method === 'GET') {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const organisationId = parsedUrl.searchParams.get('organisationId') || 'Salesforce';
      const config = getWordPressConfig(organisationId);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, config }));
      return;
    }

    // 9. WordPress Connection & Authentication Verification (POST)
    if (url === '/api/wordpress/connect' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || 'Salesforce';

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Connecting WordPress requires Manager credentials.'
            }));
            return;
          }

          const result = await connectWordPress(targetOrg, payload, role);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            status: 'Authentication Failed',
            error: err.message || 'WordPress connection error.'
          }));
        }
      });
      return;
    }

    // 10. WordPress Disconnect (POST)
    if (url === '/api/wordpress/disconnect' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || 'Salesforce';

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Disconnecting WordPress requires Manager credentials.'
            }));
            return;
          }

          const result = disconnectWordPress(targetOrg, role);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'WordPress disconnect error.'
          }));
        }
      });
      return;
    }

    // 11. Real WordPress Content Publishing (POST)
    if (url === '/api/wordpress/publish' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Publishing to WordPress requires Manager credentials.'
            }));
            return;
          }

          if (!payload.isProductionCleared) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Production Clearance Required: Content must receive final Manager clearance before external WordPress publishing.'
            }));
            return;
          }

          const result = await publishToWordPress({
            ...payload,
            role
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Failed to publish to WordPress.'
          }));
        }
      });
      return;
    }

    // 12. Slack Configuration Query (GET)
    if (url === '/api/slack/config' && req.method === 'GET') {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const org = parsedUrl.searchParams.get('organisation') || 'Salesforce';
      const config = getSlackConfig(org);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(config));
      return;
    }

    // 13. Slack Connection & Configuration Save (POST)
    if (url === '/api/slack/connect' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || 'Salesforce';

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Configuring Slack Incoming Webhooks requires Manager credentials.'
            }));
            return;
          }

          const savedConfig = await saveSlackConfig(targetOrg, payload, role);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: 'Slack configuration saved. Run a test notification to verify connection.',
            config: savedConfig
          }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Slack configuration error.'
          }));
        }
      });
      return;
    }

    // 14. Slack Test Notification (POST)
    if (url === '/api/slack/test' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || 'Salesforce';

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Sending Slack test notifications requires Manager credentials.'
            }));
            return;
          }

          const result = await sendSlackTestNotification(targetOrg, role);
          if (!result.success) {
            res.statusCode = 400;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            ...result,
            config: getSlackConfig(targetOrg)
          }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Failed to dispatch Slack test event.'
          }));
        }
      });
      return;
    }

    // 15. Slack Disconnect (POST)
    if (url === '/api/slack/disconnect' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const headerRole = req.headers['x-brandguard-role'];
          const role = (headerRole || payload.role || '').trim();
          const targetOrg = payload.organisationId || 'Salesforce';

          if (role !== 'Manager') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Disconnecting Slack requires Manager credentials.'
            }));
            return;
          }

          const result = disconnectSlack(targetOrg, role);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Slack disconnect error.'
          }));
        }
      });
      return;
    }

    // 16. Slack Governance Event Dispatch (POST)
    if (url === '/api/slack/dispatch' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
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

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Slack dispatch error.'
          }));
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
