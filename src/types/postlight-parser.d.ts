declare module "@postlight/parser" {
  interface ParseResult {
    title: string | null;
    author: string | null;
    content: string | null;
    date_published: string | null;
    lead_image_url: string | null;
    dek: string | null;
    url: string | null;
    domain: string | null;
    excerpt: string | null;
    word_count: number | null;
    direction: string | null;
    total_pages: number | null;
    rendered_pages: number | null;
    next_page_url: string | null;
  }

  const Parser: {
    parse(url: string, options?: Record<string, unknown>): Promise<ParseResult>;
  };

  export default Parser;
}
