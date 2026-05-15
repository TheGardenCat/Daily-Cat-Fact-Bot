const { finalizeEvent } = require('nostr-tools');
const { SimplePool } = require('nostr-tools/pool');
const WebSocket = require('ws');

// Make WebSocket available globally (nostr-tools expects it)
global.WebSocket = WebSocket;

const fs = require('fs');

// ---------- CONFIGURATION ----------
const privateKeyHex = process.env.NOSTR_PRIVATE_KEY;
if (!privateKeyHex) {
  console.error("❌ Error: NOSTR_PRIVATE_KEY environment variable not set.");
  process.exit(1);
}
const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

const relays = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.snort.social'
];
const pool = new SimplePool();

// ---------- YOUR COMPLETE CAT FACTS ----------
const allFacts = [
  "🐱 A group of cats is called a 'clowder'.",
  "🐾 Cats have over 100 vocal sounds, while dogs only have about 10.",
  "😺 A cat's nose pad is as unique as a human's fingerprint.",
  "💤 Cats spend 70% of their lives sleeping.",
  "📏 The world's longest cat was a Maine Coon named Stewie, measuring 48.5 inches.",
  "👂 Cats can rotate their ears 180 degrees.",
  "🏃 Cats can run up to 30 miles per hour.",
  "🌿 The catnip plant contains an oil called nepetalactone, which can make cats 'trip'.",
  "👶 A kitten's eyes are always blue at birth.",
  "💧 Most adult cats are lactose intolerant.",
  "🧠 A cat's brain is 90% similar to a human's brain.",
  "🐈 Cats can jump up to six times their body length.",
  "👁 Cats have a third eyelid called the 'haw'.",
  "🎧 Cats hear frequencies up to 64 kHz—far higher than humans.",
  "🦴 Cats have 230 bones, while humans have 206.",
  "🐾 Cats walk like camels and giraffes—both right feet move first, then both left.",
  "😼 Cats can make over 20 different meow variations to communicate with humans.",
  "🌙 Cats are crepuscular, meaning they’re most active at dawn and dusk.",
  "🦷 Adult cats have 30 teeth, while kittens have 26.",
  "🐈‍⬛ Black cats are considered good luck in Japan and the UK.",
  "💓 A cat’s purr can range from 25 to 150 Hertz—frequencies known to promote healing.",
  "👃 Cats have 200 million scent receptors (humans have about 5 million).",
  "🐾 Cats sweat only through their paw pads.",
  "🎣 Cats use their whiskers to measure openings and detect air currents.",
  "🛏 Cats dream during REM sleep just like humans.",
  "🐱 The average cat can make a 90-degree turn mid-air while falling.",
  "📦 Cats sit in boxes because it makes them feel safe and hidden.",
  "🧶 Cats knead because it reminds them of kittenhood and nursing.",
  "👑 Ancient Egyptians worshipped cats and believed they brought good fortune.",
  "🐈 A cat’s tail position is a full emotional language.",
  "🧊 Cats prefer running water because instinct tells them it’s safer to drink.",
  "🎨 Calico cats are almost always female due to genetics.",
  "🧬 Cats share 95.6% of their DNA with tigers.",
  "🐾 Cats can’t taste sweetness—one of their taste receptors is missing.",
  "🌡 A cat’s normal body temperature is 100.5–102.5°F.",
  "🧭 Cats can find their way home using the Earth’s magnetic field (a 'homing instinct').",
  "🐈 Cats groom each other to bond socially—this is called allogrooming.",
  "👂 A cat has 32 muscles in each ear.",
  "🪶 Cats can make a chirping sound when watching birds—it's a hunting instinct.",
  "🧘 Cats stretch after waking to get blood flowing and prepare muscles for action.",
  "🐾 Cats have a dominant paw—left or right—just like humans.",
  "🧊 Cats don’t like cold food because it mimics prey that’s been dead too long.",
  "🌬 Cats can sense tiny vibrations, helping them detect approaching storms.",
  "🐈‍⬛ The oldest known pet cat was found in a 9,500-year-old grave in Cyprus.",
  "🧴 Cats groom themselves to regulate body temperature and reduce stress.",
  "🎭 Cats use slow blinking as a sign of trust and affection.",
  "🪺 Mother cats teach kittens to hunt by bringing them injured prey.",
  "🐱 Cats can survive falls from high places thanks to their righting reflex.",
  "💗 Cats recognize their human’s voice—they just choose to ignore it sometimes."
];

// ---------- TRACK POSTED FACTS ----------
const postedFile = 'posted_facts.json';

function loadPostedFacts() {
  if (!fs.existsSync(postedFile)) {
    return [];
  }
  const data = fs.readFileSync(postedFile, 'utf8');
  return JSON.parse(data);
}

function savePostedFacts(posted) {
  fs.writeFileSync(postedFile, JSON.stringify(posted, null, 2));
}

function getUnusedFact(posted) {
  const unused = allFacts.filter(f => !posted.includes(f));
  if (unused.length === 0) {
    console.log("🎉 All facts have been used! Resetting the list.");
    return { fact: allFacts[0], reset: true };
  }
  const randomIndex = Math.floor(Math.random() * unused.length);
  return { fact: unused[randomIndex], reset: false };
}

function commitAndPush() {
  const { execSync } = require('child_process');
  try {
    execSync('git config user.name "Nostr Cat Bot"');
    execSync('git config user.email "bot@example.com"');
    execSync('git add posted_facts.json');
    execSync('git commit -m "Update posted facts [skip ci]" || echo "No changes to commit"');
    execSync('git push');
    console.log("✅ Changes committed and pushed to GitHub.");
  } catch (error) {
    console.warn("⚠️ Could not commit/push (maybe no changes or permissions):", error.message);
  }
}

async function publishCatFact() {
  const posted = loadPostedFacts();
  const { fact, reset } = getUnusedFact(posted);
  
  let content = fact;
  if (reset) {
    savePostedFacts([]); // reset the tracking list
  } else {
    content = fact;
  }

  const event = finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: `${content} #catfacts #caturday`,
  }, privateKeyBytes);

  console.log(`📤 Publishing: ${content.substring(0, 80)}...`);
  const pubs = pool.publish(relays, event);
  await Promise.all(pubs);
  console.log(`✅ Published! View: https://njump.me/${event.id}`);

  if (!reset) {
    const newPosted = [...posted, fact];
    savePostedFacts(newPosted);
    commitAndPush();
  } else {
    // Reset case: already cleared the list, commit the empty list
    commitAndPush();
  }

  pool.close(relays);
}

publishCatFact().catch(console.error);
