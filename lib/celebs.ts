/* Celebrity style hubs. Style descriptions stick to widely documented, long-running signatures. */

export type Piece = { name: string; look: string };
export type Celeb = {
  slug: string;
  name: string;
  short: string; // first name / possessive base
  tagline: string;
  description: string; // meta description
  intro: string[];
  formula: string[];
  pieces: Piece[];
  budget: { high: string; mid: string; lux: string };
  guide?: { href: string; label: string };
  faq: { q: string; a: string }[];
  related: string[];
};

export const CELEBS: Celeb[] = [
  {
    slug: "hailey-bieber",
    name: "Hailey Bieber",
    short: "Hailey",
    tagline: "Oversized on top, sleek underneath, always one clean accessory.",
    description:
      "Hailey Bieber's outfits, decoded: the oversized blazer, the leather jacket, the loafers-and-socks trick. Her style formula and where to buy every piece at three price levels.",
    intro: [
      "Hailey Bieber's off-duty style is the most copied in street style for a reason: it looks expensive, and almost none of it is complicated. Big outerwear, a fitted or tiny layer underneath, one strong accessory.",
      "The trick is proportion. The jacket is always a size too big, the base layer always close to the body, and the shoes do the finishing.",
    ],
    formula: [
      "An oversized blazer or leather jacket, shoulders dropped past the natural line",
      "A close-fitting base: baby tee, tank, bodysuit or bike shorts",
      "Baggy, low-slung jeans or tailored trousers that pool at the shoe",
      "Loafers with white socks, or a pointed slingback",
      "Small, structured shoulder bag and slim sunglasses",
    ],
    pieces: [
      { name: "Oversized blazer", look: "Boxy, single- or double-breasted, in black, grey or brown. Drop shoulder, sleeves to the knuckles." },
      { name: "Leather jacket", look: "Oversized bomber or boxy blazer cut in smooth leather. Black or chocolate." },
      { name: "Baby tee", look: "Cropped, fitted, white or black, thick cotton rather than thin jersey." },
      { name: "Baggy jeans", look: "Straight to wide leg, mid-blue or washed black, long enough to break over the shoe." },
      { name: "Chunky loafers", look: "Black leather, lug or flat sole. Worn with white crew socks." },
      { name: "Shoulder bag", look: "Small, structured, leather. Tucked high under the arm." },
    ],
    budget: {
      high: "Get the blazer right and everything else can be basic. High-street tailoring in a heavier fabric, sized up.",
      mid: "Spend on the leather jacket and the loafers — they carry the look and they last.",
      lux: "The originals lean on quiet European labels with no visible logos. The bag is where she spends.",
    },
    faq: [
      { q: "What is Hailey Bieber's style called?", a: "It's usually described as \"model off-duty\": oversized tailoring and outerwear over fitted basics, with minimal, polished accessories." },
      { q: "How do I dress like Hailey Bieber on a budget?", a: "Buy one great oversized blazer and wear it over everything you already own. Add loafers and white socks. That's 80% of the look." },
    ],
    related: ["kendall-jenner", "sofia-richie", "bella-hadid"],
  },
  {
    slug: "sofia-richie",
    name: "Sofia Richie",
    short: "Sofia",
    tagline: "Quiet luxury: soft colours, good fabric, no logos.",
    description:
      "Sofia Richie's outfits and the quiet luxury formula she made famous: neutral knits, tailored trousers, ballet flats, gold jewellery. Where to buy each piece at three price levels.",
    intro: [
      "Sofia Richie Grainge became the face of \"quiet luxury\" almost overnight in 2023. The style was hers long before the name: clean lines, soft neutrals, and clothes that look like they cost more than they say.",
      "Nothing shouts. The polish is in the fit, the fabric and the grooming — a slicked bun and gold jewellery do as much as any garment.",
    ],
    formula: [
      "A neutral palette: cream, camel, navy, white, soft grey",
      "Fine knits — a cashmere crew, a polo knit, a cardigan over the shoulders",
      "High-waisted tailored trousers or a clean midi skirt",
      "Ballet flats, loafers or a low slingback",
      "Gold jewellery, a structured top-handle bag, hair pulled back",
    ],
    pieces: [
      { name: "Cashmere crewneck", look: "Fine-gauge, slightly relaxed, in cream or camel." },
      { name: "Tailored trousers", look: "High-waisted, pleated, full length, in navy, ivory or grey wool." },
      { name: "Button-down shirt", look: "Crisp white or pale blue poplin, sleeves rolled once." },
      { name: "Ballet flats", look: "Leather, almond toe, black or nude." },
      { name: "Top-handle bag", look: "Structured, compact, smooth leather in tan or black." },
      { name: "Gold hoops", look: "Medium, chunky, polished gold." },
    ],
    budget: {
      high: "Quiet luxury is about fabric. On the high street, pick natural fibres — wool blends, cotton poplin — over synthetic shine.",
      mid: "Mid-range is the sweet spot: cashmere and leather basics that look identical to the originals.",
      lux: "The originals are heritage houses known for knitwear and leather goods, rarely with a logo in sight.",
    },
    faq: [
      { q: "What does quiet luxury mean?", a: "Clothes that signal quality through fabric, fit and restraint rather than logos: neutral colours, classic shapes and excellent materials." },
      { q: "What shoes does Sofia Richie wear?", a: "Mostly ballet flats, loafers and low slingbacks in black or neutral leather." },
    ],
    related: ["hailey-bieber", "kendall-jenner", "jennifer-lawrence"],
  },
  {
    slug: "kendall-jenner",
    name: "Kendall Jenner",
    short: "Kendall",
    tagline: "Minimal, tall lines, and a very short list of colours.",
    description:
      "Kendall Jenner's outfits: minimal basics, straight jeans, tanks, long coats and ballet flats. Her style formula and where to buy every piece at high-street, mid-range or luxury prices.",
    intro: [
      "Kendall Jenner dresses like someone who has worn every trend on a runway and kept none of them. Off duty, it's a short list: straight jeans, a tank or a crisp shirt, a long coat, a flat shoe.",
      "The colours rarely leave black, white, grey, navy and brown. The effect is long, clean and quietly expensive.",
    ],
    formula: [
      "Straight or slightly relaxed jeans, often in a vintage wash",
      "A fitted tank, a ribbed long-sleeve or a slightly oversized shirt",
      "A long coat or a trench, worn open",
      "Ballet flats, loafers or simple boots",
      "Barely any jewellery, sunglasses doing the work",
    ],
    pieces: [
      { name: "Straight-leg jeans", look: "Mid or light vintage wash, high rise, full length." },
      { name: "White tank", look: "Ribbed, fitted, thick enough not to be sheer." },
      { name: "Long wool coat", look: "Below the knee, single-breasted, camel, grey or black." },
      { name: "Trench coat", look: "Classic beige, belted but worn open." },
      { name: "Ballet flats", look: "Black leather or mesh, very low profile." },
      { name: "Oval sunglasses", look: "Slim, black or tortoiseshell." },
    ],
    budget: {
      high: "High-street denim and tanks are easy wins. Look for 100% cotton and a long inseam.",
      mid: "Invest in the coat. It's what makes the simple pieces look deliberate.",
      lux: "Her originals lean on minimalist labels famous for perfect basics and no branding.",
    },
    faq: [
      { q: "What is Kendall Jenner's style?", a: "Minimalist and model-off-duty: straight jeans, simple tops, long coats and flat shoes in a narrow, neutral palette." },
      { q: "What jeans does Kendall Jenner wear?", a: "Usually straight-leg or relaxed high-rise jeans in a vintage-looking wash, worn full length." },
    ],
    related: ["hailey-bieber", "bella-hadid", "sofia-richie"],
  },
  {
    slug: "bella-hadid",
    name: "Bella Hadid",
    short: "Bella",
    tagline: "Archival, low-slung, a little off — on purpose.",
    description:
      "Bella Hadid's outfits decoded: vintage and archival pieces, low-rise everything, tiny sunglasses and, lately, western wear. Her style formula and where to buy the pieces at three price levels.",
    intro: [
      "Bella Hadid's style runs on vintage. Archival designer pieces, '90s and early-2000s shapes, and combinations that shouldn't work but do.",
      "More recently she has leaned into western wear — cowboy boots, denim on denim, belt buckles — and made it feel just as current.",
    ],
    formula: [
      "Low-rise trousers, skirts and jeans",
      "A tiny or unexpected top: a vintage tee, a knit tank, a corset",
      "Leather in brown, black or burgundy",
      "Tiny oval sunglasses and layered silver jewellery",
      "Cowboy boots or chunky vintage shoes",
    ],
    pieces: [
      { name: "Low-rise trousers", look: "Sitting on the hip, straight or flared, in leather, denim or pinstripe." },
      { name: "Vintage leather jacket", look: "Fitted or cropped, worn-in brown or black leather." },
      { name: "Cowboy boots", look: "Pointed toe, mid-calf, brown or black leather." },
      { name: "Tiny sunglasses", look: "Narrow oval or rectangular frames, tinted lenses." },
      { name: "Baby tee", look: "Vintage-feel graphic or plain, cropped and tight." },
      { name: "Silver jewellery", look: "Chunky rings, chains and cuffs, layered." },
    ],
    budget: {
      high: "High street does low-rise and baby tees well. Skip anything that tries to look vintage — buy it actually vintage instead.",
      mid: "Second-hand and vintage platforms are the closest you'll get to how she actually shops.",
      lux: "Her originals are often archival runway pieces, which you can track down on resale sites.",
    },
    faq: [
      { q: "What is Bella Hadid's style called?", a: "It's often described as vintage or Y2K-inspired, with recent phases into western wear." },
      { q: "Where does Bella Hadid buy her clothes?", a: "Much of what she wears is vintage or archival designer pieces, so resale and vintage platforms are the best place to look for similar items." },
    ],
    related: ["kendall-jenner", "dua-lipa", "hailey-bieber"],
  },
  {
    slug: "zendaya",
    name: "Zendaya",
    short: "Zendaya",
    tagline: "Sculpted shapes, liquid shine, and the film always in the outfit.",
    description:
      "Zendaya's outfits: the red-carpet glam, the themed press-tour looks and the off-duty tailoring. Her style formula, the key pieces and where to buy them at three price levels.",
    intro: [
      "Zendaya and her long-time stylist Law Roach made the press tour an event in itself. Their trademark is \"method dressing\": outfits that echo the film being promoted, from tennis references during Challengers to the sculptural looks of the Dune tours.",
      "Off the carpet, the line is simpler: sharp tailoring, strong shoulders, a single bold colour.",
    ],
    formula: [
      "One strong silhouette — a sculpted shoulder, a column, a corseted waist",
      "Liquid fabrics: satin, metallic, high-shine leather",
      "A single colour head to toe",
      "Pointed heels that disappear under a long hem",
      "Minimal jewellery so the shape stays the hero",
    ],
    pieces: [
      { name: "Column gown", look: "Floor-length, one colour, fitted through the body." },
      { name: "Strong-shoulder blazer", look: "Structured, padded shoulder, worn as a dress or with matching trousers." },
      { name: "Satin slip dress", look: "Bias-cut, midi or maxi, in a deep jewel tone." },
      { name: "Pointed pumps", look: "Sleek, high, in the same colour as the outfit." },
      { name: "Wide-leg tailored trousers", look: "High-waisted, floor-grazing, sharp crease." },
      { name: "Statement earrings", look: "One bold sculptural pair, nothing else." },
    ],
    budget: {
      high: "Pick one colour and buy everything in it. A monochrome outfit looks deliberate at any price.",
      mid: "Spend on tailoring with real shoulder structure. It's the backbone of her off-duty looks.",
      lux: "Her red-carpet looks are often custom or archival couture, so focus on recreating the shape rather than the label.",
    },
    guide: { href: "/blog/zendaya-evening-glam", label: "Zendaya evening glam: the wearable formula" },
    faq: [
      { q: "Who styles Zendaya?", a: "Zendaya has worked with stylist Law Roach since she was a teenager; the pair are known for themed \"method dressing\" on press tours." },
      { q: "What is method dressing?", a: "Dressing in outfits that reference the film or character being promoted, such as tennis-inspired looks during the Challengers press tour." },
    ],
    related: ["rihanna", "blake-lively", "dua-lipa"],
  },
  {
    slug: "rihanna",
    name: "Rihanna",
    short: "Rihanna",
    tagline: "Volume, attitude, and luxury worn like streetwear.",
    description:
      "Rihanna's outfits: oversized outerwear, streetwear mixed with couture, and the boldest maternity style in years. Her style formula and where to buy the pieces at three price levels.",
    intro: [
      "Rihanna treats luxury like streetwear and streetwear like couture. An oversized jersey with a satin skirt, a coat big enough to sleep in, heels with track pants.",
      "Her maternity style rewrote the rules — crop tops and low-slung skirts instead of hiding the bump — and the same confidence runs through everything she wears.",
    ],
    formula: [
      "One piece with dramatic volume: a coat, a puffer, a jersey",
      "Contrast underneath — something small, sheer or fitted",
      "Mixing registers: sportswear with tailoring, denim with satin",
      "Heels or pointed boots, even with casual pieces",
      "Layered jewellery and tinted sunglasses",
    ],
    pieces: [
      { name: "Oversized coat", look: "Floor-length or extra-wide, in leather, shearling or bold colour." },
      { name: "Oversized jersey or hoodie", look: "Sports jersey or heavyweight hoodie, worn as a dress." },
      { name: "Baggy jeans", look: "Very wide, low-slung, often with a visible waistband." },
      { name: "Pointed heels", look: "Mules or pumps, satin or leather." },
      { name: "Tinted sunglasses", look: "Bold frames, coloured lenses." },
      { name: "Layered chains", look: "Gold or diamond-look, several lengths at once." },
    ],
    budget: {
      high: "The look is about size, not price. Buy outerwear two sizes up and pair it with heels.",
      mid: "Find one statement coat. It is the whole look.",
      lux: "She mixes her own labels with major luxury houses; the jewellery is where the money shows.",
    },
    guide: { href: "/blog/rihanna-street-luxe", label: "Rihanna street luxe: volume, edge, easy drama" },
    faq: [
      { q: "What is Rihanna's style?", a: "A high-low mix of streetwear and luxury, built around oversized volume, bold contrast and confident styling." },
      { q: "How do I dress like Rihanna?", a: "Pick one oversized statement piece, wear something fitted or small underneath, and add heels where you'd expect trainers." },
    ],
    related: ["zendaya", "dua-lipa", "hailey-bieber"],
  },
  {
    slug: "dua-lipa",
    name: "Dua Lipa",
    short: "Dua",
    tagline: "Bold colour, vintage finds and a corset where you'd least expect it.",
    description:
      "Dua Lipa's outfits: vintage pieces, corsets, bold colour and Y2K shapes, on stage and off. Her style formula and where to buy the pieces at three price levels.",
    intro: [
      "Dua Lipa dresses with a sense of fun that most pop stars lose on the way up. Vintage designer finds, Y2K shapes, bold prints and colour — then a crisp, grown-up coat over the top.",
      "On stage it's catsuits and sparkle; off stage it's the same energy in wearable form.",
    ],
    formula: [
      "A corset or bustier top, worn casually",
      "Bold colour or print — red, cobalt, leopard",
      "Vintage or archival designer pieces",
      "Mini skirts and low-rise trousers",
      "Statement sunglasses and platform shoes",
    ],
    pieces: [
      { name: "Corset top", look: "Structured, satin or denim, worn with jeans." },
      { name: "Mini skirt", look: "Leather, denim or a bold print, low on the hip." },
      { name: "Vintage leather coat", look: "Long, worn-in, often in black or burgundy." },
      { name: "Platform heels", look: "Chunky platform, strappy or Mary Jane." },
      { name: "Statement sunglasses", look: "Shield, cat-eye or oversized, often tinted." },
      { name: "Graphic baby tee", look: "Cropped, vintage-style print." },
    ],
    budget: {
      high: "Corsets and minis are cheap and plentiful on the high street. Keep the rest simple.",
      mid: "Vintage platforms are where her look really lives.",
      lux: "She often wears archival runway pieces and up-and-coming designers.",
    },
    faq: [
      { q: "What is Dua Lipa's style?", a: "Playful and bold: vintage designer pieces, Y2K silhouettes, corsets, bright colour and statement accessories." },
      { q: "What should I wear to a Dua Lipa concert?", a: "A corset or sparkly top with a mini skirt or flared trousers, platform shoes and statement sunglasses — but make sure you can dance in it." },
    ],
    related: ["bella-hadid", "sabrina-carpenter", "rihanna"],
  },
  {
    slug: "sabrina-carpenter",
    name: "Sabrina Carpenter",
    short: "Sabrina",
    tagline: "Babydoll minis, bows and platforms — retro glamour, turned up.",
    description:
      "Sabrina Carpenter's outfits: the babydoll minis, corsets, bows and platform heels of her tour looks, plus how to wear them off stage. Her style formula and where to buy the pieces.",
    intro: [
      "Sabrina Carpenter's look is retro pin-up glamour turned up to concert volume: short babydoll dresses, corsets, ruffles, bows and very high platform heels.",
      "Her tour costumes are custom, but the shapes are easy to find — which is why her outfits are everywhere at her shows.",
    ],
    formula: [
      "A short babydoll or corseted mini dress",
      "Ruffles, lace trims and bows",
      "Soft pastels, cherry red, or sparkle",
      "Very high platform heels or boots",
      "Big, bouncy hair and a retro make-up look",
    ],
    pieces: [
      { name: "Babydoll mini dress", look: "Short, A-line, ruffled or lace-trimmed." },
      { name: "Corset mini dress", look: "Structured bodice, flared skirt, satin or sequin." },
      { name: "Platform heels", look: "Very high platform, Mary Jane or strappy." },
      { name: "Hair bows", look: "Satin or velvet, oversized." },
      { name: "Sparkly bodysuit", look: "Sequin or crystal, high-cut." },
      { name: "Faux-fur coat", look: "Short, fluffy, pastel or white." },
    ],
    budget: {
      high: "The high street is full of babydoll and corset dresses. Spend the money on shoes you can stand in all night.",
      mid: "Look for better-made corsetry — real boning makes the shape.",
      lux: "Her stage looks are custom pieces by major designers, so recreate the shape rather than chase the label.",
    },
    faq: [
      { q: "What should I wear to a Sabrina Carpenter concert?", a: "A short babydoll or corset dress, a bow in your hair and platform heels or boots. Pastels, cherry red and sparkle all fit the theme." },
      { q: "What is Sabrina Carpenter's style called?", a: "It's usually described as retro or pin-up glam, with coquette details like bows, ruffles and lace." },
    ],
    related: ["taylor-swift", "dua-lipa", "selena-gomez"],
  },
  {
    slug: "taylor-swift",
    name: "Taylor Swift",
    short: "Taylor",
    tagline: "Sparkle on stage; minis, knee-high boots and cardigans off it.",
    description:
      "Taylor Swift's outfits: Eras Tour sparkle, her off-duty mini skirts and knee-high boots, and game-day style. Her style formula and where to buy the pieces at three price levels.",
    intro: [
      "Taylor Swift has two wardrobes. On stage: sequinned bodysuits, sparkle and a look for every era. Off stage: a remarkably consistent uniform of mini skirts, knee-high boots, cosy knits and a red lip.",
      "Both have one thing in common: they are designed to be recognised, and copied.",
    ],
    formula: [
      "A mini skirt or short dress with a fitted top",
      "Knee-high or over-the-knee boots",
      "A cropped cardigan, a knit, or a long coat",
      "A red lip and minimal jewellery",
      "For concerts: sequins, sparkle and a nod to an era",
    ],
    pieces: [
      { name: "Sequin bodysuit", look: "High-cut, long-sleeved or sleeveless, crystal or sequin." },
      { name: "Mini skirt", look: "Pleated, tweed or plaid, high-waisted." },
      { name: "Knee-high boots", look: "Black or brown leather, block or stiletto heel." },
      { name: "Cropped cardigan", look: "Chunky knit, cream or navy, buttoned." },
      { name: "Long tailored coat", look: "Single-breasted, below the knee, camel or black." },
      { name: "Red lipstick", look: "Classic blue-based red, matte." },
    ],
    budget: {
      high: "For a concert, the high street has endless sparkle. For off-duty, focus on good boots.",
      mid: "The knee-high boots are worth the money. They make every mini skirt look like her.",
      lux: "Her stage costumes are custom couture; her off-duty pieces are mostly accessible contemporary labels.",
    },
    faq: [
      { q: "What should I wear to a Taylor Swift concert?", a: "Pick an era and dress for it: sequins for Midnights, cardigans for Folklore, red for Red. Sparkle never goes wrong." },
      { q: "What is Taylor Swift's off-duty style?", a: "Mini skirts with knee-high boots, cropped cardigans or knits, long coats and a red lip." },
    ],
    related: ["sabrina-carpenter", "selena-gomez", "blake-lively"],
  },
  {
    slug: "selena-gomez",
    name: "Selena Gomez",
    short: "Selena",
    tagline: "Classic, feminine and a coat collection worth stealing.",
    description:
      "Selena Gomez's outfits: classic feminine dressing and the statement coats of Only Murders in the Building. Her style formula and where to buy the pieces at three price levels.",
    intro: [
      "Selena Gomez dresses classically: fitted, feminine shapes, rich colours and a lot of very good coats.",
      "Her character Mabel in Only Murders in the Building turned that coat habit into a phenomenon — bold, oversized, patterned outerwear that people still search for every season.",
    ],
    formula: [
      "A statement coat: oversized, textured, patterned or fringed",
      "Fitted knits and simple dresses underneath",
      "Rich colours: burgundy, forest green, mustard",
      "Knee-high boots or block heels",
      "Polished hair and a classic lip",
    ],
    pieces: [
      { name: "Oversized statement coat", look: "Bold colour or pattern, cocoon shape, below the knee." },
      { name: "Shearling coat", look: "Cream or tan, oversized collar." },
      { name: "Turtleneck", look: "Fitted, fine knit, in a jewel tone." },
      { name: "Midi slip dress", look: "Satin, bias-cut, worn with a knit over it." },
      { name: "Knee-high boots", look: "Leather, block heel, burgundy or black." },
      { name: "Beret or bucket hat", look: "Wool or knit, in a colour from the coat." },
    ],
    budget: {
      high: "Statement coats are where the high street is surprisingly good. Look for a heavier wool blend.",
      mid: "Spend on one bold coat and wear simple pieces under it all winter.",
      lux: "Her character's coats were a mix of designer, vintage and custom pieces.",
    },
    faq: [
      { q: "Where can I get coats like Mabel's in Only Murders in the Building?", a: "Look for oversized cocoon coats in bold patterns and colours, and fringed or textured jackets. Vintage shops are full of them." },
      { q: "What is Selena Gomez's style?", a: "Classic and feminine: fitted silhouettes, rich colours, and statement outerwear." },
    ],
    related: ["taylor-swift", "blake-lively", "sabrina-carpenter"],
  },
  {
    slug: "jennifer-lawrence",
    name: "Jennifer Lawrence",
    short: "Jennifer",
    tagline: "The same formula, perfected: sleek, pointed, effortless.",
    description:
      "Jennifer Lawrence's outfit formula: tailored trousers, slim knits, pointed flats and a long coat. Her off-duty style decoded and where to buy every piece at three price levels.",
    intro: [
      "Jennifer Lawrence has quietly become one of the best-dressed women in New York by repeating one formula: a slim top, a long, fluid trouser or skirt, a pointed flat and a great coat.",
      "It is the closest thing to a style uniform in Hollywood, and it is very easy to borrow.",
    ],
    formula: [
      "Slim, fine-knit tops or a crisp shirt",
      "Long, fluid trousers or a midi skirt",
      "Pointed flats, kitten heels or slingbacks",
      "A long coat in black, camel or grey",
      "Minimal jewellery and a structured bag",
    ],
    pieces: [
      { name: "Fine-knit top", look: "Fitted, crew or V-neck, black or ivory." },
      { name: "Fluid wide-leg trousers", look: "High-waisted, floor-grazing, drapey fabric." },
      { name: "Pointed flats", look: "Sharp toe, leather, black or nude." },
      { name: "Long tailored coat", look: "Ankle or below-knee length, minimal, no belt." },
      { name: "Slip skirt", look: "Midi, satin, in a deep neutral." },
      { name: "Structured bag", look: "East-west or top-handle, plain leather." },
    ],
    budget: {
      high: "The formula works with high-street basics as long as the trousers are long enough.",
      mid: "The coat and the shoes make it. Spend there.",
      lux: "Her originals come from minimalist luxury labels known for perfect, unbranded basics.",
    },
    guide: { href: "/blog/jennifer-lawrence-off-duty", label: "Jennifer Lawrence off-duty: sleek, pointed, effortless" },
    faq: [
      { q: "What is the Jennifer Lawrence outfit formula?", a: "A slim top, long fluid trousers or a midi skirt, pointed flats and a long coat, in neutral colours." },
      { q: "What shoes does Jennifer Lawrence wear?", a: "Mostly pointed flats, kitten heels and slingbacks — sharp toes, low heels." },
    ],
    related: ["sofia-richie", "kendall-jenner", "blake-lively"],
  },
  {
    slug: "blake-lively",
    name: "Blake Lively",
    short: "Blake",
    tagline: "Colour, florals and full-volume occasion glam.",
    description:
      "Blake Lively's dress style: bold colour, florals, sequins and red-carpet drama, plus how to wear it to a wedding or party. Her style formula and where to buy the pieces.",
    intro: [
      "Blake Lively is famous for styling herself, and for never playing it safe. Her Met Gala looks — including the colour-changing 2022 gown — are some of the most talked-about in the event's history.",
      "Off the carpet she brings the same energy to day dressing: florals, bright colour, sequins before noon.",
    ],
    formula: [
      "One bold colour or a large-scale print",
      "Fitted bodice, full skirt — or a sharp suit",
      "Sequins, embellishment, or a dramatic detail",
      "Statement heels in a contrasting colour",
      "Big hair, big jewellery",
    ],
    pieces: [
      { name: "Floral midi dress", look: "Large-scale print, fitted waist, full skirt." },
      { name: "Sequin dress", look: "Mini or midi, one bright colour." },
      { name: "Colourful suit", look: "Tailored, bold colour, worn with a simple top." },
      { name: "Statement heels", look: "High, embellished or brightly coloured." },
      { name: "Cocktail ring", look: "Oversized stone, gold setting." },
      { name: "Gown", look: "Fitted bodice, voluminous skirt, dramatic colour." },
    ],
    budget: {
      high: "High-street occasion wear is full of florals and sequins. Choose one statement and keep the rest simple.",
      mid: "A well-cut floral dress in a heavier fabric will look far more expensive.",
      lux: "Her red-carpet looks are mostly major-house couture; the day dresses are easier to track down.",
    },
    guide: { href: "/blog/blake-lively-occasion-glam", label: "Blake Lively occasion glam: colour play and polish" },
    faq: [
      { q: "Who styles Blake Lively?", a: "Blake Lively is known for styling herself for most of her red-carpet appearances." },
      { q: "How do I dress like Blake Lively for a wedding?", a: "A fitted floral or bold-colour dress, statement heels in a contrasting shade, and one big piece of jewellery." },
    ],
    related: ["zendaya", "taylor-swift", "selena-gomez"],
  },
];

export const getCeleb = (slug: string) => CELEBS.find((c) => c.slug === slug);
export const shopHref = (name: string) => `/shop-the-look?celebrity=${encodeURIComponent(name)}`;
