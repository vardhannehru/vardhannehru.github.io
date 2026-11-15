import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useMotionValue, useSpring, useTransform } from 'framer-motion';
import TV3D from './TV3D';
import { TEST_BARS, TEST_BASE, TEST_BAR_H, TEST_LABEL, TEST_STRIP, TEST_STRIP_H } from './testCard';

// Projects, shared by the Work grid on the home page (title + demo only) and the Work page (the full write-up).

export type Kind = 'intern' | 'ai' | 'project' | 'case-study' | 'lab';

export type Project = {
  /** Anchor on the Work page: /work#slug */
  slug: string;
  kind: Kind;
  title: string;
  subtitle: string;
  year: string;
  /** The headline tech, shown big on the Work page. */
  core: string[];
  /** The address shown in the browser bar (framed mockups only). */
  domain: string;
  imageUrl?: string;
  /** A looping muted clip shown in place of the image. */
  videoUrl?: string;
  /** A small still (480×270) for the home page's channel guide. */
  poster?: string;
  /** The media is already a device mockup, so skip the browser frame. */
  bare?: boolean;
  /** Glow colour behind the mockup. */
  tint: string;
  /** Which TV it plays on: graphite (default) or white with lavender. */
  tv?: TVFinish;

  // ---- Work page only ----
  overview: string[];
  highlights: { title: string; text: string }[];
  /** How a request moves through the system, top to bottom. */
  flow?: { title: string; steps: { name: string; note: string }[] };
  /** A closer look at the part that matters most (MCP, RAG...). */
  spotlight?: { title: string; intro: string; items: { name: string; note: string }[] };
  stack: { layer: string; tech: string }[];
  credit?: string;
  links: { label: string; href: string }[];
};

