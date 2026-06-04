const path = require("node:path");
const { randomBytes, scryptSync } = require("node:crypto");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

loadEnvConfig(path.resolve(__dirname, ".."));

const prisma = new PrismaClient();

const seededCards = [
  {
    id: 1,
    player: "Kylian Mbappé",
    series: "Panini Prizm 2024",
    number: "#012/150",
    team: "Real Madrid",
    position: "FWD",
    year: 2024,
    rarity: "Epic",
    condition: "Mint",
    value: "48.00",
    dupes: 0,
    fav: true,
  },
  {
    id: 2,
    player: "Erling Haaland",
    series: "Topps Chrome 2023",
    number: "#001/50",
    team: "Man City",
    position: "FWD",
    year: 2023,
    rarity: "Legendary",
    condition: "Mint",
    value: "210.00",
    dupes: 0,
    fav: true,
  },
  {
    id: 3,
    player: "Pedri",
    series: "Panini Adrenalyn 2024",
    number: "",
    team: "Barcelona",
    position: "MID",
    year: 2024,
    rarity: "Rare",
    condition: "NearMint",
    value: "12.50",
    dupes: 2,
    fav: false,
  },
  {
    id: 4,
    player: "Lamine Yamal",
    series: "Topps Match Attax 2025",
    number: "",
    team: "Barcelona",
    position: "FWD",
    year: 2025,
    rarity: "Uncommon",
    condition: "Good",
    value: "4.20",
    dupes: 3,
    fav: false,
  },
  {
    id: 5,
    player: "Gianluigi Donnarumma",
    series: "Panini Prizm 2024",
    number: "",
    team: "PSG",
    position: "GK",
    year: 2024,
    rarity: "Common",
    condition: "Fair",
    value: "1.00",
    dupes: 0,
    fav: false,
  },
  {
    id: 6,
    player: "Rodri",
    series: "Topps Chrome 2024",
    number: "",
    team: "Man City",
    position: "MID",
    year: 2024,
    rarity: "Rare",
    condition: "NearMint",
    value: "18.00",
    dupes: 0,
    fav: false,
  },
];

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("base64url")}`;
}

async function main() {
  const demoPasswordHash = hashPassword("Password123");
  const adminPasswordHash = hashPassword("Password123");

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@kickcollect.local" },
    update: {
      displayName: "Demo User",
      passwordHash: demoPasswordHash,
      role: "USER",
    },
    create: {
      displayName: "Demo User",
      email: "demo@kickcollect.local",
      passwordHash: demoPasswordHash,
      role: "USER",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@kickcollect.local" },
    update: {
      displayName: "Admin User",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      displayName: "Admin User",
      email: "admin@kickcollect.local",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.card.deleteMany({ where: { userId: demoUser.id } });
  await prisma.card.createMany({
    data: seededCards.map((card) => ({
      ...card,
      userId: demoUser.id,
    })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
