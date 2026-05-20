import { IconShoppingCartUp } from '@tabler/icons-react';
import { Metadata } from 'next';

import ClientSlugHandler from '../ClientSlugHandler';
import { Container } from '@/components/container';
import { AmbientColor } from '@/components/decorations/ambient-color';
import { FeatureIconContainer } from '@/components/dynamic-zone/features/feature-icon-container';
import { Heading } from '@/components/elements/heading';
import { Subheading } from '@/components/elements/subheading';
import { Featured } from '@/components/products/featured';
import { ProductItems } from '@/components/products/product-items';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType, fetchSingleType } from '@/lib/strapi';
import { LocaleParamsProps, Product } from '@/types/types';

export async function generateMetadata({
  params,
}: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await fetchSingleType('product-page', { locale });

  const seo = pageData?.seo;
  const metadata = generateMetadataObject(seo);
  return metadata;
}

export default async function Products({ params }: LocaleParamsProps) {
  const { locale } = await params;

  // Fetch the product-page and products data
  const pageData = await fetchSingleType('product-page', { locale });
  const products = await fetchCollectionType<Product[]>('products', { locale });

  if (!pageData) {
    return (
      <div className="relative py-40 text-center flex flex-col justify-center items-center h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-gray-500 mb-8">
          It looks like the products page has not been set up in the CMS.
        </p>
      </div>
    );
  }

  const localizedSlugs = pageData?.localizations?.reduce(
    (acc: Record<string, string>, localization: any) => {
      acc[localization.locale] = 'products';
      return acc;
    },
    { [locale]: 'products' }
  ) || { [locale]: 'products' };

  const safeProducts = Array.isArray(products) ? products : [];
  const featured = safeProducts.filter(
    (product: { featured?: boolean }) => product.featured
  );

  return (
    <div className="relative overflow-hidden w-full">
      <ClientSlugHandler localizedSlugs={localizedSlugs} />
      <AmbientColor />
      <Container className="pt-40 pb-40">
        <FeatureIconContainer className="flex justify-center items-center overflow-hidden">
          <IconShoppingCartUp className="h-6 w-6 text-white" />
        </FeatureIconContainer>
        <Heading as="h1" className="pt-4">
          {pageData.heading}
        </Heading>
        <Subheading className="max-w-3xl mx-auto">
          {pageData.sub_heading}
        </Subheading>
        <Featured
          products={featured}
          locale={locale}
          heading={pageData.featured_heading}
          sub_heading={pageData.featured_sub_heading}
        />
        <ProductItems
          products={products}
          locale={locale}
          heading={pageData.popular_heading}
          sub_heading={pageData.popular_sub_heading}
        />
      </Container>
    </div>
  );
}
