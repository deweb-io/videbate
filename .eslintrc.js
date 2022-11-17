module.exports = {
    root: true,
    env: {
        es6: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module'
    },
    globals: {
        BBS_OPERATOR_CONFIGURATION: 'readonly',
        Element: 'readonly',
        System: 'readonly',
        window: 'readonly',
        define: 'readonly',
        document: 'readonly'
    },
    rules: {
        'comma-dangle': ['error', 'never'],
        'import/no-unresolved': 0,
        'indent': ['error', 4, {'SwitchCase': 1}],
        'linebreak-style': ['error', 'unix'],
        'max-len': ['error', {'code': 120}],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'space-before-function-paren': ['error', 'never'],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'keyword-spacing': ['error', {after: false, overrides: {
            'const': {'after': true},
            'default': {'after': true},
            'else': {'after': true},
            'export': {'after': true},
            'from': {'after': true},
            'import': {'after': true},
            'of': {'after': true},
            'return': {'after': true},
            'try': {'after': true}
        }}]
    }
};
