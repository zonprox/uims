export type SearchResultCategory =
  | 'Hardware'
  | 'License'
  | 'Inventory'
  | 'Network'
  | 'Employee'
  | 'User'
  | 'Asset'
  | 'Directory'
  | 'Navigation';

export interface SearchQueryDto {
  q: string;
  limit?: number;
  type?:
    | 'all'
    | 'hardware'
    | 'licenses'
    | 'inventory'
    | 'network'
    | 'employees'
    | 'users'
    | 'assets';
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: SearchResultCategory;
  path: string;
  status?: string;
  meta?: Record<string, unknown>;
}

export interface SearchResponseDto {
  query: string;
  total: number;
  results: Array<SearchResultItem>;
}
