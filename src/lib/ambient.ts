// Bộ trộn âm thanh nền tạo bằng Web Audio (không cần file ngoài).
// Mỗi kênh = nhiễu trắng qua bộ lọc -> nghe như mưa/sóng/lửa/gió.

export type AmbientChannel = 'rain' | 'waves' | 'fire' | 'wind'

interface Channel {
  gain: GainNode
}

class AmbientMixer {
  private ctx: AudioContext | null = null
  private noise: AudioBuffer | null = null
  private channels = new Map<AmbientChannel, Channel>()

  private ensure() {
    if (this.ctx) return
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    this.ctx = new Ctx()
    // Buffer nhiễu trắng 2 giây, phát lặp.
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noise = buf
  }

  private source(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    return src
  }

  private build(name: AmbientChannel): Channel {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)

    const src = this.source()

    if (name === 'rain') {
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1200
      src.connect(hp)
      hp.connect(gain)
    } else if (name === 'waves') {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 500
      // mod = gain điều biên (LFO tác động ở đây), gain master gate tắt riêng.
      const mod = ctx.createGain()
      mod.gain.value = 0.6
      src.connect(lp)
      lp.connect(mod)
      mod.connect(gain)
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.12
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.4
      lfo.connect(lfoGain)
      lfoGain.connect(mod.gain)
      lfo.start()
    } else if (name === 'fire') {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800
      const mod = ctx.createGain()
      mod.gain.value = 0.8
      src.connect(lp)
      lp.connect(mod)
      mod.connect(gain)
      // Lách tách: tremolo nhanh nhẹ trên mod (không phải gain master).
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 9
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.2
      lfo.connect(lfoGain)
      lfoGain.connect(mod.gain)
      lfo.start()
    } else {
      // wind: bandpass + LFO quét tần số.
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500
      bp.Q.value = 0.6
      src.connect(bp)
      bp.connect(gain)
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.08
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 300
      lfo.connect(lfoGain)
      lfoGain.connect(bp.frequency)
      lfo.start()
    }

    src.start()
    return { gain }
  }

  setVolume(name: AmbientChannel, v: number) {
    this.ensure()
    void this.ctx!.resume().catch(() => {})
    let ch = this.channels.get(name)
    if (!ch) {
      ch = this.build(name)
      this.channels.set(name, ch)
    }
    ch.gain.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.05)
  }

  /** AudioContext chưa chạy (chưa có tương tác của người dùng, hoặc bị chặn). */
  get suspended(): boolean {
    return !this.ctx || this.ctx.state === 'suspended'
  }

  /**
   * Áp lại toàn bộ âm lượng đã lưu.
   *
   * Bản trước chỉ gọi `setVolume` từ sự kiện kéo slider, nên sau khi tải lại
   * trang các slider hiện đúng vị trí đã lưu mà không có tiếng nào — UI và âm
   * thanh nói hai chuyện khác nhau.
   */
  applyAll(volumes: Partial<Record<AmbientChannel, number>>) {
    for (const [name, v] of Object.entries(volumes)) {
      if (typeof v === 'number' && v > 0)
        this.setVolume(name as AmbientChannel, v)
    }
  }
}

export const ambient = new AmbientMixer()