export const projects: Project[] = [
  // ---- ReveloSoft internship (May – Oct 2026), first. Their reels are HyperFrames films (video-projects/). A project
  // without a videoUrl shows a "Video coming soon" test card on the TV instead (testCard.ts). ----
  {
    slug: 'tomandjerry',
    kind: 'intern',
    title: 'TomandJerry.ai',
    subtitle: 'AI career and hiring agents',
    year: '2026',
    core: ['AI Agents', 'OpenAI API', 'Azure AI Document Intelligence'],
    domain: 'tomandjerry.ai',
    videoUrl: '/projects/tomandjerry-reel.mp4',
    poster: '/projects/tomandjerry-thumb.jpg',
    bare: true,
    tint: '#f0a868',
    overview: [
      'During my AI internship at ReveloSoft I contributed to TomandJerry.ai, a platform with two AI agents on the two sides of hiring. Tom works with the candidate: it builds their profile, writes their CV and runs mock interviews. Jerry works for the employer: it gathers the role’s requirements and runs the first-round screening interview on the company’s behalf.',
    ],
    highlights: [
      { title: 'Tom, the candidate agent', text: 'I built Tom’s conversational flows: it interviews students about their education, skills, projects and goals, and stores the answers as a structured profile.' },
      { title: 'ATS-friendly CVs', text: 'CVs are generated from the candidate’s profile with OpenAI structured outputs and prompt templates. Uploaded resumes are parsed with Azure AI Document Intelligence.' },
      { title: 'AI mock interviews', text: 'Role-specific questions, follow-ups that adapt to the answers, and rubric-based feedback on each answer.' },
      { title: 'Job tracker', text: 'I contributed to the Kanban job tracker and the application workflow that moves candidates through saved, applied and interview stages.' },
      { title: 'Jerry, the employer agent', text: 'I developed Jerry, which gathers role requirements from HR and runs first-round screening interviews for the company, producing a structured summary of each candidate.' },
      { title: 'Context engineering and testing', text: 'Each prompt is assembled from the candidate’s profile, the job description and the conversation so far. The agents’ answers were tested for relevance, consistency and hallucinations.' },
    ],
    spotlight: {
      title: 'Two agents, both sides of hiring',
      intro: 'Tom works for the candidate and Jerry for the employer. Between them they cover a hire from the candidate’s profile to the first-round screen.',
      items: [
        { name: 'Tom · profile', note: 'Interviews the student and stores a structured profile' },
        { name: 'Tom · CV', note: 'Turns the profile into an ATS-friendly CV' },
        { name: 'Tom · mock interview', note: 'Role-specific questions with rubric-based feedback' },
        { name: 'Jerry · role intake', note: 'Gathers the role’s requirements from HR' },
        { name: 'Jerry · screening', note: 'Runs the first-round interview and writes a candidate summary' },
      ],
    },
    stack: [
      { layer: 'LLM', tech: 'OpenAI API (structured outputs)' },
      { layer: 'Resume parsing', tech: 'Azure AI Document Intelligence' },
      { layer: 'Language', tech: 'Python' },
    ],
    credit: 'Built during my AI internship at ReveloSoft, Hyderabad (May – Oct 2026).',
    links: [{ label: 'Live site', href: 'https://tomandjerry.ai' }],
  },
  {
    slug: 'revelosoft-rag',
    kind: 'intern',
    title: 'ReveloSoft RAG Chatbot',
    subtitle: 'Enterprise RAG chatbot',
    year: '2026',
    core: ['RAG', 'Azure OpenAI', 'Azure AI Search'],
    domain: 'revelosoft.com',
    videoUrl: '/projects/revelosoft-reel.mp4',
    poster: '/projects/revelosoft-thumb.jpg',
    bare: true,
    tint: '#4fb3c8',
    overview: [
      'A chatbot on ReveloSoft’s website that answers visitors’ questions about the company’s products, services and training programs, grounded in the company’s own content. I built it during my internship, deployed it on Azure and integrated it into the website.',
    ],
    highlights: [
      { title: 'Grounded in company content', text: 'Answers come from ReveloSoft’s own content, retrieved for each question, not from what the model happens to know.' },
      { title: 'The RAG pipeline', text: 'Document ingestion, chunking, embedding generation and vector retrieval, with the retrieved context assembled into a grounded prompt.' },
      { title: 'Guardrails', text: 'Answers stay within the company’s scope. Questions that are out of scope or can’t be answered get a fallback with contact details.' },
      { title: 'Live on the website', text: 'Deployed on Azure and integrated into the company website.' },
    ],
    flow: {
      title: 'From a question to a grounded answer',
      steps: [
        { name: 'Visitor', note: 'Asks a question in the chat on the website.' },
        { name: 'Retrieval · Azure AI Search', note: 'Finds the most relevant chunks of company content.' },
        { name: 'Grounded prompt', note: 'The retrieved context is assembled into the prompt with the question.' },
        { name: 'Azure OpenAI', note: 'Writes the answer from that context.' },
        { name: 'Guardrails', note: 'Out-of-scope or unanswerable questions get a fallback with contact details.' },
      ],
    },
    spotlight: {
      title: 'How the content gets in',
      intro: 'Before anyone asks anything, the company’s content is prepared for search.',
      items: [
        { name: 'Ingestion', note: 'The company’s content is loaded in' },
        { name: 'Chunking', note: 'Split into passages small enough to retrieve' },
        { name: 'Embeddings', note: 'Each chunk is turned into a vector' },
        { name: 'Vector index', note: 'Stored so similar passages can be found for each question' },
      ],
    },
    stack: [
      { layer: 'LLM', tech: 'Azure OpenAI' },
      { layer: 'Retrieval', tech: 'Azure AI Search' },
      { layer: 'Hosting', tech: 'Azure App Service' },
      { layer: 'Language', tech: 'Python' },
    ],
    credit: 'Built during my AI internship at ReveloSoft, Hyderabad (May – Oct 2026).',
    links: [{ label: 'Live site', href: 'https://revelosoft.com' }],
  },
  // ---- Personal, freelance and academic projects ----
  {
    slug: 'asha',
    kind: 'ai',
    title: 'Asha',
    subtitle: 'Voice AI agent for EMI collections',
    year: '2026',
    core: ['MCP', 'LLM Agents', 'Twilio Voice'],
    domain: 'github.com/vardhannehru',
    videoUrl: '/projects/asha-reel.mp4',
    poster: '/projects/asha-thumb.jpg',
    bare: true,
    tint: '#e08a6d',
    overview: [
      'Asha phones borrowers whose EMI is overdue, checks she has the right person, finds out why the payment is late and offers one of three approved plans: pay in full today, pay in full within 5 days, or half today and half within 15 days. When the borrower agrees, a WhatsApp payment link goes out and the CRM records the outcome.',
      'The LLM never invents loan facts. It looks them up through a read-only MCP server, and what it can say or offer is limited by the agent harness around it.',
    ],
    highlights: [
      { title: 'Grounded with MCP', text: 'Claude decides when it needs a fact and calls an MCP tool. The MCP server reads the real loan record and returns exact numbers, so answers come from data, not from the model.' },
      { title: 'Guardrails', text: 'Only the three approved plans can ever be offered. Disputes ("I already paid") and wrong numbers are never argued with: they are recorded and handed to a person.' },
      { title: 'Rules before every call', text: 'The backend checks calling hours, the daily cap, do-not-call and ownership before Twilio dials, so policy never depends on the AI.' },
      { title: 'Structured outcome', text: 'Every call ends with a structured result (the situation, the agreed plan and the promise date) that the CRM stores and shows.' },
      { title: 'A CRM for the team', text: 'Collections agents claim borrowers, start a call or automate a queue, and read every transcript, outcome and payment status.' },
    ],
    flow: {
      title: 'One call, start to end',
      steps: [
        { name: 'CRM · React', note: 'An agent presses Call, or Automate calls for a queue.' },
        { name: 'Backend · Node + Express', note: 'Checks the calling rules, saves to SQLite, and asks Twilio to dial.' },
        { name: 'Twilio Voice', note: 'Dials the borrower, turns their speech into text and speaks Asha’s replies.' },
        { name: 'AI layer · FastAPI', note: 'The agent harness: system prompt, conversation loop, tool calling and output validation around Claude.' },
        { name: 'MCP server · Python', note: 'Read-only loan lookups over HTTP with a bearer token.' },
        { name: 'WhatsApp Cloud API', note: 'Sends the payment link, then the receipt.' },
      ],
    },
    spotlight: {
      title: 'How MCP grounds the LLM',
      intro: 'The AI layer is an MCP client. When Claude needs a fact it makes a tool request; the MCP server checks the token, does a read-only lookup and returns the exact result to Claude.',
      items: [
        { name: 'get_loan', note: 'The borrower’s loan and overdue amount' },
        { name: 'get_payment_options', note: 'The approved plans and their amounts' },
        { name: 'get_call_history', note: 'Earlier calls and any plan already agreed' },
        { name: 'list_overdue_loans', note: 'Who is due a call' },
        { name: 'emi://calling-rules', note: 'Resource: the calling policy' },
      ],
    },
    stack: [
      { layer: 'LLM', tech: 'Claude Haiku (Anthropic)' },
      { layer: 'Grounding', tech: 'MCP server (Python)' },
      { layer: 'AI layer', tech: 'Python, FastAPI' },
      { layer: 'Backend', tech: 'Node.js, Express, SQLite' },
      { layer: 'Telephony', tech: 'Twilio Voice' },
      { layer: 'Messaging', tech: 'WhatsApp Cloud API' },
      { layer: 'CRM', tech: 'React, Vite, TypeScript' },
      { layer: 'Tunnel', tech: 'ngrok' },
    ],
    credit: 'Team project with Prashanth, Karthik and Bindu.',
    links: [{ label: 'Code on GitHub', href: 'https://github.com/vardhannehru/asha-emi-collection-agent' }],
  },
  {
    slug: 'harvey',
    kind: 'ai',
    title: 'Talk to Harvey',
    subtitle: 'Real-time RAG voice assistant',
    year: '2026',
    core: ['RAG', 'FAISS', 'Claude API'],
    domain: 'github.com/vardhannehru',
    videoUrl: '/projects/harvey-reel.mp4',
    poster: '/projects/harvey-thumb.jpg',
    bare: true,
    tint: '#9d86e9',
    overview: [
      'A voice assistant for the ReveloSoft AI Engineer Bootcamp. Ask a question out loud or type it: Harvey searches the bootcamp’s own class recordings and notes, answers from those passages, and speaks the reply back one sentence at a time, while you can still interrupt it.',
    ],
    highlights: [
      { title: 'RAG, not raw LLM knowledge', text: 'Every answer is grounded in the bootcamp’s material: recordings and notes split into chunks, embedded and searched with FAISS.' },
      { title: 'Voice in, voice out, in real time', text: 'Speech-to-text, retrieval, the LLM reply and text-to-speech all run over one live WebSocket, not request and response.' },
      { title: 'Speaks while it’s still thinking', text: 'The reply is streamed and cut into sentences as they finish, so the first sentence is spoken while the rest is still being written.' },
      { title: 'You can interrupt it', text: 'Press Stop, or talk over it with headphones on: it cancels mid-sentence and listens.' },
      { title: 'Measures its own speed', text: 'A latency panel times every stage (speech-to-text, search, first word, first sentence, first voice clip) so slowness can be traced, not guessed.' },
    ],
    flow: {
      title: 'Three layers, one WebSocket',
      steps: [
        { name: 'Frontend · React + TypeScript', note: 'Mic capture, chat UI and a hand-drawn Canvas mascot.' },
        { name: 'Backend · Node + Express', note: 'A thin WebSocket relay that keeps every API key out of the browser.' },
        { name: 'Deepgram', note: 'Speech to text.' },
        { name: 'FAISS + sentence embeddings', note: 'Searches the knowledge base for the right passages.' },
        { name: 'Claude, streamed', note: 'Writes the reply sentence by sentence from those passages.' },
        { name: 'ElevenLabs', note: 'Speaks each sentence as soon as it’s ready.' },
      ],
    },
    spotlight: {
      title: 'The RAG pipeline',
      intro: 'The bootcamp’s recordings and notes become a searchable knowledge base, and every answer starts with a search.',
      items: [
        { name: 'Split', note: 'LangChain text splitting into chunks' },
        { name: 'Embed', note: 'sentence-transformers embeddings' },
        { name: 'Search', note: 'FAISS vector search for the closest passages' },
        { name: 'Answer', note: 'Claude replies only from what was found' },
      ],
    },
    stack: [
      { layer: 'LLM', tech: 'Claude (Anthropic), streaming' },
      { layer: 'RAG', tech: 'LangChain, FAISS, sentence-transformers' },
      { layer: 'Speech', tech: 'Deepgram (STT), ElevenLabs (TTS)' },
      { layer: 'AI layer', tech: 'Python, FastAPI, WebSockets' },
      { layer: 'Backend', tech: 'Node.js, Express, WebSocket relay' },
      { layer: 'Frontend', tech: 'React, TypeScript, Canvas' },
    ],
    links: [{ label: 'Code on GitHub', href: 'https://github.com/vardhannehru/Real_Time-Speech_conversation_Bot' }],
  },
  {
    slug: 'vimanone',
    kind: 'case-study',
    title: 'VimanOne',
    subtitle: 'Zero to Cockpit · Freelance',
    year: '2026',
    core: ['Next.js', 'Three.js', 'GSAP'],
    domain: 'viman1.com',
    videoUrl: '/projects/vimanone-reel.mp4',
    poster: '/projects/vimanone-thumb.jpg',
    bare: true,
    tint: '#c9a46a',
    overview: [
      'A freelance build for a client: a step-by-step guide to becoming a commercial pilot in India, from the prerequisites through the DGCA pathway. I built the website and redesigned the logo.',
      'An Airbus A320 flies as you scroll down the page. Alongside it there is an interactive 8-step checklist with saved progress, a timeline, cadet vs traditional routes, and a page for every step.',
    ],
    highlights: [
      { title: 'A real 3D aircraft', text: 'The A320 is a .glb model rendered in the browser with React Three Fiber. The landing gear is built separately in code because the model came without it, and the control surfaces move with the flight.' },
      { title: 'Scroll-driven flight', text: 'The flight follows a GSAP timeline tied to the scroll.' },
      { title: 'Checklist that remembers', text: 'Visitors tick off the 8 steps and their progress is saved.' },
      { title: 'A page for every step', text: 'Each step page has a boarding pass, a “Did you complete this step?” check and a turbulence animation.' },
      { title: 'Logo redesign', text: 'A new VimanOne logo alongside the site.' },
    ],
    stack: [
      { layer: 'Framework', tech: 'Next.js 15, React 19, TypeScript' },
      { layer: 'Styling', tech: 'Tailwind CSS' },
      { layer: '3D', tech: 'Three.js, React Three Fiber' },
      { layer: 'Motion', tech: 'GSAP' },
      { layer: 'Hosting', tech: 'Cloudflare' },
      { layer: 'AI tools', tech: 'ChatGPT, Claude, Gemini, Perplexity' },
    ],
    credit: 'Freelance project for a client.',
    links: [
      { label: 'Live site', href: 'https://viman1.com' },
      { label: 'Code on GitHub', href: 'https://github.com/vardhannehru/vimanone-website' },
    ],
  },
  {
    slug: 'futurespark',
    kind: 'case-study',
    title: 'Future Spark',
    subtitle: 'School website · Freelance',
    year: '2026',
    core: ['React 19', 'Google Apps Script', 'Netlify'],
    domain: 'futurespark.in',
    videoUrl: '/projects/futurespark-reel.mp4',
    poster: '/projects/futurespark-thumb.jpg',
    bare: true,
    tint: '#f0a04b',
    overview: [
      'A freelance build for Future Spark International School, a CBSE-affiliated, co-educational school in Kavuri Hills, Hyderabad. I built the whole website and handed it over for the school to run.',
      'It has pages for home, about, academics, admissions, careers and contact, a My Class Board page for the school’s parent portal (diary, homework, attendance and notices), and a photo gallery of event albums that scroll by on their own. Admission enquiries and job applications land straight in a Google Sheet, so there is no server or database to pay for or look after.',
    ],
    highlights: [
      { title: 'Forms straight to a Google Sheet', text: 'Admission enquiries and careers applications go to a Google Apps Script web app, which saves each one as a row in a Google Sheet.' },
      { title: 'Events the school updates itself', text: 'Upcoming events are read from a Google Sheet: staff add a row, and the event shows up on the site.' },
      { title: 'Gallery from Google Drive', text: 'Event albums scroll by on their own. Some ship with the site and others load from Google Drive, and uploading or deleting needs an admin token.' },
      { title: 'Fast and light', text: 'A script compresses every photo (aiming well under 500 KB each), and the site has a sitemap, robots.txt and proper page titles for search.' },
      { title: 'Secrets kept off the page', text: 'Tokens live only in the Apps Script project’s Script Properties, never in the JavaScript that visitors download.' },
      { title: 'Handed over', text: 'It comes with a handover checklist: the GitHub repo, the Netlify site, the Google account that owns the Apps Script projects, Sheet and Drive folder, and the futurespark.in domain.' },
    ],
    flow: {
      title: 'How an enquiry reaches the school',
      steps: [
        { name: 'A parent fills in the form', note: 'On the admissions or contact page, or the careers page for job applications.' },
        { name: 'The site sends it', note: 'The React app posts it to the Apps Script web app, with an optional token.' },
        { name: 'Google Apps Script', note: 'Receives it and adds a row to the Google Sheet.' },
        { name: 'The school reads it', note: 'New enquiries are right there in the sheet, with no admin panel to learn.' },
      ],
    },
    spotlight: {
      title: 'Google as the backend',
      intro: 'Instead of a server and a database, the backend runs on Google’s free tools, which school staff can manage themselves.',
      items: [
        { name: 'Google Apps Script', note: 'Two web apps: one for enquiries, careers and events (ENQUIRY_SHEET.gs), one for the gallery albums (gallery.gs).' },
        { name: 'Google Sheets', note: 'Where form submissions land, and where the events list is kept.' },
        { name: 'Google Drive', note: 'Holds the online photo albums for the gallery.' },
        { name: 'Netlify', note: 'Builds the site from GitHub and hosts it on futurespark.in.' },
      ],
    },
    stack: [
      { layer: 'Framework', tech: 'React 19, TypeScript, Vite 6' },
      { layer: 'Routing', tech: 'React Router 7 (single-page app)' },
      { layer: 'Styling', tech: 'Tailwind CSS' },
      { layer: 'Charts', tech: 'Recharts' },
      { layer: 'Backend', tech: 'Google Apps Script web apps' },
      { layer: 'Data', tech: 'Google Sheets, Google Drive' },
      { layer: 'Hosting', tech: 'Netlify' },
    ],
    credit: 'Freelance project for Future Spark International School.',
    links: [
      { label: 'Live site', href: 'https://futurespark.in' },
      { label: 'Code on GitHub', href: 'https://github.com/vardhannehru/FutureSpark' },
    ],
  },
  {
    slug: 'ev-cost',
    kind: 'project',
    title: 'EV Cost Prediction',
    subtitle: 'Machine Learning',
    year: '2025',
    core: ['Python', 'scikit-learn', 'Regression'],
    domain: 'github.com/vardhannehru',
    videoUrl: '/projects/ev-cost-reel.mp4',
    poster: '/projects/ev-cost-thumb.jpg',
    bare: true,
    tint: '#5aa9e6',
    overview: ['A machine learning project that predicts the cost of electric vehicles with a regression model.'],
    highlights: [],
    stack: [
      { layer: 'Language', tech: 'Python' },
      { layer: 'ML', tech: 'scikit-learn, regression' },
    ],
    links: [{ label: 'Code on GitHub', href: 'https://github.com/vardhannehru/-EV-Cost-Prediction' }],
  },
  // ---- Added from the resume ----
  {
    slug: 'news-digital-agency',
    kind: 'ai',
    title: 'News Digital Agency',
    subtitle: 'Multi-agent system',
    year: '2026',
    core: ['CrewAI', 'OpenAI', 'Python'],
    domain: 'github.com/vardhannehru',
    videoUrl: '/projects/news-agency-reel.mp4',
    poster: '/projects/news-agency-thumb.jpg',
    bare: true,
    tint: '#6dc3a0',
    overview: [
      'A CrewAI crew of specialised agents (a researcher, a writer and an editor) that gathers news on a topic, drafts an article and reviews it for accuracy and tone. A personal / freelance build.',
    ],
    highlights: [
      { title: 'Specialised agents', text: 'A researcher, a writer and an editor, each with its own role, goal and task.' },
      { title: 'Sequential handoffs', text: 'Each agent’s output is passed on as context to the next, so the article moves from research to draft to review.' },
      { title: 'Reviewed before it’s done', text: 'The editor checks every draft for accuracy and tone.' },
    ],
    stack: [
      { layer: 'Agents', tech: 'CrewAI (multi-agent)' },
      { layer: 'LLM', tech: 'OpenAI' },
      { layer: 'Language', tech: 'Python' },
    ],
    credit: 'Personal / freelance project.',
    links: [{ label: 'Code on GitHub', href: 'https://github.com/vardhannehru' }],
  },
  {
    slug: 'shivaji-vidya-peeth',
    kind: 'case-study',
    title: 'Shivaji Vidya Peeth',
    subtitle: 'School website · Freelance',
    year: '2026',
    core: ['Website', 'Freelance', 'Deployed'],
    domain: 'shivajividyapeeth.in',
    videoUrl: '/projects/shivaji-reel.mp4',
    poster: '/projects/shivaji-thumb.jpg',
    bare: true,
    tint: '#e0b24f',
    overview: [
      'A freelance build for Shivaji Vidya Peeth: I built the school’s website and deployed it live.',
    ],
    highlights: [],
    stack: [],
    credit: 'Freelance project for Shivaji Vidya Peeth.',
    links: [
      { label: 'Live site', href: 'https://shivajividyapeeth.in' },
      { label: 'Code on GitHub', href: 'https://github.com/vardhannehru' },
    ],
  },
];

