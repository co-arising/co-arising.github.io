# Specs Have Bugs Too: How AWS Kiro Uses SMT Solvers to Eliminate Ambiguity and Logic Conflicts Before Writing Code

In 2026, Spec-Driven Development (SDD) has become the prevailing consensus in AI-assisted engineering: write a clear `spec.md` or `requirements.md` first, then hand it to a coding agent. Yet in his **AI Engineer CODE 2026** talk (November 11, 2026), [*Specs have bugs too*](https://ai.engineer/code/2026/talks/online-aws-specification-analyzer), **Rajath Mahendrappa Kotyal** ([AI Engineer Speaker Profile](https://ai.engineer/speakers/rajath-mahendrappa-kotyal) · [GitHub `@rajathkotyal`](https://github.com/rajathkotyal)) of the **AWS Automated Reasoning Group** exposed the blind spot at the heart of SDD:

> **If your specification itself harbors hidden ambiguities, cross-rule contradictions, and coverage gaps, a stronger coding agent will simply compile flawed requirements into production bugs at 10× speed.**

This deep dive examines five core questions:

1. **Talk Overview, Slides Availability & Citation Audit**: Verifying slide access, the AWS research team behind the feature, and the exact academic papers behind every statistic cited in the talk.
2. **Before SMT vs. After SMT**: How specifications look without SMT verification versus how both the spec structure and human-agent workflow transform once SMT enters the loop.
3. **Under the Hood of SMT**: How SAT/SMT solvers work (`CDCL(T)`), and how AWS's three-stage neuro-symbolic pipeline turns LLM non-determinism into an ambiguity detector via 7–10× sampling and logical-equivalence clustering.
4. **Open-Source Ecosystem & Runnable Code**: Key GitHub repositories to study or integrate, plus self-contained SMT-LIB2 and Python `z3-solver` snippets reproducing the talk's exact examples.
5. **Four Architectural Supplements for `co-arising` (`truthsrc`)**: Concrete ways to plug SMT verification into `truthsrc`'s compiler toolchain, the `domain-interview` Skill, `Given-When-Then` test synthesis, and bounded Saga invariant checking.

## 1. Talk Overview, Slides Availability & Citation Audit

### 1.1 Speaker, Team & Slides Status

* **Video & Official Reading Edition**: Recorded during the AI Engineer CODE 2026 Day 1 livestream ([`1:50:46–1:58:35` on YouTube](https://www.youtube.com/watch?v=ZZ19zhYnDKY&t=6648s)), accompanied by the official reading edition at [Specs have bugs too | AI Engineer CODE 2026](https://ai.engineer/code/2026/talks/online-aws-specification-analyzer).
* **Speaker Background**: [Rajath Mahendrappa Kotyal](https://ai.engineer/speakers/rajath-mahendrappa-kotyal) holds a master's degree in Information Security from Carnegie Mellon University and works in the AWS Automated Reasoning Group. He helped build Kiro's Requirements Analysis engine and is also a contributor and reviewer on [Kani](https://github.com/model-checking/kani), AWS's open-source Rust model checker.
* **Team Credit Correction**: The talk's auto-generated transcript rendered his closing acknowledgments as `"Anda Jin, Stefan, Nia and Delmos"`. Cross-checking the AWS Kiro team's official May 12, 2026 technical post, [*Requirements analysis: catching requirement bugs before they become code*](https://kiro.dev/blog/deep-spec-analysis/), confirms the five Applied Science authors are **Oyendrila Dobe, Jatin Arora, Stefan Zetzsche, Nadia Labai, and Rémi Delmas**.
* **Slides Availability**: AI Engineer CODE 2026 has **not published a standalone downloadable PDF slide deck** for this session. However, the official [Reading Edition](https://ai.engineer/code/2026/talks/online-aws-specification-analyzer) timestamps key slides directly against the video (`01:54:20` separating LLM translation from solver checking, `01:55:00` multi-sample logical-equivalence clustering, and `01:55:40` entropy-based routing), and every method, worked example, SMT snippet, and diagram from the talk is published in full in the [AWS Kiro engineering blog post](https://kiro.dev/blog/deep-spec-analysis/).

### 1.2 Tracing the Theoretical & Empirical Citations

The talk and companion Kiro post cite several striking quantitative findings. Below is the verified primary provenance for each claim:

| Claim in Talk / Slides | Primary Paper / Empirical Source | Key Takeaway for Engineering Teams |
| ----- | ----- | ----- |
| **Ambiguous, contradictory, or incomplete prompts cause 20–40% Pass@1 drops, with 60–90% of syntactically valid code being semantically wrong** | **Larbi et al. (2025)**, [*When Prompts Go Wrong: Evaluating Code Model Robustness to Ambiguous, Contradictory, and Incomplete Task Descriptions*](https://arxiv.org/html/2507.20439) (arXiv:2507.20439, cited in [Kiro Blog](https://kiro.dev/blog/deep-spec-analysis/)) | Mutating clear prompts into flawed ones produces code that compiles and runs cleanly while silently diverging from intended behavior. |
| **Underspecified prompts are ~2× more likely to regress across model or prompt changes, with accuracy drops sometimes exceeding 20%** | **Yang et al. (2025)**, *What Prompts Don't Say: Understanding and Managing Underspecification in LLM Prompts* (arXiv:2505.13360, cited in [Kiro Blog](https://kiro.dev/blog/deep-spec-analysis/)) | LLMs silently fill gaps using undisclosed biases; upgrading models introduces a different hidden bias, causing silent behavioral drift even when existing tests pass. |
| **LLM auto-formalization shows strong results for classification/entity extraction, but weak evidence for full requirement formalization due to implicit domain knowledge** | **Norheim et al. (2024)** (MIT & Airbus), *Challenges in applying large language models to requirements engineering tasks*, *Design Science*, 10:e16 (doi:10.1017/dsj.2024.8, cited in [Kiro Blog](https://kiro.dev/blog/deep-spec-analysis/)) | Explains why AWS avoids one-shot end-to-end LLM proving, explicitly models background axioms ("dark matter" of requirements), and keeps humans as the final decision-maker. |
| **EARS structured natural-language requirements syntax** | **Mavin et al. (2009)** (Rolls-Royce), [*Easy Approach to Requirements Syntax (EARS)*](https://alistairmavin.com/ears/) (17th IEEE RE'09; see [Wikipedia](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax) & [Kiro Blog](https://kiro.dev/blog/deep-spec-analysis/)) | Constrains prose with a minimal set of clause keywords (`WHEN`, `WHILE`, `IF...THEN`, `WHERE`, `SHALL`) that map cleanly onto logical implications (`antecedent => consequent`). |
| **AWS internal evaluation: ~60% of first-draft requirements needed refinement before safe implementation** | Trade coverage & technical reviews citing AWS Kiro internal testing (see [Specira Analysis](https://www.specira.ai/blog/specs-are-the-problem) and [Stepto 2026 Review](https://stepto.net/blog/ai-formal-verification-vericoding-specifications-2026)) | Across **35 internal AWS projects** covering **>1,400 acceptance criteria**, roughly **60%** of first-draft requirements required refinement prior to code generation. |
| **Independent academic corroboration: ambiguity drives functional divergence across runs and models** | [*Orchid Benchmark (2026)*](https://arxiv.org/html/2604.21505v3) (arXiv:2604.21505) & [*ClarifyCodeBench (2026)*](https://arxiv.org/html/2607.00711v2) (arXiv:2607.00711) | Unlike humans who clarify iteratively during coding, LLMs are forced to make single-pass implicit bets that harden into architectural debt. |

## 2. Before SMT vs. After SMT: How Specifications and Workflows Change

Without formal verification, even teams practicing Spec-Driven Development routinely ship `requirements.md` files that read smoothly to a human reviewer while containing fatal logical flaws for an autonomous agent.

Drawing on systems engineering standards (such as INCOSE's *Guide to Writing Requirements*), the [Kiro engineering post](https://kiro.dev/blog/deep-spec-analysis/) groups requirement bugs into four classes—**wrong level of detail, ambiguity, inconsistency, and incompleteness**—and defines five domain-independent properties every sound specification must satisfy: **Testable, Solution-free, Unambiguous, Consistent, and Complete**.

### 2.1 Before SMT: How Specs Are Typically Written

Using the two flagship examples from the talk and the [Kiro blog](https://kiro.dev/blog/deep-spec-analysis/)—**Delete Property** and **Order Processing**—here is what a typical first-draft specification looks like (even when already using EARS notation):

```markdown
### First-Draft Spec (Before SMT — Reads Cleanly, Hides Four Classes of Bugs)

**Scenario A: Delete Property**
- AC1: WHEN a Property Owner initiates property deletion, THE Platform SHALL prompt for confirmation before proceeding.
- AC2: WHEN a Property Owner confirms deletion, THE Platform SHALL remove the Property record from the Platform.
- AC3: WHEN a Property is deleted, THE Platform SHALL display a confirmation message and redirect to the properties list.
- AC4: THE Platform SHALL implement soft deletion to retain Property records in the database for audit purposes while hiding them from the user interface.
- AC5: WHEN a Property Owner attempts to delete a Property that does not belong to their User Account, THE Platform SHALL deny the deletion and display an authorization error message.

**Scenario B: Order Processing**
- R1: WHEN an order is submitted AND inventory is available, THE Order System SHALL fulfill the order.
- R2: WHEN an order is submitted AND inventory is not available, THE Order System SHALL place the order on backorder.
- R3: THE Order System SHALL NOT place any order on backorder.
- R4: WHEN an order is canceled, THE Order System SHALL refund all payments associated with the order.
- R5: WHILE an order is in a canceled-and-refunded state, THE Order System SHALL NOT fulfill the order.
```

Read sentence by sentence, nothing jumps off the page. Handed to a coding agent, however, four defects immediately trigger silent failures:

1. **Single-Sentence Ambiguity**: Does `"remove the record"` in AC2 mean hard-deleting the data or soft-deleting (retaining it for audit while hiding it from users)?
2. **Cross-Rule Inconsistency**: AC2 implies removal while AC4 requires retention. R2 mandates backordering on unavailable inventory while R3 globally forbids backorders. More subtly, if a canceled-and-refunded order is re-submitted (`order_submitted`), **R1 contradicts R5** when inventory is available, and **R2 contradicts R3** when inventory is unavailable—leaving *zero* valid implementations across all inventory states.
3. **Wrong Level of Detail & EARS Misuse**: AC4 leaks implementation mechanics (`"implement soft deletion"`, `"in the database"`) instead of observable behavior; AC5 uses `WHEN` (reserved for nominal events in EARS) instead of `IF...THEN` (reserved for error conditions).
4. **Completeness Gaps**: What if the property does not exist? What if it has active leases? What if the owner cancels the confirmation dialog? What should the Order System do when an order sits in an `Idle` state with neither submit nor cancel events firing?

### 2.2 After SMT: How the Spec and Workflow Transform

Adopting SMT does **not** mean forcing product managers or engineers to author raw first-order logic. In AWS Kiro's workflow, **humans still read and write natural-language EARS specs while SMT formalization stays under the hood**, yet both the specification and the review loop change fundamentally:

1. **Refined, Solution-Free EARS Structure**:
   * Thesis-level statements and implementation recipes are stripped out so every criterion binds explicit inputs, states, and triggers to observable outputs.
   * Nominal triggers (`WHEN`), state invariants (`WHILE`), ubiquitous rules (`THE ... SHALL`), and error paths (`IF ... THEN`) are strictly separated.
   * Missing error and cancellation branches are surfaced via backward abductive reasoning from the user story's success state.
2. **A Three-Part Formal Model Maintained Behind the Scenes**:
   * **Formal Schema**: Declares entities, attributes, events, inputs, and outputs, each linked back to source prose.
   * **Rule Assertions**: Encodes every EARS rule as an implication `antecedent => consequent`.
   * **Background Axioms**: Explicitly captures implicit domain truths (e.g., `duration >= 0`, an order cannot be canceled before submission, a refunded payment cannot be refunded twice) so the solver does not flag impossible states.
3. **Uniform Two-Option Clarification Loop (A/B Decisions)**:
   * Every ambiguity, conflict, gap, or surprising scenario is translated back into a concise two-choice question: **Option A always keeps the requirement as-is; Option B applies a concrete proposed revision**.

Here is the exact **After-SMT** counterpart for both scenarios above—Scenario A mirrors the eight refined acceptance criteria published in the [Kiro blog](https://kiro.dev/blog/deep-spec-analysis/), while Scenario B shows the conflict-free, gap-closed Order Processing spec after resolving `{R2, R3}`, `{R1, R5}`, the `Idle` gap, and background axioms:

```markdown
### Revised Spec (After SMT — Testable, Solution-Free, Logically Consistent & Complete)

**Scenario A: Delete Property**
- AC1 [UNCHANGED]: WHEN a Property Owner initiates property deletion, THE Platform SHALL prompt for confirmation before proceeding.
- AC2 [AMENDED — resolves "remove" ambiguity & AC4 conflict]: WHEN a Property Owner confirms deletion, THE Platform SHALL mark the Property record as deleted such that it is no longer visible in any user-facing view.
- AC3 [UNCHANGED]: WHEN a Property is deleted, THE Platform SHALL display a confirmation message and redirect to the properties list.
- AC4 [AMENDED — removes "soft deletion/database" implementation leak]: WHEN a Property record is marked as deleted, THE Platform SHALL retain the record for admin/audit access while excluding it from all user-facing views.
- AC5 [AMENDED — switches error condition to IF-THEN]: IF the Property does not belong to the requesting Property Owner's User Account, THEN THE Platform SHALL reject the deletion and display an authorization error.
- AC6 [ADDED — closes business precondition gap]: IF the Property has active leases, THEN THE Platform SHALL reject the deletion and indicate active leases exist.
- AC7 [ADDED — closes missing-entity gap]: IF the Property does not exist, THEN THE Platform SHALL display a not-found error.
- AC8 [ADDED — closes cancel-flow gap]: WHEN a Property Owner cancels the confirmation prompt, THE Platform SHALL abort deletion and return to the previous view.

**Scenario B: Order Processing (Post Human A/B Clarification Decisions)**
- R1 [AMENDED — scopes precondition to eliminate {R1, R5} conditional conflict]: WHEN an order in Pending state is submitted AND inventory is available, THE Order System SHALL transition the order to Fulfilled and fulfill the order.
- R2 [AMENDED — human resolved {R2, R3} conflict in favor of rejecting out-of-stock orders]: WHEN an order in Pending state is submitted AND inventory is not available, THE Order System SHALL reject the submission and notify the customer of insufficient inventory.
- R3 [KEPT — ubiquitous invariant now consistent with R2]: THE Order System SHALL NOT place any order on backorder.
- R4 [AMENDED — scopes valid states for cancellation]: WHEN an order in Pending or Fulfilled state is canceled, THE Order System SHALL transition the order to Canceled and refund all payments associated with the order.
- R5 [AMENDED — explicitly rejects re-submission of canceled-and-refunded orders]: IF a submission is attempted WHILE an order is in a Canceled-and-refunded state, THEN THE Order System SHALL reject the submission and SHALL NOT fulfill the order.
- R6 [ADDED — closes Idle state completeness gap]: WHILE an order is in Idle state with no submit or cancel event, THE Order System SHALL keep the order unchanged in Idle state without emitting fulfillment or refund actions.

**Background Domain Axioms (Maintained Under the Hood or Auditable)**
- Axiom 1: An order occupies exactly one mutually exclusive state in {Idle, Pending, Fulfilled, Canceled}.
- Axiom 2: An order cannot be canceled before it has been created/submitted.
- Axiom 3: A payment that has already been refunded cannot be refunded a second time.
```

The side-by-side contrast makes the shift concrete: the compact first draft silently delegated at least six consequential product decisions to the coding agent's guesswork, whereas the After-SMT specification locks down every conflict core (`{R2, R3}`, `{R1, R5}`) and uncovered state before a single line of code is written.

| Dimension | Before SMT (Conventional SDD) | After SMT (Neuro-Symbolic SDD) |
| ----- | ----- | ----- |
| **Spec Artifact** | Free-form Markdown or first-draft EARS mixing behavior with implementation details | Refined, testable EARS backed by an SMT-LIB schema, rule assertions, and domain axioms |
| **When Bugs Surface** | After code generation, integration testing, or production regressions | Before design and coding—pure text edits at near-zero cost |
| **Handling Ambiguity** | Agent silently guesses one interpretation and bakes it into code | Multi-sample logical-equivalence clustering computes semantic entropy and asks A/B questions |
| **Multi-Rule Interaction** | Manual design review; subtle interactions across 5+ rules easily slip through | Exhaustive solver checks surface minimal UNSAT cores and concrete coverage-gap models |
| **Division of Labor** | Humans write vague prose; the LLM acts as translator, judge, and coder | **The LLM translates, the solver checks, and the human decides** |

## 3. Under the Hood: How SMT Solvers Actually Work

### 3.1 From SAT to SMT

* **SAT (Boolean Satisfiability)**: Given a propositional formula over Boolean variables (`true`/`false`) connected by `AND`, `OR`, and `NOT`, ask: *does there exist an assignment that makes the formula true?* If yes, return `sat` with a concrete assignment (**Model**); if impossible, return `unsat`.
* **SMT (Satisfiability Modulo Theories)**: Real software specs involve more than Booleans—they rely on **linear integer/real arithmetic** (`balance >= withdraw_amount`), **enums and algebraic datatypes** (`Idle | Pending | Fulfilled | Canceled`), **strings**, **arrays**, and **bit-vectors**. SMT extends SAT by coupling the Boolean core with specialized first-order **Theory Solvers** for each data domain.

### 3.2 Inside Modern Solvers: CDCL(T)

Industrial SMT solvers such as Microsoft Research's [Z3](https://github.com/z3prover/z3) and Stanford/Iowa's [cvc5](https://github.com/cvc5/cvc5) use **CDCL(T)** (Conflict-Driven Clause Learning modulo Theories), a tight two-layer loop:

1. **Boolean Abstraction**: Replace every domain predicate (e.g., `inventory > 0`, `order_state == Canceled`) with a Boolean placeholder variable ($p_1, p_2, \dots$).
2. **SAT Search & Propagation**: The SAT core searches for a truth assignment that satisfies the propositional skeleton.
3. **Theory Solver Validation**: The assigned predicates are handed to domain theory solvers (e.g., arithmetic detects that $x > 5$ and $x < 3$ cannot hold together).
4. **Conflict-Driven Learning**: Whenever a theory conflict occurs, the theory solver returns a blocking lemma (learned clause) to the SAT core, pruning entire regions of the search tree until a valid `sat` model is found or `unsat` is proven.

In specification analysis, three SMT queries do the heavy lifting:

* **Consistency (Conflict Detection)**: Assert all rules (`R1 ∧ R2 ∧ ... ∧ Rn`) plus a rule's trigger condition. If `unsat`, enable `produce-unsat-cores` to extract the **minimal conflicting rule subset** (e.g., `{R2, R3}` or `{R1, R5}`).
* **Completeness (Gap Detection)**: Assert the negation of every trigger antecedent (`¬ant(R1) ∧ ¬ant(R2) ∧ ...`). If `sat`, the returned model (e.g., `order_state = Idle, order_submitted = false, order_canceled = false`) is a concrete **coverage-gap counterexample**.
* **Logical Equivalence**: Given two candidate formalizations $F_1$ and $F_2$, test satisfiability of $F_1 \neq F_2$. Returning **`unsat`** mathematically proves $F_1 \equiv F_2$ across all inputs; returning **`sat`** yields a **Semantic Diff witness** pinpointing the exact scenario where the two readings diverge.

### 3.3 AWS Kiro's Three-Stage Neuro-Symbolic Pipeline & Semantic Entropy Clustering

Translating a spec once with an LLM and checking it with SMT has a critical flaw: **on an ambiguous sentence, an LLM will quietly commit to one internally consistent reading, and the solver will report "consistent" while the other valid reading disappears.**

The standout contribution in Kotyal's talk (`01:55:00–01:55:40`) and the [Kiro blog](https://kiro.dev/blog/deep-spec-analysis/) is turning LLM non-determinism into a precision ambiguity sensor:

1. **Stage 1 — Abductive Refinement**: An LLM works backward from the user story's success state to surface missing prerequisites and error paths, strip implementation language, and normalize EARS clauses.
2. **Stage 2 — Auto-Formalization & Semantic Entropy Clustering**:
   * Sample **7–10 independent SMT-LIB2 translations** of each acceptance criterion.
   * Cluster candidates by **SMT logical equivalence** rather than surface text similarity (different variable names or clause ordering collapse into one cluster if logically identical).
   * Compute **Semantic Entropy** across clusters and route by two thresholds (`low_entropy`, `high_entropy`):
     * **Below `low_entropy`**: High agreement—accept the majority cluster representative.
     * **Above `high_entropy`**: Severe divergence / likely hallucination—**abstain** and ask to reformulate the requirement.
     * **Between thresholds (Medium Entropy)**: Two or more coherent, mutually exclusive interpretations exist (e.g., hard delete vs. soft delete). Compute the SMT **Semantic Diff** between the top two clusters and translate that counterexample into an A/B clarification question.
3. **Stage 3 — Logical Analysis & Scenario Simulation**:
   * Run consistency (including multi-rule case splits) and completeness checks over the formalized model.
   * Sample concrete **Accepted Scenarios** and **Rejected Scenarios** directly from the model ("simulating the specification") and filter them through an **LLM Judge** to surface only surprising behaviors for human sign-off.

> **Crucial Boundary**: As Kotyal candidly emphasized at the close of his talk, **there is no automatic oracle for specification correctness other than the human author**. A mathematically consistent, complete spec can still specify the wrong product, and capturing implicit domain knowledge remains an active frontier. SMT automates everything checkable by logic so humans can spend their attention on the few decisions that genuinely require business judgment.

## 4. Open-Source Ecosystem & Runnable SMT-LIB2 / Python Z3 Examples

### 4.1 Open-Source Projects Worth Studying and Integrating

While Kiro's built-in Requirements Analysis is a commercial feature, the underlying solvers, standards, and several official AWS neuro-symbolic sample repositories are open source:

| Repository | Maintainer | Engineering Value |
| ----- | ----- | ----- |
| [**Z3Prover/z3**](https://github.com/z3prover/z3) | Microsoft Research | The de facto open-source SMT solver (MIT License) supporting SMT-LIB2 with Python (`pip install z3-solver`), WebAssembly/TypeScript (`z3-solver` on npm), and C++/Java bindings. |
| [**cvc5/cvc5**](https://github.com/cvc5/cvc5) | Stanford / U. of Iowa | Modern open-source SMT solver excelling at strings, sequences, and algebraic datatypes, with multi-language bindings including [`cvc5/cvc5-rs`](https://github.com/cvc5/cvc5-rs). |
| [**aws-samples/sample-automated-reasoning-formalization (ARchitect)**](https://github.com/aws-samples/sample-automated-reasoning-formalization) | AWS Samples | Official AWS desktop sample combining Kiro CLI and Amazon Bedrock Automated Reasoning APIs so non-technical domain experts can formalize and test policy documents. |
| [**aws-samples/amazon-bedrock-samples (`automated-reasoning-rewriting-chatbot`)**](https://github.com/aws-samples/amazon-bedrock-samples/blob/main/responsible_ai/automated-reasoning-rewriting-chatbot/README.md) | AWS Samples | End-to-end neuro-symbolic rewrite loop (Python Flask + React) iterating on LLM outputs with Bedrock Automated Reasoning feedback and verifiable audit logs. |
| [**cedar-policy/cedar-spec**](https://github.com/cedar-policy/cedar-spec) | AWS | Formal Lean specification, differential testing, and property-based test generators for AWS's Cedar authorization language—a gold-standard reference for policy DSL verification. |
| [**model-checking/kani**](https://github.com/model-checking/kani) | AWS | Bit-precise open-source Rust model checker (co-maintained/reviewed by Rajath Kotyal), illustrating seamless CI integration of formal verification. |
| [**dafny-lang/dafny**](https://github.com/dafny-lang/dafny) | Microsoft / AWS Community | Verification-aware language compiling preconditions, postconditions, and invariants into SMT-LIB for Z3 while targeting Go, Python, Java, C#, or JS. |

### 4.2 Snippet 1: Native SMT-LIB2 Reproducing the Order Conflicts & Idle Gap

Save as `order_spec.smt2` and run `z3 order_spec.smt2` (or `cvc5 order_spec.smt2`) to reproduce all three logical findings from the talk:

```lisp
; order_spec.smt2 — Reproducing AWS Kiro's 5-rule Order Processing analysis
(set-option :produce-unsat-cores true)
(set-logic QF_DT) ; Quantifier-free logic with algebraic datatypes

; 1. Schema declarations (events, state, outputs)
(declare-datatypes () ((OrderState Idle Submitted Canceled)))

(declare-const order_submitted Bool)
(declare-const order_canceled Bool)
(declare-const inventory_available Bool)
(declare-const order_state OrderState)

(declare-const order_fulfilled Bool)
(declare-const order_backordered Bool)
(declare-const payments_refunded Bool)

; 2. Rule assertions (named for UNSAT core extraction)
; R1: WHEN submitted AND inventory_available => fulfill
(assert (! (=> (and order_submitted inventory_available) order_fulfilled) :named R1))
; R2: WHEN submitted AND NOT inventory_available => backorder
(assert (! (=> (and order_submitted (not inventory_available)) order_backordered) :named R2))
; R3: SHALL NOT place any order on backorder
(assert (! (not order_backordered) :named R3))
; R4: WHEN canceled => refund all payments
(assert (! (=> order_canceled payments_refunded) :named R4))
; R5: WHILE canceled-and-refunded => SHALL NOT fulfill
(assert (! (=> (and (= order_state Canceled) payments_refunded) (not order_fulfilled)) :named R5))

; --- Check A: Direct conflict (trigger R2's antecedent) ---
(push)
(assert (and order_submitted (not inventory_available)))
(check-sat)        ; Output: unsat
(get-unsat-core)   ; Output minimal conflicting set: (R2 R3)
(pop)

; --- Check B: Conditional conflict (re-submitting a canceled-and-refunded order) ---
(push)
(assert (and (= order_state Canceled) payments_refunded order_submitted))
(check-sat)        ; Output: unsat (conflicts on {R1, R5} or {R2, R3} regardless of inventory)
(get-unsat-core)   ; Output conflict core
(pop)

; --- Check C: Completeness gap (no triggered rule applies) ---
(push)
(assert (not (and order_submitted inventory_available)))              ; not R1 antecedent
(assert (not (and order_submitted (not inventory_available))))        ; not R2 antecedent
(assert (not order_canceled))                                        ; not R4 antecedent
(assert (not (and (= order_state Canceled) payments_refunded)))      ; not R5 antecedent
(check-sat)        ; Output: sat (completeness gap proven!)
(get-model)        ; Concrete counterexample, e.g. order_state = Idle, order_submitted = false, order_canceled = false
(pop)
```

### 4.3 Snippet 2: Python `z3-solver` Reproducing Multi-Sample Logical-Equivalence Clustering

Install `pip install z3-solver` and run this ~60-line script to reproduce the talk's core ambiguity detector—clustering syntactically different LLM formalizations by logical equivalence and extracting a Semantic Diff counterexample:

```python
import math
from z3 import Bool, And, Not, Solver, sat, unsat

# Shared schema variables for the Delete Property requirement
confirmed = Bool("owner_confirmed_deletion")
record_exists_in_db = Bool("record_exists_in_db")
visible_to_user = Bool("visible_to_user")
visible_to_admin = Bool("visible_to_admin")

# Simulated 6 LLM samples for "WHEN Owner confirms deletion, Platform SHALL remove the record"
# Despite syntactic differences (clause order), only 2 logical meanings exist: hard delete vs. soft delete
samples = [
    ("sample_1", And(confirmed, Not(record_exists_in_db), Not(visible_to_user), Not(visible_to_admin))),
    ("sample_2", And(Not(visible_to_admin), Not(visible_to_user), Not(record_exists_in_db), confirmed)),
    ("sample_3", And(confirmed, record_exists_in_db, Not(visible_to_user), visible_to_admin)),
    ("sample_4", And(confirmed, Not(visible_to_user), record_exists_in_db, visible_to_admin)),
    ("sample_5", And(confirmed, Not(record_exists_in_db), Not(visible_to_user), Not(visible_to_admin))),
    ("sample_6", And(visible_to_admin, record_exists_in_db, Not(visible_to_user), confirmed)),
]

def are_logically_equivalent(f1, f2) -> bool:
    """Strictly verify logical equivalence across all possible inputs using Z3."""
    s = Solver()
    s.add(f1 != f2)
    return s.check() == unsat

def semantic_diff_witness(f1, f2):
    """Extract a concrete counterexample where two clusters disagree (for A/B question generation)."""
    s = Solver()
    s.add(f1 != f2)
    if s.check() == sat:
        return s.model()
    return None

# 1. Cluster samples by logical equivalence
clusters = []
for name, formula in samples:
    placed = False
    for cluster in clusters:
        if are_logically_equivalent(cluster[0][1], formula):
            cluster.append((name, formula))
            placed = True
            break
    if not placed:
        clusters.append([(name, formula)])

# 2. Compute Semantic Entropy
total = len(samples)
entropy = -sum((len(c) / total) * math.log2(len(c) / total) for c in clusters)
print(f"Clusters: {len(clusters)} | Semantic Entropy H = {entropy:.3f} bits")
for idx, c in enumerate(clusters, 1):
    print(f"  Cluster {idx} ({len(c)}/{total}): {[item[0] for item in c]}")

# 3. Medium entropy detected -> compute Semantic Diff witness between top two clusters
if len(clusters) >= 2:
    clusters.sort(key=len, reverse=True)
    witness = semantic_diff_witness(clusters[0][0][1], clusters[1][0][1])
    print("\nSemantic ambiguity detected! SMT counterexample (Semantic Diff):")
    print(witness)
    # Shows that when confirmed=True, the two clusters disagree on record_exists_in_db & visible_to_admin
    # An LLM translates this witness into a concise A/B question for the human author.
```

## 5. Four Architectural Supplements for `co-arising` (`truthsrc`)

Evaluating AWS Kiro's Specification Analyzer through the lens of **`co-arising` (`truthsrc`)** reveals an encouraging structural advantage: **`co-arising` actually starts from a stronger, more SMT-friendly foundation than prose-first SDD tools.**

In `co-arising`'s current architecture:

* **Deterministic Toolchain**: `truthsrc` single-line micro-grammar & M1/M2/M3 macro expansion → Canonical JSON compilation → Neo4j/SQLite knowledge graph → deterministic AST/topology validator (checking orphan domain events, cross-Bounded-Context references, missing Saga compensations) → Context Pack slicing → deterministic Scala/Akka (Event Sourcing + CQRS + Saga) skeleton codegen → `@CoArisingNode` bidirectional anchoring and `PreToolUse` / `Stop (exit 2)` hard gates.
* **Cognitive Skills & Subagents**: `domain-interview` (Socratic reverse interview), `cloze-fill` (implementation inside isolated handwritten zones), `brownfield-miner`, and `contract-reviewer`.

While `co-arising` already solves **architecture drift, topological breaks, and context rot**, it currently leaves an open high-leverage gap around **predicate-level logical soundness and explicit domain axioms**. Here are four concrete supplements:

### Supplement 1: Add a Deterministic Logical Pass to the Toolchain (`truthsrc-smt` Backend)

* **Current Gap**: `co-arising`'s deterministic validator checks syntax and graph topology (e.g., whether an event has a subscriber or a Saga has a compensation step), but does not verify whether two `Guard` predicates contradict each other or whether a branch is unreachable.
* **Structural Advantage**: AWS Kiro relies on probabilistic LLM translation from English/EARS into SMT-LIB, paying a recurring translation and sampling cost. Because `truthsrc` is already a typed, structured micro-grammar with explicit `Qualified Ref`, `Guard`, `Binding`, `Fold`, and `Parameter` constructs, **compiling `truthsrc` ASTs to SMT-LIB2/Z3 can be largely deterministic rather than probabilistic.**
* **Concrete Checks** (added as a compiler pass inside `metarch-truthsrc` and enforced via the `Stop` hook):
  1. **Dead Guard Detection**: Flag any `Guard` whose conjunction with domain axioms is `unsat`.
  2. **Rule Conflict Detection**: When multiple transitions/policies share a trigger command or event, check whether overlapping `Guard` conditions emit conflicting effects and report the exact **UNSAT Core**.
  3. **State Coverage Gaps**: Across an Aggregate's enum states and key attributes, test whether `¬Guard_1 ∧ ¬Guard_2 ∧ ...` is `sat` to surface unhandled state combinations before generating Scala/Akka code.

### Supplement 2: Upgrade `domain-interview` with Semantic-Entropy Clustering & First-Class `Axiom` Blocks

* **Current Gap**: As a cognitive Skill, `domain-interview` currently relies on prompt-driven Socratic questioning, which can over-ask obvious questions while missing subtle rule ambiguities.
* **Upgrade Path**:
  1. When a domain expert describes complex rules in prose (e.g., partial-failure refund semantics in `bank batch transfer` or scheduling priorities in `fab simulation`), run **5–7 lightweight formalization samples + Z3 equivalence clustering** before emitting `truthsrc`.
  2. Ask the user **A/B binary questions** only on medium-entropy forks and SMT-simulated surprising scenarios, dramatically improving interview signal-to-noise ratio.
  3. **Capture the "Dark Matter" of Requirements**: Introduce an explicit **`Axiom` / `Invariant` section** in `truthsrc` (e.g., batch transfer total equals sum of line items; a reversed transaction cannot be reversed twice) so implicit domain knowledge uncovered during `domain-interview` becomes a durable, versioned artifact that feeds every future SMT regression check.

### Supplement 3: Synthesize Boundary `Given-When-Then` Tests Directly from SMT Models

* **Current Gap**: During `cloze-fill`, AI agents implement business logic inside isolated handwritten zones, where LLM-written unit tests tend to skew toward happy paths.
* **Upgrade Path**: Every `sat` model returned by Z3 for `Accepted Scenarios`, `Rejected Scenarios`, and `Guard` boundary conditions is already a mathematically valid input vector. The deterministic toolchain can compile those models directly into Scala/Akka Event Sourcing **`Given` (prior event history / aggregate state) → `When` (command + parameters) → `Then` (expected domain events or rejection)** test harnesses—locking `cloze-fill` and `contract-reviewer` inside a mathematically grounded verification cage.

### Supplement 4: Bounded Model Checking for Saga Compensations & Cross-Aggregate Invariants

* **Where `co-arising` Goes Beyond Single-Doc SDD**: AWS Kiro's Requirements Analysis currently focuses on static logical consistency within a `requirements.md` file. `co-arising`'s signature strength is distributed domain orchestration via **Event Sourcing + CQRS + Saga (backward compensation) / Monarch (forward recovery)**.
* **High-Leverage Next Step**: For `bank-wealth-demo` and upcoming `bank batch transfer` / `fab simulation` demos, unroll `truthsrc` Saga state machines into a $k$-step bounded SMT transition system:
  * Automatically verify: *"If step $i$ times out or fails downstream and triggers compensation, do global ledger/inventory conservation invariants still hold across all participating aggregates (no funds created or lost, no resource deadlock)?"*
  * Whenever a counterexample exists, Z3 emits an exact step-by-step failure trace before the first line of Akka coordination code is written.

## Closing Thought: From Architecture Compiler to Neuro-Symbolic Domain Verification Engine

AWS Automated Reasoning Group's core lesson for AI Coding in 2026 is clear: **you cannot patch probabilistic natural-language ambiguity with yet more natural-language prompts—you have to put a deterministic mathematical reasoning engine at the very front of the pipeline.**

For `co-arising`, this fits like a missing keystone rather than a rewrite: `truthsrc` has already distilled domain behavior into a compact, structured micro-grammar. Pairing that deterministic AST with a Z3/SMT-LIB2 compiler pass—and upgrading `domain-interview` with semantic-entropy A/B clarification—elevates `co-arising` from an **architecture and cognitive compiler** into a **neuro-symbolic domain verification engine** that proves business rules are unambiguous, conflict-free, and complete before a single line of code is generated.
