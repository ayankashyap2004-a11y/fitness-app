/** Copied to the clipboard; sent to Claude in chat together with the menu photo (PRD §4.3). */
export const MENU_PROMPT = `Convert this mess menu photo into JSON for my fitness app.

Rules:
- Output only one JSON code block, nothing else.
- "weekStart" is the first date shown (YYYY-MM-DD). Each day has "date" (YYYY-MM-DD) and five lists: "breakfast", "lunch", "snacks", "dinner", "dessert".
- Copy dish names exactly as printed, one dish per list item. Split combined items ("Rajma Chawal" stays one dish, but "Dal / Rice" is two).
- Leave out pickle, chutney, papad and salad.
- If a slot is empty that day, use an empty list.

Format:
{
  "weekStart": "2026-09-28",
  "days": [
    {
      "date": "2026-09-28",
      "breakfast": ["Masala Poha", "French Toast"],
      "lunch": ["Amritsari Chole", "Kulche", "Veg Pulav", "Boondi Raita", "Dal Tadka"],
      "snacks": ["Bhel"],
      "dinner": ["Paneer Paratha", "Yellow Dal", "Coriander Rice", "Curd"],
      "dessert": ["Chocolate Pudding"]
    }
  ]
}`
