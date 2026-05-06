# Smart Home Gesture Control — PRD

## Original Problem Statement
> Generate a gesture recognition full-stack app for smart home appliances based on the research paper *"Gesture Recognition for Smart Home Appliances: An Intelligent Human-Machine Interaction System."*

## Architecture
- **Frontend**: React 19, MediaPipe Hands (CDN, in-browser), TailwindCSS, Shadcn UI, Sonner toasts.
- **Backend**: FastAPI + Motor (MongoDB) at `/api/*`.
- **Gesture pipeline**: webcam → MediaPipe 21 hand landmarks → geometric classifier → 600 ms hold debounce → mapped command → POST `/api/gesture-events` + PATCH `/api/devices/{id}`.

## User Personas
- Home dweller wanting contactless control of lights/fans (accessibility, post-COVID, hands-busy scenarios).
- Researcher / educator demonstrating gesture-based HMI from the referenced paper.

## Core Requirements (static)
- Live webcam feed with skeletal hand overlay (HUD-style).
- Real-time gesture readout (name + confidence).
- Three simulated devices: Living Room Light, Bedroom Light, Ceiling Fan (state persisted in MongoDB).
- Gesture-to-action mapping: Open Palm = ON, Fist = OFF, Thumbs Up = increase, Thumbs Down = decrease, Peace = next device, Point = confirm/select.
- Activity log (terminal-style), legend, info section about the paper.
- No auth (single dashboard).

## What's Implemented (Feb 2026)
- Backend endpoints: `/api/devices` (auto-seeded), `PATCH /api/devices/{id}`, `POST /api/devices/reset`, `POST /api/gesture-events`, `GET /api/gesture-events`, `DELETE /api/gesture-events`, `GET /api/stats`. **All 12 backend tests pass.**
- Frontend Dashboard at `/` with HUD webcam feed, MediaPipe loaded from CDN, animated device cards, Slider-driven brightness/fan-speed, terminal activity log, gesture legend, info section, status indicators, pause/resume + reset.
- Design: Dark Void Black aesthetic with Volt Cyan + Warning Amber accents; Outfit / Manrope / JetBrains Mono fonts; sharp-edge brutalist cards.

## Prioritized Backlog
- **P1**: Optional CNN inference path (backend Python) for parity with research paper's 96.4 % CNN result; toggle between client geometric vs server CNN classifier.
- **P1**: Add a real IoT bridge (MQTT/Home Assistant webhook) so the demo can actually toggle a smart bulb.
- **P2**: Stats/analytics dashboard (gesture frequency, accuracy timeline, peak hours).
- **P2**: Customisable gesture-to-action mapping per user.
- **P2**: Voice fallback + accessibility audit.
- **P3**: Multi-hand support (two-handed gestures), dynamic gesture sequences.

## Next Tasks
- Gather user feedback on first interactive run with their webcam.
- Add CNN backend path if user wants paper-faithful CNN classifier.
