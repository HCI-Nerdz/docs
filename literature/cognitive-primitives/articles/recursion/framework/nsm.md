# Recursion

## What it is

Recursion is when someone can say something like this about one thing: this thing is like another thing of the same kind, but the other thing is smaller. In programs, one part of a program can do something to something, and after this it can do the same thing to a smaller something. The program does not do the same thing forever because there is a part where someone can say: this something is very small now, I know what to do here, I do not do the same thing again.

When this happens many times, the computer keeps many places where it was before. Each place is like a note: I was here, I still have to do something after this. When the smallest something is done, the computer moves back to the place before, then to the place before that, until the first place is done.

People can think in this way when they see one thing inside another thing of the same kind. Someone can say: one box is inside another box, the other box is inside another box. Each time the box is smaller or there is one less box. This is not something only computers do—people do this when they describe things in the world.

## Why it exists

Some things in the world are like this: one part of something is the same kind as the whole thing, but smaller. Because of this, someone can say what to do to the whole thing like this: do something to one part, then do the same to the other parts. If someone writes a program in this way, other people can know what the program does because it is like how they think about the thing.

The computer can do this because when one part of a program calls another part, the computer already knows how to remember where to go back. Someone does not have to write many notes by hand—the computer does this when each call happens. This is one reason recursion exists in programming languages: the machine already moves from one place to another and can move back.

People often find this way of thinking natural when they can see that one thing is inside another. When someone opens something and sees the same kind of thing inside, they know what to do next: do the same again or stop if there is nothing more inside. When things are not like this—when all things are in one row with numbers—some people find another way easier: do one step, then another step, many times.

## How it works

Every recursive program has two parts. One part is when someone can say: if something is very small or there is nothing there, I do this one thing and I stop. This is the base case. The other part is when someone can say: if something is big, I do a little work here, then I do the same thing to something smaller. This is the recursive case. Each time the something must be smaller than before. If it is not smaller, the program can do the same thing forever and this is bad.

When the program calls itself, the computer puts a new note on top of other notes. This note says where to come back, what the something was, and what other things the program was thinking about at that moment. The program inside runs. It can call itself again. This can happen many times until the base case happens.

When the base case happens, the program gives an answer and the computer removes one note. The program in the place below gets this answer. It can use this answer to finish what it was doing. If it still has to do the same to another part, it calls itself again. When all parts are done, it gives its answer up. This continues until no notes are left and the first call has the final answer.

Sometimes the last thing a part does is call itself again with no work after. Some computers can treat this like doing one thing many times in one place instead of many notes. This is tail recursion. Without this, each call still uses one note.

## Tradeoffs and failure modes

One problem is that the computer can only keep many notes up to some limit. If someone calls itself too many times—many thousands or more—the notes do not fit and the program stops with an error. This can happen even when the way of thinking about the problem is correct. Someone can write the same logic with one note and a list somewhere else in memory, but then they have to manage the list themselves.

Another problem is when the program never reaches the part where it stops. This happens if someone forgot to write that part, or if the something is not really smaller each time. The program keeps adding notes until there is no space.

Sometimes the program does the same work on the same smaller something many times. This wastes time. Someone can remember answers they already found, or write the program to build answers from the bottom up instead of from the top down.

For people reading code, it can be hard to know which note is active and what still has to happen. Someone has to imagine many places waiting at once, or use a tool that shows all the notes. Some people prefer one loop with one place because they can see everything in one view. This is not because recursion is wrong—it is because holding many waiting places in the mind is hard for some people.

When two different parts of a program call each other back and forth, the notes still work the same way, but someone has to remember which part they are in at each depth.

## One concrete walkthrough

Someone wants to know how many nodes are in a binary tree. A tree is something where each node can have a left part and a right part. Each part is empty or is another tree of the same kind.

If the tree is empty, the answer is zero—there is nothing to count. This is the base case.

If the tree is not empty, the answer is one for this node, plus how many nodes are in the left part, plus how many nodes are in the right part. To know the left and right parts, the same thing is done to each part.

Suppose the tree has root R. Left part is A, a single node with nothing below. Right part is P; P has one child Q on the right and nothing on the left.

First call: count R. Not empty. Need one plus count of A plus count of P. Wait.

Second call: count A. One plus zero plus zero equals one. Return one. First call gets one for the left part.

Third call: count P. Not empty. Need one plus zero plus count of Q. Wait.

Fourth call: count Q. Leaf. Return one.

Third call finishes: one plus zero plus one equals two. Return two.

First call finishes: one plus one plus two equals four.

At the deepest moment, three calls were waiting while the fourth ran. Each waiting call knew which part it still needed. Going down was doing the same thing to smaller trees; coming up was adding the numbers. This is what recursion is in the program and what someone does in the mind when they say: count this node, then count what is inside, then add.
