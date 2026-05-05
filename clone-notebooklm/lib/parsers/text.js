/**
 * 텍스트 소스 파서 (직접 입력)
 */
export function parseText(text, title = '텍스트 입력') {
  return {
    content: text.trim(),
    name: title,
    metadata: { type: 'text' },
    charCount: text.trim().length,
  };
}
