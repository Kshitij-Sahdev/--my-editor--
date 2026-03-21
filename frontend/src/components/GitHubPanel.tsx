/**
 * GitHubPanel.tsx - GitHub integration panel
 *
 * Allows authenticated users to:
 * - Push current file to a GitHub repo
 * - Pull a single file from any public repo (rate limited)
 * - View rate limit status
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Loader,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@clerk/react";
import type { FileItem, GitHubRepo, GitHubRateLimit, Language } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface GitHubPanelProps {
  activeFile: FileItem | null;
  editorContent: string;
  onPullFile: (name: string, content: string, language: Language) => void;
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
    padding: '0',
  } as React.CSSProperties,
  section: {
    padding: '16px',
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    marginBottom: '8px',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  button: {
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
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  pushBtn: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
  } as React.CSSProperties,
  pullBtn: {
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  } as React.CSSProperties,
  disabledBtn: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    marginTop: '8px',
  } as React.CSSProperties,
  statusSuccess: {
    backgroundColor: 'rgba(46, 213, 115, 0.12)',
    color: '#2ed573',
  } as React.CSSProperties,
  statusError: {
    backgroundColor: 'var(--color-error-subtle)',
    color: 'var(--color-error)',
  } as React.CSSProperties,
  rateLimit: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    backgroundColor: 'var(--color-surface-2)',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  rateLimitLabel: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  rateLimitValue: {
    color: 'var(--color-text-secondary)',
    fontWeight: 600,
  } as React.CSSProperties,
  rateLimitBar: {
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--color-surface-hover)',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  } as React.CSSProperties,
  hint: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
    lineHeight: 1.4,
  } as React.CSSProperties,
  repoSelect: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    marginBottom: '8px',
    cursor: 'pointer',
  } as React.CSSProperties,
  notSignedIn: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function GitHubPanel({
  activeFile,
  editorContent,
  onPullFile,
}: GitHubPanelProps) {
  const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!clerkEnabled) {
    return <div style={styles.notSignedIn}>Clerk auth is not configured. Set VITE_CLERK_PUBLISHABLE_KEY.</div>;
  }

  return (
    <GitHubPanelWithAuth
      activeFile={activeFile}
      editorContent={editorContent}
      onPullFile={onPullFile}
    />
  );
}

function GitHubPanelWithAuth({
  activeFile,
  editorContent,
  onPullFile,
}: GitHubPanelProps) {
  const { isSignedIn, getToken } = useAuth();

  // Push state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [pushPath, setPushPath] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [pushBranch, setPushBranch] = useState("main");
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Pull state
  const [pullRepo, setPullRepo] = useState("");
  const [pullPath, setPullPath] = useState("");
  const [pullBranch, setPullBranch] = useState("main");
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Rate limit
  const [rateLimit, setRateLimit] = useState<GitHubRateLimit | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Auto-fill push path from active file
  useEffect(() => {
    if (activeFile) {
      setPushPath(activeFile.name);
      setCommitMsg(`Update ${activeFile.name}`);
    }
  }, [activeFile?.id]);

  // Fetch user repos on mount
  const fetchRepos = useCallback(async () => {
    if (!isSignedIn) return;
    setLoadingRepos(true);
    try {
      const token = await getToken({ template: "github" });
      if (!token) return;

      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      // Capture rate limit info
      const remaining = parseInt(res.headers.get("x-ratelimit-remaining") || "0");
      const limit = parseInt(res.headers.get("x-ratelimit-limit") || "60");
      const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0");
      setRateLimit({ remaining, limit, reset });

      if (res.ok) {
        const data = await res.json();
        setRepos(data);
        if (data.length > 0 && !selectedRepo) {
          setSelectedRepo(data[0].full_name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // -------------------------------------------------------------------------
  // PUSH
  // -------------------------------------------------------------------------
  const handlePush = async () => {
    if (!activeFile || !selectedRepo || !pushPath || isPushing) return;
    setIsPushing(true);
    setPushStatus(null);

    try {
      const token = await getToken({ template: "github" });
      if (!token) {
        setPushStatus({ ok: false, msg: "GitHub token not available. Re-sign in." });
        return;
      }

      // Check if file already exists (to get SHA for update)
      let sha: string | undefined;
      try {
        const existRes = await fetch(
          `https://api.github.com/repos/${selectedRepo}/contents/${pushPath}?ref=${pushBranch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (existRes.ok) {
          const existData = await existRes.json();
          sha = existData.sha;
        }
        // Update rate limit from response
        const remaining = parseInt(existRes.headers.get("x-ratelimit-remaining") || "0");
        const limit = parseInt(existRes.headers.get("x-ratelimit-limit") || "60");
        const reset = parseInt(existRes.headers.get("x-ratelimit-reset") || "0");
        setRateLimit({ remaining, limit, reset });
      } catch {
        // File doesn't exist yet — that's fine
      }

      // Create or update file
      const res = await fetch(
        `https://api.github.com/repos/${selectedRepo}/contents/${pushPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: commitMsg || `Update ${pushPath}`,
            content: btoa(unescape(encodeURIComponent(editorContent))),
            branch: pushBranch,
            ...(sha ? { sha } : {}),
          }),
        }
      );

      // Update rate limit
      const remaining = parseInt(res.headers.get("x-ratelimit-remaining") || "0");
      const limit = parseInt(res.headers.get("x-ratelimit-limit") || "60");
      const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0");
      setRateLimit({ remaining, limit, reset });

      if (res.ok) {
        await res.json();
        setPushStatus({
          ok: true,
          msg: `Pushed to ${selectedRepo}/${pushPath}`,
        });
      } else {
        const err = await res.json();
        setPushStatus({ ok: false, msg: err.message || "Push failed" });
      }
    } catch (err: any) {
      setPushStatus({ ok: false, msg: err.message || "Push failed" });
    } finally {
      setIsPushing(false);
    }
  };

  // -------------------------------------------------------------------------
  // PULL (single file only)
  // -------------------------------------------------------------------------
  const handlePull = async () => {
    if (!pullRepo || !pullPath || isPulling) return;
    setIsPulling(true);
    setPullStatus(null);

    try {
      const token = await getToken({ template: "github" });
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${pullRepo}/contents/${pullPath}?ref=${pullBranch}`,
        { headers }
      );

      // Update rate limit
      const remaining = parseInt(res.headers.get("x-ratelimit-remaining") || "0");
      const limit = parseInt(res.headers.get("x-ratelimit-limit") || "60");
      const reset = parseInt(res.headers.get("x-ratelimit-reset") || "0");
      setRateLimit({ remaining, limit, reset });

      if (!res.ok) {
        const err = await res.json();
        setPullStatus({ ok: false, msg: err.message || "Pull failed" });
        return;
      }

      const data = await res.json();

      if (data.type !== "file") {
        setPullStatus({ ok: false, msg: "Can only pull single files, not directories." });
        return;
      }

      // Decode content
      const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      const filename = data.name;

      // Detect language from filename extension
      const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
      const langMap: Record<string, Language> = {
        ".py": "python", ".cpp": "cpp", ".cc": "cpp", ".c": "cpp",
        ".java": "java", ".go": "go", ".js": "javascript", ".ts": "javascript",
        ".md": "markdown",
      };
      const language: Language = langMap[ext] || "text";

      onPullFile(filename, content, language);
      setPullStatus({ ok: true, msg: `Pulled ${filename} (${content.length} bytes)` });
    } catch (err: any) {
      setPullStatus({ ok: false, msg: err.message || "Pull failed" });
    } finally {
      setIsPulling(false);
    }
  };

  // -------------------------------------------------------------------------
  // NOT SIGNED IN
  // -------------------------------------------------------------------------
  if (!isSignedIn) {
    return (
      <div style={styles.notSignedIn}>
        <p>Sign in to use GitHub integration.</p>
        <p style={{ marginTop: '8px', fontSize: '11px' }}>
          Push files to your repos or pull a single file from any public repo.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  const resetTime = rateLimit?.reset
    ? new Date(rateLimit.reset * 1000).toLocaleTimeString()
    : "";

  return (
    <div style={styles.container}>
      {/* Rate Limit Display */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <RefreshCw size={12} />
          API Rate Limit
        </div>
        <div style={styles.rateLimit}>
          <span style={styles.rateLimitLabel}>Requests remaining</span>
          <span style={styles.rateLimitValue}>
            {rateLimit ? `${rateLimit.remaining}/${rateLimit.limit}` : "—"}
          </span>
        </div>
        {rateLimit && (
          <div style={styles.rateLimitBar}>
            <div
              style={{
                width: `${(rateLimit.remaining / rateLimit.limit) * 100}%`,
                height: '100%',
                backgroundColor: rateLimit.remaining < 10 ? 'var(--color-error)' : 'var(--color-accent)',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
        {rateLimit && rateLimit.remaining < 10 && (
          <p style={{ ...styles.hint, marginTop: '4px', color: 'var(--color-error)' }}>
            Rate limit low. Resets at {resetTime}
          </p>
        )}
      </div>

      {/* Push Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <Upload size={12} />
          Push to GitHub
        </div>
        <p style={styles.hint}>
          Push current file to one of your repositories.
        </p>

        {/* Repo select */}
        {loadingRepos ? (
          <div style={{ ...styles.hint, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Loader size={12} className="animate-spin" /> Loading repos...
          </div>
        ) : (
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            style={styles.repoSelect}
          >
            {repos.map((r) => (
              <option key={r.id} value={r.full_name}>
                {r.full_name} {r.private ? "🔒" : ""}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={pushBranch}
          onChange={(e) => setPushBranch(e.target.value)}
          placeholder="Branch (default: main)"
          style={styles.input}
        />

        <input
          type="text"
          value={pushPath}
          onChange={(e) => setPushPath(e.target.value)}
          placeholder="File path (e.g., src/main.py)"
          style={styles.input}
        />

        <input
          type="text"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Commit message"
          style={styles.input}
        />

        <button
          onClick={handlePush}
          disabled={!activeFile || !selectedRepo || !pushPath || isPushing}
          style={{
            ...styles.button,
            ...styles.pushBtn,
            ...(!activeFile || isPushing ? styles.disabledBtn : {}),
          }}
          className="hover-lift"
        >
          {isPushing ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {isPushing ? "Pushing..." : "Push File"}
        </button>

        {pushStatus && (
          <div
            style={{
              ...styles.status,
              ...(pushStatus.ok ? styles.statusSuccess : styles.statusError),
            }}
            className="animate-slide-down"
          >
            {pushStatus.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {pushStatus.msg}
          </div>
        )}
      </div>

      {/* Pull Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <Download size={12} />
          Pull from GitHub
        </div>
        <p style={styles.hint}>
          Pull a single file from any public repo. Rate limited — one file at a time.
        </p>

        <input
          type="text"
          value={pullRepo}
          onChange={(e) => setPullRepo(e.target.value)}
          placeholder="owner/repo (e.g., torvalds/linux)"
          style={styles.input}
        />

        <input
          type="text"
          value={pullBranch}
          onChange={(e) => setPullBranch(e.target.value)}
          placeholder="Branch (default: main)"
          style={styles.input}
        />

        <input
          type="text"
          value={pullPath}
          onChange={(e) => setPullPath(e.target.value)}
          placeholder="File path (e.g., README.md)"
          style={styles.input}
        />

        <button
          onClick={handlePull}
          disabled={!pullRepo || !pullPath || isPulling}
          style={{
            ...styles.button,
            ...styles.pullBtn,
            ...(!pullRepo || !pullPath || isPulling ? styles.disabledBtn : {}),
          }}
          className="hover-lift"
        >
          {isPulling ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {isPulling ? "Pulling..." : "Pull File"}
        </button>

        {pullStatus && (
          <div
            style={{
              ...styles.status,
              ...(pullStatus.ok ? styles.statusSuccess : styles.statusError),
            }}
            className="animate-slide-down"
          >
            {pullStatus.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {pullStatus.msg}
          </div>
        )}
      </div>
    </div>
  );
}
