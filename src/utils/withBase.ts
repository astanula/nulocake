const getBaseUrl = () => import.meta.env.BASE_URL.replace(/\/?$/, '/');

const normalizePath = (path: string) => path.replace(/\/$/, '') || '/';

export const withBase = (path: string) =>
  `${getBaseUrl()}${path.replace(/^\//, '')}`;

export const isRouteActive = (currentPath: string, route: string) =>
  normalizePath(currentPath) === normalizePath(withBase(route));

export const isHomePath = (pathname: string) => isRouteActive(pathname, '');
