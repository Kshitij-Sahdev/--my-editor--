/**
 * MarkdownViewer.tsx - Comprehensive Markdown renderer
 *
 * Renders Markdown content with full GitHub Flavored Markdown support:
 * - Headings with anchor links
 * - Code blocks with syntax highlighting
 * - Tables with proper styling
 * - Task lists (checkboxes)
 * - Blockquotes
 * - Images and links
 * - Inline code
 * - Horizontal rules
 * - Strikethrough, bold, italic
 */

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

// =============================================================================
// TYPES
// =============================================================================

interface MarkdownViewerProps {
  /** Markdown content to render */
  content: string;
  /** Optional class name for the container */
  className?: string;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    height: "100%",
    overflow: "auto",
    padding: "24px 32px",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    lineHeight: 1.8,
  } as React.CSSProperties,
  content: {
    maxWidth: "900px",
    margin: "0 auto",
  } as React.CSSProperties,
};

// =============================================================================
// CUSTOM COMPONENTS
// =============================================================================

/**
 * Custom component renderers for react-markdown.
 * Provides styled components for each Markdown element.
 */
const components: Components = {
  // Headings with anchor links and proper sizing
  h1: ({ children, ...props }) => (
    <h1
      style={{
        fontSize: "2.5em",
        fontWeight: 700,
        marginTop: "0",
        marginBottom: "24px",
        paddingBottom: "12px",
        borderBottom: "2px solid var(--color-border)",
        color: "var(--color-text)",
        letterSpacing: "-0.02em",
      }}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      style={{
        fontSize: "1.8em",
        fontWeight: 600,
        marginTop: "40px",
        marginBottom: "16px",
        paddingBottom: "8px",
        borderBottom: "1px solid var(--color-border-subtle)",
        color: "var(--color-text)",
      }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      style={{
        fontSize: "1.4em",
        fontWeight: 600,
        marginTop: "32px",
        marginBottom: "12px",
        color: "var(--color-text)",
      }}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      style={{
        fontSize: "1.2em",
        fontWeight: 600,
        marginTop: "24px",
        marginBottom: "8px",
        color: "var(--color-text)",
      }}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      style={{
        fontSize: "1em",
        fontWeight: 600,
        marginTop: "20px",
        marginBottom: "8px",
        color: "var(--color-text-secondary)",
      }}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      style={{
        fontSize: "0.9em",
        fontWeight: 600,
        marginTop: "16px",
        marginBottom: "8px",
        color: "var(--color-text-muted)",
      }}
      {...props}
    >
      {children}
    </h6>
  ),

  // Paragraphs
  p: ({ children, ...props }) => (
    <p
      style={{
        marginTop: "0",
        marginBottom: "16px",
        color: "var(--color-text-secondary)",
      }}
      {...props}
    >
      {children}
    </p>
  ),

  // Links with accent color
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--color-accent)",
        textDecoration: "none",
        borderBottom: "1px solid transparent",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderBottomColor = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderBottomColor = "transparent";
      }}
      {...props}
    >
      {children}
    </a>
  ),

  // Code blocks with syntax highlighting
  pre: ({ children, ...props }) => (
    <pre
      style={{
        margin: "24px 0",
        padding: "20px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        overflow: "auto",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
      {...props}
    >
      {children}
    </pre>
  ),

  // Inline code
  code: ({ className, children, ...props }) => {
    const isCodeBlock = className?.includes("language-");
    if (isCodeBlock) {
      return (
        <code
          className={className}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "inherit",
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          padding: "2px 6px",
          backgroundColor: "var(--color-surface-2)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "4px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.9em",
          color: "var(--color-accent)",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },

  // Blockquotes
  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        margin: "24px 0",
        padding: "16px 24px",
        backgroundColor: "var(--color-surface)",
        borderLeft: "4px solid var(--color-accent)",
        borderRadius: "0 8px 8px 0",
        color: "var(--color-text-secondary)",
        fontStyle: "italic",
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Lists
  ul: ({ children, ...props }) => (
    <ul
      style={{
        marginTop: "0",
        marginBottom: "16px",
        paddingLeft: "24px",
        color: "var(--color-text-secondary)",
      }}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      style={{
        marginTop: "0",
        marginBottom: "16px",
        paddingLeft: "24px",
        color: "var(--color-text-secondary)",
      }}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      style={{
        marginBottom: "8px",
        lineHeight: 1.7,
      }}
      {...props}
    >
      {children}
    </li>
  ),

  // Tables with proper styling
  table: ({ children, ...props }) => (
    <div style={{ overflowX: "auto", margin: "24px 0" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      style={{
        backgroundColor: "var(--color-surface)",
      }}
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr
      style={{
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        padding: "12px 16px",
        textAlign: "left",
        fontWeight: 600,
        color: "var(--color-text)",
        borderBottom: "2px solid var(--color-border)",
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        padding: "12px 16px",
        color: "var(--color-text-secondary)",
      }}
      {...props}
    >
      {children}
    </td>
  ),

  // Horizontal rule
  hr: ({ ...props }) => (
    <hr
      style={{
        margin: "32px 0",
        border: "none",
        borderTop: "1px solid var(--color-border)",
      }}
      {...props}
    />
  ),

  // Images
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt}
      style={{
        maxWidth: "100%",
        height: "auto",
        borderRadius: "8px",
        margin: "16px 0",
        border: "1px solid var(--color-border)",
      }}
      {...props}
    />
  ),

  // Strong/Bold
  strong: ({ children, ...props }) => (
    <strong
      style={{
        fontWeight: 600,
        color: "var(--color-text)",
      }}
      {...props}
    >
      {children}
    </strong>
  ),

  // Emphasis/Italic
  em: ({ children, ...props }) => (
    <em
      style={{
        fontStyle: "italic",
        color: "var(--color-text-secondary)",
      }}
      {...props}
    >
      {children}
    </em>
  ),

  // Strikethrough
  del: ({ children, ...props }) => (
    <del
      style={{
        textDecoration: "line-through",
        color: "var(--color-text-muted)",
      }}
      {...props}
    >
      {children}
    </del>
  ),

  // Task list items (checkboxes)
  input: ({ type, checked, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          style={{
            marginRight: "8px",
            accentColor: "var(--color-accent)",
            width: "16px",
            height: "16px",
            cursor: "default",
          }}
          {...props}
        />
      );
    }
    return <input type={type} {...props} />;
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div style={styles.container} className={className}>
      <div style={styles.content}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
