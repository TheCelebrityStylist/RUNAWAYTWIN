import type { Article } from "./types";
import { DATA_ARTICLES } from "./a1-data";
import { GUIDE_ARTICLES } from "./a2-guides";
import { STYLE_ARTICLES } from "./a3-style";
import { TOOL_ARTICLES } from "./a4-tools";

export type { Article, Block } from "./types";

export const ARTICLES: Article[] = [...DATA_ARTICLES, ...GUIDE_ARTICLES, ...STYLE_ARTICLES, ...TOOL_ARTICLES];
export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
