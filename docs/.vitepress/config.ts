import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Bridge',
  description: 'Type-safe API client generator from OpenAPI and GraphQL specifications',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Plugins', link: '/plugins/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/bridge-codes/bridge' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@bridge/core' },
          { text: 'Changelog', link: 'https://github.com/bridge-codes/bridge/blob/main/CHANGELOG.md' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Bridge?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Generators',
          items: [
            { text: 'TypeScript Types', link: '/guide/generators/typescript' },
            { text: 'Zod Schemas', link: '/guide/generators/zod' },
            { text: 'HTTP Client', link: '/guide/generators/client' },
            { text: 'React Query Hooks', link: '/guide/generators/react-query' },
            { text: 'SWR Hooks', link: '/guide/generators/swr' },
            { text: 'MSW Mocks', link: '/guide/generators/msw' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Custom Plugins', link: '/guide/advanced/custom-plugins' },
            { text: 'CLI Reference', link: '/guide/advanced/cli' },
            { text: 'Architecture', link: '/guide/advanced/architecture' },
          ],
        },
        {
          text: 'Help',
          items: [
            { text: 'FAQ', link: '/guide/faq' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: 'Built-in Plugins',
          items: [
            { text: 'Overview', link: '/plugins/' },
            { text: 'TypeScript', link: '/plugins/typescript' },
            { text: 'Zod', link: '/plugins/zod' },
            { text: 'HTTP Client', link: '/plugins/client' },
            { text: 'React Query', link: '/plugins/react-query' },
            { text: 'SWR', link: '/plugins/swr' },
            { text: 'MSW', link: '/plugins/msw' },
          ],
        },
        {
          text: 'Creating Plugins',
          items: [
            { text: 'Plugin API', link: '/plugins/api' },
            { text: 'Plugin Examples', link: '/plugins/examples' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'parseOpenAPI', link: '/api/parse-openapi' },
            { text: 'Generators', link: '/api/generators' },
            { text: 'Plugin Types', link: '/api/plugin-types' },
            { text: 'IR Schema', link: '/api/ir-schema' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/bridge-codes/bridge' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Bridge Contributors',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/bridge-codes/bridge/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    lineNumbers: true,
  },

  lastUpdated: true,
});
