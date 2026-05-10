---
name: High-Velocity Logistics
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
  secondary: '#ffb4a8'
  on-secondary: '#690000'
  secondary-container: '#d30000'
  on-secondary-container: '#ffe2dd'
  tertiary: '#ffba20'
  on-tertiary: '#412d00'
  tertiary-container: '#c08a00'
  on-tertiary-container: '#3c2900'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410000'
  on-secondary-fixed-variant: '#930000'
  tertiary-fixed: '#ffdea8'
  tertiary-fixed-dim: '#ffba20'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4200'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Lexend
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Lexend
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-xl:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  label-md:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-main: 20px
  gutter-card: 16px
  touch-target-min: 56px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The brand personality is high-energy, dependable, and precision-oriented, specifically tailored for the fast-paced environment of motorcycle couriers. It aims to evoke a sense of urgency without sacrificing professional reliability.

The design style utilizes a **High-Contrast / Bold** aesthetic with a subtle touch of **Brutalism**. This means thick strokes, vibrant accent colors, and massive, legible typography designed for readability at arm's length while mounted on a motorcycle. The UI avoids delicate flourishes in favor of rugged, high-impact elements that look intentional and sturdy.

## Colors
The palette is dominated by a vibrant "Accelerator Orange" and "Redline Deep Red" to command attention and signal action. The system defaults to **Dark Mode** to reduce eye strain during night shifts and to save battery on OLED mobile devices. 

- **Primary (Orange):** Used for primary calls to action, active route indicators, and arrival buttons.
- **Secondary (Deep Red):** Reserved for urgent alerts, "Go Offline" functions, and critical warnings.
- **Surface Strategy:** We use a tiered dark grey system rather than pure black to maintain depth. Level 1 is `#121212`, while cards and interactive surfaces sit at `#1E1E1E` or `#2C2C2C` to differentiate from the background.

## Typography
This design system uses **Lexend** for all levels due to its hyper-readability and athletic, wide-set character. The typography is scaled larger than standard apps to ensure that a courier can read their next destination or earnings while the phone is mounted on a vibrating handlebar.

- **Headlines:** Use Bold or ExtraBold weights to create a strong visual hierarchy.
- **Labels:** Uppercase styling is used for status indicators (e.g., "DELIVERED", "PICKUP") to ensure they are unmistakable.
- **Financial Data:** Use `headline-xl` for daily earnings to provide immediate psychological reward.

## Layout & Spacing
The layout follows a **fluid grid** model with generous safe-area margins to prevent accidental taps near the edge of the screen.

- **Margins:** 20px side margins provide a robust frame for content.
- **Rhythm:** An 8px-based grid (implemented as 4px increments) governs all vertical spacing.
- **Touch Targets:** A strict minimum of 56px height for all interactive elements to accommodate gloved hands or rapid movement. 
- **Card-Based Architecture:** All financial and delivery data must be encapsulated in cards to create clear hit zones and visual separation.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Bold Outlines** rather than soft shadows. In a dark environment, high-contrast borders are more effective for defining boundaries than subtle shadows.

- **Active State:** Elements currently in focus or "Active" (like a current delivery card) should use a 2px solid primary orange border.
- **Resting State:** Surface containers use a subtle contrast increase (e.g., `#2C2C2C` on a `#1E1E1E` background).
- **Overlays:** Modals and bottom sheets use a heavy backdrop dim (80% opacity) to force focus on the task at hand.

## Shapes
The shape language is **Rounded**, utilizing a 0.5rem base radius. This strikes a balance between the "aggressive" speed of the brand and the modern professional nature of the service.

- **Buttons:** Use `rounded-lg` (1rem) to create distinct, pill-like shapes that look "clickable."
- **Financial Cards:** Use `rounded-xl` (1.5rem) to soften the information-heavy sections of the app, making the data feel more approachable.
- **Icon Containers:** Small utility icons (fuel, maintenance) use a simple circle background.

## Components
- **Action Buttons:** Large-scale buttons (min-height 64px) with centered bold labels. The primary action button should always use a solid orange fill with black text for maximum contrast.
- **Delivery Cards:** Summary cards showing "Type" (Food/Package/Document), "Distance," and "Payout." Use heavy icons (duotone or thick-stroke) for delivery types.
- **Expense Chips:** Small, high-contrast chips used to categorize spending.
    - *Fuel:* Yellow icon.
    - *Maintenance:* Blue icon.
    - *Food:* Green icon.
- **Progress Trackers:** A thick, 8px-height progress bar for daily goals, using the primary orange color to "fill up" the day's earnings.
- **Input Fields:** Thick-bordered fields with high-visibility cursor and clear "X" clear-all actions for quick address entry.
- **Status Badges:** High-contrast tags with solid backgrounds (e.g., a "NEW TASK" badge in primary red).