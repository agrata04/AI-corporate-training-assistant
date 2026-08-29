const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'you', 'your', 'into', 'about']);

export function chunkText(text, size = 1200, overlap = 180) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const chunks = [];
  let index = 0;
  while (index < cleaned.length) {
    chunks.push(cleaned.slice(index, index + size));
    index += size - overlap;
  }
  return chunks;
}

export function retrieveContext(files, query, limit = 6) {
  const terms = tokenize(query);
  const scored = [];
  for (const file of files) {
    for (const chunk of chunkText(file.extracted_text)) {
      const chunkTerms = tokenize(chunk);
      const score = [...terms].reduce((total, term) => total + (chunkTerms.has(term) ? 1 : 0), 0);
      if (score > 0) {
        scored.push({ score, fileName: file.file_name, chunk });
      }
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item, index) => ({
      label: `Source ${index + 1}: ${item.fileName}`,
      text: item.chunk
    }));
}

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}
