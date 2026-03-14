// Bunshin avatar renderer — SVG-based PNGTuber-style companion avatar

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
}

const DEFAULT_CONFIG: Required<AvatarConfig> = {
  name: "Nagi",
  size: 120,
  accentColor: "#7c5cbf",
  animate: true,
}

// Face expressions as SVG path data
const EXPRESSIONS: Record<Emotion, { eyes: string; mouth: string; brows?: string }> = {
  neutral: {
    eyes: `<circle cx="38" cy="42" r="3.5" fill="currentColor"/>
           <circle cx="62" cy="42" r="3.5" fill="currentColor"/>`,
    mouth: `<path d="M43 58 Q50 62 57 58" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  },
  curious: {
    eyes: `<circle cx="38" cy="42" r="4" fill="currentColor"/>
           <circle cx="62" cy="40" r="4.5" fill="currentColor"/>`,
    mouth: `<ellipse cx="50" cy="60" rx="3" ry="2.5" fill="currentColor" opacity="0.7"/>`,
    brows: `<path d="M56 34 Q62 30 68 33" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  excited: {
    eyes: `<path d="M34 42 Q38 38 42 42" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"/>
           <path d="M58 42 Q62 38 66 42" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"/>`,
    mouth: `<path d="M40 56 Q50 66 60 56" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  },
  worried: {
    eyes: `<circle cx="38" cy="43" r="3.5" fill="currentColor"/>
           <circle cx="62" cy="43" r="3.5" fill="currentColor"/>`,
    mouth: `<path d="M43 62 Q50 57 57 62" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>`,
    brows: `<path d="M32 36 Q38 33 44 36" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M56 36 Q62 33 68 36" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  happy: {
    eyes: `<path d="M34 42 Q38 38 42 42" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"/>
           <path d="M58 42 Q62 38 66 42" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"/>`,
    mouth: `<path d="M42 56 Q50 64 58 56" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  },
  thinking: {
    eyes: `<circle cx="38" cy="42" r="3" fill="currentColor"/>
           <path d="M58 42 L66 42" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"/>`,
    mouth: `<path d="M46 60 Q52 58 54 60" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  },
}

export class BunshinAvatar {
  private container: HTMLElement
  private svgEl: SVGSVGElement | null = null
  private config: Required<AvatarConfig>
  private currentEmotion: Emotion = "neutral"
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

    // SVG face
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", "0 0 100 100")
    svg.setAttribute("width", String(this.config.size))
    svg.setAttribute("height", String(this.config.size))
    svg.classList.add("bunshin-face")
    if (this.config.animate) svg.classList.add("bunshin-breathe")
    this.svgEl = svg

    this.renderFace("neutral")
    wrapper.appendChild(svg)

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

  private renderFace(emotion: Emotion): void {
    if (!this.svgEl) return
    const expr = EXPRESSIONS[emotion]
    const accent = this.config.accentColor

    this.svgEl.innerHTML = `
      <!-- Head -->
      <circle cx="50" cy="50" r="38" fill="#1a1a2e" stroke="${accent}" stroke-width="2"/>
      <!-- Hair accent -->
      <path d="M18 35 Q30 12 50 14 Q70 12 82 35" fill="#2a2a3e" stroke="none"/>
      <!-- Face -->
      <g color="#e0e0e0">
        ${expr.brows ?? ""}
        ${expr.eyes}
        ${expr.mouth}
      </g>
      <!-- Blush (subtle) -->
      <circle cx="30" cy="52" r="5" fill="#ff6b8a" opacity="0.08"/>
      <circle cx="70" cy="52" r="5" fill="#ff6b8a" opacity="0.08"/>
    `
  }

  /** Update the avatar's displayed emotion */
  setEmotion(emotion: Emotion): void {
    if (emotion === this.currentEmotion) return
    this.currentEmotion = emotion

    // Add transition animation
    if (this.svgEl) {
      this.svgEl.classList.add("bunshin-transition")
      this.renderFace(emotion)
      setTimeout(() => {
        this.svgEl?.classList.remove("bunshin-transition")
      }, 300)
    }
  }

  /** Get current emotion */
  getEmotion(): Emotion {
    return this.currentEmotion
  }

  /** Remove the avatar from the DOM */
  destroy(): void {
    this.container.innerHTML = ""
    this.container.classList.remove("bunshin-avatar")
    this.styleEl?.remove()
    this.svgEl = null
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
        border-radius: 50%;
        filter: drop-shadow(0 0 12px rgba(124, 92, 191, 0.3));
        transition: filter 0.3s ease;
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
