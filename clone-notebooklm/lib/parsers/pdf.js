/**
 * PDF 파서
 */
export async function parsePdf(buffer, filename = 'document.pdf') {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);

  return {
    content: data.text.trim(),
    name: filename.replace(/\.pdf$/i, ''),
    metadata: { type: 'pdf', filename, pages: data.numpages },
    charCount: data.text.trim().length,
  };
}
