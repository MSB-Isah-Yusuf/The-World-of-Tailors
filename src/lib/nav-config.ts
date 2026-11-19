"use client";
import {
  LayoutDashboard, Users, UserCheck, Store, ShieldCheck, Palette, Package,
  ClipboardList, ShoppingBag, Wallet, Truck, Star, Flag, Bell, BarChart3,
  Settings, Lock, User, Shield, Building2, MapPin, CalendarDays, FileStack,
  Ruler, Factory, CheckCircle2, PackageCheck, MessageCircle, Search, Heart,
  FileText, ShoppingCart, Boxes, Tag, History, PlusCircle, FileText as FileIcon
} from "lucide-react";
import type { NavGroup } from "@/components/dashboard/PersistentShell";

// All labels are i18n keys — EN/HA in src/lib/i18n.tsx
export const CUSTOMER_GROUPS: NavGroup[] = [
  { id: "overview", labelKey: "overview", children: [{ href: "/dashboard/customer", labelKey: "overview", icon: LayoutDashboard }] },
  {
    id: "discover", labelKey: "discoverTailors", icon: Search, defaultExpanded: true,
    children: [
      { href: "/dashboard/customer/discover", labelKey: "discoverTailors", icon: Search },
      { href: "/dashboard/customer/designs", labelKey: "browseDesigns", icon: Palette },
      { href: "/dashboard/customer/marketplace", labelKey: "fabricMarketplace", icon: Store },
    ]
  },
  {
    id: "jobs", labelKey: "myBookings", icon: ClipboardList, defaultExpanded: true,
    children: [
      { href: "/dashboard/customer/bookings", labelKey: "myBookings", icon: ClipboardList },
      { href: "/dashboard/customer/measurements", labelKey: "measurements", icon: Ruler },
      { href: "/dashboard/customer/orders", labelKey: "fabricOrders", icon: ShoppingBag },
      { href: "/dashboard/customer/cart", labelKey: "shoppingCart", icon: ShoppingCart },
      { href: "/dashboard/customer/deliveries", labelKey: "deliveryTracking", icon: Truck },
    ]
  },
  {
    id: "engagement", labelKey: "favorites", icon: Heart,
    children: [
      { href: "/dashboard/customer/favorites", labelKey: "favorites", icon: Heart },
      { href: "/dashboard/customer/messages", labelKey: "messages", icon: MessageCircle },
      { href: "/dashboard/customer/reviews", labelKey: "reviews", icon: Star },
    ]
  },
  {
    id: "personal", labelKey: "accountSettings", icon: Settings,
    children: [
      { href: "/dashboard/customer/addresses", labelKey: "addresses", icon: MapPin },
      { href: "/dashboard/customer/notifications", labelKey: "notifications", icon: Bell },
      { href: "/dashboard/customer/refunds", labelKey: "payments", icon: Wallet },
      { href: "/dashboard/customer/disputes", labelKey: "disputes", icon: Flag },
      { href: "/dashboard/customer/account", labelKey: "accountSettings", icon: Settings },
      { href: "/dashboard/customer/privacy", labelKey: "privacySecurity", icon: Lock },
    ]
  },
];

export const TAILOR_GROUPS: NavGroup[] = [
  { id: "overview", labelKey: "overview", children: [{ href: "/dashboard/tailor", labelKey: "overview", icon: LayoutDashboard }] },
  {
    id: "bookings", labelKey: "bookings", icon: ClipboardList, defaultExpanded: true,
    children: [
      { href: "/dashboard/tailor/bookings", labelKey: "bookings", icon: ClipboardList },
      { href: "/dashboard/tailor/production", labelKey: "production", icon: Factory },
      { href: "/dashboard/tailor/ready", labelKey: "readyForCollection", icon: PackageCheck },
      { href: "/dashboard/tailor/completed", labelKey: "completed", icon: CheckCircle2 },
    ]
  },
  {
    id: "customers", labelKey: "customers", icon: Users, defaultExpanded: true,
    children: [
      { href: "/dashboard/tailor/customers", labelKey: "customers", icon: Users },
      { href: "/dashboard/tailor/measurements", labelKey: "measurements", icon: Ruler },
      { href: "/dashboard/tailor/measurements/records", labelKey: "measurementRecords", icon: FileStack },
    ]
  },
  {
    id: "portfolio", labelKey: "designs", icon: Palette,
    children: [
      { href: "/dashboard/tailor/designs", labelKey: "designs", icon: Palette },
    ]
  },
  {
    id: "business", labelKey: "businessProfile", icon: Building2,
    children: [
      { href: "/dashboard/tailor/calendar", labelKey: "calendar", icon: CalendarDays },
      { href: "/dashboard/tailor/earnings", labelKey: "earnings", icon: Wallet },
      { href: "/dashboard/tailor/profile", labelKey: "businessProfile", icon: Building2 },
      { href: "/dashboard/tailor/location", labelKey: "locationSettings", icon: MapPin },
      { href: "/dashboard/tailor/verification", labelKey: "verificationStatus", icon: ShieldCheck },
    ]
  },
  {
    id: "comms", labelKey: "messages", icon: MessageCircle,
    children: [
      { href: "/dashboard/tailor/messages", labelKey: "messages", icon: MessageCircle },
      { href: "/dashboard/tailor/reviews", labelKey: "reviews", icon: Star },
      { href: "/dashboard/tailor/notifications", labelKey: "notifications", icon: Bell },
      { href: "/dashboard/tailor/account", labelKey: "accountSettings", icon: Settings },
    ]
  },
];

