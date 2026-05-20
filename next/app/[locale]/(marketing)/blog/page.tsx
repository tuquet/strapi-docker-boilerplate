import { IconClipboardText } from '@tabler/icons-react';
import { type Metadata } from 'next';

import ClientSlugHandler from '../ClientSlugHandler';
import { BlogCard } from '@/components/blog-card';
import { BlogPostRows } from '@/components/blog-post-rows';
import { Container } from '@/components/container';
import { AmbientColor } from '@/components/decorations/ambient-color';
import { FeatureIconContainer } from '@/components/dynamic-zone/features/feature-icon-container';
import { Heading } from '@/components/elements/heading';
import { Subheading } from '@/components/elements/subheading';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType, fetchSingleType } from '@/lib/strapi';
import type { Article, LocaleParamsProps } from '@/types/types';

export async function generateMetadata({
  params,
}: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await fetchSingleType('blog-page', { locale });

  const seo = pageData?.seo;
  const metadata = seo
    ? generateMetadataObject(seo)
    : { title: 'Blog', description: 'Blog page' };
  return metadata;
}

export default async function Blog({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const pageData = await fetchSingleType('blog-page', {
    locale: locale,
  });

  const articlesResponse = await fetchCollectionType<Article[]>('articles', {
    filters: { locale: { $eq: locale } },
  });

  // Safe array destructuring with fallback to empty array if response is not array
  const safeArticles = Array.isArray(articlesResponse) ? articlesResponse : [];
  const [firstArticle, ...articles] = safeArticles;

  const localizedSlugs = pageData?.localizations?.reduce(
    (acc: Record<string, string>, localization: any) => {
      acc[localization.locale] = 'blog';
      return acc;
    },
    { [locale]: 'blog' }
  ) || { [locale]: 'blog' };

  if (!pageData) {
    return (
      <div className="relative py-40 text-center flex flex-col justify-center items-center h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-gray-500 mb-8">
          It looks like the blog page has not been set up in the CMS.
        </p>
        <p className="text-brand">
          💡 Please run the AI Seeder to populate the database.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden py-20 md:py-0">
      <ClientSlugHandler localizedSlugs={localizedSlugs} />
      <AmbientColor />
      <Container className="flex flex-col items-center justify-between pb-20">
        <div className="relative z-20 py-10 md:pt-40">
          <FeatureIconContainer className="flex justify-center items-center overflow-hidden">
            <IconClipboardText className="h-6 w-6 text-white" />
          </FeatureIconContainer>
          <Heading as="h1" className="mt-4">
            {pageData.heading}
          </Heading>
          <Subheading className="max-w-3xl mx-auto">
            {pageData.sub_heading}
          </Subheading>
        </div>

        {firstArticle ? (
          <BlogCard
            article={firstArticle}
            locale={locale}
            key={firstArticle.id || firstArticle.title}
          />
        ) : (
          <div className="w-full py-20 text-center border border-dashed border-gray-700 rounded-2xl bg-gray-900/20">
            <h3 className="text-xl font-bold mb-2 text-gray-300">
              No articles found
            </h3>
            <p className="text-gray-500">
              Run the LaunchPad Seed Studio to generate articles automatically.
            </p>
          </div>
        )}

        {articles.length > 0 && (
          <BlogPostRows articles={articles} locale={locale} />
        )}
      </Container>
    </div>
  );
}
