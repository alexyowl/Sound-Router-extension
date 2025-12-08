(function () {
  // Cross-browser API definition (Firefox uses 'browser', Chromium uses 'chrome')
  const api = typeof browser !== 'undefined' ? browser : chrome;

  // Guard: Prevent script from running multiple times if injected repeatedly
  if (window.hasRunSoundRouter) return;
  window.hasRunSoundRouter = true;

  window.addEventListener('audio_splitter_apply', async (e) => {
    const channel = e.detail;
    const mediaElements = document.querySelectorAll('video, audio');

    for (const media of mediaElements) {
      // 1. Initialize Audio Context (once per media element)
      if (!media._splitter) {
        try {
          // Necessary for handling cross-domain media
          if (!media.crossOrigin) {
            media.crossOrigin = "anonymous";
          }
          const context = new AudioContext();
          const source = context.createMediaElementSource(media);
          media._splitter = { context, source };
        } catch (err) {
          continue; // Skip if audio context cannot be created
        }
      }

      const { context, source } = media._splitter;

      // 2. Cleanup: Disconnect previous nodes to avoid stacking/echo
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
      } catch (err) { /* Ignore disconnect errors */ }

      // 3. Routing Logic
      if (channel === 'mono') {
        try {
          // FIX: Use a Promise to lock the loading state for the AudioWorklet module
          if (!context.monoLoadingPromise) {
            // FIX: Load AudioWorklet from the static file path (prevents DOMException)
            const workletUrl = api.runtime.getURL('mono-processor.js');
            context.monoLoadingPromise = context.audioWorklet.addModule(workletUrl);
          }
          // Wait for module loading to complete (handles race condition)
          await context.monoLoadingPromise;

          // Create the node and connect
          const node = new AudioWorkletNode(context, 'mono-processor');
          source.connect(node).connect(context.destination);
          media._splitter.processor = node;

        } catch (err) {
          console.error('Sound Router: Mono processor failed:', err);
          source.connect(context.destination); // Fallback to reset
        }

      } else if (channel === 'left' || channel === 'right') {
        const panner = context.createStereoPanner();
        panner.pan.value = channel === 'left' ? -1 : 1;
        source.connect(panner).connect(context.destination);
        media._splitter.panner = panner;

      } else {
        // 'none' / Reset
        source.connect(context.destination);
      }

      // 4. Ensure context is running (browser sometimes suspends it)
      if (context.state === 'suspended') {
        context.resume();
      }
    }
  });
})();