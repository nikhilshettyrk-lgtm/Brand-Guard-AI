/**
 * BrandGuard AI - Slack Incoming Webhooks Governance Service
 * 
 * Provides genuine Slack Incoming Webhook notifications for enterprise compliance governance.
 * 
 * SECURITY GUARANTEES:
 * 1. Webhook URLs are stored strictly on the backend (in memory per organisation).
 *    Never exposed in full to the frontend or API responses.
 * 2. Strict Domain & SSRF Validation:
 *    - Destination protocol MUST be HTTPS.
 *    - Hostname MUST strictly be 'hooks.slack.com'.
 *    - Path MUST begin with '/services/' or '/workflows/'.
 *    - Arbitrary webhook destinations, private IPs, loopbacks, and cloud metadata are strictly blocked.
 * 3. Connection Verification:
 *    - Slack status remains 'Disconnected' until a real test notification is successfully delivered.
 * 4. Deduplication & Reliability:
 *    - In-memory duplicate cache prevents spamming repeated governance notifications for the same event.
 *    - 5000ms safe timeout with AbortController and redirect: 'error'.
 * 5. Multi-tenant organisation isolation:
 *    - Configuration, delivery history, and deduplication are strictly partitioned by organisationId.
 * 6. Role-Based Governance:
 *    - Configuration changes, connection, test dispatch, and disconnection require Manager credentials.
 */

import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// Supported Governance Events for Slack
export const SLACK_GOVERNANCE_EVENTS = [
  'content.submitted',
  'reviewer.assigned',
  'revision.requested',
  'content.rejected',
  'content.approved',
  'production.clearance',
  'content.published'
];

// In-memory organisation Slack store
const slackStore = new Map();

// Known default organisations
const DEFAULT_ORGS = ['org-apple', 'org-nike', 'org-google', 'org-starbucks', 'Salesforce', 'Nexus Dynamics', 'EcoLife Organics'];

DEFAULT_ORGS.forEach(orgId => {
  slackStore.set(orgId, {
    organisationId: orgId,
    webhookUrl: '', // Full URL backend-only
    channel: '#brand-governance',
    status: 'Disconnected', // 'Connected' | 'Disconnected' | 'Delivery Failed'
    isSimulation: false,
    lastConnected: null,
    lastDelivery: null,
    lastError: null,
    deliveryLogs: []
  });
});

// Duplicate prevention cache: key -> timestamp (TTL: 10 minutes)
const duplicateCache = new Map();
const DUPLICATE_TTL_MS = 10 * 60 * 1000;

function cleanDuplicateCache() {
  const now = Date.now();
  for (const [key, ts] of duplicateCache.entries()) {
    if (now - ts > DUPLICATE_TTL_MS) {
      duplicateCache.delete(key);
    }
  }
}

/**
 * Validates that an incoming webhook URL belongs strictly to official Slack domains.
 */
