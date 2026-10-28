export const fetcher = async <T>(promise: Promise<{ data: T }>): Promise<T> => {
  const response = await promise
  return response.data
}
