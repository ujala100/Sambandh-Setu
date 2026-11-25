/**
 * The Setu journey: eight stages two people move through together, at their own pace.
 * A stage is complete only when BOTH people have marked it complete (the audit found one person
 * could advance the shared journey alone). Reflect stages also need all questions answered.
 */
const STAGES = [
    { key: "connect", title: "Connect", short: "Connection established", description: "Find a relevant connection and accept each other." },
    { key: "understand", title: "Understand", short: "Learn about each other's values, lifestyle and perspectives.", description: "Get to know each other beyond the basics: daily life, work, interests, values and hopes for the future." },
    { key: "reflect", title: "Reflect", short: "Take time for your personal thoughts.", description: "Answer ten private questions. You decide, answer by answer, what to share." },
    { key: "discuss", title: "Discuss", short: "Have meaningful conversations on important topics.", description: "Talk openly about values, family, money, careers and the life you each imagine." },
    { key: "agree", title: "Agree", short: "Explore alignment and shared vision.", description: "Notice where you agree, where you differ, and what you would each need." },
    { key: "family", title: "Family", short: "Decide together when to involve family.", description: "Bring families in when you are both ready, in the way you both choose." },
    { key: "reflect_again", title: "Reflect Again", short: "Revisit your thoughts after the family stage.", description: "A short, private check-in after meeting each other's families." },
    { key: "decision", title: "Decision", short: "Make your decision, at your own pace.", description: "Decide together what comes next. Pausing or ending respectfully is always an option." }
];
const STAGE_KEYS = STAGES.map((s) => s.key);

const OTHER = "Other (please specify)";

const REFLECT_QUESTIONS = [
    { key: "q1_marriage_priorities", category: "Values & Beliefs", type: "multi", max: 3,
        prompt: "What matters most to you in a marriage?", hint: "You can select up to 3 options.",
        why: "Knowing your priorities helps you explain what you hope for in a shared life.",
        options: ["Emotional understanding", "Family relationships", "Career growth", "Financial stability", "Personal independence", "Shared interests and hobbies", "Spiritual or religious alignment", OTHER] },
    { key: "q2_where_to_live", category: "Lifestyle & Daily Life", type: "single",
        prompt: "Where would you ideally like to live after marriage?", hint: "Select the option that feels closest to you.",
        why: "Living arrangements shape daily life, so it helps to know each other's expectations early.",
        options: ["With my family", "Independently", "Open to either", "Depends on circumstances", "Not sure yet", OTHER] },
    { key: "q3_career_importance", category: "Career & Goals", type: "scale", min: 1, max: 5, minLabel: "Not important at all", maxLabel: "Very important",
        prompt: "How important is career growth to you after marriage?", hint: "Select a rating from 1 to 5.",
        why: "Career plans affect time, location and shared responsibilities." },
    { key: "q4_household", category: "Lifestyle & Daily Life", type: "multi",
        prompt: "What are your expectations around household responsibilities?", hint: "You can select all that apply.",
        why: "Talking about everyday responsibilities early prevents unspoken assumptions.",
        options: ["Share work equally", "Divide based on availability", "I don't have a specific expectation", "Open to discussing and adjusting", "Prefer traditional roles", OTHER] },
    { key: "q5_communication", category: "Emotions & Communication", type: "single",
        prompt: "How do you prefer to communicate when something is bothering you?", hint: "Select the option that feels closest to you.",
        why: "Everyone handles difficult moments differently. Knowing your style helps your partner support you.",
        options: ["Talk about it immediately", "Take time to calm down first", "Discuss it later", "Prefer written communication", "It depends on the situation", OTHER] },
    { key: "q6_non_negotiables", category: "Values & Beliefs", type: "text", maxLength: 500,
        prompt: "What personal values would you not want to compromise on?", hint: "Share your thoughts in your own words.",
        why: "Naming your core values makes it easier to see where you align." },
    { key: "q7_concerns", category: "Emotions & Communication", type: "multi", max: 3,
        prompt: "What concerns, if any, do you have about entering marriage?", hint: "You can select up to 3 options.",
        why: "Concerns are normal. Naming them privately is the first step to talking about them.",
        options: ["Adjusting to a new family", "Balancing career and family", "Financial responsibilities", "Loss of personal freedom", "Differences in expectations", "Long-distance relationships", "I don't have major concerns", OTHER] },
    { key: "q8_difficult_topics", category: "Emotions & Communication", type: "scale", min: 1, max: 5, minLabel: "Not comfortable", maxLabel: "Very comfortable",
        prompt: "How comfortable are you discussing difficult topics with a partner?", hint: "Select a rating from 1 to 5.",
        why: "Comfort with hard conversations grows with trust. There is no right number." },
    { key: "q9_independence_balance", category: "Lifestyle & Daily Life", type: "text", maxLength: 500,
        prompt: "How do you want to balance personal independence and shared responsibilities?", hint: "Share your thoughts in your own words.",
        why: "A healthy partnership leaves room for both people." },
    { key: "q10_respect_support", category: "Emotions & Communication", type: "text", maxLength: 500,
        prompt: "What would help you feel respected and emotionally supported in a marriage?", hint: "Share your thoughts in your own words.",
        why: "Knowing what support means to you helps your partner show up in the right way." }
];

