const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
require("dotenv").config();

const Legend = require("./models/Legend");
const Battlefield = require("./models/Battlefield");

function cleanImageUrl(url) {
  return url.split("?")[0];
}

async function scrape() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected!");

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  await page.setViewport({ width: 1440, height: 900 });

  console.log("Navigating to card gallery...");
  await page.goto("https://riftbound.leagueoflegends.com/en-us/card-gallery/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // ── Dismiss cookie consent ──
  console.log("Dismissing cookie consent...");
  try {
    await page.waitForSelector("button", { timeout: 5000 });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const accept = buttons.find(
        (b) =>
          b.textContent.toLowerCase().includes("accept") ||
          b.textContent.toLowerCase().includes("deny"),
      );
      if (accept) accept.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    console.log("Cookie consent dismissed.");
  } catch (e) {
    console.log("No cookie consent found.");
  }

  // ── Open filters ──
  console.log("Opening filters...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const filterBtn = buttons.find((b) =>
      b.textContent.toLowerCase().includes("filter"),
    );
    if (filterBtn) filterBtn.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  // ── Expand Set accordion ──
  console.log("Expanding Set accordion...");
  await page.click('[data-testid="card-sets-trigger"]');
  await new Promise((r) => setTimeout(r, 2000));

  // ── Click All Sets ──
  console.log("Clicking All Sets...");
  await page.click('[data-testid="card-sets-radio-group-item-all"]');
  await new Promise((r) => setTimeout(r, 2000));

  // ── Turn off New Cards ──
  console.log("Turning off New Cards...");
  await page.click('[data-testid="toggle-newCards-button-element"]');
  await new Promise((r) => setTimeout(r, 2000));

  // ── Close filters ──
  console.log("Closing filters...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const filterBtn = buttons.find((b) =>
      b.textContent.toLowerCase().includes("filter"),
    );
    if (filterBtn) filterBtn.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({ path: "scraper-filters.png" });
  console.log("Filter screenshot saved - check scraper-filters.png");

  // ── Scroll to load all cards ──
  console.log("Scrolling to load all cards...");
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
  await new Promise((r) => setTimeout(r, 3000));

  // ── Scroll back to top ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 1000));

  // ── Get all legend card IDs and battlefield data ──
  console.log("Finding all cards...");
  const { legendCardIds, battlefieldCardData } = await page.evaluate(() => {
    const imgs = Array.from(
      document.querySelectorAll('img[data-testid="mediaImage"]'),
    );

    const legendCardIds = imgs
      .filter((img) => img.getAttribute("alt")?.includes("Riftbound Legend:"))
      .map((img) => {
        const card = img.closest("[data-card-id]");
        return {
          cardId: card?.getAttribute("data-card-id"),
          alt: img.getAttribute("alt"),
          src: img.src,
        };
      })
      .filter((c) => c.cardId);

    const battlefieldCardData = imgs
      .filter((img) =>
        img.getAttribute("alt")?.includes("Riftbound Battlefield:"),
      )
      .map((img) => ({
        alt: img.getAttribute("alt"),
        src: img.src,
      }));

    return { legendCardIds, battlefieldCardData };
  });

  console.log(`Legend cards found: ${legendCardIds.length}`);
  console.log(`Battlefield cards found: ${battlefieldCardData.length}`);

  // ── Process battlefields ──
  const uniqueBattlefields = [];
  const seenBf = new Set();
  battlefieldCardData.forEach((c) => {
    const name = c.alt.split("Riftbound Battlefield:")[1].split(".")[0].trim();
    if (name && !seenBf.has(name)) {
      seenBf.add(name);
      uniqueBattlefields.push({ name, imageUrl: cleanImageUrl(c.src) });
    }
  });

  console.log(`\nBattlefields: ${uniqueBattlefields.length}`);
  uniqueBattlefields.forEach((b) => console.log(" -", b.name));

  // ── Click each legend card by data-card-id to get champion name ──
  console.log(`\nProcessing ${legendCardIds.length} legend cards...`);

  const uniqueLegends = [];
  const seenLegends = new Set();

  for (let i = 0; i < legendCardIds.length; i++) {
    const card = legendCardIds[i];
    const title = card.alt.split("Riftbound Legend:")[1].split(".")[0].trim();
    if (!title) continue;
    if (seenLegends.has(title)) continue;

    console.log(`  Processing ${i + 1}/${legendCardIds.length}: ${title}`);

    try {
      // Click the card using its data-card-id
      await page.click(`[data-card-id="${card.cardId}"]`);
      await new Promise((r) => setTimeout(r, 2000));

      // Take a debug screenshot on first card to verify modal opens
      if (i === 0) {
        await page.screenshot({ path: "scraper-modal.png" });
        console.log("  Modal screenshot saved - check scraper-modal.png");
      }

      // Extract champion name from Tags field
      const championName = await page.evaluate(() => {
        const allEls = Array.from(document.querySelectorAll("h6"));
        const tagsLabel = allEls.find((el) => el.textContent.trim() === "Tags");
        if (!tagsLabel) return null;

        const container = tagsLabel.parentElement;
        const valueDiv = container.querySelector("p");
        return valueDiv ? valueDiv.textContent.trim() : null;
      });

      console.log(`    Champion: ${championName || "not found"}`);

      const fullName = championName ? `${championName}, ${title}` : title;

      if (!seenLegends.has(fullName)) {
        seenLegends.add(fullName);
        uniqueLegends.push({
          name: fullName,
          imageUrl: cleanImageUrl(card.src),
        });
      }

      // Close modal
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.log(`    Error: ${e.message}`);
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nUnique legends: ${uniqueLegends.length}`);
  uniqueLegends.forEach((l) => console.log(" -", l.name));

  // ── Save to MongoDB ──
  console.log("\nSaving legends to MongoDB...");
  for (const legend of uniqueLegends) {
    await Legend.findOneAndUpdate(
      { name: legend.name },
      { ...legend, updatedAt: new Date() },
      { upsert: true, returnDocument: "after" },
    );
  }
  console.log(`Saved ${uniqueLegends.length} legends.`);

  console.log("Saving battlefields to MongoDB...");
  for (const battlefield of uniqueBattlefields) {
    await Battlefield.findOneAndUpdate(
      { name: battlefield.name },
      { ...battlefield, updatedAt: new Date() },
      { upsert: true, returnDocument: "after" },
    );
  }
  console.log(`Saved ${uniqueBattlefields.length} battlefields.`);

  await browser.close();
  await mongoose.disconnect();
  console.log("\nScraper complete!");
}

scrape().catch((err) => {
  console.error("Scraper error:", err);
  process.exit(1);
});
