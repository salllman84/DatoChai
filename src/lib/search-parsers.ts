// C:\Cursor\datochai\src\lib\search-parsers.ts

import {
  createSearchParamsCache,
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  parseAsArrayOf,
} from 'nuqs/server';

export const contentTableParsers = {
  // Pagination State
  page: parseAsIndex.withDefault(0),
  perPage: parseAsInteger.withDefault(10),
  
  // Sorting State
  sort: parseAsString.withDefault('createdAt'),
  order: parseAsString.withDefault('desc'),
  
  // Filtering State
  search: parseAsString.withDefault(''),
  // FIXED: Added [] inside withDefault() to satisfy strict typing
  statuses: parseAsArrayOf(parseAsString).withDefault([]),
  categories: parseAsArrayOf(parseAsString).withDefault([]),
};

export const contentTableCache = createSearchParamsCache(contentTableParsers);