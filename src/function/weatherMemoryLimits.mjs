// Application work bounds, not limits on Loon's native HTTP buffers.
export const MAX_WEATHER_BODY_BYTES = 4 * 1024 * 1024;
export const MAX_DECODED_VECTOR_ENTRIES = 8192;
export const newDecodeBudget = () => ({ remaining: MAX_DECODED_VECTOR_ENTRIES });
export function decodedVectorLength(length, budget) {
    if (!Number.isSafeInteger(length) || length < 0 || length > budget.remaining) throw new RangeError("Weather product exceeds vector decoding budget");
    budget.remaining -= length;
    return length;
}
