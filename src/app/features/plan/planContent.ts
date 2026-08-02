/**
 * The six-week growth plan — one specific action per day.
 *
 * This file is the SOURCE OF TRUTH for the plan's content. Firestore holds a
 * copy (so progress, notes and completion can be recorded), seeded from here by
 * `npm run plan:seed`. Editing a day here and re-running the seed updates the
 * wording without touching anyone's recorded progress.
 *
 * WHY THE PLAN LOOKS LIKE THIS
 * ----------------------------
 * The 2026-08-02 production baseline found that Oqupa has never observed a
 * single organic event: every listing was personally recruited by Jerson or
 * Branko, most views and contact clicks came from the team itself, and all
 * seven payment attempts were internal. 47 active listings had 163 views in
 * total, and the platform's largest supplier — a verified agent with 8 listings
 * and real photos — had received zero views in fifteen days.
 *
 * So the goal for these six weeks is deliberately small and binary:
 *
 *     ONE listing and ONE interested buyer that nobody on the team recruited.
 *
 * Everything here serves that. The plan front-loads measurement (weeks 1-2)
 * because without it we cannot tell an organic user from a recruited one, which
 * is the only thing we are trying to learn. It then goes where Piura property
 * demand already exists — Facebook groups, Marketplace and WhatsApp — rather
 * than trying to build a new habit from nothing. Paid ads appear only in week 5,
 * after tracking exists, so the budget is not spent blind.
 */

export type PlanOwner = 'jerson' | 'engineering'

export interface PlanDay {
  /** 1-42. */
  day: number
  /** YYYY-MM-DD. */
  date: string
  /** 1-6. */
  week: number
  phase: string
  theme: string
  category: string
  /** The specific thing to do. Written as an instruction, not a goal. */
  action: string
  /** Why it matters — the reason to not skip it. */
  why: string
  /** Realistic minutes. */
  minutes: number
  /** The test for "finished". Not "worked on it" — an observable end state. */
  doneWhen: string
  /** USD committed on this day, if any. */
  spend: number
  owner: PlanOwner
}

export const PLAN_START = '2026-08-03'
export const PLAN_END = '2026-09-13'
export const PLAN_GOAL =
  'One listing and one interested buyer that nobody on the team recruited.'

