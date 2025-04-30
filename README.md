# YAML tools

Tools for better YAML development

## Features

- Jump to `%my_param%` declarations in other YAML files.
- Supports imported YAML files via `imports:` directive.
- Navigate to environment variables:
  - `%env(APP_ENV)%`
  - `%env(string:APP_ENV)%`
  - `${APP_ENV}` (Docker Compose style)
- `.env.local` overrides are prioritized over `.env`.

## Usage

1. Open a YAML file.
2. Ctrl+Click or press `F12` on a `%var%` or `${VAR}` reference.
3. You’ll be taken to its declaration.

## Notes

- `.env` and `.env.local` are parsed automatically.
- Duplicate keys in YAML may show a warning and skip parsing.

## License

MIT
