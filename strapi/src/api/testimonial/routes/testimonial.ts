/**
 * testimonial router
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::testimonial.testimonial', {
  config: {
    find: {
      middlewares: ['api::testimonial.testimonial-populate'],
    },
    findOne: {
      middlewares: ['api::testimonial.testimonial-populate'],
    },
  },
});
