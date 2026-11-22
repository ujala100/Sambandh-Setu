/**
 * Form schemas for lifestyle, partner preferences and the profile builder. One renderer
 * (components/SchemaForm) draws all of them, so options live here and nowhere else.
 */
export type FieldKind = 'tiles' | 'chips' | 'checklist' | 'radio' | 'select' | 'text' | 'tags' | 'range';
export type Opt = string | { value: string; label?: string; icon?: string; sub?: string };
export type FieldDef = {
  key: string; kind: FieldKind; label?: string; hint?: string; options?: Opt[]; single?: boolean; max?: number;
  placeholder?: string; groups?: { title: string; icon?: string; options: Opt[] }[]; optional?: boolean; maxLength?: number;
  min?: number; maxValue?: number; unit?: string; compact?: boolean;
};
export type StepDef = { title: string; subtitle?: string; fields: FieldDef[]; summary?: boolean };
export type SectionDef = { title: string; subtitle: string; icon: string; tint: string; steps: StepDef[] };

const o = (value: string, icon?: string, sub?: string) => ({ value, icon, sub });
const times = (from: number, to: number) => {
  const out: string[] = [];
  for (let h = from; h <= to; h++) for (const m of [0, 30]) {
    const hh = h % 24;
    const ap = hh >= 12 ? 'PM' : 'AM';
    out.push(`${hh % 12 || 12}:${m ? '30' : '00'} ${ap}`);
  }
  return out;
};

