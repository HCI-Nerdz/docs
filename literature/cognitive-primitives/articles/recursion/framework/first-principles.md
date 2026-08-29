# Recursion

## What it is

Start with what a normal function call already does. When function `f` calls function `g`, the processor saves enough state to resume `f` later: where to continue, what the arguments were, and space for local variables. That saved state lives in a stack frame on the thread's call stack—a fixed-size region of memory associated with the thread, typically on the order of one to eight megabytes depending on platform and configuration.

Recursion is the case where `f` calls `f` again instead of calling a different function. Nothing new is required at the hardware level beyond the call and return instructions already used for any call. The difference is semantic: the callee has the same name and usually the same problem shape, applied to strictly smaller or simpler input until a base case stops further calls.

A recursive function therefore has two mandatory pieces. The base case is a branch that returns without self-call—empty input, zero count, leaf node. The recursive case is a branch that decomposes the input, calls self on a reduced instance, and combines results. If every recursive path reduces the problem and every path eventually hits the base case, the stack of frames is finite and execution completes.

Cognitively, recursion is the habit of describing wholes via parts of the same kind. It is natural when the domain is hierarchical; it is awkward when the domain is a flat sequence better indexed by position.

## Why it exists

Finite stack memory plus sequential execution already implement nested suspension of work. Recursion exploits that existing mechanism rather than inventing a second storage scheme for "jobs waiting on subjobs." For tree-structured data, depth-bounded nesting of frames aligns with depth-bounded nesting of nodes along a root-to-leaf path.

From first principles, you could always rewrite recursion as iteration plus an explicit stack in heap memory: push simulated frames yourself, pop when done. That is equivalent in expressive power for single-threaded programs with well-founded recursion. Recursion wins on brevity when the problem's inductive definition matches the language's call mechanism—list as head plus tail, tree as root plus subtrees.

Languages expose recursion because the semantics of function call already close over self-reference: the function name is in scope inside its body. No special runtime opcode labeled "recurse" is needed. The cognitive payoff for programmers is alignment between mathematical induction ("define f(n) in terms of f(n−1)") and executable code.

## How it works

Build upward from one call. Frame 0: entry with argument `x`. Test base predicate on `x`. If true, load return value into the register designated by the calling convention and execute return; stack pointer moves back, discarding frame 0.

If false, compute reduced argument `x'` from `x` using a finite amount of work—O(1) or O(k) relative to the size of the reduction step, not unbounded. Execute call instruction: push frame 1, jump to entry with `x'`. Frame 0 is frozen at the instruction after the call site.

Repeat until some frame k satisfies the base predicate. Frame k returns value `v_k` without further self-calls. Frame k−1 resumes; its epilogue may combine `v_k` with local state and either return to frame k−2 or issue another self-call for a second subproblem (common in binary trees: left then right).

Termination proof sketch: define a measure on inputs that decreases on every recursive call—length, size, ordinal rank—and is bounded below by base inputs. Frame count along any single activation chain is bounded by that measure plus one. Total work may still be exponential if the same subproblem is invoked from many frames without sharing.

Tail position: if the self-call is the final action and its return value is passed through unchanged, a optimizing compiler may transform the pattern into a jump with updated arguments—constant stack depth, same logical recursion. Without optimization, depth equals chain length.

## Tradeoffs and failure modes

Stack is finite; heap is larger but not free. Deep linear recursion—processing a million-node list by "rest = tail(list)" recursion—uses O(n) frames and typically overflows despite O(n) total work if rewritten iteratively in O(1) stack space.

Non-termination: base case omitted, guard wrong, or reduction step that does not strictly progress—`f(n)` calling `f(n)`— yields unbounded frame push until stack guard page faults.

Work duplication: independent recursive branches revisiting identical subinputs—Fibonacci without memo—are a separate complexity issue from stack depth; CPU time blows up even when depth is modest.

Human cognition: simulating k frozen frames requires holding k contexts or externalizing via debugger. Iteration collapses context to one frame with explicit variables—often easier to audit for off-by-one errors in flat domains.

Security and robustness: untrusted input controlling depth can be a denial-of-service vector against fixed stacks; iterative or trampolined solutions with depth limits are engineering responses, not changes to the definition of recursion.

## One concrete walkthrough

Problem: determine whether a linked list contains a value `target`, defined inductively.

Base: empty list (null pointer) → false. Single-step reduction: non-empty list → compare head to `target`; if equal, true; else recurse on tail pointer.

Trace list `[2, 5, 5, null]`, target `5`.

Frame 0: head 2 ≠ 5 → call on tail `[5,5,null]`.

Frame 1: head 5 = 5 → return true without tail call.

Frame 0 resumes after call; receives true; returns true to its caller.

Maximum depth: 2 frames. If target were absent, recursion would walk until frame at null hits base false, then each frame above would propagate false after exhausting its tail call—depth equals list length in the worst case, illustrating the stack-cost tradeoff on long lists.

First-principles reading: each frame is a saved PC and locals proving "I am waiting on the answer for the rest of the list." The base case is the axiom step of the induction; the recursive case is the inductive step made executable. Understanding recursion is understanding that the machine already had stacks; self-call is just another callee address equal to the current function's entry.
