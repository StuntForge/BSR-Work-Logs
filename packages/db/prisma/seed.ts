import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GRADES = [
  { key: "PROBATIONARY", label: "Probationary Member", order: 1 },
  { key: "STUNT_PERFORMER", label: "Stunt Performer", order: 2 },
  { key: "SENIOR_STUNT_PERFORMER", label: "Senior Stunt Performer", order: 3 },
  { key: "KEY_STUNT_PERFORMER", label: "Key Stunt Performer", order: 4 },
  { key: "FULL_MEMBER", label: "Full Member", order: 5 },
] as const;

const AREA_CATEGORIES = [
  { key: "A", label: "Falls / Descents", order: 1, items: ["High fall", "Stair fall", "Descender work"] },
  { key: "B", label: "Fire / Explosive", order: 2, items: ["Full body burn", "Partial burn", "Explosive rig"] },
  { key: "C", label: "Vehicle", order: 3, items: ["Precision driving", "Vehicle hit", "Motorbike work"] },
  { key: "D", label: "Fighting / Combat", order: 4, items: ["Hand-to-hand", "Weapons combat", "Group melee"] },
  { key: "E", label: "Water", order: 5, items: ["Underwater work", "Water fall", "Rapids/open water"] },
  { key: "F", label: "Rigging / Wire work", order: 6, items: ["Wire fly", "Rope work", "Aerial rig"] },
];

// Illustrative thresholds for the 4 upgrade routes — placeholders BSR can tune later
// (no dedicated admin UI for this in V1; spec §23 doesn't list it). MIN_TIME_AT_GRADE
// targetValue is in whole days.
const REQUIREMENTS: Record<string, { type: string; targetValue: number }[]> = {
  STUNT_PERFORMER: [
    { type: "DAYS_WORKED", targetValue: 40 },
    { type: "IDENTIFIABLES", targetValue: 10 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 365 },
  ],
  SENIOR_STUNT_PERFORMER: [
    { type: "DAYS_WORKED", targetValue: 160 },
    { type: "IDENTIFIABLES", targetValue: 40 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 730 },
    { type: "COORDINATOR_SPREAD", targetValue: 3 },
  ],
  KEY_STUNT_PERFORMER: [
    { type: "DAYS_WORKED", targetValue: 240 },
    { type: "IDENTIFIABLES", targetValue: 60 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 1095 },
    { type: "COORDINATOR_SPREAD", targetValue: 4 },
  ],
  FULL_MEMBER: [
    { type: "DAYS_WORKED", targetValue: 320 },
    { type: "IDENTIFIABLES", targetValue: 80 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 1460 },
    { type: "COORDINATOR_SPREAD", targetValue: 5 },
  ],
};

async function main() {
  console.log("Seeding grades...");
  const gradeByKey: Record<string, { id: string }> = {};
  for (const g of GRADES) {
    const grade = await prisma.grade.upsert({
      where: { key: g.key as any },
      update: { label: g.label, order: g.order },
      create: { key: g.key as any, label: g.label, order: g.order },
    });
    gradeByKey[g.key] = grade;
  }

  console.log("Seeding requirement definitions...");
  for (const [gradeKey, reqs] of Object.entries(REQUIREMENTS)) {
    const grade = gradeByKey[gradeKey];
    for (const r of reqs) {
      const existing = await prisma.requirementDefinition.findFirst({
        where: { targetGradeId: grade.id, type: r.type as any },
      });
      if (!existing) {
        await prisma.requirementDefinition.create({
          data: {
            targetGradeId: grade.id,
            type: r.type as any,
            targetValue: r.targetValue,
            active: true,
          },
        });
      }
    }
  }

  console.log("Seeding Area of Work categories...");
  for (const cat of AREA_CATEGORIES) {
    const category = await prisma.areaCategory.upsert({
      where: { key: cat.key },
      update: { label: cat.label, order: cat.order },
      create: { key: cat.key, label: cat.label, order: cat.order },
    });
    for (let i = 0; i < cat.items.length; i++) {
      const existing = await prisma.areaItem.findFirst({
        where: { categoryId: category.id, label: cat.items[i] },
      });
      if (!existing) {
        await prisma.areaItem.create({
          data: { categoryId: category.id, label: cat.items[i], order: i + 1 },
        });
      }
    }
  }

  console.log("Seeding test accounts...");
  const password = await bcrypt.hash("BsrTest!2026", 10);

  const committee = await prisma.user.upsert({
    where: { email: "committee@bsr.test" },
    update: {},
    create: {
      name: "BSR Committee",
      email: "committee@bsr.test",
      passwordHash: password,
      isCommittee: true,
      mustChangePassword: false,
      active: true,
    },
  });

  const fullMember = await prisma.user.upsert({
    where: { email: "fullmember@bsr.test" },
    update: {},
    create: {
      name: "Fiona Fullmember",
      email: "fullmember@bsr.test",
      passwordHash: password,
      currentGradeId: gradeByKey.FULL_MEMBER.id,
      mustChangePassword: false,
      active: true,
      gradeHistories: { create: { gradeId: gradeByKey.FULL_MEMBER.id, startedAt: new Date("2020-01-01") } },
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@bsr.test" },
    update: {},
    create: {
      name: "Sam Performer",
      email: "member@bsr.test",
      passwordHash: password,
      currentGradeId: gradeByKey.PROBATIONARY.id,
      mustChangePassword: false,
      active: true,
      gradeHistories: { create: { gradeId: gradeByKey.PROBATIONARY.id, startedAt: new Date() } },
    },
  });

  console.log("Done. Test logins (password BsrTest!2026):");
  console.log(" - committee@bsr.test (committee)");
  console.log(" - fullmember@bsr.test (Full Member)");
  console.log(" - member@bsr.test (Probationary Member)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
