import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding banners and awards...');

  // Clear existing
  await prisma.banner.deleteMany();
  await prisma.award.deleteMany();

  // Create Main Banner
  await prisma.banner.create({
    data: {
      title: 'AI 민간조사 매칭 플랫폼 LIRA',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
      linkUrl: '/simulation',
      type: 'MAIN_LARGE',
      isActive: true,
      order: 1,
    },
  });

  // Create Sub Banners
  await prisma.banner.createMany({
    data: [
      {
        title: '기업 조사 솔루션',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
        linkUrl: '/enterprise',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 1,
      },
      {
        title: '개인 신변 보호',
        imageUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=2070&auto=format&fit=crop',
        linkUrl: '/personal',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 2,
      },
    ],
  });

  // Create Awards
  await prisma.award.createMany({
    data: [
      {
        title: '2024 AI 혁신 대상',
        description: '인공지능 기반 매칭 기술 부문 대상 수상',
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/590/590685.png',
        date: new Date('2024-11-15'),
      },
      {
        title: 'ISO 27001 인증',
        description: '정보보호 경영시스템 국제 표준 인증 획득',
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/11502/11502443.png',
        date: new Date('2024-08-20'),
      },
    ],
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