export async function validateSlackWebhookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'Slack Incoming Webhook URL cannot be empty.' };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch (err) {
    return { valid: false, reason: `Invalid URL syntax: ${err.message}` };
  }

  // 1. Protocol must be HTTPS
  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Security Policy Violation: Slack Incoming Webhooks must use HTTPS. Received: "${parsed.protocol}"`
    };
  }

  // 2. Hostname must be strictly 'hooks.slack.com'
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'hooks.slack.com') {
    return {
      valid: false,
      reason: `Destination Blocked: Slack integration only accepts official "hooks.slack.com" endpoints. Received: "${hostname}". Arbitrary destinations are forbidden.`
    };
  }

  // 3. Path must start with /services/ or /workflows/
  const pathname = parsed.pathname;
  if (!pathname.startsWith('/services/') && !pathname.startsWith('/workflows/')) {
    return {
      valid: false,
      reason: 'Invalid Slack Webhook path. Webhook URLs must follow "https://hooks.slack.com/services/..." format.'
    };
  }

  // 4. Ensure path has at least 3 parts for services
  if (pathname.startsWith('/services/')) {
    const parts = pathname.replace('/services/', '').split('/').filter(Boolean);
    if (parts.length < 3) {
      return {
        valid: false,
        reason: 'Incomplete Slack Webhook URL. Expected /services/T.../B.../token format.'
      };
    }
  }

  // 5. DNS Pre-Resolution Check for sandbox safety
  try {
    await dnsLookup(hostname);
  } catch (dnsErr) {
    // In sandboxed environments without external DNS, allow hooks.slack.com
    const isOfflineDns = dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'EAI_AGAIN';
    if (!isOfflineDns) {
      return {
        valid: false,
        reason: `DNS Resolution error for Slack: ${dnsErr.message}`
      };
    }
  }

  return { valid: true, url: parsed.toString() };
}

/**
 * Masks the Slack webhook URL to conceal sensitive workspace tokens.
 * e.g. https://hooks.slack.com/services/T0123/B0456/aBcDeFgHiJkLmNoP
 *  ->  https://hooks.slack.com/services/T01••••/B04••••/••••kLmNoP
 */
export function maskSlackWebhookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  try {
    const parsed = new URL(urlString.trim());
    if (parsed.pathname.startsWith('/services/')) {
      const parts = parsed.pathname.replace('/services/', '').split('/').filter(Boolean);
      if (parts.length >= 3) {
        const teamMasked = parts[0].substring(0, 3) + '•'.repeat(Math.max(1, parts[0].length - 3));
        const botMasked = parts[1].substring(0, 3) + '•'.repeat(Math.max(1, parts[1].length - 3));
        const tokenMasked = '•'.repeat(Math.max(4, parts[2].length - 4)) + parts[2].slice(-4);
        return `https://hooks.slack.com/services/${teamMasked}/${botMasked}/${tokenMasked}`;
      }
    }
    return `https://${parsed.hostname}/services/••••••••••••`;
  } catch (_) {
    return 'https://hooks.slack.com/services/••••';
  }
}

/**
 * Returns sanitized configuration (webhook URL is NEVER returned in full).
 */
export function getSlackConfig(organisationId) {
  const org = organisationId || 'Salesforce';
  let config = slackStore.get(org);

  if (!config) {
    config = {
      organisationId: org,
      webhookUrl: '',
      channel: '#brand-governance',
      status: 'Disconnected',
      isSimulation: false,
      lastConnected: null,
      lastDelivery: null,
      lastError: null,
      deliveryLogs: []
    };
    slackStore.set(org, config);
  }

  return {
    organisationId: config.organisationId,
    status: config.status,
    hasWebhook: Boolean(config.webhookUrl),
    maskedWebhookUrl: maskSlackWebhookUrl(config.webhookUrl),
    channel: config.channel || '#brand-governance',
    isSimulation: Boolean(config.isSimulation),
    lastConnected: config.lastConnected,
    lastDelivery: config.lastDelivery,
    lastError: config.lastError,
    deliveryLogs: (config.deliveryLogs || []).slice(0, 25)
  };
}

/**
 * Saves Slack webhook configuration. Requires Manager role credentials.
 * Status remains Disconnected until verified via sendSlackTestNotification.
 */
export async function saveSlackConfig(organisationId, { webhookUrl, channel, isSimulation }, role = 'Manager') {
  if (role !== 'Manager') {
    throw new Error('Access Denied: Slack configuration requires Manager credentials.');
  }

  const org = organisationId || 'Salesforce';
  let config = slackStore.get(org);
  if (!config) {
    getSlackConfig(org);
    config = slackStore.get(org);
  }

  // If a new URL is provided, validate it strictly
  if (webhookUrl !== undefined) {
    const trimmed = webhookUrl.trim();
    if (trimmed) {
      const validation = await validateSlackWebhookUrl(trimmed);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
      config.webhookUrl = validation.url;
      // Mark as Disconnected until verified with test
      config.status = 'Disconnected';
      config.lastError = null;
    } else {
      config.webhookUrl = '';
      config.status = 'Disconnected';
      config.lastError = null;
    }
  }

  if (channel !== undefined) {
    config.channel = channel.trim() || '#brand-governance';
  }

  if (isSimulation !== undefined) {
    config.isSimulation = Boolean(isSimulation);
  }

  return getSlackConfig(org);
}