export const SELLER_GROUPS: NavGroup[] = [
  { id: "overview", labelKey: "overview", children: [{ href: "/dashboard/seller", labelKey: "overview", icon: LayoutDashboard }] },
  {
    id: "products", labelKey: "myProducts", icon: Package, defaultExpanded: true,
    children: [
      { href: "/dashboard/seller/products", labelKey: "myProducts", icon: Package },
      { href: "/dashboard/seller/products/new", labelKey: "addNewProduct", icon: PlusCircle },
      { href: "/dashboard/seller/categories", labelKey: "categories", icon: Tag },
      { href: "/dashboard/seller/inventory", labelKey: "inventory", icon: Boxes },
      { href: "/dashboard/seller/inventory/history", labelKey: "stockHistory", icon: History },
    ]
  },
  {
    id: "orders", labelKey: "fabricOrdersSeller", icon: ShoppingBag, defaultExpanded: true,
    children: [
      { href: "/dashboard/seller/orders", labelKey: "fabricOrdersSeller", icon: ShoppingBag },
      { href: "/dashboard/seller/customers", labelKey: "customersSeller", icon: Users },
      { href: "/dashboard/seller/deliveries", labelKey: "deliveries", icon: Truck },
    ]
  },
  {
    id: "reputation", labelKey: "reviewsSeller", icon: Star,
    children: [
      { href: "/dashboard/seller/reviews", labelKey: "reviewsSeller", icon: Star },
      { href: "/dashboard/seller/reports", labelKey: "salesReports", icon: BarChart3 },
      { href: "/dashboard/seller/earnings", labelKey: "earnings", icon: Wallet },
    ]
  },
  {
    id: "business", labelKey: "businessProfileSeller", icon: Building2,
    children: [
      { href: "/dashboard/seller/profile", labelKey: "businessProfileSeller", icon: Building2 },
      { href: "/dashboard/seller/location", labelKey: "locationSettingsSeller", icon: MapPin },
      { href: "/dashboard/seller/delivery", labelKey: "deliveryCoverage", icon: FileIcon },
      { href: "/dashboard/seller/verification", labelKey: "verificationSeller", icon: ShieldCheck },
    ]
  },
  {
    id: "system", labelKey: "notificationsSeller", icon: Bell,
    children: [
      { href: "/dashboard/seller/notifications", labelKey: "notificationsSeller", icon: Bell },
      { href: "/dashboard/seller/account", labelKey: "accountSettingsSeller", icon: Settings },
    ]
  },
];

export const ADMIN_GROUPS: NavGroup[] = [
  { id: "overview", labelKey: "overview", children: [{ href: "/admin", labelKey: "overview", icon: LayoutDashboard }] },
  {
    id: "users", labelKey: "userManagement", icon: Users, defaultExpanded: true,
    children: [
      { href: "/admin/users", labelKey: "userManagement", icon: User },
      { href: "/admin/customers", labelKey: "customers", icon: Users },
      { href: "/admin/tailors", labelKey: "tailorManagement", icon: UserCheck },
      { href: "/admin/sellers", labelKey: "sellerManagement", icon: Store },
    ]
  },
  {
    id: "verification", labelKey: "adminVerification", icon: ShieldCheck,
    children: [
      { href: "/admin/verification", labelKey: "verificationStatus", icon: ShieldCheck },
      { href: "/admin/seller-verification", labelKey: "sellerManagement", icon: Shield },
    ]
  },
  {
    id: "moderation", labelKey: "designs", icon: Palette,
    children: [
      { href: "/admin/designs", labelKey: "designs", icon: Palette },
      { href: "/admin/fabrics", labelKey: "fabrics", icon: Package },
    ]
  },
  {
    id: "operations", labelKey: "bookings", icon: ClipboardList, defaultExpanded: true,
    children: [
      { href: "/admin/bookings", labelKey: "bookings", icon: ClipboardList },
      { href: "/admin/orders", labelKey: "fabricOrders", icon: ShoppingBag },
      { href: "/admin/payments", labelKey: "payments", icon: Wallet },
      { href: "/admin/finance", labelKey: "payments", icon: BarChart3 },
      { href: "/admin/finance/commission-rules", labelKey: "payments", icon: FileText },
      { href: "/admin/finance/seller-profiles", labelKey: "sellerManagement", icon: Building2 },
      { href: "/admin/finance/payouts", labelKey: "payments", icon: Wallet },
      { href: "/admin/finance/refunds", labelKey: "payments", icon: Wallet },
      { href: "/admin/finance/reconciliation", labelKey: "payments", icon: BarChart3 },
      { href: "/admin/deliveries", labelKey: "deliveries", icon: Truck },
    ]
  },
  {
    id: "trust", labelKey: "reviews", icon: Star,
    children: [
      { href: "/admin/reviews", labelKey: "reviews", icon: Star },
      { href: "/admin/disputes", labelKey: "disputes", icon: Flag },
      { href: "/admin/notifications", labelKey: "notifications", icon: Bell },
    ]
  },
  {
    id: "insights", labelKey: "analytics", icon: BarChart3,
    children: [
      { href: "/admin/analytics", labelKey: "analytics", icon: BarChart3 },
      { href: "/admin/settings", labelKey: "settings", icon: Settings },
      { href: "/admin/audit", labelKey: "audit", icon: Lock },
      { href: "/admin/profile", labelKey: "accountSettings", icon: User },
    ]
  },
];
