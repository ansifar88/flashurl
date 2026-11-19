import { getUrlStatistics } from "../repositories/url.repository";

export async function getPlatformUrlStatistics() {
  return getUrlStatistics();
}