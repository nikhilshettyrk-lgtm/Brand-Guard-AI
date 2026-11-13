/**
 * BrandGuard AI - Governance Workflow Authorization Service
 * Connects frontend action triggers with backend role permission enforcement.
 * 
 * Note: Role switching via the UI is a demonstration control for testing workflows.
 * Production environments enforce permissions using backend-verified identity tokens (SSO/JWT).
 */

const ROLE_PERMISSIONS = {
  Creator: [
    'submit_content',
    'reanalyze_content',
    'inspect_submission'
  ],
  Reviewer: [
    'submit_content',
    'reanalyze_content',
    'inspect_submission',
    'approve_content',
    'reject_content',
    'request_revisions'
  ],
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

/**
 * Synchronous client-side permission check for UI elements.
 */
export function canPerformAction(role, action) {
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].includes(action);
}

/**
 * Backend authorization validation.
 * Calls /api/governance/validate-action to verify that the active role possesses
 * authority to execute the governance action.
 */
export async function validateGovernanceAction(action, role, metadata = {}) {
  try {
    const response = await fetch('/api/governance/validate-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BrandGuard-Role': role || ''
      },
      body: JSON.stringify({
        action,
        role,
        ...metadata
      })
    });

    const data = await response.json();
    return {
      success: response.ok && data.authorized,
      authorized: !!data.authorized,
      status: response.status,
      message: data.message || '',
      error: data.error || (response.ok ? null : `Action denied with status ${response.status}`),
      role: data.role || role,
      action
    };
  } catch (err) {
    // Graceful offline fallback using identical permissions matrix
    const isAllowed = canPerformAction(role, action);
    return {
      success: isAllowed,
      authorized: isAllowed,
      status: isAllowed ? 200 : 403,
      message: isAllowed ? 'Authorized via local governance policy.' : '',
      error: isAllowed ? null : `Forbidden: The ${role} role cannot perform ${action}.`,
      role,
      action,
      fallback: true
    };
  }
}
