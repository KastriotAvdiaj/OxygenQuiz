import { isAxiosError } from 'axios';

/**
 * A wrapper for React Router loaders to handle common API errors gracefully.
 * It catches rejected promises from API calls and translates them into
 * the special `Response` objects that React Router uses to trigger `errorElement`.
 * 
 * @param apiCall A function that returns the promise from your API client.
 * @returns The resolved data from the API call.
 * @throws {Response} A Response object with a 404 status for "Not Found" errors.
 * @throws {Error} The original error for all other failure cases.
 */
export async function handleLoaderError<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    const data = await apiCall();
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}