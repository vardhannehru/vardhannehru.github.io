GOAL:    the viewer gets "a RAG chatbot grounded in company content, with a guardrail" and remembers it ran on Azure
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    16 s x 30 = 480 frames; no music
LOOK:    pastel colour-block worlds with 7% grain. Ask + answer + end: Soft Lavender #EBDEFC; pipeline: Summer Green #B1E4E3.
         The product panel keeps its real dark styling (#171717, header gradient rgba(30,58,138,.6), Send gradient
         #3b82f6→#a855f7→#2563eb), so it is the one dark object on the pastel ground.
         Ink #0e1523, lavender ink #743BBE, green ink #08746B, Limencello #FED141 only on the guardrail tag.
         Display: Inter 900, 84-96 px, -3% tracking (the site's face). Labels: JetBrains Mono 700 28 px.
OBJECTS: the real ReveloSoft Assistant panel; site pages (Products, Training, About) as paper sheets; their chunks
         as strips; embeddings as dots in an index; the query as a dot; source chips; the contact card.
MOTION:  enter expo.out 0.5–0.7 s; zoom-through power3.in 0.35 s; chunk split power3.out; exits power3.in 0.3 s.
SHOTS:   0–126   ask: panel arrives, greeting, a visitor question types, cursor clicks Send → zoom through Send.
         126–288 pipeline (green): Ingest → Chunk → Embed → Retrieve, one step word at a time; query dot finds 3 chunks.
         288–396 answer (lavender): chunks fly into the panel as a reply with source chips; an off-topic question gets
                 the guardrail fallback (Out of scope + real contacts).
         396–480 end: "ReveloSoft RAG Chatbot", the Azure stack, internship line; holds 2 s, fades to the bare ground.
BANNED:  dark void ground, glow, neon, glass cards, invented answer text, invented metrics, three cards in a row.
QA:      2.5 s panel + question; 6.5 s chunks; 8.8 s retrieval; 11 s grounded reply; 12.6 s fallback; 15 s lockup.
