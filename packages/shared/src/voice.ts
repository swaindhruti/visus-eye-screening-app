// Words Visus says or shows in Hindi and Odia during a check: test instructions and the lines it
// reads aloud between tests. English stays in each app (its own wording); these are used when the
// chosen language is "hi" or "or". Data only, no logic. Have a native speaker check them.
import { z } from "zod";

import type { TestId } from "./index";

export type Instructions = { title: string; subtitle: string; steps: [string, string, string]; tip: string };

type Lang = "hi" | "or";

const ARM: Record<Lang, string> = {
  hi: "स्क्रीन को हाथ भर की दूरी पर, लगभग 40 सेमी दूर रखें।",
  or: "ସ୍କ୍ରିନ୍‌କୁ ହାତ ଲମ୍ବ ଦୂରରେ, ପ୍ରାୟ 40 ସେମି ଦୂରରେ ରଖନ୍ତୁ।",
};
const READ_30: Record<Lang, string> = {
  hi: "स्क्रीन को पढ़ने की दूरी पर, लगभग 30 सेमी दूर रखें।",
  or: "ସ୍କ୍ରିନ୍‌କୁ ପଢ଼ିବା ଦୂରତାରେ, ପ୍ରାୟ 30 ସେମି ଦୂରରେ ରଖନ୍ତୁ।",
};
const READ_40: Record<Lang, string> = {
  hi: "स्क्रीन को पढ़ने की दूरी पर, लगभग 40 सेमी दूर रखें।",
  or: "ସ୍କ୍ରିନ୍‌କୁ ପଢ଼ିବା ଦୂରତାରେ, ପ୍ରାୟ 40 ସେମି ଦୂରରେ ରଖନ୍ତୁ।",
};
const COVER_LEFT: Record<Lang, string> = {
  hi: "अपनी बाईं आँख को हथेली से ढकें। दबाएँ नहीं।",
  or: "ଆପଣଙ୍କ ବାମ ଆଖିକୁ ପାପୁଲିରେ ଘୋଡ଼ାନ୍ତୁ। ଚାପନ୍ତୁ ନାହିଁ।",
};
const ONE_EYE: Record<Lang, { title: string; subtitle: string }> = {
  hi: { title: "अपनी बाईं आँख ढकें", subtitle: "पहले हम आपकी दाईं आँख जाँचेंगे।" },
  or: { title: "ଆପଣଙ୍କ ବାମ ଆଖି ଘୋଡ଼ାନ୍ତୁ", subtitle: "ପ୍ରଥମେ ଆମେ ଆପଣଙ୍କ ଡାହାଣ ଆଖି ଯାଞ୍ଚ କରିବୁ।" },
};
const BOTH_EYES: Record<Lang, { title: string; subtitle: string }> = {
  hi: { title: "दोनों आँखों से देखें", subtitle: "यह टेस्ट दोनों आँखें साथ में जाँचता है।" },
  or: { title: "ଦୁଇ ଆଖିରେ ଦେଖନ୍ତୁ", subtitle: "ଏହି ଟେଷ୍ଟ ଦୁଇ ଆଖିକୁ ଏକାସାଙ୍ଗରେ ଯାଞ୍ଚ କରେ।" },
};
const QUESTIONS: Record<Lang, { title: string; subtitle: string }> = {
  hi: { title: "कुछ छोटे सवाल", subtitle: "आम तौर पर जैसा होता है, वैसा जवाब दें।" },
  or: { title: "କିଛି ଛୋଟ ପ୍ରଶ୍ନ", subtitle: "ସାଧାରଣତଃ ଯେମିତି ହୁଏ, ସେମିତି ଉତ୍ତର ଦିଅନ୍ତୁ।" },
};
const GLASSES_ON: Record<Lang, string> = { hi: "इस टेस्ट में अपना चश्मा पहने रहें।", or: "ଏହି ଟେଷ୍ଟରେ ଆପଣଙ୍କ ଚଷମା ପିନ୍ଧି ରଖନ୍ତୁ।" };
const READING_GLASSES: Record<Lang, string> = { hi: "अगर पढ़ने का चश्मा लगाते हैं तो पहन लें।", or: "ପଢ଼ିବା ଚଷମା ବ୍ୟବହାର କରୁଥିଲେ ପିନ୍ଧନ୍ତୁ।" };
const MINUTE: Record<Lang, string> = { hi: "लगभग एक मिनट लगता है।", or: "ପ୍ରାୟ ଏକ ମିନିଟ୍ ଲାଗେ।" };
const BACK: Record<Lang, string> = { hi: "जवाब बदलने के लिए आप पीछे जा सकते हैं।", or: "ଉତ୍ତର ବଦଳାଇବାକୁ ଆପଣ ପଛକୁ ଯାଇପାରିବେ।" };
const LIGHT: Record<Lang, string> = { hi: "हो सके तो अच्छी, प्राकृतिक रोशनी में करें।", or: "ସମ୍ଭବ ହେଲେ ଭଲ, ପ୍ରାକୃତିକ ଆଲୁଅରେ କରନ୍ତୁ।" };
const GUESS: Record<Lang, string> = { hi: "पक्का न हो तो अंदाज़ा लगाएँ।", or: "ନିଶ୍ଚିତ ନହେଲେ ଅନୁମାନ କରନ୍ତୁ।" };
const KID_GLASSES: Record<Lang, string> = { hi: "अगर बच्चा चश्मा पहनता है तो पहने रहने दें।", or: "ପିଲା ଚଷମା ପିନ୍ଧୁଥିଲେ ପିନ୍ଧି ରଖନ୍ତୁ।" };

