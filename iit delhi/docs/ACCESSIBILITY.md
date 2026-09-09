# Sahara Finance — Accessibility & Multilingual Architecture

## 1. Universal Design for Bharat

Sahara is designed to be accessible to all citizens, including first-time digital banking users, seniors, persons with visual impairments, and citizens with low textual literacy.

---

## 2. Dedicated Accessibility Modes

### Senior Mode
- **Enlarged Typography**: 1.25x base scale with high contrast ratios (> 7:1).
- **Simplified Visual Hierarchy**: Eliminates secondary widgets to focus on core actions (*Mera Paisa*, *Bhejo*, *Help*).
- **Auditory Reassurance**: Spoken confirmations for numbers, dates, and names before any money movement.

### Visually Impaired Mode
- **Screen Reader Semantics**: Full ARIA markup (`aria-live="polite"`, semantic landmarks, accessible modal focus traps).
- **Audio Descriptions**: Dynamic verbal summaries of page contents triggered by "Explain this screen".
- **Keyboard & Switch Navigation**: Strict logical tab index order across all forms and action buttons.

### Reduced Motion & Low-Literacy Support
- **Reduced Motion**: Automatically pauses WebGL Three.js canvas shaders and replaces motion springs with clean opacity fades.
- **Low-Literacy UI**: Emphasizes recognizable iconography, distinct color coding, and plain spoken verbs over technical banking jargon.

---

## 3. Multilingual Engine

Supported languages:
- **Hindi** (हिंदी)
- **Hinglish** (Romanized Hindi conversational phrasing)
- **English**
- Architecture prepared for regional expansions: Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, and Assamese.
