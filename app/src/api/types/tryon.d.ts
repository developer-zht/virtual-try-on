/** GET /tryon/results/:id 的 data */
export interface TryOnResult {
  id: string;
  image_url: string;
}

/** POST /tryon/full 的请求体 */
export interface TryonFullRequest {
  person_image_url: string; // 用户模特图（/users/me/model → avatar_url）
  garment_image_urls: string[]; // 上身单品图 urls
  outfit_items?: { category: string; name: string; primary_color: string }[];
  preserve_face?: boolean; // 默认 true
  model_name?: string;
}