const REFLECT_AGAIN_QUESTIONS = [
    { key: "r1_family_feel", category: "Family & Relationships", type: "scale", min: 1, max: 5, minLabel: "Uneasy", maxLabel: "Very comfortable",
        prompt: "How do you feel after meeting each other's families?", hint: "Select a rating from 1 to 5.", why: "Your feelings after the family stage matter." },
    { key: "r2_changed", category: "Values & Beliefs", type: "text", maxLength: 500,
        prompt: "Has anything changed in how you see this relationship?", hint: "Share your thoughts in your own words.", why: "It is fine for views to change." },
    { key: "r3_need", category: "Emotions & Communication", type: "multi", max: 3,
        prompt: "What would help you feel ready for a decision?", hint: "You can select up to 3 options.", why: "Readiness looks different for everyone.",
        options: ["More time together", "Another family conversation", "Clarity on finances", "Clarity on where we will live", "Guidance from someone I trust", "I already feel ready", OTHER] },
    { key: "r4_confidence", category: "Values & Beliefs", type: "scale", min: 1, max: 5, minLabel: "Unsure", maxLabel: "Confident",
        prompt: "How confident do you feel about moving forward?", hint: "Select a rating from 1 to 5.", why: "There is no right answer and no deadline." },
    { key: "r5_note", category: "Emotions & Communication", type: "text", maxLength: 500,
        prompt: "Is there anything you would like your partner to know before the decision stage?", hint: "Share your thoughts in your own words.", why: "Optional, and only shared if you choose." }
];

const questionsFor = (stage) => (stage === "reflect" ? REFLECT_QUESTIONS : stage === "reflect_again" ? REFLECT_AGAIN_QUESTIONS : []);

const SHARING = ["keep_private", "share", "share_later"];

/** Validates an answer against its question. Returns the normalised stored value. */
const validateAnswer = (q, value, otherText) => {
    const bad = (m) => { const e = new Error(m); e.status = 400; throw e; };
    if (q.type === "single") {
        if (!q.options.includes(value)) bad("Please choose one of the options");
        if (value === OTHER && !String(otherText || "").trim()) bad("Please tell us a little more");
        return value;
    }
    if (q.type === "multi") {
        if (!Array.isArray(value) || !value.length) bad("Please choose at least one option");
        if (q.max && value.length > q.max) bad(`You can select up to ${q.max} options`);
        if (!value.every((v) => q.options.includes(v))) bad("Please choose from the options shown");
        if (value.includes(OTHER) && !String(otherText || "").trim()) bad("Please tell us a little more");
        return value;
    }
    if (q.type === "scale") {
        if (!Number.isInteger(value) || value < q.min || value > q.max) bad(`Choose a rating from ${q.min} to ${q.max}`);
        return value;
    }
    if (typeof value !== "string" || !value.trim()) bad("Please write a short answer");
    if (value.length > (q.maxLength || 500)) bad(`Please keep it under ${q.maxLength || 500} characters`);
    return value.trim();
};

