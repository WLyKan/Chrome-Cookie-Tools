import type { LocalStorageData } from '@/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  // world: 'MAIN',
  main() {
    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('message :>>', message)
      if (message.type === 'READ_LOCALSTORAGE') {
        const keys: string[] = message.payload.keys;
        const data: LocalStorageData[] = [];

        keys.forEach((key) => {
          const value = localStorage.getItem(key);
          if (value !== null) {
            data.push({ key, value });
          }
        });

        sendResponse({ success: true, data });
      } else if (message.type === 'WRITE_LOCALSTORAGE') {
        const items: LocalStorageData[] = message.payload.data;
        let successCount = 0;

        try {
          items.forEach((item) => {
            localStorage.setItem(item.key, item.value);
            successCount++;
          });

          sendResponse({ success: true, count: successCount });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to write localStorage',
          });
        }
      }

      return true; // Keep message channel open for async response
    });
  },
});
