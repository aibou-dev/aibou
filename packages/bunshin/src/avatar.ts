// Bunshin avatar renderer — PNGTuber-style companion avatar

import type { CompanionResponse } from "@aibou-dev/core"

export type Emotion = NonNullable<CompanionResponse["emotion"]>

export interface AvatarConfig {
  /** Name displayed under the avatar */
  name?: string
  /** Size in pixels (width = height) */
  size?: number
  /** Accent color for the glow/border */
  accentColor?: string
  /** Whether to animate idle breathing */
  animate?: boolean
  /** Base URL path for PNG assets (e.g. "/assets/nagi") */
  assetBasePath?: string
}

const DEFAULT_CONFIG: Required<AvatarConfig> = {
  name: "Nagi",
  size: 120,
  accentColor: "#7c5cbf",
  animate: true,
  assetBasePath: "/assets/nagi",
}

// Map emotions to asset file names (without extension)
const EMOTION_ASSETS: Record<Emotion, string> = {
  neutral: "neutral",
  curious: "neutral", // fallback
  excited: "excited",
  worried: "worried",
  happy: "happy",
  thinking: "thinking",
}

export class BunshinAvatar {
  private container: HTMLElement
  private imgEl: HTMLImageElement | null = null
  private config: Required<AvatarConfig>
  private currentEmotion: Emotion = "neutral"
  private talking = false
  private talkTimer: ReturnType<typeof setTimeout> | null = null
  private styleEl: HTMLStyleElement | null = null

  constructor(container: HTMLElement, config: AvatarConfig = {}) {
    this.container = container
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.mount()
  }

  private mount(): void {
    this.injectStyles()
    this.container.innerHTML = ""
    this.container.classList.add("bunshin-avatar")

    const wrapper = document.createElement("div")
    wrapper.className = "bunshin-wrapper"
    wrapper.style.width = `${this.config.size}px`

    // PNG image
    const img = document.createElement("img")
    img.classList.add("bunshin-face")
    if (this.config.animate) img.classList.add("bunshin-breathe")
    img.width = this.config.size
    img.height = this.config.size
    img.alt = this.config.name
    img.draggable = false
    this.imgEl = img

    this.updateImage()
    wrapper.appendChild(img)

    // Name label
    if (this.config.name) {
      const label = document.createElement("div")
      label.className = "bunshin-name"
      label.textContent = this.config.name
      label.style.color = this.config.accentColor
      wrapper.appendChild(label)
    }

    this.container.appendChild(wrapper)
  }

  private getImageUrl(emotion: Emotion, talking: boolean): string {
    const base = EMOTION_ASSETS[emotion]
    const suffix = talking ? "_talking" : ""
    return `${this.config.assetBasePath}/${base}${suffix}.png`
  }

  private updateImage(): void {
    if (!this.imgEl) return
    const url = this.getImageUrl(this.currentEmotion, this.talking)
    if (this.imgEl.src !== url) {
      this.imgEl.src = url
    }
  }

  /** Update the avatar's displayed emotion */
  setEmotion(emotion: Emotion): void {
    if (emotion === this.currentEmotion) return
    this.currentEmotion = emotion

    if (this.imgEl) {
      this.imgEl.classList.add("bunshin-transition")
      this.updateImage()
      setTimeout(() => {
        this.imgEl?.classList.remove("bunshin-transition")
      }, 300)
    }
  }

  /** Start talking animation — cycles between static and talking variant */
  startTalking(durationMs = 2000): void {
    if (this.talkTimer) clearTimeout(this.talkTimer)

    this.talking = true
    this.updateImage()

    // Cycle between talking/static for natural mouth movement
    const cycle = () => {
      this.talking = !this.talking
      this.updateImage()
    }
    const interval = setInterval(cycle, 200)

    this.talkTimer = setTimeout(() => {
      clearInterval(interval)
      this.talking = false
      this.updateImage()
      this.talkTimer = null
    }, durationMs)
  }

  /** Stop talking animation immediately */
  stopTalking(): void {
    if (this.talkTimer) {
      clearTimeout(this.talkTimer)
      this.talkTimer = null
    }
    this.talking = false
    this.updateImage()
  }

  /** Get current emotion */
  getEmotion(): Emotion {
    return this.currentEmotion
  }

  /** Remove the avatar from the DOM */
  destroy(): void {
    this.stopTalking()
    this.container.innerHTML = ""
    this.container.classList.remove("bunshin-avatar")
    this.styleEl?.remove()
    this.imgEl = null
    this.styleEl = null
  }

  private injectStyles(): void {
    if (document.querySelector("[data-bunshin-styles]")) return

    const style = document.createElement("style")
    style.setAttribute("data-bunshin-styles", "")
    style.textContent = `
      .bunshin-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .bunshin-face {
        border-radius: 8px;
        filter: drop-shadow(0 0 12px rgba(124, 92, 191, 0.3));
        transition: filter 0.3s ease;
        object-fit: contain;
        image-rendering: auto;
      }

      .bunshin-face:hover {
        filter: drop-shadow(0 0 18px rgba(124, 92, 191, 0.5));
      }

      .bunshin-breathe {
        animation: bunshin-breathe 3s ease-in-out infinite;
      }

      .bunshin-transition {
        animation: bunshin-pop 0.3s ease;
      }

      .bunshin-name {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 2px;
        text-transform: lowercase;
      }

      @keyframes bunshin-breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }

      @keyframes bunshin-pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.06); }
        100% { transform: scale(1); }
      }
    `
    document.head.appendChild(style)
    this.styleEl = style
  }
}
