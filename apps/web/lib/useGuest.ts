"use client";

import { useSyncExternalStore } from "react";

import { isGuest } from "@/services/auth";

const noop = () => () => {};

/** True in guest mode. False on the server render, so pages hydrate the same either way. */
export const useGuest = () => useSyncExternalStore(noop, isGuest, () => false);