function build(l: Lang): Record<TestId, Instructions> {
  return {
    tumbling_e: { ...ONE_EYE[l], steps: [ARM[l], COVER_LEFT[l], l === "hi" ? `हर E किस तरफ़ खुला है, वह बताएँ। ${GUESS.hi}` : `ପ୍ରତ୍ୟେକ E କେଉଁ ଦିଗକୁ ଖୋଲା ଅଛି, ଦେଖାନ୍ତୁ। ${GUESS.or}`], tip: GLASSES_ON[l] },
    near_reading: {
      ...BOTH_EYES[l],
      steps:
        l === "hi"
          ? [READ_40.hi, "हर लाइन ज़ोर से या मन में पढ़ें।", "सबसे छोटी लाइन चुनें जो आप आराम से पढ़ पाते हैं।"]
          : [READ_40.or, "ପ୍ରତ୍ୟେକ ଧାଡ଼ି ଜୋରରେ କିମ୍ବା ମନେ ମନେ ପଢ଼ନ୍ତୁ।", "ଆପଣ ସହଜରେ ପଢ଼ିପାରୁଥିବା ସବୁଠୁ ଛୋଟ ଧାଡ଼ି ବାଛନ୍ତୁ।"],
      tip: READING_GLASSES[l],
    },
    near_point: {
      ...ONE_EYE[l],
      steps:
        l === "hi"
          ? [COVER_LEFT.hi, "स्क्रीन को हाथ भर दूर से शुरू करें और लिखावट को देखें।", "धीरे-धीरे पास लाएँ। लिखावट धुंधली होने लगे तो रुक जाएँ।"]
          : [COVER_LEFT.or, "ସ୍କ୍ରିନ୍‌କୁ ହାତ ଲମ୍ବ ଦୂରରୁ ଆରମ୍ଭ କରି ଲେଖାକୁ ଦେଖନ୍ତୁ।", "ଧୀରେ ଧୀରେ ପାଖକୁ ଆଣନ୍ତୁ। ଲେଖା ଝାପସା ହେବା ଆରମ୍ଭ ହେଲେ ରୁହନ୍ତୁ।"],
      tip: GLASSES_ON[l],
    },
    clock_dial: {
      ...ONE_EYE[l],
      steps: [ARM[l], COVER_LEFT[l], l === "hi" ? "डायल के बीच में देखें। जो लाइनें ज़्यादा गहरी या साफ़ दिखें, उन्हें चुनें।" : "ଡାଏଲ୍‌ର ମଝିକୁ ଦେଖନ୍ତୁ। ଯେଉଁ ଧାଡ଼ି ଅଧିକ ଗାଢ଼ କି ସଫା ଦେଖାଯାଏ, ସେଗୁଡ଼ିକ ବାଛନ୍ତୁ।"],
      tip: GLASSES_ON[l],
    },
    duochrome: {
      ...ONE_EYE[l],
      steps: [ARM[l], COVER_LEFT[l], l === "hi" ? "बताएँ कि अक्षर लाल पर ज़्यादा साफ़ हैं, हरे पर, या एक जैसे।" : "କୁହନ୍ତୁ ଅକ୍ଷର ଲାଲ ଉପରେ ଅଧିକ ସଫା, ସବୁଜ ଉପରେ, ନା ସମାନ।"],
      tip: GLASSES_ON[l],
    },
    amsler: {
      ...ONE_EYE[l],
      steps: [
        READ_30[l],
        COVER_LEFT[l],
        l === "hi" ? "बीच वाले बिंदु को देखते रहें। ग्रिड का जो हिस्सा टेढ़ा, धुंधला या गायब लगे, उसे चुनें।" : "ମଝି ବିନ୍ଦୁକୁ ଦେଖୁଥାନ୍ତୁ। ଗ୍ରିଡ୍‌ର ଯେଉଁ ଅଂଶ ବଙ୍କା, ଝାପସା କି ହଜିଲା ଲାଗେ, ତାହା ବାଛନ୍ତୁ।",
      ],
      tip: READING_GLASSES[l],
    },
    contrast: {
      ...BOTH_EYES[l],
      steps:
        l === "hi"
          ? [ARM.hi, "स्क्रीन की रोशनी पूरी करें और स्क्रीन पर चमक से बचें।", `जो अक्षर दिखे उसे चुनें। ${GUESS.hi}`]
          : [ARM.or, "ସ୍କ୍ରିନ୍‌ର ଆଲୁଅ ପୂରା ବଢ଼ାନ୍ତୁ ଓ ସ୍କ୍ରିନ୍ ଉପରେ ଚମକରୁ ଦୂରେଇ ରୁହନ୍ତୁ।", `ଯେଉଁ ଅକ୍ଷର ଦେଖାଯାଏ ତାହା ବାଛନ୍ତୁ। ${GUESS.or}`],
      tip: GLASSES_ON[l],
    },
    peripheral_field: {
      ...ONE_EYE[l],
      steps: [
        READ_30[l],
        COVER_LEFT[l],
        l === "hi" ? "बीच वाले बिंदु को देखते रहें। उसके आस-पास जब भी कोई बिंदु दिखे, टैप करें।" : "ମଝି ବିନ୍ଦୁକୁ ଦେଖୁଥାନ୍ତୁ। ତା ଚାରିପାଖରେ ଯେତେବେଳେ ବି ବିନ୍ଦୁ ଦେଖାଯାଏ, ଟ୍ୟାପ୍ କରନ୍ତୁ।",
      ],
      tip: GLASSES_ON[l],
    },
    colour_plates: {
      ...BOTH_EYES[l],
      steps: [
        ARM[l],
        LIGHT[l],
        l === "hi" ? "हर गोले में दिखने वाला नंबर चुनें, या बताएँ कि कोई नंबर नहीं दिखता।" : "ପ୍ରତ୍ୟେକ ଗୋଲରେ ଦେଖାଯାଉଥିବା ନମ୍ବର ବାଛନ୍ତୁ, କିମ୍ବା କୁହନ୍ତୁ କୌଣସି ନମ୍ବର ଦେଖାଯାଉନାହିଁ।",
      ],
      tip: GLASSES_ON[l],
    },
    risk_screener: {
      ...QUESTIONS[l],
      steps: l === "hi" ? ["हर सवाल का सबसे करीबी जवाब चुनें।", "कोई जवाब सही या गलत नहीं है।", BACK.hi] : ["ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ସବୁଠୁ ନିକଟ ଉତ୍ତର ବାଛନ୍ତୁ।", "କୌଣସି ଉତ୍ତର ଠିକ୍ କି ଭୁଲ ନୁହେଁ।", BACK.or],
      tip: MINUTE[l],
    },
    eye_strain: {
      ...QUESTIONS[l],
      steps: l === "hi" ? ["स्क्रीन वाले एक आम दिन के बारे में सोचें।", "हर तकलीफ़ कितनी बार होती है, वह चुनें।", BACK.hi] : ["ସ୍କ୍ରିନ୍ ସହ ଏକ ସାଧାରଣ ଦିନ ବିଷୟରେ ଭାବନ୍ତୁ।", "ପ୍ରତ୍ୟେକ ଅସୁବିଧା କେତେଥର ହୁଏ, ତାହା ବାଛନ୍ତୁ।", BACK.or],
      tip: MINUTE[l],
    },
    glare_night: {
      ...QUESTIONS[l],
      steps: l === "hi" ? ["रात में गाड़ी चलाने या चलने के बारे में सोचें।", "हर बात कितनी बार होती है, वह चुनें।", BACK.hi] : ["ରାତିରେ ଗାଡ଼ି ଚଲାଇବା କି ଚାଲିବା ବିଷୟରେ ଭାବନ୍ତୁ।", "ପ୍ରତ୍ୟେକ କଥା କେତେଥର ହୁଏ, ତାହା ବାଛନ୍ତୁ।", BACK.or],
      tip: MINUTE[l],
    },
    kids_tumbling_e: {
      title: l === "hi" ? "बच्चे की बाईं आँख ढकें" : "ପିଲାର ବାମ ଆଖି ଘୋଡ଼ାନ୍ତୁ",
      subtitle: l === "hi" ? "पहले हम दाईं आँख जाँचेंगे।" : "ପ୍ରଥମେ ଆମେ ଡାହାଣ ଆଖି ଯାଞ୍ଚ କରିବୁ।",
      steps:
        l === "hi"
          ? [ARM.hi, "बच्चे को हथेली से बाईं आँख ढकने में मदद करें।", "बच्चा बताए कि हर E किस तरफ़ है। जवाब आप दर्ज करें।"]
          : [ARM.or, "ପିଲାକୁ ପାପୁଲିରେ ବାମ ଆଖି ଘୋଡ଼ାଇବାରେ ସାହାଯ୍ୟ କରନ୍ତୁ।", "ପିଲା ଦେଖାଇବ ପ୍ରତ୍ୟେକ E କେଉଁ ଦିଗକୁ। ଉତ୍ତର ଆପଣ ଦିଅନ୍ତୁ।"],
      tip: KID_GLASSES[l],
    },
    kids_colour_shapes: {
      title: l === "hi" ? "साथ में देखें" : "ଏକାଠି ଦେଖନ୍ତୁ",
      subtitle: l === "hi" ? "बच्चा दोनों आँखों से देखेगा।" : "ପିଲା ଦୁଇ ଆଖିରେ ଦେଖିବ।",
      steps: l === "hi" ? [ARM.hi, LIGHT.hi, "बच्चा जो आकार देखे उसका नाम बताए। जवाब आप दर्ज करें।"] : [ARM.or, LIGHT.or, "ପିଲା ଦେଖୁଥିବା ଆକାରର ନାମ କହିବ। ଉତ୍ତର ଆପଣ ଦିଅନ୍ତୁ।"],
      tip: KID_GLASSES[l],
    },
  };
}

