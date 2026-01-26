// POLI - Main QA Panel Component
// Collapsible overlay that doesn't interfere with app

import React, { useState } from 'react';
import { useQA } from './QAContext';
import { TestItem, BugReport } from '../types';
import { PoliLogo } from './PoliLogo';

export function QAPanel() {
  const {
    isOpen,
    togglePanel,
    state,
    currentScreen,
    updateTestStatus,
    addTestItem,
    removeTestItem,
    reportBug,
    deleteBug,
    startTestSession,
    completeTestSession,
    deleteSession,
    exportState,
  } = useQA();

  const [activeTab, setActiveTab] = useState<'tests' | 'bugs' | 'session'>('session');
  const [showBugForm, setShowBugForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAddTestForm, setShowAddTestForm] = useState(false);
  const [newTestDescription, setNewTestDescription] = useState('');
  const [newTestCategory, setNewTestCategory] = useState<'UI' | 'Functionality'>('Functionality');
  const [sessionName, setSessionName] = useState('');
  const [testerName, setTesterName] = useState('Tester');
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 384 : 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);

  // Bug form state
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSeverity, setBugSeverity] = useState<BugReport['severity']>('medium');
  const [bugSteps, setBugSteps] = useState<string[]>(['']);
  const [bugExpected, setBugExpected] = useState('');
  const [bugActual, setBugActual] = useState('');

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.qa-drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 384));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isOpen) {
    // Minimized toggle button
    return (
      <button
        onClick={togglePanel}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          backgroundColor: '#9333ea',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontWeight: 500,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#9333ea')}
        title="Open POLI QA Panel (Ctrl+Shift+Q)"
      >
        <PoliLogo size={24} />
        POLI
      </button>
    );
  }

  // Get tests for selected screen (manual selection overrides auto-detection)
  const displayScreen = selectedScreen || currentScreen;
  const currentChecklist = state.checklists.find((c) => c.screen === displayScreen);

  // Get all unique screens from checklists
  const allScreens = state.checklists.map((c) => c.screen);

  // Handle test status update with auto bug form
  const handleTestStatusUpdate = (testId: string, status: TestItem['status'], notes?: string) => {
    updateTestStatus(testId, status, notes);

    // If marking as failed, auto-open bug form with pre-filled details
    if (status === 'failed') {
      const test = currentChecklist?.items.find((t) => t.id === testId);
      if (test) {
        setBugTitle(`Failed: ${test.description}`);
        setBugDescription(`Test "${test.description}" failed during testing.`);
        setBugSeverity('medium');
        setBugSteps(['Navigate to ' + test.screen + ' screen', 'Attempt to ' + test.description.toLowerCase()]);
        setBugExpected(test.description);
        setBugActual('');
        setShowBugForm(true);
      }
    }
  };

  // Submit bug report
  const handleSubmitBug = () => {
    if (!bugTitle || !bugDescription) {
      alert('Title and description are required');
      return;
    }

    reportBug({
      title: bugTitle,
      description: bugDescription,
      severity: bugSeverity,
      status: 'open',
      screen: displayScreen || currentScreen || 'DEFAULT',
      stepsToReproduce: bugSteps.filter((s) => s.trim() !== ''),
      expectedBehavior: bugExpected,
      actualBehavior: bugActual,
      reportedBy: state.currentSession?.tester || 'Tester',
    });

    // Reset form
    setBugTitle('');
    setBugDescription('');
    setBugSeverity('medium');
    setBugSteps(['']);
    setBugExpected('');
    setBugActual('');
    setShowBugForm(false);
  };

  // Submit session creation
  const handleStartSession = () => {
    if (!sessionName.trim() || !testerName.trim()) {
      alert('Session name and tester name are required');
      return;
    }

    startTestSession(sessionName, testerName);
    setSessionName('');
    setTesterName('Tester');
    setShowSessionForm(false);
    setActiveTab('tests');
  };

  // Add new test to current screen
  const handleAddTest = () => {
    if (!newTestDescription.trim()) {
      alert('Test description is required');
      return;
    }

    const screen = displayScreen || currentScreen || 'DEFAULT';
    const id = `custom_${screen.toLowerCase()}_${Date.now()}`;

    addTestItem({
      id,
      screen,
      category: newTestCategory,
      description: newTestDescription.trim(),
      status: 'not_started',
    });

    setNewTestDescription('');
    setNewTestCategory('Functionality');
    setShowAddTestForm(false);
  };

  // Remove test
  const handleRemoveTest = (testId: string) => {
    if (confirm('Delete this test?')) {
      removeTestItem(testId);
    }
  };

  // Inline styles for the panel (no Tailwind dependency)
  const styles = {
    panel: {
      position: 'fixed' as const,
      height: '100%',
      width: '384px',
      backgroundColor: '#111827',
      borderLeft: '1px solid #374151',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      backgroundColor: '#9333ea',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'move',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    headerTitle: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: '18px',
      margin: 0,
    },
    headerSubtitle: {
      color: '#e9d5ff',
      fontSize: '12px',
      margin: 0,
    },
    closeBtn: {
      color: 'white',
      backgroundColor: 'transparent',
      border: 'none',
      padding: '4px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '20px',
    },
    screenTabs: {
      backgroundColor: '#1f2937',
      padding: '8px',
      borderBottom: '1px solid #374151',
    },
    screenTabsInner: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '4px',
    },
    screenTab: (isActive: boolean) => ({
      padding: '4px 12px',
      fontSize: '12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      backgroundColor: isActive ? '#9333ea' : '#374151',
      color: isActive ? 'white' : '#d1d5db',
      fontWeight: isActive ? 500 : 400,
    }),
    autoTab: (isActive: boolean) => ({
      padding: '4px 12px',
      fontSize: '12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      backgroundColor: isActive ? '#16a34a' : '#374151',
      color: isActive ? 'white' : '#d1d5db',
      fontWeight: isActive ? 500 : 400,
    }),
    tip: {
      color: '#c4b5fd',
      fontSize: '10px',
      marginTop: '4px',
    },
    tabs: {
      display: 'flex',
      backgroundColor: '#1f2937',
      borderBottom: '1px solid #374151',
    },
    tab: (isActive: boolean) => ({
      flex: 1,
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: isActive ? '#111827' : 'transparent',
      color: isActive ? 'white' : '#9ca3af',
      borderBottom: isActive ? '2px solid #9333ea' : '2px solid transparent',
    }),
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px',
    },
    footer: {
      backgroundColor: '#1f2937',
      borderTop: '1px solid #374151',
      padding: '12px',
      textAlign: 'center' as const,
    },
    footerText: {
      color: '#9ca3af',
      fontSize: '12px',
      margin: 0,
    },
    kbd: {
      backgroundColor: '#374151',
      padding: '4px 8px',
      borderRadius: '4px',
    },
    btn: (color: string) => ({
      backgroundColor: color,
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      width: '100%',
      transition: 'background-color 0.2s',
    }),
    btnSmall: (color: string) => ({
      backgroundColor: color,
      color: 'white',
      border: 'none',
      padding: '4px 8px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'background-color 0.2s',
    }),
    card: {
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px',
    },
    input: {
      width: '100%',
      backgroundColor: '#111827',
      color: 'white',
      fontSize: '14px',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #374151',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%',
      backgroundColor: '#111827',
      color: 'white',
      fontSize: '14px',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #374151',
      outline: 'none',
    },
    label: {
      display: 'block',
      color: '#d1d5db',
      fontSize: '12px',
      fontWeight: 500,
      marginBottom: '4px',
    },
    textWhite: { color: 'white' },
    textGray: { color: '#9ca3af' },
    textGreen: { color: '#4ade80' },
    textRed: { color: '#f87171' },
    textYellow: { color: '#facc15' },
    mt4: { marginTop: '16px' },
    mb2: { marginBottom: '8px' },
    mb4: { marginBottom: '16px' },
    spaceY: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
    flexRow: { display: 'flex', gap: '8px' },
    flex1: { flex: 1 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  };

  return (
    <div
      style={{ ...styles.panel, left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="qa-drag-handle" style={styles.header}>
        <div style={styles.headerLeft}>
          <PoliLogo size={56} />
          <div>
            <h2 style={styles.headerTitle}>POLI</h2>
            <p style={styles.headerSubtitle}>QA Testing Overlay</p>
          </div>
        </div>
        <button
          onClick={togglePanel}
          style={styles.closeBtn}
          title="Minimize (Ctrl+Shift+Q)"
        >
          −
        </button>
      </div>

      {/* Screen Tabs */}
      <div style={styles.screenTabs}>
        <div style={styles.screenTabsInner}>
          {allScreens.map((screen) => (
            <button
              key={screen}
              onClick={() => setSelectedScreen(screen)}
              style={styles.screenTab(displayScreen === screen)}
              title={`View ${screen} tests`}
            >
              {screen}
            </button>
          ))}
          <button
            onClick={() => setSelectedScreen(null)}
            style={styles.autoTab(!selectedScreen)}
            title="Auto-detect current screen"
          >
            AUTO
          </button>
        </div>
        <p style={styles.tip}>💡 Tip: Mark tests BEFORE clicking buttons that navigate</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('session')} style={styles.tab(activeTab === 'session')}>
          Session
        </button>
        <button onClick={() => setActiveTab('tests')} style={styles.tab(activeTab === 'tests')}>
          Tests
        </button>
        <button onClick={() => setActiveTab('bugs')} style={styles.tab(activeTab === 'bugs')}>
          Bugs ({state.bugs.length})
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'tests' && (
          <div style={styles.spaceY}>
            {/* Header with action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...styles.mb4 }}>
              <h3 style={{ ...styles.textWhite, fontWeight: 600, margin: 0 }}>{displayScreen || 'No Screen'} Tests</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setShowAddTestForm(!showAddTestForm); setShowBugForm(false); }}
                  style={styles.btnSmall('#2563eb')}
                >
                  {showAddTestForm ? 'Cancel' : '+ Add Test'}
                </button>
                <button
                  onClick={() => { setShowBugForm(!showBugForm); setShowAddTestForm(false); }}
                  style={styles.btnSmall('#dc2626')}
                >
                  {showBugForm ? 'Cancel' : 'Report Bug'}
                </button>
              </div>
            </div>

            {/* Add Test Form */}
            {showAddTestForm && (
              <div style={styles.card}>
                <h4 style={{ ...styles.textWhite, fontWeight: 600, margin: '0 0 12px 0' }}>Add New Test</h4>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Description *</label>
                  <input
                    type="text"
                    value={newTestDescription}
                    onChange={(e) => setNewTestDescription(e.target.value)}
                    placeholder="What should be tested?"
                    style={styles.input}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTest()}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={styles.label}>Category</label>
                  <select
                    value={newTestCategory}
                    onChange={(e) => setNewTestCategory(e.target.value as 'UI' | 'Functionality')}
                    style={styles.select}
                  >
                    <option value="UI">UI</option>
                    <option value="Functionality">Functionality</option>
                  </select>
                </div>
                <div style={styles.flexRow}>
                  <button onClick={handleAddTest} style={{ ...styles.btn('#2563eb'), ...styles.flex1 }}>
                    Add Test
                  </button>
                  <button onClick={() => setShowAddTestForm(false)} style={{ ...styles.btn('#374151'), ...styles.flex1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showBugForm && (
              <BugReportForm
                title={bugTitle}
                setTitle={setBugTitle}
                description={bugDescription}
                setDescription={setBugDescription}
                severity={bugSeverity}
                setSeverity={setBugSeverity}
                expected={bugExpected}
                setExpected={setBugExpected}
                actual={bugActual}
                setActual={setBugActual}
                onSubmit={handleSubmitBug}
                onCancel={() => setShowBugForm(false)}
                styles={styles}
              />
            )}

            {currentChecklist && currentChecklist.items.length > 0 ? (
              currentChecklist.items.map((test) => (
                <TestItemCard
                  key={test.id}
                  test={test}
                  onUpdateStatus={handleTestStatusUpdate}
                  onRemove={handleRemoveTest}
                  styles={styles}
                />
              ))
            ) : (
              <p style={styles.textGray}>No tests for this screen. Click "+ Add Test" to create one.</p>
            )}
          </div>
        )}

        {activeTab === 'bugs' && (
          <div style={styles.spaceY}>
            {showBugForm ? (
              <BugReportForm
                title={bugTitle}
                setTitle={setBugTitle}
                description={bugDescription}
                setDescription={setBugDescription}
                severity={bugSeverity}
                setSeverity={setBugSeverity}
                expected={bugExpected}
                setExpected={setBugExpected}
                actual={bugActual}
                setActual={setBugActual}
                onSubmit={handleSubmitBug}
                onCancel={() => setShowBugForm(false)}
                styles={styles}
              />
            ) : (
              <>
                <button onClick={() => setShowBugForm(true)} style={styles.btn('#dc2626')}>
                  + Report New Bug
                </button>

                {state.bugs.length > 0 ? (
                  state.bugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} onDelete={deleteBug} styles={styles} />
                  ))
                ) : (
                  <p style={styles.textGray}>No bugs reported yet</p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'session' && (
          <div style={styles.spaceY}>
            {state.currentSession ? (
              <>
                <div style={styles.card}>
                  <h3 style={{ ...styles.textWhite, fontWeight: 600, ...styles.mb2, margin: 0 }}>
                    {state.currentSession.name}
                  </h3>
                  <div style={{ fontSize: '14px' }}>
                    <p style={{ ...styles.textGray, margin: '4px 0' }}>
                      Tester: <span style={styles.textWhite}>{state.currentSession.tester}</span>
                    </p>
                    <p style={{ ...styles.textGray, margin: '4px 0' }}>
                      Started: <span style={styles.textWhite}>{new Date(state.currentSession.startedAt).toLocaleString()}</span>
                    </p>
                  </div>

                  <div style={{ ...styles.grid2, ...styles.mt4, fontSize: '14px' }}>
                    <div style={{ backgroundColor: '#111827', padding: '8px', borderRadius: '4px' }}>
                      <p style={{ ...styles.textGray, margin: 0 }}>Total</p>
                      <p style={{ ...styles.textWhite, fontWeight: 'bold', margin: 0 }}>{state.currentSession.totalTests}</p>
                    </div>
                    <div style={{ backgroundColor: 'rgba(22, 163, 74, 0.3)', padding: '8px', borderRadius: '4px' }}>
                      <p style={{ ...styles.textGray, margin: 0 }}>Passed</p>
                      <p style={{ ...styles.textGreen, fontWeight: 'bold', margin: 0 }}>{state.currentSession.passedTests}</p>
                    </div>
                    <div style={{ backgroundColor: 'rgba(220, 38, 38, 0.3)', padding: '8px', borderRadius: '4px' }}>
                      <p style={{ ...styles.textGray, margin: 0 }}>Failed</p>
                      <p style={{ ...styles.textRed, fontWeight: 'bold', margin: 0 }}>{state.currentSession.failedTests}</p>
                    </div>
                    <div style={{ backgroundColor: 'rgba(202, 138, 4, 0.3)', padding: '8px', borderRadius: '4px' }}>
                      <p style={{ ...styles.textGray, margin: 0 }}>Skipped</p>
                      <p style={{ ...styles.textYellow, fontWeight: 'bold', margin: 0 }}>{state.currentSession.skippedTests}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const notes = prompt('Add session notes (optional):');
                    completeTestSession(notes || undefined);
                  }}
                  style={styles.btn('#9333ea')}
                >
                  Complete Session
                </button>
              </>
            ) : showSessionForm ? (
              <SessionForm
                name={sessionName}
                setName={setSessionName}
                tester={testerName}
                setTester={setTesterName}
                onSubmit={handleStartSession}
                onCancel={() => setShowSessionForm(false)}
                styles={styles}
              />
            ) : (
              <>
                <p style={{ ...styles.textGray, ...styles.mb4 }}>No active test session</p>
                <button onClick={() => setShowSessionForm(true)} style={styles.btn('#9333ea')}>
                  Start Test Session
                </button>
              </>
            )}

            {/* Past Sessions */}
            {state.testSessions.length > 0 && (
              <div style={styles.mt4}>
                <h4 style={{ ...styles.textWhite, fontWeight: 600, ...styles.mb2 }}>Past Sessions</h4>
                <div style={styles.spaceY}>
                  {state.testSessions.map((session) => (
                    <div key={session.id} style={{ ...styles.card, fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={styles.flex1}>
                          <p style={{ ...styles.textWhite, fontWeight: 500, margin: 0 }}>{session.name}</p>
                          <p style={{ ...styles.textGray, fontSize: '12px', margin: '4px 0' }}>
                            {new Date(session.startedAt).toLocaleDateString()}
                          </p>
                          <p style={{ ...styles.textGray, fontSize: '12px', margin: 0 }}>
                            {session.passedTests}/{session.totalTests} passed
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this session?')) {
                              deleteSession(session.id);
                            }
                          }}
                          style={{ ...styles.textRed, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ✕
                        </button>
                      </div>
                      <button
                        onClick={exportState}
                        style={{ ...styles.btn('#2563eb'), marginTop: '8px', fontSize: '12px', padding: '6px 12px' }}
                      >
                        📥 Export Report
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          Press <kbd style={styles.kbd}>Ctrl+Shift+Q</kbd> to toggle
        </p>
      </div>
    </div>
  );
}

// Test Item Card Component
function TestItemCard({
  test,
  onUpdateStatus,
  onRemove,
  styles,
}: {
  test: TestItem;
  onUpdateStatus: (id: string, status: TestItem['status'], notes?: string) => void;
  onRemove: (id: string) => void;
  styles: any;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(test.notes || '');

  const statusColors: Record<string, string> = {
    not_started: '#374151',
    passed: '#16a34a',
    failed: '#dc2626',
    skipped: '#ca8a04',
  };

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={styles.flex1}>
          <p style={{ ...styles.textWhite, fontSize: '14px', fontWeight: 500, margin: 0 }}>{test.description}</p>
          <p style={{ ...styles.textGray, fontSize: '12px', margin: '4px 0 0 0' }}>{test.category}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'white',
            backgroundColor: statusColors[test.status],
          }}>
            {test.status.replace('_', ' ')}
          </span>
          <button
            onClick={() => onRemove(test.id)}
            style={{ ...styles.textRed, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0' }}
            title="Delete test"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ ...styles.flexRow, marginTop: '8px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(test.id, 'passed'); }}
          style={{ ...styles.flex1, ...styles.btnSmall('#16a34a'), fontWeight: 600 }}
        >
          ✓ Pass
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(test.id, 'failed'); }}
          style={{ ...styles.flex1, ...styles.btnSmall('#dc2626'), fontWeight: 600 }}
        >
          ✗ Fail
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(test.id, 'skipped'); }}
          style={{ ...styles.flex1, ...styles.btnSmall('#ca8a04'), fontWeight: 600 }}
        >
          ⊘ Skip
        </button>
      </div>

      <button
        onClick={() => setShowNotes(!showNotes)}
        style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', marginTop: '8px', padding: 0 }}
      >
        {showNotes ? 'Hide Notes' : 'Add Notes'}
      </button>

      {showNotes && (
        <div style={{ marginTop: '8px' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdateStatus(test.id, test.status, notes)}
            placeholder="Add testing notes..."
            style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
          />
        </div>
      )}
    </div>
  );
}

// Bug Card Component
function BugCard({ bug, onDelete, styles }: { bug: BugReport; onDelete: (id: string) => void; styles: any }) {
  const severityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'rgba(127, 29, 29, 0.5)', text: '#fecaca' },
    high: { bg: 'rgba(124, 45, 18, 0.5)', text: '#fed7aa' },
    medium: { bg: 'rgba(113, 63, 18, 0.5)', text: '#fef08a' },
    low: { bg: 'rgba(30, 58, 138, 0.5)', text: '#bfdbfe' },
  };

  const colors = severityColors[bug.severity] || severityColors.medium;

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={styles.flex1}>
          <h4 style={{ ...styles.textWhite, fontSize: '14px', fontWeight: 600, margin: 0 }}>{bug.title}</h4>
          <span style={{
            display: 'inline-block',
            marginTop: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: colors.bg,
            color: colors.text,
          }}>
            {bug.severity}
          </span>
        </div>
        <button
          onClick={() => {
            if (confirm('Delete this bug report?')) {
              onDelete(bug.id);
            }
          }}
          style={{ ...styles.textRed, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <p style={{ color: '#d1d5db', fontSize: '12px', margin: '8px 0' }}>{bug.description}</p>

      <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
        <span style={{ backgroundColor: '#111827', padding: '4px 8px', borderRadius: '4px', color: '#9ca3af' }}>{bug.screen}</span>
        <span style={{ backgroundColor: '#111827', padding: '4px 8px', borderRadius: '4px', color: '#9ca3af' }}>{bug.status}</span>
      </div>
    </div>
  );
}

// Session Form Component
function SessionForm({
  name,
  setName,
  tester,
  setTester,
  onSubmit,
  onCancel,
  styles,
}: {
  name: string;
  setName: (v: string) => void;
  tester: string;
  setTester: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  styles: any;
}) {
  return (
    <div style={styles.card}>
      <h3 style={{ ...styles.textWhite, fontWeight: 600, margin: '0 0 12px 0' }}>Start Test Session</h3>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Session name (e.g., Phase 5 Testing)"
        style={{ ...styles.input, marginBottom: '12px' }}
      />

      <input
        type="text"
        value={tester}
        onChange={(e) => setTester(e.target.value)}
        placeholder="Tester name"
        style={{ ...styles.input, marginBottom: '12px' }}
      />

      <div style={styles.flexRow}>
        <button onClick={onSubmit} style={{ ...styles.btn('#9333ea'), ...styles.flex1 }}>
          Start
        </button>
        <button onClick={onCancel} style={{ ...styles.btn('#374151'), ...styles.flex1 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// Bug Report Form Component
function BugReportForm({
  title,
  setTitle,
  description,
  setDescription,
  severity,
  setSeverity,
  expected,
  setExpected,
  actual,
  setActual,
  onSubmit,
  onCancel,
  styles,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  severity: BugReport['severity'];
  setSeverity: (v: BugReport['severity']) => void;
  expected: string;
  setExpected: (v: string) => void;
  actual: string;
  setActual: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  styles: any;
}) {
  return (
    <div style={styles.card}>
      <h3 style={{ ...styles.textWhite, fontWeight: 600, margin: '0 0 12px 0' }}>Report Bug</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the bug"
          style={styles.input}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed explanation of what went wrong"
          style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Severity</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as BugReport['severity'])}
          style={styles.select}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Expected Behavior</label>
        <input
          type="text"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="What should have happened"
          style={styles.input}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Actual Behavior *</label>
        <input
          type="text"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="What actually happened"
          style={styles.input}
        />
      </div>

      <div style={styles.flexRow}>
        <button onClick={onSubmit} style={{ ...styles.btn('#9333ea'), ...styles.flex1 }}>
          Submit Bug
        </button>
        <button onClick={onCancel} style={{ ...styles.btn('#374151'), ...styles.flex1 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
