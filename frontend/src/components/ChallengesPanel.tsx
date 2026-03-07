/**
 * ChallengesPanel.tsx - Coding challenges sidebar panel
 *
 * A "+" feature that lets users pick from 5 coding challenges.
 * Each challenge has a description, examples, test cases, and starter code.
 * Users can load a challenge, solve it, then run test cases.
 */

"use client";

import { useState } from "react";
import {
  Trophy,
  ChevronRight,
  Play,
  CheckCircle,
  XCircle,
  Loader,
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type {
  CodingChallenge,
  TestCase,
  TestCaseResult,
  ChallengeAttempt,
  Language,
} from "../types";
import { CODING_CHALLENGES, RUNNABLE_LANGUAGES } from "../types";
import { executeCode } from "../hooks/execute";

// =============================================================================
// TYPES
// =============================================================================

interface ChallengesPanelProps {
  /** Current active file language */
  activeLanguage: Language | null;
  /** Callback to create a challenge file and open it */
  onLoadChallenge: (challenge: CodingChallenge, language: Language) => void;
  /** Current editor content (for running tests against) */
  editorContent: string;
  /** Current active file language for test execution */
  currentLanguage: Language | null;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'auto',
  } as React.CSSProperties,
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  challengeList: {
    padding: '8px 0',
  } as React.CSSProperties,
  challengeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  challengeNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  } as React.CSSProperties,
  challengeInfo: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  challengeTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: '2px',
  } as React.CSSProperties,
  difficultyBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  detailSection: {
    padding: '16px',
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  detailTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: '4px',
  } as React.CSSProperties,
  description: {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  exampleBox: {
    padding: '10px 12px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  exampleLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    marginBottom: '4px',
  } as React.CSSProperties,
  exampleText: {
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
  } as React.CSSProperties,
  langSelect: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  } as React.CSSProperties,
  langBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  langBtnActive: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    borderColor: 'var(--color-accent)',
  } as React.CSSProperties,
  langBtnInactive: {
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  loadBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  testSection: {
    padding: '16px',
  } as React.CSSProperties,
  testHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  } as React.CSSProperties,
  testTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  runTestsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  testCase: {
    padding: '10px 12px',
    backgroundColor: 'var(--color-surface-2)',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  testCaseHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  } as React.CSSProperties,
  testCaseLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  testCaseStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
  } as React.CSSProperties,
  passedStatus: {
    color: '#2ed573',
  } as React.CSSProperties,
  failedStatus: {
    color: 'var(--color-error)',
  } as React.CSSProperties,
  testIO: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-secondary)',
    marginBottom: '2px',
  } as React.CSSProperties,
  customTestInput: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    resize: 'vertical',
    minHeight: '60px',
    marginBottom: '6px',
  } as React.CSSProperties,
  addTestBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px dashed var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.2s',
    width: '100%',
    justifyContent: 'center',
    marginTop: '4px',
  } as React.CSSProperties,
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    marginBottom: '12px',
  } as React.CSSProperties,
  constraint: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    marginBottom: '4px',
    paddingLeft: '12px',
    position: 'relative',
  } as React.CSSProperties,
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'rgba(46, 213, 115, 0.15)', text: '#2ed573' },
  Medium: { bg: 'rgba(255, 165, 2, 0.15)', text: '#ffa502' },
  Hard: { bg: 'rgba(255, 71, 87, 0.15)', text: '#ff4757' },
};

