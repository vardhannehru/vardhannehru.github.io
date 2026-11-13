
import React, { forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';
import { Palette, Code, Globe, Layout, Cpu, Award, Cloud, Terminal, Shield, Database, Bot, Layers, FileCode, ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import TiltedCard from '../ui/TiltedCard';
import Reveal from '../ui/Reveal';
import AsciiPortrait from './AsciiPortrait';
import AboutCollage from './AboutCollage';
import CertificateFolder from '../certificates/CertificateFolder';
import CertificateStack from '../certificates/CertificateStack';
import CertificateDrawer from '../certificates/CertificateDrawer';

// How the certifications are shown: 'drawer' (a 3D filing-cabinet drawer that opens as you scroll and hands out the
// certificates, CertificateDrawer), 'stack' (big cards dealt in from the sides as you scroll, CertificateStack),
// 'folder' (a folder of cards that fan out, CertificateFolder), or 'grid' (the earlier grid of cards).
const CERT_LAYOUT = 'drawer' as 'drawer' | 'stack' | 'folder' | 'grid';

// The collage About page (true), or the earlier ASCII portrait hero (false).
const SHOW_COLLAGE = true;

interface AboutSectionProps {
  isDark: boolean;
}

// Your resume PDF, served from the project's public folder (it was previously pointing at a certificate).
const RESUME_URL = "/about/resume.pdf";

// A reusable glass-morphism card component
const AestheticCard = ({ children, className, delay = 0 }: { children?: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, delay, type: "spring", stiffness: 50, damping: 20 }}
    className={cn(
      "relative overflow-hidden",
      "bg-white/60 dark:bg-zinc-900/60", // Translucent base
      "backdrop-blur-xl", // Heavy blur for glass effect
      "border border-white/40 dark:border-white/10", // Crisp border
      "group hover:bg-white/80 dark:hover:bg-zinc-900/80 transition-colors duration-500",
      className
    )}
  >
    {/* Subtle Sheen Gradient (disabled in dark mode for pure black) */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-transparent dark:via-transparent dark:to-transparent opacity-100 pointer-events-none" />
    
    <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col">
      {children}
    </div>
  </motion.div>
);

const AboutSection = forwardRef<HTMLElement, AboutSectionProps>(({ isDark }, ref) => {
  const sectionRef = useRef(null);
  
  const certifications: {
    title: string;
    issuer: string;
    date: string;
    id: string;
    color: string;
    bg: string;
    icon: any;
    link?: string;
    image?: string;
  }[] = [
    {
      title: "Model Context Protocol",
      issuer: "Anthropic",
      date: "Certified",
      id: "MCP",
      color: "text-orange-400",
      bg: "bg-orange-500/5",
      icon: Layers,
    },
    {
      title: "Claude Code 101",
      issuer: "Anthropic",
      date: "Certified",
      id: "Course",
      color: "text-orange-400",
      bg: "bg-orange-500/5",
      icon: Terminal,
    },
    {
      title: "LangChain & LangGraph",
      issuer: "LangChain Academy",
      date: "Certified",
      id: "Course",
      color: "text-emerald-400",
      bg: "bg-emerald-500/5",
      icon: Bot,
    },
    {
      title: "Generative AI",
      issuer: "Databricks",
      date: "Certified",
      id: "Course",
      color: "text-red-400",
      bg: "bg-red-500/5",
      icon: Sparkles,
    },
    {
      title: "OpenAI Academy Pathway",
      issuer: "AI Foundations · Agents · Apply AI at Work",
      date: "Certified",
      id: "Pathway",
      color: "text-green-400",
      bg: "bg-green-500/5",
      icon: Cpu,
    },
    {
      title: "AI Agents Fundamentals",
      issuer: "Hugging Face",
      date: "Certified",
      id: "Course",
      color: "text-yellow-400",
      bg: "bg-yellow-500/5",
      icon: Bot,
    },
    {
      title: "Building AI Agents",
      issuer: "MongoDB",
      date: "Certified",
      id: "Course",
      color: "text-green-500",
      bg: "bg-green-500/5",
      icon: Database,
    },
    {
      title: "Prompt Engineering",
      issuer: "Amazon",
      date: "Certified",
      id: "Course",
      color: "text-amber-500",
      bg: "bg-amber-500/5",
      icon: Cloud,
    },
    {
      title: "Elements of AI",
      issuer: "University of Helsinki",
      date: "Certified",
      id: "Course",
      color: "text-sky-400",
      bg: "bg-sky-500/5",
      icon: Globe,
    },
    {
      title: "Salesforce AI Associate",
      issuer: "Salesforce",
      date: "2024",
      id: "Credential",
      color: "text-blue-500",
      bg: "bg-blue-500/5",
      icon: Cloud,
      link: "https://drive.google.com/file/d/1u49WURBDKuibnpo5djNJ7pJSt0DnbHUu/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/1u49WURBDKuibnpo5djNJ7pJSt0DnbHUu"
    },
    {
      title: "Blue Prism Associate",
      issuer: "Blue Prism",
      date: "2024",
      id: "Developer",
      color: "text-violet-500",
      bg: "bg-violet-500/5",
      icon: Bot,
      link: "https://drive.google.com/file/d/1qQSLw9SabdfnOsV35xMNrQkmyjMbULjG/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/1qQSLw9SabdfnOsV35xMNrQkmyjMbULjG"
    },
    {
      title: "Blue Prism Foundation",
      issuer: "Blue Prism",
      date: "2024",
      id: "Training",
      color: "text-violet-500",
      bg: "bg-violet-500/5",
      icon: Bot,
      link: "https://drive.google.com/file/d/13JZEL3vRy2GZle7GC4e5u_dfv86MUIsi/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/13JZEL3vRy2GZle7GC4e5u_dfv86MUIsi"
    },
    {
      title: "Alteryx Designer Core",
      issuer: "Alteryx",
      date: "2024-2026",
      id: "Certification",
      color: "text-yellow-500",
      bg: "bg-yellow-500/5",
      icon: Database,
      link: "https://drive.google.com/file/d/1IjCJFpDPa2nAoS0ir4RvX-NJGEGtOntc/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/1IjCJFpDPa2nAoS0ir4RvX-NJGEGtOntc"
    },
    {
      title: "Cybersecurity Essentials",
      issuer: "Cisco NetAcad",
      date: "2024",
      id: "Course",
      color: "text-teal-500",
      bg: "bg-teal-500/5",
      icon: Shield,
      link: "https://drive.google.com/file/d/18ikcxam26_ALIyQAHi9lXm32xgxEzrkd/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/18ikcxam26_ALIyQAHi9lXm32xgxEzrkd"
    },
    {
      title: "Intro to Cybersecurity",
      issuer: "Cisco",
      date: "2024",
      id: "Course",
      color: "text-green-500",
      bg: "bg-green-500/5",
      icon: Shield,
      link: "https://drive.google.com/file/d/1YIPUwq2xBTcwVzd4ADtq3CUzI6oTOLCh/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/1YIPUwq2xBTcwVzd4ADtq3CUzI6oTOLCh"
    },
    {
      title: "Salesforce Developer",
      issuer: "SmartInternz",
      date: "2023",
      id: "Internship",
      color: "text-sky-500",
      bg: "bg-sky-500/5",
      icon: Cloud,
      link: "https://drive.google.com/file/d/1vsqziUei42JvrjT-u7kFBzHLCwDMswwr/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/1vsqziUei42JvrjT-u7kFBzHLCwDMswwr"
    },
    {
      title: "Machine Learning with Python",
      issuer: "IBM",
      date: "2024",
      id: "ML0101EN",
      color: "text-violet-500",
      bg: "bg-violet-500/5",
      icon: Cpu,
      link: "https://drive.google.com/file/d/1fQRD0eCq6SMqU-SAow-7QhAik8BRVYDS/view?usp=sharing",
      image: "https://lh3.googleusercontent.com/d/1fQRD0eCq6SMqU-SAow-7QhAik8BRVYDS"
    }
  ];

  return (
    // data-pencil-zone: the cursor becomes a 3D pencil here (components/about/pencil/PencilCursor.tsx).
    <section
      id="about"
      ref={ref}
      data-pencil-zone
      className={cn(
        "relative w-full",
        // Force pure black background in dark mode (kills any underlying glow). Summer Green in the pastel theme.
        "bg-[#07040f] pastel-green"
      )}
      // Clipped sideways only (not overflow-hidden): hidden overflow would stop the certificate cards pinning as
      // you scroll, and clipping still hides the cards waiting off to the sides.
      style={{ overflowX: 'clip' }}
    >
      
      {/* Ambient Background Gradients removed in light mode (neutral white/gray only) */}

      {/* Part 1: the collage page (AboutCollage), or the earlier ASCII portrait hero when SHOW_COLLAGE is off */}
      {SHOW_COLLAGE ? <AboutCollage resumeUrl={RESUME_URL} /> : (
      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-28 md:pt-32 z-10">
        <div className="relative flex flex-col md:flex-row md:justify-between md:items-start md:gap-10 md:min-h-[min(92vh,820px)] md:pt-8 md:pb-[clamp(3.4rem,15.75vw,12.75rem)]">

          {/* Front layer: portrait + giant name (click-through so the details stay usable) */}
          <div className="relative order-1 h-[440px] sm:h-[560px] md:h-auto md:absolute md:inset-0 md:z-0 pointer-events-none">
            {/* The ASCII portrait sits behind the name, at the name's width and baseline */}
            <AsciiPortrait />

            <motion.h2
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-0 translate-y-[6%] text-center font-semibold tracking-tighter leading-[0.8] text-white select-none whitespace-nowrap text-[clamp(3rem,12.5vw,10.5rem)]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              AI Engineer
            </motion.h2>
          </div>

          {/* Back layer: details, left */}
          <Reveal className="order-2 relative z-10 mt-10 md:mt-0 md:w-[30%]" y={24}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium tracking-wide text-zinc-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8b6ff]" />
              About me
            </div>
            <h3 className="text-3xl md:text-[2rem] lg:text-4xl font-medium leading-tight text-zinc-100">
              <span className="text-zinc-500">Hello, I'm Vardhan.</span>
              <br />
              I build <span className="text-[#c8b6ff]">intelligent AI systems</span> that solve{' '}
              <span className="text-[#b69df8]">real-world problems</span>.
            </h3>
          </Reveal>

          {/* Back layer: details, right */}
          <Reveal className="order-3 relative z-10 ml-auto mt-8 w-[60%] md:mt-0 md:w-[30%]" delay={0.08} y={24}>
            <p className="text-zinc-400 leading-relaxed text-sm lg:text-base mb-8">
              AI Engineer with a B.Tech in Computer Science (AI & ML) and six months of internship experience building LLM agents and RAG applications on OpenAI and Microsoft Azure. Contributed to TomandJerry.ai, a two-agent platform covering candidate profiling, CV generation, mock interviews and AI-led hiring screens, and built ReveloSoft's enterprise RAG chatbot. Hands-on with LangChain, CrewAI, Model Context Protocol (MCP) and ElevenLabs voice agents; certified in MCP (Anthropic), Generative AI (Databricks) and LangChain & LangGraph (LangChain Academy).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={RESUME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-[#c8b6ff] text-black text-sm font-bold transition-transform hover:scale-105 flex items-center gap-2"
              >
                View Resume <ArrowUpRight size={16} />
              </a>
              <div className="px-5 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse bg-green-500" />
                Open to Work
              </div>
            </div>
          </Reveal>
        </div>
      </div>
      )}

      <div ref={sectionRef} className="w-full pb-32 pt-16 md:pt-24 relative z-10">

        {/* 5. Certifications: the scroll stack (CertificateStack), the folder showcase (CertificateFolder), or the earlier grid (see CERT_LAYOUT) */}
        {CERT_LAYOUT === 'drawer' ? <CertificateDrawer /> : CERT_LAYOUT === 'stack' ? <CertificateStack /> : CERT_LAYOUT === 'folder' ? <CertificateFolder /> : (
        <div className="relative px-4 md:px-8 max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12 border-b border-gray-200 dark:border-zinc-800 pb-6">
               <div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Certifications</h3>
                  <p className="text-gray-500 dark:text-gray-400">Verified credentials & verified skills.</p>
               </div>
               <Award className="w-8 h-8 text-gray-300 dark:text-gray-700 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {certifications.map((cert, idx) => {
                 // Render card content
                 const CardContent = (
                    <TiltedCard
                        containerHeight="220px"
                        containerWidth="100%"
                        imageHeight="100%"
                        imageWidth="100%"
                        rotateAmplitude={5}
                        scaleOnHover={1.05}
                        showMobileWarning={false}
                        showTooltip={false}
                        displayOverlayContent={true}
                        overlayContent={
                            <div className="flex flex-col h-full p-6 relative z-10 justify-between">
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-3 rounded-2xl backdrop-blur-md bg-white/90 dark:bg-black/50 shadow-sm")}>
                                        <cert.icon className={cn("w-6 h-6", isDark ? cert.color : "text-gray-700")} />
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/5">
                                       <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 tracking-wider">{cert.date}</span>
                                    </div>
                                </div>
                                <div>
                                    <h5
                                      className={cn(
                                        "text-lg font-bold leading-tight mb-1 transition-colors flex items-center gap-1",
                                        isDark
                                          ? "text-white group-hover:text-blue-500"
                                          : "text-gray-900 group-hover:text-gray-700"
                                      )}
                                    >
                                        {cert.title}
                                        {cert.link && <ArrowUpRight className="w-4 h-4 opacity-50" />}
                                    </h5>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">{cert.issuer}</p>
                                    <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-zinc-700 group-hover:w-full transition-all duration-500" />
                                </div>
                            </div>
                        }
                        className={cn(
                          "rounded-3xl border shadow-sm group hover:shadow-xl transition-all",
                          isDark
                            ? "bg-zinc-900 border-zinc-800"
                            : "bg-white border-gray-200"
                        )}
                    >
                       {/* Background Image if exists */}
                       {cert.image && (
                         <div className="absolute inset-0 z-0">
                            <img 
                              src={cert.image} 
                              alt={cert.title} 
                              className="w-full h-full object-cover opacity-30 group-hover:opacity-60 transition-opacity duration-500" 
                            />
                            {/* Gradient overlay to ensure text readability */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/50 to-transparent dark:from-black/80 dark:via-black/50 dark:to-transparent" />
                         </div>
                       )}

                       {/* Card Background Decoration */}
                       <div
                         className={cn(
                           "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                           isDark ? cert.bg.replace('/5', '/20') : "bg-gray-500/10"
                         )}
                       />
                       <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-gradient-to-br from-gray-100 to-transparent dark:from-transparent dark:to-transparent opacity-50 blur-2xl pointer-events-none" />
                    </TiltedCard>
                 );

                 return (
                   <motion.div
                     key={idx}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: idx * 0.05, duration: 0.5 }}
                   >
                     {cert.link ? (
                        <a href={cert.link} target="_blank" rel="noopener noreferrer" className="block h-full cursor-pointer">
                           {CardContent}
                        </a>
                     ) : (
                        <div className="block h-full">
                           {CardContent}
                        </div>
                     )}
                   </motion.div>
                 );
              })}
            </div>
        </div>
        )}

      </div>
    </section>
  );
});

export default AboutSection;
