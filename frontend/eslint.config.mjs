import nextPlugin from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';

export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  },
  plugins: { '@next/next': nextPlugin, 'react-hooks': hooks },
  rules: { ...nextPlugin.configs.recommended.rules, 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
}];
