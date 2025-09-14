import { test, expect } from './extension-fixtures';

test.describe('Content Extraction', () => {
  test('should load extension and show visual indicator', async ({ context }) => {
    // Navigate to a real HTTP URL to trigger the extension
    const page = await context.newPage();
    
    // Check console logs for extension loading
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });
    
    // Navigate to example.com to trigger extension loading
    await page.goto('https://example.com');
    
    // Wait for the content script to load and execute
    await page.waitForTimeout(3000);

    // Check if extension console log appeared
    const hasExtensionLog = logs.some(log => 
      log.includes('[mole] Content script loaded')
    );

    // Verify extension is working
    expect(hasExtensionLog).toBeTruthy();
  });

  test('should extract content and metadata from real webpage', async ({ context }) => {
    const page = await context.newPage();
    
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Navigate to a simple webpage to test content extraction
    await page.goto('https://httpbin.org/html');
    await page.waitForTimeout(3000);

    // Check if extension loaded
    const hasExtensionLog = logs.some(log => 
      log.includes('[mole] Content script loaded')
    );

    // Check if content extraction occurred (now logged in content script)
    const hasDataLog = logs.some(log => 
      log.includes('[mole] Content extracted for page:') ||
      log.includes('Herman Melville') ||
      log.includes('title')
    );
    
    expect(hasExtensionLog).toBeTruthy();
    expect(hasDataLog).toBeTruthy();
  });

  test('should handle minimal content pages', async ({ context }) => {
    const page = await context.newPage();
    
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Navigate to a minimal page
    await page.goto('https://httpbin.org/status/200');
    await page.waitForTimeout(3000);

    // Should still load extension and log data
    const hasExtensionLog = logs.some(log => 
      log.includes('[mole] Content script loaded')
    );
    
    expect(hasExtensionLog).toBeTruthy();
  });

  test('should extract content and convert to markdown', async ({ context }) => {
    const page = await context.newPage();
    
    const logs: any[] = [];
    page.on('console', (msg) => {
      logs.push(msg);
    });

    // Navigate to a page with structured content
    await page.goto('https://httpbin.org/html');
    await page.waitForTimeout(3000);

    // Find the background log entry forwarded to content script
    const backgroundLog = logs.find(log => 
      log.type() === 'log' && log.text().includes('[background:log] [mole] Extracted page data:')
    );

    expect(backgroundLog).toBeTruthy();

    // Get the page data from the background log
    if (backgroundLog) {
      const pageData = await backgroundLog.args()[1]?.jsonValue();
      
      // Verify that the page data has both content and markdown fields
      expect(pageData).toBeDefined();
      expect(pageData.content).toBeDefined();
      expect(pageData.markdown).toBeDefined();
      expect(pageData.title).toBeDefined();
      
      // Verify markdown content is different from HTML content (converted)
      expect(pageData.markdown).not.toBe(pageData.content);
      
      // Verify both HTML content and markdown are present
      expect(pageData.content.length).toBeGreaterThan(0);
      expect(pageData.markdown.length).toBeGreaterThan(0);
      
      // Markdown should not contain HTML tags
      expect(pageData.markdown).not.toMatch(/<h1>/);
      expect(pageData.markdown).not.toMatch(/<\/h1>/);
      expect(pageData.markdown).not.toMatch(/<p>/);
      expect(pageData.markdown).not.toMatch(/<\/p>/);
      
      // If content has headers, markdown should have markdown-style headers
      if (pageData.content.includes('<h2>')) {
        expect(pageData.markdown).toMatch(/##\s/); // Should have H2 markdown format
      }
      
      console.log('✓ Markdown conversion test passed');
      console.log('Content length:', pageData.content.length);
      console.log('Markdown length:', pageData.markdown.length);
    }
  });
});