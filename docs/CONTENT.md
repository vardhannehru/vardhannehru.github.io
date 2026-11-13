# Portfolio content

What the site says, as of **November 11, 2026**, taken from the code. Where each piece lives is given so it can be
updated in one place.

## Hero (home page top)

- **Name:** VARDHAN NEHRU (`components/hero/portfolio-hero.tsx`)
- **Label in the nav:** AI Engineer (`components/layout/HeroNav.tsx`)
- **Caption:** Feed ↓ · 2026 · Portfolio

## About (`components/about/AboutCollage.tsx`)

- **Heading:** "this is me", with a handwritten "yes, that's me" note by the portrait. Footer line: Vardhan Nehru · 2026.
- **Hello:** I'm Vardhan. I build intelligent AI systems that solve real-world problems.
- **Summary:** AI Engineer with a B.Tech in Computer Science (AI & ML) and six months of internship experience building
  LLM agents and RAG applications on OpenAI and Microsoft Azure. Contributed to TomandJerry.ai, a two-agent platform
  covering candidate profiling, CV generation, mock interviews and AI-led hiring screens, and built ReveloSoft's
  enterprise RAG chatbot. Hands-on with LangChain, CrewAI, Model Context Protocol (MCP) and ElevenLabs voice agents;
  certified in MCP (Anthropic), Generative AI (Databricks) and LangChain & LangGraph (LangChain Academy).
- **Buttons:** View Resume (`/about/resume.pdf`), Open to Work.
- **Badges:** 6 months @ ReveloSoft · MCP certified ✓ · B.Tech CSE (AI & ML), Pragati Engineering College, Kakinada.
- **Moving band:** AI ENGINEER · LLM AGENTS · RAG · VOICE AI · MCP

### Experience

| When | What | Notes |
|---|---|---|
| May – Oct 2026 | AI Intern · ReveloSoft, Hyderabad | TomandJerry.ai agents, enterprise RAG chatbot |
| Freelance | Websites for clients | VimanOne, Future Spark, Shivaji Vidya Peeth |

### Education

| When | What |
|---|---|
| 2021 – 2025 | B.Tech CSE (AI & ML), Pragati Engineering College, Kakinada |

### Toolkit

Claude, Claude Code, ChatGPT, OpenAI API, GitHub Copilot, Python, TypeScript, LangChain, LangGraph, CrewAI, MCP, RAG,
FAISS, ChromaDB, Azure OpenAI, AWS Bedrock, ElevenLabs, Docker, Kubernetes, Git, Postman.

## Work (`components/work/projects.tsx`)

Shown on the home page's Work section (on TVs, with a TV-remote cursor) and in full on the `/work` page.

