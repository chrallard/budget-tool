let accessKey = "";

export function requiresAccessKey(): boolean {
  return (
    import.meta.env.VITE_USE_MOCK_DASHBOARD === "false" ||
    import.meta.env.VITE_USE_MOCK_IMPORT === "false"
  );
}

export function getAccessKey(): string {
  return accessKey;
}

export function setAccessKey(key: string): void {
  accessKey = key;
}

export function clearAccessKey(): void {
  accessKey = "";
}
