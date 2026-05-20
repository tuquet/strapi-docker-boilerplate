export async function fetchSeedFiles() {
  const res = await fetch('/api/seed-files');
  if (!res.ok) throw new Error('Failed to fetch files');
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.files;
}

export async function fetchSeedFile(path: string) {
  const res = await fetch(`/api/seed-file?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error('File not found');
  return await res.text();
}

export interface ArticleFormData {
  title: string;
  slug: string;
  category: string;
  description: string;
  content: string;
}

export async function submitArticle(form: ArticleFormData, apiToken: string = '') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;
  
  const res = await fetch('/api/seed-article', {
    method: 'POST',
    headers,
    body: JSON.stringify(form),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create article');
  return data.data;
}

export function parseCSV(text: string) {
  const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const headers = lines[0].split(splitRegex).map(h => h.replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => line.split(splitRegex).map(c => c.replace(/^"|"$/g, '')));
  
  return { headers, rows };
}

export async function appendCsvRow(path: string, row: string[]) {
  const res = await fetch('/api/append-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, row })
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to append row');
  return data;
}
