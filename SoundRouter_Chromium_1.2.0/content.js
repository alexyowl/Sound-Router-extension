// content.js
(function () {
  // Guard: Prevent script from running multiple times
  if (window.hasRunSoundRouter) return;
  window.hasRunSoundRouter = true;

  window.addEventListener('audio_splitter_apply', async (e) => {
    const channel = e.detail;
    const mediaElements = document.querySelectorAll('video, audio');

    for (const media of mediaElements) {
      // 1. Initialize Audio Context (once per media)
      if (!media._splitter) {
        try {
          if (!media.crossOrigin) {
            media.crossOrigin = "anonymous";
          }
          const context = new AudioContext();
          const source = context.createMediaElementSource(media);
          media._splitter = { context, source };
        } catch (err) {
          continue;
        }
      }

      const { context, source } = media._splitter;

      // 2. Cleanup: Disconnect previous nodes
      try {
        source.disconnect();
        if (media._splitter.processor) {
          media._splitter.processor.disconnect();
          media._splitter.processor = null;
        }
        if (media._splitter.panner) {
          media._splitter.panner.disconnect();
          media._splitter.panner = null;
        }
      } catch (err) { /* Ignore */ }

      // 3. Routing Logic
      if (channel === 'mono') {
        try {
          // === FIX: Load AudioWorklet from a static file path ===
          // This avoids the Blob URL and the DOMException error.
          if (!context.monoLoadingPromise) {
            // Use the absolute path to the new file
            const workletUrl = chrome.runtime.getURL('mono-processor.js');
            context.monoLoadingPromise = context.audioWorklet.addModule(workletUrl);
          }
          await context.monoLoadingPromise;

          // Create the node and connect
          const node = new AudioWorkletNode(context, 'mono-processor');
          source.connect(node).connect(context.destination);
          media._splitter.processor = node;

        } catch (err) {
          console.error('Sound Router: Mono processor failed:', err);
          source.connect(context.destination);
        }

      } else if (channel === 'left' || channel === 'right') {
        const panner = context.createStereoPanner();
        panner.pan.value = channel === 'left' ? -1 : 1;
        source.connect(panner).connect(context.destination);
        media._splitter.panner = panner;

      } else {
        // Reset / None
        source.connect(context.destination);
      }

      // 4. Ensure context is running
      if (context.state === 'suspended') {
        context.resume();
      }
    }
  });
})();