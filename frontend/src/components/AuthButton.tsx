/**
 * AuthButton.tsx - Clerk authentication button
 *
 * Shows sign-in button when not authenticated, user avatar + menu when signed in.
 * Supports Google and GitHub OAuth providers.
 */

"use client";

import {
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/react";
import { LogIn } from "lucide-react";

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  signInBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  userContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function AuthButton() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button style={styles.signInBtn} className="hover-lift">
          <LogIn size={14} />
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <div style={styles.userContainer}>
      <UserButton
        appearance={{
          elements: {
            avatarBox: {
              width: 32,
              height: 32,
            },
          },
        }}
      />
    </div>
  );
}

/**
 * Hook to get the GitHub OAuth token from Clerk.
 * Used by GitHubPanel for API calls.
 */
export function useGitHubToken() {
  const { getToken } = useAuth();
  
  async function getGitHubToken(): Promise<string | null> {
    try {
      const token = await getToken({ template: "github" });
      return token;
    } catch {
      return null;
    }
  }

  return { getGitHubToken };
}
