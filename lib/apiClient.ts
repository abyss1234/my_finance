export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (response.status === 401 && typeof window !== 'undefined') {
    window.location.replace('/login');
    throw new Error('Authentication required');
  }

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);

  if (response.status === 401 && typeof window !== 'undefined') {
    window.location.replace('/login');
  }

  return response;
}
