# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # tsc type-check only (noEmit: true — no JS is produced)
npm run watch       # tsc -w
npm test            # jest over lib/ and src/, matching **/*.spec.ts
npx jest path/to/file.spec.ts          # single test file
npx jest -t "test name substring"      # single test by name
npm run example src/snippets/queue-consumer-polling.ts   # execute one example
npx cdk synth       # synthesize CloudFormation from bin/domain-prototyping-examples.ts
npx cdk diff
npx cdk deploy
```

There is no linter or formatter configured.

## Module system — Do not change casually

The repo is **CommonJS**, deliberately. `package.json` has no `"type"` field and
tsconfig uses `module: "CommonJS"` / `moduleResolution: "node"`.

This exists so example code reads cleanly in articles: relative imports are written
**without file extensions** (`from './queue'`). Setting `"type": "module"` — or
switching to `NodeNext` resolution — immediately breaks every example with
`ERR_MODULE_NOT_FOUND` at runtime and TS2835 at compile time, because ESM requires
explicit `./queue.js` specifiers. It also breaks `jest.config.js`, which is CommonJS.

The tradeoff accepted here: **no top-level await**. Async examples must wrap in an
`async main()` (or a scheduler, as `queue-consumer-polling.ts` does).

## Architecture

This repo is the compile-and-run harness for the TypeScript examples used in the
adjacent `../domain-prototyping` site. Its purpose is to verify that example code is
correct and actually runs, rather than authoring snippets inline with the articles.
Publication of the repo itself is undecided.

Two loosely related halves live in one repo:

**The CDK app** (`bin/`, `lib/`, `cdk.json`) is unmodified `cdk init` scaffolding.
`DomainPrototypingExamplesStack` is empty and `lib/domain-prototyping-examples-stack.spec.ts`
is the commented-out example test. Nothing in `src/` is wired into the stack. Treat the
CDK side as the eventual deployment target for prototyped domain concepts, not as
working infrastructure.

**The prototyping examples** (`src/`) are the substance of the repo, and follow a
deliberate layering:

- `src/components/` — the domain vocabulary and its minimal implementations.
  `Queue<T>` is a generic, deliberately async two-method port (`add`/`remove`); async
  because "target systems will almost certainly be distributed". `message-queue.ts`
  narrows it to `MessageQueue extends Queue<DomainMessage>` and defines the message
  vocabulary shared with the (not-yet-present) event bus: `DomainMessage` carries
  `id` + `type`, with `DomainCommand` (asks for a state change) and `DomainEvent`
  (reports one happened) as intentionally empty marker extensions.
  `message-queue-in-memory.ts` is the reference implementation used by snippets.
- `src/examples/` — runnable illustrations of a pattern built on the components,
  e.g. `queue-consumer-polling.ts` contrasts single-consumer polling with batched
  consumers and the ordering/`undefined`-handling problems batching introduces.

When adding examples: keep abstractions as narrow as `Queue<T>` is — no internals
beyond what the pattern needs — and add in-memory implementations rather than real
infrastructure. The explanatory comments in `src/components/` are part of the
deliverable, not incidental; they state *why* a shape was chosen. Match that density.

Tests are colocated (`*.spec.ts` next to sources), not in a separate `test/` tree.
