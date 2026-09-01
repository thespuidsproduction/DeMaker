import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { Disciplines } from "@/components/Disciplines";
import { Projects } from "@/components/Projects";
import { Credibility } from "@/components/Credibility";
import { AgentLab } from "@/components/AgentLab";
import { Profile } from "@/components/Profile";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { OpticalDefs } from "@/components/Optical";

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* The substrate: a measured field and a film of grain beneath the glass. */}
      <div className="atmosphere" aria-hidden="true" />
      <div className="field" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <OpticalDefs />

      <Nav />

      <main id="main">
        <Hero />
        <Manifesto />
        <Disciplines />
        <Projects />
        <Credibility />
        <AgentLab />
        <Profile />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
