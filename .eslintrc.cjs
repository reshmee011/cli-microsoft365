// list of words used in command names used for word breaking
// sorted alphabetically for easy maintenance
const dictionary = [
  'access',
  'activation',
  'activations',
  'adaptive',
  'administrative',
  'ai',
  'app',
  'application',
  'apply',
  'approve',
  'assessment',
  'assets',
  'assignment',
  'audit',
  'azure',
  'bin',
  'builder',
  'card',
  'catalog',
  'checklist',
  'client',
  'comm',
  'command',
  'community',
  'container',
  'content',
  'conversation',
  'custom',
  'customizer',
  'dataverse',
  'default',
  'definition',
  'dev',
  'details',
  'directory',
  'eligibility',
  'enterprise',
  'entra',
  'event',
  'eventreceiver',
  'external',
  'externalize',
  'fun',
  'group',
  'groupify',
  'groupmembership',
  'guest',
  'health',
  'hide',
  'historical',
  'home',
  'hub',
  'in',
  'info',
  'inheritance',
  'init',
  'install',
  'installed',
  'is',
  'issue',
  'item',
  'label',
  'list',
  'link',
  'log',
  'login',
  'logout',
  'mailbox',
  'management',
  'member',
  'membership',
  'messaging',
  'model',
  'multitenant',
  'm365',
  'news',
  'oauth2',
  'office365',
  'one',
  'open',
  'ops',
  'org',
  'organization',
  'owner',
  'permission',
  'pim',
  'place',
  'policy',
  'profile',
  'pronouns',
  'property',
  'records',
  'recycle',
  'registration',
  'request',
  'resolver',
  'retention',
  'revoke',
  'role',
  'room',
  'schema',
  'sensitivity',
  'service',
  'session',
  'set',
  'setting',
  'settings',
  'setup',
  'sharing',
  'side',
  'site',
  'status',
  'storage',
  'table',
  'teams',
  'threat',
  'to',
  'todo',
  'token',
  'type',
  'unit',
  'url',
  'user',
  'value',
  'web',
  'webhook'
];

// list of words that should be capitalized in a specific way
const capitalized = [
  'OAuth2'
];

// sort dictionary to put the longest words first
const sortedDictionary = dictionary.sort((a, b) => b.length - a.length);

module.exports = {
  "root": true,
  "env": {
    "node": true,
    "es2021": true,
    "commonjs": true,
    "mocha": true
  },
  "globals": {
    "NodeJS": true
  },
  "extends": [
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2015,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "cli-microsoft365",
    "mocha"
  ],
  "ignorePatterns": [
    "**/package-generate/assets/**",
    "**/test-projects/**",
    "clientsidepages.ts",
    "*.d.ts",
    "*.js",
    "*.cjs"
  ],
  "rules": {
    "cli-microsoft365/correct-command-class-name": ["error", sortedDictionary, capitalized],
    "cli-microsoft365/correct-command-name": "error",
    "cli-microsoft365/no-by-server-relative-url-usage": "error",
    "indent": "off",
    "@typescript-eslint/indent": [
      "error",
      2
    ],
    "semi": "off",
    "@typescript-eslint/semi": [
      "error"
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/explicit-module-boundary-types": [
      "error",
      {
        "allowArgumentsExplicitlyTypedAsAny": true
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_"
      }
    ],
    "brace-style": [
      "error",
      "stroustrup",
      {
        "allowSingleLine": true
      }
    ],
    "camelcase": [
      "error",
      {
        "allow": [
          "child_process",
          "error_description",
          "_Child_Items_",
          "_Object_Type_",
          "FN\\d+",
          "OData__.*",
          "vti_.*",
          "Query.*",
          "app_displayname",
          "access_token",
          "expires_on",
          "extension_*"
        ]
      }
    ],
    "comma-dangle": [
      "error",
      "never"
    ],
    "curly": [
      "error",
      "all"
    ],
    "eqeqeq": [
      "error",
      "always"
    ],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": [
          "method"
        ],
        "format": [
          "camelCase"
        ]
      }
    ],
    "@typescript-eslint/explicit-function-return-type": ["error", { "allowExpressions": true }],
    "mocha/no-identical-title": "error",
    "@typescript-eslint/no-floating-promises": "error"
  },
  "overrides": [
    {
      "files": [
        "*.spec.ts"
      ],
      "rules": {
        "no-console": "error",
        "@typescript-eslint/no-empty-function": "off",
        "cli-microsoft365/correct-command-class-name": "off",
        "cli-microsoft365/correct-command-name": "off",
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    },
    {
      "files": [
        "**/viva/commands/engage/**"
      ],
      "rules": {
        "camelcase": "off"
      }
    },
    {
      "files": [
        "*.mjs"
      ],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    }
  ]
};
