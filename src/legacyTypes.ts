import type { BaseRenameItem } from "./types.js";

export interface LegacyRenameItem extends BaseRenameItem {
  sourcePath: string;
}
export type LegacyRenameList = LegacyRenameItem[];