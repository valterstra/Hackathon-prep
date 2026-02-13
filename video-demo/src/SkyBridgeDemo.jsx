import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { LightLeak } from "@remotion/light-leaks";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { z } from "zod";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "700", "800"],
  subsets: ["latin"],
});

// ── Zod schema for parametrizable props ────────────────────────────────
export const SkyBridgeDemoSchema = z.object({
  brandName: z.string(),
  tagline: z.string(),
  brandBlue: z.string(),
  brandYellow: z.string(),
  outroWords: z.array(z.string()),
});

export const SKYBRIDGE_DEFAULT_PROPS = {
  brandName: "SkyBridge",
  tagline: "Book flights in minutes",
  brandBlue: "#002f77",
  brandYellow: "#febb02",
  outroWords: ["Search", ".", "Book", ".", "Fly"],
};

const c = {
  bg: "#f1f3f6",
  surface: "#ffffff",
  text: "#1a1f2c",
  muted: "#566070",
  blue: "#003b95",
  blueDark: "#002f77",
  yellow: "#febb02",
  ok: "#008234",
  border: "#d5d9e0",
  inputBorder: "#b8c3d7",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Recommended spring presets from Remotion best practices
const springs = {
  smooth: { damping: 200 },
  snappy: { damping: 20, stiffness: 200 },
  bouncy: { damping: 8 },
  heavy: { damping: 15, stiffness: 80, mass: 2 },
};

// ── Typewriter helper (string slicing, best practice) ──────────────────
const getTypedText = ({ frame, fullText, charFrames }) => {
  const typedChars = Math.min(fullText.length, Math.floor(frame / charFrames));
  return fullText.slice(0, typedChars);
};

// Blinking cursor component (frame-driven, no CSS animations)
const Cursor = ({ frame, blinkFrames = 16, symbol = "\u258C" }) => {
  const opacity = interpolate(
    frame % blinkFrames,
    [0, blinkFrames / 2, blinkFrames],
    [1, 0, 1],
    clamp,
  );
  return <span style={{ opacity }}>{symbol}</span>;
};

// ── Click flash effect ────────────────────────────────────────────────
// Cursor appears at position, clicks with ring pulse, then disappears.
// All frame-driven per Remotion best practices — no CSS transitions.
const ClickFlash = ({ frame: globalFrame, clickFrame, x, y }) => {
  const f = globalFrame - clickFrame;
  if (f < -2 || f > 22) return null;

  const cursorOpacity = interpolate(f, [-2, 0, 8, 12], [0, 1, 1, 0], clamp);
  const cursorScale = interpolate(f, [-1, 0, 2, 4, 6], [1, 1, 0.78, 0.78, 1], clamp);
  const ringSize = f >= 0 ? interpolate(f, [0, 18], [0, 40], clamp) : 0;
  const ringOpacity = f >= 0 ? interpolate(f, [0, 18], [0.8, 0], clamp) : 0;

  return (
    <>
      {cursorOpacity > 0.01 && (
        <div style={{ position: "absolute", left: x, top: y, zIndex: 999, opacity: cursorOpacity, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))", transform: `scale(${cursorScale})` }}>
          <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
            <path d="M2 2L2 26L8.5 20L14 32L19 30L13.5 18L22 18L2 2Z" fill="white" stroke="#1a1f2c" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      {ringSize > 0 && (
        <div style={{ position: "absolute", left: x + 4 - ringSize, top: y + 4 - ringSize, width: ringSize * 2, height: ringSize * 2, borderRadius: 999, border: `3px solid ${c.yellow}`, opacity: ringOpacity, zIndex: 998 }} />
      )}
    </>
  );
};

// ── Accurate landing page component ───────────────────────────────────
const LandingPage = ({ formValues, showChat, chatMessages, chatProgress, brandName }) => {
  const fv = formValues || {};

  return (
    <div style={{ width: 1920, height: 1080, position: "relative", fontFamily, background: c.bg }}>
      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, background: c.blue, display: "flex", alignItems: "center", padding: "0 60px", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: 0.2 }}>{brandName}</span>
        <div style={{ display: "flex", gap: 30 }}>
          {["Search", "Destinations", "Why us"].map((t) => (
            <span key={t} style={{ color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: "absolute", top: 56, left: 0, right: 0, height: 480, background: c.blue, padding: "60px 60px 0" }}>
        <div style={{ display: "flex", gap: 40 }}>
          <div style={{ flex: 1.1, paddingTop: 10 }}>
            <p style={{ color: "#b9d6ff", fontWeight: 700, fontSize: 16, margin: "0 0 12px" }}>Simple booking for first-time builders</p>
            <h1 style={{ color: "#fff", fontSize: 46, margin: 0, lineHeight: 1.12, fontWeight: 800 }}>
              Find and book your next flight in minutes.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 18, marginTop: 18, lineHeight: 1.55, maxWidth: 520 }}>
              This is a front-end demo landing page. It validates your form and shows mock flight results so you can practice building products.
            </p>
          </div>

          {/* Search card */}
          <div style={{ flex: 1, maxWidth: 520, background: c.surface, border: `4px solid ${c.yellow}`, borderRadius: 14, padding: "20px 22px", boxShadow: "0 14px 28px rgba(11,25,49,0.24)" }}>
            <div style={{ fontWeight: 800, fontSize: 19, color: c.text, marginBottom: 16 }}>Search flights</div>
            {[
              { label: "From", placeholder: "Stockholm (ARN)", key: "from" },
              { label: "To", placeholder: "London (LHR)", key: "to" },
            ].map((f) => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: c.text, marginBottom: 5 }}>{f.label}</div>
                <div style={{ border: `1px solid ${c.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 15, color: fv[f.key] ? c.text : c.muted, background: "#fff" }}>
                  {fv[f.key] || f.placeholder}
                </div>
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: c.text, marginBottom: 5 }}>Trip Type</div>
              <div style={{ border: `1px solid ${c.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 15, color: c.text, background: "#fff", display: "flex", justifyContent: "space-between" }}>
                <span>{fv.tripType || "Round-trip"}</span>
                <span style={{ color: c.muted }}>▾</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              {[
                { label: "Departure", key: "departure" },
                { label: "Return", key: "return" },
              ].map((f) => (
                <div key={f.key} style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: c.text, marginBottom: 5 }}>{f.label}</div>
                  <div style={{ border: `1px solid ${c.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 15, color: fv[f.key] ? c.text : c.muted, background: "#fff" }}>
                    {fv[f.key] || "yyyy-mm-dd"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: c.text, marginBottom: 5 }}>Passengers</div>
                <div style={{ border: `1px solid ${c.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 15, color: c.text, background: "#fff" }}>{fv.passengers || "1"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: c.text, marginBottom: 5 }}>Class</div>
                <div style={{ border: `1px solid ${c.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 15, color: c.text, background: "#fff", display: "flex", justifyContent: "space-between" }}>
                  <span>{fv.travelClass || "Economy"}</span>
                  <span style={{ color: c.muted }}>▾</span>
                </div>
              </div>
            </div>
            <div style={{ background: c.blue, color: "#fff", textAlign: "center", padding: "12px 0", borderRadius: 8, fontSize: 16, fontWeight: 700 }}>Search flights</div>
          </div>
        </div>
      </div>

      {/* Below hero */}
      <div style={{ position: "absolute", top: 536, left: 0, right: 0, padding: "30px 60px" }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: c.text, marginBottom: 6 }}>Available flights</div>
        <p style={{ fontSize: 16, color: c.muted, margin: 0 }}>Submit the form to generate mock results.</p>
      </div>

      {/* Destinations */}
      <div style={{ position: "absolute", top: 650, left: 0, right: 0, padding: "0 60px" }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: c.text, marginBottom: 14 }}>Popular destinations</div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { city: "Paris", desc: "Art, food, and weekend escapes." },
            { city: "Tokyo", desc: "Tech, culture, and incredible cuisine." },
            { city: "New York", desc: "City breaks with nonstop energy." },
          ].map((d) => (
            <div key={d.city} style={{ flex: 1, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{d.city}</div>
              <div style={{ fontSize: 14, color: c.muted, marginTop: 4 }}>{d.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI button */}
      <div style={{ position: "absolute", left: 24, bottom: 24, width: 56, height: 56, borderRadius: 999, background: c.blue, border: "3px solid #fff", boxShadow: "0 10px 24px rgba(8,19,44,0.36)", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontWeight: 800, fontSize: 15, zIndex: 50 }}>AI</div>

      {/* Chat widget */}
      {showChat && (() => {
        const progress = chatProgress ?? 0;
        const widgetScale = interpolate(progress, [0, 1], [0.96, 1]);
        const widgetY = interpolate(progress, [0, 1], [20, 0]);
        return (
          <div style={{ position: "absolute", left: 24, bottom: 92, width: 380, background: "#fff", border: "1px solid #ccd3df", borderRadius: 14, boxShadow: "0 20px 40px rgba(8,19,44,0.35)", padding: 18, zIndex: 55, opacity: progress, transform: `translateY(${widgetY}px) scale(${widgetScale})` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: c.text }}>Booking Assistant</span>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: "#e9eef8", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16, color: "#1d2a43" }}>×</div>
            </div>
            <p style={{ fontSize: 14, color: c.muted, margin: "0 0 12px", lineHeight: 1.4 }}>
              Type naturally in English or Swedish, for example: London to Berlin on 29 August for 2 in business.
            </p>
            <div style={{ background: "#f7faff", border: "1px solid #d4dcec", borderRadius: 10, padding: 12, minHeight: 140, display: "flex", flexDirection: "column", gap: 8 }}>
              {(chatMessages || []).map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} style={{ alignSelf: isUser ? "flex-end" : "flex-start", background: isUser ? "#d9f1e4" : "#eaf1ff", color: isUser ? "#0d4f2e" : "#0f2e66", padding: "10px 14px", borderRadius: 10, fontSize: 14.5, maxWidth: "92%", lineHeight: 1.35 }}>
                    <span>{msg.displayText}</span>
                    {msg.showCursor && <Cursor frame={msg.cursorFrame} blinkFrames={16} />}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, border: `1px solid ${c.inputBorder}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: c.muted, background: "#fff" }}>Ask the assistant to fill your flight search...</div>
              <div style={{ background: c.blue, color: "#fff", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>Send</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// SCENE 1: Brand slam — in/out animation pattern
// ══════════════════════════════════════════════════════════════════════
const IntroScene = ({ brandName, tagline, brandBlue, brandYellow }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // In animation: bouncy slam
  const inAnim = spring({ frame, fps, durationInFrames: 20, config: springs.bouncy });
  // Out animation: smooth exit before transition
  const outAnim = spring({ frame, fps, delay: durationInFrames - 1 * fps, durationInFrames: 1 * fps, config: springs.smooth });

  const presence = inAnim - outAnim;
  const titleScale = interpolate(presence, [0, 1], [2.5, 1]);
  const titleOpacity = interpolate(presence, [0, 0.3, 1], [0, 1, 1]);

  // Screen shake after slam
  const shakeAmt = interpolate(frame, [18, 30], [6, 0], clamp);
  const shakeX = Math.sin(frame * 2.5) * shakeAmt;
  const shakeY = Math.cos(frame * 3.2) * shakeAmt;

  // Subtitle with spring delay
  const subSpring = spring({ frame, fps, delay: 22, durationInFrames: 18, config: springs.snappy });
  const subY = interpolate(subSpring, [0, 1], [50, 0]);

  // Yellow line wipe
  const lineWidth = interpolate(frame, [1 * fps, 1.7 * fps], [0, 600], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(145deg, ${brandBlue || c.blueDark} 0%, ${brandBlue ? c.blue : c.blue} 50%, #2f66b9 100%)`, justifyContent: "center", alignItems: "center", fontFamily }}>
      <div style={{ textAlign: "center", transform: `scale(${titleScale}) translate(${shakeX}px, ${shakeY}px)`, opacity: titleOpacity }}>
        <h1 style={{ fontSize: 140, color: "#fff", margin: 0, fontWeight: 800, letterSpacing: -2 }}>{brandName}</h1>
        <div style={{ height: 5, background: brandYellow || c.yellow, width: lineWidth, margin: "16px auto 0", borderRadius: 4 }} />
        <p style={{ fontSize: 46, color: "rgba(255,255,255,0.92)", marginTop: 22, transform: `translateY(${subY}px)`, opacity: interpolate(subSpring, [0, 1], [0, 1]), fontWeight: 500 }}>{tagline}</p>
      </div>
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════
// SCENE 2: Full landing page flow
// Click AI → chat opens → zoom in → typewriter conversation → zoom out → form fills → click search
// ══════════════════════════════════════════════════════════════════════
const MainScene = ({ brandName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Page entrance with spring
  const pageEntrance = spring({ frame, fps, durationInFrames: 25, config: springs.smooth });
  const pageOpacity = interpolate(pageEntrance, [0, 1], [0, 1]);

  // Chat opens after AI button click at frame 30
  const chatOpen = frame >= 38
    ? interpolate(spring({ frame, fps, delay: 38, durationInFrames: 20, config: springs.snappy }), [0, 1], [0, 1])
    : 0;

  // Zoom: target the chat widget center at (214, 788) in page coords
  // transformOrigin center (960,540), translate = (960-214, 540-788) = (746, -248)
  const zoomIn = interpolate(frame, [48, 85], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const zoomOut = interpolate(frame, [310, 355], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const focus = zoomIn - zoomOut;
  const zoom = interpolate(focus, [0, 1], [1, 3]);
  const panX = interpolate(focus, [0, 1], [0, 746]);
  const panY = interpolate(focus, [0, 1], [0, -248]);

  // ── Chat messages with typewriter effect (best practice: string slicing) ──
  const allMessages = [
    { role: "assistant", text: "Hi. Tell me your trip in plain language (English or Swedish), then confirm with yes/ja.", startFrame: 70, charFrames: 1 },
    { role: "user", text: "Stockholm to London on August 29 for 2 in business.", startFrame: 120, charFrames: 1.5 },
    { role: "assistant", text: "Great — round-trip or one-way?", startFrame: 160, charFrames: 1.5 },
    { role: "user", text: "Round-trip, back September 5.", startFrame: 195, charFrames: 1.5 },
    { role: "assistant", text: "I'll fill the form: Stockholm → London, Aug 29 – Sep 5, 2 pax, Business. Confirm?", startFrame: 225, charFrames: 1 },
    { role: "user", text: "Yes", startFrame: 270, charFrames: 2 },
    { role: "assistant", text: "Done! Filling your search form now.", startFrame: 285, charFrames: 1.5 },
  ];

  const visibleMessages = allMessages
    .filter((msg) => frame >= msg.startFrame)
    .map((msg) => {
      const localFrame = frame - msg.startFrame;
      const typedText = getTypedText({
        frame: localFrame,
        fullText: msg.text,
        charFrames: msg.charFrames,
      });
      const isComplete = typedText.length >= msg.text.length;
      return {
        ...msg,
        displayText: typedText,
        showCursor: !isComplete,
        cursorFrame: localFrame,
      };
    });

  // Form filling after zoom out (using spring delay)
  const formFieldDefs = [
    { key: "from", value: "Stockholm (ARN)", delay: 370 },
    { key: "to", value: "London (LHR)", delay: 382 },
    { key: "tripType", value: "Round-trip", delay: 394 },
    { key: "departure", value: "2026-08-29", delay: 404 },
    { key: "return", value: "2026-09-05", delay: 414 },
    { key: "passengers", value: "2", delay: 424 },
    { key: "travelClass", value: "Business", delay: 434 },
  ];

  const formValues = {};
  for (const field of formFieldDefs) {
    const s = spring({ frame, fps, delay: field.delay, durationInFrames: 12, config: springs.snappy });
    if (s > 0.5) formValues[field.key] = field.value;
  }

  // Exit animation (in/out pattern)
  const exitOpacity = interpolate(frame, [510, 540], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: c.bg, fontFamily, overflow: "hidden", opacity: exitOpacity }}>
      <div
        style={{
          width: 1920,
          height: 1080,
          position: "relative",
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          transformOrigin: "center center",
          opacity: pageOpacity,
        }}
      >
        <LandingPage
          brandName={brandName}
          formValues={formValues}
          showChat={chatOpen > 0.01}
          chatProgress={chatOpen}
          chatMessages={visibleMessages}
        />
      </div>

      {/* Click: AI button */}
      <ClickFlash frame={frame} clickFrame={30} x={52} y={1028} />

      {/* Click: Send button for each user message (zoomed coords) */}
      <ClickFlash frame={frame} clickFrame={116} x={710} y={790} />
      <ClickFlash frame={frame} clickFrame={191} x={710} y={790} />
      <ClickFlash frame={frame} clickFrame={266} x={710} y={790} />

      {/* Click: Search flights button (unzoomed, after form fills) */}
      <ClickFlash frame={frame} clickFrame={470} x={1320} y={520} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════
// SCENE 3: Power outro — in/out animation pattern + word highlight wipe
// ══════════════════════════════════════════════════════════════════════
const OutroScene = ({ brandName, brandYellow, outroWords }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // In animation: bouncy slam
  const inAnim = spring({ frame, fps, durationInFrames: 18, config: { damping: 9, mass: 0.5, stiffness: 220 } });
  const titleScale = interpolate(inAnim, [0, 1], [3, 1]);
  const opacity = interpolate(frame, [0, 5], [0, 1], clamp);

  // Screen shake
  const shakeAmt = interpolate(frame, [16, 28], [5, 0], clamp);
  const sx = Math.sin(frame * 3) * shakeAmt;
  const sy = Math.cos(frame * 4) * shakeAmt;

  const words = outroWords;
  const barW = interpolate(frame, [25, 45], [0, 500], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(145deg, ${c.blueDark} 0%, ${c.blue} 50%, #2f66b9 100%)`, justifyContent: "center", alignItems: "center", fontFamily }}>
      <div style={{ textAlign: "center", transform: `scale(${titleScale}) translate(${sx}px, ${sy}px)`, opacity }}>
        <h2 style={{ fontSize: 130, color: "#fff", margin: 0, fontWeight: 800, letterSpacing: -2 }}>{brandName}</h2>
        <div style={{ height: 5, background: brandYellow || c.yellow, width: barW, margin: "18px auto 0", borderRadius: 4 }} />
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 18 }}>
          {words.map((word, i) => {
            const wordSpring = spring({ frame, fps, delay: 28 + i * 5, durationInFrames: 14, config: springs.bouncy });
            const wordY = interpolate(wordSpring, [0, 1], [30, 0]);
            // Word highlight wipe effect (best practice)
            const highlightWidth = interpolate(
              spring({ frame, fps, delay: 40 + i * 6, durationInFrames: 18, config: springs.smooth }),
              [0, 1],
              [0, 100],
            );
            const isDecorator = word === "." || word === "·";
            return (
              <span key={i} style={{
                fontSize: 48,
                color: isDecorator ? (brandYellow || c.yellow) : "#fff",
                fontWeight: 700,
                transform: `translateY(${wordY}px)`,
                opacity: interpolate(wordSpring, [0, 1], [0, 1]),
                display: "inline-block",
                position: "relative",
              }}>
                {!isDecorator && (
                  <span style={{
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    width: `${highlightWidth}%`,
                    height: 4,
                    background: brandYellow || c.yellow,
                    borderRadius: 2,
                  }} />
                )}
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION — TransitionSeries with light leaks, premountFor,
// fade/wipe/slide transitions per best practices
// ══════════════════════════════════════════════════════════════════════

// Duration constants for clarity
const INTRO_DURATION = 105;
const MAIN_DURATION = 560;
const OUTRO_DURATION = 120;
const FADE_TRANSITION = 20;
const LIGHT_LEAK_DURATION = 40;
const FADE_TIMING = springTiming({
  config: springs.smooth,
  durationInFrames: FADE_TRANSITION,
});

export const getSkyBridgeDemoDurationInFrames = (fps) => {
  const transitionDuration = FADE_TIMING.getDurationInFrames({ fps });
  return INTRO_DURATION + MAIN_DURATION + OUTRO_DURATION - transitionDuration;
};

export const SkyBridgeDemo = ({
  brandName = SKYBRIDGE_DEFAULT_PROPS.brandName,
  tagline = SKYBRIDGE_DEFAULT_PROPS.tagline,
  brandBlue = SKYBRIDGE_DEFAULT_PROPS.brandBlue,
  brandYellow = SKYBRIDGE_DEFAULT_PROPS.brandYellow,
  outroWords = SKYBRIDGE_DEFAULT_PROPS.outroWords,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: c.blueDark }}>
      <TransitionSeries>
        {/* Scene 1: Intro brand slam */}
        <TransitionSeries.Sequence durationInFrames={INTRO_DURATION} premountFor={30}>
          <IntroScene brandName={brandName} tagline={tagline} brandBlue={brandBlue} brandYellow={brandYellow} />
        </TransitionSeries.Sequence>

        {/* Fade transition with light leak overlay */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        {/* Scene 2: Landing page narrative */}
        <TransitionSeries.Sequence durationInFrames={MAIN_DURATION} premountFor={30}>
          <MainScene brandName={brandName} />
        </TransitionSeries.Sequence>

        {/* Light leak overlay between main and outro */}
        <TransitionSeries.Overlay durationInFrames={LIGHT_LEAK_DURATION}>
          <LightLeak seed={3} hueShift={210} />
        </TransitionSeries.Overlay>

        {/* Scene 3: Outro */}
        <TransitionSeries.Sequence durationInFrames={OUTRO_DURATION} premountFor={30}>
          <OutroScene brandName={brandName} brandYellow={brandYellow} outroWords={outroWords} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
