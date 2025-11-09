export const dynamic = "force-dynamic";
export const runtime = "edge";

import { NextResponse } from "next/server";

type ProductCard = {
  title: string;
  image: string | null;
  description: string;
  priceAmount: string;
  currencyCode: string;
  url: string;
};

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN!;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION!;
const BLOG_ID = process.env.BLOG_ID!;
const DEFAULT_AUTHOR = "Edward'sStuff";

// ✅ CORSヘッダー
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function formatPrice(amount: string, currency: string) {
  const int = Math.round(Number(amount));
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(int);
}

function dateSlugFromJST(date: Date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return [
    jst.getUTCFullYear().toString().slice(-2),
    String(jst.getUTCMonth() + 1).padStart(2, "0"),
    String(jst.getUTCDate()).padStart(2, "0"),
  ].join("");
}

function renderBodyHTML(title: string, leadHtml: string, products: ProductCard[]) {
  return `
  <style>
    .product-block {
      max-width: 640px;
      margin: 0 auto 82px;
      text-align: center;
    }
    .product-block img {
      width: 100%;
      max-width: 400px;
      height: auto;
      margin-bottom: 12px;
    }
    .product-title {
      font-size: 14px;
      line-height: 1.15;
      letter-spacing: .02em;
      margin: 0 0 2px;
      font-weight: 400;
      overflow-wrap: anywhere;
    }
    .product-price {
      font-size: 14px;
      margin: 0 0 6px;
      font-weight: 400;
      line-height: 1.15;
    }
    .product-link {
      font-size: 14px;
      color: #0011ffff;
      text-decoration: underline;
      letter-spacing: .04em;
    }
    hr {
      border: none;
      height: 1px;
      background: #eee;
      margin: 64px 0;
    }
  </style>

  <article style="
      max-width: 880px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
      line-height: 1.8;
  ">
    <header style="padding: 72px 0 16px; text-align:center;">
      <h1 style="font-size: 26px; letter-spacing: .03em; margin-bottom: 14px; font-weight: 400;">
        ${title}
      </h1>
      ${leadHtml ? `<p style="max-width:640px;margin:0 auto;font-size:15px;color:#555;">${leadHtml}</p>` : ""}
    </header>

    <hr />

    ${products.map((p) => `
      <section class="product-block">
        ${p.image ? `<img src="${p.image}" alt="${p.title}">` : ""}
        <div class="product-title">${p.title}</div>
        <div class="product-price">${formatPrice(p.priceAmount, p.currencyCode)} (税込)</div>
        <a href="${p.url}" target="_blank" class="product-link">商品詳細ページ</a>
      </section>
      <hr />
    `).join("")}
  </article>
  `;
}

// ✅ すべてのHTTPメソッドを1つの関数で処理
export async function GET() {
  return NextResponse.json(
    { status: "ok", message: "Blog Builder API" },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { urls, title, slug, lead } = body as {
      urls: string[];
      title: string;
      slug?: string;
      lead?: string;
    };

    if (!urls?.length) {
      return NextResponse.json(
        { error: "URL がありません" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!title) {
      return NextResponse.json(
        { error: "タイトルがありません" },
        { status: 400, headers: corsHeaders }
      );
    }

    const handles = urls
      .map((u) => {
        const ix = u.indexOf("/products/");
        if (ix === -1) return null;
        const h = u.slice(ix + "/products/".length).split("?")[0];
        return decodeURIComponent(h);
      })
      .filter(Boolean) as string[];

    if (!handles.length) {
      return NextResponse.json(
        { error: "有効な商品URLがありません" },
        { status: 400, headers: corsHeaders }
      );
    }

    const q = `
      query productByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          title
          descriptionHtml
          featuredImage { url }
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
          }
          onlineStoreUrl
          handle
        }
      }
    `;

    const products: ProductCard[] = [];
    for (const handle of handles) {
      const res = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q, variables: { handle } }),
        }
      );

      const result = await res.json();
      const p = result?.data?.productByHandle;
      if (!p) continue;

      products.push({
        title: p.title,
        image: p.featuredImage?.url ?? null,
        description: p.descriptionHtml ?? "",
        priceAmount: p.priceRangeV2?.minVariantPrice?.amount ?? "0",
        currencyCode: p.priceRangeV2?.minVariantPrice?.currencyCode ?? "JPY",
        url:
          p.onlineStoreUrl ||
          `https://${SHOPIFY_DOMAIN.replace(".myshopify.com", "")}/products/${p.handle}`,
      });
    }

    if (!products.length) {
      return NextResponse.json(
        { error: "商品情報が取得できませんでした" },
        { status: 404, headers: corsHeaders }
      );
    }

    const finalSlug = slug?.trim() || dateSlugFromJST(new Date());
    const body_html = renderBodyHTML(title, lead || "", products);

    const postRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/blogs/${BLOG_ID}/articles.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          article: {
            title,
            author: DEFAULT_AUTHOR,
            body_html,
            handle: finalSlug,
            published_at: null,
          },
        }),
      }
    );

    const postJson = await postRes.json();
    if (!postRes.ok || !postJson?.article) {
      return NextResponse.json(
        { error: "ブログ投稿に失敗しました", detail: postJson },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        article: postJson.article,
        preview_url: `https://${SHOPIFY_DOMAIN}/blogs/${postJson.article.blog_id}/${finalSlug}`,
      },
      { headers: corsHeaders }
    );

  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500, headers: corsHeaders }
    );
  }
}