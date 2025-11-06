/** @jest-environment jsdom */

import { readFileSync } from 'fs';
import path from 'path';
import {
  extractInnertubeApiKey,
  fetchYouTubeTranscript,
  parseTranscriptXml,
  renderTranscriptHtml
} from '../src/strategies/youtube-transcript';

const fixturesPath = (...segments: string[]): string =>
  path.join(__dirname, 'fixtures', 'youtube', ...segments);

const loadJsonFixture = (file: string) =>
  JSON.parse(readFileSync(fixturesPath(file), 'utf-8'));

const loadTextFixture = (file: string) =>
  readFileSync(fixturesPath(file), 'utf-8');

type MockResponse = {
  ok: boolean;
  status: number;
  json?: () => Promise<any>;
  text: () => Promise<string>;
};

const jsonResponse = (body: any, status = 200): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body)
});

const textResponse = (body: string, status = 200): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body
});

const setApiKeyScript = (apiKey: string) => {
  document.head.innerHTML = '';
  const script = document.createElement('script');
  script.textContent = `var ytcfg = {"INNERTUBE_API_KEY":"${apiKey}"};`;
  document.head.appendChild(script);
};

const setDocumentUrl = (url: string) => {
  Object.defineProperty(document, 'URL', {
    value: url,
    configurable: true
  });
};

describe('YouTube transcript strategy', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  test('extracts Innertube API key from inline configuration', () => {
    setApiKeyScript('test-key');
    expect(extractInnertubeApiKey(document)).toBe('test-key');
  });

  test('parses transcript XML and preserves formatting tags', () => {
    const xml = loadTextFixture('sample-transcript.xml');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const segments = parseTranscriptXml(xml);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      start: 0,
      duration: 1.5,
      html: 'Hello & welcome'
    });
    expect(segments[1].html).toBe('<strong>Stay</strong> curious');
    expect(segments[2].html).toBe('<font color="#ffc800">Keep learning</font>');
    expect(logSpy).toHaveBeenCalledWith('[mole] YouTube transcript tags:', ['font', 'strong']);
    logSpy.mockRestore();
  });

  test('fetches manual transcripts when available', async () => {
    setDocumentUrl('https://www.youtube.com/watch?v=abc123');
    setApiKeyScript('manual-key');

    const playerResponse = loadJsonFixture('player-response-manual.json');
    const transcriptXml = loadTextFixture('sample-transcript.xml');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const fetchMock = jest.fn(async (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/youtubei/v1/player')) {
        return jsonResponse(playerResponse);
      }
      if (url.includes('/api/timedtext')) {
        return textResponse(transcriptXml);
      }
      throw new Error(`Unexpected request to ${url}`);
    });

    const result = await fetchYouTubeTranscript(document, fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.data.isGenerated).toBe(false);
      expect(result.data.segments).toHaveLength(3);
      expect(result.data.segments[0].html).toBe('Hello & welcome');
      const html = renderTranscriptHtml(result.data);
      expect(html).toContain('data-mole-source="youtube-transcript"');
      expect(html).toContain('data-is-generated="false"');
      expect(html).toContain('data-start="0.000"');
      expect(html).toContain('<strong>Stay</strong>');
      expect(html).toContain('Hello & welcome');
      expect(html).not.toContain('&amp;');
    }

    expect(logSpy).toHaveBeenCalledWith('[mole] YouTube transcript tags:', ['font', 'strong']);
    logSpy.mockRestore();
  });

  test('falls back to auto-generated transcripts when manual captions are missing', async () => {
    setDocumentUrl('https://www.youtube.com/watch?v=xyz789');
    setApiKeyScript('auto-key');

    const playerResponse = loadJsonFixture('player-response-auto.json');
    const transcriptXml = loadTextFixture('sample-transcript.xml');

    const fetchMock = jest.fn(async (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/youtubei/v1/player')) {
        return jsonResponse(playerResponse);
      }
      if (url.includes('/api/timedtext')) {
        return textResponse(transcriptXml);
      }
      throw new Error(`Unexpected request to ${url}`);
    });

    const result = await fetchYouTubeTranscript(document, fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.data.isGenerated).toBe(true);
      expect(result.data.segments[0].html).toBe('Hello & welcome');
    }
  });

  test('returns failure when captions are disabled', async () => {
    setDocumentUrl('https://www.youtube.com/watch?v=nope');
    setApiKeyScript('missing-captions');

    const playerResponse = { captions: {} };

    const fetchMock = jest.fn(async (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/youtubei/v1/player')) {
        return jsonResponse(playerResponse);
      }
      throw new Error(`Unexpected request to ${url}`);
    });

    const result = await fetchYouTubeTranscript(document, fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.reason).toBe('captions-disabled');
    }
  });
});
