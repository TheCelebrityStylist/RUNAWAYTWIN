/* Tool landing pages. One page per search intent — each answers a different question. */

export type ToolPage = {
  slug: string;
  title: string; // <title>
  description: string; // meta description
  eyebrow: string;
  h1: string;
  lede: string;
  steps: [string, string][];
  sections: { h2: string; body: string[] }[];
  faq: { q: string; a: string }[];
  cta: string;
};

export const TOOLS: ToolPage[] = [
  {
    slug: "find-clothes-from-picture",
    title: "Find Clothes From a Picture — Every Piece, Three Price Levels",
    description:
      "Upload a picture and RunwayTwin finds every piece of clothing in it: colour, fabric, cut, and where to buy it at high-street, mid-range or luxury prices. 3 free searches a month.",
    eyebrow: "Find clothes from a picture",
    h1: "Find the clothes in any picture",
    lede:
      "Screenshot it, upload it, shop it. RunwayTwin reads the whole outfit — not just the most obvious item — and gives you a shoppable list for every piece.",
    steps: [
      ["Upload the picture", "A screenshot, a street-style photo, a red-carpet shot. Full-length photos give the best results."],
      ["Get every piece", "Jacket, top, trousers, shoes, bag, jewellery. Each with its colour, fabric and cut described the way a stylist would."],
      ["Pick your price", "Every piece comes with a high-street, mid-range and luxury option, plus the total for the whole look."],
    ],
    sections: [
      {
        h2: "Why not just use Google Lens?",
        body: [
          "Google Lens is good at one thing: finding images that look like the one you gave it. Point it at a bag and it will show you similar bags. That's useful when you want the exact item and the photo is clear.",
          "It's weaker at outfits. Lens picks one object at a time, mixes in Pinterest pins and resale listings, and rarely tells you what the thing actually is. RunwayTwin works from the other direction: it names each piece first (\"cropped boxy wool blazer, charcoal, single-breasted\") and then finds it to buy. You get a full look you can actually shop, at the budget you choose.",
        ],
      },
      {
        h2: "Getting the best result from a photo",
        body: [
          "Use the sharpest version you can find. A crop from a video still works, but compression blurs texture, and texture is how you tell wool from polyester.",
          "Full-length beats close-up for outfits. If you only care about the shoes, crop to the shoes.",
          "Busy backgrounds are fine. Several people in one shot are fine too — say who you mean in the note field.",
        ],
      },
      {
        h2: "What happens to your photo",
        body: [
          "Uploads are private and are not shown to anyone else. RunwayTwin identifies clothes and accessories, never people, so there is no face recognition involved.",
        ],
      },
    ],
    faq: [
      { q: "Is it free to find clothes from a picture?", a: "Yes. A free account includes 3 looks a month. RunwayTwin Pro is €9.99 a month for unlimited looks, with the first 7 days free." },
      { q: "Will it find the exact item?", a: "When a logo, a signature design or a press credit identifies the brand, RunwayTwin names it and links to the original. Otherwise it gives the closest matches it can find, clearly labelled as similar." },
      { q: "Does it work on screenshots from Instagram or TikTok?", a: "Yes. Screenshots are the most common upload. Crop out the app interface if it covers the outfit." },
      { q: "Can I search for men's clothes?", a: "Yes. RunwayTwin reads menswear the same way: every piece, its fabric and cut, and three price levels." },
    ],
    cta: "Upload a picture",
  },
  {
    slug: "ai-outfit-finder",
    title: "AI Outfit Finder — Upload a Photo, Shop the Whole Look",
    description:
      "An AI outfit finder that breaks a photo into every piece and finds each one to buy. Works on screenshots, street style and red carpet photos. Try 3 looks free.",
    eyebrow: "AI outfit finder",
    h1: "The AI outfit finder that reads the whole look",
    lede:
      "Most clothes finders match one item. RunwayTwin reads an outfit the way a stylist does — silhouette, fabric, colour, proportion — and turns it into a list you can shop.",
    steps: [
      ["Drop in a photo", "Or skip the photo and type a celebrity's name to start from their style."],
      ["The AI breaks it down", "Each visible piece is named and described: fit, fabric, colour, details like buttons, hems and hardware."],
      ["Shop or refine", "Buy the pieces, swap any of them, or ask for the same look in a different colour or budget."],
    ],
    sections: [
      {
        h2: "What the AI actually looks at",
        body: [
          "Silhouette first: is the trouser straight, wide or tapered, where does the jacket end, how much volume is in the sleeve. Then fabric, from sheen and drape. Then colour, named precisely enough to shop (\"camel\" and \"tobacco\" are not the same coat). Then details.",
          "That description is what makes the search work. Two jackets can look identical in a thumbnail and be completely different garments in your hands.",
        ],
      },
      {
        h2: "When it can name the brand",
        body: [
          "The AI names a brand only when there is something to go on: a visible logo, a signature design, or a credit in press coverage of a celebrity look. When it is guessing from shape alone, it says so and shows similar pieces instead. We would rather send you to a good match than a wrong label.",
        ],
      },
      {
        h2: "More than a one-off search",
        body: [
          "Save the looks you like, build a virtual closet, and ask the AI stylist what to wear with what you already own. The outfit finder is the front door; the rest is there when you want it.",
        ],
      },
    ],
    faq: [
      { q: "Which AI does RunwayTwin use?", a: "RunwayTwin runs on current multimodal vision models chosen for how accurately they describe clothing, and we test them against each other on real outfit photos." },
      { q: "How accurate is the AI outfit finder?", a: "It reliably names the type, colour and cut of each visible piece. Exact brand identification depends on what the photo shows. Results are suggestions, so check the product page before you buy." },
      { q: "Is there an app?", a: "RunwayTwin works in your phone's browser, so there is nothing to install. Add it to your home screen for one-tap access." },
    ],
    cta: "Try the outfit finder",
  },
  {
    slug: "identify-clothing-brand-from-photo",
    title: "Identify a Clothing Brand From a Photo — and Find It Cheaper",
    description:
      "How to identify the brand of clothing in a photo: logos, signature designs and press credits. RunwayTwin names the brand when it can and finds the piece at three price levels.",
    eyebrow: "Identify clothing brands",
    h1: "Identify the brand from a photo",
    lede:
      "Sometimes you want the exact piece. Sometimes you want the look without the label. RunwayTwin tells you which brand it is when the photo gives it away — and finds the alternatives either way.",
    steps: [
      ["Upload the photo", "The clearer the detail — hardware, stitching, a logo — the better the odds of an exact brand."],
      ["See what can be identified", "Pieces with a visible logo or a recognisable signature design are named. Everything else is described precisely."],
      ["Original or alternative", "Link to the original where it exists, plus high-street and mid-range pieces that give the same effect."],
    ],
    sections: [
      {
        h2: "How brands give themselves away",
        body: [
          "Logos are the obvious one, but most luxury pieces don't carry a visible logo. Signature designs do the work instead: a woven-leather bag, a horsebit on a loafer, a quilted chain-strap bag, a particular buckle. These are what a trained eye — or a well-trained model — recognises.",
          "For celebrity outfits there is a third route: stylists and brands credit looks in press coverage, so a red-carpet dress is often publicly identified within a day.",
        ],
      },
      {
        h2: "When the brand can't be identified",
        body: [
          "Plain basics — a white tee, straight jeans, a black coat — usually can't be traced to one brand from a photo, and anyone who tells you otherwise is guessing. For those, the description matters more than the label: the right fabric weight and cut will get you 95% of the look for a fraction of the price.",
        ],
      },
    ],
    faq: [
      { q: "Can RunwayTwin tell if something is fake?", a: "No. It identifies designs from photos; it does not authenticate items. Buy from the brand or an authorised retailer if authenticity matters." },
      { q: "What if the photo is blurry?", a: "You will still get a description of each piece and similar items to buy, but brand identification needs visible detail." },
      { q: "Does it work for shoes, bags and jewellery?", a: "Yes. Accessories are often the easiest pieces to identify because their designs are so distinctive." },
    ],
    cta: "Identify a piece",
  },
  {
    slug: "find-dress-from-photo",
    title: "Find a Dress From a Photo — Exact Match or Lookalike",
    description:
      "Found a dress in a photo? Upload it and RunwayTwin describes the neckline, length, fabric and fit, then finds it or a lookalike at high-street, mid-range or luxury prices.",
    eyebrow: "Find a dress from a photo",
    h1: "Find that dress from a photo",
    lede:
      "Wedding guest, red carpet, someone's holiday photos. Upload the picture and get the dress — or the closest thing to it — at the price you want to pay.",
    steps: [
      ["Upload the dress", "Full-length is best: the hem and the shape of the skirt matter more than you'd think."],
      ["Get the details that matter", "Neckline, sleeve, waist, length, skirt shape, fabric and colour — the words you'd need to search for it yourself."],
      ["Shop three ways", "The original if it can be identified, plus lookalikes at high-street and mid-range prices."],
    ],
    sections: [
      {
        h2: "Why dresses are hard to search for",
        body: [
          "Type \"green satin dress\" into any shop and you will get hundreds of results that look nothing like the one you saw. The difference is in the details nobody thinks to search for: bias-cut or straight, cowl or square neck, midi or maxi, a slip or a fitted bodice.",
          "RunwayTwin writes those details out for you, then searches with them. That is why the matches actually look like the dress.",
        ],
      },
      {
        h2: "Event dresses and celebrity dresses",
        body: [
          "Red-carpet gowns are usually one-offs or runway pieces you can't buy. For those, RunwayTwin finds dresses with the same shape, colour and effect at prices that make sense for a wedding or a party, and tells you honestly when the original is not for sale.",
        ],
      },
    ],
    faq: [
      { q: "Can it find a dress from a screenshot?", a: "Yes. Screenshots from Instagram, TikTok or Pinterest work well as long as the dress is visible from neckline to hem." },
      { q: "Can I find a cheaper version of a designer dress?", a: "Yes. Every result includes a high-street and a mid-range option alongside the original." },
      { q: "Does it work for bridesmaid and wedding guest dresses?", a: "Yes. Add a note like \"wedding guest, under €150\" and the results are tailored to it." },
    ],
    cta: "Find my dress",
  },
  {
    slug: "celebrity-outfit-finder",
    title: "Celebrity Outfit Finder — ID Any Look and Shop It",
    description:
      "Upload a celebrity photo or type a name. RunwayTwin IDs every piece of the outfit and finds it at high-street, mid-range or luxury prices. Zendaya, Hailey Bieber, Rihanna and more.",
    eyebrow: "Celebrity outfit finder",
    h1: "Celebrity outfit ID, in seconds",
    lede:
      "The paparazzi shot, the red carpet, the airport look. Upload it, or just type the name, and RunwayTwin breaks down what they're wearing and where to buy it.",
    steps: [
      ["Upload or type a name", "Upload a specific photo, or type a celebrity's name to work from their signature style."],
      ["Every piece, identified", "Brands are named where a logo, signature design or press credit confirms them."],
      ["Shop the look at your price", "Original, mid-range and high-street versions, with a total for the whole outfit."],
    ],
    sections: [
      {
        h2: "Outfit ID without the waiting",
        body: [
          "Fan accounts that ID celebrity outfits are brilliant, but you wait for someone to post and they only cover the famous looks. RunwayTwin works on any photo, the moment you have it — including the Tuesday-afternoon coffee run nobody else bothered to ID.",
        ],
      },
      {
        h2: "We identify clothes, not people",
        body: [
          "RunwayTwin never runs face recognition. When you upload a photo, it reads the clothing. When you type a name, it works from that person's publicly documented style. Either way, you stay in control of what you search for.",
        ],
      },
    ],
    faq: [
      { q: "Which celebrities can I search?", a: "Anyone. Type any name and RunwayTwin builds the look from their documented style, or upload a specific photo." },
      { q: "Is it the exact outfit?", a: "When the brand is confirmed by a visible logo, signature design or press credit, yes. Otherwise you get close matches, clearly labelled." },
      { q: "Can I get celebrity outfits for less?", a: "That's the point. Every piece comes with a high-street and mid-range option next to the original." },
    ],
    cta: "Find a celebrity outfit",
  },
];

export const getTool = (slug: string) => TOOLS.find((t) => t.slug === slug)!;
