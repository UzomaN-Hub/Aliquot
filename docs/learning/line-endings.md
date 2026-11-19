# Line endings and `.gitattributes`

**What it is:** every text file marks the end of each line with invisible characters. Windows uses two (`CRLF`, `\r\n`); Linux and macOS use one (`LF`, `\n`). `.gitattributes` tells Git which ending to use for which files, for everyone who clones the repo.

**Why we use it:** we write code on Windows, but it runs on Linux: Docker containers, GitHub Actions runners, Render. We fix one rule in the repo (`LF` everywhere) instead of relying on each laptop's Git settings.

**What goes wrong without it:**
- A shell script saved with `CRLF` fails inside a Linux container with `/bin/sh^M: bad interpreter` — the `\r` becomes part of the command.
- Diffs show every line as changed when two people's editors disagree, hiding the real change in review.

## How the rule works
| Line in `.gitattributes` | Meaning |
| --- | --- |
| `* text=auto eol=lf` | Git detects text files and stores and checks them out with `LF` |
| `*.bat text eol=crlf` | Exception: `cmd.exe` scripts keep `CRLF` |
| `*.png binary` | Never convert or text-diff images, fonts, PDFs |

`.gitattributes` wins over the global `core.autocrlf` setting (which is `true` on this laptop), so the rule holds on every machine.

VS Code shows the current file's ending in the status bar (`LF` / `CRLF`); click it to change. Modern tools on Windows, including PowerShell, read `LF` files fine.

## Where it's used in Aliquot
- `.gitattributes` at the repo root.
