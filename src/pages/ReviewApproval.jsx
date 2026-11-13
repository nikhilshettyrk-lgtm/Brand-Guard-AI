import React, { useState } from 'react';
import {
  CheckCheck,
  CheckCircle2,
  Inbox,
  Eye,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  X,
  Check,
  Users,
  Share2,
  Send,
  Printer,
  Shield,
  Clock
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';

export default function ReviewApproval({ onNavigate }) {
  const {
    reviews,
    updateReviewStatus,
    currentUser,
    currentUserRole,
    teamMembers,
    assignReview,
    grantProductionClearance,
    publishApprovedAsset
  } = useBrandGuard();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [assigneeFilter, setAssigneeFilter] = useState('all'); // 'all' | 'assigned-to-me' | 'unassigned' | teamMember
  const [selectedItems, setSelectedItems] = useState([]);
  const [batchSuccess, setBatchSuccess] = useState(false);

  // Modal Decision State
  const [decisionModalItem, setDecisionModalItem] = useState(null);
  const [modalDecision, setModalDecision] = useState('Approved'); // 'Approved' | 'Changes Requested' | 'Rejected'
  const [modalReviewer, setModalReviewer] = useState(currentUser?.name || 'Workspace Administrator');
  const [modalComments, setModalComments] = useState('');
  const [modalError, setModalError] = useState('');

  // Batch Approval Modal State
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);

  // Final Production Clearance Modal State
  const [clearanceModalItem, setClearanceModalItem] = useState(null);
  const [clearanceNotes, setClearanceNotes] = useState('');
  const [clearanceError, setClearanceError] = useState('');

  // Quick Publish Modal State
  const [publishModalItem, setPublishModalItem] = useState(null);
  const [publishChannel, setPublishChannel] = useState('Custom Webhooks');
  const [publishIsSimulation, setPublishIsSimulation] = useState(true);
  const [publishNotes, setPublishNotes] = useState('');
  const [publishFeedback, setPublishFeedback] = useState(null);
  const [wpPostStatus, setWpPostStatus] = useState('draft');
  const [isPublishing, setIsPublishing] = useState(false);

  // Count assigned to active persona
  const myAssignedCount = reviews.filter(
    (r) => r.assignedTo && (r.assignedTo === currentUser?.name || r.assignedTo?.toLowerCase() === currentUser?.name?.toLowerCase())
  ).length;

  // Real filtered lists
  const pendingItems = reviews.filter((r) => r.status === 'Pending' || r.status === 'Under Review' || r.status === 'Pending Review');
  const changesRequestedItems = reviews.filter((r) => r.status === 'Changes Requested');
  const urgentItems = reviews.filter((r) => r.riskLevel === 'High' || r.score < 70 || (Array.isArray(r.violations) && r.violations.length > 0 && r.status !== 'Approved'));
  const approvedItems = reviews.filter((r) => r.status === 'Approved');
  const rejectedItems = reviews.filter((r) => r.status === 'Rejected');

  let currentList = [];
  if (selectedTab === 'pending') currentList = pendingItems;
  else if (selectedTab === 'changes') currentList = changesRequestedItems;
  else if (selectedTab === 'urgent') currentList = urgentItems;
  else if (selectedTab === 'approved') currentList = approvedItems;
  else if (selectedTab === 'rejected') currentList = rejectedItems;
  else currentList = reviews;

  // Apply Assignee Filter
  if (assigneeFilter === 'unassigned') {
    currentList = currentList.filter(r => !r.assignedTo);
  } else if (assigneeFilter === 'assigned-to-me') {
    currentList = currentList.filter(r => r.assignedTo && (r.assignedTo === currentUser?.name || r.assignedTo?.toLowerCase() === currentUser?.name?.toLowerCase()));
  } else if (assigneeFilter !== 'all') {
    currentList = currentList.filter(r => r.assignedTo === assigneeFilter);
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === currentList.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentList.map((item) => item.id));
    }
  };

  const toggleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((i) => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleOpenDecisionModal = (item, initialDecision = 'Approved') => {
    setDecisionModalItem(item);
    setModalDecision(initialDecision);
    setModalReviewer(currentUser?.name || item.decisionDetails?.reviewer || 'Workspace Administrator');
    setModalComments(item.decisionDetails?.comments || item.reviewerNotes || '');
    setModalError('');
  };

  const handleConfirmDecision = () => {
    if (!decisionModalItem) return;

    if (currentUserRole === 'Creator') {
      setModalError('Access Denied: Creator role cannot approve, reject, or request revisions on submissions.');
      return;
    }

    // Validation: Require comments when rejecting or requesting revisions
    if ((modalDecision === 'Rejected' || modalDecision === 'Changes Requested') && !modalComments.trim()) {
      setModalError(`Review comments are strictly required when ${modalDecision === 'Rejected' ? 'rejecting' : 'requesting revisions for'} content.`);
      return;
    }

    updateReviewStatus(
      decisionModalItem.id,
      modalDecision,
      modalComments.trim() || (modalDecision === 'Approved' ? 'Approved after human governance review.' : ''),
      modalReviewer.trim() || currentUser?.name || 'Workspace Administrator',
      currentUserRole
    );

    setDecisionModalItem(null);
    setBatchSuccess(`Successfully recorded decision: "${modalDecision}" on ${decisionModalItem.title}.`);
    setTimeout(() => {
      setBatchSuccess(false);
    }, 3500);
  };

  const handleConfirmBatchApprove = () => {
    if (selectedItems.length === 0) return;
    if (currentUserRole !== 'Manager') {
      setBatchSuccess('Access Denied: Batch approvals require Manager credentials.');
      setTimeout(() => setBatchSuccess(false), 3000);
      return;
    }

    selectedItems.forEach((id) => {
      updateReviewStatus(id, 'Approved', 'Batch approved after managerial compliance review.', currentUser?.name || 'Compliance Manager', 'Manager');
    });
    setShowBatchConfirmModal(false);
    setBatchSuccess(`Successfully batch approved ${selectedItems.length} collateral asset(s).`);
    setSelectedItems([]);
    setTimeout(() => {
      setBatchSuccess(false);
    }, 3500);
  };

  const handleOpenClearanceModal = (item) => {
    setClearanceModalItem(item);
    setClearanceNotes('Verified compliant and authorized for enterprise live distribution.');
    setClearanceError('');
  };

  const handleConfirmClearance = () => {
    if (!clearanceModalItem) return;
    if (currentUserRole !== 'Manager') {
      setClearanceError('Access Denied: Final production clearance requires Manager credentials.');
      return;
    }

    grantProductionClearance(
      clearanceModalItem.id,
      clearanceNotes.trim() || 'Approved for enterprise production release.',
      currentUser?.name || 'Compliance Manager'
    );

    setClearanceModalItem(null);
    setBatchSuccess(`Production clearance granted for "${clearanceModalItem.title}". Audit sealed.`);
    setTimeout(() => {
      setBatchSuccess(false);
    }, 3500);
  };

  const handlePublishAssetQuick = async () => {
    if (!publishModalItem) return;
    if (currentUserRole !== 'Manager') {
      setPublishFeedback({
        error: true,
        message: 'Access Denied: Only authorized Managers can dispatch and publish collateral.'
      });
      return;
    }
    if (!publishModalItem.productionClearance) {
      setPublishFeedback({
        error: true,
        message: 'Production Clearance Required: Content must receive final Manager clearance before external dispatch.'
      });
      return;
    }

    setIsPublishing(true);
    setPublishFeedback(null);
    try {
      const res = await publishApprovedAsset(publishModalItem.id, publishChannel, {
        isSimulation: publishIsSimulation,
        notes: publishNotes.trim(),
        postStatus: wpPostStatus
      });

      if (res && res.success) {
        setPublishFeedback({
          error: false,
          message: res.message + (res.post?.url ? ` Link: ${res.post.url}` : '')
        });
        setTimeout(() => {
          setPublishModalItem(null);
          setPublishFeedback(null);
          setPublishNotes('');
        }, 3000);
      } else {
        setPublishFeedback({
          error: true,
          message: res?.message || 'Publishing failed. Live connection unavailable or authentication required.'
        });
      }
    } catch (err) {
      setPublishFeedback({
        error: true,
        message: err.message || 'Publishing error.'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="neu-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              Governance Workflow
            </span>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
              currentUserRole === 'Manager'
                ? 'bg-[#536DFE]/15 text-[#536DFE]'
                : currentUserRole === 'Reviewer'
                ? 'bg-[#10B981]/15 text-[#047857]'
                : 'bg-[#F59E0B]/15 text-[#B45309]'
            }`}>
              Role: {currentUserRole} ({currentUser?.name})
            </span>
            <span className="text-xs text-[#8A99AD] font-medium">
              {pendingItems.length} {pendingItems.length === 1 ? 'Item Awaiting Decision' : 'Items Awaiting Decision'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#202B45]">
            Review & Approval Pipeline
          </h2>
          <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-1">
            Process creative submissions, manage reviewer assignments, and maintain auditable governance records.
          </p>
        </div>

        {/* Batch Actions Bar */}
        <div className="flex items-center gap-3">
          {currentUserRole === 'Creator' ? (
            <span className="text-[11px] font-bold text-[#F59E0B] px-3 py-1.5 rounded-xl bg-white/70 neu-card-sm border border-white">
              Creator Mode (Review sign-offs read-only)
            </span>
          ) : currentUserRole === 'Reviewer' ? (
            <span className="text-[11px] font-bold text-[#10B981] px-3 py-1.5 rounded-xl bg-white/70 neu-card-sm border border-white">
              Reviewer Mode (Batch sign-offs require Manager role)
            </span>
          ) : (
            <button
              onClick={() => setShowBatchConfirmModal(true)}
              disabled={selectedItems.length === 0}
              className={`neu-btn-primary px-4 py-2.5 text-xs md:text-sm font-bold flex items-center gap-2 ${
                selectedItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              Batch Approve ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      {batchSuccess && (
        <div className="neu-card-sm p-4 bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          {batchSuccess}
        </div>
      )}

      {/* Pipeline Filter Bar */}
      <div className="neu-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'pending', label: `Pending Review (${pendingItems.length})` },
            { id: 'changes', label: `Changes Requested (${changesRequestedItems.length})` },
            { id: 'urgent', label: `Flagged (${urgentItems.length})` },
            { id: 'approved', label: `Approved (${approvedItems.length})` },
            { id: 'rejected', label: `Rejected (${rejectedItems.length})` },
            { id: 'all', label: `All (${reviews.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTab(tab.id);
                setSelectedItems([]);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                selectedTab === tab.id
                  ? 'neu-active text-[#536DFE]'
                  : 'neu-btn text-[#5E6E82] hover:text-[#202B45]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assignee Filter & Selection Controls */}
        <div className="flex items-center gap-2.5 self-end lg:self-auto flex-wrap">
          {/* Quick "Assigned to Me" Filter Pill */}
          <button
            type="button"
            onClick={() => setAssigneeFilter(assigneeFilter === 'assigned-to-me' ? 'all' : 'assigned-to-me')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              assigneeFilter === 'assigned-to-me'
                ? 'neu-active text-[#536DFE] border border-[#536DFE]/40 font-extrabold'
                : 'neu-btn text-[#5E6E82] hover:text-[#202B45]'
            }`}
            title={`Show submissions assigned to ${currentUser?.name}`}
          >
            <UserCheck className="w-3.5 h-3.5 text-[#536DFE]" />
            <span>Assigned to Me</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#536DFE]/15 text-[#536DFE]">
              {myAssignedCount}
            </span>
          </button>

          {/* Detailed Assignee Dropdown */}
          <div className="flex items-center gap-1.5 neu-card-sm px-2.5 py-1 bg-white/70 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-[#536DFE]" />
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#202B45] cursor-pointer focus:outline-none"
            >
              <option value="all">All Assignees</option>
              <option value="assigned-to-me">★ Assigned to Me ({currentUser?.name})</option>
              <option value="unassigned">Unassigned Only</option>
              {(teamMembers || []).map(m => (
                <option key={m.id} value={m.name}>Assigned: {m.name} ({m.roleType})</option>
              ))}
            </select>
          </div>

          {currentList.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="neu-btn px-3 py-1.5 text-xs font-semibold text-[#5E6E82] hover:text-[#202B45]"
            >
              {selectedItems.length === currentList.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Queue Cards or Meaningful Empty State */}
      {currentList.length === 0 ? (
        <div className="neu-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#8A99AD] mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#202B45]">
            No items in this queue
          </h4>
          <p className="text-xs text-[#5E6E82] max-w-sm mt-1 mb-5">
            {assigneeFilter === 'assigned-to-me'
              ? `You currently have 0 submissions assigned to your profile (${currentUser?.name}).`
              : 'Submissions matching this review filter will appear here for decisioning.'}
          </p>
          <button
            onClick={() => onNavigate('content-review')}
            className="neu-btn px-4 py-2 text-xs font-bold text-[#536DFE]"
          >
            Go to Content Review Studio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            const statusColor =
              item.status === 'Approved'
                ? 'bg-[#10B981]/15 text-[#047857]'
                : item.status === 'Changes Requested'
                ? 'bg-[#F59E0B]/15 text-[#B45309]'
                : item.status === 'Rejected'
                ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                : 'bg-[#536DFE]/15 text-[#536DFE]';

            return (
              <div
                key={item.id}
                className={`neu-card p-5 transition-all duration-200 border ${
                  isSelected ? 'border-[#536DFE]/40 neu-active' : 'border-white/70'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Checkbox and main info */}
                  <div className="flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                      className="mt-1 w-4 h-4 rounded text-[#536DFE] border-[#D1D9E6] focus:ring-[#536DFE] cursor-pointer"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className="text-sm font-bold text-[#202B45] hover:text-[#536DFE] cursor-pointer"
                          onClick={() => onNavigate('content-review')}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 text-[#5E6E82] border border-[#D1D9E6]">
                          {item.contentType || item.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {item.status}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.riskLevel === 'Low'
                              ? 'bg-[#10B981]/15 text-[#047857]'
                              : item.riskLevel === 'Medium'
                              ? 'bg-[#F59E0B]/15 text-[#B45309]'
                              : 'bg-[#EF4444]/15 text-[#B91C1C]'
                          }`}
                        >
                          {item.riskLevel} Risk
                        </span>

                        {/* Production Clearance Badge */}
                        {item.productionClearance && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#047857] border border-[#10B981]/30 flex items-center gap-1 shadow-xs">
                            <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                            Production Cleared
                          </span>
                        )}

                        {/* Publishing State Badge: Not Published | Queued | Published | Failed */}
                        {item.publishingStatus === 'Published' || (item.publishedChannels && item.publishedChannels.length > 0) ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#047857] border border-[#10B981]/30 flex items-center gap-1 shadow-xs">
                            <Send className="w-3 h-3 text-[#10B981]" />
                            Published
                          </span>
                        ) : item.publishingStatus === 'Failed' ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#B91C1C] border border-[#EF4444]/30 flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                            Publish Failed
                          </span>
                        ) : item.publishingStatus === 'Queued' ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30 flex items-center gap-1 shadow-xs">
                            <Clock className="w-3 h-3 text-[#F59E0B]" />
                            Queued
                          </span>
                        ) : (
                          item.status === 'Approved' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#8A99AD]/15 text-[#5E6E82]">
                              Not Published
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#8A99AD] flex-wrap">
                        <span className="font-medium text-[#5E6E82]">{item.department}</span>
                        <span>•</span>
                        <span>Org: <strong className="text-[#202B45]">{item.organisationId || 'Salesforce'}</strong></span>
                        <span>•</span>
                        <span>Submitted by <strong className="text-[#202B45]">{item.submittedBy}</strong></span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>

                      {/* Content Assignment Selector (Manager editable, Creator/Reviewer read-only) */}
                      <div className="flex items-center gap-2 text-xs pt-1 flex-wrap">
                        <span className="text-[11px] font-semibold text-[#8A99AD] flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#536DFE]" />
                          Review Assignee:
                        </span>
                        {currentUserRole === 'Manager' ? (
                          <select
                            value={item.assignedTo || ''}
                            onChange={(e) => assignReview(item.id, e.target.value)}
                            className="neu-input px-2 py-0.5 rounded-lg text-xs font-bold text-[#202B45] cursor-pointer"
                            title="Assign or reassign review ownership (Manager capability)"
                          >
                            <option value="">Unassigned</option>
                            {(teamMembers || []).map(m => (
                              <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                            ))}
                          </select>
                        ) : (
                          <span className="neu-card-sm px-2.5 py-0.5 rounded-lg text-xs font-bold text-[#202B45] bg-white/60 border border-white">
                            {item.assignedTo ? item.assignedTo : 'Unassigned'}
                            <span className="text-[10px] text-[#8A99AD] font-normal ml-1">
                              (Manager assigns)
                            </span>
                          </span>
                        )}

                        {item.publishedChannels && item.publishedChannels.length > 0 && (
                          <div className="flex items-center gap-1 pl-2">
                            <span className="text-[10px] text-[#059669] font-bold">Published:</span>
                            {item.publishedChannels.map(p => (
                              <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#047857] capitalize">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Display Decision Details if already reviewed */}
                      {item.decisionDetails && (
                        <div className="mt-2 p-2 rounded-xl bg-white/50 border border-white/80 text-[11px] text-[#5E6E82] space-y-0.5">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-[#536DFE]" />
                            <span>Decision by <strong className="text-[#202B45]">{item.decisionDetails.reviewer}</strong> ({item.decisionDetails.role || 'Reviewer'}) on {item.decisionDetails.formattedDate}</span>
                          </div>
                          {item.decisionDetails.comments && (
                            <p className="italic text-[#202B45] pl-5">
                              "{item.decisionDetails.comments}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Display Production Clearance Details */}
                      {item.productionClearance && item.clearanceDetails && (
                        <div className="mt-1.5 p-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-[11px] text-[#065F46] space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Cleared for Live Production by Manager {item.clearanceDetails.manager}</span>
                          </div>
                          {item.clearanceDetails.notes && (
                            <p className="italic text-[#047857] pl-5">
                              "{item.clearanceDetails.notes}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/50">
                    <div className="text-left lg:text-right">
                      <span className="text-[11px] font-semibold text-[#8A99AD] block">
                        Score
                      </span>
                      <span
                        className={`text-lg font-extrabold ${
                          item.score >= 85
                            ? 'text-[#10B981]'
                            : item.score >= 70
                            ? 'text-[#F59E0B]'
                            : 'text-[#EF4444]'
                        }`}
                      >
                        {item.score}%
                      </span>
                    </div>

                    {/* Decision & Publishing Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onNavigate('content-review')}
                        className="neu-btn px-3 py-1.5 text-xs font-bold text-[#202B45] flex items-center gap-1 hover:text-[#536DFE]"
                        title="Inspect in Content Review Studio"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>

                      {/* Publish Button for Approved Assets (Requires Manager Role & Production Clearance) */}
                      {item.status === 'Approved' && (
                        currentUserRole === 'Manager' ? (
                          item.productionClearance ? (
                            <button
                              onClick={() => {
                                setPublishModalItem(item);
                                setPublishFeedback(null);
                                setPublishIsSimulation(true);
                                setPublishNotes('');
                              }}
                              className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#059669] hover:bg-emerald-50 flex items-center gap-1 shadow-xs"
                              title="Publish cleared collateral via Integrations Hub"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Publish
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenClearanceModal(item)}
                              className="neu-btn px-2 py-1 text-[11px] font-bold text-[#8A99AD] hover:text-[#536DFE] flex items-center gap-1 cursor-pointer"
                              title="Production clearance required before publishing can be unlocked"
                            >
                              <ShieldCheck className="w-3 h-3 text-[#F59E0B]" />
                              Clearance Req.
                            </button>
                          )
                        ) : (
                          <span
                            className="text-[10px] font-bold text-[#8A99AD] px-2 py-1 rounded bg-white/40 border border-white"
                            title="Manager credentials required for external publishing"
                          >
                            {item.productionClearance ? 'Cleared (Manager Dispatches)' : 'Awaiting Clearance'}
                          </span>
                        )
                      )}

                      {/* Manager Final Production Clearance Button */}
                      {currentUserRole === 'Manager' && item.status === 'Approved' && !item.productionClearance && (
                        <button
                          onClick={() => handleOpenClearanceModal(item)}
                          className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#536DFE] hover:bg-blue-50 flex items-center gap-1"
                          title="Provide Final Production Clearance (Manager sign-off)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#536DFE]" />
                          Clearance
                        </button>
                      )}

                      {currentUserRole === 'Creator' ? (
                        <span className="text-[10px] font-bold text-[#8A99AD] px-2 py-1 rounded bg-white/50 border border-white">
                          Reviewer Sign-off Required
                        </span>
                      ) : (
                        <>
                          {/* Request Revisions */}
                          <button
                            onClick={() => handleOpenDecisionModal(item, 'Changes Requested')}
                            className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#D97706] hover:bg-amber-50 flex items-center gap-1"
                            title="Request changes from creator"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Revisions
                          </button>

                          {/* Reject */}
                          <button
                            onClick={() => handleOpenDecisionModal(item, 'Rejected')}
                            className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center gap-1"
                            title="Reject submission"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>

                          {/* Approve */}
                          <button
                            onClick={() => handleOpenDecisionModal(item, 'Approved')}
                            className="neu-btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1"
                            title="Approve asset"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HUMAN DECISION MODAL (Approve, Reject, or Request Revisions) */}
      {decisionModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-lg w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center neu-card-sm flex-shrink-0 ${
                  modalDecision === 'Approved'
                    ? 'bg-[#10B981]/15 text-[#047857]'
                    : modalDecision === 'Changes Requested'
                    ? 'bg-[#F59E0B]/15 text-[#B45309]'
                    : 'bg-[#EF4444]/15 text-[#B91C1C]'
                }`}>
                  {modalDecision === 'Approved' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : modalDecision === 'Changes Requested' ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Record Review Decision
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Asset: <strong>{decisionModalItem.title}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModalItem(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Decision Selector Tabs in Modal */}
            <div className="flex items-center gap-2 neu-input p-1 rounded-xl">
              {[
                { id: 'Approved', label: 'Approve' },
                { id: 'Changes Requested', label: 'Request Revisions' },
                { id: 'Rejected', label: 'Reject' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setModalDecision(opt.id);
                    setModalError('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    modalDecision === opt.id
                      ? opt.id === 'Approved'
                        ? 'bg-[#10B981] text-white shadow-sm'
                        : opt.id === 'Changes Requested'
                        ? 'bg-[#F59E0B] text-white shadow-sm'
                        : 'bg-[#EF4444] text-white shadow-sm'
                      : 'text-[#5E6E82] hover:text-[#202B45]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Asset Metadata summary */}
            <div className="p-3 rounded-xl neu-input bg-white/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#8A99AD]">Organisation:</span>
                <span className="font-bold text-[#536DFE]">{decisionModalItem.organisationId || 'Salesforce'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A99AD]">Compliance Score:</span>
                <span className={`font-extrabold ${
                  decisionModalItem.score >= 85 ? 'text-[#10B981]' : decisionModalItem.score >= 70 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                }`}>
                  {decisionModalItem.score}%
                </span>
              </div>
            </div>

            {/* Caution if approving low score asset */}
            {modalDecision === 'Approved' && (decisionModalItem.score < 85 || (decisionModalItem.violations && decisionModalItem.violations.length > 0)) && (
              <div className="p-3 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-xs text-[#B45309] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#F59E0B] mt-0.5" />
                <span>Caution: This asset contains unresolved guideline findings. Approving overrides automated checks.</span>
              </div>
            )}

            {/* Reviewer Name */}
            <div>
              <label className="text-[11px] font-bold text-[#5E6E82] block mb-1">
                Reviewer Identity *
              </label>
              <input
                type="text"
                value={modalReviewer}
                onChange={(e) => setModalReviewer(e.target.value)}
                placeholder="Reviewer Name / Title..."
                className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
              />
            </div>

            {/* Review Comments */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#5E6E82]">
                  Review Comments
                </label>
                {(modalDecision === 'Rejected' || modalDecision === 'Changes Requested') && (
                  <span className="text-[10px] font-bold text-[#EF4444]">
                    * Mandatory for {modalDecision}
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={modalComments}
                onChange={(e) => {
                  setModalComments(e.target.value);
                  if (modalError) setModalError('');
                }}
                placeholder={
                  modalDecision === 'Approved'
                    ? 'Optional approval remarks or verification notes...'
                    : 'Detail the required corrections or guideline violations...'
                }
                className="neu-input w-full p-2.5 text-xs text-[#202B45] resize-none"
              />
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModalItem(null)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                className={`neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 ${
                  modalDecision === 'Approved'
                    ? 'bg-[#10B981] hover:bg-[#059669]'
                    : modalDecision === 'Changes Requested'
                    ? 'bg-[#F59E0B] hover:bg-[#D97706]'
                    : 'bg-[#EF4444] hover:bg-[#DC2626]'
                } text-white`}
              >
                <Check className="w-4 h-4" />
                Confirm {modalDecision}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH APPROVAL CONFIRMATION MODAL */}
      {showBatchConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-md w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#10B981]/15 text-[#047857] flex items-center justify-center neu-card-sm flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202B45]">
                  Confirm Batch Approval
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Sign off {selectedItems.length} selected asset(s)
                </p>
              </div>
            </div>

            <p className="text-xs text-[#5E6E82] leading-relaxed">
              Are you sure you want to mark {selectedItems.length} collateral asset(s) as Approved? This will record your identity in their audit trails and update dashboard metrics.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchConfirmModal(false)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchApprove}
                className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white"
              >
                <Check className="w-4 h-4" />
                Confirm Batch Sign-off
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QUICK PUBLISH TO CMS / SOCIAL MODAL */}
      {publishModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-lg w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#10B981]/15 text-[#047857] flex items-center justify-center neu-card-sm flex-shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Publish Production Asset
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Automated CMS, Social & Webhook Dispatch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishModalItem(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Metadata & Clearance State */}
            <div className="p-3.5 rounded-xl bg-white/70 text-xs space-y-1.5 border border-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Collateral:</span>
                <strong className="text-sm font-bold text-[#202B45] truncate max-w-[260px]">{publishModalItem.title}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Compliance Score:</span>
                <span className="text-[11px] text-[#10B981] font-extrabold">{publishModalItem.score}%</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="font-semibold text-[#8A99AD]">Production Clearance:</span>
                {publishModalItem.productionClearance ? (
                  <span className="text-[10px] font-extrabold text-[#047857] bg-[#10B981]/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                    Verified Cleared
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-[#B91C1C] bg-[#EF4444]/15 px-2 py-0.5 rounded-full">
                    Awaiting Clearance
                  </span>
                )}
              </div>
            </div>

            {/* Feedback / Alert */}
            {publishFeedback && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                publishFeedback.error ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#B91C1C]' : 'bg-[#10B981]/15 border-[#10B981]/30 text-[#065F46]'
              }`}>
                {publishFeedback.error ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                <span>{publishFeedback.message}</span>
              </div>
            )}

            {/* Destination Selection */}
            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Distribution Destination:
              </label>
              <select
                value={publishChannel}
                onChange={(e) => setPublishChannel(e.target.value)}
                className="neu-input w-full px-3 py-2 text-xs font-bold text-[#202B45]"
              >
                <option value="Custom Webhooks">Custom Webhooks (content.published Event)</option>
                <option value="WordPress CMS">WordPress CMS (Production Posts API)</option>
                <option value="LinkedIn">LinkedIn (Corporate Page Feed)</option>
                <option value="Slack">Slack (#brand-releases Notification)</option>
              </select>
            </div>

            {/* Publishing Mode: Simulation vs Live */}
            <div className="p-3 rounded-xl bg-white/70 border border-white space-y-2">
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block">
                Publishing Mode:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                  publishIsSimulation ? 'bg-[#536DFE]/10 border-[#536DFE] text-[#536DFE]' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                }`}>
                  <input
                    type="radio"
                    name="pubMode"
                    checked={publishIsSimulation}
                    onChange={() => setPublishIsSimulation(true)}
                    className="mt-0.5 accent-[#536DFE]"
                  />
                  <div>
                    <div className="font-bold text-[11px]">Simulation Mode</div>
                    <div className="text-[10px] opacity-80 leading-tight">Dispatches to test sandbox. Never claims actual publication.</div>
                  </div>
                </label>

                <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                  !publishIsSimulation ? 'bg-[#10B981]/10 border-[#10B981] text-[#047857]' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                }`}>
                  <input
                    type="radio"
                    name="pubMode"
                    checked={!publishIsSimulation}
                    onChange={() => setPublishIsSimulation(false)}
                    className="mt-0.5 accent-[#10B981]"
                  />
                  <div>
                    <div className="font-bold text-[11px]">Live Integration</div>
                    <div className="text-[10px] opacity-80 leading-tight">Requires verified API credentials in Settings.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* WordPress Post Status (Draft vs Publish) */}
            {publishChannel === 'WordPress CMS' && !publishIsSimulation && (
              <div className="p-3 rounded-xl bg-[#21759B]/10 border border-[#21759B]/20 space-y-2">
                <label className="text-[11px] font-bold text-[#21759B] uppercase tracking-wider block">
                  WordPress Target Post Status:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                    wpPostStatus === 'draft' ? 'bg-white border-[#21759B] text-[#21759B] font-bold shadow-sm' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                  }`}>
                    <input
                      type="radio"
                      name="wpStatusRa"
                      value="draft"
                      checked={wpPostStatus === 'draft'}
                      onChange={() => setWpPostStatus('draft')}
                      className="mt-0.5 accent-[#21759B]"
                    />
                    <div>
                      <div className="text-[11px]">Draft (Recommended)</div>
                      <div className="text-[9px] opacity-75 leading-tight">Saved to WP editorial queue for review before public release.</div>
                    </div>
                  </label>

                  <label className={`p-2 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                    wpPostStatus === 'publish' ? 'bg-white border-[#10B981] text-[#047857] font-bold shadow-sm' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                  }`}>
                    <input
                      type="radio"
                      name="wpStatusRa"
                      value="publish"
                      checked={wpPostStatus === 'publish'}
                      onChange={() => setWpPostStatus('publish')}
                      className="mt-0.5 accent-[#10B981]"
                    />
                    <div>
                      <div className="text-[11px]">Publish Live</div>
                      <div className="text-[9px] opacity-75 leading-tight">Published immediately visible to the public.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Dispatch Notes */}
            <div>
              <label className="text-[11px] font-bold text-[#5E6E82] block mb-1">
                Distribution / Campaign Notes:
              </label>
              <input
                type="text"
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Release notes or campaign identifier (e.g. Q4 Global Campaign Release)..."
                className="neu-input w-full px-3 py-1.5 text-xs text-[#202B45]"
              />
            </div>

            {/* Publishing History Viewer */}
            {publishModalItem.publishingHistory && publishModalItem.publishingHistory.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-white/60">
                <div className="flex items-center justify-between text-xs font-bold text-[#202B45]">
                  <span>Publishing History:</span>
                  <span className="text-[10px] text-[#8A99AD] font-medium">{publishModalItem.publishingHistory.length} record(s)</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[10px]">
                  {publishModalItem.publishingHistory.map((hist) => (
                    <div key={hist.id} className="p-2 rounded-lg bg-white/60 border border-white flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${hist.status.includes('Published') ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                        <span className="font-bold text-[#202B45]">{hist.channel}</span>
                        {hist.publishedUrl ? (
                          <a
                            href={hist.publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#536DFE] hover:underline font-semibold"
                          >
                            Post #{hist.wordpressPostId || 'Link'}
                          </a>
                        ) : null}
                        <span className="text-[#8A99AD] truncate max-w-[140px]">{hist.notes}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          hist.status.includes('Published') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {hist.status}
                        </span>
                        <span className="text-[#8A99AD]">{hist.formattedTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPublishModalItem(null)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishAssetQuick}
                disabled={!publishModalItem.productionClearance || isPublishing}
                className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isPublishing
                  ? 'Publishing to WordPress...'
                  : publishIsSimulation
                  ? 'Dispatch Simulation'
                  : 'Live Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL PRODUCTION CLEARANCE MODAL (Manager Only) */}
      {clearanceModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 max-w-lg w-full space-y-4 border border-white/80 shadow-2xl bg-[#E8ECF3]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center neu-card-sm flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Final Production Clearance
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Managerial authorization for live deployment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearanceModalItem(null)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-white/70 text-xs space-y-1.5 border border-white">
              <div className="flex items-center justify-between">
                <span className="text-[#8A99AD]">Collateral:</span>
                <strong className="text-sm font-bold text-[#202B45] truncate max-w-[260px]">{clearanceModalItem.title}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A99AD]">Organisation:</span>
                <span className="font-bold text-[#536DFE]">{clearanceModalItem.organisationId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A99AD]">Compliance Score:</span>
                <span className="font-extrabold text-[#10B981]">{clearanceModalItem.score}%</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#5E6E82] block mb-1">
                Clearance Notes & Distribution Authority:
              </label>
              <textarea
                rows={3}
                value={clearanceNotes}
                onChange={(e) => setClearanceNotes(e.target.value)}
                placeholder="Manager clearance confirmation note (e.g. Approved for global campaign release)..."
                className="neu-input w-full p-2.5 text-xs text-[#202B45] resize-none"
              />
            </div>

            {clearanceError && (
              <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
                <span>{clearanceError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearanceModalItem(null)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearance}
                className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                Grant Production Clearance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
