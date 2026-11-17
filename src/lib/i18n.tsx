"use client";
import * as React from "react";

export type Lang = "EN" | "HA";

const DICT: Record<Lang, Record<string, string>> = {
  EN: {
    // Common / Header
    home: "Home",
    findTailors: "Find Tailors",
    designs: "Designs",
    fabrics: "Fabrics",
    howItWorks: "How It Works",
    becomePartner: "Become a Partner",
    trustSafety: "Trust & Safety",
    helpCentre: "Help Centre",
    search: "Search",
    searchPlaceholder: "Search tailors, designs, fabrics…",
    signIn: "Sign In",
    getStarted: "Get Started",
    worldwideShipping: "WORLDWIDE SHIPPING • VERIFIED TAILORS • PAYSTACK SECURE",
    verifiedTailors: "VERIFIED TAILORS",
    paystackSecure: "PAYSTACK SECURE",
    // Generic dashboard
    dashboard: "Dashboard",
    overview: "Overview",
    workspace: "WORKSPACE",
    exitToStorefront: "Exit to Storefront",
    light: "Light",
    dark: "Dark",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    // Customer nav
    discoverTailors: "Discover Tailors",
    browseDesigns: "Browse Designs",
    fabricMarketplace: "Fabric Marketplace",
    myBookings: "My Bookings",
    measurements: "Measurements",
    fabricOrders: "Fabric Orders",
    shoppingCart: "Shopping Cart",
    favorites: "Favorites",
    messages: "Messages",
    deliveryTracking: "Delivery Tracking",
    reviews: "Reviews",
    addresses: "Addresses",
    notifications: "Notifications",
    accountSettings: "Account Settings",
    privacySecurity: "Privacy & Security",
    customer: "CUSTOMER",
    // Seller nav
    myProducts: "My Products",
    addNewProduct: "Add New Product",
    categories: "Categories",
    inventory: "Inventory",
    stockHistory: "Stock History",
    fabricOrdersSeller: "Fabric Orders",
    customersSeller: "Customers",
    deliveries: "Deliveries",
    reviewsSeller: "Reviews",
    salesReports: "Sales Reports",
    earnings: "Earnings",
    businessProfile: "Business Profile",
    businessProfileSeller: "Business Profile",
    locationSettings: "Location Settings",
    locationSettingsSeller: "Location Settings",
    deliveryCoverage: "Delivery Coverage",
    verificationSeller: "Verification",
    verificationStatus: "Verification Status",
    notificationsSeller: "Notifications",
    accountSettingsSeller: "Account Settings",
    seller: "SELLER",
    // Tailor nav (original keys kept)
    bookings: "Booking Requests",
    customers: "My Customers",
    measurementRecords: "Measurement Records",
    production: "Active Production",
    readyForCollection: "Ready for Collection",
    completed: "Completed Orders",
    calendar: "Calendar & Availability",
    earningsTailor: "Earnings & Payments",
    businessProfileTailor: "Business Profile",
    locationSettingsTailor: "Location Settings",
    accountSettingsTailor: "Account Settings",
    messagesTailor: "Messages",
    reviewsTailor: "Reviews",
    notificationsTailor: "Notifications",
    tailor: "TAILOR",
    // Actions
    addCustomer: "Add Customer",
    recordMeasurements: "Record Measurements",
    uploadDesign: "Upload New Design",
    viewBookings: "View New Bookings",
    updateProduction: "Update Production Status",
    save: "Save",
    saveMeasurements: "Save Measurements",
    updateMeasurements: "Update Measurements",
    uploadDesignAction: "Upload Design",
    searchCustomer: "Search customer",
    addWalkIn: "+ Add Walk-in Customer",
    viewAllBookings: "View all bookings",
    newBooking: "New Booking",
    noBookings: "No bookings — Discover tailors or browse designs to start",
    tailoringWorkflow: "Tailoring workflow: REQUESTED→ACCEPTED→IN_PRODUCTION→READY→COMPLETED",
    myBookingsTitle: "My Bookings",
    bookingDetails: "Booking Details",
    agreedPrice: "Agreed Price",
    estCompletion: "Est. Completion",
    measurementSnapshot: "Measurement Snapshot",
    statusHistory: "Status history",
    description: "Description",
    backToBookings: "← Back to bookings",
    // Measurements fields (for t() fallback)
    shoulder: "Shoulder",
    chest: "Chest/Bust",
    waist: "Waist",
    hip: "Hip",
    sleeve: "Sleeve Length",
    inseam: "Inseam",
    thigh: "Thigh",
    neck: "Neck",
    // Admin
    admin: "ADMIN",
    adminOverview: "Overview",
    userManagement: "User Management",
    tailorManagement: "Tailor Management",
    sellerManagement: "Seller Management",
    adminVerification: "Verification",
    payments: "Payments",
    deliveriesAdmin: "Deliveries",
    disputes: "Disputes",
    analytics: "Analytics",
    settings: "Settings",
    audit: "Security & Audit",
    paymentsSeller: "Payments",
    analyticsAdmin: "Analytics",
  },
  HA: {
    home: "Gida",
    findTailors: "Nemo Ɗinki",
    designs: "Zane-zane",
    fabrics: "Yadi",
    howItWorks: "Yadda yake Aiki",
    becomePartner: "Zama Abokin Hulɗa",
    trustSafety: "Amana & Tsaro",
    helpCentre: "Cibiyar Taimako",
    search: "Nema",
    searchPlaceholder: "Nemo ɗinki, zane, yadi…",
    signIn: "Shiga",
    getStarted: "Fara",
    worldwideShipping: "JIGILA NA DUNIYA • ƊINKUNA TABBATATTU • PAYSTACK AMINTACCE",
    verifiedTailors: "ƊINKUNA TABBATATTU",
    paystackSecure: "PAYSTACK AMINTACCE",
    dashboard: "Allon Kulawa",
    overview: "Bayyani",
    workspace: "FILIN AIKI",
    exitToStorefront: "Fita zuwa Shagon",
    light: "Haske",
    dark: "Duhu",
    darkMode: "Yanayin Duhu",
    lightMode: "Yanayin Haske",
    discoverTailors: "Nemo Ɗinkuna",
    browseDesigns: "Duba Zane-zane",
    fabricMarketplace: "Kasuwar Yadi",
    myBookings: "Buƙatuna",
    measurements: "Ma'aunai",
    fabricOrders: "Odar Yadi",
    shoppingCart: "Katin Siyayya",
    favorites: "Abubuwan da na Fi So",
    messages: "Saƙonni",
    deliveryTracking: "Bin Isarwa",
    reviews: "Sharhi",
    addresses: "Adiresoshi",
    notifications: "Sanarwa",
    accountSettings: "Saitin Asusu",
    privacySecurity: "Sirri & Tsaro",
    customer: "ABOKIN CINIKI",
    myProducts: "Kayayyakina",
    addNewProduct: "Ƙara Sabon Kaya",
    categories: "Rukunoni",
    inventory: "Kaya a Rumbun",
    stockHistory: "Tarihin Kaya",
    fabricOrdersSeller: "Odar Yadi",
    customersSeller: "Abokan Ciniki",
    deliveries: "Isarwa",
    reviewsSeller: "Sharhi",
    salesReports: "Rahoton Tallace-tallace",
    earnings: "Kuɗi & Biya",
    businessProfile: "Bayanan Kasuwanci",
    businessProfileSeller: "Bayanan Kasuwanci",
    locationSettings: "Saitin Wuri",
    locationSettingsSeller: "Saitin Wuri",
    deliveryCoverage: "Yankin Isarwa",
    verificationSeller: "Tabbatarwa",
    verificationStatus: "Matsayin Tabbatarwa",
    notificationsSeller: "Sanarwa",
    accountSettingsSeller: "Saitin Asusu",
    seller: "MAI YADI",
    bookings: "Buƙatun Ɗinki",
    customers: "Abokan Ciniki",
    measurementRecords: "Bayanan Ma'auni",
    production: "Aikin Ɗinki",
    readyForCollection: "Shirye don Karɓa",
    completed: "Ayyukan da aka Kammala",
    calendar: "Kalandar & Lokaci",
    earningsTailor: "Kuɗi & Biya",
    businessProfileTailor: "Bayanan Kasuwanci",
    locationSettingsTailor: "Saitin Wuri",
    accountSettingsTailor: "Saitin Asusu",
    messagesTailor: "Saƙonni",
    reviewsTailor: "Sharhi",
    notificationsTailor: "Sanarwa",
    tailor: "ƊINKI",
    addCustomer: "Ƙara Abokin Ciniki",
    recordMeasurements: "Ɗauki Ma'auni",
    uploadDesign: "Ɗora Sabon Zane",
    viewBookings: "Duba Buƙatu",
    updateProduction: "Sabunta Aiki",
    save: "Ajiye",
    saveMeasurements: "Ajiye Ma'auni",
    updateMeasurements: "Sabunta Ma'auni",
    uploadDesignAction: "Ɗora Zane",
    searchCustomer: "Nemo abokin ciniki",
    addWalkIn: "+ Ƙara Baƙo",
    viewAllBookings: "Duba duk buƙatun",
    newBooking: "Sabuwar Buƙata",
    noBookings: "Babu buƙatu — Nemo ɗinki ko duba zane don farawa",
    tailoringWorkflow: "Aikin ɗinki: NEMA→KARƁA→ANA AIKI→SHIRYE→KAMMALA",
    myBookingsTitle: "Buƙatuna",
    bookingDetails: "Bayanan Buƙata",
    agreedPrice: "Farashin da aka Yarda",
    estCompletion: "Ƙididdigar Ƙarewa",
    measurementSnapshot: "Hoton Ma'auni",
    statusHistory: "Tarihin Matsayi",
    description: "Bayani",
    backToBookings: "← Komawa zuwa buƙatu",
    shoulder: "Kafaɗa",
    chest: "Ƙirji",
    waist: "Kugu",
    hip: "Kugu na Ƙasa",
    sleeve: "Tsawon Hannu",
    inseam: "Tsawon Ƙafa na Ciki",
    thigh: "Cinye",
    neck: "Wuya",
    admin: "ADMIN",
    adminOverview: "Bayyani",
    userManagement: "Sarrafa Masu Amfani",
    tailorManagement: "Sarrafa Ɗinkuna",
    sellerManagement: "Sarrafa Masu Yadi",
    adminVerification: "Tabbatarwa",
    payments: "Biya",
    deliveriesAdmin: "Isarwa",
    disputes: "Rikice-rikice",
    analytics: "Nazari",
    settings: "Saituna",
    audit: "Binciken Tsaro",
    paymentsSeller: "Biya",
    analyticsAdmin: "Nazari",
  },
};

