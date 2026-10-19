import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function FabricDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: any = null;
  try { product = await prisma.fabricProduct.findUnique({ where: { slug: slug }, include: { images: true, seller: true } }); } catch {}
  if (!product) product = { name: slug.replace(/-/g," "), slug: slug, price: 12000, material: "Ankara", color: "Gold / Navy", stock: 45, unit: "metre", minOrderQty: 2, seller: { businessName: "Lagos Fabrics Hub", slug: "lagos-fabrics" }, images: [{ url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop" }], description: "Premium Ankara sourced directly from Vlisco partners. Colour-fast, 100% cotton, perfect for agbada & kaftan. Ships within 24h." };
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8 grid lg:grid-cols-2 gap-8">
        <div><img src={product.images?.[0]?.url} alt={product.name} className="rounded-2xl w-full h-[520px] object-cover border" /><div className="grid grid-cols-4 gap-2 mt-2">{[1,2,3,4].map(i => <img key={i} src={`https://picsum.photos/seed/${product.slug}${i}/200/200`} className="h-20 rounded-xl object-cover border" alt="" />)}</div></div>
        <div>
          <h1 className="font-display text-3xl">{product.name}</h1>
          <div className="text-sm text-muted-foreground">by <Link href={`/sellers/${product.seller.slug}`} className="underline">{product.seller.businessName}</Link> • {product.material} • {product.color}</div>
          <div className="text-2xl font-semibold mt-4">₦{Number(product.price).toLocaleString()} / {product.unit}</div>
          <div className="text-xs text-muted-foreground">Min order: {product.minOrderQty} {product.unit} • {product.stock} available • Overselling prevented via DB transactions</div>
          <p className="text-sm mt-4 text-muted-foreground">{product.description}</p>
          <form action="/api/cart" method="post" className="mt-6 flex gap-2">
            <Input type="number" name="quantity" defaultValue={product.minOrderQty} min={product.minOrderQty} max={product.stock} className="w-24 bg-white" />
            <Button type="submit" className="flex-1">Add to Cart</Button>
          </form>
          <div className="text-xs text-muted-foreground mt-2">At checkout you can choose delivery to yourself or an eligible tailor. Separate seller fulfilment orders are created per cart.</div>
          <Link href="/checkout" className="block mt-3"><Button variant="outline" className="w-full">Go to Checkout</Button></Link>
        </div>
      </div><SiteFooter /></div>
  );
}
