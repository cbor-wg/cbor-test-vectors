import {defineConfig, globalIgnores} from 'eslint/config';
import es6 from '@cto.af/eslint-config/es6.js';

export default defineConfig(
  globalIgnores(['README.md/*.ts']),
  es6
);
