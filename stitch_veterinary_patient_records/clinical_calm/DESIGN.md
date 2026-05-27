---
name: Clinical Calm
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424750'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737781'
  outline-variant: '#c3c6d1'
  surface-tint: '#325f9c'
  primary: '#00366b'
  on-primary: '#ffffff'
  primary-container: '#1b4d89'
  on-primary-container: '#98bfff'
  inverse-primary: '#a7c8ff'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#8bf1e6'
  on-secondary-container: '#006f67'
  tertiary: '#293939'
  on-tertiary: '#ffffff'
  tertiary-container: '#405050'
  on-tertiary-container: '#b0c2c1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#114783'
  secondary-fixed: '#8ef4e9'
  secondary-fixed-dim: '#71d7cd'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#d4e6e5'
  tertiary-fixed-dim: '#b8cac9'
  on-tertiary-fixed: '#0e1e1e'
  on-tertiary-fixed-variant: '#3a4a49'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
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
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is anchored in the intersection of medical precision and empathetic care. It targets veterinary professionals who require a high-functioning tool that remains approachable and stress-free during fast-paced clinical environments. 

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. By prioritizing generous whitespace and a restricted color palette, the system ensures that critical patient data is never obscured by visual noise. The aesthetic evokes a sense of "digital hygiene"—organized, sterilized, and dependable—while rounded corners and soft accents provide the "friendly" warmth necessary for a compassionate care provider.

The emotional response should be one of quiet confidence: the user feels in control, organized, and supported by a system that values the well-being of both the practitioner and the patient.

## Colors

The palette is designed to reinforce trust and clinical cleanliness. 

- **Primary (Trustworthy Blue):** A deep, stable blue used for navigation, primary actions, and branding. It represents the authority and reliability of a medical institution.
- **Secondary (Soft Teal):** Used for "care" actions, success states, and health-related indicators. It provides a refreshing contrast to the primary blue and evokes a modern medical feel.
- **Tertiary (Hygiene Mint):** A very light teal used for background accents, highlighting specific table rows, or as a soft base for cards.
- **Neutral:** A range of cool grays starting from a crisp white base to ensure the interface feels airy and open.

Status colors should be muted but clear: a soft sage for success, a dusty amber for warnings, and a gentle rose for critical alerts, maintaining the "calm" atmosphere even during emergencies.

## Typography

This design system utilizes a dual-font approach to balance professional structure with modern friendliness. 

**Manrope** is used for headlines to provide a stable, geometric foundation that feels technical and precise. 
**Plus Jakarta Sans** is used for all body copy and labels; its soft curves and open counters improve readability during long sessions of data entry or record review.

For the mobile-first implementation, headlines scale down to ensure patient names and vitals remain visible without excessive wrapping. We use a 1.5x line-height for body text to ensure legibility in high-pressure environments where information must be scanned quickly.

## Layout & Spacing

The system follows a **Fluid Grid** model with an 8px spatial rhythm. On mobile devices, we prioritize a single-column stack with 16px side margins to maximize touch targets and readability. 

- **Mobile (default):** 1-column layout. Elements use 100% width with consistent 16px vertical stacking.
- **Tablet (768px+):** 2-column layout for dashboards, allowing "Patient List" and "Patient Details" to exist side-by-side.
- **Desktop (1200px+):** 12-column grid. Margins expand to 32px. Content is centered with a max-width of 1440px to prevent eye strain on ultra-wide monitors.

Padding within components should be generous—never let text touch the edges of a container. High-priority "Action Bars" are pinned to the bottom of the mobile viewport for easy thumb access.

## Elevation & Depth

To maintain the "clean" medical aesthetic, the design system avoids heavy shadows. Instead, it utilizes **Tonal Layers** and **Ambient Shadows**.

1.  **Level 0 (Base):** The main background uses the Neutral color (`#F8FAFC`).
2.  **Level 1 (Cards):** Surface containers use pure white with a very soft, diffused shadow (Blur: 10px, Y: 2px, Opacity: 4% Black) and a 1px border of a slightly darker neutral.
3.  **Level 2 (Modals/Dropdowns):** Use a slightly more pronounced shadow (Blur: 20px, Y: 4px, Opacity: 8% Black) to create clear separation from the background.

Depth is also communicated through "Surface Tints." For example, a selected state in a list might use the Tertiary Teal color rather than a shadow, keeping the interface feeling flat and tidy.

## Shapes

The shape language is consistently **Rounded** to evoke the brand’s "Compassionate" personality. Sharp corners are avoided to ensure the software feels approachable and modern.

- **Buttons & Inputs:** Use the base 0.5rem (8px) radius.
- **Cards & Patient Profiles:** Use the large 1rem (16px) radius to create a soft, friendly containment for data.
- **Status Chips:** Use a full pill-shape (3rem) to differentiate them from interactive buttons.

This consistent rounding helps soften the "clinical" nature of the application, making it feel more like a modern service tool and less like legacy medical software.

## Components

### Buttons
- **Primary:** Solid Primary Blue with white text. High emphasis.
- **Secondary:** Outlined Primary Blue or Solid Secondary Teal for "Growth/Care" actions (e.g., "Add Appointment").
- **Ghost:** For low-priority actions like "Cancel" or "Back."

### Cards
Cards are the primary organizational unit. They must have a 16px padding and use Level 1 elevation. For veterinary records, cards should include a small "Slot" in the top-right for pet icons or status indicators.

### Inputs & Fields
Input fields use a subtle light-gray background with a 1px border. On focus, the border transitions to the Primary Blue with a soft 2px outer glow. Labels are always positioned above the field for mobile clarity.

### Chips & Badges
Small, pill-shaped markers for pet species (e.g., "Canine", "Feline") or appointment status. Use low-saturation background colors with high-saturation text for accessibility.

### Progress Indicators
Step-based indicators for multi-stage processes like "Check-in" or "Surgery Intake." Use the Secondary Teal for completed steps to reinforce the feeling of progress and care.

### Icons
Use a consistent line-weight (2px). Icons should have rounded caps and joins. Incorporate pet-specific motifs (paws, ears) into standard UI metaphors where appropriate (e.g., a paw print inside a calendar icon for a vet appointment).