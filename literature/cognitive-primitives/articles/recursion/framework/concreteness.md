# Recursion

## What it is

Recursion is when a function solves a problem by calling itself on a smaller piece of the same problem. Picture a stack of index cards on a desk. Each card belongs to one function call. The top card is the call that is running right now. When the function calls itself, you place a new card on top. When a call finishes, you remove its card and read the answer written on it.

The function always includes a stopping rule called the base case. When the input is small enough—zero items, one node, an empty list—the function writes the answer on the current card and stops calling itself. Without that stopping rule, the stack of cards would grow until there is no desk space left. That failure is a stack overflow.

Recursion describes both the code pattern and a way humans parse nested structure. A folder inside a folder inside a folder is the same shape at each level. The mind can count three folders without simulating a machine, but when you debug recursive code you are literally counting stack frames in a debugger window.

## Why it exists

Many data shapes are built from repeated parts. A linked list is one cell pointing to another list. A tree is a node with left and right branches that are themselves trees. Writing a function that says "do one step here, then do the same on the rest" matches how the data is already built.

The processor already maintains a call stack for ordinary function calls. Recursion reuses that mechanism instead of building a separate list of "places to resume" in heap memory. For tree-shaped problems, the stack mirrors the tree depth: three levels of children mean at most three cards above the base case on one root-to-leaf path.

People find nested descriptions easy when they can see or touch the nesting—boxes, org charts, outlines with indented bullets. Recursive code is cognitively natural when the problem image matches a stack of similar layers. It feels awkward when the problem is a flat row of numbers better scanned with a counter, because there is no visible "smaller copy" to point at.

## How it works

Start with one card for the first call. The function checks the base case. If the input is empty or minimal, it returns a fixed value—zero, one, an empty result—and that card is done.

If not, the function does a small visible piece of work on the current card—maybe add one, compare a value, record a node name—and calls itself with a strictly smaller input. Strictly smaller means fewer list cells, shallower tree, or a number one less than before. Each new call pushes another card.

When the inner call returns, its return value is written where the outer call can see it. The outer call may need a second inner call—for example, left subtree then right subtree—before it can finish its card. Finished cards come off the stack in reverse order of placement: last called, first completed, then the one below it, until the bottom card holds the final answer.

You can count frames. A factorial of five produces at most five cards above the base. A balanced binary tree of height four produces at most four cards along any single path from root to leaf. The count is the recursion depth for that path.

## Tradeoffs and failure modes

Each card uses a fixed amount of stack memory—typically hundreds of bytes per frame depending on locals and calling convention. Ten thousand nested calls can exceed the thread's stack limit even when each step is logically correct. An iterative solution with an explicit stack array in heap memory can hold more cards, traded for longer code.

If the base case never triggers—wrong condition, or the "smaller" input is the same size—the stack grows until overflow. If two recursive calls each pass half the problem but overlap, the same subproblem may be computed on many cards unless results are cached.

Reading recursive source code, you must imagine the card stack. That is harder than reading a single loop with an index variable running from zero to n. Debuggers help by showing frame numbers you can click. Cognitively, engineers differ: some visualize the stack easily; others rewrite to iteration to keep all state on one card.

Tail recursion—when the last action on a card is another call of the same function—lets some compilers reuse the top card instead of adding a new one. The logical picture is still recursion; the physical card count stays at one for that chain.

## One concrete walkthrough

Count items in a linked list: each node holds a value and a pointer to the rest of the list.

Base case: if the pointer is null, there are zero items. Return 0. One card, immediate answer.

Recursive case: if the pointer is not null, the count is 1 plus the count of the rest. Push a new card for the rest; the current card waits.

List: A → B → C → null.

Card 1: count list starting at A. Not null. Need 1 + count(B→C→null). Push card 2.

Card 2: count from B. Need 1 + count(C→null). Push card 3.

Card 3: count from C. Need 1 + count(null). Push card 4.

Card 4: null. Base case. Return 0. Remove card 4.

Card 3: 1 + 0 = 1. Remove card 3.

Card 2: 1 + 1 = 2. Remove card 2.

Card 1: 1 + 2 = 3. Remove card 1. Answer: three items.

At the deepest moment, four cards sat on the stack—countable in a debugger as frames 1 through 4. The walkthrough used only concrete nouns: nodes, pointers, cards, numbers. The same motion—push until trivial, pop with answers—applies to trees and directories; only the picture of "smaller input" changes while the stack of frames remains the same countable object.
