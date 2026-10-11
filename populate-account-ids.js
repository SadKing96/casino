const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { accountId: null }
  });

  for (const user of users) {
    let accountId;
    let isUnique = false;
    while (!isUnique) {
      accountId = Math.floor(100000 + Math.random() * 900000); // 6 digit number
      const existing = await prisma.user.findUnique({ where: { accountId } });
      if (!existing) isUnique = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { accountId }
    });
    console.log(`Assigned ${accountId} to ${user.username}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
