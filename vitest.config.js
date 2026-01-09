import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['check/*.test.js'],
          name: 'js',
          globals: true,
          environment: 'node',
        },
      },
    ],
  },
});