export const LABELS: Record<Kind, string> = { intern: 'Internship · ReveloSoft', ai: 'AI Project', project: 'Project', 'case-study': 'Freelance · Client work', lab: 'In progress' };
export const MONO = "'Bricolage Grotesque', 'Geist', sans-serif"; // the labels' font (was a spaced-out mono)
export const ACCENT = 'var(--accent,#c8b6ff)';

/**
 * A looping muted clip that only loads and plays while it's near the screen (so phones aren't downloading or
 * decoding it off-screen) and while `on` (the TV it's on hasn't been switched off).
 */
export function LazyVideo({ src, className, on = true }: { src: string; className?: string; on?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const onRef = useRef(on);
  onRef.current = on;
  const sync = () => {
    const v = ref.current;
    if (!v) return;
    if (visible.current && onRef.current) v.play().catch(() => {});
    else v.pause();
  };
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        sync();
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(v);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(sync, [on]);
  return <video ref={ref} src={src} loop muted playsInline preload="none" className={className} />;
}

// ---- The retro TV ----

// Fine grain, so the plastic doesn't look like flat CSS.
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")";
// TV static for channel changes.
const STATIC =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='1' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23s)'/></svg>\")";
const TV_KEYFRAMES =
  '@keyframes tvStatic{0%{background-position:0 0}20%{background-position:-50px 30px}40%{background-position:40px -60px}60%{background-position:-70px -20px}80%{background-position:30px 50px}100%{background-position:0 0}}';

