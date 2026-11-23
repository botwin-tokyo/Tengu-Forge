export async function sendHTTPAction(baseUrl: string, headers: HeadersInit, id: string): Promise<string> {
  const response = await fetch(`${baseUrl}/http-actions/${encodeURIComponent(id)}/send`, {
    method: 'POST', headers, credentials: 'omit', redirect: 'error',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Send failed (HTTP ${response.status})`);
  }
  const { status, preview, truncated } = await response.json();
  return `HTTP ${status}\n${preview}${truncated ? '\n[Preview limited to 64 KiB]' : ''}`;
}
