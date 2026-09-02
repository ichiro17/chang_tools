// 課堂模式用的音訊引擎：背景音樂（合成環境 pad）、白噪音、提示音，全部即時合成，無外部音檔。

export type NoiseType = "white" | "pink" | "brown";

function makeNoiseBuffer(ctx: AudioContext, type: NoiseType) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

export function createAudioEngine(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  // ---- 背景音樂：暖色和弦 pad + 緩慢濾波器擺動 ----
  const padGain = ctx.createGain();
  padGain.gain.value = 0;
  padGain.connect(master);
  let pad: { osc: OscillatorNode[]; lfo: OscillatorNode } | null = null;

  function startPad(vol: number) {
    if (!pad) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 650;
      filter.Q.value = 5;
      filter.connect(padGain);

      const mix = ctx.createGain();
      mix.gain.value = 0.5;
      mix.connect(filter);

      const freqs = [130.81, 164.81, 196.0, 246.94]; // Cmaj7 (C3 E3 G3 B3)
      const osc = freqs.map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = Math.random() * 8 - 4;
        o.connect(mix);
        o.start();
        return o;
      });

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      pad = { osc, lfo };
    }
    padGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.8);
  }

  function stopPad() {
    padGain.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    const p = pad;
    pad = null;
    if (p) {
      window.setTimeout(() => {
        p.osc.forEach((o) => {
          try {
            o.stop();
          } catch {}
        });
        try {
          p.lfo.stop();
        } catch {}
      }, 1600);
    }
  }

  function setPadVol(vol: number) {
    padGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.3);
  }

  // ---- 白噪音 ----
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 11000;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  let noiseSrc: AudioBufferSourceNode | null = null;

  function killNoiseNode() {
    if (noiseSrc) {
      try {
        noiseSrc.stop();
      } catch {}
      noiseSrc.disconnect();
      noiseSrc = null;
    }
  }

  function startNoise(type: NoiseType, vol: number) {
    killNoiseNode();
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, type);
    src.loop = true;
    src.connect(noiseFilter);
    src.start();
    noiseSrc = src;
    noiseGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.3);
  }

  function stopNoise() {
    noiseGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    window.setTimeout(killNoiseNode, 500);
  }

  function setNoiseVol(vol: number) {
    noiseGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.2);
  }

  // ---- 提示音 ----
  function tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    when = 0,
  ) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(master);
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
  }

  return {
    resume() {
      if (ctx.state === "suspended") void ctx.resume();
    },
    startPad,
    stopPad,
    setPadVol,
    startNoise,
    stopNoise,
    setNoiseVol,
    // 上課提示音：柔和三音上行
    chime() {
      tone(523.25, 0.5, "sine", 0.2, 0);
      tone(659.25, 0.5, "sine", 0.18, 0.14);
      tone(783.99, 0.7, "sine", 0.18, 0.28);
    },
    // 注意力提示：明亮的雙「叮咚」
    attention() {
      tone(880, 0.22, "triangle", 0.24, 0);
      tone(1174.66, 0.32, "triangle", 0.24, 0.12);
      tone(880, 0.22, "triangle", 0.22, 0.36);
      tone(1174.66, 0.42, "triangle", 0.22, 0.48);
    },
    // 時間到
    alarm() {
      [0, 0.32, 0.64, 0.96, 1.36].forEach((w, i) =>
        tone(i === 4 ? 1046.5 : 784, 0.28, "square", 0.2, w),
      );
    },
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;