const LANG_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JS",
  cpp: "C++",
  java: "Java",
  go: "Go",
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function ChallengesPanel({
  activeLanguage,
  onLoadChallenge,
  editorContent,
  currentLanguage,
}: ChallengesPanelProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<CodingChallenge | null>(null);
  const [selectedLang, setSelectedLang] = useState<Language>(activeLanguage || "python");
  const [attempts, setAttempts] = useState<Record<string, ChallengeAttempt>>({});
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [customTests, setCustomTests] = useState<TestCase[]>([]);
  const [newTestInput, setNewTestInput] = useState("");
  const [newTestExpected, setNewTestExpected] = useState("");
  const [showAddTest, setShowAddTest] = useState(false);

  // -------------------------------------------------------------------------
  // RUN TESTS
  // -------------------------------------------------------------------------
  const runTests = async () => {
    if (!selectedChallenge || !currentLanguage || isRunningTests) return;
    setIsRunningTests(true);
    setTestResults([]);

    const allTests = [...selectedChallenge.testCases, ...customTests];
    const results: TestCaseResult[] = [];

    for (const tc of allTests) {
      try {
        // Unescape the test input (\\n → actual newline)
        const input = tc.input.replace(/\\n/g, "\n");
        const expectedOutput = tc.expectedOutput.replace(/\\n/g, "\n").trim();

        const result = await executeCode({
          language: currentLanguage,
          code: editorContent,
          stdin: input,
        });

        const actualOutput = result.stdout.trim();
        const passed = actualOutput === expectedOutput;

        results.push({
          testCaseId: tc.id,
          passed,
          actualOutput,
          expectedOutput,
          input: tc.input,
          error: result.stderr || undefined,
        });
      } catch (err: any) {
        results.push({
          testCaseId: tc.id,
          passed: false,
          actualOutput: "",
          expectedOutput: tc.expectedOutput.replace(/\\n/g, "\n").trim(),
          input: tc.input,
          error: err.message,
        });
      }
    }

    setTestResults(results);

    // Update attempt
    const passed = results.filter((r) => r.passed).length;
    setAttempts((prev) => ({
      ...prev,
      [selectedChallenge.id]: {
        challengeId: selectedChallenge.id,
        status: passed === allTests.length ? "passed" : "failed",
        passedTests: passed,
        totalTests: allTests.length,
      },
    }));

    setIsRunningTests(false);
  };

  const addCustomTest = () => {
    if (!newTestInput.trim() && !newTestExpected.trim()) return;
    const test: TestCase = {
      id: `custom-${Date.now()}`,
      input: newTestInput,
      expectedOutput: newTestExpected,
      isCustom: true,
    };
    setCustomTests((prev) => [...prev, test]);
    setNewTestInput("");
    setNewTestExpected("");
    setShowAddTest(false);
  };

  const removeCustomTest = (id: string) => {
    setCustomTests((prev) => prev.filter((t) => t.id !== id));
    setTestResults((prev) => prev.filter((r) => r.testCaseId !== id));
  };

  // -------------------------------------------------------------------------
  // CHALLENGE LIST VIEW
  // -------------------------------------------------------------------------
  if (!selectedChallenge) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Trophy size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={styles.headerTitle}>Challenges</span>
        </div>
        <div style={styles.challengeList}>
          {CODING_CHALLENGES.map((ch, idx) => {
            const attempt = attempts[ch.id];
            const colors = DIFFICULTY_COLORS[ch.difficulty];
            return (
              <div
                key={ch.id}
                style={styles.challengeItem}
                onClick={() => {
                  setSelectedChallenge(ch);
                  setTestResults([]);
                  setCustomTests([]);
                }}
                className="hover-lift"
              >
                <div
                  style={{
                    ...styles.challengeNumber,
                    backgroundColor: attempt?.status === "passed" ? 'rgba(46, 213, 115, 0.15)' : 'var(--color-surface-2)',
                    color: attempt?.status === "passed" ? '#2ed573' : 'var(--color-text-muted)',
                  }}
                >
                  {attempt?.status === "passed" ? (
                    <CheckCircle size={14} />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div style={styles.challengeInfo}>
                  <div style={styles.challengeTitle}>{ch.title}</div>
                  <span
                    style={{
                      ...styles.difficultyBadge,
                      backgroundColor: colors.bg,
                      color: colors.text,
                    }}
                  >
                    {ch.difficulty}
                  </span>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // CHALLENGE DETAIL VIEW
  // -------------------------------------------------------------------------
  const allTests = [...selectedChallenge.testCases, ...customTests];
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = allTests.length;
  const allPassed = testResults.length === totalCount && passedCount === totalCount;
  const colors = DIFFICULTY_COLORS[selectedChallenge.difficulty];

  return (
    <div style={styles.container}>
      {/* Back button */}
      <div style={styles.header}>
        <button
          onClick={() => {
            setSelectedChallenge(null);
            setTestResults([]);
            setCustomTests([]);
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={12} />
          Back
        </button>
      </div>

      {/* Challenge info */}
      <div style={styles.detailSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={styles.detailTitle}>{selectedChallenge.title}</span>
          <span
            style={{
              ...styles.difficultyBadge,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            {selectedChallenge.difficulty}
          </span>
        </div>
        <p style={styles.description}>{selectedChallenge.description}</p>
      </div>

      {/* Examples */}
      <div style={styles.detailSection}>
        <div style={{ ...styles.testTitle, marginBottom: '8px' }}>Examples</div>
        {selectedChallenge.examples.map((ex, i) => (
          <div key={i} style={styles.exampleBox}>
            <div style={styles.exampleLabel}>Input</div>
            <div style={styles.exampleText}>{ex.input.replace(/\\n/g, "\n")}</div>
            <div style={{ ...styles.exampleLabel, marginTop: '6px' }}>Output</div>
            <div style={styles.exampleText}>{ex.output.replace(/\\n/g, "\n")}</div>
            {ex.explanation && (
              <>
                <div style={{ ...styles.exampleLabel, marginTop: '6px' }}>Explanation</div>
                <div style={{ ...styles.exampleText, color: 'var(--color-text-muted)' }}>
                  {ex.explanation}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Constraints */}
      {selectedChallenge.constraints.length > 0 && (
        <div style={styles.detailSection}>
          <div style={{ ...styles.testTitle, marginBottom: '8px' }}>
            <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Constraints
          </div>
          {selectedChallenge.constraints.map((c, i) => (
            <div key={i} style={styles.constraint as React.CSSProperties}>
              • {c}
            </div>
          ))}
        </div>
      )}

      {/* Language select + Load */}
      <div style={styles.detailSection}>
        <div style={{ ...styles.testTitle, marginBottom: '8px' }}>Load Challenge</div>
        <div style={styles.langSelect}>
          {RUNNABLE_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              style={{
                ...styles.langBtn,
                ...(selectedLang === lang ? styles.langBtnActive : styles.langBtnInactive),
              }}
            >
              {LANG_LABELS[lang] || lang}
            </button>
          ))}
        </div>
        <button
          onClick={() => onLoadChallenge(selectedChallenge, selectedLang)}
          style={styles.loadBtn}
          className="hover-lift"
        >
          <Play size={14} />
          Load in Editor
        </button>
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div style={styles.detailSection}>
          <div
            style={{
              ...styles.summary,
              backgroundColor: allPassed ? 'rgba(46, 213, 115, 0.12)' : 'var(--color-error-subtle)',
              color: allPassed ? '#2ed573' : 'var(--color-error)',
            }}
            className="animate-scale-in"
          >
            {allPassed ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {allPassed
              ? `All ${totalCount} tests passed!`
              : `${passedCount}/${totalCount} tests passed`}
          </div>
        </div>
      )}

      {/* Test Cases */}
      <div style={styles.testSection}>
        <div style={styles.testHeader}>
          <span style={styles.testTitle}>Test Cases ({totalCount})</span>
          <button
            onClick={runTests}
            disabled={isRunningTests || !currentLanguage}
            style={{
              ...styles.runTestsBtn,
              ...(isRunningTests ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            }}
            className="hover-lift"
          >
            {isRunningTests ? (
              <Loader size={12} className="animate-spin" />
            ) : (
              <Play size={12} />
            )}
            {isRunningTests ? "Running..." : "Run All"}
          </button>
        </div>

        {/* Built-in test cases */}
        {selectedChallenge.testCases.map((tc, idx) => {
          const result = testResults.find((r) => r.testCaseId === tc.id);
          return (
            <div key={tc.id} style={styles.testCase}>
              <div style={styles.testCaseHeader}>
                <span style={styles.testCaseLabel}>Test {idx + 1}</span>
                {result && (
                  <span
                    style={{
                      ...styles.testCaseStatus,
                      ...(result.passed ? styles.passedStatus : styles.failedStatus),
                    }}
                  >
                    {result.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {result.passed ? "Passed" : "Failed"}
                  </span>
                )}
              </div>
              <div style={styles.testIO}>
                <strong>Input:</strong> {tc.input.replace(/\\n/g, " ↵ ")}
              </div>
              <div style={styles.testIO}>
                <strong>Expected:</strong> {tc.expectedOutput.replace(/\\n/g, " ↵ ")}
              </div>
              {result && !result.passed && (
                <div style={{ ...styles.testIO, color: 'var(--color-error)' }}>
                  <strong>Got:</strong> {result.actualOutput || "(empty)"}
                  {result.error && <div style={{ marginTop: '2px' }}>Error: {result.error}</div>}
                </div>
              )}
            </div>
          );
        })}

        {/* Custom test cases */}
        {customTests.map((tc, idx) => {
          const result = testResults.find((r) => r.testCaseId === tc.id);
          return (
            <div key={tc.id} style={{ ...styles.testCase, borderColor: 'var(--color-accent-subtle)' }}>
              <div style={styles.testCaseHeader}>
                <span style={{ ...styles.testCaseLabel, color: 'var(--color-accent)' }}>
                  Custom {idx + 1}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {result && (
                    <span
                      style={{
                        ...styles.testCaseStatus,
                        ...(result.passed ? styles.passedStatus : styles.failedStatus),
                      }}
                    >
                      {result.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {result.passed ? "Passed" : "Failed"}
                    </span>
                  )}
                  <button
                    onClick={() => removeCustomTest(tc.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      padding: '2px',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <div style={styles.testIO}>
                <strong>Input:</strong> {tc.input.replace(/\\n/g, " ↵ ")}
              </div>
              <div style={styles.testIO}>
                <strong>Expected:</strong> {tc.expectedOutput.replace(/\\n/g, " ↵ ")}
              </div>
              {result && !result.passed && (
                <div style={{ ...styles.testIO, color: 'var(--color-error)' }}>
                  <strong>Got:</strong> {result.actualOutput || "(empty)"}
                </div>
              )}
            </div>
          );
        })}

        {/* Add custom test */}
        {showAddTest ? (
          <div
            style={{
              ...styles.testCase,
              borderStyle: 'dashed',
              borderColor: 'var(--color-accent)',
            }}
            className="animate-slide-down"
          >
            <div style={styles.testCaseLabel}>New Custom Test</div>
            <textarea
              value={newTestInput}
              onChange={(e) => setNewTestInput(e.target.value)}
              placeholder="Input (use \n for newlines)"
              style={styles.textarea}
            />
            <textarea
              value={newTestExpected}
              onChange={(e) => setNewTestExpected(e.target.value)}
              placeholder="Expected output"
              style={styles.textarea}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={addCustomTest}
                style={{
                  ...styles.runTestsBtn,
                  flex: 1,
                }}
              >
                <Plus size={12} />
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddTest(false);
                  setNewTestInput("");
                  setNewTestExpected("");
                }}
                style={{
                  ...styles.runTestsBtn,
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTest(true)}
            style={styles.addTestBtn}
          >
            <Plus size={12} />
            Add Custom Test Case
          </button>
        )}
      </div>
    </div>
  );
}
