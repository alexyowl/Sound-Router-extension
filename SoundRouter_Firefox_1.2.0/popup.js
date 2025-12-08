const api = typeof browser !== 'undefined' ? browser : chrome;

document.getElementById('left').addEventListener('click', () => applyChannel('left'));
document.getElementById('right').addEventListener('click', () => applyChannel('right'));
document.getElementById('none').addEventListener('click', () => applyChannel('none'));
document.getElementById('mono').addEventListener('click', () => applyChannel('mono'));

async function applyChannel(channel) {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return;

  // 1. Check if content script is already injected (using the window flag)
  const injectionResults = await api.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => !!window.hasRunSoundRouter
  });

  // 2. If the result is false (undefined or false), inject the script
  if (!injectionResults[0] || !injectionResults[0].result) {
    await api.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }

  // 3. Dispatch the event
  api.scripting.executeScript({
    target: { tabId: tab.id },
    func: (ch) => {
      // This is the CustomEvent that content.js listens for
      window.dispatchEvent(new CustomEvent('audio_splitter_apply', { detail: ch }));
    },
    args: [channel]
  });
}