import nextConfig from 'eslint-config-next';

const customIgnores = {
  ignores: ['coverage/**'],
};

export default [
  customIgnores,
  ...nextConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
];