/** Clicking a TV control must not also open the card's link. */
const stop = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/** A clickable part of the TV (works with the keyboard too). */
function Control({
  label,
  onPress,
  className = '',
  style,
  pressed,
  children,
}: {
  label: string;
  onPress: () => void;
  className?: string;
  style?: React.CSSProperties;
  pressed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={(e) => {
        stop(e);
        onPress();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          stop(e);
          onPress();
        }
      }}
      className={`relative block shrink-0 cursor-pointer select-none outline-none transition-transform duration-100 active:translate-y-[1px] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[color:var(--accent,#c8b6ff)] ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

const plastic = (light: string, dark: string): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${light}, ${dark})`,
  boxShadow: '0 2px 3px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.25)',
});

export type TVFinish = 'graphite' | 'white';

/** The two TV finishes: dark graphite plastic, and white plastic with lavender parts. */
const FINISHES: Record<
  TVFinish,
  {
    body: string;
    bodyShadow: string;
    grain: number;
    frame: string;
    frameShadow: string;
    button: [string, string];
    buttonDark: [string, string];
    slot: string;
    slotShadow: string;
    slotKey: [string, string];
    ridges: [string, string];
    knobCap: [string, string];
    groove: string;
    grille: string;
    grilleShine: string;
    text: string;
    offKnob: string;
  }
