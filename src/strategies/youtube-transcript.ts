const WATCH_HOSTNAMES = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com'
]);

const WATCH_PATHNAME = '/watch';

const INNERTUBE_PLAYER_ENDPOINT = 'https://www.youtube.com/youtubei/v1/player';

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '20.10.38'
  }
};


const VOID_ELEMENTS = new Set(['br', 'hr', 'img', 'wbr']);


type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  name?: { runs?: Array<{ text?: string }> };
  kind?: string;
  isTranslatable?: boolean;
};

type CaptionsJson = {
  captionTracks?: CaptionTrack[];
};

type PlayerResponse = {
  videoDetails?: { videoId?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: CaptionsJson;
  };
};

export interface TranscriptSegment {
  start: number;
  duration: number;
  html: string;
}

export interface TranscriptData {
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  segments: TranscriptSegment[];
}

export type TranscriptFailureReason =
  | 'missing-video-id'
  | 'missing-api-key'
  | 'captions-disabled'
  | 'no-captions'
  | 'fetch-error'
  | 'transcript-fetch-error'
  | 'parsing-error';

export type TranscriptResult =
  | { kind: 'success'; data: TranscriptData }
  | { kind: 'failure'; reason: TranscriptFailureReason; message: string; error?: unknown };

export function isYouTubeWatchUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (!WATCH_HOSTNAMES.has(url.hostname)) {
      return false;
    }

    return url.pathname === WATCH_PATHNAME && url.searchParams.has('v');
  } catch {
    return false;
  }
}

export function extractVideoId(urlString: string): string | null {
  try {
    if (!isYouTubeWatchUrl(urlString)) {
      return null;
    }

    const url = new URL(urlString);
    const videoId = url.searchParams.get('v');
    return videoId ? videoId.trim() : null;
  } catch {
    return null;
  }
}

export function extractInnertubeApiKey(doc: Document): string | null {
  const scripts = Array.from(doc.getElementsByTagName('script'));
  const apiKeyRegex = /"INNERTUBE_API_KEY"\s*:\s*"([a-zA-Z0-9_-]+)"/;

  for (const script of scripts) {
    const text = script.textContent;
    if (!text) {
      continue;
    }

    const match = apiKeyRegex.exec(text);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function unique<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function buildLanguagePreferences(): string[] {
  const browserLanguages = typeof navigator === 'undefined' ? [] : navigator.languages || [];
  const fallbackLanguage = typeof navigator === 'undefined' ? [] : [navigator.language].filter(Boolean) as string[];
  const baseLanguages = browserLanguages.concat(fallbackLanguage).concat(['en']);

  return unique(
    baseLanguages
      .filter(Boolean)
      .map((code) => code.toLowerCase())
      .map((code) => code.split('-')[0])
  );
}

function selectTrack(captionTracks: CaptionTrack[], preferences: string[]): CaptionTrack | null {
  if (!captionTracks.length) {
    return null;
  }

  const normalized = captionTracks.map((track) => ({
    track,
    languageCode: track.languageCode ? track.languageCode.toLowerCase() : ''
  }));

  for (const pref of preferences) {
    const exact = normalized.find(({ languageCode }) => languageCode === pref || languageCode.startsWith(`${pref}-`));
    if (exact) {
      return exact.track;
    }
  }

  return captionTracks[0];
}

async function fetchInnertubePlayerResponse(
  videoId: string,
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<PlayerResponse> {
  const response = await fetchImpl(`${INNERTUBE_PLAYER_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId
    })
  });

  if (!response.ok) {
    throw new Error(`YouTube player request failed with status ${response.status}`);
  }

  return (await response.json()) as PlayerResponse;
}

function sanitizeTranscriptUrl(url: string): string {
  return url.replace('&fmt=srv3', '');
}

async function fetchTranscriptXml(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Transcript fetch failed with status ${response.status}`);
  }

  return await response.text();
}

function escapeAttributeValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function serializeElementNode(element: Element, tagSet: Set<string>): string {
  const tagName = element.tagName.toLowerCase();
  tagSet.add(tagName);

  const attributes = Array.from(element.attributes)
    .map((attr) => `${attr.name}="${escapeAttributeValue(attr.value)}"`)
    .join(' ');

  const children = Array.from(element.childNodes)
    .map((child) => serializeChildNode(child, tagSet))
    .join('');

  if (VOID_ELEMENTS.has(tagName)) {
    return attributes.length ? `<${tagName} ${attributes}>` : `<${tagName}>`;
  }

  const openTag = attributes.length ? `<${tagName} ${attributes}>` : `<${tagName}>`;
  return `${openTag}${children}</${tagName}>`;
}

function serializeChildNode(node: ChildNode, tagSet: Set<string>): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return serializeElementNode(node as Element, tagSet);
  }

  return '';
}