export const PLAN_DAYS: PlanDay[] = [
  /* ---------------- WEEK 1 — Know what is actually happening ------------- */
  {
    day: 1, date: '2026-08-03', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Local search',
    action: 'Create the Google Business Profile for Oqupa. Category "Real Estate Agency", service area Piura, add the logo and 3 photos.',
    why: 'Free, permanent, and it puts Oqupa in Google Maps results for Piura. For a one-city business this outranks most paid channels and it compounds instead of stopping when you stop paying.',
    minutes: 40,
    doneWhen: 'The profile exists and Google has been asked to verify it (postcard or phone requested).',
    spend: 0, owner: 'jerson',
  },
  {
    day: 2, date: '2026-08-04', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Measurement',
    action: 'Replace the link in every social bio — Instagram, TikTok, Facebook, YouTube — with the tracked link I will give you.',
    why: 'Right now a visit from TikTok and a visit from a friend look identical. This is the only way to know which app actually sends people, and it takes fifteen minutes once and answers the question forever.',
    minutes: 25,
    doneWhen: 'All four bios updated, and opening each one lands on oqupa.com with the tracking tag visible in the address bar.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 3, date: '2026-08-05', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Measurement',
    action: 'Write the recruited list: every single person you or Branko personally convinced to join Oqupa. Names and emails or phone numbers.',
    why: 'This is the measuring stick for the whole six weeks. The goal is one listing from someone NOT on this list — and without the list written down, you will not be able to prove it happened.',
    minutes: 45,
    doneWhen: 'The list is written and saved, and you are confident nobody is missing from it.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 4, date: '2026-08-06', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Search',
    action: 'Verify oqupa.com in Google Search Console and submit the sitemap.',
    why: 'Tells you what Google actually knows about the site — which pages it has found, and what people typed before clicking. Free, and nothing else tells you this.',
    minutes: 30,
    doneWhen: 'Search Console shows oqupa.com verified and the sitemap accepted without errors.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 5, date: '2026-08-07', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Distribution',
    action: 'Find and request to join the 6 largest Piura property buy/sell groups on Facebook. Write down each name and member count.',
    why: 'In Peru, property is already traded in these groups every day. That is demand that exists right now, for free — you do not have to create the habit, only show up where it already is.',
    minutes: 35,
    doneWhen: '6 join requests sent, with names and member counts written down.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 6, date: '2026-08-08', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Supply',
    action: "Open Gloria Culqui's 8 listings. Pick the 3 most attractive to a real buyer and write one line on why each.",
    why: 'Those 8 listings have had zero views in fifteen days. They are your best unused inventory and your most important supplier relationship. These 3 become the properties you push everywhere for the next month.',
    minutes: 35,
    doneWhen: '3 listings chosen, each with a one-line reason, saved where you can find them.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 7, date: '2026-08-09', week: 1,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Know what is actually happening',
    category: 'Review',
    action: 'Week review. Check: is the Business Profile verified? Is Search Console showing anything? Were the group requests accepted?',
    why: 'A weekly checkpoint stops a plan drifting for three weeks before anyone notices. Fifteen minutes, honestly answered.',
    minutes: 20,
    doneWhen: 'Three lines written in the notes: what happened, what did not, what is blocked.',
    spend: 0, owner: 'jerson',
  },

  /* ---------------- WEEK 2 — Be findable -------------------------------- */
  {
    day: 8, date: '2026-08-10', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Local search',
    action: 'Finish the Google Business Profile: description in Spanish, hours, service area, and 5 more photos of real listed properties.',
    why: 'A half-finished profile ranks badly and looks abandoned. A complete one with real photos is what makes someone tap it instead of the agency next to it.',
    minutes: 40,
    doneWhen: 'Every section Google offers is filled in, with at least 8 photos total.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 9, date: '2026-08-11', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Distribution',
    action: 'Post the first of the 3 chosen Castilla properties into 2 approved Facebook groups. Real photos, price, district, and the tracked link.',
    why: 'This is the first genuine test of whether outside demand exists. Everything before this was setup.',
    minutes: 45,
    doneWhen: 'Posted in 2 groups, both links tracked, and a screenshot saved of each post.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 10, date: '2026-08-12', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Distribution',
    action: 'Reply to every comment and message on yesterday\'s posts, the same day. Write down what people actually ask.',
    why: 'Response speed is the whole game in Peruvian property groups — the first to answer usually gets the deal. What they ask is also free market research you cannot buy.',
    minutes: 30,
    doneWhen: 'Every comment and message answered, and their questions written down.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 11, date: '2026-08-13', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Distribution',
    action: 'Post the second chosen property into 2 different groups.',
    why: 'One post is an anecdote. Spreading across groups is how you learn which group actually contains buyers rather than other agents.',
    minutes: 40,
    doneWhen: 'Posted in 2 groups not used on day 9, links tracked.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 12, date: '2026-08-14', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Content',
    action: 'Make and post one Castilla property reel to Instagram and TikTok. Same video both places.',
    why: 'You already have the reel pipeline. The point is not reach yet — it is that the tracked bio link can finally tell you whether social sends anyone at all.',
    minutes: 60,
    doneWhen: 'Live on both Instagram and TikTok, with the tracked link in both bios.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 13, date: '2026-08-15', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Distribution',
    action: 'List the 3 chosen properties on Facebook Marketplace under Property for Sale, Piura.',
    why: 'Marketplace is where Peruvians already search for property, and listing is free. It is the closest thing to free intent-based traffic available.',
    minutes: 50,
    doneWhen: 'All 3 live on Marketplace, each linking back to its Oqupa page.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 14, date: '2026-08-16', week: 2,
    phase: 'Weeks 1-2 · Findable and measurable',
    theme: 'Be findable',
    category: 'Review',
    action: 'Week review, and the first real numbers check: how many visits came from groups, Marketplace and social. Any signups?',
    why: 'End of the setup half. From here on the plan should be steered by numbers instead of assumptions.',
    minutes: 30,
    doneWhen: 'Visits by source written down, and any signup checked against the recruited list.',
    spend: 0, owner: 'jerson',
  },

  /* ---------------- WEEK 3 — Go where the buyers are -------------------- */
  {
    day: 15, date: '2026-08-17', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Distribution',
    action: 'Search the groups for people ASKING for a property in Piura. Reply helpfully to 5 of them with a real matching listing.',
    why: 'Answering someone who already said "I am looking for a house in Castilla" converts far better than any advertisement, because the intent is already there and stated out loud.',
    minutes: 45,
    doneWhen: '5 genuine replies sent, each with a specific listing link — not a generic pitch.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 16, date: '2026-08-18', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Distribution',
    action: 'Post one property to your WhatsApp status and ask 5 people to reshare it.',
    why: 'WhatsApp is where Peru actually communicates. A reshare from a real person carries trust no advertisement can buy, and it costs nothing.',
    minutes: 25,
    doneWhen: 'Status posted and 5 people personally asked to reshare.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 17, date: '2026-08-19', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Distribution',
    action: 'Post the third chosen property to 2 new groups, but written as a question rather than an advert.',
    why: 'Groups suppress and members ignore obvious adverts. "Is this a fair price for Castilla?" gets comments, and comments get reach.',
    minutes: 40,
    doneWhen: 'Posted in 2 new groups in question form, links tracked.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 18, date: '2026-08-20', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Content',
    action: 'Film a walkthrough-style TikTok of one Castilla house — the whole property, not a photo slideshow.',
    why: 'Walkthroughs hold attention far longer than photo carousels, and TikTok rewards watch time with reach. This is the cheapest chance at genuine reach you have.',
    minutes: 60,
    doneWhen: 'Posted on TikTok, and reposted to Instagram Reels.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 19, date: '2026-08-21', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Supply',
    action: 'Send Gloria Culqui her real numbers — views and contacts on her listings — and ask what would make Oqupa worth her time.',
    why: 'She is 16% of your entire catalogue and has received nothing back. She will leave otherwise, and she talks to other agents. Honest numbers plus a real question is how you keep her.',
    minutes: 30,
    doneWhen: 'Message sent with actual numbers, and her reply recorded in the notes.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 20, date: '2026-08-22', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Distribution',
    action: 'Add 3 more properties to Facebook Marketplace and refresh the first 3.',
    why: 'Marketplace ranks recent posts. Refreshing costs minutes and puts you back at the top of the local feed.',
    minutes: 40,
    doneWhen: '6 properties live on Marketplace, the oldest 3 refreshed.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 21, date: '2026-08-23', week: 3,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Go where the buyers are',
    category: 'Review',
    action: 'Week review. Which single source sent the most visits? Has anyone contacted a listing who is not on the recruited list?',
    why: 'Halfway. If one source is clearly ahead, the remaining weeks should lean into it rather than spreading evenly.',
    minutes: 30,
    doneWhen: 'The best source named, and the organic question answered yes or no.',
    spend: 0, owner: 'jerson',
  },

  /* ---------------- WEEK 4 — Prepare paid, keep pushing free ------------ */
  {
    day: 22, date: '2026-08-24', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Paid setup',
    action: 'Set up Meta Business Manager and the ad account, and confirm with me that the tracking is receiving events.',
    why: 'This is the gate on all ad spending. If Meta cannot see who signed up, the money buys cheap clicks from people who will never come back.',
    minutes: 45,
    doneWhen: 'Meta shows the tracking as Active and receiving events from oqupa.com.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 23, date: '2026-08-25', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Paid setup',
    action: 'Build the audience: people within about 15km of Piura, ages 25-55, interested in property. Save it.',
    why: 'A tight local audience is what makes a small budget work. Broad targeting on $5 a day buys nothing anywhere.',
    minutes: 40,
    doneWhen: 'The audience is saved in Meta with an estimated size shown.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 24, date: '2026-08-26', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Paid setup',
    action: 'Write 3 different adverts for the same Castilla property — one price-led, one photo-led, one question-led.',
    why: 'You cannot guess which message works in Piura and neither can I. Three variations for the same money is how you find out instead of assuming.',
    minutes: 45,
    doneWhen: '3 adverts written and loaded into Meta, ready but not running.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 25, date: '2026-08-27', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Distribution',
    action: 'Post 2 properties to groups. Keep answering people looking for property.',
    why: 'The free channel does not pause while paid is being set up. Consistency is most of what makes groups work.',
    minutes: 35,
    doneWhen: '2 posts live and every reply answered.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 26, date: '2026-08-28', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Content',
    action: 'Post reel number three. Use whichever of the previous two performed better as the template.',
    why: 'Copying your own best result beats inventing a new idea every time.',
    minutes: 50,
    doneWhen: 'Live on TikTok and Instagram.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 27, date: '2026-08-29', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Local search',
    action: 'Post your first update on the Google Business Profile featuring a Castilla property.',
    why: 'Profile posts feed Google Maps and cost nothing. It also signals the profile is active, which helps it rank.',
    minutes: 25,
    doneWhen: 'The post is live on the profile.',
    spend: 0, owner: 'jerson',
  },
  {
    day: 28, date: '2026-08-30', week: 4,
    phase: 'Weeks 3-4 · Go where the buyers already are',
    theme: 'Prepare paid',
    category: 'Review',
    action: 'Week review, and set the advert budget: $5 a day for 14 days, $70 of the $200.',
    why: 'Deciding the limit before switching it on is what stops a test quietly becoming a habit.',
    minutes: 30,
    doneWhen: 'Budget written down and the start date fixed.',
    spend: 0, owner: 'jerson',
  },

  /* ---------------- WEEK 5 — Paid test live ----------------------------- */
  {
    day: 29, date: '2026-08-31', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Paid',
    action: 'Turn on the advert. $5 a day, Castilla audience, all 3 variations running against each other.',
    why: 'First real money at risk, and the first honest test of whether strangers in Piura will click through to a property.',
    minutes: 30,
    doneWhen: 'The campaign shows Active and has spent something by the evening.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 30, date: '2026-09-01', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Paid',
    action: 'Look at the advert. Change nothing. Write down the cost per click.',
    why: 'Editing a campaign in its first days restarts Meta\'s learning and wastes the budget. Watching without touching is the discipline.',
    minutes: 15,
    doneWhen: 'Cost per click written down and nothing edited.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 31, date: '2026-09-02', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Distribution',
    action: 'Post 2 properties to groups and answer 3 people looking for property.',
    why: 'The free channel is still the one most likely to produce the first organic buyer. Do not let paid distract from it.',
    minutes: 40,
    doneWhen: '2 posts live, 3 genuine replies sent.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 32, date: '2026-09-03', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Supply',
    action: 'Approach 2 new Piura agents. Show them real numbers from the last month, not promises.',
    why: 'Agents bring many listings each. After a month of pushing, you finally have evidence instead of a pitch.',
    minutes: 45,
    doneWhen: 'Both approached, and their answers recorded.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 33, date: '2026-09-04', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Content',
    action: 'Post reel number four. Feature a different district if Castilla content is repeating itself.',
    why: 'Keeps the feed from going stale while the concentration strategy stays on Castilla for distribution.',
    minutes: 50,
    doneWhen: 'Live on both platforms.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 34, date: '2026-09-05', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Distribution',
    action: 'Refresh all Marketplace listings and add any new properties.',
    why: 'Marketplace decays fast. A weekly refresh is the maintenance that keeps a free channel alive.',
    minutes: 35,
    doneWhen: 'All Marketplace listings current.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 35, date: '2026-09-06', week: 5,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Paid test live',
    category: 'Review',
    action: 'First honest look at the advert: cost per click, and cost per person who contacted a listing.',
    why: 'Cost per click is vanity. Cost per contact is the number that decides whether paid has any future here.',
    minutes: 30,
    doneWhen: 'Both numbers written down, and the best of the 3 adverts named.',
    spend: 5, owner: 'jerson',
  },

  /* ---------------- WEEK 6 — Read it and decide ------------------------- */
  {
    day: 36, date: '2026-09-07', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'Paid',
    action: 'Turn off the two weaker adverts and put the whole $5 a day behind the best one.',
    why: 'A week of data is enough to stop paying for the losers. Concentrating a small budget is the only way it moves anything.',
    minutes: 30,
    doneWhen: 'Two adverts off, one running at the full daily budget.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 37, date: '2026-09-08', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'Supply',
    action: 'Approach 3 more agents, leading with whichever result was strongest in the last five weeks.',
    why: 'Agent supply is the fastest way to a fuller map, and now you have something true to open with.',
    minutes: 45,
    doneWhen: '3 approached, answers recorded.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 38, date: '2026-09-09', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'Distribution',
    action: 'Post to groups and answer everyone looking. Keep it going.',
    why: 'Consistency across the full six weeks is what makes the final numbers mean something.',
    minutes: 40,
    doneWhen: 'Posts live and replies answered.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 39, date: '2026-09-10', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'The goal',
    action: 'Check the goal directly. Has any listing come from someone not on the recruited list? Has any contact?',
    why: 'This is the question the whole six weeks exists to answer. Ask it explicitly rather than hoping it shows up in a summary.',
    minutes: 30,
    doneWhen: 'Both questions answered with names or a clear no.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 40, date: '2026-09-11', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'Content',
    action: 'Post the final reel of the six weeks.',
    why: 'Five reels across six weeks is enough of a sample to see whether social does anything for Oqupa at all.',
    minutes: 50,
    doneWhen: 'Live on both platforms.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 41, date: '2026-09-12', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'Review',
    action: 'Compile every number from the six weeks: visits by source, signups, listings, contacts, spend.',
    why: 'One page of real numbers is worth more than the whole plan. This becomes the baseline for the next six weeks.',
    minutes: 60,
    doneWhen: 'All numbers in one place, next to the 2 August starting point.',
    spend: 5, owner: 'jerson',
  },
  {
    day: 42, date: '2026-09-13', week: 6,
    phase: 'Weeks 5-6 · Test paid, then decide',
    theme: 'Read it and decide',
    category: 'The goal',
    action: 'Decide: what to keep, what to stop, what to double. Write the themes for the next six weeks.',
    why: 'A plan that ends without a decision just stops. This is the moment the next one is chosen on evidence.',
    minutes: 60,
    doneWhen: 'Keep / stop / double written down, and six weekly themes named for the next round.',
    spend: 5, owner: 'jerson',
  },
]

/** Everything the plan commits to spending, in USD. */
export const PLAN_TOTAL_SPEND = PLAN_DAYS.reduce((sum, d) => sum + d.spend, 0)
