export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export type {
  ActiveView,
  FolderItem,
  SortOption,
  WorkLink,
} from './utils/linkLogic';