export const LIFESTYLE: Record<string, SectionDef> = {
  food: {
    title: 'Food & Eating Habits', subtitle: 'Tell us about the food you enjoy and your eating preferences.', icon: 'restaurant-outline', tint: 'orange',
    steps: [
      { title: 'Food & Eating Habits', subtitle: 'What best describes your diet?', fields: [{ key: 'diet', kind: 'tiles', single: true, compact: true, options: [o('Vegetarian', 'leaf-outline'), o('Eggetarian', 'egg-outline'), o('Non-vegetarian', 'restaurant-outline'), o('Vegan', 'nutrition-outline'), o('Pescatarian', 'fish-outline'), o('Jain', 'flower-outline'), o('Satvik', 'sunny-outline'), o('Halal', 'moon-outline'), o('Kosher', 'star-outline'), o('No specific preference', 'remove-circle-outline'), o('Other', 'ellipsis-horizontal')] }] },
      { title: 'Cuisines I Enjoy', subtitle: 'Select all the cuisines you like.', fields: [{ key: 'cuisines', kind: 'tiles', compact: true, groups: [
        { title: 'Indian', options: ['South Indian', 'North Indian', 'Andhra', 'Telangana', 'Tamil', 'Kerala', 'Karnataka', 'Bengali', 'Gujarati', 'Punjabi', 'Rajasthani', 'Maharashtrian', 'Odia', 'Kashmiri', 'Assamese', 'Goan', 'Mughlai', 'Indo-Chinese'] },
        { title: 'Asian', options: ['Chinese', 'Japanese', 'Thai', 'Korean'] },
        { title: 'European', options: ['Italian', 'French', 'Continental', 'Mediterranean'] },
        { title: 'Middle Eastern', options: ['Lebanese', 'Turkish', 'Arabic'] },
      ] }] },
      { title: 'Eating Style', subtitle: 'How do you usually prefer to eat?', fields: [{ key: 'style', kind: 'tiles', single: true, options: [o('Mostly home-cooked', 'home-outline'), o('Usually eat out', 'restaurant-outline'), o('Mix of home-cooked & eating out', 'swap-horizontal-outline'), o('Enjoy trying new foods', 'sparkles-outline'), o('Prefer familiar foods', 'heart-outline'), o('Street-food lover', 'cart-outline'), o('Café / restaurant lover', 'cafe-outline'), o('Health-conscious eating', 'leaf-outline'), o('Flexible', 'shuffle-outline')] }] },
      { title: 'Food Habits', subtitle: 'What sounds like you? Select all that apply.', fields: [{ key: 'habits', kind: 'checklist', options: ['Breakfast is important to me', 'Prefer light meals', 'Prefer hearty meals', 'Enjoy snacks', 'Enjoy sweets & desserts', 'Enjoy spicy food', 'Prefer mild food', 'Enjoy experimenting with food', 'Prefer traditional food', 'Enjoy seasonal foods', 'Prefer fresh / homemade food'] }] },
      { title: 'Food Restrictions', subtitle: 'Do you have any food restrictions?', fields: [{ key: 'restrictions', kind: 'checklist', options: ['None', 'Food allergies', 'Lactose intolerance', 'Gluten-free', 'Avoid certain ingredients', 'Medical / dietary restriction', 'Religious dietary restriction', 'Other'] }, { key: 'restrictionNote', kind: 'text', label: 'Tell us more', optional: true, placeholder: 'e.g. I avoid garlic and onion', maxLength: 200 }] },
      { title: 'Spice Preference', subtitle: 'How spicy do you like your food?', fields: [{ key: 'spice', kind: 'tiles', single: true, compact: true, options: [o('Mild', 'flame-outline'), o('Medium', 'flame-outline'), o('Spicy', 'flame'), o('Very spicy', 'bonfire-outline')] }] },
      { title: 'Where do you enjoy eating?', subtitle: 'Select all that apply.', fields: [{ key: 'places', kind: 'tiles', compact: true, options: [o('At home', 'home-outline'), o('Restaurants', 'restaurant-outline'), o('Cafés', 'cafe-outline'), o('Street food', 'cart-outline'), o('Food courts', 'storefront-outline'), o('Fine dining', 'wine-outline'), o('Family gatherings', 'people-outline'), o('Outdoor / picnic', 'leaf-outline'), o("Doesn't matter", 'ellipsis-horizontal')] }] },
      { title: 'Anything else about your food preferences?', subtitle: 'For example: favourite dishes, foods you avoid, or something important to know.', summary: true, fields: [{ key: 'notes', kind: 'text', optional: true, maxLength: 300, placeholder: 'I love South Indian food and enjoy trying new cuisines.' }] },
    ],
  },
  music: {
    title: 'Music', subtitle: 'Tell us about the music you enjoy.', icon: 'musical-notes-outline', tint: 'purple',
    steps: [{ title: 'Music', subtitle: 'Tell us about the music you enjoy.', fields: [
      { key: 'genres', kind: 'tiles', label: 'Music Genres', hint: 'Select all that apply.', compact: true, options: [o('Indian Classical', 'musical-note-outline'), o('Devotional / Spiritual', 'flower-outline'), o('Regional Music', 'map-outline'), o('Bollywood / Indian Film Music', 'film-outline'), o('Folk & Traditional', 'leaf-outline'), o('Ghazal / Sufi', 'moon-outline'), o('Western Classical', 'musical-notes-outline'), o('Pop', 'star-outline'), o('Rock', 'flash-outline'), o('Indie', 'radio-outline'), o('Jazz / Blues', 'cafe-outline'), o('R&B / Soul', 'heart-outline'), o('EDM / Electronic', 'pulse-outline'), o('Hip-Hop / Rap', 'mic-outline'), o('Instrumental', 'musical-note'), o('Acoustic', 'disc-outline'), o('Other', 'ellipsis-horizontal')] },
      { key: 'languages', kind: 'chips', label: 'Languages of Music', hint: 'Which language songs do you enjoy?', options: ['Telugu', 'Tamil', 'Hindi', 'English', 'Kannada', 'Malayalam', 'Bengali', 'Punjabi', 'Marathi', 'Other'] },
      { key: 'frequency', kind: 'tiles', single: true, label: 'Listening Habits', hint: 'How often do you listen to music?', compact: true, options: [o('Very often', 'headset-outline', 'Every day'), o('Often', 'play-circle-outline', 'Several times a week'), o('Sometimes', 'calendar-outline', 'A few times a month'), o('Rarely', 'sunny-outline', 'Occasionally')] },
      { key: 'when', kind: 'tiles', label: 'When do you usually listen?', hint: 'Select all that apply.', compact: true, options: [o('While studying / working', 'laptop-outline'), o('While travelling', 'car-outline'), o('During workouts', 'barbell-outline'), o('To relax', 'leaf-outline'), o('Before sleeping', 'moon-outline'), o('At social gatherings', 'people-outline')] },
      { key: 'artists', kind: 'tags', label: 'Favourite Artists / Songs', optional: true, placeholder: 'e.g. A.R. Rahman, Shreya Ghoshal' },
      { key: 'notes', kind: 'text', label: 'Anything else about your music preferences?', optional: true, maxLength: 300, placeholder: 'e.g. I love soulful music and listen while travelling.' },
    ] }],
  },
  movies: {
    title: 'Movies & Shows', subtitle: 'Tell us about the movies and shows you enjoy.', icon: 'film-outline', tint: 'red',
    steps: [{ title: 'Movies & Shows', subtitle: 'Tell us about the movies and shows you enjoy.', fields: [
      { key: 'genres', kind: 'tiles', label: 'Genres', hint: 'Select all that apply.', compact: true, options: [o('Drama', 'film-outline'), o('Comedy', 'happy-outline'), o('Romance', 'heart-outline'), o('Thriller', 'flash-outline'), o('Mystery', 'search-outline'), o('Crime', 'finger-print-outline'), o('Action', 'flame-outline'), o('Adventure', 'compass-outline'), o('Sci-Fi', 'planet-outline'), o('Fantasy', 'sparkles-outline'), o('Horror', 'skull-outline'), o('Animation', 'color-palette-outline'), o('Family', 'people-outline'), o('Documentary', 'videocam-outline'), o('Biography', 'book-outline'), o('Historical', 'library-outline'), o('Sports', 'football-outline'), o('Musical', 'musical-notes-outline'), o('Feel-good', 'sunny-outline'), o('Regional Cinema', 'map-outline'), o('International Cinema', 'globe-outline'), o('Other', 'ellipsis-horizontal')] },
      { key: 'languages', kind: 'chips', label: 'Languages / Cinema I Enjoy', options: ['Telugu', 'Tamil', 'Hindi', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'English', 'Korean', 'Japanese', 'Other'] },
      { key: 'formats', kind: 'tiles', label: 'What I Usually Watch', compact: true, options: [o('Movies', 'film-outline'), o('Web series', 'tv-outline'), o('TV shows', 'desktop-outline'), o('Documentaries', 'videocam-outline'), o('Short films', 'play-outline'), o('Anime', 'color-palette-outline'), o('Reality shows', 'people-outline'), o('Stand-up', 'mic-outline'), o('Other', 'ellipsis-horizontal')] },
      { key: 'style', kind: 'tiles', label: 'Watching Style', hint: 'How do you usually like to watch?', compact: true, options: [o('At home', 'home-outline'), o('Cinema', 'film-outline'), o('With family', 'people-outline'), o('With friends', 'people-circle-outline'), o('Alone', 'person-outline')] },
      { key: 'frequency', kind: 'tiles', single: true, label: 'How Often Do You Watch?', compact: true, options: [o('Very often', 'calendar-outline', 'Daily'), o('Often', 'calendar-outline', 'Few times a week'), o('Sometimes', 'calendar-outline', 'A few times a month'), o('Rarely', 'hourglass-outline', 'Less than once a month')] },
      { key: 'favourites', kind: 'tags', label: 'Favourite Movies / Shows', optional: true, placeholder: 'e.g. Interstellar, Maharaja, Friends' },
      { key: 'notes', kind: 'text', label: 'Anything else about your entertainment preferences?', optional: true, maxLength: 300, placeholder: 'e.g. I enjoy feel-good movies and regional cinema.' },
    ] }],
  },
  travel: {
    title: 'Travel & Experiences', subtitle: 'Tell us about the places you love to explore and how you wander together.', icon: 'airplane-outline', tint: 'teal',
    steps: [{ title: 'Travel & Experiences', subtitle: 'Tell us about the places you love to explore, preferred style, and how you wander together.', fields: [
      { key: 'places', kind: 'tiles', label: 'Places I Enjoy Visiting', hint: 'Select all destinations you love.', compact: true, groups: [
        { title: 'Nature & Outdoors', options: [o('Beaches', 'umbrella-outline'), o('Mountains & Hills', 'triangle-outline'), o('Lakes & Waterfalls', 'water-outline'), o('Forests & Nature', 'leaf-outline'), o('Wildlife & Safari', 'paw-outline'), o('Adventure Spots', 'trail-sign-outline')] },
        { title: 'Spiritual & Cultural', options: [o('Temples & Faith', 'flower-outline'), o('Spiritual Places', 'sunny-outline'), o('Heritage Sites', 'business-outline'), o('Cultural & Arts', 'color-palette-outline'), o('Museums & Art', 'easel-outline')] },
        { title: 'City & Lifestyle', options: [o('Urban Exploration', 'business-outline'), o('Shopping Havens', 'bag-handle-outline'), o('Food & Culinary', 'restaurant-outline')] },
        { title: 'Relaxation & Others', options: [o('Resorts & Spa', 'bed-outline'), o('Tropical Islands', 'boat-outline'), o('Rural & Villages', 'home-outline')] },
      ] },
      { key: 'style', kind: 'tiles', label: 'Travel Style', hint: 'How do you usually like to travel?', compact: true, options: [o('Solo', 'person-outline'), o('With family', 'people-outline'), o('With friends', 'people-circle-outline'), o('With partner', 'heart-outline'), o('Group travel', 'bus-outline')] },
      { key: 'frequency', kind: 'tiles', single: true, label: 'Travel Frequency', compact: true, options: [o('Frequently', 'airplane-outline', '3+ trips / year'), o('Occasionally', 'calendar-outline', '1-2 trips / yr'), o('Rarely', 'cafe-outline', '< once a year')] },
      { key: 'preference', kind: 'tiles', single: true, label: 'Travel Preference', compact: true, options: [o('Domestic', 'map-outline', 'India only'), o('International', 'globe-outline', 'Abroad'), o('Both', 'airplane-outline', 'Anywhere')] },
      { key: 'activities', kind: 'tiles', label: 'Activities I Enjoy', compact: true, options: [o('Sightseeing', 'eye-outline'), o('Trekking & Hike', 'walk-outline'), o('Photography', 'camera-outline'), o('Camping', 'bonfire-outline'), o('Local Food', 'restaurant-outline'), o('Shopping', 'bag-outline'), o('Spiritual Visits', 'flower-outline'), o('Cultural Shows', 'musical-notes-outline'), o('Adventure Sports', 'bicycle-outline'), o('Relaxing / Unwind', 'bed-outline'), o('Road Trips', 'car-outline'), o('Nature Walks', 'leaf-outline')] },
      { key: 'destinations', kind: 'tags', label: 'Favourite Destinations', optional: true, placeholder: 'e.g. Himalayas, Goa, Kyoto' },
      { key: 'notes', kind: 'text', label: 'Anything else about travel?', optional: true, maxLength: 300, placeholder: 'Share what makes a trip memorable for you.' },
    ] }],
  },
  fitness: {
    title: 'Fitness & Wellness', subtitle: 'Tell us about your fitness routine and overall wellness habits.', icon: 'barbell-outline', tint: 'green',
    steps: [{ title: 'Fitness & Wellness', subtitle: 'Tell us about your fitness routine and overall wellness habits.', fields: [
      { key: 'activities', kind: 'tiles', label: 'Physical Activities', hint: 'Select all that apply.', compact: true, options: [o('Gym', 'barbell-outline'), o('Walking', 'walk-outline'), o('Running', 'speedometer-outline'), o('Yoga', 'body-outline'), o('Pilates', 'fitness-outline'), o('Swimming', 'water-outline'), o('Cycling', 'bicycle-outline'), o('Badminton', 'tennisball-outline'), o('Cricket', 'baseball-outline'), o('Football', 'football-outline'), o('Tennis', 'tennisball-outline'), o('Basketball', 'basketball-outline'), o('Volleyball', 'ellipse-outline'), o('Dance', 'musical-notes-outline'), o('Home Workouts', 'home-outline')] },
      { key: 'frequency', kind: 'tiles', single: true, label: 'Fitness Frequency', hint: 'How often do you engage in physical activities?', compact: true, options: [o('Daily', 'calendar-outline'), o('Several times a week', 'stats-chart-outline'), o('Weekly', 'calendar-number-outline'), o('Occasionally', 'calendar-clear-outline'), o('Rarely', 'hourglass-outline')] },
      { key: 'level', kind: 'tiles', single: true, label: 'Activity Level', compact: true, options: [o('Very active', 'flash-outline'), o('Active', 'walk-outline'), o('Moderately active', 'body-outline'), o('Lightly active', 'accessibility-outline'), o('Relaxed', 'bed-outline')] },
      { key: 'wellness', kind: 'tiles', label: 'Wellness Habits', compact: true, options: [o('Meditation', 'flower-outline'), o('Mindfulness', 'leaf-outline'), o('Healthy Eating', 'nutrition-outline'), o('Quality Sleep', 'moon-outline'), o('Mental Relaxation', 'happy-outline')] },
      { key: 'outdoor', kind: 'tiles', label: 'Outdoor & Nature Activities', compact: true, options: [o('Nature Walks', 'leaf-outline'), o('Hiking', 'trail-sign-outline'), o('Trekking', 'walk-outline'), o('Sports Outdoors', 'football-outline'), o('Other', 'ellipsis-horizontal')] },
      { key: 'notes', kind: 'text', label: 'Anything else about your fitness or wellness routine?', optional: true, maxLength: 300, placeholder: 'e.g. I enjoy morning walks and try to stay active.' },
    ] }],
  },
  routine: {
    title: 'Daily Routine', subtitle: 'Tell us about your typical day and routine.', icon: 'time-outline', tint: 'blue',
    steps: [{ title: 'Daily Routine', subtitle: 'Tell us about your typical day and routine.', fields: [
      { key: 'wakeUp', kind: 'select', label: 'Wake-up time', options: times(4, 11) },
      { key: 'morning', kind: 'chips', label: 'Morning routine', hint: 'Select up to 3', max: 3, options: ['Exercise', 'Meditation', 'Reading', 'Skincare', 'Healthy breakfast', 'Prayer', 'Other'] },
      { key: 'schedule', kind: 'select', label: 'Work / study schedule', options: ['Full-time job', 'Part-time job', 'Full-time student', 'Self-employed', 'Shift work', 'Flexible', 'Not working currently'] },
      { key: 'hours', kind: 'select', label: 'Typical hours', options: ['6:00 AM - 3:00 PM', '9:00 AM - 5:00 PM', '9:00 AM - 6:00 PM', '10:00 AM - 7:00 PM', '11:00 AM - 8:00 PM', 'Night shift', 'Varies'] },
      { key: 'mode', kind: 'radio', label: 'Mode', options: ['On campus / office', 'Hybrid', 'Remote'] },
      { key: 'evening', kind: 'tiles', label: 'Evening', hint: 'What do you usually do in the evenings? (Select up to 3)', max: 3, compact: true, options: [o('Exercise', 'barbell-outline'), o('Hobbies', 'color-palette-outline'), o('Family time', 'people-outline'), o('Friends', 'people-circle-outline'), o('Relaxing', 'cafe-outline'), o('Other', 'ellipsis-horizontal')] },
      { key: 'sleep', kind: 'select', label: 'Sleep time', options: times(20, 26) },
      { key: 'sleepPattern', kind: 'chips', single: true, label: 'Sleep pattern', options: ['Early sleeper', 'Flexible', 'Late sleeper'] },
      { key: 'weekends', kind: 'tiles', label: 'Weekends', hint: 'How do you usually spend your weekends? (Select up to 3)', max: 3, compact: true, options: [o('Travel', 'airplane-outline'), o('Family time', 'people-outline'), o('Friends', 'people-circle-outline'), o('Hobbies', 'color-palette-outline'), o('Rest', 'bed-outline'), o('Spiritual', 'flower-outline'), o('Social activities', 'happy-outline')] },
      { key: 'overall', kind: 'chips', single: true, label: 'Daily Lifestyle', hint: 'Which of these best describes your routine overall?', options: ['Very structured', 'Flexible', 'Busy', 'Balanced'] },
      { key: 'notes', kind: 'text', label: 'Anything else about your daily routine?', optional: true, maxLength: 300, placeholder: 'e.g. I prefer a balanced routine with time for study and exercise.' },
    ] }],
  },
  hobbies: {
    title: 'Hobbies & Interests', subtitle: 'Tell us about the things you enjoy and love to do.', icon: 'color-palette-outline', tint: 'pink',
    steps: [{ title: 'Hobbies & Interests', subtitle: 'Tell us about the things you enjoy and love to do.', fields: [
      { key: 'items', kind: 'tiles', compact: true, groups: [
        { title: 'Creative & Arts', icon: 'color-palette-outline', options: [o('Drawing', 'pencil-outline'), o('Painting', 'brush-outline'), o('Sketching', 'create-outline'), o('Photography', 'camera-outline'), o('Writing', 'document-text-outline'), o('Crafting / DIY', 'cut-outline'), o('Calligraphy', 'pencil-outline'), o('Dancing', 'musical-notes-outline'), o('Singing', 'mic-outline'), o('Music Instruments', 'musical-note-outline')] },
        { title: 'Reading & Learning', icon: 'book-outline', options: [o('Reading', 'book-outline'), o('Fiction', 'library-outline'), o('Non-fiction', 'newspaper-outline'), o('Self-development', 'trending-up-outline'), o('History', 'time-outline'), o('Science & Tech', 'flask-outline'), o('Languages', 'language-outline'), o('Online Courses', 'school-outline'), o('Podcasts', 'headset-outline')] },
        { title: 'Food & Cooking', icon: 'restaurant-outline', options: [o('Cooking', 'restaurant-outline'), o('Baking', 'pizza-outline'), o('New Recipes', 'reader-outline'), o('Food Exploring', 'compass-outline'), o('Hosting', 'wine-outline')] },
        { title: 'Nature & Outdoors', icon: 'leaf-outline', options: [o('Gardening', 'flower-outline'), o('Nature Walks', 'leaf-outline'), o('Bird Watching', 'eye-outline'), o('Hiking', 'trail-sign-outline'), o('Camping', 'bonfire-outline')] },
        { title: 'Sports & Active', icon: 'football-outline', options: [o('Cricket', 'baseball-outline'), o('Badminton', 'tennisball-outline'), o('Football', 'football-outline'), o('Yoga', 'body-outline'), o('Gym', 'barbell-outline')] },
        { title: 'Entertainment & Leisure', icon: 'film-outline', options: [o('Movies', 'film-outline'), o('Web Series', 'tv-outline'), o('Gaming', 'game-controller-outline'), o('Concerts', 'musical-notes-outline'), o('Comedy', 'happy-outline')] },
        { title: 'Social & Community', icon: 'people-outline', options: [o('With Family', 'people-outline'), o('With Friends', 'people-circle-outline'), o('Volunteering', 'hand-left-outline'), o('Cultural', 'color-palette-outline'), o('Gatherings', 'beer-outline')] },
        { title: 'Technology & Digital', icon: 'laptop-outline', options: [o('Tech', 'hardware-chip-outline'), o('Gadgets', 'phone-portrait-outline'), o('Coding', 'code-slash-outline'), o('AI Tech', 'sparkles-outline'), o('VR & AR', 'glasses-outline')] },
        { title: 'Personal & Other', icon: 'heart-outline', options: [o('Collecting', 'albums-outline'), o('Pets', 'paw-outline'), o('Fashion', 'shirt-outline'), o('Meditation', 'flower-outline'), o('Other', 'ellipsis-horizontal')] },
      ] },
    ] }],
  },
};

