# Driving this repo from Windows

The repo lives on the WSL filesystem and the toolchain — node, npm, sass,
composer, php, the Docker CLI — runs **inside** WSL. Anything driving it from
the Windows side (PowerShell, Git Bash, VS Code's terminal, a coding agent)
crosses a shell boundary on every command.

The failures that produces do not look like quoting failures. They look like
broken environments, missing files, empty search results and corrupt paths,
which is why they get re-diagnosed from scratch every time. This file is the
catalog of specific traps, each with the symptom you will actually see.

## The two invocations that work

```
# One-liners. Single quotes outside, so the outer shell expands nothing.
wsl bash -c 'cd /home/dev/projects/mg && docker compose ps'

# Anything multi-line, or containing quotes, backticks, $ or tabs.
# Write the script to a file with an editor tool, then run it by path.
wsl bash -c 'bash /home/dev/projects/mg/temp/probe.sh'
```

For writing whole files, prefer an editor tool that takes a path and content
directly. It sidesteps every trap on this page at once.

## Trap: backticks in a heredoc are executed by the *outer* shell

**Symptom** — output from commands you never ran, mixed into your results.
Fragments of a document you were writing execute as shell commands. Seen in
practice: writing an `AGENTS.md` containing fenced code blocks ran a dozen of
its own lines, producing `command not found` for every word in the file.

**Cause** — the quoted heredoc (`<<'EOF'`) protects text from the shell that
*runs* it. But the whole thing is first an argument to `wsl bash -c "…"`, so the
OUTER shell expands backticks and `$` while the heredoc is still just characters
inside a string. It never gets the chance to protect anything.

**Fix** — **never pass a heredoc across the boundary.** Write files with an
editor tool. This is the single highest-value rule on this page: prose and
documentation are full of backticks, and the failure is silent enough to look
like a broken environment.

## Trap: `$` is expanded before WSL ever sees it

**Symptom** — a loop that iterates on nothing, a `for f in …; do cat "$f"` that
reports `cat: '': No such file or directory` once per iteration, a `grep` that
matches everything or nothing. Often no error at all — the command reports
success and does the wrong thing.

**Cause** — the same one as the backticks above. The command is a string in the
outer shell first, so `$f`, `$S`, `$1` expand there. A loop variable that does
not exist outside expands to nothing.

Escaping (`\$`) works in some layers and not others, and which layer ate it is
not visible from the output. Do not try to out-quote it.

**Fix** — keep `$` out of the boundary entirely. Use explicit absolute paths
instead of variables for one-liners, and write anything with a loop or a
variable to a `.sh` file in `temp/` and run it by path.

**The tell:** if a command that loops or substitutes returns a suspiciously
round result — all files, no files, no matches — assume the variable was eaten
before assuming the logic is wrong.

## Trap: Git Bash rewrites absolute paths

**Symptom** — a path arrives WSL-side with Windows junk prepended:

```
bash: C:/Program Files/Git/home/dev/projects/mg/temp/probe.sh:
      No such file or directory
```

**Cause** — MSYS path conversion. Git Bash sees an argument starting with `/`
and translates it to a Windows path before `wsl` gets it.

**Fix** — put the path *inside* the quoted command
(`wsl bash -c 'bash /home/…/probe.sh'`) rather than passing it as a bare
argument to `wsl bash`. `MSYS_NO_PATHCONV=1` also disables the translation.

## Trap: `sed` escapes are eaten crossing the boundary

**Symptom** — `sed: -e expression #1, char NN: unterminated 's' command`,
`Invalid back reference`, or a substitution that silently inserts a literal
character. Seen in practice: `sed -i "23a\\\tregister_block_type(…)"` inserted a
line beginning with a literal `t` instead of a tab.

**Cause** — the pattern crosses two shells, and sed has its own metacharacters
on top of both. Backslashes, `&`, `$` and `/` need escaping at every level, and
which level consumed one is invisible from the output.

**Fix** — use `sed` only for flat, literal `s/old/new/g` on a single line with
no escapes. For anything with structure — inserting a line, matching a pattern
with metacharacters, multi-line edits — use the editor tools, which need no
escaping at all.

## Trap: npm cannot run from a UNC path

**Symptom** — `npm error code ERR_INVALID_URL`, immediately, with no other
detail.

**Cause** — the command ran Windows-side with the working directory set to
`\\wsl.localhost\Ubuntu-24.04\…`. npm cannot resolve a UNC path as a base URL.

**Fix** — run it inside WSL with a WSL path. Reading and searching files over
the UNC path is fine, and is the right way to edit them; it is only executing
the node toolchain that fails.

## Trap: Docker writes the `wp/` tree as `www-data` and locks you out

**Symptom** — `mkdir: cannot create directory '…/themes/new-theme':
Permission denied`, from a WSL user who owns the project directory.

**Cause** — the `wordpress` image copies WordPress into the bind mount as uid
33. Everything it creates is `www-data:www-data` and group-unwritable, including
`wp-content/themes/`.

**Fix** — the ownership model is owner `dev` (uid 1000), group
`www-data` (gid 33), directories `2775`, files `664`. The setgid bit is what
makes new files inherit the group. Repair from the container:

    docker exec mgp-wordpress-1 sh -lc \
      'chown -R 1000:33 /var/www/html \
       && find /var/www/html -type d -exec chmod 2775 {} + \
       && find /var/www/html -type f -exec chmod 664 {} +'

**Also useful:** `sudo` inside WSL prompts for a password and there is no TTY,
so a root-owned file left behind by Docker cannot be removed that way. A
throwaway container can do it — it runs as root and sees the same bind mount:

    docker run --rm -v /home/dev/projects/mg:/target alpine \
      sh -c 'rm -rf /target/stray-path'

## Trap: WordPress asks for FTP credentials to install anything

**Symptom** — updating core, or installing a plugin or theme, pops the
"Connection Information" FTP form instead of just working.

**Cause** — not permissions, which is what it looks like.
`get_filesystem_method()` compares the owner of the **running script**
(`getmyuid()`, uid 1000 under the bind mount) against a file PHP has just
created (uid 33, `www-data`). Under the ownership model above those always
differ, so WordPress decides it cannot write safely and falls back to FTP —
even though the tree is group-writable and `fopen()` succeeds.

**Fix** — `define( 'FS_METHOD', 'direct' );` in `wp-config.php`. It is correct
here precisely because the group *is* writable; the check is what's wrong, not
the permissions.

To see which method WordPress actually picks, ask it in a **web** request — a
one-off PHP file in the webroot that requires `wp-load.php` and
`wp-admin/includes/file.php`, then echoes `get_filesystem_method()`. WP-CLI
answers `direct` regardless, because `getmyuid()` reads a different script.

### The permission repair strips exec bits, and the toolchain then fails

Running the `chmod 664` sweep above sets every file non-executable, including
`vendor/bin/phpcs` and everything under `node_modules/**/bin/`. The symptom is
`sh: 1: vendor/bin/phpcs: Permission denied` from a lint run that worked
minutes earlier. Always follow the repair with:

    find . -type f -path '*/bin/*' -exec chmod 775 {} +
    grep -rIl '^#!' vendor node_modules scripts | xargs -r chmod 775

## Trap: a stale bind mount creates a *directory* where a file belongs

**Symptom** — `cat: php/custom_defaults.ini: Is a directory`, and PHP ignoring
every setting in it.

**Cause** — Docker creates missing bind-mount sources as empty directories. If
the compose file mounts a file that does not exist yet, you get a directory at
that path, and the mount silently does nothing from then on.

**Fix** — create the file before the first `docker compose up`. If it has
already happened, remove the directory (root-owned — see above) and recreate the
file.

## Trap: the front end loses all CSS

**Symptom** — the site renders as unstyled HTML: bare bullets, blue underlined
links. WordPress returns 200s and nothing is in the error log.

**Cause** — `define( 'CUSTOM_WP_VITE_DEV', true )` in `wp-config.php` makes the
theme enqueue assets from the Vite dev server instead of `dist/`. With no
`npm run dev` running, those URLs go nowhere.

**Fix** — start `npm run dev`, or set the constant back to `false`. Check that
constant before investigating anything else; the symptom looks like a broken
build, and the build is fine.

## WP-CLI runs in its own container

`docker compose run --rm -T wpcli wp <command>` from the project root. Three
things about it that are easy to trip over:

- **`-T` matters.** Without it, compose allocates a TTY and the output arrives
  wrapped in control characters that break anything parsing it.
- **It runs as uid 33** (`user: "33:33"` in the compose file) to match the
  Debian image's `www-data`. The Alpine `wordpress:cli` image defaults to uid
  82, which cannot write the group-`www-data` uploads tree.
- **It mounts `php/custom_defaults.ini`** for `memory_limit = 512M`. Without it,
  a plugin-heavy bootstrap hits PHP's 128M default and fatals mid-command.

`wp db check` may report a TLS error — that is the external `mariadb-check` tool
defaulting to TLS against MySQL 8. WordPress and WP-CLI connect fine over
mysqli; use `wp db query "SELECT 1"` as a connectivity probe instead.

## Scratch scripts live in `temp/`

Anything written to get a job done — `.sh` runners, `.py` parsers, fetched HTML,
diff dumps — goes in `<project>/temp/`, which is git-ignored and sits outside the
webroot. Given how much of this page is "write it to a file and run it by path",
that directory is load-bearing, not housekeeping. See the project-root
`AGENTS.md`.
