// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
export const isSurgeRuntime = () => typeof globalThis.$environment?.["surge-version"] === "string";
export const hasNativeProviderRuntime = () => typeof globalThis.$loon === "string" || isSurgeRuntime();
