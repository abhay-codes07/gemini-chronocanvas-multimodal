export type WeaveRequest = {
  id: string;
  transcript: string;
};

export type WeaveSseEvent =
  | { type: "narration"; text: string }
  | { type: "visual"; prompt: string; url: string }
  | { type: "transition"; cue: string }
  | { type: "error"; message: string }
  | { type: "done" };

type NarrationItem = {
  id: string;
  kind: "narration";
  text: string;
};

type VisualItem = {
  id: string;
  kind: "visual";
  prompt: string;
  url: string;
};

type TransitionItem = {
  id: string;
  kind: "transition";
  cue: string;
};

type ErrorItem = {
  id: string;
  kind: "error";
  message: string;
};

export type WeaveRenderItem =
  | NarrationItem
  | VisualItem
  | TransitionItem
  | ErrorItem;