| # | Project | Type | Year | Core tech | Links |
|---|---|---|---|---|---|
| 1 | **TomandJerry.ai**: AI career and hiring agents | Internship · ReveloSoft | 2026 | AI Agents, OpenAI API, Azure AI Document Intelligence | [tomandjerry.ai](https://tomandjerry.ai) |
| 2 | **ReveloSoft RAG Chatbot**: enterprise RAG chatbot | Internship · ReveloSoft | 2026 | RAG, Azure OpenAI, Azure AI Search | [revelosoft.com](https://revelosoft.com) |
| 3 | **Asha**: voice AI agent for EMI collections | AI project (team, with Prashanth, Karthik and Bindu) | 2026 | MCP, LLM Agents, Twilio Voice | [GitHub](https://github.com/vardhannehru/asha-emi-collection-agent) |
| 4 | **Talk to Harvey**: real-time RAG voice assistant | AI project | 2026 | RAG, FAISS, Claude API | [GitHub](https://github.com/vardhannehru/Real_Time-Speech_conversation_Bot) |
| 5 | **VimanOne**: Zero to Cockpit | Freelance · client work | 2026 | Next.js, Three.js, GSAP | [viman1.com](https://viman1.com), [GitHub](https://github.com/vardhannehru/vimanone-website) |
| 6 | **Future Spark**: school website | Freelance · client work | 2026 | React 19, Google Apps Script, Netlify | [futurespark.in](https://futurespark.in), [GitHub](https://github.com/vardhannehru/FutureSpark) |
| 7 | **EV Cost Prediction**: machine learning | Project | 2025 | Python, scikit-learn, regression | [GitHub](https://github.com/vardhannehru/-EV-Cost-Prediction) |
| 8 | **News Digital Agency**: multi-agent system | AI project (personal / freelance) | 2026 | CrewAI, OpenAI, Python | [GitHub](https://github.com/vardhannehru) |
| 9 | **Shivaji Vidya Peeth**: school website | Freelance · client work | 2026 | Website, deployed | [shivajividyapeeth.in](https://shivajividyapeeth.in) |

Projects 1–6 have video reels (`public/projects/`). News Digital Agency and Shivaji Vidya Peeth show a "Video coming
soon" test card; EV Cost Prediction shows a photo.

## Certifications (`components/certificates/certificates.ts`)

Shown in the 3D certificate drawer in the About section; click one to open it full size.

| # | Certificate | Issuer | Date | Credential |
|---|---|---|---|---|
| 1 | Introduction to Model Context Protocol | Anthropic · Claude Academy | Sep 26, 2026 | |
| 2 | Fundamentals of Agents | Hugging Face · Agents Course | Oct 12, 2026 | |
| 3 | Apply AI at Work · Pathway | OpenAI Academy | Oct 7, 2026 | ID 196583459 |
| 4 | Generative AI Fundamentals | Databricks Academy | Aug 29, 2026 | |
| 5 | Introduction to LangGraph (Python) | LangChain Academy | Oct 5, 2026 | ID 6rpv57rnsp |
| 6 | Elements of AI | University of Helsinki × MinnaLearn | Oct 2, 2026 | [Verify](https://certificates.mooc.fi/validate/0owj5a2g4lsk) |
| 7 | Introduction to LangChain (Python) | LangChain Academy | Aug 29, 2026 | ID yfjwifezbe |

## Full name

**Penkey Vardhan Sai Raghavendra Nehru** (Vardhan for short). Used in the About intro, the browser tab title, the
footer, the portrait's alt text and the nav's home label. The big 3D hero name stays "VARDHAN NEHRU" (the full name is
too long for the slab letters).

## Open source

Shown only in the About collage ("this is me"), as an entry under EXPERIENCE (`EXPERIENCE` in
`components/about/AboutCollage.tsx`), with a link to each pull request. To find new ones: GitHub search
`is:pr author:vardhannehru -user:vardhannehru`. (`components/opensource/OpenSourceSection.tsx` also has a full card
section, not shown on any page right now.)

| Repo | PR | Status |
|---|---|---|
| pipecat-ai/pipecat | [#5864](https://github.com/pipecat-ai/pipecat/pull/5864) Unit tests for SoundfileMixer | Merged, Sep 2026 |
| stripe/ai | [#559](https://github.com/stripe/ai/pull/559) Warn on the deprecated 'actions' config key | Closed (Stripe retired the package), Oct 2026 |
| stripe/ai | [#560](https://github.com/stripe/ai/pull/560) Run all 51 Python tests, not 3 | Closed (Stripe retired the package), Oct 2026 |

GitHub and LinkedIn also show as labelled buttons in the section header and the site footer (`SocialLinks`). The
URLs live in `GITHUB_URL` / `LINKEDIN_URL` in that file; `App.tsx` reads them from there.

## Contact (`App.tsx`, shown by `components/contact/ContactSection.tsx`)

- **Email:** vardhannehru04@gmail.com (as on the resume)
- **LinkedIn:** https://www.linkedin.com/in/pvsr-nehru/
- **GitHub:** https://github.com/vardhannehru

## Pages

- `/`: hero, Work, About (with the certificate drawer), Contact.
- `/about`: the hero, then About (with the certificate drawer) and Contact, without Work.
- `/work`: the full write-up of every project.
- `/hero`: the hero on its own.

## Interactive extras

Traffic-light scrollbar (green while scrolling, yellow while the mouse moves, red at rest), a TV-remote cursor over
Work, a pencil cursor over About, the scroll-driven 3D certificate drawer, and a pastel (default) / dark theme.
