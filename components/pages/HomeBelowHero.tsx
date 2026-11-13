import React from "react";
import AboutSection from "../about/AboutSection";
import ContactSection from "../contact/ContactSection";
import Reveal from "../ui/Reveal";
type Props = {
  isDark: boolean;
  contact: ContactInfo;
};

export default function HomeBelowHero({ isDark, contact }: Props) {
  return (
    <>
      <Reveal delay={0.05}>
        <AboutSection isDark={isDark} />
      </Reveal>

      <Reveal delay={0.05}>
        {/* contact-band: black edge to edge, padding included, in both themes (contactLight.css) */}
        <div id="contact" className="contact-band container mx-auto max-w-5xl px-4 md:px-8 pb-24 pt-24">
          <ContactSection contact={contact} isDark={isDark} />
        </div>
      </Reveal>
    </>
  );
}
