export type Silo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  pillar_content_json?: any | null;
  pillar_content_html?: string | null;
  menu_order?: number | null;
  is_active?: boolean | null;
  created_at: string;
};

export type Post = {
  id: string;
  silo_id: string | null;
  title: string;
  seo_title?: string | null;
  meta_title?: string | null;
  slug: string;
  target_keyword: string;
  content_json: any | null;
  content_html: string | null;
  seo_score: number | null;
  supporting_keywords: string[] | null;
  meta_description: string | null;
  canonical_path?: string | null;
  entities?: string[] | null;
  faq_json?: any | null;
  howto_json?: any | null;
  schema_type?: "article" | "review" | "faq" | "howto" | null;
  cover_image?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  og_image_url?: string | null;
  images?: any[] | null;
  intent?: "commercial" | "transactional" | "informational" | null | string;
  pillar_rank?: number | null;
  is_featured?: boolean | null;
  author_name?: string | null;
  expert_name?: string | null;
  expert_role?: string | null;
  expert_bio?: string | null;
  expert_credentials?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  sources?: any[] | null;
  disclaimer?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  status?: "draft" | "review" | "scheduled" | "published" | null;
  amazon_products: any | null;
  published: boolean | null;
  updated_at: string;
};

export type PostWithSilo = Post & {
  silo: Pick<Silo, "slug" | "name"> | null;
};

export type SiloBatch = {
  id: string;
  silo_id: string;
  name: string;
  status: "draft" | "review" | "scheduled" | "published";
  created_at: string;
};

export type SiloBatchPost = {
  batch_id: string;
  post_id: string;
  position: number;
  created_at: string;
};

export type PostLink = {
  id: string;
  source_post_id: string;
  target_post_id: string | null;
  target_url: string | null;
  anchor_text: string | null;
  link_type: "internal" | "external" | "affiliate" | "about" | "mention";
  rel_flags: string[] | null;
  is_blank: boolean;
  created_at: string;
};
