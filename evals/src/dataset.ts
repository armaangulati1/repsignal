import { computeTalkListenRatio, type Scorecard, type TranscriptPayload } from '@repsignal/schema';

/**
 * Self-authored synthetic eval set.
 *
 * Every transcript below is fictional and written by hand for this project. No
 * transcript is from a real call, a real customer, or any real company. Each
 * case ships with a hand-labeled golden scorecard used by the eval harness.
 * These labels encode the author's judgment of the "right answer" and are what
 * a live model run is scored against.
 *
 * One field is NOT a matter of judgment: talkListenRatio. The literal value on
 * each golden below is the author's rough intuition, but the operative golden
 * value is recomputed from the transcript with computeTalkListenRatio (see the
 * derivation at the bottom of this file), the exact function the API uses to
 * populate the served scorecard. So golden and served ratios are identical by
 * construction, and the ratio is not part of the model-vs-golden agreement
 * measurement.
 */

export interface EvalCase {
  id: string;
  scenario: string;
  payload: TranscriptPayload;
  golden: Scorecard;
}

const rawEvalCases: EvalCase[] = [
  {
    id: 'strong-discovery-clean-close',
    scenario: 'Strong discovery, clear next step secured',
    payload: {
      callId: 'call-0001',
      repName: 'Dana',
      prospectName: 'Priya',
      durationSeconds: 1620,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'Thanks for making time, Priya. Before I show anything, can you walk me through how your team reviews call quality today?' },
        { speaker: 'prospect', text: 'Right now our managers listen to a couple of calls a week and leave notes in a spreadsheet.' },
        { speaker: 'rep', text: 'Got it. What happens to those notes after they are written down?' },
        { speaker: 'prospect', text: 'Honestly not much. They sit there. Reps rarely read them.' },
        { speaker: 'rep', text: 'That is a common gap. If coaching notes actually reached reps the next morning, what would change for you?' },
        { speaker: 'prospect', text: 'Ramp time. New reps take about five months to hit quota and I think coaching is the bottleneck.' },
        { speaker: 'rep', text: 'Who else would need to weigh in on a decision like this?' },
        { speaker: 'prospect', text: 'Me and our VP of Sales. She controls the budget.' },
        { speaker: 'rep', text: 'Makes sense. Would it help if we scheduled a thirty minute working session next Tuesday with your VP so she sees the coaching output on your real calls?' },
        { speaker: 'prospect', text: 'Yes, Tuesday at 10 works. I will send the invite and loop her in.' },
      ],
    },
    golden: {
      talkListenRatio: 0.55,
      discoveryQuestionsAsked: {
        count: 5,
        examples: [
          'Can you walk me through how your team reviews call quality today?',
          'What happens to those notes after they are written down?',
          'Who else would need to weigh in on a decision like this?',
        ],
      },
      objections: [],
      nextStepSecured: {
        secured: true,
        evidence: 'Yes, Tuesday at 10 works. I will send the invite and loop her in.',
      },
      riskFlags: [],
      coachingTips: [
        'Strong open-ended discovery. Keep leading with process questions before demoing.',
      ],
    },
  },
  {
    id: 'missed-next-step',
    scenario: 'Good discovery but the call ends with no concrete next step',
    payload: {
      callId: 'call-0002',
      repName: 'Marcus',
      prospectName: 'Ella',
      durationSeconds: 1380,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'How is your onboarding structured for new sales hires today?' },
        { speaker: 'prospect', text: 'Two weeks of shadowing, then they are on their own.' },
        { speaker: 'rep', text: 'What tends to go wrong once they are on their own?' },
        { speaker: 'prospect', text: 'They forget to ask discovery questions and jump straight to pricing.' },
        { speaker: 'rep', text: 'That maps to what we help with. We flag when a call skips discovery.' },
        { speaker: 'prospect', text: 'Interesting. Send me some information and I will take a look when things calm down.' },
        { speaker: 'rep', text: 'Sure, I will put together an overview and email it over.' },
        { speaker: 'prospect', text: 'Sounds good, thanks.' },
      ],
    },
    golden: {
      talkListenRatio: 0.5,
      discoveryQuestionsAsked: {
        count: 2,
        examples: [
          'How is your onboarding structured for new sales hires today?',
          'What tends to go wrong once they are on their own?',
        ],
      },
      objections: [],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: ['Call ended on a vague send-me-info without a committed follow-up meeting.'],
      coachingTips: [
        'Never end on send-me-info. Propose a specific time to review the material together.',
      ],
    },
  },
  {
    id: 'heavy-objections',
    scenario: 'Multiple objections raised, mixed handling',
    payload: {
      callId: 'call-0003',
      repName: 'Sofia',
      prospectName: 'Tom',
      durationSeconds: 1500,
      source: 'phone',
      transcript: [
        { speaker: 'rep', text: 'What is prompting you to look at coaching tools right now?' },
        { speaker: 'prospect', text: 'Honestly I am not sure we need one. Our managers already coach.' },
        { speaker: 'rep', text: 'Fair. Many managers do. How consistent is that coaching across the team?' },
        { speaker: 'prospect', text: 'It varies a lot. But this also feels expensive and we are watching budget.' },
        { speaker: 'rep', text: 'Understood on budget. If it shortened ramp by a month, would the math change?' },
        { speaker: 'prospect', text: 'Maybe. My other worry is privacy. We record calls and legal is strict.' },
        { speaker: 'rep', text: 'That is important. We can walk your legal team through data handling before anything goes live.' },
        { speaker: 'prospect', text: 'And I do not want reps to feel surveilled.' },
        { speaker: 'rep', text: 'Totally. The framing is coaching, not surveillance, and reps see their own scorecards first.' },
        { speaker: 'prospect', text: 'Okay, that helps a little.' },
      ],
    },
    golden: {
      talkListenRatio: 0.5,
      discoveryQuestionsAsked: {
        count: 3,
        examples: [
          'What is prompting you to look at coaching tools right now?',
          'How consistent is that coaching across the team?',
        ],
      },
      objections: [
        { quote: 'I am not sure we need one. Our managers already coach.', category: 'need', handled: true },
        { quote: 'This also feels expensive and we are watching budget.', category: 'budget', handled: false },
        { quote: 'My other worry is privacy. We record calls and legal is strict.', category: 'privacy', handled: true },
      ],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: ['Budget objection was reframed but never resolved.', 'No next meeting was booked.'],
      coachingTips: [
        'Objection handling on privacy was strong. Circle the budget objection back to a concrete ROI number.',
        'Close for a next step even on a skeptical call.',
      ],
    },
  },
  {
    id: 'rep-monologue',
    scenario: 'Rep dominates the airtime, very few questions',
    payload: {
      callId: 'call-0004',
      repName: 'Alex',
      prospectName: 'Jordan',
      durationSeconds: 1440,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'So let me tell you about us. We built a platform that records every call, transcribes it, scores talk ratios, detects objections, tracks next steps, and rolls it all into manager dashboards with weekly leaderboards and trend lines and a whole coaching library that your team can use.' },
        { speaker: 'prospect', text: 'Okay.' },
        { speaker: 'rep', text: 'And on top of that we have integrations with basically every dialer and CRM, plus a mobile app, plus custom scorecards, plus AI summaries that your reps will honestly love once they get used to them.' },
        { speaker: 'prospect', text: 'Sure.' },
        { speaker: 'rep', text: 'Most teams see faster ramp, better win rates, and happier managers, and I really think you would too given what you do, so I would love to just get you started with a pilot as soon as possible.' },
        { speaker: 'prospect', text: 'I need to think about it.' },
      ],
    },
    golden: {
      talkListenRatio: 0.85,
      discoveryQuestionsAsked: {
        count: 0,
        examples: [],
      },
      objections: [
        { quote: 'I need to think about it.', category: 'stall', handled: false },
      ],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: [
        'Rep spoke the vast majority of the call with almost no prospect engagement.',
        'Zero discovery questions were asked before pitching.',
      ],
      coachingTips: [
        'Cut the feature monologue. Ask about the prospect situation before describing the product.',
        'Aim for a talk ratio closer to half. The prospect barely spoke.',
      ],
    },
  },
  {
    id: 'clean-close-short-call',
    scenario: 'Short call, warm prospect, next step locked quickly',
    payload: {
      callId: 'call-0005',
      repName: 'Nina',
      prospectName: 'Raj',
      durationSeconds: 600,
      source: 'phone',
      transcript: [
        { speaker: 'rep', text: 'You mentioned ramp time is your priority this quarter. What does good look like for you in ninety days?' },
        { speaker: 'prospect', text: 'New reps productive in three months instead of five.' },
        { speaker: 'rep', text: 'That is exactly the outcome our coaching loop targets. Want to see it on two of your own recorded calls?' },
        { speaker: 'prospect', text: 'Yes, let us do that. Can you do Thursday afternoon?' },
        { speaker: 'rep', text: 'Thursday at 2 works. I will send an invite with a short intake form.' },
        { speaker: 'prospect', text: 'Perfect, talk Thursday.' },
      ],
    },
    golden: {
      talkListenRatio: 0.55,
      discoveryQuestionsAsked: {
        count: 1,
        examples: ['What does good look like for you in ninety days?'],
      },
      objections: [],
      nextStepSecured: {
        secured: true,
        evidence: 'Yes, let us do that. Can you do Thursday afternoon?',
      },
      riskFlags: [],
      coachingTips: ['Efficient close. Consider one more discovery question to deepen the pain before booking.'],
    },
  },
  {
    id: 'pricing-objection-handled',
    scenario: 'Single pricing objection, handled well, next step secured',
    payload: {
      callId: 'call-0006',
      repName: 'Devon',
      prospectName: 'Maya',
      durationSeconds: 1200,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'Where does coaching sit on your priority list this half?' },
        { speaker: 'prospect', text: 'Top three, but the pricing I saw online feels high for our size.' },
        { speaker: 'rep', text: 'Understood. Can I ask how many reps you would start with?' },
        { speaker: 'prospect', text: 'Probably eight to start.' },
        { speaker: 'rep', text: 'For a team of eight we have a starter tier that is a fraction of the enterprise number you saw. If ramp improved by even two weeks per rep, does that tier pay for itself?' },
        { speaker: 'prospect', text: 'When you put it that way, yes it would.' },
        { speaker: 'rep', text: 'Great. Shall we set up a scoping call with your ops lead next week to confirm fit?' },
        { speaker: 'prospect', text: 'Yes, Wednesday works. I will introduce you to our ops lead by email.' },
      ],
    },
    golden: {
      talkListenRatio: 0.55,
      discoveryQuestionsAsked: {
        count: 2,
        examples: [
          'Where does coaching sit on your priority list this half?',
          'How many reps you would start with?',
        ],
      },
      objections: [
        { quote: 'The pricing I saw online feels high for our size.', category: 'price', handled: true },
      ],
      nextStepSecured: {
        secured: true,
        evidence: 'Yes, Wednesday works. I will introduce you to our ops lead by email.',
      },
      riskFlags: [],
      coachingTips: ['Nice reframe of price against ramp value. Confirm the starter-tier number in writing after the call.'],
    },
  },
  {
    id: 'no-discovery-pitch-fest',
    scenario: 'Rep pitches features with zero discovery',
    payload: {
      callId: 'call-0007',
      repName: 'Chris',
      prospectName: 'Lena',
      durationSeconds: 900,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'Let me share my screen and run through the product.' },
        { speaker: 'prospect', text: 'Okay.' },
        { speaker: 'rep', text: 'Here is the call recorder, here is the transcription, here is the scorecard view, and here is the manager dashboard.' },
        { speaker: 'prospect', text: 'Right.' },
        { speaker: 'rep', text: 'And this is where you would see leaderboards. Pretty powerful stuff.' },
        { speaker: 'prospect', text: 'I see. I think we are all set for now.' },
      ],
    },
    golden: {
      talkListenRatio: 0.8,
      discoveryQuestionsAsked: {
        count: 0,
        examples: [],
      },
      objections: [
        { quote: 'I think we are all set for now.', category: 'brush-off', handled: false },
      ],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: [
        'No discovery at all before demoing.',
        'Prospect disengaged and brushed the rep off.',
      ],
      coachingTips: [
        'Do not open with a screen share. Earn the demo with two or three discovery questions first.',
      ],
    },
  },
  {
    id: 'competitor-objection-unhandled',
    scenario: 'Incumbent competitor objection that the rep does not address',
    payload: {
      callId: 'call-0008',
      repName: 'Priyanka',
      prospectName: 'Sam',
      durationSeconds: 1080,
      source: 'phone',
      transcript: [
        { speaker: 'rep', text: 'What made you take this call today?' },
        { speaker: 'prospect', text: 'Curiosity mostly. We already use a competitor for call recording.' },
        { speaker: 'rep', text: 'Great. Our coaching scorecards are really strong. Let me show you the dashboard.' },
        { speaker: 'prospect', text: 'But we are pretty locked in with the tool we have.' },
        { speaker: 'rep', text: 'Understood. Anyway, here is how our objection detection works.' },
        { speaker: 'prospect', text: 'I mean, switching would be a big lift for us.' },
        { speaker: 'rep', text: 'Right. So the next feature is the leaderboard.' },
        { speaker: 'prospect', text: 'Okay, I have to run. Thanks.' },
      ],
    },
    golden: {
      talkListenRatio: 0.55,
      discoveryQuestionsAsked: {
        count: 1,
        examples: ['What made you take this call today?'],
      },
      objections: [
        { quote: 'We already use a competitor for call recording.', category: 'incumbent', handled: false },
        { quote: 'Switching would be a big lift for us.', category: 'switching-cost', handled: false },
      ],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: [
        'Rep ignored a clear incumbent and switching-cost objection and kept demoing features.',
      ],
      coachingTips: [
        'Stop and address the switching-cost concern directly. Ask what would make a switch worth it.',
      ],
    },
  },
  {
    id: 'balanced-good-discovery-soft-next-step',
    scenario: 'Balanced call, decent discovery, soft but real next step',
    payload: {
      callId: 'call-0009',
      repName: 'Owen',
      prospectName: 'Hana',
      durationSeconds: 1320,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'How does your team measure whether a call went well today?' },
        { speaker: 'prospect', text: 'Mostly gut feel and whether a next meeting got booked.' },
        { speaker: 'rep', text: 'What would you want to measure if you could?' },
        { speaker: 'prospect', text: 'Whether reps actually run discovery instead of pitching.' },
        { speaker: 'rep', text: 'That is core to what we score. How many reps would this touch?' },
        { speaker: 'prospect', text: 'About twelve.' },
        { speaker: 'rep', text: 'Would it be useful to review a couple of your real calls scored, and go from there?' },
        { speaker: 'prospect', text: 'Probably. Let me check my calendar and get back to you this week.' },
      ],
    },
    golden: {
      talkListenRatio: 0.5,
      discoveryQuestionsAsked: {
        count: 3,
        examples: [
          'How does your team measure whether a call went well today?',
          'What would you want to measure if you could?',
          'How many reps would this touch?',
        ],
      },
      objections: [],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: ['Next step depends on the prospect getting back to you rather than a booked time.'],
      coachingTips: ['Good discovery. Convert the soft maybe into a concrete calendar hold before ending the call.'],
    },
  },
  {
    id: 'gatekeeper-not-decision-maker',
    scenario: 'Prospect is not the decision maker; next step is reaching the DM',
    payload: {
      callId: 'call-0010',
      repName: 'Bianca',
      prospectName: 'Kyle',
      durationSeconds: 720,
      source: 'phone',
      transcript: [
        { speaker: 'rep', text: 'Before we dig in, are you the person who would own a coaching rollout, or would others be involved?' },
        { speaker: 'prospect', text: 'I am a sales manager. The director of sales would actually own this.' },
        { speaker: 'rep', text: 'Helpful to know. What matters most to your director when evaluating tools?' },
        { speaker: 'prospect', text: 'Proof of ramp impact and low setup effort.' },
        { speaker: 'rep', text: 'Would you be open to introducing me to your director so I can show exactly that?' },
        { speaker: 'prospect', text: 'Sure, I can make that intro. Send me a short summary I can forward.' },
      ],
    },
    golden: {
      talkListenRatio: 0.5,
      discoveryQuestionsAsked: {
        count: 2,
        examples: [
          'Are you the person who would own a coaching rollout, or would others be involved?',
          'What matters most to your director when evaluating tools?',
        ],
      },
      objections: [],
      nextStepSecured: {
        secured: true,
        evidence: 'Sure, I can make that intro. Send me a short summary I can forward.',
      },
      riskFlags: ['Primary contact is not the economic buyer.'],
      coachingTips: ['Good qualification of authority early. Follow up fast with the forwardable summary while intent is warm.'],
    },
  },
  {
    id: 'budget-objection-deferred',
    scenario: 'Budget objection pushes the deal to next fiscal cycle',
    payload: {
      callId: 'call-0011',
      repName: 'Ravi',
      prospectName: 'Grace',
      durationSeconds: 1140,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'What is driving interest in coaching this quarter?' },
        { speaker: 'prospect', text: 'Ramp is slow, but our budget is fully committed until next quarter.' },
        { speaker: 'rep', text: 'Understood. If we lined up a start for next quarter, would you want the evaluation done now so you can move fast then?' },
        { speaker: 'prospect', text: 'That could work. I do not want to waste your time though.' },
        { speaker: 'rep', text: 'Not at all. How about we run a scoped evaluation this month and hold implementation for the new budget?' },
        { speaker: 'prospect', text: 'Okay. Let us schedule the evaluation kickoff for next Monday.' },
      ],
    },
    golden: {
      talkListenRatio: 0.55,
      discoveryQuestionsAsked: {
        count: 1,
        examples: ['What is driving interest in coaching this quarter?'],
      },
      objections: [
        { quote: 'Our budget is fully committed until next quarter.', category: 'budget-timing', handled: true },
      ],
      nextStepSecured: {
        secured: true,
        evidence: 'Okay. Let us schedule the evaluation kickoff for next Monday.',
      },
      riskFlags: ['Purchase is gated on next fiscal cycle budget.'],
      coachingTips: ['Nice job decoupling evaluation from purchase timing to keep momentum.'],
    },
  },
  {
    id: 'multithread-strong-next-step',
    scenario: 'Rep multithreads to a second stakeholder and secures a group session',
    payload: {
      callId: 'call-0012',
      repName: 'Leah',
      prospectName: 'Victor',
      durationSeconds: 1560,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'How is coaching handled across your two sales pods today?' },
        { speaker: 'prospect', text: 'Inconsistently. One manager is great, the other is stretched thin.' },
        { speaker: 'rep', text: 'What would consistency across both pods be worth to you?' },
        { speaker: 'prospect', text: 'A lot. Probably a few points of win rate.' },
        { speaker: 'rep', text: 'Should we bring both managers into a working session so they both see the scorecards on their own calls?' },
        { speaker: 'prospect', text: 'Yes. Let us do next Thursday and I will invite both managers.' },
        { speaker: 'rep', text: 'Perfect. I will send an agenda and a short intake so the session is productive.' },
        { speaker: 'prospect', text: 'Great, Thursday it is.' },
      ],
    },
    golden: {
      talkListenRatio: 0.5,
      discoveryQuestionsAsked: {
        count: 2,
        examples: [
          'How is coaching handled across your two sales pods today?',
          'What would consistency across both pods be worth to you?',
        ],
      },
      objections: [],
      nextStepSecured: {
        secured: true,
        evidence: 'Yes. Let us do next Thursday and I will invite both managers.',
      },
      riskFlags: [],
      coachingTips: ['Excellent multithreading by pulling both managers into one session. Send the agenda promptly.'],
    },
  },
  {
    id: 'low-engagement-ghost-risk',
    scenario: 'Prospect gives short answers and low engagement, ghosting risk',
    payload: {
      callId: 'call-0013',
      repName: 'Isaac',
      prospectName: 'Dana',
      durationSeconds: 540,
      source: 'phone',
      transcript: [
        { speaker: 'rep', text: 'What prompted you to book time today?' },
        { speaker: 'prospect', text: 'A colleague mentioned it.' },
        { speaker: 'rep', text: 'Got it. What are you hoping to improve on your team?' },
        { speaker: 'prospect', text: 'Not sure yet.' },
        { speaker: 'rep', text: 'No problem. Would a short scored sample of your calls help clarify?' },
        { speaker: 'prospect', text: 'Maybe later. I have to jump.' },
      ],
    },
    golden: {
      talkListenRatio: 0.6,
      discoveryQuestionsAsked: {
        count: 2,
        examples: [
          'What prompted you to book time today?',
          'What are you hoping to improve on your team?',
        ],
      },
      objections: [
        { quote: 'Maybe later. I have to jump.', category: 'disengagement', handled: false },
      ],
      nextStepSecured: {
        secured: false,
        evidence: null,
      },
      riskFlags: [
        'Prospect showed low engagement and no clear pain. High ghosting risk.',
      ],
      coachingTips: ['Qualify interest earlier. If there is no pain, disqualify rather than pushing a next step.'],
    },
  },
  {
    id: 'technical-deep-dive-next-step',
    scenario: 'Technical evaluator, deeper questions, next step to a security review',
    payload: {
      callId: 'call-0014',
      repName: 'Mara',
      prospectName: 'Elliot',
      durationSeconds: 1680,
      source: 'zoom',
      transcript: [
        { speaker: 'rep', text: 'What does your current call-data pipeline look like end to end?' },
        { speaker: 'prospect', text: 'Calls hit our dialer, recordings land in cloud storage, nothing structured after that.' },
        { speaker: 'rep', text: 'How would you want scored output delivered so it fits that pipeline?' },
        { speaker: 'prospect', text: 'Ideally a webhook we can subscribe to, plus an API to pull scorecards.' },
        { speaker: 'rep', text: 'That is exactly our model. What are your must-haves on data handling before a pilot?' },
        { speaker: 'prospect', text: 'A security review and a signed DPA. My concern is where transcripts are processed.' },
        { speaker: 'rep', text: 'We can start the security review now. Shall we book a session with your security lead next week?' },
        { speaker: 'prospect', text: 'Yes. I will set up time with our security lead for Wednesday.' },
      ],
    },
    golden: {
      talkListenRatio: 0.5,
      discoveryQuestionsAsked: {
        count: 3,
        examples: [
          'What does your current call-data pipeline look like end to end?',
          'How would you want scored output delivered so it fits that pipeline?',
          'What are your must-haves on data handling before a pilot?',
        ],
      },
      objections: [
        { quote: 'My concern is where transcripts are processed.', category: 'security', handled: true },
      ],
      nextStepSecured: {
        secured: true,
        evidence: 'Yes. I will set up time with our security lead for Wednesday.',
      },
      riskFlags: ['Deal is gated on passing a security review and signing a DPA.'],
      coachingTips: ['Strong technical discovery. Send the security documentation proactively before the review.'],
    },
  },
];

/**
 * Normalize each golden's talkListenRatio to the deterministic, code-computed
 * value so the golden is defined by the same formula the API serves. This makes
 * the ratio exact by construction and keeps it out of the LLM-judged score.
 */
export const evalCases: EvalCase[] = rawEvalCases.map((c) => ({
  ...c,
  golden: {
    ...c.golden,
    talkListenRatio: computeTalkListenRatio(c.payload.transcript),
  },
}));

export const evalCaseCount = evalCases.length;
