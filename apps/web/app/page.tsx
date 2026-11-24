import { redirect } from "next/navigation";

/** The site opens on the landing page; people log in or sign up from there. */
export default function Index() {
  redirect("/welcome");
}
