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

  // Create Sub Banners (5 items as requested)
  await prisma.banner.createMany({
    data: [
      {
        title: '법률정보조사원 (LIRA)',
        imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop', // Law/investigation
        linkUrl: '/lira-info',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 1,
      },
      {
        title: 'Mobile 별품몰',
        imageUrl: 'https://images.unsplash.com/photo-1512428559087-560fa0db7f5e?q=80&w=2000&auto=format&fit=crop', // Mobile shopping
        linkUrl: '/mobile-mall',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 2,
      },
      {
        title: '법률정보조사원 (유튜브)',
        imageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop', // Youtube/Video
        linkUrl: '/youtube-channel',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 3,
      },
      {
        title: '(주) 갓생솔루션',
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2000&auto=format&fit=crop', // Business solution
        linkUrl: '/godsang',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 4,
      },
      {
        title: '법률정보조사원 (모두의 탐정)',
        imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2000&auto=format&fit=crop', // Detective/magnifying glass
        linkUrl: '/everyone-detective',
        type: 'MAIN_SMALL',
        isActive: true,
        order: 5,
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

  console.log('Seeding completed with 5 sub-banners.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
