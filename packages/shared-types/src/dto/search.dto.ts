export interface SearchQueryDto {
  q: string;
  limit?: number;
  type?: 'all' | 'assets' | 'licenses' | 'users';
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Asset' | 'License' | 'Directory' | 'Navigation';
  path: string;
  status?: string;
  meta?: Record<string, unknown>;
}

export interface SearchResponseDto {
  query: string;
  total: number;
  results: Array<SearchResultItem>;
}
