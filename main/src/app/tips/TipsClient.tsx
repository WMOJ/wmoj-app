'use client';

export default function TipsClient() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tips</h1>
        <p className="text-sm text-text-muted mt-1">New to competitive programming or WMOJ? Start here.</p>
        <hr className="mt-3 border-border" />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">What is Competitive Programming?</h2>
        <div className="text-sm text-text-muted leading-relaxed space-y-2">
          <p>
            Competitive programming is a sport where participants solve well-defined algorithmic problems
            under time constraints. You are given a problem statement, write code that reads input and
            produces the correct output, and submit it to an online judge that tests your solution
            against hidden test cases.
          </p>
          <p>
            Problems typically involve data structures, algorithms, math, and logical reasoning.
            Solutions are evaluated on <span className="text-foreground font-medium">correctness</span> (do
            all test cases pass?) and must run within the given time and memory limits.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">How WMOJ Works</h2>
        <div className="text-sm text-text-muted leading-relaxed space-y-2">
          <p>
            <span className="text-foreground font-medium">Problems:</span> Browse practice
            problems from the <span className="font-mono text-foreground">/problems</span> page. Each
            problem has a point value, a time limit, and a memory limit.
          </p>
          <p>
            <span className="text-foreground font-medium">Submitting:</span> Click &quot;Solve&quot; on
            any problem, write your solution in Python, C++, or Java, and submit. The judge compiles
            and runs your code against all test cases and reports the results instantly.
          </p>
          <p>
            <span className="text-foreground font-medium">Contests:</span> Join timed contests from
            the <span className="font-mono text-foreground">/contests</span> page. Your countdown starts
            when you join. Solve as many problems as possible before time runs out.
          </p>
          <p>
            <span className="text-foreground font-medium">Points:</span> Each problem you solve earns
            you points. Your total score is calculated using a weighted formula that rewards solving
            harder (higher-point) problems. Check the leaderboard
            at <span className="font-mono text-foreground">/users</span> to see where you rank.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Getting Started</h2>
        <ol className="text-sm text-text-muted leading-relaxed space-y-2 list-decimal list-inside">
          <li>Create an account or log in.</li>
          <li>Head to the <span className="font-mono text-foreground">/problems</span> page and pick an easy problem to start with.</li>
          <li>Read the problem statement carefully, paying attention to input/output format.</li>
          <li>Write your solution, test it locally if you can, then submit.</li>
          <li>If your solution doesn&apos;t pass all test cases, check edge cases and try again.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">General Tips</h2>
        <ul className="text-sm text-text-muted leading-relaxed space-y-2 list-disc list-inside">
          <li>Read the problem constraints carefully &mdash; they hint at the expected time complexity.</li>
          <li>Start with brute-force, then optimize if needed.</li>
          <li>Watch out for integer overflow in C++ and Java. Use <span className="font-mono text-foreground">long long</span> or <span className="font-mono text-foreground">long</span> when values exceed 2 billion.</li>
          <li>In Python, use <span className="font-mono text-foreground">sys.stdin</span> for faster input on large test cases.</li>
          <li>Test edge cases: empty input, maximum values, single-element cases.</li>
          <li>If you get &quot;Time Limit Exceeded&quot;, your algorithm is likely too slow &mdash; think about a more efficient approach.</li>
        </ul>
      </section>
    </div>
  );
}