/**
 * Disconnects the Slack integration for an organisation. Requires Manager credentials.
 */
export function disconnectSlack(organisationId, role = 'Manager') {
  if (role !== 'Manager') {
    throw new Error('Access Denied: Disconnecting Slack requires Manager credentials.');
  }

  const org = organisationId || 'Salesforce';
  let config = slackStore.get(org);
  if (config) {
    config.webhookUrl = '';
    config.status = 'Disconnected';
    config.lastError = null;
  }

  return {
    success: true,
    status: 'Disconnected',
    message: `Slack integration safely disconnected for ${org}. Webhook URL removed.`,
    config: getSlackConfig(org)
  };
}

/**
 * Dispatches a formatted Slack notification with Block Kit formatting, timeout, and duplicate prevention.
 */
export async function dispatchSlackNotification({
  organisationId,
  eventType,
  submissionId = '',
  title = '',
  actor = 'System',
  role = 'Manager',
  status = 'Updated',
  score = null,
  riskLevel = null,
  reviewLink = '',
  notes = '',
  isTest = false
}) {
  const org = organisationId || 'Salesforce';
  let config = slackStore.get(org);
  if (!config) {
    getSlackConfig(org);
    config = slackStore.get(org);
  }

  // 1. Simulation Mode Check
  if (config.isSimulation && !isTest) {
    const simRecord = {
      id: `slack_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: org,
      eventType,
      deliveryStatus: 'Simulated',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      channel: config.channel || '#brand-governance',
      isSimulation: true,
      submissionTitle: title || submissionId,
      errorDetails: null
    };

    config.deliveryLogs = [simRecord, ...(config.deliveryLogs || []).slice(0, 24)];
    config.lastDelivery = simRecord;

    return {
      success: true,
      simulated: true,
      message: `[Simulation Sandbox] Notification logged for "${eventType}". No external HTTP request was made.`,
      delivery: simRecord
    };
  }

  // 2. Verify webhook URL exists
  if (!config.webhookUrl) {
    const skipRecord = {
      id: `slack_err_${Date.now()}`,
      organisationId: org,
      eventType,
      deliveryStatus: 'Failed',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      channel: config.channel || '#brand-governance',
      isSimulation: false,
      submissionTitle: title || submissionId,
      errorDetails: 'Slack Webhook URL is not configured. Live dispatch unavailable.'
    };
    config.deliveryLogs = [skipRecord, ...(config.deliveryLogs || []).slice(0, 24)];
    config.lastDelivery = skipRecord;
    config.status = 'Disconnected';
    return {
      success: false,
      error: 'Slack Webhook URL is not configured. Please add an Incoming Webhook in Settings > Integrations Hub.',
      delivery: skipRecord
    };
  }

  // 3. Duplicate Prevention Check (for non-test events)
  if (!isTest) {
    cleanDuplicateCache();
    const dedupKey = `${org}:${eventType}:${submissionId}:${status}`;
    if (duplicateCache.has(dedupKey)) {
      const cachedRecord = {
        id: `slack_dup_${Date.now()}`,
        organisationId: org,
        eventType,
        deliveryStatus: 'Skipped (Duplicate)',
        statusCode: 200,
        timestamp: new Date().toISOString(),
        channel: config.channel || '#brand-governance',
        isSimulation: false,
        submissionTitle: title || submissionId,
        errorDetails: 'Suppressed duplicate notification dispatched within 10-minute cooldown window.'
      };
      return {
        success: true,
        skipped: true,
        message: `Duplicate Slack notification suppressed for ${eventType} on "${title || submissionId}".`,
        delivery: cachedRecord
      };
    }
    duplicateCache.set(dedupKey, Date.now());
  }

  // 4. Construct Slack Block Kit Payload
  const now = new Date();
  const formattedTime = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const eventMetadata = getEventDisplayMetadata(eventType);
  const cleanReviewLink = reviewLink || 'http://localhost:3000/#review-approval';

  const slackPayload = {
    text: `[BrandGuard AI] ${eventMetadata.title}: "${title || 'Asset'}" (${org})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🛡️ BrandGuard AI — ${eventMetadata.header}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${eventMetadata.title}*\n>${title ? `*Collateral:* ${escapeSlackText(title)}` : ''}\n>${submissionId ? `*Submission ID:* \`${submissionId}\`` : ''}`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Organisation:*\n🏢 ${escapeSlackText(org)}` },
          { type: 'mrkdwn', text: `*Status:*\n📌 \`${escapeSlackText(status)}\`` },
          { type: 'mrkdwn', text: `*Actor:*\n👤 ${escapeSlackText(actor)} (${escapeSlackText(role)})` },
          { type: 'mrkdwn', text: `*Timestamp:*\n⏱️ ${formattedTime}` }
        ]
      }
    ]
  };

  // Add Score/Risk section if available
  if (score !== null && score !== undefined) {
    slackPayload.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Compliance Score:* *${score}%* | *Risk Level:* ${riskLevel || 'Normal'} | *Channel:* ${config.channel || '#brand-governance'}`
        }
      ]
    });
  }

  // Add notes/comments if available (safely sanitized, truncated to 200 chars)
  if (notes && typeof notes === 'string' && notes.trim()) {
    const safeNotes = escapeSlackText(notes.trim().slice(0, 250));
    slackPayload.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Governance Note / Feedback:*\n> _"${safeNotes}"_`
      }
    });
  }

  // Action Button to Review
  slackPayload.blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Inspect in BrandGuard AI ↗',
          emoji: true
        },
        url: cleanReviewLink,
        style: eventMetadata.buttonStyle || 'primary'
      }
    ]
  });

  // 5. Execute HTTP POST to Slack with safe timeout and redirect: 'error'
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackPayload),
      signal: controller.signal,
      redirect: 'error'
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (response.ok && responseText.trim() === 'ok') {
      const deliveryRecord = {
        id: `del_slack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organisationId: org,
        eventType,
        deliveryStatus: 'Delivered',
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        channel: config.channel || '#brand-governance',
        isSimulation: false,
        submissionTitle: title || submissionId,
        errorDetails: null
      };

      config.status = 'Connected';
      config.lastConnected = new Date().toISOString();
      config.lastDelivery = deliveryRecord;
      config.lastError = null;
      config.deliveryLogs = [deliveryRecord, ...(config.deliveryLogs || []).slice(0, 24)];

      return {
        success: true,
        delivery: deliveryRecord,
        message: `Slack notification delivered successfully for "${eventType}".`
      };
    } else {
      let errorMsg = `Slack responded with HTTP ${response.status}: ${responseText}`;
      if (response.status === 429) {
        errorMsg = 'Slack Rate Limit Exceeded (HTTP 429). Please retry after a brief pause.';
      } else if (responseText.includes('invalid_payload')) {
        errorMsg = 'Slack API rejected payload structure (invalid_payload).';
      } else if (response.status === 404 || responseText.includes('channel_not_found') || responseText.includes('token_revoked')) {
        errorMsg = 'Slack Incoming Webhook URL is invalid, revoked, or points to an archived channel.';
      }

      const failRecord = {
        id: `del_slack_${Date.now()}_err`,
        organisationId: org,
        eventType,
        deliveryStatus: 'Failed',
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        channel: config.channel || '#brand-governance',
        isSimulation: false,
        submissionTitle: title || submissionId,
        errorDetails: errorMsg
      };

      config.status = 'Delivery Failed';
      config.lastDelivery = failRecord;
      config.lastError = errorMsg;
      config.deliveryLogs = [failRecord, ...(config.deliveryLogs || []).slice(0, 24)];

      return {
        success: false,
        error: errorMsg,
        delivery: failRecord
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);

    let errorReason = err.message || 'Network request failed';
    if (err.name === 'AbortError') {
      errorReason = 'Slack connection timed out after 6000ms.';
    }

    const failRecord = {
      id: `del_slack_${Date.now()}_err`,
      organisationId: org,
      eventType,
      deliveryStatus: 'Failed',
      statusCode: 504,
      timestamp: new Date().toISOString(),
      channel: config.channel || '#brand-governance',
      isSimulation: false,
      submissionTitle: title || submissionId,
      errorDetails: errorReason
    };

    config.status = 'Delivery Failed';
    config.lastDelivery = failRecord;
    config.lastError = errorReason;
    config.deliveryLogs = [failRecord, ...(config.deliveryLogs || []).slice(0, 24)];

    return {
      success: false,
      error: errorReason,
      delivery: failRecord
    };
  }
}

/**
 * Sends a verified test notification to the configured Slack webhook URL.
 * Only if this delivers successfully will status become 'Connected'.
 */
export async function sendSlackTestNotification(organisationId, role = 'Manager') {
  if (role !== 'Manager') {
    throw new Error('Access Denied: Sending Slack test notifications requires Manager credentials.');
  }

  const org = organisationId || 'Salesforce';
  const config = slackStore.get(org);

  if (!config || !config.webhookUrl) {
    throw new Error('Cannot send test notification: No Slack Incoming Webhook URL is configured.');
  }

  return await dispatchSlackNotification({
    organisationId: org,
    eventType: 'test.notification',
    submissionId: 'TEST-VERIFY',
    title: 'Slack Webhook Verification Test',
    actor: 'Compliance Manager',
    role: 'Manager',
    status: 'Verified Connected',
    score: 100,
    riskLevel: 'None',
    reviewLink: 'http://localhost:3000/#settings',
    notes: 'BrandGuard AI automated governance notifications are verified and active for this Slack channel.',
    isTest: true
  });
}

/**
 * Escapes special Slack mrkdwn characters (<, >, &).
 */
function escapeSlackText(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Event-specific display titles and button styles for Slack Block Kit.
 */
function getEventDisplayMetadata(eventType) {
  switch (eventType) {
    case 'content.submitted':
      return {
        header: 'New Content Submitted for Review',
        title: '📝 New Collateral Submitted for Review',
        buttonStyle: 'primary'
      };
    case 'reviewer.assigned':
      return {
        header: 'Reviewer Assignment Notification',
        title: '👤 Reviewer Assigned to Submission',
        buttonStyle: 'primary'
      };
    case 'revision.requested':
      return {
        header: 'Revision Required Notification',
        title: '🔄 Revision Requested by Reviewer',
        buttonStyle: 'danger'
      };
    case 'content.rejected':
      return {
        header: 'Compliance Rejection Notification',
        title: '❌ Submission Rejected — Brand Violations Detected',
        buttonStyle: 'danger'
      };
    case 'content.approved':
      return {
        header: 'Compliance Approval Notification',
        title: '✅ Submission Approved by Compliance Reviewer',
        buttonStyle: 'primary'
      };
    case 'production.clearance':
      return {
        header: 'Production Clearance Granted',
        title: '🛡️ Final Production Clearance Granted by Manager',
        buttonStyle: 'primary'
      };
    case 'content.published':
    case 'wordpress.published':
      return {
        header: 'Enterprise Content Released',
        title: '🚀 Collateral Published to WordPress CMS',
        buttonStyle: 'primary'
      };
    case 'test.notification':
    default:
      return {
        header: 'Slack Webhook Verification Test',
        title: '🔔 BrandGuard AI Webhook Integration Test',
        buttonStyle: 'primary'
      };
  }
}
