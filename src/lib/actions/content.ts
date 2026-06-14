// C:\Cursor\datochai\src\lib\actions\content.ts

"use server";

import { PrismaClient, Prisma, PostStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// ==========================================
// PHASE 3: CONTENT HUB DATA GRID ACTIONS
// ==========================================

export async function fetchContentHubData(parsedParams:
  {
      page: number;
      perPage: number;
      sort: string;
      order: string;
      search: string;
      statuses: string[]; // FIXED: Typed as array
      categories: string[]; // FIXED: Typed as array
  }) {
  const { page, perPage, sort, order, search, statuses, categories } = parsedParams;

  // 1. Construct dynamic Prisma AST for filtering
  const whereClause: Prisma.PostWhereInput = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(statuses && statuses.length > 0 && {
      status: { in: statuses as PostStatus[] }, // FIXED: Cast to array
    }),
    ...(categories && categories.length > 0 && {
      categories: {
        some: { category: { name: { in: categories } } },
      },
    }),
  };

  // 2. Handle deep relational sorting (e.g., SEO score)
  const orderByClause: Prisma.PostOrderByWithRelationInput =
    sort === "seoScore"
      ? { seo: { seoScore: order as Prisma.SortOrder } }
      : { [sort]: order as Prisma.SortOrder };

  try {
    // 3. FIXED: Actually execute the concurrent queries inside the transaction!
    const [data, totalCount] = await prisma.$transaction([
      prisma.post.findMany({
  where: whereClause,
  orderBy: orderByClause,
  skip: page * perPage,
  take: perPage,
  include: {
    seo: true,
    categories: { // This must match the field name in your Post model
      include: {
        category: true // This must match the relation name in CategoriesOnPosts
      }
    },
  }
}),
      prisma.post.count({
        where: whereClause
      })
    ]);

    return {
      data,
      pageCount: Math.ceil(totalCount / perPage),
      totalItems: totalCount,
    };
  } catch (error) {
    console.error("Failed to fetch Content Hub Data:", error);
    throw new Error("Failed to load table data");
  }
}

// FIXED: Signature changed from `string` to `string[]` to accept arrays of IDs
export async function bulkDeletePosts(postIds: string[]) {
  try {
    // Because schema uses `onDelete: Cascade` for relations (PostSeo, CategoriesOnPosts),
    // deleting the primary Post entity automatically purges orphaned data safely.
    await prisma.post.deleteMany({
      where: {
        id: { in: postIds }, // FIXED: Now cleanly accepts the array
      },
    });

    // Force Next.js to purge router cache and reconcile the UI
    revalidatePath("/(admin)/content", "page");

    return { success: true };
  } catch (error) {
    console.error("Critical failure during bulk deletion:", error);
    return { success: false, error: "Failed to execute bulk deletion." };
  }
}

// ==========================================
// PHASE 2: MASTER ARTICLE EDITOR ACTIONS
// ==========================================

export async function createArticle(formData: FormData) {
  const title = formData.get("title") as string;
  const rawContent = formData.get("content") as string;
  let slug = formData.get("slug") as string;
  const featuredImage = formData.get("featuredImage") as string;
  
  const focusKeyword = formData.get("focusKeyword") as string;
  const seoTitle = formData.get("seoTitle") as string;
  const seoDescription = formData.get("seoDescription") as string;
  const seoScoreRaw = formData.get("seoScore") as string;
  const seoScore = parseInt(seoScoreRaw) || 0;

  if (!title || !rawContent) {
    return { error: "Title and content are required." };
  }

  if (!slug) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  try {
    await prisma.post.create({
      data: {
        title,
        slug,
        featuredImage: featuredImage || null,
        content: { text: rawContent },
        status: "DRAFT",
        contentType: "BLOG",
        seo: {
          create: {
            title: seoTitle || title,
            description: seoDescription || "",
            focusKeyphrase: focusKeyword || "",
            canonicalUrl: `https://datochai.com/${slug}`,
            seoScore: seoScore,
          },
        },
      },
    });

    revalidatePath("/content");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating article:", error);
    return { error: error.message || "Failed to create article." };
  }
}

export async function updateArticle(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const rawContent = formData.get("content") as string;
  let slug = formData.get("slug") as string;
  const featuredImage = formData.get("featuredImage") as string;
  
  const focusKeyword = formData.get("focusKeyword") as string;
  const seoTitle = formData.get("seoTitle") as string;
  const seoDescription = formData.get("seoDescription") as string;
  const seoScoreRaw = formData.get("seoScore") as string;
  const seoScore = parseInt(seoScoreRaw) || 0;
  
  let customCanonical = formData.get("canonicalUrl") as string;

  if (!id || !title || !rawContent) {
    return { error: "Missing required fields." };
  }

  if (!slug) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  if (!customCanonical || customCanonical.trim() === "") {
    customCanonical = `https://datochai.com/${slug}`;
  }

  try {
    await prisma.post.update({
      where: { id },
      data: {
        title,
        slug,
        featuredImage: featuredImage || null,
        content: { text: rawContent },
        seo: {
          upsert: {
            create: {
              title: seoTitle || title,
              description: seoDescription || "",
              focusKeyphrase: focusKeyword || "",
              canonicalUrl: customCanonical,
              seoScore: seoScore,
            },
            update: {
              title: seoTitle || title,
              description: seoDescription || "",
              focusKeyphrase: focusKeyword || "",
              canonicalUrl: customCanonical,
              seoScore: seoScore,
            },
          },
        },
      },
    });

    revalidatePath("/content");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating article:", error);
    return { error: error.message || "Failed to update article." };
  }
}

export async function setArticleStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  try {
    await prisma.post.update({
      where: { id },
      data: {
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    revalidatePath("/content");
    return { success: true };
  } catch (error) {
    console.error("Error updating article status:", error);
    return { error: "Failed to update article status." };
  }
}

export async function deleteArticle(id: string) {
  try {
    await prisma.post.delete({
      where: { id },
    });

    revalidatePath("/content");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting article:", error);
    return { error: "Failed to delete article. It may have dependent data." };
  }
}