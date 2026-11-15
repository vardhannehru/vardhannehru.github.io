// The certificates in the drawer (CertificateDrawer.tsx). Pictures are in public/certificates/: a small
// `thumb` for the fan and a large `full` for the viewer. Details are as printed on each certificate.

export type Certificate = {
  id: string;
  title: string;
  issuer: string;
  date: string;
  thumb: string;
  full: string;
  /** Width / height of the picture. */
  aspect: number;
  /** A public page that verifies it, when there is one. */
  verify?: string;
  credential?: string;
};

const pic = (id: string) => ({ thumb: `/certificates/${id}-thumb.webp`, full: `/certificates/${id}.webp` });

export const CERTIFICATES: Certificate[] = [
  { id: 'claude-mcp', title: 'Introduction to Model Context Protocol', issuer: 'Anthropic · Claude Academy', date: 'Sep 26, 2026', aspect: 1.4658, ...pic('claude-mcp') },
  { id: 'huggingface-agents', title: 'Fundamentals of Agents', issuer: 'Hugging Face · Agents Course', date: 'Oct 12, 2026', aspect: 1.4144, ...pic('huggingface-agents') },
  { id: 'openai-apply-ai', title: 'Apply AI at Work · Pathway', issuer: 'OpenAI Academy', date: 'Oct 7, 2026', aspect: 1.2941, credential: '196583459', ...pic('openai-apply-ai') },
  { id: 'databricks-genai', title: 'Generative AI Fundamentals', issuer: 'Databricks Academy', date: 'Aug 29, 2026', aspect: 1.2941, ...pic('databricks-genai') },
  { id: 'langchain-langgraph', title: 'Introduction to LangGraph (Python)', issuer: 'LangChain Academy', date: 'Oct 5, 2026', aspect: 1.4151, credential: '6rpv57rnsp', ...pic('langchain-langgraph') },
  {
    id: 'elements-of-ai',
    title: 'Elements of AI',
    issuer: 'University of Helsinki × MinnaLearn',
    date: 'Oct 2, 2026',
    aspect: 1.4144,
    verify: 'https://certificates.mooc.fi/validate/0owj5a2g4lsk',
    ...pic('elements-of-ai'),
  },
  { id: 'langchain-intro', title: 'Introduction to LangChain (Python)', issuer: 'LangChain Academy', date: 'Aug 29, 2026', aspect: 1.4151, credential: 'yfjwifezbe', ...pic('langchain-intro') },
];
