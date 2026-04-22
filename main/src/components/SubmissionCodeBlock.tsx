'use client';

import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// refractor only ships with `python`, `cpp`, and `c` grammars matching the
// names above — submitting `pypy3` or `cpp20` raises an "Unknown language"
// error that react-syntax-highlighter silently swallows, leaving code
// unhighlighted. Normalize the submission codes to grammars refractor knows.
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('cpp', cpp);

function mapLanguage(code: string): string {
  if (code === 'pypy3' || code === 'python3') return 'python';
  if (code === 'cpp14' || code === 'cpp17' || code === 'cpp20' || code === 'cpp23') return 'cpp';
  return code;
}

interface Props {
  language: string;
  code: string;
  maxHeight?: string;
}

export function SubmissionCodeBlock({ language, code, maxHeight = '400px' }: Props) {
  return (
    <SyntaxHighlighter
      language={mapLanguage(language)}
      style={vscDarkPlus as never}
      customStyle={{ margin: 0, borderRadius: 0, maxHeight }}
      showLineNumbers
    >
      {code}
    </SyntaxHighlighter>
  );
}
