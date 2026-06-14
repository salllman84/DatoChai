import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import EditArticleClient from "./edit-client";

const prisma = new PrismaClient();

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  // Fetch the specific post and its SEO data from the database
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { seo: true }
  });

  // If the post doesn't exist, show a 404
  if (!post) {
    notFound();
  }

  // Safely extract the raw text from the JSON content field
  const contentObj = post.content as any;
  const rawText = contentObj?.text || "";

  // Pass the data to the interactive Client Form
  return <EditArticleClient post={post} rawText={rawText} />;
}