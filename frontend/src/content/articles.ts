/**
 * Static help, policy and explanation pages. Every statement here must match how the product
 * actually works (see backend/backend). Update both together.
 */
export type Article = {
  title: string;
  subtitle?: string;
  icon?: string;
  tint?: string;
  sections: { heading?: string; body?: string; bullets?: string[]; tone?: 'green' | 'red' }[];
  note?: string;
};

export const ARTICLES: Record<string, Article> = {
  // ---------- AI & Privacy ----------
  'ai-data-usage': {
    title: 'Data Usage & Privacy',
    subtitle: 'How Setu Guide and Sambandh Setu use your information.',
    icon: 'shield-checkmark-outline', tint: 'blue',
    sections: [
      { body: 'Setu Guide helps you with conversation ideas, understanding each stage, and next steps. It only works with the information you allow, and it never makes decisions for you.' },
      { heading: 'In short', bullets: ['Optional access to your profile, preferences and journey is off until you turn it on.', 'Your private Reflect answers are never shared with anyone, and Setu Guide uses them only if you allow it.', 'You can delete Setu Guide history at any time.', 'Nothing is sold or shared with advertisers.'] },
    ],
  },
  'ai-how-used': {
    title: 'How Your Data Is Used',
    subtitle: 'What Setu Guide uses to give you helpful suggestions.',
    icon: 'git-network-outline', tint: 'purple',
    sections: [
      { heading: 'What you type', body: 'Your message to Setu Guide is used to answer you. Messages are checked for safety first, for example to show helpline numbers if someone is in distress.' },
      { heading: 'Your journey stage', body: 'When you ask about a connection, Setu Guide uses the current stage of that journey (for example "Understand") so suggestions fit where you are.' },
      { heading: 'Information you allow', bullets: ['Profile information: interests, values and languages, only if "Profile information" is on.', 'Partner preferences: only if "Partner preferences" is on.', 'About the other person: only their first name and the interests already shown on their profile.'] },
      { heading: 'History', body: 'If "Save conversation history" is on, your conversations are kept so you can read them again. You can delete one conversation or all of them from Settings > Setu Guide > AI conversation history.' },
    ],
  },
  'ai-not-used': {
    title: 'What Data Is Not Used',
    subtitle: 'Some information is never used by Setu Guide.',
    icon: 'eye-off-outline', tint: 'red',
    sections: [
      { bullets: ['Another person\'s private Reflect answers.', 'Anyone\'s phone number, email address or exact location.', 'Your verification documents.', 'Your chats, unless you turn on "Use chat context".', 'Your family members\' details.'], tone: 'red' },
      { body: 'Setu Guide does not predict whether a relationship will work, rate people, or tell you whom to choose.' },
    ],
  },
  'ai-storage': {
    title: 'Data Storage & Security',
    subtitle: 'How your information is protected.',
    icon: 'lock-closed-outline', tint: 'green',
    sections: [
      { bullets: ['All traffic between the app and our servers is encrypted (HTTPS/TLS).', 'Passwords are stored only as salted hashes. One-time codes are stored as keyed hashes and expire after 10 minutes.', 'Photos are delivered through links that expire; verification documents are never shown to other members.', 'When you delete your account, your profile, photos, chats, reflections, family invitations, verification documents and Setu Guide history are deleted.'] },
      { heading: 'Your data rights', body: 'You can download a copy of your data at any time from Settings > Account > Manage Account.' },
    ],
  },
  'ai-commitment': {
    title: 'Our Commitment',
    subtitle: 'The principles Setu Guide follows.',
    icon: 'heart-outline', tint: 'pink',
    sections: [
      { bullets: ['You stay in control: Setu Guide suggests, you decide.', 'No predictions about relationships or people.', 'No pressure: you can pause, take more time or stop at any stage.', 'Respect for families, cultures and personal boundaries.', 'Honesty about what the Guide can and cannot do.'] },
    ],
  },
  'ai-controls': {
    title: 'Your Controls',
    subtitle: 'Settings you can change at any time.',
    icon: 'options-outline', tint: 'amber',
    sections: [
      { bullets: ['Turn Setu Guide on or off.', 'Choose what Setu Guide can access: profile, preferences, journey data, chat context, private reflections.', 'Turn guidance on sensitive topics on or off.', 'Keep or stop saving conversation history, and delete it.', 'Download your data or delete your account.'] },
    ],
    note: 'Find these in Settings > Setu Guide and Settings > AI & Privacy.',
  },
  // ---------- Setu Guide sensitive topics ----------
  'sensitive-what': {
    title: 'What are sensitive topics?',
    subtitle: 'Examples and how we handle them.',
    icon: 'alert-circle-outline', tint: 'purple',
    sections: [
      { body: 'Some conversations need extra care. By default, Setu Guide gives only general guidance on them.' },
      { heading: 'Examples', bullets: ['Religion, caste and community expectations', 'Money, dowry and financial pressure', 'Health, disability and family medical history', 'Past relationships, divorce and children', 'Disagreements with family about the relationship'] },
      { heading: 'Safety first', body: 'If a message suggests someone may be in danger or distress, Setu Guide always shows helpline information, whatever this setting is.' },
    ],
  },
  'sensitive-how': {
    title: 'How it works',
    subtitle: 'How Setu Guide provides guidance on sensitive topics.',
    icon: 'help-circle-outline', tint: 'blue',
    sections: [
      { heading: 'When it is off (default)', body: 'Setu Guide keeps answers general and suggests talking to people you trust.' },
      { heading: 'When you turn it on', body: 'Setu Guide can suggest gentle ways to raise a sensitive topic with your connection or family, and questions to understand each other better.' },
      { heading: 'What never changes', bullets: ['It never judges, labels or ranks people.', 'It never tells you what to decide.', 'It never shares what you discuss.'] },
    ],
  },
  // ---------- Verification ----------
  'about-verification': {
    title: 'About verification',
    subtitle: 'Learn more about verification on Sambandh Setu.',
    icon: 'shield-checkmark-outline', tint: 'green',
    sections: [
      { heading: 'What verification means', bullets: ['A person from our team has checked a document you submitted (identity, professional or additional).', 'It helps build trust in the community.'] },
      { heading: 'What verification does not mean', bullets: ['It does not guarantee a person\'s character, intentions or safety.', 'Always use your own judgement and follow the safety guidelines.'] },
      { heading: 'Your privacy', bullets: ['Documents are used only for verification.', 'They are never shown to other members.', 'They are deleted when you delete your account.'] },
    ],
  },
  // ---------- Help & Safety ----------
  'community-guidelines': {
    title: 'Community Guidelines',
    subtitle: 'How we keep Sambandh Setu respectful and safe.',
    icon: 'people-outline', tint: 'blue',
    sections: [
      { heading: 'Be genuine', bullets: ['Use your real name, age and recent photos.', 'Be clear about what you are looking for.', 'One account per person.'] },
      { heading: 'Be respectful', bullets: ['No harassment, threats, hate or discrimination.', 'Respect a "no", a pause or a closed connection.', 'Never pressure anyone for money, gifts or personal details.'] },
      { heading: 'Keep it safe', bullets: ['Do not share other people\'s private information.', 'Report suspicious behaviour from the person\'s profile or the chat menu.', 'Meet in public places and tell someone you trust.'] },
      { heading: 'What happens if rules are broken', body: 'Our team reviews every report. We may warn, restrict or remove accounts that break these guidelines.' },
    ],
  },
  'safety-meeting': {
    title: 'Meeting someone safely',
    icon: 'cafe-outline', tint: 'amber',
    sections: [{ bullets: ['Get to know each other on Sambandh Setu before meeting.', 'Meet in a public place during the day.', 'Tell a friend or family member where you will be.', 'Arrange your own travel.', 'Leave if you feel uncomfortable. You never owe anyone an explanation.'] }],
  },
  'safety-scams': {
    title: 'Recognising scams',
    icon: 'warning-outline', tint: 'red',
    sections: [{ bullets: ['Requests for money, gifts, investments or help with "customs fees".', 'Refusing to talk on video or meet, with constant excuses.', 'Pressure to move to another app quickly.', 'Stories that change or feel too good to be true.'] }, { body: 'If something feels wrong, stop replying and report the profile. Never send money to someone you have not met.' }],
  },
  'safety-privacy': {
    title: 'Protecting your privacy',
    icon: 'lock-closed-outline', tint: 'green',
    sections: [{ bullets: ['Keep your phone number, address and workplace private until you trust someone.', 'Use Profile information sharing to choose what others see.', 'Family details are private unless you turn sharing on.', 'Use Family Access to share selected information with family instead of screenshots.'] }],
  },
  'safety-helplines': {
    title: 'Helplines in India',
    subtitle: 'If you or someone else is in danger, get help now.',
    icon: 'call-outline', tint: 'red',
    sections: [
      { bullets: ['Emergency (police, fire, ambulance): 112', 'Tele-MANAS mental health support (free, 24x7): 14416 or 1-800-891-4416', 'Women Helpline: 181', 'Cyber crime helpline: 1930, or report at cybercrime.gov.in'] },
      { body: 'You can also block and report anyone from their profile. Our team reviews every report.' },
    ],
  },
  // ---------- Legal / company ----------
  about: {
    title: 'About Sambandh Setu',
    subtitle: 'Find with purpose. Connect with trust.',
    icon: 'information-circle-outline', tint: 'blue',
    sections: [
      { body: 'Sambandh Setu is a relationship platform for people who are ready for meaningful, value-aligned connections. From self-reflection to conversations and next steps, it supports you with tools, guidance and choices that respect your pace and your family.' },
      { heading: 'How it is different', bullets: ['An eight-stage journey you move through together, only when you are both ready.', 'Private reflection with answer-by-answer sharing.', 'Optional, permission-based family involvement.', 'Setu Guide: suggestions, never decisions.'] },
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    icon: 'document-text-outline', tint: 'slate',
    sections: [
      { heading: 'What we collect', bullets: ['Account details: name, email, optional mobile number, password (stored as a hash).', 'Profile details you add: date of birth, gender, location, education, profession, photos, interests, values, lifestyle, family and partner preferences.', 'Activity needed to run the service: requests, connections, journey progress, reflections, chats, reports and support requests.', 'Verification documents you choose to submit.'] },
      { heading: 'How we use it', bullets: ['To show your profile to people allowed by your privacy settings.', 'To run connections, chats and the Setu journey.', 'To review verification and reports.', 'To keep the service safe and working.'] },
      { heading: 'What we never do', bullets: ['Sell your data.', 'Show your private Reflect answers to anyone you did not choose.', 'Show verification documents to other members.'] },
      { heading: 'Your choices and rights', body: 'You control visibility from Settings > Privacy & Visibility. You can download your data or delete your account from Settings > Account > Manage Account. Deleting your account removes your data from the service.' },
      { heading: 'Contact', body: 'Use Settings > Help & Support > Contact Support for any privacy question or request.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    icon: 'document-text-outline', tint: 'slate',
    sections: [
      { heading: 'Who can use Sambandh Setu', body: 'You must be at least 18 years old and legally able to marry or enter a relationship where you live. Use your real identity.' },
      { heading: 'Your responsibilities', bullets: ['Follow the Community Guidelines.', 'Keep your password safe.', 'Only share information you have the right to share.'] },
      { heading: 'Our responsibilities', bullets: ['Protect your data as described in the Privacy Policy.', 'Review reports and act on them.', 'Explain changes to these terms before they take effect.'] },
      { heading: 'Setu Guide', body: 'Setu Guide gives general suggestions. It is not professional, legal, medical or psychological advice, and it does not make decisions for you.' },
      { heading: 'Ending your account', body: 'You can deactivate or delete your account at any time. We may suspend accounts that break these terms.' },
    ],
  },
};

export const SAFETY_RESOURCES = [
  { slug: 'safety-meeting', title: 'Meeting someone safely', text: 'Simple steps before and during a first meeting.', icon: 'cafe-outline', tint: 'amber' },
  { slug: 'safety-scams', title: 'Recognising scams', text: 'Warning signs of romance and money scams.', icon: 'warning-outline', tint: 'red' },
  { slug: 'safety-privacy', title: 'Protecting your privacy', text: 'What to keep private and which settings help.', icon: 'lock-closed-outline', tint: 'green' },
  { slug: 'safety-helplines', title: 'Helplines in India', text: 'Emergency and support numbers, available 24x7.', icon: 'call-outline', tint: 'red' },
] as const;

export const FAQS = [
  { q: 'How does Sambandh Setu work?', a: 'Create your profile, discover people who share your values, and send respectful interest. When both of you agree, you are connected and can chat and move through the eight Setu stages together, at your own pace.' },
  { q: 'Who can see my profile?', a: 'You choose. In Settings > Privacy & Visibility you can show your profile to everyone, only to people matching your preferences, or only to people you are connected with. You can also hide your profile temporarily.' },
  { q: 'What is the Setu journey?', a: 'Eight stages: Connect, Understand, Reflect, Discuss, Agree, Family, Reflect Again and Decision. A stage is complete only when both people complete it, so nobody is rushed ahead.' },
  { q: 'Are my Reflect answers private?', a: 'Yes. Each answer is private by default. For each one you choose to keep it private, share it, or decide later. Shared answers become visible only after you finish the stage.' },
  { q: 'How does Family Access work?', a: 'You can invite trusted family members with a link, email or phone number. They see only what you allow, cannot message anyone, and you can change or remove their access at any time.' },
  { q: 'How is verification done?', a: 'You upload a document (for example an ID, employment letter or degree). A person from our team reviews it. Documents are never shown to other members.' },
  { q: 'How do I report or block someone?', a: 'Open their profile or the chat menu and choose Report or Block. Blocking hides you from each other immediately. Our team reviews every report.' },
  { q: 'Can I pause or end a connection?', a: 'Yes. You can pause a connection at any time and resume it later, or close it respectfully. The other person is told the connection was paused, not why.' },
  { q: 'How do I delete my account?', a: 'Go to Settings > Account > Manage Account > Delete account. Your profile, photos, chats and other data are deleted.' },
] as const;
