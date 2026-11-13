import React, { useState } from 'react';
import { motion, useScroll, AnimatePresence } from 'motion/react';
import {
  Flame,
  Zap,
  FileAudio,
  Sparkles,
  Music,
  FileMusic,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight,
  Download,
  Volume2,
  Radio,
  Sliders,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Headphones,
  Tv,
  Eye,
  Film,
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (tab: 'forge' | 'audio_to_midi' | 'ai_song' | 'composer' | 'presets') => void;
  currentSongTitle: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, currentSongTitle }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'Is Black MIDI generated here copyrighted for YouTube or streaming?',
      a: 'NO. All MIDIs, audio files, and arrangements synthesized or converted with this tool are 100% free and royalty-free to use anywhere! You can upload them to YouTube, TikTok, Twitch, use them in games or monetize your videos without Content ID strikes. You own your creations.',
    },
    {
      q: 'Will downloading 1,000,000,000 notes crash my browser or computer?',
      a: 'We built a proprietary Chunked Memory Streaming Builder. Unlike traditional MIDI converters that crash the browser when exceeding 100,000 notes, our step-by-step chunker streams binary tracks in safe slices with live percentage logs so you can export multi-million files safely.',
    },
    {
      q: 'Why are Black Notes muted by default?',
      a: 'By default, Black Notes audio is set to "Muted" so your original melody remains crystal clear without turning into a screeching wall of static noise. You can toggle "Black Notes: Audible" anytime with one click in the top navbar if you want the full physical roar of millions of soundfont voices.',
    },
    {
      q: 'How does the Audio to MIDI pitch converter work?',
      a: 'We use the scientific YIN autocorrelation pitch detection algorithm with parabolic sub-semitone interpolation and harmonic spectral peak tracking. It listens to any MP3, WAV, or vocal file and calculates the fundamental frequency in real-time.',
    },
  ];

  return (
    <div className="relative flex flex-col gap-14 pb-20 text-zinc-100">
      {/* Scroll Progress Bar at very top */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 origin-left z-50 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
      />

      {/* Atmospheric Background with User's Uploaded Black MIDI Waterfall */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
        <img
          src="/assets/aistudio/image_108b831d.png"
          alt="Black MIDI Waterfall Background"
          className="w-full h-full object-cover object-top opacity-20 filter contrast-125 saturate-125"
        />
        {/* Dark Vignettes & Gradients for Crisp Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-black/80 to-black" />
      </div>

      {/* 1. HERO SECTION WITH SCROLL MOTION */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-950/90 via-red-950/20 to-black/95 border border-red-900/60 p-6 sm:p-12 shadow-2xl shadow-red-950/50 backdrop-blur-md"
      >
        {/* Background glow effects */}
        <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -z-10 w-72 h-72 bg-rose-700/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/90 border border-red-700/70 shadow-lg shadow-red-950/60"
          >
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-red-300">
              The Tough Black MIDI Engine • Up to 1,000,000,000 Notes
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight uppercase font-sans"
          >
            CREATE INSANE <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-amber-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.55)]">BLACK MIDI</span> SPECTACLES
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed"
          >
            The all-in-one brutal workstation for extreme MIDI densification, YIN pitch audio-to-MIDI conversion, and full 3-minute AI orchestral arrangements. Built for visual piano rolls, DAW stress tests, and viral YouTube visualizers.
          </motion.p>

          {/* Primary Call to Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <button
              onClick={() => onNavigate('forge')}
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm tracking-wide uppercase shadow-2xl shadow-red-600/40 hover:shadow-red-500/60 transition active:scale-95 flex items-center gap-3 border border-red-400/40 cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-white text-white group-hover:scale-110 transition" />
              <span>Get Started • Enter Forge</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </button>

            <button
              onClick={() => onNavigate('ai_song')}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-red-950/90 to-zinc-900 hover:from-red-900 hover:to-zinc-850 text-amber-200 hover:text-white font-bold text-sm border border-red-500/50 shadow-lg shadow-red-950/40 transition flex items-center gap-2.5 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-red-400" />
              <span>AI Song Variation</span>
            </button>

            <button
              onClick={() => onNavigate('audio_to_midi')}
              className="px-6 py-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-sm border border-zinc-700 hover:border-red-500/60 shadow-lg transition flex items-center gap-2.5 active:scale-95 cursor-pointer"
            >
              <FileAudio className="w-4 h-4 text-red-400" />
              <span>Audio to MIDI (MP3)</span>
            </button>
          </motion.div>

          {/* Visual Showcase Card with User's Uploaded Black MIDI Waterfall */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="w-full mt-4 rounded-2xl overflow-hidden border-2 border-red-600/50 shadow-2xl shadow-red-950/80 group relative"
          >
            <div className="relative aspect-[16/8] sm:aspect-[21/9] w-full overflow-hidden bg-black">
              <img
                src="/assets/aistudio/image_108b831d.png"
                alt="Black MIDI Piano Roll Waterfall Showcase"
                className="w-full h-full object-cover object-center group-hover:scale-102 transition duration-700"
              />
              {/* Subtle gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
              
              {/* Overlay Badge */}
              <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-red-400" />
                  <span className="font-mono text-zinc-200 font-bold">
                    Visual Piano Roll Waterfall Rendering (Synthesia / Piano From Above)
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('forge')}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 transition"
                >
                  <span>Forge This Now</span>
                  <Zap className="w-3 h-3 fill-white" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Trust & Spec Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full pt-4 border-t border-red-950/80"
          >
            <div className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-lg font-black text-red-400">1,000,000,000</span>
              <span className="text-[11px] font-mono text-zinc-400 uppercase">Max Polyphony</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-lg font-black text-emerald-400">100% FREE</span>
              <span className="text-[11px] font-mono text-zinc-400 uppercase">YouTube Copyright Safe</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-lg font-black text-rose-400">YIN Pitch</span>
              <span className="text-[11px] font-mono text-zinc-400 uppercase">MP3/WAV Converter</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-lg font-black text-amber-400">16-Channel</span>
              <span className="text-[11px] font-mono text-zinc-400 uppercase">Synthesia Palettes</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* 2. WHAT THE TOOL DOES (WITH SCROLL MOTION) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white">
              What This Tool Does
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">
            Black MIDI AI Forge is a specialized high-performance engine engineered for musicians, content creators, and MIDI enthusiasts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-zinc-950/90 border border-red-900/40 hover:border-red-600/60 transition flex flex-col gap-3 group backdrop-blur-sm"
          >
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400 w-fit group-hover:scale-105 transition">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              1. Multi-Million Polyphony
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Feed any standard MIDI and explode it into massive cascades with up to 1,000,000,000 notes. Features 1/128th tremolos, fractal waterfalls, and sub-bass anchors.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-zinc-950/90 border border-red-900/40 hover:border-red-600/60 transition flex flex-col gap-3 group backdrop-blur-sm"
          >
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400 w-fit group-hover:scale-105 transition">
              <FileAudio className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              2. Audio to MIDI Pitch
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Import vocals, guitar riffs, synths, or any MP3 file. The YIN Pitch and Spectral Harmonics engines transcribe exact pitch notes directly in the browser into Black MIDI.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-zinc-950/90 border border-red-900/40 hover:border-red-600/60 transition flex flex-col gap-3 group backdrop-blur-sm"
          >
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400 w-fit group-hover:scale-105 transition">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              3. Full AI Song Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate 3-minute Black MIDI symphonies across 7 genres (Cyber Rush, Dark Fantasy, Anime Battle, Gothic) with structured intros, buildups, and drops.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-zinc-950/90 border border-red-500/50 hover:border-red-400 transition flex flex-col gap-3 group backdrop-blur-sm shadow-lg shadow-red-950/40"
          >
            <div className="p-3 rounded-xl bg-red-600/20 border border-red-500/40 text-amber-300 w-fit group-hover:scale-105 transition">
              <Sparkles className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-amber-200 uppercase tracking-wider">
              4. AI Song Variation & Masterpiece Art
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Seamlessly toggle between the original song and AI-composed thematic variations. Sculpt harmonized real geometric piano roll art (Mandalas, Angel Wings, Lightning Stairs).
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* 3. COPYRIGHT & YOUTUBE SECTION (KEY USER REQUIREMENT) */}
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl bg-gradient-to-r from-red-950/60 via-zinc-950 to-zinc-950 border-2 border-emerald-500/50 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-sm"
      >
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex-shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black uppercase tracking-wide text-white">
                100% Free For YouTube, Streaming & Commercial Content
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NO COPYRIGHT
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
              <strong>Is this tool copyrighted for YouTube?</strong> Absolutely <strong>not</strong>. Every MIDI file, transcribed track, and Black MIDI export generated with this tool is completely copyright-free and royalty-free. You can render it in Synthesia or Piano From Above, post it on YouTube, monetize your channel, stream it on Twitch, or use it in video games without risk of Content ID strikes.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('forge')}
          className="flex-shrink-0 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-zinc-950" />
          <span>Start Creating Free</span>
        </button>
      </motion.section>

      {/* 4. HOW THE TOOL WORKS (WITH STAGGERED MOTION) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white">
              How The Engine Works
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Advanced algorithmic music theory paired with client-side binary streaming.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: 'STEP 01',
              title: 'Harmonic Analysis',
              desc: 'Detects musical key signature using Krumhansl-Schmuckler profiles, locates harmonic roots, and isolates dense climax segments from soft interludes.',
            },
            {
              step: 'STEP 02',
              title: 'Integral Note Spacing',
              desc: 'Distributes up to 1 Billion notes proportionally across the song timeline so note density matches the track\'s musical energy—no awkward blank sections or end-of-track note spamming.',
            },
            {
              step: 'STEP 03',
              title: 'Sub-Bass & Visual Art',
              desc: 'Injects heavy sub-bass anchors (MIDI 21 to 38) and patterns (Angel Wings, Staircases, Diamond Bursts) into dedicated MIDI channels.',
            },
            {
              step: 'STEP 04',
              title: 'Chunked Memory Streamer',
              desc: 'Constructs the binary Standard MIDI (.mid) file in memory-safe 50,000-note chunks with 16 colored tracks ready for Synthesia and FL Studio.',
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-2.5 backdrop-blur-sm"
            >
              <span className="text-xs font-mono font-bold text-red-400">{item.step}</span>
              <h4 className="text-sm font-bold text-white uppercase">{item.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 5. WHAT YOU CAN DO WITH IT & WHEN IT IS USEFUL (WITH MOTION) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* What you can do */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 flex flex-col gap-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-black uppercase text-white tracking-wide">
              What You Can Do With It
            </h3>
          </div>
          <ul className="flex flex-col gap-3 text-xs text-zinc-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span><strong>Render viral visualizer videos:</strong> Produce eye-catching waterfall sheets of notes for Synthesia, Piano From Above, and 3D MIDI visualizers.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span><strong>Stress test your sound engine:</strong> Push soundfonts, DAW polyphony limits, and CPU audio buffers to their maximum breaking point.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span><strong>Convert hummed voice or audio clips:</strong> Record or upload any vocal riff or guitar lead and generate an instant MIDI sequence.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span><strong>Remix your favorite songs:</strong> Import Rush E, Bad Apple, Megalovania, or your own original tracks and multiply note count by up to 150x.</span>
            </li>
          </ul>
        </motion.div>

        {/* When it is useful */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 flex flex-col gap-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-black uppercase text-white tracking-wide">
              When It Is Useful
            </h3>
          </div>
          <ul className="flex flex-col gap-3 text-xs text-zinc-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span><strong>Content Creators:</strong> When you need visually mesmerizing piano roll clips for YouTube Shorts, TikTok, or full video features.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span><strong>Soundfont Developers:</strong> When evaluating how soundfonts respond to massive note bursts and rapid polyphony voice recycling.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span><strong>Music Producers:</strong> Adding microtonal ratchets, hyper-dense glissandos, and harmonic sub-bass walls to EDM or metal drops.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span><strong>Audio Transcription:</strong> When you have an audio stem or MP3 recording and want to pull out the melody notes without paid plugins.</span>
            </li>
          </ul>
        </motion.div>
      </motion.section>

      {/* 6. BLACK MIDI TIPS FOR BEGINNERS (WITH MOTION) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-red-950/40 via-zinc-950/90 to-black border border-red-800/40 flex flex-col gap-6 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-white tracking-wide">
              Black MIDI Pro Tips for Beginners
            </h3>
            <p className="text-xs text-zinc-400">
              Essential advice to playback and render multi-million note files smoothly without crashing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              tip: 'TIP 1: Best MIDI Players',
              title: 'Use Piano From Above or Synthesia',
              desc: 'Standard Windows Media Player will crash on Black MIDI. Use Piano From Above (PFA) or Synthesia. They are optimized to render millions of falling notes at 60+ FPS.',
            },
            {
              tip: 'TIP 2: High-Polyphony Soundfonts',
              title: 'Install OmniMIDI Driver',
              desc: 'On Windows, install OmniMIDI (formerly Keppy\'s Synthesizer). Pair it with lightweight soundfonts like Keppy\'s Steinway Piano or Arachno SoundFont for lag-free audio.',
            },
            {
              tip: 'TIP 3: Keep Black Notes Muted',
              title: 'Protect The Melody',
              desc: 'Our engine mutes black notes audio by default. This ensures the visual artwork looks like a black cloud of notes, but your ears hear the clean original song melody rather than harsh noise!',
            },
            {
              tip: 'TIP 4: Multi-Channel Colors',
              title: 'Rainbow vs Crimson Hellfire',
              desc: 'In the Forge, select Synthesia Rainbow or Crimson Hellfire. Each channel will output on a separate MIDI channel (0-15), painting your visualizer with vibrant multicolored layers.',
            },
            {
              tip: 'TIP 5: Avoid File Overflows',
              title: 'Automatic Track Chunking',
              desc: 'Standard MIDI tracks max out at 65,535 bytes per event chunk. Our engine automatically divides massive channels into parallel sub-tracks, guaranteeing full standard compliance across all DAWs.',
            },
            {
              tip: 'TIP 6: Real-time Audio Preview',
              title: 'Browser Polyphony Safety',
              desc: 'Your browser\'s built-in Web Audio synth renders up to 35,000 notes smoothly in preview. The full multi-million file is exported as a standard .mid file for playback on desktop renderers.',
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2"
            >
              <span className="text-xs font-mono font-bold text-red-400">{item.tip}</span>
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (WITH MOTION) */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-xl font-black uppercase text-white tracking-wide">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="flex flex-col gap-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-zinc-950/90 border border-zinc-800 overflow-hidden transition"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-zinc-900/50 transition gap-4 cursor-pointer"
                >
                  <span className="text-sm font-bold text-zinc-100">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900 bg-zinc-950/80">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* 8. BOTTOM GET STARTED BANNER (WITH MOTION) */}
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl bg-gradient-to-r from-red-950 via-zinc-950 to-red-950 border border-red-700/60 p-8 sm:p-12 text-center flex flex-col items-center gap-6 shadow-2xl shadow-red-950/60 backdrop-blur-sm"
      >
        <div className="p-3.5 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/50 animate-bounce">
          <Flame className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2 max-w-xl">
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
            Ready to Forge Your Masterpiece?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Choose from preset classics like Rush E, import your own MIDI, convert an MP3 stem, or generate a 3-minute AI symphony now.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('forge')}
            className="px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider shadow-2xl shadow-red-600/50 transition active:scale-95 flex items-center gap-2.5 cursor-pointer"
          >
            <Zap className="w-5 h-5 fill-white" />
            <span>Launch Black MIDI Forge</span>
          </button>

          <button
            onClick={() => onNavigate('audio_to_midi')}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-red-950 to-zinc-900 hover:from-red-900 hover:to-zinc-800 text-amber-200 hover:text-white font-bold text-sm uppercase tracking-wider border border-red-500/50 shadow-lg shadow-red-950/40 transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <FileAudio className="w-4 h-4 text-red-400" />
            <span>Audio to MIDI (MP3)</span>
          </button>

          <button
            onClick={() => onNavigate('presets')}
            className="px-6 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-sm uppercase tracking-wider border border-zinc-700 transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <FileMusic className="w-4 h-4 text-red-400" />
            <span>Preset Classics</span>
          </button>
        </div>
      </motion.section>
    </div>
  );
};
