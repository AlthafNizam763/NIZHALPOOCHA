import type { I18nKey } from './en';
import type { Lang } from './index';

/**
 * Spoken narration, written to be heard rather than read: the storyteller's
 * voice for the intro and recap, with pauses (…) placed for the speech engine.
 * Subtitles keep their own on-screen wording. Lines not listed here (tutorial
 * prompts) are spoken from the regular dictionary in the narration language.
 */
export const NARRATION: Record<Lang, Partial<Record<I18nKey, string>>> = {
  ml: {
    'intro.l1': 'കേരളം… പതിനൊന്നു ദിവസമായി, മഴ ഒന്നു തോർന്നിട്ടില്ല.',
    'intro.l2': 'ഇതാണ് കടലിമുക്ക്. തോടും കടൽറോഡും കൂടിച്ചേരുന്ന, ആരും അധികം ശ്രദ്ധിക്കാത്ത ഒരു കൊച്ചു നാട്.',
    'intro.l3': 'വൈകുന്നേരത്തെ ചൂടുചായ… വെള്ളം തെറിപ്പിച്ചു പായുന്ന ഓട്ടോകൾ… ഇവിടെ എല്ലാവർക്കും എല്ലാവരെയും അറിയാം.',
    'intro.l4': 'പക്ഷേ, ഒരു മഴരാത്രി… കാര്യങ്ങൾ മാറിത്തുടങ്ങി.',
    'intro.l5': 'എന്നും രാത്രി, ഒരേ നേരത്ത്… കറന്റ് പോകും. ഒരു വിളക്കുപോലും ബാക്കിയാവില്ല.',
    'intro.l6': 'ജംഗ്ഷനിലെ ക്യാമറ… എന്തെങ്കിലും സംഭവിക്കുന്നതിനു തൊട്ടുമുൻപ്, അതങ്ങു കണ്ണടയ്ക്കും.',
    'intro.l7': 'പമ്പ് ഹൗസിലെ മോട്ടോർ തനിയെ നിലച്ചു. തോട്ടിലെ വെള്ളം, പടവുകൾ ഓരോന്നായി കയറിവന്നു.',
    'intro.l8a': 'കുട… താക്കോൽ… ഒരു സൈക്കിൾ പോലും.',
    'intro.l8b': 'ഒന്നൊന്നായി എല്ലാം കാണാതായി. ബാക്കിയായത്, നനഞ്ഞ കുറേ കാൽപ്പാടുകൾ മാത്രം.',
    'intro.l9': 'ഒടുവിൽ, പഴയ തറവാട്ടിലെ ഉമ്മറത്തിരുന്ന്, കാരണവന്മാർ വർഷങ്ങളായി ആരും മിണ്ടാത്ത ഒരു പേര് പതുക്കെ പറഞ്ഞു.',
    'intro.l10a': 'നിഴൽപ്പൂച്ച.',
    'intro.l10b': 'ഒരാളുടെ മുഖം അതു കടമെടുക്കും. എന്നിട്ട്, ആ ആളായിത്തന്നെ… നമുക്കിടയിലൂടെ നടക്കും.',
    'intro.l11': 'അതു തിരിച്ചുവന്നിട്ടുണ്ടെന്ന്… ചിലർ അടക്കം പറയുന്നു.',
    'intro.l12': 'കറന്റ് പോയ ആ രാത്രി, ജംഗ്ഷനിൽ അഞ്ചു പേരുണ്ടായിരുന്നു. അഞ്ച് അയൽക്കാർ.',
    'intro.l13': '…കണ്ടോ അത്?',
    'intro.l14a': 'നിഴൽപ്പൂച്ചയെ കണ്ടാൽ, നമ്മളിലൊരാളെപ്പോലെ തന്നെ.',
    'intro.l14b': 'അതേ മുഖം. അതേ ശബ്ദം. നോക്കിയതുകൊണ്ടു മാത്രം ആർക്കും തിരിച്ചറിയാനാവില്ല.',
    'intro.l15a': 'നിങ്ങൾ ഒരു മനുഷ്യനാണ്. നാട് തകരുംമുമ്പ്, കേടായതെല്ലാം നന്നാക്കണം.',
    'intro.l15b': 'ആര് എവിടെ പോകുന്നു എന്നു ശ്രദ്ധിക്കണം. അന്വേഷിക്കണം. കണ്ടതെല്ലാം വിളിച്ചുപറയണം.',
    'intro.l15c': 'പിന്നെ എല്ലാവരും ഒത്തുകൂടി, സംസാരിച്ച്, വോട്ടിട്ട് അതിനെ പുറത്താക്കണം… അതു നിങ്ങളെ കണ്ടെത്തുന്നതിനു മുൻപ്.',
    'intro.l16': 'കടലിമുക്കിലെ നിങ്ങളുടെ ആദ്യരാത്രി… ഇതാ തുടങ്ങുന്നു.',
    'recap.1': 'കാലവർഷം കനത്തു പെയ്യുന്ന കടലിമുക്ക്.',
    'recap.2': 'രാത്രി തോറും കറന്റും ക്യാമറയും പമ്പും നിലയ്ക്കുന്നു. സാധനങ്ങൾ കാണാതാകുന്നു.',
    'recap.3': 'മനുഷ്യരൂപത്തിൽ ഒരു നിഴൽപ്പൂച്ച, നാട്ടുകാർക്കിടയിൽ ഒളിച്ചിരിപ്പുണ്ട്.',
    'recap.4': 'ടാസ്കുകൾ ചെയ്യുക, അന്വേഷിക്കുക, കണ്ടത് റിപ്പോർട്ട് ചെയ്യുക… എന്നിട്ട് വോട്ടിട്ട് അതിനെ പുറത്താക്കുക.',
  },
  en: {
    'intro.l1': 'Kerala. Eleven days now… and the rain has not stopped.',
    'intro.l2': 'This is Kadalimukku. A small town where the canal meets the sea road… the kind of place nobody notices.',
    'intro.l3': 'Hot tea at dusk. Autos splashing through the puddles. Here, everyone knows everyone.',
    'intro.l4': 'Until one rainy night… when things began to change.',
    'intro.l5': 'Every night, at the very same hour, the power died. Not one lamp was left burning.',
    'intro.l6': 'The junction camera… always went blind, just before something happened.',
    'intro.l7': 'The pump house motor stopped on its own. And the canal climbed the steps, one by one.',
    'intro.l8a': 'An umbrella. A set of keys. Even a bicycle.',
    'intro.l8b': 'One by one, things disappeared… leaving nothing behind but wet footprints.',
    'intro.l9': 'At last, on the veranda of the old tharavad, the elders whispered a name no one had spoken in years.',
    'intro.l10a': 'Nizhalpoocha.',
    'intro.l10b': 'It borrows someone’s face… and walks among us, as that very person.',
    'intro.l11': 'Some say… it has already come back.',
    'intro.l12': 'The night the lights went out, five neighbours were at the junction.',
    'intro.l13': '…Did you see that?',
    'intro.l14a': 'The Nizhalpoocha looks just like one of us.',
    'intro.l14b': 'The same face. The same voice. Looking alone will never tell you.',
    'intro.l15a': 'You are human. Mend what is broken, before the town falls apart.',
    'intro.l15b': 'Watch who goes where. Look closer. Speak up about what you find.',
    'intro.l15c': 'Then gather, talk… and vote it out, before it finds you.',
    'intro.l16': 'Your first night in Kadalimukku… begins now.',
    'recap.1': 'Kadalimukku, deep in the monsoon.',
    'recap.2': 'Night after night the power, the camera and the pump fail. Things go missing.',
    'recap.3': 'A Nizhalpoocha, wearing a human face, is hiding among the townsfolk.',
    'recap.4': 'Do your tasks. Investigate. Report what you find… then vote it out.',
  },
};
