import React from "react";
import AboutSection from "../about/AboutSection";
import ContactSection from "../contact/ContactSection";
import Reveal from "../ui/Reveal";
type Props = {
  isDark: boolean;
  contact: ContactInfo;
};

export default function AboutBelowHero({ isDark, contact }: Props) {
  return (
    <div className="pb-24 pt-24 space-y-16">
      <Reveal>
        <header className="container mx-auto max-w-5xl px-4 md:px-8 space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">About</h1>
          <p className="text-gray-600 dark:text-zinc-400">
            A little more about me, my work, and how to reach me.
          </p>
        </header>
      </Reveal>

      {/* Full width, like on the home page: the About section centres its own content, and its tape band runs
          edge to edge across the screen (inside the narrow box above it was cut off at the box's sides). */}
      <Reveal delay={0.05}>
        <AboutSection isDark={isDark} />
      </Reveal>

      <Reveal delay={0.1}>
        <div id="contact" className="container mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Get in touch</h2>
          <ContactSection contact={contact} isDark={isDark} />
        </div>
      </Reveal>
    </div>
  );
}
