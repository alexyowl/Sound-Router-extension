// This file runs in a separate AudioWorklet thread.

class MonoProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;

    // Get input channels
    const inputL = input[0];
    // If mono source, inputR will be inputL
    const inputR = input.length > 1 ? input[1] : inputL;

    const outputL = output[0];
    const outputR = output[1];

    for (let i = 0; i < inputL.length; i++) {
      // Standard Mono Mix: (L + R) / 2
      const mono = (inputL[i] + inputR[i]) * 0.5;
      if (outputL) outputL[i] = mono;
      if (outputR) outputR[i] = mono;
    }
    return true;
  }
}

// The name 'mono-processor' must match the name used in content.js
registerProcessor('mono-processor', MonoProcessor);