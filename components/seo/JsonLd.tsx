export type JsonLdShape = Record<string, unknown>;

type JsonLdProps = {
  data: JsonLdShape | JsonLdShape[];
  id?: string;
};

function JsonLd({ data, id }: JsonLdProps) {
  const payloads = Array.isArray(data) ? data : [data];

  return (
    <>
      {payloads.map((payload, index) => (
        <script
          key={index}
          id={
            id
              ? payloads.length === 1
                ? id
                : `${id}-${index + 1}`
              : undefined
          }
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}
    </>
  );
}

export default JsonLd;
