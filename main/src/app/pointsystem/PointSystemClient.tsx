'use client';

import { MarkdownRenderer } from '@/components/MarkdownRenderer';

const content = `
# Points System

WMOJ uses a weighted scoring system inspired by [DMOJ](https://dmoj.ca), designed to reward both the difficulty of the problems you solve and the breadth of your problem-solving experience.

---

## How Your Score Is Calculated

Your total score is made up of two components: a **weighted problem score** and a **breadth bonus**.

$$
\\text{Score} = \\underbrace{\\sum_{i=0}^{\\min(N,\\,100)-1} p_i \\cdot 0.95^{\\,i}}_{\\text{weighted problem score}} + \\underbrace{150 \\cdot \\left(1 - 0.997^{N}\\right)}_{\\text{breadth bonus}}
$$

Where:

- $N$ is the total number of **distinct** problems you have solved (passed at least once)
- $p_i$ is the point value of the $i$-th solved problem when your solved problems are sorted in **descending order** by point value (hardest first)
- The sum covers at most your **top 100** solved problems

---

## The Weighted Problem Score

$$
P = \\sum_{i=0}^{\\min(N,\\,100)-1} p_i \\cdot 0.95^{\\,i}
$$

This is the core of your score. Here's what makes it tick:

- Your problems are **ranked from hardest to easiest** (by point value). The hardest problem you've solved, $p_0$, contributes at its **full value**.
- Each subsequent problem is multiplied by an additional factor of $0.95$. So the second problem contributes $p_1 \\cdot 0.95$, the third contributes $p_2 \\cdot 0.95^2$, and so on.
- This **exponential decay** means that while solving more problems always helps, the marginal gain from each additional problem gets smaller and smaller.
- Only your **top 100** problems are counted in this sum — everything beyond that contributes only to the breadth bonus below.

### Example

Suppose you've solved three problems worth 10, 7, and 4 points respectively. Your weighted score is:

$$
P = 10 \\cdot 0.95^0 + 7 \\cdot 0.95^1 + 4 \\cdot 0.95^2
$$
$$
P = 10 + 6.65 + 3.61 = 20.26
$$

---

## The Breadth Bonus

$$
B = 150 \\cdot \\left(1 - 0.997^{N}\\right)
$$

This bonus rewards you for solving a **large number of problems**, regardless of their difficulty.

- When $N = 0$, the bonus is exactly $0$.
- As $N$ grows, the bonus approaches — but never reaches — **150 points**.
- The growth is fast at first and slows down as you solve more problems. For example:
  - At $N = 10$: $B \\approx 2.96$
  - At $N = 50$: $B \\approx 13.9$
  - At $N = 100$: $B \\approx 25.9$
  - At $N = 500$: $B \\approx 77.9$
  - At $N = 1000$: $B \\approx 110$

The bonus ensures that two users with similar top-problem scores are separated by how many problems they've solved overall, encouraging broad participation.

---

## Key Behaviours to Understand

### Only your first solve counts

Points are only awarded the **first time** you pass a problem. Re-submitting a problem you've already solved does not change your score in any way.

### Harder problems dominate

Because of the $0.95^i$ decay, solving a single 10-point problem is worth considerably more than solving two 5-point problems:

$$
10 \\cdot 0.95^0 = 10 \\quad \\text{vs} \\quad 5 \\cdot 0.95^0 + 5 \\cdot 0.95^1 = 5 + 4.75 = 9.75
$$

The gap widens the more problems are involved. This means **prioritising harder problems has a real, compounding advantage**.

### Diminishing returns are intentional

The system is designed so that your score is never simply the sum of all your problem points. Every new solve helps, but by progressively smaller amounts. This prevents a user who grinds hundreds of easy problems from outranking one who has solved a handful of very hard ones.

---

## Full Formula Reference

| Symbol | Meaning |
|--------|---------|
| $N$ | Number of distinct problems solved |
| $p_i$ | Point value of the $(i+1)$-th hardest solved problem |
| $0.95^i$ | Decay weight applied to the $i$-th problem |
| $150$ | Maximum possible breadth bonus |
| $0.997^N$ | Decay factor for the breadth bonus |
| $\\text{Score}$ | Your total displayed points, rounded to the nearest integer |

Your score is **recalculated automatically** every time you solve a new problem.
`;

export default function PointSystemClient() {
  return (
    <div className="max-w-3xl mx-auto">
      <MarkdownRenderer content={content} />
    </div>
  );
}
