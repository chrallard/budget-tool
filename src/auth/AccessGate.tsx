import { useState, type FormEvent } from "react";
import { ApiRequestError, AppsScriptApiClient } from "../api/client";
import { setAccessKey } from "./accessKey";

type AccessGateProps = {
  onUnlocked: () => void;
};

export function AccessGate({ onUnlocked }: Readonly<AccessGateProps>) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Enter the access key.");
      return;
    }

    const url = import.meta.env.VITE_APPS_SCRIPT_URL;
    if (!url) {
      setError("VITE_APPS_SCRIPT_URL is not configured.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await new AppsScriptApiClient(url, trimmed).getConfig();
      setAccessKey(trimmed);
      onUnlocked();
    } catch (submitError) {
      if (submitError instanceof ApiRequestError && submitError.code === "UNAUTHORIZED") {
        setError(
          submitError.message === "Access key is not configured."
            ? "Access key is not configured on the server."
            : "That access key was rejected.",
        );
        return;
      }

      const message = submitError instanceof Error ? submitError.message : "Unable to unlock.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="access-gate">
      <p className="dashboard-eyebrow">budget-tool</p>
      <h1>Unlock</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="access-key">Access key</label>
        <input
          id="access-key"
          name="access-key"
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        {error ? (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
