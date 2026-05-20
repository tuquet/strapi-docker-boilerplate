import { Metadata } from 'next';

import ClientSlugHandler from './ClientSlugHandler';
import PageContent from '@/lib/shared/PageContent';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType } from '@/lib/strapi';
import type { LocaleParamsProps } from '@/types/types';

export async function generateMetadata({
  params,
}: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params;

  const data = await fetchCollectionType('pages', {
    filters: {
      slug: {
        $eq: 'homepage',
      },
      locale: locale,
    },
  });

  const pageData = Array.isArray(data) && data.length > 0 ? data[0] : null;
  const seo = pageData?.seo;
  const metadata = generateMetadataObject(seo);
  return metadata;
}

export default async function HomePage({ params }: LocaleParamsProps) {
  const { locale } = await params;

  const data = await fetchCollectionType('pages', {
    filters: {
      slug: {
        $eq: 'homepage',
      },
      locale: locale,
    },
  });

  const pageData = Array.isArray(data) && data.length > 0 ? data[0] : null;

  if (!pageData) {
    return (
      <div className="relative py-40 text-center flex flex-col justify-center items-center h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-gray-500 mb-8">
          It looks like the homepage has not been set up in the CMS.
        </p>
      </div>
    );
  }

  const localizedSlugs = pageData.localizations?.reduce(
    (acc: Record<string, string>, localization: any) => {
      acc[localization.locale] = '';
      return acc;
    },
    { [locale]: '' }
  ) || { [locale]: '' };

  return (
    <>
      <ClientSlugHandler localizedSlugs={localizedSlugs} />
      <PageContent pageData={pageData} />
    </>
  );
}
