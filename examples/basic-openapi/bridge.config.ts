import { defineConfig } from '@bridge/core';

export default defineConfig({
  input: {
    path: './petstore.yaml',
    type: 'openapi',
  },
  output: {
    dir: './src/generated',
  },
  generators: {
    typescript: {
      generateTypeGuards: true,
    },
    zod: true,
    client: {
      baseUrl: 'https://api.petstore.example.com/v1',
    },
    hooks: {
      type: 'react-query',
    },
  },
});
