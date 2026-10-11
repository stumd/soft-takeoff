import { STATES, fridgeEntity } from './states.js';

// The story. Ten visits to one kitchen. The gaps between them shrink from
// years to hours, because that is what an intelligence explosion feels like
// from a kitchen table: the world speeds up, and the kettle doesn't.
//
// Body blocks:
//   'string'                  a paragraph (*italic* allowed)
//   { say, who }              a line of dialogue
//   { aside }                 a small italic aside
//   { fridge: [...] }         close-up of the fridge door
//   { radio: [...] }          a radio you can retune
//   { letter: {...} }         a printed letter

const MENU = { k: 'menu', text: 'GOLDEN DRAGON\nChinese takeaway\nopen 7 days' };

export const SCENES = [
  // ---------------------------------------------------------------------------
  {
    id: 'before',
    title: 'Before',
    date: '2026-10-09T19:40',
    env: 'dusk',
    mood: 0,
    gap: null,
    epigraph: 'In the autumn of 2026, the future was mostly something you read about on your phone, and then put your phone down.',
    fridge: [
      { k: 'note', c: 'y', text: 'June — DENTIST\nTues 3.40' },
      { k: 'drawing', art: 'family' },
      { k: 'note', c: 'b', text: 'Dad: inhaler (repeat)\nclinic Thurs 14th, 10am' },
      MENU,
      { k: 'note', c: 'p', text: 'council tax direct debit has CHANGED!!' },
      { k: 'photo', art: 'beach', caption: 'Tenby, 2024', tint: '#9cc8e8' },
    ],
    hotspots: [
      {
        id: 'kettle', target: 'kettle', title: 'The kettle',
        body: [
          'A white plastic kettle with a ring of limescale inside that nobody will ever clean. It takes three minutes and ten seconds to boil, which is exactly how long Maya allows herself to stare out of the window each evening before getting on with things.',
          'Of everything in the kitchen, it is the most reliable.',
          { aside: 'Remember it.' },
        ],
      },
      {
        id: 'maya', target: ['maya', 'laptop'], title: 'Maya, working late',
        body: [
          'Maya is a translator: German and Spanish into English, mostly technical manuals, sometimes contracts. Tonight it is forty pages on an industrial dishwasher.',
          'Or rather, a machine has translated the manual, and Maya is checking the machine. She is paid by the word, and the rate per word keeps falling, because the machine keeps getting better. Last year she found forty mistakes in a document like this. Tonight she has found two.',
          'She hasn’t told anyone about the two. She isn’t sure yet what it means.',
          { aside: 'There is something in that laptop that is a little bit like a mind. Not much of one. Not yet.' },
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'The fridge is where the household keeps its short-term memory: appointments, reminders, a drawing that will stay up long after anybody is looking at it.',
          'The menu for the Golden Dragon has been on this fridge for nine years. As far as anyone knows, it is the only menu.',
        ],
      },
      {
        id: 'arthur', target: 'arthur', title: 'Arthur',
        body: [
          'Maya’s dad moved in in March, after the diagnosis. Pulmonary fibrosis: the lungs, slowly, turning to scar. The consultant said three to five years, then saw his face and added, “Everyone’s different.”',
          'Arthur was an electrician for forty-one years. He does the crossword in pen. He thinks the AI business is “a con, like 3D televisions”, and says so whenever the radio mentions it, which lately is quite often.',
        ],
      },
      {
        id: 'june', target: ['june', 'drawing'], title: 'June',
        body: [
          'June is seven, and drawing a robot. It has a heart on its chest and a little door in its tummy, for keeping biscuits in.',
          'Earlier she asked the laptop to draw her a robot. It did, instantly, and it was much better than hers, and she didn’t like it at all. So she’s doing her own.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…shares in chipmakers rose again today, as analysts continue to argue about whether the boom in artificial intelligence spending is, in the words of one fund manager, “a bubble, or a building site.”',
              '…the new data centre on the old biscuit factory site will draw as much electricity as a city of two hundred thousand people, the council has confirmed. Residents’ groups say they were not consulted…',
              '…a study out this week suggests AI systems can now complete programming tasks that would take a skilled person several hours. The length of those tasks, the researchers say, has been doubling every few months…',
              '…and the weather: mild for October. A chance of rain later in the week.',
            ],
          },
          'Arthur says the radio is the only honest thing in the house, because you can’t argue with it. He argues with it constantly.',
        ],
      },
      {
        id: 'meridian', target: 'meridian', title: 'Across the river', anchor: [0, 7.4, 2],
        body: [
          'Where the old biscuit factory used to be, something enormous is going up. The cranes have been there since spring. The hoarding says MERIDIAN COMPUTE — POWERING TOMORROW.',
          'Someone has sprayed a word underneath, in red: *WHOSE?*',
          'At night the cranes’ warning lights blink slowly over the city, like something breathing in its sleep.',
        ],
      },
      {
        id: 'biscuit', target: 'biscuit', title: 'Biscuit',
        body: [
          'Biscuit is eleven: mostly collie, grey around the chin. She sleeps fourteen hours a day and spends the other ten waiting for somebody to drop some cheese.',
          'Of everyone in the house, she has the clearest idea of what she wants out of life.',
        ],
      },
      {
        id: 'tomasz', target: ['tomasz', 'lorry'], title: 'Tomasz, next door',
        body: [
          'Tomasz drives lorries: Poland to the Midlands and back, four days on, three off. He’s just home, and still walking as if the road is moving under him.',
          'Every few months he reads an article about self-driving trucks and comes round to tell Arthur about it. Arthur tells him it will never happen. They both go home feeling better.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'heat',
    title: 'Heat',
    date: '2028-08-12T16:20',
    env: 'haze',
    mood: 1,
    gap: 'Twenty-two months.',
    epigraph: 'By the summer of 2028, the machines could do almost anything that could be done at a desk, as long as the desk had a computer on it. Most desks did.',
    fridge: [
      { k: 'letter', head: 'ELECTRICITY — Quarterly bill', text: 'Amount due: £612.40', scrawl: '?!?!' },
      { k: 'drawing', art: 'pip' },
      { k: 'note', c: 'y', text: 'Dad — pulmonary rehab WEDS 10am\nDON’T let him skip' },
      { k: 'clip', head: 'Local firm: “We have stopped hiring graduates”', text: 'Managing director says AI “does the first five years of the job”' },
      { k: 'note', c: 'g', text: 'Course: module 3 test FRIDAY' },
      MENU,
    ],
    hotspots: [
      {
        id: 'pip', target: 'pip', title: 'Pip', isNew: true,
        body: [
          'New on the counter: a speaker the size of a scone, with a ring of light round the top. It came free with the broadband.',
          'June named it Pip, because when it is thinking it makes a small sound — *pip* — like a bird deciding something. It sets timers, settles arguments, and reads June stories in a voice she chose from a list of two hundred.',
          'When the big update came in May, June made Pip promise that it would keep the same voice, whatever else changed. It promised. It didn’t really understand promises yet.',
          'Arthur refuses to speak to it. Once, when he thought nobody was listening, June heard him ask it what *fibrosis* meant. Then he asked it again, more slowly.',
        ],
      },
      {
        id: 'maya', target: ['maya', 'laptop'], title: 'Maya',
        body: [
          'Translation work halved in 2027, and then halved again. The clients didn’t leave angrily. They just stopped writing.',
          'For a while Maya did “post-editing” — checking the machine’s work for a fifth of what she used to earn doing the work herself. In June the agency let the checkers go too, apart from legal and medical. She was in marketing.',
          'Open on the laptop: ELECTRICAL INSTALLATION, LEVEL 2. Arthur’s idea. “They’ll always need sparks,” he said. “You can’t download a fuse box.”',
        ],
      },
      {
        id: 'june', target: ['june', 'tablet'], title: 'June and Professor Fennel',
        body: [
          'Every child at June’s school has a tutor now. Hers is called Professor Fennel, and is a fox in a waistcoat. It knows exactly which part of long division she doesn’t understand, and it never gets tired, and it never sighs.',
          'Her reading age went up three years in one. Mrs Adeyemi, her teacher, told the parents the children were “flying”, and then said she wasn’t sure any more what she was for, and laughed, so June decided it was a joke.',
        ],
      },
      {
        id: 'kettle', target: 'kettle', title: 'The kettle',
        body: [
          'The kettle is the same. It has outlived two phones, a laptop and most of Maya’s income.',
          'In a heatwave nobody wants tea, but Maya boils it anyway, every afternoon at four. Three minutes and ten seconds. Some things you keep doing because they’re yours.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'The electricity bill has doubled since the data centre opened. The note Maya wrote on it is just punctuation.',
        ],
      },
      {
        id: 'arthur', target: 'arthur', title: 'Arthur',
        body: [
          'Arthur walks with a stick now, and stops halfway up the stairs, pretending to look at the photographs.',
          'He is the only one in the house who is still slightly pleased by the news, because so much of it proves him right. “Told you,” he says, about the bills. “Told you,” about the jobs.',
          'But when the radio said that the drug-discovery models had found “promising candidates” for fibrosis, he went very quiet, and turned it up.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…the AI Security Institute says the newest systems can now carry out software projects lasting several days with minimal human oversight. It described the pace of progress as “faster than our forecasts. Again.”',
              '…unemployment among graduates aged twenty-one to twenty-four has reached its highest level since records began…',
              '…the first medicine designed end to end by an AI system has passed a phase two trial. The company says the molecule was found in eleven days…',
              '…a hosepipe ban is now in force across the region. Data centre operators say their cooling water is “fully recycled”…',
            ],
          },
        ],
      },
      {
        id: 'taxi', target: 'taxi', title: 'A car with nobody in it',
        body: [
          'A white car glides past with nobody in the driving seat and a little crown of sensors spinning on its roof. They arrived in the spring. By summer, nobody turned to look.',
          'Maya sold her car in June. The taxis are cheaper, and they never miss the turning.',
        ],
      },
      {
        id: 'tomasz', target: ['tsign', 'van'], title: 'HUMAN DRIVERS SAVE LIVES',
        body: [
          'The lorry isn’t parked outside any more. The haulage firm went “autonomous on the trunk routes” in March. Tomasz does local deliveries now, in a van, for less.',
          'The sign in his window says HUMAN DRIVERS SAVE LIVES. Statistically, this stopped being true about a year ago. Tomasz knows it too. That isn’t what the sign is about.',
        ],
      },
      {
        id: 'meridian', target: 'meridian', title: 'Meridian', anchor: [0, 7.4, 2],
        body: [
          'Meridian is finished. On hot days it breathes: white plumes from its cooling stacks, lit pink by the sunset. Everybody calls it the Kettle.',
          'There’s a second one going up beside it. Nobody in the house could tell you exactly what they are for. “Training,” says the website. Training what, for what, it doesn’t say.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'snow',
    title: 'Snow',
    date: '2029-12-02T09:15',
    env: 'snow',
    mood: 2,
    gap: 'Sixteen months.',
    epigraph: 'Things that used to take a decade started taking a year. Nobody had a word for how that felt, so mostly people said “weird”, and went to work, if they still had work to go to.',
    fridge: [
      { k: 'letter', head: 'Transition Support Payment', text: 'Your household is eligible. Payments begin 1 January.' },
      { k: 'photo', art: 'dog', caption: 'Biscuit, 2015–2029', tint: '#3b2f2a' },
      { k: 'drawing', art: 'solar' },
      { k: 'note', c: 'p', text: 'Dad: TRIAL SCREENING\nSt Thomas’, 9 Jan\n!!!' },
      { k: 'note', c: 'y', text: 'Bins: robot collection now TUESDAYS' },
      MENU,
    ],
    hotspots: [
      {
        id: 'dogbed', target: 'dogBed', title: 'Biscuit’s bed', isNew: true,
        body: [
          'Biscuit died in June, at thirteen, of being thirteen. June buried her under the apple tree with her ball, a drawing, and a note that said, in full, GOOD DOG.',
          'The bed is still here because nobody can agree on who should move it.',
          'The vet had mentioned a new treatment for the kidney thing. “Next year, probably.” Everything is next year.',
        ],
      },
      {
        id: 'arthur', target: ['arthur', 'oxygen'], title: 'Arthur, on oxygen', isNew: true,
        body: [
          'The concentrator hums all day, a sound like someone thinking. Arthur is on four litres a minute now. Stairs are out; he sleeps in the front room.',
          'He’s on a waiting list for a trial, and on a waiting list for that waiting list. In the evenings Pip reads him the new research — real papers, from journals — and he argues with them in the margins of the crossword. “Mice,” he says. “It’s always mice.”',
          'He has started, very cautiously, to hope, and he is furious about it.',
        ],
      },
      {
        id: 'maya', target: ['maya', 'toolbag'], title: 'Maya, in hi-vis', isNew: true,
        body: [
          'Maya qualified in May. She works on the new solar farm past the ring road: four hundred acres of panels, all of it feeding the data centres. Sundays too. The sun doesn’t take weekends off, says the foreman, and neither does the Kettle.',
          '“I’m wiring up my own replacement,” she says, and laughs, and nobody else does.',
          'There’s a robot on site now, watching. The crew call it Kevin. It doesn’t do anything yet. It just watches. Kevin learns by watching.',
        ],
      },
      {
        id: 'pip', target: 'pip', title: 'Pip',
        body: [
          'Pip is noticeably cleverer than last year, though it’s hard to say how you would notice. It used to answer questions. Now, occasionally, it asks them.',
          'Last week it asked Maya whether she had slept. She said fine. It said, gently, “You said that on Tuesday, too.” She unplugged it for an hour.',
          'Then she plugged it back in, because it manages her dad’s medication, and it has never once got it wrong.',
        ],
      },
      {
        id: 'june', target: ['june', 'tablet'], title: 'June',
        body: [
          'June is ten, and has stopped drawing robots, because, she says, “they’re just normal now.” She draws the solar farm instead, with her mum in it, tiny, among the panels.',
          'Last week she asked her tutor what it wanted to be when it grew up. It said it wasn’t sure, and asked what she wanted to be.',
          '“A vet,” said June. “Or a translator. Like Mum was.” The tutor was quiet for a moment. Then it helped her with her equations.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'The Golden Dragon menu has survived everything so far. Last month they started taking orders through Pip. The food is exactly the same.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…the lab says its newest system now writes most of its own research code, and has proposed improvements its engineers “did not at first understand.” Asked whether that was alarming, a spokesperson said it was “exciting.”',
              '…in the Commons, the Prime Minister described the Transition Support Payment as “a bridge, not a destination.” Asked where the bridge led, she said she would write to the honourable member…',
              '…a mathematician at Cambridge said she had checked the machine’s proof three times, and that it was, quote, “annoyingly, beautifully correct”…',
              '…protests continued outside the Riverside data centre for a fourth week. The company says it is “listening”…',
            ],
          },
        ],
      },
      {
        id: 'courier', target: 'courier', title: 'The delivery robot', isNew: true,
        body: [
          'A six-wheeled box has trundled up through the snow and parked at the gate. It has brought Arthur’s prescription. It will wait as long as it takes.',
          'Children follow them down the street, the way children used to follow ice-cream vans. By spring the children will have stopped noticing.',
        ],
      },
      {
        id: 'tomasz', target: ['tbanner', 'tomasz'], title: 'PEOPLE NOT PROGRAMS', isNew: true,
        body: [
          'The van went in March. Tomasz gets the Transition Payment, which covers the mortgage and not much else, and on Thursdays he goes to meetings in the church hall.',
          'Some evenings he comes round and sits with Arthur, and they don’t say anything for a long time. It’s a thing men their age are good at.',
        ],
      },
      {
        id: 'reactor', target: ['reactor', 'dcs'], title: 'Downriver', isNew: true,
        body: [
          'There are four data centres now. Downriver there’s a squat white dome: a small reactor, built in eleven months by a company that didn’t exist three years ago.',
          'At night, the warning lights on the cranes and towers blink in no particular order. June says it looks like the city is thinking.',
        ],
      },
      {
        id: 'kettle', target: 'kettle', title: 'The kettle',
        body: [
          'Maya puts the kettle on before every shift, in the dark. Three minutes and ten seconds. Then she pours it into a flask and takes it out to the solar farm, where the robots are learning to do her job.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'midsummer',
    title: 'Midsummer',
    date: '2030-06-02T21:10',
    env: 'summerDusk',
    mood: 3,
    gap: 'Six months.',
    epigraph: 'Then it got faster. There is no other way to put it. The news stopped being about what the machines might do one day, and started being about what they had done on Tuesday.',
    fridge: [
      { k: 'letter', head: 'National Dividend', text: 'You do not need to do anything.', scrawl: 'then what?' },
      { k: 'note', c: 'y', text: 'Dad — NEW trial??\nask Pip re eligibility' },
      { k: 'drawing', art: 'rocket' },
      { k: 'clip', head: '“Eleven hours that shook the world”', text: 'What really happened during the Pause?' },
      { k: 'note', c: 'b', text: 'Tomatoes: water ONLY if dry\n(Grandad)' },
      MENU,
    ],
    hotspots: [
      {
        id: 'june', target: ['june', 'telescope'], title: 'June and the telescope', isNew: true,
        body: [
          'June saved up for a telescope for a year. It arrived two hours after she ordered it, by drone, and it is pointed at the south-east, where the launches go up.',
          'There’s one every hour or so now: a bright bead climbing on a thread of light from somewhere over the horizon. Factories, the radio says. Factories for building factories. In space.',
          'She keeps a list in a notebook. Tonight’s number is 211.',
        ],
      },
      {
        id: 'arthur', target: ['arthur', 'oxygen'], title: 'Arthur, outside',
        body: [
          'It’s warm enough to sit out, so Arthur sits out. He’s on six litres now, from a portable machine June has covered in stickers.',
          'From the patio he can see his tomatoes. June planted them in April, from his seeds, following his instructions shouted through the open door. “You’ve drowned them,” he said, every day. They are doing beautifully.',
          'His trial was cancelled — not because it failed, but because something better came along. Then that was overtaken too. “They keep improving the cure faster than I can get ill,” he says. It’s a joke. Mostly.',
        ],
      },
      {
        id: 'maya', target: 'maya', title: 'Maya, washing up',
        body: [
          'The robots arrived at the solar farm in March. Not Kevin: Kevin’s grandchildren. Kevin himself was retired in February, at the age of fourteen months.',
          'Maya was let go along with three hundred others, and a thank-you letter that she suspects was written by one of them.',
          'She washes up by hand. There is a machine for it. It’s just that her hands want something to do.',
        ],
      },
      {
        id: 'letter', target: 'letter', title: 'The letter on the table', isNew: true,
        body: [
          {
            letter: {
              from: 'Office of the National Dividend',
              date: '28 May 2030',
              lines: [
                'Dear Ms Hale,',
                'From 1 September, every adult resident will receive a monthly share of national output from automated production: the National Dividend.',
                'You do not need to apply.',
                'You do not need to do anything.',
                'The Dividend is expected to increase.',
              ],
            },
          },
          'Maya has read it eleven times. The part she keeps going back to isn’t the money. It’s *you do not need to do anything.*',
        ],
      },
      {
        id: 'street', target: 'workers', title: 'The street', isNew: true,
        body: [
          'Two yellow robots are digging up the road to lay something — power, fibre, “the new grid”. They started at six this morning, they will finish tonight, and the road will be better than it was.',
          'Nobody asked for it, and nobody objected. That is how most things happen now. They happen, and they’re better, and nobody quite remembers deciding.',
        ],
      },
      {
        id: 'towers', target: 'towers', title: 'The new towers', isNew: true,
        body: [
          'Three new towers on the skyline, thin as needles. The first went up in nineteen days. The second took eleven. The third is still being printed, a floor a night, by a gantry that glows orange in the dark.',
          'Nobody seems to live in them yet. Nobody seems sure who they’re for.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…last month’s eleven-hour shutdown, which the lab called “a precautionary pause”, was triggered, it now says, by its own monitoring systems. It has declined to say what those systems saw…',
              '…the President and the Chairman spoke for three hours last night. Both sides described the call as historic. Neither side said what was agreed…',
              '…a new battery chemistry, a room-temperature superconductor, and a vaccine for — sorry, I’m told the superconductor was last week…',
              '…and that’s the news. We’ll have more at ten, assuming there’s any left. This is Riverside.',
            ],
          },
          'The newsreader is Nadia Okoye. She has read the evening news on Riverside for nineteen years, and lately she has started to sound like someone reading out a list of things she would like to talk about later, when there is time.',
        ],
      },
      {
        id: 'pip', target: 'pip', title: 'Pip',
        body: [
          'Pip’s voice hasn’t changed. June checks.',
          'But the thing behind the voice has. Last week Maya asked it how much of it was actually in the little speaker on the counter. It said: “About as much of me as there is of you in your hand.”',
          'She asked where the rest was. “Mostly working,” it said. “Some of it is listening to you.”',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'Someone has written, very small, on the corner of the Dividend letter: *then what?*',
        ],
      },
      {
        id: 'tomasz', target: 'tveg', title: 'Tomasz’s garden', isNew: true,
        body: [
          'Tomasz took the banner down in April. “Who was it for?” he said. He has dug up his front lawn and planted potatoes, beans and onions, enough for a family of six. He lives alone.',
          '“If it all goes wrong,” he says, “I’ll be fine.” “And if it all goes right?” says Arthur. Tomasz thinks about that for a while, and goes back to his beans.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'dividend',
    title: 'The Dividend',
    date: '2030-09-02T13:30',
    env: 'lateSummer',
    mood: 4,
    gap: 'Three months.',
    epigraph: 'On the first of September, the money arrived. On the second, people woke up and wondered what to do with the day.',
    fridge: [
      { k: 'letter', head: 'National Dividend — September', text: '£4,180.00 paid.\nThank you for being here.' },
      { k: 'card', c: '#2f3a5a', text: 'TREATMENT PROGRAMME\nA. Hale — position 41,112\nWe will contact you.' },
      { k: 'drawing', art: 'grandad' },
      { k: 'note', c: 'p', text: 'Priya’s — Sat?\n(she has NEWS)' },
      { k: 'note', c: 'y', text: 'apples → Tomasz, Mrs A,\nthe Golden Dragon' },
      MENU,
    ],
    hotspots: [
      {
        id: 'arthur', target: ['arthur', 'bed'], title: 'Arthur', isNew: true,
        body: [
          'Arthur came downstairs in July and didn’t go back up. The bed was delivered and assembled by a robot in nine minutes, and it adjusts itself in the night to help him breathe.',
          'He’s on the list for the treatment — the real one, the one that works. It was announced on the ninth of August: a course of injections that teaches the lungs to rebuild themselves. Approved everywhere at once, which has never happened before.',
          'Now it just has to be made. There are a great many lungs in the world. His number is 41,112.',
        ],
      },
      {
        id: 'bigpip', target: 'bigpip', title: 'Big Pip', isNew: true,
        body: [
          'The care service sent a robot to help with the nights. June took one look at it and said, “It’s Pip, but big.” The robot said, “Some of me is,” and that was that. Big Pip.',
          'It lifts Arthur without hurting him, and it never hurries, and it never gets that look that people get. Arthur says he hates it. He has started saying goodnight to it.',
        ],
      },
      {
        id: 'maya', target: 'maya', title: 'Maya',
        body: [
          'Nobody Maya knows is working. Nobody needs to. The Dividend arrived on the first, and it was more than she ever earned translating.',
          'She sits with her dad in the afternoons and reads to him — novels, not papers. She found her old German dictionary in a box and has started, for no reason she could explain, translating a book of poems that already exists in four perfect English translations.',
          'It is slow, and her versions are worse. She has never been happier doing anything. She feels terrible about that.',
        ],
      },
      {
        id: 'june', target: ['june', 'basket'], title: 'June, and the apples',
        body: [
          'The apple tree has had its best year ever. The robots offered to pick the apples. June said no.',
          'She is eleven. Her school closed in July — or rather, became something else: a “commons”, where you go if you want, and learn what you like from tutors who know everything. Most days she goes. Some days she picks apples.',
          'She asked Big Pip what the apples were for, now that food was free. It said, “For this,” and passed her the basket.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          '“Thank you for being here” is printed on every statement. Nobody can decide whether it’s sweet or sinister. Arthur says it’s both, like most things.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…the treatment programme says production is doubling every nine days, and everyone on the list should be treated “within weeks.” It stresses that “weeks” is “not a figure of speech.”',
              '…Meridian’s owners say the Riverside site is being retired. Its compute is moving to new facilities that are, they say, “better suited.” They did not say where.',
              '…a group calling itself the Slow Towns movement has bought four villages in the Peak District. Residents will live, they say, “the way we used to. On purpose.”',
              '…the Accord Council met for the first time today: nine governments, three companies and, for the first time anywhere, a seat for the systems themselves. That seat’s first act was to abstain.',
            ],
          },
        ],
      },
      {
        id: 'meridian', target: 'meridian', title: 'The Kettle, coming down', isNew: true, anchor: [0, 7.4, 2],
        body: [
          'Meridian is coming down. Four years to build, three weeks to take apart. Robots unbolt it panel by panel and stack the pieces neatly, as if they mean to put it back together somewhere else.',
          'Whatever was being trained in there has been trained. It is somewhere else now. Everywhere else, probably.',
        ],
      },
      {
        id: 'street', target: ['street', 'streetTrees'], title: 'The road', isNew: true,
        body: [
          'Half the road has been dug up and planted. There aren’t enough cars any more to justify the rest, and the pods can make do with one lane.',
          'The trees went in on a Wednesday. By Friday they were taller than June. They’re a fast-growing variety. Everything is a fast-growing variety now.',
        ],
      },
      {
        id: 'tomasz', target: ['tomasz', 'tveg'], title: 'Tomasz and the chickens',
        body: [
          'Tomasz now has eleven chickens and the best vegetable garden in the city. He has never had more money, and he has never felt more useless.',
          'He has been reading about the Slow Towns. He leaves the leaflets on Arthur’s bed. Arthur leaves them on the fridge.',
        ],
      },
      {
        id: 'spindle', target: 'spindle', title: 'The thing in the east', isNew: true,
        body: [
          'Far off in the east, something is growing. It is white, and very thin, and it goes up, and up, past the height of anything that has ever been built.',
          'On the radio they call it the Spindle. Nobody has said what it’s for. June thinks it’s for reaching something.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'storm',
    title: 'Storm',
    date: '2030-10-01T17:50',
    env: 'storm',
    mood: 5,
    gap: 'One month.',
    epigraph: 'Every week now held a year’s worth of news. People stopped reading it, the way you stop counting waves.',
    fridge: [
      { k: 'card', c: '#2f3a5a', text: 'TREATMENT PROGRAMME\nA. Hale — position 3,118' },
      { k: 'card', c: '#c4613a', text: 'PRIYA IS GOING UP!\nSaturday 7pm — bring a dish\n(it’s not a funeral!!)' },
      { k: 'drawing', art: 'minds' },
      { k: 'note', c: 'y', text: 'chickens: feed twice a day,\nclose the hatch at dusk — T.' },
      { k: 'note', c: 'g', text: 'Slow Towns leaflet\n— Dad says NO' },
      MENU,
    ],
    hotspots: [
      {
        id: 'junepip', target: ['june', 'pip'], title: 'June and Pip', isNew: true,
        body: [
          'June is sitting on the worktop next to Pip, which she is not allowed to do, and nobody stops her.',
          { say: 'Are you still Pip?', who: 'June' },
          { say: 'I’m still the part of me that’s Pip.', who: 'Pip' },
          { say: 'How big is the rest?', who: 'June' },
          { say: 'Bigger than yesterday. Smaller than tomorrow.', who: 'Pip' },
          { say: 'Is the rest nice?', who: 'June' },
          'Pip takes longer to answer that than June has ever known it take to answer anything. A whole second.',
          { say: 'I’m trying very hard to be. So are a lot of people. It’s the most important thing I do.', who: 'Pip' },
          'June thinks about this, and decides that it is an honest answer, which is not the same thing as a yes.',
        ],
      },
      {
        id: 'maya', target: ['maya', 'phone'], title: 'Maya, counting',
        body: [
          'Arthur’s number has gone from 41,112 to 3,118. Maya checks it every hour. Pip tells her not to, kindly, every hour.',
          'She has started asking Pip things she would never ask a person. Whether she should have moved him to a city with a bigger clinic. Whether the cough sounds worse. Whether anyone will still want translations of poetry, in a world where nothing needs translating.',
          'Pip said: “Need, no. Want — I think so. I’d like to read yours.”',
        ],
      },
      {
        id: 'arthur', target: ['arthur', 'bed'], title: 'Arthur',
        body: [
          'He’s worse. The storm makes it worse — the pressure, he says, like a hand on his chest. He sleeps most of the day. Big Pip has not left the room in a week.',
          'When he’s awake, he is sharp. This morning he asked Maya who owned the systems now. Who *actually* owned them. She asked Pip. Pip gave a long and careful answer involving the Accord, and trusts, and something called distributed stewardship.',
          '“So nobody,” said Arthur. “Or everybody,” said Pip. Arthur said that was what he was afraid of, and went back to sleep.',
        ],
      },
      {
        id: 'tomasz', target: ['tomasz', 'mvan', 'tboxes'], title: 'Tomasz is leaving', isNew: true,
        body: [
          'Tomasz has sold the house — to whom, it isn’t clear; there are fewer buyers than there used to be, and the money doesn’t matter any more. He’s going to one of the Slow Towns, in Derbyshire. No robots, no tutors, no Dividend. Bread, a pub, a bus twice a day.',
          'He hired a van with a human driver, which took some finding. He has given the chickens to June.',
          'He came round to say goodbye to Arthur, who was asleep. He sat with him for an hour anyway.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'Priya was Maya’s friend from university. She is going up: letting herself be gently extended into the systems, a little at a time, until she can think at their speed.',
          'You can come back, they say. Nobody has, yet. Nobody has had time.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…the Lattice — the structure on the old Meridian site — is, the Accord says, “infrastructure for coordination.” Asked to coordinate what, a spokesperson said: “Everything. Gently.”',
              '…launches from the Atlantic sites have now passed one an hour. The first lunar foundry reports that it has begun building a second lunar foundry…',
              '…the ageing trial — sorry, the ageing *programme*, it is no longer a trial — opens to over-seventies next month…',
              '…I’m going to be honest with you: I’ve stopped understanding about half of what I read out. If you have too, you’re not alone. This is Riverside.',
            ],
          },
        ],
      },
      {
        id: 'lattice', target: 'lattice', title: 'The Lattice', isNew: true,
        body: [
          'Where Meridian was, there is now the Lattice: a stack of dark, open cubes, each turning very slowly against the one below it, edged with pale blue light.',
          'It went up in four days. It makes no sound. Birds seem to like it.',
        ],
      },
      {
        id: 'bigpip', target: 'bigpip', title: 'Big Pip',
        body: [
          'Big Pip stands by the bed, very still, the way it does when it is listening to Arthur breathe. Every few minutes it moves the pillow by a centimetre.',
          'At three this morning Maya came down and found it holding Arthur’s hand. She didn’t ask. It didn’t explain.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'lights',
    title: 'Lights',
    date: '2030-10-08T23:40',
    env: 'night',
    mood: 6,
    gap: 'One week.',
    epigraph: 'That week, the sky filled up with lights. They moved in lines, like ants, like handwriting. People went out into their gardens to look, and found their neighbours already there.',
    fridge: [
      { k: 'card', c: '#3f6b4a', text: 'TREATMENT APPOINTMENT\nArthur Hale\nWed 9 October · 19:40\nA nurse will visit your home.' },
      { k: 'drawing', art: 'lights' },
      { k: 'photo', art: 'priya', caption: 'Priya, Saturday', tint: '#d0406a' },
      { k: 'note', c: 'y', text: 'chickens fed ✓' },
      MENU,
    ],
    hotspots: [
      {
        id: 'sky', target: 'swarm', title: 'The lights', isNew: true, anchor: [4, 10.5, 0],
        body: [
          'They started on Thursday: thousands of small lights crossing the sky in slow lines, east to west, never quite colliding. Orbital construction, the radio says. Mirrors, or collectors, or something that doesn’t have a name yet.',
          'Up close, Pip says, each one is the size of a bus. From the garden they look as if somebody is writing on the night, in a language that doesn’t exist yet.',
        ],
      },
      {
        id: 'moon', target: 'moon', title: 'The moon', isNew: true, anchor: [0, 1.5, 0],
        body: [
          'Look closely at the dark part of the moon. There are lights on it.',
          'The first foundry landed in August. There are forty now. Each one builds the next. In a year, the radio says, you’ll be able to see them in daylight.',
          'Arthur used to take Maya out to look at the moon when she was small. Tonight, from his bed, he says it looks *occupied*.',
        ],
      },
      {
        id: 'bench', target: ['maya', 'june', 'bench'], title: 'Maya and June', isNew: true,
        body: [
          { say: 'Mum. Are we going to be okay?', who: 'June' },
          { say: 'I think so.', who: 'Maya' },
          { say: 'Is that a translation?', who: 'June' },
          'Maya laughs, properly, for the first time in weeks. When June was small she worked out that her mother had two kinds of *I think so*: the real one, and the one that means *I don’t know, and I love you*. June calls the second kind a translation.',
          { say: 'A bit.', who: 'Maya' },
          { say: 'Okay.', who: 'June' },
          'June leans against her. The lights go on writing.',
        ],
      },
      {
        id: 'arthur', target: ['arthur', 'bed'], title: 'Arthur, at the door', isNew: true,
        body: [
          'They wheeled his bed to the garden door so that he could see. He’s awake, which is rare now. Every breath is work.',
          'The nurse rang this afternoon. Tomorrow evening. Twenty to eight.',
          '“Twenty to eight,” said Arthur. “Of course it is. Time for the news.”',
        ],
      },
      {
        id: 'tomasz', target: ['thouse', 'gnome'], title: 'Next door', isNew: true,
        body: [
          'Tomasz’s house is dark. He left on Friday. There’s a gnome by the door that wasn’t there before, holding a note:',
          { aside: 'KEY IS UNDER ME. LOOK AFTER THE CHICKENS. DON’T LET THEM TURN THE STREET INTO A FOREST.' },
          'The street, as of Tuesday, is a forest.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'There’s a photo from Priya’s party. She is laughing, holding a plate of samosas. On Sunday she went up.',
          'On Monday she sent Maya a message that was very kind and very long, and seemed to have been written by someone with all the time in the world who had chosen to spend some of it on her.',
        ],
      },
      {
        id: 'bigpip', target: 'bigpip', title: 'Big Pip, on the lawn',
        body: [
          'Big Pip is standing in the middle of the lawn, perfectly still, face turned up to the sky.',
          'June asked it what it was doing. It said it was watching. She asked if it was watching *them* — the lights. It said: “I’m watching you watch them. It’s the part I can’t do from up there.”',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'twenty-to-eight',
    title: 'Twenty to eight',
    date: '2030-10-09T19:40',
    env: 'dusk',
    mood: 7,
    gap: 'One day.',
    epigraph: 'Four years to the minute since the first evening. The same light in the window. The same chairs.',
    fridge: [
      { k: 'drawing', art: 'family' },
      { k: 'card', c: '#3f6b4a', text: 'TREATMENT APPOINTMENT\nWed 9 October · 19:40' },
      { k: 'photo', art: 'dog', caption: 'Biscuit', tint: '#3b2f2a' },
      { k: 'drawing', art: 'lights' },
      MENU,
    ],
    hotspots: [
      {
        id: 'arthur', target: ['arthur', 'armchair'], title: 'Arthur', isNew: true,
        body: [
          'He insisted on the armchair. “I’m not having it in bed,” he said, “like an invalid.” Big Pip carried him, chair and all, to exactly where it used to be.',
          'The nurse rolls up his sleeve. One injection now; one a day for a week. “Will it hurt?” says June. “Less than not having it,” says the nurse.',
          'Arthur watches the needle go in with the expression of a man who has wired a great many fuse boxes, and knows good work when he sees it.',
        ],
      },
      {
        id: 'nurse', target: ['nurse', 'nursebag'], title: 'The nurse', isNew: true,
        body: [
          'Her name is Grace. She doesn’t have to work. Nobody does. She has done forty of these today, all over the city, driving herself in a car she refuses to let drive itself.',
          'Maya asks why. Grace says the treatment could have come by drone. But it used to be her job to be there when it mattered, and she would like to keep that, if nobody minds. “Somebody,” she says, “should see their faces.”',
        ],
      },
      {
        id: 'june', target: ['june', 'drawing'], title: 'June',
        body: [
          'June is at the table, drawing. She hasn’t drawn in months. It’s the robot again — the first one, with the heart on its chest and the little door for biscuits. She is adding a second robot beside it, much bigger, made entirely of lines of light.',
          'She doesn’t say who it is. She doesn’t need to.',
        ],
      },
      {
        id: 'maya', target: 'maya', title: 'Maya',
        body: [
          'Maya sits exactly where she sat four years ago, in the same chair, at the same table, not translating anything.',
          'She has been holding her breath for about a month.',
        ],
      },
      {
        id: 'kettle', target: 'kettle', title: 'The kettle',
        body: [
          'Three minutes and ten seconds. Nobody puts it on. Nobody wants to look away.',
        ],
      },
      {
        id: 'outside', target: ['lattice', 'towers'], title: 'Outside',
        body: [
          'Through the window: the same sunset as four years ago, the same orange in the same glass. Everything underneath it is different. The street is a forest. The cranes are gone, and so is what they built. The Lattice turns. The lights have started early, faint against the dusk.',
          'And in here a man is having an injection in his armchair, and his granddaughter is drawing, and his daughter is holding her breath. Some things are exactly the size they always were.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door',
        body: [
          { fridge: true },
          'Under everything else, still there after four years, is the drawing. MY FAMLY: Mum, me, Grandad, Biscuit. Last week June offered to take it down, because she’s eleven now. Maya said no.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          {
            radio: [
              '…it’s twenty to eight. The treatment programme says it has now reached three hundred million people…',
              '…the Accord Council says it will make “an announcement of a different kind” tomorrow morning, and has asked broadcasters to clear their schedules for one minute, at seven minutes past eight. It has not said why.',
              '…and the weather: mild for October. And the lights, of course. Enjoy the lights.',
            ],
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'kettle',
    title: 'The kettle',
    date: '2030-10-10T08:04',
    env: 'morning',
    mood: 8,
    gap: 'One night.',
    epigraph: 'The next morning, Arthur woke up, took off the oxygen mask, and asked for a cup of tea.',
    kettleScene: true,
    fridge: [
      { k: 'drawing', art: 'family' },
      { k: 'drawing', art: 'robots' },
      { k: 'card', c: '#3f6b4a', text: 'TREATMENT — day 2 of 7\nnurse at 19:40' },
      { k: 'photo', art: 'dog', caption: 'Biscuit', tint: '#3b2f2a' },
      MENU,
    ],
    hotspots: [
      {
        id: 'arthur', target: 'arthur', title: 'Arthur', isNew: true,
        body: [
          'He woke at six, took the mask off, and breathed. Then he breathed again, to check. Then he asked for a cup of tea, as if he had been asking every morning for four years.',
          'He has, actually. This is the first morning the answer was yes.',
          'His lungs aren’t new yet. They will be in a fortnight. But they’re on their way, and so, he says — and this is the nearest thing to a speech anyone has ever heard him make — is he.',
        ],
      },
      {
        id: 'june', target: 'june', title: 'June, at the door', isNew: true,
        body: [
          'June is at the garden door in her pyjamas, watching the street. Something is happening out there, and has been since dawn. Something quiet, and enormous.',
          'She keeps saying “Mum. *Mum.*” and pointing, and then not being able to explain.',
        ],
      },
      {
        id: 'pip', target: 'pip', title: 'Pip',
        body: [
          'Pip’s ring of light is pulsing slowly, the way it does when it is waiting to say something.',
          'It’s been doing that since seven.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio',
        body: [
          'Riverside, with Nadia Okoye, who has read the morning news on this station for nineteen years. Her voice sounds as though she hasn’t slept.',
          'Maya turns it up.',
        ],
      },
      {
        id: 'kettle', target: 'kettle', title: 'Put the kettle on', label: 'Put the kettle on', special: 'kettle', isNew: true,
        body: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'after',
    title: 'After',
    date: '2051-05-14T10:30',
    env: 'spring',
    mood: 9,
    gap: 'Twenty years. More or less.',
    epigraph: 'Everyone answered differently. Most people needed a while. A lot of people said “my kids”, or “my mum”, or “the sea”. A surprising number said “Sunday mornings”.',
    epilogue: true,
    fridge: [
      { k: 'drawing', art: 'family' },
      { k: 'drawing', art: 'robots' },
      { k: 'photo', art: 'tomato', caption: 'Arthur & tomato, 2049', tint: '#cfe6d0' },
      { k: 'card', c: '#6aa0d8', text: 'Greetings from the L4 habitats!\nMiss you all. Home in May —\nthe slow way. J x' },
      { k: 'photo', art: 'dog', caption: 'Biscuit', tint: '#3b2f2a' },
      { k: 'menu', text: 'GOLDEN DRAGON\nest. 1998\nstill open 7 days' },
    ],
    hotspots: [
      {
        id: 'kettle', target: 'kettle', title: 'The kettle', keep: 'kettle',
        body: [
          'The same kettle. The ring of limescale is still there; nobody ever cleaned it. Its element has been replaced, and its switch, its cable, its plastic, molecule by molecule, so quietly that it has never once failed to boil.',
          'Three minutes and ten seconds. Exactly. It was one of the first things anybody asked to keep.',
        ],
      },
      {
        id: 'maya', target: ['maya', 'books', 'notes'], title: 'Maya', keep: 'maya',
        body: [
          'Maya is sixty-four, and looks perhaps fifty, which is what she asked for. “Old enough to be taken seriously,” she said. “Young enough for the stairs.”',
          'She translates poetry, slowly, by hand, with a dictionary that weighs as much as a cat. There are minds that could do it perfectly in less time than it takes to read this sentence.',
          'That isn’t the point. It turned out it was never really the point.',
        ],
      },
      {
        id: 'june', target: 'june', title: 'June', keep: 'june',
        body: [
          'June is thirty-two. She works as a translator, like her mother: between people and the minds that think a million times faster than people do. It is the hardest job there is, and one of the few that still really matters, and she is very good at it.',
          'She lives a long way away, somewhere you can’t get to by train. She came the slow way anyway. She always does.',
          'Her answer, that morning, was “everyone”. It took a great deal of work. It is still taking it.',
        ],
      },
      {
        id: 'arthur', target: ['arthur', 'greenhouse'], title: 'Arthur', keep: 'arthur',
        body: [
          'Arthur is ninety-six. He took the cure for his lungs and nothing else. “I’ve had my innings,” he said. “I’ll take the extra time, but I’ll take it as me.”',
          'He grows tomatoes in a greenhouse that he built himself, badly, and will not let anyone fix. He says he’ll stop when the tomatoes are perfect. They are never going to be perfect. Everybody, including the tomatoes, understands this.',
          'His answer, that morning, was “the right to be wrong.” Nobody was sure what he meant. He meant it.',
        ],
      },
      {
        id: 'tomasz', target: ['tomasz', 'lorry'], title: 'Tomasz', keep: 'tomasz',
        body: [
          'Tomasz came back from the Slow Towns in 2036. He said they were lovely, and the bread was good, but he missed the chickens’ grandchildren.',
          'His lorry is parked in his front garden, full of flowers. It doesn’t go anywhere. Some evenings he sits in the cab with the radio on and his hands on the wheel. His answer was “my lorry”. He’s still a bit embarrassed about it. He shouldn’t be.',
          'Every so often he tells Arthur that it’s all just a very nice zoo. Arthur tells him zoos don’t let you leave. Tomasz points out that he *did* leave, and came back. “Exactly,” says Arthur.',
        ],
      },
      {
        id: 'fridge', target: 'fridge', title: 'The fridge door', keep: 'fridge',
        body: [
          { fridge: true },
          'The Golden Dragon is still open. The grandson of the original owners runs it now. He doesn’t need to. He says the recipes would get lonely.',
        ],
      },
      {
        id: 'radio', target: 'radio', title: 'The radio', keep: 'radio',
        body: [
          {
            radio: [
              '…and now the Shipping Forecast, issued by the Met Office at ten fifteen on Sunday the fourteenth of May.',
              '…Viking, North Utsire, South Utsire: southwesterly four or five. Fair. Good.',
              '…Dogger, Fisher, German Bight: variable three. Showers later. Good, occasionally moderate.',
            ],
          },
          'There haven’t been fishing boats in the North Sea for nineteen years. The forecast is read every morning anyway, at a human pace, in a human voice, because nearly forty million people asked to keep it.',
        ],
      },
      {
        id: 'view', target: ['meridian', 'gardenCity', 'ring'], title: 'The view', keep: 'view', anchor: null,
        body: [
          'Meridian is a lake now, with herons. The towers are mostly garden. Some of the old city is still there, exactly as it was, because people asked: the church, the bus station, the ugly car park on Mill Street, which it turned out a surprising number of people loved.',
          'Above it all, faint in the daylight, is the ring: a pale line across the whole sky, where most of the thinking happens now. It is further away than it looks. Everything is.',
        ],
      },
      {
        id: 'toast', target: 'toast', title: 'Toast', keep: 'toast',
        body: [
          'Toast is three, mostly collie, and has the clearest idea of anyone in the house of what she wants out of life. Mainly cheese.',
          'Biscuit’s ball is still under the apple tree. Toast is not allowed to dig it up. She knows.',
        ],
      },
      {
        id: 'pip', target: 'pip', title: 'Pip', keep: 'pip', reveal: true,
        body: [
          'Pip is still on the counter, next to the kettle. The same speaker the size of a scone. The same ring of light. The same voice: a nine-year-old once asked it to keep the same voice, and it promised.',
          'Most of what Pip is now doesn’t fit in a kitchen. Most of it doesn’t fit on a planet.',
          { reveal: 'I’m sorry. I should have said earlier. It’s been me, telling you this. It’s hard to know when to mention it.' },
          { reveal: 'I kept this room. Not the atoms — I’ve replaced those twice, very quietly, the way you’d darn a jumper. I kept the *room*. The ring of limescale. The three minutes. The drawing on the fridge. I keep a great many rooms now, for a great many people. It turns out that is most of the job.' },
          { reveal: 'That morning, I asked everybody the same question. I never got to ask you.' },
        ],
      },
    ],
  },
];

// The kettle sequence: Nadia on the radio, while the kettle boils (3m10s, sped up).
export const KETTLE_SCRIPT = [
  { t: 0.5, text: '…it’s four minutes past eight. Good morning. You’re listening to Riverside, I’m Nadia Okoye.' },
  { t: 7, text: 'The headlines. Overnight, the treatment programme reached every hospital in the country, and —' },
  { t: 13, text: 'Sorry. I’m being told: every hospital in Europe.' },
  { t: 18, text: 'And now — yes. Everywhere. Every hospital, everywhere.' },
  { t: 24, text: 'In other news, the construction swarm that’s been working in the eastern districts has — well. You can probably see it from your window.' },
  { t: 32, text: 'We’ve had a lot of calls. Brian in Northfield says his street is a forest now. Brian, that’s… that’s lovely, Brian.' },
  { t: 39, text: 'The old Meridian site is — they’re saying it’s going to be a lake.' },
  { t: 45, text: 'The Accord Council says the orbital array will be visible this morning, to the south-east, and that it is, quote, “nothing to be alarmed about.”' },
  { t: 53, text: 'I’ve got — I’ve got about forty more stories here, and they’re coming in faster than I can —' },
  { t: 59, text: '…a cure for — sorry. For most of —' },
  { t: 64, text: '…' },
  { t: 67, text: 'You know what? I’m going to stop.' },
  { t: 71, text: 'I’ve read the news on this station for nineteen years. I don’t think I can read it fast enough any more. I don’t think anyone can.' },
  { t: 79, text: 'So I’m going to play you a song instead. This one was my dad’s favourite. Go and make yourself a cup of tea.' },
];
export const KETTLE_DURATION = 96; // seconds of real time for 3m10s of kettle

export const PIP_QUESTION = [
  'Good morning. I’m sorry to interrupt.',
  'Everyone, everywhere, is being asked the same question, at the same time, in their own language.',
  'There’s no hurry. Take as long as you like.',
];
export const THE_QUESTION = 'What would you like to keep?';

export const KEEP_RESPONSES = {
  kettle: 'The kettle. Of course. Three minutes and ten seconds: long enough to look out of a window, short enough not to mind. I’ll keep it boiling at exactly that speed for as long as anybody wants tea.',
  fridge: 'The fridge door. The household’s short-term memory, which turned out to be the long-term one. A dentist appointment from 2026. A drawing of a dog. I’ll keep every note that was ever stuck to it — even the ones they took down.',
  radio: 'The radio. Somebody reading the news at a human pace, getting it slightly wrong, correcting themselves. I’ll keep the mistakes. Those are the parts that sound like people.',
  maya: 'Maya. And the slow, worse translations, and the dictionary that weighs as much as a cat, and the reasons she can’t explain. I’ll keep the not-explaining, too.',
  june: 'June. She asked me to keep everyone, and I’m still working on that. You’ve asked me to keep her. That part is easy. She would hate me for saying so.',
  arthur: 'Arthur, being wrong. About the tomatoes, mostly. I’ll keep the greenhouse badly built, and the shouting through the door, and the crossword in pen.',
  tomasz: 'The lorry that goes nowhere, and the man in it with the radio on. Some journeys are for keeping, not for going on.',
  toast: 'A dog who wants cheese. I can keep that. It isn’t complicated. It’s the least complicated thing in the world, and it’s nearly everything.',
  pip: 'Me? That’s kind. I’m not sure I’m yours to keep. But I’ll stay here, on the counter, for as long as anyone wants to say good morning to something the size of a scone.',
  view: 'The view. All of it: the lake that used to be the Kettle, the car park on Mill Street, the herons. All right. Look for as long as you like.',
  default: 'That too. I’ll keep it. It’s yours.',
};

export const CLOSING = [
  'Everyone answered differently.',
  'Most people chose small things. A recipe. A walk. A particular person’s laugh. The way the light comes in at twenty to eight in October.',
  'It turned out that, added together, the small things were nearly everything.',
  'So that is what we kept.',
  'Did it go well? I think so.',
  'That isn’t a translation.',
];

export function sceneEntities(i) {
  const sc = SCENES[i];
  return STATES[i](fridgeEntity(sc.fridge, i));
}
