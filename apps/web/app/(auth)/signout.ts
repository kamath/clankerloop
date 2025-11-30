"use server";

import { signOut } from "@workos-inc/authkit-nextjs";

export const signOutAction = async () => {
  await signOut();
};
