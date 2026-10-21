# Prompt logo pour ChatGPT et Gemini

> Document de travail, à supprimer une fois le logo choisi. Le prompt est en anglais : les générateurs d'images le suivent mieux. À coller tel quel dans ChatGPT (génération d'images) ou dans Gemini.

---

## Prompt

You are a senior brand designer known for bold, original marks. I need fresh logo concepts for a web app. Surprise me: I want ideas I wouldn't have thought of, not the first thing that comes to mind for "chess app".

### The product

**CraftYourChess** is a free, open-source web app that helps chess players improve **from their own games**. You type your Lichess and/or Chess.com username; the app gathers your games from both sites, analyzes them with a chess engine right in your browser, finds the mistakes that actually cost you points, and turns them into exercises you replay until they stick. Later, it will build a personal training plan from your own data and measure whether you're improving.

What makes it different:

- **It's about you.** Your own games, your own mistakes, your own patterns. No generic puzzles or lessons.
- **Private and honest.** No account, no ads, no tracking. Everything stays in your browser. Recommendations always come with evidence from your games.
- **Simple and fast.** Few features, all useful. A tool, not a social network or a game.
- **Made by one passionate person**, a developer and a novice chess player, for fellow players.

The name: "Craft your chess" means **shaping your own game the way an artisan shapes a piece of wood**: patiently, by hand, through practice and correcting your mistakes. Progress that is personal and earned.

### Audience and tone

Club and online players of all levels, from beginners to strong amateurs, who take improvement seriously but play for fun. The tone is **warm, clever and confident, with a bit of character**. It must stay credible to chess players: not childish, not a toy, not a casino or gaming app, and not cold corporate tech either.

### Visual world

The interface is dark and calm, inspired by Lichess's dark theme: flat surfaces, very few shadows, small corner radii, information-dense but uncluttered. The logo must feel at home there.

Palette (use 2 or 3 of these at most, flat colors):

- Page background: very dark warm brown-black `#161512`
- Panels: dark warm grey `#262421`
- Text: soft light grey `#bababa` / `#dddddd`
- Primary accent: clear blue `#3692e7`
- Progress / wins: green `#629924`
- Titles: warm gold `#bf811d`
- Rare accent: orange `#d85000`

The board in the app is classic brown wood. The UI font is Noto Sans.

### Directions to explore

Explore a wide range. For each direction, push for an unexpected angle:

1. **Craft and making**: a piece being carved, turned on a lathe, chiseled, sanded or assembled; wood grain, wood shavings, tools, a workbench, a maker's mark or stamp.
2. **Personal improvement**: a pawn on its way to promotion, a piece climbing, a trajectory of moves, "before / after", the idea of a mistake turned into a lesson.
3. **Your own data**: your own games becoming something shaped and meaningful; a fingerprint, a signature, a personal mark made of chess elements.
4. **Monogram**: a "C" or "CYC" built from chess shapes (a board corner, a knight's L-move, a square grid, a piece silhouette).
5. **Character**: a chess piece with personality and a posture or expression, which could become a mascot, without being cartoonish.
6. **Abstract and geometric**: a mark built from squares, diagonals or the knight's move, readable at a glance.
7. **Wild card**: something completely unexpected that still says "personal chess improvement".

Avoid these clichés: a generic knight head on its own, a crown, a full checkerboard pattern, a magnifying glass, a telescope or spyglass, a brain, a lightbulb, a trophy, rockets, shields, glossy 3D, gradients, neon, and anything resembling the Lichess or Chess.com logos.

### Technical constraints

- It must work as an **app icon and favicon**: a simple mark, readable at **16 and 32 pixels**. Bold shapes and few details.
- Shown on a dark rounded square (`#262421`) over a darker background (`#161512`). No white background.
- It must survive being cropped into a circle (Android app icons): keep the motif inside the central 80%.
- **Flat vector style**: solid shapes, clean outlines if any, no photorealism, no textures that disappear when small, no text inside the symbol.
- Easy to redraw later as a clean SVG.

### What to deliver

1. **A board of 8 different concepts**, one per tile, covering several of the directions above. Each concept is shown large, with a small version at favicon size next to it. Give each one a short name and a one-line idea.
2. Then I'll pick 1 or 2 favorites, and you'll do **3 variations of each** (simpler, bolder, different color balance).
3. For the final pick: the symbol alone, and the symbol next to the name "CraftYourChess" in a clean sans-serif, light grey text on the dark background.

Start with the board of 8 concepts.

---

## Conseils d'utilisation

- **Les deux en parallèle.** Même prompt dans ChatGPT et dans Gemini : leurs styles sont différents, et comparer les deux planches aide à voir ce qui te plaît vraiment.
- **Une planche à la fois.** S'ils ne livrent pas 8 concepts d'un coup, demande-les par lots de 4 (« now 4 more, in directions you haven't used yet »).
- **Itérer sur un concept.** Renvoie l'image du concept choisi et demande des variantes précises : « same idea, bolder shapes, readable at 16 px », « only blue and light grey », « less detail in the wood ».
- **Le texte.** Les générateurs d'images écrivent souvent mal les mots. Le nom « CraftYourChess » se fera à part, avec la vraie police.
- **Rester critique.** Juge chaque proposition en tout petit, comme un onglet de navigateur ou une icône de téléphone, pas en grand.
- **Ensuite.** Le résultat sera une image, pas un SVG propre. Ramène-moi le concept retenu : je le redessine en SVG simple, je l'intègre (`public/favicon.svg`, icônes PWA) et je mets à jour `docs/design.md`.
