/**
 * 텍스트 청킹 유틸리티
 * 한국어 기준 500자, 100자 오버랩
 */

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 100;

export function chunkText(text, { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = {}) {
  if (!text || text.trim().length === 0) return [];

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (cleaned.length <= chunkSize) {
    return [{ text: cleaned, index: 0 }];
  }

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
        currentChunk = '';
      }
      const sentences = splitSentences(para);
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.trim()) {
          chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
          const overlapText = getOverlapText(currentChunk, overlap);
          currentChunk = overlapText + ' ' + sentence;
        } else {
          currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
        }
      }
    } else if ((currentChunk + '\n\n' + para).length > chunkSize && currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + '\n\n' + para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), index: chunkIndex });
  }

  return chunks;
}

function splitSentences(text) {
  const sentences = text.match(/[^.!?。？！]*[.!?。？！]+[\s]*/g) || [text];
  return sentences.map(s => s.trim()).filter(Boolean);
}

function getOverlapText(text, overlapSize) {
  if (text.length <= overlapSize) return text;
  const tail = text.slice(-overlapSize);
  const firstSpace = tail.indexOf(' ');
  return firstSpace > 0 ? tail.slice(firstSpace + 1) : tail;
}
