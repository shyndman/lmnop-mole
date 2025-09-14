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
});