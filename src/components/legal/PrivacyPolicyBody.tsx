import blocks from '@/content/privacy-policy-blocks.json';

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'h4'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] };

const PRIVACY_POLICY_BLOCKS = blocks as Block[];

function renderListItem(item: string) {
  const urlMatch = item.match(/(https:\/\/[^\s]+)/);
  if (urlMatch) {
    const url = urlMatch[1];
    const [before, after] = item.split(url);
    return (
      <>
        {before}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primaryColor hover:underline"
        >
          {url}
        </a>
        {after}
      </>
    );
  }

  const emailMatch = item.match(/(info@cosbe\.inc)/);
  if (emailMatch) {
    const email = emailMatch[1];
    const [before, after] = item.split(email);
    return (
      <>
        {before}
        <a
          href={`mailto:${email}`}
          className="text-primaryColor hover:underline"
        >
          {email}
        </a>
        {after}
      </>
    );
  }

  return item;
}

export default function PrivacyPolicyBody() {
  return (
    <div className="prose prose-lg max-w-none">
      {PRIVACY_POLICY_BLOCKS.map((block, index) => {
        switch (block.kind) {
          case 'h2':
            return (
              <h2
                key={index}
                className="mt-10 border-l-4 border-primaryColor pl-4 text-2xl font-bold text-textPrimary first:mt-0"
              >
                {block.text}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={index}
                className="mt-8 text-xl font-semibold text-textPrimary"
              >
                {block.text}
              </h3>
            );
          case 'h4':
            return (
              <h4
                key={index}
                className="mt-6 text-lg font-semibold text-textSecondary"
              >
                {block.text}
              </h4>
            );
          case 'p':
            return (
              <p
                key={index}
                className="whitespace-pre-line leading-relaxed text-textTertiary"
              >
                {block.text}
              </p>
            );
          case 'ul':
            return (
              <ul
                key={index}
                className="list-disc space-y-3 pl-6 text-textTertiary"
              >
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="whitespace-pre-line leading-relaxed"
                  >
                    {renderListItem(item)}
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
