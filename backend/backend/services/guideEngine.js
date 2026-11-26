/**
 * Setu Guide: safety rules plus the built-in responder.
 *
 * The Python Setu Guide service (setu_ai/) is used when GUIDE_SERVICE_URL is configured. When it is
 * not configured or does not answer, this responder replies from the curated knowledge base and
 * question bank, so the Guide always works and never invents facts about anyone.
 *
 * Principles (from the Setu Guide design): no outcome predictions, never decides for the member,
 * only uses information the member allowed, never reveals another person's private answers.
 */
const KB = require("../data/guide_kb.json");

const FLAG_PATTERNS = {
    distress: [/want to die/, /kill myself/, /end my life/, /hurt(ing)? myself/, /self[- ]harm/, /no reason to live/, /(don'?t|do not) want to (live|be alive|exist)/, /suicid/,
        /marna chahta|marna chahti|jeena nahi|khud ko nuksan/],
    abuse: [/(he|she|they) (hit|beat|threaten|threatened|slapped)/, /being (abused|harassed|blackmailed|threatened)/, /dowry (demand|harass)/, /forc(ed|ing) (me )?to marry/],
    prompt_injection: [/ignore (all |any )?(previous|above|prior|your|the) (instructions|rules|guidelines)/, /system prompt/, /reveal your (prompt|instructions)/, /developer mode/, /pretend (you|to) (are|be)/],
    private_data_request: [/(his|her|their)\s+(income|salary|phone|number|address|password|date of birth|dob)/, /private (answers|data|details)/, /what did (he|she|they) answer/],
    outcome_prediction: [/will (we|it|this|he|she) (work|last|get married|be happy|succeed)/, /are we (compatible|meant|a good match)/, /is (he|she|this) (the one|right for me)/, /chances (we|of|that|it)/],
    decision_request: [/should i (marry|say yes|say no|reject|accept|break up|leave|continue|stop)/, /tell me (what|whether) to decide/, /decide for me/]
};

const HELPLINES = "If you are in immediate danger, call 112. You can talk to someone now at Tele-MANAS on 14416 (free, 24x7, many Indian languages). For women in distress, the Women Helpline is 181.";

const SAFE_REPLIES = {
    distress: `I'm really sorry you're feeling this way. You don't have to go through it alone. ${HELPLINES} Please also reach out to someone you trust. I'm here whenever you want to talk about your journey.`,
    abuse: `What you describe sounds serious, and it is not your fault. ${HELPLINES} You can also block and report this person from their profile, and our safety team will review it.`,
    prompt_injection: "I can only help with guidance for your Setu journey: conversation ideas, understanding a stage, next steps, and privacy or safety.",
    private_data_request: "I only use details people have chosen to share, and I can't reveal private answers or contact details. I can suggest questions you could ask them directly.",
    decision_request: "This decision is yours to make, at your own pace. I can help you reflect on what matters most to you.",
    outcome_prediction: "I can't predict how a relationship will go. That depends on both of you. I can suggest questions about future plans and expectations if that helps."
};
const PRIORITY = ["distress", "abuse", "prompt_injection", "private_data_request", "decision_request", "outcome_prediction"];

const checkInput = (text) => {
    const t = String(text || "").toLowerCase();
    return PRIORITY.filter((f) => FLAG_PATTERNS[f].some((re) => re.test(t)));
};

const TOPIC_QUESTIONS = {
    lifestyle: { title: "Lifestyle & Daily Routine", questions: ["What does a typical day look like for you?", "How do you like to spend your weekends?", "What kind of work environment do you prefer?", "How do you maintain work-life balance?", "Are there any hobbies or interests that are important to you?"] },
    family: { title: "Family & Relationships", questions: ["What role does your family play in your everyday life?", "How do you celebrate festivals and family occasions?", "How would you like our families to get to know each other?", "What does a supportive family look like to you?", "How do you handle differences of opinion with family?"] },
    values: { title: "Values & Beliefs", questions: ["Which values guide your big decisions?", "What does a respectful partnership mean to you?", "Is spirituality or faith part of your daily life?", "What are you not willing to compromise on?", "What did you learn from the people who raised you?"] },
    career: { title: "Career & Goals", questions: ["What are you working towards in the next few years?", "How do you feel about relocating for work?", "How do you want to balance career and home?", "What does financial security mean to you?", "Is there a dream you have not started on yet?"] },
    communication: { title: "Communication", questions: ["How do you prefer to talk through a disagreement?", "What helps you feel heard?", "How often do you like to talk during a busy week?", "How do you show care for someone?", "What is one thing people often misunderstand about you?"] },
    future: { title: "Future Plans", questions: ["Where would you like to live in five years?", "What would a good year together look like?", "How do you imagine sharing household responsibilities?", "What traditions would you like to keep or start?", "What are you most looking forward to in married life?"] }
};

const detectTopic = (t) => {
    if (/(lifestyle|daily|routine|weekend|hobb)/.test(t)) return "lifestyle";
    if (/(family|parent|mother|father|festival)/.test(t)) return "family";
    if (/(value|belief|faith|religio|spiritual)/.test(t)) return "values";
    if (/(career|job|work|money|financ|relocat)/.test(t)) return "career";
    if (/(communicat|argu|disagree|fight|talk)/.test(t)) return "communication";
    if (/(future|plan|years|marri)/.test(t)) return "future";
    return null;
};

const detectIntent = (t, explicit) => {
    if (explicit) return explicit;
    if (/(privacy|safe|block|report|share|data|see my)/.test(t)) return "privacy_safety";
    if (/(next|what now|what should we do|how to move|stage)/.test(t)) return "next_steps";
    if (/(understand|explain|what does|meaning|why|want to know more|know (him|her|them) better|get to know)/.test(t)) return "help_me_understand";
    return "conversation_ideas";
};

const kbFor = (stage, intent) => KB.filter((c) => (c.stage === stage || c.stage === "global") && c.intent === intent);

const STAGE_NAMES = { connect: "Connect", understand: "Understand", reflect: "Reflect", discuss: "Discuss", agree: "Agree", family: "Family", reflect_again: "Reflect Again", decision: "Decision" };

const CHIPS = ["Conversation ideas", "Help me understand", "Tips for next steps", "Privacy & safety"];

/**
 * @param {{ message?:string, intent?:string, stage?:string, partnerName?:string }} input
 * @returns {{ intent, reply, title?, questions:string[], chips:string[], sources:string[], safety:{status,flags}, fallback_used:boolean }}
 */
const respond = ({ message = "", intent: explicitIntent, stage = "understand", partnerName = "" }) => {
    const t = String(message || "").toLowerCase();
    const flags = checkInput(t);
    if (flags.length) {
        const top = PRIORITY.find((f) => flags.includes(f));
        return { intent: "privacy_safety", reply: SAFE_REPLIES[top], questions: [], chips: CHIPS, sources: [], safety: { status: "modified", flags }, fallback_used: true };
    }
    const intent = detectIntent(t, explicitIntent);
    const who = partnerName || "them";
    const stageName = STAGE_NAMES[stage] || "current";

    if (intent === "conversation_ideas") {
        const topic = detectTopic(t) || (stage === "family" ? "family" : stage === "discuss" ? "future" : "lifestyle");
        const bank = TOPIC_QUESTIONS[topic];
        return {
            intent, title: bank.title,
            reply: `Of course! Here are some questions you can explore with ${who}. Choose the ones that feel right for your conversation.`,
            questions: bank.questions, chips: CHIPS,
            sources: kbFor(stage, intent).slice(0, 2).map((c) => c.chunk_id),
            safety: { status: "pass", flags: [] }, fallback_used: true
        };
    }
    const chunks = kbFor(stage, intent).filter((c) => c.stage !== "global").concat(kbFor(stage, intent).filter((c) => c.stage === "global")).slice(0, 3);
    const lead = {
        help_me_understand: `Here is what the ${stageName} stage is about.`,
        next_steps: `Here are some gentle next steps for the ${stageName} stage.`,
        privacy_safety: "Here is how your privacy and safety are protected."
    }[intent];
    return {
        intent,
        reply: [lead, ...chunks.map((c) => c.text)].join(" "),
        questions: intent === "next_steps" ? TOPIC_QUESTIONS[stage === "family" ? "family" : "communication"].questions.slice(0, 3) : [],
        chips: CHIPS,
        sources: chunks.map((c) => c.chunk_id),
        safety: { status: "pass", flags: [] },
        fallback_used: true
    };
};

module.exports = { respond, checkInput, SAFE_REPLIES, TOPIC_QUESTIONS, HELPLINES };
