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
  { key: "VEH", label: "Vehicles", order: 1, items: [] as string[] },
  { key: "AER", label: "Aerial and Wires", order: 2, items: [] as string[] },
  { key: "ANI", label: "Animals", order: 3, items: [] as string[] },
  { key: "WAT", label: "Water", order: 4, items: [] as string[] },
  { key: "FIR", label: "Fire", order: 5, items: [] as string[] },
];

// Explicit BSR policy given directly, per upgrade route. MIN_TIME_AT_GRADE targetValue is in
// whole days (years * 365). HEALTH_SAFETY targetValue is the required level, set per member by
// the committee, never self-service. Only the Stunt Performer -> Senior route requires
// identifiables — the "under at least 3 different coordinators" sub-condition is a manual
// check the committee makes when reviewing, not enforced by the app (no coordinator-identity
// data is captured). SOLO_OR_CORE_TEAM (Senior -> Key) is a composite met by 10 solo days, or 2
// core-team jobs of 12+ weeks, or 5 solo days + 1 core-team job — see lib/progress.ts. Key ->
// Full Member's points requirement is NOT enforced yet: no data capture exists for it, so that
// route is still missing its 4th requirement pending that build-out.
const REQUIREMENTS: Record<string, { type: string; targetValue: number }[]> = {
  STUNT_PERFORMER: [
    { type: "DAYS_WORKED", targetValue: 60 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 365 },
    { type: "HEALTH_SAFETY", targetValue: 1 },
  ],
  SENIOR_STUNT_PERFORMER: [
    { type: "DAYS_WORKED", targetValue: 160 },
    { type: "IDENTIFIABLES", targetValue: 40 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 1095 },
    { type: "HEALTH_SAFETY", targetValue: 2 },
  ],
  KEY_STUNT_PERFORMER: [
    { type: "DAYS_WORKED", targetValue: 120 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 730 },
    { type: "HEALTH_SAFETY", targetValue: 3 },
    { type: "SOLO_OR_CORE_TEAM", targetValue: 10 },
  ],
  FULL_MEMBER: [
    { type: "DAYS_WORKED", targetValue: 160 },
    { type: "MIN_TIME_AT_GRADE", targetValue: 730 },
    { type: "HEALTH_SAFETY", targetValue: 4 },
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