export const LIFESTYLE_ORDER = ['food', 'travel', 'hobbies', 'music', 'movies', 'fitness', 'routine'] as const;

const AGES = Array.from({ length: 43 }, (_, i) => String(18 + i));
const HEIGHTS = ["4'10\" or above", "5'0\" or above", "5'2\" or above", "5'4\" or above", "5'5\" or above", "5'7\" or above", "5'9\" or above", "5'11\" or above", 'Any'];

export const PREFERENCES: Record<string, SectionDef> = {
  basic: {
    title: 'Basic Preferences', subtitle: 'Age, height, location, education, profession', icon: 'shield-outline', tint: 'blue',
    steps: [
      { title: 'Basic Preferences', subtitle: 'Set the basic details you are looking for.', fields: [
        { key: 'age', kind: 'range', label: 'Age Range', min: 18, maxValue: 60, unit: 'years', options: AGES },
        { key: 'height', kind: 'select', label: 'Height', options: HEIGHTS },
        { key: 'location', kind: 'radio', label: 'Location', options: ['Open (India / Abroad)', 'Prefer specific cities', 'Same city only'] },
      ] },
      { title: 'Basic Preferences', subtitle: 'Education, profession and more.', fields: [
        { key: 'education', kind: 'select', label: 'Education', options: ['Any', 'Graduate or above', "Bachelor's degree or higher", "Master's degree or higher", 'Doctorate', 'Diploma or above'] },
        { key: 'profession', kind: 'select', label: 'Profession', options: ['Any', 'Working Professional', 'Business / Self-employed', 'Government / Public sector', 'Doctor / Healthcare', 'Engineer / Technology', 'Teacher / Academic', 'Student'] },
        { key: 'workMode', kind: 'radio', label: 'Work Mode', options: ['Any', 'On-site', 'Remote', 'Hybrid', 'Prefer not to say'] },
        { key: 'maritalStatus', kind: 'select', label: 'Marital Status', options: ['Never Married', 'Divorced', 'Widowed', 'Any'] },
      ] },
    ],
  },
  lifestyle: {
    title: 'Lifestyle Preferences', subtitle: 'Food, habits, lifestyle, interests', icon: 'paper-plane-outline', tint: 'purple',
    steps: [{ title: 'Lifestyle Preferences', subtitle: 'Choose lifestyle preferences that are important to you.', fields: [
      { key: 'food', kind: 'select', label: 'Food Habits', options: ['Any', 'Vegetarian', 'Vegetarian (Open to both)', 'Eggetarian', 'Non-vegetarian', 'Vegan', 'Jain'] },
      { key: 'smoking', kind: 'select', label: 'Smoking', options: ['No', 'Occasionally', "Doesn't matter"] },
      { key: 'drinking', kind: 'select', label: 'Drinking', options: ['No', 'Occasionally', "Doesn't matter"] },
      { key: 'fitness', kind: 'select', label: 'Fitness & Activity', options: ['Active lifestyle', 'Moderately active', 'Values fitness and healthy lifestyle', "Doesn't matter"] },
      { key: 'travel', kind: 'select', label: 'Travel', options: ['Loves travel', 'Occasional travel', "Doesn't matter"] },
      { key: 'hobbies', kind: 'select', label: 'Hobbies & Interests', options: ['Any', 'Shared interests preferred', 'Creative interests', 'Sports & outdoors', 'Reading & learning'] },
    ] }],
  },
  family: {
    title: 'Family Preferences', subtitle: 'Family type, caste, location, values', icon: 'people-outline', tint: 'orange',
    steps: [{ title: 'Family Preferences', subtitle: 'Tell us about the kind of family background you prefer.', fields: [
      { key: 'familyType', kind: 'select', label: 'Family Type', options: ['Nuclear Family', 'Joint Family', 'Nuclear or Joint (Open)', "Doesn't matter"] },
      { key: 'caste', kind: 'select', label: 'Caste Preference', options: ['No preference', 'Same community', 'Open to all communities'] },
      { key: 'familyLocation', kind: 'select', label: 'Family Location', options: ['Open (India / Abroad)', 'Same state', 'Same city', 'India only'] },
      { key: 'familyValues', kind: 'select', label: 'Family Values', options: ['Traditional', 'Traditional with modern outlook', 'Moderate', 'Liberal'] },
      { key: 'involvement', kind: 'select', label: 'Family Involvement', options: ['From the beginning', 'After mutual understanding', 'Once we are both sure'] },
    ] }],
  },
  values: {
    title: 'Values & Outlook', subtitle: 'Life goals, beliefs, personality', icon: 'heart-outline', tint: 'pink',
    steps: [{ title: 'Values & Outlook', subtitle: 'Select what matters to you for a long-term compatible relationship.', fields: [
      { key: 'lifeGoals', kind: 'select', label: 'Life Goals', options: ['Career growth', 'Family first', 'Balanced life', 'Personal growth', 'Service & community'] },
      { key: 'financial', kind: 'select', label: 'Financial Outlook', options: ['Financially stable', 'Saver', 'Balanced spender', 'Open to discuss'] },
      { key: 'beliefs', kind: 'select', label: 'Beliefs & Practices', options: ['Any', 'Religious', 'Moderately spiritual', 'Spiritual but not religious', 'Not religious'] },
      { key: 'personality', kind: 'select', label: 'Personality & Communication', options: ['Kind, respectful', 'Calm and patient', 'Open and expressive', 'Thoughtful listener', 'Fun-loving'] },
      { key: 'emotional', kind: 'select', label: 'Emotional Maturity', options: ['Very important', 'Important', 'Somewhat important'] },
      { key: 'valueTags', kind: 'chips', label: 'Values that matter', options: ['Honesty', 'Respect', 'Open Communication', 'Family-oriented', 'Personal Growth', 'Kindness', 'Emotional Maturity', 'Loyalty', 'Independence'] },
    ] }],
  },
  additional: {
    title: 'Additional Preferences', subtitle: 'Languages, work location, openness', icon: 'grid-outline', tint: 'teal',
    steps: [{ title: 'Additional Preferences', subtitle: 'Add any other preferences that help us find better matches for you.', fields: [
      { key: 'languages', kind: 'chips', label: 'Languages', options: ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Open to more'] },
      { key: 'workLocation', kind: 'select', label: 'Work Location Preference', options: ['Open (India / Abroad)', 'India only', 'Same city', 'Abroad'] },
      { key: 'relocation', kind: 'select', label: 'Relocation Openness', options: ['Open', 'Open to relocate (India / Abroad)', 'Within India', 'Not open'] },
      { key: 'partnerLifestyle', kind: 'select', label: "Partner's Lifestyle Expectations", options: ['Supportive, family-oriented', 'Independent and ambitious', 'Balanced', 'Open to discuss'] },
      { key: 'other', kind: 'text', label: 'Anything Else?', optional: true, maxLength: 300, placeholder: 'Anything else that matters to you' },
    ] }],
  },
};

export const PREFERENCE_ORDER = ['basic', 'lifestyle', 'family', 'values', 'additional'] as const;

// ---------- Onboarding ----------

export const INTENTS = [
  { value: 'marriage', label: 'Marriage', text: 'I am looking for a life partner for marriage.', icon: 'heart' },
  { value: 'serious', label: 'Serious Relationship', text: 'I am looking for a meaningful and committed relationship.', icon: 'leaf' },
  { value: 'getting_to_know', label: 'Getting to Know', text: 'I am open to meeting and getting to know compatible people.', icon: 'people' },
  { value: 'friendship', label: 'Friendship', text: 'I am looking for genuine friendships with similar values.', icon: 'heart-outline' },
  { value: 'exploring', label: 'Exploring', text: 'I am exploring and not sure yet.', icon: 'compass-outline' },
] as const;

export const VALUE_OPTIONS = [
  ['Honesty', 'heart-outline'], ['Family Values', 'people-outline'], ['Personal Growth', 'trending-up-outline'],
  ['Mutual Respect', 'hand-left-outline'], ['Emotional Support', 'heart-half-outline'], ['Trust', 'shield-checkmark-outline'],
  ['Work-Life Balance', 'scale-outline'], ['Shared Interests', 'book-outline'], ['Similar Lifestyle', 'leaf-outline'],
  ['Career Support', 'briefcase-outline'], ['Open Communication', 'chatbubbles-outline'], ['Cultural Compatibility', 'globe-outline'],
  ['Spirituality', 'flower-outline'], ['Kindness', 'happy-outline'], ['Social Awareness', 'people-circle-outline'],
  ['Adventure & Travel', 'airplane-outline'], ['Love for Pets', 'paw-outline'],
] as const;

export const COMM_CHANNELS = [['Text Messaging', 'chatbubble-outline'], ['Voice Calls', 'call-outline'], ['Video Calls', 'videocam-outline'], ['In-Person Conversations', 'people-outline']] as const;
export const COMM_STYLES = [['Open and Expressive', 'heart-outline'], ['Thoughtful and Calm', 'sunny-outline'], ['Friendly and Casual', 'happy-outline'], ['Direct and Honest', 'locate-outline'], ['Listen more, speak less', 'mic-outline'], ['A mix of the above', 'sparkles-outline']] as const;
export const COMM_CONFLICT = [['Talk and find a solution', 'chatbubbles-outline'], ['Take some space and cool down', 'time-outline'], ['Prefer guidance or mediation', 'people-outline']] as const;

export const LANGUAGES = ['Telugu', 'English', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Odia', 'Urdu', 'Other'];

export const EDUCATION = ["High school", 'Diploma', "Bachelor's degree", 'B.Tech / B.E.', 'B.Com', 'B.Sc', 'B.A.', 'Bachelor of Design', 'MBBS', "Master's degree", 'M.Tech / M.E.', 'MBA', 'M.Sc', 'M.A.', 'Doctorate (PhD)', 'Other'];
export const OCCUPATIONS = ['Software Engineer', 'Product Designer', 'Product Manager', 'Data Scientist', 'Doctor', 'Engineer', 'Teacher / Professor', 'Chartered Accountant', 'Lawyer', 'Business Owner', 'Government Employee', 'Banking / Finance', 'Consultant', 'Marketing Professional', 'Architect', 'Student', 'Working Professional', 'Other'];
export const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer to self-describe', 'Prefer not to say'];
export const MARITAL = ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce', 'Annulled'];
export const CITIES = ['Hyderabad, Telangana', 'Bengaluru, Karnataka', 'Chennai, Tamil Nadu', 'Mumbai, Maharashtra', 'Pune, Maharashtra', 'Delhi, NCR', 'Kolkata, West Bengal', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh', 'Kochi, Kerala', 'Visakhapatnam, Andhra Pradesh', 'Vijayawada, Andhra Pradesh', 'Bhubaneswar, Odisha', 'Chandigarh', 'Indore, Madhya Pradesh', 'Coimbatore, Tamil Nadu', 'Surat, Gujarat', 'Outside India'];

/** Height options 4'6" .. 7'0" stored in cm. */
export const HEIGHT_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const inches = 54 + i;
  return { value: String(Math.round(inches * 2.54)), label: `${Math.floor(inches / 12)} ft ${inches % 12} in (${Math.round(inches * 2.54)} cm)` };
});

// ---------- Profile builder (App "type of partner", "enjoy", "imp in relation", lifestyle) ----------

export const BUILDER = {
  hoping: ['A strong friendship', 'Emotional companionship', 'A supportive partnership', 'A family-oriented relationship', 'Growing together', 'Sharing life experiences', 'Other'],
  enjoy: [['Reading', 'book-outline'], ['Music', 'musical-notes-outline'], ['Movies', 'film-outline'], ['Travel', 'airplane-outline'], ['Cooking', 'restaurant-outline'], ['Photography', 'camera-outline'], ['Art', 'color-palette-outline'], ['Fitness', 'barbell-outline'], ['Nature', 'leaf-outline']] as const,
  matters: ['Trust', 'Respect', 'Communication', 'Emotional support', 'Family connection', 'Independence', 'Shared responsibilities', 'Personal growth', 'Honesty', 'Financial responsibility', 'Quality time', 'Personal space', 'Stability', 'Understanding'],
  lifestyle: ['Quiet & relaxed', 'Social & outgoing', 'Balanced', 'Career-focused', 'Family-oriented', 'Creative', 'Health & fitness focused', 'Travel-oriented', 'Spiritual', 'Other'],
  live: ['Prefer my current city', 'Open to relocation', 'Specific cities', 'Anywhere', "I'd like to discuss this"],
  career: ['Very important', 'Important', 'Flexible', 'Not a priority'],
};
