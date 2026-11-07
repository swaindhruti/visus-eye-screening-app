// Fixed wording the server writes itself (rule fallbacks, fixed plans, the urgent note), in English,
// Hindi and Odia. Gemini writes its own text in the session's language; these are used when it can't.
// The Hindi and Odia lines should be checked by a native speaker before a demo.
import type { Language, TestId } from '@visus/shared';

/** How the prompts name each language. */
export const LANGUAGE_NAME: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script, simple everyday Hindi)',
  or: 'Odia (Odia script, simple everyday Odia)',
};

type Text = {
  firstQuestion: string;
  fallbackQuestions: [string, string[]][];
  urgentNote: string;
  urgentSummary: string;
  reasons: Record<TestId, string>;
  single: string;
  glasses: { summary: string; off: string; on: string };
  quick: string;
  kids: string;
  general: string;
  basedOn: (concerns: string[]) => string;
  concerns: Record<string, string>;
  verdict: Record<'see_doctor' | 'mild' | 'good', { headline: string; advice: string }>;
  glassesVerdict: { fine: { headline: string; advice: string }; update: { headline: string; advice: string } };
};

export const TEXT: Record<Language, Text> = {
  en: {
    firstQuestion: "What's bothering your eyes today?",
    fallbackQuestions: [
      ['Is it in both eyes, or one more than the other?', ['Both eyes', 'Mostly left', 'Mostly right']],
      ['How long has it been happening?', ['A few days', 'A few weeks', 'Months or more']],
      ['Any pain, redness or flashes of light?', ['None of those', 'Some discomfort', 'Yes, flashes']],
    ],
    urgentNote: 'If this started suddenly or is getting worse, please see an eye doctor today.',
    urgentSummary: 'Please see an eye doctor soon about what you described.',
    reasons: {
      tumbling_e: 'Sharpness of far-away detail',
      clock_dial: 'Can make lights streak at night',
      amsler: 'Checks for wavy or missing lines',
      contrast: 'Night blur often starts here',
      near_reading: 'Small print up close',
      near_point: 'How close your eyes can focus',
      duochrome: 'Checks if your focus is a little off',
      peripheral_field: 'Notices what is around you',
      colour_plates: 'Tells colours apart',
      risk_screener: 'Health and family risk factors',
      eye_strain: 'Screens and tired eyes',
      glare_night: 'Halos and glare from headlights',
      kids_tumbling_e: 'Sharpness of far-away detail',
      kids_colour_shapes: 'Tells colours apart',
    },
    single: 'The test you picked.',
    glasses: { summary: 'Distance acuity twice: without, then with your glasses.', off: 'Round 1: without your glasses', on: 'Round 2: with your glasses on' },
    quick: 'Three fast tests for a quick read on your eyes.',
    kids: 'Kids tests, done together with a parent.',
    general: 'A general check of sharpness, focus and eye health.',
    basedOn: (c) => `Based on what you described: ${c.join(', ')}.`,
    concerns: {
      night: 'trouble at night',
      reading: 'reading up close',
      strain: 'tired eyes',
      wavy: 'wavy lines',
      colour: 'colours',
      side: 'side vision',
      ghost: 'streaks or ghosting',
      risk: 'health risks',
    },
    verdict: {
      see_doctor: { headline: 'One thing to follow up with a doctor', advice: 'Book an eye doctor this week and show them this report.' },
      mild: { headline: 'Mostly healthy, a few small changes', advice: 'Check again in 3 months, or see an optician sooner if things change.' },
      good: { headline: 'Your eyes look healthy', advice: 'Check again in 6 months.' },
    },
    glassesVerdict: {
      fine: { headline: 'Your glasses still work well', advice: 'Both eyes see sharply with them on. No update needed for now.' },
      update: { headline: 'Your glasses may need an update', advice: "Your vision isn't fully sharp with them on. An optician can check your prescription." },
    },
  },
  hi: {
    firstQuestion: 'आज आपकी आँखों में क्या परेशानी है?',
    fallbackQuestions: [
      ['क्या यह दोनों आँखों में है, या एक में ज़्यादा?', ['दोनों आँखें', 'ज़्यादातर बाईं', 'ज़्यादातर दाईं']],
      ['यह कब से हो रहा है?', ['कुछ दिन', 'कुछ हफ़्ते', 'महीनों से']],
      ['क्या दर्द, लाली या रोशनी की चमक है?', ['इनमें से कुछ नहीं', 'थोड़ी तकलीफ़', 'हाँ, चमक']],
    ],
    urgentNote: 'अगर यह अचानक शुरू हुआ है या बढ़ रहा है, तो आज ही आँखों के डॉक्टर को दिखाएँ।',
    urgentSummary: 'आपने जो बताया, उसके लिए जल्द ही आँखों के डॉक्टर को दिखाएँ।',
    reasons: {
      tumbling_e: 'दूर की चीज़ें कितनी साफ़ दिखती हैं',
      clock_dial: 'रात में रोशनी फैलने की वजह',
      amsler: 'टेढ़ी या गायब लाइनें जाँचता है',
      contrast: 'रात का धुंधलापन यहीं से शुरू होता है',
      near_reading: 'पास के छोटे अक्षर',
      near_point: 'आँखें कितने पास तक फ़ोकस करती हैं',
      duochrome: 'फ़ोकस थोड़ा गलत तो नहीं',
      peripheral_field: 'आस-पास की चीज़ें दिखना',
      colour_plates: 'रंगों में फ़र्क पहचानना',
      risk_screener: 'सेहत और परिवार के जोखिम',
      eye_strain: 'स्क्रीन और थकी आँखें',
      glare_night: 'हेडलाइट की चमक और घेरे',
      kids_tumbling_e: 'दूर की चीज़ें कितनी साफ़ दिखती हैं',
      kids_colour_shapes: 'रंगों में फ़र्क पहचानना',
    },
    single: 'आपका चुना हुआ टेस्ट।',
    glasses: { summary: 'दूर की नज़र दो बार: पहले चश्मे के बिना, फिर चश्मे के साथ।', off: 'राउंड 1: चश्मे के बिना', on: 'राउंड 2: चश्मा पहनकर' },
    quick: 'आँखों की जल्दी जाँच के लिए तीन छोटे टेस्ट।',
    kids: 'बच्चों के टेस्ट, माता-पिता के साथ।',
    general: 'साफ़ दिखने, फ़ोकस और आँखों की सेहत की आम जाँच।',
    basedOn: (c) => `आपने जो बताया उसके आधार पर: ${c.join(', ')}।`,
    concerns: {
      night: 'रात में दिक्कत',
      reading: 'पास से पढ़ना',
      strain: 'थकी आँखें',
      wavy: 'टेढ़ी लाइनें',
      colour: 'रंग',
      side: 'साइड की नज़र',
      ghost: 'रोशनी फैलना या दोहरा दिखना',
      risk: 'सेहत के जोखिम',
    },
    verdict: {
      see_doctor: { headline: 'एक बात डॉक्टर को दिखानी है', advice: 'इसी हफ़्ते आँखों के डॉक्टर से मिलें और उन्हें यह रिपोर्ट दिखाएँ।' },
      mild: { headline: 'ज़्यादातर ठीक, कुछ छोटे बदलाव', advice: '3 महीने में फिर जाँचें, या कुछ बदले तो पहले ही ऑप्टिशियन को दिखाएँ।' },
      good: { headline: 'आपकी आँखें स्वस्थ लगती हैं', advice: '6 महीने में फिर जाँचें।' },
    },
    glassesVerdict: {
      fine: { headline: 'आपका चश्मा अब भी ठीक है', advice: 'चश्मे के साथ दोनों आँखें साफ़ देखती हैं। अभी बदलने की ज़रूरत नहीं।' },
      update: { headline: 'आपका चश्मा बदलना पड़ सकता है', advice: 'चश्मे के साथ भी पूरा साफ़ नहीं दिखता। ऑप्टिशियन आपका नंबर जाँच सकते हैं।' },
    },
  },
  or: {
    firstQuestion: 'ଆଜି ଆପଣଙ୍କ ଆଖିରେ କଣ ଅସୁବିଧା ହେଉଛି?',
    fallbackQuestions: [
      ['ଏହା ଦୁଇ ଆଖିରେ ହେଉଛି, ନା ଗୋଟିଏ ଆଖିରେ ଅଧିକ?', ['ଦୁଇ ଆଖି', 'ଅଧିକ ବାମ', 'ଅଧିକ ଡାହାଣ']],
      ['ଏହା କେବେଠାରୁ ହେଉଛି?', ['କିଛି ଦିନ', 'କିଛି ସପ୍ତାହ', 'ମାସ ମାସ ଧରି']],
      ['କିଛି ଯନ୍ତ୍ରଣା, ଲାଲ ପଡ଼ିବା କି ଆଲୁଅ ଝଲସିବା ଅଛି କି?', ['ଏମିତି କିଛି ନାହିଁ', 'ଟିକେ ଅସୁବିଧା', 'ହଁ, ଝଲସୁଛି']],
    ],
    urgentNote: 'ଯଦି ଏହା ହଠାତ୍ ଆରମ୍ଭ ହୋଇଛି କିମ୍ବା ବଢ଼ୁଛି, ଦୟାକରି ଆଜି ହିଁ ଆଖି ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ।',
    urgentSummary: 'ଆପଣ ଯାହା କହିଲେ, ସେଥିପାଇଁ ଶୀଘ୍ର ଆଖି ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ।',
    reasons: {
      tumbling_e: 'ଦୂରର ଜିନିଷ କେତେ ସଫା ଦେଖାଯାଏ',
      clock_dial: 'ରାତିରେ ଆଲୁଅ ବିଛୁରିବାର କାରଣ',
      amsler: 'ବଙ୍କା କି ହଜିଲା ଧାଡ଼ି ଯାଞ୍ଚ କରେ',
      contrast: 'ରାତିର ଝାପସା ଏଠାରୁ ଆରମ୍ଭ ହୁଏ',
      near_reading: 'ପାଖର ଛୋଟ ଅକ୍ଷର',
      near_point: 'ଆଖି କେତେ ପାଖ ପର୍ଯ୍ୟନ୍ତ ଫୋକସ୍ କରେ',
      duochrome: 'ଫୋକସ୍ ଟିକେ ଭୁଲ କି ନାହିଁ',
      peripheral_field: 'ଚାରିପାଖର ଜିନିଷ ଦେଖିବା',
      colour_plates: 'ରଙ୍ଗ ଚିହ୍ନିବା',
      risk_screener: 'ସ୍ୱାସ୍ଥ୍ୟ ଓ ପରିବାରର ବିପଦ',
      eye_strain: 'ସ୍କ୍ରିନ୍ ଓ କ୍ଳାନ୍ତ ଆଖି',
      glare_night: 'ହେଡଲାଇଟ୍‌ର ଚମକ ଓ ଘେରା',
      kids_tumbling_e: 'ଦୂରର ଜିନିଷ କେତେ ସଫା ଦେଖାଯାଏ',
      kids_colour_shapes: 'ରଙ୍ଗ ଚିହ୍ନିବା',
    },
    single: 'ଆପଣ ବାଛିଥିବା ଟେଷ୍ଟ।',
    glasses: { summary: 'ଦୂର ଦୃଷ୍ଟି ଦୁଇଥର: ପ୍ରଥମେ ଚଷମା ବିନା, ତା\'ପରେ ଚଷମା ସହ।', off: 'ରାଉଣ୍ଡ 1: ଚଷମା ବିନା', on: 'ରାଉଣ୍ଡ 2: ଚଷମା ପିନ୍ଧି' },
    quick: 'ଆଖିର ଶୀଘ୍ର ଯାଞ୍ଚ ପାଇଁ ତିନୋଟି ଛୋଟ ଟେଷ୍ଟ।',
    kids: 'ପିଲାଙ୍କ ଟେଷ୍ଟ, ବାପାମାଙ୍କ ସହ।',
    general: 'ସଫା ଦେଖିବା, ଫୋକସ୍ ଓ ଆଖି ସ୍ୱାସ୍ଥ୍ୟର ସାଧାରଣ ଯାଞ୍ଚ।',
    basedOn: (c) => `ଆପଣ ଯାହା କହିଲେ ସେହି ଅନୁସାରେ: ${c.join(', ')}।`,
    concerns: {
      night: 'ରାତିରେ ଅସୁବିଧା',
      reading: 'ପାଖରୁ ପଢ଼ିବା',
      strain: 'କ୍ଳାନ୍ତ ଆଖି',
      wavy: 'ବଙ୍କା ଧାଡ଼ି',
      colour: 'ରଙ୍ଗ',
      side: 'ପାର୍ଶ୍ୱ ଦୃଷ୍ଟି',
      ghost: 'ଆଲୁଅ ବିଛୁରିବା କି ଦୁଇଟା ଦେଖାଯିବା',
      risk: 'ସ୍ୱାସ୍ଥ୍ୟ ବିପଦ',
    },
    verdict: {
      see_doctor: { headline: 'ଗୋଟିଏ କଥା ଡାକ୍ତରଙ୍କୁ ଦେଖାଇବାକୁ ହେବ', advice: 'ଏହି ସପ୍ତାହରେ ଆଖି ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ ଓ ଏହି ରିପୋର୍ଟ ଦେଖାନ୍ତୁ।' },
      mild: { headline: 'ଅଧିକାଂଶ ଠିକ୍, କିଛି ଛୋଟ ପରିବର୍ତ୍ତନ', advice: '3 ମାସରେ ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ, କିମ୍ବା କିଛି ବଦଳିଲେ ଆଗରୁ ଅପ୍ଟିସିଆନଙ୍କୁ ଦେଖାନ୍ତୁ।' },
      good: { headline: 'ଆପଣଙ୍କ ଆଖି ସୁସ୍ଥ ଦେଖାଯାଉଛି', advice: '6 ମାସରେ ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ।' },
    },
    glassesVerdict: {
      fine: { headline: 'ଆପଣଙ୍କ ଚଷମା ଏବେ ବି ଠିକ୍ ଅଛି', advice: 'ଚଷମା ସହ ଦୁଇ ଆଖି ସଫା ଦେଖେ। ଏବେ ବଦଳାଇବା ଦରକାର ନାହିଁ।' },
      update: { headline: 'ଆପଣଙ୍କ ଚଷମା ବଦଳାଇବା ଦରକାର ହୋଇପାରେ', advice: 'ଚଷମା ସହ ମଧ୍ୟ ପୂରା ସଫା ଦେଖାଯାଉନାହିଁ। ଅପ୍ଟିସିଆନ ଆପଣଙ୍କ ପାୱାର ଯାଞ୍ଚ କରିପାରିବେ।' },
    },
  },
};

/** The urgent note in every language, so it's added only once per chat whatever the language. */
export const URGENT_NOTES = Object.values(TEXT).map((t) => t.urgentNote);
