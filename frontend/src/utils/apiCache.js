import api from "../api/client";

const cache = new Map();

/**
 * Lightweight SWR-style caching utility.
 * @param {string} url The API endpoint to fetch
 * @param {number} ttl Time to live in milliseconds (default 60s)
 * @param {boolean} force If true, bypass cache and fetch directly
 */
export const fetchWithCache = async (url, ttl = 60000, force = false) => {
  if (!force && cache.has(url)) {
    const entry = cache.get(url);
    if (Date.now() - entry.time < ttl) {
      return entry.data;
    }
    // Expired, delete it
    cache.delete(url);
  }

  // Deduplicate inflight requests
  const inflightKey = `_inflight_${url}`;
  if (cache.has(inflightKey)) {
    return cache.get(inflightKey);
  }

  const promise = api.get(url).then((res) => {
    cache.set(url, { data: res, time: Date.now() });
    cache.delete(inflightKey);
    return res;
  }).catch((err) => {
    cache.delete(inflightKey);
    throw err;
  });

  cache.set(inflightKey, promise);
  return promise;
};

/**
 * Prefetch a route silently in the background
 */
export const prefetch = (url, ttl = 60000) => {
  if (cache.has(url)) {
    const entry = cache.get(url);
    if (Date.now() - entry.time < ttl) return; // Still fresh
  }
  fetchWithCache(url, ttl).catch(() => {});
};

export const clearCache = (url) => {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
};
