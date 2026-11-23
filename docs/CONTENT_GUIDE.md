# Content Guide — writing lore placards

Placards are museum labels next to a diorama: precise, evocative and short. Readers have finished *Red Rising*.

## Voice

- **Places in present tense** ("The castle stands on a hill…"); **events in past tense** ("Titus seized…").
- Concrete and sensory, drawn from the book: mist, olive trees, sandstone, eighty-metre cliffs. No purple prose,
  no modern slang, no meta talk ("in the book…") except in `inference` notes and map-vs-text discrepancies.
- Use the book's vocabulary where it's distinctive (Proctor, Primus, standard, highDraft, medBots, Howlers),
  without explaining it like an encyclopaedia.
- Golden examples: `castle-mars` and `olympus` in `src/content/places.ts`. **Match their length and rhythm.**

## Hard rules

1. **Book 1 only.** Nothing from *Golden Son* onward, fan wikis or the films/TV rumours.
2. **Every fact has a page.** `pages` lists the PDF pages you used. If you can't find a page, leave the fact out.
3. **Quotes:** at most 2 per place, at most 25 words each, exact text, with its page. Everything else is your own paraphrase.
   Never paste paragraphs.
4. **Confidence must match the layout** (`canon` / `inferred`). Inferred entries need an `inference` note:
   the specific clues and pages that led to the placement, and what the printed map shows.
5. **Discrepancies are features.** When the text and printed map disagree (e.g. "twelve Houses" vs thirteen
   named; "eastern river is the Furor"), say so briefly and neutrally.
6. **Spoilers inside Book 1 are fine**, but put plot outcomes in `events`, not in `summary` (the summary shows on hover).

## Length limits (enforced by schema)

summary ≤ 220 chars · description 1–3 paragraphs (~40–90 words each) · facts ≤ 6 · events ≤ 6 (≤ 240 chars each) · related ≤ 4.

## Research method

1. Extract the text once: `pdftotext -layout <pdf> /tmp/…/book.txt` (outside the repo).
2. `grep -n` for the place, House and character names; read ±40 lines around each hit.
3. Map text line → PDF page by counting form-feed characters (`\f`) before the line; the canon doc uses PDF page numbers.
4. Cross-check with `docs/research/institute-canon.md`. If you find a canon fact it lacks, list it in your
   report under "Canon additions" (the lead will add it).

## Entry checklist

- [ ] id exists in `src/world/layout.ts`
- [ ] title, subtitle (≤ 60 chars), confidence
- [ ] summary: what it is and why it matters, no plot outcome
- [ ] description: geography, look, character
- [ ] facts: numbers and attributes from the text
- [ ] events: in story order, season-tagged (`summer` / `winter` / `thaw` / `any`)
- [ ] ≤ 2 short quotes with pages · pages list · related ids
- [ ] inference note if inferred