> = {
  graphite: {
    body: 'linear-gradient(180deg, #6e7177 0%, #54575d 7%, #45484d 45%, #383b40 100%)',
    bodyShadow:
      '0 50px 90px -40px rgba(0,0,0,0.95), 0 0 0 1px rgba(0,0,0,0.75), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.55), inset 3px 0 4px rgba(255,255,255,0.07), inset -3px 0 4px rgba(0,0,0,0.3)',
    grain: 0.25,
    frame: 'linear-gradient(180deg, #2a2c30 0%, #1c1e21 100%)',
    frameShadow: 'inset 0 4px 10px rgba(0,0,0,0.85), inset 0 -2px 2px rgba(255,255,255,0.08), 0 1px 0 rgba(255,255,255,0.18), 0 -1px 0 rgba(0,0,0,0.5)',
    button: ['#7a7d83', '#4d5055'],
    buttonDark: ['#5f6268', '#404348'],
    slot: 'linear-gradient(180deg,#1a1c1f,#2e3135)',
    slotShadow: 'inset 0 2px 5px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.12)',
    slotKey: ['#9a9da3', '#62656b'],
    ridges: ['#a3a6ac', '#686b71'],
    knobCap: ['#8d9096', '#55585e'],
    groove: 'rgba(0,0,0,0.5)',
    grille: '#17181b',
    grilleShine: 'rgba(255,255,255,0.1)',
    text: 'rgba(255,255,255,0.4)',
    offKnob: 'radial-gradient(circle at 35% 28%, #9c9aa8 0%, #4b4a57 45%, #24232b 100%)',
  },
  white: {
    body: 'linear-gradient(180deg, #ffffff 0%, #f7f5fc 8%, #ebe7f5 50%, #ddd7ec 100%)',
    bodyShadow:
      '0 50px 90px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(70,55,130,0.35), inset 0 2px 0 rgba(255,255,255,1), inset 0 -4px 8px rgba(90,70,150,0.22), inset 3px 0 4px rgba(255,255,255,0.6), inset -3px 0 4px rgba(90,70,150,0.12)',
    grain: 0.12,
    frame: 'linear-gradient(180deg, #c9c0e6 0%, #b6aada 100%)',
    frameShadow: 'inset 0 4px 10px rgba(60,40,120,0.45), inset 0 -2px 2px rgba(255,255,255,0.5), 0 1px 0 rgba(255,255,255,0.9), 0 -1px 0 rgba(90,70,150,0.25)',
    button: ['#ffffff', '#ddd6ef'],
    buttonDark: ['#e3dcf5', '#c3b7e6'],
    slot: 'linear-gradient(180deg,#a99be0,#c9bff0)',
    slotShadow: 'inset 0 2px 5px rgba(50,30,110,0.45), 0 1px 0 rgba(255,255,255,0.9)',
    slotKey: ['#ffffff', '#ded7f2'],
    ridges: ['#ffffff', '#cdc3ea'],
    knobCap: ['#ffffff', '#e2dbf4'],
    groove: 'rgba(90,70,150,0.25)',
    grille: '#b3a7da',
    grilleShine: 'rgba(255,255,255,0.9)',
    text: 'rgba(70,52,140,0.6)',
    offKnob: 'radial-gradient(circle at 35% 28%, #ffffff 0%, #d9d1f0 50%, #b2a6d8 100%)',
  },
};

