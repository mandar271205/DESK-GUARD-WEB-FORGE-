const configuredPublicUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();

export function getPublicAppUrl(): string {
  if (configuredPublicUrl) {
    return configuredPublicUrl.replace(/\/+$/, "");
  }
  return window.location.origin.replace(/\/+$/, "");
}
