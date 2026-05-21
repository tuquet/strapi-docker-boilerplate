/**
 * `testimonial-populate` middleware
 * Deep-populate nested `user` component (firstname, lastname, job, image)
 */
import type { Core } from '@strapi/strapi';

const populate = {
  user: {
    populate: {
      image: true,
    },
  },
  localizations: {
    populate: {
      user: {
        populate: {
          image: true,
        },
      },
    },
  },
};

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    ctx.query.populate = populate;
    await next();
  };
};
