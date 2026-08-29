# Recursion

## What it is

Recursion is a way to solve a problem by splitting it into a smaller problem of the same type.

A function can call itself. Each call is a separate activation with its own inputs and local variables.

The pattern requires a base case. The base case is the smallest input where the function returns an answer without calling itself again.

## Why it exists

Some structures repeat at smaller scales. Lists, trees, and nested directories are common examples.

Matching code shape to data shape reduces bookkeeping. The programmer does not need a manual list of pending subtasks in many cases.

The call stack stores pending calls automatically. Each unfinished call waits on the stack until inner calls finish.

Humans often describe nested things recursively in speech. "A folder contains folders" is an everyday recursive sentence. Programming recursion formalizes that pattern for machines.

Iteration solves many of the same problems with a loop and explicit state. Recursion is not always shorter or faster. It is often clearer when the problem is naturally hierarchical.

## How it works

Execution begins in the first call. That call checks whether the input matches the base case.

If yes, it returns a result immediately. No further calls occur for that branch.

If no, it performs a small step of work. Then it calls itself with reduced input. Reduced means strictly closer to the base case.

The runtime pushes a stack frame for each call. A stack frame holds return address, parameters, and local variables.

The deepest call hits the base case first. It returns to its caller. The caller combines the returned value with its own partial work.

Returns propagate upward until the original call receives a final result. Order is last-called, first-returned.

Depth equals the number of nested calls along one path. Depth is bounded by stack size on typical systems.

Memoization is an optional technique. It stores results of completed subcalls in a table. Later calls read the table instead of opening new frames for the same input.

## Tradeoffs and failure modes

Stack overflow occurs when recursion depth exceeds available stack memory. Correct logic can still overflow on large inputs.

Infinite recursion occurs when every call leads to another call with no base case reached. The stack grows until overflow.

Redundant subcalls recompute the same reduced problem many times. Memoization stores results to avoid repeat work.

Recursive code can be harder to read than an equivalent loop. The reader must track multiple stack frames mentally.

Debugging uses stack traces. Each line in the trace is one frame. Deep traces are tedious to inspect.

Tail recursion places the recursive call as the final action. Some compilers optimize tail calls to constant stack depth.

Mutual recursion uses two functions calling each other. The stack behavior is the same; the mental model adds function names.

Concurrent programs add another constraint. Each thread has its own stack. Recursive calls on one thread do not share frames with another thread.

## One concrete walkthrough

Goal: sum the integers from 1 through n using recursion.

Define sum(n). Base case: if n is 0, return 0. Recursive case: return n + sum(n − 1).

Run sum(3).

Call sum(3). n is not 0. Compute 3 + sum(2). Call sum(2) before adding.

Call sum(2). Compute 2 + sum(1). Call sum(1).

Call sum(1). Compute 1 + sum(0). Call sum(0).

Call sum(0). Base case. Return 0.

sum(1) receives 0. Returns 1 + 0 = 1.

sum(2) receives 1. Returns 2 + 1 = 3.

sum(3) receives 3. Returns 3 + 3 = 6.

Four stack frames existed at the deepest point: sum(3), sum(2), sum(1), sum(0). Only sum(0) ran to completion before others resumed.

The final answer is 6. The same result as the formula n(n+1)/2, but the recursive path shows push-down to zero and pull-up with additions.

Compare this trace to an iterative version. A loop would keep one variable i and one accumulator total. Each iteration adds i and increments until i exceeds n. There is only one stack frame throughout.

The recursive version uses one frame per value of n until zero. Both approaches perform n additions. The recursive version trades stack space for clarity of definition.

Cognitively, tracing sum(3) means holding "waiting for inner sum" three times, then releasing in reverse. Short sequential steps match how working memory handles one frame at a time if you do not skip ahead.

When learning recursion, writing the base case first reduces load. You anchor on the smallest answer before adding the self-call. When reading unfamiliar recursive code, identify the base case before simulating the stack.

Graph traversal can reuse the same pattern with a visited set. The set prevents revisiting nodes on cycles. Without it, recursion on cyclic graphs never reaches a stable base case.
