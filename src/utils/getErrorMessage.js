/**
 * Extracts a user-facing error message from an axios error,
 * falling back to a provided default if none is available.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default getErrorMessage;
