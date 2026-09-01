import { TraceProvider } from "@/lib/traces";
import { Ambient } from "@/components/Ambient";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { Work } from "@/components/Work";
import { Toolbox } from "@/components/Toolbox";
import { Credibility } from "@/components/Credibility";
import { AgentLab } from "@/components/AgentLab";
import { Profile } from "@/components/Profile";
import { Channel } from "@/components/Channel";
import { Footer } from "@/components/Footer";
import { OpticalDefs } from "@/components/Optical";

/**
 * The rhythm matters as much as the sections.
 *
 *   Hero      full-screen, dense, alive
 *   Manifesto near-empty, huge type, silence
 *   Work      full-screen objects that open into blueprints
 *   Toolbox   six sparse floating things
 *   Measured  four numerals and nothing else — silence again
 *   Agent     a compact machine that grows when touched
 *   Profile   editorial, quiet, handwritten
 *   Channel   a console
 *   Footer    almost nothing
 */
export default function Page() {
  return (
    <TraceProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* The substrate. */}
      <div className="atmosphere" aria-hidden="true" />
      <div className="field" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <OpticalDefs />
      <Ambient />

      <Nav />

      <main id="main">
        <Hero />
        <Manifesto />
        <Work />
        <Toolbox />
        <Credibility />
        <AgentLab />
        <Profile />
        <Channel />
      </main>

      <Footer />
    </TraceProvider>
  );
}
