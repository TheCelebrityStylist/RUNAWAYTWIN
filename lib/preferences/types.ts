export type SizePrefs = {
  top?: string;
  bottom?: string;
  dress?: string;
  shoe?: string;
};

export type Preferences = {
  gender: "female" | "male" | "unisex" | "unspecified";
  sizes: SizePrefs;
  bodyType: string;
  budget: string;
  country: string;
  styleKeywords: string[];
  height?: string;
  weight?: string;
};

export const DEFAULT_PREFERENCES: Preferences = {
  gender: "female",
  sizes: {},
  bodyType: "",
  budget: "",
  country: "US",
  styleKeywords: [],
};
