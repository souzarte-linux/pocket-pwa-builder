---
name: Kinetic Velocity
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e4bfb1'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ab8a7d'
  outline-variant: '#5b4137'
  surface-tint: '#ffb599'
  primary: '#ffb599'
  on-primary: '#5a1c00'
  primary-container: '#ff5f00'
  on-primary-container: '#531a00'
  inverse-primary: '#a63b00'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#00daf3'
  on-tertiary: '#00363d'
  tertiary-container: '#00a3b6'
  on-tertiary-container: '#003239'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#9cf0ff'
  tertiary-fixed-dim: '#00daf3'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is engineered for the high-stakes world of logistics, blending the raw energy of rapid movement with the approachable softness of modern consumer tech. The brand personality is **urgent yet composed**, prioritizing speed of information processing through high-contrast accents and generous whitespace.

The visual style follows a **Modern Glassmorphic** approach, utilizing the dark mode backdrop to create depth through translucency rather than heavy shadows. By combining aggressive "Deep Orange" accents with extreme corner radii, the UI evokes the feeling of high-end automotive interfaces—built for performance, but refined for the human hand. The emotional response should be one of total control and effortless efficiency.

## Colors

The palette is anchored by a monochromatic dark base to ensure the **Deep Orange (#FF5F00)** primary color functions as a high-visibility beacon for call-to-actions and status indicators. 

- **Primary:** Deep Orange is used exclusively for interactive elements, progress bars, and critical alerts.
- **Secondary:** A dark charcoal used for secondary containers and surface differentiation.
- **Tertiary:** A high-energy Cyan is used sparingly for "In-Transit" or "Success" states to provide a cooling contrast to the orange.
- **Surface Strategy:** Layers are built using incremental hex steps rather than shadows, maintaining a clean, digital-first aesthetic.

## Typography

**Lexend** is utilized across all levels of the hierarchy. Designed specifically to reduce visual noise and improve reading speed, it is the ideal typeface for data-heavy logistics dashboards. 

Headlines utilize tighter tracking and heavier weights to convey a sense of structural integrity. Body text maintains generous line heights to prevent "data fatigue" during long periods of monitoring. Labels are often set in uppercase with increased letter spacing to provide clear categorization for small-scale metadata like tracking numbers and timestamps.

## Layout & Spacing

The design system employs a **12-column fluid grid** for dashboard views, transitioning to a single-column stack for mobile tracking interfaces. The rhythm is based on a **4px base unit**.

- **Internal Padding:** Components use a minimum of 16px (md) internal padding to balance the aggressive roundness of the containers.
- **Negative Space:** High-velocity data is grouped in clusters with 24px (lg) gaps to ensure that even during rapid updates, the eye can track individual shipments without confusion.

## Elevation & Depth

Depth is established through **Tonal Layering** and **Glassmorphism**. Because the design emphasizes extreme roundness, shadows are used very sparingly to avoid "muddiness."

1.  **Floor (Level 0):** Pure black (#000000) for the main background.
2.  **Surface (Level 1):** Dark charcoal (#121212) for primary card containers.
3.  **Overlay (Level 2):** Translucent glass (Background blur 20px, 10% white opacity) for floating navigation and modal dialogs.
4.  **Interaction:** Elements on hover do not lift; instead, they gain a 1px inner border in Deep Orange or a slight increase in surface brightness.

## Shapes

The defining characteristic of this design system is **Extreme Softness**. All interactive and containment elements must utilize maximum roundedness to soften the "industrial" nature of logistics data.

- **Base Radius:** 24px for standard buttons, input fields, and small cards.
- **Container Radius:** Large dashboard panels and hero sections use 32px to 40px.
- **Pill Factor:** Any element with a height under 48px (like tags or badges) must be fully pill-shaped (50% of height).

## Components

### Buttons
Primary buttons are solid Deep Orange (#FF5F00) with white text, using a **ROUND_FULL** pill shape. Secondary buttons use a ghost style with a 2px Deep Orange border and pill shape.

### Input Fields
Inputs are dark-themed with a subtle 1px border (#333333). They feature a **24px radius**. On focus, the border glows with a soft Deep Orange outer halo.

### Cards
Cards are the primary data containers. They must have a **24px or 32px radius**. Use a subtle background blur if placed over dynamic maps or data streams. No heavy shadows; use a 1px stroke (#222222) for separation.

### Chips & Tags
Used for shipment status (e.g., "Delayed", "In Transit"). These are always fully pill-shaped. Backgrounds should be low-opacity versions of the status color (e.g., 15% Orange for "Pending").

### Real-Time Trackers
A custom component featuring a continuous horizontal line with 12px circular nodes. The active node and the path traveled are highlighted in Deep Orange to visualize movement and velocity.