export function parseTranscriptXml(xml: string): TranscriptSegment[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid transcript XML');
  }

  const textElements = Array.from(doc.getElementsByTagName('text'));
  const tagSet = new Set<string>();

  const segments = textElements
    .map((element) => {
      const start = parseFloat(element.getAttribute('start') ?? '0');
      const durationAttr = element.getAttribute('dur') ?? element.getAttribute('duration') ?? '0';
      const duration = parseFloat(durationAttr);
      const html = Array.from(element.childNodes)
        .map((node) => serializeChildNode(node, tagSet))
        .join('');

      if (!Number.isFinite(start) || Number.isNaN(start)) {
        return null;
      }

      return {
        start,
        duration: Number.isFinite(duration) && !Number.isNaN(duration) ? duration : 0,
        html
      };
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment && segment.html !== null));

  if (tagSet.size > 0) {
    console.log('[mole] YouTube transcript tags:', Array.from(tagSet).sort());
  } else {
    console.log('[mole] YouTube transcript tags:', []);
  }

  return segments;
}

function captionsFromPlayerResponse(playerResponse: PlayerResponse): CaptionsJson | null {
  return playerResponse?.captions?.playerCaptionsTracklistRenderer ?? null;
}

export async function fetchYouTubeTranscript(
  doc: Document,
  fetchImpl: typeof fetch = fetch
): Promise<TranscriptResult> {
  const videoId = extractVideoId(doc.URL);
  if (!videoId) {
    return {
      kind: 'failure',
      reason: 'missing-video-id',
      message: 'YouTube transcript unavailable: missing video identifier.'
    };
  }

  const apiKey = extractInnertubeApiKey(doc);
  if (!apiKey) {
    return {
      kind: 'failure',
      reason: 'missing-api-key',
      message: 'YouTube transcript unavailable: unable to locate Innertube API key.'
    };
  }

  let playerResponse: PlayerResponse;
  try {
    playerResponse = await fetchInnertubePlayerResponse(videoId, apiKey, fetchImpl);
  } catch (error) {
    return {
      kind: 'failure',
      reason: 'fetch-error',
      message: 'YouTube transcript unavailable: failed to load player data.',
      error
    };
  }

  const captionsJson = captionsFromPlayerResponse(playerResponse);
  if (!captionsJson || !Array.isArray(captionsJson.captionTracks) || captionsJson.captionTracks.length === 0) {
    return {
      kind: 'failure',
      reason: 'captions-disabled',
      message: 'YouTube transcript unavailable: captions are disabled for this video.'
    };
  }

  const captionTracks = captionsJson.captionTracks;
  const manualTracks = captionTracks.filter((track) => track.kind !== 'asr');
  const generatedTracks = captionTracks.filter((track) => track.kind === 'asr');
  const preferences = buildLanguagePreferences();

  const selectedTrack = selectTrack(manualTracks, preferences) || selectTrack(generatedTracks, preferences);

  if (!selectedTrack) {
    return {
      kind: 'failure',
      reason: 'no-captions',
      message: 'YouTube transcript unavailable: no captions found in any language.'
    };
  }

  const transcriptUrl = sanitizeTranscriptUrl(selectedTrack.baseUrl);

  let transcriptXml: string;
  try {
    transcriptXml = await fetchTranscriptXml(transcriptUrl, fetchImpl);
  } catch (error) {
    return {
      kind: 'failure',
      reason: 'transcript-fetch-error',
      message: 'YouTube transcript unavailable: unable to download transcript data.',
      error
    };
  }

  let segments: TranscriptSegment[];
  try {
    segments = parseTranscriptXml(transcriptXml);
  } catch (error) {
    return {
      kind: 'failure',
      reason: 'parsing-error',
      message: 'YouTube transcript unavailable: transcript data could not be parsed.',
      error
    };
  }

  const language = selectedTrack.name?.runs?.[0]?.text || selectedTrack.languageCode;

  return {
    kind: 'success',
    data: {
      videoId,
      language,
      languageCode: selectedTrack.languageCode,
      isGenerated: selectedTrack.kind === 'asr',
      segments
    }
  };
}

export function renderTranscriptHtml(transcript: TranscriptData): string {
  const attr = (name: string, value: string): string => `${name}="${escapeAttributeValue(value)}"`;

  const paragraphs = transcript.segments
    .map((snippet) => {
      const start = snippet.start.toFixed(3);
      const duration = snippet.duration.toFixed(3);
      return `<p ${attr('data-start', start)} ${attr('data-duration', duration)}>${snippet.html}</p>`;
    })
    .join('');

  const attributes = [
    attr('data-mole-source', 'youtube-transcript'),
    attr('data-language', transcript.languageCode),
    attr('data-is-generated', String(transcript.isGenerated))
  ].join(' ');

  return `<article ${attributes}>${paragraphs}</article>`;
}
