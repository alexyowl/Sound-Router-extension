// popup.js
document.getElementById('left').addEventListener('click', () => applyChannel('left'));
document.getElementById('right').addEventListener('click', () => applyChannel('right'));
document.getElementById('none').addEventListener('click', () => applyChannel('none'));
document.getElementById('mono').addEventListener('click', () => applyChannel('mono'));

async function applyChannel(channel) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return;

  // Check if content script is already injected to avoid duplicates
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => !!window.hasRunSoundRouter
  });

  // If the result is false (undefined or false), inject the script
  if (!injectionResults[0] || !injectionResults[0].result) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }

  // Dispatch the event
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (ch) => {
      window.dispatchEvent(new CustomEvent('audio_splitter_apply', { detail: ch }));
    },
    args: [channel]
  });
}