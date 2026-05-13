/**
 * YouTube 트랜스크립트 파서
 * youtube-transcript 패키지로 자막/트랜스크립트 추출
 */
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * YouTube URL에서 비디오 ID 추출
 */
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * YouTube URL인지 판별
 */
export function isYoutubeUrl(url) {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

/**
 * YouTube 비디오에서 트랜스크립트 추출
 */
export async function parseYoutube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('유효한 YouTube URL이 아닙니다.');
  }

  // 트랜스크립트 가져오기 (한국어 우선, 없으면 영어)
  let transcript;
  try {
    transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
  } catch {
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    } catch {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
    }
  }

  if (!transcript || transcript.length === 0) {
    throw new Error('이 영상에서 자막/트랜스크립트를 찾을 수 없습니다.');
  }

  // 트랜스크립트를 텍스트로 합치기
  const content = transcript.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();

  // 비디오 제목 가져오기 (oEmbed API)
  let title = `YouTube 영상 (${videoId})`;
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      title = oembedData.title || title;
    }
  } catch {}

  return {
    content,
    name: title,
    metadata: {
      type: 'youtube',
      url,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
      title,
      segments: transcript.length,
    },
    charCount: content.length,
  };
}
