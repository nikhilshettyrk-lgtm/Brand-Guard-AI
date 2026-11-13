import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  ShieldCheck,
  Send,
  ExternalLink,
  RotateCcw,
  Sliders,
  X,
  Key,
  Lock,
  Globe,
  Radio,
  Sparkles,
  Info
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';

export const SUPPORTED_EVENTS = [
  { id: 'content.submitted', label: 'Content Submitted', desc: 'Triggered when a Creator submits creative text or images for compliance review.' },
  { id: 'content.approved', label: 'Content Approved', desc: 'Triggered when a Reviewer or Manager signs off on brand compliance.' },
  { id: 'content.rejected', label: 'Content Rejected', desc: 'Triggered when submitted creative fails compliance benchmark.' },
  { id: 'production.clearance', label: 'Final Production Clearance', desc: 'Triggered when a Manager authorizes final release for production.' },
  { id: 'content.published', label: 'Content Published', desc: 'Triggered when collateral is dispatched to external CMS or social channels.' }
];

export default function IntegrationsHub() {
  const {
    selectedOrganisation,
    currentUserRole,
    fetchWebhookConfig,
    saveWebhookSettings,
    testWebhookEndpoint,
    fetchWordPressConfig,
    connectWordPress,
    disconnectWordPress,
    fetchSlackConfig,
    connectSlack,
    testSlackNotification,
    disconnectSlack,
    addNotification
  } = useBrandGuard();

  // Active configuration modal: null | 'webhooks' | 'wordpress' | 'linkedin' | 'slack'
  const [activeModal, setActiveModal] = useState(null);

  // Webhooks state
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookEnabledInput, setWebhookEnabledInput] = useState(false);
  const [webhookEventsInput, setWebhookEventsInput] = useState(SUPPORTED_EVENTS.map(e => e.id));
  const [regenerateSecret, setRegenerateSecret] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Genuine WordPress REST API state
  const [wpConfig, setWpConfig] = useState(null);
  const [wpUrlInput, setWpUrlInput] = useState('');
  const [wpUsernameInput, setWpUsernameInput] = useState('');
  const [wpPasswordInput, setWpPasswordInput] = useState('');
  const [connectingWp, setConnectingWp] = useState(false);
  const [wpFeedback, setWpFeedback] = useState(null);

  // Genuine Slack Incoming Webhook state
  const [slackConfig, setSlackConfig] = useState(null);
  const [slackWebhookInput, setSlackWebhookInput] = useState('');
  const [slackChannelInput, setSlackChannelInput] = useState('#brand-governance');
  const [slackSimInput, setSlackSimInput] = useState(false);
  const [savingSlack, setSavingSlack] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackFeedback, setSlackFeedback] = useState(null);

  // Third-party platform configs (stored locally with clear simulation indication)
  const [platformSettings, setPlatformSettings] = useState({
    wordpress: {
      enabled: false,
      endpoint: 'https://cms.enterprise.internal/wp-json/wp/v2',
      username: 'brandguard-publisher',
      hasAppPassword: false,
      simulationMode: true,
      lastSync: null
    },
    linkedin: {
      enabled: false,
      clientId: '',
      orgUrn: 'urn:li:organization:984321',
      hasOAuth: false,
      simulationMode: true,
      lastSync: null
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#brand-governance',
      simulationMode: true,
      lastSync: null
    }
  });

  const [platformModalData, setPlatformModalData] = useState({});

  // Load webhook config from backend for active organisation
  const loadWebhookData = async () => {
    setLoadingWebhooks(true);
    try {
      const cfg = await fetchWebhookConfig(selectedOrganisation);
      if (cfg) {
        setWebhookConfig(cfg);
        setWebhookUrlInput(cfg.url || '');
        setWebhookEnabledInput(Boolean(cfg.enabled));
        setWebhookEventsInput(Array.isArray(cfg.events) && cfg.events.length > 0 ? cfg.events : SUPPORTED_EVENTS.map(e => e.id));
      }
    } catch (err) {
      console.error('Failed to load webhook configuration:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  // Load WordPress config from backend for active organisation
  const loadWordPressData = async () => {
    try {
      const cfg = await fetchWordPressConfig(selectedOrganisation);
      if (cfg) {
        setWpConfig(cfg);
        if (cfg.wpUrl) setWpUrlInput(cfg.wpUrl);
        if (cfg.username) setWpUsernameInput(cfg.username);
      }
    } catch (err) {
      console.error('Failed to load WordPress configuration:', err);
    }
  };

  // Load Slack config from backend for active organisation
  const loadSlackData = async () => {
    try {
      const cfg = await fetchSlackConfig(selectedOrganisation);
      if (cfg) {
        setSlackConfig(cfg);
        if (cfg.channel) setSlackChannelInput(cfg.channel);
        setSlackSimInput(Boolean(cfg.isSimulation));
      }
    } catch (err) {
      console.error('Failed to load Slack configuration:', err);
    }
  };

  useEffect(() => {
    loadWebhookData();
    loadWordPressData();
    loadSlackData();
  }, [selectedOrganisation]);

  const handleOpenSlackModal = () => {
    if (slackConfig) {
      setSlackChannelInput(slackConfig.channel || '#brand-governance');
      setSlackSimInput(Boolean(slackConfig.isSimulation));
    }
    setSlackWebhookInput('');
    setSlackFeedback(null);
    setActiveModal('slack');
  };

  const handleSaveSlackConfig = async (e) => {
    if (e) e.preventDefault();
    if (currentUserRole !== 'Manager') {
      setSlackFeedback({ error: true, message: 'Access Denied: Slack configuration requires Manager credentials.' });
      return;
    }

    setSavingSlack(true);
    setSlackFeedback(null);
    try {
      const res = await connectSlack(selectedOrganisation, {
        webhookUrl: slackWebhookInput.trim(),
        channel: slackChannelInput.trim(),
        isSimulation: slackSimInput
      });

      if (res && res.success) {
        setSlackConfig(res.config);
        setSlackWebhookInput('');
        setSlackFeedback({ error: false, message: res.message || 'Slack preferences saved. Run a test notification to verify connection.' });
        addNotification({
          type: 'success',
          title: 'Slack Settings Updated',
          desc: `Updated Slack settings for ${selectedOrganisation}. Status is verified through test notifications.`
        });
      } else {
        setSlackFeedback({ error: true, message: res?.error || 'Failed to save Slack settings.' });
      }
    } catch (err) {
      setSlackFeedback({ error: true, message: err.message || 'Network error saving Slack configuration.' });
    } finally {
      setSavingSlack(false);
    }
  };

  const handleTestSlack = async () => {
    if (currentUserRole !== 'Manager') {
      setSlackFeedback({ error: true, message: 'Access Denied: Sending test notifications requires Manager credentials.' });
      return;
    }

    setTestingSlack(true);
    setSlackFeedback(null);
    try {
      const res = await testSlackNotification(selectedOrganisation);
      if (res && res.success) {
        setSlackConfig(res.config);
        setSlackFeedback({ error: false, message: 'Test notification delivered successfully! Slack status is now Connected.' });
        addNotification({
          type: 'success',
          title: 'Slack Test Notification Delivered',
          desc: `Verified delivery to ${res.config?.channel || '#brand-governance'} for ${selectedOrganisation}.`
        });
        loadSlackData();
      } else {
        setSlackConfig(res?.config || null);
        setSlackFeedback({ error: true, message: res?.error || 'Slack webhook rejected test notification.' });
        loadSlackData();
      }
    } catch (err) {
      setSlackFeedback({ error: true, message: err.message || 'Error delivering Slack test event.' });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleDisconnectSlack = async () => {
    if (currentUserRole !== 'Manager') {
      alert('Access Denied: Manager credentials required.');
      return;
    }
    if (!window.confirm(`Disconnect Slack incoming webhook for ${selectedOrganisation}? Stored URL will be safely removed.`)) return;
    try {
      const res = await disconnectSlack(selectedOrganisation);
      if (res && res.success) {
        setSlackConfig(res.config);
        setSlackFeedback(null);
        addNotification({
          type: 'info',
          title: 'Slack Disconnected',
          desc: `Slack incoming webhook removed for ${selectedOrganisation}.`
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to disconnect Slack.');
    }
  };

  const handleOpenWordPressModal = () => {
    if (wpConfig) {
      if (wpConfig.wpUrl) setWpUrlInput(wpConfig.wpUrl);
      if (wpConfig.username) setWpUsernameInput(wpConfig.username);
    }
    setWpPasswordInput('');
    setWpFeedback(null);
    setActiveModal('wordpress');
  };

  const handleConnectWordPress = async (e) => {
    if (e) e.preventDefault();
    if (currentUserRole !== 'Manager') {
      setWpFeedback({ error: true, message: 'Access Denied: Connecting WordPress requires Manager credentials.' });
      return;
    }

    setConnectingWp(true);
    setWpFeedback(null);
    try {
      const res = await connectWordPress(selectedOrganisation, {
        wpUrl: wpUrlInput.trim(),
        username: wpUsernameInput.trim(),
        appPassword: wpPasswordInput.trim()
      });

      if (res && res.success) {
        setWpConfig(res.config);
        setWpPasswordInput('');
        setWpFeedback({ error: false, message: res.message || 'Successfully connected to WordPress!' });
        addNotification({
          type: 'success',
          title: 'WordPress REST API Connected',
          desc: `Verified connection to ${wpUrlInput} as ${res.config?.authenticatedUser || wpUsernameInput}.`
        });
      } else {
        setWpConfig(res?.config || null);
        setWpFeedback({ error: true, message: res?.error || 'Authentication Failed: Invalid WordPress credentials.' });
      }
    } catch (err) {
      setWpFeedback({ error: true, message: err.message || 'Network error verifying WordPress.' });
    } finally {
      setConnectingWp(false);
    }
  };

  const handleDisconnectWordPress = async () => {
    if (currentUserRole !== 'Manager') {
      alert('Access Denied: Manager credentials required.');
      return;
    }
    if (!window.confirm(`Disconnect WordPress for ${selectedOrganisation}? Stored credentials will be removed.`)) return;
    try {
      const res = await disconnectWordPress(selectedOrganisation);
      if (res && res.success) {
        setWpConfig(res.config);
        setWpFeedback(null);
        addNotification({
          type: 'info',
          title: 'WordPress Disconnected',
          desc: `WordPress credentials safely removed for ${selectedOrganisation}.`
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to disconnect WordPress.');
    }
  };

  // Handle open webhook modal
  const handleOpenWebhookModal = () => {
    if (webhookConfig) {
      setWebhookUrlInput(webhookConfig.url || '');
      setWebhookEnabledInput(Boolean(webhookConfig.enabled));
      setWebhookEventsInput(Array.isArray(webhookConfig.events) && webhookConfig.events.length > 0 ? webhookConfig.events : SUPPORTED_EVENTS.map(e => e.id));
    }
    setTestResult(null);
    setSaveStatus(null);
    setRegenerateSecret(false);
    setActiveModal('webhooks');
  };

  // Toggle webhook enable/disable directly from card
  const handleToggleWebhookCard = async () => {
    if (currentUserRole !== 'Manager') {
      alert('Access Denied: Enabling or disabling webhooks requires Manager credentials.');
      return;
    }
    const newEnabled = !webhookConfig?.enabled;
    const res = await saveWebhookSettings({
      url: webhookConfig?.url || '',
      enabled: newEnabled,
      events: webhookConfig?.events || SUPPORTED_EVENTS.map(e => e.id)
    }, selectedOrganisation);

    if (res && res.success) {
      setWebhookConfig(res.config);
      addNotification({
        type: 'info',
        title: `Custom Webhooks ${newEnabled ? 'Enabled' : 'Disabled'}`,
        desc: `Webhook dispatch for ${selectedOrganisation} is now ${newEnabled ? 'active' : 'paused'}.`
      });
    } else {
      alert(res?.error || 'Failed to update webhook status.');
    }
  };

  // Save webhook settings from modal
  const handleSaveWebhookModal = async (e) => {
    if (e) e.preventDefault();
    if (currentUserRole !== 'Manager') {
      setSaveStatus({ error: true, message: 'Access Denied: Webhook configuration requires Manager credentials.' });
      return;
    }

    setSavingWebhook(true);
    setSaveStatus(null);
    try {
      const res = await saveWebhookSettings({
        url: webhookUrlInput.trim(),
        enabled: webhookEnabledInput,
        events: webhookEventsInput,
        regenerateSecret
      }, selectedOrganisation);

      if (res && res.success) {
        setWebhookConfig(res.config);
        setSaveStatus({ error: false, message: 'Webhook configuration saved successfully with SSRF protection active!' });
        setRegenerateSecret(false);
        addNotification({
          type: 'success',
          title: 'Webhook Configuration Updated',
          desc: `Webhook endpoint for ${selectedOrganisation} verified and saved.`
        });
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        setSaveStatus({ error: true, message: res?.error || 'Failed to save configuration.' });
      }
    } catch (err) {
      setSaveStatus({ error: true, message: err.message || 'Network error saving webhooks.' });
    } finally {
      setSavingWebhook(false);
    }
  };

  // Trigger test webhook
  const handleTestWebhook = async () => {
    if (currentUserRole !== 'Manager') {
      setTestResult({ error: true, message: 'Access Denied: Webhook test requires Manager credentials.' });
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await testWebhookEndpoint(selectedOrganisation);
      if (res && res.success) {
        setTestResult({
          error: false,
          statusCode: res.delivery?.statusCode || 200,
          durationMs: res.delivery?.durationMs || 0,
          message: res.message || 'Test event dispatched and received successfully!'
        });
        loadWebhookData(); // Refresh delivery history
      } else {
        setTestResult({
          error: true,
          statusCode: res?.delivery?.statusCode || 400,
          durationMs: res?.delivery?.durationMs || 0,
          message: res?.error || res?.delivery?.error || 'Destination rejected test event or blocked by SSRF Guard.'
        });
        loadWebhookData();
      }
    } catch (err) {
      setTestResult({
        error: true,
        message: err.message || 'Webhook test request failed.'
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Toggle third party platforms
  const handleTogglePlatform = (key) => {
    if (currentUserRole !== 'Manager') {
      alert('Access Denied: Managing publishing integrations requires Manager credentials.');
      return;
    }
    setPlatformSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled
      }
    }));
  };

  // Open platform modal
  const handleOpenPlatformModal = (key) => {
    setPlatformModalData({ ...platformSettings[key] });
    setActiveModal(key);
  };

  const handleSavePlatformModal = (key) => {
    if (currentUserRole !== 'Manager') {
      alert('Access Denied: Manager credentials required.');
      return;
    }
    setPlatformSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...platformModalData
      }
    }));
    setActiveModal(null);
    addNotification({
      type: 'info',
      title: `${key.toUpperCase()} Integration Preferences Saved`,
      desc: `Simulation mode active for ${key}. No live unauthorized credentials transmitted.`
    });
  };

  return (
    <div className="neu-card p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/15 text-[#00838F] flex items-center justify-center neu-btn flex-shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#202B45]">
                CMS & Social Publishing Integrations Hub
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
                {selectedOrganisation}
              </span>
            </div>
            <p className="text-xs text-[#5E6E82]">
              Manage automated event webhooks, enterprise CMS connectors, and social distribution channels with SSRF protection and role governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8A99AD] font-medium">Session Role:</span>
          <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
            currentUserRole === 'Manager' ? 'bg-[#536DFE]/15 text-[#536DFE]' : 'bg-[#F59E0B]/15 text-[#B45309]'
          }`}>
            {currentUserRole}
          </span>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* CARD 1: Custom Webhooks */}
        <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center font-bold text-xs">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#202B45] flex items-center gap-1.5">
                    Custom Webhooks
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#047857]">
                      Live Engine
                    </span>
                  </h4>
                  <p className="text-[10px] text-[#8A99AD]">
                    Real-time signed HTTP event webhooks with SSRF guard
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                webhookConfig?.enabled && webhookConfig?.url
                  ? 'bg-[#10B981]/15 text-[#047857] border border-[#10B981]/30'
                  : webhookConfig?.url
                  ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                  : 'bg-[#8A99AD]/15 text-[#5E6E82]'
              }`}>
                {webhookConfig?.enabled && webhookConfig?.url
                  ? 'Active & Verified'
                  : webhookConfig?.url
                  ? 'Configured (Disabled)'
                  : 'Not Configured'}
              </span>
            </div>

            {/* Clear Mode Indication */}
            <div className="p-2 rounded-xl bg-[#536DFE]/5 border border-[#536DFE]/15 text-[10px] text-[#536DFE] flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-[#10B981]" />
              <span>
                <strong>Genuinely Connected:</strong> Direct backend delivery with SSRF loopback guard & HMAC-SHA256 signatures.
              </span>
            </div>

            {/* Endpoint Preview */}
            <div className="text-[11px] font-mono text-[#5E6E82] bg-white/80 p-1.5 rounded-lg border border-white truncate">
              {webhookConfig?.url ? webhookConfig.url : 'No endpoint configured (HTTPS destination required)'}
            </div>

            {/* Last Successful Sync */}
            <div className="text-[10px] text-[#8A99AD] flex items-center justify-between pt-1">
              <span>Last Delivery:</span>
              <strong className="text-[#202B45] font-semibold">
                {webhookConfig?.lastDelivery?.timestamp
                  ? new Date(webhookConfig.lastDelivery.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                  : 'Never'}
              </strong>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleWebhookCard}
                className={`w-9 h-5 rounded-full transition-colors relative neu-input p-0.5 ${
                  webhookConfig?.enabled ? 'bg-[#536DFE]' : 'bg-[#D1D9E6]'
                }`}
                title={currentUserRole === 'Manager' ? 'Toggle Webhook Activation' : 'Manager role required'}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    webhookConfig?.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-bold text-[#5E6E82]">
                {webhookConfig?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenWebhookModal}
              className="neu-btn px-3 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              Configure
            </button>
          </div>
        </div>

        {/* CARD 2: WordPress CMS */}
        <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#21759B]/15 text-[#21759B] flex items-center justify-center font-bold text-xs">
                  W
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#202B45]">
                    WordPress CMS
                  </h4>
                  <p className="text-[10px] text-[#8A99AD]">
                    Automated blog & campaign publishing via REST API
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  wpConfig?.status === 'Connected'
                    ? 'bg-[#10B981]/15 text-[#065F46] border-[#10B981]/30'
                    : wpConfig?.status === 'Authentication Failed'
                    ? 'bg-[#EF4444]/15 text-[#B91C1C] border-[#EF4444]/30'
                    : 'bg-[#64748B]/15 text-[#475569] border-[#64748B]/30'
                }`}
              >
                {wpConfig?.status === 'Connected'
                  ? 'Connected'
                  : wpConfig?.status === 'Authentication Failed'
                  ? 'Authentication Failed'
                  : 'Disconnected'}
              </span>
            </div>

            {/* Clear Mode Indication */}
            {wpConfig?.status === 'Connected' ? (
              <div className="p-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 text-[10px] text-[#065F46] flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-[#10B981]" />
                <span className="truncate">
                  <strong>Genuine REST API Connected:</strong> Authenticated as <em>{wpConfig.authenticatedUser || wpConfig.username}</em>.
                </span>
              </div>
            ) : wpConfig?.status === 'Authentication Failed' ? (
              <div className="p-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[10px] text-[#B91C1C] flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-[#EF4444]" />
                <span className="truncate">
                  <strong>Auth Failed:</strong> {wpConfig.lastError || 'Invalid credentials or URL.'}
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[10px] text-[#B45309] flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#F59E0B]" />
                <span>
                  <strong>Disconnected:</strong> Live publishing requires an Application Password. Simulation sandbox available.
                </span>
              </div>
            )}

            {/* Endpoint Preview */}
            <div className="text-[11px] font-mono text-[#5E6E82] bg-white/80 p-1.5 rounded-lg border border-white truncate">
              {wpConfig?.wpUrl || platformSettings.wordpress.endpoint}
            </div>

            {/* Last Successful Publish */}
            <div className="text-[10px] text-[#8A99AD] flex items-center justify-between pt-1">
              <span>Last Successful Publish:</span>
              <strong className="text-[#202B45] font-semibold truncate max-w-[150px]">
                {wpConfig?.lastPublish ? (
                  wpConfig.lastPublish.url ? (
                    <a
                      href={wpConfig.lastPublish.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#536DFE] hover:underline"
                    >
                      Post #{wpConfig.lastPublish.postId}
                    </a>
                  ) : (
                    `Post #${wpConfig.lastPublish.postId}`
                  )
                ) : (
                  platformSettings.wordpress.lastSync || 'Never'
                )}
              </strong>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTogglePlatform('wordpress')}
                className={`w-9 h-5 rounded-full transition-colors relative neu-input p-0.5 ${
                  platformSettings.wordpress.enabled ? 'bg-[#536DFE]' : 'bg-[#D1D9E6]'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    platformSettings.wordpress.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-bold text-[#5E6E82]">
                {platformSettings.wordpress.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {wpConfig?.status === 'Connected' && currentUserRole === 'Manager' && (
                <button
                  type="button"
                  onClick={handleDisconnectWordPress}
                  className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#EF4444] hover:text-[#DC2626]"
                  title="Disconnect WordPress credentials"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenWordPressModal}
                className="neu-btn px-3 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: LinkedIn Enterprise */}
        <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0077B5]/15 text-[#0077B5] flex items-center justify-center font-bold text-xs">
                  in
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#202B45]">
                    LinkedIn
                  </h4>
                  <p className="text-[10px] text-[#8A99AD]">
                    Corporate announcements & creative social collateral
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#B91C1C] border border-[#EF4444]/25">
                Disconnected (OAuth Required)
              </span>
            </div>

            {/* Clear Mode Indication */}
            <div className="p-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[10px] text-[#B45309] flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#F59E0B]" />
              <span>
                <strong>Simulated Sandbox Available:</strong> Disconnected. Requires verified OAuth 2.0 app authorization.
              </span>
            </div>

            {/* Target Preview */}
            <div className="text-[11px] font-mono text-[#5E6E82] bg-white/80 p-1.5 rounded-lg border border-white truncate">
              {platformSettings.linkedin.orgUrn || 'urn:li:organization:unspecified'}
            </div>

            {/* Last Successful Sync */}
            <div className="text-[10px] text-[#8A99AD] flex items-center justify-between pt-1">
              <span>Last Sync:</span>
              <strong className="text-[#202B45] font-semibold">
                {platformSettings.linkedin.lastSync || 'Never (OAuth Required)'}
              </strong>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTogglePlatform('linkedin')}
                className={`w-9 h-5 rounded-full transition-colors relative neu-input p-0.5 ${
                  platformSettings.linkedin.enabled ? 'bg-[#536DFE]' : 'bg-[#D1D9E6]'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    platformSettings.linkedin.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-bold text-[#5E6E82]">
                {platformSettings.linkedin.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPlatformModal('linkedin')}
              className="neu-btn px-3 py-1.5 text-xs font-bold text-[#5E6E82] hover:text-[#202B45] flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              Configure
            </button>
          </div>
        </div>

        {/* CARD 4: Slack Governance */}
        <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#4A154B]/15 text-[#4A154B] flex items-center justify-center font-bold text-xs">
                  #
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#202B45]">
                    Slack
                  </h4>
                  <p className="text-[10px] text-[#8A99AD]">
                    Real-time compliance alerts & review sign-off requests
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  slackConfig?.status === 'Connected'
                    ? 'bg-[#10B981]/15 text-[#065F46] border-[#10B981]/30'
                    : slackConfig?.status === 'Delivery Failed'
                    ? 'bg-[#EF4444]/15 text-[#B91C1C] border-[#EF4444]/30'
                    : 'bg-[#64748B]/15 text-[#475569] border-[#64748B]/30'
                }`}
              >
                {slackConfig?.status === 'Connected'
                  ? 'Connected'
                  : slackConfig?.status === 'Delivery Failed'
                  ? 'Delivery Failed'
                  : 'Disconnected'}
              </span>
            </div>

            {/* Clear Mode Indication */}
            {slackConfig?.isSimulation ? (
              <div className="p-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[10px] text-[#B45309] flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#F59E0B]" />
                <span>
                  <strong>Simulated Sandbox Active:</strong> Alerts are logged to delivery history without external HTTP requests.
                </span>
              </div>
            ) : slackConfig?.status === 'Connected' ? (
              <div className="p-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 text-[10px] text-[#065F46] flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-[#10B981]" />
                <span className="truncate">
                  <strong>Live Webhook Connected:</strong> Routing compliance notifications to <em>{slackConfig.channel}</em>.
                </span>
              </div>
            ) : slackConfig?.status === 'Delivery Failed' ? (
              <div className="p-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[10px] text-[#B91C1C] flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-[#EF4444]" />
                <span className="truncate">
                  <strong>Delivery Failed:</strong> {slackConfig.lastError || 'Slack rejected last alert dispatch.'}
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-[#64748B]/10 border border-[#64748B]/20 text-[10px] text-[#475569] flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#64748B]" />
                <span>
                  <strong>Disconnected:</strong> Configure an official hooks.slack.com Incoming Webhook to activate real-time alerts.
                </span>
              </div>
            )}

            {/* Webhook Endpoint Preview */}
            <div className="text-[11px] font-mono text-[#5E6E82] bg-white/80 p-1.5 rounded-lg border border-white truncate">
              {slackConfig?.maskedWebhookUrl || 'No incoming webhook configured'}
            </div>

            {/* Target Channel & Last Delivery */}
            <div className="text-[10px] text-[#8A99AD] flex items-center justify-between pt-1">
              <span>Channel: <strong className="text-[#202B45] font-semibold">{slackConfig?.channel || '#brand-governance'}</strong></span>
              <span>
                Last Alert: <strong className="text-[#202B45] font-semibold">
                  {slackConfig?.lastDelivery
                    ? `${slackConfig.lastDelivery.deliveryStatus} (${new Date(slackConfig.lastDelivery.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : 'Never'}
                </strong>
              </span>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/60">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${slackConfig?.status === 'Connected' ? 'text-[#10B981]' : 'text-[#8A99AD]'}`}>
                {slackConfig?.status === 'Connected' ? 'Active Dispatch' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {slackConfig?.status === 'Connected' && currentUserRole === 'Manager' && (
                <button
                  type="button"
                  onClick={handleDisconnectSlack}
                  className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#EF4444] hover:text-[#DC2626]"
                  title="Disconnect Slack webhook"
                >
                  Disconnect
                </button>
              )}
              {slackConfig?.hasWebhook && currentUserRole === 'Manager' && (
                <button
                  type="button"
                  onClick={handleTestSlack}
                  disabled={testingSlack}
                  className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#4A154B] hover:text-[#202B45] flex items-center gap-1 disabled:opacity-50"
                  title="Dispatch a verification test notification to Slack"
                >
                  <Send className="w-3 h-3" />
                  {testingSlack ? 'Testing...' : 'Test'}
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenSlackModal}
                className="neu-btn px-3 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configure
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* FEATURE 3: SLACK DELIVERY TRACKING & AUDIT HISTORY */}
      {/* ============================================================ */}
      <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#4A154B]/15 text-[#4A154B] flex items-center justify-center font-bold text-xs">
              #
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#202B45] flex items-center gap-2">
                Slack Delivery History
                <span className="text-[10px] font-semibold text-[#8A99AD]">
                  ({slackConfig?.deliveryLogs?.length || 0} event{slackConfig?.deliveryLogs?.length === 1 ? '' : 's'})
                </span>
              </h4>
              <p className="text-[10px] text-[#5E6E82]">
                Real-time tracking of automated governance notifications dispatched to Slack Incoming Webhooks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {slackConfig?.hasWebhook && currentUserRole === 'Manager' && (
              <button
                type="button"
                onClick={handleTestSlack}
                disabled={testingSlack}
                className="neu-btn px-2.5 py-1 text-[11px] font-bold text-[#4A154B] flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                {testingSlack ? 'Sending Test...' : 'Send Test Event'}
              </button>
            )}
          </div>
        </div>

        {slackConfig?.deliveryLogs && slackConfig.deliveryLogs.length > 0 ? (
          <div className="max-h-56 overflow-y-auto space-y-1.5 text-xs">
            {slackConfig.deliveryLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-white/80 border border-white flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.deliveryStatus === 'Delivered'
                        ? 'bg-[#10B981]'
                        : log.deliveryStatus === 'Simulated'
                        ? 'bg-[#536DFE]'
                        : log.deliveryStatus === 'Skipped (Duplicate)'
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#EF4444]'
                    }`}
                  />
                  <span className="font-mono font-bold text-[#202B45] text-[10px]">
                    {log.eventType}
                  </span>
                  <span className="text-[#5E6E82] truncate max-w-[220px]">
                    {log.submissionTitle || log.organisationId}
                  </span>
                  <span className="text-[10px] text-[#8A99AD] font-mono">
                    {log.channel}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      log.deliveryStatus === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.deliveryStatus === 'Simulated'
                        ? 'bg-indigo-100 text-indigo-800'
                        : log.deliveryStatus === 'Skipped (Duplicate)'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.deliveryStatus} {log.isSimulation ? '(Simulated)' : ''}
                  </span>
                  <span className="font-mono text-[#8A99AD]">
                    HTTP {log.statusCode || 'ERR'}
                  </span>
                  <span className="text-[#8A99AD]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {log.errorDetails && (
                    <span className="text-[#EF4444] font-medium truncate max-w-[140px]" title={log.errorDetails}>
                      {log.errorDetails}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/50 border border-dashed border-slate-200 text-center text-xs text-[#8A99AD]">
            No Slack governance delivery records recorded yet for <strong>{selectedOrganisation}</strong>. Dispatches occur automatically when reviews are submitted, assigned, approved, rejected, cleared, or published.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: CUSTOM WEBHOOK CONFIGURATION (FEATURE 2) */}
      {/* ============================================================ */}
      {activeModal === 'webhooks' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-2xl w-full space-y-5 border border-white/80 shadow-2xl bg-[#E8ECF3] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center neu-card-sm flex-shrink-0">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45] flex items-center gap-2">
                    Custom Webhook Configuration
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE] font-extrabold">
                      {selectedOrganisation}
                    </span>
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Secure real-time event notifications with SSRF loopback protection and HMAC-SHA256 signing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Security Architecture Notice */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1E3A8A] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                SSRF Guard & Cryptographic Protection Active
              </div>
              <p className="text-[11px] leading-relaxed text-[#1E40AF]">
                Destination endpoints are verified against private RFC-1918 subnets, loopbacks, and cloud-metadata addresses (169.254.169.254). All payloads are cryptographically signed using an organisation-isolated HMAC secret stored strictly on the backend.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWebhookModal} className="space-y-4">
              {/* Endpoint URL Input */}
              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">
                  Webhook Endpoint Destination (HTTPS):
                </label>
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/brandguard/events"
                  className="neu-input w-full px-3 py-2 text-xs font-mono"
                  required
                />
                <p className="text-[10px] text-[#8A99AD] mt-1">
                  Publicly routable HTTPS endpoint to receive JSON webhook payloads.
                </p>
              </div>

              {/* Supported Events Checkboxes */}
              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-2">
                  Subscribed Event Types:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPPORTED_EVENTS.map(evt => {
                    const checked = webhookEventsInput.includes(evt.id);
                    return (
                      <label
                        key={evt.id}
                        className={`p-2.5 rounded-xl neu-card-sm border cursor-pointer transition-all flex items-start gap-2.5 ${
                          checked ? 'bg-white border-[#536DFE]/40' : 'bg-white/40 border-white/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setWebhookEventsInput(prev => prev.filter(e => e !== evt.id));
                            } else {
                              setWebhookEventsInput(prev => [...prev, evt.id]);
                            }
                          }}
                          className="mt-0.5 rounded text-[#536DFE] accent-[#536DFE]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#202B45]">{evt.label}</div>
                          <div className="text-[10px] text-[#8A99AD] leading-tight">{evt.desc}</div>
                          <code className="text-[9px] text-[#536DFE] block mt-0.5 font-mono">{evt.id}</code>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Secret Token Information */}
              <div className="p-3.5 rounded-xl bg-white/70 border border-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#202B45]">
                    <Key className="w-3.5 h-3.5 text-[#536DFE]" />
                    HMAC Signing Secret:
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegenerateSecret(!regenerateSecret)}
                    className="text-[10px] font-bold text-[#536DFE] hover:underline"
                  >
                    {regenerateSecret ? 'Cancel Secret Rotation' : 'Rotate Secret'}
                  </button>
                </div>
                <div className="flex items-center justify-between font-mono text-xs p-2 rounded-lg bg-[#E8ECF3] border border-white text-[#5E6E82]">
                  <span>{regenerateSecret ? 'Will generate new 192-bit secret on save' : (webhookConfig?.secretPreview || 'whsec_••••••••••••••••3a9f')}</span>
                  <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Backend Protected
                  </span>
                </div>
                <p className="text-[10px] text-[#8A99AD]">
                  Plaintext secrets are never stored in browser memory or frontend bundles. Signatures are transmitted in the <code className="text-[#202B45]">X-BrandGuard-Signature</code> header.
                </p>
              </div>

              {/* Status / Feedback Alerts */}
              {saveStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  saveStatus.error ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C]' : 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46]'
                }`}>
                  {saveStatus.error ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  <span>{saveStatus.message}</span>
                </div>
              )}

              {testResult && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-in fade-in ${
                  testResult.error ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C]' : 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46]'
                }`}>
                  {testResult.error ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <div className="space-y-0.5">
                    <div>Status Code: {testResult.statusCode || (testResult.error ? 'Error' : '200 OK')} ({testResult.durationMs}ms)</div>
                    <div className="text-[11px] font-normal">{testResult.message}</div>
                  </div>
                </div>
              )}

              {/* Recent Delivery Logs */}
              {webhookConfig?.deliveryLogs && webhookConfig.deliveryLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/60">
                  <div className="flex items-center justify-between text-xs font-bold text-[#202B45]">
                    <span>Recent Delivery Logs:</span>
                    <span className="text-[10px] text-[#8A99AD] font-medium">Last 10 attempts</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px]">
                    {webhookConfig.deliveryLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-white/70 border border-white flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                          <span className="font-mono text-[10px] text-[#536DFE]">{log.eventType}</span>
                          <span className="text-[#8A99AD] text-[10px] truncate max-w-[160px]">{log.targetUrl}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
                          <span className={`font-bold px-1.5 py-0.2 rounded ${
                            log.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.statusCode || 'ERR'}
                          </span>
                          <span className="text-[#8A99AD]">{log.durationMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/60">
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !webhookUrlInput}
                  className="neu-btn px-4 py-2 text-xs font-bold text-[#536DFE] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testingWebhook ? 'Dispatching Test...' : 'Send Test Event'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingWebhook}
                    className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm bg-[#536DFE] text-white"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {savingWebhook ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: WORDPRESS CMS CONFIGURATION */}
      {/* ============================================================ */}
      {activeModal === 'wordpress' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-lg w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#21759B]/15 text-[#21759B] flex items-center justify-center font-bold text-sm">
                  W
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">WordPress CMS Configuration</h3>
                  <p className="text-xs text-[#5E6E82]">Automated enterprise blog and article publishing via REST API</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Status Banner */}
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                wpConfig?.status === 'Connected'
                  ? 'bg-emerald-50 border-emerald-200 text-[#065F46]'
                  : wpConfig?.status === 'Authentication Failed'
                  ? 'bg-red-50 border-red-200 text-[#B91C1C]'
                  : 'bg-amber-50 border-amber-200 text-[#92400E]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {wpConfig?.status === 'Connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                ) : wpConfig?.status === 'Authentication Failed' ? (
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                ) : (
                  <Info className="w-4 h-4 text-[#D97706]" />
                )}
                Status: {wpConfig?.status || 'Disconnected'}
              </div>
              <p className="text-[11px] leading-relaxed">
                {wpConfig?.status === 'Connected'
                  ? `Successfully authenticated as ${wpConfig.authenticatedUser || wpConfig.username} on ${wpConfig.wpUrl}. Production publishing is active.`
                  : wpConfig?.status === 'Authentication Failed'
                  ? `Authentication failed: ${wpConfig.lastError || 'Invalid credentials or URL'}. Please verify your username and Application Password.`
                  : 'To enable live publishing, configure your WordPress URL, admin/editor username, and an Application Password generated in WordPress (Users > Profile > Application Passwords).'}
              </p>
            </div>

            <form onSubmit={handleConnectWordPress} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">
                  WordPress Website URL <span className="text-[#EF4444]">*</span>:
                </label>
                <input
                  type="url"
                  value={wpUrlInput}
                  onChange={(e) => setWpUrlInput(e.target.value)}
                  placeholder="https://cms.yourcompany.com"
                  required
                  className="neu-input w-full px-3 py-1.5 text-xs font-mono"
                />
                <span className="text-[10px] text-[#8A99AD]">
                  Root WordPress site URL or REST endpoint (e.g. https://your-site.com). SSRF protection blocks private & local IPs.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">
                  WordPress Username <span className="text-[#EF4444]">*</span>:
                </label>
                <input
                  type="text"
                  value={wpUsernameInput}
                  onChange={(e) => setWpUsernameInput(e.target.value)}
                  placeholder="admin or publisher_user"
                  required
                  className="neu-input w-full px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">
                  WordPress Application Password{' '}
                  {wpConfig?.hasPassword ? (
                    <span className="text-[10px] text-[#10B981] font-semibold">(Saved securely on backend)</span>
                  ) : (
                    <span className="text-[#EF4444]">*</span>
                  )}:
                </label>
                <input
                  type="password"
                  value={wpPasswordInput}
                  onChange={(e) => setWpPasswordInput(e.target.value)}
                  placeholder={wpConfig?.hasPassword ? '•••• •••• •••• •••• (Leave blank to keep current)' : 'xxxx xxxx xxxx xxxx'}
                  className="neu-input w-full px-3 py-1.5 text-xs font-mono"
                />
                <span className="text-[10px] text-[#8A99AD] block mt-0.5">
                  Generated in WordPress Admin &gt; Users &gt; Profile &gt; Application Passwords. Verified against <code className="text-[#202B45]">/wp-json/wp/v2/users/me</code>. Never logged or exposed to frontend.
                </span>
              </div>

              {/* Feedback messages */}
              {wpFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-in fade-in ${
                    wpFeedback.error
                      ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C]'
                      : 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46]'
                  }`}
                >
                  {wpFeedback.error ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{wpFeedback.message}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/60">
                {wpConfig?.status === 'Connected' ? (
                  <button
                    type="button"
                    onClick={handleDisconnectWordPress}
                    className="neu-btn px-3 py-2 text-xs font-bold text-[#EF4444] hover:text-[#DC2626]"
                  >
                    Disconnect
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={connectingWp || !wpUrlInput || (!wpPasswordInput && !wpConfig?.hasPassword)}
                    className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm bg-[#21759B] text-white disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {connectingWp ? 'Verifying with WordPress...' : 'Verify & Connect'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: LINKEDIN CONFIGURATION */}
      {/* ============================================================ */}
      {activeModal === 'linkedin' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-lg w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0077B5]/15 text-[#0077B5] flex items-center justify-center font-bold text-sm">
                  in
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">LinkedIn Enterprise Configuration</h3>
                  <p className="text-xs text-[#5E6E82]">Publish compliant collateral to LinkedIn Company Pages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-[#92400E] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                OAuth 2.0 Clearance Required (Disconnected)
              </div>
              <p className="text-[11px] leading-relaxed">
                Live deployment requires an enterprise LinkedIn Developer app with <code className="text-[#202B45]">w_organization_social</code> permission and a verified Organization URN.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">LinkedIn Organization URN:</label>
                <input
                  type="text"
                  value={platformModalData.orgUrn || ''}
                  onChange={(e) => setPlatformModalData(prev => ({ ...prev, orgUrn: e.target.value }))}
                  placeholder="urn:li:organization:12345678"
                  className="neu-input w-full px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">Client ID:</label>
                <input
                  type="text"
                  value={platformModalData.clientId || ''}
                  onChange={(e) => setPlatformModalData(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="78xxxxxxxxxxxx"
                  className="neu-input w-full px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/70 border border-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#202B45]">Sandbox Simulation Mode</div>
                  <div className="text-[10px] text-[#5E6E82]">Test distribution workflows safely without broadcasting to followers.</div>
                </div>
                <input
                  type="checkbox"
                  checked={platformModalData.simulationMode ?? true}
                  onChange={(e) => setPlatformModalData(prev => ({ ...prev, simulationMode: e.target.checked }))}
                  className="rounded text-[#536DFE] accent-[#536DFE]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/60">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePlatformModal('linkedin')}
                className="neu-btn-primary px-5 py-2 text-xs font-bold text-white bg-[#536DFE]"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SLACK CONFIGURATION */}
      {/* ============================================================ */}
      {activeModal === 'slack' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-lg w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4A154B]/15 text-[#4A154B] flex items-center justify-center font-bold text-sm">
                  #
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">Slack Incoming Webhook Configuration</h3>
                  <p className="text-xs text-[#5E6E82]">Automated enterprise compliance alerts & review sign-off requests</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Status Banner */}
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                slackConfig?.status === 'Connected'
                  ? 'bg-emerald-50 border-emerald-200 text-[#065F46]'
                  : slackConfig?.status === 'Delivery Failed'
                  ? 'bg-red-50 border-red-200 text-[#B91C1C]'
                  : 'bg-amber-50 border-amber-200 text-[#92400E]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {slackConfig?.status === 'Connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                ) : slackConfig?.status === 'Delivery Failed' ? (
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                ) : (
                  <Info className="w-4 h-4 text-[#D97706]" />
                )}
                Connection Status: {slackConfig?.status || 'Disconnected'}
              </div>
              <p className="text-[11px] leading-relaxed">
                {slackConfig?.status === 'Connected'
                  ? `Incoming webhook verified and active for ${selectedOrganisation}. Real-time compliance alerts are routed to ${slackConfig.channel || '#brand-governance'}.`
                  : slackConfig?.status === 'Delivery Failed'
                  ? `Delivery check failed: ${slackConfig.lastError || 'Webhook returned error'}. Please verify your Slack incoming webhook URL and dispatch a test notification.`
                  : 'To protect enterprise reliability, BrandGuard AI never claims Connected status without a successful test delivery. Enter an official Slack webhook URL and dispatch a test event to verify.'}
              </p>
            </div>

            {/* Security Notice */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-[#1E40AF] space-y-0.5">
              <div className="font-bold flex items-center gap-1.5 text-[#1E3A8A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                Official Domain & SSRF Guard Active
              </div>
              <p>
                Endpoints must strictly belong to <code className="text-[#1E3A8A] font-bold">hooks.slack.com</code>. Arbitrary destinations, internal IPs, loopbacks, and link-local destinations are rejected. Complete webhook URLs remain on the backend only.
              </p>
            </div>

            <form onSubmit={handleSaveSlackConfig} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">
                  Slack Incoming Webhook URL <span className="text-[#EF4444]">*</span>:
                </label>
                <input
                  type="url"
                  value={slackWebhookInput}
                  onChange={(e) => setSlackWebhookInput(e.target.value)}
                  placeholder={
                    slackConfig?.hasWebhook
                      ? `${slackConfig.maskedWebhookUrl} (Leave blank to keep current)`
                      : 'https://hooks.slack.com/services/T00/B00/XXXX'
                  }
                  className="neu-input w-full px-3 py-1.5 text-xs font-mono"
                />
                <span className="text-[10px] text-[#8A99AD] block mt-0.5">
                  Generated in Slack Workspace &gt; Apps &gt; Incoming Webhooks.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#202B45] block mb-1">
                  Designated Alert Channel:
                </label>
                <input
                  type="text"
                  value={slackChannelInput}
                  onChange={(e) => setSlackChannelInput(e.target.value)}
                  placeholder="#brand-governance or #brand-releases"
                  className="neu-input w-full px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/70 border border-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#202B45]">Sandbox Simulation Mode</div>
                  <div className="text-[10px] text-[#5E6E82]">Logs alerts to delivery history without sending external HTTP requests.</div>
                </div>
                <input
                  type="checkbox"
                  checked={slackSimInput}
                  onChange={(e) => setSlackSimInput(e.target.checked)}
                  className="rounded text-[#536DFE] accent-[#536DFE]"
                />
              </div>

              {/* Feedback messages */}
              {slackFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-in fade-in ${
                    slackFeedback.error
                      ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C]'
                      : 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46]'
                  }`}
                >
                  {slackFeedback.error ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{slackFeedback.message}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-white/60">
                <div className="flex items-center gap-2">
                  {slackConfig?.status === 'Connected' && (
                    <button
                      type="button"
                      onClick={handleDisconnectSlack}
                      className="neu-btn px-3 py-1.5 text-xs font-bold text-[#EF4444] hover:text-[#DC2626]"
                    >
                      Disconnect
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleTestSlack}
                    disabled={testingSlack || (!slackWebhookInput && !slackConfig?.hasWebhook)}
                    className="neu-btn px-3 py-1.5 text-xs font-bold text-[#4A154B] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingSlack ? 'Sending Test...' : 'Send Test Notification'}
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="neu-btn px-4 py-1.5 text-xs font-bold text-[#5E6E82]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingSlack || (!slackWebhookInput && !slackConfig?.hasWebhook)}
                    className="neu-btn-primary px-5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-sm bg-[#4A154B] text-white disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {savingSlack ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
