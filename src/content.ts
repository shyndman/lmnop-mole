import Defuddle from 'defuddle';
import TurndownService from 'turndown';
import { getDomain } from './utils/string-utils';
import { handleBackgroundLog } from './utils/debug';
import {
  fetchYouTubeTranscript,
  isYouTubeWatchUrl,
  renderTranscriptHtml
} from './strategies/youtube-transcript';

(function(): void {
  if ((window as any).moleContentScriptLoaded) {
    return;
  }
  (window as any).moleContentScriptLoaded = true;

  console.log('[mole] Content script loaded and running');

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    linkStyle: 'inlined',
    bulletListMarker: '*'
  });

  const buildResponse = (defuddled: any, content: string, markdown: string) => ({
    author: defuddled.author,
    content,
    markdown,
    description: defuddled.description,
    domain: getDomain(document.URL),
    favicon: defuddled.favicon,
    image: defuddled.image,
    published: defuddled.published,
    site: defuddled.site,
    title: defuddled.title
  });

  const extractPageContent = async () => {
    const defuddled = new Defuddle(document, { url: document.URL }).parse();

    if (isYouTubeWatchUrl(document.URL)) {
      const result = await fetchYouTubeTranscript(document);
      if (result.kind === 'failure') {
        throw new Error(result.message);
      }

      const transcriptHtml = renderTranscriptHtml(result.data);
      const markdown = transcriptHtml ? turndownService.turndown(transcriptHtml) : '';
      const response = {
        ...buildResponse(defuddled, transcriptHtml, markdown),
        transcript: result.data
      };

      console.log(
        '[mole] Content extracted for page:',
        `${response.title} (YouTube transcript ${result.data.isGenerated ? 'auto' : 'manual'}, language=${result.data.languageCode})`
      );

      return response;
    }

    const contentHtml = defuddled.content || '';
    const markdown = contentHtml ? turndownService.turndown(contentHtml) : '';
    const response = buildResponse(defuddled, contentHtml, markdown);

    console.log('[mole] Content extracted for page:', response.title);

    return response;
  };

  chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
    if (request.action === 'getPageContent') {
      extractPageContent()
        .then((payload) => {
          sendResponse(payload);
        })
        .catch((error: unknown) => {
          console.error('[mole] Content extraction failed:', error);
          sendResponse({
            error: {
              message: error instanceof Error ? error.message : 'Unknown content extraction failure'
            }
          });
        });
    } else if (request.action === 'forwardBackgroundLog') {
      console.log('[mole] Received background log message:', request.logMessage);
      handleBackgroundLog(request.logMessage);
    }
    return true;
  });
})();
