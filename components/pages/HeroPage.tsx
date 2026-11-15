import PortfolioHero from '../hero/portfolio-hero';

// The hero on its own page (/hero): the name and the stickers, with nothing below it.
// The home page keeps its own hero, so this is a separate, standalone screen.

type Props = {
  isDark: boolean;
};

export default function HeroPage({ isDark }: Props) {
  return (
    <div className="bg-[#07040f] min-h-screen">
      <PortfolioHero isDark={isDark} />
    </div>
  );
}
