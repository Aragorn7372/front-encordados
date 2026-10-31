import { HttpParams } from '@angular/common/http';

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  pageSize: number;
  pageNumber: number;
  totalPageElements: number;
  sortBy: string;
  direction: string;
  empty: boolean;
  first: boolean;
  last: boolean;
}

export interface PageQuery {
  /** Empieza en 0, como en el backend. */
  page: number;
  size: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
  search?: string;
}

/** /api/tournaments llama `pageSize` a lo que el resto de endpoints llama `size`. */
export function toPageParams(query: PageQuery, sizeKey: 'size' | 'pageSize' = 'size'): HttpParams {
  let params = new HttpParams().set('page', query.page).set(sizeKey, query.size);
  if (query.sortBy) params = params.set('sortBy', query.sortBy);
  if (query.direction) params = params.set('direction', query.direction);
  if (query.search?.trim()) params = params.set('search', query.search.trim());
  return params;
}
