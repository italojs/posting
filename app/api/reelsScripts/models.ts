export interface ReelsScript {
  _id: string;
  userId: string;
  contentId?: string; // Reference to the original Content document
  title: string; // Title of the article used
  contentTemplate: {
    name: string;
    audience?: string;
    goal?: string;
  };
  articleSummary: string;
  language: string;
  script: string; // The AI-generated script
  createdAt: Date;
  updatedAt: Date;
}

// ---- SET METHOD MODELS ----
export interface CreateReelsScriptInput {
  contentId?: string;
  title: string;
  contentTemplate: {
    name: string;
    audience?: string;
    goal?: string;
  };
  articleSummary: string;
  language: string;
}

export interface UpdateReelsScriptInput {
  _id: string;
  script?: string;
  title?: string;
  articleSummary?: string;
  language?: string;
}

// ---- GET METHOD MODELS ----
export interface GetReelsScriptsInput {
  userId?: string;
  contentId?: string;
  limit?: number;
  skip?: number;
}

export interface GetReelsScriptsResult {
  scripts: ReelsScript[];
  total: number;
}