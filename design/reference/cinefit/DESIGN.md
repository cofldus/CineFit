---
name: CineFit
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dadf'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f9'
  surface-container: '#eaeef3'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c20'
  on-surface-variant: '#45474b'
  inverse-surface: '#2c3135'
  inverse-on-surface: '#edf1f6'
  outline: '#76777b'
  outline-variant: '#c6c6cb'
  surface-tint: '#5d5e63'
  primary: '#000102'
  on-primary: '#ffffff'
  primary-container: '#1a1c20'
  on-primary-container: '#838489'
  inverse-primary: '#c6c6cb'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#010000'
  on-tertiary: '#ffffff'
  tertiary-container: '#221a17'
  on-tertiary-container: '#8e817d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e7'
  primary-fixed-dim: '#c6c6cb'
  on-primary-fixed: '#1a1c20'
  on-primary-fixed-variant: '#45474b'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#efdfda'
  tertiary-fixed-dim: '#d2c3be'
  on-tertiary-fixed: '#221a17'
  on-tertiary-fixed-variant: '#4f4541'
  background: '#f6fafe'
  on-background: '#171c20'
  surface-variant: '#dfe3e7'
typography:
  headline-xl:
    fontFamily: Bricolage Grotesque
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 72px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-technical:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-data:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
spacing:
  unit: 4px
  gutter: 24px
  margin-safe: 40px
  section-gap: 80px
  aspect-ratio-wide: 2.39/1
  aspect-ratio-standard: 1.85/1
---

## Brand & Style
The design system is built upon the concept of "Cinematic Editorial Utility," blending the high-end aesthetic of modern Korean product design with the technical precision of film production. It evokes the feeling of a premium printed film journal or a calibrated projection suite. The emotional response is one of calm, expert curation and sophisticated quietude.

The visual style rejects the high-energy, neon-soaked tropes of streaming platforms. Instead, it utilizes a "Minimal-Technical" approach:
- **Spatial Precision:** Composition is governed by film aspect ratios (2.39:1, 16:9).
- **Refined Materiality:** The interface feels like a physical object—matte paper surfaces, precise laser-etched lines, and soft light spill.
- **Editorial Hierarchy:** Typography is the primary driver of the experience, moving away from heavy containers and shadows toward a layout driven by whitespace and structural alignment.

## Colors
The palette is centered on the contrast between the organic warmth of archival paper and the technical depth of cinema darkness.

- **Primary (Dark Slate Gray):** Used for typography, structural lines, and deep-focus headers. It mimics the "ink" of the editorial experience.
- **Surface (Warm Off-White):** The foundational canvas. It provides a softer, more sophisticated look than pure white, reducing eye strain and feeling more "premium-analog."
- **Brand Point (Muted Gold):** Reserved for singular moments of emphasis—curated selections, "Director's Choice" tags, or primary interaction points.
- **Technical Accents:** Subtle grays are used for monospaced data and secondary labels. Red is strictly functional, reserved for unavailable states or warnings.

## Typography
Typography is the cornerstone of this design system. It utilizes a three-tier font strategy:
1. **The Character (Bricolage Grotesque):** Large, impactful headlines with idiosyncratic details that mirror the "auteur" spirit of cinema.
2. **The Utility (Hanken Grotesk):** A clean, modern sans-serif for body copy and general navigation, providing a balanced, professional foundation.
3. **The Spec (Geist):** A monospaced font used for technical data, metadata (bitrates, theater specs, seat numbers), and small utility labels. This reinforces the "Technical Utility" aspect of the brand.

## Layout & Spacing
The layout follows a fluid-to-fixed transition model. On desktop, content is centered within a 1280px max-width container using a 12-column grid.

- **Rhythm:** Spacing is strictly based on a 4px baseline, but larger gaps (80px+) are used between sections to create "editorial breathing room."
- **Frames:** Instead of traditional cards, content is grouped by 0.5px hair-lines or defined by aspect-ratio "frames." These frames act as windows to content.
- **Mobile:** Margins shrink to 20px, and the grid collapses to 4 columns. Visual hierarchy is maintained by reducing the scale of Bricolage Grotesque while keeping Geist labels legible.

## Elevation & Depth
This design system avoids traditional drop shadows and floating cards. Depth is achieved through:
- **Tonal Layering:** Using subtle variations of the Warm Off-White and Dark Slate Gray to differentiate "Paper" (Background) from "Film" (Content).
- **Projector Light:** Very subtle, large-radius radial gradients (opacity < 5%) may be used in the background to simulate the soft spill of a projector in a dark room.
- **Hard Lines:** Precise 0.5px or 1px borders define separate modules. There is no "blur"—everything is in sharp focus, mimicking a high-resolution film scan.

## Shapes
The shape language is strictly geometric and architectural.
- **Corner Radius:** Elements are sharp (0px). This reflects the edges of a film strip, a projector screen, and the technical blueprints of a theater.
- **Patterns:** Repetitive grid patterns (mimicking theater seating charts) or dotted textures (mimicking speaker grilles) are used as subtle background elements to add texture without clutter.

## Components
- **Buttons:** Primary buttons are solid Dark Slate Gray with Warm Off-White typography. Secondary buttons use a simple 1px border. No rounded corners.
- **Technical Badges:** Small, monospaced Geist text within a thin rectangular frame. Used for "4K," "Dolby Atmos," or "Laser" specifications.
- **Information Lists:** Key-value pairs (e.g., Distance: 4.2km) are separated by a dotted leader line, resembling a technical manual or a high-end restaurant menu.
- **Cards:** Eschew box-shadows. Content "cards" are simply areas of space defined by a top-border line and a bold heading.
- **Seat Pattern:** Abstracted grids of small squares. Selected states are filled with the Brand Point Color (Muted Gold); unavailable states are a faint light gray.
- **Input Fields:** Bottom-border only, with a monospaced label floating above. Clear, clinical, and efficient.