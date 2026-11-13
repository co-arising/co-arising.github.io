# Fold expression carriers: refinement RFC and defect handoff

**Status: proposal only / 提案，尚未实现.** This document does not enable new syntax,
change bank policy, or authorize compiler/migrator work. The website teaches the
current supported forms; toolchain implementation needs separate approval.

## Baseline and the three existing issues

Reviewed 2026-11-13 against **`cb860b5c1f8f038eb073c95cd83b724424c89cc6`**, package
**0.5.0**, with Node 22.23.4. This is the current local tool HEAD, not a claim about
an unpublished later build. The earlier report used `58468ad`. Guidance was read
before inspection: [AGENTS](https://github.com/co-arising/metarch-truthsrc/blob/cb860b5c1f8f038eb073c95cd83b724424c89cc6/AGENTS.md),
[AUTHORING](https://github.com/co-arising/metarch-truthsrc/blob/cb860b5c1f8f038eb073c95cd83b724424c89cc6/AUTHORING.md#scoped-micro-syntax),
[SCHEMA](https://github.com/co-arising/metarch-truthsrc/blob/cb860b5c1f8f038eb073c95cd83b724424c89cc6/SCHEMA.md#domain-value-source-residence-explicit-v2-opt-in-2026-10-30),
and [PRODUCTS](https://github.com/co-arising/metarch-truthsrc/blob/cb860b5c1f8f038eb073c95cd83b724424c89cc6/PRODUCTS.md#complete-dependency-and-pre-event-fold-profiles).
Historical passages in those documents do not widen current author admission.

Checks used a new self-owned Counter created through public `init`, then
`compile-project`; original scaffold and bank inputs were not edited. The pure
value parser was additionally checked in memory with the Counter's actual
CLI-compiled layout. No bank execution, JVM, install or network was involved.

| Earlier issue | Current observation | Safe current practice / handoff |
|---|---|---|
| Micro `@fold[set](value=...)` vs `expr` | **Still present.** With micro/v1 selected, `count := event.count` compiles. `count := @fold[set](value=event.count)` fails V13: `op "set" requires "expr"`. `author-micro-codec.mjs` lowers set to `value`; `validate.mjs` and `domain-products/folds.mjs` require `expr`. | Use `{"slot":"count","expr":"event.count"}` or direct micro assignment. Even the set example in AUTHORING is not a recommended working path. A future fix needs compatibility tests, not a website workaround that writes product IR. |
| Product objects vs author admission | **Still a layer gap.** `expr: {form:"literal",value:"1"}` and `{form:"subtract",left:"event.count",right:"literal:1"}` are accepted by the pure value-v2 parser, but each fails author V13 with the binding-only host-expression diagnostic. | Outer fold objects with supported string operands work. Do not advertise nested literal/arithmetic objects as valid author input merely because PRODUCTS describes them. Opening this author surface requires explicit admission/version decisions. |
| Invalid integer loses the fold source | **Still present.** `literal:1.5` fails public compilation. In pure `parseValue` with the real fold source supplied, the diagnostic is `VALUE_INTEGER`, source `{document:"request",pointer:""}` (`request#`), rather than the fold pointer. | Preserve the rejection; improve diagnostic propagation separately. The public CLI's abbreviated error message is not proof of an author location. |

The last two checks distinguish product grammar from author grammar; they are not
claims of a regression from previously promised author support. `compile-products`
is the explicit file-manifest entry for typed contracts; it does not bypass an
author tree's admission rules or become a complete application verifier.

## Problem: one local change crosses several quoting layers

The current file grammar is deliberately small, **not general YAML**. A YAML atom
holds JSON blocks; selected JSON strings hold micro syntax; a guard's condition may
be another quoted string containing quoted literals. That is useful mechanical
compression, but not necessarily clear authoring.

### Real bank before: current supported source

This **single JSON string fragment**, not a complete YAML file, is copied from
`InitializeAccount`'s currency guard. The full five-guard source is preserved on
[the language page](/dsl/#slice) with its source SHA-256.

```json
"@guard[invariantRef](reject ACCOUNT_CURRENCY/ACCOUNT_CURRENCY: \"param.currency == \\\"CNY\\\" && param.amount.currency == param.currency\")"
```

The predicate contains `"CNY"`; its quotes are escaped inside the micro argument,
then escaped again inside the JSON carrier. Changing the currency comparison means
reasoning about delimiters that have no business meaning. The same atom's fold
array has less nesting but still quotes the literal carrier:

```json
[
  "initialized := \"literal:true\"",
  "accountBalance := @fold[put](key=event.currency, value=event.amount)"
]
```

### Nonbank before: current supported author fragment

The original Counter's count guard is an outer object with a string condition:

```json
{"kind":"invariantRef","ref":"nonnegative-count","errCode":"NEGATIVE_COUNT","cond":"param.count >= 0","onFail":"reject"}
```

Its count fold is `{"slot":"count","expr":"event.count"}`. These explicit objects
are a supported interim choice, **not the endgame of moving all knowledge back
into verbose JSON**. They are also not the typed product's `op/ref/valueType` IR.

## Candidate: a versioned raw carrier with finite sugar

**Everything in this section is unimplemented design notation. Do not paste it
into today's tree.** Candidate selection would be an explicit, separately versioned
`authoring.expressions: "truthsrc.expressions/v1"`, not an implicit upgrade of
`truthsrc.author/v1`, `truthsrc.micro/v1`, or domain product versions.

Consider a raw carrier attached to an existing declared guard/fold position. The
following field-path/block notation is a **parser-extension proposal**, not ordinary
YAML accepted by the current small reader. Surrounding command/event definitions
stay in their existing atom. A terminator is required to occupy its own line;
collisions must be escaped or use another explicitly chosen terminator.

### Bank after — proposed carrier fragment, NOT CURRENT INPUT

```text
payload.guards: |expressions
  guard invariantRef reject ACCOUNT_CURRENCY/ACCOUNT_CURRENCY <<predicate
  param.currency == "CNY" && param.amount.currency == param.currency
  predicate

events.AccountInitialized.foldAssignments: |expressions
  initialized := literal:true
  accountBalance := put(key=event.currency, value=event.amount)
```

The guard here replaces **only that guard's carrier in a complete migration**; the
fragment is not a replacement for the five-rule array. A migration must preserve
all five rules, order, conflict rejection, succeed-empty, and the `>= 0.00` seed
condition. It must not invent a second bank truth or split rules into side files.

### Counter after — proposed carrier fragment, NOT CURRENT INPUT

```text
payload.guards: |expressions
  guard invariantRef reject nonnegative-count/NEGATIVE_COUNT <<predicate
  param.count >= 0
  predicate

events.CountSet.foldAssignments: |expressions
  count := event.count
```

The nonempty-id guard and id binding/fold are omitted here **only to illustrate the
carrier**. They must remain in the complete author input. The independent guide's
approved 0..100 exercise is a business change, not part of representation migration.

### Lowering and refusal rules

1. Parse only explicitly selected schema positions, after structural expansion.
   Each semantic position has exactly one author: reject simultaneous old JSON
   and new block definitions. No inferred merge precedence or duplicate target.
2. Raw predicate text lowers to the existing `cond` string. Direct assignment
   lowers to `{slot,expr}`; finite `put/remove/put-all/remove-all/money-apply/
   integer-apply` sugar lowers to the existing closed outer objects. Preserve
   identities, error policy, order, literals, units and source ordinals.
3. Keep the existing typed semantic AST and product profile selection unchanged.
   A new delimiter is not permission for new operators. Nested arithmetic/literal
   author admission is a separate issue; syntax refinement must not smuggle it in.
4. Preserve simultaneous pre-event RHS reads, unique targets, event/state-only
   replay, exact precision/units and signed-64 overflow rejection. No host, clock,
   network, eval, arbitrary Scala, multiplication, implicit conversion or rounding.
5. Notes, descriptions and literal/default content remain opaque. Text resembling
   `guard`, `@fold`, a reference or executable code is not interpreted outside its
   selected position. Literal content is never evaluated as code.
6. Source mappings compose structural and expression lowering. Retain real author
   file/pointer and UTF-8 span where known, plus the semantic pointer. Several
   expanded nodes may map to **one author declaration**. Do not manufacture unique
   line numbers, one-file-per-node rules or source-comment anchor requirements.

## Compatibility, migration and exit criteria

Keep old unselected input legal and retain its original source bytes. Roundtrip
must reproduce each input's **own** paths/bytes, including quoted punctuation and
Unicode. A migrated source necessarily has different bytes; compare its expanded
semantic projection and admitted products to a separately frozen old baseline,
accounting for intentionally different physical source mappings. Neither full
canonical byte equality across representations nor a self-generated expected
result is an adequate semantic oracle.

Migration should preview a source-bound plan, produce a new owned candidate by
default, and refuse stale inputs, ambiguous positions, unknown versions/operators,
duplicate arguments/targets and unrepresentable conversions. Never normalize an
unrelated payload, overwrite an existing candidate, or delete output/evidence to
force success. In-place migration needs separate explicit approval and safety
checks. Business-policy changes are not format migration.

Acceptance requires independent old/new fixtures and failure cases covering:

- Quotes, commas, brackets, parentheses, backslashes, Unicode, terminator collisions
  and ordinary prose/literals that happen to resemble instructions.
- Duplicate/missing/unknown arguments, unsupported operations and wrong profile.
- Map scalar/sequence key types, optional lookups, nominal identity, units, scale,
  precision and overflow; no rounded or converted success.
- Pre-event reads across removal plus another assignment, and duplicate-target
  rejection; command/host/clock references forbidden in replay.
- Bank conflict before succeed-empty, identical retry without event, zero accepted,
  negative seed rejected; the existing business oracle remains authoritative.
- Counter's unchanged semantics, source-byte roundtrip, source-pointer diagnostics,
  and separately approved change cases. A parser's green result is not human signoff.

Evaluate readability by actual escaping layers, the locality of a one-rule edit,
review clarity and diagnostic location. Do not promise a compression percentage.

## Current website delivery and its limits

The [guide](/guide/#change-rule) and [中文指南](/zh/guide/#change-rule) use the existing
Counter guard and supported strings. The downloadable Node check runs public
`compile-project`, then the same package's documented pure decision/value/fold
oracles. Its prewritten cases are -1 reject, 0 accept, 100 accept, 101 reject.
Negative controls cover the unchanged rule, a strict upper bound and a wrong event
binding. This is admitted-product behavior, **not generated Scala execution**.
Public `compile-products` additionally needs a complete file manifest and explicit
bindings; no synthetic second business request is added to make this tutorial pass.

No RFC parser, migrator, registry or bank/toolchain change is delivered here.
Generated source review, independently expected target-runtime behavior and human
business acceptance remain separate gates. The known defects above remain upstream
handoff items, not reasons to silently change the source rule or claim fake success.
