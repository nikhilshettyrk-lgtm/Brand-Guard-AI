import React, { useState, useEffect } from 'react';
import { BrandGuardProvider } from './context/BrandGuardContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import QuickActionsModal from './components/QuickActionsModal';

// Pages
import Dashboard from './pages/Dashboard';
import BrandKnowledgeHub from './pages/BrandKnowledgeHub';
import ContentReview from './pages/ContentReview';
import ReviewApproval from './pages/ReviewApproval';
import GovernanceInsights from './pages/GovernanceInsights';
import Settings from './pages/Settings';

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickActionModal, setQuickActionModal] = useState({
    isOpen: false,
    mode: null
  });

  const pageMeta = {
    'dashboard': {
      title: 'Governance Dashboard',
      subtitle: 'Overview of workspace brand compliance and review records'
    },
    'knowledge-hub': {
      title: 'Brand Knowledge Hub',
      subtitle: 'Codified guidelines, typography standards, logo clearspace, and tone rules'
    },
    'content-review': {
      title: 'Content Review Studio',
      subtitle: 'In-depth asset inspection, margin checks, and rule validations'
    },
    'review-approval': {
      title: 'Review & Approval',
      subtitle: 'Sign-off pipeline, bulk approval management, and compliance queue'
    },
    'governance-insights': {
      title: 'Governance Insights',
      subtitle: 'Audit trails, department compliance scores, and risk trends'
    },
    'settings': {
      title: 'Governance Settings',
      subtitle: 'Automated tolerances, AI sensitivity benchmarks, and notification routes'
    }
  };

  // Keyboard shortcut listener: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openQuickAction = (mode) => {
    setQuickActionModal({
      isOpen: true,
      mode: mode
    });
  };

  const closeQuickAction = () => {
    setQuickActionModal({
      isOpen: false,
      mode: null
    });
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActivePage}
            onTriggerQuickAction={openQuickAction}
          />
        );
      case 'knowledge-hub':
        return (
          <BrandKnowledgeHub
            onTriggerUpload={() => openQuickAction('upload-guidelines')}
          />
        );
      case 'content-review':
        return <ContentReview />;
      case 'review-approval':
        return <ReviewApproval onNavigate={setActivePage} />;
      case 'governance-insights':
        return <GovernanceInsights />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard
            onNavigate={setActivePage}
            onTriggerQuickAction={openQuickAction}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#E8ECF3] text-[#202B45]">
      {/* 1. Left Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* 2. Top Header */}
        <Header
          activePage={activePage}
          pageTitles={pageMeta}
          onOpenQuickAction={openQuickAction}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {renderActivePage()}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <QuickActionsModal
        isOpen={quickActionModal.isOpen}
        mode={quickActionModal.mode}
        onClose={closeQuickAction}
        onNavigate={setActivePage}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrandGuardProvider>
      <AppContent />
    </BrandGuardProvider>
  );
}