const STAGE_CONTENT = {
    connect: {
        meaning: "You have both chosen to start a conversation. Take your time to say hello and see whether you would like to know each other better.",
        suggestions: [
            { title: "Conversation Starters", text: "Light, friendly questions for your first conversations." },
            { title: "Set your pace", text: "Agree on how often you would like to talk." },
            { title: "Tips from Setu Guide", text: "Be yourself, be kind and be clear about your intentions." }
        ],
        activities: ["Exchange a few messages about your week", "Share one thing you are looking forward to"],
        resources: ["Community Guidelines", "Safety tips for first conversations"]
    },
    understand: {
        meaning: "This is a time to get to know each other beyond the basics. You can explore daily life, work, interests, values and future aspirations.",
        suggestions: [
            { title: "Conversation Starters", text: "Thoughtful questions to get to know each other better." },
            { title: "Learn Together", text: "Short guides on lifestyle, goals and expectations." },
            { title: "Tips from Setu Guide", text: "Expert-backed insights for meaningful conversations." }
        ],
        activities: ["Describe a typical weekday and weekend", "Share what family means to you", "Talk about a goal for the next five years"],
        resources: ["How to ask open questions", "Listening well"]
    },
    reflect: {
        meaning: "A private stage. Answer ten questions about your values and expectations, then choose what to share with your partner.",
        suggestions: [
            { title: "Answer honestly", text: "There are no right or wrong answers." },
            { title: "Choose sharing per answer", text: "Keep an answer private, share it, or decide later." },
            { title: "Take your time", text: "You can save your progress and return anytime." }
        ],
        activities: ["Complete the ten Reflect questions", "Decide what to share"],
        resources: ["Why reflection matters"]
    },
    discuss: {
        meaning: "Use what you each shared to talk about the important topics: family, finances, careers, where you will live and how you handle disagreements.",
        suggestions: [
            { title: "Topics to discuss", text: "A gentle list of subjects many couples talk about." },
            { title: "Disagreeing well", text: "How to talk when you see things differently." },
            { title: "Ask Setu Guide", text: "Get ideas for how to open a difficult topic." }
        ],
        activities: ["Pick two topics to talk about this week", "Share one hope and one worry"],
        resources: ["Talking about money", "Talking about family expectations"]
    },
    agree: {
        meaning: "Notice where you align and where you differ. Agreement does not mean being the same; it means understanding what each of you needs.",
        suggestions: [
            { title: "Shared vision", text: "Write down what a good year together would look like." },
            { title: "Differences", text: "List the differences you can live with and the ones to talk about more." },
            { title: "Ask Setu Guide", text: "Get help summarising what you have discussed." }
        ],
        activities: ["Agree on three shared priorities"],
        resources: ["Building a shared vision"]
    },
    family: {
        meaning: "Decide together when and how to involve your families. You set the pace; family involvement is always optional and mutual.",
        suggestions: [
            { title: "Plan the introduction", text: "Choose a setting where everyone can feel comfortable." },
            { title: "Family Access", text: "Let trusted family members view selected parts of your profile." },
            { title: "Ask Setu Guide", text: "Ideas for a first family conversation." }
        ],
        activities: ["Agree on who to introduce first", "Decide what each family should know beforehand"],
        resources: ["Involving family respectfully"]
    },
    reflect_again: {
        meaning: "A short private check-in after the family stage. As before, you decide what to share.",
        suggestions: [
            { title: "Be honest with yourself", text: "It is fine if your feelings have changed." },
            { title: "Take your time", text: "There is no deadline." },
            { title: "Ask Setu Guide", text: "Talk through your thoughts privately." }
        ],
        activities: ["Complete the five check-in questions"],
        resources: ["Making decisions without pressure"]
    },
    decision: {
        meaning: "Decide together what comes next. Whatever you choose, choose it with care. Pausing or ending respectfully is always available.",
        suggestions: [
            { title: "Talk it through", text: "Share your decision with each other first." },
            { title: "Respectful exits", text: "If you decide not to continue, Setu helps you close kindly." },
            { title: "Ask Setu Guide", text: "Reflect on your journey so far." }
        ],
        activities: ["Share your decision with each other"],
        resources: ["Next steps after Setu"]
    }
};

module.exports = { STAGES, STAGE_KEYS, REFLECT_QUESTIONS, REFLECT_AGAIN_QUESTIONS, questionsFor, SHARING, validateAnswer, STAGE_CONTENT, OTHER };
