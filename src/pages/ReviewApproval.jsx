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
  Check
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';

export default function ReviewApproval({ onNavigate }) {
  const { reviews, updateReviewStatus } = useBrandGuard();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedItems, setSelectedItems] = useState([]);
  const [batchSuccess, setBatchSuccess] = useState(false);

  // Modal Decision State
  const [decisionModalItem, setDecisionModalItem] = useState(null);
  const [modalDecision, setModalDecision] = useState('Approved'); // 'Approved' | 'Changes Requested' | 'Rejected'
  const [modalReviewer, setModalReviewer] = useState('Workspace Administrator');
  const [modalComments, setModalComments] = useState('');
  const [modalError, setModalError] = useState('');

  // Batch Approval Modal State
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);

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
    setModalReviewer(item.decisionDetails?.reviewer || 'Workspace Administrator');
    setModalComments(item.decisionDetails?.comments || item.reviewerNotes || '');
    setModalError('');
  };

  const handleConfirmDecision = () => {
    if (!decisionModalItem) return;

    // Validation: Require comments when rejecting or requesting revisions
    if ((modalDecision === 'Rejected' || modalDecision === 'Changes Requested') && !modalComments.trim()) {
      setModalError(`Review comments are strictly required when ${modalDecision === 'Rejected' ? 'rejecting' : 'requesting revisions for'} content.`);
      return;
    }

    updateReviewStatus(
      decisionModalItem.id,
      modalDecision,
      modalComments.trim() || (modalDecision === 'Approved' ? 'Approved after human governance review.' : ''),
      modalReviewer.trim() || 'Workspace Administrator'
    );

    setDecisionModalItem(null);
    setBatchSuccess(`Successfully updated ${decisionModalItem.title} to "${modalDecision}".`);
    setTimeout(() => {
      setBatchSuccess(false);
    }, 3000);
  };

  const handleConfirmBatchApprove = () => {
    if (selectedItems.length === 0) return;
    selectedItems.forEach((id) => {
      updateReviewStatus(id, 'Approved', 'Batch approved after compliance review.', modalReviewer || 'Workspace Administrator');
    });
    setShowBatchConfirmModal(false);
    setBatchSuccess(`Successfully batch approved ${selectedItems.length} collateral asset(s).`);
    setSelectedItems([]);
    setTimeout(() => {
      setBatchSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="neu-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              Governance Workflow
            </span>
            <span className="text-xs text-[#8A99AD] font-medium">
              {pendingItems.length} {pendingItems.length === 1 ? 'Item Awaiting Decision' : 'Items Awaiting Decision'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#202B45]">
            Review & Approval Pipeline
          </h2>
          <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-1">
            Process creative submissions, record brand approvals, and maintain compliance records.
          </p>
        </div>

        {/* Batch Actions Bar */}
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {batchSuccess && (
        <div className="neu-card-sm p-4 bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          {batchSuccess}
        </div>
      )}

      {/* Pipeline Filter Bar */}
      <div className="neu-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
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

        {currentList.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="neu-btn px-3 py-1.5 text-xs font-semibold text-[#5E6E82] hover:text-[#202B45]"
            >
              {selectedItems.length === currentList.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}
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
            Submissions matching this review filter will appear here for decisioning.
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
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#8A99AD] flex-wrap">
                        <span className="font-medium text-[#5E6E82]">{item.department}</span>
                        <span>•</span>
                        <span>Org: <strong className="text-[#202B45]">{item.organisationId || 'Salesforce'}</strong></span>
                        <span>•</span>
                        <span>By {item.submittedBy}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>

                      {/* Display Decision Details if already reviewed */}
                      {item.decisionDetails && (
                        <div className="mt-2 p-2 rounded-xl bg-white/50 border border-white/80 text-[11px] text-[#5E6E82] space-y-0.5">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-[#536DFE]" />
                            <span>Signed off by <strong className="text-[#202B45]">{item.decisionDetails.reviewer}</strong> on {item.decisionDetails.formattedDate} ({item.decisionDetails.formattedTime})</span>
                          </div>
                          {item.decisionDetails.comments && (
                            <p className="italic text-[#202B45] pl-5">
                              "{item.decisionDetails.comments}"
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

                    {/* Decision Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onNavigate('content-review')}
                        className="neu-btn px-3 py-1.5 text-xs font-bold text-[#202B45] flex items-center gap-1 hover:text-[#536DFE]"
                        title="Inspect in Content Review Studio"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>

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
    </div>
  );
}
