import next from 'eslint-config-next';

const eslintConfig = [
  ...next,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'import/no-anonymous-default-export': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },
];

export default eslintConfig;
