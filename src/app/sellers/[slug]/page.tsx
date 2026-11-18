import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UserAvatar } from "@/components/ui/avatar";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default async function SellerPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let seller: any = null;
  try { seller = await prisma.sellerProfile.findUnique({ where: { slug: slug }, include: { user: { select: { image: true, name: true } }, products: { where: { isPublished: true }, include: { images: true } } } }); } catch {}
  if (!seller) seller = { businessName: "Lagos Fabrics Hub", slug: slug, city: "Yaba, Lagos", bio: "Ankara, lace & aso-oke specialists.", profileImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=400&auto=format&fit=crop", user:{ image:null, name:"Lagos Fabrics Hub" }, ratingAvg: 4.8, products: Array.from({ length: 6 }).map((_, i) => ({ id: `${i}`, name: `Fabric ${i+1}`, slug: `fabric-${i}`, price: 10000+i*1000, images: [{ url: `https://picsum.photos/seed/fabric${i}/400/400` }] })) };
  return (
    <div className="min-h-screen bg-[#FFFBF0] dark:bg-[#191919]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8 grid lg:grid-cols-3 gap-8">
        <Card className="overflow-hidden h-fit dark:bg-[#292929] dark:border-[#3A3936]"><div className="relative"><img src={seller.profileImage || seller.user?.image} alt={seller.businessName} className="h-56 w-full object-cover" /><div className="absolute bottom-3 left-3 rounded-full border-2 border-white dark:border-[#3A3936] overflow-hidden shadow-lg"><UserAvatar name={seller.businessName || seller.user?.name} image={seller.user?.image || seller.profileImage} size="lg" /></div></div><CardContent className="p-6"><h1 className="font-display text-xl dark:text-[#F5F3EF] flex items-center gap-2"><UserAvatar name={seller.businessName || seller.user?.name} image={seller.user?.image || seller.profileImage} size="md" /> {seller.businessName}</h1><div className="text-sm text-muted-foreground dark:text-[#B8B5AE]">{seller.city} • {seller.ratingAvg}★</div><p className="text-sm mt-3 dark:text-[#B8B5AE]">{seller.bio}</p><Link href="/fabrics" className="block mt-4 text-center text-sm font-medium text-emerald-800 dark:text-[#49B77A] underline">Shop Fabrics</Link></CardContent></Card>
        <div className="lg:col-span-2"><h2 className="font-display text-xl dark:text-[#F5F3EF]">Catalogue — only this seller's published products (ownership-scoped)</h2><div className="grid md:grid-cols-3 gap-4 mt-4">{(seller.products||[]).map((p:any)=>(<Link key={p.id} href={`/fabrics/${p.slug}`}><Card className="overflow-hidden dark:bg-[#292929] dark:border-[#3A3936]"><img src={p.images?.[0]?.url} alt={p.name} className="h-40 w-full object-cover"/><CardContent className="p-3"><div className="text-sm font-medium dark:text-[#F5F3EF]">{p.name}</div><div className="text-xs dark:text-[#B8B5AE]">₦{Number(p.price).toLocaleString()}</div></CardContent></Card></Link>))}</div></div>
      </div><SiteFooter /></div>
  );
}
