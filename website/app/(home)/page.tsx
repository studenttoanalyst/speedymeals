import { getHeroBanners } from '@/lib/banners';
import { HomePageClient } from '@/components/home/HomePageClient';

export default async function HomePage() {
  const slides = await getHeroBanners();

  return <HomePageClient slides={slides} />;
}