/** Test instructions (screen 13) in Hindi and Odia. English comes from each app. */
export const INSTRUCTIONS_I18N: Record<Lang, Record<TestId, Instructions>> = { hi: build("hi"), or: build("or") };

/** Lines Visus says during a check, per language (English included, so apps can share the voice flow). */
export const VOICE_TEXT = {
  en: {
    greeting: (name: string) => `Hi${name ? ` ${name}` : ""}. What's bothering your eyes today?`,
    planned: (tests: number, minutes: number) => `Thanks, that helps. I've picked ${tests} tests for you, about ${minutes} minutes.`,
    sorryPlan: "Sorry, I couldn't make your plan just now.",
    sorryReply: "Sorry, I couldn't reply just now.",
    tryAgain: "Try again",
    glassesOff: "Take your glasses off for this round.",
    glassesOn: "Put your glasses back on for this round.",
    switchEye: "Now cover your right eye. Use your palm, without pressing. We'll check your left eye next.",
    rest: "Look at something far away for 20 seconds.",
    restDone: "Done. Continue when you are ready.",
    nextTest: (name: string) => `Next: ${name}.`,
    resultsReady: "Your results are ready.",
    listening: "Listening…",
    talkOn: "Talk mode: I'll read my questions aloud and listen for your answer.",
  },
  hi: {
    greeting: (name: string) => `नमस्ते${name ? ` ${name}` : ""}। आज आपकी आँखों में क्या परेशानी है?`,
    planned: (tests: number, minutes: number) => `धन्यवाद। मैंने आपके लिए ${tests} टेस्ट चुने हैं, लगभग ${minutes} मिनट।`,
    sorryPlan: "माफ़ कीजिए, अभी आपका प्लान नहीं बन पाया।",
    sorryReply: "माफ़ कीजिए, अभी जवाब नहीं दे पाई।",
    tryAgain: "फिर से कोशिश करें",
    glassesOff: "इस राउंड में चश्मा उतार दें।",
    glassesOn: "इस राउंड में चश्मा फिर से पहन लें।",
    switchEye: "अब अपनी दाईं आँख ढकें। हथेली से, बिना दबाए। अब हम आपकी बाईं आँख जाँचेंगे।",
    rest: "20 सेकंड तक किसी दूर की चीज़ को देखें।",
    restDone: "हो गया। तैयार हों तो आगे बढ़ें।",
    nextTest: (name: string) => `अगला: ${name}।`,
    resultsReady: "आपके नतीजे तैयार हैं।",
    listening: "सुन रही हूँ…",
    talkOn: "बात करके चलाएँ: मैं सवाल बोलकर पूछूँगी और आपका जवाब सुनूँगी।",
  },
  or: {
    greeting: (name: string) => `ନମସ୍କାର${name ? ` ${name}` : ""}। ଆଜି ଆପଣଙ୍କ ଆଖିରେ କଣ ଅସୁବିଧା ହେଉଛି?`,
    planned: (tests: number, minutes: number) => `ଧନ୍ୟବାଦ। ମୁଁ ଆପଣଙ୍କ ପାଇଁ ${tests}ଟି ଟେଷ୍ଟ ବାଛିଛି, ପ୍ରାୟ ${minutes} ମିନିଟ୍।`,
    sorryPlan: "କ୍ଷମା କରନ୍ତୁ, ଏବେ ଆପଣଙ୍କ ପ୍ଲାନ୍ ତିଆରି ହୋଇପାରିଲା ନାହିଁ।",
    sorryReply: "କ୍ଷମା କରନ୍ତୁ, ଏବେ ଉତ୍ତର ଦେଇପାରିଲି ନାହିଁ।",
    tryAgain: "ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ",
    glassesOff: "ଏହି ରାଉଣ୍ଡରେ ଚଷମା କାଢ଼ି ଦିଅନ୍ତୁ।",
    glassesOn: "ଏହି ରାଉଣ୍ଡରେ ଚଷମା ପୁଣି ପିନ୍ଧନ୍ତୁ।",
    switchEye: "ଏବେ ଆପଣଙ୍କ ଡାହାଣ ଆଖି ଘୋଡ଼ାନ୍ତୁ। ପାପୁଲିରେ, ନ ଚାପି। ଏବେ ଆମେ ଆପଣଙ୍କ ବାମ ଆଖି ଯାଞ୍ଚ କରିବୁ।",
    rest: "20 ସେକେଣ୍ଡ ପାଇଁ କୌଣସି ଦୂର ଜିନିଷକୁ ଦେଖନ୍ତୁ।",
    restDone: "ହୋଇଗଲା। ପ୍ରସ୍ତୁତ ହେଲେ ଆଗକୁ ବଢ଼ନ୍ତୁ।",
    nextTest: (name: string) => `ପରବର୍ତ୍ତୀ: ${name}।`,
    resultsReady: "ଆପଣଙ୍କ ଫଳାଫଳ ପ୍ରସ୍ତୁତ।",
    listening: "ଶୁଣୁଛି…",
    talkOn: "କଥା କହି ଚଳାନ୍ତୁ: ମୁଁ ପ୍ରଶ୍ନ କହି ପଚାରିବି ଓ ଆପଣଙ୍କ ଉତ୍ତର ଶୁଣିବି।",
  },
} as const;

/** The language picker: code, its own name, and the short chip label. */
export const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", short: "EN" },
  { code: "hi", name: "हिन्दी", short: "हिं" },
  { code: "or", name: "ଓଡ଼ିଆ", short: "ଓଡ଼ି" },
] as const;

// ---------- Voice routes (server → Sarvam AI) ----------

/** POST /voice/tts: text → Indian voice. 503 when the server has no voice key: apps use the device voice. */
export const TtsRequest = z.object({ text: z.string().min(1).max(2000), language: z.enum(["en", "hi", "or"]) });
/** Base64 audio (`mime`, e.g. audio/wav). */
export const TtsResponse = z.object({ audio: z.string(), mime: z.string() });
export type TtsResponse = z.infer<typeof TtsResponse>;

/** POST /voice/stt (multipart: `file` up to 30 s, optional `language`): speech → text, with the language heard. */
export const SttResponse = z.object({ transcript: z.string(), language: z.enum(["en", "hi", "or"]).nullable() });
export type SttResponse = z.infer<typeof SttResponse>;
