# YAML Tools

VS Code extension for navigating YAML parameters and environment variables across project files.

## Features

- Jump to `%my_param%` declarations in other YAML files.
- Follow imported YAML files declared through the `imports:` directive.
- Navigate to environment variable declarations for:
  - `%env(APP_ENV)%`
  - `%env(string:APP_ENV)%`
  - `${APP_ENV}` (Docker Compose style)
- Prioritize `.env.local` over `.env`.

## Usage

1. Open a YAML file.
2. Ctrl+Click or press `F12` on a `%var%` or `${VAR}` reference.
3. You will be taken to its declaration.

## Notes

- YAML indexing is currently limited to files matching `**/config/**/*.{yml,yaml}`.
- `.env` and `.env.local` are parsed automatically from the workspace root.
- Duplicate keys in YAML may trigger a warning and skip parsing for that file.
