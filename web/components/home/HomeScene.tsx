'use client';
import type { Appearance } from '@nizhal/shared';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';

/**
 * Foreground of the title screen: we look out from a Kerala veranda (poomukham)
 * — tiled eave above, carved wooden pillars at the sides, red-oxide floor — onto
 * the rainy town. Two villagers wait on the veranda; in the right-hand corner a
 * third stands in the dark, and the lamp throws their shadow on the wall… with
 * cat ears.
 */

const LEFT_VILLAGER: Appearance = { body: 'girl', skin: 2, hair: 0, hairColor: 0, top: 3, topStyle: 'raincoat', bottom: 7, footwear: 'sandals', accessory: 'umbrella' };
const RIGHT_VILLAGER: Appearance = { body: 'boy', skin: 1, hair: 2, hairColor: 1, top: 8, topStyle: 'tshirt', bottom: 6, footwear: 'shoes', accessory: 'cap' };
const LURKER: Appearance = { body: 'boy', skin: 3, hair: 1, hairColor: 0, top: 6, topStyle: 'shirt', bottom: 6, footwear: 'sandals', accessory: 'none' };

function Pillar({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      className={`absolute bottom-0 top-0 w-[3.2vw] min-w-4 max-w-12 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{
        background:
          'linear-gradient(90deg, #2a170c 0%, #5b3419 22%, #7a4a26 45%, #5b3419 70%, #24130a 100%)',
        boxShadow: side === 'left' ? '6px 0 18px rgba(0,0,0,.55)' : '-6px 0 18px rgba(0,0,0,.55)',
      }}
    >
      {/* carved rings */}
      {[18, 46, 74].map((top) => (
        <div key={top} className="absolute inset-x-0 h-3" style={{ top: `${top}%`, background: 'linear-gradient(180deg,#8a5a30,#3a200f)' }} />
      ))}
    </div>
  );
}

export function HomeScene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Tiled eave */}
      <div className="absolute inset-x-0 top-0 h-[6vh] min-h-7" style={{ background: 'repeating-linear-gradient(90deg,#7a2f22 0 26px,#6e2a1e 26px 28px),linear-gradient(#8f3f2a,#5a2317)', backgroundBlendMode: 'multiply', boxShadow: '0 8px 22px rgba(0,0,0,.6)' }}>
        <div className="absolute inset-x-0 bottom-0 h-2.5" style={{ background: 'linear-gradient(180deg,#6b4225,#2e1a0c)' }} />
        <div className="absolute inset-x-0 -bottom-3 flex justify-around">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="h-3 w-2 rounded-b-full bg-[#2e1a0c]" />
          ))}
        </div>
      </div>

      <Pillar side="left" />
      <Pillar side="right" />

      {/* Red-oxide veranda floor */}
      <div className="absolute inset-x-0 bottom-0 h-[13vh] min-h-12" style={{ background: 'linear-gradient(180deg,#5a1f17 0%,#3b140f 60%,#260c09 100%)', boxShadow: 'inset 0 10px 18px rgba(0,0,0,.45)' }}>
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#7a2f22]" />
      </div>

      {/* Foreground villagers (wide screens only, so they never cover controls) */}
      <div className="absolute bottom-[4vh] left-[6vw] hidden items-end lg:flex">
        <div className="relative">
          <div className="animate-idle">
            <CharacterAvatar appearance={LEFT_VILLAGER} size={230} />
          </div>
          <div className="mx-auto -mt-4 h-5 w-56 rounded-md bg-gradient-to-b from-[#6b4a2f] to-[#3b2718] shadow-[0_8px_16px_rgba(0,0,0,.5)]" />
        </div>
      </div>

      <div className="absolute bottom-[4vh] right-[6vw] hidden items-end lg:flex">
        <div className="relative">
          <div className="animate-idle [animation-delay:1.1s]">
            <CharacterAvatar appearance={RIGHT_VILLAGER} size={220} />
          </div>
          <div className="mx-auto -mt-4 h-5 w-52 rounded-md bg-gradient-to-b from-[#6b4a2f] to-[#3b2718] shadow-[0_8px_16px_rgba(0,0,0,.5)]" />
        </div>
      </div>

      {/* The lurker and their tell-tale shadow */}
      <div className="absolute right-[7vw] top-[30vh] hidden lg:block">
        <svg width="190" height="230" viewBox="0 0 190 230" className="absolute -left-24 -top-10 opacity-80">
          <defs>
            <radialGradient id="lampPool" cx="0.3" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#e9b04f" stopOpacity="0.28" />
              <stop offset="1" stopColor="#e9b04f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="190" height="230" fill="url(#lampPool)" />
          {/* shadow on the wall: a person… with cat ears */}
          <path
            d="M70 70 L74 30 L88 48 Q100 44 112 48 L126 30 L130 70 Q134 96 116 104 L128 112 Q146 120 150 170 L150 230 L50 230 L50 170 Q54 120 72 112 L84 104 Q66 96 70 70 Z"
            fill="#05080a"
            opacity="0.75"
          />
          <g className="animate-eyes">
            <ellipse cx="89" cy="74" rx="5" ry="3.2" fill="#e9b04f" />
            <ellipse cx="111" cy="74" rx="5" ry="3.2" fill="#e9b04f" />
          </g>
        </svg>
        <div className="relative brightness-[0.28] saturate-50">
          <CharacterAvatar appearance={LURKER} size={150} />
        </div>
      </div>
    </div>
  );
}
