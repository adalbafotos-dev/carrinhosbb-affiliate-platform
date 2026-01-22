export type Silo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  silo_id: string | null;
  title: string;
  seo_title?: string | null;
  slug: string;
  target_keyword: string;
  content_json: any | null;
  content_html: string | null;
  seo_score: number | null;
  supporting_keywords: string[] | null;
  meta_description: string | null;
  cover_image?: string | null;
  author_name?: string | null;
  scheduled_at?: string | null;
  amazon_products: any | null;
  published: boolean | null;
  updated_at: string;
};

export type PostWithSilo = Post & {
  silo: Pick<Silo, "slug" | "name"> | null;
};
