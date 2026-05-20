export default () => ({
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Tatoo Launchpad API',
        description: 'API Documentation for Tatoo Launchpad',
      },
      'x-strapi-config': {
        path: '/documentation',
        showGeneratedFiles: true,
        generateDefaultResponse: true,
      },
      servers: [
        { url: 'http://localhost:1337/api', description: 'Development server' },
      ],
    },
  },
});
