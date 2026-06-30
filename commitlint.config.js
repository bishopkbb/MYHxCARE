/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // new feature
        'fix', // bug fix
        'perf', // performance improvement
        'refactor', // code change that's neither fix nor feature
        'test', // adding or updating tests
        'docs', // documentation only
        'style', // formatting, whitespace (no logic change)
        'chore', // tooling, config, dependencies
        'ci', // CI/CD pipeline changes
        'build', // build system changes
        'revert', // reverts a previous commit
      ],
    ],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
    // Subject case not enforced — write naturally
    'subject-case': [0],
  },
};