/**
 * An old tube TV playing the project, in graphite or white-and-lavender plastic. An inset frame, curved glass,
 * and a working control panel: the glowing knob is the power switch (the picture collapses to a line, then a
 * dot, like a real CRT), the ridged knob and the buttons change channel (a burst of static), and the small knob
 * is the volume.
 */
function RetroTV({ project }: { project: Project }) {
  const F = FINISHES[project.tv ?? 'graphite'];
  const [on, setOn] = useState(true);
  const [noise, setNoise] = useState(false);
  const [channel, setChannel] = useState(0);
  const [volume, setVolume] = useState(0);
  const busy = useRef(false);
  const picture = useAnimationControls();
  const dot = useAnimationControls();
  const noiseTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(noiseTimer.current), []);

  const burst = (ms: number) => {
    setNoise(true);
    window.clearTimeout(noiseTimer.current);
    noiseTimer.current = window.setTimeout(() => setNoise(false), ms);
  };

  const togglePower = async () => {
    if (busy.current) return;
    busy.current = true;
    const flash = 'brightness(2.6) saturate(0.3)';
    if (on) {
      setOn(false);
      // The picture squashes into a bright line, the line shrinks to a dot, and the dot fades.
      await picture.start({ scaleY: 0.008, filter: flash, transition: { duration: 0.16, ease: [0.6, 0, 0.9, 0.4] } });
      dot.set({ opacity: 1, scale: 1 });
      await picture.start({ scaleX: 0, transition: { duration: 0.14, ease: 'easeIn' } });
      picture.set({ opacity: 0 });
      void dot.start({ opacity: 0, scale: 0.2, transition: { duration: 0.7, ease: 'easeOut' } });
    } else {
      setOn(true);
      picture.set({ opacity: 1, scaleX: 0, scaleY: 0.008, filter: flash });
      burst(420);
      await picture.start({ scaleX: 1, transition: { duration: 0.14, ease: 'easeOut' } });
      await picture.start({ scaleY: 1, filter: 'brightness(1) saturate(1)', transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } });
    }
    busy.current = false;
  };

  const changeChannel = (step: number) => {
    setChannel((c) => c + step);
    if (on) burst(380);
  };

  const screenMedia = project.videoUrl ? (
    <LazyVideo src={project.videoUrl} on={on} className="h-full w-full object-cover" />
  ) : project.imageUrl ? (
    <img src={project.imageUrl} alt={project.title} loading="lazy" draggable={false} className="h-full w-full object-cover" />
  ) : (
    <TestCard name={project.title} />
  );

  return (
    <div
      className="relative overflow-hidden rounded-[22px] px-[3.6%] pb-[2.6%] pt-[3.6%] md:rounded-[26px]"
      style={{ background: F.body, boxShadow: F.bodyShadow }}
    >
      <style>{TV_KEYFRAMES}</style>
      {/* Plastic grain */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRAIN, opacity: F.grain }} />

      {/* Inset frame around the glass */}
      <div className="relative rounded-[18px] p-[2.2%] md:rounded-[22px]" style={{ background: F.frame, boxShadow: F.frameShadow }}>
        {/* The glass. Tube-shaped corners; glows in the project's colour while the TV is on. */}
        <div
          className="relative aspect-video w-full overflow-hidden rounded-[9%/14%] bg-[#060708] transition-shadow duration-500"
          style={{
            boxShadow: on
              ? `0 0 40px -6px ${project.tint}66, inset 0 0 0 2px rgba(255,255,255,0.05)`
              : 'inset 0 0 0 2px rgba(255,255,255,0.05)',
          }}
        >
          {/* The picture: what collapses when the TV is switched off. */}
          <motion.div className="absolute inset-0 origin-center" initial={false} animate={picture}>
            {screenMedia}
            {/* Channel static */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-opacity duration-150"
              style={{
                backgroundImage: STATIC,
                backgroundSize: '160px 160px',
                animation: 'tvStatic 0.25s steps(5) infinite',
                opacity: noise ? 0.85 : 0,
              }}
            />
          </motion.div>
          {/* The last dot of light after switching off. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{ boxShadow: '0 0 12px 4px rgba(255,255,255,0.8)' }}
            initial={{ opacity: 0 }}
            animate={dot}
          />
          {/* Glass: scanlines, dark curved edges, and the reflection of the room. Stays when the TV is off. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: on
                ? 'repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px), radial-gradient(130% 130% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'
                : 'radial-gradient(130% 130% at 50% 50%, #15181b 0%, #08090a 70%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(70% 55% at 28% 12%, rgba(255,255,255,0.16), transparent 60%), linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 26%, transparent 40%)',
            }}
          />
        </div>
      </div>

      {/* Control panel */}
      <div className="relative mt-[3%] pt-[2.6%]" style={{ borderTop: `1px solid ${F.groove}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-[3%]">
          <Control label="Channel down" onPress={() => changeChannel(-1)} className="h-[14px] w-[9%] rounded-[4px] md:h-[18px]" style={plastic(...F.button)} />
          <div className="flex flex-1 items-center justify-center gap-[3%]">
            <Control label="Channel up" onPress={() => changeChannel(1)} className="hidden h-[14px] w-[13%] rounded-[4px] sm:block md:h-[18px]" style={plastic(...F.buttonDark)}>
              <span className="absolute left-1/2 top-1/2 h-[3px] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30" />
            </Control>
            {/* Tape slot */}
            <span
              aria-hidden="true"
              className="flex h-[18px] w-[34%] items-center justify-center gap-[10%] rounded-[6px] md:h-[24px]"
              style={{ background: F.slot, boxShadow: F.slotShadow }}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-[6px] w-[10px] rounded-[2px] md:h-[8px] md:w-[13px]" style={plastic(...F.slotKey)} />
              ))}
            </span>
            <Control label="Channel up" onPress={() => changeChannel(1)} className="hidden h-[14px] w-[13%] rounded-[4px] sm:block md:h-[18px]" style={plastic(...F.buttonDark)}>
              <span className="absolute left-1/2 top-1/2 h-[3px] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30" />
            </Control>
          </div>
          {/* Ridged channel knob */}
          <Control
            label="Channel"
            onPress={() => changeChannel(1)}
            className="h-[30px] w-[30px] rounded-full md:h-[40px] md:w-[40px]"
            style={{
              background: `repeating-conic-gradient(from 0deg, ${F.ridges[0]} 0 7deg, ${F.ridges[1]} 7deg 14deg)`,
              boxShadow: '0 3px 5px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.25)',
            }}
          >
            <span
              className="absolute inset-[22%] rounded-full transition-transform duration-300"
              style={{ ...plastic(...F.knobCap), transform: `rotate(${channel * 40}deg)` }}
            >
              <span className="absolute left-1/2 top-[8%] h-[30%] w-[2px] -translate-x-1/2 rounded-full bg-black/45" />
            </span>
          </Control>
          {/* Power knob: glows lavender while the TV is on */}
          <Control
            label={on ? 'Turn the TV off' : 'Turn the TV on'}
            pressed={on}
            onPress={togglePower}
            className="h-[30px] w-[30px] rounded-full md:h-[40px] md:w-[40px]"
            style={{
              background: on ? `radial-gradient(circle at 35% 28%, #ffffffcc 0%, ${ACCENT} 32%, #4b3fb0 100%)` : F.offKnob,
              boxShadow: on
                ? `0 0 18px ${ACCENT}, 0 3px 5px rgba(0,0,0,0.6), inset 0 0 0 3px rgba(255,255,255,0.18)`
                : '0 3px 5px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(255,255,255,0.1)',
              transition: 'background 0.4s, box-shadow 0.4s',
            }}
          />
        </div>

        <div className="mt-[2.4%] flex items-center gap-[4%]">
          {/* Volume knob */}
          <Control
            label="Volume"
            onPress={() => setVolume((v) => v + 1)}
            className="h-[20px] w-[20px] rounded-full md:h-[26px] md:w-[26px]"
            style={{ background: `repeating-conic-gradient(${F.ridges[0]} 0 10deg, ${F.ridges[1]} 10deg 20deg)`, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            <span className="absolute inset-[25%] rounded-full transition-transform duration-300" style={{ ...plastic(...F.knobCap), transform: `rotate(${volume * 50}deg)` }}>
              <span className="absolute left-1/2 top-[6%] h-[34%] w-[2px] -translate-x-1/2 rounded-full bg-black/45" />
            </span>
          </Control>
          {/* Speaker grille */}
          <div aria-hidden="true" className="flex flex-1 flex-col gap-[3px] md:gap-[4px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-[2px] w-full rounded-full md:h-[3px]" style={{ background: F.grille, boxShadow: `0 1px 0 ${F.grilleShine}` }} />
            ))}
          </div>
          {/* Power light */}
          <span className="flex items-center gap-2 text-[10px] font-medium tracking-[-0.01em] md:text-[11px]" style={{ fontFamily: MONO, color: F.text }}>
            <span
              className="h-[6px] w-[6px] rounded-full transition-all duration-300"
              style={{ background: on ? '#ff5a4f' : '#7a4a48', boxShadow: on ? '0 0 8px #ff5a4f' : 'none' }}
            />
            {on ? 'On' : 'Off'}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The project's video or image on a real 3D TV, or on the flat CSS TV if the browser can't do WebGL. */
export function Mockup({ project }: { project: Project }) {
  return (
    <div className="relative">
      {/* Soft coloured glow behind the TV. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[14%] bottom-[8%] top-[18%] opacity-25 blur-[70px] transition-opacity duration-700 group-hover:opacity-50"
        style={{ background: project.tint }}
      />
      <TV3D
        title={project.title}
        videoUrl={project.videoUrl}
        imageUrl={project.imageUrl}
        finish={project.tv}
        fallback={<FlatMockup project={project} />}
      />
    </div>
  );
}

/** The flat CSS TV, tilting toward the cursor. */
export function FlatMockup({ project }: { project: Project }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 140, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 140, damping: 18 });
  const glare = useTransform(
    [mx, my],
    ([x, y]: number[]) => `radial-gradient(60% 60% at ${50 + x * 80}% ${50 + y * 80}%, rgba(255,255,255,0.12), transparent 60%)`
  );

  return (
    <div
      className="relative [perspective:1400px]"
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return; // no tilt while a finger is scrolling
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {/* Soft coloured glow under the window. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[10%] -bottom-6 top-[20%] opacity-30 blur-[70px] transition-opacity duration-700 group-hover:opacity-60"
        style={{ background: project.tint }}
      />
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }} className="relative">
        <RetroTV project={project} />
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] md:rounded-[26px]" style={{ background: glare }} />
      </motion.div>
    </div>
  );
}

/**
 * The test card a channel shows until its video is added (the same card the 3D TV paints, testCard.ts): colour bars
 * in the site's palette and, unless `compact` (the small stills in the channel guide), the programme's name and
 * "Video coming soon". Fills its parent, which must be positioned.
 */
export function TestCard({ name, compact = false }: { name: string; compact?: boolean }) {
  const row = (colors: string[], grow: number) => (
    <div className="flex" style={{ flex: grow }}>
      {colors.map((c, i) => (
        <span key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
  return (
    <div
      role="img"
      aria-label={`${name}: video coming soon`}
      className="absolute inset-0 flex flex-col"
      style={{ containerType: 'inline-size', background: TEST_BASE } as React.CSSProperties}
    >
      {row(TEST_BARS, TEST_BAR_H)}
      {row(TEST_STRIP, TEST_STRIP_H)}
      <div style={{ flex: 1 - TEST_BAR_H - TEST_STRIP_H }} />
      {!compact && (
        <div
          className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-[62%] text-center"
          style={{ background: 'rgba(20,16,27,0.9)', borderRadius: '2.2cqw', padding: '3cqw 3cqw 2.6cqw' }}
        >
          <p className="truncate uppercase leading-none" style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: '7cqw', color: '#FFFFFF' }}>
            {name}
          </p>
          <p className="uppercase" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: '2.2cqw', fontWeight: 600, letterSpacing: '0.3em', marginTop: '1.6cqw', color: '#FED141' }}>
            {TEST_LABEL}
          </p>
        </div>
      )}
    </div>
  );
}

/** "● AI PROJECT · 2026" */
export function KindLabel({ project }: { project: Project }) {
  return (
    <p className="flex items-center gap-2 text-[13px] font-medium tracking-[-0.01em]" style={{ fontFamily: MONO, color: ACCENT }}>
      <span className="h-1.5 w-1.5" style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }} />
      {LABELS[project.kind]} · {project.year}
    </p>
  );
}
