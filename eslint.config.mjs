import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["apps/desktop/src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/app/**",
                "**/pages/**",
                "**/widgets/**",
                "**/features/**",
                "**/entities/**",
              ],
              message:
                "shared レイヤーは上位レイヤー（entities/features/widgets/pages/app）へ依存してはいけません。",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/desktop/src/entities/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/app/**",
                "**/pages/**",
                "**/widgets/**",
                "**/features/**",
              ],
              message:
                "entities レイヤーは上位レイヤー（features/widgets/pages/app）へ依存してはいけません。",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/desktop/src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/app/**", "**/pages/**", "**/widgets/**"],
              message:
                "features レイヤーは上位レイヤー（widgets/pages/app）へ依存してはいけません。",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/desktop/src/widgets/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/app/**", "**/pages/**"],
              message:
                "widgets レイヤーは上位レイヤー（pages/app）へ依存してはいけません。",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/desktop/src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/app/**"],
              message: "pages レイヤーは app レイヤーへ依存してはいけません。",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cdk.out/**",
      "apps/desktop/src-tauri/**",
      "pnpm-lock.yaml",
    ],
  },
);
