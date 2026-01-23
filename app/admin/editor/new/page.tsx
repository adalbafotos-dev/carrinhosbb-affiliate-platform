import { redirect } from "next/navigation";

export const revalidate = 0;

export default function NewPostRedirect() {
  redirect("/admin/new");
}

