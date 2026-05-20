import { Metadata } from 'next';

import ClientSlugHandler from '../ClientSlugHandler';
import PageContent from '@/lib/shared/PageContent';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType } from '@/lib/strapi';
import type { LocaleSlugParamsProps } from '@/types/types';

export async function generateMetadata({
  params,
}: LocaleSlugParamsProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const data = await fetchCollectionType('pages', {
    filters: {
      slug: {
        $eq: slug,
      },
      locale: locale,
    },
  });

  const pageData = Array.isArray(data) && data.length > 0 ? data[0] : null;

  const seo = pageData?.seo;
  const metadata = seo
    ? generateMetadataObject(seo)
    : { title: slug, description: `${slug} page` };
  return metadata;
}

export default async function Page({ params }: LocaleSlugParamsProps) {
  const { slug, locale } = await params;
  const data = await fetchCollectionType('pages', {
    filters: {
      slug: {
        $eq: slug,
      },
      locale: locale,
    },
  });

  const pageData = Array.isArray(data) && data.length > 0 ? data[0] : null;

  const localizedSlugs = pageData?.localizations?.reduce(
    (acc: Record<string, string>, localization: any) => {
      acc[localization.locale] = localization.slug;
      return acc;
    },
    { [locale]: slug }
  ) || { [locale]: slug };

  if (!pageData) {
    return (
      <div className="relative py-40 text-center flex flex-col justify-center items-center h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-gray-500 mb-8">
          It looks like the page `{slug}` has not been set up in the CMS.
        </p>
        <p className="text-brand">
          💡 Please run the AI Seeder to populate the database.
        </p>
      </div>
    );
  }

  return (
    <>
      <ClientSlugHandler localizedSlugs={localizedSlugs} />
      <PageContent pageData={pageData} />
    </>
  );
}