const STORAGE_KEY = "twt-lang";
const EVENT_NAME = "twt-lang-change";

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dict: Record<string, string>;
};

const LangContext = React.createContext<LangContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("EN");

  // Load saved language on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "EN" || saved === "HA") {
        setLangState(saved);
        document.documentElement.lang = saved.toLowerCase();
      }
    } catch {}
  }, []);

  // Listen for cross-tab storage changes
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "EN" || e.newValue === "HA")) {
        setLangState(e.newValue as Lang);
        document.documentElement.lang = (e.newValue as string).toLowerCase();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Listen for same-tab custom event (shell A → header B on same page)
  React.useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as Lang;
      if (detail === "EN" || detail === "HA") {
        setLangState(detail);
        document.documentElement.lang = detail.toLowerCase();
      }
    };
    window.addEventListener(EVENT_NAME, onCustom as EventListener);
    return () => window.removeEventListener(EVENT_NAME, onCustom as EventListener);
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    document.documentElement.lang = l.toLowerCase();
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: l }));
    fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: l }),
    }).catch(() => {});
  }, []);

  const t = React.useCallback(
    (key: string) => DICT[lang][key] ?? DICT["EN"][key] ?? key,
    [lang]
  );

  const value = React.useMemo(
    () => ({ lang, setLang, t, dict: DICT[lang] }),
    [lang, setLang, t]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLanguage(): LangContextType {
  const ctx = React.useContext(LangContext);
  if (ctx) return ctx;
  // Fallback for components rendered outside provider (e.g., tests or server islands)
  // Keep localStorage behaviour for backward compatibility
  const [lang, setLangState] = React.useState<Lang>(() => {
    if (typeof window === "undefined") return "EN";
    try {
      return (localStorage.getItem(STORAGE_KEY) as Lang) || "EN";
    } catch {
      return "EN";
    }
  });
  const t = React.useCallback((key: string) => DICT[lang][key] || DICT["EN"][key] || key, [lang]);
  const setLang = React.useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch {}
      document.documentElement.lang = l.toLowerCase();
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: l }));
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: l }),
      }).catch(() => {});
    },
    []
  );
  React.useEffect(() => {
    document.documentElement.lang = lang.toLowerCase();
  }, [lang]);
  return { lang, setLang, t, dict: DICT[lang] };
}

export const dict = DICT;
export function getDict(lang: Lang) {
  return DICT[lang] || DICT.EN;
}
