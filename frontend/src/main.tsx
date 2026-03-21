import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./styles/index.css";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CLERK_PROXY_URL = import.meta.env.VITE_CLERK_PROXY_URL;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {CLERK_KEY ? (
      <ClerkProvider
        publishableKey={CLERK_KEY}
        {...(CLERK_PROXY_URL ? { proxyUrl: CLERK_PROXY_URL } : {})}
      >
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);
